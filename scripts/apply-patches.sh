#!/usr/bin/env bash
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) 2026 The Nova-Office contributors
#
# Apply the ordered Nova patch set in patches/ onto the LibreOffice submodule.
# Idempotent: skips patches already applied. Use --check to dry-run, --reverse
# to unapply.
#
# Usage: scripts/apply-patches.sh [--check | --reverse]

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMOD="$REPO_ROOT/third_party/libreoffice"
PATCH_DIR="$REPO_ROOT/patches"

[[ -d "$SUBMOD" ]] || { echo "ERROR: submodule missing — run scripts/bootstrap-upstream.sh" >&2; exit 1; }

MODE="apply"
case "${1:-}" in
  --check)   MODE="check" ;;
  --reverse) MODE="reverse" ;;
  "")        ;;
  *) echo "unknown arg: $1" >&2; exit 2 ;;
esac

shopt -s nullglob
patches=("$PATCH_DIR"/*.patch)
if [[ ${#patches[@]} -eq 0 ]]; then
  echo "No patches in patches/ — Nova is running on unmodified upstream. Good."
  exit 0
fi

cd "$SUBMOD"
[[ "$MODE" == "reverse" ]] && mapfile -t patches < <(printf '%s\n' "${patches[@]}" | tac)

for p in "${patches[@]}"; do
  name="$(basename "$p")"
  if [[ "$MODE" == "reverse" ]]; then
    if git apply --reverse --check "$p" 2>/dev/null; then
      git apply --reverse "$p"; echo "reversed  $name"
    else
      echo "skip (not applied)  $name"
    fi
    continue
  fi
  if git apply --reverse --check "$p" 2>/dev/null; then
    echo "already applied  $name"
  elif git apply --check "$p" 2>/dev/null; then
    if [[ "$MODE" == "check" ]]; then echo "would apply  $name"
    else git apply "$p"; echo "applied  $name"; fi
  else
    echo "ERROR: $name does not apply cleanly onto $(git -C "$SUBMOD" describe --tags --always 2>/dev/null || echo HEAD)" >&2
    echo "       rebase the patch (docs/upstream-strategy.md §3)" >&2
    exit 1
  fi
done
