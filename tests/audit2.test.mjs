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
