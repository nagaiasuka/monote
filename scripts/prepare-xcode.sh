#!/usr/bin/env bash
set -euo pipefail
MONOTE_SOURCE_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
MONOTE_XCODE_ROOT=${MONOTE_XCODE_ROOT:-$HOME/Developer/monote-xcode}
MONOTE_ASCII_ROOT=$(printf '%s' "$MONOTE_XCODE_ROOT" | LC_ALL=C tr -cd '\040-\176')
if [[ "$MONOTE_XCODE_ROOT" = "$MONOTE_SOURCE_ROOT" || "$MONOTE_XCODE_ROOT" != "$MONOTE_ASCII_ROOT" ]]; then
  echo "Xcodeコピーの保存先には元プロジェクトとは異なるASCIIパスを指定してください。" >&2
  exit 1
fi
mkdir -p "$MONOTE_XCODE_ROOT"
rsync -a --exclude '/.git' --exclude '/.idea' --exclude '/node_modules' --exclude '/ios' --exclude '/android' --exclude '/.expo' --exclude '/.toolchain' --exclude '/dist' --exclude '/build' --exclude '.env*' --exclude '*.p12' --exclude '*.p8' --exclude '*.pfx' --exclude '*.mobileprovision' --exclude '*.pem' --exclude '*.key' --exclude '/.aws' "$MONOTE_SOURCE_ROOT/" "$MONOTE_XCODE_ROOT/"
cd "$MONOTE_XCODE_ROOT"
# Keep the Xcode Node executable in a permanent path, independent of /tmp.
if [ ! -x .toolchain/node_modules/node/bin/node ]; then
  npm install --prefix "$MONOTE_XCODE_ROOT/.toolchain" --no-audit --no-fund node@22
fi
export PATH="$MONOTE_XCODE_ROOT/.toolchain/node_modules/node/bin:$PATH"
npm ci --no-audit --no-fund
if [ ! -f ios/MONOTE.xcodeproj/project.pbxproj ]; then
  npx expo prebuild --platform ios --no-install
fi
cd ios
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
node "$MONOTE_SOURCE_ROOT/scripts/verify-ios-dependencies.cjs" "$MONOTE_XCODE_ROOT/ios"
printf 'export NODE_BINARY=%s\n' "$MONOTE_XCODE_ROOT/.toolchain/node_modules/node/bin/node" > .xcode.env.local
mkdir -p "$MONOTE_SOURCE_ROOT/.expo"
printf '%s\n' "$MONOTE_XCODE_ROOT" > "$MONOTE_SOURCE_ROOT/.expo/monote-device-project.txt"
echo "Xcode workspace: $MONOTE_XCODE_ROOT/ios/MONOTE.xcworkspace"
