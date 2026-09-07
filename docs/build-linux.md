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

## 7. CI on free GitHub-hosted runners

The `nova-build` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
attempts the LibreOffice build on a stock `ubuntu-latest` runner (4 vCPU / 16 GB
RAM / ~14 GB SSD). This is **best-effort**:

- `jlumbroso/free-disk-space` reclaims ~25–30 GB (Android SDK, .NET, GHC, …) →
  ~40–55 GB usable. A `--enable-mergelibs` build fits; a full debug build may not.
- `hendrikmuhs/ccache-action` persists a 5 GB ccache between runs, so the
  *first* run is slow (4–6 h, may hit the 350-min cap) and later runs are fast.
- It runs only on **manual dispatch** or the **weekly schedule**, never on push,
  and is `continue-on-error` until it is proven to complete end-to-end.
- On success it uploads `instdir/` as an artifact (5-day retention).

If the free runner proves unable to finish a cold build, the fallback is a
one-time build on any 8-core+/64 GB+/100 GB machine (a cloud spot VM for a few
hours is enough) to seed the ccache artifact, after which the free runner keeps
it warm. Tracked as [`risks.md`](risks.md) R-1.

## 8. Status

`bootstrap-upstream.sh` and `nova-autogen.sh` are implemented. The Nova gbuild
modules are **NOT IMPLEMENTED** yet (created per phase once a build completes).
This document is the target procedure.
