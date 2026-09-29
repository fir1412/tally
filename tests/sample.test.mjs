// Sample data has to look real: nothing below zero, receipts that add up, nothing dated after today, all marked sample.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleData } from '../js/sample.js';
import { balances } from '../js/engine.js';

test('sample data is believable and clearly marked, whatever the date', () => {
  for (const day of ['2026-01-01', '2026-03-01', '2026-09-29', '2028-02-29']) {
    const { accounts, tx } = sampleData(day, Date.parse(`${day}T12:00:00Z`));
    const ids = new Set(accounts.map(a => a.id));
    assert.ok(tx.length > 50 && [...accounts, ...tx].every(x => x.sample));
    assert.ok(tx.every(x => ids.has(x.accountId) && (!x.toAccountId || ids.has(x.toAccountId)) && x.date <= day && x.amount > 0));
    assert.ok(tx.filter(x => x.items).every(x => x.items.reduce((s, i) => s + i.cents, 0) === x.amount));
    assert.ok(Object.values(balances(accounts, tx).by).every(v => v >= 0), day);
  }
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
