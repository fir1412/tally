// Welcome (first run), Settings, and every way to bring data in or take it out.
import { S, settings, setSetting, setKv, saveAccount, deleteAccount, saveTxs, deleteTxs, addCategory, savePhoto, deletePhotos, getPhoto, replaceAll, addAll, eraseAll, uid, today, nowTime, expenseCats, hasJoint, jointIds, putAll, startDay, thisMonth, storage, persistStorage, setCatColor } from '../state.js';
import { t, setLang, getLang, LANGS, fmtDate, fmtMonth } from '../i18n.js';
import { esc, ICON, openSheet, closeSheet, confirmSheet, toast, $, haptic } from '../ui.js';
import { lockOn, lockSheet, lockOff } from '../lock.js';
import { fmtRM, parseAmount, balances, ACCOUNT_KINDS, CATEGORIES, INCOME_CATEGORIES, calcAmount, nextColor, fmtAcct, tooLarge } from '../engine.js';
import { fileToRows, guessMapping, headerRow, rowsToTx, openingFromBalance, mapCategory, parseCSV, sheetCsvUrl, toCSV, makeBackup, readBackup, mergeBackup, download, shareFile, cleanText, importIds, LIMITS, zipStore, unzip, BACKUP_JSON, makeJointShare, mergeJoint, readCapped, imageInfo, splitDups, pairTransfers, asTransfer, hash, cleanDesc, accountNames, isMoneyRow, rowCategory, reloadTransfers, typedShift } from '../io.js';
import { detectPreset } from '../presets.js';
import { parseStatement, statementToTx, linesFromItems, detectProvider, guessKind, PAGE_BREAK, isWallet } from '../statement.js';
import { render, go, APP_VERSION } from '../app.js';
import { openFeedback } from '../feedback.js';
import { dailyEvent, ics, googleUrl } from '../calendar.js';
import { showTour, showWhatsNew, afterSetup, markSeen, canInstall, promptInstall, checkForUpdates, newSince, iosBrowser } from '../tour.js';
import { settingsCard as learnCard, tickQuietly, gameOn, firstWord } from './learn.js';
import { demoCard } from './home.js';
import { pickColor, ACCENTS, onColor, applyLook, parseHex, colourName } from '../colorpicker.js';

const KIND = { cash: 'Cash', bank: 'Bank account', ewallet: 'E-wallet', card: 'Credit card', savings: 'Savings' };
const langButtons = () => `<div class="segs lang" role="group" aria-label="Language · Bahasa · 语言">${LANGS.map(([k, n]) => `<button class="seg${getLang() === k ? ' on' : ''}" data-act="set-lang" data-l="${k}" lang="${k === 'zh' ? 'zh-Hans' : k}" aria-pressed="${getLang() === k}">${esc(n)}</button>`).join('')}</div>`;

const SIZES = [100, 115, 130];
/** A / A+ / A++, the same sizes as Settings → Text size, drawn at the size they give. */
const sizeButtons = () => `<div class="segs sizes" role="group" aria-label="${esc(t('Text size'))}">${SIZES.map((n, i) => `<button class="seg${(settings().textSize || 100) === n ? ' on' : ''}" data-act="set-size" data-n="${n}" aria-pressed="${(settings().textSize || 100) === n}" aria-label="A${'+'.repeat(i)}, ${n}%" style="font-size:${n}%">A${'+'.repeat(i)}</button>`).join('')}</div>`;
const setSize = async n => { await setSetting('textSize', n); document.documentElement.style.fontSize = `${n}%`; };

// ---- Appearance & personal: few words, the controls show what they do ------------------------------------------------
const seg = (act, v, on, label, icon = '') => `<button class="seg${on ? ' on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${on}"${icon ? ` aria-label="${esc(label)}" title="${esc(label)}"` : ''}>${icon || esc(label)}</button>`;
const HOME_CARDS = () => [['gap', t('Missed days'), ICON.clock], ['nudge', t('Habit nudges'), ICON.clock], ['bills', t('Bills due'), ICON.bell], ['insight', t('Insights'), ICON.chart], ['learn', t('Learn Tally'), ICON.sparkles]];
function lookCard() {
  const s = settings(), theme = ['light', 'dark'].includes(s.theme) ? s.theme : 'system', acc = parseHex(s.accent) || ACCENTS[0], hide = s.homeHide || [];
  const themes = [['system', t('Same as phone'), ICON.phone], ['light', t('Light theme'), ICON.sun], ['dark', t('Dark theme'), ICON.moon]];
  const sw = (hex, label) => `<li><button class="sw" style="--c:${hex};--on:${onColor(hex)}" data-act="set-accent" data-v="${hex}" aria-pressed="${acc === hex}" aria-label="${esc(label)}" title="${esc(label)}">${acc === hex ? ICON.check : ''}</button></li>`;
  return `<section class="card" id="look"><h2>${esc(t('Appearance & personal'))}</h2>${langButtons()}
    <div class="lookrow"><span>${ICON.sun}${esc(t('Theme'))} · ${esc(themes.find(x => x[0] === theme)[1])}</span><div class="segs icons" role="group" aria-label="${esc(t('Theme'))}">${themes.map(([v, l, i]) => seg('set-theme', v, theme === v, l, i)).join('')}</div></div>
    <div class="lookrow"><span>${ICON.palette}${esc(t('Accent colour'))}</span><ul class="swatches">${sw(ACCENTS[0], `${colourName(ACCENTS[0])} (${t('Default')})`)}${ACCENTS.slice(1).map(h => sw(h, colourName(h))).join('')}${ACCENTS.includes(acc) ? '' : sw(acc, `${colourName(acc)} ${acc}`)}
      <li><button class="sw more" data-act="accent-custom" aria-label="${esc(t('Custom colour'))}" title="${esc(t('Custom colour'))}">${ICON.plus}</button></li></ul></div>
    <label class="field"><span>${esc(t('Text size'))}</span><select data-input="text-size">${[100, 115, 130].map(n => `<option value="${n}"${(s.textSize || 100) === n ? ' selected' : ''}>${n}%</option>`).join('')}</select></label>
    <label class="field"><span>${esc(t('Your name'))}</span><input data-input="my-name" maxlength="30" value="${esc(s.myName || '')}" placeholder="${esc(t('e.g. Aisyah'))}" autocomplete="given-name"></label>
    <div class="lookrow"><span>${esc(t('Start screen'))}</span><div class="segs">${seg('set-start', 'home', s.start !== 'activity', t('Home'))}${seg('set-start', 'activity', s.start === 'activity', t('Activity'))}</div></div>
    ${gameOn() ? `<div class="lookrow"><span>${esc(t('Week starts on'))}</span><div class="segs">${seg('set-week', 1, s.weekStart !== 0, t('Monday'))}${seg('set-week', 0, s.weekStart === 0, t('Sunday'))}</div></div>` : ''}
    <label class="toggle"><span class="grow"><b>${esc(t('Compact'))}</b></span><input type="checkbox" class="switch" role="switch" data-input="compact"${s.compact ? ' checked' : ''}></label>
    ${'vibrate' in navigator ? `<label class="toggle"><span class="grow"><b>${esc(t('Haptics'))}</b><small>${esc(t('A short tap when something is saved'))}</small></span><input type="checkbox" class="switch" role="switch" data-input="haptics"${s.haptics !== false ? ' checked' : ''}></label>` : ''}
    <details class="more-cats"><summary>${esc(t('Home cards'))}</summary>${HOME_CARDS().map(([k, l, i]) => `<label class="toggle"><span class="lic">${i}</span><span class="grow"><b>${esc(l)}</b></span><input type="checkbox" class="switch" role="switch" data-input="home-card" data-k="${k}"${(k === 'learn' ? !s.learnHidden : !hide.includes(k)) ? ' checked' : ''}></label>`).join('')}</details></section>`;
}
const pickAccent = async () => {
  const h = await pickColor({ value: parseHex(settings().accent) || ACCENTS[0], title: t('Accent colour'), reset: ACCENTS[0] });
  if (!h) return;
  await setSetting('accent', h === ACCENTS[0] ? null : h);
  render(); $('[data-act="accent-custom"]')?.focus();
};
/** Add a category: its name, and a colour from the picker (the sheet comes back with the name kept). */
const catAddSheet = (name = '', color = nextColor(S.kv.customCats.map(c => c.color))) => openSheet(`<h2 class="sh-title">${esc(t('Add a category'))}</h2><label class="field"><span>${esc(t('Name'))}</span><input id="cat-name" maxlength="40" value="${esc(name)}"${name ? '' : ' autofocus'}></label>
    <div class="lookrow"><span>${esc(t('Colour'))}</span><ul class="chips"><li><button class="chip dotbtn" id="cat-color" data-act="cat-add-color" data-v="${esc(color)}"${name ? ' autofocus' : ''}><span class="dot" style="background:${esc(color)}"></span><span class="num">${esc(color)}</span></button></li></ul></div>
    <button class="btn wide" data-act="cat-save">${esc(t('Save'))}</button>`, { label: t('Category') });


// ---- Welcome ----------------------------------------------------------------------------------------------------------
export const welcomeView = {
  title: 'Welcome',
  render() {
    return `<section class="welcome">
      <h1>Tally</h1>
      <p class="lede">${esc(t('Snap any receipt. See what you actually spent on, item by item.'))}</p>
      <ul class="promise" aria-label="${esc(t('Tally is'))}">${[t('Free'), t('No ads'), t('No sign-up'), t('Stays on your phone')].map(w => `<li>${ICON.check}${esc(w)}</li>`).join('')}</ul>
      ${demoCard()}
      <div class="langrow">${langButtons()}<div class="sizerow"><span class="fine">${esc(t('Text size'))}</span>${sizeButtons()}</div></div>
      <ul class="points">
        <li>${ICON.receipt}<span>${esc(t('Receipts are read on this phone and split into categories automatically.'))}</span></li>
        <li>${ICON.wallet}<span>${esc(t('No account, no ads. Your data never leaves this phone unless you export it.'))} <button class="link" data-act="storage-info">${esc(t('How your data is kept'))}</button></span></li>
        <li>${ICON.upload}<span>${esc(t('Already tracking in another app or a spreadsheet? Bring your history with you.'))}</span></li>
      </ul>
      <button class="btn wide" data-act="start-fresh">${esc(t('Start fresh'))}</button>
      <button class="btn ghost wide" data-act="import-open">${esc(t('Bring my data (Money Manager, Money Lover, Spendee, Wallet, YNAB, Excel…)'))}</button>
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
  const isNew = !a.id, now = isNew ? null : balances([a], S.tx, today()).by[a.id];
  openSheet(`<h2 class="sh-title">${esc(isNew ? t('Add an account') : t('Edit account'))}</h2>
    <label class="field"><span>${esc(t('Name'))}</span><input id="ac-name" maxlength="60" value="${esc(a.name || '')}" placeholder="${esc(t('e.g. Maybank, Cash, Touch \'n Go'))}"${isNew ? ' autofocus' : ''}></label>
    ${isNew ? '' : `<label class="field"><span>${esc(t('Balance today (RM)'))}</span><input id="ac-now" inputmode="decimal" data-now="${now}" value="${(now / 100).toFixed(2)}" autofocus><small>${esc(t('Type what your bank or wallet app shows. Tally moves the starting balance to match, so nothing counts as spending.'))}</small></label>`}
    <label class="field"><span>${esc(t('Type'))}</span><select id="ac-kind">${ACCOUNT_KINDS.map(k => `<option value="${k}"${(a.kind || 'bank') === k ? ' selected' : ''}>${esc(t(KIND[k]))}</option>`).join('')}</select></label>
    ${isNew ? '' : `<details class="more"><summary>${esc(t('More'))}</summary>`}<label class="field"><span>${esc(t('Balance when you started (RM)'))}</span><input id="ac-open" inputmode="decimal" value="${a.opening != null ? (a.opening / 100).toFixed(2) : ''}" placeholder="0.00"><small>${esc(t('For a credit card, enter what you owe as a negative number, e.g. -350.'))}</small></label>${isNew ? '' : '</details>'}
    <label class="field"><span>${esc(t('Whose money'))}</span><select id="ac-scope"><option value="personal">${esc(t('Mine (personal)'))}</option><option value="joint"${a.scope === 'joint' ? ' selected' : ''}>${esc(t('Joint (shared with my partner)'))}</option></select></label>
    <p class="err" id="ac-err" role="alert"></p>
    <div class="row2">${isNew ? `<button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button>` : `<button class="btn ghost danger" data-act="acc-del" data-id="${esc(a.id)}">${esc(t('Delete'))}</button>`}<button class="btn" data-act="acc-save" data-id="${esc(a.id || '')}">${esc(t('Save'))}</button></div>`, { label: t('Account') });
}

/** "Bank account · RM 1,200.00", without repeating a type the name already says ("Cash · Cash"). */
function accSub(a, by) {
  const kind = t(KIND[a.kind] || 'Bank account');
  const n = a.name.trim().toLowerCase(), k = kind.toLowerCase();
  return [a.scope === 'joint' && t('Joint'), !(k.startsWith(n) || n.startsWith(k)) && kind, fmtAcct(a, by[a.id] || 0)].filter(Boolean).join(' · ');
}
// ---- Settings -----------------------------------------------------------------------------------------------------------
const catName = id => t(([...expenseCats(), ...INCOME_CATEGORIES].find(c => c.id === id) || CATEGORIES.at(-1)).name);
async function dailyReminder() {
  const at = $('#remind-at')?.value || '21:00';
  await setSetting('remindAt', at);
  return dailyEvent({ at, title: t("Tally: add today's spending"), details: `${t('A minute is enough: snap the receipts or type what you spent.')} ${location.origin}${location.pathname}` });
}
export const settingsView = {
  title: 'Settings',
  async after() {   // the reader card says so when the reader is already on this phone
    const { ocrReady, ocrSaved } = await import('../scan.js');
    if (!(ocrReady() || await ocrSaved()) || !$('#reader-state')) return;
    $('#reader-state').textContent = t('The receipt reader is ready on this phone and works offline.');
    $('#reader [data-act="reader-get"]')?.remove(); $('#reader-dl')?.remove();
  },
  render() {
    const rules = Object.entries(S.kv.rules), bal = balances(S.accounts, S.tx, today()).by;
    const last = S.kv.lastBackup;
    return `<header class="top"><button class="icon-btn" data-act="back" data-to="home" aria-label="${esc(t('Back'))}">${ICON.back}</button><h1>${esc(t('Settings'))}</h1><span></span></header>
      ${lookCard()}
      ${learnCard()}
      <section class="card"><h2>${esc(t('Budget month'))}</h2>
        <label class="field"><span>${esc(t('My month starts on day'))}</span><select data-input="month-start">${Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}"${startDay() === i + 1 ? ' selected' : ''}>${i + 1}</option>`).join('')}</select></label>
        <p class="fine">${esc(t('Paid on the 25th? Start your month on payday. Home, Budgets and Insights follow it.'))} ${esc(t('This month: {0}', fmtMonth(thisMonth(), startDay())))}</p></section>
      <section class="card"><h2>${esc(t('Accounts'))}</h2><ul class="list">${S.accounts.map(a => `<li><button class="txrow" data-act="acc-edit" data-id="${esc(a.id)}"><span class="grow"><b>${esc(a.name)}</b><small>${esc(accSub(a, bal))}</small></span><span class="fine">${esc(t('Edit'))}</span></button></li>`).join('')}</ul>
        <button class="btn ghost wide" data-act="acc-edit">${ICON.plus}${esc(t('Add an account'))}</button></section>
      <section class="card" id="joint"><h2>${esc(t('Joint account'))}</h2>
        <p class="fine">${esc(hasJoint() ? t('Send your joint accounts to your partner as a file. They import it in Tally, and their changes come back the same way.') : t('In a couple? Mark an account as Joint (tap it above) to keep shared money apart from your own and share it with your partner.'))}</p>
        ${hasJoint() ? `<button class="btn ghost wide" data-act="joint-share">${ICON.download}${esc(t('Share joint accounts'))}</button>` : ''}
        <button class="btn ghost wide" data-act="restore-pick">${ICON.upload}${esc(t('Import from my partner'))}</button></section>
      <section class="card" id="remind"><h2>${esc(t('Daily reminder'))}</h2><p class="fine">${esc(t("Your calendar reminds you to add the day's spending, even with Tally closed."))}</p>
        <label class="field"><span>${esc(t('Remind me at'))}</span><input id="remind-at" type="time" value="${esc(settings().remindAt || '21:00')}"></label>
        <div class="row2"><button class="btn" data-act="remind-google">${ICON.calendar}${esc(t('Google Calendar'))}</button><button class="btn ghost" data-act="remind-ics">${ICON.download}${esc(t('Other calendar'))}</button></div></section>
      <section class="card" id="reader"><h2>${esc(t('Receipt reader'))}</h2><p class="fine" id="reader-state">${esc(t('The reader (about 40 MB) downloads the first time you scan. Get it now on Wi-Fi so scanning works offline straight away.'))}</p>
        <div class="dl" id="reader-dl" hidden><progress id="ocr-prog" max="100" value="0" aria-label="${esc(t('Downloading the receipt reader'))}"></progress><span id="ocr-pct" class="fine num"></span></div>
        <button class="btn ghost wide" data-act="reader-get">${ICON.download}${esc(t('Download the receipt reader now'))}</button></section>
      <section class="card" id="backup"><h2>${esc(t('Backup'))}</h2>
        <p class="fine">${esc(last ? t('Last backup: {0}', last.slice(0, 10)) : t('Not backed up yet'))} · ${esc(t('Tally keeps everything on this phone. Save a backup file to Google Drive or email it to yourself.'))}</p>
        <div class="row2"><button class="btn" data-act="backup">${ICON.download}${esc(t('Back up now'))}</button><button class="btn ghost" data-act="restore-pick">${esc(t('Restore'))}</button></div>
        <p class="warnbox">${ICON.alert}<span>${esc(t('Uninstalling Tally or clearing its site data deletes everything on this phone. Back up first.'))} <button class="link" data-act="storage-info">${esc(t('How your data is kept'))}</button></span></p>
        ${storage.persisted == null ? '' : `<p class="fine">${esc(storage.persisted ? t('Storage: protected. The browser will not clear Tally to free up space.') : t('Storage: not protected. The browser may clear Tally if the phone runs out of space, so keep a backup.'))}</p>`}</section>
      <section class="card"><h2>${esc(t('Bring data in'))}</h2><p class="fine">${esc(t('From Money Manager, Money Lover, Spendee, Wallet, Monefy, YNAB, Cashew, Bluecoins, 1Money, Toshl or AndroMoney, Excel, CSV, a bank statement, or Google Sheets.'))}</p>
        <button class="btn ghost wide" data-act="import-open">${ICON.upload}${esc(t('Import'))}</button>
        <button class="btn ghost wide" data-act="export-csv">${ICON.download}${esc(t('Export to Excel (CSV)'))}</button></section>
      <section class="card"><h2>${esc(t('Categories'))}</h2><ul class="chips">${expenseCats().map(c => `<li><button class="chip dotbtn" data-act="cat-color" data-c="${esc(c.id)}" aria-label="${esc(t('Colour: {0}', t(c.name)))}"><span class="dot" style="background:${esc(c.color)}"></span>${esc(t(c.name))}</button></li>`).join('')}</ul>
        <button class="btn ghost wide" data-act="cat-add">${ICON.plus}${esc(t('Add a category'))}</button>
        <details><summary>${esc(t('What Tally remembers ({0})', rules.length))}</summary><p class="fine">${esc(t('When you change an item\'s category, Tally files that item the same way next time.'))}</p>
          <ul class="list">${rules.slice(0, 200).map(([k, v]) => `<li class="rowb"><span class="grow">${esc(k.replace(/^SHOP /, `${t('Shop')}: `))} → ${esc(catName(v))}</span><button class="icon-btn" data-act="rule-del" data-k="${esc(k)}" aria-label="${esc(t('Forget'))}">${ICON.x}</button></li>`).join('')}</ul></details></section>
      <section class="card"><h2>${esc(t('Privacy'))}</h2><p class="fine">${esc(t('No account, no ads, no tracking. Receipts are read on this phone. The only things Tally downloads are its own files; a Google Sheets link is fetched only when you paste one.'))}</p>
        <div class="rowb">${ICON.lock}<span class="grow"><b>${esc(t('Lock Tally'))}</b><small>${esc(lockOn() ? (settings().lock.cred ? t('On: PIN, fingerprint or face') : t('On: PIN')) : t('Off'))}</small></span>
          <button class="btn small ghost" data-act="lock-set">${esc(lockOn() ? t('Change PIN') : t('Turn on'))}</button>${lockOn() ? `<button class="btn small ghost" data-act="lock-off">${esc(t('Turn off'))}</button>` : ''}</div>
        <p class="fine">${esc(t('A privacy lock for people who pick up your phone. Your data is not encrypted.'))}</p>
        <button class="btn ghost danger wide" data-act="erase">${ICON.trash}${esc(t('Erase everything on this phone'))}</button>
        <p class="legal"><a class="link" href="privacy${getLang() === 'en' ? '' : '.' + getLang()}.html" target="_blank" rel="noopener">${esc(t('Privacy policy'))}</a><a class="link" href="terms.html" target="_blank" rel="noopener">${esc(t('Terms of use'))}</a></p></section>
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
  'text-size': el => setSize(+el.value),
  'month-start': async el => { await setSetting('monthStart', Math.min(28, Math.max(1, +el.value || 1))); render(); },
  'imp-map': el => { if (el.value === '') delete IMP.map[el.dataset.k]; else IMP.map[el.dataset.k] = +el.value; showMapping(); },
  'imp-acc': el => { IMP.accountId = el.value; showMapping(); },
  'imp-accname': el => { IMP.accName = el.value; },
  'imp-joint': el => { IMP.joint = el.checked; },
  'my-name': el => setSetting('myName', cleanText(el.value, 30)),
  compact: async el => { await setSetting('compact', el.checked); applyLook(settings()); },
  haptics: async el => { await setSetting('haptics', el.checked); haptic(); },
  'home-card': async el => {
    const k = el.dataset.k;
    if (k === 'learn') return setSetting('learnHidden', !el.checked);
    const hide = new Set(settings().homeHide || []);
    if (el.checked) hide.delete(k); else hide.add(k);
    await setSetting('homeHide', [...hide]);
  },
  'imp-future': el => { IMP.skipFuture = el.checked; showMapping(); },
  'imp-cat': el => { IMP.catMap[el.dataset.src] = el.value; },
};

// ---- import: files, paste, Google Sheets link, Money Manager ------------------------------------------------------------
let IMP = null; // {rows, header, map, accountId, catMap, name} or {mm, buf}
function importSheet() {
  openSheet(`<h2 class="sh-title">${esc(t('Bring data in'))}</h2>
    <label class="btn wide filebtn">${ICON.upload}${esc(t('Choose a file'))}<input type="file" id="imp-file" hidden></label>
    <p class="fine">${esc(t("Can't see your file here? Open your phone's file manager, long-press the file and Share it to Tally. Or move it to another folder once, then it shows up here."))}</p>
    <p class="fine">${esc(t('Exports and backups from Money Manager (Innim or Realbyte), Money Lover, Spendee, Wallet, Monefy, YNAB, Cashew, Bluecoins, 1Money, Toshl or AndroMoney; Excel (.xlsx) or CSV from your bank; or a Tally backup.'))}</p>
    <details class="howto"><summary>${esc(t('How to export from your money app'))}</summary><ul class="newlist">${howTo().map(([a, s]) => `<li><b>${esc(a)}:</b> ${esc(s)}</li>`).join('')}</ul></details>
    <h3>${esc(t('From Google Sheets'))}</h3>
    <label class="field"><span>${esc(t('Paste the cells (select all in the sheet, copy, paste here)'))}</span><textarea id="imp-paste" rows="4" placeholder="Date	Amount	Category	Note"></textarea></label>
    <button class="btn ghost wide" data-act="imp-paste">${esc(t('Use pasted cells'))}</button>
    <label class="field"><span>${esc(t('Or paste the sheet link (sharing must be "Anyone with the link")'))}</span><input id="imp-link" inputmode="url" placeholder="https://docs.google.com/spreadsheets/d/…"></label>
    <button class="btn ghost wide" data-act="imp-link">${esc(t('Fetch from Google Sheets'))}</button>
    <p class="err" id="imp-err" role="alert"></p>`, { label: t('Import') });
  $('#imp-file').addEventListener('change', e => { const f = e.target.files[0]; if (f) importFile(f); });
}
/** Where each app keeps its export (presets.js reads them with no column matching). Menu names as the apps' help pages
 *  give them; ponytail: check a path when an app redesigns its settings. */
const howTo = () => [
  ['Money Manager (Realbyte)', t('More → Backup → Export data to Excel, or Backup data for a .mmbak file.')],
  ['Money Manager (Innim)', t('Settings → Backup → create a backup (.mmbackup).')],
  ['Money Lover', t('Settings → Export to CSV or Excel, with all wallets.')],
  ['Spendee', t('Settings → Export (CSV). One file per wallet; transfers between them are matched.')],
  ['Wallet by BudgetBakers', t('Settings → Export → all data, CSV.')],
  ['Monefy', t('Settings → Export to file (CSV).')],
  ['YNAB', t('Budget menu → Export budget; unzip it and pick the Register file.')],
  ['Cashew', t('Settings → Import and export → Export CSV.')],
  ['Bluecoins', t('Settings → Export to CSV.')],
  ['1Money', t('Settings → Export to CSV.')],
  ['Toshl', t('On toshl.com: Export → CSV.')],
  ['AndroMoney', t('Settings → Export → CSV (Excel), all accounts.')],
];
const newAccName = () => cleanText(IMP?.accName || '', 40) || (IMP?.sheet ? t('Google Sheet') : '') || cleanText(String(IMP?.name || '').replace(/\.[a-z0-9]{2,5}$/i, ''), 40) || t('Imported');
const impAccount = () => (IMP.accountId === 'new' ? IMP.newId : IMP.accountId);
const newKind = () => IMP.kind || (IMP.map.debit != null || IMP.map.credit != null || IMP.map.balance != null ? 'bank' : 'cash');
/** What's wrong with a typed amount: over RM 100 million, or not an amount. */
const amtErr = v => (tooLarge(v) ? t('That amount is too large (RM 100 million at most).') : t('Enter amounts like 150 or 150.50.'));
const impErr = m => { const el = $('#imp-err'); if (el) el.textContent = m; else toast(m, { k: 'bad' }); };
async function ensureAccount() {
  if (!S.accounts.length) await saveAccount({ id: uid('a'), name: t('Cash'), kind: 'cash', opening: 0, createdAt: Date.now() });
}
/** An account the user already has for this bank or wallet ("Maybank MAE" for Maybank), same kind when known. */
const norm = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const findAccount = (name, kind) => {
  const n = norm(name), ok = a => !kind || a.kind === kind;
  return n ? S.accounts.find(a => ok(a) && norm(a.name) === n) || S.accounts.find(a => ok(a) && (norm(a.name).startsWith(n) || n.startsWith(norm(a.name)))) : null;
};
export async function importFile(f) {
  if (!$('#imp-err')) importSheet();   // shared from another app: show the import sheet for messages
  let kind = 'file';
  try {
    if (f.size > LIMITS.backupBytes) return impErr(t('That file is too big (over 200 MB).'));
    impErr(t('Reading {0} ({1} MB)…', f.name || t('file'), Math.max(0.1, Math.round(f.size / 104857.6) / 10)));
    const buf = await f.arrayBuffer();
    const head = new Uint8Array(buf.slice(0, 64));
    const zipAt = head.findIndex((x, i) => x === 0x50 && head[i + 1] === 0x4b && head[i + 2] === 3 && head[i + 3] === 4);
    // Money Manager backups: .mmbackup, or any zip (maybe renamed by a download) holding MyFinance.db
    if (!/\.mmbak$/i.test(f.name) && (/\.mmbackup$/i.test(f.name) || (zipAt > 0 && zipAt < 64))) { kind = 'Money Manager'; return await importMoneyManager(buf); }
    if (/\.json$/i.test(f.name) || new Uint8Array(buf.slice(0, 1))[0] === 0x7b) return await restoreText(jsonText(buf));
    // Money Manager by Realbyte (.mmbak): SQLite, bare or zipped
    if (/\.mmbak$/i.test(f.name) || new TextDecoder().decode(head.slice(0, 15)) === 'SQLite format 3') { kind = 'Money Manager'; return await importMoneyManager(buf, 'realbyte'); }
    if (zipAt === 0) {
      const names = [];
      const z = await unzip(buf, n => (names.push(n), n === BACKUP_JSON || /^photos\/[\w-]{1,60}\.jpg$/.test(n))).catch(() => ({}));
      if (z[BACKUP_JSON]) return await restoreText(jsonText(z[BACKUP_JSON]), z);
      if (names.length && !names.some(n => n.startsWith('xl/'))) { kind = 'Money Manager'; return await importMoneyManager(buf, 'realbyte'); }   // a renamed .mmbak
    }
    if (new TextDecoder().decode(buf.slice(0, 5)) === '%PDF-') return await importStatement(buf);
    startMapping(await fileToRows(f.name, buf), f.name);
  } catch (e) { console.error(e); impErr(kind === 'Money Manager' ? t('This looks like a Money Manager backup, but it could not be read: {0}', t(e.message)) : t(e.message)); }
}
/** `sheet`: pasted cells or a Google Sheets link. Its new account is named "Google Sheet" (or by its Account column),
 *  and the next paste goes into the account the last one used. */
async function startMapping(rows, name, { sheet = false } = {}) {
  const h = headerRow(rows);
  if (rows.length < h + 2) return impErr(t('That file has no rows to import. Check you picked the right sheet.'));
  const header = rows[h].map(x => cleanText(x, 40)), sig = hash(header.join('|').toLowerCase());
  // The bank or wallet from the file name and the title rows above the header, never from the transactions:
  // a Touch 'n Go export says "Reload via Maybank" on every reload.
  const prov = detectProvider([String(name || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_.-]+/g, ' '), ...rows.slice(0, h).map(r => r.join(' '))]);
  const kind = prov?.[2] || (header.some(x => /wallet|dompet/i.test(x)) ? 'ewallet' : null);
  // The columns and categories chosen the last time a file with this header came in.
  // Another money app's export: its columns, transfers and categories are known (presets.js).
  const preset = detectPreset(header, name);
  const saved = settings().importMaps?.[sig], okMap = saved?.map && (saved.preset || null) === (preset?.id || null) && Object.values(saved.map).every(i => Number.isInteger(i) && i >= 0 && i < header.length);
  const have = new Set([...expenseCats(), ...INCOME_CATEGORIES].map(c => c.id));
  const catMap = Object.fromEntries(Object.entries(saved?.catMap || {}).filter(([, v]) => have.has(v)));
  const sourceKey = hash(JSON.stringify([name, rows])), remembered = settings().importSources?.[sourceKey];
  const existing = S.accounts.find(a => a.id === remembered) || (sheet && S.accounts.find(a => a.id === settings().sheetAccount)) || (prov && findAccount(prov[1], kind));
  // Another app's history or a bank's statement is its own account by default (Round 2: imports landed in Cash).
  IMP = { rows: rows.slice(h + 1), header, sig, sourceKey, map: okMap ? { ...saved.map } : preset ? { ...preset.map } : guessMapping(header), preset, accountId: existing?.id || 'new', newId: uid('a'), accName: prov?.[1] || (sheet ? t('Google Sheet') : ''), kind, catMap, accIds: {}, name, sheet, skipFuture: true, tabs: rows.tabs };
  showMapping();
}
/** Their categories, each with its Tally category: chosen, remembered, matched by name, or a new one named after it. */
function catChoices() {
  const { rows, map } = IMP, out = {};
  if (map.category == null) return out;
  const ctx = { preset: IMP.preset, header: IMP.header };
  for (const s of new Set(rows.filter(r => isMoneyRow(r, map, ctx)).map(r => cleanText(rowCategory(r, map, ctx), 60)).filter(Boolean))) {
    if (Object.keys(out).length >= 60) break;
    const guess = IMP.preset?.cats?.[s.toLowerCase()] || mapCategory(s, {}, '', S.kv.customCats);
    out[s] = IMP.catMap[s] || (guess === 'other' && !/^(other|others|misc|lain|lain-lain|lain2|其他|其它)$/i.test(s) ? `new:${s}` : guess);
  }
  return out;
}
/** An Account column ("Paid by": Cash / TNG / Card): one account per value, an existing one when the name matches. */
function accPlan() {
  const { rows, map } = IMP, values = [], lookup = {}, { names, blanks } = accountNames(rows, map, { preset: IMP.preset, header: IMP.header });
  for (const v of names) {
    if (values.length >= 20) break;
    const kind = guessKind(v), a = findAccount(v, kind);
    const id = a?.id || (IMP.accIds[v.toLowerCase()] ||= uid('a'));
    values.push({ v, id, kind, isNew: !a });
    lookup[v.toLowerCase()] = id;
  }
  return { values, lookup, blanks };
}
/** The rows as they will be imported, with the sheet's choices applied, what is already here, and a new account's opening balance. */
function impPlan() {
  const acc = accPlan();
  const { txs: all, skipped, loose, adjustments, opening: adjusted } = rowsToTx(IMP.rows, IMP.map, { accountId: impAccount(), accounts: acc.lookup, catMap: catChoices(), customCats: S.kv.customCats, preset: IMP.preset, header: IMP.header });
  const tdy = today(), later = all.filter(x => x.date > tdy), future = later.length, txs = IMP.skipFuture ? all.filter(x => x.date <= tdy) : all;
  // Day and month may be swapped only if every such date could be read the other way round, and there are several.
  const swapped = future >= 3 && later.every(x => +x.date.slice(8, 10) <= 12);
  const names = Object.fromEntries([...S.accounts.map(a => [a.id, a.name]), [IMP.newId, newAccName()], ...acc.values.map(a => [a.id, a.v])]);
  return { txs, ...splitDups(S.tx, txs, names), skipped, future, swapped, acc, loose, adjustments, adjusted, opening: IMP.accountId === 'new' && IMP.map.account == null ? openingFromBalance(IMP.rows, IMP.map, all, tdy) : null };
}
function showMapping() {
  const { header, map, rows } = IMP;
  const col = (k, label) => `<label class="field"><span>${esc(label)}</span><select data-input="imp-map" data-k="${k}"><option value="">${esc(t('(none)'))}</option>${header.map((h, i) => `<option value="${i}"${map[k] === i ? ' selected' : ''}>${esc(h || t('Column {0}', i + 1))}</option>`).join('')}</select></label>`;
  const { fresh, dups, skipped, future, swapped, opening, acc, loose, adjustments } = impPlan(), moved = fresh.filter(x => x.type === 'transfer').length;
  const reloads = planMoves(fresh, [...S.accounts, { id: IMP.newId, kind: newKind() }, ...acc.values], '').reloads.length, kept = Object.keys(typedShift(S.accounts, S.tx, fresh)).length;
  // What the import will add, before it's added: dates, money in and out, and dates that can't be right yet.
  const dates = fresh.map(x => x.date).sort(), sum = k => fresh.filter(x => x.type === k).reduce((s, x) => s + x.amount, 0);
  const choices = catChoices(), cats = [...expenseCats(), ...INCOME_CATEGORIES], tabs = IMP.tabs;
  const intoAcc = `<label class="field"><span>${esc(map.account != null ? t('Rows without an account go into') : t('Into account'))}</span><select data-input="imp-acc">${S.accounts.map(a => `<option value="${esc(a.id)}"${IMP.accountId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}<option value="new"${IMP.accountId === 'new' ? ' selected' : ''}>${esc(t('A new account'))}</option></select></label>
    ${IMP.accountId === 'new' ? `<label class="field"><span>${esc(t('Name of the new account'))}</span><input data-input="imp-accname" maxlength="40" value="${esc(newAccName())}"></label>
      <label class="check"><input type="checkbox" data-input="imp-joint"${IMP.joint ? ' checked' : ''}> ${esc(t('Joint (shared with my partner)'))}</label>
      ${opening != null ? `<p class="fine">${esc(t('Opening balance {0}, worked out from the Balance column so the account matches your statement.', fmtRM(opening)))}</p>` : ''}` : ''}`;
  openSheet(`<h2 class="sh-title">${esc(t('Match the columns'))}</h2><p class="fine">${esc(IMP.name || '')} · ${esc(rows.length === 1 ? t('1 row') : t('{0} rows', rows.length))}</p>
    ${IMP.preset ? `<p class="okbox">${esc(t('Recognised: {0} export. Columns, accounts, transfers and categories are matched for you; change anything that looks wrong.', IMP.preset.name))}</p>` : ''}
    ${tabs?.read.length > 1 ? `<p class="fine">${esc(t('Tabs read: {0}', tabs.read.join(', ')))}</p>` : ''}
    ${tabs?.skipped.length ? `<p class="warnbox">${ICON.alert}<span class="grow">${esc(t('Tabs not imported: {0}', tabs.skipped.map(s => `${s.name} (${s.why === 'rows' ? t('too many rows') : t('no date or amount column')})`).join(', ')))}</span></p>` : ''}
    <div class="grid2">${col('date', t('Date'))}${col('amount', t('Amount'))}${col('debit', t('Money out (debit)'))}${col('credit', t('Money in (credit)'))}${col('type', t('Income or expense'))}${col('category', t('Category'))}${col('merchant', t('Shop / payee'))}${col('note', t('Note'))}${col('balance', t('Balance'))}${col('account', t('Account'))}</div>
    ${acc.values.length ? `<p class="fine">${esc(t('Accounts from this column: {0}', acc.values.map(a => (a.isNew ? t('{0} (new)', a.v) : a.v)).join(', ')))}</p>` : ''}
    ${map.account == null || acc.blanks ? intoAcc : ''}
    ${Object.keys(choices).length ? `<details open><summary>${esc(t('Their categories → Tally categories'))}</summary><div class="grid2">${Object.entries(choices).map(([s, v]) => `<label class="field"><span>${esc(s)}</span><select data-input="imp-cat" data-src="${esc(s)}">${cats.map(c => `<option value="${esc(c.id)}"${v === c.id ? ' selected' : ''}>${esc(t(c.name))}</option>`).join('')}<option value="${esc(`new:${s}`)}"${v === `new:${s}` ? ' selected' : ''}>${esc(t('New category: {0}', s))}</option></select></label>`).join('')}</div></details>` : ''}
    ${fresh.length || !dups.length ? `<p class="${fresh.length ? 'okbox' : 'warnbox'}">${esc(t('{0} ready to import', fresh.length))}${dups.length ? ` · ${esc(t('{0} already in Tally, will be skipped', dups.length))}` : ''}${skipped.length ? ` · ${esc(skipped.length === 1 ? t('1 row skipped (no date or amount)') : t('{0} rows skipped (no date or amount)', skipped.length))}` : ''}</p>`
      : `<p class="warnbox">${esc(t('All {0} rows are already in Tally. Nothing new to import.', dups.length))}</p>`}
    ${fresh.length ? `<p class="fine">${esc(t('{0} to {1}', fmtDate(dates[0]), fmtDate(dates.at(-1))))} · ${esc(t('{0} spent', fmtRM(sum('expense'))))} · ${esc(t('{0} received', fmtRM(sum('income'))))}</p>` : ''}
    ${moved || loose || adjustments ? `<p class="fine">${[moved && (moved === 1 ? t('1 transfer between your accounts') : t('{0} transfers between your accounts', moved)), loose && (loose === 1 ? t("1 transfer to another wallet: import that wallet's file next and it will be matched.") : t("{0} transfers to another wallet: import that wallet's file next and they'll be matched.", loose)), adjustments && t('{0} balance corrections folded into opening balances (not counted as spending)', adjustments)].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
    ${reloads ? `<p class="fine">${esc(t('{0} wallet reloads with no bank line: counted as money moved from your bank, not as income.', reloads))}</p>` : ''}
    ${kept ? `<p class="okbox">${esc(t('Balances stay as you set them today: rows from before an account was added are already in its starting balance.'))}</p>` : ''}
    ${future ? `<div class="warnbox">${ICON.alert}<span class="grow">${esc(swapped ? t('{0} rows are dated after today. If that looks wrong, check the date column: day and month may be swapped.', future) : future === 1 ? t('1 row is dated after today (a scheduled or future entry).') : t('{0} rows are dated after today (scheduled or future entries).', future))}
      <label class="check"><input type="checkbox" data-input="imp-future"${IMP.skipFuture ? ' checked' : ''}> ${esc(t('Leave them out'))}</label></span></div>` : ''}
    <ul class="list preview">${fresh.slice(0, 5).map(x => `<li class="rowb"><span>${esc(fmtDate(x.date))}</span><span class="grow">${esc(x.merchant || '')}</span><span class="amt ${x.type}">${x.type === 'income' ? '+' : x.type === 'transfer' ? '' : '−'}${esc(fmtRM(x.amount))}</span></li>`).join('')}</ul>
    <div class="row2"><button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button><button class="btn" data-act="imp-go" ${fresh.length ? '' : 'disabled'}>${esc(t('Import {0}', fresh.length))}</button></div>`, { label: t('Import') });
}
/**
 * What an import moves between the user's own accounts: a reload that shows up as money out of the bank and money into
 * the wallet becomes one transfer (pairTransfers), also when the other side came in earlier; a wallet reload with no
 * bank line becomes a transfer from the bank its text names, else from `otherId` (a bank not in Tally): never income.
 */
function planMoves(fresh, accounts, otherId) {
  const pairs = pairTransfers([...S.tx, ...fresh], fresh), paired = new Set(pairs.flat().map(x => x.id));
  return { pairs, paired, reloads: reloadTransfers(fresh.filter(x => !paired.has(x.id)), accounts, otherId) };
}
/**
 * Save imported rows, minus those already here (splitDups), with their transfers (planMoves). An account whose
 * starting balance the user typed keeps today's balance when older rows come in (typedShift).
 * Undo takes everything back: the rows, the transfers (restoring what they replaced), photos, new accounts, openings.
 * `before(fresh)` runs first (photos) and returns photo ids to remove again on Undo. → the ids of the accounts it touched.
 */
async function commitImport(txs, label, { before = async () => [], accounts = [], kv = {}, newAccounts = [], undoMore = async () => {}, tourLater = false } = {}) {
  const { fresh, dups } = splitDups(S.tx, txs, Object.fromEntries([...S.accounts, ...accounts].map(a => [a.id, a.name])));
  const photoIds = await before(fresh);
  const other = S.accounts.find(a => a.outside) || { id: uid('a'), name: t('Other bank'), kind: 'bank', opening: 0, outside: true, createdAt: Date.now() };
  const { pairs, paired, reloads } = planMoves(fresh, [...S.accounts, ...accounts], other.id), moved = new Set(reloads.map(x => x.id));
  if (reloads.some(x => x.accountId === other.id) && !S.accounts.includes(other)) { accounts = [...accounts, other]; newAccounts = [...newAccounts, other.id]; }
  const replaced = S.tx.filter(x => paired.has(x.id)), save = [...fresh.filter(x => !paired.has(x.id) && !moved.has(x.id)), ...pairs.map(asTransfer), ...reloads];
  const kept = new Set(save.map(x => x.id)), gone = replaced.filter(x => !kept.has(x.id)).map(x => x.id);
  const used = new Set(save.flatMap(x => [x.accountId, x.toAccountId]).filter(Boolean));
  const stagedAccounts = accounts.filter(a => !newAccounts.includes(a.id) || used.has(a.id));
  const was = new Set(replaced.map(x => x.id)), shift = typedShift(S.accounts, S.tx, save.filter(x => !was.has(x.id))), shifted = S.accounts.filter(a => shift[a.id]);
  for (const a of shifted) { const i = stagedAccounts.findIndex(x => x.id === a.id), base = i >= 0 ? stagedAccounts[i] : a, next = { ...base, opening: (base.opening || 0) + shift[a.id], updatedAt: Date.now() }; if (i >= 0) stagedAccounts[i] = next; else stagedAccounts.push(next); }
  const first = !settings().onboarded;
  const stagedKv = { ...kv, ...(first ? { settings: { ...(kv.settings || settings()), onboarded: true } } : {}) };
  try { await putAll({ accounts: stagedAccounts, tx: save, del: { tx: gone }, kv: stagedKv }); }
  catch (e) { await deletePhotos(photoIds); throw e; }
  if (first && !tourLater) afterSetup();
  closeSheet(); go('home'); render();
  toast(t('Imported {0} from {1}', fresh.length, label) + (dups.length ? ` · ${t('{0} already here, skipped', dups.length)}` : '') + (pairs.length ? ` · ${t('{0} top-ups counted as transfers between your accounts', pairs.length)}` : '')
    + (reloads.length ? ` · ${t('{0} wallet reloads with no bank line: counted as money moved from your bank, not as income.', reloads.length)}` : ''), { undo: async () => {
    await putAll({ accounts: shifted, tx: replaced, del: { tx: save.map(x => x.id), accounts: newAccounts.filter(id => !S.tx.some(x => !kept.has(x.id) && (x.accountId === id || x.toAccountId === id))) } });
    await deletePhotos(photoIds);
    await undoMore(); render();
  } });
  return [...used].filter(id => id !== other.id);
}
/** After an import that said nothing about balances: what each account it touched (new or already here) holds today,
 *  prefilled with Tally's figure. Saving moves each starting balance to match, so nothing counts as spending. */
function balanceTodaySheet(ids, onClose) {
  const accs = ids.map(id => S.accounts.find(a => a.id === id)).filter(a => a && !a.outside);
  if (!accs.length) return onClose?.();
  const now = balances(accs, S.tx, today()).by;
  openSheet(`<h2 class="sh-title">${esc(t('What is in these accounts today?'))}</h2><p class="sh-body">${esc(t('The file has no balances. Type what your bank or wallet app shows today; Tally moves the starting balance to match, so nothing counts as spending.'))}</p>
    ${accs.map(a => `<label class="field"><span>${esc(a.name)} · ${esc(t('Balance today (RM)'))}</span><input inputmode="decimal" data-bt="${esc(a.id)}" data-now="${now[a.id] ?? 0}" value="${((now[a.id] ?? 0) / 100).toFixed(2)}"></label>`).join('')}
    <p class="err" id="bt-err" role="alert"></p>
    <div class="row2"><button class="btn ghost" data-act="sheet-close">${esc(t('Skip'))}</button><button class="btn" data-act="bt-save">${esc(t('Save'))}</button></div>`, { label: t('Balance today (RM)'), onClose });
}
/** Money Manager backups: Innim (.mmbackup) or, with app 'realbyte', Realbyte (.mmbak). An Innim-looking zip without
 *  MyFinance.db gets a second try as Realbyte. */
async function importMoneyManager(buf, app) {
  impErr(t('Reading the Money Manager backup…'));
  const { loadSqlJs, readMoneyManager, readRealbyte } = await import('../mmimport.js');
  const SQL = await loadSqlJs();
  const mm = app === 'realbyte' ? await readRealbyte(buf, SQL) : await readMoneyManager(buf, SQL).catch(e => (/MyFinance.db is missing/.test(e.message) ? readRealbyte(buf, SQL) : Promise.reject(e)));
  IMP = { mm, buf };
  openSheet(`<h2 class="sh-title">${esc(mm.app === 'realbyte' ? t('Money Manager (Realbyte) backup') : t('Money Manager backup'))}</h2>
    <ul class="list"><li>${esc(t('{0} transactions', mm.tx.length))}</li><li>${esc(t('{0} accounts: {1}', mm.accounts.length, mm.accounts.map(a => a.name).join(', ')))}</li>
    <li>${esc(t('{0} of your categories kept as they are', mm.customCats.length))}</li>${mm.skipped ? `<li class="warn">${esc(t('{0} could not be read and will be skipped', mm.skipped))}</li>` : ''}
    ${mm.adjustments ? `<li>${esc(t('{0} balance corrections folded into opening balances (not counted as spending)', mm.adjustments))}</li>` : ''}
    ${mm.transfers ? `<li>${esc(t('{0} transfers between your accounts', mm.transfers))}</li>` : ''}
    ${mm.transfersSkipped ? `<li class="warn">${esc(t('{0} transfers between accounts were not imported', mm.transfersSkipped))}</li>` : ''}
    ${mm.otherCurrency.length ? `<li class="warn">${esc(t('Not in RM: {0}. Kept in their own currency and left out of your RM total.', mm.otherCurrency.join(', ')))}</li>` : ''}</ul>
    ${mm.photos.length ? `<label class="check"><input type="checkbox" id="mm-photos" checked> ${esc(mm.photos.length === 1 ? t('Also import 1 receipt photo (up to {0} MB on this phone)', Math.round(buf.byteLength / 1048576)) : t('Also import {0} receipt photos (up to {1} MB on this phone)', mm.photos.length, Math.round(buf.byteLength / 1048576)))}</label>` : ''}
    <p class="fine">${esc(t('Balances will match what Money Manager shows today.'))}</p>
    <div class="row2"><button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button><button class="btn" data-act="mm-go">${esc(t('Import'))}</button></div>`, { label: t('Import') });
}

// ---- bank and e-wallet PDF statements ---------------------------------------------------------------------
async function importStatement(buf, password) {
  if (buf.byteLength > LIMITS.fileBytes) return impErr(t('This file is over 25 MB. Split it or export a shorter date range.'));
  impErr(t('Reading the statement…'));
  const pdfjs = await import('../../vendor/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdf.worker.min.mjs', import.meta.url).href;
  let doc;
  try {
    // isEvalSupported false: the CVE-2024-4367 class of malicious-PDF script is never evaluated; no font loading;
    // images over 16 megapixels are never decoded (only the text is read).
    doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)), password, isEvalSupported: false, disableFontFace: true, maxImageSize: 4096 * 4096 }).promise;
  } catch (e) {
    if (e?.name === 'PasswordException') return pdfPassword(buf, !!password);
    throw new Error(t('This PDF could not be opened. Download it again from your bank app.'));
  }
  const lines = [];
  for (let i = 1; i <= Math.min(doc.numPages, 80); i++) lines.push(...(i > 1 ? [PAGE_BREAK] : []), ...linesFromItems((await (await doc.getPage(i)).getTextContent()).items));
  const st = parseStatement(lines);
  if (!st.rows.length) return impErr(t('No transactions found in this PDF. If it is a scanned picture, download the statement again from your bank app, or its CSV.'));
  const sourceKey = hash(JSON.stringify(st.rows));
  IMP = { st, sourceKey };
  const name = st.provider?.[1] || t('Bank statement');
  const existing = S.accounts.find(a => a.id === settings().importSources?.[sourceKey]) || (st.provider && findAccount(name, st.provider[2]));
  const reloads = st.provider?.[2] === 'ewallet' ? planMoves(statementToTx(st.rows, { accountId: '_w' }), [{ id: '_w', kind: 'ewallet' }, ...S.accounts], '').reloads.length : 0;
  openSheet(`<h2 class="sh-title">${esc(name)}</h2>
    <p class="fine">${esc(t('{0} transactions', st.rows.length))} · ${esc(`${st.rows[0].date} → ${st.rows.at(-1).date}`)}</p>
    <p class="${st.reconciled ? 'okbox' : 'warnbox'}">${esc(st.reconciled ? t('Opening and closing balances check out: nothing is missing.') : t('The balances on this statement could not be checked. Look over the rows before importing.'))}</p>
    ${reloads ? `<p class="fine">${esc(t('{0} wallet reloads with no bank line: counted as money moved from your bank, not as income.', reloads))}</p>` : ''}
    <label class="field"><span>${esc(t('Into account'))}</span><select id="st-acc">${existing ? '' : `<option value="new">${esc(t('New account: {0}', name))}</option>`}${S.accounts.map(a => `<option value="${esc(a.id)}"${existing?.id === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
    <ul class="list preview">${st.rows.slice(0, 6).map(r => `<li class="rowb"><span>${esc(r.date)}</span><span class="grow">${esc(cleanDesc(r.desc))}</span><span class="amt ${r.amount > 0 ? 'income' : 'expense'}">${r.amount > 0 ? '+' : '−'}${esc(fmtRM(Math.abs(r.amount)))}</span></li>`).join('')}</ul>
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
/** Re-encode a photo as JPEG (max 1200 px): smaller, and location data in the original is dropped. Only a JPEG or PNG
 *  within 40 MB and 50 megapixels is decoded, so a crafted image can't exhaust memory; anything else → null. */
/** A backup's JSON bytes as text, refused before decoding when too big. */
function jsonText(bytes) {
  if (bytes.byteLength > LIMITS.backupJson) throw new Error(t('This backup is too big to restore (over 50 MB).'));
  return new TextDecoder().decode(bytes);
}
async function reencode(blob) {
  try {
    const info = blob.size <= LIMITS.photoBytes && imageInfo(new Uint8Array(await blob.slice(0, 1 << 20).arrayBuffer()));
    if (!info || info.w * info.h > LIMITS.pixels) return null;
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
  if (data.joint) return importJoint(data, zip);
  const choice = S.tx.length || S.accounts.length ? await new Promise(res => {
    openSheet(`<h2 class="sh-title">${esc(t('Restore backup'))}</h2><p class="sh-body">${esc(t('The backup has {0} transactions. This phone has {1}.', data.tx.length, S.tx.length))}</p>
      <button class="btn wide" data-x="merge">${esc(t('Merge (keep both, recommended)'))}</button><button class="btn ghost danger wide" data-x="replace">${esc(t('Replace everything on this phone'))}</button><button class="btn ghost wide" data-x="no">${esc(t('Cancel'))}</button>`, { label: t('Restore backup'), onClose: () => res('no') })
      .addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) { res(b.dataset.x); closeSheet(); } });
  }) : 'replace';
  if (choice === 'no') return;
  const local = { accounts: S.accounts, tx: S.tx, recurring: S.recurring, kv: { budgets: S.kv.budgets, rules: S.kv.rules, customCats: S.kv.customCats } };
  if (choice === 'merge') await addAll(mergeBackup({ ...local, kv: { ...local.kv, dismissed: S.kv.dismissed } }, data)); else await replaceAll(data);
  await setSetting('onboarded', true);
  await setKv('lastBackup', `${today()}T${nowTime()}`);   // restored from a backup file: that file is a backup
  if (!settings().tourDone) await markSeen();   // a restored backup means someone who knows the app
  await tickQuietly();   // Learn Tally: what the restored data shows is done
  persistStorage();
  closeSheet(); go('home'); render();
  // Photos from a photo backup: only ones a restored transaction points at.
  const wanted = new Set(data.tx.map(x => x.receiptId).filter(Boolean));
  // Re-encoded like any photo from outside: a crafted file in the zip is dropped, not stored.
  const todo = Object.entries(zip).filter(([n]) => n.startsWith('photos/') && wanted.has(n.slice(7, -4)));
  for (const [i, [n, bytes]] of todo.entries()) {
    if (i % 25 === 0 && todo.length > 25) toast(t('Copying photos… {0} of {1}', i, todo.length));
    const jpeg = await reencode(new Blob([bytes]));
    if (jpeg) await savePhoto(n.slice(7, -4), jpeg);
  }
  toast(t('Restored {0} transactions', data.tx.length) + (data.dropped ? ` · ${t('{0} damaged entries skipped', data.dropped)}` : ''));
}

/** The backup, as JSON, or with photos as a zip holding the same JSON plus photos/<id>.jpg. */
async function backupBlob(withPhotos, { name, text } = backupFile(), txs = S.tx) {
  if (!withPhotos) return { name, blob: new Blob([text], { type: 'application/json' }), missing: 0 };
  const files = [{ name: BACKUP_JSON, data: new TextEncoder().encode(text) }];
  let missing = 0;
  for (const id of new Set(txs.map(x => x.receiptId).filter(Boolean))) { const p = await getPhoto(id); if (p) files.push({ name: `photos/${id}.jpg`, data: new Uint8Array(await p.arrayBuffer()) }); else missing++; }
  return { name: name.replace(/\.json$/, '.zip'), blob: zipStore(files), missing };
}
const warnMissingPhotos = n => { if (n) toast(t('{0} receipt photos could not be included in this backup.', n), { k: 'warn' }); };
const photoCount = () => new Set(S.tx.map(x => x.receiptId).filter(Boolean)).size;
const backupFile = () => ({ name: `tally-backup-${today()}.json`, text: makeBackup({ accounts: S.accounts, tx: S.tx, recurring: S.recurring, kv: { budgets: S.kv.budgets, rules: S.kv.rules, customCats: S.kv.customCats, shopNames: S.kv.shopNames || {}, catColors: S.kv.catColors } }) });
// ---- joint accounts: a file for the spouse, and theirs merged in -----------------------------------------------------
const jointTx = () => { const j = jointIds(); return S.tx.filter(x => j.has(x.accountId) || j.has(x.toAccountId)); };
const jointFile = () => ({ name: `tally-joint-${today()}.json`, text: makeJointShare({ accounts: S.accounts, tx: S.tx, kv: S.kv, recurring: S.recurring }, settings().myName || '') });
async function importJoint(data, zip = {}) {
  const m = mergeJoint({ accounts: S.accounts, tx: S.tx, kv: S.kv, recurring: S.recurring }, data), from = data.by || t('your partner');
  const body = [t('New or changed entries: {0}. Deleted: {1}. Newer edits win; your personal accounts are not touched.', m.tx.length, m.drop.length),
    m.budgetsJoint ? t('Joint budgets are updated.') : '', m.recurring.length ? t('Joint bills: {0}.', m.recurring.length) : '',
    ...m.empty.map(a => t('Your empty joint account "{0}" is replaced by theirs.', a.name))].filter(Boolean).join(' ');
  if (!(await confirmSheet({ title: t('Joint accounts from {0}', from), body, ok: t('Add') }))) return;
  await putAll({ accounts: m.accounts, tx: m.tx, recurring: m.recurring, del: { tx: m.drop, accounts: m.empty.map(a => a.id) }, kv: {
    jointGone: m.gone,
    ...(m.customCats.length ? { customCats: [...S.kv.customCats, ...m.customCats] } : {}),
    ...(m.budgetsJoint ? { budgets: { ...S.kv.budgets, joint: m.budgetsJoint } } : {}),
  } });
  await setSetting('onboarded', true);
  if (!settings().tourDone) await markSeen();
  closeSheet(); go('home'); render();
  const wanted = new Set(m.tx.map(x => x.receiptId).filter(Boolean));
  for (const [n, bytes] of Object.entries(zip)) { const id = n.slice(7, -4); if (n.startsWith('photos/') && wanted.has(id)) { const jpeg = await reencode(new Blob([bytes])); if (jpeg) await savePhoto(id, jpeg); } }   // same size and pixel limits as a backup
  toast(t('{0} joint entries added or updated from {1}', m.tx.length, from), { k: 'good', icon: 'check' });
}
async function backedUp(msg) {
  const first = !S.kv.lastBackup;
  await setKv('lastBackup', `${today()}T${nowTime()}`);
  const w = first && firstWord('backup');
  closeSheet(); render(); toast(w || msg, { k: 'good', icon: 'check', cheer: !!w });
}

// ---- actions ---------------------------------------------------------------------------------------------------------------
export const act = {
  'reader-get': async b => {
    b.disabled = true; $('#reader-dl').hidden = false;
    const { loadOcr } = await import('../scan.js');
    await import('./review.js');   // its progress listener fills the bar
    try { await loadOcr(); } catch (e) {
      $('#reader-dl').hidden = true; b.disabled = false;
      return toast(e?.message ? t(e.message) : t('The receipt reader could not be downloaded. Check the connection and try again.'), { k: 'bad' });
    }
    $('#reader-dl').hidden = true; b.remove(); $('#reader-state').textContent = t('The receipt reader is ready on this phone and works offline.');
    toast(t('The receipt reader is ready on this phone and works offline.'), { k: 'good', icon: 'check' });
  },
  // A daily reminder from the phone's own calendar: no server, works with the app closed.
  'remind-google': async () => { const ev = await dailyReminder(); window.open(googleUrl(ev), '_blank', 'noopener'); },
  'remind-ics': async () => { download('tally-daily-reminder.ics', ics([await dailyReminder()]), 'text/calendar'); toast(t('Open the file to add the reminder to your calendar.'), { k: 'good', icon: 'check' }); },
  feedback: () => openFeedback(APP_VERSION),
  'lock-set': () => lockSheet(render),
  'lock-off': async () => { if (await confirmSheet({ title: t('Turn off the lock?'), body: t('Anyone with your phone will be able to open Tally.'), ok: t('Turn off') })) { await lockOff(); render(); } },
  tour: () => showTour(1),
  'whats-new': () => showWhatsNew(),
  install: async () => { if (await promptInstall()) render(); },
  'update-check': async b => {
    b.disabled = true;
    const r = await checkForUpdates().catch(() => 'unsupported');
    b.disabled = false;
    toast(r === 'latest' ? t('You have the latest version') : r === 'updating' ? t('Updating… Tally will reload in a moment') : t('Updates install by themselves when you open Tally online'));
  },
  'set-size': async b => { await setSize(+b.dataset.n); render(); },
  'set-lang': async b => { await setSetting('lang', b.dataset.l); await setLang(b.dataset.l); render(); },
  'start-fresh': () => {
    openSheet(`<h2 class="sh-title">${esc(t('Your accounts'))}</h2><p class="sh-body">${esc(t('Where do you keep money? Enter what is in each today. You can add more later.'))}</p>
      <label class="field"><span>${esc(t('Cash in wallet (RM)'))}</span><input id="sf-cash" inputmode="decimal" placeholder="0.00" autofocus></label>
      <label class="field"><span>${esc(t('Bank account (RM)'))}</span><input id="sf-bank" inputmode="decimal" placeholder="0.00"></label>
      <div class="grid2 keep2"><label class="field"><span>${esc(t('E-wallet (RM), optional'))}</span><input id="sf-ewallet" inputmode="decimal" placeholder="${esc(t('leave empty to skip'))}"></label>
      <label class="field"><span>${esc(t('Its name'))}</span><input id="sf-ewname" maxlength="40" placeholder="Touch 'n Go"></label></div>
      <label class="field"><span>${esc(t('Joint account with your partner (RM), optional'))}</span><input id="sf-joint" inputmode="decimal" placeholder="${esc(t('leave empty to skip'))}"></label>
      <p class="err" id="sf-err" role="alert"></p><button class="btn wide" data-act="sf-go">${esc(t('Start'))}</button>`, { label: t('Your accounts') });
  },
  'sf-go': async b => {
    const vals = ['cash', 'bank', 'ewallet', 'joint'].map(k => [k, $(`#sf-${k}`).value.trim()]);
    const bad = vals.find(([, v]) => v && calcAmount(v) == null);
    if (bad) return ($('#sf-err').textContent = amtErr(bad[1]));
    b.disabled = true;
    const names = { cash: t('Cash'), bank: t('Bank'), ewallet: t('E-wallet'), joint: t('Joint account') };
    let n = 0;
    names.ewallet = $('#sf-ewname').value.trim().slice(0, 40) || names.ewallet;
    for (const [k, v] of vals) if (k === 'cash' || v) await saveAccount({ id: uid('a'), name: names[k], kind: k === 'joint' ? 'bank' : k, scope: k === 'joint' ? 'joint' : 'personal', opening: calcAmount(v || '0'), typed: true, createdAt: Date.now() + n++ });
    await setSetting('onboarded', true);
    closeSheet(); go('home');
    afterSetup();
  },
  'bt-save': async () => {
    const rows = [...document.querySelectorAll('.sheet [data-bt]')].filter(el => el.value.trim()).map(el => [el, calcAmount(el.value)]);
    const bad = rows.find(([, v]) => v == null);
    if (bad) return ($('#bt-err').textContent = amtErr(bad[0].value));
    for (const [el, v] of rows) { const a = S.accounts.find(x => x.id === el.dataset.bt); if (a) await saveAccount({ ...a, opening: (a.opening || 0) + v - +el.dataset.now, typed: true }); }
    closeSheet(); render(); if (rows.length) toast(t('Saved'));
  },
  'acc-edit': b => accountSheet(S.accounts.find(a => a.id === b.dataset.id) || {}),
  'acc-save': async b => {
    const name = $('#ac-name').value.trim(), nowEl = $('#ac-now');
    let opening = $('#ac-open').value.trim() ? calcAmount($('#ac-open').value) : 0;
    // A new balance for today moves the starting balance by the difference (like Money Manager's corrections on import).
    const target = nowEl?.value.trim() ? calcAmount(nowEl.value) : null, was = nowEl ? +nowEl.dataset.now : null;
    if (nowEl && nowEl.value.trim() && target == null) return ($('#ac-err').textContent = amtErr(nowEl.value));
    if (target != null && target !== was) opening = (S.accounts.find(a => a.id === b.dataset.id)?.opening || 0) + target - was;
    if (!name) return ($('#ac-err').textContent = t('Give the account a name.'));
    if (opening == null) return ($('#ac-err').textContent = amtErr($('#ac-open').value));
    const old = S.accounts.find(a => a.id === b.dataset.id), kind = $('#ac-kind').value, scope = $('#ac-scope').value === 'joint' ? 'joint' : 'personal';
    // A big gap is usually a salary or spending not added yet: moving the starting balance would hide it from Insights.
    const diff = target != null ? target - was : 0;
    if (Math.abs(diff) >= 50000 && await confirmSheet({
      title: diff > 0 ? t('{0} more than Tally has', fmtRM(diff)) : t('{0} less than Tally has', fmtRM(-diff)),
      body: diff > 0 ? t('Money in not added yet, like a salary? Add it as money in today, or only change the starting balance.') : t('Spending not added yet? Add it as money out today, or only change the starting balance.'),
      ok: diff > 0 ? t('Add as money in') : t('Add as money out'), no: t('Only change the balance') })) {
      opening = old.opening || 0;
      await saveTxs([{ id: uid('t'), date: today(), time: nowTime(), type: diff > 0 ? 'income' : 'expense', amount: Math.abs(diff), accountId: old.id, category: diff > 0 ? 'income' : 'other', merchant: t('Balance update'), note: '', source: 'quick', createdAt: Date.now() }]);
    }
    await saveAccount({ ...(old || { id: uid('a'), createdAt: Date.now(), typed: true }), ...(target != null ? { typed: true } : {}), name, kind, opening, scope });
    closeSheet(); render(); toast(t('Saved'));
  },
  'acc-del': async b => {
    if (!(await confirmSheet({ title: t('Delete this account?'), ok: t('Delete'), danger: true }))) return;
    try { await deleteAccount(b.dataset.id); render(); toast(t('Deleted')); } catch { toast(t('This account has transactions. Move or delete them first.'), { k: 'warn' }); }
  },
  'cat-add': () => catAddSheet(),
  'cat-add-color': async b => { const name = $('#cat-name').value; catAddSheet(name, (await pickColor({ value: b.dataset.v })) || b.dataset.v); },
  'cat-save': async () => { const n = $('#cat-name').value.trim(); if (!n) return; await addCategory(n, $('#cat-color').dataset.v); closeSheet(); render(); toast(t('Saved')); },
  'cat-color': async b => {
    const c = expenseCats().find(x => x.id === b.dataset.c); if (!c) return;
    const base = [...CATEGORIES, ...S.kv.customCats].find(x => x.id === c.id)?.color;
    const h = await pickColor({ value: c.color, title: t(c.name), reset: base });
    if (!h) return;
    await setCatColor(c.id, h === base ? null : h);
    render(); $(`[data-act="cat-color"][data-c="${CSS.escape(c.id)}"]`)?.focus();
  },
  'set-theme': async b => { await setSetting('theme', b.dataset.v === 'system' ? null : b.dataset.v); render(); $(`[data-act="set-theme"][data-v="${b.dataset.v}"]`)?.focus(); },
  'set-accent': async b => { await setSetting('accent', b.dataset.v === ACCENTS[0] ? null : parseHex(b.dataset.v)); render(); $(`[data-act="set-accent"][data-v="${b.dataset.v}"]`)?.focus(); },
  'accent-custom': () => pickAccent(),
  'set-start': async b => { await setSetting('start', b.dataset.v === 'activity' ? 'activity' : null); render(); },
  'set-week': async b => { await setSetting('weekStart', +b.dataset.v === 0 ? 0 : 1); render(); },
  'rule-del': async b => { const r = { ...S.kv.rules }; delete r[b.dataset.k]; await setKv('rules', r); render(); },
  'import-open': () => importSheet(),
  'imp-paste': () => { const v = $('#imp-paste').value; if (!v.trim()) return impErr(t('Paste some cells first.')); startMapping(parseCSV(v, v.includes('\t') ? '\t' : undefined), t('Pasted cells'), { sheet: true }); },
  'imp-link': async () => {
    const url = sheetCsvUrl($('#imp-link').value);
    if (!url) return impErr(t('That is not a Google Sheets link. It should start with https://docs.google.com/spreadsheets/d/'));
    impErr(t('Fetching…'));
    try {
      const res = await fetch(url, { credentials: 'omit', redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error('private');
      const text = new TextDecoder().decode(await readCapped(res, LIMITS.fileBytes));   // 25 MB: Content-Length, then while streaming
      if (/^\s*<!DOCTYPE html|<html/i.test(text)) throw new Error('private');
      await startMapping(parseCSV(text), t('Google Sheets'), { sheet: true });
    } catch { impErr(t('Could not open that sheet. In Google Sheets, tap Share and set "Anyone with the link" to Viewer, or copy the cells and paste them instead.')); }
  },
  'imp-go': async b => {
    b.disabled = true;
    const { txs, fresh, dups, opening, acc, adjusted } = impPlan(), m = IMP.map, made = [], staged = [], now = Date.now();
    if (!fresh.length) { b.disabled = false; return impErr(t('All rows are already in Tally. Nothing new to import.')); }
    if (IMP.accountId === 'new' && fresh.some(x => x.accountId === IMP.newId)) {
      staged.push({ id: IMP.newId, name: newAccName(), kind: newKind(), opening: opening ?? adjusted[''] ?? 0, scope: IMP.joint ? 'joint' : 'personal', createdAt: now });
      made.push(IMP.newId);
    }
    for (const [n, a] of acc.values.entries()) if (a.isNew && fresh.some(x => x.accountId === a.id || x.toAccountId === a.id)) {
      staged.push({ id: a.id, name: a.v, kind: a.kind, opening: adjusted[a.v.toLowerCase()] || 0, createdAt: now + n + 1 }); made.push(a.id);
    }
    // An adjustment has no transaction row. Remember its source so a repeated file cannot move the balance twice.
    const adjustmentKey = IMP.sourceKey;
    const seenAdjustments = settings().importAdjustments || [], bumped = [];
    const bump = (id, d) => { const a = S.accounts.find(x => x.id === id); if (!a || !d) return; if (!bumped.some(x => x.id === id)) bumped.push(a); const i = staged.findIndex(x => x.id === id), prior = i >= 0 ? staged[i] : a; const next = { ...prior, opening: (prior.opening || 0) + d, updatedAt: now }; if (i >= 0) staged[i] = next; else staged.push(next); };
    // Mostly already here (the same ledger from another format): its corrections are already in those openings too.
    if (!seenAdjustments.includes(adjustmentKey) && dups.length <= fresh.length) {
      if (IMP.accountId !== 'new') bump(IMP.accountId, adjusted['']);
      for (const a of acc.values) if (!a.isNew) bump(a.id, adjusted[a.v.toLowerCase()]);
    }
    // "New category: Parents" becomes a real category when a row uses it; the choices are remembered for this header.
    const choices = catChoices(), newCats = [];
    for (const [src, v] of Object.entries(choices)) {
      if (!v.startsWith('new:') || !fresh.some(x => x.category === v)) continue;
      const c = [...S.kv.customCats, ...newCats].find(x => norm(x.name) === norm(v.slice(4))) || { id: uid('c_'), name: v.slice(4), color: '#64748B' };
      if (!S.kv.customCats.some(x => x.id === c.id)) newCats.push(c);
      for (const x of txs) if (x.category === v) x.category = c.id;
      choices[src] = c.id;
    }
    const maps = Object.entries({ ...settings().importMaps, [IMP.sig]: { map: m, ...(IMP.preset ? { preset: IMP.preset.id } : {}), catMap: Object.fromEntries(Object.entries(choices).filter(([, v]) => !v.startsWith('new:'))) } }).slice(-30);
    const sourceKey = IMP.sourceKey, importedAccount = IMP.accountId === 'new' ? IMP.newId : IMP.accountId;
    const nextSettings = { ...settings(), importMaps: Object.fromEntries(maps), importSources: Object.fromEntries(Object.entries({ ...settings().importSources, [IMP.sourceKey]: importedAccount }).slice(-100)), ...(bumped.length ? { importAdjustments: [...seenAdjustments, adjustmentKey].slice(-100) } : {}), ...(IMP.sheet ? { sheetAccount: importedAccount } : {}) };
    // No Balance column: every account the file touched, new or already here, is asked what it holds today (unless
    // the file's own starting balance or corrections said so).
    const known = id => (id === IMP.newId ? opening ?? adjusted[''] : id === IMP.accountId ? adjusted[''] : adjusted[acc.values.find(a => a.id === id)?.v.toLowerCase()]) != null;
    const blind = m.balance == null, first = !settings().onboarded;   // the tour waits until the balances are in
    const touched = await commitImport(txs, IMP.preset?.name || IMP.name || t('file'), { accounts: staged, kv: { settings: nextSettings, ...(newCats.length ? { customCats: [...S.kv.customCats, ...newCats] } : {}) }, newAccounts: made, tourLater: blind, undoMore: async () => {
      for (const a of bumped) await saveAccount(a);
      if (newCats.length) await setKv('customCats', S.kv.customCats.filter(c => !newCats.some(n => n.id === c.id) || S.tx.some(x => x.category === c.id)));
      const sources = { ...settings().importSources }; if (sources[sourceKey] === importedAccount) delete sources[sourceKey];
      await setKv('settings', { ...settings(), importSources: sources, importAdjustments: (settings().importAdjustments || []).filter(k => k !== adjustmentKey) });
    } });
    if (blind) setTimeout(() => balanceTodaySheet(touched.filter(id => !known(id)), first ? afterSetup : undefined), 300);   // after the move to Home settles (like the tour)
  },
  'mm-go': async b => {
    b.disabled = true;
    const { mm, buf } = IMP, withPhotos = $('#mm-photos')?.checked;
    const fresh = splitDups(S.tx, mm.tx, Object.fromEntries([...S.accounts, ...mm.accounts].map(a => [a.id, a.name]))).fresh, used = new Set(fresh.flatMap(x => [x.accountId, x.toAccountId]).filter(Boolean));
    const accounts = mm.accounts.filter(a => used.has(a.id) && !S.accounts.some(x => x.id === a.id));
    const have = new Set(S.kv.customCats.map(c => c.id));
    const cats = mm.customCats.filter(c => !have.has(c.id) && fresh.some(x => x.category === c.id || x.items?.some(i => i.category === c.id)));
    await commitImport(mm.tx, mm.app === 'realbyte' ? 'Money Manager (Realbyte)' : 'Money Manager', { accounts, newAccounts: accounts.map(a => a.id), kv: cats.length ? { customCats: [...S.kv.customCats, ...cats] } : {}, before: async fresh => {
      if (!withPhotos) return [];
      const { readPhotos } = await import('../mmimport.js');
      const want = new Map(fresh.map(x => [x.id, x]));
      const todo = mm.photos.filter(p => want.has(p.txId)), ids = [];
      for (const [n, p] of todo.entries()) {
        if (n % 25 === 0) toast(t('Copying photos… {0} of {1}', n, todo.length));
        const bytes = (await readPhotos(buf, [p.path]))[p.path];
        const jpeg = bytes && await reencode(new Blob([bytes], { type: 'image/jpeg' }));
        if (!jpeg) continue;
        const id = uid('p');
        if (!(await savePhoto(id, jpeg))) continue;
        ids.push(id);
        want.get(p.txId).receiptId = id;
      }
      return ids;
    }, undoMore: async () => {
      if (cats.length) await setKv('customCats', S.kv.customCats.filter(c => !cats.some(n => n.id === c.id) || S.tx.some(x => x.category === c.id)));
    } });
  },
  'pdf-unlock': () => { const pw = $('#pdf-pw').value; if (pw) importStatement(IMP.pdf, pw).catch(e => impErr(e.message)); },
  'st-go': async b => {
    b.disabled = true;
    const { st } = IMP, sel = $('#st-acc').value;
    let accountId = sel;
    let account = null;
    if (sel === 'new') {
      accountId = uid('a');
      const first = st.rows[0];
      account = { id: accountId, name: st.provider?.[1] || t('Bank statement'), kind: st.provider?.[2] || 'bank', opening: st.opening ?? (first.balance != null ? first.balance - first.amount : 0), createdAt: Date.now() };
    }
    const source = Object.fromEntries(Object.entries({ ...settings().importSources, [IMP.sourceKey]: accountId }).slice(-100));
    const blind = st.opening == null && !st.rows.some(r => r.balance != null), first = !settings().onboarded;   // a statement without balances: ask, as for a file
    const touched = await commitImport(importIds(statementToTx(st.rows, { accountId }), 's'), st.provider?.[1] || t('Bank statement'), { accounts: account ? [account] : [], newAccounts: account ? [accountId] : [], kv: { settings: { ...settings(), importSources: source } }, tourLater: blind });
    if (blind) setTimeout(() => balanceTodaySheet(touched, first ? afterSetup : undefined), 300);
  },
  'restore-pick': () => {
    // No accept filter (Android hides .mmbackup and some .json files); importFile routes by content and size.
    const inp = Object.assign(document.createElement('input'), { type: 'file' });
    inp.addEventListener('change', () => { const f = inp.files[0]; if (f) importFile(f); });
    inp.click();
  },
  // Say what the file is and where it goes before anything opens (Round 1: people lost track of the file).
  // Where the data is and what deletes it, in plain words: people clear "cache" or uninstall to fix a phone and lose everything.
  'storage-info': () => {
    const li = (icon, s) => `<li>${icon}<span>${esc(s)}</span></li>`;
    openSheet(`<h2 class="sh-title">${esc(t('How your data is kept'))}</h2>
      <ul class="points">
        ${li(ICON.wallet, t('Only on this phone, inside Tally. There is no Tally server, so no one can get it back for you, not even us.'))}
        ${li(ICON.alert, t('These delete it: uninstalling Tally, clearing browsing data or storage for Tally, phone-cleaner apps, and resetting the phone.'))}
        ${iosBrowser() ? li(ICON.plusSquare, t("On iPhone, keep Tally on the Home Screen: Safari clears web apps it hasn't seen for 7 days.")) : ''}
        ${li(ICON.check, t('Safe: closing Tally, restarting the phone, updates, and being offline.'))}
        ${li(ICON.upload, t('New phone? Back up here, then restore the file on the new phone.'))}
      </ul>
      <div class="row2"><button class="btn" data-act="backup">${ICON.download}${esc(t('Back up now'))}</button><button class="btn ghost" data-act="sheet-close">${esc(t('Got it'))}</button></div>`, { label: t('How your data is kept') });
  },
  'backup': () => {
    const { name, text } = backupFile(), canShare = !!navigator.canShare?.({ files: [new File([''], name, { type: 'application/json' })] });
    openSheet(`<h2 class="sh-title">${esc(t('Back up'))}</h2>
      <p class="sh-body">${esc(t('One file with all {0} transactions, your accounts, budgets and categories.', S.tx.length))}</p>
      <p class="filechip">${ICON.download}<span class="grow"><b>${esc(name)}</b><small>${esc(t('{0} KB', Math.max(1, Math.round(text.length / 1024))))}</small></span></p>
      ${photoCount() ? `<label class="check"><input type="checkbox" id="bk-photos" checked> ${esc(photoCount() === 1 ? t('Include 1 receipt photo (a bigger .zip file)') : t('Include {0} receipt photos (a bigger .zip file)', photoCount()))}</label>` : ''}
      ${canShare ? `<button class="btn wide" data-act="bk-share">${esc(t('Send to myself (Google Drive, email, WhatsApp)'))}</button>` : ''}
      <button class="btn ${canShare ? 'ghost ' : ''}wide" data-act="bk-save">${esc(t('Save to this phone (Downloads)'))}</button>
      <p class="fine">${esc(t('To restore on a new phone: open Tally there, tap Restore a Tally backup, and pick this file.'))}</p>`, { label: t('Back up') });
  },
  'bk-share': async () => {
    const { name, blob, missing } = await backupBlob($('#bk-photos')?.checked);
    try { if (!(await shareFile(name, blob, blob.type))) return act['bk-save'](); } catch (e) { if (e?.name === 'AbortError') return; throw e; } // closed the share sheet: nothing sent
    await backedUp(t('Sent {0}. Check it arrived before you rely on it.', name));
    warnMissingPhotos(missing);
  },
  'bk-save': async b => {
    if (b) b.disabled = true;   // also called from bk-share when the phone can't share files
    const { name, blob, missing } = await backupBlob($('#bk-photos')?.checked);
    download(name, blob, blob.type);
    // Counted as a backup (else "Not backed up" nags forever), worded so the user still checks the file landed.
    await backedUp(t('Download started. Check your Downloads folder for {0}.', name));
    warnMissingPhotos(missing);
  },
  'joint-share': () => {
    const { name, text } = jointFile(), rows = jointTx(), photos = new Set(rows.map(x => x.receiptId).filter(Boolean)).size;
    const canShare = !!navigator.canShare?.({ files: [new File([''], name, { type: 'application/json' })] });
    openSheet(`<h2 class="sh-title">${esc(t('Share joint accounts'))}</h2>
      <p class="sh-body">${esc(t('One file with your {0} joint accounts, their {1} entries, joint budgets and the categories they use. Nothing from your personal accounts.', jointIds().size, rows.length))}</p>
      <p class="filechip">${ICON.download}<span class="grow"><b>${esc(name)}</b><small>${esc(t('{0} KB', Math.max(1, Math.round(text.length / 1024))))}</small></span></p>
      ${photos ? `<label class="check"><input type="checkbox" id="jt-photos"> ${esc(t('Include {0} receipt photos (a bigger .zip file)', photos))}</label>` : ''}
      <p class="warnbox">${ICON.alert}<span class="grow">${esc(t('Anyone with this file can read it. Send it only to your partner.'))}</span></p>
      ${canShare ? `<button class="btn wide" data-act="jt-send">${esc(t('Send to my partner (WhatsApp, email)'))}</button>` : ''}
      <button class="btn ${canShare ? 'ghost ' : ''}wide" data-act="jt-save">${esc(t('Save to this phone (Downloads)'))}</button>
      <p class="fine">${esc(t('Your partner opens Tally, taps Settings → Import from my partner and picks this file. Newer edits win on both phones.'))} ${esc(t('Deleting an entry does not delete it on the other phone: delete it there too.'))}</p>`, { label: t('Share joint accounts') });
  },
  'jt-send': async () => {
    const { name, blob, missing } = await backupBlob($('#jt-photos')?.checked, jointFile(), jointTx());
    try { if (!(await shareFile(name, blob, blob.type))) return act['jt-save'](); } catch (e) { if (e?.name === 'AbortError') return; throw e; }
    closeSheet(); toast(t('Sent {0}', name), { k: 'good', icon: 'check' }); warnMissingPhotos(missing);
  },
  'jt-save': async b => {
    if (b) b.disabled = true;
    const { name, blob, missing } = await backupBlob($('#jt-photos')?.checked, jointFile(), jointTx());
    download(name, blob, blob.type);
    closeSheet(); toast(t('Download started. Check your Downloads folder for {0}.', name), { k: 'good', icon: 'check' }); warnMissingPhotos(missing);
  },
  'export-csv': () => download(`tally-${today()}.csv`, toCSV(S.tx, S.accounts, catName), 'text/csv'),
  'erase': async () => {
    if (!(await confirmSheet({ title: t('Erase everything?'), body: t('This deletes all accounts, transactions and photos on this phone. It cannot be undone. Back up first if you might want them.'), ok: t('Erase everything'), danger: true }))) return;
    await eraseAll(); go('welcome'); toast(t('Everything was erased.'));
  },
};
