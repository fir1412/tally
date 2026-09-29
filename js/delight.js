// Small rewards drawn from the user's own data: the month ring, the weekly recap and the occasional "nice find" on
// Home. Pure rules, no DOM (tested in tests/delight.test.mjs). Only good or neutral news, and nothing rewards spending.
import { addDays, breakdown, isBill, cycleKey, cycleSpan, daysBetween, addMonths, monthSpend, insights, billStatus } from './engine.js';
import { dayOf } from './gamify.js';

const clamp = x => Math.max(0, Math.min(1, x));

/**
 * The ring on Home. With a budget: the share left, green / amber (heading over at this pace) / red (over).
 * Without one: this month so far against the same point last month (amber when ahead of it; never red, it isn't a limit).
 * null when there is nothing to compare with.  p: pace() of the budget.
 */
export function ring({ budget = 0, spent = 0, before = 0, p = null }) {
  if (budget > 0) return { mode: 'budget', frac: clamp((budget - spent) / budget), tone: spent > budget ? 'bad' : p?.over ? 'warn' : 'good' };
  if (before > 0) return { mode: 'last', frac: clamp(spent / before), tone: spent <= before ? 'good' : 'warn' };
  return null;
}

/** The first day of the week holding `iso` (ws: 1 Monday, 0 Sunday). */
export const weekOf = (iso, ws = 1) => addDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() - ws + 7) % 7));
// Everyday spending only: a bill comes once a month and would make one week of four look expensive.
const everyday = t => t.type === 'expense' && !isBill(t);
function week(txs, start) {
  const end = addDays(start, 6), by = {}, days = Array(7).fill(0);
  let total = 0;
  for (const t of txs) {
    if (!everyday(t) || t.date < start || t.date > end) continue;
    total += t.amount; days[daysBetween(start, t.date)] += t.amount;
    for (const x of breakdown(t)) by[x.category] = (by[x.category] || 0) + x.cents;
  }
  return { total, by, days };
}
/**
 * Last week, looked back on in the week after: everyday spending, the usual week (the average of the 4 before it that
 * had any; 2 needed), the top category, spending per day, and at most one good note:
 * {kind: 'cheapest', cat} (a category's lowest week of the last five, each with spending on it) or {kind: 'less', by}.
 * null when last week had no spending.
 */
export function weekRecap(txs, today, ws = 1) {
  const start = addDays(weekOf(today, ws), -7), last = week(txs, start);
  if (!last.total) return null;
  const prev = [1, 2, 3, 4].map(k => week(txs, addDays(start, -7 * k)));
  const had = prev.filter(w => w.total), usual = had.length >= 2 ? Math.round(had.reduce((s, w) => s + w.total, 0) / had.length) : 0;
  const top = Object.entries(last.by).sort((a, b) => b[1] - a[1])[0];
  let good = null;
  const cheaper = Object.entries(last.by).filter(([c, v]) => v > 0 && prev.every(w => (w.by[c] || 0) > v))
    .map(([c, v]) => ({ c, save: prev.reduce((s, w) => s + w.by[c], 0) / 4 - v })).sort((a, b) => b.save - a.save)[0];
  if (cheaper && cheaper.save >= 500) good = { kind: 'cheapest', cat: cheaper.c };
  else if (usual && last.total <= usual * 0.9) good = { kind: 'less', by: usual - last.total };
  return { start, total: last.total, usual, top: top && { cat: top[0], cents: top[1] }, days: last.days, good };
}

/**
 * Small good news for an occasional card on Home, most telling first:
 * {kind: 'price', ins} an item cheaper than last time (the engine's insight), {kind: 'catdown', cat, pct} a category
 * well below the same point last month, {kind: 'bill', name} a bill marked paid on or before its day this week,
 * {kind: 'nospend'} yesterday checked in as a day with nothing spent.
 * d: { txs, today, startDay, noSpend: [days], bills, ins (insights() for these txs and today, when already worked out) }
 */
export function niceFinds({ txs, today, startDay = 1, noSpend = [], bills = [], ins = insights({ txs, today, startDay }) }) {
  const out = [];
  for (const i of ins) if (i.kind === 'price' && i.level === 'good') out.push({ id: i.id, kind: 'price', ins: i });
  // Categories at 80% or less of the same point last month (a week in, and RM 20 or more last month).
  const ym = cycleKey(today, startDay), lastYm = addMonths(ym, -1), into = daysBetween(cycleSpan(ym, startDay).start, today);
  // Not while nothing is being logged: "down 100%" then only means days not logged (it praised people who had stopped).
  if (into >= 7 && txs.some(t => t.date <= today && daysBetween(t.date, today) <= 3)) {
    const lastStart = cycleSpan(lastYm, startDay).start, upTo = addDays(lastStart, into);
    const now = monthSpend(txs.filter(t => t.date <= today), ym, startDay).byCat, then = monthSpend(txs.filter(t => t.date <= upTo), lastYm, startDay).byCat;
    for (const [c, v] of Object.entries(then)) {
      const n = now[c] || 0;
      if (c !== 'bills' && v >= 2000 && n <= v * 0.8) out.push({ id: `catdown-${c}-${ym}`, kind: 'catdown', cat: c, pct: Math.round((1 - n / v) * 100) });
    }
  }
  // A bill marked paid by hand on or before the day it was due, in the last week (a payment dated on its due day, added in time).
  for (const b of bills) {
    const s = billStatus(b, today, txs);
    if (!s.paid || !s.date || s.date < addDays(today, -7) || s.date > today) continue;
    const paid = txs.find(t => t.bill === b.id && t.date === s.date && t.createdAt);
    if (paid && dayOf(paid.createdAt) <= s.date) out.push({ id: `billok-${b.id}-${s.date}`, kind: 'bill', name: b.name });
  }
  const y = addDays(today, -1);
  if (noSpend.includes(y) && !txs.some(t => t.type === 'expense' && t.date === y)) out.push({ id: `nospend-${y}`, kind: 'nospend' });
  return out;
}
/** A number from a day, the same all day. */
const seed = iso => { let h = 7; for (const ch of iso) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
/** At most one find a day, and not every day (about 3 days in 5): variable, but never random between two opens. */
export function pickFind(finds, today) {
  const h = seed(today);
  return finds.length && h % 5 < 3 ? finds[(h >>> 3) % finds.length] : null;
}
