#!/usr/bin/env bash
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) 2026 The Nova-Office contributors
#
# Build a drag-to-Applications .dmg from a finished .app bundle.
#
#   scripts/make-macos-dmg.sh <path/to/Foo.app> <out.dmg>
#
# Why not LibreOffice's own packaging? `make` with --with-package-format=dmg
# runs instsetoo_native, which looks the product up by PRODUCTNAME in
# instsetoo_native/util/openoffice.lst. Our --with-product-name=Nova-Office
# yields the key "Nova-OfficeDev", which has no stanza there, so it dies with
#   ERROR: Product Nova-OfficeDev not defined in .../openoffice.lst
# Teaching that file about Nova means carrying a patch against a fiddly
# upstream install list. The .app is already complete, and a .dmg is just a
# compressed image holding it plus an /Applications symlink, so we make it
# ourselves with hdiutil and keep zero patches.

set -euo pipefail

APP="${1:?usage: make-macos-dmg.sh <app> <out.dmg>}"
OUT="${2:?usage: make-macos-dmg.sh <app> <out.dmg>}"

[[ "$(uname -s)" == "Darwin" ]] || { echo "ERROR: macOS only (needs hdiutil)" >&2; exit 1; }
[[ -d "$APP" ]] || { echo "ERROR: no such app bundle: $APP" >&2; exit 1; }

NAME="$(basename "$APP" .app)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "[dmg] staging $NAME.app"
# -R, not -a: ditto/cp -R keeps the bundle's symlinks and permissions.
cp -R "$APP" "$STAGE/$NAME.app"
ln -s /Applications "$STAGE/Applications"

# arm64 macOS refuses to execute a binary with no signature at all, and any
# copy can invalidate the linker's ad-hoc one. Re-sign ad-hoc so the app at
# least launches; a real Developer ID signature would also need notarising,
# which needs an Apple account we don't have in CI.
echo "[dmg] ad-hoc signing (this is not a Developer ID signature)"
codesign --force --deep --sign - "$STAGE/$NAME.app" 2>&1 | tail -5 || \
  echo "[dmg] WARNING: ad-hoc signing failed; the app may be blocked on launch"

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
echo "[dmg] hdiutil create -> $OUT"
hdiutil create \
  -volname "$NAME" \
  -srcfolder "$STAGE" \
  -fs HFS+ \
  -format UDZO \
  -ov \
  "$OUT" >/dev/null

echo "[dmg] done: $(du -h "$OUT" | cut -f1) $OUT"
hdiutil imageinfo "$OUT" | grep -E "^Format:|Checksum Type:" || true
