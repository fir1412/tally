// Streaks and badges, off unless turned on in Settings (pattern from we go gim). Pure rules over the data, so they
// survive a restore and can't drift. Nothing rewards spending: a day with nothing spent counts like any other.
import { addDays, cycleKey, cycleSpan, addMonths } from './engine.js';
import { byUser } from './learn.js';

const pad = n => String(n).padStart(2, '0');
/** The local calendar day of a timestamp. */
export const dayOf = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const weekBegins = (iso, ws) => new Date(iso + 'T00:00:00Z').getUTCDay() === ws;

/** Days with something logged: an entry the user made (on the day it is dated) or a "nothing spent today" check-in. */
export const loggedDays = (tx, noSpend = [], me = '') => new Set([...tx.filter(x => byUser(x, me)).map(x => x.date), ...noSpend]);

/**
 * Logging streak up to `today`: days in a row with something logged. One missed day a week (from weekStart: 1 Monday, 0 Sunday) is a
 * rest day that keeps the streak without adding to it; a second one breaks it. Today not logged yet never does.
 * → { streak, best, rest (this week's rest day, or null), loggedToday, earned: { 7: date, 30: date } }
 */
export function streak(days, today, weekStart = 1) {
  const out = { streak: 0, best: 0, rest: null, loggedToday: days.has(today), earned: {} };
  let d = [...days].filter(x => x <= today).sort()[0], rest = null;
  if (!d) return out;
  for (; d <= today; d = addDays(d, 1)) {
    if (weekBegins(d, weekStart)) rest = null;
    if (days.has(d)) out.streak++;
    else if (d === today) break;
    else if (out.streak && !rest) rest = d;
    else out.streak = 0;
    out.best = Math.max(out.best, out.streak);
    for (const n of [7, 30]) if (out.streak >= n && !out.earned[n]) out.earned[n] = d;
  }
  out.rest = out.streak ? rest : null;
  return out;
}

export const BADGES = [
  ['scan1', 'camera'], ['streak7', 'flame'], ['streak30', 'flame'], ['budget', 'wallet'], ['fullmonth', 'calendar'],
  ['scan10', 'receipt'], ['nospend', 'leaf'], ['less', 'down'], ['backup', 'download'], ['import', 'upload'], ['learned', 'award'],
].map(([id, icon]) => ({ id, icon }));

/**
 * The badges earned so far: { id: the day it was earned }.
 * d: { tx, today, startDay, budget (monthly total in sen), noSpend: [days], lastBackup, me, learnedOn }
 * ponytail: "under budget" holds past months to today's budget (Tally keeps no budget history).
 */
export function earned({ tx, today, startDay = 1, budget = 0, noSpend = [], lastBackup = null, me = '', learnedOn = null, weekStart = 1 }) {
  const got = {}, give = (id, date) => { if (date && !(got[id] <= date)) got[id] = date; };
  const booked = tx.filter(x => x.date <= today), mine = booked.filter(x => byUser(x, me));
  const scans = mine.filter(x => x.source === 'receipt' && x.receiptId).map(x => (x.createdAt ? dayOf(x.createdAt) : x.date)).sort();
  give('scan1', scans[0]); give('scan10', scans[9]);
  const days = loggedDays(booked, noSpend, me), st = streak(days, today, weekStart);
  give('streak7', st.earned[7]); give('streak30', st.earned[30]);
  const spentList = booked.filter(x => x.type === 'expense'), spentOn = new Set(spentList.map(x => x.date));
  for (const n of [...noSpend].sort()) if (n < today && !spentOn.has(n)) { give('nospend', addDays(n, 1)); break; }   // a whole day, once it is over
  give('backup', lastBackup?.slice(0, 10));
  give('import', tx.filter(x => x.source === 'import' || x.source === 'statement').map(x => (x.createdAt ? dayOf(x.createdAt) : today)).sort()[0]);
  give('learned', learnedOn);
  // Finished months with entries the user made: under budget, every day logged, less than the month before.
  const first = mine.map(x => x.date).sort()[0];
  if (first) {
    const tracked = new Set(mine.map(x => cycleKey(x.date, startDay))), cur = cycleKey(today, startDay), spend = {};
    for (const x of spentList) { const k = cycleKey(x.date, startDay); spend[k] = (spend[k] || 0) + x.amount; }
    for (let ym = cycleKey(first, startDay); ym < cur; ym = addMonths(ym, 1)) {
      if (!tracked.has(ym)) continue;
      const { start, end } = cycleSpan(ym, startDay), after = addDays(end, 1), spent = spend[ym] || 0;
      if (budget > 0 && spent > 0 && spent <= budget) give('budget', after);
      let all = true; for (let x = start; x <= end && all; x = addDays(x, 1)) all = days.has(x);
      if (all) give('fullmonth', after);
      const prev = addMonths(ym, -1), before = tracked.has(prev) ? spend[prev] || 0 : 0;
      if (before > 0 && spent < before) give('less', after);
    }
  }
  return got;
}
