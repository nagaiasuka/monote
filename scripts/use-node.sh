# Source from the bash-based development/build scripts. Do not install a runtime
# or modify the user's shell configuration automatically.
monote_node_is_supported() {
  command -v node >/dev/null 2>&1 && node -e '
    const [major, minor] = process.versions.node.split(".").map(Number);
    process.exit((major === 22 && minor >= 13) || (major === 24 && minor >= 3) || major >= 25 ? 0 : 1);
  ' 2>/dev/null
}

if ! monote_node_is_supported; then
  MONOTE_NVM_SCRIPT="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [ -s "$MONOTE_NVM_SCRIPT" ]; then
    set +u
    source "$MONOTE_NVM_SCRIPT"
    nvm use --silent 22 >/dev/null 2>&1 || true
    set -u
  fi
fi

# The runtime used during the initial build is available in this workspace session.
if ! monote_node_is_supported && [ -x /tmp/monote-toolchain/node_modules/node/bin/node ]; then
  export PATH="/tmp/monote-toolchain/node_modules/node/bin:$PATH"
fi

if ! monote_node_is_supported; then
  echo "Node.js 22が必要です。VS Codeのターミナルで nvm install 22 を実行してください。" >&2
  return 1
fi
