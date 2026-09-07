// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 The Nova-Office contributors
//
// `nova` — a local, offline-first Nova Notes workspace you can run today.
//
// No LibreOffice, no server, no network. It drives the real engines:
//   - ycrdt          the Nova Notes block-tree CRDT (over yrs)
//   - nova_sync_core  the NovaSyncEnvelope wire codec + integrity
// and persists to an on-disk workspace shaped like docs/architecture.md §5.1
// (simplified). `nova sync` merges another workspace's copy of a page through
// a checksummed envelope — the same mechanism the real sync engine will use.
//
// This is a developer/demo tool, not the Nova-Office product. The Writer/Sheets/
// Slides apps and the Notes *editor UI* still need the LibreOffice build.

use clap::{Parser, Subcommand};
use nova_sync_core::envelope::{Envelope, Kind};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use ycrdt::{BlockView, NotesDoc};

#[derive(Parser)]
#[command(name = "nova", version, about = "Local offline-first notes workspace")]
struct Cli {
    /// Workspace directory (default: current dir; env NOVA_WORKSPACE overrides)
    #[arg(long, global = true)]
    workspace: Option<PathBuf>,
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Create a workspace in the target directory
    Init {
        #[arg(long, default_value = "My Workspace")]
        name: String,
    },
    /// Page operations
    #[command(subcommand)]
    Page(PageCmd),
    /// Block operations
    #[command(subcommand)]
    Block(BlockCmd),
    /// Merge another workspace's copy of a page into this one (offline sync)
    Sync {
        /// Page id
        page: String,
        /// Path to the other workspace directory
        #[arg(long)]
        from: PathBuf,
    },
    /// Show the revision/sync log for a page
    Log { page: String },
}

#[derive(Subcommand)]
enum PageCmd {
    /// Create a new page, print its id
    New { title: String },
    /// List pages
    List,
    /// Render a page (tree, or --json for the portable document.json)
    Show {
        page: String,
        #[arg(long)]
        json: bool,
    },
}

#[derive(Subcommand)]
enum BlockCmd {
    /// Append a block:  nova block add <page> <kind> <text> [--parent ID] [--at N]
    Add {
        page: String,
        kind: String,
        text: String,
        #[arg(long)]
        parent: Option<String>,
        #[arg(long)]
        at: Option<u32>,
    },
    /// Toggle a todo block's checked prop
    Check { page: String, block: String },
}

// ---------------------------------------------------------------- workspace

struct Workspace {
    root: PathBuf,
}

impl Workspace {
    fn open(explicit: &Option<PathBuf>) -> Result<Self, String> {
        let root = explicit
            .clone()
            .or_else(|| std::env::var_os("NOVA_WORKSPACE").map(PathBuf::from))
            .unwrap_or_else(|| PathBuf::from("."));
        if !root.join("workspace.json").exists() {
            return Err(format!(
                "no workspace at {} — run `nova init` there first",
                root.display()
            ));
        }
        Ok(Workspace { root })
    }

    fn init(explicit: &Option<PathBuf>, name: &str) -> Result<Self, String> {
        let root = explicit.clone().unwrap_or_else(|| PathBuf::from("."));
        fs::create_dir_all(root.join("pages")).map_err(e)?;
        fs::create_dir_all(root.join(".nova/log")).map_err(e)?;
        let wsfile = root.join("workspace.json");
        if wsfile.exists() {
            return Err(format!("workspace already exists at {}", root.display()));
        }
        fs::write(&wsfile, format!("{{\"name\":{:?},\"pages\":[]}}\n", name)).map_err(e)?;
        Ok(Workspace { root })
    }

    // stable per-workspace "device" id for the CRDT actor
    fn actor_id(&self) -> u64 {
        let mut h: u64 = 1469598103934665603;
        for b in fs::canonicalize(&self.root)
            .unwrap_or(self.root.clone())
            .to_string_lossy()
            .bytes()
        {
            h ^= b as u64;
            h = h.wrapping_mul(1099511628211);
        }
        h | 1
    }

    fn page_path(&self, id: &str) -> PathBuf {
        self.root.join("pages").join(format!("{id}.nova"))
    }
    fn log_path(&self, id: &str) -> PathBuf {
        self.root.join(".nova/log").join(format!("{id}.log"))
    }

    fn read_ws_json(&self) -> String {
        fs::read_to_string(self.root.join("workspace.json")).unwrap_or_default()
    }
    fn add_page_entry(&self, id: &str, title: &str) -> Result<(), String> {
        // tiny hand edit of the pages array — the CLI is the only writer
        let s = self.read_ws_json();
        let entry = format!("{{\"id\":{id:?},\"title\":{title:?}}}");
        let out = if s.contains("\"pages\":[]") {
            s.replace("\"pages\":[]", &format!("\"pages\":[{entry}]"))
        } else {
            s.replace("\"pages\":[", &format!("\"pages\":[{entry},"))
        };
        fs::write(self.root.join("workspace.json"), out).map_err(e)
    }
    fn pages(&self) -> Vec<(String, String)> {
        let s = self.read_ws_json();
        let mut out = Vec::new();
        let mut rest = s.as_str();
        while let Some(i) = rest.find("\"id\":\"") {
            rest = &rest[i + 6..];
            let Some(j) = rest.find('"') else { break };
            let id = rest[..j].to_string();
            let title = rest
                .find("\"title\":\"")
                .and_then(|t| {
                    let t = &rest[t + 9..];
                    t.find('"').map(|q| t[..q].to_string())
                })
                .unwrap_or_default();
            out.push((id, title));
            rest = &rest[j..];
        }
        out
    }

    fn load_page(&self, id: &str) -> Result<NotesDoc, String> {
        let bytes = fs::read(self.page_path(id))
            .map_err(|_| format!("page {id} not found in this workspace"))?;
        NotesDoc::from_snapshot(self.actor_id(), &bytes)
            .ok_or_else(|| format!("page {id} snapshot is corrupt"))
    }
    fn save_page(&self, id: &str, doc: &NotesDoc) -> Result<(), String> {
        fs::write(self.page_path(id), doc.encode_full()).map_err(e)
    }
    fn append_log(&self, id: &str, line: &str) {
        let p = self.log_path(id);
        let prev = fs::read_to_string(&p).unwrap_or_default();
        let _ = fs::write(p, format!("{prev}{}  {line}\n", now_rfc3339()));
    }
}

fn e(err: std::io::Error) -> String {
    err.to_string()
}
fn now_rfc3339() -> String {
    // good enough for a local log; not a real calendar
    let s = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    format!("t+{s}")
}
fn gen_id(prefix: &str) -> String {
    let n = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("{prefix}{:x}", n & 0xffff_ffff_ffff)
}

fn print_tree(blocks: &[BlockView], depth: usize) {
    for b in blocks {
        let pad = "  ".repeat(depth);
        let text = b.text.as_deref().unwrap_or("");
        let props = if b.props.is_empty() {
            String::new()
        } else {
            let kv: Vec<_> = b.props.iter().map(|(k, v)| format!("{k}={v}")).collect();
            format!("  ({})", kv.join(", "))
        };
        println!(
            "{pad}• [{}] {text}{props}   \x1b[2m#{}\x1b[0m",
            b.kind, b.id
        );
        print_tree(&b.children, depth + 1);
    }
}

// ---------------------------------------------------------------- main

fn main() {
    if let Err(msg) = run() {
        eprintln!("\x1b[31merror:\x1b[0m {msg}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let cli = Cli::parse();

    match &cli.cmd {
        Cmd::Init { name } => {
            let ws = Workspace::init(&cli.workspace, name)?;
            println!("initialized workspace {:?} at {}", name, ws.root.display());
        }

        Cmd::Page(PageCmd::New { title }) => {
            let ws = Workspace::open(&cli.workspace)?;
            let id = gen_id("p_");
            let doc = NotesDoc::new(ws.actor_id());
            doc.set_meta("title", title);
            ws.save_page(&id, &doc)?;
            ws.add_page_entry(&id, title)?;
            ws.append_log(&id, &format!("created \"{title}\""));
            println!("{id}");
        }

        Cmd::Page(PageCmd::List) => {
            let ws = Workspace::open(&cli.workspace)?;
            let pages = ws.pages();
            if pages.is_empty() {
                println!("(no pages — `nova page new \"Title\"`)");
            }
            for (id, title) in pages {
                let n = ws.load_page(&id).map(|d| d.blocks().len()).unwrap_or(0);
                println!("{id}  {title}  ({n} blocks)");
            }
        }

        Cmd::Page(PageCmd::Show { page, json }) => {
            let ws = Workspace::open(&cli.workspace)?;
            let doc = ws.load_page(page)?;
            if *json {
                println!("{}", doc.to_document_json());
            } else {
                let title = doc.get_meta("title").unwrap_or_else(|| page.clone());
                println!("\x1b[1m{title}\x1b[0m  \x1b[2m#{page}\x1b[0m\n");
                let blocks = doc.blocks();
                if blocks.is_empty() {
                    println!("  (empty — `nova block add {page} text \"...\"`)");
                }
                print_tree(&blocks, 0);
            }
        }

        Cmd::Block(BlockCmd::Add {
            page,
            kind,
            text,
            parent,
            at,
        }) => {
            let ws = Workspace::open(&cli.workspace)?;
            let doc = ws.load_page(page)?;
            let id = gen_id("b_");
            let ok = match parent {
                Some(pid) => doc.insert_child_block(pid, at.unwrap_or(u32::MAX), &id, kind),
                None => {
                    let idx = at.unwrap_or(doc.blocks().len() as u32);
                    doc.insert_block(idx, &id, kind);
                    true
                }
            };
            if !ok {
                return Err(format!(
                    "parent block {:?} not found",
                    parent.as_deref().unwrap_or("")
                ));
            }
            if !text.is_empty() {
                doc.block_text_insert(&id, 0, text);
            }
            ws.save_page(page, &doc)?;
            ws.append_log(page, &format!("+ [{kind}] {text}  #{id}"));
            println!("{id}");
        }

        Cmd::Block(BlockCmd::Check { page, block }) => {
            let ws = Workspace::open(&cli.workspace)?;
            let doc = ws.load_page(page)?;
            let cur = doc
                .blocks()
                .iter()
                .find_map(|b| {
                    find(b, block)
                        .map(|x| x.props.iter().any(|(k, v)| k == "checked" && v == "true"))
                })
                .unwrap_or(false);
            if !doc.set_block_prop(block, "checked", if cur { "false" } else { "true" }) {
                return Err(format!("block {block} not found"));
            }
            ws.save_page(page, &doc)?;
            ws.append_log(page, &format!("check {block} -> {}", !cur));
            println!("{block} checked={}", !cur);
        }

        Cmd::Sync { page, from } => {
            let local_ws = Workspace::open(&cli.workspace)?;
            let remote_ws = Workspace { root: from.clone() };
            let remote_bytes = fs::read(remote_ws.page_path(page))
                .map_err(|_| format!("page {page} not found in {}", from.display()))?;

            let local = local_ws.load_page(page)?;
            let before = local.blocks().len();

            // Frame the remote state as a checksummed NovaSyncEnvelope, then
            // decode + integrity-check it on the receiving side (docs/sync.md §1).
            let env = Envelope::new(
                page,
                format!("actor:{:x}", remote_ws.actor_id()),
                nova_sync_core::envelope::sha256_hex(&local.encode_full()),
                nova_sync_core::envelope::sha256_hex(&remote_bytes),
                Kind::YUpdate,
                now_rfc3339(),
                0,
                remote_bytes.clone(),
            );
            let frame = env.encode();
            let received = Envelope::decode(&frame).map_err(|d| d.to_string())?;
            if !received.verify() {
                return Err("envelope integrity check FAILED — refusing to apply".into());
            }
            if !local.apply_update(&received.payload) {
                return Err("remote update was malformed".into());
            }
            local_ws.save_page(page, &local)?;
            let after = local.blocks().len();

            // convergence check: does our merged copy equal a fresh merge of both?
            let check = local_ws.load_page(page)?;
            let remote_doc = remote_ws.load_page(page)?;
            remote_doc.apply_update(&check.encode_full());
            let converged = remote_doc.blocks() == check.blocks();

            local_ws.append_log(
                page,
                &format!(
                    "sync <- {} : {before} -> {after} blocks, integrity ok, converged={converged}",
                    from.display()
                ),
            );
            println!(
                "merged {} → {} blocks   integrity: \x1b[32mok\x1b[0m   converged: {}",
                before,
                after,
                if converged {
                    "\x1b[32myes\x1b[0m"
                } else {
                    "\x1b[31mNO\x1b[0m"
                }
            );
        }

        Cmd::Log { page } => {
            let ws = Workspace::open(&cli.workspace)?;
            let log = fs::read_to_string(ws.log_path(page)).unwrap_or_default();
            if log.is_empty() {
                println!("(no log for {page})");
            } else {
                print!("{log}");
            }
        }
    }
    Ok(())
}

fn find<'a>(b: &'a BlockView, id: &str) -> Option<&'a BlockView> {
    if b.id == id {
        return Some(b);
    }
    b.children.iter().find_map(|c| find(c, id))
}
