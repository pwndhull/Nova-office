# Licensing & Trademark Policy

## Summary

- **Nova Office is licensed under the Mozilla Public License 2.0 (MPL-2.0).**
  Full text: [`LICENSE`](../LICENSE). Attribution: [`NOTICE`](../NOTICE).
- The upstream engine (LibreOffice `core`) is MPL-2.0, with parts also
  historically available under LGPLv3+. Nova's own contributions are MPL-2.0.
- **No LibreOffice or The Document Foundation trademark, logo, or brand asset
  appears in Nova Office's user-visible product surfaces.** References to
  "LibreOffice" in source, docs, and commit messages are *nominative* — they
  describe the engine or a compatibility target, nothing more.

## Why MPL-2.0

MPL-2.0 is a file-level copyleft. It matches upstream, so engine changes flow
back cleanly, while still allowing Nova to combine MPL files with larger works
under other terms (MPL §3.3). It is OSI-approved, GPL-compatible (via the
optional secondary-license mechanism upstream already uses), and imposes no
per-copy notice burden beyond preserving headers.

## Obligations when distributing Nova Office

MPL-2.0 attaches to **Covered Software** — every file that carries an MPL
header, plus files Nova adds under MPL.

1. **Source availability (§3.2).** Anyone who receives a Nova Office binary must
   be able to get the Source Code Form of the Covered Software it was built
   from, at no charge, for as long as the binary is distributed. In practice:
   publish the exact `nova-main` (and downstream fork) commit for every release,
   and link it from Help ▸ About and the download page.
2. **Keep notices (§3.4).** Do not remove or alter copyright, patent,
   trademark, or attribution notices in the Source Code Form. This includes
   upstream per-file MPL headers — CI checks for header stripping.
3. **Ship the licence (§3.1).** Include [`LICENSE`](../LICENSE) and
   [`NOTICE`](../NOTICE) with every binary distribution and in the installer.
4. **Larger Work (§3.3).** Nova's non-MPL assets (icons, brand, marketing) may
   carry their own licence, but the MPL files stay MPL and their source stays
   available.
5. **No warranty / liability disclaimer (§6, §7).** Preserve as-is.

## Third-party components

The engine bundles or links ICU, HarfBuzz, Skia, Boost, libxml2, Curl, NSS,
Python and others — see [`architecture/dependency-graph.md`](architecture/dependency-graph.md).
Each has its own licence (mostly permissive: MIT/BSD/Apache/Unicode, plus
LGPL for a few). A release must ship a **third-party licence bundle**
(`about:licenses` / `licenses/` in the install tree). This is generated from
`core`'s `readlicense_oo/` module during the engine build; Nova extends it with
`ui/` package licences (`npm run licenses:report`, planned in `scripts/`).

## Trademark policy (the hard rule)

The project brief requires: **never use LibreOffice trademarks in the product
branding; rename all visible branding to Nova Office.**

**Allowed (nominative use):**
- Source comments, docs, and commit messages that say Nova is built on the
  LibreOffice engine or is compatible with LibreOffice.
- A single factual attribution line in Help ▸ About and `NOTICE`:
  "Built on the LibreOffice technology / OpenOffice.org, Copyright © The
  Document Foundation and contributors."
- Describing file-format compatibility ("opens LibreOffice ODF documents").

**Not allowed:**
- The LibreOffice name or logo in the app name, window titles, splash screen,
  installer, icons, dock/taskbar identity, About dialog headline, website
  branding, or marketing.
- Any implication of endorsement, affiliation, or official status.
- Shipping the upstream `icon-themes/*` marks or the LibreOffice document
  icons unchanged as Nova's identity (Nova ships its own — `assets/branding`,
  `ui/icons`).

**Rename checklist (tracked in Phase 15):**
`instsetoo_native/` product config, `soffice`/`swriter`/… branding strings in
`*/uiconfig` and `officecfg`, `sysui/` desktop integration (`.desktop`,
`Info.plist`, MIME/icon registration), `setup_native/` installer strings,
`readlicense_oo/`, `extras/` sample templates, `windows` resource files, the
About dialog (`cui/source/dialogs/about.cxx`), and the splash
(`vcl/source/window/introwindow.cxx` / the `intro.png` asset).

## Contributor licensing

Contributions are accepted under MPL-2.0 with a **Developer Certificate of
Origin** sign-off (`Signed-off-by:` in every commit). Nova does **not** require
a CLA and does **not** ask for copyright assignment. Contributors retain
copyright; the DCO records that they have the right to submit under MPL-2.0.
See [`contribution.md`](contribution.md).

## Files that must never be modified except to add, not remove

- `LICENSE` — the MPL-2.0 text, verbatim.
- Per-file MPL headers anywhere in the tree.
- Upstream `NOTICE`/`readlicense_oo` attribution content (Nova appends, never
  edits).
