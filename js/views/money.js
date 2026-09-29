// Activity (every transaction, searchable), the add/edit sheet, and Budgets (limits, pace, bills).
import { S, saveTx, deleteTx, cat, expenseCats, allCats, today, nowTime, uid, setKv, saveBill, deleteBill, getPhoto, learn, booked, scope, hasJoint, scopedTx, scopedAccounts, inScope, budgetsFor, setSetting, usualAccount, saveTxs, deleteTxs, startDay, thisMonth } from '../state.js';
import { t, fmtDate, fmtMonth, monShort, getLang } from '../i18n.js';
import { esc, ICON, openSheet, closeSheet, confirmSheet, toast, lineChart, $, landed } from '../ui.js';
import { firstWord } from './learn.js';
import { fmtRM, parseAmount, itemKey, categorize, addMonths, monthOf, monthSpend, pace, validIso, findDuplicate, recurringCandidates, billKey, INCOME_CATEGORIES, calcAmount, cycleKey, cycleSpan, addDays, billDates, billStatus, dueBillTxs } from '../engine.js';
import { billEvent, ics, googleUrl, safeId } from '../calendar.js';
import { download } from '../io.js';
import { render, go } from '../app.js';

export const accName = id => S.accounts.find(a => a.id === id)?.name || t('Deleted account');
export const catLabel = id => t(cat(id).name);
export const dot = c => `<span class="dot" style="background:${esc(cat(c).color)}" aria-hidden="true"></span>`;
/** Me · Joint · All, on Home, Activity, Insights and Budgets once a joint account exists. */
export const scopeSwitch = () => (hasJoint() ? `<div class="segs scope" role="group" aria-label="${esc(t('Whose money'))}">${[['me', t('Me')], ['joint', t('Joint')], ['all', t('All')]].map(([k, n]) => `<button class="seg${scope() === k ? ' on' : ''}" data-act="scope" data-s="${k}" aria-pressed="${scope() === k}">${esc(n)}</button>`).join('')}</div>` : '');
/** One transaction row (used by Home and Activity). */
export function txRow(x) {
  const cats = x.items?.length ? [...new Set(x.items.map(i => i.category))] : [x.category];
  const title = x.merchant || (x.type === 'transfer' ? t('Transfer') : catLabel(x.category));
  const sub = x.type === 'transfer' ? `${esc(accName(x.accountId))} → ${esc(accName(x.toAccountId))}` : `${cats.slice(0, 3).map(c => esc(catLabel(c))).join(' · ')}${cats.length > 3 ? ` +${cats.length - 3}` : ''} · ${esc(accName(x.accountId))}`;
  const sign = x.type === 'income' ? '+' : x.type === 'transfer' ? '' : '−';
  return `<li><button class="txrow" data-act="tx-open" data-id="${esc(x.id)}">${dot(cats[0])}<span class="grow"><b>${esc(title)}</b><small>${sub}${x.receiptId ? ` · ${ICON.receipt.replace('<svg', '<svg class="clip"')}<span class="sr">${esc(t('has photo'))}</span>` : x.items?.length ? ` · ${esc(t('items'))}` : ''}${x.by ? ` · ${esc(x.by)}` : ''}</small></span>
    <span class="amt ${x.type}">${sign}${esc(fmtRM(x.amount))}</span></button></li>`;
}

// ---- Activity ------------------------------------------------------------------------------------------------------
const F = { q: '', month: '', acc: '', cat: '', photo: false, ids: null, idsLabel: '', limit: 200 };
function matches(x) {
  if (F.month && cycleKey(x.date, startDay()) !== F.month) return false;
  if (F.acc && x.accountId !== F.acc && x.toAccountId !== F.acc) return false;
  if (F.cat && x.category !== F.cat && !(x.items || []).some(i => i.category === F.cat)) return false;
  if (F.photo && !x.receiptId) return false;
  if (F.ids && !F.ids.includes(x.id)) return false;
  if (!F.q) return true;
  const q = F.q.toLowerCase(), sen = /\d/.test(q) ? parseAmount(q) : null;   // "28.5", "RM28.50": an amount
  if (sen != null && (x.amount === sen || (x.items || []).some(i => i.cents === sen))) return true;
  return [x.merchant, x.note, catLabel(x.category), ...(x.items || []).map(i => i.name)].some(s => String(s || '').toLowerCase().includes(q));
}
export const activityView = {
  title: 'Activity',
  render() {
    const list = scopedTx().filter(matches).sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '') || b.createdAt - a.createdAt);
    const sd = startDay(), months = [...new Set(scopedTx().map(x => cycleKey(x.date, sd)))].sort().reverse();
    const shown = list.slice(0, F.limit);
    const tdy = today(), spent = list.filter(x => x.type === 'expense' && x.date <= tdy).reduce((s, x) => s + (F.cat && x.items?.length ? x.items.filter(i => i.category === F.cat).reduce((a, i) => a + i.cents, 0) : x.amount), 0);
    let html = '', day = '';
    for (const x of shown) {
      if (x.date !== day) { if (day) html += '</ul>'; day = x.date; html += `<h3 class="day">${x.date > tdy ? `<span class="pill">${esc(t('Upcoming'))}</span> ` : ''}${esc(fmtDate(x.date, { year: x.date.slice(0, 4) !== tdy.slice(0, 4) }))}</h3><ul class="list">`; }
      html += txRow(x);
    }
    if (day) html += '</ul>';
    return `<header class="top"><h1>${esc(t('Activity'))}</h1><button class="btn" data-act="tx-new">${ICON.plus}${esc(t('Add'))}</button></header>
      ${scopeSwitch()}<div class="filters">
        <label class="search">${ICON.search}<input id="act-q" type="search" data-input="act-q" value="${esc(F.q)}" placeholder="${esc(t('Search shops, items, notes'))}" aria-label="${esc(t('Search'))}"></label>
        <select id="act-month" data-input="act-f" data-k="month" aria-label="${esc(t('Month'))}"><option value="">${esc(t('Month'))}</option>${months.map(m => `<option value="${m}"${F.month === m ? ' selected' : ''}>${esc(fmtMonth(m, sd))}</option>`).join('')}</select>
        <select id="act-acc" data-input="act-f" data-k="acc" aria-label="${esc(t('Account'))}"><option value="">${esc(t('Account'))}</option>${scopedAccounts().map(a => `<option value="${esc(a.id)}"${F.acc === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
        <select id="act-cat" data-input="act-f" data-k="cat" aria-label="${esc(t('Category'))}"><option value="">${esc(t('Category'))}</option>${allCats().map(c => `<option value="${esc(c.id)}"${F.cat === c.id ? ' selected' : ''}>${esc(t(c.name))}</option>`).join('')}</select>
      </div>
      <div class="chips"><button class="chip${F.photo ? ' on' : ''}" data-act="act-photo" aria-pressed="${F.photo}">${ICON.receipt}${esc(t('With receipt photo'))}</button>${F.ids ? `<button class="chip on" data-act="act-ids" aria-label="${esc(t('Show all, not just {0}', F.idsLabel))}">${esc(F.idsLabel)}${ICON.x}</button>` : ''}</div>
      <p class="fine" id="act-sum">${esc(list.length === 1 ? t('1 transaction · {0} spent', fmtRM(spent)) : t('{0} transactions · {1} spent', list.length, fmtRM(spent)))}</p>
      <div id="act-list">${list.length ? html : `<p class="empty">${esc(S.tx.length ? t('Nothing matches. Try another search or filter.') : t('No transactions yet. Scan a receipt or tap Add.'))}</p>`}
      ${list.length > F.limit ? `<button class="btn ghost wide" data-act="act-more">${esc(t('Show more'))}</button>` : ''}</div>`;
  },
};
let qTimer;
let budT, budFirst = false, budRevision = 0;
const anyBudget = b => !!(b.total || Object.keys(b.byCat || {}).length || b.joint?.total || Object.keys(b.joint?.byCat || {}).length);
/** Words and prices in the amount ("鱼 25, 菜 8"): several things bought, better typed as items. */
const hasWords = v => /\p{L}/u.test(v) && /\d/.test(v);
export const input = {
  'tx-amt': el => { const b = $('#tx-words'); if (b) b.hidden = !hasWords(el.value); },
  'act-q': el => { F.q = el.value; clearTimeout(qTimer); qTimer = setTimeout(() => { const pos = el.selectionStart; render(); const q = $('#act-q'); q.focus(); q.setSelectionRange(pos, pos); }, 250); },
  // Typing a name picks the category it had before (until one is tapped): "Grab to office" → Transport.
  'tx-name': el => {
    if (!draft || catPicked || draft.type === 'transfer' || draft.items?.length) return;
    const c = guessCategory(el.value, draft.type), sheet = el.closest('.sheet');
    if (!c || c === draft.category || !sheet?.querySelector(`[data-act="tx-cat"][data-c="${CSS.escape(c)}"]`)) return;
    draft.category = c;
    for (const chip of sheet.querySelectorAll('[data-act="tx-cat"]')) { const on = chip.dataset.c === c; chip.classList.toggle('on', on); chip.setAttribute('aria-checked', on); }
  },
  'act-f': el => { F[el.dataset.k] = el.value; F.limit = 200; render(); },
  'bud': el => {
    const revision = ++budRevision, err = document.getElementById(`be-${el.dataset.cat}`);
    el.parentElement.classList.remove('saved');
    const v = el.value.trim() === '' ? 0 : calcAmount(el.value);
    el.classList.toggle('bad', v == null || v < 0);
    el.setAttribute('aria-invalid', String(v == null || v < 0));
    if (err) err.textContent = v == null || v < 0 ? t('Enter an amount, for example 12.50.') : '';
    if (v == null || v < 0) return;
    if (!anyBudget(S.kv.budgets)) budFirst = true;   // the very first budget gets a warm word once typing stops
    const all = structuredClone(S.kv.budgets), b = scope() === 'joint' ? (all.joint ||= { total: 0, byCat: {} }) : all;
    if (el.dataset.cat === 'total') b.total = v; else if (v) b.byCat[el.dataset.cat] = v; else delete b.byCat[el.dataset.cat];
    if (b !== all) b.updatedAt = Date.now();   // joint budgets merge by newest edit
    // Keep typing in place; show the saved tick only once storage confirms the write.
    clearTimeout(budT);
    setKv('budgets', all).then(() => {
      if (revision !== budRevision || !el.isConnected) return;
      budT = setTimeout(() => {
      if (revision !== budRevision || !el.isConnected) return;
      const tmp = document.createElement('div'); tmp.innerHTML = budgetsView.render();
      for (const id of ['bs-total', `bs-${el.dataset.cat}`]) { const a = document.getElementById(id), b2 = tmp.querySelector(`#${CSS.escape(id)}`); if (a && b2) a.innerHTML = b2.innerHTML; }
      el.parentElement.classList.remove('saved'); void el.parentElement.offsetWidth; el.parentElement.classList.add('saved');
      if (budFirst && anyBudget(S.kv.budgets)) { budFirst = false; const w = firstWord('budget'); if (w) toast(w, { k: 'good', icon: 'check', cheer: true }); }
      }, 350);
    }).catch(() => {
      if (revision !== budRevision || !el.isConnected) return;
      el.classList.add('bad'); el.setAttribute('aria-invalid', 'true');
      if (err) err.textContent = t('Could not save. Your phone may be out of space.');
    });
  },
};
/** Show one category's spending: Home, Insights and Budgets link here. */
export function showCategory(c, month = thisMonth()) { Object.assign(F, { q: '', acc: '', cat: c, month, ids: null, limit: 200 }); go('activity'); }
/** Activity showing just these entries (from Insights: the payments behind a tax relief line), named by a chip that clears it. */
export function showIds(ids, label) { Object.assign(F, { q: '', acc: '', cat: '', month: '', photo: false, ids, idsLabel: label, limit: 200 }); go('activity'); }

// ---- add / edit sheet ------------------------------------------------------------------------------------------------
let draft = null; // the transaction being edited; its id is fixed when the sheet opens, so saving twice can't duplicate
function sheetHtml() {
  const d = draft, isNew = !S.tx.some(x => x.id === d.id);
  const cats = d.type === 'income' ? INCOME_CATEGORIES : expenseCats();
  const seg = ['expense', 'income', 'transfer'].map(k => `<button type="button" class="seg${d.type === k ? ' on' : ''}" data-act="tx-type" data-type="${k}" aria-pressed="${d.type === k}">${esc(t({ expense: 'Spent', income: 'Received', transfer: 'Transfer' }[k]))}</button>`).join('');
  const accOpts = sel => S.accounts.map(a => `<option value="${esc(a.id)}"${sel === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('');
  // A day other than today (a missed day, a bill's due date) is named in the title, so it can't be missed,
  const day = isNew && d.date !== today() ? `${new Intl.DateTimeFormat(getLang() === 'zh' ? 'zh-CN' : getLang(), { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${d.date}T00:00:00Z`))} ${fmtDate(d.date)}` : '';
  // and its date sits right under the amount, not down where the keyboard and the sum bar cover it.
  const when = `<div class="grid2 keep2">
      <label class="field"><span>${esc(t('Date'))}</span><input id="tx-date" type="date" min="1990-01-01" value="${esc(d.date)}" max="${esc(today())}"></label>
      <label class="field"><span>${esc(t('Time'))}</span><input id="tx-time" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="13:40" value="${esc(d.time || '')}"></label>
    </div>`;
  return `<h2 class="sh-title">${esc(!isNew ? t('Edit') : day ? t('Add for {0}', day) : t('Add'))}</h2>
    <div class="segs" role="group" aria-label="${esc(t('Type'))}">${seg}</div>
    <label class="field amount"><span>${esc(t('Amount (RM)'))}</span><input id="tx-amt" data-input="tx-amt" inputmode="decimal" autocomplete="off" value="${d.amount ? (d.amount / 100).toFixed(2) : ''}" ${d.items?.length ? 'readonly' : isNew ? 'autofocus' : ''} placeholder="0.00"></label>
    ${d.type === 'expense' && !d.items?.length ? `<button class="btn small wide" id="tx-words" data-act="tx-split" hidden>${ICON.list}${esc(t('Several items? Split them'))}</button>` : ''}
    <p class="err" id="tx-err" role="alert"></p>
    ${day ? when : ''}
    ${d.type === 'transfer' ? '' : `<div class="chips" role="radiogroup" aria-label="${esc(t('Category'))}">${cats.map(c => `<button type="button" class="chip${d.category === c.id ? ' on' : ''}" role="radio" aria-checked="${d.category === c.id}" data-act="tx-cat" data-c="${esc(c.id)}"><span class="dot" style="background:${esc(c.color)}"></span>${esc(t(c.name))}</button>`).join('')}</div>`}
    <div class="${d.type === 'transfer' ? 'grid2' : ''}">
      <label class="field"><span>${esc(d.type === 'transfer' ? t('From') : t('Account'))}</span><select id="tx-acc">${accOpts(d.accountId)}</select></label>
      ${d.type === 'transfer' ? `<label class="field"><span>${esc(t('To'))}</span><select id="tx-to">${accOpts(d.toAccountId || S.accounts.find(a => a.id !== d.accountId)?.id)}</select></label>` : ''}
    </div>
    ${day ? '' : when}
    <label class="field"><span>${esc(d.type === 'income' ? t('From (who paid you)') : t('Shop or note'))}</span><input id="tx-merchant" maxlength="80" value="${esc(d.merchant || '')}" autocomplete="off" list="tx-names" data-input="tx-name"></label>
    <datalist id="tx-names">${pastNames(d.type).map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    ${d.items?.length ? `<details class="items"><summary>${esc(d.receiptId ? (d.items.length === 1 ? t('1 item from the receipt') : t('{0} items from the receipt', d.items.length)) : d.items.length === 1 ? t('1 item') : t('{0} items', d.items.length))}</summary><ul>${d.items.map(i => `<li>${dot(i.category)}<span class="grow">${esc(i.name || t('(no name)'))}</span><span class="amt">${esc(fmtRM(i.cents))}</span></li>`).join('')}</ul>
      <button class="btn ghost small" data-act="tx-items">${esc(t('Edit items'))}</button></details>` : ''}
    ${d.type === 'expense' && !d.items?.length ? `<button class="btn ghost small" data-act="tx-split">${ICON.list}${esc(t('Split into items'))}</button>` : ''}
    ${d.receiptId ? `<button class="btn ghost small" data-act="tx-photo">${ICON.receipt}${esc(t('Show receipt photo'))}</button>` : ''}
    ${!isNew && d.type !== 'transfer' ? `<button class="btn ghost small" data-act="tx-again">${ICON.plus}${esc(t('Add again today'))}</button>` : ''}
    <div class="row2">${isNew ? `<button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button>` : `<button class="btn ghost danger" data-act="tx-del">${ICON.trash}${esc(t('Delete'))}</button>`}<button class="btn" data-act="tx-save">${esc(t('Save'))}</button></div>`;
}
/** Shop and note names typed before (imports too), most used first, for the name field's suggestions. */
const pastNames = type => { const n = new Map(); for (const x of S.tx) if (x.type === type && x.merchant) n.set(x.merchant, (n.get(x.merchant) || 0) + 1); return [...n].sort((a, b) => b[1] - a[1]).slice(0, 300).map(([k]) => k); };
/**
 * The category a name was filed under before: a remembered rule first, then the category most used with the same name
 * in any row (imports too), then with the same first words ("Rent, room @ Bayan Lepas" ~ "Rent room"), then item words.
 */
export function guessCategory(name, type = 'expense') {
  const k = itemKey(name); if (!k) return null;
  if (type === 'expense' && Object.hasOwn(S.kv.rules, k)) return S.kv.rules[k];
  for (const key of [itemKey, billKey]) {
    const want = key(name); if (!want) continue;
    const n = {}; for (const x of S.tx) if (x.type === type && x.category && x.merchant && key(x.merchant) === want) n[x.category] = (n[x.category] || 0) + 1;
    const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0]; if (best) return best[0];
  }
  const c = type === 'expense' ? categorize(name, '', S.kv.rules) : null;
  return c && c !== 'other' ? c : null;
}
let catPicked = false;   // a category tapped in the sheet is never changed by typing the name
/** "1340", "13.40", "9:05" → "13:40" / "09:05"; anything else → no time. */
export const hhmmIn = v => { const m = String(v ?? '').trim().match(/^([01]?\d|2[0-3])[:.\s]?([0-5]\d)$/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : undefined; };
function readForm() {
  draft.amount = draft.items?.length ? draft.amount : calcAmount($('#tx-amt')?.value);
  draft.accountId = $('#tx-acc')?.value || draft.accountId;
  if (draft.type === 'transfer') draft.toAccountId = $('#tx-to')?.value; else delete draft.toAccountId;
  draft.date = $('#tx-date')?.value || draft.date;
  draft.time = hhmmIn($('#tx-time')?.value);
  draft.merchant = ($('#tx-merchant')?.value || '').trim().slice(0, 80);
}
function reopen() {
  const typed = $('#tx-amt')?.value;   // words typed as the amount stay put (and keep their Split offer)
  readForm();
  const sh = document.querySelector('.scrim:not(.out) .sheet');
  if (!sh) return openSheet(sheetHtml(), { label: t('Transaction') });
  const focus = document.activeElement?.id;   // redraw in place: no second sheet, nothing typed goes astray
  sh.innerHTML = `<div class="grab" aria-hidden="true"></div>${sheetHtml()}`;
  const amt = $('#tx-amt'); if (amt && !amt.readOnly && typed && hasWords(typed)) { amt.value = typed; input['tx-amt'](amt); }
  if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
}
/** The expense category used most (by entries), so a new entry starts on it. */
const usualCategory = () => {
  const n = {}; for (const x of S.tx) if (x.type === 'expense' && !x.bill && x.source !== 'recurring') n[x.category] = (n[x.category] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1]).map(([c]) => c).find(c => expenseCats().some(e => e.id === c)) || 'dining';
};
/** Open the add sheet, optionally prefilled ({type, category, amount} from a nudge or bill). */
export function openTxSheet(preset = {}) {
  draft = { id: uid('t'), type: 'expense', amount: 0, accountId: usualAccount(), category: usualCategory(), date: today(), time: nowTime(), merchant: '', source: 'quick', ...preset };
  catPicked = !!preset.category;
  openSheet(sheetHtml(), { label: t('Add') });
}

// ---- Budgets ----------------------------------------------------------------------------------------------------------
export const budgetsView = {
  title: 'Budgets',
  render() {
    const sd = startDay(), ym = thisMonth(), tdy = today(), now = monthSpend(booked(), ym, sd), B = budgetsFor(), ro = scope() === 'all' ? ' disabled' : '';
    const bar = (spent, budget, c) => {
      if (!budget) return `<span class="fine">${esc(t('{0} spent', fmtRM(spent)))}</span>`;
      const p = pace(budget, spent, tdy, { startDay: sd, amounts: now.each[c], fixed: now.fixed[c] }), pct = Math.min(100, Math.round(spent / budget * 100));
      const state = spent > budget ? 'bad' : p.over ? 'warn' : 'good';
      const word = spent > budget ? t('Over by {0}', fmtRM(spent - budget)) : p.over ? t('Heading over: about {0} by month end', fmtRM(p.projected)) : t('{0} left', fmtRM(budget - spent));
      return `<div class="meter ${state}" role="img" aria-label="${esc(`${pct}%`)}"><i style="width:${pct}%"></i></div><span class="fine ${state}">${esc(fmtRM(spent))} / ${esc(fmtRM(budget))} · ${esc(word)}</span>`;
    };
    // Cumulative spend this month vs the budget line.
    let run = 0; const series = [];
    for (let iso = cycleSpan(ym, sd).start; iso <= tdy; iso = addDays(iso, 1)) { run += booked().filter(x => x.type === 'expense' && x.date === iso).reduce((s, x) => s + x.amount, 0); series.push({ date: iso, v: run }); }
    const cand = recurringCandidates(booked(), S.recurring.map(b => b.key).filter(Boolean)).filter(r => !S.kv.dismissed.includes(`bill-sugg-${r.key}`));
    // Categories with spending or a limit first (most spent on top); the rest fold away.
    const spentOn = c => now.byCat[c.id] || 0, cats = [...expenseCats()].sort((a, b) => spentOn(b) - spentOn(a));
    const active = cats.filter(c => spentOn(c) || B.byCat[c.id]), idle = cats.filter(c => !spentOn(c) && !B.byCat[c.id]);
    const row = c => `<li><div class="brow"><button class="link" data-act="cat-show" data-c="${esc(c.id)}">${dot(c.id)}${esc(t(c.name))}</button>
        <span class="rmin"><input inputmode="decimal" data-input="bud" data-cat="${esc(c.id)}" aria-label="${esc(t('Budget for {0} (RM)', t(c.name)))}" aria-describedby="be-${esc(c.id)}" value="${B.byCat[c.id] ? (B.byCat[c.id] / 100).toFixed(2) : ''}"${ro}></span></div><p class="err bud-err" id="be-${esc(c.id)}" role="alert"></p><div id="bs-${esc(c.id)}">${bar(spentOn(c), B.byCat[c.id] || 0, c.id)}</div></li>`;
    const bills = S.recurring.filter(b => inScope(b));
    // No budget yet: what the last 3 full months cost on average (months with spending), to the nearest RM 50.
    const past = [1, 2, 3].map(k => monthSpend(booked(), addMonths(ym, -k), sd).total).filter(Boolean);
    const avg = past.length ? Math.max(5000, Math.round(past.reduce((a, b) => a + b, 0) / past.length / 5000) * 5000) : 0;
    return `<header class="top"><h1>${esc(t('Budgets'))}</h1><span class="fine">${esc(fmtMonth(ym, sd))}</span></header>
      ${scopeSwitch()}${ro ? `<p class="fine">${esc(t('All shows your budgets and the joint ones added up. Pick Me or Joint to change them.'))}</p>` : ''}
      <section class="card"><label class="field"><span>${esc(scope() === 'joint' ? t('Joint monthly budget (RM)') : t('Monthly budget (RM)'))}</span><span class="rmin"><input inputmode="decimal" data-input="bud" data-cat="total" aria-describedby="be-total" value="${B.total ? (B.total / 100).toFixed(2) : ''}" placeholder="${esc(avg ? (avg / 100).toFixed(0) : t('e.g. 2500'))}"${ro}></span></label><p class="err bud-err" id="be-total" role="alert"></p>
        ${avg && !B.total && !ro ? `<p class="fine">${esc(t('You spent about {0} a month lately.', fmtRM(avg)))} <button class="link" data-act="bud-use" data-v="${avg}">${esc(t('Use {0}', fmtRM(avg)))}</button></p>` : ''}<div id="bs-total">${bar(now.total, B.total, 'total')}
        ${B.total ? lineChart(series, { goal: B.total, label: t('Spending this month against the budget') }) : ''}</div></section>
      <h2>${esc(t('By category'))}</h2><p class="fine">${esc(t('Set a limit for the categories you want to watch. Leave the rest empty.'))}</p>
      <ul class="list budgets">${active.map(row).join('')}</ul>
      ${idle.length ? `<details class="more-cats"><summary>${esc(idle.length === 1 ? t('1 more category') : t('{0} more categories', idle.length))}</summary><ul class="list budgets">${idle.map(row).join('')}</ul></details>` : ''}
      <h2 id="bills">${esc(t('Regular bills'))}</h2>
      <ul class="list">${bills.map(b => { const s = billStatus(b, tdy, S.tx); return `<li class="bill"><span class="grow"><b>${esc(b.name)}</b><small>${esc(billLine(b, s))}</small>
        ${s.paid ? `<span class="bstat"><span class="pill good">${esc(b.freq === 'weekly' ? t('Paid this week') : t('Paid for {0}', b.freq === 'yearly' ? s.date.slice(0, 4) : monShort(+s.date.slice(5, 7))))}</span></span>`
          : s.date ? `<span class="bstat"><button class="btn small${s.days < 0 ? '' : ' ghost'}" data-act="bill-paid" data-id="${esc(b.id)}" data-d="${esc(s.date)}">${esc(t('Mark as paid'))}</button></span>` : ''}</span><button class="btn small ghost" data-act="bill-cal" data-id="${esc(b.id)}" aria-label="${esc(t('Add a reminder to my calendar'))}">${ICON.bell}</button><button class="btn small ghost" data-act="bill-edit" data-id="${esc(b.id)}" aria-label="${esc(t('Edit'))}">…</button></li>`; }).join('') || `<li class="empty">${esc(t('No bills yet.'))}</li>`}</ul>
      ${cand.map(r => `<div class="card suggest">${ICON.bell}<span class="grow">${esc(t('{0} looks like a monthly bill ({1})', r.merchant, fmtRM(r.amount)))}</span><button class="btn small" data-act="bill-add-suggested" data-key="${esc(r.key)}">${esc(t('Add'))}</button><button class="icon-btn" data-act="dismiss" data-id="bill-sugg-${esc(r.key)}" aria-label="${esc(t('Not a bill'))}">${ICON.x}</button></div>`).join('')}
      <button class="btn ghost wide" data-act="bill-edit">${ICON.plus}${esc(t('Add a bill'))}</button>`;
  },
};
const billLine = (b, s) => [fmtRM(b.amount), b.freq === 'weekly' ? t('every week') : b.freq === 'yearly' ? t('every year') : t('every month on day {0}', b.day || 1),
  s.date && !s.paid && s.days <= 0 ? (s.days < 0 ? t('overdue since {0}', fmtDate(s.date)) : t('due {0}', fmtDate(s.date))) : s.next ? t('next {0}', fmtDate(s.next)) : s.date ? t('finished') : '', b.auto ? t('adds itself') : ''].filter(Boolean).join(' · ');
function billSheet(b) {
  // The next payment to come (an overdue one stays), and how many are left of an instalment.
  const tdy = today(), s = billStatus(b, tdy, S.tx), next = (s.date && !s.paid ? s.date : s.next) || b.start || tdy;
  const left = b.count ? billDates(b, '9999-12-31').filter(d => d >= next).length : '';
  const freqs = [['monthly', t('Every month')], ['weekly', t('Every week')], ['yearly', t('Every year')]];
  openSheet(`<h2 class="sh-title">${esc(b.id ? t('Edit bill') : t('Add a bill'))}</h2>
    <label class="field"><span>${esc(t('Name'))}</span><input id="b-name" maxlength="60" value="${esc(b.name || '')}" autofocus></label>
    <div class="grid2"><label class="field"><span>${esc(t('Amount (RM)'))}</span><input id="b-amt" inputmode="decimal" value="${b.amount ? (b.amount / 100).toFixed(2) : ''}"></label>
    <label class="field"><span>${esc(t('How often'))}</span><select id="b-freq">${freqs.map(([k, n]) => `<option value="${k}"${(b.freq || 'monthly') === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label></div>
    <div class="grid2"><label class="field"><span>${esc(t('Next payment'))}</span><input id="b-date" type="date" min="1990-01-01" value="${esc(next)}"></label>
    <label class="field"><span>${esc(t('Payments left (instalments)'))}</span><input id="b-count" type="number" inputmode="numeric" min="1" max="600" value="${left}" placeholder="${esc(t('No end'))}"></label></div>
    <label class="field"><span>${esc(t('Or ends on (optional)'))}</span><input id="b-until" type="date" min="1990-01-01" value="${esc(b.until || '')}"></label>
    <label class="check"><input type="checkbox" id="b-auto"${(b.id ? b.auto : true) ? ' checked' : ''}> ${esc(t('Add it automatically on the day'))}</label>
    <p class="fine">${esc(t('Tally adds the payment the next time you open it on or after the day, and tells you. A bill counts as paid once anything with its name is added that month, whatever the amount.'))}</p>
    <div class="grid2"><label class="field"><span>${esc(t('Category'))}</span><select id="b-cat">${expenseCats().map(c => `<option value="${esc(c.id)}"${(b.category || 'bills') === c.id ? ' selected' : ''}>${esc(t(c.name))}</option>`).join('')}</select></label>
    <label class="field"><span>${esc(t('Account'))}</span><select id="b-acc">${S.accounts.map(a => `<option value="${esc(a.id)}"${b.accountId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label></div>
    <p class="err" id="b-err" role="alert"></p>
    <div class="row2">${b.id ? `<button class="btn ghost danger" data-act="bill-del" data-id="${esc(b.id)}">${esc(t('Delete'))}</button>` : `<button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button>`}<button class="btn" data-act="bill-save" data-id="${esc(b.id || '')}" data-key="${esc(b.key || '')}">${esc(t('Save'))}</button></div>`, { label: t('Bill') });
}
/** Calendar reminder: monthly from calendar.js; a weekly or yearly bill repeats from its next date; instalments stop. */
const billEv = x => {
  const e = billEvent({ id: x.id, day: x.day, title: t('Pay {0} ({1})', x.name, fmtRM(x.amount)), details: t('Tally reminder') });
  const next = billStatus(x, today(), []).next, ymd = d => d.replaceAll('-', '');
  if (next && (x.freq === 'weekly' || x.freq === 'yearly')) Object.assign(e, { start: `${ymd(next)}T090000`, end: `${ymd(next)}T093000`, rrule: `FREQ=${x.freq.toUpperCase()}` });
  if (x.until) e.rrule += `;UNTIL=${ymd(x.until)}T235959`;
  else if (x.count && next) e.rrule += `;COUNT=${billDates(x, '9999-12-31').filter(d => d >= next).length}`;
  return e;
};
/** On open and on coming back: add the payments of bills set to add themselves. Undo removes them; they aren't added again. */
export async function postBills() {
  const tdy = today();
  if (!S.accounts.length) return 0;
  const txs = dueBillTxs(S.recurring, tdy, S.tx).map(x => (S.accounts.some(a => a.id === x.accountId) ? x : { ...x, accountId: usualAccount() }));
  if (txs.length) await saveTxs(txs);
  for (const r of S.recurring) if (r.auto && !(r.last >= tdy)) await saveBill({ ...r, last: tdy }, { edited: false });
  if (txs.length) toast(txs.length === 1 ? t('Added {0} {1}', txs[0].merchant, fmtRM(txs[0].amount)) : t('Added {0} regular payments: {1}', txs.length, [...new Set(txs.map(x => x.merchant))].join(', ')), { icon: 'check', undo: async () => { await deleteTxs(txs.map(x => x.id)); render(); } });
  return txs.length;
}

// ---- actions ---------------------------------------------------------------------------------------------------------------
export const act = {
  'act-more': () => { F.limit += 200; render(); },
  'bud-use': b => { const el = $('[data-cat="total"]'); el.value = (b.dataset.v / 100).toFixed(2); input.bud(el); b.parentElement.remove(); },
  'scope': async b => { await setSetting('scope', b.dataset.s); F.acc = ''; render(); },
  'tx-new': () => openTxSheet(),
  'sheet-close': () => closeSheet(),
  'cat-show': b => showCategory(b.dataset.c, b.dataset.m || undefined),
  'tx-open': b => { const x = S.tx.find(y => y.id === b.dataset.id); if (!x) return; draft = structuredClone(x); catPicked = true; openSheet(sheetHtml(), { label: t('Transaction') }); },
  'tx-type': b => { readForm(); draft.type = b.dataset.type; if (draft.type === 'income' && !INCOME_CATEGORIES.some(c => c.id === draft.category)) draft.category = 'salary'; if (draft.type === 'expense' && INCOME_CATEGORIES.some(c => c.id === draft.category)) draft.category = 'other'; reopen(); },
  'tx-cat': b => { readForm(); catPicked = true; draft.category = b.dataset.c; if (draft.items?.length) draft.items.forEach(i => { i.category = b.dataset.c; }); reopen(); },
  // Several things in one payment (a phone and fish at the mall): list them and each is sorted into its category.
  'tx-split': async () => {
    const typed = $('#tx-amt')?.value || '';   // "鱼 25, 菜 8" typed as the amount: those become the items
    readForm(); closeSheet(); const { editExisting } = await import('./review.js'); editExisting({ ...draft, items: [] }, { manual: true, lines: hasWords(typed) ? typed : '' });
  },
  'tx-items': async () => { readForm(); closeSheet(); const { editExisting } = await import('./review.js'); editExisting(draft); },
  'tx-photo': async () => {
    const blob = await getPhoto(draft.receiptId);
    if (!blob) return toast(t('The photo is not on this phone (it may have been restored from a backup without photos).'));
    const url = URL.createObjectURL(blob);
    openSheet(`<img class="photo" src="${url}" alt="${esc(t('Receipt photo'))}"><button class="btn wide" data-act="sheet-close">${esc(t('Close'))}</button>`, { label: t('Receipt photo'), onClose: () => URL.revokeObjectURL(url) });
  },
  'tx-save': async b => {
    readForm();
    const err = m => { $('#tx-err').textContent = m; };
    if (!draft.amount || draft.amount <= 0) return err(t('Enter an amount, for example 12.50.'));
    if (!validIso(draft.date)) return err(t('Pick a date.'));
    if (draft.type === 'transfer' && (!draft.toAccountId || draft.toAccountId === draft.accountId)) return err(t('Pick two different accounts.'));
    const isNew = !S.tx.some(x => x.id === draft.id);
    if (isNew && draft.type === 'expense') {
      const dup = findDuplicate(draft, S.tx);
      if (dup && !(await confirmSheet({ title: t('Already added?'), body: t('{0} for {1} on {2} is already here.', dup.merchant || catLabel(dup.category), fmtRM(dup.amount), fmtDate(dup.date)), ok: t('Add anyway') }))) return;
    }
    b.disabled = true;
    const x = { ...draft, createdAt: draft.createdAt || Date.now() };
    await saveTx(x);
    if (x.merchant && x.type === 'expense' && !x.items?.length) await learn(x.merchant, x.category);
    closeSheet(); landed(x.id); render();
    const first = isNew && firstWord('entry');
    toast(first || (isNew ? t('Added {0}', fmtRM(x.amount)) : t('Saved')), { icon: 'check', ...(first ? { k: 'good', cheer: true } : {}) });
  },
  'tx-again': () => { readForm(); const { type, amount, category, accountId, merchant } = draft; closeSheet(); setTimeout(() => openTxSheet({ type, amount, category, accountId, merchant }), 220); },
  'tx-del': async () => {
    if (!(await confirmSheet({ title: t('Delete this?'), body: `${draft.merchant || catLabel(draft.category)} · ${fmtRM(draft.amount)}`, ok: t('Delete'), danger: true }))) return;
    const undo = await deleteTx(draft.id);
    closeSheet(); render();
    toast(t('Deleted'), { undo: async () => { await undo(); render(); } });
  },
  'bill-edit': b => billSheet(S.recurring.find(x => x.id === b.dataset.id) || { accountId: S.accounts[0]?.id, category: 'bills' }),
  'act-photo': () => { F.photo = !F.photo; F.limit = 200; render(); },
  'act-ids': () => { F.ids = null; render(); },
  'bill-add-suggested': b => { const r = recurringCandidates(S.tx).find(x => x.key === b.dataset.key); if (r) billSheet({ name: r.merchant, amount: r.amount, day: r.day, category: ['groceries', 'dining', 'other'].includes(r.category) ? 'bills' : r.category, accountId: S.accounts[0]?.id, key: r.key }); },
  'bill-save': async b => {
    const amount = calcAmount($('#b-amt').value), name = $('#b-name').value.trim(), start = $('#b-date').value, until = $('#b-until').value || undefined;
    const count = Math.min(600, parseInt($('#b-count').value, 10) || 0) || undefined, err = m => ($('#b-err').textContent = m);
    if (!name) return err(t('Give the bill a name.'));
    if (!amount || amount <= 0) return err(t('Enter an amount, for example 12.50.'));
    if (!validIso(start)) return err(t('Pick a date.'));
    if (until && !(validIso(until) && until >= start)) return err(t('The end date must be after the next payment.'));
    const old = S.recurring.find(x => x.id === b.dataset.id) || {};
    // Saving re-bases the bill on its next payment: dates and "payments left" count from there.
    await saveBill({ ...old, id: old.id || uid('b'), name, amount, day: +start.slice(8), start, freq: $('#b-freq').value, count, until, auto: $('#b-auto').checked, category: $('#b-cat').value, accountId: $('#b-acc').value, key: b.dataset.key || billKey(name) });
    closeSheet(); render(); toast(t('Saved'));
  },
  'bill-del': async b => { await deleteBill(b.dataset.id); closeSheet(); render(); toast(t('Deleted')); },
  // Paid by hand: dated on the day it was due, from the bill's own account, tagged so it isn't mistaken for everyday spending.
  'bill-paid': b => {
    const x = S.recurring.find(y => y.id === b.dataset.id); if (!x) return;
    openTxSheet({ amount: x.amount, category: x.category || 'bills', accountId: S.accounts.some(a => a.id === x.accountId) ? x.accountId : usualAccount(), merchant: x.name, bill: x.id, date: b.dataset.d || billStatus(x, today(), S.tx).date || today(), time: '' });
  },
  'bill-cal': b => {
    const x = S.recurring.find(y => y.id === b.dataset.id);
    openSheet(`<h2 class="sh-title">${esc(x.freq === 'weekly' || x.freq === 'yearly' ? t('Remind me before it is due') : t('Remind me every month'))}</h2><p class="sh-body">${esc(t('Your phone calendar reminds you a day before {0} is due, even when Tally is closed.', x.name))}</p>
      <a class="btn wide" href="${esc(googleUrl(billEv(x)))}" target="_blank" rel="noopener">${esc(t('Add to Google Calendar'))}</a>
      <button class="btn ghost wide" data-act="bill-ics" data-id="${esc(x.id)}">${esc(t('Download calendar file (iPhone, Outlook)'))}</button>`, { label: t('Reminder') });
  },
  'bill-ics': b => { const x = S.recurring.find(y => y.id === b.dataset.id); download(`tally-bill-${safeId(x.id)}.ics`, ics([billEv(x)]), 'text/calendar'); },
};
