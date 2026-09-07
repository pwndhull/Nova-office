<!-- SPDX-License-Identifier: MPL-2.0 -->
# ADR-0001: LibreOffice consumed as a pinned submodule; this repo is the Experience Layer

- **Status:** accepted
- **Date:** 2026-09-07
- **TRD refs:** §1, §33, §41, §43

## Context

Nova-Office is "based on the LibreOffice codebase" but must stay upstream-
mergeable (§41) and keep Nova code separated (§33, §43.6). LibreOffice is a
~10 MLOC monorepo. Options for how our repo relates to it.

## Decision

This repository is the **Nova Experience Layer**. LibreOffice core is a **git
submodule** at `third_party/libreoffice`, pinned via `third_party/UPSTREAM_PIN`
(initial pin: `libreoffice-25.8.7.3`). Nova code is **additive gbuild modules**
under `nova/` plus config overlays; direct upstream edits go in an enumerated
`patches/` set, each with a rationale and an upstreaming plan.

## Alternatives considered

- **Hard fork (copy the tree in-repo).** Rejected: enormous repo, painful
  rebases, invites divergence, obscures provenance.
- **Vendored subtree.** Rejected as default: same size problem; loses clean
  upstream `git` history. Kept only as a last-resort fallback with `PROVENANCE.md`.
- **Downstream patch queue only (quilt/stgit), no submodule.** Rejected: still
  needs the source somewhere; submodule is the standard tool.

## Consequences

- +: Upstreams cleanly; small diff surface; `[VERIFY]` checklist localizes API
  drift to `nova_nda/` adapters.
- −: Contributors need the large submodule checkout; two-step clone.
- Follow-ups: `scripts/bootstrap-upstream.sh` (done), `scripts/nova-autogen.sh`
  + `scripts/apply-patches.sh` (TODO), `upstream-track` branch process
  ([`../upstream-strategy.md`](../upstream-strategy.md)).
