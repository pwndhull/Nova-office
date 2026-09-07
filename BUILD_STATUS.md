<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova-Office build status

_Auto-updated by the `Nova build (LibreOffice)` workflow after each run._

## CI (fast checks) — ✅ green

Experience Layer + Rust cores pass on every push.

## Full build (LibreOffice) — 🟡 compiling

| Run | Result | Fix |
|-----|--------|-----|
| #1 | ❌ `configure: unrecognized options: --without-lto` | removed the flag |
| #2 | ❌ `configure: gperf not found` | added gperf + X11/GL/cairo/dbus headers |
| #3 | ✅ **configure passed** → ❌ `make: No rule to make target 'build-nocheck'` | `make build` |
| #4 | 🟡 first real compile pass (`make build`, cold ccache) | — |
| #5+ | queued — auto-resume from warm ccache | — |

**`configure` is solved.** Now it's `make build` — a ~10M-line compile.

### How it finishes on its own
Each run compiles for up to 320 min then saves its ccache. A run that ends
incomplete **auto-chains the next run** (`.github/build-trigger`), which resumes
from the warm ccache and gets much further. This repeats (cap: 20 attempts)
until `soffice.bin` exists, then the run uploads
**`nova-office-linux-x86_64.tar.gz`** and flips this file to ✅.

Cold first pass + warm resume ≈ 2–4 chained runs.

**Watch:** <https://github.com/pwndhull/Nova-office/actions/workflows/nova-libreoffice-build.yml>

## After it's green

LibreOffice from our pinned source, **branded "Nova-Office"** + Nova settings
tree. The new shell UI (`nova_theme` colours, command palette, sidebar, Notes
editor) is written next, on top of this base.
