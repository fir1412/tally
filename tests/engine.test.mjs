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
  assert.equal(E.fmtRM(123450), 'RM 1,234.50');
  assert.equal(E.fmtRM(-5), '−RM 0.05');
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
  assert.deepEqual(E.monthSpend(txs, '2026-09'), { total: 1000, byCat: { dining: 1000 } });
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
  for (const s of ['Siti Aminah Sewa Bilik', 'House rent', 'PTPTN', 'Hotlink prepaid', 'Xpax reload kredit', 'Air Selangor']) assert.equal(c(s), 'bills', s);
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
