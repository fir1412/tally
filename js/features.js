// Tally in modules: every feature beyond "type what you spent, see the list and the totals" can be turned off, one by one
// or with a preset (Simple · Standard · Everything). Off only hides: the data stays, and turning it back on shows it again.
// Streaks, Learn Tally and the sticker book already had their own switches; their modules read and write those.
import { settings, setSetting } from './state.js';

export const MODULES = [
  ['receipts', 'Receipt scanning', 'Snap a receipt; Tally reads it item by item on this phone.'],
  ['budgets', 'Budgets', 'Monthly limits, the pace ring and over-budget warnings.'],
  ['insights', 'Insights', 'Charts, forecasts, your prices and good-news finds.'],
  ['bills', 'Bills', 'Regular payments that remind you and add themselves.'],
  ['taxrelief', 'Tax relief (LHDN)', 'Spending that may relate to a tax relief, and its receipts in one download.'],
  ['split', 'Split with friends', 'Share a bill by who had what.'],
  ['reminders', 'Return and warranty reminders', 'A nudge before a return window or warranty ends.'],
  ['stickers', 'Sticker book', 'A sticker for each day you log.'],
  ['streaks', 'Streaks and badges', 'A logging streak and badges for good habits.'],
  ['learn', 'Learn Tally', 'Short missions that show what Tally can do.'],
  ['joint', 'Joint accounts', 'Shared money with a partner, kept apart from your own.'],
  ['business', 'Business accounts', 'A stall, rides or a shop, kept apart from your own money.'],
  ['currencies', 'Other currencies', 'SGD and other money, at the rate you choose.'],
];
const all = v => Object.fromEntries(MODULES.map(([k]) => [k, v]));
export const PRESETS = {
  simple: all(false),   // a plain money tracker: type it, see the list and the month's totals, back it up
  standard: { ...all(true), streaks: false },
  everything: all(true),
};
/** Is this module on? */
export function on(k) {
  const s = settings();
  if (k === 'streaks') return s.gamify === true;
  if (k === 'learn') return !s.learnHidden;
  if (k === 'stickers') return !(s.homeHide || []).includes('stickers');
  return s.features?.[k] ?? PRESETS.standard[k];
}
/** Turn modules on or off: {key: bool, …}. */
export async function setModules(changes) {
  const features = { ...(settings().features || {}) };
  for (const [k, v] of Object.entries(changes)) {
    if (k === 'streaks') await setSetting('gamify', !!v);
    else if (k === 'learn') await setSetting('learnHidden', !v);
    else if (k === 'stickers') await setSetting('homeHide', v ? (settings().homeHide || []).filter(x => x !== 'stickers') : [...new Set([...(settings().homeHide || []), 'stickers'])]);
    else features[k] = !!v;
  }
  await setSetting('features', features);
}
/** The preset the switches match now, or 'custom'. */
export const presetNow = () => Object.keys(PRESETS).find(p => MODULES.every(([k]) => on(k) === PRESETS[p][k])) || 'custom';
