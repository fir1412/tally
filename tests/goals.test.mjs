// Savings goals: progress is the linked account's balance; with a date, what a month gets there (rounded up).
import test from 'node:test';
import assert from 'node:assert/strict';

const disk = new Map();
globalThis.localStorage = { getItem: k => disk.get(k) ?? null, setItem: (k, v) => disk.set(k, String(v)) };
const { load, setKv, setSetting, saveAccount, saveTx } = await import('../js/state.js');
const { goalProgress } = await import('../js/engine.js');
const { readBackup, makeBackup, mergeBackup } = await import('../js/io.js');
const { goalsCard } = await import('../js/views/goals.js');

const G = { id: 'g1', name: 'Hari Raya', target: 100000, accountId: 's' };
test('a month\'s saving: what is left over the months to the date, rounded up to the sen', () => {
  assert.deepEqual(goalProgress({ ...G, by: '2027-03-15' }, { s: 40000 }, '2026-10-01'), { have: 40000, left: 60000, pct: 0.4, reached: false, overdue: false, months: 5, perMonth: 12000 });
  assert.equal(goalProgress({ ...G, by: '2027-03-15' }, { s: 39999 }, '2026-10-01').perMonth, 12001, '60001 over 5: rounded up');
  assert.equal(goalProgress({ ...G, by: '2026-10-31' }, { s: 0 }, '2026-10-01').months, 1, 'this month: at least 1');
  assert.equal(goalProgress({ ...G, by: '2027-10-01' }, {}, '2026-10-31').months, 11, '31 Oct to 1 Oct is 11 months, in average months (it was 12: calendar months over-counted)');
  assert.equal(goalProgress({ ...G, by: '2026-12-31' }, { s: 0 }, '2026-10-01').months, 3, '1 Oct to 31 Dec is 3 months, so RM 1,000 a month for RM 3,000, not RM 1,500 (maths audit F12)');
  assert.equal(goalProgress({ ...G, by: '2027-01-01', accountId: undefined }, { s: 99999 }, '2026-10-01').have, 0, 'no account: nothing saved yet');
  assert.equal(goalProgress(G, { s: -5000 }, '2026-10-01').pct, 0, 'below zero is an empty bar');
});
test('reached, and past its date', () => {
  const r = goalProgress({ ...G, by: '2026-09-01' }, { s: 120000 }, '2026-10-01');
  assert.deepEqual([r.reached, r.overdue, r.pct, r.left, r.perMonth], [true, false, 1, 0, null]);
  const o = goalProgress({ ...G, by: '2026-09-30' }, { s: 30000 }, '2026-10-01');
  assert.deepEqual([o.reached, o.overdue, o.left, o.months], [false, true, 70000, null]);
  assert.ok(!goalProgress({ ...G, by: '2026-10-01' }, { s: 0 }, '2026-10-01').overdue, 'due today is not past it');
});
test('backups keep goals; restore checks them (20 at most, ids, amounts, names, links)', () => {
  const accounts = [{ id: 's', name: 'ASB', kind: 'savings', opening: 0 }], goals = [{ ...G, by: '2027-03-15', createdAt: Date.UTC(2026, 8, 1) }, { id: 'g2', name: 'Phone', target: 300000, createdAt: 0 }];
  assert.deepEqual(readBackup(makeBackup({ accounts, tx: [], recurring: [], kv: { goals } })).kv.goals, goals);
  const evil = [...goals, { id: '__proto__', name: 'x', target: 1 }, { id: 'a b', name: 'x', target: 1 }, { id: 'g3', name: 'x', target: 0 }, { id: 'g4', name: 'x', target: -5 },
    { id: 'g5', name: `  Umrah\u0000 for Mak and Abah in 2028 with the kids `, target: 900000, by: '2028-13-40', accountId: 'nowhere', constructor: 'x', evil: 1 }, ...Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, name: 'n', target: 100 }))];
  const r = readBackup(makeBackup({ accounts, tx: [], recurring: [], kv: { goals: evil } })).kv.goals;
  assert.ok(r.length <= 20);
  assert.deepEqual(r.slice(0, 3).map(g => g.id), ['g1', 'g2', 'g5']);
  assert.deepEqual(r[2], { id: 'g5', name: 'Umrah for Mak and Abah in 2028', target: 900000, createdAt: 0 });
  const m = mergeBackup({ accounts, tx: [], recurring: [], kv: { goals: [goals[0]] } }, { accounts, tx: [], recurring: [], kv: { goals: [{ ...goals[0], name: 'theirs' }, goals[1]] } });
  assert.deepEqual(m.kv.goals.map(g => g.name), ['Hari Raya', 'Phone'], 'a merge keeps this phone\'s goal and adds the new one');
});
test('Home: the goals card, hidden with the module off; the bar stays when the balance is hidden', async () => {
  await load();
  await saveAccount({ id: 's', name: 'ASB', kind: 'savings', opening: 25000, createdAt: 1 });
  assert.equal(goalsCard(), '', 'no goals: no card');
  await setKv('goals', [{ ...G, by: '2099-01-01' }]);
  assert.match(goalsCard(), /Hari Raya[\s\S]*width:25%/);
  await saveTx({ id: 't', type: 'transfer', date: '2020-01-01', amount: 25000, accountId: 'b', toAccountId: 's', category: 'other' });
  assert.match(goalsCard(), /width:50%/, 'money moved in: the bar moves');
  await setSetting('hideBal', true);
  assert.ok(goalsCard().includes('RM ••••') && !goalsCard().includes('500.00') && /width:50%/.test(goalsCard()));
  await setSetting('features', { goals: false });
  assert.equal(goalsCard(), '');
});
