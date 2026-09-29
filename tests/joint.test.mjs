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

test('merge round 4: deletions travel, spouse rows are marked, budgets and bills merge, an empty setup joint account gives way', () => {
  const KVb = { ...KV, budgets: { ...KV.budgets, joint: { total: 150000, byCat: { dining: 10000, c_hobi: 80000 }, updatedAt: 10 } }, jointGone: { tOld: 5 } };
  const bill = { id: 'b1', name: 'Rent', amount: 180000, category: 'c_rumah', accountId: 'jt', day: 1, auto: true, updatedAt: 10 };
  const fromA = IO.readBackup(IO.makeJointShare({ accounts: ACCOUNTS, tx: TX, kv: KVb, recurring: [bill, { ...bill, id: 'b2', accountId: 'mine' }] }, 'Aisyah'));
  // B set up their own empty joint account before importing: it gives way to A's (the smaller id survives on both phones).
  const B0 = { accounts: [{ id: 'jz', name: 'Joint', kind: 'bank', opening: 50000, scope: 'joint', createdAt: 1 }], tx: [], recurring: [], kv: { settings: { myName: 'Hafiz' }, customCats: [], budgets: { total: 0, byCat: {}, joint: { total: 0, byCat: { groceries: 90000 }, updatedAt: 20 } } } };
  const m = IO.mergeJoint(B0, fromA);
  assert.deepEqual(m.empty.map(a => a.id), ['jz']);
  assert.ok(m.tx.every(x => x.spouse), "rows from the file are the spouse's");
  assert.deepEqual(m.recurring.map(r => r.id), ['b1']);   // the joint bill only
  assert.deepEqual(m.customCats.map(c => c.id).sort(), ['c_hobi', 'c_rumah']);   // c_hobi rides with the budget
  assert.deepEqual(m.budgetsJoint.byCat, { dining: 10000, c_hobi: 80000, groceries: 90000 });   // both phones' categories kept
  assert.equal(m.gone.tOld, 5);
  // B deletes the rent (after its last edit): A's copy is dropped on the next file, and doesn't come back to B.
  const B = { accounts: m.accounts, tx: m.tx.filter(x => x.id !== 't2'), recurring: m.recurring, kv: { settings: { myName: 'Hafiz' }, customCats: m.customCats, budgets: { total: 0, byCat: {}, joint: m.budgetsJoint }, jointGone: { ...m.gone, t2: 40 } } };
  const back = IO.readBackup(IO.makeJointShare(B, 'Hafiz'));
  assert.ok(!JSON.stringify(back.tx).includes('spouse'), 'the local mark never travels');
  const intoA = IO.mergeJoint({ accounts: ACCOUNTS, tx: TX, kv: KVb, recurring: [bill] }, back);
  assert.deepEqual(intoA.drop, ['t2']);
  assert.ok(!IO.mergeJoint(B, IO.readBackup(IO.makeJointShare({ accounts: ACCOUNTS, tx: TX, kv: KVb }, 'Aisyah'))).tx.some(x => x.id === 't2'), 'an older copy does not resurrect it');
  // An edit made after the delete wins over the marker.
  const edited = TX.map(x => (x.id === 't2' ? { ...x, updatedAt: 50 } : x));
  assert.deepEqual(IO.mergeJoint({ accounts: ACCOUNTS, tx: edited, kv: KVb }, back).drop, []);
});

test('merge: each phone made its own joint account and used it before the first swap: one account after, nothing lost', () => {
  const his = IO.readBackup(IO.makeJointShare({ accounts: ACCOUNTS, tx: TX, kv: KV, recurring: [] }, 'Hafiz'));
  const hers = { accounts: [{ id: 'mine2', name: 'Her bank', kind: 'bank', opening: 0, createdAt: 1 }, { id: 'jt2', name: 'joint cimb', kind: 'bank', opening: 50000, scope: 'joint', createdAt: 1, updatedAt: 5 }],
    tx: [{ id: 'p1', date: '2026-01-08', type: 'expense', amount: 8500, accountId: 'jt2', category: 'groceries', merchant: 'Pasar tani', createdAt: 5, updatedAt: 5 },
      { id: 'p2', date: '2026-01-08', type: 'transfer', amount: 1000, accountId: 'mine2', toAccountId: 'jt2', category: 'other', createdAt: 5, updatedAt: 5 }],
    kv: { settings: {}, budgets: { total: 0, byCat: {} }, customCats: [] }, recurring: [{ id: 'b1', name: 'Water', amount: 3000, day: 5, accountId: 'jt2', updatedAt: 5 }] };
  const m = IO.mergeJoint(hers, his);
  assert.deepEqual(m.empty.map(a => [a.id, a.moved]), [['jt2', 2]]);   // hers goes; theirs stays
  assert.deepEqual(m.tx.filter(x => x.id.startsWith('p')).map(x => [x.id, x.accountId, x.toAccountId]), [['p1', 'jt', undefined], ['p2', 'mine2', 'jt']]);
  assert.equal(m.recurring.find(r => r.id === 'b1').accountId, 'jt');
  assert.ok(m.tx.some(x => x.id === 't2'));   // his rent arrives too
});

test('merge: both import each other\'s first file at once (crossed): both phones keep the same one account, nothing lost or revived', () => {
  const phone = (id, name, rows) => ({ accounts: [{ id: `p${id}`, name: 'Mine', kind: 'bank', createdAt: 1 }, { id: `j${id}`, name, kind: 'bank', opening: 300000, scope: 'joint', createdAt: 1, updatedAt: 1 }],
    tx: rows.map(([tid, amt, at]) => ({ id: tid, date: '2026-09-02', type: 'expense', amount: amt, accountId: `j${id}`, category: 'groceries', createdAt: at, updatedAt: at })), recurring: [], kv: { settings: {}, customCats: [], budgets: { total: 0, byCat: {} } } });
  const H = phone('h', 'Joint account', [['h1', 1000, 5]]), A = phone('a', '共同账户', [['a1', 2000, 6]]);
  const fileOf = s => IO.readBackup(IO.makeJointShare(s, 'x'));
  const apply = (s, m) => { const del = new Set(m.empty.map(a => a.id)), drop = new Set(m.drop);
    const tx = new Map(s.tx.filter(t => !drop.has(t.id)).map(t => [t.id, t])); for (const t of m.tx) tx.set(t.id, t);
    return { ...s, accounts: [...s.accounts.filter(a => !del.has(a.id) && !m.accounts.some(x => x.id === a.id)), ...m.accounts], tx: [...tx.values()] }; };
  const fh = fileOf(H), fa = fileOf(A);
  const H1 = apply(H, IO.mergeJoint(H, fa)), A1 = apply(A, IO.mergeJoint(A, fh));   // crossed
  const joint = s => s.accounts.filter(a => a.scope === 'joint').map(a => a.id);
  assert.deepEqual([joint(H1), joint(A1)], [['ja'], ['ja']]);   // 'ja' < 'jh': the same survivor on both phones
  const rows = s => s.tx.filter(t => t.accountId === 'ja').map(t => t.id).sort();
  assert.deepEqual([rows(H1), rows(A1)], [['a1', 'h1'], ['a1', 'h1']]);
  assert.equal(H1.tx.find(t => t.id === 'h1').updatedAt, 5);   // moved, not re-stamped: a newer edit elsewhere still wins
});

test('business accounts: Me is personal only, Business its own view with its own budget, paying yourself shows in both, All adds up', () => {
  Object.assign(S, { accounts: [{ id: 'p', name: 'Maybank', kind: 'bank', opening: 0 }, { id: 'b', name: 'Stall cash', kind: 'cash', opening: 0, scope: 'business' }],
    tx: [{ id: 's', type: 'income', date: '2026-09-01', amount: 50000, accountId: 'b', category: 'income' }, { id: 'e', type: 'expense', date: '2026-09-01', amount: 12000, accountId: 'b', category: 'groceries' },
      { id: 'm', type: 'expense', date: '2026-09-02', amount: 900, accountId: 'p', category: 'dining' }, { id: 'pay', type: 'transfer', date: '2026-09-03', amount: 20000, accountId: 'b', toAccountId: 'p', category: 'other' }],
    kv: { settings: { scope: 'business' }, budgets: { total: 100000, byCat: {}, business: { total: 30000, byCat: {} } } } });
  assert.equal(scope(), 'business');
  assert.deepEqual(scopedTx().map(x => x.id), ['s', 'e', 'pay']);
  assert.equal(balances(scopedAccounts(), booked()).total, 50000 - 12000 - 20000);   // the stall's cash after paying yourself
  assert.equal(budgetsFor().total, 30000);
  S.kv.settings.scope = 'me';
  assert.deepEqual(scopedTx().map(x => x.id), ['m', 'pay']);
  S.kv.settings.scope = 'all';
  assert.equal(budgetsFor().total, 130000);
});

test('spending in SGD keeps the rate of its day: a new rate does not re-value last month', async () => {
  const st = await import('../js/state.js'), { monthSpend } = await import('../js/engine.js');
  Object.assign(S, { accounts: [{ id: 'd', name: 'DBS', kind: 'bank', opening: 0, currency: 'SGD', rate: 3.3 }], tx: [], kv: { settings: {}, budgets: { total: 0, byCat: {} }, customCats: [], rules: {} } });
  S.tx = [{ id: 'a', type: 'expense', date: '2026-08-10', amount: 1000, accountId: 'd', category: 'dining', rate: 3.3 }];   // saved in August at 3.3
  S.accounts[0].rate = 3.5;   // September: a transfer home set a new rate
  S.tx = [...S.tx, { id: 'b', type: 'expense', date: '2026-09-02', amount: 1000, accountId: 'd', category: 'dining' }];
  const rm = st.rmTx();
  assert.deepEqual([monthSpend(rm, '2026-08').total, monthSpend(rm, '2026-09').total], [3300, 3500]);
});

test('a receipt goes where it was paid, whatever view is showing; typed entries follow the view', async () => {
  const st = await import('../js/state.js');
  Object.assign(S, { accounts: [{ id: 'cash', name: 'Cash', kind: 'cash', opening: 5000 }, { id: 'visa', name: 'Visa', kind: 'card', opening: 0 }, { id: 'gp', name: 'GrabPay Driver', kind: 'ewallet', opening: 20000, scope: 'business' }],
    tx: [], kv: { settings: { scope: 'business' }, budgets: { total: 0, byCat: {} }, customCats: [], rules: {} } });
  assert.equal(st.defaultAccount('receipt', { pay: 'card', amount: 3000 }), 'visa');
  assert.equal(st.defaultAccount('quick', { amount: 500 }), 'gp');
});

test('a crafted partner file cannot delete a personal row, overwrite a personal bill, or merge into another currency', () => {
  const local = { accounts: ACCOUNTS, tx: TX, kv: KV, recurring: [{ id: 'b1', name: 'Gym', amount: 15000, accountId: 'mine', freq: 'monthly', day: 1, updatedAt: 10 }] };
  const file = over => ({ accounts: [ACCOUNTS[1]], tx: [], recurring: [], gone: {}, kv: {}, ...over });
  // t3 is my personal → joint transfer: a delete marker for it from the partner leaves it here
  assert.deepEqual(IO.mergeJoint(local, file({ gone: { t3: Date.now(), t2: Date.now() } })).drop, ['t2']);
  // a "bill" with my personal bill's id, pointed at the joint account, is refused
  assert.deepEqual(IO.mergeJoint(local, file({ recurring: [{ id: 'b1', name: 'Gym', amount: 1, accountId: 'jt', freq: 'monthly', day: 1, updatedAt: 99 }] })).recurring, []);
  // a joint account in SGD with the only-one-each-side shape is not merged into my ringgit joint account
  const mine = { accounts: [ACCOUNTS[0], { id: 'zz', name: 'Joint', kind: 'bank', scope: 'joint', opening: 0, createdAt: 3 }], tx: [], kv: KV };
  const sgd = { accounts: [{ id: 'aa', name: 'Joint', kind: 'bank', scope: 'joint', opening: 0, currency: 'SGD', rate: 9.99, createdAt: 1 }], tx: [], recurring: [], gone: {}, kv: {} };
  assert.deepEqual(IO.mergeJoint(mine, sgd).empty, []);
  // same currency: merged, and my rate is kept
  const myr = { accounts: [{ ...sgd.accounts[0], currency: 'MYR', rate: 9.99 }], tx: [], recurring: [], gone: {}, kv: {} };
  const m = IO.mergeJoint({ ...mine, accounts: [ACCOUNTS[0], { ...mine.accounts[1], rate: undefined }] }, myr);
  assert.equal(m.empty.length, 1); assert.equal(m.accounts.find(a => a.id === 'aa').rate, undefined);
});
