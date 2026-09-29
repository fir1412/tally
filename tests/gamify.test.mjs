// Learn Tally missions, the logging streak (with its weekly rest day) and badges. Dates are local ISO days.
import test from 'node:test';
import assert from 'node:assert/strict';
import { progress, doneByData, missionFor } from '../js/learn.js';
import { streak, loggedDays, earned, dayOf } from '../js/gamify.js';

const base = (o = {}) => ({ tx: [], recurring: [], accounts: [{ id: 'a' }], settings: {}, budgets: { total: 0, byCat: {} }, rules: {}, lastBackup: null, ...o });
const at = iso => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12).getTime();
const tx = (date, o = {}) => ({ id: `t${date}${Math.random()}`, date, type: 'expense', amount: 1000, accountId: 'a', category: 'dining', source: 'quick', createdAt: at(date), ...o });
const days = (from, n) => Array.from({ length: n }, (_, i) => { const d = new Date(`${from}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });

test('missions: what the data shows counts, even from before the list existed', () => {
  assert.deepEqual(doneByData(base()), []);
  const d = base({
    tx: [tx('2026-09-01', { source: 'receipt', receiptId: 'p1', items: [{ name: 'MILO', cents: 1000, category: 'groceries' }] }),
      tx('2026-09-02', { source: 'receipt', items: [{ name: 'Phone', cents: 1000, category: 'electronics' }] }),
      tx('2026-09-03', { source: 'statement' })],
    budgets: { total: 0, byCat: {}, joint: { total: 50000, byCat: {} } }, recurring: [{ id: 'b' }], lastBackup: '2026-09-04T10:00',
    settings: { lang: 'ms', lock: { hash: 'x' } }, rules: { MILO: 'groceries' },
  });
  assert.deepEqual(doneByData(d).sort(), ['backup', 'bill', 'budget', 'fixcat', 'import', 'lang', 'lock', 'scan', 'split']);
  // A shop remembered from a hand entry is not an item's category being fixed; a photo from an import is not a scan.
  const hand = base({ tx: [tx('2026-09-01', { merchant: 'Tesco' }), tx('2026-09-01', { source: 'import', receiptId: 'p9' })], rules: { TESCO: 'groceries' } });
  assert.deepEqual(doneByData(hand).sort(), ['hand', 'import']);
});
test('missions: stored ones stay done, sharing only counts with a joint account, taps and sightings complete theirs', () => {
  const d = base({ settings: { learn: { scan: '2026-09-01' } } });
  let p = progress(d);
  assert.equal(p.total, 11); assert.equal(p.n, 1); assert.equal(p.next.id, 'fixcat');
  assert.equal(doneByData(base({ settings: { learn: { hand: '2026-09-01' } }, tx: [tx('2026-09-02')] })).length, 0);
  assert.equal(missionFor('act:jt-save', d), null);   // no joint account: no sharing mission
  const joint = base({ accounts: [{ id: 'j', scope: 'joint' }] });
  assert.equal(progress(joint).total, 12);
  assert.equal(missionFor('act:jt-save', joint), 'joint');
  assert.equal(missionFor('input:rv-item:category', d), 'fixcat');
  assert.equal(missionFor('input:rv-item:name', d), null);
  assert.equal(missionFor('see:table', base({ settings: { learn: { table: '2026-09-01' } } })), null);
  const all = Object.fromEntries(progress(joint).list.map(m => [m.id, '2026-09-01']));
  p = progress(base({ accounts: joint.accounts, settings: { learn: all } }));
  assert.ok(p.all); assert.equal(p.next, null);
});

test('streak: days in a row, today not logged yet never breaks it', () => {
  const s = streak(new Set(days('2026-09-21', 8)), '2026-09-29');   // Mon 21 to Mon 28
  assert.equal(s.streak, 8); assert.equal(s.best, 8); assert.equal(s.loggedToday, false); assert.equal(s.earned[7], '2026-09-27');
  assert.equal(streak(new Set(days('2026-09-21', 9)), '2026-09-29').loggedToday, true);
  assert.deepEqual(streak(new Set(), '2026-09-29'), { streak: 0, best: 0, rest: null, loggedToday: false, earned: {} });
  assert.equal(streak(new Set(['2026-10-01']), '2026-09-29').streak, 0);   // a future-dated entry doesn't count yet
});
test('streak: one rest day a week keeps it, a second missed day in the week breaks it', () => {
  const week = days('2026-09-21', 7);   // Mon to Sun
  const one = new Set(week.filter(d => d !== '2026-09-23'));
  let s = streak(one, '2026-09-27');
  assert.equal(s.streak, 6); assert.equal(s.rest, '2026-09-23');
  const two = new Set(week.filter(d => d !== '2026-09-23' && d !== '2026-09-25'));
  s = streak(two, '2026-09-27');
  assert.equal(s.streak, 2); assert.equal(s.best, 3); assert.equal(s.rest, '2026-09-23');   // this week's rest day is spent
  // A new week brings a new rest day: Sunday missed, Monday missed, the streak survives both.
  const across = new Set([...days('2026-09-21', 6), ...days('2026-09-29', 2)]);   // Mon-Sat, then Tue-Wed
  s = streak(across, '2026-09-30');
  assert.equal(s.streak, 8); assert.equal(s.rest, '2026-09-28');
  // Two days missed in a row inside one week: gone.
  assert.equal(streak(new Set([...days('2026-09-21', 2), ...days('2026-09-25', 2)]), '2026-09-26').streak, 2);
});
test('streak: counts entries the user made and no-spend check-ins, not imports, auto bills or a spouse', () => {
  const list = [tx('2026-09-27'), tx('2026-09-28', { source: 'import' }), tx('2026-09-28', { source: 'recurring' }), tx('2026-09-28', { by: 'Ali' }), tx('2026-09-29', { source: 'receipt', by: 'Siti' })];
  assert.deepEqual([...loggedDays(list, [], 'Siti')].sort(), ['2026-09-27', '2026-09-29']);
  assert.deepEqual([...loggedDays(list, ['2026-09-28'], 'Siti')].sort(), ['2026-09-27', '2026-09-28', '2026-09-29']);
});

test('badges: scans, streaks, backup, import, learned', () => {
  assert.deepEqual(earned({ tx: [], today: '2026-09-29' }), {});
  const scans = days('2026-09-01', 10).map(d => tx(d, { source: 'receipt', receiptId: `p${d}` }));
  const got = earned({ tx: [...scans, tx('2026-08-01', { source: 'statement', createdAt: at('2026-09-05') })], today: '2026-09-29', lastBackup: '2026-09-20T09:00', learnedOn: '2026-09-15' });
  assert.equal(got.scan1, '2026-09-01'); assert.equal(got.scan10, '2026-09-10');
  assert.equal(got.streak7, '2026-09-07'); assert.equal(got.streak30, undefined);
  assert.equal(got.backup, '2026-09-20'); assert.equal(got.import, '2026-09-05'); assert.equal(got.learned, '2026-09-15');
  assert.equal(earned({ tx: scans.slice(0, 9), today: '2026-09-29' }).scan10, undefined);
  assert.equal(dayOf(at('2026-02-03')), '2026-02-03');
  // Scanned and backed up on the real clock's 29th while the app's today is the 14th: earned on the 14th, not later.
  assert.deepEqual(earned({ tx: [tx('2026-09-14', { source: 'receipt', receiptId: 'p', createdAt: at('2026-09-29') })], today: '2026-09-14', lastBackup: '2026-09-29T08:00' }), { scan1: '2026-09-14', backup: '2026-09-14' });
});
test('badges: no-spend day only once the day is over and nothing was spent', () => {
  const t = [tx('2026-09-20')];
  assert.equal(earned({ tx: t, today: '2026-09-21', noSpend: ['2026-09-21'] }).nospend, undefined);   // still today
  assert.equal(earned({ tx: t, today: '2026-09-22', noSpend: ['2026-09-21'] }).nospend, '2026-09-22');
  assert.equal(earned({ tx: [...t, tx('2026-09-21', { source: 'recurring' })], today: '2026-09-22', noSpend: ['2026-09-21'] }).nospend, undefined);
});
test('badges: finished months under budget, fully logged, and less than the month before', () => {
  const aug = days('2026-08-01', 31).map(d => tx(d, { amount: 3000 }));   // RM 30 a day, every day of August
  const sep = days('2026-09-01', 10).map(d => tx(d, { amount: 5000 }));   // RM 500 in September so far
  let got = earned({ tx: [...aug, ...sep], today: '2026-09-29', budget: 100000 });
  assert.equal(got.budget, '2026-09-01'); assert.equal(got.fullmonth, '2026-09-01'); assert.equal(got.less, undefined);   // September isn't over
  got = earned({ tx: [...aug, ...sep], today: '2026-10-02', budget: 50000 });
  assert.equal(got.budget, '2026-10-01');   // August RM 930 is over RM 500; September RM 500 is within it
  assert.equal(got.less, '2026-10-01');     // September RM 500 < August RM 930
  assert.equal(earned({ tx: [...aug, ...sep], today: '2026-10-02' }).budget, undefined);   // no budget set
  // Imported history alone earns no month badges.
  assert.deepEqual(earned({ tx: aug.map(x => ({ ...x, source: 'import' })), today: '2026-10-02', budget: 999999 }), { import: '2026-08-01' });
  // Payday months: the 25th to the 24th.
  const cyc = days('2026-08-25', 31).map(d => tx(d));
  assert.equal(earned({ tx: cyc, today: '2026-09-29', startDay: 25 }).fullmonth, '2026-09-25');
});
