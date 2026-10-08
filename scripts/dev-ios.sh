#!/usr/bin/env bash
set -euo pipefail
MONOTE_PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$MONOTE_PROJECT_ROOT"
source scripts/use-node.sh
echo "MONOTE: 起動を準備しています ($(node --version))"

if [ ! -f node_modules/expo/bin/cli ]; then
  echo "依存パッケージがありません。VS Codeのターミナルで npm ci を実行してください。" >&2
  exit 1
fi

MONOTE_SIMULATOR=$(xcrun simctl list devices available --json | node -e '
  const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const phones = Object.entries(data.devices)
    .filter(([runtime]) => runtime.includes(".iOS-"))
    .flatMap(([, devices]) => devices).filter(device => device.name.startsWith("iPhone"));
  const device = phones.find(device => device.state === "Booted")
    ?? phones.find(device => device.name === "iPhone 17 Pro") ?? phones[0];
  if (!device) { console.error("XcodeでiPhoneシミュレーターを追加してください。"); process.exit(1); }
  process.stdout.write(device.udid + "|" + device.state);
')
MONOTE_DEVICE_ID=${MONOTE_SIMULATOR%%|*}
if [ "${MONOTE_SIMULATOR#*|}" != "Booted" ]; then
  xcrun simctl boot "$MONOTE_DEVICE_ID"
fi
xcrun simctl bootstatus "$MONOTE_DEVICE_ID" -b

MONOTE_APP_PATH=''
if [ -f .expo/monote-simulator-app.txt ]; then
  MONOTE_APP_PATH=$(cat .expo/monote-simulator-app.txt)
fi
if [ ! -d "$MONOTE_APP_PATH" ] && [ -d /tmp/monote-derived/Build/Products/Debug-iphonesimulator/MONOTE.app ]; then
  MONOTE_APP_PATH=/tmp/monote-derived/Build/Products/Debug-iphonesimulator/MONOTE.app
fi

if [ -d "$MONOTE_APP_PATH" ]; then
  xcrun simctl install "$MONOTE_DEVICE_ID" "$MONOTE_APP_PATH"
elif ! xcrun simctl get_app_container "$MONOTE_DEVICE_ID" com.nagaiasuka.monote app >/dev/null 2>&1; then
  echo "初回のiOSビルドを実行します。数分以上かかる場合があります。"
  bash scripts/build-ios-ascii.sh
  MONOTE_APP_PATH=$(cat .expo/monote-simulator-app.txt)
  xcrun simctl install "$MONOTE_DEVICE_ID" "$MONOTE_APP_PATH"
fi

MONOTE_METRO_PID=''
cleanup() {
  if [ -n "$MONOTE_METRO_PID" ]; then
    kill "$MONOTE_METRO_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM

if curl --silent --fail --max-time 2 http://127.0.0.1:8091/status >/dev/null; then
  MONOTE_SERVER_SLUG=$(curl --silent --fail --max-time 5 -H 'expo-platform: ios' -H 'accept: application/expo+json' http://127.0.0.1:8091 | node -e '
    const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
    process.stdout.write(data.extra?.expoClient?.slug ?? data.slug ?? "");
  ')
  if [ "$MONOTE_SERVER_SLUG" != "monote" ]; then
    echo "8091番ポートは別のアプリが使用しています。そのサーバーを停止してから再実行してください。" >&2
    exit 1
  fi
  echo "起動済みのMONOTE開発サーバーへ接続します。"
else
  # Interactive development: retain Metro's file watching and Fast Refresh.
  env -u CI REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 node node_modules/expo/bin/cli start --dev-client --lan --port 8091 &
  MONOTE_METRO_PID=$!
  MONOTE_SERVER_READY=false
  for ((MONOTE_ATTEMPT=0; MONOTE_ATTEMPT<60; MONOTE_ATTEMPT++)); do
    if curl --silent --fail --max-time 1 http://127.0.0.1:8091/status >/dev/null; then
      MONOTE_SERVER_READY=true
      break
    fi
    if ! kill -0 "$MONOTE_METRO_PID" 2>/dev/null; then
      echo "開発サーバーの起動に失敗しました。上のエラーを確認してください。" >&2
      exit 1
    fi
    sleep 1
  done
  if [ "$MONOTE_SERVER_READY" != true ]; then
    echo "開発サーバーの起動がタイムアウトしました。" >&2
    exit 1
  fi
fi

open -a Simulator
xcrun simctl launch --terminate-running-process "$MONOTE_DEVICE_ID" com.nagaiasuka.monote \
  --initialUrl http://127.0.0.1:8091 \
  -EXDevMenuIsOnboardingFinished YES -EXDevMenuShowsAtLaunch NO -EXDevMenuShowFloatingActionButton NO
echo "MONOTE: 起動しました。VS Codeでapp/やsrc/を保存すると画面に反映されます。"
if [ -n "$MONOTE_METRO_PID" ]; then
  wait "$MONOTE_METRO_PID"
fi
