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
