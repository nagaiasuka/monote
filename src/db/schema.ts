export const migrations = [
  `CREATE TABLE books (
    id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL CHECK(length(trim(title)) > 0),
    author TEXT NOT NULL DEFAULT '', cover_uri TEXT,
    is_current INTEGER NOT NULL DEFAULT 0 CHECK(is_current IN (0,1)),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX one_current_book ON books(is_current) WHERE is_current = 1;
  CREATE TABLE memos (
    id TEXT PRIMARY KEY NOT NULL, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK(length(trim(content)) > 0),
    playback_position_ms INTEGER CHECK(playback_position_ms IS NULL OR playback_position_ms >= 0),
    chapter TEXT, position_source TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX memos_by_book ON memos(book_id, created_at DESC);
  CREATE TABLE drafts (
    id TEXT PRIMARY KEY NOT NULL, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
];
