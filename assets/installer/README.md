# Installer assets

Placeholders / specs for the Phase 16 installers. See
[`../../docs/release.md`](../../docs/release.md) for the pipeline.

| Platform | Format | Assets needed |
|----------|--------|---------------|
| macOS | `.dmg` | background image (540×380 @1x/@2x), volume icon (`.icns`), `.app` icon, `Info.plist` strings, entitlements for notarization |
| Windows | `.msi` (WiX) | banner (493×58), dialog bmp (493×312), `.ico`, EULA RTF (MPL-2.0), upgrade GUID |
| Linux | AppImage + `.deb` + `.rpm` | `.desktop`, AppStream `metainfo.xml`, hicolor icons, MIME associations for the six formats |

The EULA/licence shown by every installer is the MPL-2.0 text from
[`../../LICENSE`](../../LICENSE), plus the third-party licence bundle
(`docs/licensing.md`). No click-through data-collection consent.
