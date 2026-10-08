import type { SQLiteDatabase } from 'expo-sqlite';
import { Book, Draft, Memo, Settings, defaults, requiredText } from '../domain';
import { migrations } from './schema';

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync(
    'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;',
  );
  const version =
    (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  if (version > migrations.length) throw new Error('このデータベースには新しいMONOTEが必要です。');
  for (let index = version; index < migrations.length; index++) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(migrations[index]);
      await tx.execAsync(`PRAGMA user_version = ${index + 1}`);
    });
  }
}
export function repository(db: SQLiteDatabase, randomUUID: () => string) {
  return {
    books: () =>
      db.getAllAsync<Book>('SELECT * FROM books ORDER BY is_current DESC, updated_at DESC'),
    book: (id: string) => db.getFirstAsync<Book>('SELECT * FROM books WHERE id = ?', id),
    async saveBook(input: {
      id?: string;
      title: string;
      author: string;
      cover_uri: string | null;
    }) {
      const title = requiredText(input.title, 'タイトル');
      const id = input.id ?? randomUUID(),
        now = new Date().toISOString();
      if (input.id)
        await db.runAsync(
          'UPDATE books SET title=?, author=?, cover_uri=?, updated_at=? WHERE id=?',
          title,
          input.author.trim(),
          input.cover_uri,
          now,
          id,
        );
      else
        await db.runAsync(
          'INSERT INTO books(id,title,author,cover_uri,created_at,updated_at) VALUES(?,?,?,?,?,?)',
          id,
          title,
          input.author.trim(),
          input.cover_uri,
          now,
          now,
        );
      return id;
    },
    async setCurrent(id: string) {
      await db.withExclusiveTransactionAsync(async (tx) => {
        if (!(await tx.getFirstAsync('SELECT id FROM books WHERE id=?', id)))
          throw new Error('書籍が見つかりません。');
        const now = new Date().toISOString();
        await tx.runAsync('UPDATE books SET is_current=0, updated_at=? WHERE is_current=1', now);
        await tx.runAsync('UPDATE books SET is_current=1, updated_at=? WHERE id=?', now, id);
      });
    },
    deleteBook: (id: string) => db.runAsync('DELETE FROM books WHERE id=?', id),
    memos: (bookId?: string) =>
      bookId
        ? db.getAllAsync<Memo>(
            'SELECT * FROM memos WHERE book_id=? ORDER BY created_at DESC',
            bookId,
          )
        : db.getAllAsync<Memo>('SELECT * FROM memos ORDER BY created_at DESC'),
    memo: (id: string) => db.getFirstAsync<Memo>('SELECT * FROM memos WHERE id=?', id),
    async saveMemo(bookId: string, content: string, id?: string) {
      const body = requiredText(content, 'メモ');
      const memoId = id ?? randomUUID(),
        now = new Date().toISOString();
      if (id)
        await db.runAsync('UPDATE memos SET content=?, updated_at=? WHERE id=?', body, now, id);
      else
        await db.runAsync(
          'INSERT INTO memos(id,book_id,content,created_at,updated_at) VALUES(?,?,?,?,?)',
          memoId,
          bookId,
          body,
          now,
          now,
        );
      return memoId;
    },
    deleteMemo: (id: string) => db.runAsync('DELETE FROM memos WHERE id=?', id),
    drafts: () => db.getAllAsync<Draft>('SELECT * FROM drafts ORDER BY updated_at DESC'),
    async createDraft(bookId: string) {
      const id = randomUUID(),
        now = new Date().toISOString();
      await db.runAsync(
        'INSERT INTO drafts(id,book_id,content,created_at,updated_at) VALUES(?,?,?,?,?)',
        id,
        bookId,
        '',
        now,
        now,
      );
      return { id, book_id: bookId, content: '', created_at: now, updated_at: now } satisfies Draft;
    },
    checkpoint: (id: string, content: string) =>
      db.runAsync(
        'UPDATE drafts SET content=?, updated_at=? WHERE id=?',
        content,
        new Date().toISOString(),
        id,
      ),
    async importDraft(draft: Draft) {
      // Native backups may remain after a crash immediately following a successful commit.
      if (await db.getFirstAsync('SELECT id FROM memos WHERE id=?', draft.id)) return;
      if (!(await db.getFirstAsync('SELECT id FROM books WHERE id=?', draft.book_id))) return;
      await db.runAsync(
        'INSERT INTO drafts(id,book_id,content,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at WHERE excluded.updated_at > drafts.updated_at',
        draft.id,
        draft.book_id,
        draft.content,
        draft.created_at,
        draft.updated_at,
      );
    },
    async finishDraft(id: string, content: string) {
      const body = requiredText(content, 'メモ');
      await db.withExclusiveTransactionAsync(async (tx) => {
        const draft = await tx.getFirstAsync<Draft>('SELECT * FROM drafts WHERE id=?', id);
        if (!draft) throw new Error('下書きが見つかりません。');
        await tx.runAsync(
          'INSERT INTO memos(id,book_id,content,created_at,updated_at) VALUES(?,?,?,?,?)',
          id,
          draft.book_id,
          body,
          draft.created_at,
          new Date().toISOString(),
        );
        await tx.runAsync('DELETE FROM drafts WHERE id=?', id);
      });
      return id;
    },
    deleteDraft: (id: string) => db.runAsync('DELETE FROM drafts WHERE id=?', id),
    async settings(): Promise<Settings> {
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key=?',
        'voice',
      );
      if (!row) return defaults;
      try {
        const data = JSON.parse(row.value) as Partial<Settings>;
        return {
          silenceEnabled:
            typeof data.silenceEnabled === 'boolean'
              ? data.silenceEnabled
              : defaults.silenceEnabled,
          silenceSeconds:
            typeof data.silenceSeconds === 'number'
              ? Math.max(3, Math.min(15, data.silenceSeconds))
              : 5,
          rewindSeconds:
            typeof data.rewindSeconds === 'number'
              ? Math.max(5, Math.min(10, data.rewindSeconds))
              : 7,
        };
      } catch {
        return defaults;
      }
    },
    saveSettings: (settings: Settings) =>
      db.runAsync(
        'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        'voice',
        JSON.stringify(settings),
      ),
  };
}
export type Repository = ReturnType<typeof repository>;
