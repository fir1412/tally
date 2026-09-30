// Removing categories: what was in one moves to the category picked; one of Tally's is hidden (and its guesses go to
// the new one), the user's own is deleted; Other stays. In the fallback storage, as tests/state.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';

const disk = new Map();
globalThis.localStorage = { getItem: k => disk.get(k) ?? null, setItem: (k, v) => disk.set(k, String(v)), removeItem: k => disk.delete(k) };
const { S, load, saveTx, saveAccount, setKv, addCategory, expenseCats, removeCategory, bringBackCategory } = await import('../js/state.js');
const { categorize } = await import('../js/engine.js');
const { backupSettings } = await import('../js/io.js');
const ids = () => expenseCats().map(c => c.id);

test('removing one of Tally\'s categories moves its entries, bills, budget and rules, and its guesses go to the new one', async () => {
  await load();
  await saveAccount({ id: 'a', name: 'Cash', kind: 'cash', opening: 0 });
  await saveTx({ id: 't1', date: '2026-09-01', type: 'expense', amount: 900, accountId: 'a', category: 'kids', items: [{ name: 'Diapers', cents: 900, category: 'kids' }] });
  await setKv('rules', { 'BABY WIPES': 'kids' });
  await setKv('budgets', { total: 0, byCat: { kids: 5000, household: 1000 } });
  assert.equal(categorize('Drypers diaper'), 'kids');

  await removeCategory('kids', 'household');
  assert.ok(!ids().includes('kids'));
  const t1 = S.tx.find(t => t.id === 't1');
  assert.equal(t1.category, 'household'); assert.equal(t1.items[0].category, 'household');
  assert.equal(S.kv.rules['BABY WIPES'], 'household');
  assert.equal(S.kv.budgets.byCat.household, 6000);
  assert.equal(categorize('Drypers diaper'), 'household');   // no guess lands in a removed category

  await bringBackCategory('kids');
  assert.ok(ids().includes('kids'));
  assert.equal(categorize('Drypers diaper'), 'kids');
  assert.equal(S.tx.find(t => t.id === 't1').category, 'household');   // what was moved stays moved
});

test('the user\'s own category is deleted; Other and income categories can\'t be removed this way', async () => {
  await addCategory('Cat food', '#123456');
  const mine = S.kv.customCats.find(c => c.name === 'Cat food');
  await saveTx({ id: 't2', date: '2026-09-02', type: 'expense', amount: 1200, accountId: 'a', category: mine.id });
  await removeCategory(mine.id);
  assert.ok(!S.kv.customCats.some(c => c.id === mine.id));
  assert.equal(S.tx.find(t => t.id === 't2').category, 'other');
  await assert.rejects(removeCategory('other', 'dining'));
  await assert.rejects(removeCategory('dining', 'dining'));
});

test('a backup carries the removed categories, and nothing that points in a circle', () => {
  assert.deepEqual(backupSettings({ movedCats: { kids: 'household' } }), { movedCats: { kids: 'household' } });
  assert.deepEqual(backupSettings({ movedCats: { kids: 'household', household: 'kids' } }), {});
  assert.deepEqual(backupSettings({ movedCats: { other: 'dining' } }), {});
});
