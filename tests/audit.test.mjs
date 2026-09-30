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
