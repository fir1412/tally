// Import fixes from the user simulations: headers in Chinese and Malay, workbook tabs, spending-only sheets, the same
// ledger from two formats, other currencies, wallet reloads, amounts too large, balances typed at setup. Synthetic data.
process.env.TZ = 'Asia/Kuala_Lumpur';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as IO from '../js/io.js';
import * as E from '../js/engine.js';
import { readMoneyManager, readRealbyte } from '../js/mmimport.js';

const run = (csv, opts = {}) => { const [h, ...rows] = IO.parseCSV(csv), map = IO.guessMapping(h); return { map, rows, ...IO.rowsToTx(rows, map, { accountId: 'a', now: 1, ...opts }) }; };

test('Chinese and Malay headers map by themselves; a 结余 / Baki column works out the opening balance', () => {
  const zh = run('日期,摘要,收入,支出,结余,备注,类别,账户\n2026-09-01,工资,3000,,3500,九月,工资,Maybank\n2026-09-02,午餐,,15,3485,,饮食,Maybank');
  assert.deepEqual(zh.map, { date: 0, balance: 4, debit: 3, credit: 2, category: 6, merchant: 1, note: 5, account: 7 });
  assert.deepEqual(zh.txs.map(t => [t.type, t.amount, t.merchant, t.category]), [['income', 300000, '工资', 'salary'], ['expense', 1500, '午餐', 'dining']]);
  assert.equal(IO.openingFromBalance(zh.rows, zh.map, zh.txs, '2026-09-30'), 50000);
  assert.deepEqual(IO.guessMapping(['日期', '说明', '金额', '余额', '分类']), { date: 0, balance: 3, category: 4, merchant: 1, amount: 2 });
  assert.deepEqual(IO.guessMapping(['Tarikh', 'Perkara', 'Masuk', 'Keluar', 'Baki', 'Kategori', 'Akaun']), { date: 0, balance: 4, debit: 3, credit: 2, category: 5, merchant: 1, account: 6 });
  assert.deepEqual(IO.guessMapping(['Tarikh', 'Butiran', 'Jumlah']), { date: 0, merchant: 1, amount: 2 });
  assert.equal(IO.guessMapping(['Date', 'Details', 'Amount', 'Balance carried']).balance, 3);   // the partial "balance" match works again
});

// A workbook with tabs, built by hand (stored zip entries, inline strings).
async function book(tabs) {
  const cell = (v, r, c) => (v === '' ? '' : typeof v === 'number' ? `<c r="${'ABCDEFGH'[c]}${r}"><v>${v}</v></c>` : `<c r="${'ABCDEFGH'[c]}${r}" t="inlineStr"><is><t>${v}</t></is></c>`);
  const ws = rows => `<worksheet><sheetData>${rows.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => cell(v, i + 1, j)).join('')}</row>`).join('')}</sheetData></worksheet>`;
  const enc = s => new TextEncoder().encode(s);
  const files = [
    { name: 'xl/workbook.xml', data: enc(`<workbook><sheets>${tabs.map(([n], i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="r${i}"/>`).join('')}</sheets></workbook>`) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc(`<Relationships>${tabs.map((_, i) => `<Relationship Id="r${i}" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`) },
    ...tabs.map(([, rows], i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc(ws(rows)) })),
  ];
  return new Uint8Array(await IO.zipStore(files).arrayBuffer()).buffer;
}
test('workbook tabs: one extra, one missing or reordered columns are read by their own header; a skipped tab says why', async () => {
  const rows = await IO.fileToRows('budget.xlsx', await book([
    ['Jan', [['Date', 'Item', 'Amount', 'Category'], ['01/01/2026', 'Nasi lemak', 6.5, 'Food']]],
    ['Feb', [['Date', 'Amount', 'Item', 'Category', 'Notes'], ['01/02/2026', 12, 'Roti canai', 'Food', 'with teh']]],   // reordered, one extra
    ['Mar', [['Date', 'Item', 'Amount'], ['01/03/2026', 'Petrol', 50]]],                                                   // one missing
    ['Summary', [['Category', 'Total'], ['Food', 18.5]]],
  ]));
  assert.deepEqual(rows.tabs, { read: ['Jan', 'Feb', 'Mar'], skipped: [{ name: 'Summary', why: 'columns' }] });
  assert.deepEqual(rows[0], ['Date', 'Item', 'Amount', 'Category', 'Notes']);
  const map = IO.guessMapping(rows[0]), { txs } = IO.rowsToTx(rows.slice(1), map, { accountId: 'a' });
  assert.deepEqual(txs.map(t => [t.date, t.merchant, t.amount, t.note]), [['2026-01-01', 'Nasi lemak', 650, ''], ['2026-02-01', 'Roti canai', 1200, 'with teh'], ['2026-03-01', 'Petrol', 5000, '']]);
});

test('spending-only sheets are spending: no balance, no type column, every amount positive', () => {
  for (const csv of ['Date,Description,Amount\n01/09/2026,Nasi lemak,12.50\n02/09/2026,Salary top-up shop,8.00', 'Date\tDescription\tAmount\n01/09/2026\tTesco\tRM85.40',
    '日期,摘要,金额\n2026-09-01,午餐,15', 'Tarikh,Perkara,Jumlah\n01/09/2026,Minyak,50', 'Date,Item,Cost\n01/09/2026,Kopi,3.20']) {
    const { txs } = run(csv);
    assert.ok(txs.length && txs.every(t => t.type === 'expense'), csv);
  }
  assert.deepEqual(run('Date,Description,Amount\n01/09/2026,Kopi,-3.20\n02/09/2026,Refund,5').txs.map(t => t.type), ['expense', 'income']);   // signed: the sign decides
  assert.deepEqual(run('Date,Description,Amount,Type\n01/09/2026,Pay,3000,Income\n02/09/2026,Kopi,3,Expense').txs.map(t => t.type), ['income', 'expense']);   // a type column wins
  assert.equal(run('Date,Description,Amount,Category\n01/09/2026,September,3000,Gaji').txs[0].type, 'income');   // an income category is money in
});

test('the same ledger from two formats is caught (ids differ); a different purchase on the same day and amount is not', () => {
  const mmbak = [
    { id: 'rb_1', date: '2026-09-03', type: 'expense', amount: 1250, accountId: 'rb_a-cash', merchant: 'Nasi lemak', note: '', source: 'import' },
    { id: 'rb_2', date: '2026-09-02', type: 'transfer', amount: 10000, accountId: 'rb_a-bank', toAccountId: 'rb_a-tng', merchant: 'Reload', note: '', source: 'import' },
    { id: 'rb_3', date: '2026-09-04', type: 'expense', amount: 500, accountId: 'rb_a-cash', merchant: '', note: '', source: 'import' },
  ];
  const excel = [
    { id: 'i_x1', date: '2026-09-03', type: 'expense', amount: 1250, accountId: 'a9', merchant: 'Nasi Lemak Wanjo', note: '', source: 'import' },   // the same meal
    { id: 'i_x2', date: '2026-09-03', type: 'expense', amount: 1250, accountId: 'a9', merchant: 'Grab ride', note: '', source: 'import' },          // another purchase
    { id: 'i_x3', date: '2026-09-02', type: 'transfer', amount: 10000, accountId: 'a8', toAccountId: 'a7', merchant: 'Reload', note: '', source: 'import' },
    { id: 'i_x4', date: '2026-09-04', type: 'expense', amount: 500, accountId: 'a9', merchant: '', note: '', source: 'import' },
  ];
  const names = { 'rb_a-cash': 'Cash', 'rb_a-bank': 'Maybank', 'rb_a-tng': 'TNG', a9: 'Cash', a8: 'Maybank', a7: 'TNG' };
  const { fresh, dups } = IO.splitDups(mmbak, excel, names);
  assert.deepEqual(dups.map(x => x.id), ['i_x1', 'i_x3', 'i_x4']);
  assert.deepEqual(fresh.map(x => x.id), ['i_x2']);
  assert.equal(IO.splitDups(mmbak, excel).dups.length, 0);   // without names the accounts differ: nothing is taken
  // Two identical rows in the new file, one already here: one stays.
  assert.equal(IO.splitDups([mmbak[0]], [excel[0], { ...excel[0], id: 'i_x5' }], names).fresh.length, 1);
});

test('other currencies: kept on the account in its own currency, in the RM total at its rate, shown with their code; a backup keeps them', () => {
  const accounts = [{ id: 'm', name: 'Maybank', opening: 100000 }, { id: 's', name: 'DBS', opening: 50000, currency: 'SGD' }, { id: 'o', name: 'Other bank', opening: 0, outside: true }, { id: 'x', name: 'Odd', opening: 900, currency: 'XAF' }];
  const b = E.balances(accounts, [{ type: 'transfer', accountId: 'o', toAccountId: 'm', amount: 2000, date: '2026-09-01' }]);
  assert.deepEqual([b.total, b.by.s, b.by.o], [102000 + 50000 * E.FX_START.SGD, 50000, -2000]);   // XAF: no rate, left out
  assert.equal(E.balances([{ ...accounts[1], rate: 3.5 }], []).total, 175000);
  assert.equal(E.fmtAcct(accounts[1], 50000), 'SGD 500.00');
  assert.equal(E.fmtAcct(accounts[0], 50000), E.fmtRM(50000));
  const back = IO.readBackup(IO.makeBackup({ accounts: accounts.map(a => ({ ...a, kind: 'bank', createdAt: 1 })), tx: [], recurring: [], kv: {} }));
  assert.deepEqual(back.accounts.slice(0, 3).map(a => [a.currency, a.outside]), [[undefined, undefined], ['SGD', undefined], [undefined, true]]);
  assert.equal(IO.readBackup(JSON.stringify({ app: 'tally', v: 1, accounts: [{ id: 'x', name: 'X', currency: '<b>' }] })).accounts[0].currency, undefined);
});

const VENDOR = fileURLToPath(new URL('../vendor/', import.meta.url));
const mod = { exports: {} };
new Function('module', 'exports', 'require', '__dirname', readFileSync(VENDOR + 'sql-wasm.js', 'utf8'))(mod, mod.exports, createRequire(VENDOR), VENDOR);
const SQL = await mod.exports({ wasmBinary: readFileSync(VENDOR + 'sql-wasm.wasm') });
const sqlite = sql => { const db = new SQL.Database(); db.exec(sql); const d = db.export(); db.close(); return d; };

test('Money Manager (Innim): an SGD account keeps its currency; transfers without their accounts are counted, not imported, and balances still match', async () => {
  const db = sqlite(`create table "transaction"(uid, type, amountInAccountCurrency, date, comment, created, isRemoved);
    create table account(uid, title, currencyCode, created, isRemoved); create table account_balance(uid, value);
    create table category(uid, title, type, color, isRemoved); create table sync_link(entityUid, entityType, otherType, otherUid, isRemoved);
    create table transfer(uid, isRemoved);
    insert into account values ('b', 'Maybank', 'MYR', '2026-01-01', 0), ('s', 'DBS', 'SGD', '2026-01-01', 0);
    insert into account_balance values ('b', 90000), ('s', 20000);
    insert into category values ('c', 'Food', 'Expense', 0, 0);
    insert into "transaction" values ('t1', 'Expense', 1000, '2026-09-01', 'Kopi', '2026-09-01T01:00:00Z', 0);
    insert into sync_link values ('t1', 'Transaction', 'Account', 'b', 0), ('t1', 'Transaction', 'Category', 'c', 0);
    insert into transfer values ('x1', 0), ('x2', 0);`);
  const mm = await readMoneyManager(new Uint8Array(await IO.zipStore([{ name: 'MyFinance.db', data: db }]).arrayBuffer()), SQL);
  assert.deepEqual(mm.accounts.map(a => [a.name, a.currency]), [['Maybank', undefined], ['DBS', 'SGD']]);
  assert.deepEqual(mm.otherCurrency, ['DBS']);
  assert.equal(mm.transfersSkipped, 2);
  assert.ok(!mm.tx.some(t => t.type === 'transfer'));
  assert.deepEqual(Object.values(E.balances(mm.accounts, mm.tx).by), [90000, 20000]);   // today's balances match Money Manager
});

test('Money Manager (Innim): transfers come in when the backup names both accounts (link rows or columns); balances still match', async () => {
  const base = `create table "transaction"(uid, type, amountInAccountCurrency, date, comment, created, isRemoved);
    create table account(uid, title, currencyCode, created, isRemoved); create table account_balance(uid, value);
    create table category(uid, title, type, color, isRemoved); create table sync_link(entityUid, entityType, otherType, otherUid, isRemoved);
    insert into account values ('b', 'Maybank', 'MYR', '2026-01-01', 0), ('c', 'Cash', 'MYR', '2026-01-01', 0), ('s', 'DBS', 'SGD', '2026-01-01', 0);
    insert into account_balance values ('b', 90000), ('c', 5000), ('s', 20000);`;
  const read = async sql => readMoneyManager(new Uint8Array(await IO.zipStore([{ name: 'MyFinance.db', data: sqlite(base + sql) }]).arrayBuffer()), SQL);
  const links = await read(`create table transfer(uid, created, modified, fromAmount, fromCurrencyCode, toAmount, toCurrencyCode, date, comment, isRemoved);
    insert into transfer values ('x1', '2026-09-02T02:00:00Z', '', 20000, 'MYR', 20000, 'MYR', '2026-09-02', 'ATM', 0), ('x2', '', '', 10000, 'SGD', 34000, 'MYR', '2026-09-03', '', 0), ('x3', '', '', 500, 'MYR', 500, 'MYR', '2026-09-04', '', 0);
    insert into sync_link values ('x1', 'Transfer', 'FromAccount', 'b', 0), ('x1', 'Transfer', 'ToAccount', 'c', 0), ('x2', 'Transfer', 'FromAccount', 's', 0), ('x2', 'Transfer', 'ToAccount', 'b', 0), ('x3', 'Transfer', 'FromAccount', 'b', 0);`);
  assert.deepEqual(links.tx.map(t => [t.merchant, t.accountId.slice(-1) === links.accounts[0].id.slice(-1), t.amount, t.toAmount]), [['ATM', true, 20000, undefined], ['', false, 10000, 34000]]);
  assert.equal(links.transfersSkipped, 1);   // x3 names one account only
  assert.deepEqual(Object.values(E.balances(links.accounts, links.tx).by), [90000, 5000, 20000]);
  const cols = await read(`create table transfer(uid, fromAccount, toAccount, amount, date, isRemoved); insert into transfer values ('y1', 'b', 'c', 15000, '2026-09-05', 0);`);
  assert.deepEqual(cols.tx.map(t => [t.type, t.amount]), [['transfer', 15000]]);
  assert.deepEqual(Object.values(E.balances(cols.accounts, cols.tx).by), [90000, 5000, 20000]);
});

test('Money Manager (Realbyte): an account in another currency keeps it', async () => {
  const db = sqlite(`CREATE TABLE ASSETS (uid TEXT, NIC_NAME TEXT, currencyUid TEXT); CREATE TABLE CURRENCY (uid TEXT, ISO TEXT);
    CREATE TABLE INOUTCOME (uid TEXT, assetUid TEXT, ctgUid TEXT, ZCONTENT TEXT, ZDATE INTEGER, DO_TYPE TEXT, ZMONEY REAL);
    INSERT INTO ASSETS VALUES ('a', 'Cash', 'm'), ('b', 'Wise SGD', 's'); INSERT INTO CURRENCY VALUES ('m', 'MYR'), ('s', 'SGD');
    INSERT INTO INOUTCOME VALUES ('1', 'b', '', 'Hawker', 1788220800000, '1', 5);`);
  const mm = await readRealbyte(db, SQL);
  assert.deepEqual(mm.accounts.map(a => a.currency), [undefined, 'SGD']);
  assert.deepEqual(mm.otherCurrency, ['Wise SGD']);
});

test('a wallet reload with no bank line is a transfer, never income: from the bank it names, else a placeholder', () => {
  const accounts = [{ id: 'w', kind: 'ewallet', name: "Touch 'n Go" }, { id: 'mb', kind: 'bank', name: 'Maybank Savings' }, { id: 'c', kind: 'cash', name: 'Cash' }];
  const inc = (id, merchant, accountId = 'w') => ({ id, date: '2026-09-01', type: 'income', amount: 5000, accountId, category: 'income', merchant, note: '' });
  const out = IO.reloadTransfers([inc('1', 'Reload via FPX Maybank'), inc('2', 'Top Up via CIMB Clicks'), inc('3', 'DuitNow received from Ali'), inc('4', 'Reload', 'c')], accounts, 'other');
  assert.deepEqual(out.map(x => [x.id, x.type, x.accountId, x.toAccountId]), [['1', 'transfer', 'mb', 'w'], ['2', 'transfer', 'other', 'w']]);
  // The bank's own statement, imported later, finds the reload already here (the other side of a transfer).
  assert.equal(IO.splitDups(out, [{ id: 'm1', date: '2026-09-01', type: 'expense', amount: 5000, accountId: 'mb', merchant: 'Transfer to TNG', source: 'statement' }]).dups.length, 1);
});

test('an amount over RM 100 million says so', () => {
  for (const v of ['99999999999', '1,000,000,000', 'RM 200000000.00']) assert.ok(E.tooLarge(v), v);
  for (const v of ['', 'abc', '12.50', '-5', '100000000', '12+']) assert.ok(!E.tooLarge(v), v);
});

test('balances typed at setup stay: older imported rows shift the opening, newer ones count; history accounts are left alone', () => {
  const made = new Date(2026, 8, 20, 10).getTime();   // 20 Sep 2026, local
  const accounts = [{ id: 'bank', opening: 500000, createdAt: made }, { id: 'hist', opening: 0, createdAt: made }, { id: 'cash', opening: 20000, createdAt: made }];
  const existing = [{ id: 'q', date: '2026-09-21', type: 'expense', amount: 1000, accountId: 'bank', source: 'quick' }, { id: 'h', date: '2026-08-01', type: 'expense', amount: 700, accountId: 'hist', source: 'import' }];
  const rows = [
    { date: '2026-08-25', type: 'income', amount: 300000, accountId: 'bank' }, { date: '2026-09-01', type: 'expense', amount: 120000, accountId: 'bank' },
    { date: '2026-09-02', type: 'transfer', amount: 5000, accountId: 'bank', toAccountId: 'cash' },
    { date: '2026-09-25', type: 'expense', amount: 4000, accountId: 'bank' },   // after the account was added: a real change
    { date: '2026-09-01', type: 'expense', amount: 900, accountId: 'hist' },
  ];
  const shift = IO.typedShift(accounts, existing, rows);
  assert.deepEqual(shift, { bank: -(300000 - 120000 - 5000), cash: -5000 });
  // Today's balance is what was typed, less only what happened after the account was added.
  const all = [...existing, ...rows], opened = accounts.map(a => ({ ...a, opening: a.opening + (shift[a.id] || 0) }));
  assert.equal(E.balances(opened, all).by.bank, 500000 - 1000 - 4000);
  assert.equal(E.balances(opened, all).by.cash, 20000);
  // Marked typed (Start fresh, or its balance confirmed after an import): a second, older import is shifted too.
  const again = IO.typedShift([{ ...accounts[1], typed: true }], existing, rows);
  assert.deepEqual(again, { hist: 900 });
  assert.equal(IO.readBackup(IO.makeBackup({ accounts: [{ id: 'x', name: 'X', kind: 'bank', typed: true, createdAt: 1 }], tx: [], recurring: [], kv: {} })).accounts[0].typed, true);
});

test('JB: SGD spending counts in RM at the rate, the SGD balance stays in SGD, a transfer between the two carries both amounts', () => {
  const sgd = { id: 's', opening: 100000, currency: 'SGD', rate: 3.4 }, myr = { id: 'm', opening: 0 };
  const lunch = { id: 'a', type: 'expense', date: '2026-09-02', amount: 1250, accountId: 's', category: 'dining', items: [{ name: 'A', cents: 1000, category: 'dining' }, { name: 'B', cents: 250, category: 'dining' }] };
  const rm = E.toRM(lunch, 3.4);
  assert.deepEqual([rm.amount, rm.fx, rm.items.reduce((s, i) => s + i.cents, 0)], [4250, 1250, 4250]);   // items still add up
  const home = { id: 'b', type: 'transfer', date: '2026-09-03', amount: 50000, toAmount: 170500, accountId: 's', toAccountId: 'm' };   // S$500 → RM 1,705
  for (const txs of [[lunch, home], [rm, home]]) {   // the stored rows, or the RM view of them: same balances
    const b = E.balances([sgd, myr], txs);
    assert.deepEqual([b.by.s, b.by.m, b.total], [100000 - 1250 - 50000, 170500, Math.round(48750 * 3.4) + 170500]);
  }
  assert.equal(E.monthSpend([rm, home], '2026-09').total, 4250);   // spending in RM; the transfer is not spending
  const back = IO.readBackup(IO.makeBackup({ accounts: [sgd, myr].map(a => ({ name: a.id, kind: 'bank', createdAt: 1, ...a })), tx: [lunch, { ...home, category: 'other' }], recurring: [], kv: {} }));
  assert.deepEqual([back.accounts[0].rate, back.tx.find(x => x.id === 'b').toAmount], [3.4, 170500]);
});
