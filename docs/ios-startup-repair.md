# iOS実機の起動失敗修正（2026-10-13）

## 症状と原因

Xcodeで実機向けビルドは成功するが、アプリ起動直後に`dyld` / `SIGABRT`で終了。コンソールには`React.framework/React (no such file)`。

実際のビルド済みアプリに`React.framework`がなく、`otool -L`でExpoFileSystem、ExpoFont、ExpoModulesCore、ExpoModulesWorkletsの4つが`@rpath/React.framework/React`を要求することを確認した。

Pods生成時にReact Native Coreの配布ファイルの存在チェックが成功せず、Reactだけソースビルドへ切り替わっていた。Expoの事前ビルドframeworkは有効なままで、実行時依存関係が不整合になった。単なるマイク権限やMetro接続の問題ではない。

## 修正

- 恒久的なXcodeコピーは`~/Developer/monote-xcode`。`/tmp`の古いプロジェクトを継続開発用に使わない。
- 現在の署名Team設定を保持してPodsを再生成。React-Core-prebuilt 0.86.3を追加し、ExpoとReactのビルド方式を揃えた。
- `scripts/verify-ios-dependencies.cjs`はPods生成後、事前ビルドExpoとReactの不整合を検出して準備を失敗させる。prepare / ASCIIビルドに組み込んだ。
- `scripts/verify-ios-app.cjs`はビルド済みアプリの各Mach-Oバイナリを検査し、同梱framework・debug dylibの`@rpath`依存先の欠落を検出する。ASCIIシミュレータービルドの完了検査に組み込んだ。
- 開発・ビルドスクリプトは恒久的なXcodeコピー内のNode 22も利用する。

## 検証

- 修正前アプリの依存検査: 4つのExpo frameworkからReact.frameworkへの欠落を検出して終了コード1。
- Pods修正後のビルド方式検査: 成功。
- シェル構文・Node構文・git diffチェック: 成功。

- 既存TeamでDebug / iphoneosビルド: 成功。
- 修正後アプリの依存検査: 11バイナリを検査し成功。React.frameworkの同梱を確認。
- iPhone「飛鳥」への上書きインストール: 成功。
- 最初の実機起動は端末ロックで拒否された。ロック解除後に起動できたが、その後signal 9で終了し、終了原因のクラッシュログは見つからなかった。
- 再起動後、実機コンソールでReactInstanceの`evaluateJavaScript() with JS bundle`を確認。ライブラリ読み込みとJavaScript実行を通過し、起動直後のdyld / SIGABRTは再発していない。
- LANの画面コード配信: HTTP 200、5,944,326 bytes。
- 実機の画面表示の目視、Fast Refreshの目視確認、音声機能は未検証。

参考：[Expoの事前ビルドモジュール](https://docs.expo.dev/guides/prebuilt-expo-modules/)、[React Nativeのビルド方式を判定する実装](https://github.com/facebook/react-native/blob/main/packages/react-native/scripts/cocoapods/rncore.rb)。
