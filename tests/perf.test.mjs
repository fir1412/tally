// The speed-ups change how, never what: the same outputs as before them, and results kept only while the data is the same.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../js/engine.js';
import { digest, history, TODAY } from './fixtures/engine-pin.mjs';
import { readAligned } from '../js/align.js';

test('the engine gives the same results as before the speed-ups (fixed history, calendar and payday months)', () => {
  const want = JSON.parse(readFileSync(new URL('./fixtures/engine-pin.json', import.meta.url), 'utf8'));
  assert.equal(JSON.stringify(digest(E)), JSON.stringify(want));   // key order too: it decides ties on screen
});

test('addMonths in string arithmetic matches the calendar', () => {
  for (let y = 1990; y <= 2099; y += 7) for (let m = 1; m <= 12; m++) for (const n of [-25, -13, -12, -1, 0, 1, 11, 12, 13, 30]) {
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    assert.equal(E.addMonths(ym, n), new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7), `${ym} ${n}`);
  }
});

test('monthSpends and monthIncomes in one pass equal month by month', () => {
  const txs = history(), yms = ['2026-09', '2026-08', '2025-12', '2024-01'];
  for (const sd of [1, 25]) {
    const all = E.monthSpends(txs, yms, sd), inc = E.monthIncomes(txs, yms, sd);
    for (const ym of yms) {
      assert.deepEqual(all[ym], E.monthSpends(txs, [ym], sd)[ym]);
      assert.equal(inc[ym], txs.filter(t => t.type === 'income' && E.cycleKey(t.date, sd) === ym).reduce((s, t) => s + t.amount, 0));
    }
  }
});

test('newest lists what a full sort would, ties and missing times included', () => {
  const txs = history().filter(t => t.date <= TODAY);
  txs.push({ id: 'same1', date: TODAY, amount: 1 }, { id: 'same2', date: TODAY, amount: 2 });
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  for (const n of [0, 1, 8, 50]) assert.deepEqual(E.newest(txs, n).map(t => t.id), sorted.slice(0, n).map(t => t.id));
});

test('byDate orders ISO dates and HH:MM times as localeCompare did', () => {
  const v = ['2026-09-28', '2026-09-03', '2025-12-31', '2026-10-01', '', '08:05', '23:59', '00:00', '13:40'];
  for (const a of v) for (const b of v) assert.equal(E.byDate(a, b), Math.sign(a.localeCompare(b)), `${a} ${b}`);
});

test('level text that reads badly tries every turn and keeps the best (it may be sideways); too little text too', async () => {
  const raw = { width: 4, height: 2, data: new Uint8ClampedArray(32).fill(255) };
  const line = (y, mean) => ({ text: 'NASI LEMAK 12.90', mean, box: [[0, y], [300, y], [300, y + 20], [0, y + 20]] });
  let calls = 0;
  const upsideDown = async () => { calls++; return { texts: [0, 40, 80, 120].map(y => line(y, calls === 1 ? 0.4 : calls === 2 ? 0.95 : 0.5)) }; };   // as is: poor; upside down: good; sideways: poor
  const r = await readAligned(upsideDown, raw);
  assert.equal(calls, 4);   // as is, then 180°, 90°, 270° (synthetic bench: 270° photos 74.6% -> 93.1% totals)
  assert.equal(r.turns, 2);
  calls = 0;
  await readAligned(async () => { calls++; return { texts: [line(0, 0.9)] }; }, raw);
  assert.equal(calls, 4);
});

test('results are kept per data: a save makes a new transaction list, so nothing stale is shown', async () => {
  const disk = new Map();
  globalThis.localStorage = { getItem: k => disk.get(k) ?? null, setItem: (k, v) => disk.set(k, String(v)) };
  const st = await import('../js/state.js');
  await st.load();
  await st.saveAccount({ id: 'a', name: 'Cash', kind: 'cash', opening: 0 });
  await st.saveTx({ id: 't1', date: '2020-01-01', type: 'expense', amount: 500, accountId: 'a', category: 'dining' });
  const before = st.S.tx, list = st.booked();
  assert.equal(st.booked(), list);   // the same array until the data changes
  let runs = 0;
  const count = txs => { runs++; return txs.length; };
  assert.equal(st.cached(count, list, 'x'), 1);
  assert.equal(st.cached(count, list, 'x'), 1);
  assert.equal(runs, 1);
  await st.saveTx({ id: 't2', date: '2020-01-02', type: 'expense', amount: 700, accountId: 'a', category: 'dining' });
  assert.notEqual(st.S.tx, before);
  assert.deepEqual(before.map(t => t.id), ['t1']);   // the old list is left as it was
  assert.equal(st.cached(count, st.booked(), 'x'), 2);
  await st.saveTx({ id: 't1', date: '2020-01-01', type: 'expense', amount: 900, accountId: 'a', category: 'dining' });
  assert.equal(st.cached(E.monthSpend, st.booked(), '2020-01', 1).total, 1600);
  assert.equal(st.cat('dining').name, 'Dining');
  await st.setCatColor('dining', '#123456');
  assert.equal(st.cat('dining').color, '#123456');
  assert.equal(st.cat('nope').id, 'other');
});
