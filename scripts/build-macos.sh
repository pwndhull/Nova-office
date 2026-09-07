#!/usr/bin/env bash
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) 2026 The Nova-Office contributors
#
# One-command macOS build of Nova-Office (currently: our pinned LibreOffice
# source + the Nova compliance-first configure flags + generated branding).
#
#   ./scripts/build-macos.sh              full build (bootstrap -> configure -> make)
#   ./scripts/build-macos.sh --configure  stop after ./autogen.sh
#   ./scripts/build-macos.sh --resume     skip bootstrap/configure, just `make`
#   ./scripts/build-macos.sh --run        after a build, launch the .app
#
# Requirements: Xcode + Command Line Tools, ~40 GB free disk, 8 GB+ RAM.
# First build is ~2-4 h; dependencies download automatically. Uses ccache if
# present (brew install ccache) — strongly recommended.
#
# See docs/build-macos.md for detail and troubleshooting.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
SUBMOD="third_party/libreoffice"

log()  { printf '\033[1;34m[build-macos]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[build-macos] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

MODE="${1:-full}"

[[ "$(uname -s)" == "Darwin" ]] || die "this script is for macOS — see docs/build-linux.md / build-windows.md"
xcode-select -p >/dev/null 2>&1 || die "Xcode Command Line Tools missing — run: xcode-select --install"
command -v node >/dev/null || die "node not found (needed for the token/branding generators) — install Node >= 20"

if [[ "$MODE" == "--run" ]]; then
  APP="$(find "$SUBMOD/instdir" -maxdepth 1 -name '*.app' 2>/dev/null | head -1)"
  [[ -n "$APP" ]] || die "no built .app under $SUBMOD/instdir — build first"
  log "launching $APP"
  open "$APP"
  exit 0
fi

# --- 1. upstream source ---------------------------------------------------
if [[ "$MODE" != "--resume" ]]; then
  if [[ ! -f "$SUBMOD/autogen.sh" ]]; then
    log "fetching pinned LibreOffice source (large; one time)…"
    ./scripts/bootstrap-upstream.sh
  else
    log "LibreOffice source already present ($(cat third_party/UPSTREAM_PIN | grep '^ref:' | awk '{print $2}'))"
  fi
  ./scripts/apply-patches.sh || die "patch application failed — see docs/upstream-strategy.md"
fi

# --- 2. generators ------------------------------------------------------
log "building design tokens + branding artifacts…"
node scripts/build-tokens.mjs
node scripts/gen-branding.mjs

# --- RAM-aware tuning -------------------------------------------------
RAM_GB=$(( $(sysctl -n hw.memsize) / 1073741824 ))
NCPU=$(sysctl -n hw.ncpu)
if (( RAM_GB <= 8 )); then
  JOBS=3
  LOWMEM=1
  log "detected ${RAM_GB} GB RAM — using -j${JOBS}, --disable-mergelibs, --without-lto"
  log "  a first build here is LONG (~6-10 h) and link steps may swap hard."
  log "  close other apps; ensure ~50 GB free disk; consider running overnight."
elif (( RAM_GB <= 16 )); then
  JOBS=$(( NCPU > 6 ? 6 : NCPU )); LOWMEM=0
else
  JOBS=$NCPU; LOWMEM=0
fi

# --- 3. configure -----------------------------------------------------
if [[ "$MODE" != "--resume" ]]; then
  log "writing autogen.input (Nova flags) + running autogen.sh…"
  EXTRA=()
  command -v ccache >/dev/null && EXTRA+=(--enable-ccache) || \
    log "ccache NOT found — install it (brew install ccache) or rebuilds cost hours again"
  (( LOWMEM )) && EXTRA+=(--disable-mergelibs --without-lto --enable-dbgutil=no)
  [[ -n "${NOVA_RELEASE_BUILD:-}" ]] && EXTRA+=(--enable-release-build)
  ./scripts/nova-autogen.sh "${EXTRA[@]}"
  ( cd "$SUBMOD" && ./autogen.sh )
fi

[[ "$MODE" == "--configure" ]] && { log "configure done. Re-run with --resume to build."; exit 0; }

# --- 4. build --------------------------------------------------------
log "building with make -j$JOBS … (the long part — hours on a first build)"
log "if a link step gets OOM-killed, resume with fewer jobs:  PARALLELISM=1 ./scripts/build-macos.sh --resume"
JOBS="${PARALLELISM:-$JOBS}"
( cd "$SUBMOD" && time make -j"$JOBS" )

APP="$(find "$SUBMOD/instdir" -maxdepth 1 -name '*.app' 2>/dev/null | head -1)"
log "done."
[[ -n "$APP" ]] && log "run it:  open '$APP'   (or ./scripts/build-macos.sh --run)"
log "next: Nova branding/config lands in nova_config + nova_shell — see docs/MASTER_IMPLEMENTATION_PLAN.md"
