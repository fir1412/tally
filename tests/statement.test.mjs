// Synthetic statements in the layouts Malaysian banks and e-wallets use. Never real statements.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement, statementToTx, detectProvider, guessKind, PAGE_BREAK, leadDate, amounts, linesFromItems } from '../js/statement.js';

const rowsOf = r => r.rows.map(x => [x.date, x.amount]);

test('Maybank style: year-less dates, trailing - and +, beginning/ending balance', () => {
  const r = parseStatement(`MALAYAN BANKING BERHAD (Maybank)
STATEMENT DATE : 30/09/26
ENTRY DATE  TRANSACTION DESCRIPTION  TRANSACTION AMOUNT  STATEMENT BALANCE
BEGINNING BALANCE  4,200.00
01/09  SALE DEBIT  NASI KANDAR PELITA  25.50-  4,174.50
02/09  FUND TRANSFER TO A/C  ALI BIN AHMAD  150.00-  4,024.50
25/09  IBG CREDIT  ACME SDN BHD SALARY  5,200.00+  9,224.50
ENDING BALANCE :  9,224.50`.split('\n'));
  assert.deepEqual(r.provider, ['maybank', 'Maybank', 'bank']);
  assert.deepEqual(rowsOf(r), [['2026-09-01', -2550], ['2026-09-02', -15000], ['2026-09-25', 520000]]);
  assert.equal(r.reconciled, true);
});

test('CIMB style: withdrawal/deposit columns, sign from the running balance, wrapped descriptions', () => {
  const r = parseStatement(`CIMB Bank Berhad
Statement period 01/09/2026 - 30/09/2026
Date  Description  Withdrawal (RM)  Deposit (RM)  Balance (RM)
OPENING BALANCE  1,000.00
01/09/2026  DUITNOW QR  150.00  850.00
   TEALIVE SS15
03/09/2026  REFUND  20.00  870.00
05/09/2026  CARD PURCHASE  30.10  839.90
CLOSING BALANCE  839.90`.split('\n'));
  assert.deepEqual(rowsOf(r), [['2026-09-01', -15000], ['2026-09-03', 2000], ['2026-09-05', -3010]]);
  assert.match(r.rows[0].desc, /DUITNOW QR TEALIVE SS15/);
  assert.equal(r.reconciled, true);
});

test('Public Bank style: DR/CR markers and month names', () => {
  const r = parseStatement(`PUBLIC BANK BERHAD
Balance From Last Statement  500.00
02 SEP 2026  DEBIT CARD 99 SPEEDMART  45.20 DR  454.80
10 SEP 2026  INTEREST  0.35 CR  455.15`.split('\n'));
  assert.deepEqual(rowsOf(r), [['2026-09-02', -4520], ['2026-09-10', 35]]);
  assert.equal(r.reconciled, true);
});

test("Touch 'n Go eWallet style: signed RM amounts, wallet balance, failed rows skipped", () => {
  const r = parseStatement(`TNG Digital Sdn Bhd  Touch 'n Go eWallet Transaction History
Date  Status  Transaction Type  Reference  Description  Amount (RM)  Wallet Balance
27/09/2026 10:02  Success  Reload  TOPUP8123  Reload via FPX  +RM100.00  RM100.00
28/09/2026 12:41  Success  Payment  P88121  ZUS COFFEE SS2  -RM12.90  RM87.10
28/09/2026 13:00  Failed  Payment  P88122  GRAB  -RM5.00  RM87.10
29/09/2026 08:15  Success  Payment  P88130  TOLL PLUS  -RM2.30  RM84.80`.split('\n'));
  assert.deepEqual(r.provider, ['tng', "Touch 'n Go", 'ewallet']);
  assert.deepEqual(rowsOf(r), [['2026-09-27', 10000], ['2026-09-28', -1290], ['2026-09-29', -230]]);
  assert.equal(r.reconciled, true);
  const tx = statementToTx(r.rows, { accountId: 'w', now: 1 });
  assert.deepEqual(tx.map(x => [x.type, x.amount]), [['income', 10000], ['expense', 1290], ['expense', 230]]);
});

test("Touch 'n Go PDF with the date, the row and the time on separate lines keeps names and times", () => {
  const r = parseStatement(`TNG Digital Sdn Bhd  Touch 'n Go eWallet Transaction History
Date  Status  Transaction Type  Reference  Description  Amount (RM)  Wallet Balance
01/09/2026
Success  Reload  TOPUP812  Reload via FPX Maybank  +RM100.00  RM105.80
09:10
02/09/2026
Success  Payment  REF7  7-Eleven Seksyen 7  -RM8.60  RM97.20
22:05
03/09/2026
Failed  Payment  REF8  GrabFood  -RM20.00  RM97.20
13:00`.split('\n'));
  assert.deepEqual(rowsOf(r), [['2026-09-01', 10000], ['2026-09-02', -860]]);
  assert.ok(/Reload via FPX Maybank/.test(r.rows[0].desc) && /7-Eleven Seksyen 7/.test(r.rows[1].desc), r.rows.map(x => x.desc).join(' | '));
});

test('GXBank style digital bank: no balance column, signs and words decide', () => {
  const r = parseStatement(`GXBank Account statement September 2026
01 Sep 2026  Transfer to Siti  -RM50.00
02 Sep 2026  Daily interest  +RM0.12
03 Sep 2026  Salary from ACME  RM3,000.00
04 Sep 2026  Shopee payment  RM40.00`.split('\n'));
  assert.deepEqual(rowsOf(r), [['2026-09-01', -5000], ['2026-09-02', 12], ['2026-09-03', 300000], ['2026-09-04', -4000]]);
});

test('year-less dates across New Year belong to the right year; amounts on the next line', () => {
  const r = parseStatement(`RHB Bank
Statement Date 05/01/27
Opening balance 100.00
28/12  CARD PURCHASE MYDIN
   10.00-  90.00
02/01  JOMPAY TNB  40.00-  50.00`.split('\n'));
  assert.deepEqual(rowsOf(r), [['2026-12-28', -1000], ['2027-01-02', -4000]]);
  assert.equal(r.reconciled, true);
});

test('helpers: providers, dates, money tokens, pdf.js line grouping', () => {
  for (const [s, id] of [['Hong Leong Bank Berhad', 'hongleong'], ['AmBank (M) Berhad', 'ambank'], ['BANK ISLAM MALAYSIA', 'bankislam'], ['AEON Bank', 'aeonbank'], ['Boost Bank Berhad', 'boostbank'], ['Standard Chartered', 'scb']])
    assert.equal(detectProvider(s)?.[0], id, s);
  assert.deepEqual(leadDate('01SEP26 X'), { d: 1, m: 9, y: 2026, len: 7 });
  assert.equal(leadDate('1234.00 not a date'), null);
  assert.deepEqual(amounts('REF 00123 12.50- 1,000.00').map(a => [a.sen, a.sign]), [[1250, -1], [100000, 0]]);
  assert.deepEqual(amounts('(4.20)').map(a => a.sign), [-1]);
  assert.deepEqual(linesFromItems([{ str: '12.50', transform: [0, 0, 0, 0, 300, 700] }, { str: '01/09', transform: [0, 0, 0, 0, 20, 701] }, { str: 'Header', transform: [0, 0, 0, 0, 20, 760] }]), ['Header', '01/09  12.50']);
});

test('provider: the header decides; a bank beats a wallet named only in the transactions; kinds', () => {
  const mb = `PENYATA AKAUN / STATEMENT OF ACCOUNT
Maybank Islamic  TARIKH PENYATA: 28/09/26
LOT 22, JALAN HOSPITAL, 15200 KOTA BHARU
ENTRY DATE  TRANSACTION DESCRIPTION  TRANSACTION AMOUNT  STATEMENT BALANCE
BEGINNING BALANCE  1,842.30
01/09/26  TRANSFER TO TNG DIGITAL SDN BHD RELOAD  100.00-  1,742.30`.split('\n');
  assert.deepEqual(detectProvider(mb), ['maybank', 'Maybank', 'bank']);
  assert.deepEqual(detectProvider(['Statement', '01/09/26  TRANSFER TO TNG DIGITAL RELOAD  100.00-  1,742.30', '02/09/26  MAYBANK2U  5.00-  1,737.30']), ['maybank', 'Maybank', 'bank']);
  assert.deepEqual(detectProvider("Touch 'n Go eWallet\nTransaction History\n01/09/2026 07:52  Success  Reload  Reload via Maybank  +RM100.00  RM103.80"), ['tng', "Touch 'n Go", 'ewallet']);
  assert.deepEqual(detectProvider('CIMB Bank\nCredit Card Statement'), ['cimb', 'CIMB', 'card']);
  assert.deepEqual(detectProvider(['tng sep2026']), ['tng', "Touch 'n Go", 'ewallet']);   // a file name
  assert.deepEqual(['Cash', 'TNG', 'Card', 'Maybank', 'GrabPay', 'Kad kredit CIMB', 'E-wallet'].map(guessKind), ['cash', 'ewallet', 'card', 'bank', 'ewallet', 'card', 'ewallet']);
});

test('multi-page statements: first opening, last closing, no page header or footer in the names', () => {
  const r = parseStatement(['PENYATA AKAUN', 'Bank Rakyat  Tarikh Penyata : 31 Ogo 2026', 'BAKI AWAL  1,182.62',
    '01 Ogo 2026  PINDAHAN DANA KE SITI  296.75  0.00  885.87', '09 Ogo 2026  PINDAHAN DANA DARI ALI  0.00  214.09  1,099.96', 'BAKI DIBAWA KE HADAPAN  1,099.96', PAGE_BREAK,
    'PENYATA AKAUN', 'Bank Rakyat  Tarikh Penyata : 31 Ogo 2026', 'Halaman 2 / 2', 'BAKI DIBAWA DARI HALAMAN SEBELUM  1,099.96',
    '12 Ogo 2026  PENGELUARAN ATM  350.84  0.00  749.12', 'BAKI AKHIR  749.12', 'This is a computer generated statement. No signature is required.']);
  assert.deepEqual([r.opening, r.closing, r.reconciled], [118262, 74912, true]);
  assert.deepEqual(r.rows.map(x => x.desc), ['PINDAHAN DANA KE SITI', 'PINDAHAN DANA DARI ALI', 'PENGELUARAN ATM']);
  const p = parseStatement(['Public Bank', 'Balance From Last Statement  100.00', '01 Aug  CARD PURCHASE GSC  10.00  90.00', PAGE_BREAK, 'STATEMENT OF ACCOUNT', 'Public Bank  Statement Date : 31 Aug 2026', 'Balance B/F  90.00', '02 Aug  SHOPEE  5.00  85.00', 'Grab ride', 'This is a computer generated statement.']);
  assert.deepEqual([p.opening, p.closing, p.reconciled, p.rows.map(x => x.desc)], [10000, 8500, true, ['CARD PURCHASE GSC', 'SHOPEE Grab ride']]);
});

test('a value date and a time after the date leave the name; the time is kept', () => {
  const r = parseStatement(['OCBC Bank', '25/08/2026  25 AUG 2026  POS PURCHASE TESCO EXTRA  12.00  88.00', '26/08/2026 8:03 PM  GrabFood - McDonald\'s  -RM5.00  RM83.00']);
  assert.deepEqual(r.rows.map(x => [x.date, x.time ?? null, x.desc]), [['2026-08-25', null, 'POS PURCHASE TESCO EXTRA'], ['2026-08-26', '20:03', "GrabFood - McDonald's"]]);
  const tx = statementToTx(parseStatement(["Touch 'n Go eWallet", '01/09/2026 07:52  Success  Payment  7-Eleven Jln Hospital  -RM8.60  RM3.80']).rows, { accountId: 'w', now: 1 });
  assert.deepEqual([tx[0].time, tx[0].merchant, tx[0].category], ['07:52', '7-Eleven Jln Hospital', 'groceries']);
});
