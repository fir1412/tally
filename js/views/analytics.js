// Insights analytics: the month-end forecast (this month, near the top) and cards below it, each closed to one line
// with its headline figure. Sums come from engine.js; every chart has its numbers in text next to it or in a hidden table.
import { S, booked, today, startDay, thisMonth, scope, budgetsFor, inScope, settings, cat, cached } from '../state.js';
import { t, fmtDate, fmtMonth, cycleShort, getLang } from '../i18n.js';
import { esc, short, ICON } from '../ui.js';
import { fmtRM, addDays, addMonths, cycleSpan, monthIncomes, monthSpends, forecast, perMonth, billStatus, recurringCandidates, fixedFlexible, dailySpend, whenGrid, topShops, paymentMix, savingsRate, foodSplit, taxPaid, jointIn, taxRelief, priceHistory, basketIndex } from '../engine.js';
import { catLabel, showIds, downloadReceipts } from './money.js';
import { receiptName, csvLine } from '../io.js';

const OPEN = new Set();   // cards opened stay open across re-renders (a scope or month change)
const card = (id, title, head, body) => `<details class="card acard"${OPEN.has(id) ? ' open' : ''}><summary data-act="acard" data-id="${id}"><span class="grow"><span class="lbl">${esc(title)}</span><b>${esc(head)}</b></span><span class="chev" aria-hidden="true"></span></summary>${body}</details>`;
const pct = x => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(Math.round(x * 1000) / 10)}%`;
const later = msg => `<p class="fine">${esc(msg)}</p>`;
/** A bar split into parts [{label, v, color}] with a legend carrying the amounts (colour is never the only signal). */
function split(parts, label) {
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1, on = parts.filter(p => p.v > 0);
  return `<div class="sbar" role="img" aria-label="${esc(`${label}: ${on.map(p => `${p.label} ${fmtRM(p.v)}`).join(', ')}`)}">${on.map(p => `<i style="flex:${p.v};background:${p.color}"></i>`).join('')}</div>
    <ul class="slegend">${parts.map(p => `<li><span class="key" style="background:${p.color}"></span><span class="grow">${esc(p.label)}</span><span class="num">${esc(fmtRM(p.v))}</span><span class="fine">${Math.round(p.v / tot * 100)}%</span></li>`).join('')}</ul>`;
}
/** Horizontal bars for a short ranked list [{name, v, text}]. */
const hbars = (rows, max) => `<ol class="hbars">${rows.map(r => `<li><span class="grow">${esc(r.name)}</span><span class="num">${esc(r.text)}</span><i style="width:${Math.max(3, Math.round(r.v / (max || 1) * 100))}%" aria-hidden="true"></i></li>`).join('')}</ol>`;
const weekStart = () => (settings().weekStart === 0 ? 0 : 1);
const dayName = (w, style = 'short') => new Intl.DateTimeFormat(getLang() === 'zh' ? 'zh-CN' : getLang(), { weekday: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + w)));   // 1 Jan 2023 was a Sunday
const billShops = () => { const known = S.recurring.filter(b => inScope(b)).map(b => b.key); return [...known, ...cached(recurringCandidates, booked(), known).map(r => r.key)]; };
// Worked out once per data change (state.js cached): these take the transactions first.
const forecastOf = (txs, o) => forecast({ txs, ...o });

// ---- 3. month-end forecast ---------------------------------------------------------------------------------------------------
export function forecastCard() {
  const B = budgetsFor().total, f = cached(forecastOf, booked(), { today: today(), startDay: startDay(), budget: B, bills: S.recurring.filter(b => inScope(b)) });
  const head = `<span class="lbl">${esc(t('Month-end forecast'))}</span>`;
  if (!f.spent && !f.rate) return `<section class="card fcast">${head}${later(t('Appears after a few days of spending.'))}</section>`;
  const pace = f.projected - f.spent - f.upcoming, max = Math.max(f.projected, B) || 1, at = Math.min(100, B / max * 100);
  const w = v => `${(v / max * 100).toFixed(2)}%`;
  const parts = [[t('Spent so far'), f.spent, 'spent'], [t('Bills still due'), f.upcoming, 'due'], [t('At your usual pace'), pace, 'pace']];
  return `<section class="card fcast">${head}
    <div class="rowb"><b class="big num">${esc(fmtRM(f.projected))}</b>${B ? `<span class="pill ${f.projected > B ? 'bad' : 'good'}">${esc(f.projected > B ? t('{0} over budget', fmtRM(f.projected - B)) : t('{0} under budget', fmtRM(B - f.projected)))}</span>` : ''}</div>
    <p class="fine">${esc(t('Expected by {0}', fmtDate(f.end)))}</p>
    <div class="fbar" role="img" aria-label="${esc(`${parts.map(([l, v]) => `${l} ${fmtRM(v)}`).join(', ')}${B ? `, ${t('Budget')} ${fmtRM(B)}` : ''}`)}">
      <div class="sbar">${parts.filter(p => p[1] > 0).map(([, v, k]) => `<i class="${k}" style="width:${w(v)}"></i>`).join('')}</div>
      ${B ? `<span class="mark${at > 70 ? ' end' : ''}" style="left:${at.toFixed(2)}%"><span>${esc(t('Budget'))} ${esc(short(B))}</span></span>` : ''}</div>
    <ul class="slegend">${parts.map(([l, v, k]) => `<li><span class="key ${k}"></span><span class="grow">${esc(l)}</span><span class="num">${esc(fmtRM(v))}</span></li>`).join('')}</ul>
    ${f.safe != null ? `<p class="safe"><span class="lbl">${esc(t('Safe to spend'))}</span><b class="num">${esc(t('{0} a day', fmtRM(f.safe)))}</b><small>${esc(t('for {0} days, today included', f.daysLeft + 1))}</small></p>` : ''}
    <p class="fine">${esc(t('Spent so far, bills still due, and your everyday pace. One-off big buys count once.'))}${f.early ? ` ${esc(t("Early in the month, last month's pace is used."))}` : ''}</p></section>`;
}

// ---- 4. fixed vs flexible ----------------------------------------------------------------------------------------------------
function fixedCard(M) {
  const sd = startDay(), ff = cached(fixedFlexible, booked(), M, sd, billShops()), tdy = today();
  const known = S.recurring.filter(b => inScope(b) && billStatus(b, tdy, S.tx).next).map(b => ({ name: b.name, v: perMonth(b) }));
  const found = cached(recurringCandidates, booked(), S.recurring.map(b => b.key)).map(r => ({ name: r.merchant, v: r.amount }));
  const regular = [...known, ...found].sort((a, b) => b.v - a.v), perMo = regular.reduce((s, r) => s + r.v, 0);
  const body = ff.fixed + ff.flexible ? split([{ label: t('Bills and subscriptions'), v: ff.fixed, color: 'var(--warn)' }, { label: t('Day to day'), v: ff.flexible, color: 'var(--accent)' }], t('Fixed and flexible spending')) : later(t('No spending in {0}.', fmtMonth(M, sd)));
  return card('fixed', t('Fixed vs flexible'), ff.fixed + ff.flexible ? t('Fixed {0} · flexible {1}', fmtRM(ff.fixed), fmtRM(ff.flexible)) : t('No spending yet'), `${body}
    ${regular.length ? `<h3>${esc(t('Bills and subscriptions: {0} a month', fmtRM(perMo)))}</h3>${hbars(regular.slice(0, 6).map(r => ({ ...r, text: fmtRM(r.v) })), regular[0].v)}${found.length ? `<p class="fine">${esc(t('Includes {0} Tally spotted that are not set up as bills yet.', found.length))}</p>` : ''}` : later(t('Bills you add in Budgets, and ones Tally spots, are listed here.'))}`);
}

// ---- 5. when and where -------------------------------------------------------------------------------------------------------
const SLOTS = () => [t('Morning'), t('Afternoon'), t('Evening'), t('Late night')];
function whenCard(M) {
  const sd = startDay(), span = cycleSpan(M, sd), days = cached(dailySpend, booked(), M, sd), ws = weekStart();
  const end = M === thisMonth() ? today() : span.end, wg = cached(whenGrid, booked(), addDays(end, -89), end), shops = cached(topShops, booked(), M, sd);
  const lead = (new Date(`${span.start}T00:00:00Z`).getUTCDay() - ws + 7) % 7, order = Array.from({ length: 7 }, (_, i) => (ws + i) % 7);
  const spentDays = days.filter(d => d.v);
  const cal = spentDays.length ? `<div class="cal" aria-hidden="true">${order.map(w => `<span class="wd">${esc(dayName(w, 'narrow'))}</span>`).join('')}${'<span></span>'.repeat(lead)}${days.map(d => `<span class="d l${d.level}"><b>${+d.date.slice(8)}</b><small>${d.v ? esc(short(d.v)) : ''}</small></span>`).join('')}</div>
    <p class="legendrow" aria-hidden="true">${esc(t('Less'))}${[1, 2, 3, 4].map(l => `<span class="key l${l}"></span>`).join('')}${esc(t('More'))}</p>
    <table class="sr"><caption>${esc(t('Spending by day'))}</caption>${spentDays.map(d => `<tr><th>${esc(fmtDate(d.date))}</th><td>${esc(fmtRM(d.v))}</td></tr>`).join('')}</table>` : later(t('No spending in {0}.', fmtMonth(M, sd)));
  const gmax = Math.max(0, ...wg.grid.flat()), lvl = v => (v ? Math.ceil(v / gmax * 4) : 0);
  const grid = gmax ? `<table class="wgrid"><caption class="fine">${esc(t('Everyday spending by time, last 90 days'))}</caption><thead><tr><td></td>${SLOTS().map(s => `<th scope="col">${esc(s)}</th>`).join('')}</tr></thead>
    <tbody>${order.map(w => `<tr><th scope="row">${esc(dayName(w))}</th>${wg.grid[w].map(v => `<td class="l${lvl(v)}">${v ? esc(short(v)) : '<span class="nil">·</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : later(t('Appears once entries have a time of day.'));
  const head = wg.late.n >= 2 ? t('Late-night food delivery: {0} in 90 days', fmtRM(wg.late.v))
    : wg.top ? t('Most on {0} {1}: {2}', dayName(wg.top.w), SLOTS()[wg.top.s].toLowerCase(), catLabel(wg.top.category))
      : shops.money[0] ? t('Most at {0}: {1}', shops.money[0].name, fmtRM(shops.money[0].v)) : t('No spending yet');
  const shopHtml = shops.money.length ? `<div class="two"><div><h3>${esc(t('Top shops by money'))}</h3>${hbars(shops.money.map(s => ({ ...s, text: fmtRM(s.v) })), shops.money[0].v)}</div>
    <div><h3>${esc(t('Top shops by visits'))}</h3>${hbars(shops.visits.map(s => ({ ...s, v: s.n, text: `${s.n}×` })), shops.visits[0].n)}</div></div>` : '';
  return card('when', t('When and where'), head, `<h3>${esc(fmtMonth(M, sd))}</h3>${cal}${grid}${shopHtml}`);
}

// ---- 6. payment mix and savings rate ------------------------------------------------------------------------------------------
const KINDS = { cash: ['Cash', '#65A30D'], bank: ['Bank account', '#2563EB'], ewallet: ['E-wallet', '#D946EF'], card: ['Credit card', '#F97316'], savings: ['Savings', '#06B6D4'] };
/** Savings rate per month as bars from a zero line, each labelled with its %. */
function rateBars(rows, label) {
  const W = 340, H = 140, T = 18, B = 22, rs = rows.map(r => (r.rate == null ? 0 : Math.max(-1, Math.min(1, r.rate))));
  const hi = Math.max(0.05, ...rs), lo = Math.max(0, ...rs.map(r => -r)), y0 = T + (H - T - B) * hi / (hi + lo), bw = (W - 16) / rows.length;
  let g = `<line x1="8" x2="${W - 8}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}" stroke="var(--line)"/>`;
  rows.forEach((r, i) => {
    const v = rs[i], h = Math.abs(v) / (hi + lo) * (H - T - B), x = 8 + i * bw + bw * 0.2, y = v >= 0 ? y0 - h : y0, cx = (8 + i * bw + bw / 2).toFixed(1);
    if (r.rate != null) g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="2" fill="var(--chart-${v < 0 ? 'bad' : 'good'})"/>`;
    g += `<text x="${cx}" y="${(v >= 0 ? y - 4 : y + h + 12).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--ink)">${r.rate == null ? '–' : esc(pct(r.rate).replace('+', ''))}</text>`;
    g += `<text x="${cx}" y="${H - 5}" text-anchor="middle" font-size="11" fill="var(--mute)">${esc(r.label)}</text>`;
  });
  return `<svg class="chartsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${label}: ${rows.map(r => `${r.label} ${r.rate == null ? '–' : pct(r.rate)}`).join(', ')}`)}">${g}</svg>`;
}
function payCard(M) {
  const sd = startDay(), mix = cached(paymentMix, booked(), S.accounts, M, sd);
  const yms = Array.from({ length: 6 }, (_, k) => addMonths(M, k - 5)), ins = cached(monthIncomes, booked(), yms, sd), outs = cached(monthSpends, booked(), yms, sd);
  const months = yms.map(m => { const i = ins[m], o = outs[m].total; return { m, label: cycleShort(m, sd), rate: savingsRate(i, o), i, o }; });
  const now = months.at(-1), has = months.some(r => r.i || r.o);
  const head = now.rate == null ? t('No money in yet this month') : now.rate >= 0 ? t('Kept {0}% of money in', Math.round(now.rate * 100)) : t('Spent {0} more than came in', fmtRM(now.o - now.i));
  const parts = Object.entries(KINDS).map(([k, [n, c]]) => ({ label: t(n), v: mix[k] || 0, color: c })).filter(p => p.v);
  return card('pay', t('Payment mix and savings'), head, `<h3>${esc(t('Paid with'))}</h3>${parts.length ? split(parts, t('Paid with')) : later(t('No spending in {0}.', fmtMonth(M, sd)))}
    <h3>${esc(t('Savings rate'))}</h3>${has ? rateBars(months, t('Savings rate')) : later(t('Appears after money in and out are added.'))}
    <p class="fine">${esc(t('(money in − money out) ÷ money in, each month.'))}</p>`);
}

// ---- 7. eating out vs cooking --------------------------------------------------------------------------------------------------
function foodCard(M) {
  const sd = startDay(), f = cached(foodSplit, booked(), M, sd), year = M.slice(0, 4), tx = cached(taxPaid, booked(), year), out = f.dining + f.delivery;
  const body = f.groceries + out ? split([{ label: t('Groceries (cooking)'), v: f.groceries, color: cat('groceries').color }, { label: t('Dining out'), v: f.dining, color: cat('dining').color }, { label: t('Delivery'), v: f.delivery, color: '#DB2777' }], t('Food')) : later(t('Appears after some food spending.'));
  return card('food', t('Eating out vs cooking'), f.groceries + out ? t('Eating out {0} · cooking {1}', fmtRM(out), fmtRM(f.groceries)) : t('No food spending yet'), `${body}
    <p class="fine">${esc(t('Delivery: GrabFood, foodpanda, ShopeeFood and the like.'))}</p>
    <h3>${esc(t('SST and service charge in {0}', year))}</h3>${tx.n ? `<p class="rowb"><span>${esc(t('SST'))} <b class="num">${esc(fmtRM(tx.sst))}</b></span><span>${esc(t('Service charge'))} <b class="num">${esc(fmtRM(tx.service))}</b></span></p><p class="fine">${esc(t('From {0} receipts that show them.', tx.n))}</p>` : later(t('Appears when scanned receipts show SST or a service charge.'))}`);
}

// ---- 2. your prices --------------------------------------------------------------------------------------------------------------
function spark(points) {
  const W = 84, H = 28, vs = points.map(p => p.unit), lo = Math.min(...vs), sp = Math.max(...vs) - lo || 1;
  const xy = points.map((p, i) => [2 + i / (points.length - 1) * (W - 6), H - 4 - (p.unit - lo) / sp * (H - 8)]);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${xy.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${xy.at(-1)[0].toFixed(1)}" cy="${xy.at(-1)[1].toFixed(1)}" r="3" fill="var(--accent)"/></svg>`;
}
function pricesCard() {
  const hist = cached(priceHistory, booked()), b = basketIndex(hist, today());
  const head = b ? t('Your basket {0} since {1}', pct(b.pct), fmtDate(b.since)) : hist.length ? t('{0} items you buy often', hist.length) : t('Not enough receipts yet');
  const rows = hist.slice(0, 6).map(h => {
    const first = h.points[0].unit, last = h.points.at(-1).unit, ch = (last - first) / first;
    return `<li>${spark(h.points)}<span class="grow"><b>${esc(h.name)}</b><small>${esc(t('{0} buys', h.points.length))}</small><span class="sr">${esc(h.points.map(p => `${fmtDate(p.date)} ${fmtRM(p.unit)}`).join(', '))}</span></span>
      <span class="pr"><b class="num">${esc(fmtRM(last))}</b><small class="${ch > 0.005 ? 'bad' : ch < -0.005 ? 'good' : 'fine'}">${Math.abs(ch) < 0.005 ? esc(t('same')) : `${ch > 0 ? '▲' : '▼'} ${esc(pct(Math.abs(ch)).replace('+', ''))}`}</small></span></li>`;
  }).join('');
  return card('prices', t('Your prices'), head, hist.length ? `${b ? `<p class="fine">${esc(t('Your usual basket ({0} items) at today\'s prices against {1}: {2} then, {3} now.', b.n, fmtDate(b.since), fmtRM(b.then), fmtRM(b.now)))}</p>` : ''}<ul class="prices">${rows}</ul>`
    : later(t('Appears once an item is on 3 receipts.')));
}

// ---- 1. LHDN tax relief ----------------------------------------------------------------------------------------------------------
const reliefYear = M => M.slice(0, 4);
function reliefCard(M) {
  const year = reliefYear(M), lines = cached(taxRelief, booked(), year), got = lines.filter(l => l.entries.length), total = got.reduce((s, l) => s + l.total, 0);
  const rows = got.map(l => `<li><button class="rbtn" data-act="relief-show" data-id="${esc(l.id)}" data-y="${year}"><span class="rowb"><b>${esc(t(l.name))}</b><span class="num">${esc(fmtRM(l.total))}</span></span>
    <small>${esc(l.entries.length === 1 ? t('1 entry') : t('{0} entries', l.entries.length))} · ${esc(t('{0} with receipt photo', l.proof))}</small></button></li>`).join('');
  const none = lines.filter(l => !l.entries.length).map(l => t(l.name));
  return card('relief', t('Possible tax-relief expenses in {0}', year), got.length ? t('{0} in spending to review', fmtRM(total)) : t('Nothing found yet for {0}', year),
    `${rows ? `<ul class="relief">${rows}</ul>` : ''}${got.some(l => l.proof) ? `<button class="btn ghost" data-act="relief-dl" data-y="${year}">${ICON.download}${esc(t('Download the receipts for {0}', year))}</button>` : ''}${none.length ? `<p class="fine">${esc(t('Not found yet: {0}.', none.join(', ')))}</p>` : ''}
    <p class="fine">${esc(t('Matched from receipt words and categories. These are recorded expenses, not a claim estimate. Eligibility and limits depend on the assessment year and your circumstances. Check LHDN before claiming.'))} <a class="srclink" href="https://www.hasil.gov.my/individu/pelepasan-cukai/" target="_blank" rel="noopener noreferrer">${esc(t('LHDN source: YA 2025 rules'))}</a></p>`);
}

// ---- 8. couples: who put money into the joint account --------------------------------------------------------------------------
function jointCard(M) {
  const sd = startDay(), rows = jointIn(booked(), new Set(S.accounts.filter(a => a.scope === 'joint').map(a => a.id)), M, sd);
  const who = r => (r.me ? settings().myName || t('You') : r.name || t('Your partner'));
  const colors = ['var(--accent)', '#D946EF', 'var(--warn)'];
  return card('joint', t('Into the joint account'), rows.length ? rows.map(r => `${who(r)} ${fmtRM(r.v)}`).join(' · ') : t('Nothing put in yet this month'),
    `${rows.length ? split(rows.map((r, i) => ({ label: who(r), v: r.v, color: colors[i % 3] })), t('Into the joint account')) : ''}<p class="fine">${esc(t('Transfers and income into joint accounts in {0}. Entries from your partner\'s file count as theirs.', fmtMonth(M, sd)))}</p>`);
}

/** The analytics cards for month M, most useful first; one short placeholder for a new user instead of empty charts. */
export function analyticsCards(M) {
  const n = booked().filter(x => x.type === 'expense').length, need = 5;
  if (n < need) return `<section class="card"><h2>${esc(t('More insights'))}</h2>${later(t('Forecasts, prices, tax relief and more appear after {0} more entries.', need - n))}</section>`;
  return [scope() === 'joint' && jointCard(M), fixedCard(M), foodCard(M), whenCard(M), payCard(M), pricesCard(), reliefCard(M)].filter(Boolean).join('');
}

export const act = {
  acard: b => { const d = b.parentElement, id = b.dataset.id; d.open = !d.open; if (d.open) OPEN.add(id); else OPEN.delete(id); },
  // Every relief's receipt photos in a folder of its own, with a list of all its entries (photo or not) for the tax form.
  'relief-dl': b => {
    const y = b.dataset.y, byId = new Map(S.tx.map(x => [x.id, x])), taken = new Set(), rows = [], csv = [csvLine(['Relief', 'Date', 'Shop', 'Amount (RM)', 'Photo'])];
    for (const l of cached(taxRelief, booked(), y)) for (const e of l.entries) {
      const tx = byId.get(e.id); if (!tx) continue;
      if (tx.receiptId) rows.push({ tx, dir: t(l.name) });
      csv.push(csvLine([t(l.name), e.date, e.merchant || '', (e.cents / 100).toFixed(2), tx.receiptId ? receiptName(tx, taken, t(l.name)) : '']));
    }
    return downloadReceipts(rows, `tally-tax-relief-${y}`, '﻿' + csv.join('\n'));
  },
  'relief-show': b => {
    const l = cached(taxRelief, booked(), b.dataset.y).find(x => x.id === b.dataset.id);
    if (l) showIds(l.entries.map(e => e.id), `${t(l.name)} ${b.dataset.y}`);
  },
};
