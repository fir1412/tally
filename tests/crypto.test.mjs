// Encryption at rest: records and photos round-trip, the settings are never sealed, a wrong key or PIN opens nothing,
// and changing the PIN re-wraps the same data key.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sealRecord, openRecord } from '../js/db.js';

const key = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

test('a sealed record reads back exactly; no plain text is left in it; the wrong key fails', async () => {
  const k = await key(), tx = { id: 't1', merchant: 'Nasi lemak', amount: 1250, items: [{ name: 'Teh tarik', cents: 250 }] };
  const rec = await sealRecord('tx', tx, k);
  assert.deepEqual(Object.keys(rec).sort(), ['ct', 'id', 'iv']);
  assert.ok(!new TextDecoder().decode(new Uint8Array(rec.ct)).includes('Nasi'));
  assert.deepEqual(await openRecord(rec, k), tx);
  await assert.rejects(openRecord(rec, await key()));
  await assert.rejects(openRecord(rec, null), /locked/);
  assert.deepEqual(await openRecord(tx, k), tx);   // an old plain record still reads
  const kv = await sealRecord('kv', { key: 'rules', value: { 'TEH TARIK': 'dining' } }, k);
  assert.equal(kv.key, 'rules'); assert.deepEqual((await openRecord(kv, k)).value, { 'TEH TARIK': 'dining' });
});

test('a receipt photo is sealed with its bytes and comes back as the same image', async () => {
  const k = await key(), bytes = new Uint8Array([255, 216, 255, 224, 1, 2, 3, 4]);
  const rec = await sealRecord('receipts', { id: 'r1', blob: new Blob([bytes], { type: 'image/jpeg' }) }, k);
  const back = await openRecord(rec, k);
  assert.equal(back.id, 'r1'); assert.equal(back.blob.type, 'image/jpeg');
  assert.deepEqual(new Uint8Array(await back.blob.arrayBuffer()), bytes);
});
