<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova-Office build status

_Auto-updated by the `Nova build (LibreOffice)` workflow after each run._

## CI (fast checks) — ✅ green

Experience Layer + Rust cores pass on every push.

## Full build (LibreOffice) — 🟡 compiling

| Run | Result | Fix |
|-----|--------|-----|
| #1 | ❌ `configure: --without-lto` unrecognized | removed the flag |
| #2 | ❌ `configure: gperf not found` | added gperf + X11/GL/cairo/dbus headers |
| #3 | ✅ **configure passed** → ❌ `make: no target 'build-nocheck'` | `make build` |
| #4 | ❌ `make`: `Module does not exist: nova_config` (our patch registered a module dir that isn't in the LO tree) | **deferred patches 0001+0002** — the base build needs zero patches; branding is a `./configure` flag |
| #5 | 🟡 running (still old code — will fail the same way, then auto-chains #6 with the fix) | — |
| #6+ | zero patches → straight into `make build` | — |

**`configure` is solved.** `make build` is the ~10M-line compile.

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
