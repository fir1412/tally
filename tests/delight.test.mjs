// Home's small rewards: the month ring's colour, the weekly recap and the occasional nice find. Dates are ISO days.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ring, weekOf, weekRecap, niceFinds, pickFind } from '../js/delight.js';
import { addDays } from '../js/engine.js';

const tx = (date, amount, category = 'groceries', o = {}) => ({ id: `t${date}${category}${amount}${Math.random()}`, date, type: 'expense', amount, accountId: 'a', category, source: 'quick', ...o });

test('ring: what is left of the budget, green / amber / red by pace; without one, this month against last', () => {
  assert.deepEqual(ring({ budget: 200000, spent: 50000, p: { over: false } }), { mode: 'budget', frac: 0.75, tone: 'good' });
  assert.equal(ring({ budget: 200000, spent: 150000, p: { over: true } }).tone, 'warn');
  assert.deepEqual(ring({ budget: 200000, spent: 250000, p: { over: true } }), { mode: 'budget', frac: 0, tone: 'bad' });
  assert.deepEqual(ring({ spent: 40000, before: 50000 }), { mode: 'last', frac: 0.8, tone: 'good' });
  assert.deepEqual(ring({ spent: 70000, before: 50000 }), { mode: 'last', frac: 1, tone: 'warn' });   // never red without a budget
  assert.equal(ring({ spent: 70000 }), null);
});

test('weekOf: Monday or Sunday weeks', () => {
  assert.equal(weekOf('2026-09-29', 1), '2026-09-28');   // a Tuesday → Monday 28th
  assert.equal(weekOf('2026-09-28', 1), '2026-09-28');
  assert.equal(weekOf('2026-09-29', 0), '2026-09-27');
});

test('weekly recap: last week against the usual week, its top category, and one good note', () => {
  const today = '2026-09-29', last = '2026-09-21';   // last week: Mon 21 – Sun 27
  const txs = [];
  for (let k = 1; k <= 4; k++) { const w = addDays(last, -7 * k); txs.push(tx(w, 10000), tx(addDays(w, 2), 6000, 'dining')); }   // RM 160 a week
  txs.push(tx(last, 4000), tx(addDays(last, 3), 8000, 'dining'), tx(addDays(last, 1), 150000, 'bills', { bill: 'b1' }));   // the bill is left out
  const r = weekRecap(txs, today, 1);
  assert.equal(r.start, last);
  assert.equal(r.total, 12000);
  assert.equal(r.usual, 16000);
  assert.deepEqual(r.top, { cat: 'dining', cents: 8000 });
  assert.deepEqual(r.days, [4000, 0, 0, 8000, 0, 0, 0]);
  assert.deepEqual(r.good, { kind: 'cheapest', cat: 'groceries' });   // RM 40 against RM 100 every week before
  // Not the cheapest of five weeks, but below the usual week: said as "less than a usual week".
  const r2 = weekRecap([...txs.filter(x => x.date < last), tx(last, 13000), tx(addDays(last, 3), 1000, 'transport')], today, 1);
  assert.deepEqual(r2.good, { kind: 'less', by: 2000 });
  // Above the usual week: no good note is invented, and nothing scolds either.
  assert.equal(weekRecap([...txs.filter(x => x.date < last), tx(last, 30000)], today, 1).good, null);
  // Nothing last week: no card. A new user (no weeks before): no "usual".
  assert.equal(weekRecap(txs.filter(x => x.date < last), today, 1), null);
  assert.equal(weekRecap([tx(last, 500)], today, 1).usual, 0);
});

test('nice finds: cheaper items, a category down, a bill paid in time, a no-spend day', () => {
  const today = '2026-09-20';
  const txs = [
    tx('2026-09-02', 1500, 'groceries', { items: [{ name: 'MILO 1KG', cents: 1500, category: 'groceries' }] }),
    tx('2026-09-15', 1200, 'groceries', { items: [{ name: 'MILO 1KG', cents: 1200, category: 'groceries' }] }),   // 20% cheaper
    tx('2026-08-05', 30000, 'dining'), tx('2026-09-05', 5000, 'dining'),   // dining far below the same point in August
    tx('2026-09-18', 8000, 'bills', { bill: 'b1', merchant: 'Unifi', createdAt: new Date(2026, 8, 17, 20).getTime() }),   // paid the evening before
  ];
  const bills = [{ id: 'b1', name: 'Unifi', amount: 8000, day: 18, start: '2026-01-18', freq: 'monthly' }];
  const f = niceFinds({ txs, today, noSpend: ['2026-09-19'], bills });
  assert.deepEqual(f.map(x => x.kind).sort(), ['bill', 'catdown', 'nospend', 'price']);
  assert.equal(f.find(x => x.kind === 'catdown').pct, 83);
  assert.equal(f.find(x => x.kind === 'bill').name, 'Unifi');
  // A bill paid late, a day with spending checked in as no-spend, and a price that went up are not news.
  const late = txs.map(x => (x.bill ? { ...x, createdAt: new Date(2026, 8, 19, 9).getTime() } : x));
  const up = late.map(x => (x.date === '2026-09-15' ? { ...x, amount: 1800, items: [{ name: 'MILO 1KG', cents: 1800, category: 'groceries' }] } : x));
  assert.deepEqual(niceFinds({ txs: [...up, tx('2026-09-19', 500)], today, noSpend: ['2026-09-19'], bills }).map(x => x.kind), ['catdown']);
  // Too early in the month to compare categories.
  assert.equal(niceFinds({ txs, today: '2026-09-04' }).filter(x => x.kind === 'catdown').length, 0);
});

test('pickFind: at most one a day, the same all day, and not every day', () => {
  const finds = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const days = Array.from({ length: 60 }, (_, i) => addDays('2026-09-01', i));
  const picks = days.map(d => pickFind(finds, d));
  const shown = picks.filter(Boolean).length;
  assert.ok(shown > 20 && shown < 50, `shown on ${shown} of 60 days`);
  assert.deepEqual(days.map(d => pickFind(finds, d)), picks);   // stable within a day
  assert.equal(new Set(picks.filter(Boolean).map(x => x.id)).size, 3);   // variety across days
  assert.equal(pickFind([], '2026-09-01'), null);
});
