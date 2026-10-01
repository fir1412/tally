import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

test('parseAmount: Malaysian and messy inputs, rejects junk and absurd values', () => {
  const cases = { '12': 1200, '12.5': 1250, '12,50': 1250, 'RM12.90': 1290, 'RM 1,234.50': 123450, '1.234,50': 123450, '-3.00': -300, '3.00-': -300, '(4.20)': -420, '.5': 50, '0': 0 };
  for (const [s, want] of Object.entries(cases)) assert.equal(E.parseAmount(s), want, s);
  for (const bad of ['', 'abc', '1.234', '12.345', '1e5', '999999999999']) assert.equal(E.parseAmount(bad), null, bad);
  assert.equal(E.parseAmount(12.3), 1230);
});

test('fmtRM', () => {
  assert.equal(E.fmtRM(123450), 'RM 1,234.50');   // no line break inside an amount
  assert.equal(E.fmtRM(-5), '−RM 0.05');
  assert.equal(E.fmtRM(7, { plain: true }), '0.07');
});

test('allocate always sums exactly, including negative extras and zero bases', () => {
  for (const [parts, extra] of [[[1290, 700, 200], 364], [[333, 333, 334], 1], [[100, 200], -7], [[0, 0], 50], [[999], 1]]) {
    const out = E.allocate(parts, extra);
    assert.equal(out.reduce((a, b) => a + b, 0), extra, JSON.stringify(parts));
  }
});

test('breakdown spreads service, tax and rounding across item categories and sums to the total', () => {
  const tx = { type: 'expense', amount: 2555, items: [
    { name: 'Nasi Lemak', cents: 1290, category: 'dining' }, { name: 'Teh Tarik', cents: 700, category: 'dining' }, { name: 'Panadol', cents: 200, category: 'health' }] };
  const b = E.breakdown(tx);
  assert.equal(b.reduce((s, x) => s + x.cents, 0), 2555);
  assert.equal(b.find(x => x.category === 'health').cents, 233); // 200 + its share of 365
  assert.deepEqual(E.breakdown({ type: 'expense', amount: 500, category: 'transport' }), [{ category: 'transport', cents: 500 }]);
});

test('balances: opening, income, expense, transfers; upTo date', () => {
  const accounts = [{ id: 'cash', opening: 10000 }, { id: 'bank', opening: 50000 }];
  const txs = [
    { date: '2026-09-01', type: 'income', amount: 300000, accountId: 'bank' },
    { date: '2026-09-02', type: 'expense', amount: 2555, accountId: 'cash' },
    { date: '2026-09-03', type: 'transfer', amount: 20000, accountId: 'bank', toAccountId: 'cash' },
  ];
  const b = E.balances(accounts, txs);
  assert.equal(b.by.cash, 10000 - 2555 + 20000);
  assert.equal(b.by.bank, 50000 + 300000 - 20000);
  assert.equal(b.total, 60000 + 300000 - 2555);
  assert.equal(E.balances(accounts, txs, '2026-09-01').total, 360000);
});

test('monthSpend ignores transfers and income; cashFlow; balanceTrend', () => {
  const txs = [
    { date: '2026-09-02', type: 'expense', amount: 1000, category: 'dining' },
    { date: '2026-09-03', type: 'transfer', amount: 5000, accountId: 'a', toAccountId: 'b' },
    { date: '2026-09-04', type: 'income', amount: 9000, accountId: 'a' },
    { date: '2026-08-30', type: 'expense', amount: 700, category: 'groceries' },
  ];
  const { total, byCat } = E.monthSpend(txs, '2026-09');
  assert.deepEqual({ total, byCat }, { total: 1000, byCat: { dining: 1000 } });
  const cf = E.cashFlow(txs, '2026-09', 2);
  assert.deepEqual(cf, [{ ym: '2026-08', income: 0, expense: 700 }, { ym: '2026-09', income: 9000, expense: 1000 }]);
  assert.equal(E.balanceTrend([{ id: 'a', opening: 0 }], txs.map(t => ({ ...t, accountId: 'a' })), '2026-09-29', 2)[0].date, '2026-08-31');
});

test('pace projects month-end spend', () => {
  const p = E.pace(100000, 60000, '2026-09-15');
  assert.equal(p.projected, 120000);
  assert.equal(p.over, true);
  assert.equal(p.daysLeft, 15);
});

test('categorize: English, Malay, Chinese, shop fallback, and user rules win', () => {
  assert.equal(E.categorize('Nasi Lemak Ayam'), 'dining');
  assert.equal(E.categorize('TELUR AYAM GRED A'), 'groceries');
  assert.equal(E.categorize('Sabun Basuh'), 'household');
  assert.equal(E.categorize('白米 5KG'), 'groceries');
  assert.equal(E.categorize('奶粉'), 'kids');
  assert.equal(E.categorize('KS SNRS 2PK', 'COSTCO'), 'other');
  assert.equal(E.categorize('XYZ 123', '99 SPEEDMART'), 'groceries');
  assert.equal(E.categorize('KS SNRS 2PK', '', { 'KS SNRS 2PK': 'kids' }), 'kids');
  assert.equal(E.shopCategory('PETRONAS SS2'), 'transport');
});

test('findDuplicate: same day, same amount, similar shop (a lunch repeated tomorrow is not a duplicate)', () => {
  const a = { id: 'a', type: 'expense', amount: 2555, date: '2026-09-01', merchant: 'RESTORAN MAJU JAYA' };
  assert.equal(E.findDuplicate({ id: 'b', type: 'expense', amount: 2555, date: '2026-09-01', merchant: 'Restoran Maju Jaya SDN BHD' }, [a])?.id, 'a');
  assert.equal(E.findDuplicate({ id: 'e', type: 'expense', amount: 2555, date: '2026-09-02', merchant: 'RESTORAN MAJU JAYA' }, [a]), null);
  assert.equal(E.findDuplicate({ id: 'c', type: 'expense', amount: 2555, date: '2026-09-09', merchant: 'RESTORAN MAJU JAYA' }, [a]), null);
  assert.equal(E.findDuplicate({ id: 'd', type: 'expense', amount: 2556, date: '2026-09-01', merchant: 'RESTORAN MAJU JAYA' }, [a]), null);
});

test('insights: only the latest price change per item, at most 3', () => {
  const buy = (date, name, cents) => ({ id: date + name, date, type: 'expense', amount: cents, items: [{ name, cents, category: 'groceries' }] });
  const txs = [];
  for (const name of ['Ikan', 'Ayam', 'Sayur', 'Telur']) txs.push(buy('2026-09-01', name, 500), buy('2026-09-04', name, 600), buy('2026-09-10', name, 700));
  txs.push(buy('2026-09-12', 'Telur', 800));
  const p = E.insights({ txs, today: '2026-09-20' }).filter(i => i.kind === 'price');
  assert.deepEqual(p.map(i => i.title[1].raw), ['Telur', 'Ikan', 'Ayam']);
  assert.deepEqual(p[0].body, ['This time {0}, last time ({1}) {2}', E.fmtRM(800), { date: '2026-09-10' }, E.fmtRM(700)]);
});

test('insights: pace warning, item pattern, recurring bill, recap', () => {
  const txs = [];
  for (const m of ['06', '07', '08', '09']) txs.push({ id: 'u' + m, date: `2026-${m}-03`, type: 'expense', amount: 12900, merchant: 'UNIFI TM', category: 'bills' });
  for (const d of ['02', '10', '18']) txs.push({ id: 'k' + d, date: `2026-09-${d}`, type: 'expense', amount: 2200, merchant: 'AEON', items: [{ name: 'Coffee pods', cents: 2200, category: 'groceries' }] });
  const ins = E.insights({ txs, budgets: { total: 20000 }, today: '2026-09-20' });
  const kinds = ins.map(i => i.kind);
  assert.ok(kinds.includes('pace'));
  assert.equal(ins[0].level, 'warn');
  assert.ok(ins.some(i => i.kind === 'item' && i.title[1].raw === 'Coffee pods' && i.title[2] === 3));
  assert.ok(ins.some(i => i.kind === 'recurring' && i.rec.amount === 12900));
  assert.ok(!E.insights({ txs, today: '2026-09-20', knownBills: [E.billKey('UNIFI TM')] }).some(i => i.kind === 'recurring'));
  assert.ok(E.insights({ txs, today: '2026-10-02' }).some(i => i.kind === 'recap'));
});

test('validIso and date helpers', () => {
  assert.ok(E.validIso('2026-02-28'));
  assert.ok(!E.validIso('2026-02-30'));
  assert.ok(!E.validIso('28/02/2026'));
  assert.equal(E.addMonths('2026-01', -1), '2025-12');
  assert.equal(E.daysInMonth('2028-02'), 29);
});

test('habits: weekday lunch around 12:30 is found; nudge after it passes unlogged, not before, not once logged', () => {
  const txs = [['2026-09-14', '12:20'], ['2026-09-15', '12:45'], ['2026-09-16', '13:05'], ['2026-09-17', '12:30'], ['2026-09-19', '19:00']]
    .map(([date, time], i) => ({ id: 'l' + i, date, time, type: 'expense', amount: 1200 + i * 10, category: 'dining' }));
  txs.push({ id: 'g', date: '2026-09-18', time: '09:00', type: 'expense', amount: 5000, category: 'groceries' }); // once: no habit
  const hs = E.habits(txs, '2026-09-28');
  assert.equal(hs.length, 1);
  assert.deepEqual({ ...hs[0] }, { category: 'dining', days: 'weekday', at: '12:45', count: 4, amount: 1220 });
  assert.equal(E.dueNudge(hs, txs, '2026-09-28T12:50'), null);             // too early
  assert.equal(E.dueNudge(hs, txs, '2026-09-28T13:30')?.category, 'dining'); // 45 min after, nothing logged
  assert.equal(E.dueNudge(hs, txs, '2026-09-27T13:30'), null);             // Sunday: weekday habit
  assert.equal(E.dueNudge(hs, [...txs, { date: '2026-09-28', time: '12:40', type: 'expense', amount: 900, category: 'dining' }], '2026-09-28T13:30'), null);
  assert.equal(E.dueNudge(hs, txs, '2026-09-28T13:30', ['dining|weekday|2026-09-28']), null); // dismissed today
  assert.deepEqual(E.habits(txs.map(t => ({ ...t, time: undefined })), '2026-09-28'), []); // no times, no habits
});

test('a phone and wet-market food in one mall payment sort into Electronics and Groceries; bills and medicine stay put', () => {
  const at = n => E.categorize(n, 'Mid Valley Megamall');
  assert.deepEqual(['iPhone 16 Pro', 'Samsung charger', 'Ikan kembung', 'Udang besar', 'Sayur bayam'].map(at), ['electronics', 'electronics', 'groceries', 'groceries', 'groceries']);
  assert.equal(E.categorize('Maxis phone bill'), 'bills');
  assert.equal(E.categorize('Panadol tablet'), 'health');
  assert.equal(E.shopCategory('Senheng Electric'), 'electronics');
});

test('bill suggestions: not fuel, not an instalment that has ended, not one that stopped months ago', () => {
  const tx = (d, merchant, amount, category = 'bills', note = '') => ({ id: d + merchant, type: 'expense', date: d, merchant, amount, category, note });
  const months = ['2026-06', '2026-07', '2026-08', '2026-09'];
  const txs = [
    ...months.map(m => tx(`${m}-05`, 'Unifi', 12900)),
    ...months.map(m => tx(`${m}-10`, 'Shell Fuel', 15000, 'transport')),
    ...months.map((m, i) => tx(`${m}-15`, 'Harvey Norman', 25000, 'shopping', `Instalment ${9 + i}/12`)),
    ...['2026-01', '2026-02', '2026-03'].map(m => tx(`${m}-20`, 'Old Gym', 15000, 'fun')),
  ];
  assert.deepEqual(E.recurringCandidates(txs).map(r => r.merchant), ['Unifi']);
});

test('categorize: street and place words never decide; Malaysian life words; car upkeep is Transport', () => {
  const c = s => E.categorize(s, s);
  assert.equal(c('Petronas JLN Hospital KB'), 'transport');            // not Health
  assert.equal(c('7-Eleven Jln Hospital'), 'groceries');
  assert.equal(c('Kedai Runcit Taman Sekolah'), 'groceries');          // not Kids
  assert.equal(c('Kg Baru Nasi Lemak'), 'dining');
  assert.equal(E.categorize('Beras 5 kg'), 'groceries');                // a weight, not a kampung
  for (const s of ['Hotlink prepaid', 'Xpax reload kredit', 'Air Selangor']) assert.equal(c(s), 'bills', s);
  for (const [s, k] of [['Siti Aminah Sewa Bilik', 'housing'], ['House rent', 'housing'], ['Rent', 'housing'], ['Yuran penyelenggaraan', 'housing'], ['PTPTN', 'loans'], ['Car loan Sept', 'loans'], ['Atome', 'loans'], ['Takaful Ikhlas', 'insurance'], ['Great Eastern premium', 'insurance']]) assert.equal(c(s), k, s);
  for (const s of ['Popular Bookstore', 'Kedai Buku Ilmu', 'Stationery']) assert.equal(c(s), 'education', s);
  for (const s of ['Shopee Malaysia', 'Lazada', 'Zalora', 'TikTok Shop', 'Uniqlo KLCC']) assert.equal(c(s), 'shopping', s);
  for (const s of ['虾', '苹果', '葱', '姜', '榴莲', '蒜', '辣椒']) assert.equal(E.categorize(s), 'groceries', s);
  for (const s of ['Minyak enjin 4L', 'Engine oil', 'Filter minyak', 'Oil filter', 'Tayar Michelin', 'Tyre', 'Tampal tayar', 'Puncture', 'Wiper', 'Bateri kereta', 'Car battery',
    'Servis kereta', 'Car service', 'Bengkel Ah Seng', 'Workshop', 'Spark plug', 'Brek', 'Brake pad', 'Absorber', 'Alignment', 'Road tax', 'Cukai jalan', 'Insurans kereta']) assert.equal(E.categorize(s), 'transport', s);
  assert.equal(E.categorize('Filter'), 'other');                        // too generic alone
  assert.equal(E.categorize('Upah'), 'other');
  assert.equal(E.categorize('Minyak masak'), 'groceries');              // cooking oil stays groceries
});

test('income categories: allowance and money from family, alongside salary', () => {
  assert.ok(['allowance', 'family'].every(id => E.INCOME_CATEGORIES.some(c => c.id === id)));
  for (const [s, want] of [['ELAUN SYIF MALAM KKM', 'allowance'], ['PTPTN disbursement', 'allowance'], ['Biasiswa JPA', 'allowance'], ['Scholarship', 'allowance'],
    ['Duit mak', 'family'], ['Duit ayah bulan ni', 'family'], ['家用', 'family'], ['SALARY ACME', 'salary'], ['Refund Shopee', 'income']]) assert.equal(E.incomeCategory(s), want, s);
});

test('calcAmount: sums in amount fields, to the sen, never eval', () => {
  const ok = { '12.50+8*2': 2850, '100/3': 3333, '(10+5)×2': 3000, '90÷4': 2250, '20−5.5': 1450, '0.1+0.2': 30, 'RM 5*3': 1500, '-2+5': 300, '12.50': 1250, '12,50': 1250, '2*(3+(4-1))': 1200 };
  for (const [s, want] of Object.entries(ok)) assert.equal(E.calcAmount(s), want, s);
  for (const bad of ['', '5/0', '1+', '(1+2', '2+3)', 'alert(1)', '2**3', '1e5+1', 'constructor', '9'.repeat(12) + '*9', '++']) assert.equal(E.calcAmount(bad), null, bad);
});

test('cycleOf: payday months, month ends and the new year', () => {
  assert.deepEqual(E.cycleOf('2026-09-29', 1), { key: '2026-09', start: '2026-09-01', end: '2026-09-30' });
  assert.deepEqual(E.cycleOf('2026-09-29', 25), { key: '2026-09', start: '2026-09-25', end: '2026-10-24' });
  assert.deepEqual(E.cycleOf('2026-10-24', 25), { key: '2026-09', start: '2026-09-25', end: '2026-10-24' });
  assert.deepEqual(E.cycleOf('2026-01-10', 25), { key: '2025-12', start: '2025-12-25', end: '2026-01-24' });
  assert.deepEqual(E.cycleOf('2026-03-27', 28), { key: '2026-02', start: '2026-02-28', end: '2026-03-27' });
  assert.equal(E.cycleOf('2026-09-29', 40).start, '2026-09-28');   // clamped to 1–28
  const txs = [{ date: '2026-09-24', type: 'expense', amount: 100 }, { date: '2026-09-25', type: 'expense', amount: 200 }, { date: '2026-10-24', type: 'expense', amount: 400 }];
  assert.equal(E.monthSpend(txs, '2026-09', 25).total, 600);
  assert.equal(E.monthSpend(txs, '2026-08', 25).total, 100);
  assert.equal(E.balanceTrend([{ id: 'a', opening: 0 }], [], '2026-09-29', 2, 25)[0].date, '2026-09-24');
});

test('pace: calm in the first 7 days; big single payments and bills count but are not a daily rate', () => {
  assert.equal(E.pace(100000, 60000, '2026-09-05').over, false);            // day 5: never "heading over"
  assert.equal(E.pace(100000, 60000, '2026-09-08').over, true);
  // Rent of RM 500 on day 10 of a RM 1,000 budget, plus RM 100 of everyday spending: not heading over.
  const p = E.pace(100000, 60000, '2026-09-10', { amounts: [50000, 4000, 6000] });
  assert.equal(p.projected, 50000 + 30000);
  assert.equal(p.over, false);
  assert.equal(E.pace(100000, 60000, '2026-09-10').projected, 180000);      // without the list: straight line
  assert.equal(E.pace(100000, 60000, '2026-09-10', { amounts: [10000], fixed: 50000 }).projected, 80000);
  // Payday cycle 25 Sep – 24 Oct (30 days), day 15.
  const c = E.pace(30000, 15000, '2026-10-09', { startDay: 25 });
  assert.deepEqual([c.projected, c.daysLeft], [30000, 15]);
  const s = E.monthSpend([{ date: '2026-09-02', type: 'expense', amount: 12900, source: 'recurring', bill: 'b1', category: 'bills' }, { date: '2026-09-03', type: 'expense', amount: 500, category: 'dining' }], '2026-09');
  assert.deepEqual([s.fixed.total, s.each.total], [12900, [500]]);
});

test('bills: due dates at month ends, weekly, yearly, instalments; added once; paid whatever the amount', () => {
  const m = { id: 'b1', name: 'Astro', amount: 12900, day: 31, start: '2026-01-31', accountId: 'a', category: 'bills', auto: true };
  assert.deepEqual(E.billDates(m, '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.deepEqual(E.billDates({ ...m, day: 29, start: '2028-01-29' }, '2028-03-01'), ['2028-01-29', '2028-02-29']);
  assert.deepEqual(E.billDates({ ...m, freq: 'weekly', start: '2026-09-01' }, '2026-09-20'), ['2026-09-01', '2026-09-08', '2026-09-15']);
  assert.deepEqual(E.billDates({ ...m, freq: 'yearly', day: 29, start: '2028-02-29' }, '2030-12-31'), ['2028-02-29', '2029-02-28', '2030-02-28']);
  assert.deepEqual(E.billDates({ ...m, count: 2 }, '2026-12-31'), ['2026-01-31', '2026-02-28']);
  assert.deepEqual(E.billDates({ ...m, until: '2026-03-15' }, '2026-12-31'), ['2026-01-31', '2026-02-28']);
  // Before 0.4.0 a bill had only a day; its status doesn't depend on how far ahead we look.
  const old = { id: 'o', name: 'TNB', amount: 1, day: 20 };
  assert.deepEqual(E.billDates(old, '2026-09-29').slice(-2), ['2026-08-20', '2026-09-20']);
  assert.deepEqual(E.billStatus(old, '2026-09-29', []), { date: '2026-09-20', next: '2026-10-20', paid: false, days: -9 });

  const r = { ...m, day: 5, start: '2026-07-05' };
  const first = E.dueBillTxs([r], '2026-09-29', [], 1);
  assert.deepEqual(first.map(x => [x.id, x.date, x.source, x.bill, x.merchant]), [['rec-b1-2026-07-05', '2026-07-05', 'recurring', 'b1', 'Astro'], ['rec-b1-2026-08-05', '2026-08-05', 'recurring', 'b1', 'Astro'], ['rec-b1-2026-09-05', '2026-09-05', 'recurring', 'b1', 'Astro']]);
  assert.deepEqual(E.dueBillTxs([r], '2026-09-29', first), []);                                     // running again adds nothing
  assert.deepEqual(E.dueBillTxs([{ ...r, last: '2026-09-29' }], '2026-09-29', []), []);             // undone: not added again
  assert.deepEqual(E.dueBillTxs([{ ...r, last: '2026-08-31' }], '2026-10-05', []).map(x => x.date), ['2026-09-05', '2026-10-05']);
  const paidByHand = [{ id: 'x', type: 'expense', date: '2026-08-02', amount: 13455, merchant: ' astro ' }];   // a different amount
  assert.deepEqual(E.dueBillTxs([r], '2026-09-29', paidByHand).map(x => x.date), ['2026-07-05', '2026-09-05']);
  assert.deepEqual(E.dueBillTxs([{ ...r, auto: false }], '2026-09-29', []), []);
  assert.deepEqual(E.dueBillTxs([{ ...r, freq: 'weekly', start: '2026-09-14' }], '2026-09-29', []).map(x => x.date), ['2026-09-14', '2026-09-21', '2026-09-28']);

  // Status: overdue stays until paid; paid for the month whatever the amount; the next one takes over 3 days before.
  assert.deepEqual(E.billStatus(r, '2026-10-20', []), { date: '2026-10-05', next: '2026-11-05', paid: false, days: -15 });
  assert.equal(E.billStatus(r, '2026-10-20', [{ id: 'y', type: 'expense', date: '2026-10-19', amount: 9900, merchant: 'Astro' }]).paid, true);
  assert.equal(E.billStatus(r, '2026-11-02', []).date, '2026-11-05');
  assert.equal(E.billStatus(r, '2026-10-20', [{ id: 'z', type: 'expense', date: '2026-10-05', amount: 1, bill: 'b1', merchant: 'x' }]).paid, true);
  assert.equal(E.billStatus({ ...r, count: 2 }, '2026-12-01', []).next, undefined);                  // instalments finished
  assert.equal(E.billStatus({ ...r, start: '2026-12-05' }, '2026-10-01', []).date, undefined);         // not started
});

test('bill payments stay out of the unusual-week insight', () => {
  const txs = [];
  for (let w = 1; w <= 8; w++) txs.push({ id: 'g' + w, date: E.addDays('2026-09-22', -7 * w), type: 'expense', amount: 3000, category: 'household' });
  txs.push({ id: 'rec-b-2026-09-25', date: '2026-09-25', type: 'expense', amount: 90000, category: 'household', source: 'recurring', bill: 'b' });
  assert.ok(!E.insights({ txs, today: '2026-09-28' }).some(i => i.kind === 'unusual'));
  txs.at(-1).source = 'quick'; delete txs.at(-1).bill;
  assert.ok(E.insights({ txs, today: '2026-09-28' }).some(i => i.kind === 'unusual'));
});

test('a year typed as 26 is not a date', () => { assert.equal(E.validIso('0026-09-01'), false); assert.equal(E.validIso('2026-09-01'), true); assert.equal(E.validIso('1995-02-28'), true); });

test('bank signs on either side, and DR / CR', () => { for (const [v, want] of [['3,520.40+', 352040], ['+3,520.40', 352040], ['60.00-', -6000], ['3520.40 CR', 352040], ['12.50DR', -1250], ['(7.00)', -700]]) assert.equal(E.parseAmount(v), want, v); });
test('category colours: built-ins all differ; a new category takes a colour not in use', () => {
  assert.equal(new Set(E.CATEGORIES.map(c => c.color.toLowerCase())).size, E.CATEGORIES.length);
  assert.ok(E.CUSTOM_COLORS.every(c => !E.CATEGORIES.some(b => b.color.toLowerCase() === c.toLowerCase())));
  assert.equal(E.nextColor([]), E.CUSTOM_COLORS[0]);
  assert.equal(E.nextColor([E.CUSTOM_COLORS[0].toLowerCase()]), E.CUSTOM_COLORS[1]);
});

test('daily reminder: every day at the chosen time, from today if still ahead, else tomorrow', async () => {
  const { dailyEvent, ics } = await import('../js/calendar.js');
  const morning = dailyEvent({ at: '21:00', title: 'Tally' }, new Date(2026, 8, 29, 8, 0));
  assert.equal(morning.start, '20260929T210000'); assert.equal(morning.rrule, 'FREQ=DAILY');
  assert.equal(dailyEvent({ at: '21:00', title: 'Tally' }, new Date(2026, 8, 29, 22, 0)).start, '20260930T210000');
  assert.match(ics([morning]), /RRULE:FREQ=DAILY/);
});

test('categories people named in the simulation', () => {
  for (const [n, c] of [['Economy rice', 'dining'], ['BRT Sunway', 'transport'], ['Rapid Penang 巴士', 'transport'], ['Fotostat nota', 'education'], ["Lotus's groceries", 'groceries'], ['ROTI TELUR', 'dining']]) assert.equal(E.categorize(n, ''), c, n);
  assert.equal(E.shopCategory('KK Mart'), 'groceries');
});

test('bill suggestions: 20,000 everyday rows (Grab, food delivery, supermarkets, Shopee, makan) suggest only the real bills', () => {
  let seed = 7; const rnd = n => { seed = seed * 16807 % 2147483647; return seed % n; };
  const everyday = ['Grab', 'GrabFood', 'Foodpanda', 'Shopee', 'Lazada', 'Tesco Extra Ampang', 'Makan tengah hari', '99 Speedmart', 'Kedai Ah Kow'];
  const txs = [], ym = k => E.addMonths('2024-10', k), pad = d => String(d).padStart(2, '0');
  for (let i = 0; i < 20000; i++) {   // imported rows: no categories, common round prices, any day
    const m = ym(rnd(24)), merchant = everyday[rnd(everyday.length)];
    txs.push({ id: `e${i}`, type: 'expense', date: `${m}-${pad(1 + rnd(28))}`, merchant, amount: (10 + rnd(60)) * 100 + [0, 50][rnd(2)], category: 'other' });
  }
  for (let k = 0; k < 24; k++) {
    txs.push({ id: `u${k}`, type: 'expense', date: `${ym(k)}-05`, merchant: 'Unifi', amount: 12900, category: 'other' });
    txs.push({ id: `n${k}`, type: 'expense', date: `${ym(k)}-12`, merchant: 'Netflix', amount: 5500, category: 'other' });
    if (k >= 18) txs.push({ id: `p${k}`, type: 'expense', date: `${ym(k)}-20`, merchant: 'Shopee PayLater', amount: 15000, category: 'other' });   // the same amount each month
  }
  assert.deepEqual(E.recurringCandidates(txs).map(r => r.merchant).sort(), ['Netflix', 'Shopee PayLater', 'Unifi']);
});

test('belowSince: the day cash last went below zero, so the warning comes once per time it happens', () => {
  const a = { id: 'c', opening: 1000 }, x = (date, type, amount, o = {}) => ({ date, type, amount, accountId: 'c', ...o });
  assert.equal(E.belowSince(a, []), '');
  const txs = [x('2026-09-01', 'expense', 800), x('2026-09-03', 'expense', 500), x('2026-09-03', 'income', 400), x('2026-09-05', 'expense', 300)];
  assert.equal(E.belowSince(a, txs), '2026-09-05');   // the 3rd ends at RM 1.00: not below zero that day
  assert.equal(E.belowSince(a, [...txs, x('2026-09-06', 'expense', 100)]), '2026-09-05');   // still the same time
  const back = [...txs, { date: '2026-09-07', type: 'transfer', amount: 5000, accountId: 'b', toAccountId: 'c' }];
  assert.equal(E.belowSince(a, back), '');
  assert.equal(E.belowSince(a, [...back, x('2026-09-20', 'expense', 9000)]), '2026-09-20');   // a new time: warned again
});

test('pickAccount: bills from the main bank, receipts by shop, size and habit, quick adds from the everyday account', () => {
  const accounts = [{ id: 'cash', kind: 'cash' }, { id: 'mbb', kind: 'bank' }, { id: 'cimb', kind: 'bank' }, { id: 'tng', kind: 'ewallet' }, { id: 'visa', kind: 'card' }];
  let n = 0;
  const x = (accountId, o = {}) => ({ id: `x${n++}`, type: 'expense', date: '2026-09-01', amount: 1200, category: 'dining', accountId, createdAt: n, ...o });
  const txs = [
    x('cimb', { type: 'income', category: 'salary', amount: 500000 }), x('mbb'), x('mbb'), x('mbb'),   // salary lands in CIMB; Maybank used more
    x('visa', { merchant: 'Lotus\'s Kepong', category: 'groceries', amount: 18000 }), x('visa', { merchant: 'Petronas', category: 'transport', amount: 6000 }),
    x('tng', { merchant: 'Kopitiam Ah Seng', amount: 900 }), x('cash', { amount: 800 }),   // the latest everyday spending: cash
  ];
  const bal = { cash: 5000, mbb: 200000, cimb: 300000, tng: 4000, visa: -30000 };
  const pick = (kind, o = {}) => E.pickAccount({ accounts, txs, bal, kind, ...o });
  assert.equal(pick('bill'), 'cimb');                                                    // salary account, never cash or the last used
  assert.equal(E.pickAccount({ accounts, txs: txs.slice(1), bal, kind: 'bill' }), 'mbb'); // no salary: the bank used most
  assert.equal(E.pickAccount({ accounts: accounts.slice(0, 1), bal, kind: 'bill' }), 'cash');   // only cash: cash
  assert.equal(pick('quick'), 'cash');                                                   // the last everyday account
  assert.equal(pick('receipt', { shop: 'KOPITIAM AH SENG SDN BHD', amount: 1500 }), 'tng');   // this shop: paid by e-wallet before
  assert.equal(pick('receipt', { shop: 'Jaya Grocer', category: 'groceries', amount: 3000 }), 'visa');   // supermarket: the usual card
  assert.equal(pick('receipt', { shop: 'Kedai Baru', amount: 12000 }), 'visa');          // RM 50+: card, bank or e-wallet, not cash
  assert.equal(pick('receipt', { shop: 'Kedai Baru', amount: 1000 }), 'cash');           // small and new: the everyday account
  // Never an account that would go below zero while another has the money (a card may owe).
  assert.equal(pick('quick', { amount: 6000 }), 'cimb');
  assert.equal(E.pickAccount({ accounts, txs, bal: { ...bal, cash: -500 }, kind: 'quick' }), 'cimb');
  assert.equal(E.pickAccount({ accounts: accounts.slice(0, 1), txs, bal: { cash: -500 }, kind: 'quick' }), 'cash');   // nothing better
  assert.equal(pick('receipt', { shop: 'Petronas', amount: 9000 }), 'visa');             // a card is never "short"
});

test('the receipt says how it was paid: card, e-wallet or cash; a card or wallet receipt goes to that kind of account; money in to where income lands', async () => {
  const { payKind } = await import('../js/parse.js');
  assert.equal(payKind(['TOTAL 294.80', 'VISA ************1234 294.80']), 'card');
  assert.equal(payKind(['CASH BILL', 'TOTAL 12.00', 'TNG EWALLET 12.00']), 'ewallet');
  assert.equal(payKind(['CASH BILL', 'TOTAL 12.00', 'CASH 20.00', 'CHANGE 8.00']), 'cash');
  assert.equal(payKind(['CASH SALE', 'TOTAL 12.00']), null);   // a title, not how it was paid
  const accounts = [{ id: 'cash', kind: 'cash' }, { id: 'mbb', kind: 'bank' }, { id: 'tng', kind: 'ewallet' }, { id: 'visa', kind: 'card' }];
  const txs = [{ id: 's', type: 'income', category: 'salary', accountId: 'mbb', amount: 500000, date: '2026-09-01' }, { id: 'e', type: 'expense', accountId: 'tng', amount: 900, date: '2026-09-02', createdAt: 9 }];
  const bal = { cash: 5000, mbb: 200000, tng: 100, visa: 0 };
  assert.equal(E.pickAccount({ accounts, txs, bal, kind: 'receipt', amount: 29480, pay: 'card' }), 'visa');
  assert.equal(E.pickAccount({ accounts, txs, bal, kind: 'receipt', amount: 1200, pay: 'ewallet' }), 'tng');   // even when TNG looks short: that's what paid
  assert.equal(E.pickAccount({ accounts, txs, bal, kind: 'income' }), 'mbb');
});

test('a refund is money back: the balance goes up, spending in its category goes down, and it is not income', () => {
  const txs = [{ id: 'a', type: 'expense', date: '2026-09-02', amount: 12000, accountId: 'b', category: 'shopping' },
    { id: 'r', type: 'income', date: '2026-09-05', amount: 4000, accountId: 'b', category: 'refund', cat: 'shopping' },
    { id: 's', type: 'income', date: '2026-09-01', amount: 300000, accountId: 'b', category: 'salary' }];
  const m = E.monthSpend(txs, '2026-09');
  assert.deepEqual([m.total, m.byCat.shopping], [8000, 8000]);
  assert.equal(E.monthIncome(txs, '2026-09'), 300000);
  assert.equal(E.balances([{ id: 'b', opening: 0 }], txs).total, 300000 - 12000 + 4000);
});

test('"Only my categories": no guesses from Tally\'s word lists, only what the user taught it', () => {
  try {
    E.ownCategories(true);
    assert.equal(E.categorize('Nasi lemak ayam', 'Restoran Maju'), 'other');
    assert.equal(E.categorize('Nasi lemak ayam', 'Restoran Maju', { 'NASI LEMAK AYAM': 'c_breakfast' }), 'c_breakfast');
    assert.equal(E.shopCategory('KFC'), 'other');
  } finally { E.ownCategories(false); }
  assert.equal(E.categorize('Nasi lemak ayam', 'Restoran Maju'), 'dining');
});

test('default account: a Singapore receipt to the SGD account, ringgit never to a foreign one, MyDebit/NETS to the bank, a shop to where it was paid before', () => {
  const accounts = [{ id: 'cash', kind: 'cash' }, { id: 'mbb', kind: 'bank' }, { id: 'tng', kind: 'ewallet' }, { id: 'dbs', kind: 'bank', currency: 'SGD' }, { id: 'idr', kind: 'bank', currency: 'IDR' }];
  let n = 0; const x = (accountId, o = {}) => ({ id: `x${n++}`, type: 'expense', date: '2026-09-01', amount: 900, category: 'dining', accountId, createdAt: n, ...o });
  const txs = [x('tng', { merchant: 'Tol Duta' }), x('cash', { merchant: 'Nasi lemak' })];
  const bal = { cash: 5000, mbb: 200000, tng: 100, dbs: 50000, idr: 750000000 };
  const pick = o => E.pickAccount({ accounts, txs, bal, ...o });
  assert.equal(pick({ kind: 'receipt', currency: 'SGD', amount: 1698 }), 'dbs');
  assert.equal(pick({ kind: 'receipt', currency: 'SGD', pay: 'debit', amount: 1698 }), 'dbs');   // NETS: the SGD bank
  assert.equal(pick({ kind: 'receipt', pay: 'debit', amount: 1290 }), 'mbb');                     // MyDebit: the ringgit bank
  assert.equal(pick({ kind: 'receipt', pay: 'card', amount: 1290 }), 'mbb');                      // VISA, no card account: the bank
  assert.equal(pick({ kind: 'quick', amount: 25000 }), 'mbb');                                    // short cash: a ringgit account, never the IDR one
  assert.equal(pick({ kind: 'quick', shop: 'Tol Duta', amount: 850 }), 'tng');                    // this shop's habit
  assert.equal(E.pickAccount({ accounts, txs: [...txs, x('mbb', { source: 'receipt', createdAt: 99 })], bal, kind: 'quick', amount: 500 }), 'cash');   // a scanned receipt isn't the everyday account
});

test('money received from a payer lands where that payer paid before', () => {
  const accounts = [{ id: 'cash', kind: 'cash' }, { id: 'bank', kind: 'bank' }, { id: 'boost', kind: 'ewallet' }];
  const txs = [{ id: '1', type: 'income', date: '2026-09-01', amount: 5000, accountId: 'boost', category: 'income', merchant: 'Lalamove job' },
    { id: '2', type: 'income', date: '2026-09-02', amount: 5000, accountId: 'boost', category: 'income', merchant: 'Lalamove job' },
    { id: '3', type: 'income', date: '2026-09-07', amount: 90000, accountId: 'bank', category: 'income', merchant: 'Lalamove minggu' }];
  assert.equal(E.pickAccount({ accounts, txs, kind: 'income', shop: 'Lalamove minggu' }), 'bank');
  assert.equal(E.pickAccount({ accounts, txs, kind: 'income' }), 'boost');
});

test('guesses people typed: Chinese fuel is transport, meals are dining, cooking oil stays groceries', () => {
  for (const [n, c] of [['油费', 'transport'], ['汽油', 'transport'], ['Sarapan', 'dining'], ['lunch', 'dining'], ['早餐', 'dining'], ['Minyak masak', 'groceries']]) assert.equal(E.categorize(n, n), c, n);
});

test('a stall\'s cash is never the default for a personal typed spend', () => {
  const accounts = [{ id: 'cash', kind: 'cash' }, { id: 'bank', kind: 'bank' }, { id: 'stall', kind: 'cash', scope: 'business' }];
  const txs = [{ id: '1', type: 'income', date: '2026-09-01', amount: 30000, accountId: 'stall', category: 'income', createdAt: 5 }];
  assert.notEqual(E.pickAccount({ accounts, txs, kind: 'quick', amount: 1200 }), 'stall');
  assert.equal(E.pickAccount({ accounts: accounts.slice(2), txs, kind: 'quick', amount: 1200 }), 'stall');   // the Business view: its own accounts
});

test('learnNames: remembers item names the user fixed, forgets one put back, null when nothing changed', () => {
  const m = E.learnNames({}, [{ name: 'WS BT21 WET WIPES', raw: '1023497 WS B121 WET WIPES' }, { name: 'SWEET CORN 2PCS', raw: 'SWEET CORN 2PCS' }]);
  assert.deepEqual(m, { 'WS B121 WET WIPES': 'WS BT21 WET WIPES' });   // the code is dropped from the key: the same misread on the next slip
  assert.equal(E.learnNames(m, [{ name: 'WS BT21 WET WIPES', raw: 'WS B121 WET WIPES' }]), null);
  assert.deepEqual(E.learnNames(m, [{ name: 'WS B121 WET WIPES', raw: 'WS B121 WET WIPES' }]), {});
  assert.equal(E.learnNames(m, [{ name: 'Typed', raw: '' }]), null);   // an item added by hand has no reading to fix
});

test('everyday Malaysian items land where people expect (checked against 796 PriceCatcher items)', () => {
  const c = n => E.categorize(n);
  assert.equal(c('AYAM GORENG'), 'dining'); assert.equal(c('SUP DAGING'), 'dining'); assert.equal(c('ROTI TISU'), 'dining'); assert.equal(c('MURTABAK AYAM'), 'dining');
  assert.equal(c('SERBUK NASI GORENG CINA ADABI'), 'groceries'); assert.equal(c('REMPAH SUP'), 'groceries'); assert.equal(c('MINYAK MASAK BURUH 5KG'), 'groceries');
  assert.equal(c('UBAT GIGI COLGATE'), 'personal'); assert.equal(c('KACANG BOTOL'), 'groceries');   // not Health, not Transport ("tol")
  assert.equal(c('PETPET DAY NIGHT PANTS'), 'kids'); assert.equal(c('SANTAN KARA 200ML'), 'groceries'); assert.equal(c('DEODORAN NIVEA'), 'personal');
});

test('can I afford it counts everyday money only: RM 10,000 in ASB doesn\'t buy a RM 3,000 phone', () => {
  const accounts = [{ id: 'b', kind: 'bank', opening: 80000 }, { id: 's', kind: 'savings', opening: 1000000 }, { id: 'o', kind: 'owedme', opening: 50000 }, { id: 'c', kind: 'card', opening: -20000 }, { id: 'u', kind: 'cash', opening: 99999, typed: false }];
  const m = E.affordMoney(accounts, []);
  assert.deepEqual(m, { balance: 60000, savings: 1000000 }, 'bank and card (what it owes); savings apart; owed and never-set left out');
  assert.notEqual(E.affordCheck({ price: 300000, balance: E.affordMoney(accounts.slice(0, 2), []).balance, txs: [], today: '2026-10-01' }).verdict, 'yes');
  assert.equal(E.affordCheck({ price: 300000, balance: E.balances(accounts.slice(0, 2), []).total, txs: [], today: '2026-10-01' }).verdict, 'yes', 'what it said before');
});

test('a bill due today and not paid yet still counts, once paid it counts as spent (afford and month forecast)', () => {
  const bill = { id: 'b1', name: 'Rumah', amount: 50000, freq: 'monthly', day: 15, start: '2026-01-15' };
  const paid = [{ id: 'p', type: 'expense', date: '2026-10-15', amount: 50000, category: 'rent', merchant: 'Rumah', accountId: 'a', bill: 'b1' }];
  assert.equal(E.affordCheck({ price: 10000, balance: 300000, txs: [], today: '2026-10-15', bills: [bill] }).upcoming, 50000);
  assert.equal(E.affordCheck({ price: 10000, balance: 300000, txs: paid, today: '2026-10-15', bills: [bill] }).upcoming, 0);
  assert.equal(E.forecast({ txs: [], today: '2026-10-15', bills: [bill] }).upcoming, 50000);
  const f = E.forecast({ txs: paid, today: '2026-10-15', bills: [bill] });
  assert.equal(f.upcoming + f.spent, 50000);
});

test('no salary lately: "Can I afford it?" counts the usual income, the lowest of the last 3 full months', () => {
  const inc = (d, a, c = 'income') => ({ id: d + a + c, type: 'income', date: d, amount: a * 100, category: c, accountId: 'a' });
  const ex = (d, a) => ({ id: 'e' + d + a, type: 'expense', date: d, amount: a * 100, category: 'food', merchant: 'Kedai', accountId: 'a' });
  const days = (m, n, f) => Array.from({ length: n }, (_, i) => f(`2026-${m}-${String(i + 1).padStart(2, '0')}`));
  const rider = [...days('07', 31, d => inc(d, 150)), ...days('08', 31, d => inc(d, 150)), ...days('09', 30, d => inc(d, 100)), ...days('10', 10, d => ex(d, 30)), inc('2026-08-20', 50, 'refund')];
  const r = E.affordCheck({ price: 100000, balance: 150000, txs: rider, today: '2026-10-10' });
  assert.equal(r.earn, 300000);   // September, the quietest month; the refund isn't income
  assert.equal(r.left, 260000);
  assert.equal(r.verdict, 'yes');
  assert.equal(E.affordCheck({ price: 100000, balance: 300000, txs: [inc('2026-09-25', 4000, 'salary'), inc('2026-09-28', 500)], today: '2026-10-10' }).earn, 0);   // salaried: pay day instead
  assert.equal(E.affordCheck({ price: 10000, balance: 100000, txs: days('10', 5, d => ex(d, 20)), today: '2026-10-05' }).earn, 0);   // no full month yet
  assert.equal(E.affordCheck({ price: 10000, balance: 100000, txs: [inc('2026-07-25', 4000, 'salary'), inc('2026-08-15', 800), inc('2026-09-15', 600)], today: '2026-10-10' }).earn, 60000);
});
