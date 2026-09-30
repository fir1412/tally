// Colour maths behind the look and the honeycomb picker (js/colorpicker.js), backups of category colours, week start.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/colorpicker.js';
import * as IO from '../js/io.js';
import { streak } from '../js/gamify.js';

test('hex codes: #RGB / #RRGGBB, with or without #, anything else is null', () => {
  assert.equal(C.parseHex('#1e40af'), '#1E40AF');
  assert.equal(C.parseHex(' 1E40AF '), '#1E40AF');
  assert.equal(C.parseHex('#fff'), '#FFFFFF');
  assert.equal(C.parseHex('abc'), '#AABBCC');
  for (const bad of ['', '#', '#12', '#1234', '#12345', '#1234567', 'ggg', '#1E40AG', null, undefined, 'red']) assert.equal(C.parseHex(bad), null, String(bad));
});

test('contrast and the text colour on a colour', () => {
  assert.equal(C.contrast('#000000', '#FFFFFF').toFixed(1), '21.0');
  assert.equal(C.contrast('#777777', '#777777'), 1);
  assert.equal(C.onColor('#1E40AF'), '#FFFFFF');
  assert.equal(C.onColor('#FACC15'), C.INK);   // yellow: dark text
  assert.equal(C.onColor('#FFFFFF'), C.INK);
  for (const h of [...C.ACCENTS, ...C.GREYS, ...C.honeycomb().map(c => c.hex)]) assert.ok(C.contrast(h, C.onColor(h)) >= 4.5, `text on ${h}`);
});

test('accent text is always readable on the theme surfaces; presets hold 3:1 as buttons', () => {
  for (const h of [...C.ACCENTS, '#FFFF00', '#000000', '#FFFFFF', '#777777']) for (const m of ['dark', 'light']) {
    const a = C.readable(h, C.SURFACES[m]);
    for (const s of C.SURFACES[m]) assert.ok(C.contrast(a, s) >= 4.5, `${h} → ${a} on ${s} (${m})`);
  }
  assert.equal(C.readable('#1E40AF', C.SURFACES.light), '#1E40AF');   // already fine: unchanged
  for (const h of C.ACCENTS.slice(1)) for (const m of ['dark', 'light']) assert.ok(C.contrast(h, C.SURFACES[m][0]) >= 3, `${h} on ${m}`);
  const css = C.accentCss('#059669');
  assert.match(css, /^:root\{--accent:#[0-9A-F]{6};--btn:#059669;--btn-ink:#020617;\}/);
  assert.match(css, /:root\[data-theme="light"\]\{/);
  assert.match(css, /@media \(prefers-color-scheme: light\)\{:root:not\(\[data-theme="dark"\]\)\{/);
});

test('honeycomb: a hexagon of hexagons, white in the middle, hues around, stronger outward', () => {
  const h = C.honeycomb();
  assert.equal(h.length, 1 + 3 * C.RINGS * (C.RINGS + 1));   // 91 for 5 rings
  assert.equal(new Set(h.map(c => c.hex)).size, h.length, 'every cell a different colour');
  assert.equal(h.find(c => c.ring === 0).hex, '#FFFFFF');
  for (let k = 1; k <= C.RINGS; k++) assert.equal(h.filter(c => c.ring === k).length, 6 * k);
  const sat = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b); };
  const top = k => h.find(c => c.q === 0 && c.r === -k).hex;   // straight up from the middle: hue near 0 (red)
  for (let k = 1; k < C.RINGS; k++) assert.ok(sat(top(k + 1)) > sat(top(k)), `ring ${k + 1} stronger than ${k}`);
  const [r, g, b] = [1, 3, 5].map(i => parseInt(top(C.RINGS).slice(i, i + 2), 16));
  assert.ok(r > g && r > b, `top is red-ish: ${top(C.RINGS)}`);
  assert.equal(C.GREYS[0], '#FFFFFF'); assert.equal(C.GREYS.at(-1), '#000000');
});

test('every accent and honeycomb cell has a plain colour name (screen readers)', () => {
  assert.deepEqual(C.ACCENTS.map(C.colourName), ['Blue', 'Blue', 'Teal', 'Green', 'Orange', 'Orange', 'Red', 'Pink', 'Purple']);
  assert.deepEqual(['#FFFFFF', '#000000', '#777777', '#FACC15', '#65A30D'].map(C.colourName), ['White', 'Black', 'Grey', 'Yellow', 'Green']);
  for (const h of [...C.GREYS, ...C.honeycomb().map(c => c.hex)]) assert.ok(C.colourName(h), h);
});

test('arrow keys move to the neighbouring cell', () => {
  const W = Math.sqrt(3) * 10, cells = C.honeycomb().map(c => ({ cx: c.x * W, cy: c.y * W, c }));
  const mid = cells.findIndex(x => x.c.ring === 0), at = (q, r) => cells.findIndex(x => x.c.q === q && x.c.r === r);
  assert.equal(C.neighbour(cells, mid, 'ArrowRight'), at(1, 0));
  assert.equal(C.neighbour(cells, mid, 'ArrowLeft'), at(-1, 0));
  assert.ok([at(0, -1), at(1, -1)].includes(C.neighbour(cells, mid, 'ArrowUp')));
  assert.ok([at(0, 1), at(-1, 1)].includes(C.neighbour(cells, mid, 'ArrowDown')));
  const edge = at(C.RINGS, 0);
  assert.equal(C.neighbour(cells, edge, 'ArrowRight'), edge, 'stays put at the edge');
  assert.equal(C.neighbour(cells, mid, 'Tab'), mid);
});

test('backups keep category colours, cleaned; a merge keeps the local ones', () => {
  const b = IO.readBackup(JSON.stringify({ app: 'tally', v: 1, accounts: [], tx: [], kv: { customCats: [{ id: 'c_x', name: 'Cat', color: '#123456' }],
    catColors: { dining: '#AA0000', c_x: '#00aa00', nope: '#111111', groceries: 'red', ['__proto__']: '#222222', other: '#333333' } } }));
  assert.deepEqual(b.kv.catColors, { dining: '#AA0000', c_x: '#00aa00', other: '#333333' });
  const m = IO.mergeBackup({ accounts: [], tx: [], recurring: [], kv: { catColors: { dining: '#0000FF' } } }, b);
  assert.deepEqual(m.kv.catColors, { dining: '#0000FF', c_x: '#00aa00', other: '#333333' });
});

test('streak: rest days count over any 7 days, whatever day the week starts on', () => {
  // Sun 27 and Mon 28 missed: two in 7 days, kept (they used to break it with Sunday week starts).
  const d2 = new Set(['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-29']);
  assert.equal(streak(d2, '2026-09-29').streak, 6);
});

test('your own app colours: kept, applied and carried in backups only when every colour is a real one', async () => {
  const mine = { dark: ['#101820', '#18222C', '#222C36'], light: ['#FFF5EE', '#FFFFFF', '#F2E8E0'], accent: '#C2410C' };
  assert.ok(C.okMine(mine));
  for (const bad of [null, { ...mine, accent: 'red' }, { ...mine, dark: ['#101820', '#18222C'] }, { ...mine, light: ['#FFF', '#FFFFFF', '#F2E8E0'] }, { ...mine, extra: 1 }]) assert.ok(!C.okMine(bad), JSON.stringify(bad));
  assert.equal(C.paletteFor({ appPalette: 'mine', myPalette: mine }).accent, '#C2410C');
  assert.equal(C.paletteFor({ appPalette: 'mine', myPalette: { dark: [] } }).name, 'Tally', 'a broken one falls back to Tally, never a blank screen');
  assert.equal(C.paletteFor({ appPalette: 'kopi' }).name, 'Kopi');
  // The raised surface is a step from the cards: lighter on a dark background, darker on a light one.
  const [, , dRaised] = C.surfacesFrom('#101820', '#18222C'), [, , lRaised] = C.surfacesFrom('#FFF5EE', '#FFFFFF');
  assert.ok(C.luminance(dRaised) > C.luminance('#18222C') && C.luminance(lRaised) < C.luminance('#FFFFFF'));
  const IO = await import('../js/io.js');
  assert.deepEqual(IO.backupSettings({ appPalette: 'mine', myPalette: mine }).myPalette, mine);
  assert.equal(IO.backupSettings({ myPalette: { ...mine, accent: 'javascript:1' } }).myPalette, undefined);
});
