#!/usr/bin/env bash
# POSIX entrypoint for the codex-dsh-routing-suite installer (macOS/Linux).
# Delegates to the tested cross-platform Node installer (install.mjs).
# Usage: ./install.sh [--home <codex-home>] [--dry-run]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required (>=22) to run the installer" >&2
  exit 1
fi

exec node "$ROOT/install.mjs" "$@"
