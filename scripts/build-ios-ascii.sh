#!/bin/sh
set -eu
# CocoaPods/React Native may mishandle non-ASCII paths. Keep the original project
# intact and validate a freshly copied project in an ASCII-only temporary path.
TASK_PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TASK_BUILD_ROOT=$(mktemp -d /tmp/monote-ios.XXXXXX)
echo "Build copy: $TASK_BUILD_ROOT"
rsync -a --exclude '/.git' --exclude '/node_modules' --exclude '/ios' --exclude '/android' --exclude '/.expo' --exclude '/dist' --exclude '/build' --exclude '.env*' --exclude '*.p12' --exclude '*.mobileprovision' --exclude '*.pem' --exclude '*.key' --exclude '/.aws' "$TASK_PROJECT_ROOT/" "$TASK_BUILD_ROOT/"
cd "$TASK_BUILD_ROOT"
npm ci
npx expo prebuild --platform ios --no-install
cd ios
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
cd ..
xcodebuild -workspace ios/MONOTE.xcworkspace -scheme MONOTE -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath "$TASK_BUILD_ROOT/derived" CODE_SIGNING_ALLOWED=NO build
echo "Simulator app: $TASK_BUILD_ROOT/derived/Build/Products/Debug-iphonesimulator/MONOTE.app"
