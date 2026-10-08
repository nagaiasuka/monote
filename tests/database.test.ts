import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { migrate, repository } from '../src/db/repository';
import { playbackLabel, requiredText } from '../src/domain';

// Run production SQL against a real SQLite engine, with Expo's async interface.
function adapter(database: DatabaseSync): SQLiteDatabase {
  const db = {
    execAsync: async (sql: string) => {
      database.exec(sql);
    },
    getFirstAsync: async (sql: string, ...args: (string | number | null)[]) =>
      database.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql: string, ...args: (string | number | null)[]) =>
      database.prepare(sql).all(...args),
    runAsync: async (sql: string, ...args: (string | number | null)[]) =>
      database.prepare(sql).run(...args),
    withExclusiveTransactionAsync: async (action: (tx: unknown) => Promise<void>) => {
      database.exec('BEGIN IMMEDIATE');
      try {
        await action(db);
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return db as unknown as SQLiteDatabase;
}
async function setup() {
  const sql = new DatabaseSync(':memory:');
  const db = adapter(sql);
  await migrate(db);
  return { sql, db, repo: repository(db, randomUUID) };
}
test('migration is idempotent and refuses a newer database', async () => {
  const { sql, db } = await setup();
  await migrate(db);
  assert.equal(sql.prepare('PRAGMA user_version').get()?.user_version, 1);
  sql.exec('PRAGMA user_version=99');
  await assert.rejects(migrate(db), /新しいMONOTE/);
  sql.close();
});
test('book CRUD, single current book, rollback and parameter binding', async () => {
  const { sql, repo } = await setup();
  const a = await repo.saveBook({ title: '読書', author: '著者', cover_uri: null });
  const b = await repo.saveBook({
    title: "O'Reilly; DROP TABLE books;",
    author: '',
    cover_uri: 'file:///cover.jpg',
  });
  assert.match(a, /^[a-f0-9-]{36}$/);
  await repo.setCurrent(a);
  await repo.setCurrent(b);
  assert.equal((await repo.books()).filter((x) => x.is_current).length, 1);
  await assert.rejects(repo.setCurrent('missing'), /見つかりません/);
  assert.equal((await repo.book(b))?.is_current, 1);
  await repo.saveBook({ id: a, title: ' 改訂 ', author: ' 新著者 ', cover_uri: null });
  assert.equal((await repo.book(a))?.title, '改訂');
  await assert.rejects(repo.saveBook({ title: '  ', author: '', cover_uri: null }), /タイトル/);
  await repo.deleteBook(b);
  assert.equal((await repo.books()).length, 1);
  sql.close();
});
test('memo CRUD keeps creation date and allows unknown playback metadata', async () => {
  const { sql, repo } = await setup();
  const book = await repo.saveBook({ title: '本', author: '', cover_uri: null });
  const id = await repo.saveMemo(book, '最初の言葉');
  const initial = await repo.memo(id);
  assert.equal(initial?.playback_position_ms, null);
  assert.equal(initial?.chapter, null);
  assert.equal(initial?.position_source, null);
  await repo.saveMemo(book, '編集した言葉', id);
  assert.equal((await repo.memo(id))?.created_at, initial?.created_at);
  assert.equal((await repo.memo(id))?.content, '編集した言葉');
  await assert.rejects(repo.saveMemo('unknown-book', '言葉'));
  await assert.rejects(repo.saveMemo(book, '  '), /メモ/);
  await repo.deleteMemo(id);
  assert.equal((await repo.memos(book)).length, 0);
  sql.close();
});
test('draft finalization is atomic, native recovery is idempotent and cascades work', async () => {
  const { sql, repo } = await setup();
  const book = await repo.saveBook({ title: '本', author: '', cover_uri: null });
  const d = await repo.createDraft(book);
  await repo.checkpoint(d.id, '途中のことば');
  await assert.rejects(repo.finishDraft(d.id, ' '));
  assert.equal((await repo.drafts()).length, 1);
  await repo.importDraft({
    ...d,
    content: '古いバックアップ',
    updated_at: '2000-01-01T00:00:00.000Z',
  });
  assert.equal((await repo.drafts())[0].content, '途中のことば');
  await repo.finishDraft(d.id, '完成したことば');
  assert.equal((await repo.drafts()).length, 0);
  assert.equal((await repo.memo(d.id))?.content, '完成したことば');
  await repo.importDraft({ ...d, content: '残ったバックアップ' });
  assert.equal((await repo.drafts()).length, 0);
  await repo.createDraft(book);
  await repo.deleteBook(book);
  assert.equal((await repo.memos()).length, 0);
  assert.equal((await repo.drafts()).length, 0);
  sql.close();
});
test('settings and memos survive database reopening', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'monote-db-'));
  const path = join(dir, 'monote.db');
  try {
    let sql = new DatabaseSync(path),
      db = adapter(sql);
    await migrate(db);
    let repo = repository(db, randomUUID);
    const book = await repo.saveBook({ title: '本', author: '', cover_uri: null });
    const id = await repo.saveMemo(book, '再起動後も残る');
    await repo.saveSettings({ silenceEnabled: false, silenceSeconds: 8, rewindSeconds: 7 });
    sql.close();
    sql = new DatabaseSync(path);
    db = adapter(sql);
    await migrate(db);
    repo = repository(db, randomUUID);
    assert.equal((await repo.memo(id))?.content, '再起動後も残る');
    assert.equal((await repo.settings()).silenceEnabled, false);
    sql.close();
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test('a database failure during finalization rolls back and retains the draft', async () => {
  const { sql, repo } = await setup();
  const book = await repo.saveBook({ title: '本', author: '', cover_uri: null });
  const draft = await repo.createDraft(book);
  await repo.checkpoint(draft.id, '残すべき下書き');
  sql
    .prepare('INSERT INTO memos(id,book_id,content,created_at,updated_at) VALUES(?,?,?,?,?)')
    .run(draft.id, book, '先に保存されたメモ', draft.created_at, draft.updated_at);
  await assert.rejects(repo.finishDraft(draft.id, '上書きしない'));
  assert.equal((await repo.drafts())[0].content, '残すべき下書き');
  assert.equal((await repo.memo(draft.id))?.content, '先に保存されたメモ');
  sql.close();
});
test('metadata labels never fabricate a position', () => {
  assert.equal(playbackLabel(null), '再生位置は取得していません');
  assert.equal(playbackLabel(3723000), '1:02:03');
  assert.throws(() => requiredText('\n ', 'メモ'));
});
