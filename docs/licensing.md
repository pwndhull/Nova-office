<!-- SPDX-License-Identifier: MPL-2.0 -->
# Licensing & Open-Source Compliance (Phase 0)

Authoritative rules for keeping Nova-Office legally distributable (TRD §2, §43).
Companion inventory: [`dependency-map.md`](dependency-map.md).

> This is engineering guidance, not legal advice. Before the first public binary
> release, a qualified open-source lawyer must review this document, the
> generated `THIRD_PARTY_NOTICES`, and the final `configure` flag set.

---

## 1. LibreOffice's own license

LibreOffice core is dual/multi-licensed:

- **MPL-2.0** (Mozilla Public License 2.0), and
- **LGPL-3.0-or-later** (historically "LGPLv3+"; some very old files also carry
  Apache-2.0 from the OpenOffice.org contribution, or GPL headers in specific
  modules).

New contributions to upstream are **MPL-2.0 / LGPL-3.0+**. The Document
Foundation does **not** require copyright assignment.

**Consequences for Nova:**
- We may fork and redistribute, modified, under the same terms.
- **File-level copyleft (MPL-2.0):** if we modify an MPL-2.0 source file, that
  file's source (with modifications) must remain available under MPL-2.0.
- **LGPL-3.0+:** we must allow the LGPL portions to be replaced/relinked by the
  user, provide corresponding source, and not impose further restrictions;
  anti-tivoization and patent terms apply.
- We must **keep every copyright header and `LICENSE`/`NOTICE` file** (TRD §2).
- We must **not** claim LibreOffice code is original Nova work.

## 2. Nova-Office outbound license

**New Nova code → MPL-2.0** (`LICENSE` at repo root).

Rationale:
- Compatible with linking against MPL-2.0 + LGPL-3.0+ LibreOffice.
- File-level copyleft keeps improvements open (TRD open-source goal) without the
  whole-program reach of GPL — lets the reference server and plugins pick their
  own compatible licenses.
- Same license the upstream community already uses → easy contribution flow both
  ways.

Every new source file starts with:

```
// SPDX-License-Identifier: MPL-2.0
// Copyright (c) <year> The Nova-Office contributors
// This Source Code Form is subject to the terms of the Mozilla Public License,
// v. 2.0. If a copy of the MPL was not distributed with this file, You can
// obtain one at https://mozilla.org/MPL/2.0/.
```

Config/YAML/JSON/Markdown: `SPDX-License-Identifier: MPL-2.0` comment where the
format allows.

### Component license exceptions (deliberate)
| Area | License | Why |
|------|---------|-----|
| `nova/design-tokens`, `product/` generators, SDK headers, examples | **MPL-2.0** (could relax to Apache-2.0 later by ADR) | encourage reuse |
| `nova-server/` reference backend | **MPL-2.0** or **Apache-2.0** (ADR pending) | self-hosters may embed |
| Plugin SDK / public API headers | **MPL-2.0 with a linking clarification**, or Apache-2.0 | third-party proprietary plugins allowed by design (TRD §36) |
| Documentation (`docs/`) | **CC-BY-4.0** (dual with MPL) | reuse in derivative docs |
| Nova brand assets (logos, wordmark, product icons) | **All rights reserved / trademark** — *not* open source | TRD §34: branding is ours; rebranders replace, not relicense |

## 3. Third-party license classes

| Class | Examples | Rule |
|-------|----------|------|
| **Permissive** (MIT, BSD-2/3, Apache-2.0, Zlib, BSL-1.0, ISC, Unicode, PD/CC0) | ICU, Boost, libxml2, Skia, HarfBuzz, SQLite, Yrs, nlohmann/json | ✅ Allowed. Reproduce copyright + license text in `THIRD_PARTY_NOTICES`. Apache-2.0: also keep `NOTICE` contents and note patent grant. |
| **Weak copyleft, file/library-level** (MPL-2.0, LGPL-2.1/3.0, EPL, CDDL, Graphite2 dual) | NSS, Graphite2, DLP import libs, librevenge | ✅ Allowed for dynamic linking / separate files. Provide source of *that* component + modifications. Preserve headers. LGPL: user must be able to relink. |
| **Strong copyleft** (GPL-2.0, GPL-3.0) | Poppler, some solvers, some dictionaries, hunspell dict data (varies) | ⚠️ **Client: disabled by default.** Only enable in a build if (a) the whole client can meet GPL, or (b) it is a genuinely separate optional process/plugin the user installs. Each case = ADR. |
| **Network copyleft** (AGPL-3.0) | MinIO, some server tools | ⚠️ **Server only, optional, swappable.** Never a hard dependency; ship a non-AGPL default backend. If we run a hosted service on AGPL components we must offer that service's source. |
| **Non-free / proprietary / field-restricted** | Apple/MS/Notion/Google assets & SDKs, "non-commercial" fonts/icons, JRE (Oracle) | ❌ **Never.** Use OpenJDK if Java needed. |

## 4. Compatibility matrix (Nova client = MPL-2.0 + LGPL-3.0+ base)

| Incoming | Link into client? | Notes |
|----------|-------------------|-------|
| MIT / BSD / Apache-2.0 / Zlib / PD | ✅ | Apache-2.0 ↔ GPL-2.0-only conflict doesn't affect us (we're not GPL-2.0-only). |
| MPL-2.0 | ✅ | native fit |
| LGPL-2.1 / LGPL-3.0 | ✅ | dynamic link; relink freedom |
| GPL-2.0 / GPL-3.0 | ❌ by default | would relicense whole client; see §3 |
| AGPL-3.0 | ❌ client / ⚠️ server-optional | |
| CC-BY / CC-BY-SA (assets, data) | ✅ with attribution; SA only for isolated assets | not for code |
| CC-NC, "non-commercial", custom restrictive | ❌ | |
| Unknown / no license | ❌ | treat as all-rights-reserved |

## 5. Nova baseline `configure` policy

`scripts/bootstrap-upstream.sh` applies a **compliance-first** flag set:

```
--disable-poppler           # GPL PDF import → use a permissive route or a plugin
--without-java              # avoid JRE ambiguity; OpenJDK opt-in only
--disable-coinmp --disable-lpsolve   # solver license review
--without-system-libcmis   # CMIS tri-license review; off until ADR
--enable-mergelibs
--with-theme=nova          # Nova icon theme (once it exists)
# crypto: system NSS; TLS via curl; no bundled OpenSSL where avoidable
```

Any deviation = ADR + update to `dependency-map.md` §A ⚠️ rows.

## 6. Distribution artifacts we must ship

| Artifact | Content |
|----------|---------|
| `LICENSE` | MPL-2.0 full text (Nova code) |
| `licenses/` | Verbatim text of **every** bundled component's license |
| `THIRD_PARTY_NOTICES` | Auto-generated: component, version, license, copyright, source URL. Built by `scripts/gen-third-party-notices.mjs` **(TODO — Phase 1)** from `external/*/README` + Nova deps. |
| `NOTICE` | Attribution: "Contains code from LibreOffice® (© The Document Foundation and contributors), used under MPL-2.0 / LGPL-3.0-or-later. LibreOffice is a registered trademark of The Document Foundation." + Apache `NOTICE` aggregation. |
| Source offer | Written offer / public repo link for LGPL/MPL corresponding source, valid for the required period. |
| `readlicense_oo` | Keep upstream's bundled readme/license, add Nova section. |

## 7. Trademark / naming

- **"LibreOffice", "The Document Foundation"** are trademarks — we may state
  Nova-Office *is based on / contains* LibreOffice code, but must not name our
  product in a way implying endorsement, and must follow TDF's trademark policy
  (rename the product, which we do: "Nova-Office").
- **"Nova-Office", "Nova Writer", ...** — our marks. `product/product.yaml`
  centralizes them so a rebrand replaces all of them (TRD §34, §35).
- Do not use Apple/Microsoft/Notion/Google names except in nominative,
  factual comparison ("compatible with .docx").

## 8. Provenance & attribution hygiene (TRD §2, §43.13)

- **Never** delete or rewrite an existing copyright/license header.
- New files: Nova header only. Modified upstream files: **add** a Nova
  contribution line under the existing header, never replace it.
- Keep upstream `git` history (submodule preserves it; if we ever vendor, keep
  `PROVENANCE.md` with the exact commit).
- No copying of proprietary competitor source, UI resource files, icons, fonts,
  sounds, or documentation. Design "inspired by" is fine; asset reuse is not.
- AI-generated code in this repo is treated as contributed by the human author
  who commits it, under MPL-2.0, and must not reproduce third-party code
  verbatim.

## 9. Compliance checklist per release

- [ ] `THIRD_PARTY_NOTICES` regenerated and diff-reviewed.
- [ ] `configure` flag set matches §5 (or ADRs cover every deviation).
- [ ] No `[GPL|AGPL]` component linked into the client (CI license scan).
- [ ] All `licenses/` texts present for enabled components.
- [ ] `NOTICE` / `readlicense_oo` current.
- [ ] SPDX headers on all new files (CI check).
- [ ] Brand assets confirmed original or properly licensed.
- [ ] Corresponding-source availability verified (LGPL/MPL).
- [ ] Legal review sign-off recorded in the release ADR.

## 10. Open items → `TASKS.md`

- [ ] Owner confirms MPL-2.0 for Nova code (vs Apache-2.0 for SDK/server).
- [ ] Choose Nova UI typeface (OFL-1.1 candidate) — ADR.
- [ ] Choose icon base or commission original — ADR.
- [ ] Decide server language/license — ADR.
- [ ] Build `gen-third-party-notices.mjs`.
- [ ] Engage legal review before first binary.
