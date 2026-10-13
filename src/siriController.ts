import type { speech } from './speech';
import { message } from './domain';
type Native = Pick<
  NonNullable<typeof speech>,
  'consumeStartRequest' | 'ackStartRequest' | 'markStartStage' | 'status' | 'announce'
>;
type State = { active: boolean; busy: boolean; bookId: string | null };
export function createSiriRunner(options: {
  native: Native;
  state(): State;
  start(bookId: string): Promise<boolean>;
  navigate(bookId: string): void;
  now?: () => number;
  delay?: () => Promise<void>;
}) {
  const { native } = options;
  const now = options.now ?? (() => Date.now() / 1000);
  const delay = options.delay ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 150)));
  let processing = false,
    disposed = false;
  return {
    dispose() {
      disposed = true;
    },
    async tick() {
      if (disposed || processing || !options.state().active || options.state().busy) return;
      processing = true;
      let requestId: string | undefined;
      try {
        const request = await native.consumeStartRequest();
        if (!request || disposed) return;
        requestId = request.id;
        await native.markStartStage(request.id, 'received');
        const state = options.state();
        if (state.busy) return;
        if (!state.bookId) throw new Error('聴いている本を、停車中に選んでください。');
        const status = await native.status();
        if (status.speech !== 3 || status.microphone !== 1735552628)
          throw new Error('マイクと音声認識の許可を、停車中に設定してください。');
        if (!status.onDevice)
          throw new Error('この端末では日本語の端末内音声認識を利用できません。');
        await native.markStartStage(request.id, 'ready');
        await native.announce('メモを開始します。');
        await native.markStartStage(request.id, 'cue');
        while (!disposed && !options.state().active && now() - request.createdAt <= 30)
          await delay();
        if (disposed) return;
        if (now() - request.createdAt > 30) {
          await native.markStartStage(request.id, 'expired');
          await native.ackStartRequest(request.id);
          return;
        }
        await native.markStartStage(request.id, 'start');
        options.navigate(state.bookId);
        const started = await options.start(state.bookId);
        await native.markStartStage(request.id, started ? 'started' : 'failed');
        await native.ackStartRequest(request.id);
      } catch (error) {
        if (requestId) {
          await native.markStartStage(requestId, 'failed').catch(() => undefined);
          await native.ackStartRequest(requestId).catch(() => undefined);
        }
        await native.announce(message(error)).catch(() => undefined);
      } finally {
        processing = false;
      }
    },
  };
}
