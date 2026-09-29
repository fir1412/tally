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
