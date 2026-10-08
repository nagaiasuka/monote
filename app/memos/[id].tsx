import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../src/store';
import { dateLabel, playbackLabel } from '../../src/domain';
import { Button, Card, Nav, Screen, T, confirmDelete } from '../../src/ui';
export default function MemoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const memo = store.memos.find((m) => m.id === id);
  if (!memo)
    return (
      <Screen>
        <T>メモが見つかりません。</T>
      </Screen>
    );
  const book = store.books.find((b) => b.id === memo.book_id);
  return (
    <Screen>
      <T large>{book?.title}</T>
      <Card>
        <T>{memo.content}</T>
      </Card>
      <T muted>作成：{dateLabel(memo.created_at)}</T>
      <T muted>更新：{dateLabel(memo.updated_at)}</T>
      <T muted>{playbackLabel(memo.playback_position_ms)}</T>
      {memo.chapter && <T muted>章：{memo.chapter}</T>}
      {memo.position_source && <T muted>取得方法：{memo.position_source}</T>}
      <Nav
        href={{ pathname: '/memos/edit', params: { id, bookId: memo.book_id } }}
        title="メモを編集"
      />
      <Nav
        href={{ pathname: '/books/[id]', params: { id: memo.book_id } }}
        title="この本のメモへ"
      />
      <Button
        title="メモを削除"
        secondary
        danger
        onPress={() =>
          confirmDelete('メモを削除しますか？', 'この操作は取り消せません。', async () => {
            await store.repo.deleteMemo(id);
            await store.reload();
            router.replace({ pathname: '/books/[id]', params: { id: memo.book_id } });
          })
        }
      />
    </Screen>
  );
}
