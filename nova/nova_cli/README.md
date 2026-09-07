<!-- SPDX-License-Identifier: MPL-2.0 -->
# `nova` — runnable local Nova Notes workspace

The first thing in this repo you can actually **run as a program**. No
LibreOffice, no server, no network.

It drives the real engines — [`ycrdt`](../nova_notes/ycrdt/) (the Notes block
CRDT) and [`nova_sync_core`](../nova_sync/nova_sync_core/) (the sync envelope +
integrity) — and persists to an on-disk workspace shaped like
[`docs/architecture.md` §5.1](../../docs/architecture.md).

It is a **developer/demo tool, not the Nova-Office product**. The Writer/Sheets/
Slides apps, the Nova shell, and the Notes *editor UI* still need the
LibreOffice build.

## Build & install

```bash
cargo build --release -p nova-cli
# binary at target/release/nova  — put it on PATH, or use `cargo run -p nova-cli --`
```

## Walkthrough — two devices editing offline, then syncing

```bash
NOVA=target/release/nova

# 1. "laptop" makes a workspace and a page
$NOVA --workspace /tmp/laptop init --name Laptop
PID=$($NOVA --workspace /tmp/laptop page new "Trip plan")
$NOVA --workspace /tmp/laptop block add $PID heading "Packing list"
$NOVA --workspace /tmp/laptop block add $PID todo "Passport"

# 2. "phone" gets a copy (first sync = copy the folder)
cp -r /tmp/laptop /tmp/phone

# 3. both edit OFFLINE, independently
$NOVA --workspace /tmp/laptop block add $PID todo "Sunscreen"
$NOVA --workspace /tmp/phone  block add $PID todo "Adapter"

# 4. reconnect — merge each into the other
$NOVA --workspace /tmp/laptop sync $PID --from /tmp/phone
$NOVA --workspace /tmp/phone  sync $PID --from /tmp/laptop
#   → merged N → M blocks   integrity: ok   converged: yes

# 5. both sides are now identical
$NOVA --workspace /tmp/laptop page show $PID
$NOVA --workspace /tmp/phone  page show $PID
diff <($NOVA --workspace /tmp/laptop page show $PID --json) \
     <($NOVA --workspace /tmp/phone  page show $PID --json)   # no output = byte-identical
```

`sync` frames the other workspace's page as a checksummed `NovaSyncEnvelope`,
decodes + integrity-checks it, applies it through the CRDT, and re-checks
convergence — the same mechanism the real sync engine will use (docs/sync.md §1).

## Commands

```
nova init [--name NAME]                       create a workspace (in --workspace dir or .)
nova page new "<title>"                        → prints the page id
nova page list
nova page show <page> [--json]                 tree view, or the portable document.json
nova block add <page> <kind> "<text>" [--parent <id>] [--at <n>]
nova block check <page> <block>                toggle a todo
nova sync <page> --from <other-workspace-dir>  offline merge
nova log <page>                                revision / sync history
```

`--workspace <dir>` (or `NOVA_WORKSPACE=<dir>`) selects the workspace; default is
the current directory.

## Workspace layout

```
<workspace>/
  workspace.json          { name, pages: [{id,title}] }
  pages/<id>.nova          ycrdt full-state snapshot (the CRDT is authoritative)
  .nova/log/<id>.log       append-only revision/sync log
```

## Not implemented here

Rich-text marks, media/attachments, backlinks, databases/views, real-time
(WebSocket) sync, `.nova` Zip packaging — see [`TASKS.md`](../../TASKS.md).
