// Synthetic statements in the layouts Malaysian banks and e-wallets use. Never real statements.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement, statementToTx, detectProvider, leadDate, amounts, linesFromItems } from '../js/statement.js';

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
  assert.deepEqual(r.provider, ['maybank', 'Maybank']);
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
  assert.deepEqual(r.provider, ['tng', "Touch 'n Go eWallet"]);
  assert.deepEqual(rowsOf(r), [['2026-09-27', 10000], ['2026-09-28', -1290], ['2026-09-29', -230]]);
  assert.equal(r.reconciled, true);
  const tx = statementToTx(r.rows, { accountId: 'w', now: 1 });
  assert.deepEqual(tx.map(x => [x.type, x.amount]), [['income', 10000], ['expense', 1290], ['expense', 230]]);
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
