// Joint accounts: the Me · Joint · All scope, the file for a spouse (never personal data) and newest-edit-wins merging.
import test from 'node:test';
import assert from 'node:assert/strict';
import { S, scope, inScope, scopedTx, scopedAccounts, booked, budgetsFor } from '../js/state.js';
import { balances, monthSpend } from '../js/engine.js';
import * as IO from '../js/io.js';

const ACCOUNTS = [
  { id: 'mine', name: 'My Maybank', kind: 'bank', opening: 100000, createdAt: 1 },
  { id: 'jt', name: 'Joint CIMB', kind: 'bank', opening: 50000, scope: 'joint', createdAt: 2, updatedAt: 10 },
];
const TX = [
  { id: 't1', date: '2026-01-05', type: 'expense', amount: 1000, accountId: 'mine', category: 'dining', merchant: 'Secret lunch', createdAt: 1, updatedAt: 10 },
  { id: 't2', date: '2026-01-06', type: 'expense', amount: 20000, accountId: 'jt', category: 'c_rumah', merchant: 'Rent', createdAt: 2, updatedAt: 10, by: 'Aisyah' },
  { id: 't3', date: '2026-01-07', type: 'transfer', amount: 30000, accountId: 'mine', toAccountId: 'jt', category: 'other', createdAt: 3, updatedAt: 10 },
];
const KV = { settings: {}, budgets: { total: 200000, byCat: { dining: 30000 }, joint: { total: 150000, byCat: { dining: 10000 }, updatedAt: 10 } }, customCats: [{ id: 'c_rumah', name: 'Rumah', color: '#112233' }, { id: 'c_hobi', name: 'My hobby', color: '#445566' }], rules: {} };
const setup = sc => Object.assign(S, { accounts: structuredClone(ACCOUNTS), tx: structuredClone(TX), kv: { ...structuredClone(KV), settings: { scope: sc } } });

test('scope: Me, Joint, All; a personal → joint transfer leaves one and arrives in the other', () => {
  setup('me');
  assert.equal(scope(), 'me');
  assert.deepEqual(scopedTx().map(x => x.id), ['t1', 't3']);
  assert.deepEqual(booked().map(x => x.id), ['t1', 't3']);
  assert.equal(balances(scopedAccounts(), booked()).total, 100000 - 1000 - 30000);
  assert.equal(monthSpend(booked(), '2026-01').total, 1000);   // transfers are never spending
  S.kv.settings.scope = 'joint';
  assert.deepEqual(scopedTx().map(x => x.id), ['t2', 't3']);
  assert.equal(balances(scopedAccounts(), booked()).total, 50000 - 20000 + 30000);
  S.kv.settings.scope = 'all';
  assert.equal(scopedTx().length, 3);
  assert.equal(balances(scopedAccounts(), booked()).total, 150000 - 21000);   // the transfer nets out
  assert.ok(inScope({ accountId: 'jt' }, 'joint') && !inScope({ accountId: 'jt' }, 'me'));   // bills use the same test
  // No joint account: everything is Me, whatever was stored.
  S.accounts = S.accounts.filter(a => a.id === 'mine');
  S.kv.settings.scope = 'joint';
  assert.equal(scope(), 'me');
  assert.equal(scopedTx(), S.tx);
});

test('budgets per scope: joint ones apart, All adds them up', () => {
  setup('joint');
  assert.equal(budgetsFor().total, 150000);
  assert.equal(budgetsFor('me').total, 200000);
  assert.deepEqual(budgetsFor('all'), { total: 350000, byCat: { dining: 40000 } });
});

test('share file: only joint accounts, their rows and the categories they use; nothing personal', () => {
  const text = IO.makeJointShare({ accounts: ACCOUNTS, tx: TX, kv: KV }, 'Aisyah');
  for (const secret of ['"mine"', 'My Maybank', 'Secret lunch', 'My hobby', '200000']) assert.ok(!text.includes(secret), secret);
  const d = JSON.parse(text);
  assert.deepEqual(d.accounts.map(a => a.id), ['jt']);
  assert.deepEqual(d.tx.map(x => [x.id, x.type, x.accountId, x.toAccountId]), [['t2', 'expense', 'jt', undefined], ['t3', 'income', 'jt', undefined]]);   // the transfer in, without its personal side
  assert.deepEqual(d.kv.customCats.map(c => c.id), ['c_rumah']);
  assert.equal(d.kv.budgets.total, 0);
  const r = IO.readBackup(text);
  assert.equal(r.joint, true); assert.equal(r.by, 'Aisyah');
  assert.equal(r.tx.length, 2); assert.equal(r.tx[0].by, 'Aisyah');
  assert.equal(r.kv.budgets.joint.total, 150000);
});

test('merge: the spouse gets everything, edits travel back, the newer edit wins both ways', () => {
  // Spouse B starts empty.
  const fromA = IO.readBackup(IO.makeJointShare({ accounts: ACCOUNTS, tx: TX, kv: KV }, 'Aisyah'));
  const empty = { accounts: [], tx: [], kv: { customCats: [], budgets: { total: 0, byCat: {} } } };
  const m = IO.mergeJoint(empty, fromA);
  assert.deepEqual(m.accounts.map(a => [a.id, a.scope]), [['jt', 'joint']]);
  assert.equal(m.tx.length, 2);
  assert.deepEqual(m.customCats.map(c => c.id), ['c_rumah']);
  assert.equal(m.budgetsJoint.total, 150000);
  // B edits the rent later and adds an entry; A meanwhile edits nothing on t2.
  const B = { accounts: m.accounts, tx: m.tx.map(x => (x.id === 't2' ? { ...x, amount: 22000, updatedAt: 20 } : x)).concat({ id: 'tb', date: '2026-01-08', type: 'expense', amount: 500, accountId: 'jt', category: 'groceries', createdAt: 5, updatedAt: 20, by: 'Hafiz' }), kv: { customCats: m.customCats, budgets: { total: 0, byCat: {}, joint: m.budgetsJoint } } };
  const back = IO.readBackup(IO.makeJointShare(B, 'Hafiz'));
  const intoA = IO.mergeJoint({ accounts: ACCOUNTS, tx: TX, kv: KV }, back);
  assert.deepEqual(intoA.tx.map(x => [x.id, x.amount]).sort(), [['t2', 22000], ['tb', 500]]);   // t3 (A's personal → joint transfer) is left alone
  assert.equal(intoA.accounts.length, 0);   // unchanged account: not rewritten
  assert.equal(intoA.customCats.length, 0);
  assert.equal(intoA.budgetsJoint, undefined);   // same age: kept
  // A's own newer edit beats B's older one.
  const aNewer = TX.map(x => (x.id === 't2' ? { ...x, amount: 25000, updatedAt: 30 } : x));
  assert.ok(!IO.mergeJoint({ accounts: ACCOUNTS, tx: aNewer, kv: KV }, back).tx.some(x => x.id === 't2'));
});

test('merge: a crafted share file cannot touch personal accounts or win forever', () => {
  const evil = JSON.parse(IO.makeJointShare({ accounts: ACCOUNTS, tx: TX, kv: KV }));
  evil.accounts.push({ id: 'mine', name: 'Hijacked', kind: 'bank', opening: 0, scope: 'joint', updatedAt: 99 });   // make my personal account "joint"
  evil.tx.push({ id: 't1', date: '2026-01-05', type: 'expense', amount: 1, accountId: 'mine', category: 'dining', updatedAt: 99 });   // overwrite a personal row
  evil.tx.push({ id: 't9', date: '2026-01-05', type: 'expense', amount: 1, accountId: 'jt', category: 'dining', updatedAt: 9e15 });
  const r = IO.readBackup(JSON.stringify(evil));
  assert.ok(r.tx.find(x => x.id === 't9').updatedAt <= Date.now());   // no edits from the future
  const m = IO.mergeJoint({ accounts: ACCOUNTS, tx: TX, kv: KV }, r);
  assert.ok(!m.accounts.some(a => a.id === 'mine'));
  assert.ok(!m.tx.some(x => x.id === 't1' || x.accountId === 'mine'));
  assert.ok(m.tx.some(x => x.id === 't9'));
});

test('backup keeps account scope, who added a row and joint budgets; old backups still restore and merge', () => {
  const r = IO.readBackup(IO.makeBackup({ accounts: ACCOUNTS, tx: TX, recurring: [], kv: KV }));
  assert.equal(r.accounts.find(a => a.id === 'jt').scope, 'joint');
  assert.equal(r.accounts.find(a => a.id === 'mine').scope, undefined);
  assert.equal(r.tx.find(x => x.id === 't2').by, 'Aisyah');
  assert.deepEqual(r.kv.budgets.joint, { total: 150000, byCat: { dining: 10000 }, updatedAt: 10 });
  assert.equal(r.joint, undefined);   // a backup, not a share file
  const old = IO.readBackup(JSON.stringify({ app: 'tally', v: 1, accounts: [ACCOUNTS[0]], tx: [TX[0]], kv: { budgets: { total: 5, byCat: {} } } }));
  assert.equal(old.kv.budgets.joint, undefined);
  const merged = IO.mergeBackup({ accounts: [], tx: [], recurring: [], kv: { budgets: { total: 5, byCat: {} } } }, r);
  assert.equal(merged.kv.budgets.total, 5);   // local budgets win
  assert.equal(merged.kv.budgets.joint.total, 150000);   // and joint ones come along
});
