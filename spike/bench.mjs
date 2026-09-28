// Score the scanner on a folder of receipts: node bench.mjs <dir> [--engine tesseract|paddle] [--fresh]
// Each NNN.jpg may have NNN.json {total: "9.00", date: "25/12/2018"} (SROIE format) as ground truth.
// OCR text is cached per engine in <dir>/.ocr[-paddle]/ so parser changes re-run in seconds; --fresh re-runs OCR.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseReceipt, parseDate, joinRows } from '../js/parse.js';

const dir = process.argv[2] ?? '../receipts/sroie';
const fresh = process.argv.includes('--fresh');
const engine = process.argv[process.argv.indexOf('--engine') + 1] === 'paddle' ? 'paddle' : 'tesseract';
// --align: straighten first (js/align.js, as the app does). --noexif: ignore EXIF rotation (photos saved without it).
const align = process.argv.includes('--align'), noexif = process.argv.includes('--noexif');
const cache = join(dir, engine === 'paddle' ? `.ocr-paddle${align ? '-align' : ''}${noexif ? '-noexif' : ''}` : '.ocr');
await mkdir(cache, { recursive: true });

let ocr, ms = 0, n = 0, turned = 0, tilted = 0;
async function read(path) { // image path -> text
  const t0 = Date.now();
  let text;
  if (engine === 'paddle') {
    ocr ??= await (await import('@gutenye/ocr-node')).default.create();
    // Decode like the browser: EXIF orientation applied, longest side capped at 2000 px, raw RGBA.
    const sharp = (await import('sharp')).default;
    let img = sharp(path); if (!noexif) img = img.rotate();
    const { data, info } = await img.resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const raw = { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
    if (align) {
      const { readAligned } = await import('../js/align.js');
      const r = await readAligned(x => ocr.detect(x), raw);
      if (r.turns) turned++; if (r.angle) tilted++;
      text = joinRows(r.texts);
    } else text = joinRows((await ocr.detect(raw)).texts);
  } else {
    ocr ??= await (await import('tesseract.js')).default.createWorker('eng');
    await ocr.setParameters({ tessedit_pageseg_mode: '6' });
    ({ data: { text } } = await ocr.recognize(path));
  }
  ms += Date.now() - t0; n++;
  return text;
}

const files = (await readdir(dir)).filter(f => /\.(jpe?g|png)$/i.test(f)).sort();
const rows = [];
for (const f of files) {
  const base = f.replace(/\.\w+$/, '');
  let text = fresh ? null : await readFile(join(cache, base + '.txt'), 'utf8').catch(() => null);
  if (text === null) {
    text = await read(join(dir, f));
    await writeFile(join(cache, base + '.txt'), text);
  }
  const r = parseReceipt(text);
  const truth = JSON.parse(await readFile(join(dir, base + '.json'), 'utf8').catch(() => '{}'));
  const wantTotal = truth.total ? Math.round(parseFloat(truth.total.replace(/[^\d.]/g, '')) * 100) : undefined;
  const wantDate = truth.date ? parseDate(truth.date) : undefined;
  rows.push({ f: base, check: r.check.ok, total: wantTotal === undefined ? null : r.total === wantTotal,
    date: wantDate === undefined ? null : r.date === wantDate, items: r.items.length, got: r.total, want: wantTotal, diff: r.check.diff });
}
await ocr?.terminate?.();
if (n) console.log(`OCR (${engine}${align ? ", aligned" : ""}): ${(ms / n / 1000).toFixed(2)} s per receipt over ${n} fresh reads${align ? `; turned ${turned}, straightened ${tilted}` : ""}`);

const pct = (k) => { const s = rows.filter(r => r[k] !== null); return `${s.filter(r => r[k]).length}/${s.length} (${Math.round(s.filter(r => r[k]).length / s.length * 100)}%)`; };
for (const r of rows) console.log(`${r.f}  ${r.check ? '✓' : '✗'} adds up  ${r.total ? '✓' : '✗'} total ${r.got ?? '-'}/${r.want ?? '?'}  ${r.date ? '✓' : '✗'} date  ${r.items} items${r.check ? '' : `  gap ${r.diff ?? '-'}`}`);
console.log(`\nAdds up (checksum): ${pct('check')}\nTotal correct:      ${pct('total')}\nDate correct:       ${pct('date')}`);
