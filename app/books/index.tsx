import React, { useState } from 'react';
import { useStore } from '../../src/store';
import { BookCard, Field, MemoCard, Nav, Screen, T } from '../../src/ui';
export default function Books() {
  const { books, memos } = useStore();
  const [query, setQuery] = useState('');
  const q = query.trim().toLocaleLowerCase();
  const matches = books.filter((b) => `${b.title} ${b.author}`.toLocaleLowerCase().includes(q));
  const notes = q ? memos.filter((m) => m.content.toLocaleLowerCase().includes(q)) : [];
  return (
    <Screen>
      <Field
        label="本・メモを検索"
        value={query}
        onChangeText={setQuery}
        placeholder="タイトル、著者、メモの言葉"
      />
      <Nav href="/books/edit" title="本を追加" />
      <T large>あなたの本棚</T>
      {matches.map((b) => (
        <BookCard key={b.id} book={b} />
      ))}
      {!matches.length && (
        <T muted>{q ? '一致する書籍はありません。' : '最初の本を登録しましょう。'}</T>
      )}
      {!!q && (
        <>
          <T>メモの検索結果 ({notes.length})</T>
          {notes.map((m) => (
            <MemoCard key={m.id} memo={m} title={books.find((b) => b.id === m.book_id)?.title} />
          ))}
        </>
      )}
    </Screen>
  );
}
