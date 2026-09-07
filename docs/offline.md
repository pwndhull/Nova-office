<!-- SPDX-License-Identifier: MPL-2.0 -->
# Offline-First Architecture

TRD §8, §9, §46: offline is priority #2 (after data integrity) and is **never**
sacrificed for cloud features (TRD §43.10).

## 1. Guarantee

With **no network at any point**, the user can: create / open / edit / save /
format documents; use spreadsheets & formulas; build presentations; print;
export; import supported formats; use Nova Notes; search local content; manage
workspaces; view/restore local version history; create/read/resolve comments.

## 2. How it's enforced

| Mechanism | Effect |
|-----------|--------|
| Canonical content = plain files (ODT/ODS/ODP/`.nova`) on local disk | nothing to fetch |
| LibreOffice engine + filters run in-process | no server round-trip for editing/format/print/export |
| All collaboration/sync/AI/account services are **interfaces with a Local/None default** (`architecture.md` §6) | absent network = default path, no error |
| Metadata, index, versions, comments, queue in local SQLite | full workspace UX offline |
| Search = SQLite FTS5, local | no cloud search (TRD §27) |
| Version history = local content-addressed blob store | no cloud storage needed (TRD §29) |
| Sync engine only *drains a queue* when connectivity appears | offline = queue grows, nothing blocks |

## 3. Connectivity model

- A `nova::NetworkMonitor` reports `Online / Offline / Metered / Captive`.
- UI shows a single unobtrusive **offline indicator** in the status area
  (TRD §6). No modal nags.
- Transitions are events; the SyncEngine subscribes. No polling (TRD §32).
- "Metered" → sync deferred / user-gated by preference.

## 4. Degradation matrix

| Feature | Offline behavior |
|---------|-----------------|
| Editing, formatting, formulas, print, export/import | **Full** |
| Nova Notes (incl. CRDT local merge across your own devices later) | **Full** |
| Search | **Full** (local index) |
| Version history | **Full** (local) |
| Comments | **Full** create/edit/resolve; sync later |
| Sharing / presence / live co-edit | Unavailable; queued intent where meaningful; clear UI state |
| AI (remote provider) | Unavailable; local provider still works if configured |
| Account/login | Cached session; write actions queue |

## 5. Data-safety rules offline

- Autosave to the real file + optional revision commit on an interval.
- Crash recovery via `sfx2` backup + Nova revision store.
- Nothing in the offline path can lose or silently mutate user content
  (TRD §43.11). Queue entries are append-only and idempotent.

## 6. Tests (TRD §37)

`tests/offline/`: airplane-mode create/edit/save/reopen; large doc offline;
Notes offline multi-edit; search offline; version restore offline; then
reconnect → queue drains → no data change unless expected. Run in CI with
network namespaces / a blocking proxy.
