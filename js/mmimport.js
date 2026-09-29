// Import from "Money manager & expenses" (Innim) backups (.mmbackup): a zip holding MyFinance.db (SQLite) and
// photos/. SQLite is read with sql.js (vendored, loaded only here). Accounts keep their current balances.
import { unzip, cleanText, mapCategory, hash, okId, okSigned } from './io.js';
import { INCOME_CATEGORIES, validIso, MAX_SEN } from './engine.js';

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

/** Photo bytes for some of the imported transactions (read from the same backup, only when the user asks). */
export const readPhotos = (buf, paths) => { const want = new Set(paths); return unzip(buf, n => want.has(n)); };
