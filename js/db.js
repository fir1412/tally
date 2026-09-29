// Tiny IndexedDB wrapper with a localStorage fallback.
// Stores: accounts, tx, recurring, receipts (keyed by id) and kv (keyed by key). Adapted from we go gim.
// Never rename NAME: every user's data lives under it (and under this site's address).

const NAME = 'tally', VERSION = 1;
export const STORES = ['accounts', 'tx', 'recurring', 'receipts', 'kv'];

let idb = null;
let mem = null; // fallback: {store: {id: obj}}

// ---- encryption at rest (optional, tied to the lock: js/lock.js) -----------------------------------------------------
// With it on, every record except the settings (language, the lock itself: needed before unlocking) is stored as
// {id or key, iv, ct}: AES-GCM of the record under a random data key that exists only in memory after unlocking.
// Receipt photos are sealed too (their bytes after a JSON header). Old plain records still read, so turning it on or
// off can move the photos a few at a time. IndexedDB only: the localStorage fallback can't hold the bytes.
let dek = null, sealed = false;
/** The data key for this session (null: none). */
export const setKey = k => { dek = k; };
export const getKey = () => dek;
/** Whether records must be sealed: then a write without the key is refused rather than stored in the clear. */
export const expectSealed = v => { sealed = !!v; };
const plainRec = (store, obj) => store === 'kv' && obj?.key === 'settings';
const idOf = (store, obj) => (store === 'kv' ? { key: obj.key } : { id: obj.id });
/** One record, sealed with `key` (receipts: the photo's bytes go in too). */
export async function sealRecord(store, obj, key) {
  const { blob, ...rest } = obj;
  const head = new TextEncoder().encode(JSON.stringify(blob instanceof Blob ? { ...rest, blobType: blob.type } : obj));
  const body = blob instanceof Blob ? new Uint8Array(await blob.arrayBuffer()) : new Uint8Array(0);
  const data = new Uint8Array(4 + head.length + body.length);
  new DataView(data.buffer).setUint32(0, head.length); data.set(head, 4); data.set(body, 4 + head.length);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { ...idOf(store, obj), iv, ct: await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data) };
}
/** A stored record back as it was; plain records come back as they are. Throws without the right key. */
export async function openRecord(rec, key) {
  if (!rec || !rec.ct || !rec.iv) return rec;
  if (!key) throw new Error('Tally is locked');
  const data = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv }, key, rec.ct));
  const n = new DataView(data.buffer).getUint32(0), obj = JSON.parse(new TextDecoder().decode(data.subarray(4, 4 + n)));
  if (obj.blobType == null) return obj;
  const { blobType, ...rest } = obj;
  return { ...rest, blob: new Blob([data.subarray(4 + n)], { type: blobType }) };
}
async function seal(store, obj) {
  if (!idb || plainRec(store, obj)) return obj;
  if (!dek) { if (sealed) throw new Error('Tally is locked'); return obj; }
  return sealRecord(store, obj, dek);
}
const unseal = rec => openRecord(rec, dek);

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
  return Promise.all((await tx(store, 'readonly', os => reqP(os.getAll()))).map(unseal));
}

export async function put(store, obj) {
  if (!idb) { lsWrite(store, m => { m[store === 'kv' ? obj.key : obj.id] = obj; }); return obj; }
  const rec = await seal(store, obj);
  await tx(store, 'readwrite', os => { os.put(rec); });
  notify(store);
  return obj;
}

export async function putMany(store, list) {
  if (!idb) return lsWrite(store, m => { for (const o of list) m[store === 'kv' ? o.key : o.id] = o; });
  const recs = await Promise.all(list.map(o => seal(store, o)));
  await tx(store, 'readwrite', os => { for (const o of recs) os.put(o); });
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
  const hit = await unseal(await tx('kv', 'readonly', os => reqP(os.get(key))));
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
  return (await unseal(await tx(store, 'readonly', os => reqP(os.get(key))))) ?? null;
}
/** Write records exactly as given (turning encryption on or off moves them a few at a time). */
export async function putRaw(store, recs) {
  await tx(store, 'readwrite', os => { for (const o of recs) os.put(o); });
  notify(store);
}

/** Close and delete the whole database (leaving the old address). */
export async function destroy() {
  try { idb?.close(); } catch {}
  idb = null;
  await new Promise(res => { try { const r = indexedDB.deleteDatabase(NAME); r.onsuccess = r.onerror = r.onblocked = () => res(); } catch { res(); } });
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
  const sealedPut = Object.fromEntries(await Promise.all(Object.entries(put).map(async ([s, list]) => [s, await Promise.all(list.map(o => seal(s, o)))])));   // before the transaction: it would close while waiting
  await new Promise((resolve, reject) => {
    let t;
    try {
      t = idb.transaction(stores, 'readwrite');
      for (const s of clear) t.objectStore(s).clear();
      for (const [s, keys] of Object.entries(del)) for (const k of keys) t.objectStore(s).delete(k);
      for (const [s, list] of Object.entries(sealedPut)) { const os = t.objectStore(s); for (const o of list) os.put(o); }
    } catch (e) { try { t?.abort(); } catch {} failHandler(e); return reject(e); } // abort: a half-written restore must not commit
    t.oncomplete = resolve;
    t.onerror = t.onabort = () => { failHandler(t.error); reject(t.error); };
  });
  notify('all');
}
