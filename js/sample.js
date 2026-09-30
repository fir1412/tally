// Sample data for people who won't type their own money into an app they don't know yet: two months of a KL office
// worker (salary, kopi, groceries with items, petrol, bills) to look around with. Two full months, so "this month
// against last" and the month table read like a real person's, not 1612% of a half month. Every feature has something
// to show: savings and a goal, a bill split with friends, itemised receipts, bills, a budget, nothing-spent days and a
// sticker book. Home says it is sample data, and "Start for real" erases it (everything is marked `sample`).
import { S, settings, addAll, putAll } from './state.js';
import { dueBillTxs, addMonths, billKey } from './engine.js';
import { splitRows, ME } from './views/splitbill.js';

const iso = (today, back) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - back); return d.toISOString().slice(0, 10); };
// Made on its own day, at its own time (local, like dayOf): the sticker book counts an entry for the day it was made on.
const at = (date, time = '09:00') => new Date(`${date}T${time}:00`).getTime();
const DAYS = 64;

/** today in → {accounts, tx, recurring, budgets, goals, noSpend, friends}, all sample. */
export function sampleData(today, now = Date.now(), cash = 'Cash') {
  const accounts = [
    { id: 's_cash', name: cash, kind: 'cash', opening: 18000 },
    { id: 's_bank', name: 'Maybank', kind: 'bank', opening: 120000 },
    { id: 's_tng', name: "Touch 'n Go", kind: 'ewallet', opening: 6000 },
    { id: 's_asb', name: 'ASB', kind: 'savings', opening: 450000 },
  ].map((a, i) => ({ ...a, scope: 'personal', typed: true, sample: true, createdAt: at(iso(today, DAYS + 6)) + i }));
  const tx = [];
  let n = 0;
  const row = (back, time, type, amount, accountId, category, merchant, extra = {}) => { const date = iso(today, back); return { id: `s_t${n}`, date, time, type, amount, accountId, category, merchant, note: '', source: 'quick', sample: true, createdAt: at(date, time) + n++, ...extra }; };
  const add = (...a) => tx.push(row(...a));
  // A scanned receipt as review saves it: items (money off is its own line under the item), then tax, service and rounding.
  const receipt = (back, time, accountId, merchant, lines, { tax = 0, service = 0, rounding = 0 } = {}) => {
    const items = lines.map(([name, cents, category]) => ({ name, raw: name, cents, category })), sum = items.reduce((s, i) => s + i.cents, 0);
    return row(back, time, 'expense', sum + tax + service + rounding, accountId, items.reduce((m, i) => (i.cents > m.cents ? i : m)).category, merchant, { source: 'receipt', items, tax, service, rounding });
  };
  for (let d = DAYS - 1; d >= 0; d--) {   // workdays: breakfast, lunch, the odd Grab home
    const wd = new Date(`${iso(today, d)}T00:00:00Z`).getUTCDay();
    if (wd < 1 || wd > 5) continue;
    add(d, '08:10', 'expense', 450 + (d % 3) * 50, 's_cash', 'dining', d % 2 ? 'Kopitiam' : 'Mamak');
    add(d, '12:40', 'expense', 1100 + (d % 4) * 150, 's_tng', 'dining', ['Nasi kandar', 'Sushi King', 'Chicken rice', 'Economy rice'][d % 4]);
    if (d % 5 === 2) add(d, '19:20', 'expense', 1480, 's_tng', 'transport', 'Grab');
  }
  const basket = [['Beras 5kg', 1890, 'groceries'], ['Telur 30 biji', 1450, 'groceries'], ['Susu segar 1L', 780, 'groceries'], ['Sabun basuh', 1290, 'household']];
  for (const back of [58, 51, 44, 37, 30, 23, 16, 9, 2]) tx.push(receipt(back, '11:05', 's_bank', 'Mydin', back === 58 || back === 30 ? basket : basket.slice(1, 3)));   // most weeks eggs and milk; rice and soap once a month
  for (const back of [54, 40, 26, 12]) add(back, '18:30', 'expense', 6000, 's_bank', 'transport', 'Petronas');
  for (const back of [59, 29]) add(back, '09:00', 'income', 350000, 's_bank', 'salary', 'Salary');
  for (const back of [58, 28]) add(back, '09:30', 'transfer', 30000, 's_bank', 'other', 'ASB', { toAccountId: 's_asb' });   // saved the day after payday
  add(20, '20:10', 'expense', 8990, 's_bank', 'shopping', 'Uniqlo', { returnBy: iso(today, -10) });
  add(45, '10:30', 'expense', 3500, 's_cash', 'health', 'Klinik');
  add(33, '10:00', 'expense', 12000, 's_bank', 'health', 'Klinik Pergigian Senyum', { note: 'Scaling & polishing' });   // dental: a medical relief
  for (const back of [13, 6]) add(back, '20:00', 'expense', 2400, 's_tng', 'fun', 'Sports Planet', { note: 'Badminton court' });   // sports relief
  for (const back of [61, 54, 47, 40, 33, 26, 19, 12, 5]) add(back, '07:30', 'transfer', 10000, 's_bank', 'other', 'Reload', { toAccountId: 's_tng' });
  for (const back of [48, 18]) add(back, '13:15', 'transfer', 20000, 's_bank', 'other', 'ATM', { toAccountId: 's_cash' });
  tx.push(receipt(15, '13:30', 's_bank', 'Watsons', [['Hada Labo Lotion 170ml', 4990, 'personal'], ['Watsons Cotton Pads 180s', 690, 'personal'], ['PWP discount', -590, 'personal'], ['Colgate Total 2x150g', 1789, 'personal']], { rounding: 1 }));
  tx.push(receipt(4, '18:45', 's_tng', 'Guardian', [['Panadol Actifast 20s', 1290, 'health'], ['Strepsils 16s', 1149, 'health'], ['Dettol Hand Wash 250ml', 879, 'household']], { rounding: 2 }));
  tx.push(receipt(8, '15:20', 's_bank', 'Popular', [['Atomic Habits (Book)', 5990, 'education'], ['Pilot G2 Pen 3s', 1290, 'shopping']]));   // the book: a lifestyle relief

  // Bills as the Bills screen keeps them, their payments posted as the app posts them (dueBillTxs), up to today.
  const recurring = [['s_rent', 'Rent (room)', 65000, 60, 'housing'], ['s_ptptn', 'PTPTN', 15000, 56, 'loans'], ['s_unifi', 'Unifi', 12900, 58, 'bills'], ['s_netflix', 'Netflix', 5500, 57, 'fun']].map(([id, name, amount, back, category]) => ({
    id, name, amount, start: iso(today, back), day: +iso(today, back).slice(8), freq: 'monthly', auto: true, category, accountId: 's_bank', key: billKey(name), sample: true, createdAt: accounts[0].createdAt, updatedAt: now }));
  for (const x of dueBillTxs(recurring, today, [], now)) tx.push({ ...x, time: '09:00', sample: true, createdAt: at(x.date) });
  for (const b of recurring) b.last = today;

  // Split bills, through the app's own "Save my share" (splitRows): dinner I paid for with two friends, and a movie a friend paid.
  const friends = ['Aisyah', 'Wei Ling', 'Hafiz'], owe = [];
  const split = (bill, people, who, paidBy = ME) => {
    const r = splitRows({ tx: bill, people, who, paidBy, accounts: [...accounts, ...owe], txs: tx, today, now });
    for (const a of r.accounts) if (!accounts.some(x => x.id === a.id)) owe.push({ ...a, sample: true, createdAt: accounts[0].createdAt });
    for (const x of r.tx) tx.push({ ...x, sample: true, createdAt: x.id === bill.id ? bill.createdAt : at(x.date, x.time) + n++ });
  };
  const dinner = receipt(10, '20:15', 's_bank', "Madam Kwan's", [['Nasi Lemak Madam Kwan', 2690, 'dining'], ['Char Kuey Teow', 2290, 'dining'], ['Nasi Bojari', 2890, 'dining'],
    ['Teh Tarik', 690, 'dining'], ['Sirap Bandung', 690, 'dining'], ['Iced Lemon Tea', 790, 'dining'], ['Cendol', 1290, 'dining']], { service: 1133, tax: 748, rounding: -1 });   // 10% service, 6% SST, 5-sen rounding
  split(dinner, [ME, 'Aisyah', 'Wei Ling'], [[ME], ['Wei Ling'], ['Aisyah'], [ME], ['Aisyah'], ['Wei Ling'], []]);   // the cendol shared
  split(receipt(17, '21:30', 's_tng', 'GSC Mid Valley', [['Movie tickets x3', 5400, 'fun'], ['Popcorn combo', 2290, 'fun']]), [ME, 'Aisyah', 'Hafiz'], [[], []], 'Hafiz');
  add(6, '21:05', 'transfer', 2000, owe.find(a => a.kind === 'owedme').id, 'other', 'Aisyah', { toAccountId: 's_bank', repaidBy: 'Aisyah' });   // part of her share back

  // Two recent days with nothing spent, checked in as such (weekends without a shop).
  const spent = new Set(tx.filter(x => x.type === 'expense').map(x => x.date));
  const noSpend = Array.from({ length: 21 }, (_, i) => iso(today, i + 1)).filter(d => !spent.has(d)).slice(0, 2).sort();
  // RM 290 a month gets the emergency fund there: about the RM 300 put in after each payday.
  const goals = [{ id: 's_goal', name: 'Emergency fund', target: 800000, by: `${addMonths(today.slice(0, 7), 10)}-01`, accountId: 's_asb', sample: true, createdAt: accounts[0].createdAt }];
  const budgets = { total: 230000, byCat: { dining: 50000, groceries: 25000 } };
  return { accounts: [...accounts, ...owe], tx, recurring, budgets, goals, noSpend, friends };
}

const empty = () => !S.accounts.length && !S.tx.length && !S.recurring.length && !S.kv.goals.length && !S.kv.budgets.total && !Object.keys(S.kv.budgets.byCat).length;
/** Look around with sample data: only on an empty app, so nothing of the user's is ever mixed in or overwritten. → started */
export async function startSample(today, cash) {
  if (!empty()) return false;
  const d = sampleData(today, Date.now(), cash);
  await addAll({ accounts: d.accounts, tx: d.tx, recurring: d.recurring, kv: { budgets: d.budgets, goals: d.goals, settings: { ...settings(), sample: true, onboarded: true, noSpend: d.noSpend, friends: d.friends } } });
  return true;
}
/** What "Start for real" removes: the sample's accounts and every entry and bill in them (the user's own ones too). */
export function sampleRows() {
  const ids = new Set(S.accounts.filter(a => a.sample).map(a => a.id)), inIt = x => x.sample || ids.has(x.accountId) || ids.has(x.toAccountId);
  return { ids, tx: S.tx.filter(inIt), recurring: S.recurring.filter(inIt) };
}
/** "Start for real", in one write. Goals and budgets made during the sample go with it (the sample only starts on an empty
 *  app, so they were set up on made-up money), and so do its nothing-spent days and friends. Accounts of the user's own stay. */
export async function endSample() {
  const { ids, tx, recurring } = sampleRows(), { noSpend, friends, ...st } = settings();
  await putAll({ del: { tx: tx.map(x => x.id), accounts: [...ids], recurring: recurring.map(b => b.id) }, edit: true,
    kv: { goals: S.kv.goals.filter(g => !g.sample && !ids.has(g.accountId)), budgets: { total: 0, byCat: {} }, settings: { ...st, sample: false, onboarded: S.accounts.some(a => !ids.has(a.id)) } } });
}
