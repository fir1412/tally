// Share pictures: what each one says (and leaves out with the balance hidden), and text that fits its space in every language.
import test from 'node:test';
import assert from 'node:assert/strict';
import { wrap, fitLines, shares, parts, catRows, hero, yearRows, caption, stickerDays, latin, receipt, LIMIT } from '../js/share.js';
import { setLang } from '../js/i18n.js';

const RM = `RM${String.fromCharCode(160)}`;   // fmtRM never splits RM from its figure
const mono = s => [...s].length * 10;   // every character 10 wide
const info = c => ({ label: ({ dining: 'Dining', groceries: 'Groceries' })[c] || c, color: '#000' });

test('wrap: breaks between words, never inside one that fits, and keeps punctuation with its word', () => {
  assert.deepEqual(wrap(mono, 'My month with Tally', 100), ['My month', 'with Tally']);
  assert.deepEqual(wrap(mono, '  short  ', 100), ['short']);
  assert.deepEqual(wrap(mono, `Dining · ${RM}1,300.00`, 110), ['Dining ·', `${RM}1,300.00`]);   // RM never apart from its figure
  for (const l of wrap(mono, `Rent & housing · ${RM}1,300.00 this month`, 120)) assert.ok(mono(l) <= 120 || !l.includes(' '), l);
});

test('wrap: Chinese and Japanese break between words without spaces; Tamil letters stay whole', () => {
  const zh = wrap(mono, '我在十月用Tally记录了每一天的开销。', 80, 'zh');
  assert.ok(zh.length > 1 && zh.every(l => mono(l) <= 90), zh.join('|'));   // a closing 。 may hang past the edge
  assert.equal(zh.join(''), '我在十月用Tally记录了每一天的开销。');
  assert.ok(!zh.some(l => /^[。，]/.test(l)), 'no line starts with 。 or ，');
  const ta = 'செலவழித்தது', lines = wrap(mono, ta, 40, 'ta');   // one long word: broken between graphemes
  assert.equal(lines.join(''), ta);
  for (const l of lines) assert.ok(!/^[ா-்ௗ]/.test(l), `a vowel sign never starts a line: ${l}`);
});

test('fitLines: shrinks first, then wraps; at the smallest size it gives every line', () => {
  const m = (s, z) => [...s].length * z / 2;
  assert.deepEqual(fitLines(m, 'Spent', 1000, 64, 36), { size: 64, lines: ['Spent'] });
  assert.equal(fitLines(m, 'My October with Tally', 400, 64, 36).size, 38);   // 21 chars × 19 = 399
  const two = fitLines(m, 'My October with Tally, the whole month', 400, 64, 24, 2);
  assert.equal(two.lines.length, 2); assert.ok(two.size < 64 && two.lines.every(l => m(l, two.size) <= 400));
  const tooLong = fitLines(m, 'a b c d e f g h i j k l m n o p q r s t u v w x y z', 40, 30, 28);
  assert.equal(tooLong.size, 28); assert.ok(tooLong.lines.length > 1);
});


test('shares: whole numbers that add up exactly (largest remainder), in the order given', () => {
  assert.deepEqual(shares([1, 1, 1], 100), [34, 33, 33]);
  assert.deepEqual(shares([65000, 61240, 38810, 24000, 29590], 2186), [650, 612, 388, 240, 296]);   // the spec's receipt adds up
  assert.deepEqual(shares([0, 0], 100), [0, 0]);
  for (const vs of [[7, 7, 7, 7, 7, 7, 1], [99999, 1], [3, 3, 3]]) assert.equal(shares(vs, 100).reduce((s, v) => s + v, 0), 100);
});

test('parts: the 5 biggest categories, or 4 and "Other"; shares sum to 100, ringgit to the total', () => {
  const p = parts({ dining: 40000, groceries: 25000, a: 10000, b: 10000, c: 8000, d: 7000, zero: 0 }, info);
  assert.deepEqual(p.map(x => x.label), ['Dining', 'Groceries', 'a', 'b', 'Other']);
  assert.equal(p[4].v, 15000); assert.equal(p[4].color, '#64748B');
  assert.equal(p.reduce((s, x) => s + x.pct, 0), 100); assert.equal(p.reduce((s, x) => s + x.rm, 0), 1000);
  assert.equal(parts({ dining: 1, groceries: 2, a: 3, b: 4, c: 5 }, info).length, 5);   // exactly 5: no "Other"
  assert.deepEqual(parts({ dining: 100, other: 50 }, info).map(x => x.label), ['Dining', 'Other']);   // the "other" category is Other, once
  assert.deepEqual(parts({}, info), []);
});

test('parts: Loans and Health fold into Other unless amounts are shown', () => {
  const byCat = { dining: 50000, loans: 30000, health: 20000 };
  assert.deepEqual(parts(byCat, info, true).map(x => [x.label, x.pct]), [['Dining', 50], ['Other', 50]]);
  assert.deepEqual(parts(byCat, info, false).map(x => x.label), ['Dining', 'loans', 'health']);
});

test('catRows: % by default, whole ringgit with amounts', () => {
  const p = parts({ dining: 65000, groceries: 61240 }, info);
  assert.deepEqual(catRows(p).map(r => r[1]), ['51%', '49%']);
  assert.deepEqual(catRows(p, true).map(r => r[1]), [`${RM}650`, `${RM}612`]);
});

test('hero: Kept as a share, else a drop on last month (only when it fell), else days logged; never red', () => {
  const m = { spent: 218640, inn: 320000, got: 28, n: 30 };
  assert.deepEqual(hero(m, false), { label: 'Kept', value: '32%', note: 'of what came in' });
  assert.deepEqual(hero(m, true), { label: 'Kept', value: `${RM}1,014` });
  assert.deepEqual(hero({ ...m, inn: 100000 }, true), { label: 'Spent', value: `${RM}2,186`, ink: true });
  assert.deepEqual(hero({ ...m, inn: 0, change: -0.18, prev: 'September' }, false), { label: 'Spent', value: '18%', note: 'less than September', down: true });
  assert.deepEqual(hero({ ...m, inn: 0, change: 0.2, prev: 'September' }, false), { label: 'Days you logged', value: '28/30', ink: true, days: true });   // spent more: no bad news
  assert.equal(hero({ ...m, inn: 0, change: null, prev: 'September' }, false).days, true);
  assert.equal(hero({ spent: 5, inn: 0, got: 62 }, false).value, '62');   // the year: a count
  assert.ok(!JSON.stringify([hero(m, false), hero({ ...m, inn: 0 }, false)]).includes('RM'), 'no amount without amounts');
});

test('hero: a sparsely logged month earns neither Kept % nor a drop (the gaps would be the "saving")', () => {
  const aug = { spent: 33500, inn: 0, got: 3, n: 31, change: -0.63, prev: 'July' };
  assert.deepEqual(hero(aug, false), { label: 'Days you logged', value: '3/31', ink: true, days: true });
  assert.equal(hero({ ...aug, got: 21 }, false).down, true);   // 21 of 31 is 2/3: well logged
  assert.equal(hero({ spent: 100, inn: 300, got: 10, n: 30 }, false).days, true);   // Kept 67% from a third of the days: no
  assert.equal(hero({ spent: 100, inn: 300, got: 5, well: true }, false).label, 'Kept');   // the year passes its own judgement
  assert.equal(hero({ spent: 100, inn: 300, got: 5, n: 30 }, true).label, 'Kept');   // amounts are plain facts either way
});

test('year rows: days with nothing spent; the top shop only when asked, never the item', () => {
  const y = { noSpend: 4, shop: { name: 'Lotus', n: 12 }, item: { name: 'Milo', n: 9 } };
  assert.deepEqual(yearRows(y), [['Days with nothing spent', '4', null, 'optional']]);
  assert.deepEqual(yearRows(y, true), [['Days with nothing spent', '4', null, 'optional'], ['Your most-visited shop', 'Lotus · 12 visits']]);
  assert.ok(!JSON.stringify(yearRows(y, true)).includes('Milo'));
  assert.deepEqual(yearRows({ noSpend: 0 }), []);
});

test('captions: first person, then the link on its own line; sample data is just the link', () => {
  assert.equal(caption('month', { label: 'Oct 2026' }), 'Where my money went in Oct 2026, sorted by Tally. Free, no sign-up.\nhttps://tallymy.github.io');
  assert.equal(caption('book', { label: 'Oct 2026' }), 'One sticker for every day I log my spending. My Oct 2026 sticker book, in Tally.\nhttps://tallymy.github.io');   // names the month, never "this month"
  assert.equal(caption('month', { label: 'Oct 2026' }, true), 'https://tallymy.github.io');
  for (const k of ['year', 'goal', 'streak', 'split']) assert.ok(caption(k, { year: '2026', name: 'Hari Raya', streak: 30 }).endsWith('.\nhttps://tallymy.github.io'), k);
});
test('stickers on a month: the last logged day and the one nearest the middle, only logged days', () => {
  assert.deepEqual(stickerDays(new Set([1, 2, 14, 16, 29]), 30), [29, 14]);
  assert.deepEqual(stickerDays(new Set([3]), 30), [3]);
  assert.deepEqual(stickerDays(new Set(), 30), []);
});

test('latin: the brand fonts (and italics, tracking) only for Latin text', () => {
  assert.ok(latin('November 2026 · RM 12.00'));
  assert.ok(latin('Deepavali'));
  assert.ok(!latin('நவம்பர்')); assert.ok(!latin('10月')); assert.ok(!latin('Tally-உடன்'));
});

// A stand-in for the canvas: every UTF-16 unit 0.56 of the font size wide (Tamil's vowel signs are extra units, so its
// words come out wide, as they are).
const pen = { font: '10px x', measureText(s) { return { width: s.length * +this.font.match(/(\d+(?:\.\d+)?)px/)[1] * .56 }; } };
test('no receipt ever reaches the footer: month and year × chat and status × 6 languages × amounts × top shop', async () => {
  const many = { housing: 65000, dining: 44300, transport: 19400, bills: 13000, groceries: 9000, loans: 15000, health: 4000, fun: 3000 };
  const info = c => ({ label: c, color: '#000' });
  const y = { spent: 1031400, income: 700000, logged: 63, noSpend: 1, shop: { name: 'Restoran Nasi Kandar Pelita', n: 24 }, item: { name: 'Milo', n: 9 } };
  for (const lang of ['en', 'ms', 'zh', 'zh-Hant', 'ja', 'ta']) {
    await setLang(lang);
    for (const story of [false, true]) for (const amounts of [false, true]) for (const names of [false, true]) {
      const o = { story, amounts, names }, lim = LIMIT[story ? 'story' : 'chat'];
      for (const [kind, d] of [['month', { name: 'September', year: '2026', date: '2026-09', spent: 172700, inn: 320000, got: 28, n: 30, byCat: many, info }], ['year', { year: '2026', y, byCat: many, info, well: true }]]) {
        const { so } = receipt(pen, kind, d, o), h = (await import('../js/share.js')).slipHeight(pen, so);
        assert.ok(so.y + h <= lim, `${kind} ${lang} ${story ? 'status' : 'chat'}${amounts ? ' amounts' : ''}${names ? ' names' : ''}: ends at ${Math.round(so.y + h)} > ${lim}`);
        if (names && kind === 'year') assert.ok(so.rows.some(r => r[1].includes('Restoran')), 'the chosen top shop is never dropped');
      }
    }
  }
  await setLang('en');
});
