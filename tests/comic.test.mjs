// The monthly sticker book: which days count, filling in later, and which panel a day shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { filledDays, panelOf, daysIn, bookState, loadBook, WHO, pastMonths } from '../js/comic.js';
import { LANGS } from '../js/i18n.js';

const at = (d, h = 12) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime();   // local time, as dayOf reads it
const tx = (date, made, extra = {}) => ({ id: date + made, date, createdAt: at(made), source: 'quick', ...extra });

test('a day counts when something is logged for it on the day or later in the month, not ahead, not after, not imported', () => {
  const f = filledDays({ ym: '2026-10', today: '2026-10-20', noSpend: ['2026-10-05', '2026-09-30'], tx: [
    tx('2026-10-01', '2026-10-01'),                        // on the day
    tx('2026-10-02', '2026-10-15'),                        // filled in later
    tx('2026-10-25', '2026-10-03'),                        // planned ahead: no
    tx('2026-10-03', '2026-10-03', { source: 'import' }),  // a bank statement: no
    tx('2026-10-04', '2026-10-04', { source: 'recurring' }), // a bill posted by itself: no
    tx('2026-10-06', '2026-10-06', { spouse: true }),      // a partner's entry: no
    tx('2026-09-29', '2026-10-01'),                        // last month's day, now: not this book
  ] });
  assert.deepEqual([...f].sort((a, b) => a - b), [1, 2, 5]);
  assert.deepEqual([...filledDays({ ym: '2026-09', today: '2026-10-20', tx: [tx('2026-09-29', '2026-10-07')] })], [29]);   // caught up by the 7th of the next month: counts
  assert.deepEqual([...filledDays({ ym: '2026-09', today: '2026-10-20', tx: [tx('2026-09-29', '2026-10-08')] })], []);   // after that: too late
  assert.deepEqual([...filledDays({ ym: '2026-12', today: '2027-01-05', tx: [tx('2026-12-31', '2027-01-02')] })], [31]);   // over the new year too
});

test('day N shows panel N, and the last day always shows the ending', () => {
  assert.equal(daysIn('2026-02'), 28); assert.equal(daysIn('2028-02'), 29); assert.equal(daysIn('2026-10'), 31);
  assert.equal(panelOf(1, 31), 0); assert.equal(panelOf(30, 31), 29); assert.equal(panelOf(31, 31), 30);
  assert.equal(panelOf(28, 28), 30); assert.equal(panelOf(27, 28), 26);   // February skips 28-30
});

test('a book is complete only with every day in; a month without its own book uses the classic stickers', async () => {
  const s = bookState({ ym: '2026-02', filled: new Set(Array.from({ length: 28 }, (_, i) => i + 1)), today: '2026-03-01' });
  assert.equal(s.complete, true); assert.equal(s.over, true); assert.equal(s.open, true); assert.equal(s.grace, true);   // until 7 March
  const late = bookState({ ym: '2026-02', filled: new Set([1]), today: '2026-03-08' });
  assert.equal(late.open, false); assert.equal(late.grace, false);
  const book = await loadBook('2026-01');
  assert.equal(book.stickers.length, 31); assert.ok(Array.isArray(book.panels));
});

test('every book speaks every language: theme, sticker names, lines, tips and names (a gap falls back to English unseen)', async () => {
  const gaps = (o, where) => LANGS.filter(([l]) => !o?.[l]).map(([l]) => `${where} ${l}`);
  const miss = Object.entries(WHO).flatMap(([k, o]) => gaps(o, `WHO.${k}`));
  for (const m of ['10', '11', '12']) {
    const b = await loadBook(`2026-${m}`);
    miss.push(...gaps(b.theme, `${m} theme`), ...b.stickers.flatMap(s => gaps(s.name, `${m} ${s.id}`)), ...Object.entries(b.who || {}).flatMap(([k, o]) => gaps(o, `${m} who.${k}`)));
    b.panels.forEach((p, i) => miss.push(...p.lines.flatMap(l => gaps(l.text, `${m} #${i + 1}`)), ...(p.tip ? gaps(p.tip, `${m} #${i + 1} tip`) : [])));
  }
  assert.deepEqual(miss, []);
});

test('past months: back to when you began, never before the launch (Oct 2026), none in the sample', () => {
  assert.deepEqual(pastMonths({ today: '2026-10-15', first: '2025-01' }), []);
  assert.deepEqual(pastMonths({ today: '2027-01-02', first: '2026-03' }), ['2026-12', '2026-11', '2026-10']);
  assert.deepEqual(pastMonths({ today: '2027-01-02', first: '2026-12' }), ['2026-12']);
  assert.deepEqual(pastMonths({ today: '2027-01-02', first: '2026-03', sample: true }), []);
  assert.equal(pastMonths({ today: '2032-01-01', first: '2026-10' }).length, 24);
});
