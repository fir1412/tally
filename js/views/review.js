// Scan → review → save. Photos are read one at a time in a queue, so capture never waits on the screen.
// Only uncertain lines are flagged; the checksum says whether the items add up to the printed total.
import { S, setKv, saveTx, savePhoto, deletePhotos, getPhoto, learn, expenseCats, today, nowTime, uid, defaultAccount } from '../state.js';
import { t, fmtDate, fmtMonth, getLang } from '../i18n.js';
import { esc, ICON, toast, confirmSheet, openSheet, closeSheet, $, $$, landed, countUp, reduced, announce } from '../ui.js';
import { firstWord } from './learn.js';
import { fmtRM, fmtAcct, isFx, calcAmount, categorize, shopCategory, findDuplicate, validIso, addDays, itemKey } from '../engine.js';
import { checksum, parseItemLines } from '../parse.js';
import { readReceipt, loadOcr, ocrReady, ocrProgress, ocrSaved, OCR_BYTES } from '../scan.js';
let saved = false; ocrSaved().then(v => { saved = v; }, () => {});   // already on this phone: starting it is not a download
import { render, go, scanned } from '../app.js';
import { accName } from './money.js';
import { startScan } from '../camera.js';

// The first download's progress, drawn in place so the bar moves without redrawing the screen.
let dlPct = 0, dlText = '', dlSaid = 0;
const mb = n => (n / 1048576).toFixed(1);
ocrProgress((got, total) => {
  dlPct = Math.round(got / total * 100); dlText = t('{0} of {1} MB', mb(got), mb(total));
  if (dlPct >= dlSaid + 25) { dlSaid = dlPct - dlPct % 25; announce(`${t('Downloading the receipt reader')}: ${dlSaid}%`); }   // every quarter, for screen readers
  const bar = document.getElementById('ocr-prog'), txt = document.getElementById('ocr-pct');
  if (bar) bar.value = dlPct; if (txt) txt.textContent = dlText;
});
const queue = [];     // files waiting to be read
let current = null;   // {id, file?, status: 'reading'|'ready'|'error', draft, photo, ms, error}
let reading = false;

// The photo being read stays listed until its draft is saved: closing the app mid-read must not lose it.
const saveQueue = () => setKv('scanQueue', [...(['reading', 'error'].includes(current?.status) ? [current.id] : []), ...queue.map(q => q.id)]);
export async function enqueue(files) {
  try {
    let unsaved = 0;
    for (const f of files) { const id = uid('r'); queue.push({ id, file: f, status: 'waiting' }); if (!(await savePhoto(`q_${id}`, f))) unsaved++; }
    if (unsaved) toast(t('Phone storage is full: close Tally now and these photos are lost. Free some space.'), { k: 'bad' });
    await saveQueue();
  } finally { pump(); }   // read them now whatever happened to the saved copies
}
async function pump() {
  if (reading || current?.status === 'ready' || current?.status === 'reading') return;
  const next = queue.shift();
  if (!next) { current = null; return; }
  current = { ...next, status: 'reading', thumb: URL.createObjectURL(next.file) };
  saveQueue();
  reading = true; refresh(); announce(t('Reading…'));
  try {
    if (!ocrReady()) await loadOcr();
    const { receipt, photo, ms, turns } = await readReceipt(next.file);
    const draft = toDraft(receipt);
    if (photo) { draft.receiptId = uid('p'); if (!(await savePhoto(draft.receiptId, photo))) delete draft.receiptId; }   // saved now so a draft survives a restart
    current = { ...current, status: 'ready', ms, turns, draft, reveal: true, ...(photo ? { thumb: URL.createObjectURL(photo) } : {}) };   // the upright photo, as it was read
    if (!document.querySelector('.view-review')) toast(t('Your receipt is read.'), { k: 'good', icon: 'check', undo: () => go('review'), undoLabel: t('Check it') });   // left while the reader downloaded
    const n = draft.items.length;
    announce([n === 1 ? t('1 item') : t('{0} items', n), draft.total != null && t('Total {0}', fmtRM(draft.total))].filter(Boolean).join(', '));
    await setKv('reviewDraft', { draft, existing: false });
    await saveQueue();
  } catch (e) {
    console.error(e);
    current = { ...current, status: 'error', error: /not an image/.test(e.message) ? t('That file is not a photo. Pick a JPG or PNG of the receipt.') : /too big/.test(e.message) ? t('That photo is over 40 MB. Take a new one or send a smaller copy.') : /too many pixels/.test(e.message) ? t('That photo is over 50 megapixels. Take it in the normal camera mode, or send a smaller copy.') : t('Could not read this photo: {0}', e.message) };
  }
  if (current?.status === 'error') await saveQueue();
  else deletePhotos([`q_${next.id}`]);   // read: the draft holds its own copy now; an unreadable one waits for Skip
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
function finish() { clearTimeout(persistT); if (current) current.unread = ''; if (current?.thumb) URL.revokeObjectURL(current.thumb); current = null; return setKv('reviewDraft', null); }
/** On start: reopen an unfinished review. Returns 'items' for typed items (no photo), 'receipt' for the rest, or false. */
export async function restoreDraft() {
  if (current) return false;
  for (const id of S.kv.scanQueue || []) { const file = await getPhoto(`q_${id}`); if (file) queue.push({ id, file, status: 'waiting' }); }
  const saved = S.kv.reviewDraft;
  if (saved?.draft) {
    const blob = saved.draft.receiptId ? await getPhoto(saved.draft.receiptId) : null;
    current = { id: uid('r'), status: 'ready', existing: saved.existing, manual: saved.manual, draft: saved.draft, thumb: blob ? URL.createObjectURL(blob) : null };
  } else if (queue.length) pump();
  return current?.draft && !current.draft.receiptId ? 'items' : !!current || queue.length > 0 ? 'receipt' : false;
}

const EXAMPLE = { en: 'Phone 1299\nFish 25, vegetables 8', ms: 'Telefon 1299\nIkan 25, sayur 8', zh: '手机 1299\n鱼 25，菜 8，猪肉 30' };
/** Parsed receipt → editable transaction draft, with categories guessed from the user's rules and shop words. */
const flagWhy = i => (!i.name ? t('No name read') : i.cents === 0 ? t('Price looks wrong') : t('Hard to read: check the name and price'));
function toDraft(r) {
  // The shop as read, then as this user renamed it before ("HEXTAR LUCKIN" → what they typed last time).
  const read = (r.merchant || '').slice(0, 80), merchant = (read && S.kv.shopNames?.[itemKey(read)]) || read;
  const meal = c => (r.meal && c === 'groceries' ? 'dining' : c);   // a restaurant bill: its dishes are dining
  const items = r.items.map(i => ({ name: (i.name || '').slice(0, 80), raw: (i.name || '').slice(0, 80), cents: i.cents, category: meal(categorize(i.name, merchant, S.kv.rules)), flag: !!i.flag, ...(i.crop ? { crop: i.crop } : {}) }));
  items.forEach((i, n) => { if (i.cents < 0 && n > 0) i.category = items[n - 1].category; });   // money off belongs to the item it sits under
  const shop = shopCategory(merchant, S.kv.rules), category = r.meal && ['other', 'groceries'].includes(shop) ? 'dining' : shop;
  return {
    id: uid('t'), type: 'expense', source: 'receipt', merchant, readName: read, date: r.date && r.date <= today() ? r.date : today(), dateFound: !!r.date, time: r.time || nowTime(),
    accountId: defaultAccount('receipt', { amount: r.total || 0, shop: merchant, category, pay: r.pay, currency: r.currency }), currency: r.currency, category, items,
    total: r.total, totalGuessed: !!r.totalGuessed, tax: r.tax ?? 0, service: r.service ?? 0, rounding: r.rounding ?? 0, taxIncluded: !!r.taxIncluded,
    ...(r.refund ? { refund: true } : {}),
  };
}
/** Open an already-saved receipt transaction for item editing (from the transaction sheet). */
export function editExisting(tx, { manual = false, lines = '' } = {}) {
  current = { id: uid('r'), status: 'ready', existing: true, manual, draft: { ...structuredClone(tx), dateFound: true, total: tx.amount, items: (tx.items || []).map(i => ({ ...i })) } };
  if (lines) addLines(lines);   // "鱼 25, 菜 8" typed where the amount goes
  persist();
  go('review');
}

const guessFor = (name, d) => { const c = categorize(name, d.merchant, S.kv.rules); return c === 'other' && d.category && d.category !== 'other' ? d.category : c; };
const itemsSum = d => d.items.reduce((s, i) => s + (i.cents || 0), 0);
/** What the printed total has beyond the items and their extras (tax not included, service, rounding): shown as its own line. */
const gapOf = d => (d.total == null ? 0 : d.total - itemsSum(d) - (d.service || 0) - (d.taxIncluded ? 0 : d.tax || 0) - (d.rounding || 0));
const gapCat = d => d.gapCat || (d.items.length ? mostSpent(d.items) : d.category);
const check = d => checksum({ items: d.items.map(i => ({ cents: i.cents || 0 })), total: d.total, tax: d.tax || null, service: d.service || null, rounding: d.rounding || null });

export const reviewView = {
  title: 'Review receipt',
  /** A receipt just read: once its items are on screen they come in one by one, categories sliding into place, while
   *  the total ticks up; then "adds up" pops. A tap or a key skips to the end; none of it with reduced motion. */
  after() {
    if (!current?.reveal) return;
    current.reveal = false;
    const main = $('#view'), box = $('#rv-status'), d = current.draft;
    if (reduced() || !main || !box || !d.items.length || !('IntersectionObserver' in window)) return;
    const step = Math.round(Math.min(90, 900 / d.items.length)), dur = step * Math.min(d.items.length, 12) + 300;
    const final = box.innerHTML;
    box.innerHTML = `<p class="rv-tally num" aria-hidden="true">${esc(fmtRM(0))}</p>`;
    main.style.setProperty('--step', `${step}ms`); main.classList.add('reveal-wait');
    let done = false, timer = 0;
    const end = () => {
      if (done) return; done = true; clearTimeout(timer); io.disconnect();
      removeEventListener('click', end, true); removeEventListener('keydown', end, true);
      main.classList.remove('reveal', 'reveal-wait');
      if (!box.isConnected) return;
      box.innerHTML = final;
      if (d.total != null && check(d).ok) box.firstElementChild?.classList.add('pop');
    };
    // On a phone the items are below the photo: the reveal waits until they are scrolled into view.
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done) return;
      io.disconnect(); main.classList.replace('reveal-wait', 'reveal');
      countUp(box.firstChild, 0, d.total ?? itemsSum(d), dur, x => x);   // steady, in time with the items
      timer = setTimeout(end, dur + 80);
    }, { threshold: 0.6 });
    io.observe(box);
    addEventListener('click', end, true); addEventListener('keydown', end, true);
  },
  render() {
    const waiting = queue.length;
    if (!current) return `<header class="top"><h1>${esc(t('Scan a receipt'))}</h1></header>
      <section class="card center">${ICON.camera}<p>${esc(t('Take a photo of a receipt, or pick one or more from your gallery. They are read on this phone and never uploaded.'))}</p>
      <button class="btn wide" data-act="scan">${esc(t('Take or pick photos'))}</button><button class="btn ghost wide" data-act="tx-new">${esc(t('No receipt? Add by hand'))}</button>
      <button class="link" data-act="photo-tips">${ICON.camera}${esc(t('Tips for a clear photo'))}</button></section>`;
    if (current.status === 'reading' || current.status === 'waiting') return `<header class="top"><h1>${esc(t('Reading…'))}</h1></header>
      <div class="scanning">${current.thumb ? `<div class="receipt-thumb"><img src="${current.thumb}" alt=""><div class="scanline" aria-hidden="true"></div></div>` : ''}</div>
      <section class="card center" aria-busy="true"><p>${esc(ocrReady() ? t('Reading the receipt on this phone. This takes a few seconds.') : saved ? t('Starting the reader…') : t('Getting the reader ready (the first time downloads about 40 MB; after that it works offline).'))}</p>
      ${ocrReady() || saved ? '' : `<button class="btn ghost wide" data-act="go" data-to="home">${esc(t('Use Tally while it downloads'))}</button><div class="dl"><progress id="ocr-prog" max="100" value="${dlPct}" aria-label="${esc(t('Downloading the receipt reader'))}"></progress><span id="ocr-pct" class="fine num">${esc(dlText)}</span></div>`}
      ${waiting ? `<p class="fine">${esc(t('{0} more waiting', waiting))}</p>` : ''}<button class="link" data-act="photo-tips">${ICON.camera}${esc(t('Tips for a clear photo'))}</button></section>`;
    if (current.status === 'error') return `<header class="top"><h1>${esc(t('Scan a receipt'))}</h1></header>
      <section class="card"><p class="err">${esc(current.error)}</p><button class="btn wide" data-act="rv-retry">${esc(t('Try again'))}</button><div class="row2"><button class="btn ghost" data-act="rv-skip">${esc(waiting ? t('Next receipt') : t('Close'))}</button><button class="btn" data-act="scan">${esc(t('Try another photo'))}</button></div></section>`;
    const d = current.draft, c = d.total != null ? check(d) : null, flagged = d.items.filter(i => i.flag).length;
    const old = !current.existing && d.date < addDays(today(), -60);
    const dup = !current.existing && d.total ? findDuplicate({ ...d, amount: d.total }, S.tx) : null;
    const catOpts = sel => expenseCats().map(x => `<option value="${esc(x.id)}"${sel === x.id ? ' selected' : ''}>${esc(t(x.name))}</option>`).join('');
    const acct = S.accounts.find(x => x.id === d.accountId), money = v => fmtAcct(acct, v);   // "SGD 16.98" on an SGD account
    const status = current.manual ? (d.items.length ? `<p class="okbox">${ICON.check}${esc(t('Total {0}', money(itemsSum(d))))}</p>` : `<p class="fine">${esc(t('Add each thing you bought with its price. The total adds itself up.'))}</p>`)
      : d.total == null ? `<div class="warnbox">${ICON.alert}<span class="grow">${esc(d.items.length ? t('No total found: the bottom of the receipt may be cut off. Type the total, or take the photo again.') : t('No total found. Type the total from the receipt.'))}<span class="bactions"><button class="btn small ghost" data-act="scan">${ICON.camera}${esc(t('Retake'))}</button><button class="link tipsrow" data-act="photo-tips">${esc(t('Tips for a clear photo'))}</button></span></span></div>`
      : c.ok ? `<p class="okbox">${ICON.check}${esc(t('Items add up to the total {0}', money(d.total)))}</p>`
      : `<div class="warnbox">${ICON.alert}<span class="grow">${esc(t('Items add up to {0}, the receipt says {1}. Check the amber lines or add a missing item.', money(itemsSum(d) + (d.service || 0) + (d.taxIncluded ? 0 : d.tax || 0) + (d.rounding || 0)), money(d.total)))}${gapOf(d) > 0 ? `<button class="btn small ghost" data-act="rv-gapitem">${ICON.plus}${esc(t('Missed an item of {0}?', money(gapOf(d))))}</button>` : ''}</span></div>`;
    const gap = !current.manual && c && !c.ok && d.items.length ? gapOf(d) : 0;
    const gapLine = gap > 0 ? `<div class="gapline"><b class="grow">${esc(t('Not itemised'))}</b><span class="amt">${esc(fmtRM(gap))}</span>
      <select class="icat" data-input="rv-f" data-k="gapCat" aria-label="${esc(`${t('Not itemised')}: ${t('Category')}`)}">${catOpts(gapCat(d))}</select></div>` : '';
    const maths = [[t('Items'), itemsSum(d)], [t('Service'), d.service], [t('Tax'), d.taxIncluded ? 0 : d.tax], [t('Rounding'), d.rounding]].filter(([, v]) => v).map(([k, v]) => `${k} ${fmtRM(v, { plain: true })}`).join(' + ');
    return `<header class="top"><h1>${esc(current.manual || (current.existing && !d.receiptId) ? t('Your items') : t('Review receipt'))}</h1>${waiting ? `<span class="fine">${esc(t('{0} more waiting', waiting))}</span>` : ''}</header>
      ${old ? `<div class="warnbox">${ICON.clock}<span class="grow">${esc(t('This receipt is dated {0}. It will be filed under {1}, not this month.', fmtDate(d.date, { year: true }), fmtMonth(d.date.slice(0, 7))))}
        <button class="btn small ghost" data-act="rv-today">${esc(t("Use today's date"))}</button></span></div>` : ''}
      ${dup ? `<p class="warnbox">${ICON.alert}${esc(t('Looks like you already added this: {0} on {1}.', fmtRM(dup.amount), fmtDate(dup.date)))}</p>` : ''}
      <section class="card">
        <label class="field"><span>${esc(t('Shop'))}</span><input id="rv-merchant" maxlength="80" value="${esc(d.merchant)}" data-input="rv-f" data-k="merchant"></label>
        <div class="grid2"><label class="field"><span>${esc(t('Date'))}${d.dateFound ? '' : ` <em class="warn">${esc(t('(not found, check)'))}</em>`}</span><input id="rv-date" type="date" min="1990-01-01" value="${esc(d.date)}" max="${esc(today())}" data-input="rv-f" data-k="date"></label>
        <label class="field"><span>${esc(t('Paid from'))}</span><select id="rv-acc" data-input="rv-f" data-k="accountId">${S.accounts.map(a => `<option value="${esc(a.id)}"${d.accountId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label></div>
        <label class="check"><input type="checkbox" id="rv-refund" data-input="rv-refund"${d.refund ? ' checked' : ''}> ${esc(t('Refund: money back to this account'))}</label>
        ${(() => { const a = S.accounts.find(x => x.id === d.accountId), cur = a?.currency || 'MYR';   // the receipt's money vs the account's: said, never silently mixed
          return d.currency && d.currency !== cur ? `<p class="warnbox">${ICON.alert}<span>${esc(t('This receipt is in {0}, but {1} is in {2}. Pick an account in {0}, or check the amount.', d.currency, a?.name || '', cur === 'MYR' ? 'RM' : cur))}</span></p>` : ''; })()}
        <label class="field big"><span>${esc(isFx(S.accounts.find(x => x.id === d.accountId)) ? t('Total ({0})', S.accounts.find(x => x.id === d.accountId).currency) : t('Total (RM)'))}${d.totalGuessed ? ` <em class="warn">${esc(t('(guessed, check)'))}</em>` : ''}</span><input id="rv-total" inputmode="decimal" aria-describedby="rv-status" value="${d.total != null ? (d.total / 100).toFixed(2) : ''}" data-input="rv-f" data-k="total"></label>
      </section>
      ${current.thumb ? `<figure class="receipt-thumb"><button class="thumb-btn" data-act="rv-zoom" aria-expanded="false" aria-label="${esc(t('Show the whole receipt'))}"><img src="${current.thumb}" alt="${esc(t('Receipt photo'))}"></button></figure>` : ''}
      <div id="rv-status">${status}${d.total != null && c && !c.ok && maths ? `<p class="maths">${esc(maths)} ≠ ${esc(fmtRM(d.total, { plain: true }))}</p>` : ''}</div>
      <div class="rowb"><h2>${esc(t('Items'))} <span class="fine">${esc(flagged ? t('{0} to check', flagged) : '')}</span></h2>${d.items.length > 2 ? `<button class="btn small ghost" data-act="rv-select" aria-pressed="${!!current.selecting}">${esc(current.selecting ? t('Done') : t('Select'))}</button>` : ''}</div>
      ${current.selecting ? `<div class="bulkbar"><span class="fine grow">${esc(t('{0} selected', current.picked?.size || 0))}</span><select id="rv-bulkcat" aria-label="${esc(t('Category'))}">${catOpts('')}</select><button class="btn small" data-act="rv-bulkcat">${esc(t('Set'))}</button></div>` : ''}
      <ul class="list items-edit${current.selecting ? ' selecting' : ''}">${d.items.map((i, n) => `<li class="${i.flag ? 'flag' : ''}" style="--i:${Math.min(n, 12)}"${i.flag ? ` data-why="${esc(flagWhy(i))}"` : ''}>${current.selecting ? `<input type="checkbox" class="ipick" data-input="rv-pick" data-n="${n}"${current.picked?.has(n) ? ' checked' : ''} aria-label="${esc(t('Select {0}', i.name || t('item')))}">` : ''}
        <input class="iname" value="${esc(i.name)}" maxlength="80" aria-label="${esc(t('Item name'))}" data-input="rv-item" data-n="${n}" data-k="name" placeholder="${esc(t('Item name'))}">
        <input class="iamt" inputmode="decimal" value="${(i.cents / 100).toFixed(2)}" aria-label="${esc(t('Price'))}" data-input="rv-item" data-n="${n}" data-k="cents">
        <select class="icat" aria-label="${esc(t('Category'))}" data-input="rv-item" data-n="${n}" data-k="category">${catOpts(i.category)}</select>
        <button class="icon-btn" data-act="rv-del" data-n="${n}" aria-label="${esc(t('Remove {0}', i.name || t('item')))}">${ICON.x}</button>
        ${i.crop && current.thumb ? `<button class="raw rawbtn" data-act="rv-crop" data-n="${n}" aria-label="${esc(t('Show this line on the receipt'))}">${esc(i.raw || i.name)} ${ICON.image}</button>` : i.raw && i.raw !== i.name ? `<small class="raw">${esc(i.raw)}</small>` : i.qty ? `<small class="raw">${esc(`${i.qty} × ${fmtRM(i.unit, { plain: true })}`)}</small>` : ''}</li>`).join('')}</ul>
      <div id="rv-gap">${gapLine}</div>
      <button class="btn ghost wide" data-act="rv-add">${ICON.plus}${esc(current.manual || (current.existing && !d.receiptId) ? t('Add an item') : t('Add a missing item'))}</button>
      <details class="typebox"${(current.manual && !d.items.length) || current.unread ? ' open' : ''}><summary>${esc(t('Type or paste several items'))}</summary>
        <label class="field"><span>${esc(t('One item per line with its price. Tally sorts each into a category; change any it gets wrong.'))}</span><textarea id="rv-lines" rows="4" placeholder="${esc(EXAMPLE[getLang()] || EXAMPLE.en)}">${esc(current.unread || '')}</textarea></label>
        <button class="btn ghost wide" data-act="rv-lines">${esc(t('Add these items'))}</button></details>
      ${d.items.length ? '' : `<label class="field"><span>${esc(t('Category'))}</span><select id="rv-cat" data-input="rv-f" data-k="category">${catOpts(d.category)}</select></label>`}
      <label class="check"><input type="checkbox" id="rv-learn" checked> ${esc(t('Remember my category changes for next time'))}</label>
      <div class="row2 sticky"><button class="btn ghost" data-act="rv-skip">${esc(current.existing ? t('Cancel') : t('Discard'))}</button><button class="btn" data-act="rv-save">${esc(flagged ? t('Save · {0} to check', flagged) : t('Save'))}</button></div>`;
  },
};

export const input = {
  'rv-pick': el => { const s = current.picked ||= new Set(), n = +el.dataset.n; if (el.checked) s.add(n); else s.delete(n); const c = $('.bulkbar .fine'); if (c) c.textContent = t('{0} selected', s.size); },
  'rv-refund': el => { const d = current?.draft; if (d) { d.refund = el.checked; if (el.checked) d.accountId = $('#rv-acc')?.value || d.accountId; persist(); } },
  'rv-f': el => {
    const d = current?.draft; if (!d) return;
    const k = el.dataset.k;
    persist();
    if (k === 'merchant' && current.manual) for (const i of d.items) if (!i.changed) i.category = categorize(i.name, el.value, S.kv.rules);
    if (k === 'total') { const v = calcAmount(el.value); d.total = v != null && v > 0 ? v : null; d.totalGuessed = false; el.setAttribute('aria-invalid', String(!!el.value.trim() && d.total == null)); updateStatus(); return; }
    d[k] = el.value;
    if (k === 'date') d.dateFound = true;
    if (k === 'accountId') refresh();   // the total's currency and the receipt-vs-account note follow the account
  },
  'rv-item': el => {
    const i = current?.draft?.items[+el.dataset.n]; if (!i) return;
    persist();
    if (el.dataset.k === 'cents') { const v = calcAmount(el.value); el.classList.toggle('bad', v == null); el.setAttribute('aria-invalid', String(v == null)); if (v != null) { i.cents = v; if (i.qty) i.unit = Math.round(v / i.qty); } updateStatus(); }
    else if (el.dataset.k === 'category') { i.category = el.value; i.changed = true; unflag(i, el); }
    else {
      i.name = el.value.slice(0, 80); unflag(i, el);
      // Sorted as it is typed ("Phone" → Electronics, "Ikan" → Groceries) until the user picks a category themselves.
      if (!i.changed) { i.category = guessFor(i.name, current.draft); const sel = el.closest('li')?.querySelector('.icat'); if (sel) sel.value = i.category; }
    }
  },
};
/** A line the user has fixed is no longer amber, and the "to check" counts go down with it. */
function unflag(i, el) {
  if (!i.flag) return;
  i.flag = false; el.closest('li')?.classList.remove('flag');
  const tmp = document.createElement('div'); tmp.innerHTML = reviewView.render();
  for (const sel of ['main h2 .fine', '[data-act="rv-save"]']) { const a = document.querySelector(sel), b = tmp.querySelector(sel.replace('main ', '')); if (a && b) a.textContent = b.textContent; }
}
function updateStatus() { // re-render only the status line (and the not-itemised line) so typing keeps focus
  const box = $('#rv-status'); if (!box) return;
  const tmp = document.createElement('div'); tmp.innerHTML = reviewView.render();
  box.innerHTML = tmp.querySelector('#rv-status').innerHTML;
  const gap = $('#rv-gap'); if (gap) gap.innerHTML = tmp.querySelector('#rv-gap')?.innerHTML || '';
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
// ✗ while a scene shows the mistake, ✓ once it reaches the good state (in time with it); "scan it soon" runs the other
// way, fresh to faded. Without motion only the ✓ shows.
const MARK_T = [[2.8], [3], [3], [3], [3], [3.6, true]];
const mark = ([s, rev]) => `<g class="tp-mark${rev ? ' rev' : ''}" style="--d:${s}s"><circle cx="106" cy="66" r="9"/><path class="tp-no" d="M102.5 62.5l7 7M109.5 62.5l-7 7"/><path class="tp-ok" d="M102 66.5l3 3 5.5-6.5"/></g>`;
export function photoTips({ thenScan = false } = {}) {
  const tips = [
    [t('Fit it all in'), t('Shop name to TOTAL, flat')],
    [t('Bright, no shadow'), t('No flash on shiny paper')],
    [t('Hold still'), t('Straight above, tap to focus')],
    [t('Dark background'), t('Pale receipt, dark table')],
    [t('Long receipt?'), t('Step back until it fits')],
    [t('Scan it soon'), t('Receipts fade in weeks')],
  ];
  // Title with a close button and the action stay pinned while the scenes scroll between them (small phones).
  const el = openSheet(`<div class="sheethead"><h2 class="sh-title">${esc(t('Tips for a clear photo'))}</h2><button class="icon-btn" data-x="ok" aria-label="${esc(t('Close'))}">${ICON.x}</button></div>
    <ol class="tips">${tips.map(([h, b], i) => `<li><svg viewBox="0 0 120 80" aria-hidden="true"><rect class="tp-bg" width="120" height="80"/>${TIP_ART[i]}${mark(MARK_T[i])}</svg><b>${esc(h)}</b><span>${esc(b)}</span></li>`).join('')}</ol>
    <div class="sheetfoot">${thenScan ? `<button class="btn wide" data-x="scan">${ICON.camera}${esc(t('Take a photo'))}</button>` : `<button class="btn wide" data-x="ok">${esc(t('Got it'))}</button>`}</div>`, { label: t('Tips for a clear photo') });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'scan') startScan(scanned); else closeSheet();
  });
}
/** Typed lines ("Fish 25, vegetables 8") → items on the receipt being checked. Returns how many. */
/** Typed item lines into the draft ("Eggs 2x6.20"); lines Tally could not read stay in the box to fix. */
function addLines(text) {
  const d = current.draft, { items: lines, skipped } = parseItemLines(text);
  for (const { name, ...price } of lines) d.items.push({ name, raw: '', ...price, category: guessFor(name, d), flag: false });
  if (lines.length && current.manual) { d.total = itemsSum(d); d.totalGuessed = false; }
  current.unread = skipped.join('\n');
  return { n: lines.length, skipped };
}
export const act = {
  'photo-tips': () => photoTips(),
  'rv-skip': async () => {
    const d = current?.draft;
    if (d?.receiptId && !current.existing && !S.tx.some(x => x.receiptId === d.receiptId)) await deletePhotos([d.receiptId]);   // a discarded scan leaves no photo behind
    if (current?.status === 'error') await deletePhotos([`q_${current.id}`]);   // the unreadable photo, now that the user let it go
    await finish();
    if (queue.length) pump(); else go('home');
  },
  'rv-retry': async () => {   // the photo was kept: read it again (the reader may have been offline)
    const file = await getPhoto(`q_${current.id}`); if (!file) return toast(t('That photo is no longer on this phone.'), { k: 'warn' });
    queue.unshift({ id: current.id, file, status: 'waiting' }); current = null; pump();
  },
  'rv-zoom': b => { const open = b.closest('figure').classList.toggle('zoom'); b.setAttribute('aria-expanded', open); },
  'rv-today': () => { current.draft.date = today(); current.draft.dateFound = true; persist(); render(); },
  'rv-lines': () => {
    const { n, skipped } = addLines($('#rv-lines').value);
    if (!n) return toast(t('Write each item with its price, like "Phone 1299".'), { k: 'warn' });
    persist(); render();
    if (skipped.length) toast(t('Added {0}. Could not read: {1}. Add a price, like "Phone 1299".', n === 1 ? t('1 item') : t('{0} items', n), skipped.join(', ')), { k: 'warn' });
    else toast(n === 1 ? t('Added 1 item') : t('Added {0} items', n), { k: 'good', icon: 'check' });
  },
  // The line on the photo an item was read from, with a line above and below for context.
  'rv-crop': async b => {
    const i = current.draft.items[+b.dataset.n]; if (!i?.crop || !current.thumb) return;
    const img = new Image(); img.src = current.thumb; await img.decode().catch(() => {});
    const pad = (i.crop.b - i.crop.t) * 1.2, top = Math.max(0, i.crop.t - pad), h = Math.min(1, i.crop.b + pad) - top;
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = Math.max(1, Math.round(img.naturalHeight * h));
    c.getContext('2d').drawImage(img, 0, top * img.naturalHeight, img.naturalWidth, c.height, 0, 0, c.width, c.height);
    const el = openSheet(`<h2 class="sh-title">${esc(i.name || i.raw)}</h2><p class="fine mono">${esc(i.raw || '')}</p><div class="cropview"></div><button class="btn wide" data-act="sheet-close">${esc(t('Got it'))}</button>`, { label: t('Show this line on the receipt'), stack: true });
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', t('Receipt photo')); el.querySelector('.cropview').append(c);
  },
  'rv-gapitem': () => { const d = current.draft; d.items.push({ name: '', raw: '', cents: gapOf(d), category: gapCat(d), flag: true }); persist(); render(); $$('.iname').at(-1)?.focus(); },   // the gap as an item: only its name to type
  // Many items at once (a 40-line grocery receipt): tick them, pick one category.
  'rv-select': () => { current.selecting = !current.selecting; current.picked = new Set(); render(); },
  'rv-bulkcat': () => { const c = $('#rv-bulkcat')?.value, d = current.draft; if (!c || !current.picked?.size) return; for (const n of current.picked) if (d.items[n]) { d.items[n].category = c; d.items[n].changed = true; } current.selecting = false; persist(); render(); toast(t('Category set for {0} items', current.picked.size), { icon: 'check' }); },
  'rv-add': () => { current.draft.items.push({ name: '', raw: '', cents: 0, category: current.draft.category, flag: true }); persist(); render(); $$('.iname').at(-1)?.focus(); },
  'rv-del': b => { current.draft.items.splice(+b.dataset.n, 1); persist(); render(); },
  'rv-save': async b => {
    const d = current.draft;
    if (current.manual && d.items.length) d.total = itemsSum(d);
    if (!d.total || d.total <= 0) { toast(t('Type the total from the receipt first.'), { k: 'warn' }); $('#rv-total')?.focus(); return; }
    if (!validIso(d.date)) { toast(t('Pick a date.'), { k: 'warn' }); return; }
    if (d.totalGuessed && !(await confirmSheet({ title: t('Is {0} the total?', fmtRM(d.total)), body: t('Tally guessed this total. Check it against the receipt.'), ok: t('Yes, save') }))) { $('#rv-total')?.focus(); return; }
    if (!d.dateFound && !(await confirmSheet({ title: t('Use today as the date?'), body: t('No date was found on the receipt.'), ok: t('Yes, save') }))) { $('#rv-date')?.focus(); return; }
    const gap = !current.manual && d.items.length && !check(d).ok ? gapOf(d) : 0;   // more on the receipt than the items: its own line
    if (gap < 0 && !(await confirmSheet({ title: t('Items do not add up'), body: t('The difference is spread across the items by size, so your categories stay close. Save anyway?'), ok: t('Save anyway') }))) return;
    b.disabled = true;
    const learnIt = $('#rv-learn')?.checked;
    const items = d.items.filter(i => i.name || i.cents).map(({ name, raw, cents, category, qty, unit }) => ({ name: name || raw || t('Item'), raw, cents, category, ...(qty ? { qty, unit } : {}) }));
    if (gap > 0) items.push({ name: t('Not itemised'), raw: '', cents: gap, category: gapCat(d) });
    // Editing an entry keeps what the review doesn't show: who added it (a spouse's stays theirs), its bill, its source.
    const was = current.existing ? S.tx.find(x => x.id === d.id) || {} : {};
    const spentOn = items.length ? mostSpent(items) : d.category;   // a refund lowers spending there instead
    const tx = { ...was, id: d.id, date: d.date, time: d.time, type: d.refund ? 'income' : 'expense', amount: d.total, accountId: d.accountId, merchant: (d.merchant || '').trim(), note: d.note || '',
      category: d.refund ? 'refund' : spentOn, ...(d.refund ? { cat: spentOn } : { cat: undefined }), items, tax: d.tax || 0, service: d.service || 0, rounding: d.rounding || 0, source: was.source || 'receipt', createdAt: d.createdAt || Date.now(), ...(d.receiptId ? { receiptId: d.receiptId } : {}) };
    await saveTx(tx);
    clearTimeout(persistT); await setKv('reviewDraft', null);   // saved: nothing to resume, even if the tab dies now
    if (d.readName && tx.merchant && tx.merchant !== d.readName && itemKey(d.readName))   // remember the name they gave this shop
      await setKv('shopNames', Object.fromEntries([...Object.entries(S.kv.shopNames || {}), [itemKey(d.readName), tx.merchant.slice(0, 80)]].slice(-500)));
    if (learnIt) for (const i of d.items.filter(x => x.changed)) await learn(i.name || i.raw, i.category);
    landed(tx.id);
    const first = !current.existing && firstWord(tx.receiptId ? 'receipt' : 'entry');
    toast(first || (tx.date.slice(0, 7) === today().slice(0, 7) ? t('Saved {0} at {1}', fmtAcct(S.accounts.find(a => a.id === tx.accountId), tx.amount), tx.merchant || accName(tx.accountId)) : t('Saved {0} under {1}', fmtAcct(S.accounts.find(a => a.id === tx.accountId), tx.amount), fmtMonth(tx.date.slice(0, 7)))), { icon: 'check', ...(first ? { k: 'good', cheer: true } : {}) });
    await finish();
    if (queue.length) { pump(); render(); } else go('home');
  },
};
