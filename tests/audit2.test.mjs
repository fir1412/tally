// Regression tests for the security audit's confirmed findings (run-2): each failed before its fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

const ms = f => { const t = performance.now(); f(); return performance.now() - t; };

test('matching a line against the tax reliefs is linear in its length (the EV pattern was quadratic)', () => {
  const words = i => `${'kedai runcit barang harian '.repeat(26)}${i}`;   // ~700 characters that match nothing
  assert.ok(ms(() => { for (let i = 0; i < 500; i++) E.reliefOf(words(i), words(i + 1), 'other'); }) < 300, 'relief matching took too long');
  assert.equal(E.reliefOf('EV charger installation', '', 'other'), 'ev');
  assert.equal(E.reliefOf('Wallbox', 'monthly subscription', 'other'), 'ev');
  assert.equal(E.reliefOf('EV charging', '', 'other'), null);   // both halves are still needed
});

test("bills that add themselves don't check every due date against every stored row (a joint file of bills and rows froze the first screen)", () => {
  const bills = Array.from({ length: 200 }, (_, i) => ({ id: `x${i}`, name: i % 2 ? `Svc${i}` : 'Kedai', amount: 1, accountId: 'a', freq: 'weekly', auto: true, start: '1990-01-01' }));
  const tx = Array.from({ length: 50_000 }, (_, i) => ({ id: `t${i}`, date: E.addDays(i % 2 ? '2026-09-30' : '2010-06-30', -(i % 400)), type: 'expense', amount: 100, accountId: 'a', merchant: i % 2 ? `Shop ${i % 97}` : 'Kedai' }));
  let got, want;
  const none = ms(() => { want = E.dueBillTxs(bills, '2026-09-30', []); }), rows = ms(() => { got = E.dueBillTxs(bills, '2026-09-30', tx); });
  assert.ok(rows < none * 2 + 300, `posting: ${rows | 0} ms with the rows vs ${none | 0} ms without`);
  assert.equal(got.length, want.length);   // rows named after a bill but dated years before pay nothing
  const bNone = ms(() => { for (const b of bills) E.billStatus(b, '2026-09-30', []); }), bRows = ms(() => { for (const b of bills) E.billStatus(b, '2026-09-30', tx); });
  assert.ok(bRows < bNone * 2 + 100, `Home's bill banner: ${bRows | 0} ms with the rows vs ${bNone | 0} ms without`);   // the rows add next to nothing
});

// A stored zip written by hand: `locals` [{at, extra}] local headers, `names` central records → local header index.
function aliasZip(dataLen, locals, names) {
  const top = Math.max(...locals.map(l => l.at + 30 + l.extra)), dataAt = top, cdAt = dataAt + dataLen;
  const cd = names.map(([name, li]) => [new TextEncoder().encode(name), locals[li].at]);
  const size = cdAt + cd.reduce((s, [n]) => s + 46 + n.length, 0) + 22, b = new Uint8Array(size), dv = new DataView(b.buffer);
  for (const l of locals) { dv.setUint32(l.at, 0x04034b50, true); dv.setUint32(l.at + 18, dataLen, true); dv.setUint32(l.at + 22, dataLen, true); dv.setUint16(l.at + 28, l.extra, true); }
  b.fill(7, dataAt, dataAt + dataLen);
  let p = cdAt;
  for (const [n, at] of cd) { dv.setUint32(p, 0x02014b50, true); dv.setUint32(p + 20, dataLen, true); dv.setUint32(p + 24, dataLen, true); dv.setUint16(p + 28, n.length, true); dv.setUint32(p + 42, at, true); b.set(n, p + 46); p += 46 + n.length; }
  dv.setUint32(p, 0x06054b50, true); dv.setUint16(p + 8, cd.length, true); dv.setUint16(p + 10, cd.length, true); dv.setUint32(p + 12, p - cdAt, true); dv.setUint32(p + 16, cdAt, true);
  return b;
}

test('a zip cannot hand out the same stored bytes under many names (a 2 MB Money Manager file stored one photo 5,000 times)', async () => {
  const IO = await import('../js/io.js'), photos = n => Array.from({ length: n }, (_, i) => [`photos/r${i}.jpg`, 0]);
  const shared = aliasZip(100_000, [{ at: 0, extra: 0 }], photos(1000));   // 1,000 names, one local entry
  await assert.rejects(IO.unzip(shared, n => n.startsWith('photos/')), /bad zip/);
  const N = 1000, nested = aliasZip(100_000, Array.from({ length: N }, (_, i) => ({ at: 30 * i, extra: 30 * (N - 1 - i) })), Array.from({ length: N }, (_, i) => [`photos/r${i}.jpg`, i]));   // headers inside each other's extra field
  await assert.rejects(IO.unzip(nested, n => n.startsWith('photos/')), /bad zip/);
  // A real one still reads, entries of any size, with bytes before it (Money Manager starts with 8).
  const ok = new Uint8Array(await IO.zipStore([{ name: 'photos/a.jpg', data: new Uint8Array(5000).fill(1) }, { name: 'photos/b.jpg', data: new Uint8Array(7000).fill(2) }]).arrayBuffer());
  const pre = new Uint8Array(ok.length + 8); pre.set(ok, 8);
  for (const z of [ok, pre]) assert.deepEqual(Object.entries(await IO.unzip(z, () => true)).map(([k, v]) => [k, v.length]), [['photos/a.jpg', 5000], ['photos/b.jpg', 7000]]);
});

test("setting the phone's clock back doesn't skip the lock after time in the background", async () => {
  let wall = Date.UTC(2026, 8, 30, 9), mono = 1_000_000;
  const realNow = Date.now, realPerf = performance.now, on = {}, shown = [];
  const L = await import('../js/lock.js'), { S } = await import('../js/state.js');   // before the page below: ui.js checks for one when it loads
  const el = () => ({ setAttribute() {}, addEventListener() {}, querySelector: () => null, remove() {}, classList: { add() {}, remove() {} }, set innerHTML(v) {} });
  globalThis.document = { visibilityState: 'visible', addEventListener: (k, f) => { on[k] = f; }, createElement: el,
    body: { children: [], classList: { add() {}, remove() {} }, append: x => shown.push(x) } };
  Date.now = () => wall; performance.now = () => mono;
  try {
    S.kv.settings ={ lock: { hash: 'x', salt: 'x', iter: 1, kind: 'pin', len: 4 } };
    L.watch(() => {});
    const away = async (real, set = 0) => { document.visibilityState = 'hidden'; await on.visibilitychange(); wall += real + set; mono += real; document.visibilityState = 'visible'; on.visibilitychange(); await new Promise(r => setTimeout(r, 0)); return shown.length; };
    assert.equal(await away(30_000), 0);                      // back within a minute: no lock
    assert.equal(await away(2 * 3600_000, -3 * 3600_000), 1);   // 2 h away, clock set back 3 h: locked (was skipped)
  } finally { Date.now = realNow; performance.now = realPerf; delete globalThis.document; }
});

/** Two tabs of the same site using the localStorage fallback (no IndexedDB: some private windows). */
async function fallbackTabs() {
  const shim = await import('./fixtures/idbshim.mjs'), idb = globalThis.indexedDB;
  const ls = Object.create({ getItem(k) { return Object.hasOwn(this, k) ? this[k] : null; }, setItem(k, v) { this[k] = String(v); }, removeItem(k) { delete this[k]; } });
  globalThis.localStorage = ls; delete globalThis.indexedDB;
  const A = await shim.tab(), B = await shim.tab();
  const done = () => { globalThis.indexedDB = idb; delete globalThis.localStorage; };
  try {
    assert.equal(await A.S.load(), 'localstorage');
    await A.S.saveAccount({ id: 'a1', name: 'Dummy Bank', kind: 'bank', opening: 0, createdAt: 1 });
    await A.S.saveTxs([{ id: 't1', accountId: 'a1', type: 'expense', amount: 100, date: '2026-09-01', merchant: 'DUMMY ONE', category: 'dining', createdAt: 1 }]);
    await B.S.load();
  } catch (e) { done(); throw e; }
  return { shim, A, B, ls, done };
}
const tick = () => new Promise(r => setTimeout(r, 5));

test("erasing at the old address tells every open tab, so another tab's next save can't write the erased data back", async () => {
  const { A, B, ls, done } = await fallbackTabs();
  try {
    await A.S.wipeSite();
    await tick();   // the other tab hears of it
    const late = await B.S.saveTx({ id: 'tB', accountId: 'a1', type: 'expense', amount: 5, date: '2026-09-02', merchant: 'DUMMY B', category: 'dining', createdAt: 2 }).then(() => 'landed', () => 'refused');
    assert.equal(late, 'refused');
    assert.deepEqual(Object.keys(ls).filter(k => k.startsWith('tally')), []);   // nothing of Tally's is left at the address
  } finally { done(); }
});

/** An encrypted Tally with dummy data in tab A. */
async function encryptedTab() {
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(), ENC = { key: 'DUMMY-WRAPPED', salt: 'x', iter: 1, iv: 'x' };
  const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  await A.S.load(); A.db.setKey(dek, ENC.key); A.db.expectSealed(true);
  await A.S.setKv('settings', { lock: { kind: 'pin', len: 4, enc: ENC } });
  await A.S.saveAccount({ id: 'a1', name: 'Dummy Bank', kind: 'bank', opening: 0, createdAt: 1 });
  return { shim, A, dek };
}

test('a sealed save still being encrypted when the erase runs cannot land in the fresh database (Tally was locked at every start)', async () => {
  const { shim, A } = await encryptedTab(), P = Object.getPrototypeOf(crypto.subtle), enc = P.encrypt;
  let release, first = true;
  const held = new Promise(r => { release = r; });
  P.encrypt = async function (...a) { if (first) { first = false; await held; } return enc.apply(this, a); };   // the seal outlasts the erase
  try {
    const save = A.S.setKv('reviewDraft', { draft: { merchant: 'DUMMY PRE-ERASE' } }).then(() => 'landed', () => 'refused');
    await A.S.eraseAll();   // deletes the database and opens a fresh one on this page
    release();
    assert.equal(await save, 'refused');
  } finally { P.encrypt = enc; }
  const C = await shim.tab();
  await C.S.load();   // threw 'Tally is locked': a record sealed with the erased key
  assert.deepEqual([C.S.S.kv.reviewDraft ?? null, shim.rows('kv').filter(r => r.ct).length], [null, 0]);
});

test("a partner's file can't replace the photo a personal entry shares with a joint one (only the last row using it was asked)", async () => {
  const IO = await import('../js/io.js');
  const local = { accounts: [{ id: 'me', name: 'Maybank', kind: 'bank' }, { id: 'jt', name: 'Joint', kind: 'bank', scope: 'joint' }], recurring: [], kv: {},
    tx: [{ id: 'mm_1aa', date: '2026-09-01', type: 'expense', amount: 100, accountId: 'me', receiptId: 'pS', updatedAt: 5 },
      { id: 'mm_9zz', date: '2026-09-01', type: 'expense', amount: 200, accountId: 'jt', receiptId: 'pS', updatedAt: 5 }] };   // one Money Manager photo, two entries
  const file = IO.readBackup(JSON.stringify({ app: 'tally', v: 1, kind: 'joint', by: 'Partner', accounts: [{ id: 'jt', name: 'Joint', kind: 'bank', scope: 'joint' }],
    tx: [{ id: 'mm_9zz', date: '2026-09-01', type: 'expense', amount: 250, accountId: 'jt', receiptId: 'pS', updatedAt: 60 }, { id: 'n1', date: '2026-09-02', type: 'expense', amount: 9, accountId: 'jt', receiptId: 'pS', updatedAt: 60 }] }));
  const m = IO.mergeJoint(local, file);
  assert.deepEqual(m.tx.map(t => [t.id, t.receiptId]), [['mm_9zz', 'pS'], ['n1', undefined]]);   // the joint row keeps its link; a new row can't take it
  assert.deepEqual([...IO.photosToWrite(m.tx, local.tx)], []);   // but the file's copy is never written over the personal entry's photo
  assert.deepEqual([...IO.photosToWrite([{ id: 'mm_9zz', receiptId: 'pJ' }], [...local.tx, { id: 'mm_9zz', receiptId: 'pJ' }])], ['pJ']);   // a photo only it uses: still written
});

test("a Money Manager import keeps the user's own categories at 50 in all (past that every backup was refused on restore)", async () => {
  const IO = await import('../js/io.js'), { readFileSync } = await import('node:fs');
  const have = Array.from({ length: 30 }, (_, i) => ({ id: `c_mine${i}`, name: `Mine ${i}`, color: '#123456' }));
  const file = Array.from({ length: 25 }, (_, i) => ({ id: `c_mm${i}`, name: i === 24 ? 'Gaji Bulanan' : `Their ${i}`, color: '#654321', ...(i === 24 ? { kind: 'income' } : {}) }));
  const rows = file.map((c, i) => ({ id: `x${i}`, type: c.kind === 'income' ? 'income' : 'expense', category: c.id, items: i === 3 ? [{ name: 'a', category: 'c_mm22' }] : undefined }));
  const cats = IO.fitCats(have, file, rows, rows);
  assert.equal(have.length + cats.length, 50);
  const kept = new Set([...have, ...cats].map(c => c.id)), own = id => String(id).startsWith('c_');
  for (const x of rows) for (const id of [x.category, ...(x.items || []).map(i => i.category)]) assert.ok(!own(id) || kept.has(id), `${x.id} still uses ${id}`);
  assert.equal(rows[24].category, 'salary');   // money in stays money in
  const go = readFileSync(new URL('../js/views/setup.js', import.meta.url), 'utf8').match(/'mm-go': async[\s\S]*?\n  },\n/)[0];
  assert.match(go, /fitCats\(/, 'the Money Manager import must use it');
});

test("Tally never writes, or reports as saved, a backup its own restore refuses", async () => {
  const IO = await import('../js/io.js'), { readFileSync } = await import('node:fs');
  const bills = n => Array.from({ length: n }, (_, i) => ({ id: `jb${i}`, accountId: 'jt' })), local = { accounts: [{ id: 'me' }], tx: [{ id: 't1' }], recurring: [{ id: 'mine' }], customCats: [] };
  assert.equal(IO.overCapAfter(local, { recurring: bills(500) }), 'recurring');   // a partner's 500 joint bills next to one of mine
  assert.equal(IO.overCapAfter(local, { recurring: bills(499) }), '');
  assert.equal(IO.overCapAfter({ ...local, accounts: Array.from({ length: 200 }, (_, i) => ({ id: `a${i}` })) }, { accounts: [{ id: 'new' }] }, { accounts: ['a0'] }), '');   // one in, one out
  // A 51st category of the user's own is refused (a backup with 51 won't restore).
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(); await A.S.load();
  for (let i = 0; i < 50; i++) await A.S.addCategory(`Mine ${i}`);
  await assert.rejects(A.S.addCategory('One too many'), /50 categories/);
  // A password-protected backup of the biggest file Tally reads back still fits the sealed file's own limit.
  const s = await IO.sealBackup(new Uint8Array(1000), 'dummy-password-1'), extra = s.length - Math.ceil(1016 / 3) * 4;
  assert.ok(Math.ceil((IO.LIMITS.backupBytes + 16) / 3) * 4 + extra <= IO.SEALED_MAX);
  const src = readFileSync(new URL('../js/views/setup.js', import.meta.url), 'utf8'), fn = name => src.match(new RegExp(`(async )?function ${name}\\([\\s\\S]*?\\n}\\n`))[0];
  assert.match(fn('importFile'), /SEALED_MAX/);
  for (const f of ['importJoint', 'restoreText', 'commitImport', 'sealedBackup']) assert.match(fn(f), /overCap/, `${f} must check the totals`);
});

test("a deleted joint bill or joint account stays deleted on both phones (the partner's next file brought it back)", async () => {
  const IO = await import('../js/io.js'), { readFileSync } = await import('node:fs');
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(); await A.S.load();
  const T0 = Date.now() - 86400_000, jt = { id: 'jt', name: 'Joint', kind: 'bank', scope: 'joint', opening: 0, createdAt: 1 }, jold = { id: 'jold', name: 'Old joint', kind: 'bank', scope: 'joint', opening: 0, createdAt: 2 };
  const bill = { id: 'b1', name: 'Rent', amount: 150000, accountId: 'jt', day: 1, auto: true, start: '2026-06-01', last: '2026-06-02', updatedAt: T0 };
  for (const a of [{ id: 'mine', name: 'Maybank', kind: 'bank', opening: 0, createdAt: 0 }, jt, jold]) await A.S.saveAccount(a);
  await A.S.saveBill(bill, { edited: false });
  const partner = { accounts: [{ ...jt, updatedAt: T0 }, { ...jold, updatedAt: T0 }], tx: [], recurring: [bill], kv: {} };   // the partner's phone still has both
  await A.S.deleteBill('b1'); await A.S.deleteAccount('jold');
  // A merges the partner's next file: neither comes back.
  const m = IO.mergeJoint({ accounts: A.S.S.accounts, tx: A.S.S.tx, recurring: A.S.S.recurring, kv: A.S.S.kv }, IO.readBackup(IO.makeJointShare(partner, 'Partner')));
  assert.deepEqual([m.recurring.map(r => r.id), m.accounts.map(a => a.id)], [[], []]);
  // The partner merges A's file: the deletes travel there too.
  const p = IO.mergeJoint(partner, IO.readBackup(IO.makeJointShare({ accounts: A.S.S.accounts, tx: A.S.S.tx, recurring: A.S.S.recurring, kv: A.S.S.kv }, 'A')));
  assert.deepEqual([p.dropBills, p.dropAccounts], [['b1'], ['jold']]);
  // A payment id deleted here is never posted again by a bill that comes back.
  const money = readFileSync(new URL('../js/views/money.js', import.meta.url), 'utf8').match(/export async function postBills[\s\S]*?\n}\n/)[0];
  assert.match(money, /jointGone/);
  assert.match(readFileSync(new URL('../js/views/setup.js', import.meta.url), 'utf8').match(/async function importJoint[\s\S]*?\n}\n/)[0], /dropBills[\s\S]*dropAccounts|dropAccounts[\s\S]*dropBills/);
});

test("an import's changes to joint entries sync like any edit: stamped, and its deletes marked", async () => {
  const IO = await import('../js/io.js'), { readFileSync } = await import('node:fs');
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(); await A.S.load();
  for (const a of [{ id: 'pA', name: 'Maybank', kind: 'bank', opening: 0, createdAt: 0 }, { id: 'jx', name: 'Joint', kind: 'bank', scope: 'joint', opening: 0, createdAt: 1 }]) await A.S.saveAccount(a);
  const pj1 = { id: 'pj1', date: '2026-03-10', type: 'income', amount: 30000, accountId: 'jx', category: 'income', merchant: 'Dummy deposit', updatedAt: 5, spouse: true };
  await A.S.putAll({ tx: [pj1] });   // came from the partner's file earlier
  // The import pairs a bank line with that joint income (a transfer), and adds a row to the joint account.
  await A.S.putAll({ tx: [{ id: 'i_x1', date: '2026-03-10', type: 'transfer', amount: 30000, accountId: 'pA', toAccountId: 'jx', merchant: 'Transfer TO Dummy' }, { id: 'i_g1', date: '2026-03-12', type: 'expense', amount: 4200, accountId: 'jx', merchant: 'DUMMY GROCER' }], del: { tx: ['pj1'] }, edit: true });
  assert.ok(A.S.S.kv.jointGone?.pj1, 'the deleted joint income has a marker');
  assert.ok(A.S.S.tx.every(t => t.updatedAt > 0), 'every row the import wrote is stamped');
  // The partner's unchanged file no longer brings pj1 back, and the partner takes the imported joint row.
  const partner = { accounts: [{ id: 'jx', name: 'Joint', kind: 'bank', scope: 'joint' }], tx: [pj1], recurring: [], kv: {} };
  assert.deepEqual(IO.mergeJoint({ accounts: A.S.S.accounts, tx: A.S.S.tx, recurring: [], kv: A.S.S.kv }, IO.readBackup(IO.makeJointShare(partner, 'P'))).tx.map(t => t.id), []);
  const there = IO.mergeJoint(partner, IO.readBackup(IO.makeJointShare({ accounts: A.S.S.accounts, tx: A.S.S.tx, recurring: [], kv: A.S.S.kv }, 'A')));
  assert.deepEqual([there.tx.map(t => t.id).sort(), there.drop], [['i_g1', 'i_x1'], ['pj1']]);
  const commit = readFileSync(new URL('../js/views/setup.js', import.meta.url), 'utf8').match(/async function commitImport[\s\S]*?\n}\n/)[0];
  assert.equal((commit.match(/edit: true/g) || []).length, 2, 'the import and its Undo both write as edits');
});

test('turning encryption on leaves nothing in the clear that another tab saved meanwhile', async () => {
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(), B = await shim.tab(), LA = await A.lock();
  await A.S.load();
  await A.S.saveAccount({ id: 'a1', name: 'Dummy Bank', kind: 'bank', opening: 0, createdAt: 1 });
  await A.S.saveTxs([{ id: 't1', accountId: 'a1', type: 'expense', amount: 100, date: '2026-09-01', merchant: 'DUMMY ONE', category: 'dining', createdAt: 1 }]);
  await A.S.setSetting('lock', await LA.makeLock('1234'));
  await B.S.load();
  const on = LA.encryptOn('1234');
  while (!A.db.getKey()) await new Promise(r => setTimeout(r, 1));   // A has read what it will encrypt
  await B.S.saveTx({ id: 'tPlain', accountId: 'a1', type: 'expense', amount: 4000, date: '2026-09-02', merchant: 'DUMMY PRIVATE CLINIC', category: 'health', createdAt: 2 });   // B hasn't heard yet
  await on;
  const C = await shim.tab(), LC = await C.lock();   // the next start, unlocked with the PIN
  await C.S.load();
  const enc = C.S.S.kv.settings.lock.enc;
  C.db.setKey(await LC.unwrapDek('1234', enc), enc.key); await C.S.load(); await LC.sealPhotos();
  const plain = ['accounts', 'tx', 'recurring', 'kv'].flatMap(s => shim.rows(s).filter(r => !r.ct && r.key !== 'settings').map(r => `${s}:${r.id ?? r.key}`));
  assert.deepEqual(plain, []);
  assert.ok(C.S.S.tx.some(t => t.id === 'tPlain'), 'still readable once unlocked');
});

test("turning encryption off while things save leaves nothing sealed under the dropped key, and loses no edit", async () => {
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(), B = await shim.tab(), LA = await A.lock(), LB = await B.lock();
  await A.S.load();
  await A.S.saveAccount({ id: 'a1', name: 'Dummy Bank', kind: 'bank', opening: 0, createdAt: 1 });
  const t1 = { id: 't1', accountId: 'a1', type: 'expense', amount: 1000, date: '2026-09-01', merchant: 'DUMMY ONE', category: 'dining', createdAt: 1 };
  await A.S.saveTxs([t1]);
  await A.S.setSetting('lock', await LA.makeLock('1234'));
  await LA.encryptOn('1234');
  await B.S.load(); const enc = B.S.S.kv.settings.lock.enc; B.db.setKey(await LB.unwrapDek('1234', enc), enc.key); await B.S.load();   // B: the same phone's other tab, unlocked
  const P = Object.getPrototypeOf(crypto.subtle), importKey = P.importKey;
  let hooked = false;
  P.importKey = async function (...a) {   // the slow new-PIN hash inside encryptOff: saves land meanwhile, here and in B
    if (!hooked && a[4]?.includes?.('deriveBits')) {
      hooked = true;
      await A.S.saveTx({ ...t1, amount: 9999 }); await A.S.saveTx({ ...t1, id: 'tWin', amount: 7 }); await A.S.setKv('reviewDraft', { draft: { merchant: 'DUMMY DRAFT' } });
      await B.S.saveTx({ ...t1, id: 'tB', amount: 5 });
    }
    return importKey.apply(this, a);
  };
  try { await LA.encryptOff('1234'); } finally { P.importKey = importKey; }
  const late = await B.S.saveTx({ ...t1, id: 'tLate', amount: 3 }).then(() => 'landed', () => 'refused');   // B hasn't heard yet
  assert.equal(late, 'refused');
  assert.deepEqual(['accounts', 'tx', 'recurring', 'kv', 'receipts'].flatMap(s => shim.rows(s).filter(r => r.ct).map(r => `${s}:${r.id ?? r.key}`)), []);
  const C = await shim.tab(); await C.S.load();   // threw 'Tally is locked' at every start
  assert.deepEqual(C.S.S.tx.map(t => [t.id, t.amount]).sort(), [['t1', 9999], ['tB', 5], ['tWin', 7]]);
  assert.equal(C.S.S.kv.reviewDraft?.draft?.merchant, 'DUMMY DRAFT');
});

test('a bill counts as paid exactly as before: tagged, posted (rec-<id>-), or by its shop name', () => {
  const ref = (r, date, txs) => {   // the old whole-list scan
    const name = String(r.name || '').trim().toLowerCase(), per = { weekly: 3, yearly: 182 }[r.freq];
    const [a, b] = per ? [E.addDays(date, -per), E.addDays(date, per)] : [`${date.slice(0, 7)}-01`, `${date.slice(0, 7)}-31`];
    return txs.some(t => t.type === 'expense' && t.date >= a && t.date <= b && (t.bill === r.id || String(t.id).startsWith(`rec-${r.id}-`) || (!!name && !t.bill && !String(t.id).startsWith('rec-') && String(t.merchant || '').trim().toLowerCase() === name)));
  };
  const bills = [{ id: 'b1', name: 'TNB' }, { id: 'b-2', name: ' Unifi ', freq: 'weekly' }, { id: 'b', name: 'Rent', freq: 'yearly' }, { id: 'b3', name: '' }];
  const txs = [];
  for (let i = 0; i < 1200; i++) {
    const date = E.addDays('2026-09-30', -(i * 7) % 900), k = i % 8;
    txs.push({ id: k === 0 ? `rec-b1-${date}` : k === 1 ? `rec-b-2-${date}` : k === 2 ? `rec-b-${date}` : `t${i}`, date, type: k === 7 ? 'income' : 'expense',
      bill: k === 3 ? 'b3' : k === 4 ? 'b' : undefined, merchant: ['tnb', 'UNIFI', 'Rent ', 'Other'][i % 4], amount: 1 });
  }
  for (const r of bills) for (let d = 0; d < 900; d += 5) {
    const date = E.addDays('2026-09-30', -d);
    assert.equal(E.billPaid(r, date, txs), ref(r, date, txs), `${r.id} ${date}`);
  }
});
