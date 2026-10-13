# 音声入力開始時のクラッシュ修正（2026-10-13）

実機の2件のクラッシュログはTCC / SIGABRTで、`NSMicrophoneUsageDescription`がないままマイクへアクセスしたことが終了理由だった。

`app.json`には説明文があったが、expo-image-pickerの`microphonePermission: false`がInfo.plistからそのキーを削除していた。実際の生成Info.plistとビルド済みアプリにキーがないことを確認した。

修正:

- expo-image-pickerの設定に日本語のマイク使用目的を設定。
- Swiftのstatus / startでマイク・音声認識の使用目的を確認し、欠落時はOSの権限APIを呼ぶ前にエラーを返す。
- `sync-ios-permissions.cjs`で既存のXcodeコピーにも説明文を反映。署名Teamを保持したままprepareで更新する。
- ビルド済みアプリの検査でマイク・音声認識の説明文が欠けた場合は失敗させる。

検証:

- 修正前のアプリ: 検査が`Missing iOS permission description: NSMicrophoneUsageDescription`で失敗。
- Expo config introspection: 全plugin適用後も両方の使用目的が存在。
- 実機向けDebugビルド: 成功。
- ビルド済みアプリ: 使用目的と11バイナリの依存検査が成功。
- iPhone「飛鳥」へ上書きインストール: 成功。
- マイク許可、実際の録音、日本語認識、終了コマンド、保存: ユーザーの実機操作で確認が必要。まだ成功として扱わない。

Siri開始は今回の修正時点では未実装で、手動開始のまま。運転中の画面操作を必要としない最終フローは未完成。

参考: [Expo ImagePicker設定](https://docs.expo.dev/versions/latest/sdk/imagepicker/)。
