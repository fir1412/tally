// Receipt text (from OCR) -> structured receipt. Pure, no DOM. Amounts are integer cents (sen).
// Tuned for Malaysian receipts: SST, service charge, 5-sen rounding, SR/ZR tax codes, day-first dates.
import { calcAmount } from './engine.js';

// "12.90", "12,90", "RM 12.90", "$12.90", "-2.00", "2.00-", then optional trailing tax code or OCR junk
// (SR, ZR, T, *, "2" for a misread Z, "§", ":")
// A glued unit ("1.25L", "0.50KG") is a pack size in a name, not a price with a tax code.
const AMOUNT = /(-)?\s*(?:RM\s*|MYR\s*|\$)?(\d{1,6})[.,] ?(\d{2})(-)?(?:\s*(?!(?:ML|KG|MM|CM|L|G|M)\b)(?:[A-Z]{1,2}|\*)|\s+[^\s\d]{1,2}|\s+\d)?\s*$/i;
const COUNT = /\b(ite[mn]|qty)\s*\(s\)|\bno\.?\s*of\s*items|\bitem\s*count/i; // "Item(s): 5 Qty(s): 5"
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
const SERVICE = /service\s*(charge|chg)|\bsvc\b|\bs\/?c\b|caj\s*perkhidmatan/i;
const TAX = /\bsst\b|\bgst\b|service\s*tax|sales\s*tax|\btax\b|cukai/i;
const ROUNDING = /round|pelarasan|bundar/i;
const DISCOUNT = /disc(ount)?|diskaun|potongan|saving/i;
// Printed shop names end like this; a handwritten name or a garbled logo above them is not the shop.
const COMPANY = /\bsdn\.?\s*bhd|sdnbhd|\bbhd\b|enterprise|trading|restoran|restaurant|supermarket|hypermarket|pharmacy|farmasi|\bkedai\b|\bmart\b|\bstore\b|bakery|\bcafe\b/i;
/** Strip codes, quantities, prices and units: what is left is the item's name (maybe nothing). */
const bareName = s => s.replace(/\d+(?:[.,]\d+)?/g, ' ').replace(/\b(pcs?|set|units?|ea|nos?|btl|pkt|x)\b/gi, ' ').replace(/\s+/g, ' ').trim();
// Year may be glued to the time by OCR: "25/12/20188:13PM", "01/03/1819:14"
const DATE = /(?<!\d)(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2}|\d{2})(?=\d{1,2}:\d{2}|\D|$)|\b(\d{4})-(\d{2})-(\d{2})\b/g;

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
  DATE.lastIndex = 0;
  for (let m; (m = DATE.exec(line)); ) { // first valid one: "REG #19-21/03/2018" tries 19-21/03 first
    let [d, mo, y] = m[4] ? [+m[6], +m[5], +m[4]] : [+m[1], +m[2], +m[3]]; // Malaysia: day first
    if (y < 100) y += 2000;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && y >= 2000 && y <= 2100) return dt.toISOString().slice(0, 10);
    DATE.lastIndex = m.index + 1; // retry one char later so an invalid match can't swallow the real date
  }
  return null; // rejects 31/02, 13/13
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

export function parseReceipt(text) {
  const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const r = { merchant: null, date: null, time: null, items: [], subtotal: null, tax: null, service: null, rounding: null, total: null };
  let pendingName = null; // name line waiting for a "2 x 3.50  7.00" line
  let paid = false;       // after TOTAL, the first payment line (Cash, Visa, Change...) ends the money part
  const below = namesBelow(lines);

  const co = lines.slice(0, 6).find(l => COMPANY.test(l));
  if (co) r.merchant = co.replace(/\s*sdn\.?\s*bhd/i, ' SDN BHD').replace(/([A-Za-z])\(/g, '$1 (').replace(/\)([A-Za-z])/g, ') $1').trim();
  for (const line of lines) {
    if (!r.merchant && /[a-z]{3}/i.test(line)) r.merchant = line;
    if (!r.date) r.date = parseDate(line);
    if (!r.time) r.time = parseTime(line);
    if (r.total !== null && PAYMENT.test(line)) paid = true;
    if (paid) continue; // payment, change, tax summary follow. Only the date is still wanted.

    const m = line.match(AMOUNT);
    const label = m ? line.slice(0, m.index).trim() : line;
    if (!m) {
      const hasText = /[a-z]{2}/i.test(line);
      const last = r.items.at(-1);
      if (hasText && last && last.name === null) { last.name = line; pendingName = null; } // name printed under the price
      else pendingName = hasText ? line : null;
      continue;
    }
    const cents = toCents(m);
    // "Total Saving 0.00 Total 77.20": classify by the words after the last number
    const key = label.replace(/^.*\d[.,]\d{2}\s*/, '') || label;

    const adj = ROUNDING.test(key) ? 'rounding' : SERVICE.test(key) ? 'service' : TAX.test(key) ? 'tax' : null;
    if (SUBTOTAL.test(key)) r.subtotal = cents;
    else if (TOTAL.test(key) && NOT_TOTAL.test(key)) { /* a count or group total: skip */ }
    else if (TOTAL.test(key) && (!adj || TOTAL_WINS.test(key))) r.total = Math.max(Math.abs(cents), ...amountsIn(line)); // "Total (incl Tax) 17.80 0.00"; "RM-38.80" is OCR noise
    else if (adj) { r[adj] = (r[adj] ?? 0) + cents; if (adj === 'tax' && /incl/i.test(key)) r.taxIncluded = true; }
    else if (DISCOUNT.test(key) && !cents) { /* "Discount 0.00": nothing to record */ }
    else if (r.subtotal === null && r.total === null && !COUNT.test(label)) { // items stop at the subtotal or first real total
      const name = label.replace(QTY, '').trim();
      const qtyOnly = !/[a-z]{2}/i.test(bareName(name));   // "2587 1.00 PCS 48.00": code, qty and price; the name is elsewhere
      // Number-only line: its name is the line above, or (code-qty-price layout) the line below, filled in above
      r.items.push({ name: qtyOnly ? (below ? null : pendingName) : name, cents });
    }
    pendingName = null;
  }
  if (r.total === null) guessTotal(r, lines);
  // A misread line can land in tax/service/rounding: none can be a third of the bill, and rounding is at most 5 sen.
  if (r.total) for (const k of ['tax', 'service']) if (Math.abs(r[k] ?? 0) * 3 > r.total) r[k] = null;
  if (Math.abs(r.rounding ?? 0) > 5) r.rounding = null;
  r.check = checksum(r);
  return r;
}

const amountsIn = line => [...line.matchAll(ALL_AMOUNTS)].map(m => +m[1] * 100 + +m[2]);
/**
 * No "Total" line (e-wallet and bank slips, torn receipts): subtotal plus adjustments, else the amount printed
 * most often (slips repeat it), else the largest RM amount. Marked totalGuessed so the review screen flags it.
 */
function guessTotal(r, lines) {
  if (r.subtotal !== null) r.total = r.subtotal + (r.service ?? 0) + (r.taxIncluded ? 0 : r.tax ?? 0) + (r.rounding ?? 0);
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
  let above = 0, below = 0, first = -1;
  lines.forEach((l, i) => {
    if (!isQtyOnly(l)) return;
    if (first < 0) first = i;
    if (isText(lines[i - 1])) above++;
    if (isText(lines[i + 1])) below++;
  });
  if (below !== above) return below > above;
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
