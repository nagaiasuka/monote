import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { useStore } from '../../src/store';
import { Button, Cover, Field, Screen, T, report } from '../../src/ui';
export default function EditBook() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const book = store.books.find((b) => b.id === id);
  const [title, setTitle] = useState(book?.title ?? ''),
    [author, setAuthor] = useState(book?.author ?? ''),
    [cover, setCover] = useState(book?.cover_uri ?? null),
    [busy, setBusy] = useState(false);
  if (id && !book)
    return (
      <Screen>
        <T>書籍が見つかりません。</T>
      </Screen>
    );
  async function chooseCover() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [2, 3],
      });
      if (result.canceled) return;
      const directory = new Directory(Paths.document, 'covers');
      directory.create({ intermediates: true, idempotent: true });
      const source = new File(result.assets[0].uri);
      const file = new File(directory, `${randomUUID()}${source.extension || '.jpg'}`);
      source.copy(file);
      setCover(file.uri);
    } catch (error) {
      report(error);
    }
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const savedId = await store.repo.saveBook({ id, title, author, cover_uri: cover });
      if (!id && !store.books.length) await store.repo.setCurrent(savedId);
      await store.reload();
      router.replace({ pathname: '/books/[id]', params: { id: savedId } });
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <T large>{id ? '本の情報を整える' : '本棚に、新しい一冊を。'}</T>
      <Field label="タイトル（必須）" value={title} onChangeText={setTitle} maxLength={500} />
      <Field label="著者" value={author} onChangeText={setAuthor} maxLength={500} />
      <Cover book={{ title: title || 'MONOTE', cover_uri: cover }} />
      <Button
        secondary
        title="写真から表紙を選ぶ"
        disabled={busy}
        onPress={() => {
          void chooseCover();
        }}
      />
      {cover && (
        <Button secondary title="表紙を外す" disabled={busy} onPress={() => setCover(null)} />
      )}
      <Button
        title={busy ? '保存中…' : '書籍を保存'}
        disabled={busy || !title.trim()}
        onPress={() => {
          void save();
        }}
      />
    </Screen>
  );
}
