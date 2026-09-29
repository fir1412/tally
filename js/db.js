// Tiny IndexedDB wrapper with a localStorage fallback.
// Stores: accounts, tx, recurring, receipts (keyed by id) and kv (keyed by key). Adapted from we go gim.
// Never rename NAME: every user's data lives under it (and under this site's address).

const NAME = 'tally', VERSION = 1;
export const STORES = ['accounts', 'tx', 'recurring', 'receipts', 'kv'];

let idb = null;
let mem = null; // fallback: {store: {id: obj}}

// Other tabs of the app are told about every write, so two open tabs don't silently overwrite each other.
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tally-data') : null;
bc?.unref?.(); // Node only (tests): an open channel must not keep the process alive
const notify = store => { try { bc?.postMessage({ store, at: Date.now() }); } catch {} };
/** Called with the store name when another tab of the app changed data. */
export const onRemoteChange = cb => bc?.addEventListener('message', e => cb(e.data?.store));
/** Called when a save failed (for example the fallback storage is full). */
let failHandler = () => {};
export const onSaveFailed = cb => { failHandler = cb; };

function open() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('no indexedDB'));
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: s === 'kv' ? 'key' : 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      // A newer version opened in another tab: let it upgrade instead of blocking it, then reload into it.
      db.onversionchange = () => { db.close(); if (typeof location !== 'undefined') location.reload(); };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    // Another tab holds an older version open: don't hang on "Loading…" forever.
    req.onblocked = () => setTimeout(() => reject(new Error('The app is open in another tab. Close it and reload.')), 4000);
  });
}

function lsLoad() {
  mem = {};
  for (const s of STORES) {
    try { mem[s] = JSON.parse(localStorage.getItem(`${NAME}.${s}`) || '{}'); } catch { mem[s] = {}; }
  }
}
/** Fallback write: change a copy of the store, keep it only if localStorage took it; otherwise report and reject. */
function lsWrite(store, change) {
  const next = { ...mem[store] };
  change(next);
  try { localStorage.setItem(`${NAME}.${store}`, JSON.stringify(next)); } catch (e) { console.warn('save failed', e); failHandler(e); throw e; }
  mem[store] = next;
  notify(store);
}

let mode = null;
/** 'indexeddb', or 'localstorage' when the browser's database is unavailable (for example some private windows). */
export const storageMode = () => mode;

export async function init() {
  try { idb = await open(); } catch (e) {
    // Only a browser that can't store in IndexedDB at all (some private windows) falls back to localStorage.
    // Any other failure stops at the recovery screen: an empty fallback store would hide the user's real data.
    const unavailable = !('indexedDB' in globalThis) || ['SecurityError', 'InvalidStateError'].includes(e?.name) || /no indexedDB/.test(e?.message || '');
    if (!unavailable) throw e;
    idb = null; lsLoad();
  }
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  mode = idb ? 'indexeddb' : 'localstorage';
  return mode;
}

function tx(store, mode, fn) {
  return new Promise((resolve, reject) => {
    let t, result;
    try {
      t = idb.transaction(store, mode);
      Promise.resolve(fn(t.objectStore(store))).then(r => { result = r; }, () => {});
    } catch (e) { if (mode === 'readwrite') failHandler(e); try { t?.abort(); } catch {} return reject(e); } // closed database, a value that can't be stored…
    t.oncomplete = () => resolve(result);
    t.onerror = () => { failHandler(t.error); reject(t.error); };
    t.onabort = () => { failHandler(t.error); reject(t.error); };
  });
}
const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

/** The keys of a store without loading its records (the photos are big). */
export async function keys(store) {
  if (!idb) return Object.keys(mem[store]);
  return tx(store, 'readonly', os => reqP(os.getAllKeys()));
}
export async function all(store) {
  if (!idb) return Object.values(mem[store]);
  return tx(store, 'readonly', os => reqP(os.getAll()));
}

export async function put(store, obj) {
  if (!idb) { lsWrite(store, m => { m[store === 'kv' ? obj.key : obj.id] = obj; }); return obj; }
  await tx(store, 'readwrite', os => { os.put(obj); });
  notify(store);
  return obj;
}

export async function putMany(store, list) {
  if (!idb) return lsWrite(store, m => { for (const o of list) m[store === 'kv' ? o.key : o.id] = o; });
  await tx(store, 'readwrite', os => { for (const o of list) os.put(o); });
  notify(store);
}

export async function del(store, key) {
  if (!idb) return lsWrite(store, m => { delete m[key]; });
  await tx(store, 'readwrite', os => { os.delete(key); });
  notify(store);
}

export async function clear(store) {
  if (!idb) return lsWrite(store, m => { for (const k in m) delete m[k]; });
  await tx(store, 'readwrite', os => { os.clear(); });
  notify(store);
}

/** One key from the kv store, read directly (never the whole store). */
export async function getKv(key, fallback = null) {
  if (!idb) { const hit = mem.kv[key]; return hit ? hit.value : fallback; }
  const hit = await tx('kv', 'readonly', os => reqP(os.get(key)));
  return hit ? hit.value : fallback;
}
export const setKv = (key, value) => put('kv', { key, value });

/** Keys of the kv store starting with a prefix, without loading every value. */
export async function kvKeys(prefix) {
  if (!idb) return Object.keys(mem.kv).filter(k => k.startsWith(prefix));
  const keys = await tx('kv', 'readonly', os => reqP(os.getAllKeys()));
  return keys.filter(k => String(k).startsWith(prefix));
}

/** One record by key from any store (receipt photos are read one at a time, never all at once). */
export async function get(store, key) {
  if (!idb) return mem[store][key] ?? null;
  return (await tx(store, 'readonly', os => reqP(os.get(key)))) ?? null;
}

/** Delete many keys in one transaction with one change notice (undo of a big import). */
export async function delMany(store, keys) {
  if (!idb) return lsWrite(store, m => { for (const k of keys) delete m[k]; });
  await tx(store, 'readwrite', os => { for (const k of keys) os.delete(k); });
  notify(store);
}

/**
 * All-or-nothing write across stores (restore): `clear` empties those stores, `del` removes {store: [keys]}, then `put`
 * writes {store: [objects]}.
 * One IndexedDB transaction, so a crash or full disk mid-way leaves the old data untouched.
 */
export async function writeAtomic({ clear = [], del = {}, put = {} }) {
  const stores = [...new Set([...clear, ...Object.keys(del), ...Object.keys(put)])];
  if (!idb) {
    const backup = structuredClone(mem);
    try {
      for (const s of clear) mem[s] = {};
      for (const [s, keys] of Object.entries(del)) for (const k of keys) delete mem[s][k];
      for (const [s, list] of Object.entries(put)) for (const o of list) mem[s][s === 'kv' ? o.key : o.id] = o;
      for (const s of stores) localStorage.setItem(`${NAME}.${s}`, JSON.stringify(mem[s]));
    } catch (e) { mem = backup; for (const s of stores) try { localStorage.setItem(`${NAME}.${s}`, JSON.stringify(mem[s])); } catch {} failHandler(e); throw e; }
    notify('all'); return;
  }
  await new Promise((resolve, reject) => {
    let t;
    try {
      t = idb.transaction(stores, 'readwrite');
      for (const s of clear) t.objectStore(s).clear();
      for (const [s, keys] of Object.entries(del)) for (const k of keys) t.objectStore(s).delete(k);
      for (const [s, list] of Object.entries(put)) { const os = t.objectStore(s); for (const o of list) os.put(o); }
    } catch (e) { try { t?.abort(); } catch {} failHandler(e); return reject(e); } // abort: a half-written restore must not commit
    t.oncomplete = resolve;
    t.onerror = t.onabort = () => { failHandler(t.error); reject(t.error); };
  });
  notify('all');
}
