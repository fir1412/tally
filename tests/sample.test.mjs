// Sample data has to look real: nothing below zero, receipts that add up, nothing dated after today, all marked sample.
// Every feature has something to show, and "Start for real" takes all of it away, never anything of the user's.
import test from 'node:test';
import assert from 'node:assert/strict';

console.warn = () => {};   // db.js logs each failed save
const disk = new Map();
globalThis.localStorage = { getItem: k => disk.get(k) ?? null, setItem: (k, v) => disk.set(k, String(v)) };
const { S, load, saveAccount, saveTx, setKv, replaceAll, settings } = await import('../js/state.js');
const { sampleData, startSample, endSample, sampleRows } = await import('../js/sample.js');
const { splitBill, ME } = await import('../js/views/splitbill.js');
const { balances, openShares, goalProgress, taxRelief, monthSpend, billStatus, owing } = await import('../js/engine.js');
const { filledDays } = await import('../js/comic.js');

const sum = xs => xs.reduce((s, x) => s + x, 0);

test('sample data is believable and clearly marked, whatever the date', () => {
  for (const day of ['2026-01-01', '2026-03-01', '2026-09-29', '2028-02-29']) {
    const { accounts, tx, recurring, goals } = sampleData(day, Date.parse(`${day}T12:00:00Z`));
    const ids = new Set(accounts.map(a => a.id));
    assert.ok(tx.length > 50 && [...accounts, ...tx, ...recurring, ...goals].every(x => x.sample));
    assert.equal(new Set(tx.map(x => x.id)).size, tx.length, 'no id twice');
    assert.ok(tx.every(x => ids.has(x.accountId) && (!x.toAccountId || ids.has(x.toAccountId)) && x.date <= day && x.amount > 0));
    // A receipt adds up: its items with tax, service and rounding; a split bill's items are my share, extras spread in.
    assert.ok(tx.filter(x => x.items).every(x => sum(x.items.map(i => i.cents)) + (x.split ? 0 : (x.tax || 0) + (x.service || 0) + (x.rounding || 0)) === x.amount), day);
    const by = balances(accounts, tx).by;
    assert.ok(accounts.filter(a => !owing(a)).every(a => by[a.id] >= 0 && by[a.id] < 1500000), day);   // nothing below zero, nothing silly
    assert.ok(by[accounts.find(a => a.kind === 'owedme').id] > 0 && by[accounts.find(a => a.kind === 'iowe').id] < 0);
  }
});

test('the split bills are what "Save my share" makes, to the sen; one friend has paid part back', () => {
  const { tx } = sampleData('2026-10-15', Date.parse('2026-10-15T12:00:00Z'));
  const bills = tx.filter(x => x.split);
  assert.equal(bills.length, 2);
  for (const b of bills) {
    const people = [ME, ...b.split.with], shares = tx.filter(x => x.splitOf === b.id);
    const owe = splitBill(b.split.items, b.split.total, b.split.who.map(w => w.map(p => p || ME)), people);
    assert.equal(b.amount, owe[ME]);
    if (b.owedTo) assert.deepEqual([shares.length, b.owedTo, b.split.acc], [0, 'Hafiz', 's_tng'], 'a friend paid: I owe my share');
    else {
      assert.deepEqual(shares.map(x => [x.owedBy, x.amount]), b.split.with.map(f => [f, owe[f]]));
      assert.equal(b.amount + sum(shares.map(x => x.amount)), b.split.total, 'I paid: my share and theirs are the bill');
    }
  }
  const { owedMe, iOwe } = openShares(tx), dinner = bills.find(b => !b.owedTo), aisyah = tx.find(x => x.splitOf === dinner.id && x.owedBy === 'Aisyah').amount;
  assert.equal(owedMe.find(f => f.name === 'Aisyah').sen, aisyah - 2000, 'RM 20 of hers back');
  assert.equal(owedMe.find(f => f.name === 'Wei Ling').sen, tx.find(x => x.owedBy === 'Wei Ling').amount);
  assert.deepEqual(iOwe.map(f => [f.name, f.sen]), [['Hafiz', bills.find(b => b.owedTo).amount]]);
});

test('every feature has something to show: a goal on its way, a budget, bills, reliefs, nothing-spent days, a sticker book', () => {
  const day = '2026-10-15', d = sampleData(day, Date.parse(`${day}T12:00:00Z`)), by = balances(d.accounts, d.tx).by;
  const p = goalProgress(d.goals[0], by, day);
  assert.ok(p.pct > 0 && p.pct < 1 && p.months > 0, 'partly reached, a date ahead');
  assert.equal(d.accounts.find(a => a.id === d.goals[0].accountId).kind, 'savings');
  assert.ok(d.budgets.total > 0 && d.budgets.byCat.dining && d.budgets.byCat.groceries);
  const spent = monthSpend(d.tx, '2026-10').total;
  assert.ok(spent > 0 && spent < d.budgets.total, 'half way through the month, within the budget');
  assert.ok(d.recurring.every(b => billStatus(b, day, d.tx).next > day && d.tx.filter(x => x.bill === b.id).length === 2), 'two paid, the next one ahead');
  assert.deepEqual(taxRelief(d.tx, 2026).filter(l => l.entries.length).map(l => l.id).sort(), ['lifestyle', 'medical', 'sports']);
  assert.equal(d.noSpend.length, 2);
  assert.ok(d.noSpend.every(n => n < day && !d.tx.some(x => x.type === 'expense' && x.date === n)), 'nothing spent means nothing spent');
  assert.ok(filledDays({ tx: d.tx, noSpend: d.noSpend, ym: '2026-10', today: day }).size >= 10, 'most of October in the sticker book');
  assert.ok(d.tx.some(x => x.items?.some(i => i.cents < 0)) && d.tx.some(x => x.rounding), 'money off and rounding on a receipt');
});

test('sample mode starts only on an empty app, and "Start for real" removes all of it, never anything of the user\'s', async () => {
  // Someone with their own money: nothing changes.
  await load();
  await replaceAll({ accounts: [{ id: 'mine', name: 'CIMB', kind: 'bank', opening: 50000, createdAt: 1 }], tx: [], recurring: [], kv: {} });
  await saveTx({ id: 'kopi', type: 'expense', date: '2026-10-01', amount: 350, accountId: 'mine', category: 'dining', source: 'quick', createdAt: 1 });
  const before = JSON.stringify([S.accounts, S.tx, S.recurring, S.kv]);
  assert.equal(await startSample('2026-10-15', 'Cash'), false);
  assert.equal(JSON.stringify([S.accounts, S.tx, S.recurring, S.kv]), before);

  // An empty app: the sample, then what a visitor might add while looking around.
  await replaceAll({ accounts: [], tx: [], recurring: [], kv: {} });
  await setKv('settings', { lang: 'ms' });
  assert.equal(await startSample('2026-10-15', 'Tunai'), true);
  assert.ok(settings().sample && settings().onboarded && settings().noSpend.length === 2 && settings().friends.length === 3 && settings().lang === 'ms');
  assert.ok(S.recurring.length === 4 && S.kv.goals.length === 1 && S.kv.budgets.total > 0 && S.accounts.some(a => a.kind === 'owedme') && S.accounts.some(a => a.kind === 'iowe'));
  assert.equal(S.accounts.find(a => a.id === 's_cash').name, 'Tunai');
  await saveAccount({ id: 'mine', name: 'CIMB', kind: 'bank', opening: 50000, createdAt: 1 });
  await saveTx({ id: 'kopi', type: 'expense', date: '2026-10-15', amount: 350, accountId: 'mine', category: 'dining', source: 'quick', createdAt: 1 });
  await saveTx({ id: 'teh', type: 'expense', date: '2026-10-15', amount: 250, accountId: 's_cash', category: 'dining', source: 'quick', createdAt: 1 });
  assert.deepEqual(sampleRows().tx.filter(x => !x.sample).map(x => x.id), ['teh'], 'what "Start for real" asks about first');

  await endSample();
  assert.deepEqual(S.accounts.map(a => a.id), ['mine']);
  assert.deepEqual(S.tx.map(x => x.id), ['kopi']);
  assert.deepEqual([S.recurring, S.kv.goals, S.kv.budgets], [[], [], { total: 0, byCat: {} }]);
  assert.ok(!settings().sample && settings().onboarded && !('noSpend' in settings()) && !('friends' in settings()) && settings().lang === 'ms');
  await load();   // and it stays gone after a restart
  assert.deepEqual([S.accounts.length, S.tx.length, S.recurring.length, S.kv.goals.length], [1, 1, 0, 0]);

  // Only the sample, then Start for real: back to an empty app and the welcome screen.
  await replaceAll({ accounts: [], tx: [], recurring: [], kv: {} });
  await startSample('2026-10-15');
  await endSample();
  assert.deepEqual([S.accounts.length, S.tx.length, S.recurring.length, S.kv.goals.length, settings().onboarded], [0, 0, 0, 0, false]);
});

test('can I afford it: over the next 30 days, pay in, bills and usual spending out, and how long to save when short', async () => {
  const { affordCheck } = await import('../js/engine.js');
  const { accounts, tx } = sampleData('2026-09-29', Date.parse('2026-09-29T12:00:00Z'));
  const balance = balances(accounts, tx).total, a = price => affordCheck({ price, balance, txs: tx, today: '2026-09-29' });
  const small = a(10000), big = a(2000000);
  assert.equal(small.verdict, 'yes');
  assert.equal(small.payDate, '2026-09-30');   // salary on 31 Aug comes again on 30 Sep, not a 31 Sep that doesn't exist
  assert.equal(small.left, balance + small.pay - small.upcoming - small.usual - 10000);
  assert.equal(big.verdict, 'no');
  assert.ok(big.months >= 1 && big.net > 0);
  assert.equal(affordCheck({ price: 10000, balance, txs: tx, today: '2026-09-29', budget: 50000 }).verdict, 'tight');   // money there, budget not
});

test('paid on the second-last day: the payday month starts there every month, and the next pay is predicted from month-end', async () => {
  const E = await import('../js/engine.js');
  assert.deepEqual(E.cycleOf('2026-09-29', -2), { key: '2026-09', start: '2026-09-29', end: '2026-10-29' });   // Oct's second-last is the 30th
  assert.deepEqual(E.cycleOf('2027-02-26', -2), { key: '2027-01', start: '2027-01-30', end: '2027-02-26' });  // Feb's is the 27th
  assert.deepEqual(E.cycleOf('2026-10-31', -1), { key: '2026-10', start: '2026-10-31', end: '2026-11-29' });
  assert.equal(E.cycleKey('2026-09-28', -2), '2026-08');
  assert.equal(E.cycleOf('2026-09-29', 25).start, '2026-09-25');   // day numbers unchanged
  const pay = d => ({ id: d, date: d, type: 'income', category: 'salary', amount: 300000, accountId: 'b' });
  const a = (txs, today, startDay = 1) => E.affordCheck({ price: 100, balance: 0, txs, today, startDay });
  assert.equal(a([pay('2027-01-30'), pay('2027-02-27')], '2027-03-28').payDate, '2027-03-30');   // not 27 Mar, which has passed
  assert.equal(a([pay('2026-09-29')], '2026-10-02', -2).payDate, '2026-10-30');                  // one pay, the payday setting says
  assert.equal(a([pay('2026-08-25'), pay('2026-09-25')], '2026-09-29').payDate, '2026-10-25');    // same day number stays
});
