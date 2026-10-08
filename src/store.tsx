import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { Book, Draft, Memo, Settings, defaults, message } from './domain';
import { repository, Repository } from './db/repository';
import { speech } from './speech';

type Voice = {
  status: 'idle' | 'starting' | 'recording' | 'saving' | 'saved' | 'error';
  content: string;
  level: number;
  error: string;
  memoId?: string;
};
type Store = {
  repo: Repository;
  books: Book[];
  memos: Memo[];
  drafts: Draft[];
  settings: Settings;
  ready: boolean;
  error: string;
  reload(): Promise<void>;
  updateSettings(value: Settings): Promise<void>;
  voice: Voice;
  startVoice(bookId: string): Promise<void>;
  stopVoice(): Promise<void>;
  activeBookId: string | null;
};
const Context = createContext<Store | null>(null);
const idle: Voice = { status: 'idle', content: '', level: 0, error: '' };
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const repo = useMemo(() => repository(db, randomUUID), [db]);
  const [books, setBooks] = useState<Book[]>([]),
    [memos, setMemos] = useState<Memo[]>([]),
    [drafts, setDrafts] = useState<Draft[]>([]);
  const [settings, setSettings] = useState(defaults),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const [voice, setVoice] = useState<Voice>(idle),
    [activeBookId, setActiveBookId] = useState<string | null>(null);
  const active = useRef<Draft | null>(null),
    starting = useRef(false);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  async function reload() {
    try {
      const [b, m, d, s] = await Promise.all([
        repo.books(),
        repo.memos(),
        repo.drafts(),
        repo.settings(),
      ]);
      setBooks(b);
      setMemos(m);
      setDrafts(d);
      setSettings(s);
      setError('');
    } catch (e) {
      setError(message(e));
      throw e;
    }
  }
  useEffect(() => {
    let mounted = true;
    async function initialize() {
      let recoveryError = '';
      try {
        if (speech) for (const draft of await speech.recover()) await repo.importDraft(draft);
      } catch (e) {
        recoveryError = `音声下書きの復元を完了できませんでした。元のバックアップは残しています。${message(e)}`;
      }
      await reload();
      if (mounted) {
        setReady(true);
        if (recoveryError) setError(recoveryError);
      }
    }
    initialize().catch((e) => setError(message(e)));
    if (!speech)
      return () => {
        mounted = false;
      };
    const transcript = speech.addListener('onTranscript', (event) => {
      const draft = active.current;
      if (!draft) return;
      draft.content = event.content;
      setVoice((v) => ({ ...v, content: event.content }));
      writes.current = writes.current
        .then(() => repo.checkpoint(draft.id, event.content))
        .catch((e) => {
          setError(`文字起こしの保存に失敗しました。${message(e)}`);
        });
    });
    const level = speech.addListener('onLevel', (event) =>
      setVoice((v) => (v.status === 'recording' ? { ...v, level: event.level } : v)),
    );
    const end = speech.addListener('onEnd', (event) => {
      const draft = active.current;
      if (!draft || draft.id !== event.id) return;
      setVoice((v) => ({ ...v, status: 'saving', content: event.content, level: 0 }));
      writes.current = writes.current
        .then(async () => {
          await repo.checkpoint(draft.id, event.content);
          if (event.error) {
            setVoice({
              status: 'error',
              content: event.content,
              level: 0,
              error: `${event.error} 入力内容を下書きに残しました。`,
            });
            await speech
              ?.announce('音声入力を終了しました。下書きを残しました。')
              .catch(() => undefined);
          } else if (event.content.trim()) {
            const id = await repo.finishDraft(draft.id, event.content);
            // Native cleanup failure must not undo a successful SQLite commit.
            await speech?.discard(id).catch(() => undefined);
            setVoice({ status: 'saved', content: event.content, level: 0, error: '', memoId: id });
            await speech?.announce('メモを保存しました。').catch(() => undefined);
          } else {
            await repo.deleteDraft(draft.id);
            await speech?.discard(draft.id).catch(() => undefined);
            setVoice({
              ...idle,
              status: 'error',
              error: '音声を認識できませんでした。メモは保存していません。',
            });
            await speech?.announce('音声を認識できませんでした。').catch(() => undefined);
          }
        })
        .catch((e) => {
          setVoice({
            status: 'error',
            content: event.content,
            level: 0,
            error: `保存できませんでした。下書きから再試行してください。${message(e)}`,
          });
        })
        .finally(async () => {
          active.current = null;
          setActiveBookId(null);
          await reload().catch(() => undefined);
        });
    });
    return () => {
      mounted = false;
      transcript.remove();
      level.remove();
      end.remove();
      void speech?.stop();
    };
    // The repository is stable for the lifetime of SQLiteProvider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);
  async function startVoice(bookId: string) {
    if (starting.current || active.current) return;
    starting.current = true;
    setVoice({ ...idle, status: 'starting' });
    try {
      if (!speech)
        throw new Error('音声入力にはiOS Development Buildが必要です。Expo Goでは利用できません。');
      if (!books.some((book) => book.id === bookId))
        throw new Error('先に書籍を選択してください。');
      const draft = await repo.createDraft(bookId);
      active.current = draft;
      setActiveBookId(bookId);
      await speech.start(
        draft.id,
        bookId,
        draft.created_at,
        settings.silenceEnabled,
        settings.silenceSeconds,
      );
      setVoice((v) => ({ ...v, status: 'recording' }));
    } catch (e) {
      const draft = active.current;
      if (draft && !draft.content) {
        await repo.deleteDraft(draft.id).catch(() => undefined);
        await speech?.discard(draft.id).catch(() => undefined);
      }
      active.current = null;
      setActiveBookId(null);
      setVoice({ ...idle, status: 'error', error: message(e) });
    } finally {
      starting.current = false;
    }
  }
  async function stopVoice() {
    await speech?.stop();
  }
  async function updateSettings(value: Settings) {
    await repo.saveSettings(value);
    setSettings(value);
  }
  return (
    <Context.Provider
      value={{
        repo,
        books,
        memos,
        drafts,
        settings,
        ready,
        error,
        reload,
        updateSettings,
        voice,
        startVoice,
        stopVoice,
        activeBookId,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('StoreProvider is missing');
  return store;
}
