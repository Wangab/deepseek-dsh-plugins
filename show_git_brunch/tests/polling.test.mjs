import test from 'node:test';
import assert from 'node:assert/strict';
import { createBranchPolling } from '../src/polling.mjs';

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) { const list = listeners.get(type) ?? []; list.push(fn); listeners.set(type, list); },
    removeEventListener(type, fn) { listeners.set(type, (listeners.get(type) ?? []).filter(x => x !== fn)); },
    emit(type) { for (const fn of listeners.get(type) ?? []) fn(); },
    count(type) { return (listeners.get(type) ?? []).length; },
  };
}

function harness(request) {
  const doc = Object.assign(eventTarget(), { visibilityState: 'visible' });
  const win = eventTarget();
  const intervals = new Map(); let id = 0;
  const values = [];
  const dispose = createBranchPolling({ request, onValue: value => values.push(value), document: doc, window: win,
    setInterval(fn, ms) { assert.equal(ms, 5000); intervals.set(++id, fn); return id; },
    clearInterval(key) { intervals.delete(key); },
    setTimeout(fn) { return setTimeout(fn, 10000); }, clearTimeout,
  });
  return { doc, win, intervals, values, dispose };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('refreshes initially, on interval and focus without overlapping requests', async () => {
  const resolvers = []; let calls = 0;
  const h = harness(() => { calls++; return new Promise(resolve => resolvers.push(resolve)); });
  assert.equal(calls, 1); assert.equal(h.intervals.size, 1);
  h.win.emit('focus'); [...h.intervals.values()][0](); assert.equal(calls, 1);
  resolvers.shift()({kind:'branch',name:'main'}); await flush(); assert.deepEqual(h.values, [{kind:'branch',name:'main'}]);
  h.win.emit('focus'); assert.equal(calls, 2); resolvers.shift()(null); await flush(); assert.deepEqual(h.values.at(-1), null);
  h.dispose();
});

test('pauses while hidden, aborts in-flight work, and refreshes when visible', async () => {
  const signals = []; const h = harness(signal => { signals.push(signal); return new Promise(() => {}); });
  h.doc.visibilityState = 'hidden'; h.doc.emit('visibilitychange');
  assert.equal(signals[0].aborted, true); assert.equal(h.intervals.size, 0); assert.deepEqual(h.values.at(-1), null);
  h.doc.visibilityState = 'visible'; h.doc.emit('visibilitychange'); assert.equal(signals.length, 2); assert.equal(h.intervals.size, 1);
  h.dispose(); assert.equal(signals[1].aborted, true); assert.equal(h.doc.count('visibilitychange'), 0); assert.equal(h.win.count('focus'), 0);
});

test('a timed-out request clears stale state and permits the next interval refresh', async () => {
  const doc = Object.assign(eventTarget(), { visibilityState: 'visible' });
  const win = eventTarget();
  let interval; let timeout; let calls = 0; const values = [];
  const dispose = createBranchPolling({
    request() { calls++; return new Promise(() => {}); }, onValue:value=>values.push(value), document:doc, window:win,
    setInterval(fn) { interval=fn; return 1; }, clearInterval(){}, setTimeout(fn, ms){ assert.equal(ms,4000); timeout=fn; return 2; }, clearTimeout(){},
  });
  assert.equal(calls,1); timeout(); assert.deepEqual(values,[null]); interval(); assert.equal(calls,2); dispose();
});

test('failures clear the value and disposed late results are ignored', async () => {
  let resolve; const h = harness(() => new Promise(r => { resolve = r; }));
  h.dispose(); resolve({kind:'branch',name:'late'}); await flush(); assert.equal(h.values.includes(h.values.find(v => v?.name === 'late')), false);
  const failing = harness(async () => { throw new Error('offline'); }); await flush(); assert.deepEqual(failing.values.at(-1), null); failing.dispose();
});
