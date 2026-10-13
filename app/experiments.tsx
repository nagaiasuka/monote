import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { speech } from '../src/speech';
import { useStore } from '../src/store';
import { Button, Card, Screen, T, report } from '../src/ui';

export default function Experiments() {
  const store = useStore();
  const [route, setRoute] = useState('確認中…');
  async function refresh() {
    if (!speech || typeof speech.diagnostics !== 'function') {
      setRoute('検証用Development Buildへの更新が必要です。');
      return;
    }
    try {
      const state = await speech.diagnostics();
      setRoute(
        `マイク：${state.input.join(', ') || '未接続'}\n出力：${state.output.join(', ') || '未接続'}\n${state.sampleRate} Hz／${state.active ? '録音中' : '待機中'}\nSiri開始段階：${state.siriStage ?? '未取得'}`,
      );
    } catch (error) {
      report(error);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  const current = store.books.find((b) => b.is_current);
  return (
    <Screen>
      <T large>ハンズフリーの技術検証</T>
      <T muted>停車中・自宅で実施してください。検証結果は開発記録に残します。</T>
      <Card>
        <T>現在の音声経路</T>
        <T muted>{route}</T>
        <Button
          secondary
          title="音声経路を更新"
          onPress={() => {
            void refresh();
          }}
        />
      </Card>
      <Card>
        <T>1. Siriから開始</T>
        <T muted>
          本を選び、マイク・音声認識を許可済みにしてから「Siri、モノートでメモ開始」。開始の合図の後に話し、「メモ終了」で保存されるか確認します。
        </T>
        <T muted>
          解除済み → バックグラウンド → アプリ終了 →
          ロック中の順に試します。解除やタッチが必要なら、その条件ではハンズフリー未達です。
        </T>
      </Card>
      <Card>
        <T>2. Audibleの停止・復帰</T>
        <T muted>
          Audibleを再生してから開始します。再生が止まるか、メモ保存の合図の後に再開するかを確認。自動再開は保証せず、巻き戻しは未対応です。
        </T>
        <Button
          title="録音画面を開く"
          disabled={!current || !!store.activeBookId}
          onPress={() => {
            if (current) router.push({ pathname: '/voice', params: { bookId: current.id } });
          }}
        />
      </Card>
      <Card>
        <T>3. Bluetooth</T>
        <T muted>
          本体 → AirPods →
          車載Bluetoothの順に、同じSiri開始・保存・復帰を試します。接続後に上の音声経路を更新し、使用したマイクと出力を記録します。
        </T>
      </Card>
      <Card>
        <T>4. 終了と保護</T>
        <T muted>
          「メモ終了」を含む普通の文章で止まらないか、独立した終了発話で一度だけ保存されるかを確認。途中でロック・機器切断した場合は下書きの有無も確認します。
        </T>
        <T muted>本文・音声を診断ログへ記録しません。終了理由と経過時間を使用します。</T>
      </Card>
      <View>
        <T muted>
          巻き戻し・他アプリの再生位置取得は公開APIによる手段を確認できておらず、実装していません。
        </T>
      </View>
    </Screen>
  );
}
