// Saving, in the fallback storage (localStorage, used when IndexedDB is unavailable): a failed save rejects, the
// screen's data stays as it was, and the user is told. Node has no IndexedDB, so db.js falls back here by itself.
import test from 'node:test';
import assert from 'node:assert/strict';

let full = false;
console.warn = () => {};   // db.js logs each failed save
const disk = new Map();
globalThis.localStorage = { getItem: k => disk.get(k) ?? null, setItem: (k, v) => { if (full) throw new Error('QuotaExceededError'); disk.set(k, String(v)); } };
const { S, load, saveTx, deleteTx, saveAccount, setKv, savePhoto, getPhoto, replaceAll, onSaveFailed } = await import('../js/state.js');
const tx = id => ({ id, date: '2026-09-01', type: 'expense', amount: 500, accountId: 'a', category: 'dining' });

test('a failed save rejects, leaves the data on screen as it was, and tells the user', async () => {
  assert.equal(await load(), 'localstorage');
  let told = 0;
  onSaveFailed(() => told++);
  await saveAccount({ id: 'a', name: 'Cash', kind: 'cash', opening: 0 });
  await saveTx(tx('t1'));
  full = true;
  await assert.rejects(saveTx(tx('t2')));
  await assert.rejects(deleteTx('t1'));
  await assert.rejects(setKv('rules', { TEH: 'dining' }));
  assert.equal(await savePhoto('p1', 'jpeg bytes'), false);
  assert.equal(told, 4);
  assert.deepEqual(S.tx.map(t => t.id), ['t1']);
  assert.deepEqual(S.kv.rules, {});
  full = false;
  await load();   // what really reached storage
  assert.deepEqual(S.tx.map(t => t.id), ['t1']);
  assert.equal(await getPhoto('p1'), null);
});

test('"Replace everything" also removes old photos and the settings a backup carries', async () => {
  await setKv('rules', { TEH: 'dining' });
  await setKv('budgets', { total: 5000, byCat: {} });
  assert.equal(await savePhoto('p_old', 'jpeg bytes'), true);
  await replaceAll({ accounts: [{ id: 'b', name: 'Bank', kind: 'bank', opening: 0 }], tx: [], recurring: [], kv: { dismissed: ['x'] } });
  assert.deepEqual(S.accounts.map(a => a.id), ['b']);
  assert.deepEqual(S.kv.rules, {});
  assert.deepEqual(S.kv.budgets, { total: 0, byCat: {} });
  assert.deepEqual(S.kv.dismissed, ['x']);
  assert.equal(await getPhoto('p_old'), null);
});
