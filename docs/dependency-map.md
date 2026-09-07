<!-- SPDX-License-Identifier: MPL-2.0 -->
# Dependency Map (Phase 0)

Two layers: **(A)** what LibreOffice already pulls in, **(B)** what Nova-Office
adds. Every license string here must be re-confirmed against the pinned source
(`external/*/README` + upstream project) — see the `[VERIFY]` note in
[`architecture-analysis.md`](architecture-analysis.md). Compliance rules live in
[`licensing.md`](licensing.md).

---

## A. LibreOffice bundled / system dependencies (`external/`)

> LibreOffice can use system copies (`--with-system-*`) or build vendored
> tarballs. The set actually compiled depends on our `configure` flags; the Nova
> baseline config is recorded in `scripts/bootstrap-upstream.sh` output.

### Core runtime / platform
| Library | Purpose | License (to `[VERIFY]`) |
|---------|---------|--------------------------|
| ICU | Unicode, collation, break iteration, tz | Unicode-ICU (permissive) |
| Boost (subset, headers mostly) | utilities | BSL-1.0 |
| libxml2 / libxslt | XML parsing, XSLT filters | MIT |
| zlib / libz | compression (ODF/OOXML zip) | Zlib |
| expat | XML (some paths) | MIT |
| Python 3 | scripting provider, build scripts | PSF-2.0 |
| OpenLDAP / libcurl | HTTP, WebDAV, CMIS, update | curl (MIT-style) |
| NSS (Mozilla) | crypto, TLS, XML signatures, cert store | MPL-2.0 |
| OpenSSL / LibreSSL | crypto on some platforms | Apache-2.0 (OpenSSL 3) |
| libargon2 | password hashing (ODF encryption) | Apache-2.0 / CC0 |
| nlohmann/json, liborcus, mdds | JSON, spreadsheet import, data structures | MIT / MIT / MIT |

### Graphics / text
| Library | Purpose | License |
|---------|---------|---------|
| Skia | GPU/raster rendering backend | BSD-3-Clause |
| HarfBuzz | text shaping | MIT (Old) |
| Graphite2 | complex-script shaping | MPL-2.0 / LGPL-2.1+ |
| FreeType | font rasterization (unx) | FTL or GPL-2.0 |
| Fontconfig | font discovery (unx) | MIT-style |
| Cairo / pixman | 2D (unx / gtk) | LGPL-2.1 / MPL-1.1 |
| liblangtag | BCP-47 language tags | MIT |
| libjpeg-turbo, libpng, libwebp, libtiff, giflib | image codecs | IJG/BSD, libpng, BSD, libtiff, MIT |
| lcms2 | color management | MIT |
| librevenge + libwpd/libwpg/libwps | WordPerfect etc. import | MPL-2.0 / LGPL |
| libcdr, libvisio, libmspub, libpagemaker, libzmf, libfreehand, libqxp, libstaroffice, libe-book, libabw, libmwaw | legacy format import (Document Liberation Project) | MPL-2.0 |
| libepubgen, libepoxy | EPUB export, GL loader | MPL-2.0 / MIT |
| Poppler | PDF import (`sdext`) | GPL-2.0-or-later ⚠️ |
| libnumbertext | number-to-words | BSD-3-Clause / LGPL-3.0+ |

### Office / data
| Library | Purpose | License |
|---------|---------|---------|
| Firebird | embedded DB engine for Base | IPL-1.0 / IDPL (MPL-style) |
| HSQLDB | legacy Base engine (needs Java) | BSD-3-Clause |
| libcmis | CMIS cloud file access | GPL-2.0 / LGPL-2.1 / MPL-1.1 tri ⚠️ |
| LibXslt / Saxon (opt.) | XSLT filters (Saxon = Java, optional) | MPL / MPL |
| Apache Commons, Java runtime (optional) | Base report builder, some wizards | Apache-2.0 |
| lp_solve / CoinMP | Calc solver | LGPL / EPL/CPL ⚠️ |
| mythes, hunspell, libvoikko | spellcheck / thesaurus / hyphenation | BSD / LGPL/GPL/MPL tri / GPL ⚠️ dict data varies |

### Build-only
gperf, flex/bison-generated sources, `make`, `autoconf`, `nasm` (Skia/turbo),
`gettext`, `pkg-config`, dtoa, `bin/` python helpers. Not shipped.

> ⚠️ = **copyleft or dictionary-license items that constrain distribution**;
> Nova's default build **disables Poppler PDF-import, libcmis, and GPL solvers**
> unless we deliberately opt in and document it (see `licensing.md` §5).

---

## B. Nova-Office added dependencies

Guiding rule (TRD §18, §43.12): **reuse what LibreOffice already vendors**;
each genuinely new dependency needs a line here + a `licensing.md` entry +
an ADR.

### B.1 Client — reuse, do not add
| Need | Use existing | Notes |
|------|--------------|-------|
| HTTP client | **libcurl** (already vendored) | sync, collab handshake, AI HTTP |
| TLS | **NSS / system TLS via curl** | no new TLS stack |
| Crypto primitives | **NSS** (AES-GCM, HKDF, X25519, Ed25519, SHA-2) | token sealing, at-rest encryption |
| Password hashing | **libargon2** (already vendored) | local credential protection |
| XML | **libxml2** | — |
| JSON | **nlohmann/json / boost::json** (vendored) | config, protocol framing |
| ZIP / package | **`package/` + minizip/zlib** | ODF sidecar, export bundles |
| Compression | **zstd** — *NEW, small* (BSD-3) | sync delta compression; or reuse zlib to avoid the add |
| UUID | `rtl` digest + `o3tl`, or `libuuid` (unx) | actor/document IDs |

### B.2 Nova metadata & search (client)
| Component | Choice | License | Rationale |
|-----------|--------|---------|-----------|
| Local metadata DB | **SQLite** (amalgamation, new `external/sqlite`) | Public Domain | Workspace, page tree, relationships, sync/version/conflict metadata (TRD §9). Tiny, ubiquitous, no server. |
| Full-text search | **SQLite FTS5** (built-in) | Public Domain | Offline unified search (TRD §27) with zero extra deps. Upgrade path: a dedicated index only if FTS5 proves insufficient. |
| Optional vector search (AI) | **sqlite-vec** *(deferred / EXPERIMENTAL)* | MIT/Apache-2.0 | semantic search; only if AI enabled |

### B.2a `nova_sync_core` (Rust) — actual crate tree (locked)

`nova/nova_sync/nova_sync_core` — envelope codec, integrity, backoff. All
transitive deps are permissive (verified via `cargo metadata`):

| Crate | License | Role |
|-------|---------|------|
| `sha2`, `digest`, `block-buffer`, `crypto-common`, `generic-array`, `typenum`, `cpufeatures`, `cfg-if` | MIT OR Apache-2.0 (generic-array: MIT) | SHA-256 |
| `serde`, `serde_core`, `serde_derive`, `serde_json` | MIT OR Apache-2.0 | header JSON |
| `itoa`, `memchr`, `zmij` | MIT / (Unlicense OR MIT) / MIT | serde_json internals |
| `proc-macro2`, `quote`, `syn`, `unicode-ident`, `version_check` | MIT OR Apache-2.0 (unicode-ident also Unicode-3.0) | build-time macros |

No copyleft. `Cargo.lock` is committed. CI runs `cargo audit` (planned) +
`cargo clippy -D warnings` + `cargo fmt --check`.

### B.3 Collaboration (client-side)
| Component | Choice | License | Rationale — see `collaboration-evaluation.md` |
|-----------|--------|---------|------------------|
| CRDT for Nova Notes | **Yrs** (`yrs = 0.27`, the Rust Y-CRDT) via the `ycrdt` wrapper crate + C ABI | MIT | Mature, small, proven block-editor CRDT. Client **and** reference server link the same crate. |
| Office-doc sync model | **Custom op-log + snapshot** over UNO/redline | MPL-2.0 (ours) | Full CRDT over Writer layout is unsafe (TRD §15). |
| Transport | WebSocket over libcurl / `sfx2` `INetMIME` or a thin `nova_net` | ours | — |

#### `ycrdt` (Rust) — actual crate tree (locked in root `Cargo.lock`)

`nova/nova_notes/ycrdt` depends on `yrs = 0.27` only; ~50 transitive crates.
`cargo metadata` license audit: **every crate has a permissive option** —
36×`MIT OR Apache-2.0`, plus MIT-only and `Unlicense OR MIT`; one crate
(`r-efi`, a UEFI-target shim not compiled on desktop) is
`MIT OR Apache-2.0 OR LGPL-2.1-or-later` — MIT is taken. **No mandatory
copyleft.** CI runs `cargo deny check licenses` (planned) to keep it that way.

### B.4 Reference server (`nova-server/` — Phase 9, separate deploy)
Language: **Rust** (ADR-0006 — decided; reuses the client's `yrs` CRDT so there
is exactly one merge implementation).

| Component | Choice | License | Notes |
|-----------|--------|---------|-------|
| HTTP / async | **axum + tokio + hyper + tower** | MIT | single static binary, easy self-host (TRD §16, §17) |
| CRDT sync | **`yrs` + `y-sync`** | MIT | *same crate as the client*; provider-neutral y-sync framing |
| Envelope codec | **`nova_sync_core`** (this repo) | MPL-2.0 | shared with the client |
| DB access | **`sqlx`** → **PostgreSQL** | MIT/Apache-2.0 / PostgreSQL (BSD-like) | metadata, permissions, versions |
| Object storage | **filesystem driver (default)** + optional **S3** (`object_store` / `aws-sdk-s3`) | Apache-2.0/MIT | plain-FS default so no AGPL MinIO dependency |
| Cache / pubsub (optional) | **Valkey** (`redis` crate client) | BSD-3 / MIT | presence fan-out; optional |
| Auth | **`openidconnect`** + **`argon2`** | MIT/Apache-2.0 | provider-neutral OIDC + local passwords |
| Search | **PostgreSQL FTS** default; OpenSearch optional | PostgreSQL / Apache-2.0 | |
| Serialization | **`serde`** | MIT/Apache-2.0 | shared envelope types |
| Container | **distroless / scratch** OCI image, compose + Helm | Apache-2.0 | static musl build |
| Supply chain | **`cargo audit` + `cargo deny`** in CI | — | |

### B.5 AI (optional, off by default — TRD §20)
| Component | Choice | License | Notes |
|-----------|--------|---------|-------|
| Abstraction | `nova_ai` provider interface | MPL-2.0 (ours) | `Disabled` is the default provider |
| Local inference | **llama.cpp** (optional download, not bundled) | MIT | EXPERIMENTAL |
| Remote | OpenAI-compatible HTTP via **libcurl** | — | user supplies endpoint+key |
| Ollama | HTTP via libcurl | MIT | — |

### B.6 Design system & tooling (build-time only, not shipped in binary)
| Tool | License | Notes |
|------|---------|-------|
| Node.js (build scripts: token build, branding gen) | MIT-ish | dev only |
| Nova UI typeface | **must be OFL / permissible** — candidates: Inter (OFL-1.1), IBM Plex (OFL-1.1) | shipped via `external/more_fonts` mechanism; final choice = ADR |
| Icon set | **original Nova icons** (TRD §34) or an OFL/MIT/CC-BY base (e.g. Lucide MIT) heavily restyled | no proprietary icon sets |

---

## C. Dependency policy (enforced)

1. Prefer a LibreOffice-vendored library over a new one.
2. No new **GPL/AGPL** dependency in the **client** without an ADR + owner sign-off
   (would force the whole client copyleft or a separable-process design).
3. Server-side AGPL is acceptable *if* it is an optional, swappable backend
   (MinIO) with a non-AGPL default (filesystem).
4. Every new dependency: entry here + `licensing.md` + `THIRD_PARTY_NOTICES`
   generation + an ADR under `docs/adr/`.
5. `scripts/bootstrap-upstream.sh` records the exact `configure` flag set so the
   enabled-dependency list is reproducible.
6. CI runs dependency vulnerability scanning (TRD §18) — `osv-scanner` /
   `cargo audit` / `npm audit` / GitHub Dependabot.

---

## D. Deferred / rejected

| Considered | Verdict | Reason |
|-----------|---------|--------|
| Electron / CEF shell | **Rejected** | TRD §32/§22 — no web runtime per editing surface; VCL stays. |
| Automerge (client CRDT) | Deferred | Heavier than Yrs for our block model; revisit if multi-doc repo semantics needed. |
| A brand-new HTTP stack (e.g. cpp-httplib) | Rejected | libcurl already vendored. |
| Separate search engine (Tantivy/Lucene) in client | Deferred | SQLite FTS5 first; measure. |
| MongoDB (server) | Rejected | Postgres covers it; simpler self-host. |
