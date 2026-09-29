// Pure money logic: no DOM, no storage. Every amount is integer sen (RM 1.00 = 100).

// The most used categories take the Okabe–Ito colours: still told apart with red-green colour blindness.
export const CATEGORIES = [
  { id: 'groceries', name: 'Groceries', color: '#009E73' },
  { id: 'dining', name: 'Dining', color: '#E69F00' },
  { id: 'transport', name: 'Transport', color: '#0072B2' },
  { id: 'bills', name: 'Bills', color: '#56B4E9' },
  { id: 'household', name: 'Household', color: '#A16207' },
  { id: 'health', name: 'Health', color: '#CC79A7' },
  { id: 'personal', name: 'Personal care', color: '#EC4899' },
  { id: 'kids', name: 'Kids', color: '#8B5CF6' },
  { id: 'electronics', name: 'Electronics', color: '#0D9488' },
  { id: 'shopping', name: 'Shopping', color: '#D55E00' },
  { id: 'fun', name: 'Entertainment', color: '#D946EF' },
  { id: 'education', name: 'Education', color: '#6366F1' },
  { id: 'other', name: 'Other', color: '#64748B' },
];
/** Colours for categories the user adds, none close to a built-in one; the first not yet used is taken. */
export const CUSTOM_COLORS = ['#22C55E', '#FB7185', '#C084FC', '#0369A1', '#EAB308', '#A3E635', '#78716C', '#F87171', '#2DD4BF', '#9A3412'];
export const nextColor = (used = []) => { const u = new Set(used.map(c => String(c).toLowerCase())); return CUSTOM_COLORS.find(c => !u.has(c.toLowerCase())) || CUSTOM_COLORS[u.size % CUSTOM_COLORS.length]; };
export const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salary', color: '#059669' },
  { id: 'allowance', name: 'Allowance', color: '#10B981' },
  { id: 'family', name: 'From family', color: '#6EE7B7' },
  { id: 'refund', name: 'Refund', color: '#A7F3D0' },
  { id: 'income', name: 'Other income', color: '#34D399' },   // stays last: custom income categories go before it
];
/** Money back for something bought: money in, but it lowers spending in the category it returns to (`cat`), not income. */
export const isRefund = t => t.type === 'income' && t.category === 'refund';
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
  let s = String(v ?? '').normalize('NFKC').trim().replace(/^RM\s*/i, '').replace(/\s+/g, '');   // full-width １２．５０ too
  // Banks write the sign either side ("60.00-", "3,520.40+") or as DR / CR.
  const dr = /DR$/i.test(s), neg = dr || /^-|-$|^\(.*\)$/.test(s);
  s = s.replace(/(DR|CR)$/i, '').replace(/^[-+(]|[-+)]$/g, '').replace(/^RM/i, '');
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$|^\.\d{1,2}$/.test(s)) return null;
  const [w, f = ''] = s.split('.');
  const sen = (+w || 0) * 100 + +(f + '00').slice(0, 2);
  if (sen > MAX_SEN) return null;
  return neg ? -sen : sen;
}
/**
 * A sum typed into an amount field: "12.50+8*2" → 2850, "100/3" → 3333 (to the sen). Numbers, + - * / × ÷ − and
 * brackets only, read by a tiny recursive-descent parser (never eval). A plain amount goes through parseAmount.
 * null if it isn't a sum, divides by zero or is out of range.
 */
export function calcAmount(v) {
  if (typeof v === 'string') v = v.normalize('NFKC');   // ＋ × from a Chinese keyboard
  const plain = /\+\s*$/.test(String(v)) ? null : parseAmount(v);   // typing "12+" is a sum not finished yet, not a bank's +12
  if (plain != null || typeof v === 'number') return plain;
  const s = String(v ?? '').replace(/^\s*RM/i, '').replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/\s+/g, '');
  if (!/^[\d.+\-*/()]{1,100}$/.test(s) || !/\d[^\d.]|[^\d.]\d/.test(s)) return null;
  let i = 0;
  const num = () => { const m = s.slice(i).match(/^\d+(\.\d*)?|^\.\d+/); if (!m) throw 0; i += m[0].length; return +m[0]; };
  const atom = () => {
    if (s[i] === '-') { i++; return -atom(); }
    if (s[i] === '+') { i++; return atom(); }
    if (s[i] === '(') { i++; const v = sum(); if (s[i++] !== ')') throw 0; return v; }
    return num();
  };
  const prod = () => { let v = atom(); while (s[i] === '*' || s[i] === '/') { const op = s[i++], b = atom(); if (op === '/' && !b) throw 0; v = op === '*' ? v * b : v / b; } return v; };
  const sum = () => { let v = prod(); while (s[i] === '+' || s[i] === '-') { const op = s[i++], b = prod(); v = op === '+' ? v + b : v - b; } return v; };
  try {
    const v = sum();
    if (i !== s.length || !Number.isFinite(v) || Math.abs(v * 100) > MAX_SEN) return null;
    return Math.round(Math.round(v * 1e6) / 1e4);   // 0.1+0.2 → 30 sen, not 30.000000000000004
  } catch { return null; }
}
/** 123450 → "RM 1,234.50" ("−RM 3.00" for negatives). */
export function fmtRM(sen, { plain = false } = {}) {
  if (sen == null || !Number.isFinite(sen)) return '–';
  const a = Math.abs(Math.round(sen));
  const s = `${Math.floor(a / 100).toLocaleString('en-MY')}.${String(a % 100).padStart(2, '0')}`;
  return (sen < 0 ? '−' : '') + (plain ? s : 'RM ' + s)   // never split "RM" from its figure;
}
/** A typed number over RM 100 million (MAX_SEN): the field says "too large", not "enter an amount". */
export const tooLarge = v => calcAmount(v) == null && (String(v ?? '').match(/\d[\d,]*(\.\d+)?/g) || []).some(n => parseFloat(n.replace(/,/g, '')) * 100 > MAX_SEN);
/** An account kept in another currency (an SGD bank for someone who works in Singapore). Its amounts are in that currency. */
export const isFx = a => !!a?.currency && a.currency !== 'MYR';
/** Where a new currency account's rate starts; the user's own rate, or the one a transfer between the two got, replaces it.
 *  ponytail: fixed starting points, not live rates (no server); add a rate feed only if people ask. */
export const FX_START = { SGD: 3.3, USD: 4.2, EUR: 4.9, GBP: 5.6, AUD: 2.8, BND: 3.3, HKD: 0.54, CNY: 0.59, THB: 0.13, IDR: 0.00026, JPY: 0.029 };
/** RM for 1 unit of the account's currency (1 for RM accounts; 0 when unknown). */
export const rateOf = a => (isFx(a) ? +a.rate || FX_START[a.currency] || 0 : 1);
/** Accounts left out of the RM total: a bank not in Tally, or a currency with no rate. */
export const offTotal = a => !!a?.outside || !rateOf(a);
/** An account's balance in its own currency: "SGD 1,234.50" for one kept in another currency. */
export const fmtAcct = (a, sen) => (a?.currency && a.currency !== 'MYR' ? `${a.currency} ${fmtRM(sen, { plain: true })}` : fmtRM(sen));

// ---- dates -------------------------------------------------------------------------------
export const monthOf = iso => iso.slice(0, 7);
export const daysInMonth = ym => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
export function addMonths(ym, n) {   // string arithmetic: payday months run this for every row
  const m = +ym.slice(5, 7) - 1 + n, y = +ym.slice(0, 4) + Math.floor(m / 12);
  return `${String(y).padStart(4, '0')}-${pad2(m - Math.floor(m / 12) * 12 + 1)}`;
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Order of two ISO dates (or 'HH:MM' times): plain string order, many times faster than localeCompare. */
export const byDate = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const pad2 = n => String(n).padStart(2, '0');
/**
 * The budget month holding `iso` when months start on `startDay` (1–28, a payday): {start, end, key}. key is the
 * 'YYYY-MM' the cycle starts in, so addMonths still steps through cycles. startDay 1 is the calendar month.
 */
export function cycleOf(iso, startDay = 1) {
  const sd = Math.min(28, Math.max(1, Math.trunc(startDay) || 1)), key = cycleKey(iso, sd);
  return { key, start: `${key}-${pad2(sd)}`, end: addDays(`${addMonths(key, 1)}-${pad2(sd)}`, -1) };
}
export const cycleKey = (iso, sd = 1) => (+iso.slice(8, 10) >= sd ? iso.slice(0, 7) : addMonths(iso.slice(0, 7), -1));
/** The cycle a key names: cycleSpan('2026-09', 25) → 25 Sep to 24 Oct. */
export const cycleSpan = (key, sd = 1) => cycleOf(`${key}-${pad2(Math.min(28, Math.max(1, sd)))}`, sd);
export const validIso = s => /^(19[89]\d|20\d\d)-\d{2}-\d{2}$/.test(String(s)) &&   // 1990–2099: a year typed as "26" (0026) is a slip
  !isNaN(Date.parse(s)) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;

// ---- categorizing ----------------------------------------------------------------------------
/** fn(text) worked out once per text: the same shop and item names come back on every screen. */
const once = fn => { const m = new Map(); return s => { let v = m.get(s); if (v === undefined) { if (m.size > 20000) m.clear(); m.set(s, v = fn(s)); } return v; }; };
/** Key for remembering an item: "KS SNRS 2PK " → "KS SNRS 2PK". Pure codes and prices are dropped. */
export const itemKey = once(name => String(name ?? '').toUpperCase().replace(/\b\d{5,}\b/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60));

// Malaysian shop words in English, Malay and Chinese, most specific first (奶粉 is Kids, not a 粉 noodle).
// ponytail: keyword list; user corrections become rules.
const WORDS = [
  // Named by what they are, before "rice" or "egg" make a meal groceries, or "Penang" looks like a pen.
  ['dining', /\b(sarapan|breakfast|brunch|lunch|dinner|supper)\b|makan (pagi|tengah ?hari|malam)|早餐|午餐|晚餐|宵夜|economy rice|mixed rice|chap ?fan|杂饭|雜飯|经济饭|經濟飯|nasi campur|roti (telur|canai|kosong|bom|jala|tissue)|char kue?y teow|fried rice|nasi (goreng|lemak|kandar|ayam|kerabu|dagang|briyani|biryani)|(chicken|lamb|fish|pork) chop|tom ?yam|mee (goreng|kari|curry|rebus|hailam|bandung|sup)|kue?y ?teow|iced? (lemon|tea|coffee|milo|latte)|lemon tea|telur mata|teh (tarik|o|ais|c|halia)\b|kopi (o|c|ais|peng)\b|\bslice\b|set meal|炒饭|炒飯|面线|鸡饭|雞飯/i],
  ['transport', /油费|汽油|加油|油站|打油|minyak (motor|kereta|moto)|isi minyak|\bbrt\b|rapid ?(kl|penang|kuantan|bus)|巴士|公交|\bbas\b|\bbus\b|\blrt\b|\bmrt\b/i],
  ['education', /fotostat|photo ?copy|cetak nota|复印|複印/i],
  ['groceries', /\bgrocer(y|ies)\b|barang dapur/i],
  // Car upkeep first: "minyak enjin" is not cooking oil, "bateri kereta" not a household battery. Not "filter" or "upah" alone.
  ['transport', /minyak enjin|engine oil|filter minyak|oil filter|\btayar\b|\btyres?\b|\btires?\b|puncture|wiper|bateri kereta|car battery|servis kereta|car service|bengkel|workshop|spark ?plug|\bbrek\b|\bbrakes?\b|absorber|alignment|road ?tax|cukai jalan|insurans kereta|car insurance/i],
  ['bills', /air selangor|air kelantan|syabas|indah water|ranhill|\bsaj\b|\bpba\b water|ptptn|\brent(al)?\b|\bsewa\b|prepaid|hotlink|xpax|\btopup\b|reload (kredit|credit|phone|telefon)/i],
  ['kids', /diaper|lampin|pampers|mamypoko|drypers|susu formula|formula|baby|bayi|toy|mainan|crayon|school|sekolah|尿布|奶粉|玩具|婴儿|嬰兒/i],
  ['health', /panadol|claritin|vitamin|ubat|medicine|medical|doctor|doktor|dental|dentist|clinic|klinik|pharmacy|farmasi|mask|plaster|antiseptic|dettol|strepsils|zyrtec|hospital|药|藥|维他命|維他命|口罩|诊所|診所/i],
  ['personal', /shampoo|syampu|toothpaste|ubat gigi|colgate|darlie|lotion|deodorant|razor|pisau cukur|sunblock|facial|cleanser|conditioner|sanitary|tuala wanita|kotex|laurier|haircut|gunting rambut|洗发|洗髮|牙膏|沐浴/i],
  ['dining', /nasi|mee |mee$|mi goreng|roti canai|teh |kopi|coffee|latte|milo ais|ais |burger|pizza|chicken rice|laksa|satay|restoran|restaurant|cafe|kafe|food|makan|drink|minum|set meal|meal|kfc|mcd|mamak|饭|面|粉|咖啡|茶|奶茶|套餐|饮料|點心|点心|包子|炒/i],
  ['groceries', /beras|rice|telur|egg|susu|milk|roti|bread|gardenia|gula|sugar|minyak|oil|ayam|chicken|ikan|fish|udang|prawn|sotong|squid|ketam|crab|kerang|daging|beef|kambing|mutton|lamb|sayur|vege|buah|fruit|garam|salt|tepung|flour|kicap|sos |sauce|mineral|air |water|biskut|biscuit|mentega|butter|cheese|yogurt|noodle|maggi|milo|nescafe|tea|bawang|onion|tomato|kentang|potato|米|蛋|鸡|雞|鱼|魚|肉|菜|水果|糖|油|盐|鹽|面包|麵包|牛奶|豆腐|酱|醬|虾|蝦|苹果|蘋果|葱|蔥|姜|薑|榴莲|榴槤|蒜|辣椒|瓜|豆芽|豆|芽|番茄|萝卜|蘿蔔|薯|芋|香蕉|橙|木瓜|西瓜|包菜|芥兰|芥蘭|白菜|菠菜|蘑菇|菇|蛤|蚬|蜆|螃蟹|蟹|鱿鱼|魷魚|江鱼仔|江魚仔|咸鱼|鹹魚|排骨|猪|豬|牛|羊|鸭|鴨|米粉|粿条|粿條|面条|麵條/i],
  ['household', /sabun|soap|detergent|tissue|tisu|bleach|sponge|mop|broom|penyapu|plastic|beg |bag|towel|tuala|bateri|battery|mentol|bulb|span|kitchen|dapur|pinggan|cawan|cup|peg|hanger|clorox|dynamo|downy|breeze|glad|ziploc|纸巾|紙巾|洗衣|清洁|清潔|垃圾袋|电池|電池|毛巾/i],
  ['transport', /petrol|ron ?9[57]|v-?power|diesel|primax|parking|letak kereta|toll|tol |grab|touch ?n ?go|lrt|mrt|bus|teksi|taxi|fuel|汽油|停车|停車|过路费/i],
  ['bills', /tnb|electric|elektrik|syabas|air selangor|water bill|unifi|maxis|celcom|\bdigi\b|umobile|internet|astro|insurance|insurans|takaful|loan|pinjaman|电费|電費|水费|水費|保险|保險/i],
  ['electronics', /\b(hand)?phone\b|telefon|iphone|ipad|samsung|xiaomi|redmi|huawei|oppo|vivo|realme|honor|charger|pengecas|\bcable\b|kabel|earphone|earbud|headphone|headset|airpods|power ?bank|laptop|notebook|macbook|\bmonitor\b|keyboard|\bmouse\b|printer|cartridge|sd card|memory card|pendrive|thumb ?drive|\busb\b|hdmi|speaker|\btv\b|television|smart ?watch|camera|console|playstation|\bps5\b|nintendo|electronic|elektronik|gadget|手机|手機|充电|耳机|耳機|电脑|電腦|平板/i],
  ['education', /book|buku|pen |pencil|pensel|stationery|stationer|alat tulis|tuition|tuisyen|yuran|fee|书|書|文具|补习|補習/i],
  ['fun', /cinema|wayang|gsc|tgv|netflix|spotify|game|karaoke|bowling|concert|电影|電影/i],
];
const SHOPS = [
  ['groceries', /\bkk ?(super ?)?mart\b/i],   // a convenience store, not "mart" shopping
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
export const unplace = once(s => String(s ?? '').replace(PLACE, ' '));
/** Category for an item: the user's own rule first, then item words, then the shop's usual category. */
/** "Only my categories" (Settings): Tally's own word lists are off; only what the user taught it (rules) files things. */
let ownOnly = false;
export const ownCategories = on => { ownOnly = !!on; };
export function categorize(name, merchant = '', rules = {}) {
  const k = itemKey(name);
  if (k && Object.hasOwn(rules, k)) return rules[k];
  const shop = shopCategory(merchant, rules);
  if (ownOnly) return shop;
  const n = ' ' + unplace(name) + ' ';
  for (const [c, re] of WORDS) if (re.test(n)) return c === 'groceries' && shop === 'dining' ? 'dining' : c; // teh at a kopitiam is a meal
  return shop;
}
export function shopCategory(merchant = '', rules = {}) {
  const mk = 'SHOP ' + itemKey(merchant);
  if (Object.hasOwn(rules, mk)) return rules[mk];
  if (ownOnly) return 'other';
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
  const by = {};
  for (const { category, cents } of itemAmounts(tx)) by[category] = (by[category] || 0) + cents;
  return Object.entries(by).map(([category, cents]) => ({ category, cents }));
}
/** A receipt's items, each with its share of tax, service and rounding (summing exactly to tx.amount). No items: the payment as one. */
export function itemAmounts(tx) {
  const items = (tx.items || []).filter(i => Number.isFinite(i.cents));
  if (!items.length) return [{ name: '', category: tx.category || 'other', cents: tx.amount }];
  const add = allocate(items.map(i => i.cents), tx.amount - items.reduce((s, i) => s + i.cents, 0));
  return items.map((it, i) => ({ name: it.name, category: it.category || 'other', cents: it.cents + add[i] }));
}

// ---- balances & months -----------------------------------------------------------------------
/** Balance per account, each in its own currency, and the total in RM (other currencies at their rate; offTotal left
 *  out), optionally up to and including a date. Rows converted to RM for totals (state.js inRM) keep the account's own amount in `fx`;
 *  a transfer between currencies says what arrived in `toAmount`. */
export function balances(accounts, txs, upTo = null) {
  const by = Object.fromEntries(accounts.map(a => [a.id, a.opening || 0]));
  for (const t of txs) {
    if (upTo && t.date > upTo) continue;
    if (t.type === 'expense') by[t.accountId] = (by[t.accountId] ?? 0) - (t.fx ?? t.amount);
    else if (t.type === 'income') by[t.accountId] = (by[t.accountId] ?? 0) + (t.fx ?? t.amount);
    else if (t.type === 'transfer') { by[t.accountId] = (by[t.accountId] ?? 0) - t.amount; by[t.toAccountId] = (by[t.toAccountId] ?? 0) + (t.toAmount ?? t.amount); }
  }
  const total = accounts.filter(a => !offTotal(a)).reduce((s, a) => s + Math.round(by[a.id] * rateOf(a)), 0);
  return { by, total };
}
/** A row in an account of another currency, in RM at `rate`: amount and items converted, the account's own amount kept in `fx`. */
export function toRM(x, rate) {
  const r = { ...x, amount: Math.round(x.amount * rate), fx: x.amount };
  if (x.items?.length) { r.items = x.items.map(i => ({ ...i, cents: Math.round(i.cents * rate) })); const more = allocate(r.items.map(i => i.cents), r.amount - r.items.reduce((s, i) => s + i.cents, 0)); r.items.forEach((i, n) => { i.cents += more[n]; }); }   // still adds up to the total, the difference spread by size (never a negative line)
  return r;
}
/**
 * Spending in a month (a cycle when months start on day `sd`): total and per category (receipts split by item).
 * Transfers never count. For pace: `each` lists the single everyday payments behind the total and each category,
 * `fixed` sums the bill payments (they come once a month, not every day).
 */
export const monthSpend = (txs, ym, sd = 1) => monthSpends(txs, [ym], sd)[ym];
/** monthSpend for several months in one pass over the transactions: {ym: monthSpend(txs, ym, sd)}. */
export function monthSpends(txs, yms, sd = 1) {
  const by = new Map(yms.map(ym => [ym, { total: 0, byCat: {}, each: { total: [] }, fixed: { total: 0 } }]));
  for (const t of txs) {
    const back = isRefund(t), m = (t.type === 'expense' || back) && by.get(cycleKey(t.date, sd));
    if (!m) continue;
    const { byCat, each, fixed } = m;
    if (back) { m.total -= t.amount; for (const { category, cents } of breakdown({ ...t, category: t.cat || 'other' })) byCat[category] = (byCat[category] || 0) - cents; continue; }
    const bill = isBill(t);
    m.total += t.amount; if (bill) fixed.total += t.amount; else each.total.push(t.amount);
    for (const { category, cents } of breakdown(t)) {
      byCat[category] = (byCat[category] || 0) + cents;
      if (bill) fixed[category] = (fixed[category] || 0) + cents; else (each[category] ||= []).push(cents);
    }
  }
  return Object.fromEntries(yms.map(ym => [ym, by.get(ym)]));
}
/** The n latest transactions (by date, then the last added), as a stable sort would list them, without sorting them all. */
export function newest(txs, n) {
  const later = (a, b) => byDate(b.date, a.date) || (b.createdAt - a.createdAt) || 0, top = [];
  if (!(n > 0)) return top;
  for (const x of txs) {
    if (top.length === n && later(x, top[n - 1]) >= 0) continue;
    let i = top.length;
    while (i > 0 && later(x, top[i - 1]) < 0) i--;
    top.splice(i, 0, x);
    if (top.length > n) top.pop();
  }
  return top;
}
/** A payment for a bill (added by the bill itself or with "Mark as paid"). */
export const isBill = t => t.source === 'recurring' || !!t.bill;
export const monthIncome = (txs, ym, sd = 1) => monthIncomes(txs, [ym], sd)[ym];
/** Money in for several months in one pass: {ym: sen}. */
export function monthIncomes(txs, yms, sd = 1) {
  const by = new Map(yms.map(ym => [ym, 0]));
  for (const t of txs) if (t.type === 'income' && !isRefund(t)) { const k = cycleKey(t.date, sd); if (by.has(k)) by.set(k, by.get(k) + t.amount); }
  return Object.fromEntries(by);
}
export function cashFlow(txs, endYm, n = 6, sd = 1) {
  const yms = Array.from({ length: n }, (_, i) => addMonths(endYm, i - n + 1)), sp = monthSpends(txs, yms, sd), inc = monthIncomes(txs, yms, sd);
  return yms.map(ym => ({ ym, income: inc[ym], expense: sp[ym].total }));
}
/** Balance at the end of each of the last n months or cycles (today for the current one). */
export function balanceTrend(accounts, txs, today, n = 6, sd = 1) {
  const ym = cycleKey(today, sd);
  return Array.from({ length: n }, (_, i) => addMonths(ym, i - n + 1)).map(m => {
    const end = m === ym ? today : cycleSpan(m, sd).end;
    return { date: end, v: balances(accounts, txs, end).total };
  });
}

// ---- budgets -----------------------------------------------------------------------------------
/**
 * Pace of a budget this month (or cycle from `startDay`): share used, projected month-end spend, and whether it's
 * heading over. Calm by design: never "heading over" in the first 7 days, and bills (`fixed`) and any single payment
 * over 25% of the budget (rent, a phone) count in the total but not in the daily rate, so one big day can't project
 * a month of them. `amounts`: the single everyday payments behind `spent` (monthSpend().each / .fixed).
 */
export function pace(budget, spent, today, { startDay = 1, amounts = [], fixed = 0 } = {}) {
  const c = cycleOf(today, startDay), day = daysBetween(c.start, today) + 1, len = daysBetween(c.start, c.end) + 1;
  const big = fixed + (budget > 0 ? amounts.filter(a => a > budget * 0.25).reduce((s, a) => s + a, 0) : 0);
  const projected = big + Math.round((spent - big) / day * len);
  return { pct: budget ? spent / budget : 0, projected, over: budget > 0 && day > 7 && projected > budget, left: budget - spent, daysLeft: len - day };
}

// ---- duplicates --------------------------------------------------------------------------------
const shopWord = once(s => itemKey(s).split(' ').filter(w => w.length > 2 || /\p{Script=Han}/u.test(w)).slice(0, 2).join(' '));
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
export function insights({ txs, budgets = {}, today, knownBills = [], startDay = 1 }) {
  const out = [], sd = startDay;
  const ym = cycleKey(today, sd), prev = addMonths(ym, -1);
  const { [ym]: now, [prev]: last } = monthSpends(txs, [ym, prev], sd);
  // Pace: a budget heading over before the month ends.
  const checks = [['total', budgets.total, now.total], ...Object.entries(budgets.byCat || {}).map(([c, b]) => [c, b, now.byCat[c] || 0])];
  for (const [c, b, spent] of checks) {
    if (!b) continue;
    const p = pace(b, spent, today, { startDay: sd, amounts: now.each[c], fixed: now.fixed[c] });
    const label = { cat: c };
    if (spent > b) out.push({ id: `over-${c}-${ym}`, kind: 'pace', level: 'warn', cat: c, title: ['{0} is over budget', label], body: ['Spent {0} of {1}.', fmtRM(spent), fmtRM(b)] });
    else if (p.over && p.pct >= 0.5) out.push({ id: `pace-${c}-${ym}`, kind: 'pace', level: 'warn', cat: c, title: ['{0} at {1}% with {2} days left', label, Math.round(p.pct * 100), p.daysLeft], body: ["At this pace you'll spend {0}, {1} over.", fmtRM(p.projected), fmtRM(p.projected - b)] });
  }
  // Unusual week: a category this week at 2x or more its usual week. "Usual" = the average over the weeks of the
  // last 12 that have any spending at all (4+ needed), so an old or stray receipt can't stretch the history.
  const weekStart = addDays(today, -6);
  const from = addDays(weekStart, -7 * 12), flex = txs.filter(t => t.type === 'expense' && !isBill(t) && t.date >= from && t.date <= today);
  const inRange = (a, b) => flex.filter(t => t.date >= a && t.date <= b);
  const active = Array.from({ length: 12 }, (_, k) => addDays(weekStart, -7 * (k + 1))).filter(s => { const e = addDays(s, 6); return flex.some(t => t.date >= s && t.date <= e); }).length;
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
  const itemsNow = {}, itemsPrev = {};
  let hadPrev = false;
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const m = cycleKey(t.date, sd), by = m === ym ? itemsNow : m === prev ? itemsPrev : null;
    if (m === prev) hadPrev = true;
    if (by) for (const it of t.items || []) {
      const k = itemKey(it.name); if (!k) continue;
      (by[k] ||= { n: 0, cents: 0, name: it.name }); by[k].n++; by[k].cents += it.cents;
    }
  }
  for (const [k, v] of Object.entries(itemsNow)) {
    if (v.n < 3 || !hadPrev) continue;
    const p = itemsPrev[k];
    const change = p?.cents ? Math.round((v.cents - p.cents) / p.cents * 100) : null;
    out.push({ id: `item-${k}-${ym}`, kind: 'item', level: 'info', title: ['You bought {0} {1}× this month ({2})', { raw: v.name }, v.n, fmtRM(v.cents)], body: change == null ? ['Not bought last month.'] : change === 0 ? ['Same as last month.'] : [change > 0 ? '{0}% more than last month.' : '{0}% less than last month.', Math.abs(change)] });
  }
  // Price changes in the last 30 days: the same item costs 10%+ more (or less) than the previous time.
  // Only each item's latest change, and the 3 most recent of those.
  const seen = {}, moved = {}, since = addDays(today, -30);
  for (const t of txs.filter(t => t.type === 'expense').sort((a, b) => byDate(a.date, b.date))) {
    for (const it of t.items || []) {
      const k = itemKey(it.name), unit = it.unit ?? it.cents;
      if (!k || !(unit > 0)) continue;
      if (seen[k] && t.date >= since && seen[k].date < t.date) {
        const ch = (unit - seen[k].unit) / seen[k].unit;
        if (Math.abs(ch) >= 0.1) moved[k] = { id: `price-${k}-${t.date}`, kind: 'price', level: ch > 0 ? 'info' : 'good', date: t.date, title: [ch > 0 ? '{0} went up {1}%' : '{0} went down {1}%', { raw: it.name }, Math.round(Math.abs(ch) * 100)], body: ['This time {0}, last time ({1}) {2}', fmtRM(unit), { date: seen[k].date }, fmtRM(seen[k].unit)] };
      }
      seen[k] = { unit, date: t.date };
    }
  }
  out.push(...Object.values(moved).sort((a, b) => byDate(b.date, a.date)).slice(0, 3));
  // Recurring: same shop and about the same amount in 3+ different months, not yet set up as a bill.
  for (const r of recurringCandidates(txs, knownBills)) out.push({ id: `rec-${r.key}`, kind: 'recurring', level: 'info', title: ['{0} looks like a monthly bill ({1})', { raw: r.merchant }, fmtRM(r.amount)], body: ['Add it to your bills to get a reminder before it is due.'], rec: r });
  // Month recap: the first 5 days of a month look back at the last one.
  if (daysBetween(cycleOf(today, sd).start, today) < 5 && last.total > 0) {
    const top = Object.entries(last.byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    out.push({ id: `recap-${prev}`, kind: 'recap', level: 'good', title: ['Last month you spent {0}', fmtRM(last.total)], body: ['Top: {0}.', { list: top.map(([c, v]) => [{ cat: c }, fmtRM(v)]) }] });
  }
  const rank = { warn: 0, info: 1, good: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

const EVERYDAY = /\bgrab|food ?panda|shopee|lazada|makan|mamak|kopitiam|restoran|tesco|lotus|aeon|giant|mydin|speedmart|econsave|jaya grocer|family ?mart|7-?eleven|kk ?mart|supermarket|pasar|kedai runcit|petronas|shell|touch ?n ?go|\btng\b/i;
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
    const months = new Set(list.map(t => monthOf(t.date))).size;
    if (known.includes(k) || months < 3) continue;
    const amts = list.map(t => t.amount).sort((a, b) => a - b), mid = amts[Math.floor(amts.length / 2)];
    // Everyday places (ride-hailing, food delivery, supermarkets, online shops, "makan", or 3+ visits a month) are a bill
    // only when nearly every payment there is the same amount, about once a month (a subscription, an instalment).
    const everyday = list.length > months * 3 || EVERYDAY.test(list[0].merchant) || ['dining', 'groceries', 'shopping', 'transport'].includes(shopCategory(list[0].merchant));
    const close = list.filter(t => Math.abs(t.amount - mid) <= mid * (everyday ? 0.01 : 0.05));
    if (everyday && close.length < list.length * 0.8) continue;
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
    out.push({ key: k, merchant: lastTx.merchant, amount: mid, category: lastTx.category || 'bills', day: +lastTx.date.slice(8, 10), months: new Set(close.map(t => monthOf(t.date))).size });
  }
  return out;
}
export const billKey = shopWord;

/** The day an account last went below zero ('' if it isn't): its balance at the end of each day, from `txs`. */
export function belowSince(a, txs) {
  const move = {};
  for (const x of txs) {
    if (x.accountId === a.id) move[x.date] = (move[x.date] || 0) + (x.type === 'income' ? x.amount : -x.amount);
    if (x.type === 'transfer' && x.toAccountId === a.id) move[x.date] = (move[x.date] || 0) + x.amount;
  }
  let bal = a.opening || 0, since = '';
  for (const d of Object.keys(move).sort()) { bal += move[d]; since = bal < 0 ? since || d : ''; }
  return since;
}

// ---- the account a new entry starts on --------------------------------------------------------------------------
const BIG = 5000, HABIT_CATS = ['transport', 'groceries'];   // RM 50 or more, fuel and the supermarket: usually not cash
/**
 * One rule per kind, each easy to say:
 *  'bill': the main bank account (most salary paid in, else the bank used most). Never cash.
 *  'receipt': where this shop was paid before; else, for RM 50+ or fuel/groceries, the card, bank or e-wallet used most
 *    for such spending; else the everyday account.
 *  'quick': the everyday account, the one of the latest spending or income (not a transfer or a bill).
 * Then, for a receipt or quick add: never an account that would go below zero (cash, bank, e-wallet; a card owes by
 * design) while another has the money; the one with the most money instead. → an account id.
 * bal: {id: sen} now; txs: the entries to learn from.
 */
export function pickAccount({ accounts: all, txs = [], bal = {}, kind = 'quick', amount = 0, shop = '', category = '', pay = null, currency = 'MYR' }) {
  // Only accounts in the money of the entry (a Singapore receipt: the SGD account; anything typed: ringgit), when there are any.
  const inCur = a => (a.currency || 'MYR') === (currency || 'MYR'), accounts = all.some(inCur) ? all.filter(inCur) : all;
  const byId = new Map(accounts.map(a => [a.id, a]));
  const most = (list, ok = () => true) => {
    const n = new Map();
    for (const x of list) if (byId.has(x.accountId) && ok(byId.get(x.accountId))) n.set(x.accountId, (n.get(x.accountId) || 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const bank = a => a.kind === 'bank', notCash = a => a.kind !== 'cash';
  const main = () => most(txs.filter(x => x.type === 'income' && x.category === 'salary'), bank) || most(txs, bank)
    || accounts.find(bank)?.id || accounts.find(notCash)?.id || accounts[0]?.id;
  if (kind === 'bill') return main();
  if (kind === 'income') {   // this payer's money landed here before ("Lalamove minggu" → Bank), else where income usually lands
    const k = shop && shopWord(shop), inc = txs.filter(x => x.type === 'income');
    return (k && (most(inc.filter(x => x.merchant && shopWord(x.merchant) === k)) || most(inc.filter(x => x.merchant && shopWord(x.merchant).split(' ')[0] === k.split(' ')[0])))) || most(inc) || main();
  }
  // The receipt says how it was paid: VISA → the card (or the bank without one), MyDebit / NETS → the bank, TNG → the e-wallet, cash → cash.
  if (kind === 'receipt' && pay) {
    const want = pay === 'debit' ? 'bank' : pay;
    if (accounts.some(a => a.kind === want)) return most(txs.filter(x => x.type === 'expense'), a => a.kind === want) || accounts.find(a => a.kind === want).id;
    if (pay === 'card' || pay === 'debit') return main();
  }
  // The latest everyday account, from what was typed (a card used for one big receipt isn't where the kopi goes).
  const everyday = () => txs.filter(x => x.type !== 'transfer' && !x.bill && x.source !== 'recurring' && x.source !== 'receipt' && byId.has(x.accountId) && byId.get(x.accountId).kind !== 'card')   // one card purchase isn't where the kopi goes
    .reduce((m, x) => (!m || (x.createdAt || 0) > (m.createdAt || 0) ? x : m), null)?.accountId || accounts.find(a => a.kind === 'cash')?.id || accounts[0]?.id;
  const spend = txs.filter(x => x.type === 'expense');
  let id = null;
  const k = shop && shopWord(shop);
  if (k) id = most(spend.filter(x => x.merchant && shopWord(x.merchant) === k)) || most(spend.filter(x => x.merchant && shopWord(x.merchant).split(' ')[0] === k.split(' ')[0]));   // this shop (a toll on TNG; "GrabFood" as "GrabFood McDonald's" in a wallet's file): where it was paid before
  if (!id && kind === 'receipt' && (amount >= BIG || HABIT_CATS.includes(category))) id = most(spend.filter(x => x.amount >= BIG || HABIT_CATS.includes(x.category)), notCash) || main();
  id ||= everyday();
  if (k && id) return id;   // a habit is a habit, even when the balance looks short
  const short = a => a && a.kind !== 'card' && (bal[a.id] || 0) < Math.max(amount, 1);
  if (!short(byId.get(id))) return id;
  const rich = accounts.filter(a => a.kind !== 'card' && !short(a)).sort((a, b) => (bal[b.id] || 0) - (bal[a.id] || 0))[0];   // same currency: the balances compare
  return rich?.id || id;
}

// ---- bills that add themselves ---------------------------------------------------------------------------
/**
 * Dates a bill falls on from its start up to `upTo`: monthly on its day (the 31st → the month's last day), weekly or
 * yearly; it stops after `count` payments or on `until` (instalments, a car loan). A bill from before 0.4.0 has only
 * a day: monthly since 2020.
 */
export function billDates(r, upTo) {
  const from = r.start || '2020-01-01', out = [], max = r.count > 0 ? r.count : Infinity;
  if (r.until && r.until < upTo) upTo = r.until;
  for (let k = 0; out.length < max && k < 5000; k++) {
    let d;
    if (r.freq === 'weekly') d = addDays(from, 7 * k);
    else {
      const ym = addMonths(monthOf(from), r.freq === 'yearly' ? 12 * k : k);
      d = `${ym}-${pad2(Math.min(r.day || +from.slice(8, 10), daysInMonth(ym)))}`;
      if (d < from) continue;
    }
    if (d > upTo) break;
    out.push(d);
  }
  return out;
}
/** The days a payment counts for a bill due on `date`: its calendar month; 3 days either side (weekly); half a year (yearly). */
const billPeriod = (r, date) => (r.freq === 'weekly' ? [addDays(date, -3), addDays(date, 3)] : r.freq === 'yearly' ? [addDays(date, -182), addDays(date, 182)] : [`${monthOf(date)}-01`, `${monthOf(date)}-31`]);
/** Paid for the period of the payment due on `date`: an expense with the bill's name, whatever the amount (utility bills vary), or one tagged with the bill. */
export function billPaid(r, date, txs) {
  const name = String(r.name || '').trim().toLowerCase(), [a, b] = billPeriod(r, date);
  return txs.some(t => t.type === 'expense' && t.date >= a && t.date <= b && (t.bill === r.id || String(t.id).startsWith(`rec-${r.id}-`) || (!!name && String(t.merchant || '').trim().toLowerCase() === name)));
}
/**
 * Where a bill stands today. date: the payment due in the next 3 days, else the latest one due (so an unpaid one
 * stays overdue until paid or until the next is 3 days away); days until it (negative: overdue); next: the next date
 * after today (none: an instalment that has finished).
 */
export function billStatus(r, today, txs) {
  const all = billDates(r, addDays(today, 400)), soon = addDays(today, 3), date = all.filter(d => d <= soon).at(-1);
  return { date, next: all.find(d => d > today), paid: !!date && billPaid(r, date, txs), days: date ? daysBetween(today, date) : null };
}
/**
 * Payments to add for bills set to add themselves: each date after the bill's last run up to today, dated on the due
 * date, skipping a period already paid. The id is the bill's id and the date, so adding twice never duplicates.
 */
export function dueBillTxs(rules, today, txs, now = Date.now()) {
  const out = [];
  for (const r of rules) {
    if (!r.auto) continue;
    for (const d of billDates(r, today)) {
      if ((r.last && d <= r.last) || billPaid(r, d, txs) || billPaid(r, d, out)) continue;
      out.push({ id: `rec-${r.id}-${d}`, date: d, type: 'expense', amount: r.amount, accountId: r.accountId, category: r.category || 'bills', merchant: r.name, note: '', source: 'recurring', bill: r.id, createdAt: now });
    }
  }
  return out;
}

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

// ---- analytics for Insights -----------------------------------------------------------------------------------------------
// Candidate expenses only. Eligibility, sublimits and year-specific rules require the taxpayer to check LHDN.
// The category examples below are informed by LHDN's published YA 2025 relief list.
/**
 * ESTIMATE, CHECK LHDN RULES: which spending may count toward which relief, from receipt item words (the shop's name too
 * when `shop`: a dental clinic's or kindergarten's whole bill counts), within `cats` when given. First match wins.
 * `no`: words that rule a line out (a phone case isn't a phone). A flu visit to a GP isn't medical relief, so plain
 * "klinik" is not in the list.
 */
export const RELIEFS = [
  { id: 'breastfeeding', name: 'Breastfeeding equipment', re: /breast ?pump|pam susu|breastfeed|penyusuan|nursing (bra|pad)|milk storage|吸奶器|母乳/i },
  { id: 'childcare', name: 'Childcare and kindergarten fees', shop: true, re: /tadika|taska|kindergarten|pre-?school|prasekolah|child ?care|day ?care|nursery fee|幼儿园|幼兒園|托儿|托兒/i },
  { id: 'ev', name: 'EV charging', shop: true, re: /(?=.*(?:\bev charg(?:e|er|ing)|electric vehicle charg(?:e|er|ing)|charging (?:station|equipment)|wallbox|充电桩|充電樁))(?=.*(?:install(?:ation)?|rent(?:al)?|purchas(?:e|ing)|subscription|equipment|pemasangan|sewaan|pembelian|langganan|peralatan|安装|安裝|购买|購買|租赁|租賃|订阅|訂閱))/i },
  { id: 'sports', name: 'Sports and gym', shop: true, re: /\bgym\b|fitness|badminton|futsal|racket|raket|shuttlecock|jersey|kasut sukan|running shoe|decathlon|marathon|yoga|pilates|swimming|renang|\bsports?\b|\bsukan\b|健身|羽毛球/i },
  { id: 'medical', name: 'Medical, dental and vaccination', shop: true, cats: ['health', 'other'], re: /dental|dentist|pergigian|\bgigi\b|scaling|vaksin|vaccin|medical check|health screening|pemeriksaan kesihatan|fertility|\bivf\b|physio|mental health|psychiatr|psycholog|hospital|牙医|牙醫|牙科|疫苗|医院|醫院|体检|體檢/i },
  { id: 'education', name: 'Education fees (yourself)', shop: true, cats: ['education', 'other', 'bills'], re: /yuran pengajian|tuition fee|course fee|semester fee|university|universiti|\bcollege\b|\bkolej\b|\bdegree\b|\bmba\b|\bphd\b|upskill|\bkursus\b|学费|學費/i },
  { id: 'lifestyle', name: 'Books, phone, computer and internet', re: /\bbooks?\b|\bbuku\b|\bnovel\b|magazine|majalah|newspaper|akhbar|smartphone|\b(hand)?phone\b|telefon bimbit|iphone|galaxy|redmi|tablet|\bipad\b|laptop|computer|komputer|macbook|internet|unifi|broadband|fibre|书|書|杂志|雜誌|手机|手機|电脑|電腦|平板/i, no: /reload|prepaid|top ?up|\bcase\b|casing|cover|protector|charger|cable|kabel|buku latihan|exercise book/i },
];
/** The relief a line of spending may count toward, or null. `item`: the item's words; `shop`: the shop and note. */
export function reliefOf(item, shop, category) {
  for (const r of RELIEFS) {
    if (r.cats && !r.cats.includes(category)) continue;
    const text = ` ${unplace(item)} ${r.shop ? unplace(shop) : ''} `;
    if (r.re.test(text) && !(r.no && r.no.test(text))) return r.id;
  }
  return null;
}
/**
 * Recorded candidate spending by calendar year: [{id, name, total, entries:
 * [{id, date, merchant, cents, proof (has a receipt photo)}], proof (entries with one)}] in RELIEFS order.
 */
export function taxRelief(txs, year) {
  const lines = Object.fromEntries(RELIEFS.map(r => [r.id, { id: r.id, name: r.name, total: 0, entries: [] }]));
  for (const t of txs) {
    if (t.type !== 'expense' || t.date.slice(0, 4) !== String(year)) continue;
    const parts = itemAmounts(t), shop = `${t.merchant || ''} ${t.note || ''}`;
    for (const it of parts) {
      // A payment without items is judged by its shop and note alone.
      const id = reliefOf(parts.length === 1 && !it.name ? shop : it.name, shop, it.category);
      if (!id) continue;
      const L = lines[id], e = L.entries.find(x => x.id === t.id);
      if (e) e.cents += it.cents; else L.entries.push({ id: t.id, date: t.date, merchant: t.merchant || it.name, cents: it.cents, proof: !!t.receiptId });
      L.total += it.cents;
    }
  }
  return RELIEFS.map(r => { const L = lines[r.id]; return { ...L, proof: L.entries.filter(e => e.proof).length }; });
}

/** Item names that are really codes or run-together OCR text are left out of item lists. */
export const plainItem = name => !!itemKey(name) && !/\d{5,}/.test(name) && !/[A-Za-z]{16,}/.test(name);
/** Price history of items on `min`+ receipts: [{key, name, points: [{date, unit}]}], most bought first. */
export function priceHistory(txs, min = 3) {
  const by = {};
  for (const t of txs.filter(x => x.type === 'expense' && x.items?.length).sort((a, b) => byDate(a.date, b.date))) {
    const seen = new Set();   // the same item twice on one receipt is one purchase
    for (const it of t.items) {
      const k = itemKey(it.name), unit = it.unit ?? it.cents;
      if (!plainItem(it.name) || !(unit > 0) || seen.has(k)) continue;
      seen.add(k);
      (by[k] ||= { key: k, name: it.name, points: [] }).points.push({ date: t.date, unit });
    }
  }
  return Object.values(by).filter(h => h.points.length >= min).sort((a, b) => b.points.length - a.points.length || byDate(b.points.at(-1).date, a.points.at(-1).date));
}
/**
 * Your basket: the items you keep buying (priceHistory), each at its latest price (bought in the last 90 days) against
 * its price about `months` ago (else its first price, if that is 60+ days old), weighted by how often you buy it.
 * → {pct (0.042 = 4.2% dearer), n items, since (oldest base date), now, then} or null.
 */
export function basketIndex(hist, today, months = 6) {
  const target = addDays(today, -Math.round(months * 30.44)), old = addDays(today, -60), recent = addDays(today, -90);
  let now = 0, then = 0, n = 0, since = today;
  for (const h of hist) {
    const last = h.points.at(-1), base = h.points.filter(p => p.date <= target).at(-1) || (h.points[0].date <= old ? h.points[0] : null);
    if (!base || last.date <= base.date || last.date < recent) continue;
    const w = h.points.length;
    now += w * last.unit; then += w * base.unit; n++;
    if (base.date < since) since = base.date;
  }
  return n ? { pct: (now - then) / then, n, since, now, then } : null;
}

/** Monthly cost of a bill: weekly × 52 / 12, yearly / 12. */
export const perMonth = r => Math.round(r.freq === 'weekly' ? r.amount * 52 / 12 : r.freq === 'yearly' ? r.amount / 12 : r.amount);
/**
 * Month-end forecast for the budget month holding `today`: spent so far + bills still due before it ends + everyday
 * spending at its daily pace for the days left. A one-off big payment (RM 500+, or a quarter of the budget) counts
 * once, not every day. Fewer than 7 days in, the pace is last month's. safe: the budget left per day, today included.
 */
export function forecast({ txs, today, startDay = 1, budget = 0, bills = [] }) {
  const c = cycleOf(today, startDay), day = daysBetween(c.start, today) + 1, len = daysBetween(c.start, c.end) + 1, left = len - day;
  const sp = monthSpend(txs, c.key, startDay);
  const billKeys = new Set(bills.map(r => r.key || shopWord(r.name)).filter(Boolean));
  const flex = ym => txs.filter(t => t.type === 'expense' && cycleKey(t.date, startDay) === ym && !isBill(t)
    && !billKeys.has(shopWord(t.merchant)) && t.amount < Math.max(500_00, budget * 0.25)).reduce((sum, t) => sum + t.amount, 0);
  let rate = flex(c.key) / day, early = false;
  if (day < 7) {
    const pk = addMonths(c.key, -1), prev = monthSpend(txs, pk, startDay), pc = cycleSpan(pk, startDay);
    if (prev.total) { rate = flex(pk) / (daysBetween(pc.start, pc.end) + 1); early = true; }
  }
  const upcoming = bills.reduce((s, r) => s + billDates(r, c.end).filter(d => d > today && d >= c.start && !billPaid(r, d, txs)).length * r.amount, 0);
  const projected = sp.total + upcoming + Math.round(rate * left);
  return { spent: sp.total, upcoming, rate: Math.round(rate), projected, daysLeft: left, end: c.end, early,
    safe: budget ? Math.max(0, Math.floor((budget - sp.total - upcoming) / (left + 1))) : null };
}
/** A month's spending split into regular payments (bills, and shops that are known or detected bills) and day-to-day spending. */
export function fixedFlexible(txs, ym, sd = 1, billShops = []) {
  const keys = new Set(billShops);
  let fixed = 0, flexible = 0;
  for (const t of txs) {
    if (t.type !== 'expense' || cycleKey(t.date, sd) !== ym) continue;
    if (isBill(t) || (t.merchant && keys.has(shopWord(t.merchant)))) fixed += t.amount; else flexible += t.amount;
  }
  return { fixed, flexible };
}

/**
 * Spending per day of a month (or cycle): [{date, v, level}], every day listed. level 0 nothing, else 1–4 by the
 * day's rank among the days with spending (quarters), so one rent day doesn't wash out the rest.
 */
export function dailySpend(txs, ym, sd = 1) {
  const c = cycleSpan(ym, sd), by = {};
  for (const t of txs) if (t.type === 'expense' && t.date >= c.start && t.date <= c.end) by[t.date] = (by[t.date] || 0) + t.amount;
  const days = [];
  for (let d = c.start; d <= c.end; d = addDays(d, 1)) days.push({ date: d, v: by[d] || 0 });
  const sorted = days.map(x => x.v).filter(Boolean).sort((a, b) => a - b);
  return days.map(x => ({ ...x, level: x.v ? Math.ceil((sorted.lastIndexOf(x.v) + 1) / sorted.length * 4) : 0 }));
}
/** Time of day: 0 morning 05–11, 1 afternoon 11–17, 2 evening 17–22, 3 late night 22–05. */
export const slotOf = m => (m >= 300 && m < 660 ? 0 : m >= 660 && m < 1020 ? 1 : m >= 1020 && m < 1320 ? 2 : 3);
export const DELIVERY = /grab ?food|food ?panda|shopee ?food|deliveroo|airasia food|mcdelivery|beep delivery/i;
/**
 * Everyday spending with a time between two dates by weekday (0 Sunday) and time of day: grid[7][4] in sen. After
 * midnight counts for the night before (Friday late night includes Saturday 01:00). top: the biggest cell with its
 * main category; late: food delivery ordered late at night {v, n}.
 */
export function whenGrid(txs, from, to) {
  const grid = Array.from({ length: 7 }, () => [0, 0, 0, 0]), cats = {}, late = { v: 0, n: 0 };
  for (const t of txs) {
    const m = mins(t.time);
    if (t.type !== 'expense' || isBill(t) || m == null || t.date < from || t.date > to) continue;
    const w = new Date(`${m < 300 ? addDays(t.date, -1) : t.date}T00:00:00Z`).getUTCDay(), s = slotOf(m), k = `${w}|${s}`;
    grid[w][s] += t.amount;
    for (const b of breakdown(t)) (cats[k] ||= {})[b.category] = (cats[k][b.category] || 0) + b.cents;
    if (s === 3 && DELIVERY.test(`${t.merchant || ''} ${t.note || ''}`)) { late.v += t.amount; late.n++; }
  }
  let top = null;
  grid.forEach((row, w) => row.forEach((v, s) => { if (v && (!top || v > top.v)) top = { w, s, v }; }));
  if (top) top.category = Object.entries(cats[`${top.w}|${top.s}`]).sort((a, b) => b[1] - a[1])[0][0];
  return { grid, top, late };
}
/** Shops in a month by money and by visits (top 5 each): [{name, v, n}]. Names group as bills do (first two words). */
export function topShops(txs, ym, sd = 1) {
  const by = {};
  for (const t of txs) {
    if (t.type !== 'expense' || !t.merchant || cycleKey(t.date, sd) !== ym) continue;
    const k = shopWord(t.merchant) || itemKey(t.merchant);
    if (!k) continue;
    (by[k] ||= { name: t.merchant, v: 0, n: 0 }); by[k].v += t.amount; by[k].n++;
  }
  const all = Object.values(by);
  return { money: [...all].sort((a, b) => b.v - a.v).slice(0, 5), visits: [...all].sort((a, b) => b.n - a.n || b.v - a.v).slice(0, 5) };
}

/** A month's spending by the kind of account it came from: {cash, bank, ewallet, card, savings} in sen. */
export function paymentMix(txs, accounts, ym, sd = 1) {
  const kind = Object.fromEntries(accounts.map(a => [a.id, a.kind || 'bank'])), by = {};
  for (const t of txs) if (t.type === 'expense' && cycleKey(t.date, sd) === ym && kind[t.accountId]) by[kind[t.accountId]] = (by[kind[t.accountId]] || 0) + t.amount;
  return by;
}
/** Share of money in that was kept: (in − out) / in. null for a month with no money in. */
export const savingsRate = (income, expense) => (income > 0 ? (income - expense) / income : null);

/** Food in a month: groceries (cooking), dining out, and delivery (GrabFood, foodpanda, ShopeeFood: all but its groceries). */
export function foodSplit(txs, ym, sd = 1) {
  const out = { groceries: 0, dining: 0, delivery: 0 };
  for (const t of txs) {
    if (t.type !== 'expense' || cycleKey(t.date, sd) !== ym) continue;
    const del = DELIVERY.test(`${t.merchant || ''} ${t.note || ''}`);
    for (const b of breakdown(t)) {
      if (b.category === 'groceries') out.groceries += b.cents;
      else if (del) out.delivery += b.cents;
      else if (b.category === 'dining') out.dining += b.cents;
    }
  }
  return out;
}
/** SST and service charge paid in a calendar year, from receipts' tax and service lines; n: receipts with either. */
export function taxPaid(txs, year) {
  const out = { sst: 0, service: 0, n: 0 };
  for (const t of txs) {
    if (t.type !== 'expense' || t.date.slice(0, 4) !== String(year) || !(t.tax > 0 || t.service > 0)) continue;
    out.sst += Math.max(0, t.tax || 0); out.service += Math.max(0, t.service || 0); out.n++;
  }
  return out;
}
/**
 * Money put into joint accounts in a month (income into one, or a transfer from outside them), by who: rows marked
 * `spouse` came from the spouse's phone (named by `by`), the rest are yours. → [{me, name, v}], most first.
 */
export function jointIn(txs, jointIds, ym, sd = 1) {
  const by = {};
  for (const t of txs) {
    if (cycleKey(t.date, sd) !== ym) continue;
    const into = t.type === 'income' ? jointIds.has(t.accountId) : t.type === 'transfer' && jointIds.has(t.toAccountId) && !jointIds.has(t.accountId);
    if (!into) continue;
    const k = t.spouse ? `s:${t.by || ''}` : 'me';
    (by[k] ||= { me: !t.spouse, name: t.spouse ? t.by || '' : '', v: 0 }).v += t.amount;
  }
  return Object.values(by).sort((a, b) => b.v - a.v);
}
