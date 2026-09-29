// Saving, in the fallback storage (localStorage, used when IndexedDB is unavailable): a failed save rejects, the
// screen's data stays as it was, and the user is told. Node has no IndexedDB, so db.js falls back here by itself.
import test from 'node:test';
import assert from 'node:assert/strict';

let full = false;
console.warn = () => {};   // db.js logs each failed save
const disk = new Map();
globalThis.localStorage = { getItem: k => disk.get(k) ?? null, setItem: (k, v) => { if (full) throw new Error('QuotaExceededError'); disk.set(k, String(v)); } };
const { S, load, saveTx, deleteTx, saveAccount, setKv, savePhoto, getPhoto, replaceAll, putAll, onSaveFailed } = await import('../js/state.js');
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

test('a staged import changes accounts, transactions and settings together on success', async () => {
  await putAll({ accounts: [{ id: 'c', name: 'Wallet', kind: 'ewallet', opening: 1200 }], tx: [{ ...tx('t3'), accountId: 'c' }], kv: { settings: { onboarded: true, importSources: { file1: 'c' } } } });
  await load();
  assert.equal(S.accounts.find(a => a.id === 'c')?.opening, 1200);
  assert.equal(S.tx.find(x => x.id === 't3')?.accountId, 'c');
  assert.equal(S.kv.settings.importSources.file1, 'c');
});

test('a failed staged import does not appear in memory or on reload', async () => {
  full = true;
  await assert.rejects(putAll({ accounts: [{ id: 'd', name: 'Bank', kind: 'bank', opening: 0 }], tx: [{ ...tx('t4'), accountId: 'd' }], kv: { settings: { importSources: { file2: 'd' } } } }));
  full = false;
  assert.equal(S.accounts.some(a => a.id === 'd'), false);
  assert.equal(S.tx.some(x => x.id === 't4'), false);
  await load();
  assert.equal(S.accounts.some(a => a.id === 'd'), false);
  assert.equal(S.tx.some(x => x.id === 't4'), false);
});
