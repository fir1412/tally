// Synthetic Money Manager (Realbyte) and Money Lover files that can't be plain text: Excel exports and a .mmbak backup.
// Made-up people and money only. Used by tests/presets.test.mjs; `node tests/fixtures/make.mjs [dir]` writes them to
// disk too (for importing through the app in a browser).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { zipStore } from '../../js/io.js';

const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = i => String.fromCharCode(65 + i);
/** Rows of strings / numbers → a minimal .xlsx (inline strings, one sheet). */
export async function xlsx(rows) {
  const cells = rows.map((r, y) => `<row r="${y + 1}">${r.map((v, i) => (typeof v === 'number' ? `<c r="${col(i)}${y + 1}"><v>${v}</v></c>` : v === '' ? '' : `<c r="${col(i)}${y + 1}" t="inlineStr"><is><t>${x(v)}</t></is></c>`)).join('')}</row>`).join('');
  const enc = s => new TextEncoder().encode(s);
  const files = [
    ['[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cells}</sheetData></worksheet>`],
  ];
  return new Uint8Array(await zipStore(files.map(([name, s]) => ({ name, data: enc(s) }))).arrayBuffer());
}

// Money Manager (Realbyte) "Export to Excel": the other account of a transfer in Category, both halves listed.
export const realbyteRows = [
  ['Period', 'Accounts', 'Category', 'Subcategory', 'Note', 'MYR', 'Income/Expense', 'Description', 'Amount', 'Currency', 'Accounts'],
  ['08/31/2026 09:00:00', 'Maybank', 'Modified Bal.', '', '', 1000, 'Income', '', 1000, 'MYR', 1000],
  ['09/01/2026 09:00:00', 'Maybank', 'Salary', '', 'September pay', 3500, 'Income', '', 3500, 'MYR', 3500],
  ['09/02/2026 10:15:00', 'Maybank', 'TNG', '', 'Reload', 100, 'Transfer-Out', '', 100, 'MYR', 100],
  ['09/02/2026 10:15:00', 'TNG', 'Maybank', '', 'Reload', 100, 'Transfer-In', '', 100, 'MYR', 100],
  ['09/03/2026 12:40:00', 'Cash', 'Food', 'Breakfast', 'Nasi lemak', 12.5, 'Exp.', 'Mamak Ali', 12.5, 'MYR', 12.5],
  ['09/05/2026 18:00:00', 'Maybank', 'Cash', '', 'ATM', 200, 'Transfer-Out', '', 200, 'MYR', 200],
  ['09/05/2026 18:00:00', 'Cash', 'Maybank', '', 'ATM', 200, 'Transfer-In', '', 200, 'MYR', 200],
  ['09/13/2026 18:00:00', 'Maybank', 'Household', '', 'Tesco', 85.4, 'Exp.', '', 85.4, 'MYR', 85.4],
  ['09/14/2026 08:30:00', 'TNG', 'Transportation', '', 'Toll', 30, 'Exp.', '', 30, 'MYR', 30],
  ['09/20/2026 12:00:00', 'Cash', 'Other', '', 'Refund', 20, 'Income', '', 20, 'MYR', 20],
];
// Money Lover's older Excel export: Excel date serials, signed amounts, one wallet column.
export const moneyLoverOldRows = [
  ['No', 'Date', 'Category', 'Amount', 'Currency', 'Note', 'Wallet'],
  [1, 46266, 'Salary', 3500, 'MYR', 'September pay', 'Maybank'],
  [2, 46267, 'Outgoing Transfer', -100, 'MYR', 'Reload', 'Maybank'],
  [3, 46267, 'Incoming Transfer', 100, 'MYR', 'Reload', 'TNG'],
  [4, 46268.5277777778, 'Food & Beverage', -12.5, 'MYR', 'Nasi lemak', 'Cash'],
  [5, 46270, 'Outgoing Transfer', -200, 'MYR', 'ATM', 'Maybank'],
  [6, 46270, 'Incoming Transfer', 200, 'MYR', 'ATM', 'Cash'],
  [7, 46278, 'Houseware', -85.4, 'MYR', 'Tesco', 'Maybank'],
  [8, 46279, 'Transportation', -30, 'MYR', 'Toll', 'TNG'],
  [9, 46285, 'Other Income', 20, 'MYR', 'Refund', 'Cash'],
];

/** The vendored sql.js in Node (a UMD script: run it with a CommonJS module object). */
export async function sqlJs() {
  const VENDOR = fileURLToPath(new URL('../../vendor/', import.meta.url)), mod = { exports: {} };
  new Function('module', 'exports', 'require', '__dirname', readFileSync(VENDOR + 'sql-wasm.js', 'utf8'))(mod, mod.exports, createRequire(VENDOR), VENDOR);
  return mod.exports({ wasmBinary: readFileSync(VENDOR + 'sql-wasm.wasm') });
}
/** A Money Manager (Realbyte) Android backup database (the tables and columns Tally reads). Times are this machine's. */
export function realbyteDb(SQL) {
  const db = new SQL.Database(), at = (d, h = 12, m = 0) => new Date(2026, 7 + Math.floor(d / 100), d % 100, h, m).getTime();
  db.exec(`CREATE TABLE ASSETS (ID INTEGER PRIMARY KEY AUTOINCREMENT, NIC_NAME VARCHAR, ORDERSEQ INTEGER, uid TEXT, currencyUid TEXT, groupUid TEXT);
    CREATE TABLE CURRENCY (ID INTEGER PRIMARY KEY AUTOINCREMENT, uid VARCHAR, NAME VARCHAR, ISO VARCHAR, IS_DEL INTEGER);
    CREATE TABLE ZCATEGORY (ID INTEGER PRIMARY KEY AUTOINCREMENT, C_IS_DEL INTEGER, uid TEXT, NAME VARCHAR, TYPE INTEGER, pUid TEXT);
    CREATE TABLE INOUTCOME (AID INTEGER PRIMARY KEY, uid TEXT, assetUid TEXT, ctgUid TEXT, toAssetUid TEXT, ZCONTENT VARCHAR, ZDATE VARCHAR, WDATE VARCHAR, DO_TYPE VARCHAR, ZMONEY VARCHAR, txUidTrans TEXT, IS_DEL INTEGER);
    INSERT INTO CURRENCY (uid, NAME, ISO, IS_DEL) VALUES ('MYR_MYR', 'Ringgit', 'MYR', 0);
    INSERT INTO ASSETS (NIC_NAME, uid, currencyUid, groupUid) VALUES ('Maybank', 'a-bank', 'MYR_MYR', '1'), ('TNG', 'a-tng', 'MYR_MYR', '1'), ('Cash', 'a-cash', 'MYR_MYR', '1');
    INSERT INTO ZCATEGORY (C_IS_DEL, uid, NAME, TYPE, pUid) VALUES (NULL, 'c-sal', 'Salary', 0, '0'), (NULL, 'c-oth', 'Other', 0, '0'), (NULL, 'c-food', 'Food', 1, '0'),
      (NULL, 'c-bfast', 'Breakfast', 1, 'c-food'), (NULL, 'c-house', 'Household', 1, '0'), (NULL, 'c-tr', 'Transportation', 1, '0'), (NULL, 'c-durian', 'Durian Trips', 1, '0'), (1, 'c-gone', 'Old', 1, '0');`);
  const tx = [
    ['t0', 'a-bank', null, null, '', at(31, 9), '7', '1000'],
    ['t1', 'a-bank', 'c-sal', null, 'September pay', at(101, 9), '0', '3500'],
    ['t2', 'a-bank', null, 'a-tng', 'Reload', at(102, 10, 15), '3', '100'],
    ['t2b', 'a-tng', null, 'a-bank', 'Reload', at(102, 10, 15), '4', '100'],
    ['t3', 'a-cash', 'c-bfast', null, 'Nasi lemak', at(103, 12, 40), '1', '12.5'],
    ['t4', 'a-bank', null, 'a-cash', 'ATM', at(105, 18), '3', '200'],
    ['t4b', 'a-cash', null, 'a-bank', 'ATM', at(105, 18), '4', '200'],
    ['t5', 'a-bank', 'c-house', null, 'Tesco', at(113, 18), '1', '85.4'],
    ['t6', 'a-tng', 'c-tr', null, 'Toll', at(114, 8, 30), '1', '30'],
    ['t7', 'a-cash', 'c-oth', null, 'Refund', at(120, 12), '0', '20'],
    ['t8', 'a-cash', 'c-durian', null, 'Musang King', at(121, 19), '1', '8'],
    ['t9', 'a-cash', null, null, '', at(122, 9), '8', '5'],
  ];
  for (const [uid, a, c, to, text, ms, type, money] of tx) db.run('INSERT INTO INOUTCOME (uid, assetUid, ctgUid, toAssetUid, ZCONTENT, ZDATE, DO_TYPE, ZMONEY, IS_DEL) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)', [uid, a, c, to, text, String(ms), type, money]);
  db.run("INSERT INTO INOUTCOME (uid, assetUid, ctgUid, ZCONTENT, ZDATE, DO_TYPE, ZMONEY, IS_DEL) VALUES ('t-del', 'a-cash', 'c-food', 'Deleted', ?, '1', '999', 1)", [String(at(110))]);
  const bytes = db.export();
  db.close();
  return bytes;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = process.argv[2] || fileURLToPath(new URL('./', import.meta.url));
  writeFileSync(`${dir}/realbyte_export.xlsx`, await xlsx(realbyteRows));
  writeFileSync(`${dir}/moneylover_old.xlsx`, await xlsx(moneyLoverOldRows));
  writeFileSync(`${dir}/realbyte.mmbak`, realbyteDb(await sqlJs()));
  console.log(`wrote realbyte_export.xlsx, moneylover_old.xlsx, realbyte.mmbak to ${dir}`);
}
