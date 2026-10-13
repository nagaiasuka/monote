import test from 'node:test';
import assert from 'node:assert/strict';
import { createSiriRunner } from '../src/siriController';
function fixture() {
  let request: { id: string; createdAt: number } | null = { id: 'request-a', createdAt: 100 };
  const state = { active: true, busy: false, bookId: 'book-a' as string | null };
  const stages: string[] = [],
    calls: string[] = [];
  let now = 100;
  const options = {
    native: {
      consumeStartRequest: async () => {
        calls.push('read');
        return request;
      },
      ackStartRequest: async (id: string) => {
        calls.push('ack');
        if (request?.id === id) request = null;
      },
      markStartStage: async (_id: string, stage: string) => {
        stages.push(stage);
      },
      status: async () => ({ onDevice: true, speech: 3, microphone: 1735552628 }),
      announce: async (_text: string) => {
        calls.push('cue');
      },
    },
    state: () => state,
    start: async (_book: string) => {
      calls.push('start');
      return true;
    },
    navigate: (_book: string) => {
      calls.push('navigate');
    },
    now: () => now,
    delay: async () => {
      state.active = true;
    },
  };
  return {
    options,
    state,
    stages,
    calls,
    advance: () => {
      now = 131;
    },
  };
}
test('saving does not discard a Siri request; it starts exactly once after idle', async () => {
  const f = fixture();
  const runner = createSiriRunner(f.options);
  f.state.busy = true;
  await runner.tick();
  assert.deepEqual(f.calls, []);
  f.state.busy = false;
  await runner.tick();
  await runner.tick();
  assert.equal(f.calls.filter((x) => x === 'start').length, 1);
  assert.equal(f.calls.filter((x) => x === 'ack').length, 1);
});
test('overlapping polls cannot start duplicate recordings', async () => {
  const f = fixture();
  const runner = createSiriRunner(f.options);
  await Promise.all([runner.tick(), runner.tick(), runner.tick()]);
  assert.equal(f.calls.filter((x) => x === 'start').length, 1);
});
test('temporary inactivity after the cue is awaited instead of losing the request', async () => {
  const f = fixture();
  f.options.native.announce = async () => {
    f.state.active = false;
  };
  await createSiriRunner(f.options).tick();
  assert.equal(f.stages.at(-1), 'started');
});
test('a request expiring during the cue never starts the microphone', async () => {
  const f = fixture();
  f.options.native.announce = async () => {
    f.advance();
  };
  await createSiriRunner(f.options).tick();
  assert.equal(f.stages.at(-1), 'expired');
  assert.ok(!f.calls.includes('start'));
});
test('permission not granted reports failure without requesting permission or recording', async () => {
  const f = fixture();
  f.options.native.status = async () => ({ onDevice: true, speech: 0, microphone: 0 });
  await createSiriRunner(f.options).tick();
  assert.equal(f.stages.at(-1), 'failed');
  assert.ok(!f.calls.includes('start'));
  assert.ok(f.calls.includes('ack'));
});
