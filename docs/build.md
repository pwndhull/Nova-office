# Building Nova Office

Nova Office is developed in two tracks (see [`../ROADMAP.md`](../ROADMAP.md)):

- **Track A — the design layer** (this repository): fast, cross-platform,
  no LibreOffice checkout required.
- **Track B — the integration fork**: the LibreOffice `core` fork with Nova's
  native UI. Large, slow, self-hosted.

---

## Track A — the design layer

### Prerequisites

- Node.js `20.11.0` (see [`../.nvmrc`](../.nvmrc)); Node 22 also supported in CI.
- npm 10+.
- No compiler, no Python, no LibreOffice.

### Commands

```bash
npm ci                 # install (uses package-lock.json)
npm run build:tokens   # generate ui/tokens/dist (CSS, SCSS, TS, JSON)
npm run typecheck      # tsc --noEmit across all workspaces
npm run lint           # per-workspace lint
npm test               # unit tests (vitest / node:test)
npm run build          # build every workspace that defines a build script
npm run playground     # Vite dev server for the component playground
```

`build:tokens` must run before `typecheck`, `test`, or `build` in a clean
checkout, because every other package imports the generated token artifacts.
`npm run build` does this for you; the individual scripts assume it has run.

### Workspaces

| Path | Package | Build output |
|------|---------|--------------|
| `ui/tokens` | `@nova/tokens` | `dist/` — `nova-tokens.css`, `.scss`, `tokens.ts`, `tokens.json` |
| `ui/motion` | `@nova/motion` | source (consumed as TS) |
| `ui/icons` | `@nova/icons` | source |
| `ui/components` | `@nova/components` | source + `dist/styles.css` |
| `ui/playground` | `@nova/playground` | `dist/` static site |
| `tests` | integration + benchmarks | — |

### CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml): matrix of
{Linux, macOS, Windows} × Node {20.11.0, 22}. Steps mirror the commands above.
A separate engine job is gated on the `ENGINE_BUILD` repo variable.

### Versioning

`node scripts/version.mjs print` derives the version from the latest `v*` tag
plus commit distance (`0.3.0+7.g1a2b3c4`). `--plain` prints just the string for
CI. `bump {major|minor|patch}` writes the new `version` into the root
`package.json` and every `ui/*/package.json`, then tags. See
[`release.md`](release.md).

---

## Track B — the integration fork

> Not run inside the current constrained environment. This section is the
> executable procedure for a machine that can host it.

### Host requirements

| Resource | Minimum | Comfortable |
|----------|---------|-------------|
| Disk | 50 GB free | 100 GB |
| RAM | 8 GB (16 GB for LTO/debug) | 32 GB |
| CPU | 4 cores (~3 h build) | 16 cores (~30 min) |
| OS | Linux (glibc), macOS 12+, or Windows 10+ with VS 2019+ | — |

### 1. Fork and clone

```bash
# Fork The Document Foundation's core to your org, then:
git clone https://git.novaoffice.example/nova-office/core.git
cd core
git remote add upstream https://git.libreoffice.org/core
git checkout -b nova-main upstream/master     # or a release branch
```

Keep `upstream` for rebasing security and filter fixes. Nova's native UI work
lands on `nova-main` as topic-scoped commits (mirroring this repo's lanes).

### 2. Configure

Nova ships a distro config: `distro-configs/NovaOffice.conf` (added by the
fork). It sets the product name, disables upstream branding, enables Skia, and
turns on the Nova UI module.

```bash
./autogen.sh --with-distro=NovaOffice           # Linux/macOS
./autogen.sh --with-distro=NovaOfficeWin        # Windows (MSVC)
```

Useful overrides appended after `--with-distro=...`:

| Flag | Effect |
|------|--------|
| `--enable-debug` | full debug info, assertions (`dbgutil`) |
| `--enable-dbgutil` | debug STL + extra checks (slower, catches more) |
| `--disable-debug --enable-optimized` | release build |
| `--enable-lto` | link-time optimization (release only; needs RAM) |
| `--without-java` | skip the JVM (faster build; drops Base wizards) |
| `--enable-ccache` | cache object files between builds |
| `--with-parallelism=N` | build parallelism |

Presets live in [`../build/autogen/`](../build/autogen/).

### 3. Build

```bash
make                    # full build -> instdir/
make vcl.build          # one module + its dependencies (dev loop)
make sw.build sc.build sd.build
make NovaUI.build       # the Nova UI module (fork-only)
```

### 4. Run

```bash
instdir/program/soffice          # Linux
open instdir/LibreOfficeDev.app  # macOS  (renamed to Nova Office.app by the fork)
instdir\program\soffice.exe      # Windows
```

### 5. Test — the compatibility gate

```bash
make check              # unit + integration for all modules
make sw.check           # Writer, incl. DOCX/ODT filter round-trips
make sc.check           # Calc, incl. XLSX/ODS
make sd.check           # Impress/Draw, incl. PPTX/ODP
make screenshot         # regenerate dialog screenshots (UI review aid)
```

**A Nova change may not regress `make check`.** The filter test corpora under
`sw/qa`, `sc/qa`, `sd/qa`, `oox/qa` are the DOCX/XLSX/PPTX/ODF compatibility
guarantee.

### 6. Package

Per-platform installers (`.dmg`, `.msi`, AppImage/`.deb`/`.rpm`) are produced by
`instsetoo_native` / `setup_native`. Nova's packaging, signing, and notarization
steps are in [`release.md`](release.md).

### Rebasing on upstream

```bash
git fetch upstream
git rebase upstream/master        # resolve; run make check before pushing
```

Cadence: at minimum every upstream point release, and immediately for any
upstream security advisory affecting bundled libraries.
