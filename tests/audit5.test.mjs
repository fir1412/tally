// The maths audit (notes/math-audit.md, F1–F14) and the LHDN audit (notes/lhdn-audit.md), 2026-10-01: each case that
// was wrong, as a test, so it stays fixed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

let n = 0;
const ex = (date, amount, o = {}) => ({ id: `e${n++}`, type: 'expense', date, amount, category: 'dining', merchant: 'Kedai', accountId: 'a', ...o });
const inc = (date, amount, category = 'salary') => ({ id: `i${n++}`, type: 'income', date, amount, category, accountId: 'a' });
const daily = (from, days, amount, o) => Array.from({ length: days }, (_, k) => ex(E.addDays(from, k), amount, o));

test('F1: the verdict is on the lowest day before pay, not the 30th day', () => {
  // RM 500, an RM 800 phone, RM 50 a day, RM 4,000 pay in 20 days: short before payday even though pay refills it.
  const a = E.affordCheck({ price: 80000, balance: 50000, txs: [inc('2026-09-20', 400000), ...daily('2026-09-20', 11, 5000)], today: '2026-09-30' });
  assert.equal(a.verdict, 'no');
  assert.ok(a.low.bal < 0 && a.left > 0, 'short on the way, fine at the end');
  assert.equal(a.low.date, '2026-10-19', 'the day before pay');
});

test('F2: a salary not typed yet, or a day late, still comes', () => {
  const base = [inc('2026-08-25', 400000), ...daily('2026-08-25', 30, 4000)];
  for (const d of ['2026-09-24', '2026-09-25', '2026-09-27']) {
    const a = E.affordCheck({ price: 100000, balance: 60000, txs: base.filter(t => t.date <= d), today: d });
    assert.equal(a.pay, 400000, `pay counted on ${d}`);
    if (d > '2026-09-24') assert.notEqual(a.verdict, 'no', d);   // on the 24th RM 1,000 with RM 600 is short until pay comes the next day: right
  }
});

test('F3: the first days of a month with only a posted bill before them: no NaN, no zero pace', () => {
  const posted = E.dueBillTxs([{ id: 'b1', name: 'Rumah', amount: 120000, freq: 'monthly', day: 1, start: '2026-09-01', auto: true }], '2026-10-01', []);
  const a = E.affordCheck({ price: 500000, balance: 100000, txs: [...posted, ...daily('2026-10-01', 3, 3000)], today: '2026-10-03' });
  assert.ok(Number.isFinite(a.usual) && a.usual === 3000 * 30);
  assert.equal(a.verdict, 'no', 'RM 5,000 with RM 1,000 is not affordable');
});

test('F8: one big first day does not say "no" on its own', () => {
  const a = E.affordCheck({ price: 20000, balance: 300000, txs: [ex('2026-10-01', 28000, { category: 'groceries' })], today: '2026-10-01' });
  assert.ok(a.early);
  assert.notEqual(a.verdict, 'no');
});

test('F6: bills over the same 30 days as spending (rent once on its day in a 30-day month)', () => {
  const rent = { id: 'r', name: 'Rumah', amount: 150000, freq: 'monthly', day: 15, start: '2026-01-15' };
  assert.equal(E.affordCheck({ price: 0, balance: 500000, txs: [], today: '2026-09-15', bills: [rent] }).upcoming, 150000);
});

test('F7: rent paid a few days early counts for its due date, once', () => {
  const rent = { id: 'r', name: 'Rumah', amount: 120000, freq: 'monthly', day: 1, start: '2026-01-01', auto: true };
  const early = [ex('2026-09-29', 120000, { merchant: 'Rumah' })];
  assert.equal(E.billPaid(rent, '2026-10-01', early), true);
  assert.equal(E.billPaid(rent, '2026-09-01', early), false, 'and not for the month before too');
  assert.equal(E.dueBillTxs([rent], '2026-10-01', early).filter(t => t.date === '2026-10-01').length, 0, 'no second rent posted');
});

test('F13: a salary typed as two lines on one day counts in full', () => {
  assert.equal(E.affordCheck({ price: 0, balance: 100000, txs: [inc('2026-09-25', 350000), inc('2026-09-25', 80000)], today: '2026-10-01' }).pay, 430000);
});

test('F14: the pace starts at the first spend, not at a salary typed earlier', () => {
  assert.equal(E.forecast({ txs: [inc('2026-09-01', 400000), ...daily('2026-09-22', 9, 5000)], today: '2026-09-30' }).rate, 5000);
});

test('F4/F18: one one-off rule and one start day, so Home and Insights agree', () => {
  const txs = [ex('2026-09-02', 30000), ...daily('2026-09-01', 10, 2000)];
  const f = E.forecast({ txs, today: '2026-09-10', budget: 100000 });
  const sp = E.monthSpend(txs, '2026-09'), p = E.pace(100000, sp.total, '2026-09-10', { amounts: sp.each.total, fixed: sp.fixed.total, first: E.firstSpend(txs) });
  assert.equal(p.over, f.projected > 100000);
  const late = [ex('2026-09-28', 6000)], lp = E.pace(100000, 6000, '2026-09-28', { amounts: [6000], first: E.firstSpend(late) });
  assert.equal(lp.projected, 6000 + 6000 * 2, 'RM 60 typed on the 28th: RM 60 a day for the 2 days left');
});

test('F5: "Next 30 days" draws the same path "Can I afford it?" judges, budget included', () => {
  const o = { balance: 500000, txs: [inc('2026-09-25', 400000), ex('2026-09-26', 70000), ...daily('2026-09-26', 5, 3000)], today: '2026-09-30', budget: 400000 };
  const nx = E.next30(o), a = E.affordCheck({ ...o, price: 0 });
  assert.equal(nx.days.at(-1).bal, a.left);
  assert.deepEqual([nx.low.date, nx.low.bal], [a.low.date, a.low.bal]);
});

test('F12: savings goal months in average months, not calendar-month steps', () => {
  const g = { target: 300000, by: '2026-12-31', accountId: 's' };
  assert.deepEqual([E.goalProgress(g, { s: 0 }, '2026-10-01').months, E.goalProgress(g, { s: 0 }, '2026-10-01').perMonth], [3, 100000]);
});

test('LHDN: everyday items are not reliefs, real ones still are', () => {
  const no = [['PANADOL 20S TABLET', 'health'], ['Hi-Fibre bread', 'groceries'], ['buku tulis', 'education'], ['手机壳', 'shopping'], ['书包', 'shopping'], ['Logitech computer mouse', 'shopping'],
    ['Galaxy Watch smartwatch', 'shopping'], ['100PLUS sports drink', 'groceries'], ['Fitnesse cereal', 'groceries'], ['tuition fee', 'education'], ['kursus memandu', 'education'],
    ['Sumbangan PIBG', 'other'], ['nursing pads', 'health'], ['vaksin kucing', 'health'], ['physio', 'health']];
  for (const [item, cat] of no) assert.equal(E.reliefOf(item, '', cat), null, item);
  const yes = [['iPad Air', 'shopping', 'lifestyle'], ['Samsung Galaxy S24 smartphone', 'shopping', 'lifestyle'], ['Unifi fibre broadband', 'bills', 'lifestyle'], ['buku cerita', 'education', 'lifestyle'],
    ['breast pump', 'health', 'breastfeeding'], ['scaling gigi', 'health', 'medical'], ['badminton racket', 'shopping', 'sports'], ['yuran pengajian UiTM', 'education', 'education'],
    ['derma masjid', 'other', 'donation'], ['vaksin influenza', 'health', 'medical']];
  for (const [item, cat, id] of yes) assert.equal(E.reliefOf(item, '', cat), id, item);
});

test('LHDN: only your own personal spending; a relief picked by hand wins over the words', () => {
  const t = o => ({ id: `r${n++}`, type: 'expense', date: '2026-03-01', amount: 1000, category: 'other', accountId: 'a', merchant: 'Kedai', ...o });
  const total = (rows, id) => E.taxRelief(rows, 2026, ['biz']).find(l => l.id === id).total;
  assert.equal(total([t({ merchant: 'tadika' })], 'childcare'), 1000);
  assert.equal(total([t({ merchant: 'tadika', spouse: true })], 'childcare'), 0, "a partner's entry is theirs to claim");
  assert.equal(total([t({ merchant: 'tadika', accountId: 'biz' })], 'childcare'), 0, 'a business account is not personal');
  assert.equal(total([t({ merchant: 'Kedai Elektrik', relief: 'lifestyle' })], 'lifestyle'), 1000, 'a relief Tally missed, picked by hand');
  assert.equal(total([t({ merchant: 'Kedai Buku', items: [{ name: 'buku cerita', cents: 1000 }], relief: 'none' })], 'lifestyle'), 0, 'marked "not a tax relief"');
  assert.equal(E.reliefGuess(t({ merchant: 'tadika', relief: 'none' })), 'childcare', 'the guess shows what the words say');
});

test('LHDN: relief receipts are kept for 7 years after the year the return is filed', () => {
  const t = o => ({ id: 'k', type: 'expense', date: '2025-05-01', amount: 1000, category: 'other', accountId: 'a', merchant: 'tadika', ...o });
  assert.equal(E.keepReceiptUntil(t()), '2033-12-31');
  assert.equal(E.keepReceiptUntil(t({ merchant: 'Kedai Elektrik', relief: 'lifestyle' })), '2033-12-31', 'picked by hand');
  assert.equal(E.keepReceiptUntil(t({ relief: 'none' })), '', 'marked not a relief');
  assert.equal(E.keepReceiptUntil(t({ merchant: 'Kedai' })), '', 'not a relief');
});

test('pay that moves around (25th, 28th, 26th) is expected on the latest day, the 28th', () => {
  const txs = [inc('2026-07-25', 400000), inc('2026-08-28', 400000), inc('2026-09-26', 400000), ...daily('2026-09-26', 25, 5000)];
  const a = E.affordCheck({ price: 0, balance: 35000, txs, today: '2026-10-20' });
  assert.equal(a.payDate, '2026-10-28');
  // RM 350 at RM 50 a day lasts to the 26th: pay on the 26th would save it, pay on the 28th doesn't.
  assert.equal(a.verdict, 'no');
  assert.equal(a.low.date, '2026-10-27');
  // The second-last-day pattern still wins: 29 Sep, 30 Oct → 29 Nov, not the 30th.
  assert.equal(E.affordCheck({ price: 0, balance: 0, txs: [inc('2026-08-25', 1), inc('2026-09-29', 1), inc('2026-10-30', 1)], today: '2026-11-01' }).payDate, '2026-11-29');
});

test('pay that varies (KPI): the lowest of the last 3 salary days, each day\'s lines summed', () => {
  const txs = [inc('2026-06-25', 9900000), inc('2026-07-25', 480000), inc('2026-08-25', 300000), inc('2026-08-25', 90000), inc('2026-09-25', 430000)];
  assert.equal(E.affordCheck({ price: 0, balance: 100000, txs, today: '2026-10-01' }).pay, 390000);   // 4,800 / 3,900 (two lines) / 4,300; June is too old
  assert.equal(E.affordCheck({ price: 0, balance: 100000, txs: txs.slice(-3), today: '2026-10-01' }).pay, 390000);   // fewer than 3: the lowest there is
});

test('afford says how it got there: bills due by name and date, the pace, and when the spending looks incomplete', () => {
  const bills = [{ id: 'b1', name: 'Rumah', amount: 120000, freq: 'monthly', day: 1, start: '2026-01-01' }, { id: 'b2', name: 'Unifi', amount: 12900, freq: 'monthly', day: 20, start: '2026-01-20' }];
  const txs = [inc('2026-09-25', 400000), ...daily('2026-09-20', 12, 5000)];
  const a = E.affordCheck({ price: 0, balance: 500000, txs, today: '2026-10-01', bills });
  assert.deepEqual(a.dues.map(d => [d.name, d.date]), [['Rumah', '2026-10-01'], ['Unifi', '2026-10-20']]);
  assert.equal(a.rate, 5000); assert.equal(a.pace.days, 12); assert.equal(a.pace.from, '2026-09-20');
  assert.equal(a.thin, false);
  // RM 5 a day against RM 4,000 pay: under a tenth, so probably not all typed in.
  assert.equal(E.affordCheck({ price: 0, balance: 500000, txs: [inc('2026-09-25', 400000), ...daily('2026-09-20', 12, 500)], today: '2026-10-01' }).thin, true);
  assert.equal(E.affordCheck({ price: 0, balance: 500000, txs: daily('2026-09-29', 3, 5000), today: '2026-10-01' }).thin, true);   // 3 days: early
});

test('subcategory: "Café" with the accent is a café, like "Cafe"', () => {
  assert.equal(E.subFor('dining', 'Café Seri'), 'Café');
  assert.equal(E.subFor('dining', 'Cafe Seri'), 'Café');
});
