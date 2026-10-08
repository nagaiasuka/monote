import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStore } from '../src/store';
import { Button, Card, Nav, Screen, T, report, useTheme } from '../src/ui';
export default function VoiceScreen() {
  const { bookId } = useLocalSearchParams<{ bookId?: string }>();
  const store = useStore();
  const c = useTheme();
  const voice = store.voice;
  const targetId = store.activeBookId ?? bookId ?? store.books.find((b) => b.is_current)?.id;
  const book = store.books.find((b) => b.id === targetId);
  const running = ['starting', 'recording', 'saving'].includes(voice.status);
  return (
    <Screen>
      <T large>
        {voice.status === 'recording'
          ? 'あなたの言葉を、聴いています。'
          : voice.status === 'saved'
            ? 'メモを残しました。'
            : '心に残ったことを、声で。'}
      </T>
      <T>{book?.title ?? '先に本棚から本を選んでください。'}</T>
      <Card>
        <T muted>
          {
            {
              idle: '準備完了',
              starting: 'マイクを準備しています…',
              recording: '● 録音中・端末内で文字起こし',
              saving: '録音を終了して保存しています…',
              saved: '保存完了',
              error: '入力を終了しました',
            }[voice.status]
          }
        </T>
        <View
          accessibilityLabel="マイク入力の音量"
          style={{
            height: 70,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
          }}
        >
          {Array.from({ length: 17 }, (_, i) => (
            <View
              key={i}
              style={{
                width: 5,
                borderRadius: 5,
                height: voice.status === 'recording' ? 8 + voice.level * (25 + (i % 5) * 10) : 8,
                backgroundColor: c.accent,
              }}
            />
          ))}
        </View>
        <T>{voice.content || '話した内容がここに表示されます。'}</T>
      </Card>
      {!!voice.error && <T>{voice.error}</T>}
      {voice.status === 'recording' ? (
        <Button
          title="メモ終了"
          onPress={() => {
            void store.stopVoice().catch(report);
          }}
        />
      ) : (
        <Button
          title="音声入力を開始"
          disabled={running || !targetId}
          onPress={() => {
            if (targetId) void store.startVoice(targetId);
          }}
        />
      )}
      <T muted>
        ひと呼吸置いて「メモ終了」と話し、その後も少し間を空けてください。文中の言葉では終了しません。1回の入力は最長55秒です。
      </T>
      <T muted>
        現在はアプリを開いた状態で使えます。Siri起動は開発準備中です。Audibleの巻き戻し・自動再開は保証されません。
      </T>
      {voice.memoId && (
        <Nav
          href={{ pathname: '/memos/[id]', params: { id: voice.memoId } }}
          title="保存したメモを見る"
        />
      )}
      {voice.status === 'error' && <Nav href="/drafts" title="保護された下書きへ" />}
      {!running && <Nav href="/" title="ホームへ" />}
    </Screen>
  );
}
