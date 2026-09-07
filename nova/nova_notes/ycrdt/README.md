<!-- SPDX-License-Identifier: MPL-2.0 -->
# ycrdt

The **Nova Notes block-tree CRDT** — a thin wrapper over `yrs` (Y-CRDT,
[ADR-0003](../../../docs/adr/0003-crdt-choice.md)) that exposes *only* the Nova
Notes document model ([docs/architecture.md §4](../../../docs/architecture.md))
and a C ABI for the C++ `nova_notes` module. The reference server (Rust,
[ADR-0006](../../../docs/adr/0006-server-language-rust.md)) links the same crate,
so client and server share one CRDT implementation and one update format.

## Model

Three **root** shared types (root types merge deterministically; nested
containers would clobber on concurrent creation):

```
"meta"   : Y.Map     page metadata
"props"  : Y.Map     page properties / database fields
"blocks" : Y.Array   each block = Y.Map { id, kind, text: Y.Text, props: Y.Map, children: Y.Array }
```

## API (Rust)

`NotesDoc::new(actor_id)` · `insert_block` / `insert_child_block` /
`set_block_kind` / `set_block_prop` / `remove_block` · `block_text_insert` /
`block_text_remove` / `block_text` · `set_meta` / `get_meta` / `set_prop` ·
`blocks()` → `Vec<BlockView>` · **sync:** `state_vector` / `encode_diff` /
`encode_full` / `apply_update` / `from_snapshot` · `to_document_json()` (the
portable `document.json` for the `.nova` package).

## C ABI

`include/ycrdt.h` (hand-written; cbindgen verifies it in the build). Opaque
`NotesDocHandle*`, caller-owned `YBuf`.

## Tested (13 tests, `cargo test -p ycrdt`)

- block CRUD, nesting, props, kind changes, removal
- **concurrent block inserts converge** to an identical tree after a diff exchange
- **concurrent text edits merge** (character-level)
- **two independently-created docs merge** without losing either side's blocks
  or meta (validates the root-types decision)
- snapshot encode → `from_snapshot` roundtrip (blocks + meta)
- `document.json` is well-formed with the block tree
- malformed updates are rejected

## NOT IN SCOPE (tracked in [`../../../TASKS.md`](../../../TASKS.md))

`.nova` package format, media/blob store, backlink graph, slash-command UX,
editor layout, snapshot-GC policy (this crate exposes snapshot/restore; *when*
to compact is the host's decision), rich-text marks encoding (currently plain
`Y.Text`; inline bold/italic/link/mention marks land with the editor).

## Dependency

`yrs = 0.27` (MIT) + its tree (`serde`, `smallvec`, `thiserror`, `arc-swap`,
`rand`, … — all permissive). `Cargo.lock` at the workspace root pins exact
versions; `cargo deny` (planned) enforces the license policy.
