#!/usr/bin/env bash
set -e

# Ensure cargo is in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Resolve directory of this script and move to src-tauri
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPT_DIR/src-tauri"

echo "Starting YouTube Music (Tauri Rust Client)..."
cargo run
