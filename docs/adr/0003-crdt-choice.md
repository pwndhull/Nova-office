<!-- SPDX-License-Identifier: MPL-2.0 -->
# ADR-0003: Yrs (Y-CRDT) for Nova Notes + metadata; hybrid model for Office docs

- **Status:** accepted (re-evaluate before Phase 5 and Phase 8)
- **Date:** 2026-09-07
- **TRD refs:** §13, §14, §15

## Context

Four content models with different merge semantics (Notes tree, small metadata
records, LibreOffice document bodies, opaque blobs). The TRD forbids picking a
CRDT just because it is popular (§15) and forbids silent overwrite (§14).

## Decision

- **Nova Notes + metadata/comments/properties → Yrs (Rust Y-CRDT, MIT), via its
  C FFI.** Notes model is designed as a CRDT-friendly block tree mapping to
  `Y.Array`/`Y.Map`/`Y.Text`; awareness protocol for presence.
- **Office documents → hybrid:** content-addressed revision snapshot store +
  commit graph + explicit conflict records; async sync uploads/downloads whole
  or delta revisions. Live co-editing (Phase 8, EXPERIMENTAL) = a LOK
  authoritative session (Collabora Online model).
- Provider-neutral `NovaSyncEnvelope` wire format; any conforming server works.

Full analysis: [`../collaboration-evaluation.md`](../collaboration-evaluation.md).

## Alternatives considered

- **Automerge / automerge-repo** — viable for Notes; Yrs wins on editor maturity
  and footprint. Kept as fallback for a rich multi-doc history need.
- **Loro** — promising rich-tree CRDT; explicit re-evaluation point before Phase 5.
- **Custom OT** — rejected as a general mechanism (correctness/maintenance);
  used only inside the LOK session where an authoritative order already exists.
- **Full CRDT over Writer/Calc bodies** — rejected: layout/filter invariants not
  safely expressible as ops; tombstone growth.

## Consequences

- +: Real offline merge for the parts we control; no unsafe automation over
  Office docs; provider neutrality.
- −: A Rust toolchain enters the build (kept tiny: CRDT + sync codec only);
  snapshot/GC strategy needed for Yrs logs.
- Follow-ups: `ycrdt/` + `nova_sync_core/` Rust libs; `Nova_Rust.mk` gbuild
  class; GC/compaction design.
