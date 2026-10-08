#!/usr/bin/env bash
set -euo pipefail
MONOTE_PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$MONOTE_PROJECT_ROOT"
source scripts/use-node.sh
if [ ! -f node_modules/expo/bin/cli ]; then
  echo "先に npm ci を実行してください。" >&2
  exit 1
fi
echo "iPhoneとMacを同じWi-Fiに接続してください。"
echo "インストール済みのモノートでQRコードの開発サーバーに接続します。"
# A physical phone needs the Mac's LAN address; 127.0.0.1 refers to the phone itself.
exec env -u CI -u REACT_NATIVE_PACKAGER_HOSTNAME node node_modules/expo/bin/cli start --dev-client --lan --port 8092
