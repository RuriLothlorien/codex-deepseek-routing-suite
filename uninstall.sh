#!/usr/bin/env bash
# POSIX entrypoint for the codex-deepseek-routing-suite uninstaller (macOS/Linux).
# Delegates to the tested cross-platform Node uninstaller (uninstall.mjs).
# Usage: ./uninstall.sh [--home <codex-home>] [--dry-run]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required (>=22) to run the uninstaller" >&2
  exit 1
fi

exec node "$ROOT/uninstall.mjs" "$@"
