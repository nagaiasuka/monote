# monote

**MONOTE — 聴いた言葉を、忘れない。**

iPhone向け、ローカルファーストの読書メモ。Made for Mone.

## 実装状況

- Phase 1：Expo Development Build / Expo Router / strict TypeScript / SQLite / 基本画面。
- Phase 2：書籍CRUD、永続表紙写真、現在の本、書籍・メモ検索、テキストメモCRUD、下書き保護、Swift音声入力、日本語オンデバイス文字起こし、独立発話の終了コマンド、無音終了。
- Phase 3：Siri App Intentの設計のみ。現在のビルドにSiri開始アクションはない。
- Phase 4：公開APIの調査と検証手順。Audibleの一時停止・復帰は音声割り込みによる候補であり、実機では未検証。巻き戻し・再生情報取得は未実装。
- Phase 5：TestFlight配布・実機品質確認は未実施。

「運転中、ロック状態からSiriで開始し、Audibleへ自動復帰」は最終目標であり、現時点では完成機能として扱わない。

## セットアップ

macOS、Xcode、CocoaPods、Node.js 22.13以降（`.nvmrc`）、npmを使用。依存バージョンは`package-lock.json`に固定。Expo SDK 57 / React Native 0.86。Expo Goでは音声入力を利用できない。

```sh
nvm install
nvm use
npm ci
npm run typecheck
npm test
npm run test:swift
```

SQLiteテストはNodeの`node:sqlite`を使うためNode 22.13以降が必要。SwiftテストにはXcode Command Line Toolsが必要。

## iOS Development Build

```sh
npm run prebuild:ios
npm run ios
```

`expo prebuild`は`app.json`とローカルExpo Moduleから`ios/`を生成し、Podsを導入する。`ios/`は生成物としてGit対象外。独自Swiftソースは`modules/monote-speech/ios/`に保持する。ネイティブソース変更後は再ビルドが必要。手動でPodsを導入する場合は`cd ios && pod install`。

この環境ではプロジェクトの日本語パスに起因するCocoaPods/React Nativeの文字コードエラーを確認。UTF-8ロケール指定のみでは解消しなかった。元のプロジェクトを変更せずASCIIパスの一時コピーで検証するには`bash scripts/build-ios-ascii.sh`を実行する。生成アプリの場所を出力する。コピーはビルド時点のスナップショットなので、更新後は再実行する。実機開発でも同様に一時コピーのXcode workspaceを開き、署名してビルドできる。

実機では`npm run ios -- --device`。XcodeのSigning & Capabilitiesで所有者のApple Teamと一意なBundle IDを設定する。現在のBundle IDは`com.nagaiasuka.monote`。秘密鍵・署名ファイルはコミットしない。

Metroのみを再起動する場合：

```sh
npm start
```

シミュレーターから`127.0.0.1`へ接続できない場合はIPv4で待ち受ける設定を使う：`REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npm start -- --lan --port 8091`。この環境では`--localhost`がIPv6のみで待ち受け、IPv4のバンドルURLへ接続できない状態を確認した。

`eas.json`にdevelopment（実機）、simulator、preview、productionのビルドプロファイルを用意。EASアカウント登録・Project ID設定・証明書生成・TestFlightアップロードは未実施。実機合格後に配布準備を進める。

## 使い方

1. 本棚から本を追加。最初の本を現在の本として選択する。
2. 写真ライブラリから表紙を選択、必要に応じて別の本を現在の本にする。
3. 「文字でメモを書く」または「音声メモをはじめる」。音声入力の初回はマイクと音声認識を許可する。
4. 「音声入力を開始」で日本語の入力。終了する際はひと呼吸置いて「メモ終了」と発話し、その後も間を空ける。
5. 無音終了、UI終了、55秒上限でも入力を終了。保存失敗・割り込みはホームの「保護された下書き」から確認できる。

この段階では開始ボタンが必要。運転中の画面操作を前提に利用しない。Siri連携完了後もロック・Bluetoothの実機確認が必要。

## アーキテクチャ

| 場所 | 役割 |
| --- | --- |
| `app/` | ホーム、本棚、書籍詳細・編集、メモ詳細・編集、音声入力、設定、下書き |
| `src/ui.tsx` | 温かみのある配色、大きな文字、ダークモード、共通UI |
| `src/store.tsx` | SQLiteデータの共有、音声状態、イベント→下書き→保存の直列処理 |
| `src/db/` | パラメータ付きCRUD、version付きマイグレーション、トランザクション |
| `src/speech.ts` | Swiftモジュールとの型付きインターフェース |
| `modules/monote-speech/` | AVAudioSession / AVAudioEngine / Apple Speech、ネイティブの下書き保護 |
| `tests/` | 実SQLiteエンジンの保存テスト、Swift終了コマンド判定テスト |
| `docs/` | Siri設計、Audible調査、実機手順、開発結果 |

SQLiteは`monote.db`。UUIDを主キーとし、ISO 8601 UTCの作成・更新日時を保存。`PRAGMA user_version`による順序付きマイグレーション、WAL、外部キー制約、現在の本を最大1冊にする部分unique indexを使用。書籍削除は確認後に関連メモ・下書きをcascade削除する。

再生位置・章・取得方法は取得できなければNULL。日時や録音時間を再生位置に代用しない。将来取得元を追加したら`position_source`へ取得方法・信頼性を明示する。

## プライバシーと保護範囲

日本語`supportsOnDeviceRecognition`がfalseなら入力を開始しない。`requiresOnDeviceRecognition = true`でネットワーク認識を禁止し、クラウドへのフォールバックを実装しない。[Appleの仕様](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition)に従う。

音声ファイルは保存しない。認識済み文字列はSQLite下書きとatomicなネイティブJSONバックアップに保存する。再起動時に取り込み、commit直後のクラッシュでも同じUUIDのメモを二重保存しない。未認識音声やバックアップ前の文字は復元できない。新規テキスト入力は350msのdebounceで下書き保存。既存メモの編集は保存ボタンで確定する。

表紙はキャッシュからDocumentsへコピーするため再起動後も保持する。外した表紙・書籍削除時の未参照画像のクリーンアップは未実装。アプリ削除ではデータが消える。iCloud同期・エクスポート・ゴミ箱は未実装。iOSの端末バックアップに含まれる場合がある。

## 既知の制約と次の開発

- 音声入力はforegroundのみ。画面ロック・背景移行・通話・経路変更時は終了して部分結果を保護。Background Modesのaudioは付けていない。
- Apple Speechの認識終了と負荷を考慮し、1回55秒に制限。端末・言語モデル・騒音・Bluetoothによる認識品質は実機確認が必要。
- 終了語は「メモ終了」の独立発話を要求。文脈から引用と命令を完全に判別はできない。単純な本文suffix一致で自動終了しない。
- Audibleの直接pause/play/seek、再生位置・章・タイトルの取得は行わない。音声割り込み後の復帰はAudibleとOSが判断する。
- Apple Team設定、App Intent登録、ロック画面動作、音声経路、TestFlight配布は未完了。

資料：[Audible実現可能性](docs/audible-feasibility.md)、[Siri設計](docs/siri-design.md)、[実機検証手順](docs/device-test-plan.md)、[開発結果](docs/implementation-report.md)。

## Git

既存履歴と`origin = git@github.com-nagaiasuka:nagaiasuka/monote.git`を維持。`main`は安定版、`develop`は開発版、`feature/monote-mvp`で今回の実装を管理。Conventional Commitsを使用。SSH認証は`git ls-remote origin`で読み取り確認済み。リポジトリの公開設定は変更しない。
