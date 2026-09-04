# Versioning

**One string, one source: the latest `v*` git tag.**
Derived by [`../../scripts/version.mjs`](../../scripts/version.mjs).

```
git tag  v0.4.0
   │
   ├─ scripts/version.mjs print         → "0.4.0"            (tagged commit)
   │                        print        → "0.4.0+7.g1a2b3c4" (7 commits later)
   │                        print --plain → the bare string, for CI
   │
   ├─ scripts/version.mjs bump minor    → writes 0.5.0 into every package.json,
   │                                       commits "Release v0.5.0", tags v0.5.0
   │
   └─ (downstream fork) configure reads `version.mjs manifest` into:
        · Help ▸ About                (cui/source/dialogs/about.cxx)
        · soffice --version
        · installer metadata          (instsetoo_native)
        · Windows VERSIONINFO, macOS CFBundleShortVersionString
```

## Scheme

`MAJOR.MINOR.PATCH`.

- **Pre-1.0:** `MINOR` = breaking change for the `@nova/*` packages, feature
  release for the app. `PATCH` = fixes only.
- **Post-1.0:** standard semver for the packages; the app follows the same
  numbers.
- **Build metadata** (`+<distance>.g<sha>[.dirty]`) is informational — it is
  never written into a package.json, only reported by `print`.

## Channels

`nightly` builds report the full `+distance.gsha` string. `beta`/`stable`
builds are always made from a clean tag and report just `MAJOR.MINOR.PATCH`.
See [`../../docs/release.md`](../../docs/release.md).

## Engine alignment

The fork does **not** keep its own version number. Its
`distro-configs/NovaOffice*.conf` build sets `--with-package-version` from
`scripts/version.mjs manifest` (wired in the fork's `autogen` wrapper), so a
Nova Office binary and the `@nova/*` packages it embeds always carry the same
version.
