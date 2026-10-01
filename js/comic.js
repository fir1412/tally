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
  aina: { en: 'Aina', ms: 'Aina', zh: 'Aina', 'zh-Hant': 'Aina', ja: 'アイナ', ta: 'அய்னா' },
  wei: { en: 'Wei', ms: 'Wei', zh: '伟', 'zh-Hant': '偉', ja: 'ウェイ', ta: 'வெய்' },
  raju: { en: 'Uncle Raju', ms: 'Pak Cik Raju', zh: 'Raju 叔叔', 'zh-Hant': 'Raju 叔叔', ja: 'ラジュおじさん', ta: 'ராஜு மாமா' },
  duit: { en: 'Duit', ms: 'Duit', zh: 'Duit', 'zh-Hant': 'Duit', ja: 'ドゥイット', ta: 'துயிட்' },
};

// The camera: a panel's optional `cam` reframes its 320x200 art without redrawing it (see frame). The outer
// <svg viewBox="0 0 320 200"> never changes; a panel without `cam` renders exactly as drawn.
const ZOOM = { wide: 1, medium: 1.5, close: 2.4, xclose: 3.4, insert: 4.2 };
// Low/high: flat gouache has no 3D to re-project, so an angle is faked with what a viewer reads as one: the crop slides
// up (low: more ceiling/sky, the horizon drops, faces sit low and loom) or down (high: more floor, the horizon rises),
// and the art stretches 8% taller (low: figures tower) or squashes 8% (high: figures foreshortened, looked down on).
// An angle zooms at least 1.15x so the crop has room to slide and the squash never shows past the scene's edge.
const TILT = { eye: [0, 1], low: [-1, 1.08], high: [1, 0.92] };
// A slow move once the panel is on screen (css .cam-drift): start and end transforms around the panel's centre. Pans
// run at 1.08x so a 10 px (6 px up/down) slide never shows past the edge; zooms stay at or above 1x for the same reason.
const DRIFT = { in: ['scale(1)', 'scale(1.06)'], out: ['scale(1.06)', 'scale(1)'], left: ['translate(-10px,0) scale(1.08)', 'translate(10px,0) scale(1.08)'],
  right: ['translate(10px,0) scale(1.08)', 'translate(-10px,0) scale(1.08)'], up: ['translate(0,-6px) scale(1.08)', 'translate(0,6px) scale(1.08)'], down: ['translate(0,6px) scale(1.08)', 'translate(0,-6px) scale(1.08)'] };
const r2 = n => Math.round(n * 100) / 100, up3 = n => Math.ceil(n * 1000 - 1e-9) / 1000,   // scales round up: never a hairline past the edge
  clamp = (v, a, b) => Math.min(Math.max(v, a), b);
/** A panel's art through its camera → the markup inside the panel's <svg viewBox="0 0 320 200">. cam: { shot, on:[x,y]
 *  (scene coords), angle, flip, dutch (deg, ±8), fg (screen-space markup drawn last, never zoomed or flipped), drift }.
 *  The crop is clamped so it never shows past the scene. flip mirrors the panel (a reverse angle) but turns inline
 *  <text> (stall and shop signs, price tags) back so it reads; words painted into a backdrop's defs (the kopitiam menu)
 *  can't be turned back: lintShots flags those panels. */
export function frame(art, cam) {
  if (!cam) return art;
  const { shot = 'wide', on: [fx, fy] = [160, 110], angle = 'eye', flip, dutch = 0, fg = '', drift } = cam, [up, k] = TILT[angle] || TILT.eye;
  // dutch: the turned frame needs (cos + 1.6 sin) more zoom to stay inside a 320x200 scene; hw/hh: half the crop's bounding box
  const a = clamp(dutch, -8, 8), c = Math.cos(a * Math.PI / 180), s = Math.abs(Math.sin(a * Math.PI / 180));
  const z = Math.max(ZOOM[shot] || 1, up ? 1.15 : 1) * (c + 1.6 * s), sx = up3(z), sy = up3(z * k), hw = (160 * c + 100 * s) / sx, hh = (160 * s + 100 * c) / sy;
  const cx = clamp(fx, hw, 320 - hw), cy = clamp(fy + up * 0.25 * hh, hh, 200 - hh);
  const body = flip ? art.replace(/<text x="(-?[\d.]+)"(?![^>]*transform)/g, (m, x) => `<text transform="matrix(-1 0 0 1 ${r2(2 * x)} 0)" x="${x}"`) : art;
  const g = `<g transform="translate(160 100)${flip ? ' scale(-1 1)' : ''}${a ? ` rotate(${a})` : ''} scale(${sx} ${sy}) translate(${r2(-cx)} ${r2(-cy)})">${body}</g>`;
  const d = DRIFT[drift];
  return (d ? `<g class="cam-drift" style="--d0:${d[0]};--d1:${d[1]}">${g}</g>` : g) + fg;
}
/** What's wrong with a book's shots, as readable lines (none: []): the same shot+angle+flip twice running; under 4 shot
 *  sizes in any 7 panels running; a new scene not opened by a wide shot; over 3 dutch angles; a focus outside the scene;
 *  an unknown shot/angle/drift; a flipped panel whose backdrop (from `defs`, the book's) has painted words. A panel's
 *  scene is its optional `scene` field, else the first <use> in its art (scene() draws first: "#b10-home-n" → home). */
export function lintShots(panels, defs = '') {
  const out = [], cam = p => p.cam || {}, key = p => `${cam(p).shot || 'wide'} ${cam(p).angle || 'eye'}${cam(p).flip ? ' flipped' : ''}`;
  const sceneOf = p => p.scene || p.art?.match(/^<use href="#[^"-]+-([a-z]+)/)?.[1];
  const worded = new Set(defs.split('<g id="').filter(x => x.includes('<text')).map(x => x.slice(0, x.indexOf('"'))));
  let dutch = 0;
  panels.forEach((p, i) => {
    const c = cam(p), n = `panel ${i + 1}`, sc = sceneOf(p);
    if (!ZOOM[c.shot || 'wide'] || !TILT[c.angle || 'eye'] || (c.drift && !DRIFT[c.drift])) out.push(`${n}: unknown shot, angle or drift`);
    if (i && key(p) === key(panels[i - 1])) out.push(`${n}: same shot as panel ${i} (${key(p)})`);
    if (i >= 6 && new Set(panels.slice(i - 6, i + 1).map(q => cam(q).shot || 'wide')).size < 4) out.push(`panels ${i - 5}-${i + 1}: fewer than 4 shot sizes`);
    if (sc && sc !== (i ? sceneOf(panels[i - 1]) : null) && (c.shot || 'wide') !== 'wide') out.push(`${n}: a new scene (${sc}) opens on a ${c.shot} shot, not wide`);
    if (c.dutch && ++dutch > 3) out.push(`${n}: dutch angle number ${dutch} (3 a book at most)`);
    if (c.on && !(c.on[0] >= 0 && c.on[0] <= 320 && c.on[1] >= 0 && c.on[1] <= 200)) out.push(`${n}: focus ${c.on} is outside the scene`);
    if (c.flip && [...(p.art || '').matchAll(/href="#([^"]+)"/g)].some(m => worded.has(m[1]))) out.push(`${n}: flipped, but its backdrop has painted words that would read backwards`);
  });
  return out;
}
