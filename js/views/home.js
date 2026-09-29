// Home (balance, month, one banner, recent) and Insights (charts, habits, the insight feed).
import { S, today, nowLocal, nowTime, settings, setKv, cat, booked, scopedAccounts, budgetsFor, inScope, startDay, thisMonth } from '../state.js';
import { t, fmtDate, fmtMonth, monShort, cycleShort } from '../i18n.js';
import { esc, ICON, lineChart, pairBars, donut, openSheet, toast, countUp, replay, landing, $ } from '../ui.js';
import { fmtRM, balances, monthOf, monthSpend, monthIncome, addMonths, pace, cashFlow, balanceTrend, insights, habits, dueNudge, daysBetween, itemKey, cycleKey, cycleSpan, billStatus, fmtAcct, offTotal } from '../engine.js';
import { habitEvent, ics, googleUrl, safeId } from '../calendar.js';
import { download } from '../io.js';
import { render, go } from '../app.js';
import { txRow, catLabel, dot, openTxSheet, scopeSwitch } from './money.js';
import { learnHome, streakHome } from './learn.js';
import { ring, weekRecap, niceFinds, pickFind } from '../delight.js';
import { analyticsCards, forecastCard, act as analyticsAct } from './analytics.js';

/** Fill an insight template: [English, ...values] where a value may be {cat}, {raw}, {date} or {list}. */
export function fill([tpl, ...vals]) {
  return t(tpl, ...vals.map(v => {
    if (v && typeof v === 'object') {
      if ('cat' in v) return v.cat === 'total' ? t('Monthly budget') : catLabel(v.cat);
      if ('raw' in v) return v.raw;
      if ('date' in v) return fmtDate(v.date);
      if ('list' in v) return v.list.map(([c, a]) => `${catLabel(c.cat)} ${a}`).join(', ');
    }
    return v;
  }));
}
/** One insight in the feed (a bill suggestion has Add). */
const feedItem = i => `<li class="banner ${i.level}">${i.level === 'warn' ? ICON.alert : i.kind === 'recurring' ? ICON.bell : ICON.chart}<span class="grow"><b>${esc(fill(i.title))}</b><small>${esc(fill(i.body))}</small></span>
        ${i.rec ? `<button class="btn small" data-act="go" data-to="budgets">${esc(t('Add'))}</button>` : ''}${i.cat && i.cat !== 'total' ? `<button class="btn small ghost" data-act="cat-show" data-c="${esc(i.cat)}">${esc(t('See'))}</button>` : ''}<button class="icon-btn" data-act="dismiss" data-id="${esc(i.id)}" aria-label="${esc(t('Dismiss'))}">${ICON.x}</button></li>`;
const habitText = h => t(h.days === 'weekend' ? '{0} on weekends around {1}' : '{0} on weekdays around {1}', catLabel(h.category), h.at);
const dismissed = () => S.kv.dismissed || [];
/** Home cards can be turned off in Settings (settings.homeHide: 'gap', 'nudge', 'bills', 'insight'). */
const shown = id => !(settings().homeHide || []).includes(id);
const greeting = () => {
  const n = settings().myName, h = +nowTime().slice(0, 2);
  return !n ? '' : h < 12 ? t('Good morning, {0}', n) : h < 18 ? t('Good afternoon, {0}', n) : t('Good evening, {0}', n);
};
const dismiss = id => setKv('dismissed', [...dismissed().filter(x => x !== id), id].slice(-300));

/** The backup reminder has its own slot (it used to hide nudges for weeks). */
function backupBanner() {
  const tdy = today(), last = S.kv.lastBackup;
  if (booked().length >= 10 && (!last || daysBetween(last.slice(0, 10), tdy) > 14) && !dismissed().includes(`backup-${tdy}`)) {
    return `<div class="banner warn">${ICON.alert}<span class="grow"><b>${esc(last ? t('Last backup {0} days ago', daysBetween(last.slice(0, 10), tdy)) : t('Not backed up yet'))}</b><small>${esc(t('Your data lives only on this phone. A backup file keeps it safe if the phone is lost.'))}</small></span>
      <span class="bactions"><button class="btn small" data-act="backup">${esc(t('Back up'))}</button><button class="btn small ghost" data-act="dismiss" data-id="backup-${tdy}">${esc(t('Later'))}</button></span></div>`;
  }
  return '';
}
/** The one other banner Home shows, most important first: a bill due, cash below zero, days not logged, a habit nudge, an insight. */
function banner(skip = null) {
  const tdy = today();
  if (location.host === 'fir1412.github.io') return `<div class="banner warn">${ICON.alert}<span class="grow"><b>${esc(t('Tally has moved to tallymy.github.io'))}</b><small>${esc(t('Back up here, then open the new address and restore the file there. This address will stop getting updates.'))}</small></span>
    <span class="bactions"><button class="btn small" data-act="backup">${esc(t('Back up'))}</button><a class="btn small ghost" href="https://tallymy.github.io/" rel="noopener">${esc(t('Open the new address'))}</a></span></div>`;
  // A bill due (it outranks cash below zero: a missed bill costs more) in the next 3 days, or one that was due and isn't paid (it stays until paid or put off).
  const due = shown('bills') && S.recurring.filter(b => inScope(b)).map(b => ({ b, s: billStatus(b, tdy, S.tx) })).filter(({ b, s }) => s.date && !s.paid && s.days <= 3 && !dismissed().includes(`bill-${b.id}-${s.date}`)).sort((x, y) => x.s.days - y.s.days)[0];
  if (due) {
    const { b: bill, s } = due;
    return `<div class="banner ${s.days < 0 ? 'warn' : 'info'}">${ICON.bell}<span class="grow"><b>${esc(s.days < 0 ? t('{0} was due {1}', bill.name, fmtDate(s.date)) : t('{0} due {1}', bill.name, s.days === 0 ? t('today') : s.days === 1 ? t('tomorrow') : t('in {0} days', s.days)))}</b><small>${esc(fmtRM(bill.amount))}${bill.auto ? ` · ${esc(t('Adds itself on the day'))}` : ''}</small></span>
    <span class="bactions"><button class="btn small" data-act="bill-paid" data-id="${esc(bill.id)}" data-d="${esc(s.date)}">${esc(t('Mark as paid'))}</button><button class="btn small ghost" data-act="dismiss" data-id="bill-${esc(bill.id)}-${esc(s.date)}">${esc(t('Later'))}</button></span></div>`;
  }
  const bal = balances(S.accounts, booked(), tdy).by, cash = S.accounts.find(a => a.kind === 'cash' && bal[a.id] < 0);
  // Cash can't really be below zero: something wasn't added. The fixes, most likely first; the account editor has Balance today.
  if (cash && !dismissed().includes(`cash-${tdy}`)) return `<div class="banner warn">${ICON.wallet}<span class="grow"><b>${esc(t('{0} is below zero: {1}', cash.name, fmtRM(bal[cash.id])))}</b><small>${esc(t('What happened?'))}</small></span>
    <span class="bactions"><button class="btn small" data-act="acc-edit" data-id="${esc(cash.id)}">${esc(t('Correct the balance'))}</button><button class="btn small ghost" data-act="atm" data-to="${esc(cash.id)}">${esc(t('Add a cash withdrawal'))}</button>
      <button class="btn small ghost" data-act="cash-gift" data-to="${esc(cash.id)}">${esc(t('Family gave me cash'))}</button><button class="btn small ghost" data-act="dismiss" data-id="cash-${tdy}">${esc(t('Later'))}</button></span></div>`;
  const lastDay = booked().reduce((m, x) => (x.date > m ? x.date : m), ''), away = lastDay ? daysBetween(lastDay, tdy) : 0;
  if (shown('gap') && S.tx.length >= 3 && away >= 3 && !dismissed().includes(`gap-${tdy}`)) return `<div class="banner info">${ICON.clock}<span class="grow"><b>${esc(t('Nothing logged since {0}', fmtDate(lastDay)))}</b><small>${esc(t('Add what you remember. A rough amount for the missing days is fine.'))}</small></span>
    <span class="bactions"><button class="btn small" data-act="gap-add" data-d="${esc(addDaysIso(lastDay, 1))}">${esc(t('Add a missed day'))}</button><button class="btn small ghost" data-act="dismiss" data-id="gap-${tdy}">${esc(t('Not now'))}</button></span></div>`;
  const nudge = shown('nudge') && dueNudge(habits(booked(), tdy), booked(), nowLocal(), dismissed());
  if (nudge) return `<div class="banner info">${ICON.clock}<span class="grow"><b>${esc(t('Spent on {0}?', catLabel(nudge.category)))}</b><small>${esc(t('You usually do: {0}. Add it now so you don\'t forget.', habitText(nudge)))}</small></span>
    <span class="bactions"><button class="btn small" data-act="nudge-add" data-c="${esc(nudge.category)}" data-a="${nudge.amount}" data-at="${esc(nudge.at || '')}">${esc(t('Add {0}', fmtRM(nudge.amount)))}</button><button class="btn small ghost" data-act="dismiss" data-id="${esc(nudge.id)}">${esc(t('Not today'))}</button></span></div>`;
  const ins = shown('insight') && insights({ txs: booked(), budgets: budgetsFor(), today: tdy, knownBills: S.recurring.map(b => b.key), startDay: startDay() }).find(i => !dismissed().includes(i.id) && i.id !== skip);
  if (ins) return `<div class="banner ${ins.level}">${ins.level === 'warn' ? ICON.alert : ICON.chart}<span class="grow"><b>${esc(fill(ins.title))}</b><small>${esc(fill(ins.body))}</small></span>
    <span class="bactions"><button class="btn small ghost" data-act="go" data-to="insights">${esc(t('More'))}</button><button class="btn small ghost" data-act="dismiss" data-id="${esc(ins.id)}" aria-label="${esc(t('Dismiss'))}">${ICON.x}</button></span></div>`;
  return '';
}

/** The month ring: what's left of the budget (or this month against last), coloured by pace. Tap: Budgets. */
function ringHtml(rg, { spent, B, before, lastYm, sd, word }) {
  const pct = rg.mode === 'budget' ? Math.round(rg.frac * 100) : Math.round(spent / before * 100);
  const label = rg.mode === 'budget' ? `${spent > B ? t('Over by {0}', fmtRM(spent - B)) : t('{0} left', fmtRM(B - spent))} · ${word}` : t('{0}% of what you had spent by this point in {1}', pct, fmtMonth(lastYm, sd));
  return `<button class="ring ${rg.tone}" data-act="go" data-to="budgets" aria-label="${esc(label)}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="19" pathLength="100"/>${rg.frac > 0 ? `<circle class="arc" cx="22" cy="22" r="19" pathLength="100" style="--f:${(rg.frac * 100).toFixed(1)}"/>` : ''}</svg>
    <span class="rtxt" aria-hidden="true"><b class="num">${pct}%</b><small>${esc(rg.mode === 'budget' ? t('left') : t('of {0}', cycleShort(lastYm, sd)))}</small></span></button>`;
}
/** Once a week: last week looked back on, from its first open until dismissed. Tap: Insights. */
function recapCard(r) {
  const id = `wk-${r.start}`, mx = Math.max(...r.days, 1);
  const good = r.good?.kind === 'cheapest' ? t('Cheapest {0} week in a month', catLabel(r.good.cat)) : r.good?.kind === 'less' ? t('{0} less than a usual week', fmtRM(r.good.by)) : '';
  return `<section class="card recap"><button class="recap-go" data-act="recap-go" data-id="${esc(id)}">
    <span class="lbl">${esc(t('Last week'))}</span>
    <span class="rrow"><span class="grow"><b class="num">${esc(fmtRM(r.total))}</b>${r.usual ? `<small>${esc(t('usual {0}', fmtRM(r.usual)))}</small>` : ''}</span>
      <span class="wbars" aria-hidden="true">${r.days.map(v => `<i style="--h:${Math.max(4, Math.round(v / mx * 100))}%"${v ? '' : ' class="nil"'}></i>`).join('')}</span></span>
    ${r.top ? `<span class="rtop">${dot(r.top.cat)}<span class="grow">${esc(catLabel(r.top.cat))}</span><span class="num">${esc(fmtRM(r.top.cents))}</span></span>` : ''}
    ${good ? `<span class="rgood">${ICON.sparkles}<span class="grow">${esc(good)}</span></span>` : ''}</button>
    <button class="icon-btn rx" data-act="dismiss" data-id="${esc(id)}" aria-label="${esc(t('Dismiss'))}">${ICON.x}</button></section>`;
}
/** Now and then (never more than once a day), one piece of good news from the data. */
function findCard(f, tdy) {
  const [text, sub] = f.kind === 'price' ? [fill(f.ins.title), fill(f.ins.body)] : f.kind === 'catdown' ? [t('{0} down {1}% on last month', catLabel(f.cat), f.pct), t('So far this month, against the same point last month.')]
    : f.kind === 'bill' ? [t('{0} paid on time', f.name), ''] : [t('Nothing spent yesterday'), ''];
  const to = f.kind === 'catdown' ? `data-act="cat-show" data-c="${esc(f.cat)}"` : `data-act="go" data-to="${f.kind === 'bill' ? 'budgets' : f.kind === 'nospend' ? 'badges' : 'insights'}"`;
  return `<div class="banner good find">${ICON.sparkles}<button class="grow find-go" ${to}><b>${esc(text)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</button><button class="icon-btn" data-act="dismiss" data-id="find-${esc(tdy)}" aria-label="${esc(t('Dismiss'))}">${ICON.x}</button></div>`;
}
let onScreen = null, drawn = null;   // the totals Home showed last, and the ones just drawn: a save counts from one to the other
export const homeView = {
  title: 'Home',
  /** A save just made lands here: its row flashes, the balance and month count to their new values, the ring moves. */
  after() {
    const was = onScreen; onScreen = drawn;
    if (!landing.id || Date.now() - landing.at > 4000) return;
    const id = landing.id; landing.id = null;
    const row = document.querySelector(`.txrow[data-id="${CSS.escape(id)}"]`); if (row) row.dataset.new = '';
    if (!was) return;
    const big = $('.hero .big'), sp = $('.card.month .spent'), arc = $('.ring .arc');
    if (was.bal !== drawn.bal) { countUp(big, was.bal, drawn.bal); replay(big, 'land'); }
    if (was.spent !== drawn.spent) { countUp(sp, was.spent, drawn.spent); replay(sp, 'land'); }
    if (arc && was.frac != null && was.frac !== drawn.frac) {   // from where it was to where it is now (CSS transition)
      arc.style.setProperty('--f', (was.frac * 100).toFixed(1)); void arc.getBoundingClientRect();
      arc.closest('.ring').classList.add('moving'); requestAnimationFrame(() => arc.style.setProperty('--f', (drawn.frac * 100).toFixed(1)));
    }
  },
  render() {
    const tdy = today(), sd = startDay(), ym = thisMonth();
    const upToday = booked(), accts = scopedAccounts();
    const bal = balances(accts, upToday), sp = monthSpend(upToday, ym, sd), spent = sp.total, B = budgetsFor().total;
    const p = B ? pace(B, spent, tdy, { startDay: sd, amounts: sp.each.total, fixed: sp.fixed.total }) : null;
    const lastYm = addMonths(ym, -1), into = daysBetween(cycleSpan(ym, sd).start, tdy), lastStart = cycleSpan(lastYm, sd).start;
    const sameDay = upToday.filter(x => cycleKey(x.date, sd) !== lastYm || daysBetween(lastStart, x.date) <= into);
    const before = monthSpend(sameDay, lastYm, sd).total, diff = spent - before;
    const recent = [...booked()].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 8);
    const word = p && (spent > B ? t('Over budget') : p.over ? t('Heading over') : t('On track'));
    const rg = ring({ budget: B, spent, before, p });
    drawn = { bal: bal.total, spent, frac: rg?.frac };
    // Last week on the first days of a new one, else now and then a nice find (one delight card at a time).
    const ws = settings().weekStart === 0 ? 0 : 1, rc = shown('insight') && weekRecap(upToday, tdy, ws);
    const recap = rc && !dismissed().includes(`wk-${rc.start}`) ? recapCard(rc) : '';
    const find = !recap && shown('insight') && !dismissed().includes(`find-${tdy}`) && pickFind(niceFinds({ txs: upToday, today: tdy, startDay: sd, noSpend: settings().noSpend || [], bills: S.recurring.filter(b => inScope(b)) }), tdy);
    return `<header class="top"><h1 class="sr">${esc(t('Home'))}</h1>${greeting() ? `<span class="grow"><b class="hi">${esc(greeting())}</b><small>${esc(fmtDate(tdy, { year: true }))}</small></span>` : `<span class="fine">${esc(fmtDate(tdy, { year: true }))}</span>`}<button class="btn ghost small setbtn" data-act="go" data-to="settings">${ICON.gear}<span>${esc(t('Settings'))}</span></button></header>
      ${scopeSwitch()}<div class="cols"><div class="col">
      <section class="hero">
        <span class="label">${esc(t('Current balance'))} · ${esc(accts.length === 1 ? t('1 account') : t('{0} accounts', accts.length))}</span>
        <div class="big num">${esc(fmtRM(bal.total))}</div>
        <details class="accts"><summary>${esc(t('Accounts'))}</summary><ul>${accts.map(a => `<li><span class="grow">${esc(a.name)}</span><span class="num">${esc(fmtAcct(a, bal.by[a.id] ?? 0))}</span></li>`).join('')}</ul></details>
        ${accts.some(offTotal) ? `<p class="fine">${esc(t('Not counted in this total: {0}', accts.filter(offTotal).map(a => a.name).join(', ')))}</p>` : ''}
      </section>
      <section class="card month">
        <div class="rowb"><span>${esc(t('Spent in {0}', fmtMonth(ym, sd)))}</span>${p ? `<span class="pill ${rg.tone}">${esc(word)}</span>` : `<button class="link" data-act="go" data-to="budgets">${esc(t('Set a budget'))}</button>`}</div>
        <div class="mrow">${rg ? ringHtml(rg, { spent, B, before, lastYm, sd, word }) : ''}<div class="grow">
        <div class="rowb"><b class="spent num">${esc(fmtRM(spent))}</b>${B ? `<span class="fine">${esc(t('of {0}', fmtRM(B)))}</span>` : ''}</div>
        ${before && diff ? `<p class="delta ${diff > 0 ? 'bad' : 'good'}">${esc(diff > 0 ? t('{0} more than this point in {1}', fmtRM(diff), fmtMonth(lastYm, sd)) : t('{0} less than this point in {1}', fmtRM(-diff), fmtMonth(lastYm, sd)))}</p>` : ''}
        </div></div>
      </section>
      ${recap}${find ? findCard(find, tdy) : ''}
      ${streakHome()}
      ${backupBanner()}
      ${banner(find?.kind === 'price' ? find.id : null)}
      ${learnHome()}
      </div><div class="col">
      <div class="rowb"><h2>${esc(t('Recent'))}</h2><button class="btn ghost small" data-act="tx-new">${ICON.plus}${esc(t('Add by hand'))}</button></div>
      ${recent.length ? `<ul class="list">${recent.map(txRow).join('')}</ul><button class="btn ghost wide" data-act="go" data-to="activity">${esc(t('See all'))}</button>` : `<p class="empty">${esc(t('Nothing yet. Scan your first receipt: Tally splits it into items and categories for you.'))}</p>`}
      </div></div>`;
  },
};

// ---- Insights --------------------------------------------------------------------------------------------------
let M = null; // month shown
let SPAN = 6; // months in the table
export const insightsView = {
  title: 'Insights',
  after() {   // opens at its start (whole columns); a shadow on the pinned column while months scroll under it
    const w = document.querySelector('.tablewrap'); if (!w) return;
    const mark = () => w.classList.toggle('scrolled', w.scrollLeft > 2);
    w.addEventListener('scroll', mark, { passive: true });
    mark();
  },
  render() {
    const tdy = today(), cur = thisMonth(), sd = startDay();
    if (!M || M > cur) M = cur;
    const now = monthSpend(booked(), M, sd), prev = monthSpend(booked(), addMonths(M, -1), sd);
    const parts = Object.entries(now.byCat).map(([c, v]) => ({ id: c, name: catLabel(c), color: cat(c).color, v })).sort((a, b) => b.v - a.v);
    const d = donut(parts, `${esc(fmtRM(now.total))}<small>${esc(t('spent'))}</small>`);
    const change = [...new Set([...Object.keys(now.byCat), ...Object.keys(prev.byCat)])].map(c => ({ c, d: (now.byCat[c] || 0) - (prev.byCat[c] || 0) })).filter(x => x.d).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5);
    const flowRaw = cashFlow(booked(), M, 6, sd);
    const flow = flowRaw.map(f => ({ label: cycleShort(f.ym, sd), a: f.income, b: f.expense }));
    const trendEnd = M === cur ? tdy : cycleSpan(M, sd).end;
    const trend = balanceTrend(scopedAccounts(), booked(), trendEnd, 6, sd);
    const items = {};
    for (const x of booked()) if (x.type === 'expense' && cycleKey(x.date, sd) === M) for (const i of x.items || []) { const k = itemKey(i.name); if (!k || /\d{5,}/.test(i.name) || /[A-Za-z]{16,}/.test(i.name)) continue; (items[k] ||= { name: i.name, n: 0, v: 0 }); items[k].n++; items[k].v += i.cents; }
    const topItems = Object.values(items).sort((a, b) => b.v - a.v).slice(0, 5);
    const all0 = insights({ txs: booked(), budgets: budgetsFor(), today: tdy, knownBills: S.recurring.map(b => b.key), startDay: sd }).filter(i => !dismissed().includes(i.id));
    const feed = all0.filter(i => !i.rec), recs = all0.filter(i => i.rec).sort((a, b) => b.rec.months - a.rec.months);   // most months seen first
    const hs = habits(booked(), tdy);
    const total = now.total || 1;
    // Six months side by side, like the spreadsheet many people are moving from.
    // Months side by side, like the spreadsheet many people are moving from. Leading months with nothing in them are dropped.
    let tMonths = Array.from({ length: SPAN }, (_, k) => addMonths(M, k - SPAN + 1));
    const all = booked(), spendOf = m => monthSpend(all, m, sd);
    while (tMonths.length > 1 && !spendOf(tMonths[0]).total && !monthIncome(all, tMonths[0], sd)) tMonths = tMonths.slice(1);
    const tSpend = tMonths.map(spendOf), tIn = tMonths.map(m => monthIncome(all, m, sd));
    const catSum = c => tSpend.reduce((s, x) => s + (x.byCat[c] || 0), 0);
    const tCats = [...new Set(tSpend.flatMap(s => Object.keys(s.byCat)))].sort((a, b) => catSum(b) - catSum(a));
    const cell = v => (v ? esc(fmtRM(v, { plain: true })) : '<span class="nil">–</span>');
    const curCol = k => (tMonths[k] === M ? ' class="cur"' : '');
    return `<header class="top"><h1>${esc(t('Insights'))}</h1>
        <span class="monthnav"><button class="icon-btn" data-act="ins-month" data-d="-1" aria-label="${esc(t('Previous month'))}">${ICON.back}</button><b>${esc(fmtMonth(M, sd))}</b><button class="icon-btn flip" data-act="ins-month" data-d="1" ${M >= cur ? 'disabled' : ''} aria-label="${esc(t('Next month'))}">${ICON.back}</button></span></header>
      ${scopeSwitch()}${feed.length && M === cur ? `<ul class="feed">${feed.slice(0, 2).map(feedItem).join('')}</ul>${feed.length > 2 ? `<details class="card billsugg"><summary>${ICON.chart}${esc(t('{0} more insights', Math.min(6, feed.length) - 2))}</summary><ul class="feed">${feed.slice(2, 6).map(feedItem).join('')}</ul></details>` : ''}` : ''}
      ${M === cur ? forecastCard() : ''}
      <section class="card">
        <h2>${esc(t('Where the money went'))}</h2>
        ${now.total ? `<div class="donutrow">${d.html}<ul class="legend">${parts.map(p => `<li><button class="link" data-act="cat-show" data-c="${esc(p.id)}" data-m="${M}">${dot(p.id)}<span class="grow">${esc(p.name)}</span><span class="num">${esc(fmtRM(p.v))}</span><span class="fine">${Math.round(p.v / total * 100)}%</span></button></li>`).join('')}</ul></div>` : `<p class="empty">${esc(t('No spending in {0}.', fmtMonth(M, sd)))}</p>`}
      </section>
      ${recs.length && M === cur ? `<ul class="feed">${recs.slice(0, 2).map(feedItem).join('')}</ul>${recs.length > 2 ? `<details class="card billsugg"><summary>${ICON.bell}${esc(t('{0} more possible bills', recs.length - 2))}</summary><ul class="feed">${recs.slice(2).map(feedItem).join('')}</ul></details>` : ''}` : ''}
      ${analyticsCards(M)}
      ${change.length && prev.total ? `<section class="card"><h2>${esc(t('Compared with {0}', fmtMonth(addMonths(M, -1), sd)))}</h2><ul class="list">${change.map(x => `<li class="rowb">${dot(x.c)}<span class="grow">${esc(catLabel(x.c))}</span><span class="num ${x.d > 0 ? 'bad' : 'good'}">${x.d > 0 ? '▲' : '▼'} ${esc(fmtRM(Math.abs(x.d)))}</span></li>`).join('')}</ul></section>` : ''}
      ${tCats.length ? `<section class="card span2"><div class="rowb"><h2>${esc(t('Month by month'))} <span class="fine">RM</span></h2>
        <div class="segs mini" role="group" aria-label="${esc(t('Months shown'))}">${[6, 12].map(n => `<button class="seg${SPAN === n ? ' on' : ''}" data-act="ins-span" data-n="${n}" aria-pressed="${SPAN === n}">${esc(t('{0} months', n))}</button>`).join('')}</div></div>
        <div class="tablewrap" tabindex="0" role="region" aria-label="${esc(t('Spending by category and month'))}"><table class="mtable">
        <thead><tr><th scope="col">${esc(t('Category'))}</th>${tMonths.map((m, k) => `<th scope="col"${curCol(k)}>${esc(cycleShort(m, sd))}${m.slice(5) === '01' || k === 0 ? `<small>${m.slice(0, 4)}</small>` : ''}</th>`).join('')}</tr></thead>
        <tbody>${tCats.map(c => `<tr><th scope="row">${dot(c)}${esc(catLabel(c))}</th>${tSpend.map((s, k) => `<td${curCol(k)}>${s.byCat[c] ? `<button class="cellbtn" data-act="cat-show" data-c="${esc(c)}" data-m="${tMonths[k]}" aria-label="${esc(`${catLabel(c)} ${fmtMonth(tMonths[k], sd)}: ${fmtRM(s.byCat[c])}`)}">${cell(s.byCat[c])}</button>` : cell(0)}</td>`).join('')}</tr>`).join('')}</tbody>
        <tfoot><tr><th scope="row">${esc(t('Total spent'))}</th>${tSpend.map((s, k) => `<td${curCol(k)}>${cell(s.total)}</td>`).join('')}</tr>
          <tr class="inc"><th scope="row">${esc(t('Money in'))}</th>${tIn.map((v, k) => `<td${curCol(k)}>${cell(v)}</td>`).join('')}</tr>
          <tr class="net"><th scope="row">${esc(t('Net'))}</th>${tIn.map((v, k) => { const n = v - tSpend[k].total; return `<td${curCol(k)}><span class="${n < 0 ? 'bad' : 'good'}">${n ? esc(fmtRM(n, { plain: true })) : '–'}</span></td>`; }).join('')}</tr></tfoot></table></div></section>` : ''}
      <section class="card"><h2>${esc(t('Money in and out'))}</h2><p class="legendrow"><span class="key good"></span>${esc(t('Received'))} <span class="key bad"></span>${esc(t('Spent'))}</p>
        ${pairBars(flow, { names: [t('Received'), t('Spent')], label: t('Money in and out, last 6 months') })}
        <div class="sr"><table><caption>${esc(t('Money in and out'))}</caption>${flowRaw.map(f => `<tr><th>${esc(fmtMonth(f.ym, sd))}</th><td>${esc(fmtRM(f.income))}</td><td>${esc(fmtRM(f.expense))}</td></tr>`).join('')}</table></div></section>
      <section class="card"><h2>${esc(t('Balance'))}</h2>${lineChart(trend, { label: t('Balance over the last 6 months') })}</section>
      ${topItems.length ? `<section class="card"><h2>${esc(t('What you bought most'))}</h2><ul class="list">${topItems.map(i => `<li class="rowb"><span class="grow">${esc(i.name)}</span><span class="fine">${i.n}×</span><span class="num">${esc(fmtRM(i.v))}</span></li>`).join('')}</ul></section>` : ''}
      <section class="card"><h2>${esc(t('Your spending habits'))}</h2>
        ${hs.length ? `<ul class="list">${hs.map((h, n) => `<li class="rowb">${dot(h.category)}<span class="grow">${esc(habitText(h))}<small>${esc(t('{0} times in the last 4 weeks · usually {1}', h.count, fmtRM(h.amount)))}</small></span><button class="btn small ghost" data-act="habit-cal" data-n="${n}">${ICON.bell}${esc(t('Remind me'))}</button></li>`).join('')}</ul>
        <p class="fine">${esc(t('Tally nudges you on Home when a usual time passes with nothing added. Calendar reminders work even when Tally is closed.'))}</p>`
        : `<p class="fine">${esc(t('After a few weeks of adding spending (with times), Tally learns when you usually spend and reminds you to log it.'))}</p>`}</section>`;
  },
};

const habitEv = h => habitEvent({ ...h, title: t('Tally: did you spend on {0}?', catLabel(h.category)), details: t('Add it in Tally so your spending stays complete.') });
const addDaysIso = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const act = {
  ...analyticsAct,
  atm: b => { const bank = S.accounts.find(a => a.kind === 'bank') || S.accounts.find(a => a.id !== b.dataset.to); openTxSheet({ type: 'transfer', category: 'other', accountId: bank?.id, toAccountId: b.dataset.to, merchant: t('Cash withdrawal') }); },
  'cash-gift': b => openTxSheet({ type: 'income', category: 'family', accountId: b.dataset.to }),
  'gap-add': b => openTxSheet({ date: b.dataset.d, time: '' }),
  'dismiss': async b => { await dismiss(b.dataset.id); render(); },
  'recap-go': async b => { await dismiss(b.dataset.id); go('insights'); },
  'nudge-add': b => openTxSheet({ category: b.dataset.c, amount: +b.dataset.a, ...(b.dataset.at ? { time: b.dataset.at } : {}) }),
  'ins-span': b => { SPAN = +b.dataset.n; render(); },
  'ins-month': b => { M = addMonths(M, +b.dataset.d); if (M > thisMonth()) M = thisMonth(); render(); },
  'habit-cal': b => {
    const h = habits(booked(), today())[+b.dataset.n]; if (!h) return;
    openSheet(`<h2 class="sh-title">${esc(t('Remind me to log it'))}</h2><p class="sh-body">${esc(t('Your calendar will remind you {0}.', habitText(h)))}</p>
      <a class="btn wide" href="${esc(googleUrl(habitEv(h)))}" target="_blank" rel="noopener">${esc(t('Add to Google Calendar'))}</a>
      <button class="btn ghost wide" data-act="habit-ics" data-n="${b.dataset.n}">${esc(t('Download calendar file (iPhone, Outlook)'))}</button>`, { label: t('Reminder') });
  },
  'habit-ics': b => {
    const h = habits(booked(), today())[+b.dataset.n]; if (!h) return;
    download(`tally-habit-${safeId(h.category)}.ics`, ics([habitEv(h)]), 'text/calendar');
    toast(t('Open the downloaded file to add the reminder.'));
  },
};
