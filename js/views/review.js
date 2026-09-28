// Scan → review → save. Photos are read one at a time in a queue, so capture never waits on the screen.
// Only uncertain lines are flagged; the checksum says whether the items add up to the printed total.
import { S, saveTx, savePhoto, learn, expenseCats, today, nowTime, uid } from '../state.js';
import { t, fmtDate } from '../i18n.js';
import { esc, ICON, toast, confirmSheet, $, $$ } from '../ui.js';
import { fmtRM, parseAmount, categorize, shopCategory, findDuplicate, validIso } from '../engine.js';
import { checksum } from '../parse.js';
import { readReceipt, loadOcr, ocrReady } from '../scan.js';
import { render, go } from '../app.js';
import { accName } from './money.js';

const queue = [];     // files waiting to be read
let current = null;   // {id, file?, status: 'reading'|'ready'|'error', draft, photo, ms, error}
let reading = false;

export function enqueue(files) {
  for (const f of files) queue.push({ id: uid('r'), file: f, status: 'waiting' });
  pump();
}
async function pump() {
  if (reading || current?.status === 'ready' || current?.status === 'reading') return;
  const next = queue.shift();
  if (!next) { current = null; return; }
  current = { ...next, status: 'reading' };
  reading = true; refresh();
  try {
    if (!ocrReady()) await loadOcr();
    const { receipt, photo, ms, turns } = await readReceipt(next.file);
    current = { ...current, status: 'ready', photo, ms, turns, draft: toDraft(receipt) };
  } catch (e) {
    console.error(e);
    current = { ...current, status: 'error', error: /not an image/.test(e.message) ? t('That file is not a photo. Pick a JPG or PNG of the receipt.') : /too big/.test(e.message) ? t('That photo is over 40 MB. Take a new one or send a smaller copy.') : t('Could not read this photo: {0}', e.message) };
  }
  reading = false; refresh();
}
const refresh = () => { if (location.hash.startsWith('#/review')) render(); };

/** Parsed receipt → editable transaction draft, with categories guessed from the user's rules and shop words. */
function toDraft(r) {
  const merchant = (r.merchant || '').slice(0, 80);
  const last = [...S.tx].sort((a, b) => b.createdAt - a.createdAt)[0];
  const items = r.items.map(i => ({ name: (i.name || '').slice(0, 80), raw: (i.name || '').slice(0, 80), cents: i.cents, category: categorize(i.name, merchant, S.kv.rules), flag: !!i.flag }));
  return {
    id: uid('t'), type: 'expense', source: 'receipt', merchant, date: r.date && r.date <= today() ? r.date : today(), dateFound: !!r.date, time: r.time || nowTime(),
    accountId: last?.accountId || S.accounts[0]?.id, category: shopCategory(merchant, S.kv.rules), items,
    total: r.total, totalGuessed: !!r.totalGuessed, tax: r.tax ?? 0, service: r.service ?? 0, rounding: r.rounding ?? 0, taxIncluded: !!r.taxIncluded,
  };
}
/** Open an already-saved receipt transaction for item editing (from the transaction sheet). */
export function editExisting(tx) {
  current = { id: uid('r'), status: 'ready', existing: true, draft: { ...structuredClone(tx), total: tx.amount, items: (tx.items || []).map(i => ({ ...i })) } };
  go('review');
}

const itemsSum = d => d.items.reduce((s, i) => s + (i.cents || 0), 0);
const check = d => checksum({ items: d.items.map(i => ({ cents: i.cents || 0 })), total: d.total, tax: d.tax || null, service: d.service || null, rounding: d.rounding || null });

export const reviewView = {
  title: 'Review receipt',
  render() {
    const waiting = queue.length;
    if (!current) return `<header class="top"><h1>${esc(t('Scan a receipt'))}</h1></header>
      <section class="card center">${ICON.camera}<p>${esc(t('Take a photo of a receipt, or pick one or more from your gallery. They are read on this phone and never uploaded.'))}</p>
      <button class="btn wide" data-act="scan">${esc(t('Take or pick photos'))}</button><button class="btn ghost wide" data-act="tx-new">${esc(t('No receipt? Add by hand'))}</button></section>`;
    if (current.status === 'reading' || current.status === 'waiting') return `<header class="top"><h1>${esc(t('Reading…'))}</h1></header>
      <section class="card center" aria-busy="true"><div class="spinner" aria-hidden="true"></div><p>${esc(ocrReady() ? t('Reading the receipt on this phone. This takes a few seconds.') : t('Getting the reader ready (the first time downloads about 40 MB; after that it works offline).'))}</p>
      ${waiting ? `<p class="fine">${esc(t('{0} more waiting', waiting))}</p>` : ''}</section>`;
    if (current.status === 'error') return `<header class="top"><h1>${esc(t('Scan a receipt'))}</h1></header>
      <section class="card"><p class="err">${esc(current.error)}</p><div class="row2"><button class="btn ghost" data-act="rv-skip">${esc(waiting ? t('Next receipt') : t('Close'))}</button><button class="btn" data-act="scan">${esc(t('Try another photo'))}</button></div></section>`;
    const d = current.draft, c = d.total != null ? check(d) : null, flagged = d.items.filter(i => i.flag).length;
    const dup = !current.existing && d.total ? findDuplicate({ ...d, amount: d.total }, S.tx) : null;
    const catOpts = sel => expenseCats().map(x => `<option value="${esc(x.id)}"${sel === x.id ? ' selected' : ''}>${esc(t(x.name))}</option>`).join('');
    const status = d.total == null ? `<p class="warnbox">${ICON.alert}${esc(t('No total found. Type the total from the receipt.'))}</p>`
      : c.ok ? `<p class="okbox">${ICON.check}${esc(t('Items add up to the total {0}', fmtRM(d.total)))}</p>`
      : `<p class="warnbox">${ICON.alert}${esc(t('Items add up to {0}, the receipt says {1}. Check the amber lines or add a missing item.', fmtRM(itemsSum(d) + (d.service || 0) + (d.taxIncluded ? 0 : d.tax || 0) + (d.rounding || 0)), fmtRM(d.total)))}</p>`;
    return `<header class="top"><h1>${esc(t('Review receipt'))}</h1>${waiting ? `<span class="fine">${esc(t('{0} more waiting', waiting))}</span>` : ''}</header>
      ${dup ? `<p class="warnbox">${ICON.alert}${esc(t('Looks like you already added this: {0} on {1}.', fmtRM(dup.amount), fmtDate(dup.date)))}</p>` : ''}
      <section class="card">
        <label class="field"><span>${esc(t('Shop'))}</span><input id="rv-merchant" maxlength="80" value="${esc(d.merchant)}" data-input="rv-f" data-k="merchant"></label>
        <div class="grid2"><label class="field"><span>${esc(t('Date'))}${d.dateFound ? '' : ` <em class="warn">${esc(t('(not found, check)'))}</em>`}</span><input id="rv-date" type="date" value="${esc(d.date)}" max="${esc(today())}" data-input="rv-f" data-k="date"></label>
        <label class="field"><span>${esc(t('Paid from'))}</span><select id="rv-acc" data-input="rv-f" data-k="accountId">${S.accounts.map(a => `<option value="${esc(a.id)}"${d.accountId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label></div>
        <label class="field big"><span>${esc(t('Total (RM)'))}${d.totalGuessed ? ` <em class="warn">${esc(t('(guessed, check)'))}</em>` : ''}</span><input id="rv-total" inputmode="decimal" value="${d.total != null ? (d.total / 100).toFixed(2) : ''}" data-input="rv-f" data-k="total"></label>
      </section>
      <div id="rv-status">${status}</div>
      <h2>${esc(t('Items'))} <span class="fine">${esc(flagged ? t('{0} to check', flagged) : '')}</span></h2>
      <ul class="list items-edit">${d.items.map((i, n) => `<li class="${i.flag ? 'flag' : ''}">
        <input class="iname" value="${esc(i.name)}" maxlength="80" aria-label="${esc(t('Item name'))}" data-input="rv-item" data-n="${n}" data-k="name" placeholder="${esc(t('Item name'))}">
        <input class="iamt" inputmode="decimal" value="${(i.cents / 100).toFixed(2)}" aria-label="${esc(t('Price'))}" data-input="rv-item" data-n="${n}" data-k="cents">
        <select class="icat" aria-label="${esc(t('Category'))}" data-input="rv-item" data-n="${n}" data-k="category">${catOpts(i.category)}</select>
        <button class="icon-btn" data-act="rv-del" data-n="${n}" aria-label="${esc(t('Remove {0}', i.name || t('item')))}">${ICON.x}</button>
        ${i.raw && i.raw !== i.name ? `<small class="raw">${esc(i.raw)}</small>` : ''}</li>`).join('')}</ul>
      <button class="btn ghost wide" data-act="rv-add">${ICON.plus}${esc(t('Add a missing item'))}</button>
      ${d.items.length ? '' : `<label class="field"><span>${esc(t('Category'))}</span><select id="rv-cat" data-input="rv-f" data-k="category">${catOpts(d.category)}</select></label>`}
      <label class="check"><input type="checkbox" id="rv-learn" checked> ${esc(t('Remember my category changes for next time'))}</label>
      <div class="row2 sticky"><button class="btn ghost" data-act="rv-skip">${esc(current.existing ? t('Cancel') : t('Discard'))}</button><button class="btn" data-act="rv-save">${esc(flagged ? t('Save · {0} to check', flagged) : t('Save'))}</button></div>`;
  },
};

export const input = {
  'rv-f': el => {
    const d = current?.draft; if (!d) return;
    const k = el.dataset.k;
    if (k === 'total') { const v = parseAmount(el.value); d.total = v != null && v > 0 ? v : null; d.totalGuessed = false; updateStatus(); return; }
    d[k] = el.value;
    if (k === 'date') d.dateFound = true;
  },
  'rv-item': el => {
    const i = current?.draft?.items[+el.dataset.n]; if (!i) return;
    if (el.dataset.k === 'cents') { const v = parseAmount(el.value); el.classList.toggle('bad', v == null); if (v != null) i.cents = v; updateStatus(); }
    else if (el.dataset.k === 'category') { i.category = el.value; i.changed = true; i.flag = false; el.closest('li').classList.remove('flag'); }
    else { i.name = el.value.slice(0, 80); i.flag = false; }
  },
};
function updateStatus() { // re-render only the status line so typing keeps focus
  const box = $('#rv-status'); if (!box) return;
  const tmp = document.createElement('div'); tmp.innerHTML = reviewView.render();
  box.innerHTML = tmp.querySelector('#rv-status').innerHTML;
}

const mostSpent = items => { const by = {}; for (const i of items) by[i.category] = (by[i.category] || 0) + i.cents; return Object.entries(by).sort((a, b) => b[1] - a[1])[0][0]; };
export const act = {
  'rv-skip': () => { current = null; if (queue.length) pump(); else go('home'); },
  'rv-add': () => { current.draft.items.push({ name: '', raw: '', cents: 0, category: current.draft.category, flag: true }); render(); $$('.iname').at(-1)?.focus(); },
  'rv-del': b => { current.draft.items.splice(+b.dataset.n, 1); render(); },
  'rv-save': async b => {
    const d = current.draft;
    if (!d.total || d.total <= 0) { toast(t('Type the total from the receipt first.'), { k: 'warn' }); $('#rv-total')?.focus(); return; }
    if (!validIso(d.date)) { toast(t('Pick a date.'), { k: 'warn' }); return; }
    if (d.items.length && !check(d).ok && !(await confirmSheet({ title: t('Items do not add up'), body: t('The difference is spread across the items by size, so your categories stay close. Save anyway?'), ok: t('Save anyway') }))) return;
    b.disabled = true;
    const learnIt = $('#rv-learn')?.checked;
    const items = d.items.filter(i => i.name || i.cents).map(({ name, raw, cents, category }) => ({ name: name || raw || t('Item'), raw, cents, category }));
    const tx = { id: d.id, date: d.date, time: d.time, type: 'expense', amount: d.total, accountId: d.accountId, merchant: (d.merchant || '').trim(), note: d.note || '',
      category: items.length ? mostSpent(items) : d.category, items, tax: d.tax || 0, service: d.service || 0, rounding: d.rounding || 0, source: 'receipt', createdAt: d.createdAt || Date.now(), ...(d.receiptId ? { receiptId: d.receiptId } : {}) };
    if (current.photo) { tx.receiptId = tx.receiptId || uid('p'); await savePhoto(tx.receiptId, current.photo); }
    await saveTx(tx);
    if (learnIt) for (const i of d.items.filter(x => x.changed)) await learn(i.name || i.raw, i.category);
    toast(t('Saved {0} at {1}', fmtRM(tx.amount), tx.merchant || accName(tx.accountId)));
    current = null;
    if (queue.length) { pump(); render(); } else go('home');
  },
};
