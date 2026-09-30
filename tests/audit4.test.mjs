// Regression tests for the security audit's confirmed findings (run-4, the code changed since run-3): each failed before its fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

console.warn = () => {};   // db.js logs each failed save
const disk = new Map();
globalThis.localStorage = { getItem: k => disk.get(k) ?? null, setItem: (k, v) => disk.set(k, String(v)), removeItem: k => disk.delete(k), key: i => [...disk.keys()][i], get length() { return disk.size; } };
const IO = await import('../js/io.js'), E = await import('../js/engine.js');
const St = await import('../js/state.js'), { S } = St;
const { saveSplit, ME } = await import('../js/views/splitbill.js');

test("a backup's removed categories only move into a category an entry can have: never an income one, a made-up id or a prototype key", () => {
  for (const to of ['constructor', '__proto__', 'salary', 'nope', 'toString']) assert.equal(IO.backupSettings({ movedCats: { groceries: to } }).movedCats, undefined, to);
  const ok = { kids: 'household', health: 'c_pharmacy', fun: 'other' };
  assert.deepEqual(IO.backupSettings({ movedCats: ok }).movedCats, ok);
  // What a crafted one did: every later guess of the category landed on 'constructor', and Home's monthSpend threw.
  E.movedCategories(IO.backupSettings({ movedCats: { groceries: 'constructor' } }).movedCats);
  try { assert.doesNotThrow(() => E.monthSpend([{ id: 't', type: 'expense', date: '2026-10-01', amount: 500, accountId: 'a', category: E.categorize('BERAS 5KG'), createdAt: 1 }], '2026-10')); }
  finally { E.movedCategories({}); }
});
