<!-- SPDX-License-Identifier: MPL-2.0 -->
# Building Nova-Office on Windows

TRD §38, §23. Windows is priority-2 platform (TRD §21).

> ⚠️ ~50–80 GB disk, 16 GB RAM, 2–5 h first build. Build runs under **Cygwin**
> (upstream requirement) driving MSVC. `[VERIFY]` exact versions.

## 1. Prerequisites

- Visual Studio (Community OK) with "Desktop development with C++", the Windows
  SDK, and the specific MSVC toolset version required by the pinned tag
  (`[VERIFY]` `configure.ac`).
- **Cygwin** (64-bit) with: `git`, `make`, `autoconf`, `nasm`, `perl`, `zip`,
  `openssl`, `python3`.
- **Ant + a JDK** only if Java features are enabled (Nova default: `--without-java`).
- Node ≥ 20 (native Windows install is fine for the generators).
- Rust (MSVC toolchain: `rustup default stable-x86_64-pc-windows-msvc`).
- `dbghelp`, Windows SDK debuggers for crash symbols.

## 2. Fetch upstream

From a Cygwin shell, in a **short path** (e.g. `C:\nova`, to avoid `MAX_PATH`):
```bash
git clone <this-repo> /cygdrive/c/nova && cd /cygdrive/c/nova
./scripts/bootstrap-upstream.sh
```

## 3–5. Configure / build / test

```bash
./scripts/nova-autogen.sh          # adds --host=x86_64-pc-cygwin, MSVC detection
cd third_party/libreoffice && ./autogen.sh
node ../../scripts/build-tokens.mjs && node ../../scripts/gen-branding.mjs
make
make check && make nova.check
```
Backend: `vcl/win` (GDI/Direct2D/DirectWrite) or Skia. High-DPI + system theme
handled by `vcl` (TRD §23) — `[VERIFY]` dark-mode completeness.

## 6. Windows experience (TRD §23) — NOT IMPLEMENTED

Native shortcuts & conventions (reuse `vcl/win`), native file dialogs
(`fpicker/source/win32`), IAccessible2/UIA a11y (`winaccessibility/`), shell
integration & thumbnails (`shell/`), high-DPI, window management → Nova shell
work in later phases.

## 7. Packaging (Phase 10)

MSI via `instsetoo_native` + WiX; Authenticode signing; per-user + per-machine;
`version.rc` and file associations from `gen-branding.mjs`. **TODO.**

## 8. Status

Bootstrap works. Windows Nova code + MSI: **NOT IMPLEMENTED** — needs a Windows
build host.
