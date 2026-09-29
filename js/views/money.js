// Activity (every transaction, searchable), the add/edit sheet, and Budgets (limits, pace, bills).
import { S, saveTx, deleteTx, cat, expenseCats, allCats, today, nowTime, uid, setKv, saveBill, deleteBill, getPhoto, learn } from '../state.js';
import { t, fmtDate, fmtMonth } from '../i18n.js';
import { esc, ICON, openSheet, closeSheet, confirmSheet, toast, lineChart, $ } from '../ui.js';
import { fmtRM, parseAmount, monthOf, monthSpend, pace, validIso, findDuplicate, recurringCandidates, billKey, INCOME_CATEGORIES } from '../engine.js';
import { billEvent, ics, googleUrl } from '../calendar.js';
import { download } from '../io.js';
import { render, go } from '../app.js';

export const accName = id => S.accounts.find(a => a.id === id)?.name || t('Deleted account');
export const catLabel = id => t(cat(id).name);
export const dot = c => `<span class="dot" style="background:${esc(cat(c).color)}" aria-hidden="true"></span>`;
/** One transaction row (used by Home and Activity). */
export function txRow(x) {
  const cats = x.items?.length ? [...new Set(x.items.map(i => i.category))] : [x.category];
  const title = x.merchant || (x.type === 'transfer' ? t('Transfer') : catLabel(x.category));
  const sub = x.type === 'transfer' ? `${esc(accName(x.accountId))} → ${esc(accName(x.toAccountId))}` : `${cats.slice(0, 3).map(c => esc(catLabel(c))).join(' · ')}${cats.length > 3 ? ` +${cats.length - 3}` : ''} · ${esc(accName(x.accountId))}`;
  const sign = x.type === 'income' ? '+' : x.type === 'transfer' ? '' : '−';
  return `<li><button class="txrow" data-act="tx-open" data-id="${esc(x.id)}">${dot(cats[0])}<span class="grow"><b>${esc(title)}</b><small>${sub}${x.receiptId ? ` · ${ICON.receipt.replace('<svg', '<svg class="clip"')}<span class="sr">${esc(t('has photo'))}</span>` : x.items?.length ? ` · ${esc(t('receipt'))}` : ''}</small></span>
    <span class="amt ${x.type}">${sign}${esc(fmtRM(x.amount))}</span></button></li>`;
}

// ---- Activity ------------------------------------------------------------------------------------------------------
const F = { q: '', month: '', acc: '', cat: '', limit: 200 };
function matches(x) {
  if (F.month && monthOf(x.date) !== F.month) return false;
  if (F.acc && x.accountId !== F.acc && x.toAccountId !== F.acc) return false;
  if (F.cat && x.category !== F.cat && !(x.items || []).some(i => i.category === F.cat)) return false;
  if (!F.q) return true;
  const q = F.q.toLowerCase();
  return [x.merchant, x.note, catLabel(x.category), ...(x.items || []).map(i => i.name)].some(s => String(s || '').toLowerCase().includes(q));
}
export const activityView = {
  title: 'Activity',
  render() {
    const list = S.tx.filter(matches).sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '') || b.createdAt - a.createdAt);
    const months = [...new Set(S.tx.map(x => monthOf(x.date)))].sort().reverse();
    const shown = list.slice(0, F.limit);
    const spent = list.filter(x => x.type === 'expense').reduce((s, x) => s + (F.cat && x.items?.length ? x.items.filter(i => i.category === F.cat).reduce((a, i) => a + i.cents, 0) : x.amount), 0);
    let html = '', day = '';
    for (const x of shown) {
      if (x.date !== day) { if (day) html += '</ul>'; day = x.date; html += `<h3 class="day">${esc(fmtDate(x.date, { year: x.date.slice(0, 4) !== today().slice(0, 4) }))}</h3><ul class="list">`; }
      html += txRow(x);
    }
    if (day) html += '</ul>';
    return `<header class="top"><h1>${esc(t('Activity'))}</h1><button class="btn small" data-act="tx-new">${ICON.plus}${esc(t('Add'))}</button></header>
      <div class="filters">
        <label class="search">${ICON.search}<input id="act-q" type="search" data-input="act-q" value="${esc(F.q)}" placeholder="${esc(t('Search shops, items, notes'))}" aria-label="${esc(t('Search'))}"></label>
        <select id="act-month" data-input="act-f" data-k="month" aria-label="${esc(t('Month'))}"><option value="">${esc(t('All months'))}</option>${months.map(m => `<option value="${m}"${F.month === m ? ' selected' : ''}>${esc(fmtMonth(m))}</option>`).join('')}</select>
        <select id="act-acc" data-input="act-f" data-k="acc" aria-label="${esc(t('Account'))}"><option value="">${esc(t('All accounts'))}</option>${S.accounts.map(a => `<option value="${esc(a.id)}"${F.acc === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
        <select id="act-cat" data-input="act-f" data-k="cat" aria-label="${esc(t('Category'))}"><option value="">${esc(t('All categories'))}</option>${allCats().map(c => `<option value="${esc(c.id)}"${F.cat === c.id ? ' selected' : ''}>${esc(t(c.name))}</option>`).join('')}</select>
      </div>
      <p class="fine" id="act-sum">${esc(t('{0} transactions · {1} spent', list.length, fmtRM(spent)))}</p>
      <div id="act-list">${list.length ? html : `<p class="empty">${esc(S.tx.length ? t('Nothing matches. Try another search or filter.') : t('No transactions yet. Scan a receipt or tap Add.'))}</p>`}
      ${list.length > F.limit ? `<button class="btn ghost wide" data-act="act-more">${esc(t('Show more'))}</button>` : ''}</div>`;
  },
};
let qTimer;
export const input = {
  'act-q': el => { F.q = el.value; clearTimeout(qTimer); qTimer = setTimeout(() => { const pos = el.selectionStart; render(); const q = $('#act-q'); q.focus(); q.setSelectionRange(pos, pos); }, 250); },
  'act-f': el => { F[el.dataset.k] = el.value; F.limit = 200; render(); },
  'bud': el => {
    const v = el.value.trim() === '' ? 0 : parseAmount(el.value);
    el.classList.toggle('bad', v == null || v < 0);
    if (v == null || v < 0) return;
    const b = structuredClone(S.kv.budgets);
    if (el.dataset.cat === 'total') b.total = v; else if (v) b.byCat[el.dataset.cat] = v; else delete b.byCat[el.dataset.cat];
    setKv('budgets', b);
  },
};
/** Show one category's spending: Home, Insights and Budgets link here. */
export function showCategory(c, month = monthOf(today())) { Object.assign(F, { q: '', acc: '', cat: c, month, limit: 200 }); go('activity'); }

// ---- add / edit sheet ------------------------------------------------------------------------------------------------
let draft = null; // the transaction being edited; its id is fixed when the sheet opens, so saving twice can't duplicate
function sheetHtml() {
  const d = draft, isNew = !S.tx.some(x => x.id === d.id);
  const cats = d.type === 'income' ? INCOME_CATEGORIES : expenseCats();
  const seg = ['expense', 'income', 'transfer'].map(k => `<button type="button" class="seg${d.type === k ? ' on' : ''}" data-act="tx-type" data-type="${k}" aria-pressed="${d.type === k}">${esc(t({ expense: 'Spent', income: 'Received', transfer: 'Transfer' }[k]))}</button>`).join('');
  const accOpts = sel => S.accounts.map(a => `<option value="${esc(a.id)}"${sel === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('');
  return `<h2 class="sh-title">${esc(isNew ? t('Add') : t('Edit'))}</h2>
    <div class="segs" role="group" aria-label="${esc(t('Type'))}">${seg}</div>
    <label class="field amount"><span>${esc(t('Amount (RM)'))}</span><input id="tx-amt" inputmode="decimal" autocomplete="off" value="${d.amount ? (d.amount / 100).toFixed(2) : ''}" ${d.items?.length ? 'readonly' : isNew ? 'autofocus' : ''} placeholder="0.00"></label>
    <p class="err" id="tx-err" role="alert"></p>
    ${d.type === 'transfer' ? '' : `<div class="chips" role="radiogroup" aria-label="${esc(t('Category'))}">${cats.map(c => `<button type="button" class="chip${d.category === c.id ? ' on' : ''}" role="radio" aria-checked="${d.category === c.id}" data-act="tx-cat" data-c="${esc(c.id)}"><span class="dot" style="background:${esc(c.color)}"></span>${esc(t(c.name))}</button>`).join('')}</div>`}
    <div class="grid2">
      <label class="field"><span>${esc(d.type === 'transfer' ? t('From') : t('Account'))}</span><select id="tx-acc">${accOpts(d.accountId)}</select></label>
      ${d.type === 'transfer' ? `<label class="field"><span>${esc(t('To'))}</span><select id="tx-to">${accOpts(d.toAccountId || S.accounts.find(a => a.id !== d.accountId)?.id)}</select></label>` : ''}
      <label class="field"><span>${esc(t('Date'))}</span><input id="tx-date" type="date" value="${esc(d.date)}" max="${esc(today())}"></label>
      <label class="field"><span>${esc(t('Time'))}</span><input id="tx-time" type="time" value="${esc(d.time || '')}"></label>
    </div>
    <label class="field"><span>${esc(d.type === 'income' ? t('From (who paid you)') : t('Shop or note'))}</span><input id="tx-merchant" maxlength="80" value="${esc(d.merchant || '')}" autocomplete="off"></label>
    ${d.items?.length ? `<details class="items"><summary>${esc(t('{0} items from the receipt', d.items.length))}</summary><ul>${d.items.map(i => `<li>${dot(i.category)}<span class="grow">${esc(i.name || t('(no name)'))}</span><span class="amt">${esc(fmtRM(i.cents))}</span></li>`).join('')}</ul>
      <button class="btn ghost small" data-act="tx-items">${esc(t('Edit items'))}</button></details>` : ''}
    ${d.receiptId ? `<button class="btn ghost small" data-act="tx-photo">${ICON.receipt}${esc(t('Show receipt photo'))}</button>` : ''}
    ${!isNew && d.type !== 'transfer' ? `<button class="btn ghost small" data-act="tx-again">${ICON.plus}${esc(t('Add again today'))}</button>` : ''}
    <div class="row2">${isNew ? `<button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button>` : `<button class="btn ghost danger" data-act="tx-del">${ICON.trash}${esc(t('Delete'))}</button>`}<button class="btn" data-act="tx-save">${esc(t('Save'))}</button></div>`;
}
function readForm() {
  draft.amount = draft.items?.length ? draft.amount : parseAmount($('#tx-amt')?.value);
  draft.accountId = $('#tx-acc')?.value || draft.accountId;
  if (draft.type === 'transfer') draft.toAccountId = $('#tx-to')?.value; else delete draft.toAccountId;
  draft.date = $('#tx-date')?.value || draft.date;
  draft.time = $('#tx-time')?.value || undefined;
  draft.merchant = ($('#tx-merchant')?.value || '').trim().slice(0, 80);
}
function reopen() { readForm(); openSheet(sheetHtml(), { label: t('Transaction') }); }
/** Open the add sheet, optionally prefilled ({type, category, amount} from a nudge or bill). */
export function openTxSheet(preset = {}) {
  const last = [...S.tx].sort((a, b) => b.createdAt - a.createdAt)[0];
  draft = { id: uid('t'), type: 'expense', amount: 0, accountId: last?.accountId || S.accounts[0]?.id, category: 'dining', date: today(), time: nowTime(), merchant: '', source: 'quick', ...preset };
  openSheet(sheetHtml(), { label: t('Add') });
}

// ---- Budgets ----------------------------------------------------------------------------------------------------------
export const budgetsView = {
  title: 'Budgets',
  render() {
    const ym = monthOf(today()), now = monthSpend(S.tx, ym), B = S.kv.budgets;
    const bar = (spent, budget) => {
      if (!budget) return `<span class="fine">${esc(t('{0} spent · no budget', fmtRM(spent)))}</span>`;
      const p = pace(budget, spent, today()), pct = Math.min(100, Math.round(spent / budget * 100));
      const state = spent > budget ? 'bad' : p.over ? 'warn' : 'good';
      const word = spent > budget ? t('Over by {0}', fmtRM(spent - budget)) : p.over ? t('Heading over: about {0} by month end', fmtRM(p.projected)) : t('{0} left', fmtRM(budget - spent));
      return `<div class="meter ${state}" role="img" aria-label="${esc(`${pct}%`)}"><i style="width:${pct}%"></i></div><span class="fine ${state}">${esc(fmtRM(spent))} / ${esc(fmtRM(budget))} · ${esc(word)}</span>`;
    };
    // Cumulative spend this month vs the budget line.
    const days = +today().slice(8, 10);
    let run = 0; const series = [];
    for (let d = 1; d <= days; d++) { const iso = `${ym}-${String(d).padStart(2, '0')}`; run += S.tx.filter(x => x.type === 'expense' && x.date === iso).reduce((s, x) => s + x.amount, 0); series.push({ date: iso, v: run }); }
    const cand = recurringCandidates(S.tx, S.recurring.map(b => b.key).filter(Boolean));
    return `<header class="top"><h1>${esc(t('Budgets'))}</h1><span class="fine">${esc(fmtMonth(ym))}</span></header>
      <section class="card"><label class="field"><span>${esc(t('Monthly budget (RM)'))}</span><input inputmode="decimal" data-input="bud" data-cat="total" value="${B.total ? (B.total / 100).toFixed(2) : ''}" placeholder="${esc(t('e.g. 2500'))}"></label>${bar(now.total, B.total)}
        ${B.total ? lineChart(series, { goal: B.total, label: t('Spending this month against the budget') }) : ''}</section>
      <h2>${esc(t('By category'))}</h2>
      <ul class="list budgets">${expenseCats().map(c => `<li><div class="brow"><button class="link" data-act="cat-show" data-c="${esc(c.id)}">${dot(c.id)}${esc(t(c.name))}</button>
        <input inputmode="decimal" data-input="bud" data-cat="${esc(c.id)}" aria-label="${esc(t('Budget for {0} (RM)', t(c.name)))}" value="${B.byCat[c.id] ? (B.byCat[c.id] / 100).toFixed(2) : ''}" placeholder="RM"></div>${bar(now.byCat[c.id] || 0, B.byCat[c.id] || 0)}</li>`).join('')}</ul>
      <h2 id="bills">${esc(t('Bills'))}</h2>
      <ul class="list">${S.recurring.map(b => `<li class="bill"><span class="grow"><b>${esc(b.name)}</b><small>${esc(t('{0} · every month on day {1}', fmtRM(b.amount), b.day))}</small></span>
        <button class="btn small ghost" data-act="bill-paid" data-id="${esc(b.id)}">${esc(t('Paid'))}</button><button class="btn small ghost" data-act="bill-cal" data-id="${esc(b.id)}" aria-label="${esc(t('Add a reminder to my calendar'))}">${ICON.bell}</button><button class="btn small ghost" data-act="bill-edit" data-id="${esc(b.id)}" aria-label="${esc(t('Edit'))}">…</button></li>`).join('') || `<li class="empty">${esc(t('No bills yet.'))}</li>`}</ul>
      ${cand.map(r => `<div class="card suggest">${ICON.bell}<span class="grow">${esc(t('{0} looks like a monthly bill ({1})', r.merchant, fmtRM(r.amount)))}</span><button class="btn small" data-act="bill-add-suggested" data-key="${esc(r.key)}">${esc(t('Add'))}</button></div>`).join('')}
      <button class="btn ghost wide" data-act="bill-edit">${ICON.plus}${esc(t('Add a bill'))}</button>`;
  },
};
function billSheet(b) {
  openSheet(`<h2 class="sh-title">${esc(b.id ? t('Edit bill') : t('Add a bill'))}</h2>
    <label class="field"><span>${esc(t('Name'))}</span><input id="b-name" maxlength="60" value="${esc(b.name || '')}" autofocus></label>
    <div class="grid2"><label class="field"><span>${esc(t('Amount (RM)'))}</span><input id="b-amt" inputmode="decimal" value="${b.amount ? (b.amount / 100).toFixed(2) : ''}"></label>
    <label class="field"><span>${esc(t('Day of the month'))}</span><input id="b-day" type="number" min="1" max="28" value="${b.day || 1}"></label></div>
    <div class="grid2"><label class="field"><span>${esc(t('Category'))}</span><select id="b-cat">${expenseCats().map(c => `<option value="${esc(c.id)}"${(b.category || 'bills') === c.id ? ' selected' : ''}>${esc(t(c.name))}</option>`).join('')}</select></label>
    <label class="field"><span>${esc(t('Account'))}</span><select id="b-acc">${S.accounts.map(a => `<option value="${esc(a.id)}"${b.accountId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label></div>
    <p class="err" id="b-err" role="alert"></p>
    <div class="row2">${b.id ? `<button class="btn ghost danger" data-act="bill-del" data-id="${esc(b.id)}">${esc(t('Delete'))}</button>` : `<button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button>`}<button class="btn" data-act="bill-save" data-id="${esc(b.id || '')}" data-key="${esc(b.key || '')}">${esc(t('Save'))}</button></div>`, { label: t('Bill') });
}
const billEv = x => billEvent({ id: x.id, day: x.day, title: t('Pay {0} ({1})', x.name, fmtRM(x.amount)), details: t('Tally reminder') });

// ---- actions ---------------------------------------------------------------------------------------------------------------
export const act = {
  'act-more': () => { F.limit += 200; render(); },
  'tx-new': () => openTxSheet(),
  'sheet-close': () => closeSheet(),
  'cat-show': b => showCategory(b.dataset.c, b.dataset.m || undefined),
  'tx-open': b => { const x = S.tx.find(y => y.id === b.dataset.id); if (!x) return; draft = structuredClone(x); openSheet(sheetHtml(), { label: t('Transaction') }); },
  'tx-type': b => { readForm(); draft.type = b.dataset.type; if (draft.type === 'income' && !INCOME_CATEGORIES.some(c => c.id === draft.category)) draft.category = 'salary'; if (draft.type === 'expense' && INCOME_CATEGORIES.some(c => c.id === draft.category)) draft.category = 'other'; reopen(); },
  'tx-cat': b => { readForm(); draft.category = b.dataset.c; if (draft.items?.length) draft.items.forEach(i => { i.category = b.dataset.c; }); reopen(); },
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
    closeSheet(); render();
    toast(isNew ? t('Added {0}', fmtRM(x.amount)) : t('Saved'), { icon: 'check' });
  },
  'tx-again': () => { readForm(); const { type, amount, category, accountId, merchant } = draft; closeSheet(); setTimeout(() => openTxSheet({ type, amount, category, accountId, merchant }), 220); },
  'tx-del': async () => {
    if (!(await confirmSheet({ title: t('Delete this?'), body: `${draft.merchant || catLabel(draft.category)} · ${fmtRM(draft.amount)}`, ok: t('Delete'), danger: true }))) return;
    const undo = await deleteTx(draft.id);
    closeSheet(); render();
    toast(t('Deleted'), { undo: async () => { await undo(); render(); } });
  },
  'bill-edit': b => billSheet(S.recurring.find(x => x.id === b.dataset.id) || { accountId: S.accounts[0]?.id }),
  'bill-add-suggested': b => { const r = recurringCandidates(S.tx).find(x => x.key === b.dataset.key); if (r) billSheet({ name: r.merchant, amount: r.amount, day: Math.min(28, r.day), category: r.category, accountId: S.accounts[0]?.id, key: r.key }); },
  'bill-save': async b => {
    const amount = parseAmount($('#b-amt').value), name = $('#b-name').value.trim(), day = Math.min(28, Math.max(1, parseInt($('#b-day').value, 10) || 1));
    if (!name) return ($('#b-err').textContent = t('Give the bill a name.'));
    if (!amount || amount <= 0) return ($('#b-err').textContent = t('Enter an amount, for example 12.50.'));
    await saveBill({ id: b.dataset.id || uid('b'), name, amount, day, category: $('#b-cat').value, accountId: $('#b-acc').value, key: b.dataset.key || billKey(name) });
    closeSheet(); render(); toast(t('Saved'));
  },
  'bill-del': async b => { await deleteBill(b.dataset.id); closeSheet(); render(); toast(t('Deleted')); },
  'bill-paid': b => { const x = S.recurring.find(y => y.id === b.dataset.id); if (x) openTxSheet({ amount: x.amount, category: x.category, accountId: x.accountId, merchant: x.name }); },
  'bill-cal': b => {
    const x = S.recurring.find(y => y.id === b.dataset.id);
    openSheet(`<h2 class="sh-title">${esc(t('Remind me every month'))}</h2><p class="sh-body">${esc(t('Your phone calendar reminds you a day before {0} is due, even when Tally is closed.', x.name))}</p>
      <a class="btn wide" href="${esc(googleUrl(billEv(x)))}" target="_blank" rel="noopener">${esc(t('Add to Google Calendar'))}</a>
      <button class="btn ghost wide" data-act="bill-ics" data-id="${esc(x.id)}">${esc(t('Download calendar file (iPhone, Outlook)'))}</button>`, { label: t('Reminder') });
  },
  'bill-ics': b => { const x = S.recurring.find(y => y.id === b.dataset.id); download(`tally-bill-${x.id}.ics`, ics([billEv(x)]), 'text/calendar'); },
};
