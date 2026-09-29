// Money Manager (.mmbackup) import, against synthetic SQLite files made with the vendored sql.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { zipStore, okId } from '../js/io.js';
import { readMoneyManager } from '../js/mmimport.js';

// sql-wasm.js is a UMD script: run it with a CommonJS module object (the browser gets window.initSqlJs instead).
const VENDOR = fileURLToPath(new URL('../vendor/', import.meta.url));
const mod = { exports: {} };
new Function('module', 'exports', 'require', '__dirname', readFileSync(VENDOR + 'sql-wasm.js', 'utf8'))(mod, mod.exports, createRequire(VENDOR), VENDOR);
const SQL = await mod.exports({ wasmBinary: readFileSync(VENDOR + 'sql-wasm.wasm') });

const TX = 'create table "transaction"(uid, type, amountInAccountCurrency, date, comment, created, isRemoved);';
const REST = `create table account(uid, title, currencyCode, created, isRemoved); create table account_balance(uid, value);
  create table category(uid, title, type, color, isRemoved); create table sync_link(entityUid, entityType, otherType, otherUid, isRemoved);`;
async function backup(sql) {
  const db = new SQL.Database();
  db.exec(sql);
  const data = db.export();
  db.close();
  return new Uint8Array(await zipStore([{ name: 'MyFinance.db', data }]).arrayBuffer());
}

test('hostile uids become safe ids, links cannot pollute Object.prototype, balances and custom categories are bounded', async () => {
  const cats = Array.from({ length: 60 }, (_, i) => `('k${i}', 'Zqx ${i}', 'Expense', 0, 0)`).join(',');
  const mm = await readMoneyManager(await backup(`${TX}${REST}
    insert into account values ('acc"><img src=x>', 'Bank', 'MYR', '2026-01-01', 0), ('__proto__', 'Cash', 'MYR', '2026-01-01', 0);
    insert into account_balance values ('acc"><img src=x>', 999999999999999), ('__proto__', 500);
    insert into category values ${cats};
    insert into "transaction" values ('t\r\nATTACH:x', 'Expense', 250, '2026-09-01', 'Kopi', '2026-09-01T01:00:00Z', 0), ('__proto__', 'Expense', 100, '2026-09-02', 'Roti', '2026-09-02T01:00:00Z', 0);
    insert into sync_link values ('t\r\nATTACH:x', 'Transaction', 'Account', 'acc"><img src=x>', 0), ('t\r\nATTACH:x', 'Transaction', 'Category', 'k1', 0),
      ('__proto__', 'Transaction', 'Account', '__proto__', 0), ('__proto__', 'Transaction', 'polluted', 'yes', 0), ('__proto__', 'Transaction', 'Category', 'k2', 0);`), SQL);
  assert.equal({}.polluted, undefined);
  assert.equal(mm.tx.length, 2);
  for (const x of [...mm.tx.map(t => t.id), ...mm.tx.map(t => t.accountId), ...mm.accounts.map(a => a.id)]) assert.ok(okId(x), x);
  assert.deepEqual(mm.accounts.map(a => a.opening), [0, 600]);   // RM 10 trillion is out of range; 500 + 100 spent
  assert.equal(mm.customCats.length, 50);
});

test('only real tables are read: a view or a computed column in their place is refused', async () => {
  const view = `create table t0(uid, type, amountInAccountCurrency, date, comment, created, isRemoved); create view "transaction" as select * from t0; ${REST}`;
  const generated = `create table "transaction"(uid, type, amountInAccountCurrency, date, comment, created, isRemoved, x as (length(zeroblob(1000000000)))); ${REST}`;
  for (const sql of [view, generated]) await assert.rejects(readMoneyManager(await backup(sql), SQL), /version Tally does not know/);
});
