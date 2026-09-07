<!-- SPDX-License-Identifier: MPL-2.0 -->
# `nova/` — Nova Experience Layer modules

Additive gbuild modules (`nova_` prefix) that sit **on top of** the pinned
LibreOffice submodule with no invasive core edits (ADR-0001,
[`../docs/architecture.md`](../docs/architecture.md) §9).

| Module | Purpose | Status |
|--------|---------|--------|
| `design-tokens/` | Visual token source + multi-target build | **implemented** (standalone) |
| `nova_branding` | Generated branding header + `.xcu`; brand service | scaffolded (generator done; C++ pending build) |
| `nova_theme` | Tokens → VCL `StyleSettings`; Light/Dark/System/HC | NOT IMPLEMENTED — needs LO build |
| `nova_config` | `Nova.xcs` schema + defaults + UI-mode `.xcu` | NOT IMPLEMENTED |
| `nova_nda` | Nova Document Abstraction + per-engine adapters | NOT IMPLEMENTED |
| `nova_shell` | Shell window, menu, contextual toolbar, status area | NOT IMPLEMENTED |
| `nova_palette` | Command palette + command registry | NOT IMPLEMENTED |
| `nova_sidebar` | Files / Pages / Outline / Comments deck | NOT IMPLEMENTED |
| `nova_tabs` | Document tab bar + session restore | NOT IMPLEMENTED |
| `nova_filebrowser` | Grid/list file browser | NOT IMPLEMENTED |
| `nova_workspace` | Workspace model + SQLite store + scanner | NOT IMPLEMENTED |
| `nova_search` | FTS5 index + query service + extractors | NOT IMPLEMENTED |
| `nova_versioning` | Snapshot store, commit graph, diff | NOT IMPLEMENTED |
| `nova_sync` | Offline queue + sync engine + providers (C++) | NOT IMPLEMENTED |
| `nova_sync/nova_sync_core/` (Rust) | Envelope codec, SHA-256 integrity, backoff + C ABI | **implemented** (18 tests, clippy/fmt clean, standalone) |
| `nova_collab` | CollabController + provider interfaces + LOK session | NOT IMPLEMENTED |
| `nova_notes` | Notes model host, `.nova` filter, editor widget (C++) | NOT IMPLEMENTED |
| `nova_notes/ycrdt/` (Rust) | Notes block-tree CRDT over `yrs` + C ABI | **implemented** (13 tests inc. convergence; clippy/fmt clean; standalone) |
| `nova_ai` | Provider interface + built-in providers (off by default) | NOT IMPLEMENTED |
| `nova_plugin` | Capability-scoped plugin host | NOT IMPLEMENTED (post-v1) |

Nothing here is faked (TRD §45). Modules are created as real gbuild modules when
their phase starts and a LibreOffice build host is available
([`../docs/risks.md`](../docs/risks.md) R-1).
