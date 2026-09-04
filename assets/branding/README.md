# Branding assets

**All files here are PLACEHOLDERS.** Geometry and system fonts only. They exist
so the rename (Phase 15) has something to point at and the build does not fall
back to upstream marks. None of them contain or derive from any LibreOffice or
The Document Foundation asset. See [`../../docs/licensing.md`](../../docs/licensing.md).

| File | Replaces upstream | Notes |
|------|-------------------|-------|
| `logo.svg` | — | The Nova mark alone (96px). Four-point star in a ring. |
| `app-icon.svg` | `sysui/desktop/icons/*`, `icon-themes/*/*app*` | 512px master. Export the platform sizes below. |
| `wordmark.svg` | About-dialog headline, website | "Nova Office", system font. |
| `splash.svg` | `vcl` intro (`intro.png` / `IntroWindow`) | `{{VERSION}}` is substituted at build time. |

## Colour

Placeholder indigo matches the Nova accent token (`color.indigo.600` =
`#5B5BF0`-ish; the token file is authoritative). A final identity should be
re-derived from `@nova/tokens` so light/dark/HC treatments come for free.

## Export targets (Phase 15)

| Platform | From | Sizes / format |
|----------|------|----------------|
| macOS | `app-icon.svg` | `.icns` — 16, 32, 128, 256, 512 @1x/@2x |
| Windows | `app-icon.svg` | `.ico` — 16, 24, 32, 48, 64, 128, 256 |
| Linux | `app-icon.svg` | hicolor PNGs 16–512 + scalable `.svg`; `.desktop` in `sysui/` |
| Document icons | (todo) | per-format (ODT/ODS/ODP/DOCX/XLSX/PPTX) — a Nova set, not the upstream ones |
| Splash | `splash.svg` | PNG at build; keep SVG as master |

`scripts/` will gain `render-branding.mjs` (rsvg/resvg) to produce all targets
from the SVG masters.
