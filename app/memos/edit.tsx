import React, { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../src/store';
import { Draft, message } from '../../src/domain';
import { speech } from '../../src/speech';
import { Button, Field, Screen, T, report } from '../../src/ui';
export default function EditMemo() {
  const { id, bookId, draftId } = useLocalSearchParams<{
    id?: string;
    bookId: string;
    draftId?: string;
  }>();
  const store = useStore();
  const memo = store.memos.find((m) => m.id === id),
    recovered = store.drafts.find((d) => d.id === draftId);
  const [content, setContent] = useState(memo?.content ?? recovered?.content ?? ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const draft = useRef<Promise<Draft> | null>(null),
    latest = useRef(content),
    writes = useRef<Promise<unknown>>(Promise.resolve()),
    saved = useRef(false);
  const book = store.books.find((b) => b.id === bookId);
  function ensureDraft() {
    if (!draft.current)
      draft.current = recovered
        ? Promise.resolve(recovered)
        : store.repo.createDraft(bookId).catch((error) => {
            draft.current = null;
            throw error;
          });
    return draft.current;
  }
  async function checkpoint(value: string) {
    if (id || saved.current || !book || (!value.trim() && !draft.current)) return;
    const current = await ensureDraft();
    await store.repo.checkpoint(current.id, value);
  }
  useEffect(() => {
    latest.current = content;
    const timer = setTimeout(() => {
      writes.current = writes.current
        .then(() => checkpoint(content))
        .catch((e) => setError(message(e)));
    }, 350);
    return () => clearTimeout(timer);
  }, [content]);
  useEffect(
    () => () => {
      if (!saved.current && !id && book) {
        writes.current = writes.current
          .then(() => checkpoint(latest.current))
          .then(store.reload)
          .catch(() => undefined);
      }
    },
    [],
  );
  if (!book || (id && !memo) || (draftId && !recovered))
    return (
      <Screen>
        <T>書籍またはメモが見つかりません。</T>
      </Screen>
    );
  async function save() {
    if (busy) return;
    setBusy(true);
    saved.current = true;
    try {
      await writes.current;
      let memoId: string;
      if (id) memoId = await store.repo.saveMemo(bookId, content, id);
      else {
        const current = await ensureDraft();
        memoId = await store.repo.finishDraft(current.id, content);
        await speech?.discard(memoId).catch(() => undefined);
      }
      await store.reload();
      router.replace({ pathname: '/memos/[id]', params: { id: memoId } });
    } catch (e) {
      saved.current = false;
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <T large>{book.title}</T>
      <Field
        label="心に残ったこと"
        value={content}
        onChangeText={setContent}
        multiline
        autoFocus={!draftId}
        editable={!busy}
      />
      {error && <T>{error}</T>}
      {!id && <T muted>入力途中の内容は下書きとして端末に残します。</T>}
      <Button
        title={busy ? '保存中…' : 'メモを保存'}
        disabled={busy || !content.trim()}
        onPress={() => {
          void save();
        }}
      />
    </Screen>
  );
}
