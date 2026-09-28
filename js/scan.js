// Reading a receipt photo on the phone: PaddleOCR (vendored, ~40 MB, loaded on first scan and cached offline),
// then the Malaysian receipt parser. Nothing is uploaded.
import { parseReceipt } from './parse.js';

// OCR runs in a worker (js/ocr-worker.js): the screen stays responsive, and the page keeps a strict CSP.
let worker = null, loading = null, ready = false, seq = 0;
const pending = new Map();
function call(raw) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, raw });
  });
}
export const ocrReady = () => ready;
/** Start the OCR worker and load the models once (about 1 s from cache, longer on the first download). */
export function loadOcr() {
  loading ||= (async () => {
    worker = new Worker(new URL('./ocr-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => { const p = pending.get(data.id); if (!p) return; pending.delete(data.id); data.error ? p.reject(new Error(data.error)) : p.resolve(data); };
    worker.onerror = e => { for (const p of pending.values()) p.reject(new Error(e.message || 'OCR worker failed')); pending.clear(); loading = null; ready = false; };
    await call(null); // warm up: loads the models
    ready = true;
  })().catch(e => { loading = null; throw e; });
  return loading;
}

async function bitmap(file) {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) throw new Error('not an image');
  if (file.size > 40 * 1024 * 1024) throw new Error('too big');
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}
function draw(bmp, maxSide) {
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

/** OCR boxes → rows with the lowest confidence of the boxes in each row (same joining as joinRows). */
function rows(boxes) {
  const b = boxes.map(({ text, box, mean }) => {
    const ys = box.map(p => p[1]), top = Math.min(...ys), bottom = Math.max(...ys);
    return { text, mean, x: Math.min(...box.map(p => p[0])), y: (top + bottom) / 2, h: bottom - top };
  }).sort((a, c) => a.y - c.y);
  const out = [];
  for (const w of b) {
    const r = out.at(-1);
    if (r && Math.abs(w.y - r.y) < Math.min(w.h, r.h) / 2) r.words.push(w); else out.push({ y: w.y, h: w.h, words: [w] });
  }
  return out.map(r => { const ws = r.words.sort((a, c) => a.x - c.x); return { text: ws.map(w => w.text).join(' '), conf: Math.min(...ws.map(w => w.mean ?? 1)) }; });
}

/**
 * Photo → {receipt, text, photo, ms, turns, angle}. receipt is parseReceipt's result, with item.flag set when the item is
 * worth a second look (low OCR confidence, no name, or a zero price).
 * photo is a re-encoded JPEG (max 1200 px): smaller, and the location data in the original is dropped.
 */
export async function readReceipt(file) {
  const t0 = performance.now();
  const bmp = await bitmap(file);
  await loadOcr();
  const c = draw(bmp, 2000);
  const { data, width, height } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    const aligned = await call({ data, width, height }); // the worker aligns (js/align.js) and reads
  const lines = rows(aligned.texts);
  const text = lines.map(l => l.text).join('\n');
  const receipt = parseReceipt(text);
  for (const it of receipt.items) {
    const line = lines.find(l => it.name && l.text.includes(it.name));
    it.flag = !it.name || (line && line.conf < 0.85) || it.cents === 0;
  }
  const photo = await new Promise(r => draw(bmp, 1200).toBlob(r, 'image/jpeg', 0.8));
  bmp.close?.();
  return { receipt, text, photo, ms: performance.now() - t0, turns: aligned.turns, angle: aligned.angle };
}
