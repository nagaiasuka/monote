# UI更新と実機開発

## UI

アイボリーとフォレストグリーンを基調に、ダークモードは暗いグリーンとセージを採用。ホームのブランド表示、見出し、現在の書籍、音声入力、最近のメモを階層化。共通のカード、書籍・メモ一覧、入力欄、ボタン、リンク、ナビゲーションヘッダーも更新。設定の「Made for Mone.」は維持。

変更: `src/ui.tsx`, `app/index.tsx`, `app/_layout.tsx`。

## 検証

- `npm run typecheck`: 成功。
- `npm run format:check`: 成功。
- `bash -n scripts/build-ios-ascii.sh scripts/dev-device-server.sh`: 成功。
- シミュレーターのDevelopment BuildでMetroバンドル成功。保存した変更が画面へ反映されたことを確認。
- iPhone 17 Proのホームをライト・ダーク双方で確認。リンクの矢印が下段へ落ちる問題を修正して再確認。
- スクリーンショット: `screenshots/home-modern-light.png`, `screenshots/home-modern-dark.png`。
- DB・Swift処理の変更はなし。今回そのテストの再実行は行っていない。

## 実機開発

VS Codeタスクに「MONOTE: 実機ビルド・インストール」「MONOTE: 実機サーバー」を追加。日本語パスを避けたコピーで`expo run:ios --device --no-bundler`を実行し、元のワークスペースでLAN上のMetroへ接続する。npmからは`npm run build:device`、`npm run dev:device`。

この環境では登録済みiPhone「飛鳥」がオフライン。有効なコード署名証明書は`security find-identity -v -p codesigning`で見つからなかった。**実機ビルド、インストール、LAN接続、音声入力は未検証。** USB接続・信頼・デベロッパモード・Apple Team設定を完了してから実施する。手順はREADME「iPhone実機で開発する」に記載。

次は実機で書籍登録、テキスト保存、マイク・音声認識権限、オンデバイス日本語認識、「メモ終了」、無音終了、割り込み時の下書き回復を検証する。Siri・Audibleの一連の動作は引き続き未実装・未検証の範囲を区別する。
