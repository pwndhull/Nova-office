#!/usr/bin/env bash
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) 2026 The Nova-Office contributors
#
# Fetch / pin the LibreOffice upstream that Nova-Office builds on.
# Registers it as a git submodule at third_party/libreoffice and records the
# exact pin (tag + commit + date + Nova configure flags) in third_party/UPSTREAM_PIN.
#
# Usage:
#   scripts/bootstrap-upstream.sh                 # use the recorded/ default pin
#   scripts/bootstrap-upstream.sh <tag-or-branch> # pin to a specific ref
#   NOVA_LO_REMOTE=<url> scripts/bootstrap-upstream.sh
#
# NOTE: This is a large checkout (multiple GB). A full LibreOffice *build*
# additionally needs ~25-80 GB disk and hours — see docs/build-linux.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REMOTE="${NOVA_LO_REMOTE:-https://git.libreoffice.org/core}"
MIRROR="https://github.com/LibreOffice/core.git"
SUBMOD_PATH="third_party/libreoffice"
PIN_FILE="third_party/UPSTREAM_PIN"

# Default pin: the ref requested on the CLI, else the one already recorded,
# else "the latest libreoffice-*-* stable tag" resolved from the remote.
REQUESTED_REF="${1:-}"
RECORDED_REF=""
if [[ -f "$PIN_FILE" ]]; then
  RECORDED_REF="$(grep -E '^ref:' "$PIN_FILE" | head -1 | awk '{print $2}' || true)"
fi

log()  { printf '\033[1;34m[bootstrap]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[bootstrap]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[bootstrap] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null || die "git not found"

resolve_latest_stable_tag() {
  # LibreOffice stable release tags look like: libreoffice-24.8.2.1
  git ls-remote --tags --refs "$REMOTE" 'libreoffice-*' 2>/dev/null \
    | awk -F/ '{print $NF}' \
    | grep -E '^libreoffice-[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' \
    | sort -V | tail -1
}

REF="$REQUESTED_REF"
if [[ -z "$REF" ]]; then REF="$RECORDED_REF"; fi
if [[ -z "$REF" ]]; then
  log "No ref given or recorded — querying $REMOTE for the latest stable tag…"
  REF="$(resolve_latest_stable_tag || true)"
  [[ -n "$REF" ]] || die "could not resolve a stable tag; pass one explicitly, e.g. scripts/bootstrap-upstream.sh libreoffice-24.8.4.2"
fi
log "Target upstream ref: $REF"

# --- register / update the submodule --------------------------------------
if [[ ! -f .gitmodules ]] || ! git config -f .gitmodules --get "submodule.${SUBMOD_PATH}.url" >/dev/null 2>&1; then
  log "Adding submodule $SUBMOD_PATH -> $REMOTE"
  git submodule add --depth 1 "$REMOTE" "$SUBMOD_PATH" 2>/dev/null \
    || git submodule add --depth 1 "$MIRROR" "$SUBMOD_PATH" \
    || die "submodule add failed for both $REMOTE and $MIRROR"
fi

log "Fetching $REF (shallow)…"
git -C "$SUBMOD_PATH" fetch --depth 1 origin "refs/tags/${REF}:refs/tags/${REF}" 2>/dev/null \
  || git -C "$SUBMOD_PATH" fetch --depth 1 origin "$REF" \
  || die "fetch of $REF failed"

git -C "$SUBMOD_PATH" checkout --detach FETCH_HEAD 2>/dev/null \
  || git -C "$SUBMOD_PATH" checkout --detach "$REF"

COMMIT="$(git -C "$SUBMOD_PATH" rev-parse HEAD)"
CDATE="$(git -C "$SUBMOD_PATH" show -s --format=%cI HEAD)"

# --- record the pin -------------------------------------------------------
mkdir -p third_party
cat > "$PIN_FILE" <<EOF
# Nova-Office upstream pin — written by scripts/bootstrap-upstream.sh
# Do not edit by hand; re-run the script with a new ref to change it.
ref: $REF
commit: $COMMIT
commit_date: $CDATE
remote: $REMOTE
recorded: $(date -u +%Y-%m-%dT%H:%M:%SZ)

# Nova compliance-first configure flag set (see docs/licensing.md Sec 5).
# scripts/nova-autogen.sh applies these to third_party/libreoffice/autogen.input.
configure_flags: >-
  --disable-poppler
  --without-java
  --disable-coinmp
  --disable-lpsolve
  --without-system-libcmis
  --enable-mergelibs
  --enable-nova
  --with-nova-product=../../product/product.yaml
EOF

log "Pinned:"
sed 's/^/    /' "$PIN_FILE"
log "Done. Next: node scripts/build-tokens.mjs && node scripts/gen-branding.mjs, then see docs/build-<platform>.md"
warn "The [VERIFY] checklist in docs/architecture-analysis.md Sec 15 should now be run against $SUBMOD_PATH."
