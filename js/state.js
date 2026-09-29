// In-memory state over IndexedDB. Views read S; every change goes through a function here so it is saved.
import * as db from './db.js';
import { CATEGORIES, INCOME_CATEGORIES, itemKey } from './engine.js';

export const S = { accounts: [], tx: [], recurring: [], kv: {} };
const KV_KEYS = ['settings', 'budgets', 'rules', 'customCats', 'dismissed', 'lastBackup', 'reviewDraft', 'scanQueue'];

export async function load() {
  const mode = await db.init();
  [S.accounts, S.tx, S.recurring] = await Promise.all(['accounts', 'tx', 'recurring'].map(s => db.all(s)));
  for (const k of KV_KEYS) S.kv[k] = await db.getKv(k, null);
  S.kv.settings ||= {};
  S.kv.budgets ||= { total: 0, byCat: {} };
  S.kv.rules ||= {};
  S.kv.customCats ||= [];
  S.kv.dismissed ||= [];
  S.accounts.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return mode;
}
export const setKv = (k, v) => { S.kv[k] = v; return db.setKv(k, v); };
export const settings = () => S.kv.settings;
export const setSetting = (k, v) => setKv('settings', { ...S.kv.settings, [k]: v });

// ---- dates (overridable for tests and demos: ?today=2026-09-28&now=12:50) -------------------------------------
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const pad = n => String(n).padStart(2, '0');
const local = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => (/^\d{4}-\d{2}-\d{2}$/.test(params.get('today') || '') ? params.get('today') : local(new Date()));
export const nowTime = () => (/^\d{2}:\d{2}$/.test(params.get('now') || '') ? params.get('now') : `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`);
/** Transactions up to today. Rows dated later (a statement's future lines) count from their own day, everywhere. */
export const booked = () => { const d = today(); return S.tx.filter(x => x.date <= d); };
export const nowLocal = () => `${today()}T${nowTime()}`;
export const uid = p => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ---- categories ---------------------------------------------------------------------------------------------------
export const expenseCats = () => [...CATEGORIES.slice(0, -1), ...S.kv.customCats, CATEGORIES.at(-1)];
export const allCats = () => [...expenseCats(), ...INCOME_CATEGORIES];
export const cat = id => allCats().find(c => c.id === id) || CATEGORIES.at(-1);
export async function addCategory(name, color) {
  const c = { id: uid('c_'), name: String(name).slice(0, 40), color };
  await setKv('customCats', [...S.kv.customCats, c]);
  return c;
}

// ---- transactions -----------------------------------------------------------------------------------------------
/** Save a transaction. Saving the same id twice replaces it, so a double tap can never add it twice. */
export async function saveTx(tx) {
  const i = S.tx.findIndex(t => t.id === tx.id);
  if (i >= 0) S.tx[i] = tx; else S.tx.push(tx);
  await db.put('tx', tx);
  return tx;
}
export async function saveTxs(list) {
  const ids = new Set(list.map(t => t.id));
  S.tx = [...S.tx.filter(t => !ids.has(t.id)), ...list];
  await db.putMany('tx', list);
}
/** Delete, returning an undo function. */
export async function deleteTx(id) {
  const old = S.tx.find(t => t.id === id);
  if (!old) return () => {};
  S.tx = S.tx.filter(t => t.id !== id);
  await db.del('tx', id);
  return async () => { await saveTx(old); };
}
export async function deleteTxs(ids) {
  const set = new Set(ids);
  const old = S.tx.filter(t => set.has(t.id));
  S.tx = S.tx.filter(t => !set.has(t.id));
  await db.delMany('tx', ids);
  return async () => saveTxs(old);
}
/** Remember the user's category for an item (and optionally for the shop). */
export async function learn(itemName, category, merchant = null) {
  const k = itemKey(itemName);
  const rules = { ...S.kv.rules };
  if (k) rules[k] = category;
  if (merchant) rules['SHOP ' + itemKey(merchant)] = category;
  await setKv('rules', rules);
}

// ---- accounts, bills, photos ----------------------------------------------------------------------------------
export async function saveAccount(a) {
  const i = S.accounts.findIndex(x => x.id === a.id);
  if (i >= 0) S.accounts[i] = a; else S.accounts.push(a);
  await db.put('accounts', a);
}
export async function deleteAccount(id) {
  if (S.tx.some(t => t.accountId === id || t.toAccountId === id)) throw new Error('in use');
  S.accounts = S.accounts.filter(a => a.id !== id);
  await db.del('accounts', id);
}
export async function saveBill(b) {
  const i = S.recurring.findIndex(x => x.id === b.id);
  if (i >= 0) S.recurring[i] = b; else S.recurring.push(b);
  await db.put('recurring', b);
}
export async function deleteBill(id) { S.recurring = S.recurring.filter(b => b.id !== id); await db.del('recurring', id); }
export const savePhoto = (id, blob) => db.put('receipts', { id, blob }).catch(() => {}); // photos are nice-to-have
export const deletePhotos = ids => db.delMany('receipts', ids).catch(() => {});
export const getPhoto = id => db.get('receipts', id).then(r => r?.blob || null).catch(() => null);

// ---- whole-data operations (restore, erase) ---------------------------------------------------------------------
const kvRows = kv => Object.entries(kv || {}).filter(([k, v]) => KV_KEYS.includes(k) && v != null).map(([key, value]) => ({ key, value }));
/** Replace everything with a backup, all or nothing. */
export async function replaceAll({ accounts, tx, recurring, kv }) {
  await db.writeAtomic({ clear: ['accounts', 'tx', 'recurring'], put: { accounts, tx, recurring, kv: kvRows(kv) } });
  await load();
}
/** Add a merged backup's new records and settings, all or nothing. Existing records are never rewritten. */
export async function addAll({ accounts, tx, recurring, kv }) {
  const has = (list, ids) => list.filter(x => !ids.has(x.id));
  await db.writeAtomic({ put: {
    accounts: has(accounts, new Set(S.accounts.map(a => a.id))), tx: has(tx, new Set(S.tx.map(t => t.id))),
    recurring: has(recurring, new Set(S.recurring.map(r => r.id))), kv: kvRows(kv),
  } });
  await load();
}
export async function eraseAll() {
  for (const s of db.STORES) await db.clear(s);
  await load();
}
export const storageMode = db.storageMode;
export const onRemoteChange = db.onRemoteChange;
export const onSaveFailed = db.onSaveFailed;
