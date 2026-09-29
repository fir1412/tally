// First-run tour, What's new after an update, install prompt and update check (pattern from we go gim).
import { S, settings, setKv, persistStorage } from './state.js';
import { t } from './i18n.js';
import { esc, ICON, openSheet, closeSheet, toast, hideToast } from './ui.js';
import { render, route, APP_VERSION } from './app.js';

// Newest first. Written for users; each line is translated.
export const WHATS_NEW = {
  '0.4.0': [
    'Joint account for couples: mark an account as Joint, switch between Me, Joint and All, and set joint budgets',
    'Share joint accounts with your spouse as a file; their changes come back the same way, and newer edits win',
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
const TOUR = [
  ['home', ICON.receipt, () => t('Welcome to Tally'), () => t('Five quick tips, about 30 seconds. Or skip them and start.')],
  ['home', ICON.camera, () => t('Snap a receipt'), () => t('Tap the camera button. Tally reads the receipt on this phone and splits it into items and categories. Check it, then save.')],
  ['activity', ICON.list, () => t('Everything in one list'), () => t('Search, filter by account or category, and tap any entry to fix it. Scanned receipts keep their photo.')],
  ['insights', ICON.chart, () => t('See where it went'), () => t('Spending by category, this month against last, your balance over time and the items you buy most.')],
  ['budgets', ICON.wallet, () => t('Budgets and bills'), () => t('Set a monthly limit and Tally warns you before you pass it. Regular bills can go into your calendar as reminders.')],
  ['settings', ICON.gear, () => t('Your data stays with you'), () => t('Back up to Google Drive or email, bring data from other apps and bank statements, and change the language here.')],
];
const seen = () => setKv('settings', { ...S.kv.settings, tourDone: true, seenVersion: APP_VERSION });
export const markSeen = seen;
const skipTour = () => new URLSearchParams(location.search).has('notour');   // automated tests

/** Walk through the tabs. The sheet stays open while the screen behind it changes. */
export function showTour(start = 0) {
  let i = start;
  hideToast();   // an import's toast shouldn't sit over the tour
  const sheet = openSheet('', { label: t('Quick tour'), onClose: () => { if (!settings().tourDone) seen(); } });
  const paint = () => {
    const [tab, icon, title, body] = TOUR[i];
    if (route() !== tab) { history.replaceState(history.state, '', `#/${tab}`); render(); }
    const last = i === TOUR.length - 1;
    sheet.innerHTML = `<div class="grab" aria-hidden="true"></div><div class="tour"><div class="tour-ic">${icon}</div>
      <p class="lbl">${esc(i ? t('Tip {0} of {1}', i, TOUR.length - 1) : 'Tally')}</p><h2 class="sh-title">${esc(title())}</h2><p class="sh-body">${esc(body())}</p>
      ${last ? `<p class="warnbox">${ICON.alert}<span>${esc(t('Uninstalling Tally or clearing its site data deletes everything on this phone. Back up first.'))}</span></p>` : ''}
      ${i ? `<div class="dots" aria-hidden="true">${TOUR.slice(1).map((_, j) => `<i class="${j + 1 === i ? 'on' : j + 1 < i ? 'done' : ''}"></i>`).join('')}</div>` : ''}
      ${last && canInstall() ? `<button class="btn ghost wide" data-t="install">${ICON.download}${esc(t('Install Tally on this phone'))}</button>` : ''}
      <div class="row2"><button class="btn ghost" data-t="${i ? 'back' : 'skip'}">${esc(i ? t('Back') : t('Skip'))}</button><button class="btn" data-t="next">${esc(last ? t('Start using Tally') : i ? t('Next') : t('Show me'))}</button></div>
      ${i && !last ? `<button class="link tourskip" data-t="skip">${esc(t('Skip the tour'))}</button>` : ''}</div>`;
    setTimeout(() => sheet.querySelector('[data-t="next"]')?.focus({ preventScroll: true }), 40);
  };
  sheet.addEventListener('click', async e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const k = b.dataset.t;
    if (k === 'install') { await promptInstall(); return paint(); }
    if (k === 'next' && i < TOUR.length - 1) { i++; return paint(); }
    if (k === 'back') { i--; return paint(); }
    closeSheet();
    if (route() !== 'home') location.hash = '#/home';
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
export function onboarding() {
  if (skipTour()) return;
  const s = settings();
  // First run: this version's changes aren't news. Stamping it here tells a new user apart from one updating from 0.1.0.
  if (!S.accounts.length) { if (!s.seenVersion) setKv('settings', { ...S.kv.settings, seenVersion: APP_VERSION }); return; }
  if (s.seenVersion === APP_VERSION) { if (!s.tourDone && !S.tx.length) showTour(0); return; }
  const from = s.seenVersion || '0.1.0';   // 0.1.0 didn't record it
  if (newSince(from).length) showWhatsNew(from); else seen();
}
/** Right after setup (fresh start or import). */
export function afterSetup() {
  persistStorage();   // data now worth keeping: ask the browser not to clear it when space runs low
  if (skipTour() || settings().tourDone) return;
  setTimeout(() => showTour(0), 300);
}

// ---- install ("Add to home screen") ------------------------------------------------------------------------------------
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (['settings', 'welcome'].includes(route())) render(); });
window.addEventListener('appinstalled', () => { installEvt = null; toast(t('Installed. Open Tally from your home screen.'), { k: 'good', icon: 'check' }); });
export const canInstall = () => !!installEvt;
export async function promptInstall() {
  const e = installEvt; if (!e) return false;
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
  return reg.installing || reg.waiting ? 'updating' : 'latest';
}
/** Register the service worker; reload once when a new version takes over, never mid-typing, mid-review or with a sheet open. */
export function registerSW(blocked) {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  try { if (sessionStorage.getItem('tally-updated')) { sessionStorage.removeItem('tally-updated'); setTimeout(() => toast(t('Updated to the latest version'), { k: 'good', icon: 'check' }), 300); } } catch {}
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
    // An installed app can stay open for days: look for updates whenever it comes back to the front.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
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
