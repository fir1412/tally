// Share pictures: a month, a year, a finished sticker book, a goal reached, a logging streak. Each is drawn on a canvas on
// this phone as a receipt-style picture in two formats (chat 1080×1080 on paper, status 1080×1920 at night), shown in a
// preview sheet first, then handed to the share sheet (or saved, the caption copied). Nothing is uploaded.
// Amounts are off unless the sharer turns them on (never with the balance hidden); Loans and Health fold into Other unless
// amounts are on; the top shop only on request. Layout px follow the share design spec (D:\tally-share, round 2 addendum).
// The data parts and text fitting are pure (tests/share.test.mjs).
import { t, getLang, langTag, fmtMonth } from './i18n.js';
import { download } from './io.js';
import { esc, ICON, openSheet, toast, balHidden } from './ui.js';
import { settings } from './state.js';
import { VIEW, DEFS, CAST, TIN } from './share-art.js';

const NB = String.fromCharCode(160);   // the no-break space in fmtRM's "RM 12.00"
const URL_TEXT = 'tallymy.github.io';
const C = { paper: '#F6F5F1', slip: '#FFFDF8', ink: '#0A0F1E', mute: '#6B675C', rule: 'rgba(10,15,30,.22)', blue: '#2F54EB', night: '#0A0F1E', moon: '#AEB6CC', glow: '#8EA4FF', other: '#64748B', stamp: '#B5533A' };

// ---- text: fitting and wrapping in every language -----------------------------------------------------------------
const segs = (text, lang, granularity) => typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter(lang, { granularity }).segment(text)] : null;
/** Lines no wider than maxW (measure(text) → width). Breaks between words: Intl.Segmenter finds them in Chinese and
 *  Japanese too, which have no spaces. A word wider than a line breaks between letters (graphemes: a Tamil letter with its
 *  vowel sign stays whole). Punctuation stays on the line of the word before it; a no-break space never breaks. */
export function wrap(measure, text, maxW, lang) {
  text = String(text).trim();
  // Pieces that can start a line: a word, unless a no-break space is just before it. Spaces and punctuation ride along.
  const pieces = [];
  for (const s of segs(text, lang, 'word') ?? text.split(/(?<= )/).map(segment => ({ segment, isWordLike: true }))) {
    if (!pieces.length || (s.isWordLike && !pieces.at(-1).endsWith(NB))) pieces.push(s.segment); else pieces[pieces.length - 1] += s.segment;
  }
  const lines = []; let line = '';
  const put = s => { if (line && measure((line + s).trimEnd()) > maxW) { lines.push(line.trimEnd()); line = s; } else line += s; };
  for (const p of pieces) {
    if (measure(p.trimEnd()) > maxW) for (const g of segs(p, lang, 'grapheme')?.map(x => x.segment) ?? Array.from(p)) put(g);
    else put(p);
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}
/** The largest size (size down to min, in steps of 2) at which text fits in maxLines lines; measure(text, size) → width.
 *  At min it gives every line it needs: past that the picture has to make room, never cut the words. */
export function fitLines(measure, text, maxW, size, min, maxLines = 1, lang) {
  for (;; size -= 2) {
    const lines = wrap(s => measure(s, size), text, maxW, lang);
    if (lines.length <= maxLines || size - 2 < min) return { size, lines };
  }
}
/** Latin letters only (numbers and punctuation count): the brand fonts have no Tamil or CJK, and italics or tracking
 *  would break those scripts. */
export const latin = s => !/[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u.test(s);

// ---- what a picture says (pure) -----------------------------------------------------------------------------------
/** Splits the integer `total` in proportion to vs, as integers that add up to it exactly (largest remainder): shares of
 *  100 that sum to 100%, whole ringgit that sum to the total shown. */
export function shares(vs, total) {
  const sum = vs.reduce((s, v) => s + v, 0); if (!sum) return vs.map(() => 0);
  const raw = vs.map(v => v * total / sum), out = raw.map(Math.floor);
  let left = total - out.reduce((s, v) => s + v, 0);
  for (const [, i] of raw.map((r, i) => [r - out[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])) if (left-- > 0) out[i]++;
  return out;
}
export const rmWhole = sen => `RM${NB}${Math.round(sen / 100).toLocaleString('en-MY')}`;
const FOLD = new Set(['loans', 'health']);   // what a family group shouldn't see unless the sharer shows amounts
/** The receipt's categories: the 5 biggest, or 4 and "Other" when there are more; the "other" category and (fold: amounts
 *  off) Loans and Health are always in Other. Each with its share of the spending (adding up to 100) and whole ringgit
 *  (adding up to the total). byCat {category: sen}; info(c) → {label, color}. */
export function parts(byCat, info, fold) {
  let rest = 0, p = [];
  for (const [c, v] of Object.entries(byCat)) if (v > 0) { if (c === 'other' || (fold && FOLD.has(c))) rest += v; else p.push({ ...info(c), v }); }
  p.sort((a, b) => b.v - a.v);
  if (p.length + (rest > 0) > 5) { rest += p.slice(4).reduce((s, x) => s + x.v, 0); p = p.slice(0, 4); }
  if (rest) p.push({ label: t('Other'), color: C.other, v: rest });
  const sum = p.reduce((s, x) => s + x.v, 0), pc = shares(p.map(x => x.v), 100), rm = shares(p.map(x => x.v), Math.round(sum / 100));
  return p.map((x, i) => ({ ...x, pct: pc[i], rm: rm[i] }));
}
/** The receipt rows [label, value, swatch]: each category's % or (amounts) whole ringgit. */
export const catRows = (ps, amounts) => ps.map(p => [p.label, amounts ? rmWhole(p.rm * 100) : `${p.pct}%`, p.color]);
/** The big number. With amounts: Kept (money came in and some is left), else Spent, in ink: an over month is never red.
 *  Without: Kept as a share of what came in; else Spent's drop on the month before, only when it fell; else the days logged.
 *  change: (spent − the month before) / the month before; prev: that month's name. */
export function hero({ spent, inn, got, n, change, prev, well }, amounts) {
  const kept = inn - spent, drop = Math.round(-change * 100);
  // A sparsely logged period (under 2/3 of its days) proves nothing: its Kept % and its drop come from days not logged.
  well ??= !n || got >= n * 2 / 3;
  if (amounts) return inn > 0 && kept >= 0 ? { label: t('Kept'), value: rmWhole(kept) } : { label: t('Spent'), value: rmWhole(spent), ink: true };
  if (well && inn > 0 && kept > 0) return { label: t('Kept'), value: `${Math.round(kept / inn * 100)}%`, note: t('of what came in') };
  if (well && prev && drop >= 1) return { label: t('Spent'), value: `${drop}%`, note: t('less than {0}', prev), down: true };
  return { label: t('Days you logged'), value: n ? `${got}/${n}` : String(got), ink: true, days: true };
}
/** The year's rows after its categories: days with nothing spent (optional: the first to go when the receipt is full),
 *  and the top shop when the sharer asks for it. */
export const yearRows = (y, names) => [y.noSpend && [t('Days with nothing spent'), String(y.noSpend), null, 'optional'], names && y.shop && [t('Your most-visited shop'), `${y.shop.name} · ${t('{0} visits', y.shop.n)}`]].filter(Boolean);
/** What the share sheet's caption says: first person, then the link on its own line (tappable in WhatsApp). Sample data
 *  says nothing about "me": just the link. */
export function caption(kind, d, sample) {
  const say = sample ? '' : {
    month: () => t('Where my money went in {0}, sorted by Tally. Free, no sign-up.', d.long || d.label),
    year: () => t('My {0}, sorted with Tally. Free, no sign-up.', d.year),
    book: () => t('One sticker for every day I log my spending. My {0} sticker book, in Tally.', d.long || d.label),
    goal: () => t('Saved for {0}! Tracked with Tally, free.', d.name),
    streak: () => t('{0} days in a row of logging my spending. Tally, free.', d.streak),
    split: () => t('Our bill, split item by item with Tally.'),
  }[kind]();
  return `${say ? `${say}\n` : ''}https://${URL_TEXT}`;
}
/** The stickers stuck on a month: its last logged day's and the logged day's nearest the middle (only days logged). */
export const stickerDays = (filled, n) => {
  const days = [...filled].sort((a, b) => a - b), last = days.at(-1), mid = days.filter(d => d !== last).sort((a, b) => Math.abs(a - n / 2) - Math.abs(b - n / 2) || a - b)[0];
  return [last, mid].filter(Boolean);
};
/** A month's name for the picture: "October" + "2026" (a custom start day: its date range, no year line); long: one line. */
export function monthName(ym, sd = 1) {
  if (sd !== 1) return { name: fmtMonth(ym, sd), year: '', long: fmtMonth(ym, sd) };
  const [y, m] = ym.split('-').map(Number), cjk = /^(zh|ja)/.test(getLang());
  const name = cjk ? `${m}月` : new Intl.DateTimeFormat(langTag(), { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
  return { name, year: String(y), long: cjk ? fmtMonth(ym) : `${name} ${y}` };
}

// ---- drawing ------------------------------------------------------------------------------------------------------
let LANG = 'en';   // the language of the picture being drawn (one at a time)
const STACK = { ta: '"Noto Sans Tamil", "Nirmala UI", ', zh: '"Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei", ', 'zh-Hant': '"Noto Sans CJK TC", "Noto Sans TC", "Microsoft JhengHei", ', ja: '"Noto Sans CJK JP", "Noto Sans JP", "Yu Gothic", ' };
const F = {
  sans: w => px => `${w} ${px}px "Instrument Sans", ${STACK[LANG] || ''}system-ui, sans-serif`,
  serif: px => `italic 400 ${px}px "Instrument Serif", Georgia, serif`,
  mono: px => `500 ${px}px "JetBrains Mono", ${STACK[LANG] || ''}ui-monospace, monospace`,
};
const LH = () => (LANG === 'ta' ? 1.35 : /^(zh|ja)/.test(LANG) ? 1.25 : 1.15);   // Tamil's vowel signs sit above and below
const rad = d => d * Math.PI / 180;
const track = (g, px) => { if ('letterSpacing' in g) g.letterSpacing = `${px}px`; };

// The brand fonts (the landing's), loaded only when a picture is made (the service worker keeps them, sw.js). A font that
// doesn't arrive (offline before the first share) leaves the fallback after ms: never block the share.
const FILES = [['Instrument Sans', 'instrument-sans-latin.woff2', { weight: '400 700' }], ['Instrument Serif', 'instrument-serif-italic-latin.woff2', { style: 'italic' }], ['JetBrains Mono', 'jetbrains-mono-500-latin.woff2', { weight: '500' }]];
let fontsP;
const brandFonts = (ms = 3000) => Promise.race([fontsP ||= Promise.all(FILES.map(([f, file, d]) => {
  const ff = new FontFace(f, `url(${new URL(`../fonts/${file}`, import.meta.url)})`, d); document.fonts.add(ff); return ff.load().catch(() => {});
})), new Promise(r => setTimeout(r, ms))]);

const imgs = new Map();
const image = svg => { if (!imgs.has(svg)) imgs.set(svg, new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; })); return imgs.get(svg); };
const stickerImg = inner => image(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256">${inner}</svg>`);
const castBox = who => (who === 'duit' ? VIEW.duit : VIEW.person).split(' ').map(Number);
const castImg = who => { const [, , w, h] = castBox(who); return image(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${castBox(who).join(' ')}" width="${w * 6}" height="${h * 6}"><defs>${DEFS}</defs>${CAST[who]}</svg>`); };
const castH = (who, w) => { const [, , vw, vh] = castBox(who); return w * vh / vw; };

/** Text with its box's top at y, or (base) its first line's baseline at y; x is its left, right or centre edge by align.
 *  Shrunk from size to min to fit maxW, then wrapped to `lines`. upper + tr (letter-spacing, em) only for Latin text.
 *  dry: measure only. → { h, w, size, lines } */
function text(g, s, x, y, { font, size, min = size, maxW = 1e4, lines = 1, color = C.ink, align = 'left', tr = 0, upper = false, lh = LH(), base = false, dry = false }) {
  s = String(s); const lat = latin(s), sp = lat ? tr : 0;
  if (upper && lat) s = s.toLocaleUpperCase('en');
  const m = (str, z) => { g.font = font(z); track(g, sp * z); return g.measureText(str).width; };
  const f = fitLines(m, s, maxW, size, min, lines, LANG), w = Math.max(...f.lines.map(l => m(l, f.size)));
  if (!dry) { g.fillStyle = color; g.textAlign = align; g.textBaseline = base ? 'alphabetic' : 'top'; f.lines.forEach((l, i) => g.fillText(l, x, y + i * f.size * lh)); }
  track(g, 0);
  return { h: f.lines.length * f.size * lh, w, size: f.size, lines: f.lines.length };
}
const oneLine = r => r.lines === 1;
/** The largest size (size down to min) at which s fits maxW on one line: for values, which never wrap. → { size, w } */
function single(g, s, font, size, min, maxW) {
  let w; for (; ; size -= 1) { g.font = font(size); w = g.measureText(s).width; if (w <= maxW || size <= min) return { size, w }; }
}
/** A kicker: small, uppercase and tracked in Latin; 4 px bigger and plain in Tamil and CJK. */
const kicker = (g, s, x, y, o) => text(g, s, x, y, { font: F.sans(o.weight || 600), lines: 2, upper: true, tr: .14, ...o, size: latin(s) ? o.size : o.size + 4, min: Math.round(o.size * .8) });
/** The display line (a month, a theme): Instrument Serif italic, shrunk to 60% on one line before it takes two; anything
 *  with Tamil or CJK in sans 700, upright, at two thirds the size (a fake italic looks broken there). */
function display(g, s, x, y, { size, maxW, color, dry, align }) {
  const lat = latin(s), o = lat ? { font: F.serif, size, lh: 1.05 } : { font: F.sans(700), size: Math.round(size * .66) }, min = Math.round(o.size * .6);
  if (!lat) y += 12;
  const one = text(g, s, x, y, { ...o, min, maxW, dry: true, align });
  const r = oneLine(one) ? text(g, s, x, y, { ...o, min, maxW, color, dry, align }) : text(g, s, x, y, { ...o, size: min, maxW, lines: 2, color, dry, align });
  return { ...r, h: r.h + (lat ? 0 : 12) };
}

function mark(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s / 32, s / 32);
  g.fillStyle = C.blue; g.beginPath(); g.roundRect(0, 0, 32, 32, 9); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(9, 10); g.lineTo(23, 10); g.moveTo(16, 10); g.lineTo(16, 23); g.stroke();
  g.restore();
}
const INK = { paper: { ink: C.ink, soft: C.mute, url: C.blue, rule: 'rgba(10,15,30,.12)' }, night: { ink: '#FFFFFF', soft: C.moon, url: '#FFFFFF', rule: 'rgba(255,255,255,.14)' } };
const freeLine = () => `${t('Free')} · ${t('No sign-up')} ·`;
/** The signature, the same on every picture. Square: a rule at 904, then [T] Tally  Snap a receipt. Every item, sorted.
 *                                                                              Free · No sign-up · tallymy.github.io
 *  Story: three centred rows from y 1430. When room runs out: the URL stays, "Free · No sign-up" shrinks, the tagline
 *  shrinks then goes (long Tamil). rule: false on the sticker book (its card's edge is the rule). */
function footer(g, W, col, story, rule = true) {
  const tag = t('Snap a receipt. Every item, sorted.');
  if (!story) {
    if (rule) { g.fillStyle = col.rule; g.fillRect(72, 904, 936, 2); }
    mark(g, 72, 930, 68);
    const tw = text(g, 'Tally', 164, 958, { font: F.sans(700), size: 34, color: col.ink, base: true }).w;
    const tg = text(g, tag, 0, 0, { font: F.sans(400), size: 26, min: 20, maxW: 1008 - 164 - tw - 16, dry: true });
    if (oneLine(tg)) text(g, tag, 164 + tw + 16, 958, { font: F.sans(400), size: tg.size, color: col.soft, base: true });
    const uw = text(g, URL_TEXT, 0, 0, { font: F.mono, size: 32, dry: true }).w;
    const fw = text(g, freeLine(), 164, 1000, { font: F.sans(400), size: 26, min: 18, maxW: 844 - 12 - uw, color: col.soft, base: true }).w;
    text(g, URL_TEXT, 164 + fw + 12, 1000, { font: F.mono, size: 32, color: col.url, base: true });
    return;
  }
  const tw = text(g, 'Tally', 0, 0, { font: F.sans(700), size: 50, dry: true }).w, x0 = (W - 76 - 20 - tw) / 2;
  mark(g, x0, 1430, 76); text(g, 'Tally', x0 + 96, 1486, { font: F.sans(700), size: 50, color: col.ink, base: true });
  const big = [...(segs(tag, LANG, 'grapheme') || tag)].length > 40, tg = text(g, tag, 0, 0, { font: F.sans(400), size: big ? 26 : 32, min: 22, maxW: 888, dry: true });
  if (oneLine(tg)) text(g, tag, W / 2, 1548, { font: F.sans(400), size: tg.size, color: col.soft, align: 'center', base: true });
  const uw = text(g, URL_TEXT, 0, 0, { font: F.mono, size: 36, dry: true }).w;
  const fr = text(g, freeLine(), 0, 0, { font: F.sans(400), size: 30, min: 20, maxW: 888 - 14 - uw, dry: true }), x1 = (W - fr.w - 14 - uw) / 2;
  text(g, freeLine(), x1, 1600, { font: F.sans(400), size: fr.size, color: col.soft, base: true });
  text(g, URL_TEXT, x1 + fr.w + 14, 1600, { font: F.mono, size: 36, color: col.url, base: true });
}

/** A sticker, die-cut: its white silhouette drawn 8 times around it (with the shadow), then the sticker. Without
 *  ctx.filter (an old WebView) it is drawn plain. */
function sticker(g, img, x, y, s, rot) {
  if (!img) return;
  g.save(); g.translate(x + s / 2, y + s / 2); g.rotate(rad(rot));
  if ('filter' in g) {
    g.filter = 'brightness(0) invert(1)'; g.shadowColor = 'rgba(10,15,30,.25)'; g.shadowBlur = 14; g.shadowOffsetY = 10;
    for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2]]) { g.drawImage(img, dx - s / 2, dy - s / 2, s, s); g.shadowColor = 'transparent'; }
    g.filter = 'none';
  }
  g.drawImage(img, -s / 2, -s / 2, s, s); g.restore();
}
async function cast(g, who, x, y, w, rot = 0, flip = false) {
  const img = await castImg(who), h = castH(who, w); if (!img) return;
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rad(rot)); if (flip) g.scale(-1, 1); g.drawImage(img, -w / 2, -h / 2, w, h); g.restore();
}
/** The colour strip: each part's width by its share, 5 px apart, rounded. */
function strip(g, x, y, w, h, ps) {
  const sum = ps.reduce((s, p) => s + p.v, 0) || 1, gap = 5, room = w - gap * (ps.length - 1); let cx = x;
  for (const p of ps) { const pw = Math.max(4, room * p.v / sum); g.fillStyle = p.color; g.beginPath(); g.roundRect(cx, y, pw, h, 3); g.fill(); cx += pw + gap; }
}
function dashed(g, x1, x2, y) { g.save(); g.strokeStyle = C.rule; g.lineWidth = 3; g.setLineDash([9, 6]); g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke(); g.restore(); }
function background(g, W, H, night, cyk = .56) {
  g.fillStyle = night ? C.night : C.paper; g.fillRect(0, 0, W, H);
  if (!night) return;
  const cy = H * cyk, grd = g.createRadialGradient(W / 2, cy, 0, W / 2, cy, 820);
  grd.addColorStop(0, 'rgba(47,84,235,.42)'); grd.addColorStop(1, 'rgba(47,84,235,0)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
}
/** "Sample data", stamped across the data (rotated −12°): a picture of the sample never passes for someone's own money. */
function stamp(g, x, y, s) {
  const w = t('Sample data'), m = text(g, w, 0, 0, { font: F.sans(700), size: s, upper: true, tr: .12, dry: true });
  g.save(); g.translate(x, y); g.rotate(rad(-12)); g.globalAlpha = .88; g.strokeStyle = C.stamp; g.lineWidth = 5;
  g.beginPath(); g.roundRect(0, 0, m.w + 44, s * LH() + 12, 14); g.stroke();
  text(g, w, 22, 6, { font: F.sans(700), size: s, upper: true, tr: .12, color: C.stamp }); g.restore();
}
function arrow(g, x, y, s, color) {   // ↓, drawn (the glyph isn't in every font)
  g.save(); g.strokeStyle = color; g.lineWidth = s * .16; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x + s / 2, y); g.lineTo(x + s / 2, y + s); g.moveTo(x + s * .12, y + s * .62); g.lineTo(x + s / 2, y + s); g.lineTo(x + s * .88, y + s * .62); g.stroke(); g.restore();
}
const heroLabelColor = h => (h.label === t('Kept') ? C.blue : C.ink);
/** The story receipt's hero row: label above its note on the left, the big value on the right, on the note's baseline. */
function heroRow(g, h, x, w, y, { size, label, note, dry }) {
  const vc = h.ink ? C.ink : C.blue, ax = h.down ? size * .5 : 0;
  const v = text(g, h.value, 0, 0, { font: F.mono, size, min: 64, maxW: w * .62 - ax, tr: -.05, dry: true }), base = y + v.size * .8;
  const lw = w - v.w - ax - 24, nn = h.note ? text(g, h.note, 0, 0, { font: F.sans(400), size: note, min: Math.round(note * .8), maxW: lw, lines: 2, dry: true }) : null;
  const nb = nn ? base - (nn.lines - 1) * nn.size * LH() : base;   // the note's first baseline (its last one is the value's)
  kicker(g, h.label, x, (nn ? nb - nn.size : base) - label * 1.5, { size: label, weight: 700, color: heroLabelColor(h), maxW: lw, dry });
  if (nn) text(g, h.note, x, nb, { font: F.sans(400), size: nn.size, maxW: lw, lines: 2, color: C.mute, base: true, dry });
  if (h.down && !dry) arrow(g, x + w - v.w - ax, base - v.size * .66, v.size * .46, vc);
  text(g, h.value, x + w, base, { font: F.mono, size: v.size, tr: -.05, align: 'right', color: vc, base: true, dry });
  return v.size + 6;
}

/** The receipt: header (mark, Tally, date), rows (swatch, label, value on one baseline; only labels wrap), an optional
 *  total and hero row, the colour strip and the thank-you line, with a torn bottom edge. Laid out once dry so its height
 *  (and the paper) is known. o.stamp: "Sample data" stamped over the rows. → height */
function slip(g, o) {
  const { x, y, w, rot, fs, pad } = o, r = k => Math.round(fs * k), inner = w - pad * 2;
  const lay = dry => {
    let cy = pad;
    if (!dry) mark(g, pad, cy, r(1.2));
    text(g, 'Tally', pad + r(1.5), cy + r(.92), { font: F.sans(700), size: r(.85), base: true, dry });
    text(g, o.date, w - pad, cy + r(.92), { font: F.mono, size: r(.7), color: C.mute, align: 'right', base: true, dry });
    cy += r(1.2) + r(.6); if (!dry) dashed(g, pad, w - pad, cy); cy += r(.5);
    for (const [label, value, color] of o.rows) {
      cy += r(.26);
      // The value never wraps: it shrinks a little beside its label (which may take 2 lines). A label that would need
      // more, or a value still too wide, puts the value on its own line under the label, right-aligned.
      const sw = color ? r(.56) + 14 : 0, base = cy + fs * .82, lo = { font: F.sans(400), size: fs, min: r(.8), lines: 2, color: o.labelColor || C.ink, base: true };
      let v = single(g, value, F.mono, fs, r(.75), inner * .62);
      const stack = v.w > inner * .62 || text(g, label, 0, 0, { ...lo, maxW: inner - v.w - 20 - sw, dry: true }).lines > 2;
      if (stack) v = single(g, value, F.mono, fs, r(.7), inner);
      const lab = text(g, label, pad + sw, base, { ...lo, maxW: stack ? inner - sw : inner - v.w - 20 - sw, dry });
      text(g, value, w - pad, stack ? base + lab.h : base, { font: F.mono, size: v.size, align: 'right', base: true, dry });
      if (color && !dry) { g.fillStyle = color; g.beginPath(); g.roundRect(pad, base - fs * .6, r(.56), r(.56), r(.16)); g.fill(); }
      cy += (stack ? lab.h + fs * 1.15 : Math.max(lab.h, fs * 1.15)) + r(.26);
    }
    if (o.total || o.hero) { cy += r(.4); if (!dry) dashed(g, pad, w - pad, cy); cy += r(.55); }
    if (o.total) {
      const base = cy + fs * .82;
      kicker(g, o.total[0], pad, base - r(.8) * .78, { size: r(.8), weight: 700, maxW: inner * .5, dry });
      text(g, o.total[1], w - pad, base, { font: F.mono, size: fs, align: 'right', base: true, dry }); cy += fs * 1.35;
    }
    if (o.hero) cy += r(.4) + heroRow(g, o.hero, pad, inner, cy + r(.4), { size: o.heroSize, label: r(.8), note: r(.88), dry });
    cy += r(.8); if (!dry) strip(g, pad, cy, inner, o.stripH, o.strip); cy += o.stripH + r(.6);
    cy += text(g, THANKS[LANG] || THANKS.en, w / 2, cy, { font: F.mono, size: r(.66), align: 'center', color: C.mute, dry }).h;
    if (o.stamp && !dry) stamp(g, 81, 162, o.stamp);
    return cy + pad + 22;
  };
  const h = lay(true);
  if (o.dry) return h;
  g.save(); g.translate(x, y); g.rotate(rad(rot));
  g.shadowColor = 'rgba(10,15,30,.30)'; g.shadowBlur = 60; g.shadowOffsetY = 30;
  g.fillStyle = C.slip; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0);
  const n = Math.round(w / 18); for (let i = n; i >= 0; i--) g.lineTo(i * w / n, h - (i % 2 ? 12 : 0));   // torn edge
  g.closePath(); g.fill(); g.shadowColor = 'transparent';
  lay(false); g.restore();
  return h;
}
/** A receipt that ends by maxBottom (never into the footer): its rows shrink in 2 px steps to 80%, then the optional
 *  rows (days with nothing spent) go, then rows to 70% with a smaller hero; the top shop the sharer chose never goes.
 *  → the options to draw it with */
function fitSlip(g, o, maxBottom) {
  const min = Math.round(o.fs * .8), rows = o.rows.filter(r => !r[3]), tries = [];
  for (let fs = o.fs; fs >= min; fs -= 2) tries.push({ fs });
  tries.push({ fs: min, rows });
  // Past that (a Tamil year with its top shop, as a story): smaller still, and a smaller hero.
  for (let fs = min - 2; fs >= Math.round(o.fs * .7); fs -= 2) tries.push({ fs, rows, heroSize: o.heroSize && Math.min(o.heroSize, 100) });
  for (const x of tries) if (o.y + slip(g, { ...o, ...x, dry: true }) <= maxBottom) return { ...o, ...x };
  return { ...o, ...tries.at(-1) };
}
export const LIMIT = { chat: 880, story: 1400 };   // where a receipt must end: above the footer
export const slipHeight = (g, o) => slip(g, { ...o, dry: true });
/** The month's or year's receipt as it will be drawn (measured, fitted to LIMIT), and its hero: one layout for drawing and
 *  for the test that no receipt ever reaches the footer. g: a 2D context (or anything with font + measureText). */
export function receipt(g, kind, d, o) {
  LANG = getLang();
  const year = kind === 'year', y = d.y, ps = parts(d.byCat, d.info, !o.amounts);
  const h = year ? hero({ spent: y.spent, inn: y.income, got: y.logged, well: d.well }, o.amounts) : hero(d, o.amounts);
  const rows = [...catRows(ps, o.amounts), ...(year ? yearRows(y, o.names) : [])];
  const total = o.amounts && !h.ink ? [t('Spent'), rmWhole(ps.reduce((s, p) => s + p.rm, 0) * 100)] : null;
  const kick = o.sample ? t('Sample data') : t('Where my money went'), c = { rows, total, strip: ps, date: year ? d.year : d.date };
  if (!o.story) return { ps, h, kick, so: fitSlip(g, { ...c, x: 572, y: 196, w: 436, rot: 2, fs: 27, pad: 36, stripH: 48, stamp: o.sample && 35 }, LIMIT.chat) };
  const kh = kicker(g, kick, 0, 0, { size: 26, maxW: 888, dry: true }).h;
  const top = year ? Math.max(600, 250 + kh + 4 + text(g, d.year, 0, 0, { font: F.sans(700), size: 230, tr: -.04, lh: 1, dry: true }).h + (latin(t('sorted.')) ? 70 : 110))
    : Math.max(596, 250 + kh + 8 + display(g, d.name, 0, 0, { size: 172, maxW: 860, dry: true }).h + (d.year ? 90 : 40));
  return { ps, h, kick, top, so: fitSlip(g, { ...c, x: 120, y: top, w: 840, rot: -.5, fs: 32, pad: 52, hero: h, heroSize: 124, stripH: 52, stamp: o.sample && 42 }, LIMIT.story) };
}
// The receipt's thank-you, bilingual like a Malaysian till slip (not translated by t: it is part of the joke).
const THANKS = { en: 'Terima kasih · Thank you', ms: 'Terima kasih · Thank you', ta: 'நன்றி · Terima kasih', zh: '谢谢 · Terima kasih', 'zh-Hant': '謝謝 · Terima kasih', ja: 'ありがとう · Terima kasih' };

// ---- the pictures: draw(g, W, H, d, o) with o = { story, amounts, names, sample } -----------------------------------
const daysLine = (g, got, n, x, y, col) => {   // "28/30 days logged", on one baseline
  const a = text(g, String(got), x, y, { font: F.mono, size: 40, color: col.ink, base: true }).w;
  const b = n ? text(g, `/${n}`, x + a, y, { font: F.mono, size: 40, color: col.soft, base: true }).w : 0;
  text(g, t('days logged'), x + a + b + 12, y, { font: F.sans(400), size: 28, maxW: 460 - a - b, color: col.soft, base: true });
};
/** The left column of a square (month, year): the hero label, the value (after its ↓), the note; → its bottom. */
function heroLeft(g, h, y, col, amounts) {
  const vc = h.ink ? C.ink : C.blue, size = amounts ? 100 : 136, ax = h.down ? size * .46 : 0;
  const lab = kicker(g, h.label, 72, y, { size: 24, weight: 700, color: heroLabelColor(h), maxW: 450 }).h;
  const v = text(g, h.value, 64 + ax, y + lab + 6, { font: F.mono, size, min: 64, maxW: 450 - ax, color: vc, tr: -.05, lh: 1.05 });
  if (h.down) arrow(g, 70, y + lab + 6 + v.size * .22, v.size * .4, vc);
  let b = y + lab + 6 + v.h;
  if (h.note) b += 8 + text(g, h.note, 72, b + 8, { font: F.sans(400), size: 28, min: 22, maxW: 450, lines: 2, color: col.soft }).h;
  return b;
}

async function drawMonth(g, W, H, d, o) {
  const col = INK[o.story ? 'night' : 'paper'], { h, kick, top, so } = receipt(g, 'month', d, o), stk = await Promise.all(d.stickers.map(stickerImg));
  background(g, W, H, o.story);
  if (!o.story) {
    const kh = kicker(g, kick, 72, 150, { size: 22, color: o.sample ? C.stamp : col.soft, maxW: 440 }).h;
    const dh = display(g, d.name, 66, 150 + kh + 8, { size: 128, maxW: 440, color: col.ink }).h;
    if (d.year) text(g, d.year, 72, 150 + kh + 8 + dh + 6, { font: F.mono, size: 30, color: col.soft });
    const hb = heroLeft(g, h, Math.max(400, 150 + kh + dh + 80), col, o.amounts);
    if (!h.days) daysLine(g, d.got, d.n, 72, Math.max(hb + 64, o.amounts ? 640 : 700), col);
    const sh = slip(g, so);
    await cast(g, 'duit', 796, so.y - castH('duit', 200) + 12, 200, 2);
    if (stk[0]) sticker(g, stk[0], 500, Math.min(so.y + sh - 40, 740), 128, -10);
    footer(g, W, col, false);
  } else {
    const kh = kicker(g, kick, 96, 250, { size: 26, color: o.sample ? C.stamp : col.soft, maxW: 888 }).h;
    const dh = display(g, d.name, 88, 250 + kh + 8, { size: 172, maxW: 860, color: '#FFFFFF' }).h;
    if (d.year) text(g, d.year, 96, 250 + kh + 8 + dh + 10, { font: F.mono, size: 40, color: col.soft });
    const sh = slip(g, so);
    await cast(g, 'duit', 690, top - castH('duit', 260) + 18, 260, -.5);
    if (stk[0]) sticker(g, stk[0], 30, top + sh * .62, 140, -12);
    footer(g, W, col, true);
  }
}

async function drawYear(g, W, H, d, o) {
  const col = INK[o.story ? 'night' : 'paper'], { h, kick, top, so } = receipt(g, 'year', d, o), word = t('sorted.'), wl = latin(word);
  background(g, W, H, o.story, .5);
  if (!o.story) {
    const kh = kicker(g, kick, 72, 150, { size: 22, color: o.sample ? C.stamp : col.soft, maxW: 440 }).h;
    const yh = text(g, d.year, 64, 150 + kh + 4, { font: F.sans(700), size: 150, color: col.ink, tr: -.04, lh: 1 }).h;
    text(g, word, 72, 150 + kh + yh + 4, wl ? { font: F.serif, size: 64, maxW: 450, color: C.blue } : { font: F.sans(700), size: 40, maxW: 450, color: C.blue });
    const hb = heroLeft(g, h, 430, col, o.amounts);
    if (!h.days) daysLine(g, d.y.logged, 0, 72, Math.max(hb + 64, 700), col);
    const sh = slip(g, so);
    await cast(g, 'duit', 796, so.y - castH('duit', 200) + 12, 200, 2);
    const foot = Math.min(so.y + sh + 40, 890);   // the cast stands at the receipt's foot, left of its words
    await cast(g, 'aina', 420, foot - castH('aina', 110), 110);
    await cast(g, 'wei', 506, foot + 6 - castH('wei', 96), 96);
    footer(g, W, col, false);
  } else {
    const kh = kicker(g, kick, 96, 250, { size: 26, color: o.sample ? C.stamp : col.soft, maxW: 888 }).h;
    const yh = text(g, d.year, 84, 250 + kh + 4, { font: F.sans(700), size: 230, color: '#FFFFFF', tr: -.04, lh: 1 }).h;
    if (wl) { g.save(); g.translate(640, 250 + kh + yh - 60); g.rotate(rad(-5)); text(g, word, 0, 0, { font: F.serif, size: 116, maxW: 400, color: C.glow, lh: 1 }); g.restore(); }
    else text(g, word, 96, 250 + kh + yh + 10, { font: F.sans(700), size: 70, maxW: 888, color: C.glow });
    const sh = slip(g, so);
    // The cast stands at the receipt's foot (feet 40 px below its torn edge), at its sides: never over its words.
    // Duit joins them (on the receipt's top he'd sit on "sorted.").
    const foot = Math.min(top + sh + 40, 1420);
    await cast(g, 'aina', 20, foot - castH('aina', 150), 150);
    await cast(g, 'wei', 126, foot + 8 - castH('wei', 126), 126);
    await cast(g, 'duit', 770, foot - castH('duit', 150), 150);
    await cast(g, 'raju', 912, foot - castH('raju', 156), 156, 0, true);
    footer(g, W, col, true);
  }
}

async function drawBook(g, W, H, d, o) {
  const pal = d.colours?.[o.story ? 'dark' : 'light'], night = o.story, soft = night ? 'rgba(255,255,255,.7)' : '#8B6F62';
  const bg = pal || (night ? [C.night, '#141B33', '#1E2747'] : [C.paper, C.slip, '#E9E5DA']), accent = d.colours?.accent || C.blue;
  const col = { ink: night ? '#FFFFFF' : C.ink, soft, url: night ? '#FFFFFF' : accent };
  const art = await Promise.all(d.days.map(x => x.svg && stickerImg(x.svg)));
  g.fillStyle = bg[0]; g.fillRect(0, 0, W, H);
  const cell = (k, x, y, size) => {   // a logged day's sticker, or a dashed circle with the day's number (never a locked sticker)
    if (art[k]) return sticker(g, art[k], x, y, size, ((d.days[k].day * 37) % 13) - 6);
    const r = size * .375, cx = x + size / 2, cy = y + size / 2;
    g.save(); g.strokeStyle = night ? 'rgba(255,255,255,.3)' : '#D9C3B0'; g.lineWidth = 3; g.setLineDash([7, 6]); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.restore();
    text(g, String(d.days[k].day), cx, cy + size * .1, { font: F.mono, size: Math.round(size * .27), align: 'center', color: night ? 'rgba(255,255,255,.45)' : '#B8A08C', base: true });
  };
  const count = (x, y, size) => {   // "28/30 days logged", on one baseline at y
    const a = text(g, String(d.got), x, y, { font: F.mono, size, color: col.ink, tr: -.05, base: true }).w;
    const b = text(g, `/${d.n}`, x + a, y, { font: F.mono, size, color: d.got === d.n ? accent : (night ? 'rgba(255,255,255,.4)' : '#C4AE9C'), tr: -.05, base: true }).w;
    text(g, t('days logged'), x + a + b + 18, y, { font: F.sans(500), size: Math.round(size * .31), color: soft, base: true });
  };
  const kick = `${d.long} · ${t('Sticker book')}`, hook = t('One sticker for every day I log.');
  if (!o.story) {
    g.fillStyle = bg[1]; g.beginPath(); g.roundRect(40, 40, W - 80, 864, 36); g.fill(); g.strokeStyle = bg[2]; g.lineWidth = 2; g.stroke();
    const kh = kicker(g, kick, 96, 88, { size: 22, color: soft, maxW: 680 }).h;
    display(g, d.title, 90, 88 + kh + 2, { size: 118, maxW: 680, color: accent });
    await cast(g, 'duit', 790, 110, 200);
    d.days.forEach((_, k) => cell(k, 104 + (k % 8) * 110, 268 + Math.floor(k / 8) * 112, 96));
    count(96, 800, 96);
    text(g, hook, 96, 836, { font: F.sans(500), size: 30, min: 22, maxW: 880, lines: 2, color: col.ink });
    if (o.sample) stamp(g, 700, 330, 35);
    footer(g, W, col, false, false);
  } else {
    const kh = kicker(g, kick, 96, 250, { size: 26, color: soft, maxW: 888 }).h;
    const th = display(g, d.title, 88, 250 + kh + 8, { size: 172, maxW: 660, color: '#FFFFFF' }).h;
    await cast(g, 'duit', 770, 300, 210);
    // Every block below the measured one above it: a long theme pushes the count, hook and grid down, never under them.
    const cy = Math.max(250 + kh + 8 + th + 40, 520) + 100;
    count(96, cy, 112);
    const hh = text(g, hook, 96, cy + 30, { font: F.sans(500), size: 32, min: 24, maxW: 888, lines: 2, color: soft }).h;
    const gy = cy + 30 + hh + 36, pitch = Math.min(140, (1400 - gy) / 6), size = Math.min(116, pitch - 12);   // 6 rows always end above the footer
    d.days.forEach((_, k) => cell(k, 96 + (k % 6) * 150 + (116 - size) / 2, gy + Math.floor(k / 6) * pitch, size));
    if (o.sample) stamp(g, 640, 600, 42);
    footer(g, W, col, true);
  }
}

/** Confetti in the category colours, from a seed (the goal's id): the same goal always gets the same picture. */
function confetti(g, n, x0, y0, w, h, seed) {
  let s = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 233280, 7);
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280, cols = ['#6D28D9', '#009E73', '#E69F00', '#0072B2', '#56B4E9', C.blue];
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w, y = y0 + r() * h, bw = 10 + r() * 10, bh = 18 + r() * 14, a = r() * Math.PI;
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = cols[i % cols.length]; g.beginPath(); g.roundRect(-bw / 2, -bh / 2, bw, bh, 3); g.fill(); g.restore();
  }
}
/** The goal's name: the user's words, shrunk to fit, then 2 lines, then (the one place it's allowed) cut with "…". → lines */
function goalName(g, s, x, y, { size, min, maxW, color }) {
  if (!latin(s)) { size = Math.round(size * .65); min = Math.round(min * .65); }
  const font = latin(s) ? F.serif : F.sans(700), m = (str, z) => { g.font = font(z); return g.measureText(str).width; };
  let f = fitLines(m, s, maxW, size, min, 1, LANG); if (f.lines.length > 1) f = fitLines(m, s, maxW, min, min, 2, LANG);
  const lines = f.lines.slice(0, 2);
  if (f.lines.length > 2) { let l = lines[1]; while (l && m(`${l}…`, f.size) > maxW) l = [...l].slice(0, -1).join(''); lines[1] = `${l.trimEnd()}…`; }
  g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'top'; g.font = font(f.size);
  lines.forEach((l, i) => g.fillText(l, x, y + i * f.size * 1.02));
  return lines.length;
}
function check(g, cx, cy, s) {
  g.fillStyle = C.blue; g.beginPath(); g.arc(cx, cy, s / 2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#FFFFFF'; g.lineWidth = s * .094; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(cx - s * .2, cy + s * .02); g.lineTo(cx - s * .06, cy + s * .16); g.lineTo(cx + s * .2, cy - s * .14); g.stroke();
}
async function drawGoal(g, W, H, d, o) {
  const col = INK[o.story ? 'night' : 'paper'], tin = await stickerImg(TIN), value = o.amounts ? rmWhole(d.target) : '100%';
  background(g, W, H, o.story, .44);
  // The art zone (confetti, the savings tin, Duit), moved down and smaller when the name takes 2 lines.
  const art = async (x0, y0, w, h, n, tinAt, tinS, duitAt, duitW, two) => {
    g.save(); if (two) { const cx = x0 + w / 2, cy = y0 + h / 2; g.translate(cx, cy + 110); g.scale(.8, .8); g.translate(-cx, -cy); }
    confetti(g, n, x0, y0, w, h, d.id || d.name); sticker(g, tin, tinAt[0], tinAt[1], tinS, -4); await cast(g, 'duit', duitAt[0], duitAt[1], duitW); g.restore();
  };
  if (!o.story) {
    kicker(g, t('Goal reached'), 72, 110, { size: 24, weight: 700, color: C.blue, maxW: 900 });
    const two = goalName(g, d.name, 64, 150, { size: 148, min: 88, maxW: 936, color: col.ink }) > 1;
    await art(300, 330, 560, 300, 26, [405, 330], 270, [690, 470], 200, two);
    g.fillStyle = C.blue; g.beginPath(); g.roundRect(72, 684, 936, 32, 16); g.fill(); check(g, 976, 700, 64);
    kicker(g, t('Saved up'), 72, 750, { size: 24, weight: 700, color: col.ink, maxW: 500 });
    text(g, value, 1008, 778, { font: F.mono, size: 40, align: 'right', color: o.amounts ? col.ink : C.blue, base: true });
    if (o.sample) stamp(g, 700, 330, 35);
    footer(g, W, col, false);
  } else {
    kicker(g, t('Goal reached'), 96, 250, { size: 28, weight: 700, color: C.glow, maxW: 888 });
    const two = goalName(g, d.name, 88, 290, { size: 188, min: 112, maxW: 888, color: '#FFFFFF' }) > 1;
    await art(160, 560, 760, 520, 40, [330, 600], 420, [690, 830], 280, two);
    g.save(); g.shadowColor = 'rgba(47,84,235,.6)'; g.shadowBlur = 40; g.fillStyle = C.blue; g.beginPath(); g.roundRect(96, 1150, 888, 40, 20); g.fill(); g.restore();
    check(g, 948, 1170, 80);
    kicker(g, t('Saved up'), 96, 1232, { size: 28, weight: 700, color: '#FFFFFF', maxW: 500 });
    text(g, value, 984, 1266, { font: F.mono, size: 48, align: 'right', color: o.amounts ? '#FFFFFF' : C.glow, base: true });
    if (o.sample) stamp(g, 640, 600, 42);
    footer(g, W, col, true);
  }
}

async function drawStreak(g, W, H, d, o) {
  const col = INK[o.story ? 'night' : 'paper'], n = String(d.streak);
  // The last 7 days: logged (a tick), a rest day (an outline: it kept the streak but wasn't logged), not logged yet; today ringed.
  const week = (x, y, s, gap) => d.week.forEach(({ k, label, today }, i) => {
    const cx = x + i * (s + gap) + s / 2, cy = y + s / 2;
    if (today) { g.fillStyle = 'rgba(47,84,235,.22)'; g.beginPath(); g.arc(cx, cy, s / 2 + 6, 0, Math.PI * 2); g.fill(); }
    if (k === 'logged') check(g, cx, cy, s);
    else { g.save(); g.strokeStyle = k === 'rest' ? C.blue : (o.story ? 'rgba(255,255,255,.3)' : 'rgba(10,15,30,.2)'); g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, s / 2 - 2, 0, Math.PI * 2); g.stroke(); g.restore(); }
    text(g, label, cx, y + s + 12, { font: F.mono, size: 26, align: 'center', color: col.soft, lh: 1 });
  });
  background(g, W, H, o.story, .45);
  if (!o.story) {
    const kh = kicker(g, t('Logging streak'), 72, 84, { size: 24, weight: 700, color: col.soft, maxW: 600 }).h;
    text(g, n, 84, 84 + kh - 14, { font: F.serif, size: n.length > 2 ? 300 : 380, color: C.blue, tr: -.04, lh: 1 });
    await cast(g, 'duit', 680, 190, 300);
    const hh = text(g, t('days in a row.'), 72, 470, { font: F.sans(600), size: 72, min: 52, maxW: 936, lines: 2, color: col.ink }).h;
    week(72, Math.min(Math.max(640, 470 + hh + 40), 750), 100, 22);
    if (o.sample) stamp(g, 700, 330, 35);
    footer(g, W, col, false);
  } else {
    const kh = kicker(g, t('Logging streak'), W / 2, 250, { size: 28, weight: 700, color: col.soft, maxW: 888, align: 'center' }).h;
    text(g, n, W / 2, 250 + kh + 4, { font: F.serif, size: n.length > 2 ? 440 : 560, color: '#FFFFFF', tr: -.04, align: 'center', lh: 1 });
    // Every block below the measured one above it (Tamil's headline takes 2 lines); Duit gets what room is left.
    const hh = text(g, t('days in a row.'), W / 2, 880, { font: F.sans(600), size: 92, min: 60, maxW: 888, lines: 2, align: 'center', color: '#FFFFFF' }).h;
    const wy = Math.max(1066, 880 + hh + 40), dy = wy + 108 + 60, dw = Math.min(220, (1410 - dy) * 64 / 46);
    week(96, wy, 108, 22);
    if (dw >= 140) await cast(g, 'duit', (W - dw) / 2, dy, dw);   // no room (a 2-line headline): no Duit rather than a tiny one
    if (o.sample) stamp(g, 640, 600, 42);
    footer(g, W, col, true);
  }
}

// Each picture: how to draw it, whether it can carry amounts or the top shop, the sheet's title, file name, share title,
// and its default format (the year is a story).
const PICS = {
  month: { draw: drawMonth, money: true, sheet: () => t('Share this month'), name: d => `tally-${d.ym}`, title: d => d.label },
  year: { draw: drawYear, money: true, names: true, story: true, sheet: () => t('Share as a picture'), name: d => `tally-${d.year}`, title: d => d.year },
  book: { draw: drawBook, sheet: () => t('Share this month'), name: d => `tally-stickers-${d.ym}`, title: d => d.label },
  goal: { draw: drawGoal, money: true, sheet: () => t('Share'), name: () => 'tally-goal', title: d => d.name },
  streak: { draw: drawStreak, sheet: () => t('Share'), name: d => `tally-streak-${d.streak}`, title: d => t('{0}-day logging streak', d.streak) },
};
/** Draws one picture → canvas. o: { story, amounts, names, sample }. */
export async function picture(kind, d, o) {
  await brandFonts();
  LANG = getLang();
  const [W, H] = o.story ? [1080, 1920] : [1080, 1080], c = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = c.getContext('2d');
  await PICS[kind].draw(g, W, H, d, o);
  c.dataset.jpeg = o.story || kind === 'book' ? '1' : '';   // painted art and the night's glow: a JPEG can be smaller
  return c;
}

/** The picture (a canvas or a blob) to the share sheet with the caption, or (no share sheet: a computer) saved, with the
 *  caption copied. A canvas with painted art or the night's glow goes as a JPEG (q .9) when that is smaller than its PNG. */
export async function send(c, name, title, text) {
  let blob = c instanceof Blob ? c : await new Promise(r => c.toBlob(r, 'image/png')); if (!blob) return;
  if (c.dataset?.jpeg) { const j = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); if (j && j.size < blob.size) blob = j; }
  const type = blob.type || 'image/png', file = new File([blob], `${name}.${type === 'image/jpeg' ? 'jpg' : 'png'}`, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title, text }); return; } catch (e) { if (e?.name === 'AbortError') return; }   // closed; else (some apps refuse text with a file) save it
  }
  download(file.name, blob, type);
  try { await navigator.clipboard.writeText(text); toast(t('Picture saved. Caption copied.'), { k: 'good', icon: 'check' }); } catch { toast(t('Picture saved.'), { icon: 'check' }); }
}

const lastFmt = new Map();   // the format picked last, per picture (this session)
/** The preview sheet: the picture as it will be sent, [Chat | Status], Show amounts (locked off while the balance is
 *  hidden), the year's top shop (off unless ticked), then Share. A change redraws after 150 ms; the old picture dims and
 *  Share waits until the new one is ready, so what is shown is what is sent. */
export function shareSheet(kind, d) {
  const P = PICS[kind], hid = balHidden(), o = { story: lastFmt.get(kind) ?? !!P.story, amounts: false, names: false, sample: !!settings().sample };
  const sw = (x, label, note, lock) => `<label class="toggle"${lock ? ' style="opacity:.5"' : ''}><span class="grow"><b>${esc(label)}</b>${note ? `<small>${esc(note)}</small>` : ''}</span><input type="checkbox" class="switch" role="switch" data-x="${x}"${lock ? ' disabled aria-disabled="true"' : ''}></label>`;
  const glyph = story => `<svg width="${story ? 11 : 14}" height="${story ? 18 : 14}" viewBox="0 0 ${story ? 11 : 14} ${story ? 18 : 14}" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><rect x="1" y="1" width="${story ? 9 : 12}" height="${story ? 16 : 12}" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  const el = openSheet(`<div class="sheethead"><h2 class="sh-title">${esc(P.sheet())}</h2><button class="icon-btn" data-act="sheet-close" aria-label="${esc(t('Close'))}">${ICON.x}</button></div>
    <div class="pv" style="background:var(--panel2);border-radius:16px;padding:14px;display:grid;place-items:center;min-height:200px"></div>
    <div class="segs" role="radiogroup" aria-label="${esc(P.sheet())}" style="margin:12px 0"><button class="seg" role="radio" data-x="fmt" data-v="chat">${glyph(false)}${esc(t('Chat'))}</button><button class="seg" role="radio" data-x="fmt" data-v="status">${glyph(true)}${esc(t('Status'))}</button></div>
    ${P.money ? sw('amounts', t('Show amounts'), hid ? t('Amounts are hidden. Turn on the balance in Home to show them.') : '', hid) : ''}${P.names ? sw('names', t('Show my top shop')) : ''}
    <button class="btn wide" data-x="share">${ICON.share}${esc(t('Share'))}</button><p class="fine" style="text-align:center">${esc(t('The picture is made on this phone. Nothing leaves it unless you share it.'))}</p>`, { label: P.sheet(), stack: true });
  if (!el) return;
  const pv = el.querySelector('.pv'), go = el.querySelector('[data-x="share"]');
  let cur, timer;
  const draw = () => {
    el.querySelectorAll('[data-x="fmt"]').forEach(b => { const on = (b.dataset.v === 'status') === o.story; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    pv.firstChild?.style.setProperty('opacity', '.6'); go.classList.add('busy'); go.disabled = true;
    const p = cur = picture(kind, d, { ...o });
    p.then(c => {
      if (p !== cur) return;
      c.style.cssText = `display:block;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.35);${o.story ? 'height:min(392px,46vh);width:auto' : 'width:100%;height:auto'}`;
      c.setAttribute('role', 'img'); c.setAttribute('aria-label', P.title(d));
      pv.replaceChildren(c); go.classList.remove('busy'); go.disabled = false;
    }).catch(console.error);
  };
  const later = () => { clearTimeout(timer); timer = setTimeout(draw, 150); };
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'fmt') { o.story = b.dataset.v === 'status'; lastFmt.set(kind, o.story); later(); }
    if (b.dataset.x === 'share' && !go.disabled) send(await cur, P.name(d), P.title(d), caption(kind, d, o.sample));
  });
  el.addEventListener('change', e => { const x = e.target.dataset.x; if (x === 'names' || (x === 'amounts' && !hid)) { o[x] = e.target.checked; later(); } });
  draw();
}
