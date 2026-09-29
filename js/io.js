// Files in and out: CSV / Excel / Google Sheets import from other money apps and bank statements, CSV export,
// JSON backup. Everything read from a file is untrusted: sizes, dates and amounts are checked.
import { parseAmount, validIso, CATEGORIES, INCOME_CATEGORIES, categorize } from './engine.js';

export const LIMITS = { fileBytes: 25 * 1024 * 1024, backupBytes: 200 * 1024 * 1024, rows: 50_000, text: 200 };

// ---- CSV (adapted from we go gim's io.js) ------------------------------------------------
export function csvDelimiter(text) {
  const first = String(text).split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, '');
  const n = c => first.split(c).length - 1;
  return [';', '\t'].reduce((best, c) => (n(c) > n(best) ? c : best), ',');
}
export function parseCSV(text, delim = csvDelimiter(text)) {
  // Full-width digits and punctuation (Chinese/Japanese keyboards) read as normal ones; runaway cells are cut.
  text = String(text).normalize('NFKC');
  const rows = [];
  let row = [], cell = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else if (cell.length < 2000) cell += c;
    if (rows.length > LIMITS.rows) break;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
/** Bytes → text: UTF-8 (with or without BOM), UTF-16, else Windows-1252. ponytail: no GBK/Big5 detection yet. */
export function decodeBytes(u8) {
  const b = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder('utf-8').decode(b.subarray(3));
  const utf8 = new TextDecoder('utf-8').decode(b);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(b) : utf8;
}
/** Hidden characters out, length capped: names from files can't break the layout or hide text. */
export const cleanText = (s, max = LIMITS.text) => String(s ?? '').slice(0, max * 4).normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

// ---- Excel (.xlsx) without a library: a zip of XML files, inflated with the built-in DecompressionStream ----
const MAX_INFLATE = 60 * 1024 * 1024; // a zip entry may not expand past this (zip bombs)
async function inflateRaw(bytes) {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const parts = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > MAX_INFLATE) { await reader.cancel(); throw new Error('too big'); }
    parts.push(value);
  }
  const out = new Uint8Array(n);
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}
/** Zip → {path: Uint8Array} for the paths wanted (stored or deflated entries). Bytes before the zip are
 * allowed (Money Manager backups start with 8 of them): offsets are taken from the first local header. */
export async function unzip(buf, want) {
  const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let base = 0;
  while (base < Math.min(64, b.length - 4) && dv.getUint32(base, true) !== 0x04034b50) base++;
  if (dv.getUint32(base, true) !== 0x04034b50) base = 0;
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('bad zip');
  const count = dv.getUint16(eocd + 10, true);
  let p = base + dv.getUint32(eocd + 16, true);
  const out = {};
  for (let n = 0; n < count && p + 46 <= b.length; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('bad zip');
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const local = base + dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nameLen));
    if (want(name)) {
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      const data = b.subarray(start, start + size);
      out[name] = method === 0 ? data : method === 8 ? await inflateRaw(data) : null;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
const unxml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const colIndex = ref => [...ref.replace(/\d+/g, '')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
/** First worksheet of an .xlsx as rows of strings. Dates stay as Excel serial numbers (fileDate reads those). */
export async function xlsxToRows(buf) {
  let files = await unzip(buf, n => n === 'xl/sharedStrings.xml' || n === 'xl/worksheets/sheet1.xml');
  if (!files['xl/worksheets/sheet1.xml']) files = await unzip(buf, n => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  const sheetName = Object.keys(files).filter(n => n.startsWith('xl/worksheets/')).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)))[0];
  if (!sheetName || !files[sheetName]) throw new Error('no sheet');
  const dec = x => new TextDecoder().decode(x);
  const shared = files['xl/sharedStrings.xml'] ? [...dec(files['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => unxml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join(''))) : [];
  const rows = [];
  for (const rm of dec(files[sheetName]).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    if (rows.length >= LIMITS.rows) break;
    const row = [];
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1], body = cm[2] || '';
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      const type = attrs.match(/\bt="(\w+)"/)?.[1];
      let v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
      if (type === 's') v = shared[+v] ?? '';
      else if (type === 'inlineStr') v = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('');
      v = unxml(v);
      const col = ref ? colIndex(ref) : row.length;
      if (col < 200) row[col] = v; // a crafted "ZZZZ1" would make a huge sparse row
    }
    rows.push(Array.from(row, x => x ?? ''));
  }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}

// ---- Google Sheets ---------------------------------------------------------------------------------
/** A Google Sheets link → its CSV export URL (the sheet must be shared "Anyone with the link"), or null. */
export function sheetCsvUrl(link) {
  const s = String(link ?? '').trim();
  const m = s.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]{20,})/);
  if (!m) return null;
  const gid = s.match(/[#&?]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
}

/** Any supported file → rows. Routed by content (zip magic bytes), not by name. */
export async function fileToRows(name, buf) {
  const b = new Uint8Array(buf);
  if (b.length > LIMITS.fileBytes) throw new Error('This file is over 25 MB. Split it or export a shorter date range.');
  if (b[0] === 0x50 && b[1] === 0x4b) {
    try { return await xlsxToRows(buf); } catch { throw new Error('This Excel file could not be read. Save it as .xlsx or CSV and try again.'); }
  }
  if (b[0] === 0xd0 && b[1] === 0xcf) throw new Error('Old Excel files (.xls) are not supported. Open it and save as .xlsx or CSV.');
  return parseCSV(decodeBytes(b));
}

// ---- guessing columns ---------------------------------------------------------------------
const HEAD = {
  date: /^(date|tarikh|日期|transaction date|trans(action)? ?date|posting date|time|masa|日期时间)$|date|tarikh|日期/i,
  amount: /^(amount|jumlah|amaun|金额|金額|value|nilai|sum)$|amount|jumlah|金额|金額/i,
  debit: /debit|withdraw|pengeluaran|keluar|支出|money out|out$/i,
  credit: /credit|deposit|kredit|masuk|收入|money in|in$/i,
  type: /^(type|jenis|类型|類型|income\/expense|in\/out|category type|收支)$/i,
  category: /categor|kategori|类别|類別|分类|分類/i,
  note: /note|nota|memo|description|keterangan|butiran|备注|備註|details|remark/i,
  merchant: /merchant|payee|peniaga|商家|shop|kedai|recipient|penerima/i,
  account: /^(account|akaun|账户|帳戶|wallet|dompet)$/i,
};
/** Which column holds what: {date, amount | debit+credit, type?, category?, note?, merchant?, account?} as indexes. */
export function guessMapping(header) {
  const h = header.map(x => cleanText(x));
  const m = {}; const used = [];
  for (const k of ['date', 'debit', 'credit', 'type', 'category', 'merchant', 'note', 'account', 'amount']) {
    const i = h.findIndex((x, j) => HEAD[k].test(x) && !used.includes(j));
    if (i >= 0) { m[k] = i; used.push(i); }
  }
  if (m.amount != null && (m.debit == null) !== (m.credit == null)) { delete m.debit; delete m.credit; } // one-sided: use amount
  return m;
}

// ---- dates in files -----------------------------------------------------------------------------
const MON_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MON_MS = ['jan', 'feb', 'mac', 'apr', 'mei', 'jun', 'jul', 'ogo', 'sep', 'okt', 'nov', 'dis'];
/** "28/09/2026", "28-09-26", "2026-09-28", "2026/9/28", "28 Sep 2026", "2026年9月28日", Excel serial → ISO, or null. Day first. */
export function fileDate(v) {
  const s = cleanText(v, 40);
  if (/^\d{5}(\.\d+)?$/.test(s) && +s > 20000 && +s < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 864e5).toISOString().slice(0, 10);
  let m, y, mo, d;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) [d, mo, y] = [+m[1], +m[2], +m[3]];
  else if ((m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -,]*(\d{2,4})/))) {
    const k = m[2].toLowerCase(), i = MON_EN.indexOf(k) >= 0 ? MON_EN.indexOf(k) : MON_MS.indexOf(k);
    [d, mo, y] = [+m[1], i + 1, +m[3]];
  } else if ((m = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/))) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else return null;
  if (y < 100) y += 2000;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return mo >= 1 && validIso(iso) && y >= 2000 && y <= 2100 ? iso : null;
}

// ---- rows → transactions ---------------------------------------------------------------------------
const ALL_CATS = [...CATEGORIES, ...INCOME_CATEGORIES];
/** Bank and wallet descriptions without their channel prefix: "CARD PURCHASE TESCO" → "TESCO". */
export const cleanDesc = s => cleanText(s, 120).replace(/^(card purchase|sale debit|pos purchase|debit card|mydebit|duitnow( qr| to| transfer)?|fpx( payment)?|jompay|ibg( credit| debit)?|instant transfer|fund transfer( to| from)?|trf( to| from)?|payment( to| via)?|online banking|pembayaran|pindahan)\b[\s:-]*/i, '').trim() || cleanText(s, 120);
const INCOME_WORD = /income|pendapatan|masuk|收入|credit|kredit|deposit|salary|gaji|paycheck|payroll|wage|薪/i;
const TRANSFER_WORD = /transfer|pindahan|转账|轉帳|top ?up|reload/i;
/** Another app's category name → ours: exact id/name, then words. catMap (from the mapping step) wins. */
export function mapCategory(name, catMap = {}, merchant = '') {
  const n = cleanText(name, 60);
  if (Object.hasOwn(catMap, n)) return catMap[n];
  const hit = ALL_CATS.find(c => c.id === n.toLowerCase() || c.name.toLowerCase() === n.toLowerCase());
  if (hit) return hit.id;
  if (/salary|gaji|paycheck|payroll|wage|工资|薪/i.test(n)) return 'salary';
  if (/food|drink|makan|餐|meal|restaurant/i.test(n)) return 'dining';
  if (/transport|car|kereta|fuel|交通/i.test(n)) return 'transport';
  if (/bill|util|bil |bil$|账单|帳單/i.test(n)) return 'bills';
  if (/shop|belanja|购物|購物|cloth|pakaian/i.test(n)) return 'shopping';
  return categorize(n, merchant);
}
/** Excel stores computed cells as long doubles ("12.720000000000001"): round those to sen, read the rest as typed. */
export const fileAmount = v => { const s = cleanText(v, 40); return /^-?\d+\.\d{3,}$/.test(s) ? Math.round(parseFloat(s) * 100) : parseAmount(s); };
/** Short stable hash (FNV-1a) → base36. */
export const hash = str => { let h = 0x811c9dc5; for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
/**
 * Stable id per imported row from its date, amount, text and how many identical rows came before it in the file:
 * importing the same file twice adds nothing, and two identical purchases on one day both stay.
 */
export function importIds(txs, prefix) {
  const seen = new Map();
  for (const t of txs) {
    const key = `${t.date}|${t.type}|${t.amount}|${t.merchant || ''}|${t.accountId}`;
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    t.id = `${prefix}_${hash(key)}_${n}`;
  }
  return txs;
}
/**
 * Rows (after the header) → {txs, skipped: [{row, why}]}. Amounts: a signed amount, or debit/credit columns.
 * A type column (income/expense) wins over the sign. With no type column: if any amount is negative the file is
 * signed (negative = spent, positive = received); if none is, every amount is spending (most money apps).
 */
export function rowsToTx(rows, map, { accountId, catMap = {}, source = 'import', idPrefix = 'i', now = Date.now() } = {}) {
  const txs = [], skipped = [];
  const signed = map.amount != null && rows.some(r => (fileAmount(r[map.amount]) ?? 0) < 0);
  rows.slice(0, LIMITS.rows).forEach((r, n) => {
    const get = k => (map[k] != null ? r[map[k]] ?? '' : '');
    const date = fileDate(get('date'));
    if (!date) return skipped.push({ row: n + 2, why: 'date' });
    let amt = null, type = null;
    if (map.debit != null || map.credit != null) {
      const d = fileAmount(get('debit')), c = fileAmount(get('credit'));
      if (d) { amt = Math.abs(d); type = 'expense'; } else if (c) { amt = Math.abs(c); type = 'income'; }
    } else {
      const a = fileAmount(get('amount'));
      if (a != null) { amt = Math.abs(a); type = a < 0 ? 'expense' : signed ? 'income' : null; }
    }
    if (!amt) return skipped.push({ row: n + 2, why: 'amount' });
    const tword = cleanText(get('type'), 40);
    if (tword) type = TRANSFER_WORD.test(tword) ? 'expense' : INCOME_WORD.test(tword) ? 'income' : 'expense';
    type ||= 'expense'; // ponytail: transfers from other apps come in as expenses to review; their other side is unknown
    const merchant = cleanDesc(map.merchant != null ? get('merchant') : get('note')).slice(0, 80);
    const rawCat = get('category');
    let category = rawCat ? mapCategory(rawCat, catMap, merchant) : categorize(merchant, merchant);
    // No type column and unsigned amounts: a row the user mapped to Salary / Other income is money in, not spending.
    if (!tword && !signed && map.debit == null && map.credit == null && INCOME_CATEGORIES.some(c => c.id === category)) type = 'income';
    if (type === 'income' && !INCOME_CATEGORIES.some(c => c.id === category)) category = /salary|gaji|工资|薪/i.test(rawCat + ' ' + merchant) ? 'salary' : 'income';
    if (type === 'expense' && INCOME_CATEGORIES.some(c => c.id === category)) category = 'other';
    txs.push({ id: '', date, type, amount: amt, accountId, category, merchant, note: map.merchant != null ? cleanText(get('note'), 200) : '', source, createdAt: now });
  });
  return { txs: importIds(txs, idPrefix), skipped };
}

// ---- export ------------------------------------------------------------------------------------------
const q = v => (/[",\n\r;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
/** Spreadsheets run cells starting with = + - @; a leading quote makes them plain text. */
export const safeText = v => (/^[=+\-@\t\r]/.test(String(v ?? '')) ? `'${v}` : String(v ?? ''));
export function toCSV(txs, accounts, catName = id => ALL_CATS.find(c => c.id === id)?.name || id || '') {
  const acc = Object.fromEntries(accounts.map(a => [a.id, a.name]));
  const rows = [['Date', 'Type', 'Amount', 'Account', 'To account', 'Category', 'Merchant', 'Item', 'Note'].join(',')];
  for (const t of [...txs].sort((a, b) => a.date.localeCompare(b.date))) {
    const head = [t.date, t.type], acct = [safeText(acc[t.accountId] || ''), safeText(acc[t.toAccountId] || '')];
    if (t.items?.length) for (const it of t.items) rows.push([...head, (it.cents / 100).toFixed(2), ...acct, safeText(catName(it.category)), safeText(t.merchant || ''), safeText(it.name || ''), safeText(t.note || '')].map(q).join(','));
    else rows.push([...head, (t.amount / 100).toFixed(2), ...acct, safeText(catName(t.category)), safeText(t.merchant || ''), '', safeText(t.note || '')].map(q).join(','));
  }
  return '﻿' + rows.join('\n'); // BOM: Excel opens Malay and Chinese text as UTF-8
}

// ---- backup ------------------------------------------------------------------------------------------
export const BACKUP_APP = 'tally';
export const makeBackup = ({ accounts, tx, recurring, kv }) => JSON.stringify({ app: BACKUP_APP, v: 1, exportedAt: new Date().toISOString(), accounts, tx, recurring, kv });
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const okAmt = n => Number.isInteger(n) && n >= 0 && n <= 100_000_000_00;
const okSigned = n => Number.isInteger(n) && Math.abs(n) <= 100_000_000_00;
const okId = id => typeof id === 'string' && /^[\w-]{1,60}$/.test(id); // ids end up in calendar files and file names
/** Backup text → cleaned {accounts, tx, recurring, kv, dropped}, or throws a message the user can act on. */
export function readBackup(text) {
  let d;
  try { d = JSON.parse(text); } catch { throw new Error('This file is not a Tally backup (it is not valid JSON).'); }
  if (!isObj(d) || d.app !== BACKUP_APP) throw new Error('This file is not a Tally backup.');
  if (d.v > 1) throw new Error('This backup is from a newer version of Tally. Update the app, then restore.');
  const customIds = new Set((Array.isArray(d.kv?.customCats) ? d.kv.customCats : []).map(c => c?.id));
  const cat = c => (ALL_CATS.some(x => x.id === c) || customIds.has(c) ? c : 'other');
  const accounts = (Array.isArray(d.accounts) ? d.accounts : []).filter(a => isObj(a) && okId(a.id))
    .map(a => ({ id: a.id, name: cleanText(a.name, 60) || 'Account', kind: ['cash', 'bank', 'ewallet', 'card', 'savings'].includes(a.kind) ? a.kind : 'cash', opening: okSigned(a.opening) ? a.opening : 0, createdAt: +a.createdAt || 0 }));
  const ids = new Set(accounts.map(a => a.id));
  const tx = (Array.isArray(d.tx) ? d.tx : []).filter(t => isObj(t) && okId(t.id) && validIso(t.date) && okAmt(t.amount) && t.amount > 0 && ['expense', 'income', 'transfer'].includes(t.type) && ids.has(t.accountId) && (t.type !== 'transfer' || (ids.has(t.toAccountId) && t.toAccountId !== t.accountId)))
    .map(t => ({
      id: t.id, date: t.date, ...(/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time) ? { time: t.time } : {}), type: t.type, amount: t.amount, accountId: t.accountId, ...(t.type === 'transfer' ? { toAccountId: t.toAccountId } : {}),
      category: cat(t.category), merchant: cleanText(t.merchant, 80), note: cleanText(t.note, 200), source: ['quick', 'receipt', 'import', 'statement'].includes(t.source) ? t.source : 'import', createdAt: +t.createdAt || 0,
      ...(Array.isArray(t.items) ? { items: t.items.filter(i => isObj(i) && okSigned(i.cents)).slice(0, 500).map(i => ({ name: cleanText(i.name, 80), raw: cleanText(i.raw, 80), cents: i.cents, category: cat(i.category) })) } : {}),
      ...['tax', 'service', 'rounding'].reduce((o, k) => (okSigned(t[k]) ? { ...o, [k]: t[k] } : o), {}),
      ...(okId(t.receiptId) ? { receiptId: t.receiptId } : {}),
    }));
  const recurring = (Array.isArray(d.recurring) ? d.recurring : []).filter(r => isObj(r) && okId(r.id) && okAmt(r.amount))
    .map(r => ({ id: r.id, name: cleanText(r.name, 60) || 'Bill', amount: r.amount, category: cat(r.category), accountId: ids.has(r.accountId) ? r.accountId : accounts[0]?.id, day: Math.min(28, Math.max(1, +r.day || 1)), key: cleanText(r.key, 60) }));
  const kv = {};
  if (isObj(d.kv)) {
    if (isObj(d.kv.budgets)) kv.budgets = { total: okAmt(d.kv.budgets.total) ? d.kv.budgets.total : 0, byCat: Object.fromEntries(Object.entries(isObj(d.kv.budgets.byCat) ? d.kv.budgets.byCat : {}).filter(([k, v]) => cat(k) === k && okAmt(v))) };
    if (isObj(d.kv.rules)) kv.rules = Object.fromEntries(Object.entries(d.kv.rules).slice(0, 5000).map(([k, v]) => [cleanText(k, 70), cat(v)]).filter(([k]) => k));
    if (Array.isArray(d.kv.dismissed)) kv.dismissed = d.kv.dismissed.filter(x => typeof x === 'string' && x.length <= 120).slice(-300);
    if (Array.isArray(d.kv.customCats)) kv.customCats = d.kv.customCats.filter(c => isObj(c) && /^c_[\w-]{1,40}$/.test(c.id)).map(c => ({ id: c.id, name: cleanText(c.name, 40) || 'Custom', color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#64748B' })).slice(0, 50);
  }
  return { accounts, tx, recurring, kv, dropped: (Array.isArray(d.tx) ? d.tx.length : 0) - tx.length };
}
/** Merge restore: keep everything local, add what the backup has that we don't (by id). Local settings win. */
export function mergeBackup(local, incoming) {
  const merge = (a, b) => { const ids = new Set(a.map(x => x.id)); return [...a, ...b.filter(x => !ids.has(x.id))]; };
  return {
    accounts: merge(local.accounts, incoming.accounts),
    tx: merge(local.tx, incoming.tx),
    recurring: merge(local.recurring, incoming.recurring),
    kv: {
      rules: { ...(incoming.kv.rules || {}), ...(local.kv.rules || {}) },
      customCats: merge(local.kv.customCats || [], incoming.kv.customCats || []),
      budgets: local.kv.budgets?.total || Object.keys(local.kv.budgets?.byCat || {}).length ? local.kv.budgets : incoming.kv.budgets || local.kv.budgets,
      dismissed: [...new Set([...(local.kv.dismissed || []), ...(incoming.kv.dismissed || [])])].slice(-300),
    },
  };
}

// ---- browser-only helpers ---------------------------------------------------------------------------
export function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export async function shareFile(name, text, type = 'application/json') {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }
  return false;
}
