#!/usr/bin/env bash
set -euo pipefail
# CocoaPods/React Native may mishandle non-ASCII paths. Keep the original project
# intact and validate a freshly copied project in an ASCII-only temporary path.
TASK_PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TASK_BUILD_MODE=${1:-simulator}
if [ "$TASK_BUILD_MODE" != "simulator" ] && [ "$TASK_BUILD_MODE" != "--device" ]; then
  echo "Usage: bash scripts/build-ios-ascii.sh [--device]" >&2
  exit 1
fi
source "$TASK_PROJECT_ROOT/scripts/use-node.sh"
TASK_BUILD_ROOT=$(mktemp -d /tmp/monote-ios.XXXXXX)
echo "Build copy: $TASK_BUILD_ROOT"
rsync -a --exclude '/.git' --exclude '/node_modules' --exclude '/ios' --exclude '/android' --exclude '/.expo' --exclude '/dist' --exclude '/build' --exclude '.env*' --exclude '*.p12' --exclude '*.p8' --exclude '*.pfx' --exclude '*.mobileprovision' --exclude '*.pem' --exclude '*.key' --exclude '/.aws' "$TASK_PROJECT_ROOT/" "$TASK_BUILD_ROOT/"
cd "$TASK_BUILD_ROOT"
npm ci
npx expo prebuild --platform ios --no-install
cd ios
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
cd ..
if [ "$TASK_BUILD_MODE" = "--device" ]; then
  mkdir -p "$TASK_PROJECT_ROOT/.expo"
  printf '%s\n' "$TASK_BUILD_ROOT" > "$TASK_PROJECT_ROOT/.expo/monote-device-project.txt"
  echo "実機用workspace: $TASK_BUILD_ROOT/ios/MONOTE.xcworkspace"
  echo "署名設定が必要な場合は、このworkspaceでApple Teamを選択してください。"
  npx expo run:ios --device --no-bundler
  echo "実機へのインストールが完了しました。元のVS Codeで「MONOTE: 実機サーバー」を実行してください。"
  exit 0
fi
xcodebuild -workspace ios/MONOTE.xcworkspace -scheme MONOTE -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath "$TASK_BUILD_ROOT/derived" CODE_SIGNING_ALLOWED=NO build
echo "Simulator app: $TASK_BUILD_ROOT/derived/Build/Products/Debug-iphonesimulator/MONOTE.app"
mkdir -p "$TASK_PROJECT_ROOT/.expo"
printf '%s\n' "$TASK_BUILD_ROOT/derived/Build/Products/Debug-iphonesimulator/MONOTE.app" > "$TASK_PROJECT_ROOT/.expo/monote-simulator-app.txt"
