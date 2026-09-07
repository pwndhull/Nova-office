<!-- SPDX-License-Identifier: MPL-2.0 -->
# Building Nova-Office on Linux

TRD §38. Understand the LibreOffice build before changing it — this wraps it,
does not replace it.

> ⚠️ A full LibreOffice build needs **~25–50 GB free disk**, **8 GB+ RAM**
> (16 GB recommended), and **1–4 hours** on first build. `ccache` strongly
> recommended. Numbers `[VERIFY]` against the pinned tag.

## 1. Prerequisites (Debian/Ubuntu example)

```bash
sudo apt build-dep libreoffice          # pulls the big list
sudo apt install git ccache nasm python3 default-jdk-headless \
     libkrb5-dev libgtk-3-dev
# Rust toolchain (for nova_sync_core / ycrdt)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Node (for token/branding generators)
#   node >= 20
```
Fedora: `sudo dnf builddep libreoffice`. openSUSE: `zypper si -d libreoffice`.

## 2. Fetch upstream

```bash
git clone <this-repo> Nova-office && cd Nova-office
./scripts/bootstrap-upstream.sh          # inits third_party/libreoffice submodule
                                         # at the pinned tag, writes UPSTREAM_PIN
```

## 3. Configure

```bash
./scripts/nova-autogen.sh                # writes third_party/libreoffice/autogen.input
                                         # from the Nova compliance-first flag set
                                         # (see docs/licensing.md §5) + --enable-nova
cd third_party/libreoffice && ./autogen.sh
```

Key Nova flags injected: `--disable-poppler --without-java --disable-coinmp
--disable-lpsolve --enable-mergelibs --enable-nova
--with-nova-product=../../product/product.yaml`.

## 4. Build

```bash
# generators first (branding header + tokens the C++ needs)
node ../../scripts/build-tokens.mjs
node ../../scripts/gen-branding.mjs

make                                     # full build
make Writer                              # run built product
make nova_shell.build                    # single Nova module
```

## 5. Test

```bash
make check                               # upstream unit/integration (keep green!)
make nova.check                          # Nova module tests
make -C ../../tests compat               # DOCX/XLSX/PPTX/PDF roundtrip corpus
make -C ../../tests offline sync conflict
```

## 6. Package

`make deb` / `make rpm` (upstream `instsetoo_native`) — Nova branding files come
from `scp2` overlays generated from `product.yaml`. AppImage/Flatpak manifests
in `nova-server/deploy/` … actually `packaging/linux/` — **TODO Phase 10**.

## 7. Status

`bootstrap-upstream.sh` is implemented. `nova-autogen.sh` and the Nova gbuild
modules are **NOT IMPLEMENTED** yet (need a machine that can actually build LO).
This document is the target procedure.
