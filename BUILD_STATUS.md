<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova-Office build status

_The `Nova build (LibreOffice)` workflow overwrites this file after each run._

## CI (fast checks) — ✅ green

- Experience Layer: tokens + contrast gate, branding, no-hardcoded-branding,
  SPDX, 15 unit tests — passing
- Rust cores: fmt + clippy `-D warnings` + 34 tests + release build — passing

## Full build (LibreOffice) — 🟡 iterating

| Run | Result | Fix applied |
|-----|--------|-------------|
| #1 | ❌ configure: `unrecognized options: --without-lto` | removed `--without-lto` |
| #2 | ❌ configure: `gperf not found` (got much further — cups/fontconfig/linker/perl all OK) | added gperf + X11/GL/cairo/dbus/gpgme headers |
| [#3](https://github.com/pwndhull/Nova-office/actions/runs/34103705160) | 🟡 running | — |

Clone ✓, Nova patches 0001+0002 apply ✓, generators + branding flags ✓.
Currently past those; `configure` → `make` is the frontier.

**Resumable:** 8 GB persistent ccache + cached dependency tarballs → each run
compiles far more than the last; the cold build needs 2-4 runs. Auto-resumes
every 6 h and on each push to `.github/build-trigger`.

**Watch:** <https://github.com/pwndhull/Nova-office/actions/workflows/nova-libreoffice-build.yml>

## What the finished build gives you

LibreOffice from our pinned source, **branded "Nova-Office"** (name, vendor,
about box) + the Nova settings tree. The new Nova shell UI (palette, sidebar,
Notes editor, Nova theming) is `nova_theme` / `nova_shell` — written next, once
this base build is green.
