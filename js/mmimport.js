// Import from "Money manager & expenses" (Innim) backups (.mmbackup): a zip holding MyFinance.db (SQLite) and
// photos/. SQLite is read with sql.js (vendored, loaded only here). Accounts keep their current balances.
// Also Money Manager by Realbyte backups (.mmbak), below.
import { unzip, cleanText, mapCategory, hash, okId, okSigned } from './io.js';
import { INCOME_CATEGORIES, validIso, MAX_SEN } from './engine.js';
import { guessKind } from './statement.js';

/** Load sql.js in the browser (UMD script → window.initSqlJs). Node tests pass their own SQL instead. */
export async function loadSqlJs() {
  if (!globalThis.initSqlJs) await new Promise((res, rej) => {
    const s = Object.assign(document.createElement('script'), { src: new URL('../vendor/sql-wasm.js', import.meta.url).href, onload: res, onerror: () => rej(new Error('sql.js failed to load')) });
    document.head.appendChild(s);
  });
  return globalThis.initSqlJs({ locateFile: f => new URL(`../vendor/${f}`, import.meta.url).href });
}

const hex = argb => `#${(Number(argb) & 0xffffff).toString(16).padStart(6, '0')}`;
/** Their uid → our id, by the same rule as backups (a uid that breaks it is hashed instead). */
const mmId = u => { const id = `mm_${String(u).slice(0, 40)}`; return okId(id) ? id : `mm_h${hash(u)}`; };
const pad = n => String(n).padStart(2, '0');
/** '2023-04-20T09:30:40.418Z' → local 'HH:MM' (when the entry was logged: the habit engine learns from it). */
const localTime = iso => { const d = new Date(iso); return isNaN(d) ? undefined : `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/**
 * .mmbackup bytes → {accounts, tx, customCats, photos: [{txId, path}], skipped, otherCurrency, transfersSkipped}.
 * Their categories map onto Tally's where the name matches (Food → Dining…); the rest become custom categories
 * with the user's own names and colours. Nothing is saved here.
 */
export async function readMoneyManager(buf, SQL, { now = Date.now() } = {}) {
  const files = await unzip(buf, n => n === 'MyFinance.db');
  if (!files['MyFinance.db']) throw new Error('This file is not a Money Manager backup (MyFinance.db is missing).');
  const db = new SQL.Database(files['MyFinance.db']);
  try {
    const rows = sql => { const r = db.exec(sql)[0]; return r ? r.values.map(v => Object.fromEntries(r.columns.map((c, i) => [c, v[i]]))) : []; };
    // Only real tables are read: a crafted file can't swap one for a view, or add computed (generated) columns.
    const has = t => rows(`select name from sqlite_master where type='table' and name='${t}'`).length > 0 && rows(`select count(*) as n from pragma_table_xinfo('${t}') where hidden > 1`)[0].n === 0;
    if (!['transaction', 'account', 'account_balance', 'category', 'sync_link'].every(has)) throw new Error('This Money Manager backup is from a version Tally does not know yet.');

    // Categories: theirs → ours, or a new custom one.
    const customCats = [];
    const catMap = Object.create(null);
    for (const c of rows(`select uid, title, type, color from category where isRemoved = 0 limit 2000`)) {
      const title = cleanText(c.title, 40) || 'Category';
      let id = mapCategory(title);
      if (c.type === 'Income') id = INCOME_CATEGORIES.some(x => x.id === id) ? id : /salary|gaji|工资|薪/i.test(title) ? 'salary' : 'income';
      else if (id === 'other' && !/^other|lain|其他/i.test(title) && customCats.length < 50) {
        id = `c_mm_${hash(c.uid)}`; // stable per backup: a second backup never lands in the first one's categories
        customCats.push({ id, name: title, color: hex(c.color) });
      } else if (INCOME_CATEGORIES.some(x => x.id === id)) id = 'other';
      catMap[c.uid] = id;
    }

    // Links: transaction → account / category / photo.
    const link = new Map();
    for (const l of rows(`select entityUid, otherType, otherUid from sync_link where isRemoved = 0 and entityType = 'Transaction' limit 1000000`)) {
      if (!link.has(l.entityUid)) link.set(l.entityUid, Object.create(null));
      link.get(l.entityUid)[l.otherType] = l.otherUid;
    }
    const photoPath = new Map(has('sync_file') ? rows(`select uid, localPath from sync_file where isRemoved = 0 limit 200000`).map(f => [f.uid, `photos/${String(f.localPath || '').split(/[\\/]/).pop()}`]) : []);

    const accRows = rows(`select a.uid, a.title, a.currencyCode, a.created, b.value as balance from account a left join account_balance b on b.uid = a.uid where a.isRemoved = 0 limit 200`);
    const accIds = new Set(accRows.map(a => a.uid));
    const tx = [], photos = [];
    let skipped = 0, adjustments = 0;
    for (const t of rows(`select uid, type, amountInAccountCurrency as amt, date, comment, created from "transaction" where isRemoved = 0 limit 200000`)) {
      const l = link.get(t.uid) || {};
      const amt = Number(t.amt);
      if (!validIso(t.date) || !Number.isInteger(amt) || amt <= 0 || amt > MAX_SEN || !accIds.has(l.Account)) { skipped++; continue; }
      // Money Manager records a manual balance correction as an uncategorised entry with no note. It isn't spending:
      // leaving it out folds it into the opening balance, so today's balances still match.
      if (!l.Category && !cleanText(t.comment)) { adjustments++; continue; }
      const type = t.type === 'Income' ? 'income' : 'expense';
      let category = catMap[l.Category] || (type === 'income' ? 'income' : 'other');
      if (type === 'income' && !INCOME_CATEGORIES.some(c => c.id === category)) category = 'income';
      const id = mmId(t.uid);
      tx.push({ id, date: t.date, time: localTime(t.created), type, amount: amt, accountId: mmId(l.Account), category, merchant: cleanText(t.comment, 80), note: '', source: 'import', createdAt: Date.parse(t.created) || now });
      if (photoPath.has(l.Photo)) photos.push({ txId: id, path: photoPath.get(l.Photo) });
    }

    // Opening balance = their current balance minus everything imported, so Tally shows the same balance today.
    const accounts = accRows.map(a => {
      const id = mmId(a.uid);
      const net = tx.filter(t => t.accountId === id).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
      const bal = Number.isInteger(Number(a.balance)) && a.balance != null ? Number(a.balance) : net;
      const title = String(a.title || '');
      return { id, name: cleanText(title, 60) || 'Account', kind: /cash|tunai|现金/i.test(title) ? 'cash' : /card|kad|卡/i.test(title) ? 'card' : /wallet|tng|grab|boost/i.test(title) ? 'ewallet' : 'bank', opening: okSigned(bal - net) ? bal - net : 0, createdAt: Date.parse(a.created) || now, currency: a.currencyCode || 'MYR' };
    });
    const otherCurrency = accounts.filter(a => a.currency !== 'MYR').map(a => a.name);
    accounts.forEach(a => delete a.currency);
    return { accounts, tx, customCats, photos, skipped, adjustments, otherCurrency, transfersSkipped: has('transfer') ? rows(`select count(*) as n from transfer where isRemoved = 0`)[0].n : 0 };
  } finally { db.close(); }
}

// ---- Money Manager by Realbyte (.mmbak) --------------------------------------------------------------------------------
// A SQLite database, bare or zipped (github.com/shubham1172/moneymanager-parser: "a ZIP-wrapped SQLite database";
// github.com/ramadiaz/vaultix-by-xanny writes it bare). Android schema, as in vaultix's mmbak-export.service.ts:
// INOUTCOME(uid, assetUid, toAssetUid, ctgUid, ZCONTENT, ZDATE ms since 1970, WDATE, DO_TYPE, ZMONEY, IS_DEL…),
// ASSETS(uid, NIC_NAME, currencyUid…), ZCATEGORY(uid, NAME, TYPE 0 income / 1 expense, pUid, C_IS_DEL),
// CURRENCY(uid, ISO…). DO_TYPE: 0 income, 1 expense, 3 transfer out (toAssetUid is the other account), 4 its mirror
// in the other account (github.com/brianpunzalan/finance-manager research.md; github.com/Oppai1442/O-Wallet
// sqliteImport.worker.ts), 7 / 8 balance up / down ("Modified Bal.", github.com/skypad123/mmbak-parser types.rs).
// Realbyte keeps no balance: each account's is what its rows add up to, so 7 / 8 become its opening balance.
// ponytail: the iPhone backup (Core Data, Z-prefixed tables) is refused with a message; add it when someone has one.
const SQLITE = 'SQLite format 3\0';
const isSqlite = b => b.length > 100 && String.fromCharCode(...b.subarray(0, 16)) === SQLITE;
export async function readRealbyte(buf, SQL, { now = Date.now() } = {}) {
  let bytes = new Uint8Array(buf);
  if (!isSqlite(bytes)) {
    const z = await unzip(buf, n => !n.endsWith('/') && !/\.(jpe?g|png|gif|webp)$/i.test(n), { entries: 20 });
    bytes = Object.values(z).find(x => x && isSqlite(x));
    if (!bytes) throw new Error('This file is not a Money Manager backup (no database inside).');
  }
  const db = new SQL.Database(bytes);
  try {
    const rows = sql => { const r = db.exec(sql)[0]; return r ? r.values.map(v => Object.fromEntries(r.columns.map((c, i) => [c, v[i]]))) : []; };
    const cols = t => new Set(rows(`select name from pragma_table_xinfo('${t}') where hidden <= 1`).map(c => c.name));
    const has = t => rows(`select name from sqlite_master where type='table' and name='${t}'`).length > 0 && rows(`select count(*) as n from pragma_table_xinfo('${t}') where hidden > 1`)[0].n === 0;
    if (!['INOUTCOME', 'ASSETS'].every(has)) {
      if (has('ZINOUTCOME')) throw new Error('This is an iPhone Money Manager backup. Export to Excel in the app instead, and import that file.');
      throw new Error('This Money Manager backup is from a version Tally does not know yet.');
    }
    const live = (t, c = cols(t)) => (c.has('IS_DEL') ? 'coalesce(IS_DEL, 0) = 0' : c.has('C_IS_DEL') ? 'coalesce(C_IS_DEL, 0) = 0' : '1');
    const need = (t, list) => { const c = cols(t); return list.every(x => c.has(x)); };
    if (!need('INOUTCOME', ['uid', 'assetUid', 'DO_TYPE', 'ZMONEY', 'ZDATE']) || !need('ASSETS', ['uid', 'NIC_NAME'])) throw new Error('This Money Manager backup is from a version Tally does not know yet.');

    const customCats = [], catMap = Object.create(null);
    if (has('ZCATEGORY') && need('ZCATEGORY', ['uid', 'NAME', 'TYPE'])) {
      const all = rows(`select uid, NAME, TYPE${cols('ZCATEGORY').has('pUid') ? ', pUid' : ", '' as pUid"} from ZCATEGORY where ${live('ZCATEGORY')} limit 2000`);
      const byUid = new Map(all.map(c => [String(c.uid), c]));
      for (const c of all) {
        const title = cleanText(c.NAME, 40) || 'Category', parent = byUid.get(String(c.pUid));
        let id = mapCategory(title);
        if (id === 'other' && parent) id = mapCategory(cleanText(parent.NAME, 40));   // a subcategory: its parent says more
        if (String(c.TYPE) === '0') id = INCOME_CATEGORIES.some(x => x.id === id) ? id : /salary|gaji|工资|薪/i.test(title) ? 'salary' : 'income';
        else if (id === 'other' && !/^other|lain|其他/i.test(title) && !parent && customCats.length < 50) {
          id = `c_rb_${hash(c.uid)}`;
          customCats.push({ id, name: title, color: CAT_COLORS[customCats.length % CAT_COLORS.length] });
        } else if (INCOME_CATEGORIES.some(x => x.id === id)) id = 'other';
        catMap[String(c.uid)] = id;
      }
      // A subcategory of a custom category files under it.
      for (const c of all) if (catMap[String(c.uid)] === 'other' && byUid.get(String(c.pUid))) catMap[String(c.uid)] = catMap[String(c.pUid)] || 'other';
    }

    const ac = cols('ASSETS'), cur = has('CURRENCY') && ac.has('currencyUid') && need('CURRENCY', ['uid', 'ISO']);
    const accRows = rows(`select a.uid, a.NIC_NAME${cur ? ', c.ISO as iso' : ''} from ASSETS a${cur ? ' left join CURRENCY c on c.uid = a.currencyUid' : ''} where ${live('ASSETS', ac).replace(/(IS_DEL|C_IS_DEL)/, 'a.$1')} limit 200`);
    const accId = new Map(accRows.map(a => [String(a.uid), rbId(a.uid)]));
    const ic = cols('INOUTCOME'), opt = c => (ic.has(c) ? c : `null as ${c}`);
    const tx = [], opening = new Map();
    let skipped = 0, adjustments = 0, transfers = 0;
    for (const t of rows(`select uid, assetUid, ${opt('toAssetUid')}, ${opt('ctgUid')}, ${opt('ZCONTENT')}, ZDATE, ${opt('WDATE')}, DO_TYPE, ZMONEY from INOUTCOME where ${live('INOUTCOME', ic)} limit 200000`)) {
      const kind = String(t.DO_TYPE), amt = Math.round(Math.abs(Number(t.ZMONEY)) * 100), acc = accId.get(String(t.assetUid));
      const ms = Number(t.ZDATE), d = new Date(ms > 1e11 ? ms : ms * 1000);
      const date = !isNaN(d) && ms > 0 ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : String(t.WDATE || '').slice(0, 10);
      if (kind === '4') continue;   // the mirror half of a transfer: its DO_TYPE 3 row is the transfer
      if (!acc || !Number.isInteger(amt) || amt <= 0 || amt > MAX_SEN || !validIso(date)) { skipped++; continue; }
      if (kind === '7' || kind === '8') { opening.set(acc, (opening.get(acc) || 0) + (kind === '7' ? amt : -amt)); adjustments++; continue; }
      const base = { id: rbId(t.uid), date, ...(isNaN(d) ? {} : { time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }), amount: amt, accountId: acc, merchant: cleanText(t.ZCONTENT, 80), note: '', source: 'import', createdAt: now };
      if (kind === '3') {
        const to = accId.get(String(t.toAssetUid));
        if (!to || to === acc) { skipped++; continue; }
        tx.push({ ...base, type: 'transfer', toAccountId: to, category: 'other' }); transfers++;
      } else if (kind === '0' || kind === '1') {
        const type = kind === '0' ? 'income' : 'expense';
        tx.push({ ...base, type, category: catMap[String(t.ctgUid)] || (type === 'income' ? 'income' : 'other') });
      } else skipped++;
    }
    const accounts = accRows.map((a, n) => {
      const id = accId.get(String(a.uid)), title = String(a.NIC_NAME || ''), bal = opening.get(id) || 0;
      return { id, name: cleanText(title, 60) || 'Account', kind: guessKind(title), opening: okSigned(bal) ? bal : 0, createdAt: now + n, currency: String(a.iso || 'MYR').toUpperCase() };
    });
    const otherCurrency = accounts.filter(a => a.currency !== 'MYR').map(a => a.name);
    accounts.forEach(a => delete a.currency);
    return { accounts, tx, customCats, photos: [], skipped, adjustments, otherCurrency, transfersSkipped: 0, transfers, app: 'realbyte' };
  } finally { db.close(); }
}
const rbId = u => { const id = `rb_${String(u).slice(0, 40)}`; return okId(id) ? id : `rb_h${hash(u)}`; };
const CAT_COLORS = ['#0EA5E9', '#E11D48', '#84CC16', '#F97316', '#8B5CF6', '#14B8A6', '#EAB308', '#EC4899', '#78716C', '#22C55E'];

/** Photo bytes for some of the imported transactions (read from the same backup, only when the user asks). */
export const readPhotos = (buf, paths) => { const want = new Set(paths); return unzip(buf, n => want.has(n)); };
