// Insights sums: items in a category, the same item at different shops, the next 30 days, the payday week, bill
// changes, debts' age, Malaysia's price change and the year in review. Synthetic data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { CPI } from '../js/cpi.js';

const ex = (id, date, amount, o = {}) => ({ id, type: 'expense', date, amount, category: 'groceries', accountId: 'a', merchant: 'Kedai', ...o });
const inc = (id, date, amount, category = 'salary') => ({ id, type: 'income', date, amount, category, accountId: 'a' });

test('categoryItems: receipt items by name with their share of tax, payments without items by shop', () => {
  const txs = [
    ex('r1', '2026-10-02', 1060, { tax: 60, items: [{ name: 'Milo 1kg', cents: 800, category: 'groceries' }, { name: 'Sabun', cents: 200, category: 'household' }] }),
    ex('r2', '2026-10-05', 800, { items: [{ name: 'MILO 1KG', cents: 800, category: 'groceries' }] }),
    ex('p1', '2026-10-06', 1500, { merchant: 'Pasar Tani' }),
    ex('old', '2026-09-30', 999),
  ];
  const rows = E.categoryItems(txs, 'groceries', '2026-10');
  assert.deepEqual(rows.map(r => [r.name, r.v, r.n, r.shop]), [['Milo 1kg', 1648, 2, false], ['Pasar Tani', 1500, 1, true]]);   // 800 + 48 (its share of 60 SST) + 800
  assert.equal(rows.reduce((s, r) => s + r.v, 0) + E.categoryItems(txs, 'household', '2026-10')[0].v, 1060 + 800 + 1500);
});

test('shopPrices: the latest price of an item at each shop, cheapest first, only when 2+ shops', () => {
  const txs = [
    ex('1', '2026-08-01', 2890, { merchant: 'Mydin', items: [{ name: 'Milo 1kg', cents: 2890 }] }),
    ex('2', '2026-09-20', 2690, { merchant: 'Mydin', items: [{ name: 'MILO 1KG', cents: 2690 }] }),
    ex('3', '2026-09-25', 2850, { merchant: "Lotus's", items: [{ name: 'Milo 1kg', cents: 2850 }, { name: 'Gardenia', cents: 450 }] }),
    ex('4', '2025-01-01', 1000, { merchant: '99 Speedmart', items: [{ name: 'Milo 1kg', cents: 1000 }] }),   // too old
  ];
  const [r, ...more] = E.shopPrices(txs, '2026-10-01');
  assert.equal(more.length, 0);   // Gardenia: one shop
  assert.deepEqual(r.shops.map(s => [s.shop, s.unit]), [['Mydin', 2690], ["Lotus's", 2850]]);
  assert.equal(r.save, 160);
});

test('next30: the day-by-day line ends where "Can I afford it?" does, with the bill and pay on their days', () => {
  const txs = [inc('s', '2026-09-25', 400000), ...Array.from({ length: 10 }, (_, i) => ex(`e${i}`, `2026-10-${String(i + 1).padStart(2, '0')}`, 3000))];
  const bills = [{ id: 'b', name: 'Rumah', amount: 50000, freq: 'monthly', day: 15, start: '2026-01-15' }];
  const o = { balance: 300000, txs, today: '2026-10-10', bills };
  const n = E.next30(o), a = E.affordCheck({ ...o, price: 0 });
  assert.equal(n.days.length, 31);
  assert.equal(n.days.at(-1).bal, a.left);
  assert.equal(n.days.find(d => d.date === '2026-10-15').out, 50000);
  assert.equal(n.days.find(d => d.date === '2026-10-25').in, 400000);
  assert.equal(n.low.date, '2026-10-24');   // the day before pay day
});

test('paydayEffect: the week after payday against the rest of the pay period', () => {
  const txs = [inc('p1', '2026-07-25', 400000), inc('p2', '2026-08-25', 400000), inc('p3', '2026-09-25', 400000)];
  for (const [p, q] of [['2026-07-25', '2026-08-25'], ['2026-08-25', '2026-09-25']]) for (let d = p; d < q; d = E.addDays(d, 1)) txs.push(ex(`x${d}`, d, d <= E.addDays(p, 6) ? 6000 : 2000));
  txs.push(ex('big', '2026-08-26', 90000), ex('bill', '2026-08-27', 9000, { source: 'recurring' }));   // one-off and bill: not everyday
  const r = E.paydayEffect(txs, '2026-10-01');
  assert.equal(Math.round(r.ratio * 10) / 10, 3);
  assert.equal(r.after, 42000); assert.equal(r.usual, 14000);
  assert.equal(E.paydayEffect([inc('p1', '2026-09-25', 1)], '2026-10-01'), null);
});

test('billChanges: a subscription that went up, by its tag or its shop', () => {
  const txs = [ex('n1', '2026-08-03', 5490, { merchant: 'NETFLIX.COM' }), ex('n2', '2026-09-03', 5490, { merchant: 'Netflix.com' }), ex('n3', '2026-10-03', 6290, { merchant: 'NETFLIX.COM' }),
    ex('u1', '2026-09-10', 12900, { bill: 'u' }), ex('u2', '2026-10-10', 12900, { bill: 'u' })];
  assert.deepEqual(E.billChanges(txs, [{ name: 'Netflix', key: '' }, { id: 'u', name: 'Unifi' }]).map(c => [c.name, c.from, c.to]), [['Netflix', 5490, 6290]]);
});

test('openShares: how long a friend has owed, from their oldest share still open', () => {
  const txs = [{ id: 's1', type: 'transfer', date: '2026-09-01', amount: 2000, accountId: 'a', toAccountId: 'o', owedBy: 'Ali' },
    { id: 's2', type: 'transfer', date: '2026-09-20', amount: 3000, accountId: 'a', toAccountId: 'o', owedBy: 'Ali' },
    { id: 'r1', type: 'transfer', date: '2026-09-25', amount: 2000, accountId: 'o', toAccountId: 'a', repaidBy: 'Ali' }];
  assert.deepEqual(E.openShares(txs).owedMe.map(f => [f.name, f.sen, f.since]), [['Ali', 3000, '2026-09-20']]);
});

test('cpiChange: Malaysia between two months, clamped to the months published', () => {
  const c = E.cpiChange({ from: '2026-01', v: [100, 101, 102, 104] }, '2026-02', '2026-04');
  assert.equal(Math.round(c.pct * 10000), 297); assert.equal(c.from, '2026-02'); assert.equal(c.to, '2026-04');
  assert.equal(E.cpiChange({ from: '2026-01', v: [100, 101] }, '2025-06', '2027-01').to, '2026-02');
  const real = E.cpiChange(CPI.food, '2025-08', '2026-08');
  assert.ok(real.pct > 0 && real.pct < 0.1);   // the published food index: a few per cent a year
  assert.equal(CPI.all.v.length, CPI.food.v.length);
});

test('yearReview: a year in a few numbers', () => {
  const txs = [ex('a', '2026-03-01', 1000, { merchant: 'Mydin', items: [{ name: 'Milo 1kg', cents: 1000, category: 'groceries' }] }),
    ex('b', '2026-04-01', 2000, { merchant: 'mydin', tax: 120, items: [{ name: 'MILO 1KG', cents: 1880, category: 'groceries' }] }),
    ex('c', '2026-05-01', 5000, { merchant: 'Kopitiam', category: 'dining' }), inc('s', '2026-05-25', 400000), inc('r', '2026-05-26', 500, 'refund'),
    ex('z', '2025-12-31', 99999)];
  const y = E.yearReview(txs, 2026, ['2026-02-02', '2025-01-01']);
  assert.equal(y.spent, 8000); assert.equal(y.income, 400000);
  assert.deepEqual([y.cat.id, y.shop.name, y.shop.n, y.item.n], ['dining', 'Mydin', 2, 2]);
  assert.equal(y.noSpend, 1); assert.equal(y.logged, 5); assert.equal(y.fees, 120);
});

test('subcategories: suggested and own ones, a category split by them, kept in backups and CSV imports', async () => {
  assert.deepEqual(E.subsOf('dining', { dining: ['Hawker', 'Mamak'] }).slice(-2), ['Fast food', 'Hawker']);   // no duplicates
  const txs = [ex('a', '2026-10-02', 1200, { category: 'dining', sub: 'Mamak' }), ex('b', '2026-10-03', 800, { category: 'dining', sub: 'Mamak' }), ex('c', '2026-10-04', 500, { category: 'dining' })];
  assert.deepEqual(E.subSplit(txs, 'dining', '2026-10'), [{ sub: 'Mamak', v: 2000 }, { sub: '', v: 500 }]);
  const { readBackup, rowsToTx, headerRow, guessMapping } = await import('../js/io.js');
  const back = readBackup(JSON.stringify({ app: 'tally', version: 1, accounts: [{ id: 'a', name: 'Cash', kind: 'cash' }], tx: [{ ...txs[0], createdAt: 1 }], kv: { subcats: { dining: ['Mamak', 'Hawker', 'Hawker'], constructor: ['x'] } } }));
  assert.equal(back.tx[0].sub, 'Mamak');
  assert.deepEqual(back.kv.subcats, { dining: ['Mamak', 'Hawker'] });
  assert.equal(typeof guessMapping, 'function'); assert.equal(typeof headerRow, 'function'); assert.equal(typeof rowsToTx, 'function');
});
