// Scan → review → save. Photos are read one at a time in a queue, so capture never waits on the screen.
// Only uncertain lines are flagged; the checksum says whether the items add up to the printed total.
import { S, setKv, saveTx, savePhoto, deletePhotos, getPhoto, learn, expenseCats, today, nowTime, uid, usualAccount } from '../state.js';
import { t, fmtDate, fmtMonth, getLang } from '../i18n.js';
import { esc, ICON, toast, confirmSheet, openSheet, closeSheet, $, $$ } from '../ui.js';
import { fmtRM, calcAmount, categorize, shopCategory, findDuplicate, validIso, addDays } from '../engine.js';
import { checksum, parseItemLines } from '../parse.js';
import { readReceipt, loadOcr, ocrReady, ocrProgress, OCR_BYTES } from '../scan.js';
import { render, go, scanned } from '../app.js';
import { accName } from './money.js';
import { startScan } from '../camera.js';

// The first download's progress, drawn in place so the bar moves without redrawing the screen.
let dlPct = 0, dlText = '';
const mb = n => (n / 1048576).toFixed(1);
ocrProgress((got, total) => {
  dlPct = Math.round(got / total * 100); dlText = t('{0} of {1} MB', mb(got), mb(total));
  const bar = document.getElementById('ocr-prog'), txt = document.getElementById('ocr-pct');
  if (bar) bar.value = dlPct; if (txt) txt.textContent = dlText;
});
const queue = [];     // files waiting to be read
let current = null;   // {id, file?, status: 'reading'|'ready'|'error', draft, photo, ms, error}
let reading = false;

const saveQueue = () => setKv('scanQueue', queue.map(q => q.id));
export async function enqueue(files) {
  for (const f of files) { const id = uid('r'); queue.push({ id, file: f, status: 'waiting' }); await savePhoto(`q_${id}`, f); }
  await saveQueue();
  pump();
}
async function pump() {
  if (reading || current?.status === 'ready' || current?.status === 'reading') return;
  const next = queue.shift();
  if (!next) { current = null; return; }
  saveQueue();
  current = { ...next, status: 'reading', thumb: URL.createObjectURL(next.file) };
  reading = true; refresh();
  try {
    if (!ocrReady()) await loadOcr();
    const { receipt, photo, ms, turns } = await readReceipt(next.file);
    const draft = toDraft(receipt);
    if (photo) { draft.receiptId = uid('p'); if (!(await savePhoto(draft.receiptId, photo))) delete draft.receiptId; }   // saved now so a draft survives a restart
    current = { ...current, status: 'ready', ms, turns, draft };
    await setKv('reviewDraft', { draft, existing: false });
  } catch (e) {
    console.error(e);
    current = { ...current, status: 'error', error: /not an image/.test(e.message) ? t('That file is not a photo. Pick a JPG or PNG of the receipt.') : /too big/.test(e.message) ? t('That photo is over 40 MB. Take a new one or send a smaller copy.') : /too many pixels/.test(e.message) ? t('That photo is over 50 megapixels. Take it in the normal camera mode, or send a smaller copy.') : t('Could not read this photo: {0}', e.message) };
  }
  deletePhotos([`q_${next.id}`]);   // read (or unreadable): the draft holds its own copy now
  reading = false; refresh();
}
/** Photos being read or waiting (in memory only): an app update must not reload now. */
export const busy = () => reading || queue.length > 0;
const refresh = () => { if (location.hash.startsWith('#/review')) render(); };

// The receipt being checked is kept on the phone as it's edited, so a locked phone or a killed tab loses nothing.
let persistT;
function persist() {
  clearTimeout(persistT);
  persistT = setTimeout(() => {
    if (current?.status !== 'ready') return;
    if (current.manual && !current.draft.items.length) return setKv('reviewDraft', null);   // nothing typed yet: nothing to resume
    setKv('reviewDraft', { draft: current.draft, existing: !!current.existing, manual: !!current.manual });
  }, 300);
}
function finish() { clearTimeout(persistT); if (current?.thumb) URL.revokeObjectURL(current.thumb); current = null; return setKv('reviewDraft', null); }
/** On start: reopen an unfinished review. Returns true if there was one. */
export async function restoreDraft() {
  if (current) return false;
  for (const id of S.kv.scanQueue || []) { const file = await getPhoto(`q_${id}`); if (file) queue.push({ id, file, status: 'waiting' }); }
  const saved = S.kv.reviewDraft;
  if (saved?.draft) {
    const blob = saved.draft.receiptId ? await getPhoto(saved.draft.receiptId) : null;
    current = { id: uid('r'), status: 'ready', existing: saved.existing, manual: saved.manual, draft: saved.draft, thumb: blob ? URL.createObjectURL(blob) : null };
  } else if (queue.length) pump();
  return !!current || queue.length > 0;
}

const EXAMPLE = { en: 'Phone 1299\nFish 25, vegetables 8', ms: 'Telefon 1299\nIkan 25, sayur 8', zh: '手机 1299\n鱼 25，菜 8，猪肉 30' };
/** Parsed receipt → editable transaction draft, with categories guessed from the user's rules and shop words. */
const flagWhy = i => (!i.name ? t('No name read') : i.cents === 0 ? t('Price looks wrong') : t('Hard to read: check the name and price'));
function toDraft(r) {
  const merchant = (r.merchant || '').slice(0, 80);
  const items = r.items.map(i => ({ name: (i.name || '').slice(0, 80), raw: (i.name || '').slice(0, 80), cents: i.cents, category: categorize(i.name, merchant, S.kv.rules), flag: !!i.flag }));
  return {
    id: uid('t'), type: 'expense', source: 'receipt', merchant, date: r.date && r.date <= today() ? r.date : today(), dateFound: !!r.date, time: r.time || nowTime(),
    accountId: usualAccount(), category: shopCategory(merchant, S.kv.rules), items,
    total: r.total, totalGuessed: !!r.totalGuessed, tax: r.tax ?? 0, service: r.service ?? 0, rounding: r.rounding ?? 0, taxIncluded: !!r.taxIncluded,
  };
}
/** Open an already-saved receipt transaction for item editing (from the transaction sheet). */
export function editExisting(tx, { manual = false } = {}) {
  current = { id: uid('r'), status: 'ready', existing: true, manual, draft: { ...structuredClone(tx), dateFound: true, total: tx.amount, items: (tx.items || []).map(i => ({ ...i })) } };
  persist();
  go('review');
}

const guessFor = (name, d) => { const c = categorize(name, d.merchant, S.kv.rules); return c === 'other' && d.category && d.category !== 'other' ? d.category : c; };
const itemsSum = d => d.items.reduce((s, i) => s + (i.cents || 0), 0);
const check = d => checksum({ items: d.items.map(i => ({ cents: i.cents || 0 })), total: d.total, tax: d.tax || null, service: d.service || null, rounding: d.rounding || null });

export const reviewView = {
  title: 'Review receipt',
  render() {
    const waiting = queue.length;
    if (!current) return `<header class="top"><h1>${esc(t('Scan a receipt'))}</h1></header>
      <section class="card center">${ICON.camera}<p>${esc(t('Take a photo of a receipt, or pick one or more from your gallery. They are read on this phone and never uploaded.'))}</p>
      <button class="btn wide" data-act="scan">${esc(t('Take or pick photos'))}</button><button class="btn ghost wide" data-act="tx-new">${esc(t('No receipt? Add by hand'))}</button>
      <button class="link" data-act="photo-tips">${ICON.camera}${esc(t('Tips for a clear photo'))}</button></section>`;
    if (current.status === 'reading' || current.status === 'waiting') return `<header class="top"><h1>${esc(t('Reading…'))}</h1></header>
      <div class="scanning">${current.thumb ? `<div class="receipt-thumb"><img src="${current.thumb}" alt=""><div class="scanline" aria-hidden="true"></div></div>` : ''}</div>
      <section class="card center" aria-busy="true"><p>${esc(ocrReady() ? t('Reading the receipt on this phone. This takes a few seconds.') : t('Getting the reader ready (the first time downloads about 40 MB; after that it works offline).'))}</p>
      ${ocrReady() ? '' : `<div class="dl"><progress id="ocr-prog" max="100" value="${dlPct}" aria-label="${esc(t('Downloading the receipt reader'))}"></progress><span id="ocr-pct" class="fine num">${esc(dlText)}</span></div>`}
      ${waiting ? `<p class="fine">${esc(t('{0} more waiting', waiting))}</p>` : ''}<button class="link" data-act="photo-tips">${ICON.camera}${esc(t('Tips for a clear photo'))}</button></section>`;
    if (current.status === 'error') return `<header class="top"><h1>${esc(t('Scan a receipt'))}</h1></header>
      <section class="card"><p class="err">${esc(current.error)}</p><div class="row2"><button class="btn ghost" data-act="rv-skip">${esc(waiting ? t('Next receipt') : t('Close'))}</button><button class="btn" data-act="scan">${esc(t('Try another photo'))}</button></div></section>`;
    const d = current.draft, c = d.total != null ? check(d) : null, flagged = d.items.filter(i => i.flag).length;
    const old = !current.existing && d.date < addDays(today(), -60);
    const dup = !current.existing && d.total ? findDuplicate({ ...d, amount: d.total }, S.tx) : null;
    const catOpts = sel => expenseCats().map(x => `<option value="${esc(x.id)}"${sel === x.id ? ' selected' : ''}>${esc(t(x.name))}</option>`).join('');
    const status = current.manual ? (d.items.length ? `<p class="okbox">${ICON.check}${esc(t('Total {0}', fmtRM(itemsSum(d))))}</p>` : `<p class="fine">${esc(t('Add each thing you bought with its price. The total adds itself up.'))}</p>`)
      : d.total == null ? `<p class="warnbox">${ICON.alert}${esc(t('No total found. Type the total from the receipt.'))} <button class="link" data-act="photo-tips">${esc(t('Tips for a clear photo'))}</button></p>`
      : c.ok ? `<p class="okbox">${ICON.check}${esc(t('Items add up to the total {0}', fmtRM(d.total)))}</p>`
      : `<p class="warnbox">${ICON.alert}${esc(t('Items add up to {0}, the receipt says {1}. Check the amber lines or add a missing item.', fmtRM(itemsSum(d) + (d.service || 0) + (d.taxIncluded ? 0 : d.tax || 0) + (d.rounding || 0)), fmtRM(d.total)))}</p>`;
    const maths = [[t('Items'), itemsSum(d)], [t('Service'), d.service], [t('Tax'), d.taxIncluded ? 0 : d.tax], [t('Rounding'), d.rounding]].filter(([, v]) => v).map(([k, v]) => `${k} ${fmtRM(v, { plain: true })}`).join(' + ');
    return `<header class="top"><h1>${esc(current.manual ? t('Your items') : t('Review receipt'))}</h1>${waiting ? `<span class="fine">${esc(t('{0} more waiting', waiting))}</span>` : ''}</header>
      ${old ? `<div class="warnbox">${ICON.clock}<span class="grow">${esc(t('This receipt is dated {0}. It will be filed under {1}, not this month.', fmtDate(d.date, { year: true }), fmtMonth(d.date.slice(0, 7))))}
        <button class="btn small ghost" data-act="rv-today">${esc(t("Use today's date"))}</button></span></div>` : ''}
      ${dup ? `<p class="warnbox">${ICON.alert}${esc(t('Looks like you already added this: {0} on {1}.', fmtRM(dup.amount), fmtDate(dup.date)))}</p>` : ''}
      <section class="card">
        <label class="field"><span>${esc(t('Shop'))}</span><input id="rv-merchant" maxlength="80" value="${esc(d.merchant)}" data-input="rv-f" data-k="merchant"></label>
        <div class="grid2"><label class="field"><span>${esc(t('Date'))}${d.dateFound ? '' : ` <em class="warn">${esc(t('(not found, check)'))}</em>`}</span><input id="rv-date" type="date" value="${esc(d.date)}" max="${esc(today())}" data-input="rv-f" data-k="date"></label>
        <label class="field"><span>${esc(t('Paid from'))}</span><select id="rv-acc" data-input="rv-f" data-k="accountId">${S.accounts.map(a => `<option value="${esc(a.id)}"${d.accountId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label></div>
        <label class="field big"><span>${esc(t('Total (RM)'))}${d.totalGuessed ? ` <em class="warn">${esc(t('(guessed, check)'))}</em>` : ''}</span><input id="rv-total" inputmode="decimal" value="${d.total != null ? (d.total / 100).toFixed(2) : ''}" data-input="rv-f" data-k="total"></label>
      </section>
      ${current.thumb ? `<figure class="receipt-thumb"><button class="thumb-btn" data-act="rv-zoom" aria-expanded="false" aria-label="${esc(t('Show the whole receipt'))}"><img src="${current.thumb}" alt="${esc(t('Receipt photo'))}"></button></figure>` : ''}
      <div id="rv-status">${status}${d.total != null && c && !c.ok && maths ? `<p class="maths">${esc(maths)} ≠ ${esc(fmtRM(d.total, { plain: true }))}</p>` : ''}</div>
      <h2>${esc(t('Items'))} <span class="fine">${esc(flagged ? t('{0} to check', flagged) : '')}</span></h2>
      <ul class="list items-edit">${d.items.map((i, n) => `<li class="${i.flag ? 'flag' : ''}"${i.flag ? ` data-why="${esc(flagWhy(i))}"` : ''}>
        <input class="iname" value="${esc(i.name)}" maxlength="80" aria-label="${esc(t('Item name'))}" data-input="rv-item" data-n="${n}" data-k="name" placeholder="${esc(t('Item name'))}">
        <input class="iamt" inputmode="decimal" value="${(i.cents / 100).toFixed(2)}" aria-label="${esc(t('Price'))}" data-input="rv-item" data-n="${n}" data-k="cents">
        <select class="icat" aria-label="${esc(t('Category'))}" data-input="rv-item" data-n="${n}" data-k="category">${catOpts(i.category)}</select>
        <button class="icon-btn" data-act="rv-del" data-n="${n}" aria-label="${esc(t('Remove {0}', i.name || t('item')))}">${ICON.x}</button>
        ${i.raw && i.raw !== i.name ? `<small class="raw">${esc(i.raw)}</small>` : ''}</li>`).join('')}</ul>
      <button class="btn ghost wide" data-act="rv-add">${ICON.plus}${esc(current.manual ? t('Add an item') : t('Add a missing item'))}</button>
      <details class="typebox"${current.manual && !d.items.length ? ' open' : ''}><summary>${esc(t('Type or paste several items'))}</summary>
        <label class="field"><span>${esc(t('One item per line with its price. Tally sorts each into a category; change any it gets wrong.'))}</span><textarea id="rv-lines" rows="4" placeholder="${esc(EXAMPLE[getLang()] || EXAMPLE.en)}"></textarea></label>
        <button class="btn ghost wide" data-act="rv-lines">${esc(t('Add these items'))}</button></details>
      ${d.items.length ? '' : `<label class="field"><span>${esc(t('Category'))}</span><select id="rv-cat" data-input="rv-f" data-k="category">${catOpts(d.category)}</select></label>`}
      <label class="check"><input type="checkbox" id="rv-learn" checked> ${esc(t('Remember my category changes for next time'))}</label>
      <div class="row2 sticky"><button class="btn ghost" data-act="rv-skip">${esc(current.existing ? t('Cancel') : t('Discard'))}</button><button class="btn" data-act="rv-save">${esc(flagged ? t('Save · {0} to check', flagged) : t('Save'))}</button></div>`;
  },
};

export const input = {
  'rv-f': el => {
    const d = current?.draft; if (!d) return;
    const k = el.dataset.k;
    persist();
    if (k === 'merchant' && current.manual) for (const i of d.items) if (!i.changed) i.category = categorize(i.name, el.value, S.kv.rules);
    if (k === 'total') { const v = calcAmount(el.value); d.total = v != null && v > 0 ? v : null; d.totalGuessed = false; updateStatus(); return; }
    d[k] = el.value;
    if (k === 'date') d.dateFound = true;
  },
  'rv-item': el => {
    const i = current?.draft?.items[+el.dataset.n]; if (!i) return;
    persist();
    if (el.dataset.k === 'cents') { const v = calcAmount(el.value); el.classList.toggle('bad', v == null); if (v != null) i.cents = v; updateStatus(); }
    else if (el.dataset.k === 'category') { i.category = el.value; i.changed = true; i.flag = false; el.closest('li').classList.remove('flag'); }
    else {
      i.name = el.value.slice(0, 80); i.flag = false;
      // Sorted as it is typed ("Phone" → Electronics, "Ikan" → Groceries) until the user picks a category themselves.
      if (!i.changed) { i.category = guessFor(i.name, current.draft); const sel = el.closest('li')?.querySelector('.icat'); if (sel) sel.value = i.category; }
    }
  },
};
function updateStatus() { // re-render only the status line so typing keeps focus
  const box = $('#rv-status'); if (!box) return;
  const tmp = document.createElement('div'); tmp.innerHTML = reviewView.render();
  box.innerHTML = tmp.querySelector('#rv-status').innerHTML;
}

const mostSpent = items => { const by = {}; for (const i of items) by[i.category] = (by[i.category] || 0) + i.cents; return Object.entries(by).sort((a, b) => b[1] - a[1])[0][0]; };
/** How to take a photo Tally reads well: small looping scenes, a few words each. Shown before the first scan, and from the scan screens. */
const paper = (x, y, w, h) => {
  let rows = ''; for (let r = y + 14; r < y + h - 11; r += 7) rows += `M${x + 5} ${r}h${Math.round(w * .5)}M${x + w - 11} ${r}h6`;
  return `<g class="tp-r"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/><path class="tp-ink" d="M${x + w / 2 - 8} ${y + 7}h16M${x + 5} ${y + h - 6}h${w - 10}"/><path d="${rows}"/></g>`;
};
const frame = '<path class="tp-frame" d="M38 14V6h8M74 6h8v8M82 66v8h-8M46 74h-8v-8"/>';
const TIP_ART = [
  `${paper(46, 10, 28, 60)}<g class="tp-snug">${frame}</g>`,
  `${paper(46, 10, 28, 60)}<ellipse class="tp-shadow" cx="68" cy="44" rx="22" ry="28"/><g class="tp-sun"><circle cx="18" cy="18" r="6"/><path d="M18 4v4M18 28v4M4 18h4M28 18h4M8 8l3 3M25 25l3 3M8 28l3-3M25 11l3-3"/></g>`,
  `${paper(46, 12, 28, 56)}<g class="tp-phone"><rect x="36" y="4" width="48" height="72" rx="7"/></g><rect class="tp-focus" x="52" y="32" width="16" height="16" rx="2"/>`,
  `<rect class="tp-table" width="120" height="80"/>${paper(46, 10, 28, 60)}<rect class="tp-edge" x="43" y="7" width="34" height="66" rx="3" pathLength="100"/>`,
  `<g class="tp-long">${paper(46, -30, 28, 140)}</g>${frame}`,
  `<g class="tp-fade">${paper(46, 10, 28, 60)}</g><g class="tp-clock"><circle cx="98" cy="18" r="9"/><path class="tp-hand" d="M98 18v-6"/></g>`,
];
export function photoTips({ thenScan = false } = {}) {
  const tips = [
    [t('Fit it all in'), t('Shop name to TOTAL, flat')],
    [t('Bright, no shadow'), t('No flash on shiny paper')],
    [t('Hold still'), t('Straight above, tap to focus')],
    [t('Dark background'), t('Pale receipt, dark table')],
    [t('Long receipt?'), t('Step back until it fits')],
    [t('Scan it soon'), t('Receipts fade in weeks')],
  ];
  const el = openSheet(`<h2 class="sh-title">${esc(t('Tips for a clear photo'))}</h2>
    <ol class="tips">${tips.map(([h, b], i) => `<li><svg viewBox="0 0 120 80" aria-hidden="true"><rect class="tp-bg" width="120" height="80"/>${TIP_ART[i]}</svg><b>${esc(h)}</b><span>${esc(b)}</span></li>`).join('')}</ol>
    ${thenScan ? `<button class="btn wide" data-x="scan">${ICON.camera}${esc(t('Take a photo'))}</button>` : `<button class="btn wide" data-x="ok">${esc(t('Got it'))}</button>`}`, { label: t('Tips for a clear photo') });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'scan') startScan(scanned); else closeSheet();
  });
}
export const act = {
  'photo-tips': () => photoTips(),
  'rv-skip': async () => {
    const d = current?.draft;
    if (d?.receiptId && !current.existing && !S.tx.some(x => x.receiptId === d.receiptId)) await deletePhotos([d.receiptId]);   // a discarded scan leaves no photo behind
    await finish();
    if (queue.length) pump(); else go('home');
  },
  'rv-zoom': b => { const open = b.closest('figure').classList.toggle('zoom'); b.setAttribute('aria-expanded', open); },
  'rv-today': () => { current.draft.date = today(); current.draft.dateFound = true; persist(); render(); },
  'rv-lines': () => {
    const d = current.draft, lines = parseItemLines($('#rv-lines').value);
    if (!lines.length) return toast(t('Write each item with its price, like "Phone 1299".'), { k: 'warn' });
    for (const { name, cents } of lines) d.items.push({ name, raw: '', cents, category: guessFor(name, d), flag: false });
    if (current.manual) { d.total = itemsSum(d); d.totalGuessed = false; }
    persist(); render(); toast(t('Added {0} items', lines.length), { k: 'good', icon: 'check' });
  },
  'rv-add': () => { current.draft.items.push({ name: '', raw: '', cents: 0, category: current.draft.category, flag: true }); persist(); render(); $$('.iname').at(-1)?.focus(); },
  'rv-del': b => { current.draft.items.splice(+b.dataset.n, 1); persist(); render(); },
  'rv-save': async b => {
    const d = current.draft;
    if (current.manual && d.items.length) d.total = itemsSum(d);
    if (!d.total || d.total <= 0) { toast(t('Type the total from the receipt first.'), { k: 'warn' }); $('#rv-total')?.focus(); return; }
    if (!validIso(d.date)) { toast(t('Pick a date.'), { k: 'warn' }); return; }
    if (d.totalGuessed && !(await confirmSheet({ title: t('Is {0} the total?', fmtRM(d.total)), body: t('Tally guessed this total. Check it against the receipt.'), ok: t('Yes, save') }))) { $('#rv-total')?.focus(); return; }
    if (!d.dateFound && !(await confirmSheet({ title: t('Use today as the date?'), body: t('No date was found on the receipt.'), ok: t('Yes, save') }))) { $('#rv-date')?.focus(); return; }
    if (d.items.length && !check(d).ok && !(await confirmSheet({ title: t('Items do not add up'), body: t('The difference is spread across the items by size, so your categories stay close. Save anyway?'), ok: t('Save anyway') }))) return;
    b.disabled = true;
    const learnIt = $('#rv-learn')?.checked;
    const items = d.items.filter(i => i.name || i.cents).map(({ name, raw, cents, category }) => ({ name: name || raw || t('Item'), raw, cents, category }));
    const tx = { id: d.id, date: d.date, time: d.time, type: 'expense', amount: d.total, accountId: d.accountId, merchant: (d.merchant || '').trim(), note: d.note || '',
      category: items.length ? mostSpent(items) : d.category, items, tax: d.tax || 0, service: d.service || 0, rounding: d.rounding || 0, source: 'receipt', createdAt: d.createdAt || Date.now(), ...(d.receiptId ? { receiptId: d.receiptId } : {}) };
    await saveTx(tx);
    clearTimeout(persistT); await setKv('reviewDraft', null);   // saved: nothing to resume, even if the tab dies now
    if (learnIt) for (const i of d.items.filter(x => x.changed)) await learn(i.name || i.raw, i.category);
    toast(tx.date.slice(0, 7) === today().slice(0, 7) ? t('Saved {0} at {1}', fmtRM(tx.amount), tx.merchant || accName(tx.accountId)) : t('Saved {0} under {1}', fmtRM(tx.amount), fmtMonth(tx.date.slice(0, 7))), { icon: 'check' });
    await finish();
    if (queue.length) { pump(); render(); } else go('home');
  },
};
