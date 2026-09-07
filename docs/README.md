<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova-Office Documentation

## Start here

1. [`MASTER_IMPLEMENTATION_PLAN.md`](MASTER_IMPLEMENTATION_PLAN.md) — the plan (TRD §48)
2. [`architecture-analysis.md`](architecture-analysis.md) — how LibreOffice is built
3. [`architecture.md`](architecture.md) — the target Nova architecture
4. [`roadmap.md`](roadmap.md) + [`../TASKS.md`](../TASKS.md) — what's done / next

## Phase 0 deliverables

| Doc | Covers |
|-----|--------|
| [architecture-analysis.md](architecture-analysis.md) | LibreOffice modules, doc models, filters, UNO/VCL/SFX, collaboration surface, tests |
| [architecture.md](architecture.md) | Layered Nova design, Document Abstraction seam, Notes model, workspace, shell, directory structure |
| [dependency-map.md](dependency-map.md) | LO + Nova dependencies and licenses, policy |
| [licensing.md](licensing.md) | MPL-2.0/LGPL analysis, compliance rules, configure policy |
| [collaboration-evaluation.md](collaboration-evaluation.md) | Yjs vs Automerge vs OT vs LOK — decision + rationale |
| [design-system.md](design-system.md) | Tokens + component specs, theming, accessibility |
| [offline.md](offline.md) · [sync.md](sync.md) · [collaboration.md](collaboration.md) | Offline guarantee, sync pipeline, optional collab layer |
| [security.md](security.md) · [privacy.md](privacy.md) | Threat model, crypto reuse; telemetry-off-by-default |
| [plugin-system.md](plugin-system.md) | Capability-scoped plugin model |
| [rebranding.md](rebranding.md) · [upstream-strategy.md](upstream-strategy.md) | `product/` config layer; submodule + patch process |
| [build-linux.md](build-linux.md) · [build-macos.md](build-macos.md) · [build-windows.md](build-windows.md) | Per-platform build |
| [development.md](development.md) · [contributing.md](contributing.md) | Dev setup, standards, workflow |
| [risks.md](risks.md) | Risk register + complexity estimates |

## Decisions

[`adr/`](adr/) — Architecture Decision Records. Template: [`adr/0000-template.md`](adr/0000-template.md).

- ADR-0001 — LibreOffice as pinned submodule; this repo = Experience Layer
- ADR-0002 — MPL-2.0 for new Nova code
- ADR-0003 — Yrs (Y-CRDT) for Notes/metadata; hybrid for Office docs
- ADR-0004 — SQLite + FTS5 for Nova metadata & search
- ADR-0005 — VCL, not a web runtime, for the shell and editors

## Still to write (later phases)

`architecture.md` is the umbrella; per-module design docs land with their code.
`CODE_OF_CONDUCT.md`, `THIRD_PARTY_NOTICES`, PGP key — before first release.
