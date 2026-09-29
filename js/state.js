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
/** Transactions up to today, in the current scope. Rows dated later (a statement's future lines) count from their own day, everywhere. */
export const booked = () => { const d = today(); return scopedTx().filter(x => x.date <= d); };

// ---- scope: Me · Joint · All (a couple's joint accounts next to personal ones) ---------------------------------
export const jointIds = () => new Set(S.accounts.filter(a => a.scope === 'joint').map(a => a.id));
export const hasJoint = () => S.accounts.some(a => a.scope === 'joint');
/** 'me', 'joint' or 'all'. Without a joint account everything is 'me'. */
export const scope = () => (hasJoint() ? (['me', 'joint'].includes(S.kv.settings.scope) ? S.kv.settings.scope : 'all') : 'me');
/** A transaction, bill or {accountId} in scope. A transfer between a personal and a joint account is in both:
 *  money out of one, into the other (balances() only totals the accounts it is given). */
export function inScope(x, sc = scope(), joint = jointIds()) {
  if (sc === 'all') return true;
  const want = sc === 'joint';
  return joint.has(x.accountId) === want || (x.toAccountId != null && joint.has(x.toAccountId) === want);
}
export const scopedTx = () => { const sc = scope(), j = jointIds(); return sc === 'all' || !j.size ? S.tx : S.tx.filter(x => inScope(x, sc, j)); };
export const scopedAccounts = () => { const sc = scope(); return S.accounts.filter(a => sc === 'all' || (a.scope === 'joint') === (sc === 'joint')); };
/** Budgets for the scope: personal ones as before, joint ones in budgets.joint, All = both added up (read-only). */
export function budgetsFor(sc = scope()) {
  const me = S.kv.budgets, jt = me.joint || { total: 0, byCat: {} };
  if (sc !== 'all') return sc === 'joint' ? jt : me;
  const byCat = { ...me.byCat };
  for (const [c, v] of Object.entries(jt.byCat)) byCat[c] = (byCat[c] || 0) + v;
  return { total: me.total + jt.total, byCat };
}
/** Every save is stamped (a spouse's share file merges by newest edit); joint rows also say who added them. */
const stamp = x => {
  const by = S.kv.settings?.myName, j = jointIds();
  return { ...x, updatedAt: Date.now(), ...(by && !x.by && (j.has(x.accountId) || j.has(x.toAccountId)) ? { by } : {}) };
};
/** The account of the latest everyday spending or income in the current scope (a transfer or a bill paid from its own account isn't where you usually pay from). */
export const usualAccount = () => [...scopedTx()].filter(x => x.type !== 'transfer' && !x.bill && x.source !== 'recurring').sort((a, b) => b.createdAt - a.createdAt)[0]?.accountId || scopedAccounts()[0]?.id || S.accounts[0]?.id;
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
  tx = stamp(tx);
  const i = S.tx.findIndex(t => t.id === tx.id);
  if (i >= 0) S.tx[i] = tx; else S.tx.push(tx);
  await db.put('tx', tx);
  return tx;
}
export async function saveTxs(list) {
  list = list.map(stamp);
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
  a = { ...a, updatedAt: Date.now() };
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
/** Write records as given, overwriting (a spouse's newer joint edits), all or nothing. */
export async function putAll({ accounts = [], tx = [], kv = {} }) {
  await db.writeAtomic({ put: { accounts, tx, kv: kvRows(kv) } });
  await load();
}
export async function eraseAll() {
  for (const s of db.STORES) await db.clear(s);
  await load();
}
export const storageMode = db.storageMode;
export const onRemoteChange = db.onRemoteChange;
export const onSaveFailed = db.onSaveFailed;
