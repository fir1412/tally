// Synthetic receipts only. Never paste real receipts here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReceipt, parseDate, parseItemLines } from '../js/parse.js';

test('restaurant: service charge + SST added, rounding, payment lines ignored', () => {
  const r = parseReceipt(`
    RESTORAN MAJU JAYA
    No 12, Jalan Ampang, 50450 KL
    Tel: 03-2161 5678
    Date: 28/09/2026 13:05
    Nasi Lemak Ayam        12.90
    Teh Tarik
    2 x 3.50                7.00
    Roti Canai              2.00
    Sub Total              21.90
    Service Charge 10%      2.19
    SST 6%                  1.45
    Rounding Adj            0.01
    TOTAL                  25.55
    CASH                   30.00
    CHANGE                  4.45`);
  assert.equal(r.merchant, 'Restoran Maju Jaya');
  assert.equal(r.date, '2026-09-28');
  assert.deepEqual(r.items.map(i => [i.name, i.cents]), [['Nasi Lemak Ayam', 1290], ['Teh Tarik', 700], ['Roti Canai', 200]]);
  assert.equal(r.subtotal, 2190);
  assert.equal(r.service, 219);
  assert.equal(r.tax, 145);
  assert.equal(r.total, 2555);
  assert.deepEqual(r.check, { ok: true, mode: 'tax added', diff: 0 });
});

test('supermarket: tax codes, qty line, member discount, SST included, summary after total', () => {
  const r = parseReceipt(`
    MYDIN MART
    Tarikh: 27-09-26
    MILO ACTIV-GO 1KG      18.99 SR
    GARDENIA ORIGINAL       4.20 ZR
    TELUR AYAM GRED A
    2 X 5.90               11.80 ZR
    DISKAUN MEMBER         -2.00
    SUB-TOTAL              32.99
    SST 8% INCL             1.41
    ROUNDING ADJ            0.01
    T0TAL RM               33.00
    VISA                   33.00
    SR 8%  17.58  1.41`);
  assert.equal(r.date, '2026-09-27');
  assert.equal(r.items.length, 4);
  assert.equal(r.items[2].name, 'TELUR AYAM GRED A');
  assert.equal(r.items[3].cents, -200);
  assert.equal(r.total, 3300);
  assert.deepEqual(r.check, { ok: true, mode: 'tax included', diff: 0 });
});

test('missed item shows the gap', () => {
  const r = parseReceipt(`KEDAI RUNCIT\nSabun 4.50\nTotal 9.40`);
  assert.equal(r.check.ok, false);
  assert.equal(r.check.diff, 490);
});

test('comma decimals, RM prefix, trailing minus, total qty is not the total', () => {
  const r = parseReceipt(`99 SPEEDMART\nBeras 10kg RM 26,50\nVoucher 5.00-\nTotal Qty: 2 2.00\nGrand Total RM 21,50`);
  assert.deepEqual(r.items.map(i => i.cents), [2650, -500]);
  assert.equal(r.total, 2150);
  assert.equal(r.check.ok, true);
});

test('OCR quirks: $ for RM, junk after price, name under price, group totals, last total before payment, date at the bottom', () => {
  const r = parseReceipt(`
    KEDAI SERBANEKA ABC
    100231 2x3.00 6.00 §
    Sabun Mandi
    Total 0% supplies: 6.00
    Air Mineral $1.49 1 $1.49 :
    Total Sales Incl GST 7.49
    Rounding Adjustment 0.01
    Total Saving 0.00 Total 7.50
    Cash 10.00
    Change 2.50
    Total 99.99
    03/04/2018 10:15`);
  assert.deepEqual(r.items.map(i => [i.name, i.cents]), [['Sabun Mandi', 600], ['Air Mineral $1.49 1', 149]]);
  assert.equal(r.total, 750);
  assert.equal(r.rounding, 1);
  assert.equal(r.date, '2018-04-03');
  assert.equal(r.check.ok, true);
});

test('pack sizes are not prices, count lines are not items, OCR typos in keywords', () => {
  const r = parseReceipt(`
    KEDAI HARIAN
    Evian Mineral Water 6x1.25L
    13068320113784 53.50*1 53.50 S
    Item(s) : 1 Qty(s) : 1 0.00
    Gubtotai: 53.50
    Tota Incl.of GST 53.50
    Payment: 60.00`);
  assert.deepEqual(r.items.map(i => [i.name, i.cents]), [['Evian Mineral Water 6x1.25L', 5350]]);
  assert.equal(r.subtotal, 5350);
  assert.equal(r.total, 5350);
  assert.equal(r.check.ok, true);
});

test('dates glued to time by OCR, first valid date on the line', () => {
  assert.equal(parseDate('Date 25/12/20188:13:39PM'), '2018-12-25');
  assert.equal(parseDate('01/03/1819:14 Slip No.'), '2018-03-01');
  assert.equal(parseDate('ORD #18-REG #19-21/03/2018 19:53'), '2018-03-21');
});

test('dates: day-first, ISO, impossible dates rejected', () => {
  assert.equal(parseDate('05/03/2026'), '2026-03-05');
  assert.equal(parseDate('2026-09-01 10:00'), '2026-09-01');
  assert.equal(parseDate('31/02/2026'), null);
  assert.equal(parseDate('13/13/2026'), null);
});

test('time of purchase: 24h, AM/PM, glued to the date; plain prices and phone numbers are not times', async () => {
  const { parseTime } = await import('../js/parse.js');
  assert.equal(parseTime('Date: 28/09/2026 13:05'), '13:05');
  assert.equal(parseTime('Date 25/12/20188:13:39PM'), '20:13');
  assert.equal(parseTime('Time: 1:05 PM'), '13:05');
  assert.equal(parseTime('001, 23/03/2018 19:08:32'), '19:08');
  assert.equal(parseTime('Nasi Lemak 12.90'), null);
  assert.equal(parseTime('Tel: 03-2161 5678'), null);
  assert.equal(parseReceipt('KEDAI\n28/09/2026 12:41\nTeh 2.00\nTotal 2.00').time, '12:41');
});

test('misread "lnclusive" total, zero discount, cash and change after it, code-qty-price rows, printed company name', () => {
  const r = parseReceipt(`ah seng
KEDAI RUNCIT JAYA SDN.BHD
Date:13/03/2018
2587 1.00 PCS 48.00 50.88 SR
HAMMER 20OZ
5736 1.00SET 47.17 50.00 SR
SCREW SET 12PCS
Total Qty 2 100.88
Total Sales (Excluding GST) 95.17
Discount 0.00
Total GST 5.71
Roundlng 0.02
Total Sales(lnclusive of GsT) : 100.90
CASH: 101.00
Change : 0.10`);
  assert.equal(r.merchant, 'Kedai Runcit Jaya');   // the handwritten name above is not the shop; no Sdn Bhd
  assert.equal(r.total, 10090);
  assert.deepEqual(r.items.map(i => [i.name, i.cents]), [['HAMMER 20OZ', 5088], ['SCREW SET 12PCS', 5000]]);
  assert.ok(r.check.ok);
  assert.equal(parseReceipt('Kopi O 2.50\nItem 2 TotalwithGST@6% 2.50\nTOTAL 2.50\nCash 5.00').items.length, 1);
});

test('items typed by hand: name then price, price then name, colons, lines without a name or price reported', () => {
  assert.deepEqual(parseItemLines('Samsung phone 1299\nIkan kembung 25.50\nRM 8 sayur\nTeh ais: 2.5\nno price here\n\n12.00'), {
    items: [{ name: 'Samsung phone', cents: 129900 }, { name: 'Ikan kembung', cents: 2550 }, { name: 'sayur', cents: 800 }, { name: 'Teh ais', cents: 250 }],
    skipped: ['no price here', '12.00'] });
});

test('typed items: quantities and sums worked out, "8.-" is RM 8', () => {
  const r = parseItemLines('Eggs 2x6.20\nTelur 6.20x2\nTeh ais 2@2.50\nKuih 3*1.20\nRoti 4.5+2\n鸡蛋 2x6.20\nSayur 8.-\nMilo 2 x 3.50');
  assert.deepEqual(r.items, [
    { name: 'Eggs', cents: 1240, qty: 2, unit: 620 }, { name: 'Telur', cents: 1240, qty: 2, unit: 620 }, { name: 'Teh ais', cents: 500, qty: 2, unit: 250 },
    { name: 'Kuih', cents: 360, qty: 3, unit: 120 }, { name: 'Roti', cents: 650 }, { name: '鸡蛋', cents: 1240, qty: 2, unit: 620 },
    { name: 'Sayur', cents: 800 }, { name: 'Milo', cents: 700, qty: 2, unit: 350 }]);
  assert.deepEqual(r.skipped, []);
  assert.deepEqual(parseItemLines('Redmi Note 13 1299\nPhone 1,299').items, [{ name: 'Redmi Note 13', cents: 129900 }, { name: 'Phone', cents: 129900 }]);
  assert.deepEqual(parseItemLines('Ikan 0\nsayur').skipped, ['Ikan 0', 'sayur']);
});

test('typed items: a market list on one line, Chinese commas, thousands separators', () => {
  assert.deepEqual(parseItemLines('鱼 25, 菜 8, 猪肉 30').items, [{ name: '鱼', cents: 2500 }, { name: '菜', cents: 800 }, { name: '猪肉', cents: 3000 }]);
  assert.deepEqual(parseItemLines('鱼 25，菜 8、豆腐 3.50').items, [{ name: '鱼', cents: 2500 }, { name: '菜', cents: 800 }, { name: '豆腐', cents: 350 }]);
  assert.deepEqual(parseItemLines('Phone 1,299\nLaptop RM 3,499.90\nIkan 25,50').items, [{ name: 'Phone', cents: 129900 }, { name: 'Laptop', cents: 349990 }, { name: 'Ikan', cents: 2550 }]);
});

test('an item-count footer is never an item name', () => {
  const r = parseReceipt(['MR DIY', 'GLUE STICK 21G', '5.90', 'Item (s):1 Qty(s):1', '5.90', 'TOTAL 5.90', 'CASH 10.00', 'CHANGE 4.10'].join('\n'));
  assert.ok(!r.items.some(i => /qty|item \(s\)/i.test(i.name || '')), JSON.stringify(r.items));
  assert.equal(r.total, 590);
});

test('shop names: the brand people use, not the registered company', () => {
  const name = t => parseReceipt(t + '\nTOTAL 10.00').merchant;
  assert.equal(name('HEXTAR LUCKIN M SDN BHD\n(1234567-X)\nLot 5, Jalan Ampang'), 'Luckin Coffee');
  assert.equal(name('Gerbang Alaf Restaurants Sdn Bhd\n(65351-M)'), "McDonald's");
  assert.equal(name('GCH RETAIL (MALAYSIA) SDN. BHD.\n(COMPANY NO:200401028527)\nGIANT HYPERMARKET KEMUNING'), 'Giant');
  assert.equal(name('7:41 97%\nOrder Summary\nMR. D.I.Y. (M) SDN BHD'), 'Mr DIY');
  assert.equal(name('PUBLIC BANK\nPERANTAU HILL\nLOT 5070 JLN AIR HITAM'), 'Perantau Hill');   // card slip: the shop is under the bank
  assert.equal(name('BOK MARKETING SDN.BHD\n(1182500-V)'), 'Bok Marketing');
  assert.equal(name('Eyeslab Optometrist\nLg145, Lower Ground Floor'), 'Eyeslab');
});

test('dates as Malaysian receipts print them', () => {
  for (const [line, want] of [['ORD #73-REG #19-04/05/2024 16:47:52', '2024-05-04'], ['DATE 2024-04-0402:43:48', '2024-04-04'], ['DATE/TIME 11SEP202217:17:41', '2022-09-11'],
    ['Purchased 04Sept2022,11:55am', '2022-09-04'], ['ReceiptID:RCJ2-1September2022', '2022-09-01'], ['Transaction Date:5 Mar 2024', '2024-03-05'], ['AUG 19, 2024 6:17 PM', '2024-08-19'],
    ['12 Dec 24', '2024-12-12'], ['C4.03.00 Level 4', null]]) assert.equal(parseDate(line), want, line);
  // a labelled date beats a promo's "valid till" printed earlier
  assert.equal(parseReceipt('SHOP\nValid till 30/04/2024\nNASI 5.00\nTOTAL 5.00\nDate: 05/04/2024 12:00').date, '2024-04-05');
});
