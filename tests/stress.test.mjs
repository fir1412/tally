// Breaks found by the stress test of 2026-09-30, one check each (browser-only ones: .personas/break-a, break-b).
// Synthetic data.
process.env.TZ = 'Asia/Kuala_Lumpur';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as IO from '../js/io.js';
import * as E from '../js/engine.js';
import { billEvent } from '../js/calendar.js';

const map = { date: 0, merchant: 1, amount: 2, account: 3 };

test('import ids: two different rows never share one (32-bit hashes collided: "Q463866" and "Q1052890")', () => {
  const txs = IO.importIds(['Q463866', 'Q1052890'].map(m => ({ date: '2026-09-01', type: 'expense', amount: 1000, merchant: m, accountId: 'a' })), 'i');
  assert.equal(new Set(txs.map(x => x.id)).size, 2);
  const same = IO.importIds([1, 2].map(() => ({ date: '2026-09-01', type: 'expense', amount: 500, merchant: 'Kopi', accountId: 'a' })), 'i');
  assert.deepEqual(same.map(x => x.id.slice(-2)), ['_1', '_2']);   // two identical purchases both stay
});

test('an "Opening balance" row is money held (+500), not spending', () => {
  const r = IO.rowsToTx([['2026-09-01', 'Opening balance', '500.00', ''], ['2026-09-02', 'Nasi lemak', '5.00', ''], ['2026-09-03', 'Petrol', '50.00', '']], { date: 0, merchant: 1, amount: 2 }, { accountId: 'a' });
  assert.equal(r.opening[''], 50000);
  assert.equal(r.txs.length, 2);
});

test('names from a file like "constructor" and "__proto__" are just names', () => {
  const rows = [['2026-09-01', 'Nasi lemak', '5.00', '__proto__'], ['2026-09-02', 'Petrol', '50.00', 'constructor'], ['2026-09-03', 'Opening balance', '100.00', '__proto__']];
  const r = IO.rowsToTx(rows, map, { accountId: 'x', accounts: Object.assign(Object.create(null), { ['__proto__']: 'p', constructor: 'c' }) });
  assert.deepEqual(r.txs.map(x => x.accountId).sort(), ['c', 'p']);
  assert.equal(r.opening.__proto__, 10000);
  assert.equal(IO.ownKey({}, 'constructor'), undefined);
});

test('rows for an account past the planned ones are left out, never merged into another account', () => {
  const r = IO.rowsToTx([['2026-09-01', 'A', '5.00', 'Pocket A'], ['2026-09-01', 'U', '5.00', 'Pocket U']], map, { accountId: 'file', accounts: { 'pocket a': 'pa' } });
  assert.deepEqual(r.txs.map(x => x.accountId), ['pa']);
  assert.deepEqual(r.skipped.map(x => x.why), ['account']);
});

test('two bills with the same name: each is added (one bill\'s own row doesn\'t pay the other)', () => {
  const bill = (id, day, amount) => ({ id, name: 'Insurance', amount, day, start: `2026-09-${String(day).padStart(2, '0')}`, freq: 'monthly', auto: true, accountId: 'a', category: 'bills' });
  const got = E.dueBillTxs([bill('b1', 5, 12000), bill('b2', 20, 35000)], '2026-09-25', []);
  assert.deepEqual(got.map(x => [x.date, x.amount]).sort(), [['2026-09-05', 12000], ['2026-09-20', 35000]]);
});

test('a bill on the 31st: its calendar reminder follows the month end, not the 28th', () => {
  assert.match(billEvent({ id: 'r', day: 31, title: 'Rent' }, new Date(2026, 1, 3)).rrule, /BYMONTHDAY=-1$/);
  assert.equal(billEvent({ id: 'r', day: 31, title: 'Rent' }, new Date(2026, 1, 3)).start, '20260228T090000');
  assert.match(billEvent({ id: 'r', day: 30, title: 'Rent' }, new Date(2026, 1, 3)).rrule, /BYMONTHDAY=28,29,30;BYSETPOS=-1$/);
  assert.match(billEvent({ id: 'r', day: 15, title: 'Rent' }, new Date(2026, 1, 3)).rrule, /BYMONTHDAY=15$/);
});

test('a backup bill with day 2.5 comes back as a whole day', () => {
  const back = IO.readBackup(IO.makeBackup({ accounts: [{ id: 'a', name: 'Cash', kind: 'cash', opening: 0, createdAt: 1 }], tx: [], kv: {},
    recurring: [{ id: 'r1', name: 'Gym', amount: 5000, day: 2.5, start: '2026-07-02', freq: 'monthly', accountId: 'a', category: 'bills' }] }));
  assert.equal(back.recurring[0].day, 2);
});
