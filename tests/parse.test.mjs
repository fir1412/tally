// Synthetic receipts only. Never paste real receipts here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReceipt, rowsOf, parseDate, parseItemLines, cleanName, dropSummaryLines } from '../js/parse.js';

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

test('app screenshot dates: month name glued to the time, US order, status bar and delivery estimates skipped', () => {
  assert.equal(parseDate('OCT6,202410:52AM'), '2024-10-06');
  assert.equal(parseDate('AUG19,20246:17PM'), '2024-08-19');
  assert.equal(parseDate('Aug 13202402:40:06GMT+'), '2024-08-13');
  assert.equal(parseDate('8/22/202510:38:02PM'), '2025-08-22');   // month first only when day first is impossible
  assert.equal(parseDate('12/05/2024'), '2024-05-12');
  assert.equal(parseDate('8:45 8 OCT 40%'), null);   // the phone's status bar, not 8 Oct 2040
  const r = parseReceipt(['Order Details', 'Estimated delivery date:12 Sept-14 Sept', 'arrive by 14-09-2024. View More', 'Kedai Contoh',
    'Item A 10.00', 'Total RM10.00', 'Order Time 10-09-2024 21:04'].join('\n'));
  assert.equal(r.date, '2024-09-10');
});
test('app screenshots: the shop under the delivery app, Shopee by its own words, a payee under its label', () => {
  const shop = l => parseReceipt(l.join('\n')).merchant;
  // A food-delivery order: the restaurant's "Name-Branch" line, not the app, the status bar or the address
  assert.equal(shop(['1:32 61%', 'Order Summary', 'Order ID GF-123', "Your order's in the kitchen.", 'Kedai Burger Contoh-Taman Contoh', '16, Jalan Contoh 5', '1x Burger 10.00', 'Subtotal RM10.00', 'Total RM10.00']), 'Kedai Burger Contoh');
  // A known brand far down the screen beats the delivery app named on top
  assert.equal(shop(['11:05 94%', 'Grab', 'Hope you enjoyed your food!', 'GrabFood Payment Method:', 'Booking code', '1x Milk Tea', 'MYR18.00', 'CHAGEE-Contoh Branch', 'Total MYR18.00']), 'Chagee');
  assert.equal(shop(['10:02 68%', 'Order Details', 'On-Time Guarantee: Get a RM5.00 voucher', 'arrive by 09-08-2024. View More', 'Kedai Contoh Official', 'Sabun 20ml x2', 'RM28.30', 'Order Total RM28.30']), 'Shopee');
  assert.equal(shop(['9:19 48%', 'Transfer Money', 'Successful', 'Recipient Name', 'AHMAD BIN CONTOH', 'Amount', 'MYR 50.00']), 'Ahmad Bin Contoh');
  assert.equal(shop(['10:43 86%', 'Payment Receipt', 'Thank you for using myTNB.', 'AMOUNT (RM)', '109.50']), 'TNB');
});
test('app screenshot items: rider line, drink options, app fees, Shopee price lines with their quantity', () => {
  const items = l => parseReceipt(l.join('\n'));
  // A food-delivery order: the rider's plate and rating and the drink's options are not things bought; fees are charges
  const g = items(['1:32 61%', 'Order Summary', 'ABC1234·HONDA WAVE 5.00', 'Kedai Contoh-Taman Contoh', '1x Teh Tarik 4.00', 'Dairy| Less Sweet| Less Ice 5.00', '1x Roti Canai 2.00', 'Subtotal RM6.00', 'Delivery fee 2.00', 'Carbon Neutral Fee 0.10', 'Total RM8.10']);
  assert.deepEqual(g.items.map(i => i.cents), [400, 200]);
  assert.equal(g.service, 210);
  assert.equal(g.check.ok, true);
  // Shopee: product, variant "x2", then old and new price; "X7" (OCR's x1) undone by the printed subtotal
  const s = items(['10:02 68%', 'Order Details', 'Preferred+ Kedai Contoh Visit Shop', 'Sabun Contoh 30ml', '30ml x2', 'RM48.00RM28.30', 'Mall Kedai Dua', 'Periuk Contoh 3L', '15DaysFreeReturns* X7', 'RM259.00RM229.00', 'Merchandise Subtotal RM285.60', 'Order Total RM285.60']);
  assert.deepEqual(s.items.map(i => [i.name, i.cents]), [['Sabun Contoh 30ml', 5660], ['Periuk Contoh 3L', 22900]]);
});
test('app screenshot items: columns run together, a one-item order, rental fees, a Shopee badge with the price', () => {
  const p = l => parseReceipt(l.join('\n'));
  // "Profile: RM49.99 Subtotal" is the subtotal, not a second item; a paper "AYAM 5.00 TOTAL" stays an item
  const g = p(['10:11 62%', 'Grab', 'Booking code', '1x Ayam Contoh Combo RM49.99', 'Profile: RM49.99 Subtotal', 'TOTAL (INCL.TAX) RM 49.99']);
  assert.deepEqual(g.items.map(i => i.cents), [4999]);
  assert.equal(g.subtotal, 4999);
  assert.deepEqual(p(['KEDAI CONTOH', 'AYAM TANDOORI 5.00 TOTAL', 'TEH TARIK 2.00', 'TOTAL 7.00']).items.map(i => i.cents), [500, 200]);
  // McDonald's app: the one item has no price of its own
  const m = p(['11:37 85%', 'Order Details', 'Order Summary', '10pcs Ayam Contoh Spicy', 'Payment Details', 'Subtotal RM 60.38', 'Processing&DeliveryFee RM 5.19', 'Tax 6% RM 3.93', 'Total (incl. Tax) RM 69.50']);
  assert.deepEqual(m.items.map(i => [i.name, i.cents]), [['10pcs Ayam Contoh Spicy', 6038]]);
  // A rental's cleaning and service fees are charges
  assert.equal(p(['3 nights in Kuala Lumpur 258.00', 'Cleaning fee 65.00', 'Service fee 48.34', 'Total (MYR) 371.34']).service, 11334);
  // Shopee: "15 Days Free Returns RM44.00" is the price of the product above, under a "… To Ship" shop header
  const s = p(['9:01 94%', 'My Purchases', 'Kedai Contoh Sdn Bhd To Ship', 'Ubat Gigi Contoh 100g', 'x1', '15DaysFreeReturns* RM44.00', 'Order Total:RM44.00']);
  assert.deepEqual(s.items.map(i => [i.name, i.cents]), [['Ubat Gigi Contoh 100g', 4400]]);
});
test('coffee app pickup screen: the price on a "Voucher Applied" line is the drink, the voucher lines are only notes', () => {
  const r = parseReceipt(['34', 'Pickup (Dine-in)', 'Tap "Authorize" for exclusive deals and', 'Authorize', 'promotions!', 'Order Pickup Instructions', 'Step 1 Step 2 Step 3',
    'Visit Store Show your QR Collect your', 'code order', 'Order Summary ****264', 'Kopi Contoh x1', '16oz/Iced/Less sweet', ' Voucher Applied RM 4.99', 'SST(6%) RM 0.30',
    'Total Discount -RM 9.01', 'Voucher Applied -RM 9.01', 'Total· 1 Item RM 5.29', 'Order Placed 01/10/2026 11:22am'].join('\n'));
  assert.deepEqual(r.items.map(i => [i.name, i.cents]), [['Kopi Contoh', 499]]);
  assert.equal(r.tax, 30); assert.equal(r.total, 529); assert.equal(r.check.ok, true);
  assert.equal(r.merchant, null);   // the screen never names the shop: nothing made up
  assert.equal(r.date, '2026-10-01'); assert.equal(r.time, '11:22');
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
  assert.equal(name('PUBLIC BANK\nKEDAI MAKAN SERI BAYU\nLOT 12 JLN MAWAR'), 'Kedai Makan Seri Bayu');   // card slip: the shop is under the bank
  assert.equal(name('TERATAI MAJU TRADING SDN.BHD\n(1234567-A)'), 'Teratai Maju Trading');
  assert.equal(name('Eyeslab Optometrist\nLg145, Lower Ground Floor'), 'Eyeslab');
});

test('dates as Malaysian receipts print them', () => {
  for (const [line, want] of [['ORD #73-REG #19-04/05/2024 16:47:52', '2024-05-04'], ['DATE 2024-04-0402:43:48', '2024-04-04'], ['DATE/TIME 11SEP202217:17:41', '2022-09-11'],
    ['Purchased 04Sept2022,11:55am', '2022-09-04'], ['ReceiptID:RCJ2-1September2022', '2022-09-01'], ['Transaction Date:5 Mar 2024', '2024-03-05'], ['AUG 19, 2024 6:17 PM', '2024-08-19'],
    ['12 Dec 24', '2024-12-12'], ['C4.03.00 Level 4', null]]) assert.equal(parseDate(line), want, line);
  // a labelled date beats a promo's "valid till" printed earlier
  assert.equal(parseReceipt('SHOP\nValid till 30/04/2024\nNASI 5.00\nTOTAL 5.00\nDate: 05/04/2024 12:00').date, '2024-04-05');
});

test('totals: 5-sen cash rounding, zero "Total" lines, no Total line at all', () => {
  assert.equal(parseReceipt('SHOP\nSHAMPOO 68.12\nSUBTOTAL (QTY 4) RM68.12\nCASH RM68.10').total, 6810);   // rounded amount printed: that was paid
  assert.equal(parseReceipt('SHOP\nLATTE 12.90\nSubtotal 12.90\nTotal (MYR) 0.00\nMyDebit 12.90').total, 1290);   // a zero Total is never it
  assert.equal(parseReceipt('KEDAI\nNASI 7.50\nTEH 2.00\nCASH 20.00\nCHANGE 10.50').total, 950);   // cash less change
  assert.equal(parseReceipt('KEDAI\nMEE 8.60\nMAYBANK QR PAY 8.60').total, 860);
});

test('item names: no SKU in front, no glued quantity, OCR 0 back to O', () => {
  assert.equal(cleanName('4208915 SAN RIM0 CARBONARA'), 'SAN RIMO CARBONARA');
  assert.equal(cleanName('1x TehO LimauAis'), 'TehO LimauAis');
  assert.equal(cleanName('1NESCAFE'), 'NESCAFE');
  assert.equal(cleanName('78779 0NE COND0M'), 'ONE CONDOM');
  assert.equal(cleanName('HAMMER 20OZ'), 'HAMMER 20OZ');
  // names printed above their code-qty-price lines, footer after the last one (Mr DIY / Giant layout)
  const r = parseReceipt('MR DIY\nWOOD LADLE 39CM\n9062133 1X6.50 6.50\nKNIFE 8 INCH\n6941334 1X6.90 6.90\nltem(s):2 Qty（s):2\nTotal RM 13.40');
  assert.deepEqual(r.items.map(i => [i.name, i.cents]), [['WOOD LADLE 39CM', 650], ['KNIFE 8 INCH', 690]]);
});

test('misspelt totals and payment lines are never items', () => {
  const r = parseReceipt('KEDAI\nNASI LEMAK 5.00\nTEH TARIK 2.50\nSUBTUTAL 7.50\nFOUNDING 0.00\n<<<CARD PAYMENT>>> 7.50\nTOTAL 7.50');
  assert.deepEqual(r.items.map(i => i.name), ['NASI LEMAK', 'TEH TARIK']);
  assert.deepEqual(dropSummaryLines([{ name: 'Mee Goreng', cents: 700 }, { name: 'AHOUNT', cents: 700 }, { name: 'Kopi', cents: 200 }]).map(i => i.name), ['Mee Goreng']);
});

test('full-width digits and O inside numbers', () => {
  assert.equal(parseReceipt('SHOP\nDATE: 27/09/２0２6\nTOTAL 5.00').date, '2026-09-27');
  assert.deepEqual(['TELUR GRED A 1OS', 'AIR 50OML', 'SOCK 5OPCS', 'HAMMER 20OZ', 'MILO 1KG'].map(cleanName), ['TELUR GRED A 10S', 'AIR 500ML', 'SOCK 50PCS', 'HAMMER 20OZ', 'MILO 1KG']);
});

test('discounts: under an item, or on the whole bill when the receipt adds up with it; a "you saved" note already in the subtotal is left alone', () => {
  const item = parseReceipt(['SHOP SDN BHD', '1x 9555520701063 3.75', 'LETTUCE', '1x 9555837602046 4.20', 'CUCUMBER', 'Discount ~0.20', 'SUB-TOTAL 7.75', 'TOTAL 7.75', 'MYDebit 7.75'].join('\n'));
  assert.deepEqual(item.items.map(i => [i.name, i.cents]), [['LETTUCE', 375], ['CUCUMBER', 420], ['Discount', -20]]);
  assert.equal(item.pay, 'debit'); assert.ok(item.check.ok);   // MyDebit: the bank account
  const bill = parseReceipt(['SHOP SDN BHD', 'RICE 5KG 26.50', 'OIL 5KG 31.90', 'SUBTOTAL 58.40', 'MEMBER DISCOUNT -5.00', 'TOTAL 53.40', 'CASH 60.00'].join('\n'));
  assert.deepEqual(bill.items.at(-1), { name: 'Discount', cents: -500 }); assert.ok(bill.check.ok);
  const saved = parseReceipt(['SHOP SDN BHD', 'RICE 5KG 21.50', 'OIL 5KG 31.90', 'SUBTOTAL 53.40', 'YOU SAVED 5.00', 'TOTAL 53.40'].join('\n'));
  assert.ok(!saved.items.some(i => i.name === 'Discount')); assert.ok(saved.check.ok);
});

test('"2 x 10.90" next to its line total is one item, whichever side the total is on', () => {
  const below = parseReceipt(['GUARDIAN SDN BHD', 'DETTOL HAND WASH 9.90', 'COLGATE TOTAL 150G', '2 x 10.90', '21.80', 'SUBTOTAL', '31.70', 'TOTAL', 'RM 31.70', 'CASH', '40.00'].join('\n'));
  assert.deepEqual(below.items.map(i => [i.name, i.cents]), [['DETTOL HAND WASH', 990], ['COLGATE TOTAL 150G', 2180]]);
  assert.equal(below.pay, 'cash');
});

test('a refund slip is marked as money back', () => {
  assert.equal(parseReceipt(['UNIQLO MALAYSIA SDN BHD', 'REFUND RECEIPT', 'SHIRT 49.90', 'TOTAL 49.90'].join('\n')).refund, true);
  assert.equal(parseReceipt(['UNIQLO MALAYSIA SDN BHD', 'SHIRT 49.90', 'TOTAL 49.90', 'No refund or exchange after 30 days'].join('\n')).refund, false);
});

test('Singapore and online receipts: S$ and NETS read as SGD paid by debit; points, vouchers and shipping discounts are money off; shipping is a charge', () => {
  const fp = parseReceipt(['NTUC FAIRPRICE CO-OPERATIVE LTD', 'UEN S83CS0191L', 'BANANA 1KG 6.55', 'MILK 1L 4.95', 'BREAD 2.40', 'EGGS 10S 5.08', 'SUBTOTAL S$18.98', 'LINKPOINTS REDEEMED -2.00', 'TOTAL S$16.98', 'NETS 16.98'].join('\n'));
  assert.deepEqual([fp.total, fp.currency, fp.pay, fp.check.ok, fp.items.at(-1).cents], [1698, 'SGD', 'debit', true, -200]);
  const sp = parseReceipt(['Shopee Order Details', 'Serum 30ml RM45.90', 'Phone case RM19.90', 'Charger RM29.90', 'Merchandise Subtotal RM95.70', 'Shipping Subtotal RM4.90', 'Shipping Discount Subtotal -RM4.90', 'Shopee Voucher -RM5.00', 'Order Total RM90.70', 'Payment Method ShopeePay'].join('\n'));
  assert.deepEqual([sp.total, sp.service, sp.currency, sp.pay, sp.check.ok], [9070, 490, 'MYR', 'ewallet', true]);
});

test('dates the reader mangles: glued to a time, compact before a time, a missing slash, OCR month typos, a stray digit, a comma', () => {
  for (const [line, iso] of [['Inv:12345 Ctr:7 ID:704 21:0221/04/23', '2023-04-21'], ['0001 28082022 15:23:12', '2022-08-28'], ['Date: 0105/2024 18:39', '2024-05-01'],
    ['DATE :20/Ju1/2023 14:16:26', '2023-07-20'], ['118 AUG 2022', '2022-08-18'], ['Payment Date 06 Apr, 2024', '2024-04-06'], ['Barcode 8705040416405320240416', null]])
    assert.equal(parseDate(line), iso, line);
});

test('a FeedMe slip: time glued to the year, the company glued to the name, a misread Qty line, a unit price in the name', () => {
  assert.equal(parseDate('Date:01/01/20251205 Invoice no:100001'), '2025-01-01');
  const r = parseReceipt('GOOD TIMING FOOD VILLAGE MCGOODTIMING SDN BHD\nDate:01/01/20251205\nQty Item Price (MYR)\n3.80\nTEH O AIS (L) (3.80/ea)\nLESS SUGAR\naly 3.80\nTotal(MYR) 3.80\nChange 0.00');   // an invented slip in that layout
  assert.equal(r.merchant, 'Good Timing Food Village');
  assert.deepEqual(r.items.map(i => [i.name, i.cents]), [['TEH O AIS (L)', 380]]);
  assert.equal(r.check.ok, true);
});

test('typed items on one line with spaces only are split after each price, never after a unit or a leading RM', () => {
  const r = s => parseItemLines(s).items.map(i => [i.name, i.cents]);
  assert.deepEqual(r('ikan 12 sayur 5 cili 2'), [['ikan', 1200], ['sayur', 500], ['cili', 200]]);
  assert.deepEqual(r('鱼 25 菜 8'), [['鱼', 2500], ['菜', 800]]);
  assert.deepEqual(r('Milo 2x6.20 roti 4'), [['Milo', 1240], ['roti', 400]]);
  assert.deepEqual(r('telur 30 biji 12'), [['telur 30 biji', 1200]]);
  assert.deepEqual(r('100 Plus 2.50'), [['100 Plus', 250]]);
  assert.deepEqual(r('rm 8 sayur'), [['sayur', 800]]);
});

test('Village Grocer slips: "Barcode: 955…" lines are never names, unit words come off, OCR C-for-G still finds the brand', () => {
  const r = parseReceipt('VILLAGE CROCER @ SAMPLE BRANCH\nDate: 01/01/25 10:00\nBarcode: 9550000C00017\nFRESH MILK 1L unit 7.50 Z\nBarcode: 9550000000024\nROLLED OATS pkt 12.90\nTotal RM 20.40');   // an invented slip in that layout
  assert.equal(r.merchant, 'Village Grocer');
  assert.deepEqual(r.items.map(i => [i.name, i.cents]), [['FRESH MILK 1L', 750], ['ROLLED OATS', 1290]]);
});

test('a return window or a warranty printed on the slip is found (for an optional reminder); "no refund" is not one', () => {
  const r = s => { const x = parseReceipt(`SHOP\nItem 10.00\nTotal 10.00\n${s}`); return [x.returnDays, x.warrantyMonths]; };
  assert.deepEqual(r('Please retain this receipt for exchange & refund within 3 days'), [3, undefined]);
  assert.deepEqual(r('Barang boleh ditukar dalam tempoh 7 hari'), [7, undefined]);
  assert.deepEqual(r('7天内退换'), [7, undefined]);
  assert.deepEqual(r('1 Year Warranty'), [undefined, 12]);
  assert.deepEqual(r('WARRANTY: 6 MONTHS'), [undefined, 6]);
  assert.deepEqual(r('No refund. No exchange.'), [undefined, undefined]);
});

test('phone-photo receipts: tax after the payment, OCR misreads, a label above its amount, promotions, unit-price lines', () => {
  // Fast-food slip: the tax line comes after the payment and starts with "TOTAL".
  const a = parseReceipt('1 Burger Set 12.00\n1 Sundae 4.37\nSubtotal 16.37\nEat-In Total (incl Tax) 17.35\nCash 20.00\nTOTAL 6% Service Tax 0.98');
  assert.equal(a.tax, 98); assert.ok(a.check.ok, JSON.stringify(a.check));
  // Convenience store: "Uisa" (Visa) and "Sauings" (Savings) must not replace the total; the promotion is money off.
  const b = parseReceipt('Chicken Bites 5.90\nRice Ball 5.50\nSUBTOTAL 11.40\nSnack Prono -1.65\nTOTAL 9.75\nUisa (001122/334455) -9.75\n#ITEMS SOLD 2\nTotal Sauings: 1.65');
  assert.equal(b.total, 975); assert.ok(b.check.ok, JSON.stringify(b.check));
  const c = parseReceipt('Iced Latte ea 9.50\nCheese Bun 7.90\nSUBTOTAL 17.40\n1 Latte (any size) -9.50\nTOTAL 7.90');
  assert.ok(c.check.ok, JSON.stringify(c.check));
  // "Jumlah Barang" with its amount on the next line is the total, not an item.
  const d = parseReceipt('Ais Krim Mocha\n5.50 5.50\nAis Krim Vanila\n2.00 1 2.00\nJumlah Barang\n7.50\n1.Bankcard 7.50');
  assert.deepEqual([d.total, d.items.length, d.check.ok], [750, 2, true]);
  // "1ea@5.90" under its item is that item's unit price, not a second item.
  const e = parseReceipt('Red Bean Bun ea 3.20\nSpicy Chicken 5.90\n1ea@5.90\nTOTAL 9.10\nVisa -9.10');
  assert.deepEqual([e.items.length, e.check.ok], [2, true]);
});

test('an O read for the 0 of a sen amount ("RMO.01") still counts as the rounding', () => {
  const r = parseReceipt('SHOP A\n12345 SHOWER GEL 11.50\n27159 HAND WASH 7.64\nSUBTOTAL (QTY 2) RM19.14\nROUNDING RMO.01\nSUBTOTAL (QTY 2) RM19.15\nCASH RM20.00');
  assert.equal(r.total, 1915); assert.equal(r.rounding, 1); assert.ok(r.check.ok);
});

test('words past a row\'s price (a keyboard key, a till screen\'s other panel) are not part of the item', () => {
  const r = parseReceipt('SHOP A\n47460 ROSK SENS SKIN CRM 6.90 PgDn\nNASI GORENG 7.50 WELCOME TO\nEGGS OMEGA 8.00 Z\nTOTAL 22.40');
  assert.deepEqual(r.items.map(i => i.cents), [690, 750, 800]);
  assert.ok(r.check.ok);
});

test('a known Malaysian chain from the shop list names the shop and gives its usual category, never from an address or a price line', () => {
  const r = parseReceipt('PARKSON PLAZA METRO\nKAJANG\nKNIGHT SHOE 149.50\nTotal RM 149.50');
  assert.equal(r.merchant, 'Parkson'); assert.equal(r.shopCat, 'shopping');
  assert.notEqual(parseReceipt('KEDAI ABC\nNO.31G, JALAN SETIA INDAH\nCHEESE BURGER 4.50\nTOTAL 4.50').merchant, 'Setia');
  assert.equal(parseReceipt('CHEESE BURGER 4.50\nTOTAL 4.50').shopCat ?? null, null);   // "Burger" is a word, not a shop
});

test('found on real receipts (CORD bench): thousands commas, TAX6%, a name on two lines, a promo pack, a unit price in the name', () => {
  const big = parseReceipt('SENHENG\nTV 1,299.00\nTOTAL 1,299.00');
  assert.equal(big.total, 129900); assert.deepEqual(big.items.map(i => [i.name, i.cents]), [['TV', 129900]]);   // not 299.00 that "adds up"
  assert.equal(parseReceipt('CAFE\nNASI LEMAK 10.00\nTAX6% 0.60\nTOTAL 10.60').tax, 60);
  const wrap = parseReceipt('KEDAI\nTEH O 2.00\nNASI GORENG KAMPUNG\nSPECIAL\n1 12.50 12.50\nTOTAL 14.50');
  assert.equal(wrap.items.at(-1).name, 'NASI GORENG KAMPUNG SPECIAL');
  const promo = parseReceipt('MART\nMILO PROMO PACK 17.50\nMEMBER DISC -2.00\nTOTAL 15.50');
  assert.deepEqual(promo.items.map(i => i.cents), [1750, -200]); assert.ok(promo.check.ok);
  assert.equal(cleanName('ICED TEA 1.20 5'), 'ICED TEA'); assert.equal(cleanName('RM1.50'), 'RM1.50');
});

test('found by the synthetic bench: bank/wallet slips name the shop they paid, FOUNDATION is an item, a foreign-currency total, weighed produce', () => {
  assert.equal(parseReceipt('HONG LEONG BANK\nKOPITIAM LAMA 1955\nSALE\nAMOUNT RM 12.50').merchant, 'Kopitiam Lama 1955');
  assert.equal(parseReceipt("Touch 'n Go eWallet\nPayment successful\nRecipient: GERAI MAK TEH\nAmount RM 8.50").merchant, 'Gerai Mak Teh');
  const f = parseReceipt('GUARDIAN\nMAYBELLINE FIT ME FOUNDATION 30ML 39.90\nTOTAL 39.90');
  assert.deepEqual(f.items.map(i => i.cents), [3990]);
  const x = parseReceipt('DUTY FREE\nPERFUME 340.90\nTOTAL 340.90\nTotal SGD 104.00');
  assert.equal(x.total, 34090);
  const kg = parseReceipt('GROCER\nCARROT AUSTRALIA\n1.438 KG X 6.90/KG 9.92\nTOTAL 9.92');
  assert.deepEqual(kg.items.map(i => [i.name, i.cents]), [['CARROT AUSTRALIA', 992]]);
});

test('rowsOf: on a photo tilted 3°, a price at the far right stays on its own row, not the next item', () => {
  const t = Math.tan(3 * Math.PI / 180);
  const quad = (text, x, y, w, h = 20) => ({ text, mean: 0.9, box: [[x, y + t * x], [x + w, y + t * (x + w)], [x + w, y + h + t * (x + w)], [x, y + h + t * x]] });
  const rows = rowsOf([quad('NASI LEMAK AYAM', 0, 100, 300), quad('12.90', 560, 100, 80), quad('TEH TARIK', 0, 128, 200), quad('3.20', 560, 128, 70), quad('TOTAL', 0, 156, 120), quad('16.10', 560, 156, 80)]);
  assert.deepEqual(rows.map(r => r.text), ['NASI LEMAK AYAM 12.90', 'TEH TARIK 3.20', 'TOTAL 16.10']);
});

test('a petrol line: the litres and price per litre are the quantity, the fuel above is the name', () => {
  const r = parseReceipt('CALTEX IOI\nPump:12\nRON95 TECHRON\n26.615L@ RM2.05/L 54.56\nWINDSCREEN WASHER 7.30\nTOTAL RM 61.86');
  assert.deepEqual(r.items.map(i => [i.name, i.cents]), [['RON95 TECHRON', 5456], ['WINDSCREEN WASHER', 730]]);
});
