#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${1:-$HOME/.local/bin}"

echo "Building wt CLI..."
cd "$SCRIPT_DIR"
bun install --frozen-lockfile 2>/dev/null || bun install

echo "Compiling binary..."
bun build --compile --outfile "$INSTALL_DIR/wt" src/index.ts

echo ""
echo "Installed: $INSTALL_DIR/wt"
echo ""
echo "Add the following shell wrapper to your .zshrc or .bashrc:"
echo ""
echo '  wt() {'
echo '    local cd_target'
echo '    cd_target=$(command wt "$@")'
echo '    local exit_code=$?'
echo '    [[ $exit_code -ne 0 ]] && return $exit_code'
echo '    [[ -n "$cd_target" ]] && cd "$cd_target"'
echo '  }'
echo ""
echo "For shell completions, add:"
echo '  source <(command wt completion zsh)   # for zsh'
echo '  eval "$(command wt completion bash)"   # for bash'
echo '  command wt completion fish | source    # for fish'
