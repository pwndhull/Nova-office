// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 The Nova-Office contributors
//
// ycrdt — the Nova Notes block-tree CRDT.
//
// A thin, opinionated wrapper over `yrs` (Y-CRDT, ADR-0003) that presents the
// Nova Notes document model (docs/architecture.md §4.1) and nothing else. The
// C++ `nova_notes` module drives it through the C ABI in `ffi`; the reference
// server speaks the same `yrs` update format.
//
// Document shape inside the Y.Doc — three ROOT shared types (root types merge
// deterministically across replicas, which nested containers would not):
//
//   "meta"   : Map     (id, title, icon, cover, …)
//   "props"  : Map     (page properties / database fields)
//   "blocks" : Array   ordered blocks; each block is a Map:
//                ├─ "id"       : String (UUID)
//                ├─ "kind"     : String ("text" | "heading" | "todo" | …)
//                ├─ "text"     : Text   (inline rich text)
//                ├─ "props"    : Map    (kind-specific)
//                └─ "children" : Array  (nested blocks)
//
// NOT IN SCOPE (belongs in nova_notes C++ / nova_versioning):
//   the .nova package, media store, backlink graph, slash-command UX,
//   editor layout, snapshot-GC policy (snapshot/restore is exposed; *when* is
//   the host's call).

use std::collections::HashMap;
use yrs::updates::decoder::Decode;
use yrs::updates::encoder::Encode;
use yrs::{
    Any, Array, ArrayPrelim, ArrayRef, Doc, GetString, Map, MapPrelim, MapRef, Out, ReadTxn,
    StateVector, Text, TextPrelim, Transact, Update,
};

pub mod ffi;

/// A Nova Notes document backed by a Y.Doc.
pub struct NotesDoc {
    doc: Doc,
}

/// A read-only view of one block (for the host to render / diff).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlockView {
    pub id: String,
    pub kind: String,
    pub text: Option<String>,
    pub props: Vec<(String, String)>, // sorted, for stable comparison
    pub children: Vec<BlockView>,
}

impl Default for NotesDoc {
    fn default() -> Self {
        Self::new(0)
    }
}

impl NotesDoc {
    /// `actor_id` is the Yrs client id — must be unique per device
    /// (docs/collaboration.md §4). 0 = let yrs pick a random one. Any value is
    /// folded into yrs' valid 53-bit, non-zero client-id range, so callers may
    /// pass a full hash without tripping yrs' internal assertion.
    pub fn new(actor_id: u64) -> Self {
        let doc = if actor_id != 0 {
            let cid = (actor_id & ((1u64 << 53) - 1)) | 1;
            Doc::with_client_id(cid)
        } else {
            Doc::new()
        };
        NotesDoc { doc }
    }

    fn meta(&self) -> MapRef {
        self.doc.get_or_insert_map("meta")
    }
    fn props(&self) -> MapRef {
        self.doc.get_or_insert_map("props")
    }
    fn blocks_root(&self) -> ArrayRef {
        self.doc.get_or_insert_array("blocks")
    }

    // ---- meta / props ---------------------------------------------------
    pub fn set_meta(&self, key: &str, value: &str) {
        let m = self.meta();
        let mut txn = self.doc.transact_mut();
        m.insert(&mut txn, key.to_string(), value.to_string());
    }
    pub fn get_meta(&self, key: &str) -> Option<String> {
        let m = self.meta();
        let txn = self.doc.transact();
        match m.get(&txn, key) {
            Some(Out::Any(Any::String(s))) => Some(s.to_string()),
            _ => None,
        }
    }
    pub fn set_prop(&self, key: &str, value: &str) {
        let p = self.props();
        let mut txn = self.doc.transact_mut();
        p.insert(&mut txn, key.to_string(), value.to_string());
    }

    // ---- block construction ------------------------------------------
    fn make_block(txn: &mut yrs::TransactionMut, arr: &ArrayRef, index: u32, id: &str, kind: &str) {
        let block: MapRef = arr.insert(txn, index, MapPrelim::default());
        block.insert(txn, "id", id.to_string());
        block.insert(txn, "kind", kind.to_string());
        block.insert(txn, "props", MapPrelim::default());
        block.insert(txn, "children", ArrayPrelim::default());
        block.insert(txn, "text", TextPrelim::new(""));
    }

    /// Insert a top-level block at `index` (clamped).
    pub fn insert_block(&self, index: u32, id: &str, kind: &str) {
        let arr = self.blocks_root();
        let mut txn = self.doc.transact_mut();
        let at = index.min(arr.len(&txn));
        Self::make_block(&mut txn, &arr, at, id, kind);
    }

    /// Insert a child block under `parent_id` at `index`. False if parent missing.
    pub fn insert_child_block(&self, parent_id: &str, index: u32, id: &str, kind: &str) -> bool {
        let arr = self.blocks_root();
        let mut txn = self.doc.transact_mut();
        let Some(parent) = Self::find_block(&txn, &arr, parent_id) else {
            return false;
        };
        let Some(Out::YArray(children)) = parent.get(&txn, "children") else {
            return false;
        };
        let at = index.min(children.len(&txn));
        Self::make_block(&mut txn, &children, at, id, kind);
        true
    }

    pub fn set_block_kind(&self, id: &str, kind: &str) -> bool {
        let arr = self.blocks_root();
        let mut txn = self.doc.transact_mut();
        match Self::find_block(&txn, &arr, id) {
            Some(b) => {
                b.insert(&mut txn, "kind", kind.to_string());
                true
            }
            None => false,
        }
    }

    pub fn set_block_prop(&self, id: &str, key: &str, value: &str) -> bool {
        let arr = self.blocks_root();
        let mut txn = self.doc.transact_mut();
        let Some(b) = Self::find_block(&txn, &arr, id) else {
            return false;
        };
        let Some(Out::YMap(props)) = b.get(&txn, "props") else {
            return false;
        };
        props.insert(&mut txn, key.to_string(), value.to_string());
        true
    }

    /// Splice text into a block's inline Text (CRDT — concurrent edits merge).
    pub fn block_text_insert(&self, id: &str, at: u32, s: &str) -> bool {
        let arr = self.blocks_root();
        let mut txn = self.doc.transact_mut();
        let Some(b) = Self::find_block(&txn, &arr, id) else {
            return false;
        };
        let Some(Out::YText(t)) = b.get(&txn, "text") else {
            return false;
        };
        let len = t.len(&txn);
        t.insert(&mut txn, at.min(len), s);
        true
    }
    pub fn block_text_remove(&self, id: &str, at: u32, len: u32) -> bool {
        let arr = self.blocks_root();
        let mut txn = self.doc.transact_mut();
        let Some(b) = Self::find_block(&txn, &arr, id) else {
            return false;
        };
        let Some(Out::YText(t)) = b.get(&txn, "text") else {
            return false;
        };
        let tlen = t.len(&txn);
        if at >= tlen {
            return true;
        }
        t.remove_range(&mut txn, at, len.min(tlen - at));
        true
    }
    pub fn block_text(&self, id: &str) -> Option<String> {
        let arr = self.blocks_root();
        let txn = self.doc.transact();
        let b = Self::find_block(&txn, &arr, id)?;
        match b.get(&txn, "text") {
            Some(Out::YText(t)) => Some(t.get_string(&txn)),
            _ => None,
        }
    }

    /// Remove a top-level block by id. True if it was present.
    pub fn remove_block(&self, id: &str) -> bool {
        let arr = self.blocks_root();
        let mut txn = self.doc.transact_mut();
        let n = arr.len(&txn);
        for i in 0..n {
            if let Some(Out::YMap(b)) = arr.get(&txn, i) {
                if Self::block_id(&txn, &b).as_deref() == Some(id) {
                    arr.remove_range(&mut txn, i, 1);
                    return true;
                }
            }
        }
        false
    }

    /// Read the whole block tree.
    pub fn blocks(&self) -> Vec<BlockView> {
        let arr = self.blocks_root();
        let txn = self.doc.transact();
        Self::read_array(&txn, &arr)
    }

    fn read_array<T: ReadTxn>(txn: &T, arr: &ArrayRef) -> Vec<BlockView> {
        let mut out = Vec::new();
        for i in 0..arr.len(txn) {
            if let Some(Out::YMap(b)) = arr.get(txn, i) {
                out.push(Self::read_block(txn, &b));
            }
        }
        out
    }
    fn read_block<T: ReadTxn>(txn: &T, b: &MapRef) -> BlockView {
        let id = Self::block_id(txn, b).unwrap_or_default();
        let kind = match b.get(txn, "kind") {
            Some(Out::Any(Any::String(s))) => s.to_string(),
            _ => String::new(),
        };
        let text = match b.get(txn, "text") {
            Some(Out::YText(t)) => Some(t.get_string(txn)),
            _ => None,
        };
        let mut props = Vec::new();
        if let Some(Out::YMap(p)) = b.get(txn, "props") {
            for (k, v) in p.iter(txn) {
                if let Out::Any(Any::String(s)) = v {
                    props.push((k.to_string(), s.to_string()));
                }
            }
        }
        props.sort();
        let children = match b.get(txn, "children") {
            Some(Out::YArray(c)) => Self::read_array(txn, &c),
            _ => Vec::new(),
        };
        BlockView {
            id,
            kind,
            text,
            props,
            children,
        }
    }

    fn block_id<T: ReadTxn>(txn: &T, b: &MapRef) -> Option<String> {
        match b.get(txn, "id") {
            Some(Out::Any(Any::String(s))) => Some(s.to_string()),
            _ => None,
        }
    }
    fn find_block<T: ReadTxn>(txn: &T, arr: &ArrayRef, id: &str) -> Option<MapRef> {
        for i in 0..arr.len(txn) {
            if let Some(Out::YMap(b)) = arr.get(txn, i) {
                if Self::block_id(txn, &b).as_deref() == Some(id) {
                    return Some(b);
                }
                if let Some(Out::YArray(children)) = b.get(txn, "children") {
                    if let Some(found) = Self::find_block(txn, &children, id) {
                        return Some(found);
                    }
                }
            }
        }
        None
    }

    // ---- sync primitives --------------------------------------------
    /// State vector — send to a peer so it can compute a minimal diff back.
    pub fn state_vector(&self) -> Vec<u8> {
        self.doc.transact().state_vector().encode_v1()
    }
    /// Everything the peer described by `remote_sv` is missing.
    pub fn encode_diff(&self, remote_sv: &[u8]) -> Vec<u8> {
        let sv = StateVector::decode_v1(remote_sv).unwrap_or_default();
        self.doc.transact().encode_diff_v1(&sv)
    }
    /// Full state as an update (fresh peer / snapshot).
    pub fn encode_full(&self) -> Vec<u8> {
        self.doc.transact().encode_diff_v1(&StateVector::default())
    }
    /// Apply a peer update. False on a malformed update.
    pub fn apply_update(&self, update: &[u8]) -> bool {
        let Ok(u) = Update::decode_v1(update) else {
            return false;
        };
        self.doc.transact_mut().apply_update(u).is_ok()
    }
    /// Load from a full-state update (snapshot restore).
    pub fn from_snapshot(actor_id: u64, snapshot: &[u8]) -> Option<Self> {
        let d = Self::new(actor_id);
        d.apply_update(snapshot).then_some(d)
    }

    /// Deterministic JSON of the current content — the portable `document.json`
    /// written into the .nova package (docs/architecture.md §4.2). Degraded
    /// readers use this when they cannot run the CRDT.
    ///
    /// Object keys are emitted in a fixed order and maps are sorted, so two
    /// replicas that have converged produce **byte-identical** output (needed
    /// for content-addressing the `.nova` package).
    pub fn to_document_json(&self) -> String {
        let meta = sorted_string_map(&self.meta(), &self.doc.transact());
        let props = sorted_string_map(&self.props(), &self.doc.transact());
        let mut s = String::from("{\"meta\":");
        json_obj(&meta, &mut s);
        s.push_str(",\"props\":");
        json_obj(&props, &mut s);
        s.push_str(",\"blocks\":");
        json_blocks(&self.blocks(), &mut s);
        s.push('}');
        s
    }

    /// Debug helper: a HashMap view of props (unsorted).
    pub fn props_map(&self) -> HashMap<String, String> {
        let p = self.props();
        let txn = self.doc.transact();
        p.iter(&txn)
            .filter_map(|(k, v)| match v {
                Out::Any(Any::String(s)) => Some((k.to_string(), s.to_string())),
                _ => None,
            })
            .collect()
    }
}

fn sorted_string_map<T: ReadTxn>(m: &MapRef, txn: &T) -> Vec<(String, String)> {
    let mut v: Vec<(String, String)> = m
        .iter(txn)
        .filter_map(|(k, val)| match val {
            Out::Any(Any::String(s)) => Some((k.to_string(), s.to_string())),
            _ => None,
        })
        .collect();
    v.sort();
    v
}

fn json_str(s: &str, out: &mut String) {
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
}

fn json_obj(pairs: &[(String, String)], out: &mut String) {
    out.push('{');
    for (i, (k, v)) in pairs.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        json_str(k, out);
        out.push(':');
        json_str(v, out);
    }
    out.push('}');
}

fn json_blocks(blocks: &[BlockView], out: &mut String) {
    out.push('[');
    for (i, b) in blocks.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        // fixed key order: id, kind, text, props, children
        out.push_str("{\"id\":");
        json_str(&b.id, out);
        out.push_str(",\"kind\":");
        json_str(&b.kind, out);
        out.push_str(",\"text\":");
        match &b.text {
            Some(t) => json_str(t, out),
            None => out.push_str("null"),
        }
        out.push_str(",\"props\":");
        json_obj(&b.props, out); // already sorted in read_block
        out.push_str(",\"children\":");
        json_blocks(&b.children, out);
        out.push('}');
    }
    out.push(']');
}

#[cfg(test)]
mod tests {
    use super::*;

    fn doc_with_two_blocks(actor: u64) -> NotesDoc {
        let d = NotesDoc::new(actor);
        d.insert_block(0, "b1", "heading");
        d.insert_block(1, "b2", "text");
        d.block_text_insert("b1", 0, "Title");
        d.block_text_insert("b2", 0, "Body");
        d
    }

    #[test]
    fn basic_tree() {
        let d = doc_with_two_blocks(1);
        let blocks = d.blocks();
        assert_eq!(blocks.len(), 2);
        assert_eq!(blocks[0].id, "b1");
        assert_eq!(blocks[0].kind, "heading");
        assert_eq!(blocks[0].text.as_deref(), Some("Title"));
        assert_eq!(blocks[1].text.as_deref(), Some("Body"));
    }

    #[test]
    fn nested_blocks() {
        let d = NotesDoc::new(1);
        d.insert_block(0, "toggle", "toggle");
        assert!(d.insert_child_block("toggle", 0, "c1", "text"));
        assert!(d.insert_child_block("toggle", 1, "c2", "text"));
        d.block_text_insert("c1", 0, "inside");
        let b = d.blocks();
        assert_eq!(b.len(), 1);
        assert_eq!(b[0].children.len(), 2);
        assert_eq!(b[0].children[0].text.as_deref(), Some("inside"));
        assert!(!d.insert_child_block("nope", 0, "x", "text"));
    }

    #[test]
    fn props_and_kind() {
        let d = NotesDoc::new(1);
        d.insert_block(0, "t", "todo");
        assert!(d.set_block_prop("t", "checked", "true"));
        assert!(d.set_block_kind("t", "text"));
        let b = &d.blocks()[0];
        assert_eq!(b.kind, "text");
        assert_eq!(
            b.props
                .iter()
                .find(|(k, _)| k == "checked")
                .map(|(_, v)| v.as_str()),
            Some("true")
        );
    }

    #[test]
    fn remove_block_works() {
        let d = doc_with_two_blocks(1);
        assert!(d.remove_block("b1"));
        assert!(!d.remove_block("b1"));
        let b = d.blocks();
        assert_eq!(b.len(), 1);
        assert_eq!(b[0].id, "b2");
    }

    #[test]
    fn concurrent_block_inserts_converge() {
        let a = doc_with_two_blocks(1);
        let b = NotesDoc::from_snapshot(2, &a.encode_full()).unwrap();

        a.insert_block(2, "a-only", "text");
        a.block_text_insert("a-only", 0, "from A");
        b.insert_block(2, "b-only", "quote");
        b.block_text_insert("b-only", 0, "from B");

        let a_to_b = a.encode_diff(&b.state_vector());
        let b_to_a = b.encode_diff(&a.state_vector());
        assert!(b.apply_update(&a_to_b));
        assert!(a.apply_update(&b_to_a));

        let ta = a.blocks();
        assert_eq!(
            ta,
            b.blocks(),
            "replicas must converge to an identical tree"
        );
        assert_eq!(ta.len(), 4);
        let ids: Vec<_> = ta.iter().map(|x| x.id.as_str()).collect();
        assert!(ids.contains(&"a-only") && ids.contains(&"b-only"));
    }

    #[test]
    fn concurrent_text_edits_merge() {
        let a = NotesDoc::new(1);
        a.insert_block(0, "p", "text");
        a.block_text_insert("p", 0, "Hello world");
        let b = NotesDoc::from_snapshot(2, &a.encode_full()).unwrap();

        a.block_text_insert("p", 5, " brave");
        b.block_text_insert("p", 11, "!");

        let a_to_b = a.encode_diff(&b.state_vector());
        let b_to_a = b.encode_diff(&a.state_vector());
        b.apply_update(&a_to_b);
        a.apply_update(&b_to_a);

        assert_eq!(a.block_text("p"), b.block_text("p"));
        let merged = a.block_text("p").unwrap();
        assert!(merged.contains("brave") && merged.contains('!'), "{merged}");
    }

    #[test]
    fn concurrent_scaffold_then_merge_keeps_both_sides() {
        // Two docs created independently (each lazily makes root types), each
        // adds a block, then they sync. Root types must merge, not clobber.
        let a = NotesDoc::new(1);
        let b = NotesDoc::new(2);
        a.insert_block(0, "a1", "text");
        b.insert_block(0, "b1", "text");
        a.set_meta("title", "A title");
        b.set_meta("icon", "📄");

        let a_to_b = a.encode_diff(&b.state_vector());
        let b_to_a = b.encode_diff(&a.state_vector());
        a.apply_update(&b_to_a);
        b.apply_update(&a_to_b);

        assert_eq!(a.blocks(), b.blocks());
        assert_eq!(a.blocks().len(), 2);
        assert_eq!(a.get_meta("title").as_deref(), Some("A title"));
        assert_eq!(a.get_meta("icon").as_deref(), Some("📄"));
    }

    #[test]
    fn snapshot_roundtrip() {
        let d = doc_with_two_blocks(1);
        d.set_meta("title", "My page");
        let restored = NotesDoc::from_snapshot(9, &d.encode_full()).unwrap();
        assert_eq!(restored.blocks(), d.blocks());
        assert_eq!(restored.get_meta("title").as_deref(), Some("My page"));
    }

    #[test]
    fn document_json_is_wellformed_with_blocks() {
        let d = doc_with_two_blocks(1);
        d.set_meta("title", "T");
        let json = d.to_document_json();
        assert!(json.starts_with("{\"meta\":"));
        assert!(json.contains("\"blocks\""));
        assert!(json.contains("b1"));
        assert!(json_balanced(&json), "{json}");
    }

    #[test]
    fn malformed_update_rejected() {
        let d = NotesDoc::new(1);
        assert!(!d.apply_update(&[0xff, 0xff, 0xff, 0xff]));
    }

    #[test]
    fn converged_replicas_produce_identical_document_json() {
        let a = doc_with_two_blocks(1);
        let b = NotesDoc::from_snapshot(2, &a.encode_full()).unwrap();
        a.insert_block(2, "x", "todo");
        b.insert_block(2, "y", "quote");
        b.block_text_insert("b1", 5, " (edited)");
        let a2b = a.encode_diff(&b.state_vector());
        let b2a = b.encode_diff(&a.state_vector());
        a.apply_update(&b2a);
        b.apply_update(&a2b);
        assert_eq!(a.blocks(), b.blocks());
        assert_eq!(
            a.to_document_json(),
            b.to_document_json(),
            "document.json must be byte-identical once replicas converge"
        );
    }

    #[test]
    fn actor_id_is_folded_into_valid_range() {
        // a full-width hash must not trip yrs' 53-bit client-id assertion
        let d = NotesDoc::new(u64::MAX);
        d.insert_block(0, "b", "text");
        assert_eq!(d.blocks().len(), 1);
    }

    fn json_balanced(s: &str) -> bool {
        let (mut depth, mut in_str, mut esc) = (0i32, false, false);
        for c in s.chars() {
            if in_str {
                match (esc, c) {
                    (true, _) => esc = false,
                    (false, '\\') => esc = true,
                    (false, '"') => in_str = false,
                    _ => {}
                }
                continue;
            }
            match c {
                '"' => in_str = true,
                '{' | '[' => depth += 1,
                '}' | ']' => {
                    depth -= 1;
                    if depth < 0 {
                        return false;
                    }
                }
                _ => {}
            }
        }
        depth == 0 && !in_str
    }
}
