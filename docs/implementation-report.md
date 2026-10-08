# 今回の開発結果

実施日：2026-10-08。今回の範囲はPhase 1・2のコード実装とPhase 3・4の調査・設計。最終目標のSiri→Audible復帰はまだ完成していない。

## Phase 1

実装：Expo SDK 57のDevelopment Build、strict TypeScript、Expo Router、SQLiteマイグレーション、ホーム・本棚・詳細・編集・録音・設定・下書き画面。温かい配色、ダークモード、縦画面、独自アイコン、「Made for Mone.」。

主なファイル：`package.json`、`package-lock.json`、`tsconfig.json`、`.nvmrc`、`.gitignore`、`.prettierrc.json`、`app.json`、`eas.json`、`app/_layout.tsx`、`app/index.tsx`、`src/ui.tsx`、`src/domain.ts`、`src/db/schema.ts`、`scripts/create-icon.swift`、`assets/monote-icon.png`、`docs/screenshots/home-{light,dark}.png`、`README.md`。

検証：strict型チェック成功、Expo Doctor 21/21成功、iOS JavaScript/Hermesバンドル生成成功。DBマイグレーションの再実行と新しいversion拒否のテスト成功。

懸念：元の日本語パスでCocoaPods/RNのASCII-8BITとUTF-8エラー。ASCIIパスの一時コピーでPods導入が成功。`scripts/build-ios-ascii.sh`に再現可能な回避手順を用意。

未実装：配布用署名、Apple Team設定、EASアカウントとの紐づけ、TestFlight。次は実機にDevelopment Buildを導入する。

## Phase 2

実装：書籍CRUD、著者と表紙、写真をDocumentsへ永続コピー、現在の本の選択、書籍・メモ検索、メモCRUD、作成/更新日時、未知の再生情報のNULL保存。SQLiteトランザクション・foreign key・部分unique index。

音声：Swift / AVAudioEngine / AVAudioSession / SFSpeechRecognizer。日本語のリアルタイム文字起こし、音量表示、終了コマンド除去、独立発話と間による終了判定、設定可能な無音終了、55秒上限、入力中断・経路変更・認識エラーの下書き保護。オンデバイス非対応なら入力を拒否し、外部認識へ送信しない。

保存保護：新規テキストメモの下書き、音声認識のSQLite checkpointとネイティブatomic JSON、起動時復元、同じUUIDによる保存重複防止。SQLite commit成功後に保存完了を読み上げる。失敗・中断時は下書きから再試行する。未認識音声は原本を保持していないため復元不可。

主なファイル：`app/books/{index,[id],edit}.tsx`、`app/memos/{[id],edit}.tsx`、`app/voice.tsx`、`app/settings.tsx`、`app/drafts.tsx`、`src/store.tsx`、`src/speech.ts`、`src/db/repository.ts`、`modules/monote-speech/{package.json,expo-module.config.json,ios/MonoteSpeech.podspec,ios/MonoteSpeechModule.swift,ios/StopCommand.swift}`、`tests/database.test.ts`、`tests/swift/main.swift`、`scripts/test-swift.sh`。

未検証：iPhoneでの実音声認識、Bluetooth経路、権限拒否、低容量、中断時の復元、終了語の実環境精度。実装コードの存在やビルド成功は、音声機能の実機合格を意味しない。

懸念：独立した引用「メモ終了」と命令の完全な区別はできない。無音の音量閾値は車内雑音等で調整が必要。55秒前にApple Speech側が終了する場合もある。既存メモ編集は保存ボタンで確定。未参照表紙のクリーンアップ、エクスポート、iCloud同期は未実装。

次：実機でPhase 2の認識・保護を確認後、Siri開始の小さなプロトタイプを作る。

## Phase 3・4

作成：`docs/siri-design.md`、`docs/audible-feasibility.md`、`docs/device-test-plan.md`。

調査結果：App Intentsによるforeground開始を設計可能。ロック解除やSiriマイク引き継ぎは実機確認が必要。Audibleの停止候補は非mixing音声セッションの割り込み、復帰候補は`notifyOthersOnDeactivation`。現在のSwiftコードでこれらのセッション処理を実装しているが、Audibleとの動作確認は未実施。

未実装：App Intent/Shortcut登録、Siri開始、Audibleの直接pause/play、巻き戻し、再生位置・章・タイトル取得。巻き戻し秒数は初期7秒（5〜10秒の設定を保持）で、Audibleへ適用しない。他アプリ制御に非公開APIは使っていない。

次：Siri呼び出し→foreground/active→マイク開始→正しい本へ保存→Audible復帰を最優先ゲートとして、本体・AirPods・車載Bluetooth×ロック状態で検証する。解除を求められた場合はハンズフリー未達として記録する。

## 自動検証結果

| 検証 | 結果 / 範囲 |
| --- | --- |
| `npm run format:check` | 成功、TypeScriptと設定ファイルの書式統一 |
| `npm run typecheck` | 成功、strict TypeScript |
| `npm test` | 7/7成功。production SQLをNodeの実SQLiteで検証。Expo実機のラッパー自体の検証ではない |
| `npm run test:swift` | 7/7成功。独立終了語、文中・引用、区切り、空入力を検証 |
| `npx expo-doctor` | 21/21成功 |
| `npm run export:ios` | 成功。iOSのJavaScript/Hermesバンドル生成 |
| `expo prebuild --platform ios --no-install` | 成功 |
| CocoaPods（ASCIIパスコピー） | 成功。MonoteSpeechをリンク対象として確認 |
| Xcodeネイティブビルド | 成功。Debug・iOS Simulator、x86_64 / arm64、Swiftモジュールを含む。ASCIIパスの一時コピーで実施 |
| シミュレーター起動 | iPhone 17 Pro / iOS 26.5でホームのライト・ダーク表示を確認。native SQLiteのversion 1と4テーブルを確認 |
| iPhone実機 / Siri / Audible | 未実施。上の成功に含めない |
| `npm audit` / 互換範囲の`npm audit fix` | 28件残存（high 18、moderate 10）。配布前対応が必要 |

監査の根本指摘は`braces`、`decode-uri-component`、`node-forge`、古い`uuid`で、Expo/Metro/Xcode関連依存に連鎖して件数が増えている。`audit fix --force`の提案にはExpo 44への変更等が含まれるため適用していない。SDK整合性を維持しつつ、上流の修正または検証可能なoverrideを配布前に検討する。アプリのUUID生成は`expo-crypto`で、この古い`uuid`を直接利用していない。

## Gitと既存ファイル

既存の2コミット（`8105a1e`、`21a5f70`）、`origin`のSSH URL、`main`を維持。`develop`と`feature/monote-mvp`を追加。READMEの既存見出しを保持して追記し、既存`test.text`は変更していない。新しいリポジトリを作成せず、公開設定も変更していない。`git ls-remote origin`によるSSH読み取り認証は成功。

ホーム表示の証跡：[ライト](./screenshots/home-light.png)、[ダーク](./screenshots/home-dark.png)。画面のCRUD操作や音声入力の実機合格を意味しない。

次の配布判断に必要な実機手順と記録表は[device-test-plan.md](./device-test-plan.md)に記載。
