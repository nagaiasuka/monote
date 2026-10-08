import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../src/store';
import {
  BookCard,
  Button,
  Field,
  MemoCard,
  Nav,
  Screen,
  T,
  confirmDelete,
  report,
} from '../../src/ui';
export default function BookDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const book = store.books.find((b) => b.id === id);
  const [query, setQuery] = useState('');
  if (!book)
    return (
      <Screen>
        <T>書籍が見つかりません。</T>
        <Nav href="/books" title="本棚へ" />
      </Screen>
    );
  const memos = store.memos.filter((m) => m.book_id === id && m.content.includes(query.trim()));
  const locked = !!store.activeBookId;
  return (
    <Screen>
      <BookCard book={book} />
      <Button
        title={book.is_current ? 'いま聴いている本' : 'この本をいま聴いている本にする'}
        disabled={!!book.is_current || locked}
        onPress={() => {
          void store.repo.setCurrent(id).then(store.reload).catch(report);
        }}
      />
      <Nav href={{ pathname: '/books/edit', params: { id } }} title="書籍を編集" />
      <Button
        title="音声メモをはじめる"
        disabled={locked}
        onPress={() => router.push({ pathname: '/voice', params: { bookId: id } })}
      />
      <Nav href={{ pathname: '/memos/edit', params: { bookId: id } }} title="文字でメモを書く" />
      <Field label="この本のメモを検索" value={query} onChangeText={setQuery} />
      {memos.map((m) => (
        <MemoCard key={m.id} memo={m} />
      ))}
      {!memos.length && <T muted>メモはありません。</T>}
      <Button
        title="書籍を削除"
        secondary
        danger
        disabled={locked}
        onPress={() =>
          confirmDelete(
            '書籍を削除しますか？',
            'この本のすべてのメモと下書きも削除されます。',
            async () => {
              const drafts = store.drafts.filter((d) => d.book_id === id);
              await store.repo.deleteBook(id);
              await store.reload();
              router.replace('/books');
              const { speech } = await import('../../src/speech');
              for (const d of drafts) await speech?.discard(d.id);
            },
          )
        }
      />
    </Screen>
  );
}
