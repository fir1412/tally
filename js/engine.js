// Pure money logic: no DOM, no storage. Every amount is integer sen (RM 1.00 = 100).

export const CATEGORIES = [
  { id: 'groceries', name: 'Groceries', color: '#65A30D' },
  { id: 'dining', name: 'Dining', color: '#F59E0B' },
  { id: 'transport', name: 'Transport', color: '#3B82F6' },
  { id: 'bills', name: 'Bills', color: '#06B6D4' },
  { id: 'household', name: 'Household', color: '#A16207' },
  { id: 'health', name: 'Health', color: '#14B8A6' },
  { id: 'personal', name: 'Personal care', color: '#EC4899' },
  { id: 'kids', name: 'Kids', color: '#8B5CF6' },
  { id: 'electronics', name: 'Electronics', color: '#0EA5E9' },
  { id: 'shopping', name: 'Shopping', color: '#F97316' },
  { id: 'fun', name: 'Entertainment', color: '#D946EF' },
  { id: 'education', name: 'Education', color: '#6366F1' },
  { id: 'other', name: 'Other', color: '#64748B' },
];
export const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salary', color: '#059669' },
  { id: 'allowance', name: 'Allowance', color: '#10B981' },
  { id: 'family', name: 'From family', color: '#6EE7B7' },
  { id: 'income', name: 'Other income', color: '#34D399' },
];
/** Which income category text reads as: pay, an allowance or scholarship, money from family, else other income. */
export const incomeCategory = s => (/salary|gaji|payroll|paycheck|wage|工资|工資|薪/i.test(s) ? 'salary'
  : /elaun|allowance|ptptn|biasiswa|scholarship|bursary|zakat pendidikan|津贴|津貼|奖学金|獎學金/i.test(s) ? 'allowance'
  : /duit (mak|emak|ibu|ayah|abah|bapa|papa|mama)|(from|dari) (mum|mom|mother|dad|father|parents|family|keluarga|mak|ayah|abah|ibu)|家用|爸|妈|媽/i.test(s) ? 'family' : 'income');
export const ACCOUNT_KINDS = ['cash', 'bank', 'ewallet', 'card', 'savings'];
export const MAX_SEN = 100_000_000_00; // RM 100 million: anything bigger is a typo or an attack

// ---- amounts ---------------------------------------------------------------------------
/** "RM 1,234.50" → 123450. Accepts "12", "12.5", "12,50", "RM12.90", "-3.00". null if not a sane amount. */
export function parseAmount(v) {
  if (typeof v === 'number') return Number.isFinite(v) && Math.abs(v * 100) <= MAX_SEN ? Math.round(v * 100) : null;
  let s = String(v ?? '').trim().replace(/^RM\s*/i, '').replace(/\s+/g, '');
  const neg = /^-|-$|^\(.*\)$/.test(s);
  s = s.replace(/^[-(]|[-)]$/g, '').replace(/^RM/i, '');
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$|^\.\d{1,2}$/.test(s)) return null;
  const [w, f = ''] = s.split('.');
  const sen = (+w || 0) * 100 + +(f + '00').slice(0, 2);
  if (sen > MAX_SEN) return null;
  return neg ? -sen : sen;
}
/** 123450 → "RM 1,234.50" ("−RM 3.00" for negatives). */
export function fmtRM(sen, { plain = false } = {}) {
  if (sen == null || !Number.isFinite(sen)) return '–';
  const a = Math.abs(Math.round(sen));
  const s = `${Math.floor(a / 100).toLocaleString('en-MY')}.${String(a % 100).padStart(2, '0')}`;
  return (sen < 0 ? '−' : '') + (plain ? s : 'RM ' + s);
}

// ---- dates -------------------------------------------------------------------------------
export const monthOf = iso => iso.slice(0, 7);
export const daysInMonth = ym => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
export function addMonths(ym, n) {
  const d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
export const validIso = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !isNaN(Date.parse(s)) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;

// ---- categorizing ----------------------------------------------------------------------------
/** Key for remembering an item: "KS SNRS 2PK " → "KS SNRS 2PK". Pure codes and prices are dropped. */
export const itemKey = name => String(name ?? '').toUpperCase().replace(/\b\d{5,}\b/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

// Malaysian shop words in English, Malay and Chinese, most specific first (奶粉 is Kids, not a 粉 noodle).
// ponytail: keyword list; user corrections become rules.
const WORDS = [
  // Car upkeep first: "minyak enjin" is not cooking oil, "bateri kereta" not a household battery. Not "filter" or "upah" alone.
  ['transport', /minyak enjin|engine oil|filter minyak|oil filter|\btayar\b|\btyres?\b|\btires?\b|puncture|wiper|bateri kereta|car battery|servis kereta|car service|bengkel|workshop|spark ?plug|\bbrek\b|\bbrakes?\b|absorber|alignment|road ?tax|cukai jalan|insurans kereta|car insurance/i],
  ['bills', /air selangor|air kelantan|syabas|indah water|ranhill|\bsaj\b|\bpba\b water|ptptn|\brent(al)?\b|\bsewa\b|prepaid|hotlink|xpax|\btopup\b|reload (kredit|credit|phone|telefon)/i],
  ['kids', /diaper|lampin|pampers|mamypoko|drypers|susu formula|formula|baby|bayi|toy|mainan|crayon|school|sekolah|尿布|奶粉|玩具|婴儿|嬰兒/i],
  ['health', /panadol|claritin|vitamin|ubat|medicine|medical|doctor|doktor|dental|dentist|clinic|klinik|pharmacy|farmasi|mask|plaster|antiseptic|dettol|strepsils|zyrtec|hospital|药|藥|维他命|維他命|口罩|诊所|診所/i],
  ['personal', /shampoo|syampu|toothpaste|ubat gigi|colgate|darlie|lotion|deodorant|razor|pisau cukur|sunblock|facial|cleanser|conditioner|sanitary|tuala wanita|kotex|laurier|haircut|gunting rambut|洗发|洗髮|牙膏|沐浴/i],
  ['dining', /nasi|mee |mee$|mi goreng|roti canai|teh |kopi|coffee|latte|milo ais|ais |burger|pizza|chicken rice|laksa|satay|restoran|restaurant|cafe|kafe|food|makan|drink|minum|set meal|meal|kfc|mcd|mamak|饭|面|粉|咖啡|茶|奶茶|套餐|饮料|點心|点心|包子|炒/i],
  ['groceries', /beras|rice|telur|egg|susu|milk|roti|bread|gardenia|gula|sugar|minyak|oil|ayam|chicken|ikan|fish|udang|prawn|sotong|squid|ketam|crab|kerang|daging|beef|kambing|mutton|lamb|sayur|vege|buah|fruit|garam|salt|tepung|flour|kicap|sos |sauce|mineral|air |water|biskut|biscuit|mentega|butter|cheese|yogurt|noodle|maggi|milo|nescafe|tea|bawang|onion|tomato|kentang|potato|米|蛋|鸡|雞|鱼|魚|肉|菜|水果|糖|油|盐|鹽|面包|麵包|牛奶|豆腐|酱|醬|虾|蝦|苹果|蘋果|葱|蔥|姜|薑|榴莲|榴槤|蒜|辣椒/i],
  ['household', /sabun|soap|detergent|tissue|tisu|bleach|sponge|mop|broom|penyapu|plastic|beg |bag|towel|tuala|bateri|battery|mentol|bulb|span|kitchen|dapur|pinggan|cawan|cup|peg|hanger|clorox|dynamo|downy|breeze|glad|ziploc|纸巾|紙巾|洗衣|清洁|清潔|垃圾袋|电池|電池|毛巾/i],
  ['transport', /petrol|ron ?9[57]|v-?power|diesel|primax|parking|letak kereta|toll|tol |grab|touch ?n ?go|lrt|mrt|bus|teksi|taxi|fuel|汽油|停车|停車|过路费/i],
  ['bills', /tnb|electric|elektrik|syabas|air selangor|water bill|unifi|maxis|celcom|\bdigi\b|umobile|internet|astro|insurance|insurans|takaful|loan|pinjaman|电费|電費|水费|水費|保险|保險/i],
  ['electronics', /\b(hand)?phone\b|telefon|iphone|ipad|samsung|xiaomi|redmi|huawei|oppo|vivo|realme|honor|charger|pengecas|\bcable\b|kabel|earphone|earbud|headphone|headset|airpods|power ?bank|laptop|notebook|macbook|\bmonitor\b|keyboard|\bmouse\b|printer|cartridge|sd card|memory card|pendrive|thumb ?drive|\busb\b|hdmi|speaker|\btv\b|television|smart ?watch|camera|console|playstation|\bps5\b|nintendo|electronic|elektronik|gadget|手机|手機|充电|耳机|耳機|电脑|電腦|平板/i],
  ['education', /book|buku|pen |pencil|pensel|stationery|stationer|alat tulis|tuition|tuisyen|yuran|fee|书|書|文具|补习|補習/i],
  ['fun', /cinema|wayang|gsc|tgv|netflix|spotify|game|karaoke|bowling|concert|电影|電影/i],
];
const SHOPS = [
  ['dining', /restoran|restaurant|kedai makan|cafe|kafe|kopitiam|bakery|mamak|food court|medan selera|kfc|mcdonald|pizza|starbucks|tealive|zus|餐厅|餐廳|茶室|饭店|飯店|咖啡店/i],
  ['transport', /petronas|shell|petromart|caltex|bhpetrol|petron/i],
  ['shopping', /shopee|lazada|zalora|tiktok ?shop|uniqlo|padini|vincci|h&m|\bzara\b|cotton on/i],
  ['education', /popular|bookshop|bookstore|kedai buku|mph|kinokuniya|stationery|stationer/i],
  ['health', /guardian|watsons|farmasi|pharmacy|caring|big pharmacy|klinik|clinic|药房|藥房/i],
  ['household', /mr\.? ?d\.?i\.?y|daiso|ikea|eco-?shop|kedai perkakasan|hardware|五金/i],
  ['groceries', /speedmart|mydin|aeon|tesco|lotus|giant|jaya grocer|village grocer|econsave|nsk|hero|family ?mart|7-eleven|99 |mart|grocer|pasar|supermarket|runcit|超市|杂货|雜貨/i],
  ['kids', /toys|mothercare|anakku|baby/i],
  ['electronics', /senheng|harvey norman|courts|machines|switch|all ?it|urban republic|thunder match|\bsamsung\b|apple store|electronic|电器|電器/i],
];
// Street and place words in statement text ("PETRONAS JLN HOSPITAL KB") name where, not what: they never decide.
// "kg" after a number is a weight, not a kampung.
const PLACE = /\b(jln|jalan|lorong|lrg|taman|tmn|persiaran|lebuh(raya)?|bandar|kampung|kpg|(?<![\d.]\s?)kg)\.?\s+[\p{L}\d]+/giu;
export const unplace = s => String(s ?? '').replace(PLACE, ' ');
/** Category for an item: the user's own rule first, then item words, then the shop's usual category. */
export function categorize(name, merchant = '', rules = {}) {
  const k = itemKey(name);
  if (k && Object.hasOwn(rules, k)) return rules[k];
  const shop = shopCategory(merchant, rules);
  const n = ' ' + unplace(name) + ' ';
  for (const [c, re] of WORDS) if (re.test(n)) return c === 'groceries' && shop === 'dining' ? 'dining' : c; // teh at a kopitiam is a meal
  return shop;
}
export function shopCategory(merchant = '', rules = {}) {
  const mk = 'SHOP ' + itemKey(merchant);
  if (Object.hasOwn(rules, mk)) return rules[mk];
  const m = unplace(merchant);
  for (const [c, re] of SHOPS) if (re.test(m)) return c;
  return 'other';
}

// ---- splitting a receipt across categories ------------------------------------------------------
/** Spread `extra` sen over parts in proportion to their cents (largest remainder), so the result sums exactly. */
export function allocate(parts, extra) {
  const base = parts.reduce((s, p) => s + Math.max(0, p), 0);
  if (!extra) return parts.map(() => 0);
  if (!base) { const out = parts.map(() => 0); if (out.length) out[0] = extra; return out; }
  const raw = parts.map(p => Math.max(0, p) * extra / base);
  const out = raw.map(x => Math.trunc(x));
  let left = extra - out.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => [Math.abs(x - Math.trunc(x)), i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; left !== 0; j++) { const i = order[j % order.length][1]; out[i] += Math.sign(left); left -= Math.sign(left); }
  return out;
}
/** Where an expense's money went: [{category, cents}] summing exactly to tx.amount. Tax, service and rounding spread by item. */
export function breakdown(tx) {
  const items = (tx.items || []).filter(i => Number.isFinite(i.cents));
  if (!items.length) return [{ category: tx.category || 'other', cents: tx.amount }];
  const extra = tx.amount - items.reduce((s, i) => s + i.cents, 0);
  const add = allocate(items.map(i => i.cents), extra);
  const by = {};
  items.forEach((it, i) => { const c = it.category || 'other'; by[c] = (by[c] || 0) + it.cents + add[i]; });
  return Object.entries(by).map(([category, cents]) => ({ category, cents }));
}

// ---- balances & months -----------------------------------------------------------------------
/** Balance per account and in total, optionally up to and including a date. */
export function balances(accounts, txs, upTo = null) {
  const by = Object.fromEntries(accounts.map(a => [a.id, a.opening || 0]));
  for (const t of txs) {
    if (upTo && t.date > upTo) continue;
    if (t.type === 'expense') by[t.accountId] = (by[t.accountId] ?? 0) - t.amount;
    else if (t.type === 'income') by[t.accountId] = (by[t.accountId] ?? 0) + t.amount;
    else if (t.type === 'transfer') { by[t.accountId] = (by[t.accountId] ?? 0) - t.amount; by[t.toAccountId] = (by[t.toAccountId] ?? 0) + t.amount; }
  }
  const known = new Set(accounts.map(a => a.id));
  const total = Object.entries(by).filter(([id]) => known.has(id)).reduce((s, [, v]) => s + v, 0);
  return { by, total };
}
/** Spending in a month: total and per category (receipts split by item). Transfers never count. */
export function monthSpend(txs, ym) {
  const byCat = {};
  let total = 0;
  for (const t of txs) {
    if (t.type !== 'expense' || monthOf(t.date) !== ym) continue;
    total += t.amount;
    for (const { category, cents } of breakdown(t)) byCat[category] = (byCat[category] || 0) + cents;
  }
  return { total, byCat };
}
export const monthIncome = (txs, ym) => txs.filter(t => t.type === 'income' && monthOf(t.date) === ym).reduce((s, t) => s + t.amount, 0);
export function cashFlow(txs, endYm, n = 6) {
  return Array.from({ length: n }, (_, i) => addMonths(endYm, i - n + 1)).map(ym => ({ ym, income: monthIncome(txs, ym), expense: monthSpend(txs, ym).total }));
}
/** Balance at the end of each of the last n months (today for the current one). */
export function balanceTrend(accounts, txs, today, n = 6) {
  const ym = monthOf(today);
  return Array.from({ length: n }, (_, i) => addMonths(ym, i - n + 1)).map(m => {
    const end = m === ym ? today : `${m}-${String(daysInMonth(m)).padStart(2, '0')}`;
    return { date: end, v: balances(accounts, txs, end).total };
  });
}

// ---- budgets -----------------------------------------------------------------------------------
/** Pace of a budget this month: share used, projected month-end spend, and whether it's heading over. */
export function pace(budget, spent, today) {
  const ym = monthOf(today), day = +today.slice(8, 10), dim = daysInMonth(ym);
  const projected = Math.round(spent / day * dim);
  return { pct: budget ? spent / budget : 0, projected, over: budget > 0 && projected > budget, left: budget - spent, daysLeft: dim - day };
}

// ---- duplicates --------------------------------------------------------------------------------
const shopWord = s => itemKey(s).split(' ').filter(w => w.length > 2 || /\p{Script=Han}/u.test(w)).slice(0, 2).join(' ');
/** An existing transaction that is probably the same purchase: same day, same amount, same shop (or no shop). */
export function findDuplicate(tx, txs) {
  return txs.find(t => t.id !== tx.id && t.type === tx.type && t.amount === tx.amount && t.date === tx.date
    && (!t.merchant || !tx.merchant || shopWord(t.merchant) === shopWord(tx.merchant))) || null;
}

// ---- insights ---------------------------------------------------------------------------------
/**
 * Plain rules over local data. Each insight: {id, kind, level ('warn'|'info'|'good'), title, body, cat?}.
 * title and body are [English template, ...values]; a value may be {cat: id}, {raw: user text}, {date: iso} or
 * {list: [[{cat}, amount]]}, so the view can translate the words around them. Ordered by importance.
 */
export function insights({ txs, budgets = {}, today, knownBills = [] }) {
  const out = [];
  const ym = monthOf(today), prev = addMonths(ym, -1);
  const now = monthSpend(txs, ym), last = monthSpend(txs, prev);
  // Pace: a budget heading over before the month ends.
  const checks = [['total', budgets.total, now.total], ...Object.entries(budgets.byCat || {}).map(([c, b]) => [c, b, now.byCat[c] || 0])];
  for (const [c, b, spent] of checks) {
    if (!b) continue;
    const p = pace(b, spent, today);
    const label = { cat: c };
    if (spent > b) out.push({ id: `over-${c}-${ym}`, kind: 'pace', level: 'warn', cat: c, title: ['{0} is over budget', label], body: ['Spent {0} of {1}.', fmtRM(spent), fmtRM(b)] });
    else if (p.over && p.pct >= 0.5) out.push({ id: `pace-${c}-${ym}`, kind: 'pace', level: 'warn', cat: c, title: ['{0} at {1}% with {2} days left', label, Math.round(p.pct * 100), p.daysLeft], body: ["At this pace you'll spend {0}, {1} over.", fmtRM(p.projected), fmtRM(p.projected - b)] });
  }
  // Unusual week: a category this week at 2x or more its usual week. "Usual" = the average over the weeks of the
  // last 12 that have any spending at all (4+ needed), so an old or stray receipt can't stretch the history.
  const weekStart = addDays(today, -6);
  const inRange = (a, b) => txs.filter(t => t.type === 'expense' && t.date >= a && t.date <= b);
  const active = Array.from({ length: 12 }, (_, k) => addDays(weekStart, -7 * (k + 1))).filter(s => inRange(s, addDays(s, 6)).length).length;
  if (active >= 4) {
    const sum = list => { const by = {}; for (const t of list) for (const x of breakdown(t)) by[x.category] = (by[x.category] || 0) + x.cents; return by; };
    const thisWeek = sum(inRange(weekStart, today));
    const before = sum(inRange(addDays(weekStart, -7 * 12), addDays(weekStart, -1)));
    for (const [c, v] of Object.entries(thisWeek)) {
      if (c === 'bills') continue;
      const avg = (before[c] || 0) / active;
      if (avg > 0 && v >= 2 * avg && v - avg >= 2000) out.push({ id: `week-${c}-${today}`, kind: 'unusual', level: 'info', cat: c, title: ['{0} this week is {1}× your usual week', { cat: c }, (v / avg).toFixed(1)], body: ['{0} vs about {1} a week.', fmtRM(v), fmtRM(Math.round(avg))] });
    }
  }
  // Item patterns: an item bought 3+ times this month, compared with last month.
  const count = m => {
    const by = {};
    for (const t of txs) if (t.type === 'expense' && monthOf(t.date) === m) for (const it of t.items || []) {
      const k = itemKey(it.name); if (!k) continue;
      (by[k] ||= { n: 0, cents: 0, name: it.name }); by[k].n++; by[k].cents += it.cents;
    }
    return by;
  };
  const itemsNow = count(ym), itemsPrev = count(prev), hadPrev = txs.some(t => t.type === 'expense' && monthOf(t.date) === prev);
  for (const [k, v] of Object.entries(itemsNow)) {
    if (v.n < 3 || !hadPrev) continue;
    const p = itemsPrev[k];
    const change = p?.cents ? Math.round((v.cents - p.cents) / p.cents * 100) : null;
    out.push({ id: `item-${k}-${ym}`, kind: 'item', level: 'info', title: ['You bought {0} {1}× this month ({2})', { raw: v.name }, v.n, fmtRM(v.cents)], body: change == null ? ['Not bought last month.'] : change === 0 ? ['Same as last month.'] : [change > 0 ? '{0}% more than last month.' : '{0}% less than last month.', Math.abs(change)] });
  }
  // Price changes in the last 30 days: the same item costs 10%+ more (or less) than the previous time.
  const seen = {};
  for (const t of txs.filter(t => t.type === 'expense').sort((a, b) => a.date.localeCompare(b.date))) {
    for (const it of t.items || []) {
      const k = itemKey(it.name), unit = it.unit ?? it.cents;
      if (!k || !(unit > 0)) continue;
      if (seen[k] && t.date >= addDays(today, -30) && seen[k].date < t.date) {
        const ch = (unit - seen[k].unit) / seen[k].unit;
        if (Math.abs(ch) >= 0.1) out.push({ id: `price-${k}-${t.date}`, kind: 'price', level: ch > 0 ? 'info' : 'good', title: [ch > 0 ? '{0} went up {1}%' : '{0} went down {1}%', { raw: it.name }, Math.round(Math.abs(ch) * 100)], body: ['You paid {0}, {1} on {2}.', fmtRM(unit), fmtRM(seen[k].unit), { date: seen[k].date }] });
      }
      seen[k] = { unit, date: t.date };
    }
  }
  // Recurring: same shop and about the same amount in 3+ different months, not yet set up as a bill.
  for (const r of recurringCandidates(txs, knownBills)) out.push({ id: `rec-${r.key}`, kind: 'recurring', level: 'info', title: ['{0} looks like a monthly bill ({1})', { raw: r.merchant }, fmtRM(r.amount)], body: ['Add it to your bills to get a reminder before it is due.'], rec: r });
  // Month recap: the first 5 days of a month look back at the last one.
  if (+today.slice(8, 10) <= 5 && last.total > 0) {
    const top = Object.entries(last.byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    out.push({ id: `recap-${prev}`, kind: 'recap', level: 'good', title: ['Last month you spent {0}', fmtRM(last.total)], body: ['Top: {0}.', { list: top.map(([c, v]) => [{ cat: c }, fmtRM(v)]) }] });
  }
  const rank = { warn: 0, info: 1, good: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/** Shop + amount (within 5%) seen in 3+ different months. `known`: shop keys already set up as bills. */
export function recurringCandidates(txs, known = []) {
  const groups = {};
  for (const t of txs) {
    if (t.type !== 'expense' || !t.merchant) continue;
    const k = shopWord(t.merchant);
    if (k) (groups[k] ||= []).push(t);
  }
  const out = [], latest = txs.reduce((m, t) => (t.date > m ? t.date : m), '');
  const run3 = months => months.some(m => months.includes(addMonths(m, 1)) && months.includes(addMonths(m, 2)));
  for (const [k, list] of Object.entries(groups)) {
    if (known.includes(k) || new Set(list.map(t => monthOf(t.date))).size < 3) continue;
    const amts = list.map(t => t.amount).sort((a, b) => a - b), mid = amts[Math.floor(amts.length / 2)];
    const close = list.filter(t => Math.abs(t.amount - mid) <= mid * 0.05);
    if (new Set(close.map(t => monthOf(t.date))).size < 3) continue;
    // A bill comes on about the same day each month, costs RM 20 or more, and isn't a meal or groceries.
    const days = close.map(t => +t.date.slice(8, 10)).sort((a, b) => a - b), mday = days[Math.floor(days.length / 2)];
    if (mid < 2000 || close.filter(t => Math.abs(+t.date.slice(8, 10) - mday) <= 3).length < 3) continue;
    if (close.every(t => ['dining', 'groceries', 'transport'].includes(t.category) || (t.items || []).length)) continue;
    // Three months in a row, still going (seen in the last 45 days), and not an instalment that has ended ("12/12").
    const lastTx = list.reduce((a, b) => (a.date > b.date ? a : b));
    if (!run3([...new Set(close.map(t => monthOf(t.date)))]) || daysBetween(lastTx.date, latest) > 45) continue;
    const inst = `${lastTx.note || ''} ${lastTx.merchant}`.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
    if (inst && +inst[1] >= +inst[2] && +inst[2] > 1) continue;
    out.push({ key: k, merchant: lastTx.merchant, amount: mid, category: lastTx.category || 'bills', day: +lastTx.date.slice(8, 10) });
  }
  return out;
}
export const billKey = shopWord;

// ---- habits: when does this person usually spend? -------------------------------------------------------
// Only transactions with a time of day count (tx.time 'HH:MM', from the receipt or when it was added).
const mins = hhmm => (/^\d{2}:\d{2}$/.test(hhmm || '') ? +hhmm.slice(0, 2) * 60 + +hhmm.slice(3) : null);
const dayKind = iso => ([0, 6].includes(new Date(iso + 'T00:00:00Z').getUTCDay()) ? 'weekend' : 'weekday');
export const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
/**
 * Habits from the last 4 weeks: a category spent 3+ times, on 3+ different days of the same kind (weekday or
 * weekend), within the same 90-minute window. → [{category, days, at: 'HH:MM' (median), count, amount (median)}]
 */
export function habits(txs, today) {
  // The latest 4 weeks that have timed spending: a break in logging doesn't wipe what Tally learned.
  const last = txs.reduce((m, t) => (t.type === 'expense' && mins(t.time) != null && t.date <= today && t.date > m ? t.date : m), '');
  if (!last) return [];
  today = last;
  const from = addDays(today, -28);
  const groups = {};
  for (const t of txs) {
    const m = mins(t.time);
    if (t.type !== 'expense' || m == null || t.date < from || t.date > today) continue;
    for (const { category } of breakdown(t).slice(0, 1)) (groups[`${category}|${dayKind(t.date)}`] ||= []).push({ m, date: t.date, amount: t.amount });
  }
  const out = [];
  for (const [key, list] of Object.entries(groups)) {
    const [category, days] = key.split('|');
    list.sort((a, b) => a.m - b.m);
    // Widest cluster of times inside 90 minutes (sliding window).
    let best = [];
    for (let i = 0, j = 0; j < list.length; j++) {
      while (list[j].m - list[i].m > 90) i++;
      if (j - i + 1 > best.length) best = list.slice(i, j + 1);
    }
    if (best.length < 3 || new Set(best.map(x => x.date)).size < 3) continue;
    const mid = a => a[Math.floor(a.length / 2)];
    out.push({ category, days, at: hhmm(mid(best.map(x => x.m))), count: best.length, amount: mid(best.map(x => x.amount).sort((a, b) => a - b)) });
  }
  return out.sort((a, b) => b.count - a.count);
}
/**
 * The habit to nudge about right now: its usual time passed 30 to 180 minutes ago today, and nothing in that
 * category has been added today since an hour before it. `now` is local 'YYYY-MM-DDTHH:MM'.
 */
export function dueNudge(habitList, txs, now, dismissed = []) {
  const date = now.slice(0, 10), m = mins(now.slice(11, 16));
  for (const h of habitList) {
    const at = mins(h.at), id = `${h.category}|${h.days}|${date}`;
    if (h.days !== dayKind(date) || dismissed.includes(id) || m - at < 30 || m - at > 180) continue;
    const logged = txs.some(t => t.type === 'expense' && t.date === date && breakdown(t).some(b => b.category === h.category) && (mins(t.time) ?? at) >= at - 60);
    if (!logged) return { ...h, id };
  }
  return null;
}
