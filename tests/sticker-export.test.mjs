// Stickers saved for WhatsApp (sticker-export.js): which ones may be saved (opt-in, checked for amounts, QR codes and
// promo looks), the reaction words, the file name, and the export copy of the art. The pixels, sizes and the 16 px
// margin are checked by the sticker harness (D:\tally-stickers\proto\run.mjs) in a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, wordOf, canSave, fileName, exportArt } from '../js/sticker-export.js';
import { STICKERS } from '../js/stickers.js';

const books = Object.fromEntries(await Promise.all(['10', '11', '12'].map(async m => [m, (await import(`../js/books/${m}.js`)).default])));
const LEFT_OUT = { '10': ['price', 'qrstand'], '11': ['paylater', 'salebag'], '12': ['giftexchange', 'rainyjar'] };   // amounts, a QR code, promo or pay-later

test('saving is opt-in: every sticker says yes or no, and the ones with amounts, QR codes or promo looks say no', () => {
  for (const [m, b] of Object.entries(books)) {
    for (const s of b.stickers) assert.equal(typeof s.share, 'boolean', `${m}:${s.id} has no share flag`);
    for (const id of LEFT_OUT[m]) { const s = b.stickers.find(x => x.id === id); if (s) assert.equal(canSave(s), false, `${m}:${id} must not be saved`); }
    assert.deepEqual(b.stickers.filter(s => !s.share).map(s => s.id).sort(), LEFT_OUT[m].filter(id => b.stickers.some(s => s.id === id)).sort(), `${m}: only the left-out ones say no`);
  }
  assert.equal(canSave({ id: 'x' }), false, 'no flag: not saved (a new sticker waits for its check)');
  assert.equal(canSave({ id: 'x', share: 'yes' }), false);
});

test('reaction words: each names a sticker that exists and may be saved, at most one word per sticker', () => {
  const seen = new Set();
  for (const [w, ids] of WORDS) for (const key of ids.split(' ')) {
    const [m, id] = key.split(':');
    const s = m === 'classic' ? STICKERS.find(x => x[0] === id) && { share: true } : books[m]?.stickers.find(x => x.id === id);
    assert.ok(s, `${key} (${w(x => x)}) is not a sticker`);
    assert.ok(canSave(s), `${key} has a word but can't be saved`);
    assert.ok(!seen.has(key), `${key} has two words`); seen.add(key);
  }
  assert.equal(wordOf('11', 'balloon', x => x), 'Happy birthday!');
  assert.equal(wordOf('classic', 'kopi', x => x), 'Jom minum!');
  assert.equal(wordOf('10', 'coins', x => x), null);
  assert.equal(wordOf('11', 'present', x => `<${x}>`), '<Thank you!>', 'the word goes through t()');
});

test('reaction words stay short: one line at 44 px is about 18 Latin letters or 9 CJK characters (the phone measures it too)', async () => {
  for (const l of ['ms', 'zh', 'zh-Hant', 'ja', 'ta']) {
    const d = (await import(`../js/i18n/${l}.js`)).default;
    for (const [w] of WORDS) {
      const en = w(x => x), s = d[en]; assert.ok(s, `${l}: "${en}" is not translated`);
      const cjk = [...s].filter(c => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(c)).length;
      assert.ok(cjk * 44 + ([...s].length - cjk) * 22 <= 400 || l === 'ta', `${l}: "${s}" is likely too long for one line`);
    }
  }
  for (const [w] of WORDS) assert.ok(w(x => x).length <= 18, w(x => x));
});

test('the file: named for its type, never with a date or the sticker', () => {
  assert.equal(fileName('image/webp'), 'tally-sticker.webp');
  assert.equal(fileName('image/png'), 'tally-sticker.png');
  assert.equal(fileName(''), 'tally-sticker.png');
});

test('the export copy of the art: floor shadows go, the paint grain is finer, everything else stays', () => {
  const art = '<defs><filter id="s"><feTurbulence baseFrequency="1.1"/></filter></defs><ellipse cx="32" cy="57" rx="17" ry="2.6" fill="#1B1430" opacity=".16"/><ellipse cx="10" cy="10" rx="3" ry="3" fill="#C44A36"/>';
  const out = exportArt(art);
  assert.ok(!out.includes('#1B1430'), 'floor shadow stripped');
  assert.ok(out.includes('fill="#C44A36"'), 'other ellipses kept');
  assert.ok(out.includes('baseFrequency="4.4"') && !out.includes('baseFrequency="1.1"'));
  for (const b of Object.values(books)) for (const s of b.stickers.filter(canSave)) assert.ok(/<(path|rect|circle|ellipse|g|text)/.test(exportArt(s.svg).replace(/<defs>.*?<\/defs>/s, '')), `${b.id}:${s.id} is empty once its floor shadow goes`);
});
