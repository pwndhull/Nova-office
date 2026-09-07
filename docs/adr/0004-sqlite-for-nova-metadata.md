<!-- SPDX-License-Identifier: MPL-2.0 -->
# ADR-0004: SQLite (+ FTS5) for Nova workspace metadata and local search

- **Status:** accepted
- **Date:** 2026-09-07
- **TRD refs:** §9, §27

## Context

Nova needs local storage for workspace tree, tags, favorites, page properties,
backlinks, comments, revision graph, sync queue, conflict records, and a
full-text search index — all working fully offline (§9, §27). The TRD says not
to add unnecessary databases if files suffice, but allows SQLite for Nova
metadata where appropriate (§9).

## Decision

- **Canonical document content stays in plain files** (ODT/ODS/ODP/`.nova`) — no
  lock-in.
- **Nova metadata → one SQLite database per workspace** (`workspace.novadb`),
  WAL mode. Schema in [`../architecture.md`](../architecture.md) §5.2.
- **Local search → SQLite FTS5** (built in, no extra dependency).
- Everything except `sync_queue` and `conflicts` is rebuildable by rescanning
  files (resilience).

## Alternatives considered

- **Files/JSON sidecars only** — rejected: no efficient query/index/FTS; poor
  for backlinks and the revision graph.
- **A dedicated search engine (Tantivy/Lucene) in the client** — deferred:
  FTS5 first, measure, upgrade only if it proves insufficient.
- **LMDB / RocksDB** — rejected: no SQL, no FTS, larger surface; SQLite is
  ubiquitous, public-domain, tiny.

## Consequences

- +: One well-understood, public-domain dependency covers metadata + search;
  offline by construction; easy backup/inspection.
- −: New `external/sqlite` gbuild wrapper (or `--with-system-sqlite`); schema
  migrations to maintain (`schema_migrations` table).
- Follow-ups: `nova_workspace` store + scanner; `nova_search` extractors per
  format; migration runner.
