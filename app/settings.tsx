import React, { useEffect, useState } from 'react';
import { Linking, Switch, View } from 'react-native';
import { useStore } from '../src/store';
import { speech } from '../src/speech';
import { Button, Card, Nav, Screen, T, report, useTheme } from '../src/ui';
export default function SettingsScreen() {
  const store = useStore(),
    c = useTheme();
  const [permission, setPermission] = useState('確認中…'),
    [busy, setBusy] = useState(false);
  async function check() {
    if (!speech) {
      setPermission('iOS Development Buildで確認できます。');
      return;
    }
    try {
      const s = await speech.status();
      setPermission(
        `日本語オンデバイス認識：${s.onDevice ? '対応' : '利用不可'}\n音声認識：${({ 0: '未許可', 1: '制限あり', 2: '拒否', 3: '許可済み' } as Record<number, string>)[s.speech] ?? '不明'}\nマイク：${s.microphone === 1735552628 ? '許可済み' : s.microphone === 1684369017 ? '拒否' : '未許可'}`,
      );
    } catch (e) {
      report(e);
    }
  }
  useEffect(() => {
    void check();
  }, []);
  async function change(value: typeof store.settings) {
    if (busy) return;
    setBusy(true);
    try {
      await store.updateSettings(value);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <T large>読書に寄り添う設定</T>
      <Card>
        <T>Siriでメモをはじめる</T>
        <T muted>
          目標の呼びかけは「Siri、モノートでメモ開始」。現在のビルドにはApp
          Intentを登録していません。ロック画面・車載機器からの起動は実機検証が必要です。
        </T>
      </Card>
      <Card>
        <T>音声認識</T>
        <T muted>
          日本語・端末内のみ。クラウド音声認識は使いません。対応していない場合は文字でメモを残せます。
        </T>
        <T>{permission}</T>
        <Button
          title="権限を再確認"
          secondary
          onPress={() => {
            void check();
          }}
        />
        <Button
          title="iPhoneの設定を開く"
          secondary
          onPress={() => {
            void Linking.openSettings().catch(report);
          }}
        />
      </Card>
      <Card>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <T>無音で自動終了</T>
          </View>
          <Switch
            accessibilityLabel="無音で自動終了"
            value={store.settings.silenceEnabled}
            disabled={busy || !!store.activeBookId}
            trackColor={{ true: c.accent }}
            onValueChange={(value) => {
              void change({ ...store.settings, silenceEnabled: value });
            }}
          />
        </View>
        <T muted>無音 {store.settings.silenceSeconds}秒で終了</T>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            title="短く"
            secondary
            disabled={busy || !!store.activeBookId || store.settings.silenceSeconds <= 3}
            onPress={() => {
              void change({ ...store.settings, silenceSeconds: store.settings.silenceSeconds - 1 });
            }}
          />
          <Button
            title="長く"
            secondary
            disabled={busy || !!store.activeBookId || store.settings.silenceSeconds >= 15}
            onPress={() => {
              void change({ ...store.settings, silenceSeconds: store.settings.silenceSeconds + 1 });
            }}
          />
        </View>
        <T muted>周囲の騒音によって無音判定が遅れる場合があります。最長55秒で終了します。</T>
      </Card>
      <Card>
        <T>巻き戻し：{store.settings.rewindSeconds}秒</T>
        <T muted>
          初期値7秒。Audibleを巻き戻す公開APIを確認できていないため、現在は適用されません。
        </T>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            title="− 1秒"
            secondary
            disabled={busy || store.settings.rewindSeconds <= 5}
            onPress={() => {
              void change({ ...store.settings, rewindSeconds: store.settings.rewindSeconds - 1 });
            }}
          />
          <Button
            title="＋ 1秒"
            secondary
            disabled={busy || store.settings.rewindSeconds >= 10}
            onPress={() => {
              void change({ ...store.settings, rewindSeconds: store.settings.rewindSeconds + 1 });
            }}
          />
        </View>
      </Card>
      <Card>
        <T>あなたの言葉は、あなたの端末に。</T>
        <T muted>
          書籍・メモ・下書き・表紙は端末内に保存します。音声バッファは文字起こしに使用し、音声ファイルは保存しません。認識前の音声は中断時に復元できません。アプリ削除ではデータも削除されます。iCloud同期は未対応です。iOSの端末バックアップ設定によりバックアップされる場合があります。
        </T>
      </Card>
      <Nav href="/drafts" title="保護された下書き" />
      <T muted>MONOTE 0.1.0</T>
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <T muted>Made for Mone.</T>
      </View>
    </Screen>
  );
}
