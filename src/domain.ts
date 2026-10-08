export type Book = {
  id: string;
  title: string;
  author: string;
  cover_uri: string | null;
  is_current: number;
  created_at: string;
  updated_at: string;
};
export type Memo = {
  id: string;
  book_id: string;
  content: string;
  playback_position_ms: number | null;
  chapter: string | null;
  position_source: string | null;
  created_at: string;
  updated_at: string;
};
export type Draft = {
  id: string;
  book_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};
export type Settings = { silenceEnabled: boolean; silenceSeconds: number; rewindSeconds: number };
export const defaults: Settings = { silenceEnabled: true, silenceSeconds: 5, rewindSeconds: 7 };
export function requiredText(value: string, label: string): string {
  const text = value.trim();
  if (!text) throw new Error(`${label}を入力してください。`);
  return text;
}
export function message(error: unknown): string {
  return error instanceof Error ? error.message : '処理できませんでした。もう一度お試しください。';
}
export function dateLabel(date: string): string {
  return new Date(date).toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
export function playbackLabel(ms: number | null): string {
  if (ms === null) return '再生位置は取得していません';
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
