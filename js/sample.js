// Sample data for people who won't type their own money into an app they don't know yet: two months of a KL office
// worker (salary, kopi, groceries with items, petrol, bills) to look around with. Two full months, so "this month
// against last" and the month table read like a real person's, not 1612% of a half month. Home says it is sample
// data, and "Start for real" erases it. Pure: today in, {accounts, tx} out.
const iso = (today, back) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - back); return d.toISOString().slice(0, 10); };
const DAYS = 64;

export function sampleData(today, now = Date.now(), cash = 'Cash') {
  const accounts = [
    { id: 's_cash', name: cash, kind: 'cash', opening: 18000 },
    { id: 's_bank', name: 'Maybank', kind: 'bank', opening: 120000 },
    { id: 's_tng', name: "Touch 'n Go", kind: 'ewallet', opening: 6000 },
  ].map((a, i) => ({ ...a, scope: 'personal', typed: true, sample: true, createdAt: now - (DAYS + 6) * 864e5 + i }));
  const tx = [];
  const add = (back, time, type, amount, accountId, category, merchant, extra = {}) =>
    tx.push({ id: `s_t${tx.length}`, date: iso(today, back), time, type, amount, accountId, category, merchant, note: '', source: 'quick', sample: true, createdAt: now - back * 864e5 + tx.length, ...extra });
  for (let d = DAYS - 1; d >= 0; d--) {   // workdays: breakfast, lunch, the odd Grab home
    const wd = new Date(`${iso(today, d)}T00:00:00Z`).getUTCDay();
    if (wd < 1 || wd > 5) continue;
    add(d, '08:10', 'expense', 450 + (d % 3) * 50, 's_cash', 'dining', d % 2 ? 'Kopitiam' : 'Mamak');
    add(d, '12:40', 'expense', 1100 + (d % 4) * 150, 's_tng', 'dining', ['Nasi kandar', 'Sushi King', 'Chicken rice', 'Economy rice'][d % 4]);
    if (d % 5 === 2) add(d, '19:20', 'expense', 1480, 's_tng', 'transport', 'Grab');
  }
  const basket = [['Beras 5kg', 1890, 'groceries'], ['Telur 30 biji', 1450, 'groceries'], ['Susu segar 1L', 780, 'groceries'], ['Sabun basuh', 1290, 'household']]
    .map(([name, cents, category]) => ({ name, raw: name, cents, category }));
  const small = basket.slice(1, 3);   // most weeks: eggs and milk; the rice and soap once a month
  for (const back of [58, 51, 44, 37, 30, 23, 16, 9, 2]) { const items = back === 58 || back === 30 ? basket : small; add(back, '11:05', 'expense', items.reduce((s, i) => s + i.cents, 0), 's_bank', 'groceries', 'Mydin', { source: 'receipt', items }); }
  for (const back of [54, 40, 26, 12]) add(back, '18:30', 'expense', 6000, 's_bank', 'transport', 'Petronas');
  for (const back of [59, 29]) add(back, '09:00', 'income', 350000, 's_bank', 'salary', 'Salary');
  for (const back of [58, 28]) add(back, '09:00', 'expense', 12900, 's_bank', 'bills', 'Unifi');
  for (const back of [57, 27]) add(back, '09:00', 'expense', 5500, 's_bank', 'fun', 'Netflix');
  add(20, '20:10', 'expense', 8990, 's_bank', 'shopping', 'Uniqlo');
  add(45, '10:30', 'expense', 3500, 's_cash', 'health', 'Klinik');
  for (const back of [61, 54, 47, 40, 33, 26, 19, 12, 5]) add(back, '07:30', 'transfer', 10000, 's_bank', 'other', 'Reload', { toAccountId: 's_tng' });
  for (const back of [48, 18]) add(back, '13:15', 'transfer', 20000, 's_bank', 'other', 'ATM', { toAccountId: 's_cash' });
  return { accounts, tx };
}
