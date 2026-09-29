// Malaysian bank and e-wallet statements (PDF text) → transactions. Pure: no DOM, no pdf.js.
// Layouts differ by bank, but every statement line has a date, a description, an amount and usually a running
// balance. The change in balance says whether money came in or went out, which works for any column layout;
// explicit markers (trailing "-", DR/CR, +/−) and words ("SALARY", "REFUND") cover lines without a balance.
import { validIso, categorize } from './engine.js';
import { cleanDesc } from './io.js';

// Banks and e-wallets, matched on the statement text. Order matters: specific names before generic ones.
export const PROVIDERS = [
  ['tng', "Touch 'n Go eWallet", /touch\s*['’]?\s*n\s*go|tng\s*digital|tng\s*ewallet/i],
  ['grabpay', 'GrabPay', /grabpay/i], ['shopeepay', 'ShopeePay', /shopeepay/i], ['bigpay', 'BigPay', /bigpay/i],
  ['gxbank', 'GXBank', /gx\s*bank/i], ['aeonbank', 'AEON Bank', /aeon\s*bank/i], ['boostbank', 'Boost Bank', /boost\s*bank/i],
  ['boost', 'Boost', /\bboost\b/i], ['kaf', 'KAF Digital', /kaf\s*digital/i], ['ryt', 'Ryt Bank', /ryt\s*bank/i],
  ['maybank', 'Maybank', /maybank|malayan banking/i], ['cimb', 'CIMB', /\bcimb\b/i], ['publicbank', 'Public Bank', /public\s*bank|pbe(bank)?\b/i],
  ['rhb', 'RHB', /\brhb\b/i], ['hongleong', 'Hong Leong Bank', /hong\s*leong/i], ['ambank', 'AmBank', /\bam\s*bank|ambank/i],
  ['bankislam', 'Bank Islam', /bank\s*islam/i], ['bankrakyat', 'Bank Rakyat', /bank\s*rakyat/i], ['bsn', 'BSN', /\bbsn\b|bank\s*simpanan\s*nasional/i],
  ['muamalat', 'Bank Muamalat', /muamalat/i], ['affin', 'Affin Bank', /affin/i], ['alliance', 'Alliance Bank', /alliance\s*bank/i],
  ['agrobank', 'Agrobank', /agro\s*bank/i], ['mbsb', 'MBSB Bank', /\bmbsb\b/i], ['uob', 'UOB', /\buob\b|united overseas/i],
  ['ocbc', 'OCBC', /\bocbc\b/i], ['hsbc', 'HSBC', /\bhsbc\b/i], ['scb', 'Standard Chartered', /standard\s*chartered/i],
  ['citibank', 'Citibank', /citi\s*bank|\bciti\b/i], ['alrajhi', 'Al Rajhi Bank', /al[\s-]*rajhi/i],
];
export const detectProvider = text => PROVIDERS.find(([, , re]) => re.test(text))?.slice(0, 2) || null;
export const isWallet = id => ['tng', 'grabpay', 'shopeepay', 'bigpay', 'boost'].includes(id);

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, mac: 3, mei: 5, ogo: 8, okt: 10, dis: 12 };
const y4 = y => (y == null ? null : y < 100 ? 2000 + y : y);
/** A date at the start of a line → {d, m, y|null, len}. 01/09/2026, 1-9-26, 01.09.2026, 01/09, 2026-09-01, 01 SEP 2026, 01SEP26. */
export function leadDate(line) {
  const s = line.trimStart(), off = line.length - s.length;
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/))) return { d: +m[3], m: +m[2], y: +m[1], len: off + m[0].length };
  const ok = (d, mo) => d >= 1 && d <= 31 && mo >= 1 && mo <= 12;
  // Slash/dash dates may omit the year ("01/09"); dotted ones must have it, or "10.00" (money) would read as a date.
  if ((m = s.match(/^(\d{1,2})([/-])(\d{1,2})(?:\2(\d{4}|\d{2}))?(?![\d.,])/)) && ok(+m[1], +m[3])) return { d: +m[1], m: +m[3], y: y4(m[4] ? +m[4] : null), len: off + m[0].length };
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?![\d.,])/)) && ok(+m[1], +m[2])) return { d: +m[1], m: +m[2], y: y4(+m[3]), len: off + m[0].length };
  if ((m = s.match(/^(\d{1,2})[\s-]?([A-Za-z]{3})[a-z]*(?:[\s-,]*(\d{4}|\d{2})(?![\d:.,]))?/)) && MON[m[2].toLowerCase()] && ok(+m[1], MON[m[2].toLowerCase()])) return { d: +m[1], m: MON[m[2].toLowerCase()], y: y4(m[3] ? +m[3] : null), len: off + m[0].length };
  return null;
}

// Money: 1,234.56 with optional RM, leading +/−, trailing "-" (Maybank debit), DR/CR, or (brackets).
const MONEY = /(\()?([+\-−])?\s?(?:RM\s?)?(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(\))?(?:\s?(DR|CR|Dr|Cr)\b|([+\-])(?!\d))?/g;
/** Money tokens in a piece of text → [{sen, sign (1, −1 or 0 when unmarked), at}]. */
export function amounts(text) {
  const out = [];
  for (const m of text.matchAll(MONEY)) {
    const start = m.index + (m[0].length - m[0].trimStart().length);
    if (/[\d/:]/.test(text[start - 1] || '')) continue; // part of a date, time or reference number
    const sen = parseInt(m[3].replace(/,/g, ''), 10) * 100 + parseInt(m[4], 10);
    const neg = (m[1] && m[5]) || m[2] === '-' || m[2] === '−' || m[7] === '-' || /dr/i.test(m[6] || '');
    const pos = m[2] === '+' || m[7] === '+' || /cr/i.test(m[6] || '');
    out.push({ sen, sign: neg ? -1 : pos ? 1 : 0, at: start });
  }
  return out;
}

const OPENING = /opening|beginning|brought\s*forward|b\/f|balance\s*from|previous\s*(statement\s*)?balance|baki\s*(awal|mula|dibawa|permulaan)|期初|上期/i;
const CLOSING = /closing|ending\s*balance|carried\s*forward|c\/f|baki\s*(akhir|penutup)|期末/i;
const SKIP = /total\s*(debit|credit|withdrawal|deposit)|jumlah\s*(debit|kredit)|page\s*\d|halaman|failed|unsuccessful|gagal|reversed/i;
const IN_WORDS = /salary|gaji|payroll|refund|pemulangan|interest|profit|hibah|dividend|cash\s*back|rebate|deposit|transfer\s*from|trf\s*from|fund\s*transfer\s*in|received|receive|terima|masuk|credit\s*advice|reload|top[\s-]?up|duitnow\s*(in|received)/i;
const signed = a => a.sen * (a.sign < 0 ? -1 : 1);

/** The statement's latest year and month, from any full date on it (statement date, period end, last row). */
export function statementEnd(lines) {
  let best = null;
  for (const l of lines) {
    for (const m of l.matchAll(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)|(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})|(\d{4})-(\d{2})-(\d{2})/g)) {
      const [y, mo] = m[1] ? [y4(+m[3]), +m[2]] : m[4] ? [+m[6], MON[m[5].toLowerCase()]] : [+m[7], +m[8]];
      if (!mo || mo > 12 || y < 2000 || y > 2100) continue;
      if (!best || y * 100 + mo > best.y * 100 + best.m) best = { y, m: mo };
    }
  }
  return best;
}

/**
 * Text lines of a statement → {provider, rows: [{date, desc, amount (signed sen), balance?}], opening, closing,
 * reconciled}. reconciled: opening + every amount = closing, the check the user sees before importing.
 */
export function parseStatement(lines) {
  const provider = detectProvider(lines.join('\n')), end = statementEnd(lines);
  let opening = null, closing = null;
  const rows = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const dt = leadDate(line);
    const rest = dt ? line.slice(dt.len).trim() : line;
    const am = amounts(rest);
    if (OPENING.test(rest)) { if (am.length) opening = signed(am.at(-1)); continue; }
    if (CLOSING.test(rest)) { if (am.length) closing = signed(am.at(-1)); continue; }
    if (SKIP.test(line)) continue;
    if (!dt) {
      const last = rows.at(-1);
      if (!last) continue;
      if (!last.cash.length && am.length) last.cash = am;                                              // amounts on the next line
      else if (!am.length && last.extra < 2 && /[a-z]{2}/i.test(line)) { last.desc += ` ${line}`; last.extra++; } // wrapped description
      continue;
    }
    rows.push({ dt, desc: (am.length ? rest.slice(0, am[0].at) : rest).trim(), cash: am, extra: 0 });
  }

  let prev = opening;
  const out = [];
  for (const r of rows) {
    const bal = r.cash.length >= 2 ? r.cash.at(-1) : null;
    const mv = (bal ? r.cash.slice(0, -1) : r.cash).find(a => a.sen > 0);
    if (!mv) continue;
    const balance = bal ? signed(bal) : null;
    let sign = 0;
    if (balance != null && prev != null && Math.abs(balance - prev) === mv.sen) sign = Math.sign(balance - prev); // the balance says it
    if (!sign) sign = mv.sign;                                                                              // marked on the amount
    if (!sign) sign = IN_WORDS.test(r.desc) ? 1 : -1;                                                       // the words say it
    prev = balance ?? (prev != null ? prev + sign * mv.sen : null);
    // Year: printed, else the statement's; a month after the statement's last month belongs to the year before.
    let y = r.dt.y ?? end?.y ?? new Date().getFullYear();
    if (r.dt.y == null && end && r.dt.m > end.m) y -= 1;
    const date = `${y}-${String(r.dt.m).padStart(2, '0')}-${String(r.dt.d).padStart(2, '0')}`;
    if (validIso(date)) out.push({ date, desc: r.desc.replace(/\s+/g, ' ').slice(0, 120), amount: sign * mv.sen, ...(balance != null ? { balance } : {}) });
  }
  if (closing == null && out.at(-1)?.balance != null) closing = out.at(-1).balance;
  if (opening == null && out[0]?.balance != null) opening = out[0].balance - out[0].amount;
  const sum = out.reduce((s, r) => s + r.amount, 0);
  return { provider, rows: out, opening, closing, reconciled: out.length > 0 && opening != null && closing != null && opening + sum === closing };
}

/** Statement rows → Tally transactions for one account. */
export function statementToTx(rows, { accountId, source = 'statement', now = Date.now() }) {
  return rows.map((r, i) => {
    const merchant = cleanDesc(r.desc.replace(/\b\d{6,}\b/g, '').replace(/\s{2,}/g, ' ')).slice(0, 80);
    const type = r.amount > 0 ? 'income' : 'expense';
    return { id: `s${now.toString(36)}_${i}`, date: r.date, type, amount: Math.abs(r.amount), accountId, merchant,
      category: type === 'income' ? (/salary|gaji|payroll/i.test(r.desc) ? 'salary' : 'income') : categorize(merchant, merchant), note: '', source, createdAt: now };
  });
}

/** pdf.js text items ({str, transform}) → lines, top to bottom, left to right. Items within 3 units share a line. */
export function linesFromItems(items) {
  const rows = [];
  for (const it of items) {
    if (!it.str?.trim()) continue;
    const x = it.transform[4], y = it.transform[5];
    let row = rows.find(r => Math.abs(r.y - y) <= 3);
    if (!row) rows.push(row = { y, parts: [] });
    row.parts.push({ x, s: it.str.trim() });
  }
  return rows.sort((a, b) => b.y - a.y).map(r => r.parts.sort((a, b) => a.x - b.x).map(p => p.s).join('  '));
}
