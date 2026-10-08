import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/store';
import {
  BookCard,
  Card,
  MemoCard,
  Microphone,
  Nav,
  Screen,
  SectionLabel,
  T,
  useTheme,
} from '../src/ui';
export default function Home() {
  const { books, memos, drafts, activeBookId, error } = useStore();
  const current = books.find((b) => b.is_current);
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <View style={{ paddingTop: insets.top, gap: 32 }}>
        <View style={home.row}>
          <Text style={{ color: c.text, fontSize: 19, fontWeight: '600', letterSpacing: 3 }}>
            MONOTE
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="設定を開く"
            hitSlop={8}
            onPress={() => router.push('/settings')}
            style={[home.settings, { borderColor: c.line }]}
          >
            <Text style={{ color: c.muted, fontSize: 13 }}>設定</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10 }}>
          <SectionLabel>YOUR LISTENING JOURNAL</SectionLabel>
          <Text
            style={{
              color: c.text,
              fontSize: 32,
              lineHeight: 44,
              fontWeight: '500',
              letterSpacing: -1,
            }}
          >
            聴いた言葉を、{'\n'}忘れない。
          </Text>
          <Text style={{ color: c.muted, fontSize: 14, lineHeight: 23 }}>
            心に残るひとことを、そっと残そう。
          </Text>
        </View>
      </View>
      {error && <T>{error}</T>}
      <View style={{ gap: 14, marginTop: 14 }}>
        <View style={home.row}>
          <SectionLabel>いま聴いている本</SectionLabel>
          <Pressable accessibilityRole="link" onPress={() => router.push('/books')} hitSlop={10}>
            <Text style={{ color: c.accent, fontSize: 12 }}>本棚を見る ↗</Text>
          </Pressable>
        </View>
        {current ? (
          <BookCard book={current} />
        ) : (
          <Card>
            <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
              <View style={[home.book, { backgroundColor: c.bg, borderColor: c.line }]}>
                <View
                  style={{
                    height: 42,
                    width: 27,
                    borderColor: c.accent,
                    borderWidth: 1,
                    borderRadius: 3,
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ color: c.text, fontSize: 16, fontWeight: '500' }}>
                  次の一冊を選びましょう
                </Text>
                <Text style={{ color: c.muted, fontSize: 13, lineHeight: 21 }}>
                  本を登録すると、メモを残せます。
                </Text>
                <Nav href="/books/edit" title="最初の本を追加" />
              </View>
            </View>
          </Card>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !current && !activeBookId }}
        disabled={!current && !activeBookId}
        onPress={() =>
          router.push({ pathname: '/voice', params: { bookId: activeBookId ?? current?.id } })
        }
        style={({ pressed }) => [
          home.record,
          { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={[home.mic, { borderColor: c.onAccent + '40' }]}>
          <Microphone color={c.onAccent} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: c.onAccent, fontSize: 17, fontWeight: '600' }}>
            {activeBookId ? '録音中のメモへ' : '声でメモを残す'}
          </Text>
          <Text style={{ color: c.onAccent, opacity: 0.75, fontSize: 12 }}>
            {current || activeBookId
              ? '心に浮かんだことを、そのまま。'
              : 'はじめに、聴いている本を選んでください'}
          </Text>
        </View>
        <Text style={{ color: c.onAccent, fontSize: 22 }}>↗</Text>
      </Pressable>
      {current && (
        <Nav
          href={{ pathname: '/memos/edit', params: { bookId: current.id } }}
          title="文字でメモを書く"
        />
      )}
      {drafts.length > 0 && <Nav href="/drafts" title={`保護された下書き (${drafts.length})`} />}
      <View style={[home.row, { marginTop: 12 }]}>
        <SectionLabel>最近のメモ</SectionLabel>
        <Text style={{ color: c.muted, fontSize: 12 }}>{memos.length} notes</Text>
      </View>
      {memos.length ? (
        memos
          .slice(0, 5)
          .map((m) => (
            <MemoCard key={m.id} memo={m} title={books.find((b) => b.id === m.book_id)?.title} />
          ))
      ) : (
        <View style={[home.empty, { borderColor: c.line }]}>
          <Text style={{ color: c.muted, fontSize: 15, lineHeight: 25 }}>
            まだ、まっさらなノート。{'\n'}心に残った言葉から、はじめましょう。
          </Text>
        </View>
      )}
      <Nav href="/books" title="本棚・メモを検索" />
    </Screen>
  );
}
const home = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settings: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    minHeight: 36,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  book: {
    width: 60,
    height: 82,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  record: {
    minHeight: 106,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  mic: {
    width: 48,
    height: 54,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 24 },
});
