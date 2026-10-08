import React from 'react';
import { router } from 'expo-router';
import { useStore } from '../src/store';
import { BookCard, Button, Card, MemoCard, Nav, Screen, T } from '../src/ui';
export default function Home() {
  const { books, memos, drafts, activeBookId, error } = useStore();
  const current = books.find((b) => b.is_current);
  return (
    <Screen>
      <T large>聴いた言葉を、忘れない。</T>
      <T muted>心に残ったひとことを、あなたの本棚に。</T>
      {error && <T>{error}</T>}
      <T>いま聴いている本</T>
      {current ? (
        <BookCard book={current} />
      ) : (
        <Card>
          <T>本を選んで、読書をはじめましょう。</T>
          <Nav href="/books" title="本棚へ" />
        </Card>
      )}
      <Button
        title={activeBookId ? '録音中のメモへ' : '音声メモをはじめる'}
        disabled={!current && !activeBookId}
        onPress={() =>
          router.push({ pathname: '/voice', params: { bookId: activeBookId ?? current?.id } })
        }
      />
      {current && (
        <Nav
          href={{ pathname: '/memos/edit', params: { bookId: current.id } }}
          title="文字でメモを書く"
        />
      )}
      {drafts.length > 0 && <Nav href="/drafts" title={`保護された下書き (${drafts.length})`} />}
      <T>最近のメモ</T>
      {memos.length ? (
        memos
          .slice(0, 5)
          .map((m) => (
            <MemoCard key={m.id} memo={m} title={books.find((b) => b.id === m.book_id)?.title} />
          ))
      ) : (
        <T muted>まだメモはありません。</T>
      )}
      <Nav href="/books" title="本棚・メモ検索" />
      <Nav href="/settings" title="設定" />
    </Screen>
  );
}
