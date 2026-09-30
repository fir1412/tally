// Regression tests for the security audit's confirmed findings (run-3, the code changed since run-2): each failed before its fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as IO from '../js/io.js';

const HIDDEN = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/;

test('a category name decoded from HTML codes is cleaned again: no bidi, hidden or control characters come back', async () => {
  for (const s of ['&#x202e;dooF', '&#8238;Food 1', '&#x200b;Food', 'Fo&#1;od', 'A&#10;B', '&#x2066;x', '&#65309;x']) assert.doesNotMatch(IO.catName(IO.cleanText(s, 40)), HIDDEN, s);
  assert.equal(IO.catName('&#65309;x'), '=x');   // NFKC like every other file text
  assert.equal(IO.catName('&#x200b;Food'), 'Food');   // not a lookalike of the user's own Food
  // Restored or merged, then repaired at start: the stored name has none either.
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(); await A.S.load();
  await A.S.setKv('customCats', [{ id: 'c_file1', name: '&#x202e;dooF', color: '#111111' }]);
  await A.S.repairCatNames();
  assert.doesNotMatch(A.S.S.kv.customCats[0].name, HIDDEN);
});

test("a partner's delete markers stop only joint bills' payments, never a personal bill's", async () => {
  const E = await import('../js/engine.js'), { readFileSync } = await import('node:fs');
  const due = [{ id: 'rec-b9-2026-09-01', accountId: 'pmine' }, { id: 'rec-bj-2026-09-01', accountId: 'jt' }, { id: 'rec-bk-2026-09-01', accountId: 'jt' }];
  const gone = { 'rec-b9-2026-09-01': 1, 'rec-bj-2026-09-01': 1 };   // from the partner's file: one for a personal bill
  assert.deepEqual(E.unmarkedPayments(due, gone, new Set(['jt'])).map(x => x.id), ['rec-b9-2026-09-01', 'rec-bk-2026-09-01']);
  const post = readFileSync(new URL('../js/views/money.js', import.meta.url), 'utf8').match(/export async function postBills[\s\S]*?\n}\n/)[0];
  assert.match(post, /unmarkedPayments\(/);
});

test('a photo backup is refused, not reported as saved, when its data or photo count is more than restore reads', async () => {
  const { readFileSync } = await import('node:fs'), L = IO.LIMITS;
  assert.equal(IO.backupFits({ zip: true, fileBytes: 1e6, jsonBytes: L.backupJson + 1, entries: 2 }), false);   // the zip was fine, its JSON too big
  assert.equal(IO.backupFits({ zip: true, fileBytes: 1e6, jsonBytes: 1000, entries: IO.ZIP.entries + 1 }), false);   // photos restore would leave out
  assert.equal(IO.backupFits({ zip: true, fileBytes: 1e6, jsonBytes: 1000, entries: IO.ZIP.entries }), true);
  assert.equal(IO.backupFits({ zip: false, fileBytes: L.backupJson + 1, jsonBytes: L.backupJson + 1, entries: 1 }), false);
  const src = readFileSync(new URL('../js/views/setup.js', import.meta.url), 'utf8');
  assert.match(src.match(/async function sealedBackup[\s\S]*?\n}\n/)[0], /backupFits\(/);
});

test("a joint account deleted on either phone takes its bills with it: none is left to post into a personal account", () => {
  const T = Date.now(), me = { id: 'pmine', name: 'Maybank', kind: 'bank' };
  const bill = (id, accountId, updatedAt) => ({ id, name: 'Rent', amount: 150000, accountId, day: 1, auto: true, start: '2026-06-01', updatedAt });
  // A: this phone deleted joint account jold; the partner's file still has it, a bill and a row on it.
  const a = IO.mergeJoint({ accounts: [me], tx: [], recurring: [], kv: { jointGone: { jold: T } } },
    { accounts: [{ id: 'jold', name: 'Old joint', kind: 'bank', scope: 'joint', updatedAt: T - 3600_000 }], recurring: [bill('b2', 'jold', T - 3600_000)],
      tx: [{ id: 'ptx1', date: '2026-09-01', type: 'expense', amount: 100, accountId: 'jold', updatedAt: T - 3600_000 }], gone: {}, kv: {} });
  assert.deepEqual([a.accounts, a.recurring, a.tx].map(l => l.map(x => x.id)), [[], [], []]);
  // B: the partner deleted joint account jt; this phone has a bill on it (and no rows).
  const local = { accounts: [me, { id: 'jt', name: 'Joint', kind: 'bank', scope: 'joint', updatedAt: T - 7200_000 }], tx: [], recurring: [bill('b1', 'jt', T - 7200_000)], kv: {} };
  const b = IO.mergeJoint(local, { accounts: [], recurring: [], tx: [], gone: { jt: T }, kv: {} });
  assert.deepEqual([b.dropAccounts, b.dropBills], [['jt'], ['b1']]);
  // The partner deleted the account but kept its bill: that bill isn't written here without its account either.
  const c = IO.mergeJoint(local, { accounts: [], recurring: [bill('b3', 'jt', T)], tx: [], gone: { jt: T }, kv: {} });
  assert.deepEqual([c.recurring, c.dropAccounts, c.dropBills], [[], ['jt'], ['b1']]);
});
