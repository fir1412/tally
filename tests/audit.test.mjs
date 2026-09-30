// Regression tests for the security audit's confirmed findings (run-1): each failed before its fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

const ms = f => { const t = performance.now(); f(); return performance.now() - t; };
const days = (n, from = '2026-09-29') => Array.from({ length: n }, (_, i) => E.addDays(from, -(i % 20)));

test('habits stays fast on a huge imported history (no copy of the window per step)', () => {
  const tx = days(64_000).map((date, i) => ({ id: `t${i}`, date, time: `12:${String(i % 60).padStart(2, '0')}`, type: 'expense', amount: 100, category: 'dining' }));
  let out;
  assert.ok(ms(() => { out = E.habits(tx, '2026-09-30'); }) < 1000, 'habits took over a second on 64k rows');
  assert.equal(out[0].category, 'dining');
});

test('the tax-relief card stays fast on a huge imported history (no search per matching row)', () => {
  const tx = Array.from({ length: 64_000 }, (_, i) => ({ id: `z${i}`, date: '2026-03-01', type: 'expense', amount: 250, merchant: 'Zakat', category: 'giving' }));
  let out;
  assert.ok(ms(() => { out = E.taxRelief(tx, 2026); }) < 1000, 'taxRelief took over a second on 64k rows');
  assert.equal(out.find(l => l.entries.length)?.entries.length, 64_000);   // still one entry per payment
});

test('bills that add themselves post only the last ~13 months, however old their start (an imported file can set 1990)', () => {
  const bills = Array.from({ length: 10 }, (_, i) => ({ id: `x${i}`, name: `Svc${i}`, amount: 1, accountId: 'j', freq: 'weekly', auto: true, start: '1990-01-01' }));
  let got;
  assert.ok(ms(() => { got = E.dueBillTxs(bills, '2026-09-30', []); }) < 1000, 'posting took over a second');
  for (const b of bills) assert.ok(got.filter(t => t.bill === b.id).length <= 60, `bill ${b.id} posted ${got.filter(t => t.bill === b.id).length} payments`);
  assert.ok(got.every(t => t.date >= E.addDays('2026-09-30', -400)));
});

test('a zoned CSV date is held to the same range as every other date (an impossible year is skipped, not stored)', async () => {
  const IO = await import('../js/io.js');
  const rows = [['0000-01-01T00:00:00Z', '-12.50', 'A'], ['9999-12-31T23:00:00-05:00', '-3.00', 'B'], ['2026-09-29T02:30:00Z', '-5.00', 'C']];
  const r = IO.rowsToTx(rows, { date: 0, amount: 1, merchant: 2 }, { accountId: 'a', catMap: {}, customCats: [] });
  assert.deepEqual(r.txs.map(t => t.merchant), ['C']);
  assert.ok(r.txs.every(t => E.validIso(t.date)));
  assert.deepEqual(r.skipped.map(s => s.why), ['date', 'date']);
});

test("a restored or partner's file cannot plant a creation time outside 2000..now (year 500 crashed Home's banner)", async () => {
  const IO = await import('../js/io.js');
  const bad = Date.UTC(500, 5, 15), good = Date.UTC(2026, 8, 1);
  const b = IO.readBackup(JSON.stringify({ app: 'tally', v: 1, accounts: [{ id: 'a1', name: 'Joint', kind: 'bank', createdAt: bad }],
    tx: [{ id: 'p1', date: '2026-09-21', type: 'expense', amount: 100, accountId: 'a1', createdAt: bad }, { id: 'p2', date: '2026-09-22', type: 'expense', amount: 100, accountId: 'a1', createdAt: good }] }));
  assert.deepEqual([b.accounts[0].createdAt, ...b.tx.map(t => t.createdAt)], [0, 0, good]);
});

test('Home and the price sparkline never spread a whole-dataset array into Math.min/max (throws past ~125k rows)', async () => {
  const { readFileSync } = await import('node:fs');
  const home = readFileSync(new URL('../js/views/home.js', import.meta.url), 'utf8'), an = readFileSync(new URL('../js/views/analytics.js', import.meta.url), 'utf8');
  assert.doesNotMatch(home.match(/^const began = .*$/m)[0], /Math\.(min|max)\(\.\.\./, 'began() spreads every createdAt');
  assert.doesNotMatch(an.match(/^.*vs = points\.map.*$/m)[0], /Math\.(min|max)\(\.\.\./, 'the sparkline spreads every purchase');
  const big = Array.from({ length: 200_000 }, (_, i) => i + 1);
  assert.throws(() => Math.min(...big), RangeError);   // why: the engine's argument limit, well under the 200,000-row intake cap
});

test("an imported file cannot write over, or link to, the receipt photo of this phone's own entry", async () => {
  const IO = await import('../js/io.js');
  const local = { accounts: [{ id: 'mine', name: 'Maybank', kind: 'bank' }, { id: 'jt', name: 'Joint', kind: 'bank', scope: 'joint' }],
    tx: [{ id: 'r1', date: '2026-09-01', type: 'expense', amount: 1000, accountId: 'mine', receiptId: 'pOWNER1', updatedAt: 5 }], recurring: [], kv: {} };
  const file = IO.readBackup(JSON.stringify({ app: 'tally', v: 1, kind: 'joint', by: 'Partner', accounts: [{ id: 'jt', name: 'Joint', kind: 'bank', scope: 'joint' }],
    tx: [{ id: 'n1', date: '2026-09-02', type: 'expense', amount: 100, accountId: 'jt', receiptId: 'pOWNER1', updatedAt: 60 }, { id: 'n2', date: '2026-09-03', type: 'expense', amount: 100, accountId: 'jt', receiptId: 'pNEW2', updatedAt: 60 }] }));
  const m = IO.mergeJoint(local, file);
  assert.deepEqual(m.tx.map(t => [t.id, t.receiptId]), [['n1', undefined], ['n2', 'pNEW2']]);   // not linked to r1's photo
  // Merge restore: photos are written only for rows it added, never under an id a row here already uses.
  assert.deepEqual([...IO.photosToWrite([{ id: 'z1', receiptId: 'pOWNER1' }, { id: 'z2', receiptId: 'pNEW' }, { id: 'r1', receiptId: 'pOWNER1' }], local.tx)], ['pNEW', 'pOWNER1']);
});
