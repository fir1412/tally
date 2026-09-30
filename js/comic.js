// A sticker book for every calendar month (js/books/MM.js): one sticker and one comic panel for each day. Logging a day
// (an entry for it, or "nothing spent") unlocks both; a day can be filled in later until its month ends. A complete
// month unlocks the story's ending. Pure: no DOM. Months without their own book yet use the classic stickers, no comic.
import { dayOf } from './gamify.js';
import { byUser } from './learn.js';
import { STICKERS } from './stickers.js';

export const daysIn = ym => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
const pad = n => String(n).padStart(2, '0');

/** The last day a month's gaps can still be filled: the 7th of the next month (catching up on the 1st counts). */
export const graceEnd = ym => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01-07` : `${y}-${pad(m + 1)}-07`; };
/** Days of month `ym` (1…n) the user filled: an entry of theirs dated that day and made on it or later, by the 7th of the
 *  next month (a planned entry made ahead doesn't count, nor imports or bills posted for them), or a "nothing spent" check-in. */
export function filledDays({ tx = [], noSpend = [], me = '', ym, today }) {
  const end = graceEnd(ym), out = new Set();
  for (const x of tx) {
    if (!x.date?.startsWith(ym) || x.date > today || !x.createdAt || !byUser(x, me)) continue;
    const made = dayOf(x.createdAt);
    if (made >= x.date && made <= end) out.add(+x.date.slice(8, 10));
  }
  for (const d of noSpend) if (d.startsWith(ym) && d <= today) out.add(+d.slice(8, 10));
  return out;
}
/** A book has 31 panels: day N shows panel N, and the month's last day always shows panel 31, the ending (shorter
 *  months skip the ones before it). → index into book.panels. */
export const panelOf = (day, n) => (day === n ? 30 : day - 1);

/** The month's book, or the classic stickers (twelve, round again) when it has none yet. */
const classic = { id: 'classic', theme: null, colours: null, panels: [], stickers: Array.from({ length: 31 }, (_, i) => { const [id, name, svg] = STICKERS[i % STICKERS.length]; return { id, name, svg }; }) };
export async function loadBook(ym) {
  try { return (await import(`./books/${ym.slice(5, 7)}.js`)).default; } catch { return classic; }
}
/** Where a month's book stands: which days are in, whether it is complete (every day), and what is still open. */
export function bookState({ ym, filled, today }) {
  const n = daysIn(ym), over = today.slice(0, 7) > ym, end = graceEnd(ym);
  // open: gaps can still be filled (this month, or last month until the 7th); grace: a past month still open.
  return { ym, n, got: filled.size, complete: filled.size === n, over, open: today >= `${ym}-01` && today <= end, grace: over && today <= end, end };
}
/** The cast's names over their lines, in each language. */
export const WHO = {
  aina: { en: 'Aina', ms: 'Aina', zh: 'Aina', 'zh-Hant': 'Aina', ja: 'アイナ' },
  wei: { en: 'Wei', ms: 'Wei', zh: '伟', 'zh-Hant': '偉', ja: 'ウェイ' },
  raju: { en: 'Uncle Raju', ms: 'Pak Cik Raju', zh: 'Raju 叔叔', 'zh-Hant': 'Raju 叔叔', ja: 'ラジュおじさん' },
  duit: { en: 'Duit', ms: 'Duit', zh: 'Duit', 'zh-Hant': 'Duit', ja: 'ドゥイット' },
};
