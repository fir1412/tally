// A sticker as a WhatsApp-ready file: 512×512, transparent, a white die-cut (share.js sticker()'s look at export size)
// with a small [mark Tally] label in its lower right, and on some stickers a reaction word on its own white band.
// WebP (≤ 100 KB) where the browser makes one, else PNG (Safari). Made on this phone; nothing is uploaded. People add it
// with WhatsApp's own Create sticker: a web app can't install stickers, and nothing here says it does.
// Design and checks: D:\tally-stickers (r1–r4); the pure parts are tested in tests/sticker-export.test.mjs.
import { t } from './i18n.js';
import { mark, brandFonts, latin } from './share.js';
import { crc32 } from './io.js';

const S = 512, R = 12, NUDGE = 10, SHADOW = { color: 'rgba(10,15,30,.22)', blur: 10, y: 4 };
// The shadow reaches 12 px up, 16 to the sides and 20 down past the white, so the white keeps 28 / 32 / 36 px from the
// top / sides / bottom and nothing enters WhatsApp's 16 px margin. The art's centre sits 4 px above the canvas centre.
const CY = S / 2 - 4, KEEP = { top: 28, side: 32, bottom: 36 };
// The art's long side: 424, then 400 and 376 while the label's best spot still covers more than 300 samples of it.
const FITS = [424, 400, 376], COVER_MAX = 300, RAYS = [30, 60];
// The label: a white pill 36 px tall, the small app mark at 24 px, then "Tally" (the name, never translated).
const NAME = { h: 36, padL: 6, padR: 14, mark: 24, gap: 6, font: '700 21px "Instrument Sans", system-ui, sans-serif' };
const HANG = NAME.h / 2 + 6;   // on a word sticker the pill hangs 24 px below the band's corner
const WORD = { px: 44, padX: 20, padY: 12, top: 4, max: 400 };   // 44 px (≈ 12 px in chat), one line or no word

/** Reaction words: a few stickers carry what the sender would say. Keyed `book:sticker`; a word is the sender's, never a
 *  claim by Tally (no amounts, no promises). [tr => word, ids]: tr is t() in the app (tests pass s => s for the key). */
export const WORDS = [
  [tr => tr('Deepavali!'), '10:diya 11:agal 11:kolamdots 11:calendar 11:kandil'],
  [tr => tr('Happy birthday!'), '11:balloon'],
  [tr => tr('Merry Xmas!'), '12:xmastree'],
  [tr => tr('New Year!'), '12:fireworks'],
  [tr => tr('Thank you!'), '10:present 11:present'],
  [tr => tr('Jom minum!'), '10:tehtarik classic:tehtarik classic:kopi 12:hotdrink'],
  [tr => tr('Jom makan!'), '10:ckt classic:nasilemak 12:friedrice'],
  [tr => tr('Sedap!'), '10:cendolcup classic:durian classic:cendol'],
  [tr => tr('Rain again…'), '10:umbrella 12:raincloud 12:umbrella'],
  [tr => tr('Done!'), '12:goal'],
  [tr => tr('Payday!'), '10:envelope'],
  [tr => tr('Jimat!'), '10:jar 10:raintin 11:savingstin 12:raintin'],
  [tr => tr('Sorry!'), '11:sorry'],
];
/** The word for a book's sticker, in the app's language (tr = t), or null. */
export const wordOf = (bookId, id, tr = t) => WORDS.find(([, ids]) => ids.split(' ').includes(`${bookId}:${id}`))?.[0](tr) ?? null;
/** Only stickers checked for sharing (book data `share: true`: no amounts, QR codes, promo or pay-later look). */
export const canSave = s => s?.share === true;
export const fileName = type => `tally-sticker.${type === 'image/webp' ? 'webp' : 'png'}`;
/** The export copy of the art: every floor shadow stripped (it would be cut out as a grey plate), and the paint grain
 *  four times finer (drawn in the art's 64-unit space, it would be a coarse mottle at 512). The book itself is untouched. */
export const exportArt = svg => svg.replace(/<ellipse [^>]*fill="#1B1430" opacity="[^"]*"\/>/g, '').replace(/baseFrequency="1\.1"/g, 'baseFrequency="4.4"');

const canvas = (w, h = w) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const load = svg => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; });
const artImg = (inner, px) => load(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}">${inner}</svg>`);
/** The box of pixels with alpha > th → { x, y, w, h } or null. */
function bbox(c, th) {
  const { width: W, height: H } = c, d = c.getContext('2d').getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > th) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
/** The art on a 512 canvas, drawn as vector so its box (b, measured at 1024) fits w×h, centred at cx, cy. */
async function artLayer(svg, b, { w, h, cx = S / 2, cy = CY }) {
  const k = Math.min(w / b.w, h / b.h), P = Math.round(1024 * k), c = canvas(S);
  c.getContext('2d').drawImage(await artImg(svg, P), cx - (b.x + b.w / 2) * k, cy - (b.y + b.h / 2) * k, P, P);
  return { c, w: b.w * k, h: b.h * k };
}
/** The white die-cut: the art stamped at radii 12, 8 and 4 px × 24 angles (thin parts stay whole), filled white. */
function dilate(src) {
  const c = canvas(S), g = c.getContext('2d');
  for (const r of [R, R * 2 / 3, R / 3]) for (let a = 0; a < 24; a++) g.drawImage(src, Math.cos(a * Math.PI / 12) * r, Math.sin(a * Math.PI / 12) * r);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, S, S); g.globalCompositeOperation = 'source-over';
  return c;
}
const pill = (g, x, y, w) => { g.fillStyle = '#FFFFFF'; g.beginPath(); g.roundRect(x - w / 2, y - NAME.h / 2, w, NAME.h, NAME.h / 2); g.fill(); };
function label(g, x, y, w) {
  const x0 = x - w / 2; mark(g, x0 + NAME.padL, y - NAME.mark / 2, NAME.mark, true);   // the simple mark: it shows at ~7 px in chat
  g.font = NAME.font; g.fillStyle = '#0A0F1E'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('Tally', x0 + NAME.padL + NAME.mark + NAME.gap, y + 1);
}
const count = (d, x, y, TW, TH) => { let n = 0; for (let yy = y - TH / 2; yy < y + TH / 2; yy += 2) for (let xx = x - TW / 2; xx < x + TW / 2; xx += 2) if (d[(Math.round(yy) * S + Math.round(xx)) * 4 + 3] > 128) n++; return n; };
const clampX = (x, TW) => Math.min(S - KEEP.side - TW / 2, Math.max(KEEP.side + TW / 2, x));
const clampY = (y, TH) => Math.min(S - KEEP.bottom - TH / 2, Math.max(KEEP.top + TH / 2, y));
/** Where the label goes: rays 30°–60° below the horizontal to the right from the silhouette's centre, just past its
 *  outer edge; the spot covering least of the art (sampled every 2 px) wins, ties nearest 45°. → { c, cover } */
function place(sil, cover, TW, TH) {
  const sb = bbox(sil, 128), mx = sb.x + sb.w / 2, my = sb.y + sb.h / 2, ox = TW / 2 - NAME.padL - NAME.mark / 2;   // hangs from its mark
  const sd = sil.getContext('2d').getImageData(0, 0, S, S).data, ad = cover.getContext('2d').getImageData(0, 0, S, S).data;
  let best = null;
  for (let deg = RAYS[0]; deg <= RAYS[1]; deg += 5) {
    const dx = Math.cos(deg * Math.PI / 180), dy = Math.sin(deg * Math.PI / 180);
    let r = 400; for (; r > 0; r--) { const x = Math.round(mx + dx * r), y = Math.round(my + dy * r); if (x >= 0 && y >= 0 && x < S && y < S && sd[(y * S + x) * 4 + 3] > 128) break; }
    const c = [clampX(mx + dx * (r + NUDGE) + ox, TW), clampY(my + dy * (r + NUDGE), TH)], n = count(ad, ...c, TW, TH), score = n * 100 + Math.abs(deg - 45);
    if (!best || score < best.score) best = { score, c, cover: n };
  }
  return best;
}
const wordFont = s => `700 ${WORD.px}px ${latin(s) ? '"Instrument Sans", ' : ''}system-ui, sans-serif`;
/** The word fits one line at 44 px on this phone (its own fonts), or it is left off: a word is never shrunk. */
export const wordFits = (g, s) => { g.font = wordFont(s); return g.measureText(s).width <= WORD.max; };

/** One layout at art long side `fit`: the art, its die-cut and, with a word, the word's band joined under it. */
async function layout(svg, b, fit, word) {
  if (!word) { const art = await artLayer(svg, b, { w: fit, h: fit }); return { art, sil: dilate(art.c), cover: art.c }; }
  const bandH = WORD.px * 1.2 + 2 * WORD.padY, room = S - KEEP.bottom - KEEP.top - R - HANG, artH = Math.min(fit, room - WORD.top - bandH);
  const k = Math.min(fit / b.w, artH / b.h), y0 = KEEP.top + R + (room - (b.h * k + WORD.top + bandH)) / 2;
  const art = await artLayer(svg, b, { w: fit, h: artH, cy: y0 + b.h * k / 2 });
  const g0 = canvas(8).getContext('2d'); g0.font = wordFont(word);
  const bw = Math.min(WORD.max + 2 * WORD.padX, Math.max(art.w + 2 * R, g0.measureText(word).width + 2 * WORD.padX)), bx = (S - bw) / 2, by = y0 + art.h + WORD.top;
  const sil = dilate(art.c), sg = sil.getContext('2d'); sg.fillStyle = '#FFFFFF'; sg.beginPath(); sg.roundRect(bx, by, bw, bandH, 22); sg.fill();
  const text = g => { g.fillStyle = '#0A0F1E'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.font = wordFont(word); g.fillText(word, S / 2, by + bandH / 2 + 2); };
  const cover = canvas(S), cg = cover.getContext('2d'); cg.drawImage(art.c, 0, 0); text(cg);
  return { art, sil, cover, text, corner: [bx + bw, by + bandH] };
}

/** The finished 512×512 sticker canvas. word: the reaction word to bake in (null: none). → { c, meta } */
export async function stickerCanvas(s, word = null) {
  await brandFonts();
  const svg = exportArt(s.svg), raw = canvas(1024); raw.getContext('2d').drawImage(await artImg(svg, 1024), 0, 0);
  const b = bbox(raw, 8); if (!b) throw new Error('empty sticker');
  const out = canvas(S), g = out.getContext('2d');
  if (word && !wordFits(g, word)) word = null;
  g.font = NAME.font; const TW = Math.round(NAME.padL + NAME.mark + NAME.gap + g.measureText('Tally').width + NAME.padR), TH = NAME.h;
  let L, p, fit;
  for (fit of FITS) {
    L = await layout(svg, b, fit, word);
    if (L.corner) { const c = [clampX(L.corner[0] + 8 - TW / 2, TW), clampY(L.corner[1] + HANG - TH / 2, TH)]; p = { c, cover: count(L.cover.getContext('2d').getImageData(0, 0, S, S).data, ...c, TW, TH) }; }
    else p = place(L.sil, L.cover, TW, TH);
    if (p.cover <= COVER_MAX) break;
  }
  pill(L.sil.getContext('2d'), ...p.c, TW);
  g.save(); g.shadowColor = SHADOW.color; g.shadowBlur = SHADOW.blur; g.shadowOffsetY = SHADOW.y; g.drawImage(L.sil, 0, 0); g.restore();
  g.drawImage(L.art.c, 0, 0); L.text?.(g);
  pill(g, ...p.c, TW); label(g, ...p.c, TW);
  return { c: out, meta: { fit, cover: p.cover, word } };
}

const blobOf = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
/** RGBA pixels → at most 256 colours by median cut over the colours (5 bits a channel); clear pixels share one entry.
 *  → { pal: [[r, g, b, a]…], idx: Uint8Array (a palette index per pixel) } */
export function quantise(px) {
  const keys = new Map(), cols = [], of = new Int32Array(px.length / 4);
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3], k = a ? (px[i] >> 3) << 15 | (px[i + 1] >> 3) << 10 | (px[i + 2] >> 3) << 5 | a >> 3 : -1;
    let j = keys.get(k); if (j === undefined) { keys.set(k, j = cols.length); cols.push([0, 0, 0, 0, 0, j]); }
    const e = cols[j]; e[0]++; if (a) { e[1] += px[i]; e[2] += px[i + 1]; e[3] += px[i + 2]; e[4] += a; }
    of[i / 4] = j;
  }
  const mean = (e, ch) => e[ch + 1] / e[0], clear = keys.get(-1);
  const boxes = [cols.filter((e, j) => j !== clear)].filter(b => b.length);
  const spread = b => { let best = [-1, 0]; for (let ch = 0; ch < 4; ch++) { let lo = 255, hi = 0; for (const e of b) { const v = mean(e, ch); if (v < lo) lo = v; if (v > hi) hi = v; } if (hi - lo > best[0]) best = [hi - lo, ch]; } return best; };
  while (boxes.length < 256 - (clear !== undefined)) {   // split the box with most pixels × widest channel at its pixel median
    let pick = -1, score = 0, ch = 0;
    boxes.forEach((b, i) => { if (b.length < 2) return; const [r, c] = spread(b), s = r * b.reduce((n, e) => n + e[0], 0); if (s > score) { score = s; pick = i; ch = c; } });
    if (pick < 0) break;
    const b = boxes[pick].sort((x, y) => mean(x, ch) - mean(y, ch)), half = b.reduce((n, e) => n + e[0], 0) / 2;
    let n = 0, cut = 1; for (; cut < b.length - 1; cut++) if ((n += b[cut - 1][0]) >= half) break;
    boxes.splice(pick, 1, b.slice(0, cut), b.slice(cut));
  }
  const pal = boxes.map(b => { const t = b.reduce((s, e) => s.map((v, i) => v + e[i]), [0, 0, 0, 0, 0]); return [1, 2, 3, 4].map(i => Math.round(t[i] / t[0])); });
  const to = new Uint8Array(cols.length); boxes.forEach((b, i) => { for (const e of b) to[e[5]] = i; });
  if (clear !== undefined) { to[clear] = pal.length; pal.push([0, 0, 0, 0]); }
  return { pal, idx: Uint8Array.from(of, j => to[j]) };
}
/** An 8-bit palette PNG (PLTE + tRNS): a quarter of the bytes of the canvas's own RGBA PNG. → Blob */
export async function indexedPng(w, h, pal, idx) {
  const raw = new Uint8Array((w + 1) * h); for (let y = 0; y < h; y++) raw.set(idx.subarray(y * w, (y + 1) * w), y * (w + 1) + 1);   // filter 0 a row
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const chunk = (type, d) => { const c = new Uint8Array(12 + d.length), v = new DataView(c.buffer); v.setUint32(0, d.length); c.set(new TextEncoder().encode(type), 4); c.set(d, 8); v.setUint32(8 + d.length, crc32(c.subarray(4, 8 + d.length))); return c; };
  const ihdr = new Uint8Array(13), v = new DataView(ihdr.buffer); v.setUint32(0, w); v.setUint32(4, h); ihdr.set([8, 3, 0, 0, 0], 8);
  return new Blob([Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), chunk('IHDR', ihdr), chunk('PLTE', Uint8Array.from(pal.flatMap(p => p.slice(0, 3)))), chunk('tRNS', Uint8Array.from(pal, p => p[3])), chunk('IDAT', z), chunk('IEND', new Uint8Array())], { type: 'image/png' });
}
/** The canvas as WebP at quality .8 → .7 → .6, the first under 100 KB; where the browser can't make WebP (it hands back
 *  a PNG for 'image/webp', so the type is checked, never trusted), a 256-colour PNG: the canvas's own PNG is 120–390 KB,
 *  lossless RGBA with the paint grain in it. → Blob */
export async function encode(c) {
  for (const q of [.8, .7, .6]) {
    const b = await blobOf(c, 'image/webp', q);
    if (!b || b.type !== 'image/webp') break;
    if (b.size <= 100 * 1024) return b;
  }
  if (typeof CompressionStream === 'undefined') return blobOf(c, 'image/png');   // Safari before 16.4
  const { pal, idx } = quantise(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
  return indexedPng(c.width, c.height, pal, idx);
}
/** A book's sticker as the file to save. → File (tally-sticker.webp, or .png) */
export async function stickerFile(s, bookId) {
  const blob = await encode((await stickerCanvas(s, wordOf(bookId, s.id))).c);
  return new File([blob], fileName(blob.type), { type: blob.type });
}
