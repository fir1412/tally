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

test('a Money Manager photo shared by many entries is read once, not once per entry (200,000 links, one file)', async () => {
  const { sqlJs } = await import('./fixtures/make.mjs'), IO = await import('../js/io.js'), { readMoneyManager } = await import('../js/mmimport.js');
  const SQL = await sqlJs(), db = new SQL.Database(), N = 2000;
  db.exec(`create table "transaction"(uid, type, amountInAccountCurrency, date, comment, created, isRemoved);
    create table account(uid, title, currencyCode, created, isRemoved); create table account_balance(uid, value);
    create table category(uid, title, type, color, isRemoved); create table sync_link(entityUid, entityType, otherType, otherUid, isRemoved);
    create table sync_file(uid, localPath, isRemoved);
    insert into account values ('A', 'Cash', 'MYR', '2026-01-01', 0); insert into account_balance values ('A', 0); insert into sync_file values ('F1', '/x/one.jpg', 0);`);
  for (let i = 0; i < N; i++) db.exec(`insert into "transaction" values ('t${i}', 'Expense', 500, '2026-09-10', 'Nasi', '', 0);
    insert into sync_link values ('t${i}', 'Transaction', 'Account', 'A', 0), ('t${i}', 'Transaction', 'Photo', 'F1', 0);`);
  const buf = new Uint8Array(await IO.zipStore([{ name: 'MyFinance.db', data: db.export() }, { name: 'photos/one.jpg', data: new Uint8Array(100) }]).arrayBuffer());
  const mm = await readMoneyManager(buf, SQL);
  assert.equal(mm.tx.length, N);
  assert.deepEqual(mm.photos.map(p => [p.path, p.txIds.length]), [['photos/one.jpg', N]]);   // one copy, shared by all
});

// Encrypted dummy data in tab A, and B: the same phone's other tab, unlocked with the same key.
async function twoTabs() {
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(), B = await shim.tab(), ENC = { key: 'DUMMY-WRAPPED', salt: 'x', iter: 1, iv: 'x' };
  const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  await A.S.load(); A.db.setKey(dek, ENC.key); A.db.expectSealed(true);
  await A.S.setKv('settings', { lock: { kind: 'pin', len: 4, enc: ENC } });
  await A.S.saveAccount({ id: 'a1', name: 'Dummy Bank', kind: 'bank', opening: 0, createdAt: 1 });
  await A.S.saveTxs([{ id: 't1', accountId: 'a1', type: 'expense', amount: 100, date: '2026-09-01', merchant: 'DUMMY ONE', category: 'dining', createdAt: 1 }]);
  B.db.setKey(dek, ENC.key); await B.S.load();
  return { shim, A, B };
}

test('erase is one step: another open tab writing right after it cannot leave a sealed row that locks every start', async () => {
  const { shim, A, B } = await twoTabs();
  await A.S.eraseAll();
  await B.S.saveTx({ id: 'tB', accountId: 'a1', type: 'expense', amount: 5, date: '2026-09-02', merchant: 'DUMMY B', category: 'dining', createdAt: 2 }).catch(() => {});   // before B hears of it
  const C = await shim.tab();
  await C.S.load();   // threw 'Tally is locked' before: a sealed row with no key left to open it
  assert.deepEqual([C.S.S.tx.length, C.S.S.accounts.length, shim.rows('tx').length], [0, 0, 0]);
});

test("after an erase no live copy writes the old data back: this page's pending draft, another tab's Undo", async () => {
  const { shim, A, B } = await twoTabs();
  const undo = await B.S.deleteTxs(['t1']);   // B shows 'Deleted · Undo'
  await A.S.eraseAll();
  const late = [await A.S.setKv('reviewDraft', { draft: { merchant: 'DUMMY PRE-ERASE' } }).then(() => 'landed', () => 'refused'), await undo().then(() => 'landed', () => 'refused')];
  assert.deepEqual(late, ['refused', 'refused']);
  const C = await shim.tab();
  await C.S.load();
  assert.deepEqual([C.S.S.tx.length, C.S.S.kv.reviewDraft ?? null], [0, null]);
});
