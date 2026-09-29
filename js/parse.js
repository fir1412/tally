// Receipt text (from OCR) -> structured receipt. Pure, no DOM. Amounts are integer cents (sen).
// Tuned for Malaysian receipts: SST, service charge, 5-sen rounding, SR/ZR tax codes, day-first dates.
import { brandOf } from './brands.js';
import { calcAmount } from './engine.js';

// "12.90", "12,90", "RM 12.90", "$12.90", "-2.00", "2.00-", then optional trailing tax code or OCR junk
// (SR, ZR, T, *, "2" for a misread Z, "§", ":")
// A glued unit ("1.25L", "0.50KG") is a pack size in a name, not a price with a tax code.
const AMOUNT = /(-)?\s*(?:RM\s*|MYR\s*|\$)?(\d{1,6})[.,] ?(\d{2})(-)?(?:\s*(?!(?:ML|KG|MM|CM|L|G|M)\b)(?:[A-Z]{1,2}|\*)|\s+[^\s\d]{1,2}|\s+\d)?\s*$/i;
const COUNT = /\b([il1]te[mn]|qty)\s*[(（]s[)）]|\bno\.?\s*of\s*items|\bitem\s*count/i; // "Item(s): 5 Qty(s): 5"
const UNIT_ONLY = /^\s*(\d{1,3})\s*[x×]\s*(?:RM\s*)?\d+[.,]\d{2}\s*$/i;
const QTY = /^\s*\d+(?:[.,]\d+)?\s*[x@]\s*(?:RM\s*)?\d+[.,]\d{2}\s*/i;

// Also OCR's "jotal", "[otal", "Tota", "Totil", "Total2 items", "TOTALAMOUNT".
const TOTAL = /[o0]ta[l1i]?(?![a-z])|t[o0]t[ai][l1](?![a-z])|t[o0]ta[l1](?=with|incl|[il1]ncl|amt|amount|sales|rm|myr)|jumlah|amount\s*due|\bnett?\b|grand/i;
const PAYMENT = /\b(cash|tunai|change|baki|tender|visa|master|card|credit|debit|paid|payment|e-?wallet|grabpay|boost|tng|touch\s*n)/i;
// "Total Qty", "Total Items", "Total Saving", "Total 0% supplies" (a group total), "Item 2 Total with GST"
const NOT_TOTAL = /[sg]ub\s*-?\s*t[o0]ta|t[o0]ta[l1]?\s*(qty|quantity|items?\b|saving|disc)|^(qty|items?)\b|saving|excl|suppl/i;
// A line that says both "total" and "tax"/"rounding" is the total only when it says so ("incl", "payment"...)
const TOTAL_WINS = /[il1]ncl|with|after|payment|payable|amount|due|nett|grand|jumlah/i;
const ALL_AMOUNTS = /(?:RM\s*|MYR\s*|\$)?(\d{1,6})[.,] ?(\d{2})(?!\d)/gi;
const SUBTOTAL = /[sg]ub\s*-?\s*t[o0]ta[il1]?/i; // also OCR's "Gubtotai"
const SERVICE = /service\s*(charge|chg)|\bsvc\b|\bs\/?c\b|caj\s*perkhidmatan|shipping|delivery\s*(fee|charge)|penghantaran|运费|運費/i;   // a charge on top of the items (Shopee's shipping)
const TAX = /\bsst\b|\bgst\b|\bvat\b|service\s*tax|sales\s*tax|\btax\b|cukai/i;
const ROUNDING = /round|pelarasan|bundar/i;
const DISCOUNT = /disc(ount)?|\bdsc\b|diskaun|potongan|saving|voucher|baucar|coupon|kupon|promo|rebate|redeem|points? (used|redeemed)|优惠|折扣/i;
// Printed shop names end like this; a handwritten name or a garbled logo above them is not the shop.
const COMPANY = /\bsdn\.?\s*bhd|sdnbhd|\bbhd\b|enterprise|trading|restoran|restaurant|supermarket|hypermarket|pharmacy|farmasi|\bkedai\b|\bmart\b|\bstore\b|bakery|\bcafe\b/i;
/** Strip codes, quantities, prices and units: what is left is the item's name (maybe nothing). */
const bareName = s => s.replace(/^\s*(?:\d+\s*x|x\s*[1il]|[1il]\s*x)(?=\s*\d{6,})/i, ' ')   // "1x 9555…", read as "XI 3693…" / "IX 9555…": a qty and a barcode
  .replace(/\d+(?:[.,]\d+)?/g, ' ').replace(/\b(pcs?|set|units?|ea|nos?|btl|pkt|x)\b/gi, ' ').replace(/\s+/g, ' ').trim();
// Year may be glued to the time by OCR: "25/12/20188:13PM", "01/03/1819:14"
// Day first (Malaysia) with one separator used twice ("#19-04/05/2024" is 04/05, not 19-04/05); year first; and the
// year may run straight into the time ("2024-04-0402:43:48").
const DATE = /(?<!\d)(\d{1,2})([\/.-])(\d{1,2})\2(20\d{2}|\d{2})(?=\d{1,2}:\d{2}|\D|$)|(?<!\d)(20\d{2})([\/.-])(\d{1,2})\6(\d{1,2})(?=\d{1,2}:\d{2}|\D|$)/g;
const MON = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
// "18 Aug 2022", "11SEP202217:17:41", "04Sept2022", "1September2022", "12 Dec 24"; and "Aug 18, 2022".
const DATE_WORDS = new RegExp(String.raw`(?<!\d)(\d{1,2})\s*[-/ ]?\s*(${MON})[a-z]*\.?\s*[-/, ]?\s*(20\d{2}|\d{2}(?!\d))|\b(${MON})[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})`, 'gi');
const monthOf = s => MON.split('|').indexOf(s.slice(0, 3).toLowerCase()) + 1;

// OCR boxes [{text, box: [[x,y] x4]}] -> text with one receipt row per line.
// Boxes whose vertical centres are within half a line height join left-to-right ("Nasi Lemak" + "12.90").
export function joinRows(boxes) {
  const b = boxes.map(({ text, box }) => {
    const ys = box.map(p => p[1]), top = Math.min(...ys), bottom = Math.max(...ys);
    return { text, x: Math.min(...box.map(p => p[0])), y: (top + bottom) / 2, h: bottom - top };
  }).sort((a, c) => a.y - c.y);
  const rows = [];
  for (const w of b) {
    const row = rows.at(-1);
    if (row && Math.abs(w.y - row.y) < Math.min(w.h, row.h) / 2) row.words.push(w);
    else rows.push({ y: w.y, h: w.h, words: [w] });
  }
  return rows.map(r => r.words.sort((a, c) => a.x - c.x).map(w => w.text).join(' ')).join('\n');
}

export function toCents(m) {
  const cents = parseInt(m[2], 10) * 100 + parseInt(m[3], 10);
  return m[1] || m[4] ? -cents : cents;
}

/** "13:05", "1:05 PM", "19:08:32", glued to a date ("20188:13:39PM") → 'HH:MM' 24-hour, or null. */
export function parseTime(line) {
  const hinted = /time|masa|时间|時間|am\b|pm\b|:\d\d:\d\d/i.test(line) || DATE_HINT.test(line);
  const rest = line.replace(/\d{1,2}[\/.-]\d{1,2}[\/.-](?:20\d{2}|\d{2})/g, ' '); // "25/12/20188:13" → " 8:13"
  const m = rest.match(/(?<![\d:])([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\s*([AaPp][Mm])?(?![\d:])/);
  if (!m || !hinted) return null;
  let h = +m[1];
  if (m[3]) { if (h > 12) return null; h = (h % 12) + (/p/i.test(m[3]) ? 12 : 0); }
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}
const DATE_HINT = /\d{1,4}[\/.-]\d{1,2}[\/.-]\d{2,4}/;

export function parseDate(line) {
  const ok = (y, mo, d) => {
    if (y < 100) y += 2000;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    // ponytail: receipts from 2010 on; "C4.03.00" (a mall unit) would otherwise be 4 March 2000
    return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && y >= 2010 && y <= 2099 ? dt.toISOString().slice(0, 10) : null;
  };
  for (const re of [DATE, DATE_WORDS]) {
    re.lastIndex = 0;
    for (let m; (m = re.exec(line)); ) { // first valid one
      const iso = re === DATE ? (m[5] ? ok(+m[5], +m[7], +m[8]) : ok(+m[4], +m[3], +m[1])) : m[4] ? ok(+m[6], monthOf(m[4]), +m[5]) : ok(+m[3], monthOf(m[2]), +m[1]);
      if (iso) return iso;
      re.lastIndex = m.index + 1; // retry one char later so an invalid match can't swallow the real date
    }
  }
  return null; // rejects 31/02, 13/13
}
const DATE_LABEL = /date|tarikh|tkh\b|日期|transaction|purchased|order\s*time|\bdt\b/i;
const NOT_DATE = /exp|valid|till|until|before|mail\s*out|ship\s*out|member\s*since|promo|warranty/i;
/** The receipt's date: a line labelled Date or carrying a time beats the first date-like text (a promo's "valid till"). */
function receiptDate(lines) {
  let best = null;
  for (const l of lines) {
    const d = parseDate(l); if (!d) continue;
    const s = (DATE_LABEL.test(l) ? 2 : 0) + (/\d{1,2}:\d{2}/.test(l) ? 1 : 0) - (NOT_DATE.test(l) ? 3 : 0);
    if (!best || s > best.s) best = { d, s };
  }
  return best?.d ?? null;
}

/**
 * Items typed by hand, one per line: "Phone 1299", "Ikan kembung 25.50", "RM 8 sayur", "Teh ais: 2.5", "Sayur 8.-".
 * A quantity or sum is worked out: "Eggs 2x6.20", "Telur 6.20x2", "Teh ais 2@2.50", "Kuih 3*1.20", "Roti 4.5+2".
 * → {items: [{name, cents, qty?, unit?}], skipped: [lines with no name or no price]}.
 */
export function parseItemLines(text) {
  // "1,299" and "1,299.50" are thousands; "25,50" is 25.50 (comma decimals); a list comma ("鱼 25, 菜 8") splits items.
  const cents = s => { const [a, b = ''] = s.replace(/,(?=\d{3}(?!\d))/g, '').split(/[.,]/); return +a * 100 + +(b + '00').slice(0, 2); };
  const PRICE = String.raw`(?:\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{1,6}(?:[.,]\d{1,2})?)`, EXPR = String.raw`${PRICE}(?:\s*[x×*@+]\s*${PRICE})*`;
  const tailRe = new RegExp(String.raw`^(.*?\S)[\s:=\-–]*(?:RM|MYR)?\s*(${EXPR})$`, 'i'), headRe = new RegExp(String.raw`^(?:RM|MYR)?\s*(${PRICE})[\s:=\-–]+(\D.*)$`, 'i');
  const worth = e => {   // "2x6.20" → 12.40, qty 2 at 6.20; "4.5+2" → 6.50 (the Amount field's calcAmount does the sum)
    const p = e.split(/\s*([x×*@+])\s*/i), total = calcAmount(p.map((s, i) => (i % 2 ? s.replace('@', '*') : (cents(s) / 100).toFixed(2))).join(''));
    if (p.length !== 3 || p[1] === '+') return { cents: total };
    const q = /^\d+$/.test(p[0]) ? 0 : /^\d+$/.test(p[2]) ? 2 : -1;   // the whole number is the quantity: 2x6.20, 6.20x2
    return q < 0 || +p[q] < 2 ? { cents: total } : { cents: total, qty: +p[q], unit: cents(p[2 - q]) };
  };
  const items = [], skipped = [];
  for (const l of String(text ?? '').split(/\r?\n|[，、;；]|,(?!\d{3}(?!\d))(?!\d{1,2}(?!\d))/).map(l => l.trim()).filter(Boolean)) {
    const s = l.replace(/(\d)[.,]-$/, '$1');   // "8.-" is RM 8
    const tail = s.match(tailRe);   // name then price
    const head = s.match(headRe);   // price then name
    const [name, price] = tail ? [tail[1], tail[2]] : head ? [head[2], head[1]] : [];
    const w = name && /\p{L}/u.test(name) ? worth(price) : null;
    if (w?.cents > 0) items.push({ name: name.replace(/[\s:=\-–]+$/, '').slice(0, 80), ...w }); else skipped.push(l);
  }
  return { items, skipped };
}

// Lines at the top that never name the shop: a phone's status bar, headings, order numbers, a card terminal's bank.
const NOT_SHOP = new RegExp([
  /^\d{1,2}:\d{2}\b|\d+\s*%|\d+\.\d{2}\b|\b\d{1,2}\s*[:.]\d{2}\s*(am|pm)\b|\b\d{1,2}\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}/.source,   // times, percentages, amounts, dates
  /order\s*(summary|details|number|no|id|on)|your\s*(order|receipt|payment)|official\s*receipt|tax\s*invoice|deal\s*details|contact\s*support|my\s*purchases|seller\s*will/.source,
  /ro[lu]n?ding|sub\s*-?t[o0]tal|\bt[o0]tal\b|\bqty\b|kuantiti|delivery|note\s*to|to\s*pay|visit\s*shop|premium|payment\s*successful|tbl\s*no/.source,   // money-part and app-screen words
  /^\W*(invoice|receipt|resit|welcome|selamat|thank|terima\s*kasih|date|time|ticket|table|cashier|pos\s*no|bill\s*no|payment|quantity|description)\b/.source,
  /^(tel|fax|gst|sst|co\.?\s*(no|reg)|reg\.?\s*no|company\s*(no|reg)|registration)|^\(|^\d{3,}|^[\d\W]+$/.source,   // numbers, a "(Perub…)" or "(123456-X)" line
].join('|'), 'i');
const BANK_SLIP = /^(public\s*bank|hong\s*leong|maybank|cimb|rhb|ambank|bank\s*islam|bsn|affin|uob|ocbc|hsbc|alliance\s*bank)/i;
const ADDRESS = /\b(jalan|jln|lot|no\.?\s*\d+|taman|lorong|level|floor|lg-?\d+|kuala lumpur|selangor|\d{5})\b/i;
const CO_TAIL = /[\s.,]*\(?\b(m|malaysia)?\)?\s*(sd[nh]\.?\s*bh?d|sdnbhd|berhad|bhd)\b.*$/i;   // "(M) SDN. BHD. (123-X)", OCR's "Sdh"
const titleCase = s => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s(&/-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s);
/** OCR splits a shop's name over lines: "RESTORAN" / "MAJU JAYA", "ALL IT" / "HYPERMARKET SDN BHD". Put them back together. */
function joinNameLines(lines) {
  const out = [];
  for (const l of lines) {
    const bare = l.replace(CO_TAIL, '').replace(/\b(trading|enterprise|hypermarket|supermarket)\b/gi, '').replace(/[^\p{L}]/gu, '');
    if (out.length && bare.length < 3 && COMPANY.test(l) && !/\d+\.\d{2}/.test(out.at(-1))) out[out.length - 1] += ' ' + l;   // a company word left alone
    else out.push(l.replace(/^i?(restoran)(?=\p{L})/iu, '$1 '));   // "Restoranthoulath", OCR's "Irestoran"
  }
  return out.flatMap((l, i, a) => (/^(restoran|restaurant|kedai(\s*makan)?|rumah\s*makan)$/i.test(l.trim()) && a[i + 1] ? [] : [i && /^(restoran|restaurant|kedai(\s*makan)?|rumah\s*makan)$/i.test(a[i - 1].trim()) ? `${a[i - 1].trim()} ${l}` : l]));
}
/** "HEXTAR LUCKIN M SDN BHD" → Luckin Coffee (a known brand); "RESTORAN MAJU JAYA SDN.BHD (123-X)" → Restoran Maju Jaya. */
export function shopName(lines) {
  const brand = brandOf(lines); if (brand) return brand;
  const top = joinNameLines(lines.slice(0, 10)).filter(l => !NOT_SHOP.test(l) && !BANK_SLIP.test(l) && /\p{L}{3}/u.test(l.replace(CO_TAIL, ''))).slice(0, 8);   // a lone "Bhd" is no name
  const co = top.find(l => COMPANY.test(l)) || top.find(l => !ADDRESS.test(l));
  if (!co) return null;
  const name = co.replace(CO_TAIL, '').replace(/\(?\s*(co\.?\s*(no|reg)|company)[^)]*\)?/i, '').replace(/\(\s*[\w-]*\d[\w-]*\s*\)/g, '').replace(/[\s.,:;*-]+$/, '').trim();
  return titleCase(name || co).slice(0, 80);
}

export function parseReceipt(text) {
  text = String(text ?? '').normalize('NFKC');   // the Chinese model returns full-width digits: "27/09/２0２6"
  const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const r = { merchant: null, date: null, time: null, items: [], subtotal: null, tax: null, service: null, rounding: null, total: null };
  let pendingName = null; // name line waiting for a "2 x 3.50  7.00" line
  let paid = false;       // after TOTAL, the first payment line (Cash, Visa, Change...) ends the money part
  let billOff = 0;        // a discount on the whole bill
  const below = namesBelow(lines);

  r.merchant = shopName(lines);
  r.date = receiptDate(lines);
  for (const line of lines) {
    if (!r.time) r.time = parseTime(line);
    if (r.total !== null && PAYMENT.test(line)) paid = true;
    if (paid) continue; // payment, change, tax summary follow. Only the date is still wanted.

    const m = line.match(AMOUNT);
    const label = m ? line.slice(0, m.index).trim() : line;
    if (!m) {
      // "Item (s):1 Qty(s):1" is a footer and "QTY ITEM", "Table: 8", "Payment :" are headers: never an item's name
      const hasText = /[a-z]{2}/i.test(line) && !COUNT.test(line) && !/^(qty|quantity|item|description|table|payment|purchased|order|cashier|kuantiti|t?otal\s*items?)\b/i.test(line);
      const last = r.items.at(-1);
      if (hasText && last && last.name === null) { last.name = line; pendingName = null; } // name printed under the price
      else pendingName = hasText ? line : null;
      continue;
    }
    const cents = toCents(m);
    // "Total Saving 0.00 Total 77.20": classify by the words after the last number
    const key = label.replace(/^.*\d[.,]\d{2}\s*/, '') || label;

    const adj = ROUNDING.test(key) ? 'rounding' : SERVICE.test(key) ? 'service' : TAX.test(key) ? 'tax' : null;
    // Money off first: "Shipping Discount Subtotal -4.90" and "Shopee Voucher -5.00" are discounts, not the subtotal.
    const off = DISCOUNT.test(key) && !!cents && r.total === null && !/^\W*(sub\s*-?\s*)?t[o0]tal\b/i.test(key);
    if (off && r.subtotal === null && r.items.length) r.items.push({ name: 'Discount', cents: -Math.abs(cents) });
    else if (off) billOff += Math.abs(cents);
    else if (SUBTOTAL.test(key) && !adj) r.subtotal = cents;
    else if (SUBTOTAL.test(key)) r[adj] = (r[adj] ?? 0) + cents;   // "Shipping Subtotal 4.90" is a charge, not the items' subtotal
    else if (TOTAL.test(key) && NOT_TOTAL.test(key)) { /* a count or group total: skip */ }
    else if (TOTAL.test(key) && (!adj || TOTAL_WINS.test(key))) r.total = Math.max(Math.abs(cents), ...amountsIn(line)); // "Total (incl Tax) 17.80 0.00"; "RM-38.80" is OCR noise
    else if (adj) { r[adj] = (r[adj] ?? 0) + cents; if (adj === 'tax' && /incl/i.test(key)) r.taxIncluded = true; }
    else if (DISCOUNT.test(key) && !cents) { /* "Discount 0.00": nothing to record */ }
    else if (DISCOUNT.test(key) && r.subtotal === null && r.total === null && r.items.length) r.items.push({ name: 'Discount', cents: -Math.abs(cents) });   // its own line, always money off ("-0.20", read "~0.20")
    else if (DISCOUNT.test(key) && cents && r.total === null) billOff += Math.abs(cents);   // "Member discount -5.00" between subtotal and total
    else if (r.subtotal === null && r.total === null && !COUNT.test(label)) { // items stop at the subtotal or first real total
      const name = label.replace(QTY, '').trim();
      const qtyOnly = !/[a-z]{2}/i.test(bareName(name));   // "2587 1.00 PCS 48.00": code, qty and price; the name is elsewhere
      // Number-only line: its name is the line above, or (code-qty-price layout) the line below, filled in above
      const unit = line.match(UNIT_ONLY);   // "2 x 10.90" with no line total: the total is on the line next to it
      const prev = r.items.at(-1);
      if (qtyOnly && !unit && prev?.q && prev.q * prev.cents === cents) { prev.cents = cents; delete prev.q; }   // "2 x 10.90" then "21.80": one item
      else r.items.push({ name: qtyOnly ? (below ? null : pendingName) : name, cents, ...(unit ? { q: +unit[1] } : {}) });
    }
    pendingName = null;
  }
  if (r.total === 0) r.total = null;   // "Total (MYR) 0.00" on tax-inclusive templates is never what was paid
  if (r.total === null) guessTotal(r, lines);
  // Cash rounding: 68.12 is paid as 68.10. When the rounded amount is printed too, that is the total.
  if (r.total > 0 && r.total % 5) {
    const r5 = Math.round(r.total / 5) * 5;
    if (lines.some(l => amountsIn(l).includes(r5))) { r.rounding = (r.rounding ?? 0) + r5 - r.total; r.total = r5; }
  }
  // A misread line can land in tax/service/rounding: none can be a third of the bill, and rounding is at most 5 sen.
  if (r.total) for (const k of ['tax', 'service']) if (Math.abs(r[k] ?? 0) * 3 > r.total) r[k] = null;
  if (Math.abs(r.rounding ?? 0) > 5) r.rounding = null;
  // "2 x 10.90" next to "21.80" (above or below it) is one item of 21.80, named from whichever line has the name.
  for (let i = 0; i < r.items.length; i++) {
    const u = r.items[i]; if (!u.q) continue;
    const j = [i + 1, i - 1].find(k => r.items[k] && !r.items[k].q && r.items[k].cents === u.q * u.cents);
    if (j !== undefined) { r.items[j].name ||= u.name; r.items.splice(i--, 1); }
  }
  for (const it of r.items) delete it.q;
  for (const it of r.items) if (it.name) it.name = cleanName(it.name);
  r.items = dropSummaryLines(r.items);
  r.check = checksum(r);
  // A whole-bill discount is a line of its own when the receipt adds up with it and not without ("You saved 5.00" is often already in the subtotal).
  if (billOff && !r.check.ok) { const d = { name: 'Discount', cents: -billOff }; r.items.push(d); r.check = checksum(r); if (!r.check.ok) { r.items.pop(); r.check = checksum(r); } }
  r.pay = payKind(lines);
  // Printed in Singapore dollars (a JB commuter's FairPrice receipt): it goes to an SGD account when there is one.
  r.currency = lines.some(l => /\bS\$|\bSGD\b|\bsingapore\b|\bpaynow\b|\bUEN\b|\bnets\b/i.test(l)) ? 'SGD' : 'MYR';
  // A meal out: a service charge, or a table, pax, dine-in or take-away line. Its eggs and rice are dishes, not groceries.
  r.meal = r.service != null || lines.some(l => /\b(table|meja|pax|dine[- ]?in|take[- ]?away|takeaway|bungkus|tapau|makan sini|server|waiter)\b|堂食|外带|外帶|桌号|桌號/i.test(l));
  // A refund or return slip is money back, not spending (words only: a "-38.80" alone is often OCR noise).
  // A title line ("REFUND RECEIPT", "CREDIT NOTE", "退货单") or a refund total; never "No refund after 30 days".
  r.refund = lines.some(l => /^\W*(refund|return(ed)?|credit note|nota kredit|pemulangan|bayaran balik|退款|退货|退貨)(\s*(receipt|slip|note|invoice|resit|单|單))?\W*$/i.test(l) || /\b(total\s*refund(ed)?|refund\s*(amount|total))\b/i.test(l));
  return r;
}
/** How it was paid, from the payment line: 'card', 'ewallet' or 'cash' (null when the receipt doesn't say).
 *  A card or wallet line wins over cash: "CASH BILL" / "CASH SALE" is a receipt title, not how it was paid. */
export function payKind(lines) {
  // A debit card (MyDebit, NETS in Singapore) is the bank account; a credit card is the card.
  if (lines.some(l => /\b([mh]y ?debit|debit ?card|kad debit|nets|eftpos)\b|扣账卡/i.test(l))) return 'debit';
  if (lines.some(l => /\b(visa|master ?card|amex|credit ?card|kad kredit|card ?no|contactless|paywave)\b|信用卡/i.test(l))) return 'card';
  if (lines.some(l => /touch ?'?n ?go|\btng\b|e-?wallet|grab ?pay|\bboost\b|shopee ?pay|duitnow|\bmae\b|setel|big ?pay|电子钱包/i.test(l))) return 'ewallet';
  if (lines.some(l => /^(cash|tunai|现金|現金)\b(?! ?(bill|sale|sales|receipt))(.*\d|\s*[:：]?\s*$)/i.test(l))) return 'cash';   // "CASH 95.00", or "CASH" with the amount on the next line
  return null;
}

const amountsIn = line => [...line.matchAll(ALL_AMOUNTS)].map(m => +m[1] * 100 + +m[2]);
// The money part of a receipt that OCR misspelt, so it slipped into the items: "SUBTUTAL", "AHOUNT", "TOTAAMN",
// "GRAND TOTAI.", "TTL"; and payment / tax / rounding lines (card slips print them between the items and the total).
const SUMMARY_NAME = /^\W*(sub\s*-?\s*t[o0u]t[ao]?[l1i]?|grand\s*t[o0]t|t[o0]t[a4]?[l1iat]?(?![a-z]{3})|t[o0]ta\S*\s*(items?|amount|amt)|ttl\b|a[mh][o0]u?n?t\b|total\s*amount|taxable|item\s*qty)/i;
const MONEY_NAME = /^\W*(r[o0]u?n?d|f[o0]und|change|balance\b|cash\b|card\b|c?<+\s*card|visa|master|credit|debit|duit\s*now|a*duitnow|tendered|payment|ringgit\s*malaysia|items?\s*sold|service\s*(tax|charge)|serv\.?\s*charge|tax\s*\d|sst\b|gst\b|ixn\s*ref|rm$|qty$)/i;
/** Items end where the money part starts: a (misspelt) total line and everything after it goes; payment, tax and
 *  rounding lines go wherever they are. A real item never has a name like these. */
export function dropSummaryLines(items) {
  const end = items.findIndex(i => i.name && SUMMARY_NAME.test(i.name));
  return (end < 0 ? items : items.slice(0, end)).filter(i => !(i.name && MONEY_NAME.test(i.name)));
}
/** An item name as people read it: no barcode or SKU in front ("4208915 SAN REMO"), no glued quantity ("1x Teh O",
 *  "1NESCAFE"), and OCR's 0 inside a word back to O ("0NE ZER0THIN" → "ONE ZEROTHIN"). */
export const cleanName = n => n.replace(/^\d{4,}\s*(?=\S)/, '').replace(/^\d{1,2}\s*[x×]\s+/i, '').replace(/^1(?=[A-Za-z][A-Za-z])/, '').replace(/^1(?=0[A-Za-z]{2})/, '')
  .replace(/(?<=[A-Za-z])0(?![\d.,])|(?<![\dA-Za-z.])0(?=[A-Za-z]{2})/g, 'O')
  .replace(/(?<=\d[0O]*)O(?=[0O]*(?:\d|ML|G|KG|L|S|PCS|PC|X)\b)/g, '0').trim() || n;   // and O inside a number back to 0: "1OS", "50OML", "5OPCS"   // "20OZ" keeps its digits
/**
 * No "Total" line (e-wallet and bank slips, torn receipts): subtotal plus adjustments, else the amount printed
 * most often (slips repeat it), else the largest RM amount. Marked totalGuessed so the review screen flags it.
 */
function guessTotal(r, lines) {
  const on = re => { for (const l of lines) if (re.test(l)) { const a = amountsIn(l).filter(c => c > 0); if (a.length) return a.at(-1); } return null; };
  const cash = on(/\b(cash|tunai)\b(?!\s*(back|out))/i), change = on(/\b(change|baki)\b/i);
  const paid = on(/\b(my\s*debit|visa|master|amex|card|e-?wallet|grab\s*pay|boost|tng|touch\s*'?n|duit\s*now|qr\s*pay|shopee\s*pay|debit|credit)\b/i);
  if (r.subtotal !== null) r.total = r.subtotal + (r.service ?? 0) + (r.taxIncluded ? 0 : r.tax ?? 0) + (r.rounding ?? 0);
  else if (cash && change !== null && cash > change) r.total = cash - change;   // no Total line: what was handed over, less the change
  else if (paid) r.total = paid;   // a card or e-wallet line carries the amount charged
  else {
    const count = new Map();
    for (const l of lines) for (const c of new Set(amountsIn(l))) if (c > 0) count.set(c, (count.get(c) || 0) + 1);
    const rep = [...count].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    const rm = lines.flatMap(l => [...l.matchAll(/(?:RM|MYR)\s*(\d{1,6})[.,](\d{2})/gi)].map(m => +m[1] * 100 + +m[2])).sort((a, b) => b - a)[0];
    r.total = rep?.[0] ?? rm ?? null;
  }
  if (r.total !== null) r.totalGuessed = true;
}

const isText = l => l !== undefined && /[a-z]{2}/i.test(l) && !AMOUNT.test(l);
const isQtyOnly = l => { const m = l.match(AMOUNT); return !!m && !/[a-z]{2}/i.test(bareName(l.slice(0, m.index).replace(QTY, ''))); };

// One layout per receipt: are item names printed above or below number-only lines? Vote over the receipt.
// Tie: if the first number-only line is also the first money line, the text above it is the header, so names are below.
function namesBelow(lines) {
  const end = lines.findIndex(l => SUBTOTAL.test(l) || (TOTAL.test(l) && AMOUNT.test(l)));   // only the item block: a tax summary after the total votes nothing
  if (end > 0) lines = lines.slice(0, end);
  let above = 0, below = 0, first = -1;
  lines.forEach((l, i) => {
    if (!isQtyOnly(l)) return;
    if (first < 0) first = i;
    if (isText(lines[i - 1])) above++;
    if (isText(lines[i + 1])) below++;
  });
  if (below !== above) return below > above;
  // Tie (text both sides of every number line): the line after the LAST number line decides. A footer there
  // (Total, Item(s): 5, Subtotal) means each name sits above its numbers (Mr DIY, Giant); item text means below.
  const last = lines.reduce((k, l, i) => (isQtyOnly(l) ? i : k), -1), after = lines[last + 1];
  if (last >= 0 && after !== undefined) return !(COUNT.test(after) || TOTAL.test(after) || SUBTOTAL.test(after) || !isText(after));
  return first >= 0 && lines.findIndex(l => AMOUNT.test(l)) === first; // ponytail: vote heuristic; per-merchant layout memory if it misfires
}

// Does items + adjustments equal the printed total? Tries tax-exclusive, then tax-inclusive (retail SST "included").
export function checksum(r) {
  if (r.total === null) return { ok: false, mode: 'no total', diff: null };
  const items = r.items.reduce((s, i) => s + i.cents, 0);
  const round = r.rounding ?? 0, svc = r.service ?? 0, tax = r.tax ?? 0;
  const modes = [
    ['tax added', items + svc + tax + round],
    ['tax included', items + svc + round],
  ];
  for (const [mode, sum] of modes) if (sum === r.total) return { ok: true, mode, diff: 0 };
  return { ok: false, mode: 'mismatch', diff: r.total - modes[0][1] };
}
