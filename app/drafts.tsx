import React from 'react';
import { useStore } from '../src/store';
import { speech } from '../src/speech';
import { Button, Card, Nav, Screen, T, confirmDelete } from '../src/ui';
export default function Drafts() {
  const store = useStore();
  return (
    <Screen>
      <T large>ことばを、もう一度。</T>
      <T muted>中断した入力をここから保存できます。</T>
      {!store.drafts.length && <T>下書きはありません。</T>}
      {store.drafts.map((d) => (
        <Card key={d.id}>
          <T>{store.books.find((b) => b.id === d.book_id)?.title}</T>
          <T>{d.content || '文字起こしはまだありません。'}</T>
          <Nav
            href={{ pathname: '/memos/edit', params: { bookId: d.book_id, draftId: d.id } }}
            title="確認して保存"
          />
          <Button
            title="下書きを削除"
            secondary
            danger
            disabled={store.activeBookId === d.book_id}
            onPress={() =>
              confirmDelete('下書きを削除しますか？', 'この操作は取り消せません。', async () => {
                await speech?.discard(d.id);
                await store.repo.deleteDraft(d.id);
                await store.reload();
              })
            }
          />
        </Card>
      ))}
    </Screen>
  );
}
