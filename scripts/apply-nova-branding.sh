#!/usr/bin/env bash
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) 2026 The Nova-Office contributors
#
# Post-build fallback: stamp Nova branding + config into an already-built
# LibreOffice instdir/, without a full reconfigure. Use this if the
# nova_config gbuild module's spool hook-up is not yet verified for the
# pinned LO version (Configuration_nova_config.mk [VERIFY] note).
#
#   ./scripts/apply-nova-branding.sh [path-to-instdir]
#
# It drops the generated Nova-Branding.xcu + Nova.xcu into the registry
# spool directory that LibreOffice reads loose .xcu files from at startup,
# and clears the user profile's config cache so they take effect.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

INSTDIR="${1:-third_party/libreoffice/instdir}"
[[ -d "$INSTDIR" ]] || { echo "no instdir at $INSTDIR — build first" >&2; exit 1; }

node scripts/gen-branding.mjs

# macOS bundles put share/ inside the .app; Linux/Windows keep it at instdir/share
SHARE="$INSTDIR/share"
if [[ ! -d "$SHARE" ]]; then
  APP="$(find "$INSTDIR" -maxdepth 1 -name '*.app' | head -1)"
  SHARE="$APP/Contents/Resources"
  [[ -d "$SHARE/registry" ]] || SHARE="$APP/Contents/share"
fi
DEST="$SHARE/registry"
[[ -d "$DEST" ]] || { echo "could not find share/registry under $INSTDIR" >&2; exit 1; }

install -m 0644 product/generated/Nova-Branding.xcu "$DEST/Nova-Branding.xcu"
install -m 0644 nova/nova_config/registry/data/org/openoffice/Nova.xcu "$DEST/Nova.xcu"

echo "installed:"
echo "  $DEST/Nova-Branding.xcu"
echo "  $DEST/Nova.xcu"
echo
echo "Now clear the config cache so it takes effect, e.g.:"
echo "  rm -rf ~/Library/'Application Support'/LibreOfficeDev   (macOS)"
echo "  rm -rf ~/.config/libreofficedev                         (Linux)"
echo
echo "[VERIFY] Loose .xcu spooling: confirm this LO version reads"
echo "         share/registry/*.xcu (vs requiring a compiled .xcd). If not,"
echo "         the nova_config Configuration module is the correct path —"
echo "         see nova/nova_config/README.md."
