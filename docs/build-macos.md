<!-- SPDX-License-Identifier: MPL-2.0 -->
# Building Nova-Office on macOS

TRD §38, §22. macOS is priority-1 platform (TRD §21).

> ⚠️ ~40–60 GB disk, 16 GB RAM recommended, 1.5–4 h first build. `[VERIFY]`.

## 1. Prerequisites

```bash
xcode-select --install                 # Command Line Tools
# Full Xcode required for building the .app / notarization
brew install ccache nasm autoconf automake gnu-tar python@3 node
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
- Minimum macOS SDK / deployment target: `[VERIFY]` from `configure.ac`.
- Apple Silicon + Intel both supported by upstream; universal binary via two
  builds + `lipo` at packaging (Phase 10).

## 2–5. Fetch / configure / build / test

Same as [`build-linux.md`](build-linux.md) steps 2–5, with:
- backend is `vcl/osx` (Cocoa/CoreText) automatically,
- `./scripts/nova-autogen.sh` adds `--enable-macosx-sandbox` (release) and the
  `--with-macosx-version-min-required` from `UPSTREAM_PIN`,
- `make` produces `instdir/LibreOfficeDev.app` → Nova-branded via `product.yaml`.

## 6. macOS experience work (TRD §22) — mostly NOT IMPLEMENTED

| Feature | Path | Status |
|---------|------|--------|
| Native menu bar | `vcl/osx` menu bridge (upstream) + Nova menu config | reuse |
| System appearance / dark mode | `vcl` NSAppearance observation | `[VERIFY]` gaps → possible patch |
| Full-screen, window restoration | Cocoa; `nova_shell` | TODO |
| Document icons / UTIs | `Info.plist` from `gen-branding.mjs` | scaffolded |
| Native file dialogs | `fpicker/source/aqua` | reuse |
| Services, drag & drop, Continuity | Cocoa bridges | TODO / EXPERIMENTAL |
| Notarization + hardened runtime | Phase 10 packaging | TODO |

Rule (TRD §22): **not** a web page in a wrapper — VCL native backend only.

## 7. Status

Bootstrap works cross-platform. macOS-specific Nova code and packaging: **NOT
IMPLEMENTED** — needs a Mac build host.
