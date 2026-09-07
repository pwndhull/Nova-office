<!-- SPDX-License-Identifier: MPL-2.0 -->
# `tests/` — cross-module test suites

TRD §37. Per-module unit tests live with their module (`CppunitTest_nova_*`);
this directory holds the cross-cutting suites.

| Suite | What it proves | Status |
|-------|----------------|--------|
| `compat/` | DOCX/XLSX/PPTX/ODT/ODS/ODP/PDF roundtrip against a fixture corpus; Nova must not regress upstream filter fidelity (TRD §10) | **NOT IMPLEMENTED** — corpus + harness pending build |
| `offline/` | create/edit/save/reopen with network blocked; large docs; Notes; search; version restore — all offline (TRD §8) | NOT IMPLEMENTED |
| `sync/` | reconnect drains queue; interrupted upload resumes; backoff schedule; 500-envelope queue; provider swap (TRD §14) | NOT IMPLEMENTED |
| `conflict/` | concurrent edits → conflict record, never silent overwrite; each resolution path (TRD §14, §43.11) | NOT IMPLEMENTED |
| `a11y/` | keyboard-only traversal of every Nova surface; SR labels; reduced-motion; text scaling; HC theme (TRD §31) | NOT IMPLEMENTED |
| `perf/` | startup, doc load/save, search, sync, memory; Notes 10k blocks; Calc 1M cells; Impress 100 slides — tracked vs baseline (TRD §32) | NOT IMPLEMENTED |

## What runs today

The Experience-Layer tests (no LibreOffice needed):

```bash
npm test        # node:test — design tokens + branding generator + parsers
npm run check   # + token contrast gate, product.yaml validation,
                #   no-hardcoded-branding, SPDX headers
```

CI: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). The
LibreOffice-linked job is commented out until a build host exists
([`../docs/risks.md`](../docs/risks.md) R-1).
