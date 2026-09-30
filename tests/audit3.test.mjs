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

test('a phone with more than 50 own categories from before the cap gets back under it, and can back up and import again', async () => {
  const cats = n => Array.from({ length: n }, (_, i) => ({ id: `c_old${i}`, name: i === 50 ? 'Groceries run' : `Old ${i}`, color: '#123456' }));
  // An import that adds nothing to an over-cap list isn't refused; one that grows it still is.
  const local = { accounts: [{ id: 'a1' }], tx: [{ id: 't1' }], recurring: [], customCats: cats(51) };
  assert.equal(IO.overCapAfter(local, { tx: [{ id: 't2' }] }), '');
  assert.equal(IO.overCapAfter(local, { customCats: [{ id: 'c_new' }] }), 'customCats');
  // A backup made before the cap restores: the first 50 are kept, rows in the rest become Other.
  const b = IO.readBackup(JSON.stringify({ app: 'tally', v: 1, accounts: [{ id: 'a1', name: 'Bank', kind: 'bank' }], tx: [{ id: 't1', date: '2026-09-01', type: 'expense', amount: 100, accountId: 'a1', category: 'c_old50' }], kv: { customCats: cats(51) } }));
  assert.deepEqual([b.kv.customCats.length, b.tx[0].category], [50, 'other']);
  // At start the least-used past 50 fold into Tally's nearest category, their rows moved with them.
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(); await A.S.load();
  await A.S.saveAccount({ id: 'a1', name: 'Bank', kind: 'bank', opening: 0, createdAt: 1 });
  await A.S.setKv('customCats', cats(52));
  const row = (id, category) => ({ id, accountId: 'a1', type: 'expense', amount: 100, date: '2026-09-01', merchant: id, category, createdAt: 1 });
  await A.S.putAll({ tx: [...cats(50).map((c, i) => row(`u${i}`, c.id)), row('g1', 'c_old50')] });   // c_old50 used once, c_old51 never
  await A.S.repairCatNames();
  assert.equal(A.S.S.kv.customCats.length, 50);
  assert.ok(!A.S.S.kv.customCats.some(c => c.id === 'c_old51'), 'the unused one folds first');
  assert.ok(A.S.S.tx.every(t => A.S.S.kv.customCats.some(c => c.id === t.category) || !t.category.startsWith('c_')));
});

test("undoing a big import on a joint account doesn't push out the markers of entries deleted before", async () => {
  const { readFileSync } = await import('node:fs');
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(); await A.S.load();
  await A.S.saveAccount({ id: 'jt', name: 'Joint', kind: 'bank', scope: 'joint', opening: 0, createdAt: 1 });
  const row = id => ({ id, accountId: 'jt', type: 'expense', amount: 100, date: '2026-09-01', merchant: id, category: 'other', createdAt: 1 });
  await A.S.saveTxs([row('x_rent')]); await A.S.deleteTxs(['x_rent']);   // a real delete the partner hasn't had yet
  const save = Array.from({ length: 1000 }, (_, i) => row(`imp${i}`));
  await A.S.putAll({ tx: save, edit: true });   // the import
  await A.S.putAll({ del: { tx: save.map(x => x.id) }, edit: true, mark: false });   // its Undo, as commitImport does it
  assert.ok(A.S.S.kv.jointGone.x_rent, "the earlier delete's marker is still there");
  const undo = readFileSync(new URL('../js/views/setup.js', import.meta.url), 'utf8').match(/async function commitImport[\s\S]*?\n}\n/)[0].match(/undo: [\s\S]*?\} \}\);/)[0];
  assert.match(undo, /mark: false/, "the Undo removes the import's own rows without delete markers");
});

test('a write that deletes and puts back the same joint entry leaves it alive: no delete marker next to it', async () => {
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(); await A.S.load();
  await A.S.saveAccount({ id: 'jt', name: 'Joint', kind: 'bank', scope: 'joint', opening: 0, createdAt: 1 });
  const p = { id: 'p1', accountId: 'jt', type: 'expense', amount: 1000, date: '2026-03-10', merchant: 'Transfer to TNG', category: 'other', createdAt: 1, by: 'Partner' };
  await A.S.putAll({ tx: [p] });
  await A.S.putAll({ tx: [p], del: { tx: ['p1'] }, edit: true });   // an Undo restoring the entry an import turned into a transfer (same id)
  assert.equal(A.S.S.kv.jointGone?.p1, undefined);
  assert.ok(A.S.S.tx.some(t => t.id === 'p1'));
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
