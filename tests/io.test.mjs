// Synthetic files only.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as IO from '../js/io.js';

test('money-app CSV export: columns guessed, type column wins, categories mapped', () => {
  const csv = 'Date,Category,Amount,Income/Expense,Note\n28/09/2026,Food & Drinks,12.90,Expense,Nasi lemak\n27/09/2026,Salary,3500.00,Income,September pay\n26/09/2026,Transportation,50,Expense,Petronas';
  const [head, ...rows] = IO.parseCSV(csv);
  const map = IO.guessMapping(head);
  assert.deepEqual(map, { date: 0, type: 3, category: 1, note: 4, amount: 2 });
  const { txs, skipped } = IO.rowsToTx(rows, map, { accountId: 'cash', now: 1 });
  assert.equal(skipped.length, 0);
  assert.deepEqual(txs.map(t => [t.date, t.type, t.amount, t.category, t.merchant]), [
    ['2026-09-28', 'expense', 1290, 'dining', 'Nasi lemak'],
    ['2026-09-27', 'income', 350000, 'salary', 'September pay'],
    ['2026-09-26', 'expense', 5000, 'transport', 'Petronas'],
  ]);
});

test('bank statement: debit/credit columns, semicolons, bad rows skipped with a reason', () => {
  const csv = 'Transaction Date;Description;Debit;Credit;Balance\n01-09-2026;DUITNOW TO ALI;150.00;;1000.00\n02-09-2026;SALARY SEPT;;4,200.00;5200.00\n31-02-2026;BAD DATE;1.00;;\n03-09-2026;NO AMOUNT;;;';
  const [head, ...rows] = IO.parseCSV(csv);
  const map = IO.guessMapping(head);
  assert.equal(map.debit, 2); assert.equal(map.credit, 3); assert.equal(map.note, 1);
  const { txs, skipped } = IO.rowsToTx(rows, map, { accountId: 'bank', source: 'statement' });
  assert.deepEqual(txs.map(t => [t.type, t.amount]), [['expense', 15000], ['income', 420000]]);
  assert.deepEqual(skipped.map(s => s.why), ['date', 'amount']);
});

test('Chinese headers and signed amounts', () => {
  const [head, ...rows] = IO.parseCSV('日期,类别,金额,备注\n2026/9/28,餐饮,-18.50,午餐\n2026年9月27日,工资,3000,九月');
  const { txs } = IO.rowsToTx(rows, IO.guessMapping(head), { accountId: 'a' });
  assert.deepEqual(txs.map(t => [t.date, t.type, t.amount, t.category]), [['2026-09-28', 'expense', 1850, 'dining'], ['2026-09-27', 'income', 300000, 'salary']]);
});

test('fileDate formats', () => {
  assert.equal(IO.fileDate('46293'), '2026-09-28'); // Excel serial
  assert.equal(IO.fileDate('28 Sep 2026'), '2026-09-28');
  assert.equal(IO.fileDate('28 Mac 2026'), '2026-03-28');
  assert.equal(IO.fileDate('13/13/2026'), null);
  assert.equal(IO.fileDate('hello'), null);
});

// A tiny .xlsx built by hand: shared strings, an inline string, a number and an Excel date serial.
async function makeXlsx() {
  const enc = s => new TextEncoder().encode(s);
  const deflate = async u8 => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  const files = [
    ['xl/sharedStrings.xml', enc('<sst><si><t>Date</t></si><si><t>Amount</t></si><si><t>Note</t></si><si><r><t>Kopi </t></r><r><t>O &amp; roti</t></r></si></sst>'), 0],
    ['xl/worksheets/sheet1.xml', await deflate(enc('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2"><v>46293</v></c><c r="B2"><v>-6.5</v></c><c r="C2" t="s"><v>3</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>27/09/2026</t></is></c><c r="C3" t="inlineStr"><is><t>no amount</t></is></c></row></sheetData></worksheet>')), 8],
  ];
  const parts = [], central = [];
  let off = 0;
  for (const [name, data, method] of files) {
    const n = enc(name), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(8, method, true); h.setUint32(18, data.length, true); h.setUint16(26, n.length, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(10, method, true); c.setUint32(20, data.length, true); c.setUint16(28, n.length, true); c.setUint32(42, off, true);
    parts.push(new Uint8Array(h.buffer), n, data); central.push(new Uint8Array(c.buffer), n);
    off += 30 + n.length + data.length;
  }
  const cdSize = central.reduce((s, x) => s + x.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  return new Uint8Array(await new Blob([...parts, ...central, new Uint8Array(e.buffer)]).arrayBuffer());
}

test('xlsx: read without a library, routed by content not name', async () => {
  const rows = await IO.fileToRows('whatever.csv', (await makeXlsx()).buffer);
  assert.deepEqual(rows, [['Date', 'Amount', 'Note'], ['46293', '-6.5', 'Kopi O & roti'], ['27/09/2026', '', 'no amount']]);
  const { txs, skipped } = IO.rowsToTx(rows.slice(1), IO.guessMapping(rows[0]), { accountId: 'a' });
  assert.deepEqual(txs.map(t => [t.date, t.amount, t.merchant]), [['2026-09-28', 650, 'Kopi O & roti']]);
  assert.equal(skipped.length, 1);
  await assert.rejects(IO.fileToRows('x.xls', new Uint8Array([0xd0, 0xcf, 0x11]).buffer), /\.xls/);
});

test('Google Sheets link → CSV export URL', () => {
  assert.equal(IO.sheetCsvUrl('https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=42'),
    'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/export?format=csv&gid=42');
  assert.equal(IO.sheetCsvUrl('https://evil.example/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz'), null);
  assert.equal(IO.sheetCsvUrl('javascript:alert(1)'), null);
});

test('CSV export is formula-safe with a BOM and one row per receipt item', () => {
  const csv = IO.toCSV([
    { date: '2026-09-28', type: 'expense', amount: 2000, accountId: 'a', merchant: '=HYPERLINK("x")', category: 'dining', items: [{ name: '@SUM(1)', cents: 1500, category: 'dining' }, { name: 'Air', cents: 500, category: 'groceries' }] },
  ], [{ id: 'a', name: 'Cash' }]);
  assert.ok(csv.startsWith('﻿'));
  const lines = csv.slice(1).split('\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[1].includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(lines[1].includes("'@SUM(1)"));
});

test('backup round trip; hostile or broken entries dropped; merge keeps local', () => {
  const good = { accounts: [{ id: 'a', name: 'Cash', kind: 'cash', opening: 1000 }], tx: [{ id: 't1', date: '2026-09-01', type: 'expense', amount: 500, accountId: 'a', category: 'dining', items: [{ name: 'Teh', cents: 500, category: 'dining' }] }], recurring: [], kv: { budgets: { total: 100000, byCat: { dining: 30000, hacked: 5 } }, rules: { TEH: 'dining' } } };
  const back = IO.readBackup(IO.makeBackup(good));
  assert.equal(back.tx.length, 1);
  assert.deepEqual(back.kv.budgets.byCat, { dining: 30000 });
  const evil = JSON.parse(IO.makeBackup(good));
  evil.tx.push({ id: 'x', date: '2026-02-30', type: 'expense', amount: 1, accountId: 'a' }, { id: 'y', date: '2026-09-01', type: 'expense', amount: -5, accountId: 'a' },
    { id: 'z', date: '2026-09-01', type: 'expense', amount: 1e15, accountId: 'a' }, { id: 'w', date: '2026-09-01', type: 'transfer', amount: 5, accountId: 'a', toAccountId: 'nope' },
    { id: 'n', date: '2026-09-01', type: 'expense', amount: 5, accountId: 'a', merchant: '<img src=x onerror=alert(1)>‮' });
  const r = IO.readBackup(JSON.stringify(evil));
  assert.deepEqual(r.tx.map(t => t.id), ['t1', 'n']);
  assert.equal(r.dropped, 4);
  assert.ok(!/‮/.test(r.tx[1].merchant)); // hidden bidi character removed (HTML is escaped at render)
  assert.throws(() => IO.readBackup('{"app":"other"}'), /not a Tally backup/);
  assert.throws(() => IO.readBackup('nope'), /not valid JSON/);
  const merged = IO.mergeBackup({ accounts: good.accounts, tx: [{ ...good.tx[0], note: 'local edit' }], recurring: [], kv: { rules: { TEH: 'groceries' } } }, back);
  assert.equal(merged.tx.length, 1);
  assert.equal(merged.tx[0].note, 'local edit');
  assert.equal(merged.kv.rules.TEH, 'groceries');
});

test('statement Balance column gives a new account its opening balance, oldest-first or newest-first', () => {
  const rows = [['Date', 'Description', 'Debit', 'Credit', 'Balance'], ['01/09/2026', 'CARD PURCHASE NASI LEMAK ANTARABANGSA', '59.53', '', '4,140.47'], ['03/09/2026', 'JOMPAY PETRONAS', '202.69', '', '3,937.78'], ['05/09/2026', 'SALARY', '', '3,000.00', '6,937.78'], ['09/10/2026', 'FPX TNB', '100.00', '', '6,837.78']];
  const map = IO.guessMapping(rows[0]);
  assert.equal(map.balance, 4);
  const { txs } = IO.rowsToTx(rows.slice(1), map, { accountId: 'a' });
  assert.equal(txs[0].merchant, 'Nasi Lemak Antarabangsa');   // shouting bank text reads as a name
  assert.equal(IO.openingFromBalance(rows.slice(1), map, txs, '2026-09-29'), 420000);   // 4,140.47 + 59.53
  const desc = [rows[0], ...rows.slice(1).reverse()];
  assert.equal(IO.openingFromBalance(desc.slice(1), map, IO.rowsToTx(desc.slice(1), map, { accountId: 'a' }).txs, '2026-09-29'), 420000);
  assert.equal(IO.openingFromBalance(rows.slice(1), { ...map, balance: undefined }, txs, '2026-09-29'), null);
  assert.equal(IO.cleanDesc('DUITNOW QR TNB'), 'TNB');
});

test('title rows above the header are skipped', () => {
  const rows = IO.parseCSV('Family Budget 2026,,,\nPrepared by Priya,,,\n,,,\nDate,Category,Amount (RM),Notes\n01/07/2026,Bills,159.73,Unifi\n');
  assert.equal(IO.headerRow(rows), 2);   // the blank row is dropped by the parser
  assert.equal(IO.headerRow([['Date', 'Amount'], ['01/07/2026', '5.00']]), 0);
});

test('photo backup zip: written stored, read back byte for byte', async () => {
  const photo = new Uint8Array(5000).map((_, i) => (i * 31) & 255);
  const blob = IO.zipStore([{ name: IO.BACKUP_JSON, data: new TextEncoder().encode('{"app":"tally"}') }, { name: 'photos/p_1.jpg', data: photo }]);
  const out = await IO.unzip(await blob.arrayBuffer(), () => true);
  assert.equal(new TextDecoder().decode(out[IO.BACKUP_JSON]), '{"app":"tally"}');
  assert.deepEqual([...out['photos/p_1.jpg']], [...photo]);
});
