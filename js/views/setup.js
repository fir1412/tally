// Welcome (first run), Settings, and every way to bring data in or take it out.
import { S, settings, setSetting, setKv, saveAccount, deleteAccount, saveTxs, deleteTxs, addCategory, savePhoto, deletePhotos, getPhoto, replaceAll, addAll, eraseAll, uid, today, nowTime, expenseCats } from '../state.js';
import { t, setLang, getLang, LANGS, fmtDate } from '../i18n.js';
import { esc, ICON, openSheet, closeSheet, confirmSheet, toast, $ } from '../ui.js';
import { fmtRM, parseAmount, balances, ACCOUNT_KINDS, CATEGORIES, INCOME_CATEGORIES } from '../engine.js';
import { fileToRows, guessMapping, headerRow, rowsToTx, openingFromBalance, mapCategory, parseCSV, sheetCsvUrl, toCSV, makeBackup, readBackup, mergeBackup, download, shareFile, cleanText, importIds, LIMITS, zipStore, unzip, BACKUP_JSON } from '../io.js';
import { parseStatement, statementToTx, linesFromItems, isWallet } from '../statement.js';
import { render, go, APP_VERSION } from '../app.js';
import { openFeedback } from '../feedback.js';
import { showTour, showWhatsNew, afterSetup, markSeen, canInstall, promptInstall, checkForUpdates, newSince } from '../tour.js';

const KIND = { cash: 'Cash', bank: 'Bank account', ewallet: 'E-wallet', card: 'Credit card', savings: 'Savings' };
const langButtons = () => `<div class="segs" role="group" aria-label="Language · Bahasa · 语言">${LANGS.map(([k, n]) => `<button class="seg${getLang() === k ? ' on' : ''}" data-act="set-lang" data-l="${k}" lang="${k === 'zh' ? 'zh-Hans' : k}" aria-pressed="${getLang() === k}">${esc(n)}</button>`).join('')}</div>`;

/** A receipt turning into categories: what "item by item" means, before anyone has to read the list below. */
const demoCard = () => {
  const lines = [['MILO 1KG', 'groceries', 2890], ['GARDENIA', 'groceries', 450], ['DYNAMO 2.8KG', 'household', 3290], ['NASI LEMAK', 'dining', 600]];
  const by = {}; for (const [, c, v] of lines) by[c] = (by[c] || 0) + v;
  return `<div class="demo" aria-hidden="true"><div class="demo-r"><b>KEDAI RUNCIT JAYA</b>${lines.map(([n, , v]) => `<span><i>${n}</i><i>${(v / 100).toFixed(2)}</i></span>`).join('')}<span class="tot"><i>TOTAL</i><i>72.30</i></span></div>
    <div class="demo-a">${ICON.back}</div><ul class="demo-c">${Object.entries(by).map(([c, v]) => `<li>${dotFor(c)}<span class="grow">${esc(t(CATEGORIES.find(x => x.id === c).name))}</span><b>${esc(fmtRM(v))}</b></li>`).join('')}</ul></div>`;
};
const dotFor = c => `<span class="dot" style="background:${esc(CATEGORIES.find(x => x.id === c).color)}"></span>`;

// ---- Welcome ----------------------------------------------------------------------------------------------------------
export const welcomeView = {
  title: 'Welcome',
  render() {
    return `<section class="welcome">
      <h1>Tally</h1>
      <p class="lede">${esc(t('Snap any receipt. See what you actually spent on, item by item.'))}</p>
      ${demoCard()}
      ${langButtons()}
      <ul class="points">
        <li>${ICON.receipt}<span>${esc(t('Receipts are read on this phone and split into categories automatically.'))}</span></li>
        <li>${ICON.wallet}<span>${esc(t('No account, no ads. Your data never leaves this phone unless you export it.'))}</span></li>
        <li>${ICON.upload}<span>${esc(t('Already tracking in another app or a spreadsheet? Bring your history with you.'))}</span></li>
      </ul>
      <button class="btn wide" data-act="start-fresh">${esc(t('Start fresh'))}</button>
      <button class="btn ghost wide" data-act="import-open">${esc(t('Bring my data (Money Manager, Excel, Google Sheets)'))}</button>
      <button class="btn ghost wide" data-act="restore-pick">${esc(t('Restore a Tally backup'))}</button>
      ${canInstall() ? `<button class="btn ghost wide" data-act="install">${ICON.download}${esc(t('Install Tally on this phone'))}</button>` : `<p class="fine">${esc(t('Tip: install Tally from your browser menu (Add to Home screen) so it opens like an app and works offline.'))}</p>`}
      <h2 class="welcome-h">${esc(t('How it works'))}</h2>
      <ol class="steps">
        <li><b>${esc(t('Snap'))}</b><span>${esc(t('Photograph a receipt, or pick several from your gallery.'))}</span></li>
        <li><b>${esc(t('Check'))}</b><span>${esc(t('Tally lists every item with a category. Fix anything it got wrong; it learns for next time.'))}</span></li>
        <li><b>${esc(t('See'))}</b><span>${esc(t('Your balance, where the money went, and a nudge when it is time to log.'))}</span></li>
      </ol>
      <details class="whatsnew"><summary>${esc(t("What's new in {0}", APP_VERSION))}</summary><ul class="newlist">${newSince('0.1.0').map(x => `<li>${esc(t(x))}</li>`).join('')}</ul></details>
    </section>`;
  },
};

function accountSheet(a = {}) {
  const isNew = !a.id;
  openSheet(`<h2 class="sh-title">${esc(isNew ? t('Add an account') : t('Edit account'))}</h2>
    <label class="field"><span>${esc(t('Name'))}</span><input id="ac-name" maxlength="60" value="${esc(a.name || '')}" placeholder="${esc(t('e.g. Maybank, Cash, Touch \'n Go'))}" autofocus></label>
    <label class="field"><span>${esc(t('Type'))}</span><select id="ac-kind">${ACCOUNT_KINDS.map(k => `<option value="${k}"${(a.kind || 'bank') === k ? ' selected' : ''}>${esc(t(KIND[k]))}</option>`).join('')}</select></label>
    <label class="field"><span>${esc(t('Balance when you started (RM)'))}</span><input id="ac-open" inputmode="decimal" value="${a.opening != null ? (a.opening / 100).toFixed(2) : ''}" placeholder="0.00"><small>${esc(t('For a credit card, enter what you owe as a negative number, e.g. -350.'))}</small></label>
    <p class="err" id="ac-err" role="alert"></p>
    <div class="row2">${isNew ? `<button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button>` : `<button class="btn ghost danger" data-act="acc-del" data-id="${esc(a.id)}">${esc(t('Delete'))}</button>`}<button class="btn" data-act="acc-save" data-id="${esc(a.id || '')}">${esc(t('Save'))}</button></div>`, { label: t('Account') });
}

/** "Bank account · RM 1,200.00", without repeating a type the name already says ("Cash · Cash"). */
function accSub(a, by) {
  const kind = t(KIND[a.kind] || 'Bank account');
  const n = a.name.trim().toLowerCase(), k = kind.toLowerCase();
  return [!(k.startsWith(n) || n.startsWith(k)) && kind, fmtRM(by[a.id] || 0)].filter(Boolean).join(' · ');
}
// ---- Settings -----------------------------------------------------------------------------------------------------------
const catName = id => t(([...expenseCats(), ...INCOME_CATEGORIES].find(c => c.id === id) || CATEGORIES.at(-1)).name);
export const settingsView = {
  title: 'Settings',
  render() {
    const rules = Object.entries(S.kv.rules), bal = balances(S.accounts, S.tx, today()).by;
    const last = S.kv.lastBackup;
    return `<header class="top"><button class="icon-btn" data-act="back" data-to="home" aria-label="${esc(t('Back'))}">${ICON.back}</button><h1>${esc(t('Settings'))}</h1><span></span></header>
      <section class="card"><h2>${esc(t('Language'))}</h2>${langButtons()}
        <label class="field"><span>${esc(t('Text size'))}</span><select data-input="text-size">${[100, 115, 130].map(n => `<option value="${n}"${(settings().textSize || 100) === n ? ' selected' : ''}>${n}%</option>`).join('')}</select></label></section>
      <section class="card"><h2>${esc(t('Accounts'))}</h2><ul class="list">${S.accounts.map(a => `<li><button class="txrow" data-act="acc-edit" data-id="${esc(a.id)}"><span class="grow"><b>${esc(a.name)}</b><small>${esc(accSub(a, bal))}</small></span><span class="fine">${esc(t('Edit'))}</span></button></li>`).join('')}</ul>
        <button class="btn ghost wide" data-act="acc-edit">${ICON.plus}${esc(t('Add an account'))}</button></section>
      <section class="card" id="backup"><h2>${esc(t('Backup'))}</h2>
        <p class="fine">${esc(last ? t('Last backup: {0}', last.slice(0, 10)) : t('Not backed up yet'))} · ${esc(t('Tally keeps everything on this phone. Save a backup file to Google Drive or email it to yourself.'))}</p>
        <div class="row2"><button class="btn" data-act="backup">${ICON.download}${esc(t('Back up now'))}</button><button class="btn ghost" data-act="restore-pick">${esc(t('Restore'))}</button></div></section>
      <section class="card"><h2>${esc(t('Bring data in'))}</h2><p class="fine">${esc(t('From Money Manager (.mmbackup), Excel, CSV, a bank statement, or Google Sheets.'))}</p>
        <button class="btn ghost wide" data-act="import-open">${ICON.upload}${esc(t('Import'))}</button>
        <button class="btn ghost wide" data-act="export-csv">${ICON.download}${esc(t('Export to Excel (CSV)'))}</button></section>
      <section class="card"><h2>${esc(t('Categories'))}</h2><ul class="chips static">${expenseCats().map(c => `<li class="chip"><span class="dot" style="background:${esc(c.color)}"></span>${esc(t(c.name))}</li>`).join('')}</ul>
        <button class="btn ghost wide" data-act="cat-add">${ICON.plus}${esc(t('Add a category'))}</button>
        <details><summary>${esc(t('What Tally remembers ({0})', rules.length))}</summary><p class="fine">${esc(t('When you change an item\'s category, Tally files that item the same way next time.'))}</p>
          <ul class="list">${rules.slice(0, 200).map(([k, v]) => `<li class="rowb"><span class="grow">${esc(k.replace(/^SHOP /, `${t('Shop')}: `))} → ${esc(catName(v))}</span><button class="icon-btn" data-act="rule-del" data-k="${esc(k)}" aria-label="${esc(t('Forget'))}">${ICON.x}</button></li>`).join('')}</ul></details></section>
      <section class="card"><h2>${esc(t('Privacy'))}</h2><p class="fine">${esc(t('No account, no ads, no tracking. Receipts are read on this phone. The only things Tally downloads are its own files; a Google Sheets link is fetched only when you paste one.'))}</p>
        <button class="btn ghost danger wide" data-act="erase">${ICON.trash}${esc(t('Erase everything on this phone'))}</button>
        <a class="link" href="privacy.html" target="_blank" rel="noopener">${esc(t('Privacy policy'))}</a> · <a class="link" href="terms.html" target="_blank" rel="noopener">${esc(t('Terms of use'))}</a></section>
      <section class="card"><h2>${esc(t('Help and feedback'))}</h2>
        <div class="row2"><button class="btn ghost" data-act="tour">${esc(t('Take the tour'))}</button><button class="btn ghost" data-act="whats-new">${esc(t("What's new"))}</button></div>
        ${canInstall() ? `<button class="btn ghost wide" data-act="install">${ICON.download}${esc(t('Install Tally on this phone'))}</button>` : ''}
        <button class="btn ghost wide" data-act="update-check">${esc(t('Check for updates'))}</button>
        <p class="fine">${esc(t('Tell the developer about a bug or an idea. Only your message is sent.'))}</p>
        <button class="btn ghost wide" data-act="feedback">${ICON.chat}${esc(t('Send feedback'))}</button></section>
      <p class="fine center">Tally ${APP_VERSION}</p>`;
  },
};
export const input = {
  'text-size': async el => { await setSetting('textSize', +el.value); document.documentElement.style.fontSize = `${el.value}%`; },
  'imp-map': el => { if (el.value === '') delete IMP.map[el.dataset.k]; else IMP.map[el.dataset.k] = +el.value; showMapping(); },
  'imp-acc': el => { IMP.accountId = el.value; showMapping(); },
  'imp-accname': el => { IMP.accName = el.value; },
  'imp-future': el => { IMP.skipFuture = el.checked; showMapping(); },
  'imp-cat': el => { IMP.catMap[el.dataset.src] = el.value; },
};

// ---- import: files, paste, Google Sheets link, Money Manager ------------------------------------------------------------
let IMP = null; // {rows, header, map, accountId, catMap, name} or {mm, buf}
function importSheet() {
  openSheet(`<h2 class="sh-title">${esc(t('Bring data in'))}</h2>
    <label class="btn wide filebtn">${ICON.upload}${esc(t('Choose a file'))}<input type="file" id="imp-file" hidden></label>
    <p class="fine">${esc(t('Money Manager backup (.mmbackup), Excel (.xlsx), CSV from your bank or another app, or a Tally backup.'))}</p>
    <h3>${esc(t('From Google Sheets'))}</h3>
    <label class="field"><span>${esc(t('Paste the cells (select all in the sheet, copy, paste here)'))}</span><textarea id="imp-paste" rows="4" placeholder="Date	Amount	Category	Note"></textarea></label>
    <button class="btn ghost wide" data-act="imp-paste">${esc(t('Use pasted cells'))}</button>
    <label class="field"><span>${esc(t('Or paste the sheet link (sharing must be "Anyone with the link")'))}</span><input id="imp-link" inputmode="url" placeholder="https://docs.google.com/spreadsheets/d/…"></label>
    <button class="btn ghost wide" data-act="imp-link">${esc(t('Fetch from Google Sheets'))}</button>
    <p class="err" id="imp-err" role="alert"></p>`, { label: t('Import') });
  $('#imp-file').addEventListener('change', e => { const f = e.target.files[0]; if (f) importFile(f); });
}
const newAccName = () => cleanText(IMP?.accName || '', 40) || cleanText(String(IMP?.name || '').replace(/\.[a-z0-9]{2,5}$/i, ''), 40) || t('Imported');
const impAccount = () => (IMP.accountId === 'new' ? IMP.newId : IMP.accountId);
const impErr = m => { const el = $('#imp-err'); if (el) el.textContent = m; else toast(m, { k: 'bad' }); };
async function ensureAccount() {
  if (!S.accounts.length) await saveAccount({ id: uid('a'), name: t('Cash'), kind: 'cash', opening: 0, createdAt: Date.now() });
}
async function importFile(f) {
  try {
    if (f.size > LIMITS.backupBytes) return impErr(t('That file is too big (over 200 MB).'));
    const buf = await f.arrayBuffer();
    const head = new Uint8Array(buf.slice(0, 64));
    const zipAt = head.findIndex((x, i) => x === 0x50 && head[i + 1] === 0x4b && head[i + 2] === 3 && head[i + 3] === 4);
    // Money Manager backups: .mmbackup, or any zip (maybe renamed by a download) holding MyFinance.db
    if (/\.mmbackup$/i.test(f.name) || (zipAt > 0 && zipAt < 64)) return await importMoneyManager(buf);
    if (/\.json$/i.test(f.name) || new Uint8Array(buf.slice(0, 1))[0] === 0x7b) return await restoreText(new TextDecoder().decode(buf));
    if (zipAt === 0) {
      const z = await unzip(buf, n => n === BACKUP_JSON || /^photos\/[\w-]{1,60}\.jpg$/.test(n)).catch(() => ({}));
      if (z[BACKUP_JSON]) return await restoreText(new TextDecoder().decode(z[BACKUP_JSON]), z);
    }
    if (new TextDecoder().decode(buf.slice(0, 5)) === '%PDF-') return await importStatement(buf);
    startMapping(await fileToRows(f.name, buf), f.name);
  } catch (e) { impErr(t(e.message)); }
}
async function startMapping(rows, name) {
  const h = headerRow(rows);
  if (rows.length < h + 2) return impErr(t('That file has no rows to import. Check you picked the right sheet.'));
  const header = rows[h].map(x => cleanText(x, 40));
  // Another app's history or a bank's statement is its own account by default (Round 2: imports landed in Cash).
  IMP = { rows: rows.slice(h + 1), header, map: guessMapping(header), accountId: 'new', newId: uid('a'), accName: '', catMap: {}, name, skipFuture: true };
  showMapping();
}
/** The rows as they will be imported, with the sheet's choices applied, and a new account's opening balance. */
function impPlan() {
  const { txs: all, skipped } = rowsToTx(IMP.rows, IMP.map, { accountId: impAccount(), catMap: IMP.catMap });
  const tdy = today(), future = all.filter(x => x.date > tdy).length;
  return { txs: IMP.skipFuture ? all.filter(x => x.date <= tdy) : all, skipped, future, opening: IMP.accountId === 'new' ? openingFromBalance(IMP.rows, IMP.map, all, tdy) : null };
}
function showMapping() {
  const { header, map, rows } = IMP;
  const col = (k, label) => `<label class="field"><span>${esc(label)}</span><select data-input="imp-map" data-k="${k}"><option value="">${esc(t('(none)'))}</option>${header.map((h, i) => `<option value="${i}"${map[k] === i ? ' selected' : ''}>${esc(h || t('Column {0}', i + 1))}</option>`).join('')}</select></label>`;
  const { txs, skipped, future, opening } = impPlan();
  // What the import will add, before it's added: dates, money in and out, and dates that can't be right yet.
  const dates = txs.map(x => x.date).sort(), sum = k => txs.filter(x => x.type === k).reduce((s, x) => s + x.amount, 0);
  const srcCats = map.category != null ? [...new Set(rows.map(r => cleanText(r[map.category], 60)).filter(Boolean))].slice(0, 40) : [];
  const cats = [...expenseCats(), ...INCOME_CATEGORIES];
  openSheet(`<h2 class="sh-title">${esc(t('Match the columns'))}</h2><p class="fine">${esc(IMP.name || '')} · ${esc(t('{0} rows', rows.length))}</p>
    <div class="grid2">${col('date', t('Date'))}${col('amount', t('Amount'))}${col('debit', t('Money out (debit)'))}${col('credit', t('Money in (credit)'))}${col('type', t('Income or expense'))}${col('category', t('Category'))}${col('merchant', t('Shop / payee'))}${col('note', t('Note'))}${col('balance', t('Balance'))}</div>
    <label class="field"><span>${esc(t('Into account'))}</span><select data-input="imp-acc">${S.accounts.map(a => `<option value="${esc(a.id)}"${IMP.accountId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}<option value="new"${IMP.accountId === 'new' ? ' selected' : ''}>${esc(t('A new account'))}</option></select></label>
    ${IMP.accountId === 'new' ? `<label class="field"><span>${esc(t('Name of the new account'))}</span><input data-input="imp-accname" maxlength="40" value="${esc(newAccName())}"></label>
      ${opening != null ? `<p class="fine">${esc(t('Opening balance {0}, worked out from the Balance column so the account matches your statement.', fmtRM(opening)))}</p>` : ''}` : ''}
    ${srcCats.length ? `<details open><summary>${esc(t('Their categories → Tally categories'))}</summary><div class="grid2">${srcCats.map(s => `<label class="field"><span>${esc(s)}</span><select data-input="imp-cat" data-src="${esc(s)}">${cats.map(c => `<option value="${esc(c.id)}"${(IMP.catMap[s] || mapCategory(s)) === c.id ? ' selected' : ''}>${esc(t(c.name))}</option>`).join('')}</select></label>`).join('')}</div></details>` : ''}
    <p class="${txs.length ? 'okbox' : 'warnbox'}">${esc(t('{0} ready to import', txs.length))}${skipped.length ? ` · ${esc(t('{0} rows skipped (no date or amount)', skipped.length))}` : ''}</p>
    ${txs.length ? `<p class="fine">${esc(t('{0} to {1}', fmtDate(dates[0]), fmtDate(dates.at(-1))))} · ${esc(t('{0} spent', fmtRM(sum('expense'))))} · ${esc(t('{0} received', fmtRM(sum('income'))))}</p>` : ''}
    ${future ? `<div class="warnbox">${ICON.alert}<span class="grow">${esc(t('{0} rows are dated after today. If that looks wrong, check the date column: day and month may be swapped.', future))}
      <label class="check"><input type="checkbox" data-input="imp-future"${IMP.skipFuture ? ' checked' : ''}> ${esc(t('Leave them out'))}</label></span></div>` : ''}
    <ul class="list preview">${txs.slice(0, 5).map(x => `<li class="rowb"><span>${esc(fmtDate(x.date))}</span><span class="grow">${esc(x.merchant || '')}</span><span class="amt ${x.type}">${x.type === 'income' ? '+' : '−'}${esc(fmtRM(x.amount))}</span></li>`).join('')}</ul>
    <div class="row2"><button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button><button class="btn" data-act="imp-go" ${txs.length ? '' : 'disabled'}>${esc(t('Import {0}', txs.length))}</button></div>`, { label: t('Import') });
}
/**
 * Save imported rows. Already here = same id (same file imported again), or the same purchase from another source
 * (a receipt and its statement line: same day, amount and type). Identical rows within one file are all kept.
 * `before(fresh)` runs first (photos) and returns ids to remove again on Undo.
 */
async function commitImport(txs, label, before = async () => [], newAccount = null) {
  const byId = new Set(S.tx.map(x => x.id));
  const sameBuy = x => S.tx.some(y => y.source !== x.source && y.date === x.date && y.amount === x.amount && y.type === x.type);
  const fresh = [], dups = [];
  for (const x of txs) (byId.has(x.id) || sameBuy(x) ? dups : fresh).push(x);
  const photoIds = await before(fresh);
  await saveTxs(fresh);
  if (newAccount && !fresh.length) await deleteAccount(newAccount).catch(() => {});
  if (!settings().onboarded) { await setSetting('onboarded', true); afterSetup(); }
  closeSheet(); go('home'); render();
  toast(t('Imported {0} from {1}', fresh.length, label) + (dups.length ? ` · ${t('{0} already here, skipped', dups.length)}` : ''), { undo: async () => { await deleteTxs(fresh.map(x => x.id)); await deletePhotos(photoIds); if (newAccount) await deleteAccount(newAccount).catch(() => {}); render(); } });
}
async function importMoneyManager(buf) {
  impErr(t('Reading the Money Manager backup…'));
  const { loadSqlJs, readMoneyManager } = await import('../mmimport.js');
  const mm = await readMoneyManager(buf, await loadSqlJs());
  IMP = { mm, buf };
  openSheet(`<h2 class="sh-title">${esc(t('Money Manager backup'))}</h2>
    <ul class="list"><li>${esc(t('{0} transactions', mm.tx.length))}</li><li>${esc(t('{0} accounts: {1}', mm.accounts.length, mm.accounts.map(a => a.name).join(', ')))}</li>
    <li>${esc(t('{0} of your categories kept as they are', mm.customCats.length))}</li>${mm.skipped ? `<li class="warn">${esc(t('{0} could not be read and will be skipped', mm.skipped))}</li>` : ''}
    ${mm.adjustments ? `<li>${esc(t('{0} balance corrections folded into opening balances (not counted as spending)', mm.adjustments))}</li>` : ''}
    ${mm.transfersSkipped ? `<li class="warn">${esc(t('{0} transfers between accounts were not imported', mm.transfersSkipped))}</li>` : ''}
    ${mm.otherCurrency.length ? `<li class="warn">${esc(t('Not in RM (amounts kept as they are): {0}', mm.otherCurrency.join(', ')))}</li>` : ''}</ul>
    ${mm.photos.length ? `<label class="check"><input type="checkbox" id="mm-photos" checked> ${esc(t('Also import {0} receipt photos (up to {1} MB on this phone)', mm.photos.length, Math.round(buf.byteLength / 1048576)))}</label>` : ''}
    <p class="fine">${esc(t('Balances will match what Money Manager shows today.'))}</p>
    <div class="row2"><button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button><button class="btn" data-act="mm-go">${esc(t('Import'))}</button></div>`, { label: t('Import') });
}

// ---- bank and e-wallet PDF statements ---------------------------------------------------------------------
async function importStatement(buf, password) {
  impErr(t('Reading the statement…'));
  const pdfjs = await import('../../vendor/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdf.worker.min.mjs', import.meta.url).href;
  let doc;
  try {
    // isEvalSupported false: the CVE-2024-4367 class of malicious-PDF script is never evaluated; no font loading.
    doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)), password, isEvalSupported: false, disableFontFace: true }).promise;
  } catch (e) {
    if (e?.name === 'PasswordException') return pdfPassword(buf, !!password);
    throw new Error(t('This PDF could not be opened. Download it again from your bank app.'));
  }
  const lines = [];
  for (let i = 1; i <= Math.min(doc.numPages, 80); i++) lines.push(...linesFromItems((await (await doc.getPage(i)).getTextContent()).items));
  const st = parseStatement(lines);
  if (!st.rows.length) return impErr(t('No transactions found in this PDF. If it is a scanned picture, download the statement again from your bank app, or its CSV.'));
  IMP = { st };
  const name = st.provider?.[1] || t('Bank statement');
  const existing = S.accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
  openSheet(`<h2 class="sh-title">${esc(name)}</h2>
    <p class="fine">${esc(t('{0} transactions', st.rows.length))} · ${esc(`${st.rows[0].date} → ${st.rows.at(-1).date}`)}</p>
    <p class="${st.reconciled ? 'okbox' : 'warnbox'}">${esc(st.reconciled ? t('Opening and closing balances check out: nothing is missing.') : t('The balances on this statement could not be checked. Look over the rows before importing.'))}</p>
    <label class="field"><span>${esc(t('Into account'))}</span><select id="st-acc">${existing ? '' : `<option value="new">${esc(t('New account: {0}', name))}</option>`}${S.accounts.map(a => `<option value="${esc(a.id)}"${existing?.id === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
    <ul class="list preview">${st.rows.slice(0, 6).map(r => `<li class="rowb"><span>${esc(r.date)}</span><span class="grow">${esc(r.desc)}</span><span class="amt ${r.amount > 0 ? 'income' : 'expense'}">${r.amount > 0 ? '+' : '−'}${esc(fmtRM(Math.abs(r.amount)))}</span></li>`).join('')}</ul>
    <div class="row2"><button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button><button class="btn" data-act="st-go">${esc(t('Import {0}', st.rows.length))}</button></div>`, { label: t('Import') });
}
function pdfPassword(buf, wrong) {
  IMP = { pdf: buf };
  openSheet(`<h2 class="sh-title">${esc(t('This statement is locked'))}</h2>
    <p class="sh-body">${esc(t('Banks usually lock statements with your IC number or date of birth. The password is only used on this phone.'))}</p>
    <label class="field"><span>${esc(t('PDF password'))}</span><input id="pdf-pw" type="password" autocomplete="off" autofocus></label>
    ${wrong ? `<p class="err">${esc(t('That password did not work. Try again.'))}</p>` : ''}
    <button class="btn wide" data-act="pdf-unlock">${esc(t('Unlock'))}</button>`, { label: t('PDF password') });
}
/** Re-encode a photo as JPEG (max 1200 px): smaller, and location data in the original is dropped. */
async function reencode(blob) {
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
    const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
  } catch { return null; }
}

// ---- restore -------------------------------------------------------------------------------------------------------------
async function restoreText(text, zip = {}) {
  let data;
  try { data = readBackup(text); } catch (e) { return impErr(t(e.message)); }
  const choice = S.tx.length || S.accounts.length ? await new Promise(res => {
    openSheet(`<h2 class="sh-title">${esc(t('Restore backup'))}</h2><p class="sh-body">${esc(t('The backup has {0} transactions. This phone has {1}.', data.tx.length, S.tx.length))}</p>
      <button class="btn wide" data-x="merge">${esc(t('Merge (keep both, recommended)'))}</button><button class="btn ghost danger wide" data-x="replace">${esc(t('Replace everything on this phone'))}</button><button class="btn ghost wide" data-x="no">${esc(t('Cancel'))}</button>`, { label: t('Restore backup'), onClose: () => res('no') })
      .addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) { res(b.dataset.x); closeSheet(); } });
  }) : 'replace';
  if (choice === 'no') return;
  const local = { accounts: S.accounts, tx: S.tx, recurring: S.recurring, kv: { budgets: S.kv.budgets, rules: S.kv.rules, customCats: S.kv.customCats } };
  if (choice === 'merge') await addAll(mergeBackup({ ...local, kv: { ...local.kv, dismissed: S.kv.dismissed } }, data)); else await replaceAll(data);
  await setSetting('onboarded', true);
  if (!settings().tourDone) await markSeen();   // a restored backup means someone who knows the app
  closeSheet(); go('home'); render();
  // Photos from a photo backup: only ones a restored transaction points at.
  const wanted = new Set(data.tx.map(x => x.receiptId).filter(Boolean));
  for (const [n, bytes] of Object.entries(zip)) { const id = n.slice(7, -4); if (n.startsWith('photos/') && wanted.has(id)) await savePhoto(id, new Blob([bytes], { type: 'image/jpeg' })); }
  toast(t('Restored {0} transactions', data.tx.length) + (data.dropped ? ` · ${t('{0} damaged entries skipped', data.dropped)}` : ''));
}

/** The backup, as JSON, or with photos as a zip holding the same JSON plus photos/<id>.jpg. */
async function backupBlob(withPhotos) {
  const { name, text } = backupFile();
  if (!withPhotos) return { name, blob: new Blob([text], { type: 'application/json' }) };
  const files = [{ name: BACKUP_JSON, data: new TextEncoder().encode(text) }];
  for (const id of new Set(S.tx.map(x => x.receiptId).filter(Boolean))) { const p = await getPhoto(id); if (p) files.push({ name: `photos/${id}.jpg`, data: new Uint8Array(await p.arrayBuffer()) }); }
  return { name: name.replace(/\.json$/, '.zip'), blob: zipStore(files) };
}
const photoCount = () => new Set(S.tx.map(x => x.receiptId).filter(Boolean)).size;
const backupFile = () => ({ name: `tally-backup-${today()}.json`, text: makeBackup({ accounts: S.accounts, tx: S.tx, recurring: S.recurring, kv: { budgets: S.kv.budgets, rules: S.kv.rules, customCats: S.kv.customCats } }) });
async function backedUp(msg) {
  await setKv('lastBackup', `${today()}T${nowTime()}`);
  closeSheet(); render(); toast(msg, { k: 'good', icon: 'check' });
}

// ---- actions ---------------------------------------------------------------------------------------------------------------
export const act = {
  feedback: () => openFeedback(APP_VERSION),
  tour: () => showTour(1),
  'whats-new': () => showWhatsNew(),
  install: async () => { if (await promptInstall()) render(); },
  'update-check': async b => {
    b.disabled = true;
    const r = await checkForUpdates().catch(() => 'unsupported');
    b.disabled = false;
    toast(r === 'latest' ? t('You have the latest version') : r === 'updating' ? t('Updating… Tally will reload in a moment') : t('Updates install by themselves when you open Tally online'));
  },
  'set-lang': async b => { await setSetting('lang', b.dataset.l); await setLang(b.dataset.l); render(); },
  'start-fresh': () => {
    openSheet(`<h2 class="sh-title">${esc(t('Your accounts'))}</h2><p class="sh-body">${esc(t('Where do you keep money? Enter what is in each today. You can add more later.'))}</p>
      <label class="field"><span>${esc(t('Cash in wallet (RM)'))}</span><input id="sf-cash" inputmode="decimal" placeholder="0.00" autofocus></label>
      <label class="field"><span>${esc(t('Bank account (RM)'))}</span><input id="sf-bank" inputmode="decimal" placeholder="0.00"></label>
      <div class="grid2 keep2"><label class="field"><span>${esc(t('E-wallet (RM), optional'))}</span><input id="sf-ewallet" inputmode="decimal" placeholder="${esc(t('leave empty to skip'))}"></label>
      <label class="field"><span>${esc(t('Its name'))}</span><input id="sf-ewname" maxlength="40" placeholder="Touch 'n Go"></label></div>
      <p class="err" id="sf-err" role="alert"></p><button class="btn wide" data-act="sf-go">${esc(t('Start'))}</button>`, { label: t('Your accounts') });
  },
  'sf-go': async b => {
    const vals = ['cash', 'bank', 'ewallet'].map(k => [k, $(`#sf-${k}`).value.trim()]);
    if (vals.some(([, v]) => v && parseAmount(v) == null)) return ($('#sf-err').textContent = t('Enter amounts like 150 or 150.50.'));
    b.disabled = true;
    const names = { cash: t('Cash'), bank: t('Bank'), ewallet: t('E-wallet') };
    let n = 0;
    names.ewallet = $('#sf-ewname').value.trim().slice(0, 40) || names.ewallet;
    for (const [k, v] of vals) if (k === 'cash' || v) await saveAccount({ id: uid('a'), name: names[k], kind: k, opening: parseAmount(v || '0'), createdAt: Date.now() + n++ });
    await setSetting('onboarded', true);
    closeSheet(); go('home');
    afterSetup();
  },
  'acc-edit': b => accountSheet(S.accounts.find(a => a.id === b.dataset.id) || {}),
  'acc-save': async b => {
    const name = $('#ac-name').value.trim(), opening = $('#ac-open').value.trim() ? parseAmount($('#ac-open').value) : 0;
    if (!name) return ($('#ac-err').textContent = t('Give the account a name.'));
    if (opening == null) return ($('#ac-err').textContent = t('Enter amounts like 150 or 150.50.'));
    const old = S.accounts.find(a => a.id === b.dataset.id);
    await saveAccount({ ...(old || { id: uid('a'), createdAt: Date.now() }), name, kind: $('#ac-kind').value, opening });
    closeSheet(); render(); toast(t('Saved'));
  },
  'acc-del': async b => {
    if (!(await confirmSheet({ title: t('Delete this account?'), ok: t('Delete'), danger: true }))) return;
    try { await deleteAccount(b.dataset.id); render(); toast(t('Deleted')); } catch { toast(t('This account has transactions. Move or delete them first.'), { k: 'warn' }); }
  },
  'cat-add': () => openSheet(`<h2 class="sh-title">${esc(t('Add a category'))}</h2><label class="field"><span>${esc(t('Name'))}</span><input id="cat-name" maxlength="40" autofocus></label>
    <label class="field"><span>${esc(t('Colour'))}</span><input id="cat-color" type="color" value="#0ea5e9"></label><button class="btn wide" data-act="cat-save">${esc(t('Save'))}</button>`, { label: t('Category') }),
  'cat-save': async () => { const n = $('#cat-name').value.trim(); if (!n) return; await addCategory(n, $('#cat-color').value); closeSheet(); render(); toast(t('Saved')); },
  'rule-del': async b => { const r = { ...S.kv.rules }; delete r[b.dataset.k]; await setKv('rules', r); render(); },
  'import-open': () => importSheet(),
  'imp-paste': () => { const v = $('#imp-paste').value; if (!v.trim()) return impErr(t('Paste some cells first.')); startMapping(parseCSV(v, v.includes('\t') ? '\t' : undefined), t('Pasted cells')); },
  'imp-link': async () => {
    const url = sheetCsvUrl($('#imp-link').value);
    if (!url) return impErr(t('That is not a Google Sheets link. It should start with https://docs.google.com/spreadsheets/d/'));
    impErr(t('Fetching…'));
    try {
      const res = await fetch(url, { credentials: 'omit', redirect: 'follow', signal: AbortSignal.timeout(20000) });
      const text = await res.text();
      if (text.length > LIMITS.fileBytes) throw new Error('big');
      if (!res.ok || /^\s*<!DOCTYPE html|<html/i.test(text)) throw new Error('private');
      await startMapping(parseCSV(text), t('Google Sheets'));
    } catch { impErr(t('Could not open that sheet. In Google Sheets, tap Share and set "Anyone with the link" to Viewer, or copy the cells and paste them instead.')); }
  },
  'imp-go': async b => {
    b.disabled = true;
    const { txs, opening } = impPlan(), m = IMP.map;
    if (IMP.accountId === 'new') await saveAccount({ id: IMP.newId, name: newAccName(), kind: m.debit != null || m.credit != null || m.balance != null ? 'bank' : 'cash', opening: opening ?? 0, createdAt: Date.now() });
    return commitImport(txs, IMP.name || t('file'), undefined, IMP.accountId === 'new' ? IMP.newId : null);
  },
  'mm-go': async b => {
    b.disabled = true;
    const { mm, buf } = IMP, withPhotos = $('#mm-photos')?.checked;
    for (const a of mm.accounts) if (!S.accounts.some(x => x.id === a.id)) await saveAccount(a);
    const have = new Set(S.kv.customCats.map(c => c.id));
    await setKv('customCats', [...S.kv.customCats, ...mm.customCats.filter(c => !have.has(c.id))]);
    await commitImport(mm.tx, 'Money Manager', async fresh => {
      if (!withPhotos) return [];
      const { readPhotos } = await import('../mmimport.js');
      const want = new Map(fresh.map(x => [x.id, x]));
      const todo = mm.photos.filter(p => want.has(p.txId)), ids = [];
      for (const [n, p] of todo.entries()) {
        if (n % 25 === 0) toast(t('Copying photos… {0} of {1}', n, todo.length));
        const bytes = (await readPhotos(buf, [p.path]))[p.path];
        const jpeg = bytes && await reencode(new Blob([bytes], { type: 'image/jpeg' }));
        if (!jpeg) continue;
        const id = uid('p'); await savePhoto(id, jpeg); ids.push(id);
        want.get(p.txId).receiptId = id;
      }
      return ids;
    });
  },
  'pdf-unlock': () => { const pw = $('#pdf-pw').value; if (pw) importStatement(IMP.pdf, pw).catch(e => impErr(e.message)); },
  'st-go': async b => {
    b.disabled = true;
    const { st } = IMP, sel = $('#st-acc').value;
    let accountId = sel;
    if (sel === 'new') {
      accountId = uid('a');
      const first = st.rows[0];
      await saveAccount({ id: accountId, name: st.provider?.[1] || t('Bank statement'), kind: isWallet(st.provider?.[0]) ? 'ewallet' : 'bank', opening: st.opening ?? (first.balance != null ? first.balance - first.amount : 0), createdAt: Date.now() });
    }
    await commitImport(importIds(statementToTx(st.rows, { accountId }), 's'), st.provider?.[1] || t('Bank statement'));
  },
  'restore-pick': () => {
    // No accept filter (Android hides .mmbackup and some .json files); importFile routes by content and size.
    const inp = Object.assign(document.createElement('input'), { type: 'file' });
    inp.addEventListener('change', () => { const f = inp.files[0]; if (f) importFile(f); });
    inp.click();
  },
  // Say what the file is and where it goes before anything opens (Round 1: people lost track of the file).
  'backup': () => {
    const { name, text } = backupFile(), canShare = !!navigator.canShare?.({ files: [new File([''], name, { type: 'application/json' })] });
    openSheet(`<h2 class="sh-title">${esc(t('Back up'))}</h2>
      <p class="sh-body">${esc(t('One file with all {0} transactions, your accounts, budgets and categories.', S.tx.length))}</p>
      <p class="filechip">${ICON.download}<span class="grow"><b>${esc(name)}</b><small>${esc(t('{0} KB', Math.max(1, Math.round(text.length / 1024))))}</small></span></p>
      ${photoCount() ? `<label class="check"><input type="checkbox" id="bk-photos"> ${esc(t('Include {0} receipt photos (a bigger .zip file)', photoCount()))}</label>` : ''}
      ${canShare ? `<button class="btn wide" data-act="bk-share">${esc(t('Send to myself (Google Drive, email, WhatsApp)'))}</button>` : ''}
      <button class="btn ${canShare ? 'ghost ' : ''}wide" data-act="bk-save">${esc(t('Save to this phone (Downloads)'))}</button>
      <p class="fine">${esc(t('To restore on a new phone: open Tally there, tap Restore a Tally backup, and pick this file.'))}</p>`, { label: t('Back up') });
  },
  'bk-share': async () => {
    const { name, blob } = await backupBlob($('#bk-photos')?.checked);
    try { if (!(await shareFile(name, blob, blob.type))) return act['bk-save'](); } catch (e) { if (e?.name === 'AbortError') return; throw e; } // closed the share sheet: nothing sent
    await backedUp(t('Sent {0}. Check it arrived before you rely on it.', name));
  },
  'bk-save': async b => {
    b.disabled = true;
    const { name, blob } = await backupBlob($('#bk-photos')?.checked);
    download(name, blob, blob.type);
    await backedUp(t('Saved {0} to your Downloads folder.', name));
  },
  'export-csv': () => download(`tally-${today()}.csv`, toCSV(S.tx, S.accounts, catName), 'text/csv'),
  'erase': async () => {
    if (!(await confirmSheet({ title: t('Erase everything?'), body: t('This deletes all accounts, transactions and photos on this phone. It cannot be undone. Back up first if you might want them.'), ok: t('Erase everything'), danger: true }))) return;
    await eraseAll(); go('welcome'); toast(t('Everything was erased.'));
  },
};
