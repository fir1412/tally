// First-run tour, What's new after an update, install prompt and update check (pattern from we go gim).
import { S, settings, setKv, persistStorage } from './state.js';
import { t } from './i18n.js';
import { esc, ICON, openSheet, closeSheet, toast, hideToast, announce } from './ui.js';
import { render, route, go, APP_VERSION } from './app.js';

// Newest first. Written for users; each line is translated.
export const WHATS_NEW = {
  '1.2.0': [
    'The camera tells you when a receipt is too dark, blurry, too far or too close, and turns green when it can be read',
    'Joint accounts: a bill or account you delete stays deleted on both phones, and imported joint entries reach your partner',
    'Backups: Tally never says a backup is saved when it could not be restored, and protected backups with many photos restore',
    'The lock asks again after a minute away even if the phone\'s clock is changed',
    'Turning encryption on or off can no longer lock you out or leave entries unencrypted',
  ],
  '1.1.0': [
    'Close any card by swiping it down',
    'Bring your Cashew backup straight in (the .sql file)',
    'Imports from other money apps keep your own category names',
    'Install Tally from any browser, with picture steps for iPhone, Samsung and Firefox',
    'Safer imports and erase: files from others can no longer freeze Tally or bring erased data back',
    "Ask before updating (Settings): read what's new before a new version installs",
  ],
  '1.0.0': [
    'Can I afford it? Type a price and Tally checks it against your money, bills and usual spending for the next 30 days',
    'Choose how much Tally does: Simple, Standard or Everything, or switch each feature on and off in Settings → Features',
    'A sticker book for the days you log, colour themes for the whole app, and splitting a bill with friends',
    'New categories for rent, loans and insurance, and a business account from the start',
    'Tally in 日本語 and 繁體中文',
  ],
  '0.7.0': [
    "Download your receipt photos: one at a time, all the ones a search finds, or a year's tax-relief receipts in a folder per relief",
    "Your data is never locked in: export to Excel, Google Sheets, CSV or QIF, and bring QIF files in from other money apps",
    "Category colour palettes in Settings, and better reading of kopitiam slips",
  ],
  '0.6.0': [
    "New Insights: a month-end forecast, your own price changes, spending by day and time, fixed vs flexible, eating out vs cooking, and expenses you may claim for tax relief",
    "Light and dark themes, your own accent and category colours (with a hexagon colour picker and hex codes), and a greeting with your name",
    "Receipts show the shop's name, not its company name (Luckin Coffee, not Hextar Luckin M Sdn Bhd), and Tally remembers names you correct",
    "Better receipt reading: totals with cash rounding, more date formats, cleaner item names",
    "A budget ring on Home, a weekly recap and small good-news finds; saving an entry feels quicker",
    "The tour no longer darkens the screen: the button each tip talks about pulses instead",
    "Safer data: imports save all or nothing, a photo that can't be read is kept to try again, and Tally opens faster offline",
  ],
  '0.5.0': [
    'Bring your history from Money Manager (Realbyte, Excel or .mmbak), Money Lover, Spendee, Wallet, Monefy, YNAB, Cashew, Bluecoins, 1Money, Toshl and AndroMoney: no column matching, and transfers, accounts and categories come across',
    'Learn Tally: short missions that show what Tally can do, each ticked off when you do it (Settings, and on Home while you are new)',
    'Streaks and badges, off unless you turn them on in Settings: a logging streak with one rest day a week, and badges for good money habits',
    'With streaks on, a day with nothing spent keeps your streak going: tap Nothing spent today',
    'Snap receipts right inside Tally: the camera opens in the app, takes several in a row, and has a light for dim places',
    'The receipt reader shows how far its first download has got, and Settings can download it ahead of time',
    'Tips for a clear receipt photo before your first scan, and from the scan screens',
    'Set an account to what your bank shows today: Edit account, Balance today',
  ],
  '0.4.0': [
    'Joint accounts for partners: mark an account as Joint, switch between Me, Joint and All, and set joint budgets',
    'Share joint accounts with your partner as a file; their changes come back the same way, and newer edits win',
    'Lock Tally with a PIN, and your fingerprint or face where the phone has one (Settings)',
    'Bills can add themselves on the day: monthly, weekly or yearly, with a number of payments for instalments. A bill is paid once anything with its name is added that month, and unpaid ones stay on Home',
    'Type sums in any amount field, like 12.50+8*2',
    'Paid on the 25th? Start your month on payday (Settings): Home, Budgets and Insights follow it',
    'Calmer budget warnings: none in the first week, and one big payment or a bill no longer sounds the alarm',
    'Tally asks the browser to keep its data safe, and Settings says whether it did',
  ],
  '0.3.0': [
    'Type your own breakdown: one item per line ("Phone 1299", "Ikan 25") and each is sorted into its category, including the new Electronics',
    'The receipt photo is shown while you check it, and old receipts say which month they will be filed under',
    'Receipts waiting to be read and the one you are checking survive closing the app',
    'Imports go into their own account, match the balance on your statement, and can leave out rows dated after today',
    'Budgets update as you type; the month table has 6 or 12 months, money in and net, and each amount opens its transactions',
    'Backups can include receipt photos; Activity can show only entries with a photo',
    'Better receipt reading: totals with GST, cash and change lines, and shop names',
  ],
  '0.2.0': [
    'Send feedback from Settings: bugs and ideas go straight to the developer',
    'A quick tour for new users, and this list after each update',
    'New fonts and clearer amounts',
    'Bank statements from every Malaysian bank, Touch \'n Go, GrabPay and the digital banks',
    'Money Manager backups import with the same balances, and balance corrections no longer count as spending',
  ],
};
// Each tip: the screen, its icon, words, and the control it is about (pulsed while the tip shows).
const TIPS = [
  ['home', ICON.receipt, () => t('Welcome to Tally'), () => t('Five quick tips, about 30 seconds. Or skip them and start.')],
  ['home', ICON.camera, () => t('Snap a receipt'), () => t('Tap the camera button. Tally reads the receipt on this phone and splits it into items and categories. Check it, then save.')],
  ['activity', ICON.list, () => t('Everything in one list'), () => t('Search, filter by account or category, and tap any entry to fix it. Scanned receipts keep their photo.')],
  ['insights', ICON.chart, () => t('See where it went'), () => t('Spending by category, this month against last, your balance over time and the items you buy most.')],
  ['budgets', ICON.wallet, () => t('Budgets and bills'), () => t('Set a monthly limit and Tally warns you before you pass it. Regular bills can go into your calendar as reminders.')],
  ['settings', ICON.gear, () => t('Your data stays with you'), () => t('Back up to Google Drive or email, bring data from other apps and bank statements, and change the language and text size here.')],
];
const TIP_TARGETS = [null, '.fab', '.tabs a[href="#/activity"]', '.tabs a[href="#/insights"]', '.tabs a[href="#/budgets"]', '#backup [data-act="backup"]'];
const seen = () => setKv('settings', { ...S.kv.settings, tourDone: true, seenVersion: APP_VERSION });
export const markSeen = seen;
const skipTour = () => new URLSearchParams(location.search).has('notour');   // automated tests

// The last step while Tally isn't installed yet: install it here (one tap, or this browser's picture steps), and the
// Settings button that does it later pulses meanwhile.
const INSTALL = ['settings', ICON.download, () => t('Install Tally on this phone'), () => t('It opens like any app, works offline, and keeps your entries safe on this phone.')];
const iosTipJustShown = () => Date.now() - (settings().iosTipAt || 0) < 10 * 60e3;   // iPhone: its Home Screen steps came right before the tour
/** Skipped or put off: where to install it later, with a way there. */
const installLater = () => { if (canInstall()) toast(t('You can install Tally any time in Settings.'), { undo: () => { go('settings'); setTimeout(() => { const b = document.querySelector('[data-act="install"]'); b?.scrollIntoView({ block: 'center', behavior: 'smooth' }); b?.classList.add('tour-pulse'); setTimeout(() => b?.classList.remove('tour-pulse'), 4000); }, 350); }, undoLabel: t('Show me') }); };
/** Walk through the tabs. The sheet stays open while the screen behind it changes. */
export function showTour(start = 0) {
  let i = start, installedNow = false;
  const offer = canInstall() && !iosTipJustShown(), TOUR = offer ? [...TIPS, INSTALL] : TIPS, TARGET = offer ? [...TIP_TARGETS, '[data-act="install"]'] : TIP_TARGETS;
  hideToast();   // an import's toast shouldn't sit over the tour
  const unpulse = () => document.querySelectorAll('.tour-pulse').forEach(x => x.classList.remove('tour-pulse', 'tour-under'));
  const sheet = openSheet('', { label: t('Quick tour'), onClose: () => { document.body.classList.remove('touring'); unpulse(); if (!settings().tourDone) seen(); } });
  sheet.closest('.scrim').classList.add('tourscrim');   // no dark cover: the screen the tip is about stays in view
  document.body.classList.add('touring');
  const paint = () => {
    const [tab, icon, title, body] = TOUR[i];
    if (route() !== tab) { history.replaceState(history.state, '', `#/${tab}`); render(); }
    unpulse();
    const target = TARGET[i] && document.querySelector(TARGET[i]);
    if (target) {
      target.classList.add('tour-pulse'); target.scrollIntoView?.({ block: 'start', behavior: 'smooth' });   // above the tour card
      // Big text on a small phone: the card can reach the button. Then it pulses under the card instead of over its words.
      const under = () => { const a = target.getBoundingClientRect(), c = sheet.getBoundingClientRect(); target.classList.toggle('tour-under', a.bottom > c.top && a.top < c.bottom); };
      under(); for (const ms of [300, 700, 1200]) setTimeout(under, ms);   // while and after the smooth scroll
    }
    const last = i === TOUR.length - 1, install = TOUR[i] === INSTALL;
    // The install step: one tap where the browser offers it, else this browser's own picture steps right here.
    const how = install && !installEvt ? (([, steps, note]) => `<ol class="iossteps">${steps.map(([ic, w], n) => `<li><span class="iosnum">${n + 1}</span><span class="tour-ic">${ic}</span><b>${esc(w)}</b></li>`).join('')}</ol>${note ? `<p class="fine">${esc(note)}</p>` : ''}`)(installSteps()) : '';
    sheet.innerHTML = `<div class="grab" aria-hidden="true"></div><div class="tour"><div class="tour-ic">${icon}</div>
      <p class="lbl">${esc(i ? (install ? t('Last step') : t('Tip {0} of {1}', i, TIPS.length - 1)) : 'Tally')}</p><h2 class="sh-title">${esc(title())}</h2><p class="sh-body">${esc(body())}</p>${how}
      ${i && !install ? `<div class="dots" aria-hidden="true">${TIPS.slice(1).map((_, j) => `<i class="${j + 1 === i ? 'on' : j + 1 < i ? 'done' : ''}"></i>`).join('')}</div>` : ''}
      ${install && installEvt ? `<button class="btn wide" data-t="install">${ICON.download}${esc(t('Install now'))}</button>` : ''}
      ${last ? `<button class="btn ghost wide" data-t="learn">${ICON.sparkles}${esc(t('Then try it: Learn Tally'))}</button>` : ''}
      <div class="row2"><button class="btn ghost" data-t="${i ? 'back' : 'skip'}">${esc(i ? t('Back') : t('Skip'))}</button><button class="btn${install && installEvt ? ' ghost' : ''}" data-t="next">${esc(install ? (installEvt ? t('Later') : t('Done')) : last ? t('Start using Tally') : i ? t('Next') : t('Show me'))}</button></div>
      ${i && !last ? `<button class="link tourskip" data-t="skip">${esc(t('Skip the tour'))}</button>` : ''}</div>`;
    setTimeout(() => sheet.querySelector('[data-t="next"]')?.focus({ preventScroll: true }), 40);
    announce(`${title()}. ${body()}`);   // the tip changes in place: said, not only shown
  };
  sheet.addEventListener('click', async e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const k = b.dataset.t;
    if (k === 'install') { installedNow = await promptInstall(); if (!installedNow) return paint(); }
    else if (k === 'next' && i < TOUR.length - 1) { i++; return paint(); }
    else if (k === 'back') { i--; return paint(); }
    closeSheet();
    if (!installedNow) setTimeout(installLater, 900);   // skipped, or put off: say where it is for later
    go(k === 'learn' ? 'learn' : 'home');   // through the router: no step of the tour is left behind Home
    if (k !== 'learn') setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 350);   // Home from the top: the balance first (after the last tip's scroll)
  });
  paint();
}

const cmpVer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let k = 0; k < 3; k++) if ((x[k] || 0) !== (y[k] || 0)) return (x[k] || 0) - (y[k] || 0); return 0; };
/** Everything added after version `from` (all of it when `from` is empty). */
export const newSince = from => Object.entries(WHATS_NEW).filter(([v]) => !from || cmpVer(v, from) > 0).flatMap(([, l]) => l);

export function showWhatsNew(from = '') {
  const items = newSince(from);
  const el = openSheet(`<div class="tour"><div class="tour-ic">${ICON.sparkles}</div><p class="lbl">${esc(t('Tally {0}', APP_VERSION))}</p><h2 class="sh-title">${esc(t("What's new"))}</h2>
    <ul class="newlist">${items.map(x => `<li>${esc(t(x))}</li>`).join('')}</ul>
    <div class="row2"><button class="btn ghost" data-t="tour">${esc(t('Take the tour'))}</button><button class="btn" data-t="ok" autofocus>${esc(t('Got it'))}</button></div></div>`,
  { label: t("What's new"), onClose: () => seen() });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    closeSheet();
    if (b.dataset.t === 'tour') setTimeout(() => showTour(1), 250);
  });
}

/** On start: the tour for someone new, What's new for someone who updated, nothing on the welcome screen. */
// iPhone Safari clears a web app's storage after 7 days without use unless it is on the Home Screen (WebKit's cap).
export const iosBrowser = () => typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
  && !(navigator.standalone || matchMedia('(display-mode: standalone)').matches);
/** How to put Tally on the home screen in this browser, as [title, [[icon, words]…], note]. Only Chrome-family browsers can do it in one tap. */
function installSteps() {
  const ua = navigator.userAgent, samsung = /SamsungBrowser/.test(ua);
  // A link opened inside WhatsApp, Instagram, Facebook…: their viewer can't add apps, a real browser can.
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|Snapchat|; wv\)/.test(ua)) return [t('Open Tally in your browser first'),
    [[ICON.list, t('Tap ⋮ or ⋯ at the top')], [ICON.globe, t('Open in Chrome or Safari')], [ICON.download, t('Then tap Install Tally again')]],
    t('Apps like WhatsApp, Instagram and Facebook open links in their own viewer, which cannot add apps to the home screen.')];
  if (iosBrowser()) return [t('Make Tally an app on your iPhone'), [[ICON.share, t('Tap Share')], [ICON.plusSquare, t('Add to Home Screen')], [ICON.home, t('Open Tally from there')]],
    /CriOS|EdgiOS|FxiOS/.test(ua) ? t('In Chrome, Edge or Firefox on iPhone, Share is in the address bar or the ⋯ menu.') : ''];
  if (/Android/.test(ua)) return [t('Add Tally to your home screen'), [[ICON.list, samsung ? t('Tap the menu ≡ at the bottom') : t('Tap the browser menu ⋮')],
    [ICON.plusSquare, samsung ? t('Add page to → Home screen') : t('Tap Install or Add to Home screen')], [ICON.home, t('Open Tally from there')]], ''];
  if (/Firefox\//.test(ua)) return [t('Install Tally on this computer'), [[ICON.globe, t('Firefox on a computer cannot install web apps. Open this page in Chrome or Edge')],
    [ICON.download, t('Click the install icon at the right of the address bar')]], ''];
  if (/Macintosh/.test(ua) && /Version\/[\d.]+ Safari/.test(ua)) return [t('Install Tally on this Mac'), [[ICON.list, t('In the menu bar, choose File')], [ICON.plusSquare, t('Add to Dock')]], ''];
  return [t('Install Tally on this computer'), [[ICON.download, t('Click the install icon at the right of the address bar')], [ICON.list, t('Or open the browser menu and choose Install Tally')]], ''];
}
/** Numbered pictures and a few words. */
function stepsSheet([title, steps, note], { why = '', then, stack = false } = {}) {
  const el = openSheet(`<h2 class="sh-title">${esc(title)}</h2>${why ? `<p class="sh-body">${esc(why)}</p>` : ''}
    <ol class="iossteps">${steps.map(([ic, w], i) => `<li><span class="iosnum">${i + 1}</span><span class="tour-ic">${ic}</span><b>${esc(w)}</b></li>`).join('')}</ol>
    ${note ? `<p class="fine">${esc(note)}</p>` : ''}<button class="btn wide" data-x="ok">${esc(t('Got it'))}</button>`, { label: title, stack, onClose: () => then?.() });
  el.addEventListener('click', e => { if (e.target.closest('[data-x]')) closeSheet(); });
}
/** Three pictures and a few words: Share → Add to Home Screen → open Tally from there. */
export function homeScreenTip(then) {
  setKv('settings', { ...S.kv.settings, iosTipAt: Date.now() });
  const [title, steps] = installSteps();
  stepsSheet([title, steps, t("Why: Safari clears websites you haven't opened for 7 days; Home Screen apps are kept.")],
    { why: t('On the Home Screen it opens like any app, works offline and keeps your entries.'), then });
}
const iosTipDue = () => iosBrowser() && S.accounts.length && Date.now() - (settings().iosTipAt || 0) > 3 * 864e5;

export function onboarding() {
  if (skipTour()) return;
  const s = settings();
  if (iosTipDue() && s.seenVersion === APP_VERSION && s.tourDone) return homeScreenTip();   // every 3 days until it's on the Home Screen
  // First run: this version's changes aren't news. Stamping it here tells a new user apart from one updating from 0.1.0.
  if (!S.accounts.length) { if (!s.seenVersion) setKv('settings', { ...S.kv.settings, seenVersion: APP_VERSION }); return; }
  if (s.seenVersion === APP_VERSION) { if (!s.tourDone && !S.tx.length) showTour(0); return; }
  const from = s.seenVersion || '0.1.0';   // 0.1.0 didn't record it
  if (newSince(from).length) showWhatsNew(from); else seen();
}
/** Right after setup (fresh start or import). */
export function afterSetup() {
  persistStorage();   // data now worth keeping: ask the browser not to clear it when space runs low
  if (skipTour()) return;
  const tour = () => { if (!settings().tourDone) setTimeout(() => showTour(0), 300); };
  if (iosBrowser()) setTimeout(() => homeScreenTip(tour), 300); else tour();   // on iPhone, keeping the data comes first
}

// ---- install ("Add to home screen") ------------------------------------------------------------------------------------
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (['settings', 'welcome'].includes(route())) render(); });
window.addEventListener('appinstalled', () => { installEvt = null; toast(t('Installed. Open Tally from your home screen.'), { k: 'good', icon: 'check' }); });
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
/** Offered in every browser until Tally runs as an app: one tap where the browser allows it, its own steps everywhere else. */
export const canInstall = () => !!installEvt || !installed();
export async function promptInstall() {
  const e = installEvt; if (!e) { stepsSheet(installSteps(), { stack: true }); return false; }
  installEvt = null;
  e.prompt();
  return (await e.userChoice).outcome === 'accepted';
}

// ---- updates ---------------------------------------------------------------------------------------------------------
/** Manual check (Settings): 'latest', 'updating' or 'unsupported'. A found update installs and reloads by itself. */
export async function checkForUpdates() {
  const reg = await navigator.serviceWorker?.getRegistration?.();
  if (!reg) return 'unsupported';
  await reg.update();
  reg.waiting?.postMessage('skip');   // held by "Ask before updating": tapping Check for updates is the OK
  return reg.installing || reg.waiting ? 'updating' : 'latest';
}
/** "Ask before updating": the marker sw.js looks for when a new version installs. Off lets a waiting one in. */
export async function holdUpdates(on) {
  if (!globalThis.caches) return;
  await (on ? caches.open('tally-hold') : caches.delete('tally-hold')).catch(() => {});
  if (!on) (await navigator.serviceWorker?.getRegistration?.())?.waiting?.postMessage('skip');
}
/** Register the service worker; reload once when a new version takes over, never mid-typing, mid-review or with a sheet open. */
export function registerSW(blocked) {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  try { if (sessionStorage.getItem('tally-updated')) { sessionStorage.removeItem('tally-updated'); setTimeout(() => toast(t('Updated to the latest version'), { k: 'good', icon: 'check' }), 300); } } catch {}
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
    // An installed app can stay open for days: look for updates whenever it comes back to the front.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    holdUpdates(!!settings().askUpdate);
    const offer = () => { if (settings().askUpdate && reg.waiting && navigator.serviceWorker.controller) toast(t('A new version of Tally is ready'), { undo: () => reg.waiting?.postMessage('skip'), undoLabel: t('Update now') }); };
    offer();
    reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', e => { if (e.target.state === 'installed') offer(); }));
  }).catch(() => {});
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  const tryReload = () => {
    if (reloading || document.activeElement?.matches('input, textarea, select') || blocked() || route() === 'review') return false;
    reloading = true;
    try { sessionStorage.setItem('tally-updated', '1'); } catch {}
    location.reload(); return true;
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || tryReload()) return;
    const retry = () => { if (tryReload()) { document.removeEventListener('visibilitychange', retry); window.removeEventListener('hashchange', retry); } };
    document.addEventListener('visibilitychange', retry);
    window.addEventListener('hashchange', retry);
  });
}
