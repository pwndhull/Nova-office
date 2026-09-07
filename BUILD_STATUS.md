<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova-Office build status

_The `Nova build (LibreOffice)` workflow overwrites this file after every run.
This initial version is written by hand._

## CI (fast checks) — ✅ green

`CI` workflow (`.github/workflows/ci.yml`) on every push:
- Experience Layer: design tokens + contrast gate, branding generation,
  no-hardcoded-branding, SPDX headers, 15 unit tests — **passing**
- Rust cores: fmt + clippy `-D warnings` + 34 tests + release build — **passing**

## Full build (LibreOffice) — 🟡 in progress

`Nova build (LibreOffice)` workflow (`.github/workflows/nova-libreoffice-build.yml`):
- Fetches pinned LibreOffice `libreoffice-25.8.7.3`, applies Nova patches
  0001 + 0002, configures with `--with-product-name='Nova-Office'` +
  low-memory flags, runs `make build-nocheck`.
- **Resumable:** an 8 GB persistent ccache + cached external tarballs mean each
  run compiles much more than the last. A cold build exceeds the 6 h job limit;
  it auto-resumes every 6 h (and on demand) until `instdir/` exists.
- On completion: uploads `nova-office-linux-x86_64.tar.gz` as a run artifact
  (14-day retention) and flips this file to ✅.

**Watch:** <https://github.com/pwndhull/Nova-office/actions/workflows/nova-libreoffice-build.yml>

### First run started
2026-09-07 ~08:50 UTC — run
[#1](https://github.com/pwndhull/Nova-office/actions/runs/34102759305).
Expect the first 1–3 runs to be shakedown (dependency/config issues get fixed as
they surface).

## What the finished build gives you

LibreOffice compiled from our pinned source, **branded as "Nova-Office"** (name,
vendor, about box) with the Nova settings tree (`org.openoffice.Nova`). The new
Nova shell UI (command palette, sidebar, Notes editor) is **not** in this build —
that's `nova_shell` / `nova_theme`, still to be written (Stage C).
