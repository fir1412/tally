// A fixed, made-up history (receipts with items, bills, pay, transfers, repeated shops and items) and what the engine
// makes of it. engine-pin.json holds these outputs from before the speed-ups; tests/perf.test.mjs checks they still match.
export const TODAY = '2026-09-28';
export function history() {
  let s = 7;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }, pick = a => a[Math.floor(rnd() * a.length)];
  const day = n => new Date(Date.UTC(2025, 6, 1) + n * 864e5).toISOString().slice(0, 10), pad = n => String(n).padStart(2, '0');
  const shops = ['SPEEDMART KAJANG', 'MYDIN BANGI', 'KOPITIAM ALI', 'PETRONAS JLN KLANG', 'GUARDIAN MIDVALLEY', 'MAXIS', 'RESTORAN MAJU', 'AEON CHERAS'];
  const items = [['MILO 1KG', 2890, 'groceries'], ['NASI LEMAK', 600, 'dining'], ['TEH TARIK', 250, 'dining'], ['PANADOL', 890, 'health'], ['GARDENIA', 450, 'groceries'], ['TELUR 30', 1390, 'groceries'], ['RON95', 5000, 'transport'], ['SHAMPOO', 1590, 'personal'], ['BUKU LATIHAN', 350, 'education'], ['DIAPERS', 4290, 'kids']];
  const tx = [];
  for (let d = 0; d < 455; d++) {
    const date = day(d);
    if (date.endsWith('-25')) tx.push({ id: `p${d}`, date, type: 'income', amount: 350000, accountId: 'bank', category: 'salary', merchant: 'GAJI', createdAt: 1e12 + d * 1e5 });
    if (date.endsWith('-05')) tx.push({ id: `b${d}`, date, type: 'expense', amount: 9800, accountId: 'bank', category: 'bills', merchant: 'MAXIS', source: 'recurring', bill: 'bm', createdAt: 1e12 + d * 1e5 });
    if (date.endsWith('-12')) tx.push({ id: `u${d}`, date, type: 'expense', amount: 12000 + Math.floor(rnd() * 400), accountId: 'bank', category: 'bills', merchant: 'TNB ELECTRIC', createdAt: 1e12 + d * 1e5 });
    if (date.endsWith('-15')) tx.push({ id: `x${d}`, date, type: 'transfer', amount: 20000, accountId: 'bank', toAccountId: 'cash', category: 'other', createdAt: 1e12 + d * 1e5 });
    for (let k = Math.floor(rnd() * 3); k > 0; k--) {
      const n = Math.floor(rnd() * 4), its = Array.from({ length: n }, () => { const [name, c, category] = pick(items); return { name, cents: Math.round(c * (1 + d / 900 + (rnd() - 0.5) * 0.3)), category }; });
      const sum = its.reduce((a, i) => a + i.cents, 0) || 500 + Math.floor(rnd() * 3000);
      tx.push({ id: `t${d}_${k}`, date, time: rnd() < 0.8 ? `${pad(7 + Math.floor(rnd() * 15))}:${pad(Math.floor(rnd() * 60))}` : undefined, type: 'expense', amount: sum + (rnd() < 0.3 ? 37 : 0),
        accountId: pick(['cash', 'bank', 'wallet']), category: its[0]?.category || pick(['dining', 'transport', 'fun']), merchant: pick(shops), items: its.length ? its : undefined,
        ...(rnd() < 0.2 ? { receiptId: `r${d}` } : {}), ...(rnd() < 0.1 ? {} : { createdAt: 1e12 + d * 1e5 + (rnd() < 0.2 ? 0 : k) }) });
    }
  }
  // A weekday morning coffee for the last four weeks (a habit), and a big week of personal care (an unusual week).
  for (let d = 427; d < 455; d++) if (![0, 6].includes(new Date(day(d)).getUTCDay())) tx.push({ id: `k${d}`, date: day(d), time: `08:${pad(d % 20)}`, type: 'expense', amount: 450, accountId: 'cash', category: 'dining', merchant: 'KOPITIAM ALI', createdAt: 2e12 + d });
  for (let d = 450; d < 455; d++) tx.push({ id: `v${d}`, date: day(d), time: '20:15', type: 'expense', amount: 9000, accountId: 'bank', category: 'personal', merchant: 'GUARDIAN MIDVALLEY', createdAt: 2e12 + d });
  return tx;
}
export const accounts = [{ id: 'cash', kind: 'cash', opening: 5000 }, { id: 'bank', kind: 'bank', opening: 200000 }, { id: 'wallet', kind: 'ewallet', opening: 0 }];
export const bills = [{ id: 'bm', name: 'MAXIS', amount: 9800, day: 5, start: '2025-07-05', freq: 'monthly', key: 'MAXIS' }];

/** Everything the screens show, from one engine module E. */
export function digest(E) {
  const txs = history().filter(t => t.date <= TODAY), out = {};
  for (const sd of [1, 25]) {
    const ym = E.cycleKey(TODAY, sd), budgets = { total: 250000, byCat: { dining: 3000, groceries: 60000, transport: 20000, personal: 40000 } };
    out[sd] = {
      insights: E.insights({ txs, budgets, today: TODAY, knownBills: [], startDay: sd }),
      insightsNoBudget: E.insights({ txs, today: '2026-09-03', startDay: sd }),
      monthSpend: [0, -1, -2, -5, -13].map(k => E.monthSpend(txs, E.addMonths(ym, k), sd)),
      monthIncome: [0, -1, -2].map(k => E.monthIncome(txs, E.addMonths(ym, k), sd)),
      cashFlow: E.cashFlow(txs, ym, 12, sd),
      balanceTrend: E.balanceTrend(accounts, txs, TODAY, 6, sd),
      forecast: E.forecast({ txs, today: TODAY, startDay: sd, budget: 250000, bills }),
      forecastEarly: E.forecast({ txs, today: '2026-09-02', startDay: sd, budget: 250000, bills }),
      topShops: E.topShops(txs, ym, sd), foodSplit: E.foodSplit(txs, ym, sd), fixedFlexible: E.fixedFlexible(txs, ym, sd, ['MAXIS']),
      dailySpend: E.dailySpend(txs, ym, sd), paymentMix: E.paymentMix(txs, accounts, ym, sd),
      cycles: ['2024-12-31', '2025-01-24', '2025-01-25', '2026-03-01', '2026-12-26'].map(d => [E.cycleKey(d, sd), E.cycleOf(d, sd)]),
    };
  }
  Object.assign(out, {
    recurring: E.recurringCandidates(txs), priceHistory: E.priceHistory(txs), basket: E.basketIndex(E.priceHistory(txs), TODAY),
    habits: E.habits(txs, TODAY), taxRelief: E.taxRelief(txs, '2026'), whenGrid: E.whenGrid(txs, '2026-07-01', TODAY),
    itemKeys: ['KS SNRS 2PK ', 'Milo 1kg!!', '9555012345678 SUGAR', '', null, '奶粉 900G'].map(E.itemKey),
  });
  return out;
}
