// Insights analytics: tax relief estimate, basket index, month-end forecast, fixed vs flexible, when/where, food, couples.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

let n = 0;
const ex = (date, amount, more = {}) => ({ id: `t${++n}`, type: 'expense', date, amount, accountId: 'a', category: 'other', ...more });

test('tax relief: receipt words and shops map to reliefs, capped per year, with proof', () => {
  const txs = [
    ex('2026-02-01', 129900, { merchant: 'Senheng', receiptId: 'p1', items: [{ name: 'Phone Redmi Note 14', cents: 129900, category: 'electronics' }] }),
    ex('2026-03-01', 3990, { merchant: 'Senheng', items: [{ name: 'Phone case', cents: 3990, category: 'electronics' }] }),   // a case isn't a phone
    ex('2026-04-01', 150000, { merchant: 'MPH Books', items: [{ name: 'Laptop Asus', cents: 150000, category: 'electronics' }] }),   // lifestyle goes over RM 2,500
    ex('2026-05-02', 18000, { merchant: 'Klinik Pergigian Senyum', category: 'health' }),   // a dental clinic, no items: its name decides
    ex('2026-05-03', 4500, { merchant: 'Klinik Dr Tan', category: 'health' }),   // a GP visit is not medical relief
    ex('2026-06-01', 45000, { merchant: 'Tadika Seri Bestari', category: 'kids', receiptId: 'p2' }),
    ex('2026-06-02', 12000, { merchant: 'Anytime Fitness', category: 'fun' }),
    ex('2026-06-03', 5600, { merchant: 'Gentari', note: 'EV charging', category: 'transport' }),
    ex('2026-06-04', 39900, { merchant: 'Mothercare', items: [{ name: 'Breast pump Medela', cents: 39900, category: 'kids' }] }),
    ex('2025-12-30', 99900, { merchant: 'Senheng', items: [{ name: 'iPhone', cents: 99900, category: 'electronics' }] }),   // another year
  ];
  const r = Object.fromEntries(E.taxRelief(txs, 2026).map(l => [l.id, l]));
  assert.equal(r.lifestyle.total, 279900);
  assert.equal(r.lifestyle.claim, E.RELIEF_CAPS.lifestyle);   // capped
  assert.equal(r.lifestyle.entries.length, 2);
  assert.equal(r.lifestyle.proof, 1);
  assert.equal(r.medical.total, 18000);
  assert.equal(r.childcare.total, 45000); assert.equal(r.childcare.proof, 1);
  assert.equal(r.sports.total, 12000);
  assert.equal(r.ev.total, 5600);
  assert.equal(r.breastfeeding.total, 39900);   // not "kids", not lifestyle
  assert.equal(r.education.total, 0);
  // Items on one receipt split: only the book counts, with its share of the SST.
  const mixed = E.taxRelief([ex('2026-07-01', 5300, { merchant: 'Popular', items: [{ name: 'Book Atomic Habits', cents: 4000, category: 'education' }, { name: 'Pen', cents: 1000, category: 'education' }] })], 2026);
  assert.equal(mixed.find(l => l.id === 'lifestyle').total, 4240);
  for (const k of E.RELIEFS.map(x => x.id)) assert.ok(E.RELIEF_CAPS[k] > 0, `cap for ${k}`);
});

test('basket index: latest price vs about 6 months ago, weighted by how often bought', () => {
  const buy = (date, name, cents) => ex(date, cents, { items: [{ name, cents, category: 'groceries' }] });
  const txs = [
    buy('2026-03-01', 'Milo 1kg', 2000), buy('2026-04-01', 'Milo 1kg', 2100), buy('2026-09-01', 'Milo 1kg', 2200),   // +10%
    buy('2026-03-05', 'Beras 5kg', 3000), buy('2026-06-01', 'Beras 5kg', 3000), buy('2026-09-10', 'Beras 5kg', 3000), buy('2026-09-20', 'Beras 5kg', 3000),
    buy('2026-09-01', 'Roti', 400), buy('2026-09-02', 'Roti', 420), buy('2026-09-03', 'Roti', 440),   // too new to have a base
  ];
  const hist = E.priceHistory(txs);
  assert.deepEqual(hist.map(h => h.key), ['BERAS 5KG', 'ROTI', 'MILO 1KG']);   // most bought, then most recent
  const b = E.basketIndex(hist, '2026-09-29');
  assert.equal(b.n, 2);
  // then: 3×2000 + 4×3000 = 18000; now: 3×2200 + 4×3000 = 18600
  assert.equal(Math.round(b.pct * 1000), 33);
  assert.equal(b.since, '2026-03-01');
  assert.equal(E.basketIndex([], '2026-09-29'), null);
  assert.equal(E.priceHistory([buy('2026-09-01', 'Milo', 100), buy('2026-09-02', 'Milo', 100)]).length, 0);   // twice isn't a habit
});

test('forecast: spent + bills still due + everyday pace; one-offs count once; safe per day', () => {
  const txs = [ex('2026-09-01', 150000, { source: 'recurring' })];   // rent, a bill
  for (let d = 1; d <= 10; d++) txs.push(ex(`2026-09-${String(d).padStart(2, '0')}`, 3000));   // RM 30 a day
  txs.push(ex('2026-09-05', 120000));   // a one-off fridge
  const bills = [{ id: 'b1', name: 'Unifi', amount: 12900, day: 20, start: '2026-01-20' }];
  const f = E.forecast({ txs, today: '2026-09-10', budget: 400000, bills });
  assert.equal(f.spent, 150000 + 30000 + 120000);
  assert.equal(f.upcoming, 12900);
  assert.equal(f.rate, 3000);
  assert.equal(f.daysLeft, 20);
  assert.equal(f.projected, 300000 + 12900 + 20 * 3000);
  assert.equal(f.safe, Math.floor((400000 - 300000 - 12900) / 21));
  // A bill already paid this month isn't counted again; no budget, no safe figure.
  const paid = E.forecast({ txs: [...txs, ex('2026-09-08', 12900, { merchant: 'Unifi' })], today: '2026-09-10', bills });
  assert.equal(paid.upcoming, 0); assert.equal(paid.safe, null);
  // Payday months: 25 Sep – 24 Oct; three days in, last cycle's pace is used.
  const pd = E.forecast({ txs: [ex('2026-08-30', 31000), ex('2026-09-26', 5000)], today: '2026-09-27', startDay: 25 });
  assert.equal(pd.end, '2026-10-24'); assert.ok(pd.early); assert.equal(pd.rate, 1000);
});

test('fixed vs flexible and bills per month', () => {
  const txs = [ex('2026-09-01', 150000, { source: 'recurring' }), ex('2026-09-03', 5490, { merchant: 'Netflix' }), ex('2026-09-04', 2000, { merchant: 'Mamak' }), ex('2026-08-04', 999)];
  assert.deepEqual(E.fixedFlexible(txs, '2026-09', 1, [E.billKey('Netflix')]), { fixed: 155490, flexible: 2000 });
  assert.equal(E.perMonth({ amount: 1000, freq: 'weekly' }), 4333);
  assert.equal(E.perMonth({ amount: 12000, freq: 'yearly' }), 1000);
  assert.equal(E.perMonth({ amount: 5490 }), 5490);
});

test('heat map levels, weekday × time buckets, top shops', () => {
  const days = E.dailySpend([ex('2026-09-02', 100), ex('2026-09-03', 200), ex('2026-09-04', 300), ex('2026-09-05', 900000)], '2026-09');
  assert.equal(days.length, 30);
  assert.deepEqual(days.slice(0, 5).map(d => d.level), [0, 1, 2, 3, 4]);   // by rank: rent can't wash out the rest
  assert.equal(E.dailySpend([ex('2026-09-02', 100)], '2026-09')[1].level, 4);
  assert.equal(E.dailySpend([], '2026-09', 25)[0].date, '2026-09-25');
  assert.deepEqual([300, 659, 660, 1019, 1020, 1319, 1320, 0, 299].map(E.slotOf), [0, 0, 1, 1, 2, 2, 3, 3, 3]);
  // Friday 2026-09-25 23:30 and Saturday 01:10 (still Friday night), both food delivery.
  const w = E.whenGrid([ex('2026-09-25', 3500, { time: '23:30', merchant: 'GrabFood', category: 'dining' }), ex('2026-09-26', 2500, { time: '01:10', merchant: 'foodpanda', category: 'dining' }),
    ex('2026-09-21', 1000, { time: '08:00', category: 'dining' }), ex('2026-09-21', 99999, { time: '09:00', source: 'recurring' }), ex('2026-09-22', 500)], '2026-09-01', '2026-09-30');
  assert.equal(w.grid[5][3], 6000);
  assert.equal(w.grid[1][0], 1000);   // the bill and the untimed entry are left out
  assert.deepEqual(w.top, { w: 5, s: 3, v: 6000, category: 'dining' });
  assert.deepEqual(w.late, { v: 6000, n: 2 });
  const s = E.topShops([ex('2026-09-01', 500, { merchant: '99 Speedmart' }), ex('2026-09-02', 700, { merchant: '99 SPEEDMART' }), ex('2026-09-02', 700, { merchant: '99 Speedmart.' }), ex('2026-09-03', 9000, { merchant: 'Aeon' })], '2026-09');
  assert.equal(s.money[0].name, 'Aeon');
  assert.equal(s.visits[0].n, 3);
});

test('payment mix, savings rate, food split, SST paid, joint contributions', () => {
  const accts = [{ id: 'c', kind: 'cash' }, { id: 'e', kind: 'ewallet' }, { id: 'k', kind: 'card' }, { id: 'j', kind: 'bank', scope: 'joint' }];
  const txs = [ex('2026-09-01', 1000, { accountId: 'c' }), ex('2026-09-02', 2000, { accountId: 'e' }), ex('2026-09-03', 3000, { accountId: 'e' }), ex('2026-09-04', 4000, { accountId: 'k' }), ex('2026-09-05', 99, { accountId: 'gone' })];
  assert.deepEqual(E.paymentMix(txs, accts, '2026-09'), { cash: 1000, ewallet: 5000, card: 4000 });
  assert.equal(E.savingsRate(500000, 400000), 0.2);
  assert.equal(E.savingsRate(0, 400000), null);
  assert.ok(E.savingsRate(100000, 150000) < 0);
  const food = E.foodSplit([ex('2026-09-01', 5000, { category: 'groceries' }), ex('2026-09-02', 2000, { category: 'dining' }), ex('2026-09-03', 3000, { merchant: 'ShopeeFood', category: 'dining' }),
    ex('2026-09-04', 1000, { merchant: 'GrabFood', items: [{ name: 'Nasi', cents: 600, category: 'dining' }, { name: 'Telur', cents: 400, category: 'groceries' }] })], '2026-09');
  assert.deepEqual(food, { groceries: 5400, dining: 2000, delivery: 3600 });
  assert.deepEqual(E.taxPaid([ex('2026-02-01', 1000, { tax: 60, service: 100 }), ex('2026-03-01', 1000, { tax: 80 }), ex('2025-03-01', 1000, { tax: 80 }), ex('2026-03-02', 1000)], 2026), { sst: 140, service: 100, n: 2 });
  const joint = new Set(['j']);
  const jt = [{ id: 'x1', type: 'transfer', date: '2026-09-01', amount: 100000, accountId: 'mine', toAccountId: 'j' },
    { id: 'x2', type: 'transfer', date: '2026-09-02', amount: 150000, accountId: 'hers', toAccountId: 'j', spouse: true, by: 'Aina' },
    { id: 'x3', type: 'income', date: '2026-09-03', amount: 5000, accountId: 'j', spouse: true, by: 'Aina' },
    { id: 'x4', type: 'expense', date: '2026-09-04', amount: 9000, accountId: 'j' },
    { id: 'x5', type: 'transfer', date: '2026-08-30', amount: 100000, accountId: 'mine', toAccountId: 'j' }];
  assert.deepEqual(E.jointIn(jt, joint, '2026-09'), [{ me: false, name: 'Aina', v: 155000 }, { me: true, name: '', v: 100000 }]);
});

test('breakdown still sums exactly after moving onto itemAmounts', () => {
  const tx = { type: 'expense', amount: 1001, items: [{ name: 'A', cents: 333, category: 'x' }, { name: 'B', cents: 333, category: 'y' }, { name: 'C', cents: 334, category: 'x' }] };
  assert.equal(E.itemAmounts(tx).reduce((s, i) => s + i.cents, 0), 1001);
  assert.equal(E.breakdown(tx).reduce((s, i) => s + i.cents, 0), 1001);
});
