import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useStore } from './store';
import { speech } from './speech';
import { createSiriRunner } from './siriController';

export function SiriStartConsumer() {
  const store = useStore();
  const latest = useRef(store);
  latest.current = store;
  useEffect(() => {
    if (!speech || typeof speech.ackStartRequest !== 'function' || !store.ready) return;
    const runner = createSiriRunner({
      native: speech,
      state: () => ({
        active: AppState.currentState === 'active',
        busy:
          !!latest.current.activeBookId ||
          ['starting', 'recording', 'saving'].includes(latest.current.voice.status),
        bookId: latest.current.books.find((b) => b.is_current)?.id ?? null,
      }),
      navigate: (bookId) => router.push({ pathname: '/voice', params: { bookId } }),
      start: (bookId) => latest.current.startVoice(bookId, true),
    });
    void runner.tick();
    const timer = setInterval(() => {
      void runner.tick();
    }, 800);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runner.tick();
    });
    return () => {
      runner.dispose();
      clearInterval(timer);
      listener.remove();
    };
  }, [store.ready]);
  return null;
}
