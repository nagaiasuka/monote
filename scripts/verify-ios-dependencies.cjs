const fs = require('node:fs');
const path = require('node:path');
const ios = path.resolve(process.argv[2] || 'ios');
const core = JSON.parse(fs.readFileSync(path.join(ios, 'Pods/Local Podspecs/ExpoModulesCore.podspec.json'), 'utf8'));
const lock = fs.readFileSync(path.join(ios, 'Podfile.lock'), 'utf8');
const prebuiltExpo = [].concat(core.vendored_frameworks || []).length > 0;
const prebuiltReact = /^\s+- React-Core-prebuilt \(/m.test(lock);
if (prebuiltExpo && !prebuiltReact) {
  console.error('Expoの事前ビルド版が必要とするReact.frameworkがPodsにありません。\nReactの配布ファイルを取得できるネットワークでpod installを再実行してください。\nこの状態ではビルド成功後も実機起動時に終了するため、準備を中止します。');
  process.exit(1);
}
console.log('iOS dependency check: Expo / React build modes are compatible.');
