# Release Process

## Channels

| Channel | Cadence | Audience | Source |
|---------|---------|----------|--------|
| **nightly** | every push to `nova-main` that passes CI | contributors | HEAD |
| **beta** | ~monthly | testers | a `v*-beta.N` tag |
| **stable** | quarterly, tracking upstream releases | everyone | a `v*` tag |

## Versioning

`MAJOR.MINOR.PATCH`, derived by [`../scripts/version.mjs`](../scripts/version.mjs):

- `version print` → `0.4.0` on a tagged commit, `0.4.0+12.gabc1234` otherwise.
- `version bump {major|minor|patch}` → updates the root and all `ui/*`
  `package.json`, commits, and creates an annotated `vX.Y.Z` tag.
- The engine fork reads the same string into the product-version resources
  (About dialog, `soffice --version`, installer metadata) at configure time.

Pre-1.0: `MINOR` is a breaking-change signal for the `@nova/*` packages and a
feature signal for the app.

## Design-layer release (Track A)

Triggered by pushing a `v*` tag. [`.github/workflows/release.yml`](../.github/workflows/release.yml):

1. `version` job resolves the string.
2. `build-ui` job runs `npm ci && npm run build`, uploads `ui/*/dist` +
   `ui/tokens/dist` as artifacts.
3. (When `@nova/*` packages are published) `npm publish --workspaces` with
   provenance, gated on the tag matching `package.json`.

## Engine release (Track B)

> Requires the Track B build host. Documented here as the target pipeline.

1. **Rebase** the fork on the upstream release branch; `make check` green,
   including all filter round-trip suites.
2. **Branding gate:** run the Phase 15 rename checklist verifier
   (`scripts/verify-branding.mjs`, planned) — fails if any LibreOffice/TDF mark
   appears in a product surface. See [`licensing.md`](licensing.md).
3. **Build** release config on each platform (`--disable-debug
   --enable-optimized --enable-lto`).
4. **Package** via `instsetoo_native`:
   - macOS: `.app` → `.dmg`
   - Windows: `.msi` (WiX)
   - Linux: AppImage + `.deb` + `.rpm`
5. **Sign & notarize:**
   - macOS: `codesign` with a Developer ID Application cert, then
     `notarytool submit --wait`, then `stapler staple`.
   - Windows: Authenticode sign the `.msi` and the top-level `.exe`s
     (EV cert, ideally on a hardware token / cloud HSM).
   - Linux: detached GPG signatures + a signed `SHA256SUMS`.
   - Keys never live in the repo or in plain CI secrets — use OIDC-brokered
     signing (e.g. a cloud KMS/HSM) so no private key is exportable.
6. **Third-party licence bundle** regenerated (`readlicense_oo`) and included.
7. **Source drop:** publish the exact fork commit + this repo's commit for the
   release (MPL-2.0 §3.2). Link from Help ▸ About and the download page.
8. **Update feed:** publish the appcast/manifest the in-app updater reads
   (see below), with the new version, notes, and signed artifact URLs + hashes.
9. **Release notes** from the `ROADMAP.md` deltas and the changelog.

## In-app updater (Phase 16)

- A background check against a signed manifest (`updates.novaoffice.example/appcast.xml`).
- Differential download where the platform supports it (macOS `.dmg` delta,
  Windows MSP, Linux AppImage zsync).
- **Signature + hash verified before apply.** A failed check is a hard stop.
- **Off by default until the user opts in** on first run; always user-cancelable;
  never auto-restarts a document-editing session.
- Enterprise: a policy key disables it and points at an internal mirror.

## Crash reporting & telemetry (Phase 16)

- Crash reporter: minidump + breakpad-style symbolication, **opt-in**, with a
  visible preview of exactly what is sent (no document content, no file paths
  outside a redaction allowlist).
- Telemetry: **disabled by default**, opt-in, aggregate-only, documented
  schema, one toggle to turn it fully off. No first-run "agree to send data"
  dark pattern.
- Both honour an enterprise policy key.

## Rollback

Each channel keeps the previous two releases available. The update manifest can
pin a channel to an older version to pull a bad release. Installers are never
deleted from the CDN for a year (source-availability obligation).
