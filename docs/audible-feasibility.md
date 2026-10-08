# Audible連携の実現可能性

調査日：2026-10-08。公開資料の調査とMONOTEの音声セッション実装を区別する。Audibleを使った実機検証は未実施。以下の「見込み」は実測結果ではない。

| 項目 | 公開APIによる判断 | 現在の実装・代替案 |
| --- | --- | --- |
| Audible再生中のメモ開始 | 非mixing音声セッションをアクティブにして入力する設計が可能。Siriが先に再生を中断する場合もあり、移行は実機確認が必要 | `.playAndRecord` / `.measurement`、Bluetooth HFPを許可。アプリ内開始を実装、Siri開始は未実装 |
| 一時停止 | 他アプリにpauseを送る処理ではなく、iOSの音声割り込みを利用する。Audibleの応答は未確認 | `setActive(true)`。`mixWithOthers` / `duckOthers`は指定しない |
| 再開 | 非アクティブ化時に復帰を通知できる。復帰するか、どの位置で復帰するかは受信アプリとOSの判断 | `setActive(false, options: .notifyOthersOnDeactivation)`。自動再開を保証しない |
| 5〜10秒巻き戻し | 公開APIでAudibleの再生位置を変更する手段を確認できない | 設定7秒を保持するが適用しない。静止時にAudibleで戻す。運転中の画面操作を促さない |
| 再生位置 | 他アプリの再生状態を一般に読む公開APIは確認できない | NULL。自アプリの録音開始からの経過時間を再生位置に代用しない |
| タイトル・章 | 他アプリのNow Playing情報の読み取りを保証する公開APIはない | MONOTEで事前に選んだ本に紐づけ、章はNULL |

## 根拠とAPIの境界

[Apple: 音声割り込みの処理](https://developer.apple.com/documentation/avfaudio/handling-audio-interruptions)では、再生アプリが割り込みを観察して適切に対応するモデルを説明している。MONOTEがAudible内部のプレイヤーを直接停止することを意味しない。

[Apple: Audio Sessionの設定](https://developer.apple.com/library/archive/qa/qa1631/_index.html)に基づき、終了時に他の非mixingアプリへ復帰を通知する。これはAudibleの自動再開の保証ではない。保存完了の読み上げも音声経路に影響し得るため、通知後の読み上げを含む一連の挙動を検証する。

[MPRemoteCommandCenter](https://developer.apple.com/documentation/mediaplayer/mpremotecommandcenter)は自アプリのメディアに対するシステムや周辺機器からの操作を受け取るAPI。[AppleのNow Playing解説](https://developer.apple.com/videos/play/wwdc2022/110338/)も、自アプリのプレイヤーとメタデータ公開を対象とする。`playCommand`等にハンドラーを追加してもAudibleへ命令を送ることにはならない。[MPNowPlayingInfoCenter](https://developer.apple.com/documentation/mediaplayer/mpnowplayinginfocenter)でAudibleの情報を読み取れることを前提にしない。`MPMusicPlayerController`は任意のサードパーティプレイヤーを操作する手段ではない。

[Audible: Siriで聴く](https://help.audible.co.jp/s/article/listen-with-siri)にはユーザーがSiriにAudibleの再生を依頼する操作が掲載されている。MONOTEに提供された連携SDK/APIではなく、MONOTEからSiriの発話を自動実行する根拠にはならない。自動復帰しない場合は、保存確認後にユーザー自身が「Siri、Audibleでオーディオブックを再生して」と依頼する代替を実機確認する。巻き戻し発話やショートカットアクションの有無・対応は、Audibleのバージョンと地域ごとに検証する。

これらから、完全な「自動巻き戻し→自動再開」を現時点の公開APIのみで保証できないと判断する。非公開MediaRemote、リモートイベントの偽装、アクセシビリティによる他アプリ操作、未公開URLスキームは実装しない。

## 最優先の実機検証

安全な停車状態で行う。走行中のテストや画面注視を求めない。手順・合否基準・記録欄は[device-test-plan.md](./device-test-plan.md)を参照。

1. Audibleで既知の本・章・位置を再生し、位置を記録する。
2. アプリ内開始で音声入力開始、一時停止の有無と音声経路を確認する。
3. 日本語の内容→独立した「メモ終了」を話す。コマンドが本文に含まれず正しい本に一度だけ保存されるか確認する。
4. 保存読み上げ、音声セッション解除、Audible復帰までの時間・位置を記録する。復帰なしも結果として記載する。
5. Siri App Intentの実装後に同じ手順をSiri起動で実施。ロック解除要求が出た場合、ハンズフリー目標の未達として扱う。
6. 本体マイク、AirPods、車載Bluetoothごとに反復。Siriのマイク占有、HFP移行、入力品質、切断時の下書き保護を確認する。

## 現在の制限

バックグラウンド録音は有効にしていない。バックグラウンド移行・音声割り込み・経路変更で終了し、認識済み内容を保護する。位置・章・取得方法はNULL。将来取得手段を追加する場合は、`position_source`に取得元と信頼性（例：`manual:user-entered`）を明示する。
