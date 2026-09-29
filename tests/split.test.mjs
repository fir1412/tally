// Splitting a bill: each person's share, tax and rounding spread first, always adding up to what was paid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { splitBill } from '../js/views/splitbill.js';

test('a split adds up to the bill: own items, shared items, and the SST spread over them', () => {
  const items = [{ name: 'Nasi lemak', cents: 1200 }, { name: 'Teh tarik', cents: 350 }, { name: 'Roti', cents: 300 }];
  const owe = splitBill(items, 1961, [['Ali'], ['Siti'], []], ['me', 'Ali', 'Siti']);   // 6% SST on 18.50 = 1.11
  assert.equal(Object.values(owe).reduce((a, b) => a + b, 0), 1961);
  assert.ok(owe.Ali > owe.Siti && owe.Siti > owe.me && owe.me > 0);
  assert.deepEqual(splitBill([{ name: 'Pizza', cents: 1000 }], 1000, [[]], ['a', 'b', 'c']), { a: 334, b: 333, c: 333 });   // the odd sen goes somewhere, never lost
});
