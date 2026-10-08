# Siri音声メモの設計（Phase 3、未実装）

## 実現可能性と最初の検証

[App Intent](https://developer.apple.com/documentation/appintents/appintent)で開始アクションを公開できる。[実行モード](https://developer.apple.com/documentation/appintents/configuring-the-runtime-behavior-of-your-app-intents)を指定し、アプリをフォアグラウンドへ遷移させる方式を第一候補とする。現在の音声モジュールはアプリ内開始のみ実装。App Intentやショートカットの登録、Siri発話、ロック画面起動は未実装・未検証。

最初のゲートは「Siri終了後にマイクがMONOTEへ渡るか」「ロック中に解除を要求されるか」。Siriがアプリを開けたことだけではハンズフリー録音の成功としない。解除を要求されたら録音を開始せず、運転中のタッチ操作を促さない。完全なロック中の操作を保証しない。

## ネイティブ構成

- App IntentのSwiftソースを**アプリターゲット**へconfig pluginで追加する。Expo Prebuildの生成物にだけ直接記述しない。App Intentsメタデータ抽出と実機ショートカット一覧への露出をビルドで確認する。
- iOS 16以降では`openAppWhenRun = true`を候補とし、新しいiOSでは`supportedModes`のforeground実行をavailability付きで評価する。Extensionだけに配置するとフォアグラウンド実行できないため、初期実装はExtensionを作らない。
- `StartMemoIntent`の`perform()`は継続録音・Speech処理を待たない。UUIDと期限のある開始リクエストをネイティブで永続化してreturnする。cold start、warm startともにJSのDB初期化後に取り込み、原子的にconsumeして二重起動を防ぐ。
- `AppShortcutsProvider`でアプリ名トークンを含む日本語フレーズを提供する。`CFBundleDisplayName`は「モノート」。目標の「モノートでメモ開始」が認識されるか実機で確認する。
- 前回リクエストの遅延実行を防ぐため、開始要求のTTLは例えば30秒。現在の本を読み出し、draftのbook IDを固定してから開始する。録音中の開始要求は拒否し、書籍変更による紐づけのずれを防ぐ。

```swift
// 設計例。現在のビルドに組み込んだ実装ではない。
import AppIntents
struct StartMemoIntent: AppIntent {
    static var title: LocalizedStringResource = "メモ開始"
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        // UUID/期限付き開始要求を永続化。active/DB ready後のconsumerで録音開始。
        return .result()
    }
}
struct MemoShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: StartMemoIntent(),
          phrases: ["\(.applicationName)でメモ開始"],
          shortTitle: "メモ開始", systemImageName: "mic")
    }
}
```

## マイク引き継ぎとフィードバック

状態遷移：`intent request → foreground/active → DB ready → selected book → permission → on-device capability → audio session → recording → finalizing → SQLite commit → session release → Audible resumption observation`。

フォアグラウンド直後でもSiriがマイクを占有し得る。アプリactiveとAVAudioSession activationを確認し、特定のbusyエラーのみ短時間・回数制限付き再試行を検討する。長い無音のまま録音を開始せずタイムアウトして読み上げで失敗を知らせる。録音開始の合図はマイク開始前に完了させる。認識音声に合図を混入させない。

初回権限と日本語の対応確認、本の選択は停車中に済ませる。本なし・権限なし・オンデバイス非対応時は音声で説明して終了する。外部認識へ切り替えない。[supportsOnDeviceRecognition](https://developer.apple.com/documentation/speech/sfspeechrecognizer/supportsondevicerecognition)を確認し、[requiresOnDeviceRecognition](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition)をtrueにする。

## 終了と保存

Phase 2では音声セグメントの直前0.8秒以上の間、独立した「メモ終了」の一致、その後1.2秒以上の無音と認識結果の安定を使う。通常の文中の文字列一致だけでは停止しない。雑音・誤認識・引用だけの独立発話との区別は完全にはできず、閾値の実機調整が必要。コマンド終了時にコマンドを本文から除く。UI終了、無音終了、55秒上限、認識サービス終了にも対応する。

認識済みテキストをSQLite draftとネイティブのatomic JSONに保存。保存失敗・割り込みは下書きに残す。SQLite commit後だけ「保存しました」と通知し、二重保存を防ぐ。初期実装は音声ファイルを保存しないため、未認識の音声は回復できない。音声原本保存を追加する場合は容量管理・保護・削除方針を別途設計する。

## バックグラウンドと審査

現在はforegroundのみで録音し、背景移行で終了する。App Intentsは継続録音の権利を自動的に与えない。`AudioRecordingIntent`等は将来の検証候補であり、ロック画面や任意のバックグラウンド起動を保証する根拠にはしない。Background Modesは目的の実録音とAppleの制約に合致することを確認した場合のみ追加する。

TestFlightには実機で権限拒否、Siri、音声経路、中断時の保護を確認してから進む。現段階で「運転中完全ハンズフリー対応」と表示・宣伝しない。
