// Home (balance, month, one banner, recent) and Insights (charts, habits, the insight feed).
import { S, today, nowLocal, setKv, cat } from '../state.js';
import { t, fmtDate, fmtMonth, monShort } from '../i18n.js';
import { esc, ICON, lineChart, pairBars, donut, openSheet, toast } from '../ui.js';
import { fmtRM, balances, monthOf, monthSpend, addMonths, pace, cashFlow, balanceTrend, insights, habits, dueNudge, daysBetween, itemKey } from '../engine.js';
import { habitEvent, ics, googleUrl } from '../calendar.js';
import { download } from '../io.js';
import { render } from '../app.js';
import { txRow, catLabel, dot, openTxSheet } from './money.js';

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
const habitText = h => t(h.days === 'weekend' ? '{0} on weekends around {1}' : '{0} on weekdays around {1}', catLabel(h.category), h.at);
const dismissed = () => S.kv.dismissed || [];
const dismiss = id => setKv('dismissed', [...dismissed().filter(x => x !== id), id].slice(-300));

/** The backup reminder has its own slot (it used to hide nudges for weeks). */
function backupBanner() {
  const tdy = today(), last = S.kv.lastBackup;
  if (S.tx.length >= 10 && (!last || daysBetween(last.slice(0, 10), tdy) > 14) && !dismissed().includes(`backup-${tdy}`)) {
    return `<div class="banner warn">${ICON.alert}<span class="grow"><b>${esc(last ? t('Last backup {0} days ago', daysBetween(last.slice(0, 10), tdy)) : t('Not backed up yet'))}</b><small>${esc(t('Your data lives only on this phone. A backup file keeps it safe if the phone is lost.'))}</small></span>
      <span class="bactions"><button class="btn small" data-act="go" data-to="settings">${esc(t('Back up'))}</button><button class="btn small ghost" data-act="dismiss" data-id="backup-${tdy}">${esc(t('Later'))}</button></span></div>`;
  }
  return '';
}
/** The one other banner Home shows, most important first: a habit nudge, a bill due, then an insight. */
function banner() {
  const tdy = today();
  const nudge = dueNudge(habits(S.tx, tdy), S.tx, nowLocal(), dismissed());
  if (nudge) return `<div class="banner info">${ICON.clock}<span class="grow"><b>${esc(t('Spent on {0}?', catLabel(nudge.category)))}</b><small>${esc(t('You usually do: {0}. Add it now so you don\'t forget.', habitText(nudge)))}</small></span>
    <span class="bactions"><button class="btn small" data-act="nudge-add" data-c="${esc(nudge.category)}" data-a="${nudge.amount}">${esc(t('Add {0}', fmtRM(nudge.amount)))}</button><button class="btn small ghost" data-act="dismiss" data-id="${esc(nudge.id)}">${esc(t('Not today'))}</button></span></div>`;
  const ym = monthOf(tdy), day = +tdy.slice(8, 10);
  const bill = S.recurring.find(b => b.day >= day && b.day - day <= 3 && !S.tx.some(x => monthOf(x.date) === ym && x.type === 'expense' && x.amount === b.amount && (x.merchant || '').toLowerCase() === b.name.toLowerCase()) && !dismissed().includes(`bill-${b.id}-${ym}`));
  if (bill) return `<div class="banner info">${ICON.bell}<span class="grow"><b>${esc(t('{0} due {1}', bill.name, bill.day === day ? t('today') : t('in {0} days', bill.day - day)))}</b><small>${esc(fmtRM(bill.amount))}</small></span>
    <span class="bactions"><button class="btn small" data-act="bill-paid" data-id="${esc(bill.id)}">${esc(t('Paid'))}</button><button class="btn small ghost" data-act="dismiss" data-id="bill-${esc(bill.id)}-${ym}">${esc(t('Later'))}</button></span></div>`;
  const ins = insights({ txs: S.tx, budgets: S.kv.budgets, today: tdy, knownBills: S.recurring.map(b => b.key) }).find(i => !dismissed().includes(i.id));
  if (ins) return `<div class="banner ${ins.level}">${ins.level === 'warn' ? ICON.alert : ICON.chart}<span class="grow"><b>${esc(fill(ins.title))}</b><small>${esc(fill(ins.body))}</small></span>
    <span class="bactions"><button class="btn small ghost" data-act="go" data-to="insights">${esc(t('More'))}</button><button class="btn small ghost" data-act="dismiss" data-id="${esc(ins.id)}" aria-label="${esc(t('Dismiss'))}">${ICON.x}</button></span></div>`;
  return '';
}

export const homeView = {
  title: 'Home',
  render() {
    const tdy = today(), ym = monthOf(tdy);
    const upToday = S.tx.filter(x => x.date <= tdy); // rows dated after today (from a statement) wait for their day
    const bal = balances(S.accounts, upToday), spent = monthSpend(upToday, ym).total, B = S.kv.budgets.total;
    const p = B ? pace(B, spent, tdy) : null;
    const recent = [...S.tx].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 8);
    return `<header class="top"><h1 class="sr">${esc(t('Home'))}</h1><span class="fine">${esc(fmtDate(tdy, { year: true }))}</span><button class="icon-btn" data-act="go" data-to="settings" aria-label="${esc(t('Settings'))}">${ICON.gear}</button></header>
      <div class="cols"><div class="col">
      <section class="hero">
        <span class="label">${esc(t('Current balance'))} · ${esc(S.accounts.length === 1 ? t('1 account') : t('{0} accounts', S.accounts.length))}</span>
        <div class="big num">${esc(fmtRM(bal.total))}</div>
        <details class="accts"><summary>${esc(t('Accounts'))}</summary><ul>${S.accounts.map(a => `<li><span class="grow">${esc(a.name)}</span><span class="num">${esc(fmtRM(bal.by[a.id] ?? 0))}</span></li>`).join('')}</ul></details>
      </section>
      <section class="card month">
        <div class="rowb"><span>${esc(t('Spent in {0}', fmtMonth(ym)))}</span>${p ? `<span class="pill ${spent > B ? 'bad' : p.over ? 'warn' : 'good'}">${esc(spent > B ? t('Over budget') : p.over ? t('Heading over') : t('On track'))}</span>` : `<button class="link" data-act="go" data-to="budgets">${esc(t('Set a budget'))}</button>`}</div>
        <div class="rowb"><b class="num">${esc(fmtRM(spent))}</b>${B ? `<span class="fine">${esc(t('of {0}', fmtRM(B)))}</span>` : ''}</div>
        ${B ? `<div class="meter ${spent > B ? 'bad' : p.over ? 'warn' : 'good'}"><i style="width:${Math.min(100, Math.round(spent / B * 100))}%"></i></div>` : ''}
      </section>
      ${backupBanner()}
      ${banner()}
      </div><div class="col">
      <div class="rowb"><h2>${esc(t('Recent'))}</h2><button class="btn ghost small" data-act="tx-new">${ICON.plus}${esc(t('Add by hand'))}</button></div>
      ${recent.length ? `<ul class="list">${recent.map(txRow).join('')}</ul><button class="btn ghost wide" data-act="go" data-to="activity">${esc(t('See all'))}</button>` : `<p class="empty">${esc(t('Nothing yet. Scan your first receipt: Tally splits it into items and categories for you.'))}</p>`}
      </div></div>`;
  },
};

// ---- Insights --------------------------------------------------------------------------------------------------
let M = null; // month shown
export const insightsView = {
  title: 'Insights',
  render() {
    const tdy = today(), cur = monthOf(tdy);
    M ||= cur;
    const now = monthSpend(S.tx, M), prev = monthSpend(S.tx, addMonths(M, -1));
    const parts = Object.entries(now.byCat).map(([c, v]) => ({ id: c, name: catLabel(c), color: cat(c).color, v })).sort((a, b) => b.v - a.v);
    const d = donut(parts, `${esc(fmtRM(now.total))}<small>${esc(t('spent'))}</small>`);
    const change = [...new Set([...Object.keys(now.byCat), ...Object.keys(prev.byCat)])].map(c => ({ c, d: (now.byCat[c] || 0) - (prev.byCat[c] || 0) })).filter(x => x.d).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5);
    const flowRaw = cashFlow(S.tx, M, 6);
    const flow = flowRaw.map(f => ({ label: monShort(+f.ym.slice(5)), a: f.income, b: f.expense }));
    const trendEnd = M === cur ? tdy : `${M}-${String(new Date(Date.UTC(+M.slice(0, 4), +M.slice(5), 0)).getUTCDate()).padStart(2, '0')}`;
    const trend = balanceTrend(S.accounts, S.tx, trendEnd, 6);
    const items = {};
    for (const x of S.tx) if (x.type === 'expense' && monthOf(x.date) === M) for (const i of x.items || []) { const k = itemKey(i.name); if (!k) continue; (items[k] ||= { name: i.name, n: 0, v: 0 }); items[k].n++; items[k].v += i.cents; }
    const topItems = Object.values(items).sort((a, b) => b.v - a.v).slice(0, 5);
    const feed = insights({ txs: S.tx, budgets: S.kv.budgets, today: tdy, knownBills: S.recurring.map(b => b.key) }).filter(i => !dismissed().includes(i.id));
    const hs = habits(S.tx, tdy);
    const total = now.total || 1;
    return `<header class="top"><h1>${esc(t('Insights'))}</h1>
        <span class="monthnav"><button class="icon-btn" data-act="ins-month" data-d="-1" aria-label="${esc(t('Previous month'))}">${ICON.back}</button><b>${esc(fmtMonth(M))}</b><button class="icon-btn flip" data-act="ins-month" data-d="1" ${M >= cur ? 'disabled' : ''} aria-label="${esc(t('Next month'))}">${ICON.back}</button></span></header>
      ${feed.length && M === cur ? `<ul class="feed">${feed.slice(0, 6).map(i => `<li class="banner ${i.level}">${i.level === 'warn' ? ICON.alert : i.kind === 'recurring' ? ICON.bell : ICON.chart}<span class="grow"><b>${esc(fill(i.title))}</b><small>${esc(fill(i.body))}</small></span>
        ${i.rec ? `<button class="btn small" data-act="go" data-to="budgets">${esc(t('Add'))}</button>` : ''}${i.cat && i.cat !== 'total' ? `<button class="btn small ghost" data-act="cat-show" data-c="${esc(i.cat)}">${esc(t('See'))}</button>` : ''}<button class="icon-btn" data-act="dismiss" data-id="${esc(i.id)}" aria-label="${esc(t('Dismiss'))}">${ICON.x}</button></li>`).join('')}</ul>` : ''}
      <section class="card">
        <h2>${esc(t('Where the money went'))}</h2>
        ${now.total ? `<div class="donutrow">${d.html}<ul class="legend">${parts.map(p => `<li><button class="link" data-act="cat-show" data-c="${esc(p.id)}" data-m="${M}">${dot(p.id)}<span class="grow">${esc(p.name)}</span><span class="num">${esc(fmtRM(p.v))}</span><span class="fine">${Math.round(p.v / total * 100)}%</span></button></li>`).join('')}</ul></div>` : `<p class="empty">${esc(t('No spending in {0}.', fmtMonth(M)))}</p>`}
      </section>
      ${change.length ? `<section class="card"><h2>${esc(t('Compared with {0}', fmtMonth(addMonths(M, -1))))}</h2><ul class="list">${change.map(x => `<li class="rowb">${dot(x.c)}<span class="grow">${esc(catLabel(x.c))}</span><span class="num ${x.d > 0 ? 'bad' : 'good'}">${x.d > 0 ? '▲' : '▼'} ${esc(fmtRM(Math.abs(x.d)))}</span></li>`).join('')}</ul></section>` : ''}
      <section class="card"><h2>${esc(t('Money in and out'))}</h2><p class="legendrow"><span class="key good"></span>${esc(t('Received'))} <span class="key bad"></span>${esc(t('Spent'))}</p>
        ${pairBars(flow, { names: [t('Received'), t('Spent')], label: t('Money in and out, last 6 months') })}
        <table class="sr"><caption>${esc(t('Money in and out'))}</caption>${flowRaw.map(f => `<tr><th>${esc(fmtMonth(f.ym))}</th><td>${esc(fmtRM(f.income))}</td><td>${esc(fmtRM(f.expense))}</td></tr>`).join('')}</table></section>
      <section class="card"><h2>${esc(t('Balance'))}</h2>${lineChart(trend, { label: t('Balance over the last 6 months') })}</section>
      ${topItems.length ? `<section class="card"><h2>${esc(t('What you bought most'))}</h2><ul class="list">${topItems.map(i => `<li class="rowb"><span class="grow">${esc(i.name)}</span><span class="fine">${i.n}×</span><span class="num">${esc(fmtRM(i.v))}</span></li>`).join('')}</ul></section>` : ''}
      <section class="card"><h2>${esc(t('Your spending habits'))}</h2>
        ${hs.length ? `<ul class="list">${hs.map((h, n) => `<li class="rowb">${dot(h.category)}<span class="grow">${esc(habitText(h))}<small>${esc(t('{0} times in the last 4 weeks · usually {1}', h.count, fmtRM(h.amount)))}</small></span><button class="btn small ghost" data-act="habit-cal" data-n="${n}">${ICON.bell}${esc(t('Remind me'))}</button></li>`).join('')}</ul>
        <p class="fine">${esc(t('Tally nudges you on Home when a usual time passes with nothing added. Calendar reminders work even when Tally is closed.'))}</p>`
        : `<p class="fine">${esc(t('After a few weeks of adding spending (with times), Tally learns when you usually spend and reminds you to log it.'))}</p>`}</section>`;
  },
};

const habitEv = h => habitEvent({ ...h, title: t('Tally: did you spend on {0}?', catLabel(h.category)), details: t('Add it in Tally so your spending stays complete.') });
export const act = {
  'dismiss': async b => { await dismiss(b.dataset.id); render(); },
  'nudge-add': b => openTxSheet({ category: b.dataset.c, amount: +b.dataset.a }),
  'ins-month': b => { M = addMonths(M, +b.dataset.d); if (M > monthOf(today())) M = monthOf(today()); render(); },
  'habit-cal': b => {
    const h = habits(S.tx, today())[+b.dataset.n]; if (!h) return;
    openSheet(`<h2 class="sh-title">${esc(t('Remind me to log it'))}</h2><p class="sh-body">${esc(t('Your calendar will remind you {0}.', habitText(h)))}</p>
      <a class="btn wide" href="${esc(googleUrl(habitEv(h)))}" target="_blank" rel="noopener">${esc(t('Add to Google Calendar'))}</a>
      <button class="btn ghost wide" data-act="habit-ics" data-n="${b.dataset.n}">${esc(t('Download calendar file (iPhone, Outlook)'))}</button>`, { label: t('Reminder') });
  },
  'habit-ics': b => {
    const h = habits(S.tx, today())[+b.dataset.n]; if (!h) return;
    download(`tally-habit-${h.category}.ics`, ics([habitEv(h)]), 'text/calendar');
    toast(t('Open the downloaded file to add the reminder.'));
  },
};
