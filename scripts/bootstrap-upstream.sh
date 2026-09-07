#!/usr/bin/env bash
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) 2026 The Nova-Office contributors
#
# Fetch / pin the LibreOffice upstream that Nova-Office builds on.
#
# By default does a plain shallow clone into third_party/libreoffice/ (which is
# gitignored — no pollution of this repo). Pass --submodule to register it as a
# proper git submodule instead (for maintainers / CI reproducibility).
# Either way the exact pin is recorded in third_party/UPSTREAM_PIN.
#
# Usage:
#   scripts/bootstrap-upstream.sh                 # shallow clone, recorded/default pin
#   scripts/bootstrap-upstream.sh <tag-or-branch> # pin to a specific ref
#   scripts/bootstrap-upstream.sh --submodule     # register as a submodule
#   NOVA_LO_REMOTE=<url> scripts/bootstrap-upstream.sh
#
# NOTE: large checkout (~2 GB). A full LibreOffice *build* additionally needs
# ~30-50 GB disk and hours — see docs/build-macos.md / build-linux.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REMOTE="${NOVA_LO_REMOTE:-https://git.libreoffice.org/core}"
MIRROR="https://github.com/LibreOffice/core.git"
SUBMOD_PATH="third_party/libreoffice"
PIN_FILE="third_party/UPSTREAM_PIN"

AS_SUBMODULE=0
REQUESTED_REF=""
for arg in "$@"; do
  case "$arg" in
    --submodule) AS_SUBMODULE=1 ;;
    -*) echo "unknown flag: $arg" >&2; exit 2 ;;
    *) REQUESTED_REF="$arg" ;;
  esac
done

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

# --- get the source ------------------------------------------------------
clone_shallow() {
  local url="$1"
  git clone --depth 1 --branch "$REF" "$url" "$SUBMOD_PATH"
}

if [[ -d "$SUBMOD_PATH/.git" ]] || [[ -f "$SUBMOD_PATH/.git" ]]; then
  log "$SUBMOD_PATH already present — fetching $REF"
  git -C "$SUBMOD_PATH" fetch --depth 1 origin "refs/tags/${REF}:refs/tags/${REF}" 2>/dev/null \
    || git -C "$SUBMOD_PATH" fetch --depth 1 origin "$REF" || die "fetch of $REF failed"
  git -C "$SUBMOD_PATH" checkout --detach FETCH_HEAD 2>/dev/null \
    || git -C "$SUBMOD_PATH" checkout --detach "$REF"
elif (( AS_SUBMODULE )); then
  log "Registering submodule $SUBMOD_PATH -> $REMOTE"
  git config -f .gitmodules --get "submodule.${SUBMOD_PATH}.url" >/dev/null 2>&1 \
    || git submodule add -f --depth 1 -b "$REF" "$REMOTE" "$SUBMOD_PATH" \
    || git submodule add -f --depth 1 -b "$REF" "$MIRROR" "$SUBMOD_PATH" \
    || die "submodule add failed"
  git submodule update --init --depth 1 "$SUBMOD_PATH"
else
  log "Shallow-cloning LibreOffice $REF into $SUBMOD_PATH (~2 GB)…"
  clone_shallow "$REMOTE" || clone_shallow "$MIRROR" || die "clone failed from both $REMOTE and $MIRROR"
fi

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
# scripts/nova-autogen.sh applies these + the generated branding flags
# (--with-product-name / --with-vendor / ...) to autogen.input.
# NB: only real LibreOffice configure options here. Nova-specific options
# (--enable-nova etc.) are added by a patch once they exist.
configure_flags: >-
  --disable-poppler
  --without-java
  --disable-coinmp
  --disable-lpsolve
  --without-system-libcmis
  --enable-mergelibs
EOF

log "Pinned:"
sed 's/^/    /' "$PIN_FILE"
log "Done. Next: node scripts/build-tokens.mjs && node scripts/gen-branding.mjs, then see docs/build-<platform>.md"
warn "The [VERIFY] checklist in docs/architecture-analysis.md Sec 15 should now be run against $SUBMOD_PATH."
