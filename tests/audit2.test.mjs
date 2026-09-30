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
