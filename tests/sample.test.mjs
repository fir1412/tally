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
