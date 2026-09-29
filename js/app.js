// App shell: boot, hash routing, bottom nav, one delegated click/input handler, recovery screen on errors.
import { S, load, settings, onRemoteChange, onSaveFailed, storageMode } from './state.js';
import { t, setLang, pickLang } from './i18n.js';
import { $, esc, ICON, toast, closeSheet, sheetOpen } from './ui.js';
import * as home from './views/home.js';
import * as money from './views/money.js';
import * as review from './views/review.js';
import * as setup from './views/setup.js';
import { flushFeedback } from './feedback.js';
import { onboarding, registerSW } from './tour.js';

export const APP_VERSION = '0.4.0';
const VIEWS = { home: home.homeView, insights: home.insightsView, activity: money.activityView, budgets: money.budgetsView, review: review.reviewView, settings: setup.settingsView, welcome: setup.welcomeView };
const ACT = { ...home.act, ...money.act, ...review.act, ...setup.act };
const INPUT = { ...money.input, ...setup.input, ...review.input };

export const route = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'home');
export function go(r) { if (route() === r) render(); else location.hash = `#/${r}`; }

export function render() {
  let r = route();
  if (!S.accounts.length && !['welcome', 'settings'].includes(r)) { r = 'welcome'; history.replaceState(null, '', '#/welcome'); }
  const view = VIEWS[r] || VIEWS.home;
  const tabs = [['home', ICON.home, t('Home')], ['activity', ICON.list, t('Activity')], null, ['insights', ICON.chart, t('Insights')], ['budgets', ICON.wallet, t('Budgets')]];
  const nav = r === 'welcome' ? '' : `<nav class="tabs" aria-label="${esc(t('Main'))}"><span class="brand" aria-hidden="true">Tally</span>${tabs.map(x => x ? `<a href="#/${x[0]}" class="tab${r === x[0] ? ' on' : ''}"${r === x[0] ? ' aria-current="page"' : ''}>${x[1]}<span>${esc(x[2])}</span></a>`
    : `<button class="fab" data-act="scan" aria-label="${esc(t('Scan a receipt'))}">${ICON.camera}</button>`).join('')}<a href="#/settings" class="tab desk${r === 'settings' ? ' on' : ''}">${ICON.gear}<span>${esc(t('Settings'))}</span></a></nav>`;
  $('#app').innerHTML = `<main id="view" class="view-${r}">${view.render()}</main>${nav}`;
  view.after?.();
  document.title = `Tally · ${t(view.title || 'Home')}`;
}

// ---- events -------------------------------------------------------------------------------------------------------
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const fn = ACT[b.dataset.act];
  if (!fn) return;
  e.preventDefault();
  try { await fn(b, e); } catch (err) { console.error(err); if (b.isConnected) b.disabled = false; toast(t('Something went wrong: {0}', err.message || String(err)), { k: 'bad' }); }
});
// Typing fields report on 'input'; selects, checkboxes, dates and files on 'change' (each handler runs once).
const typing = el => el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'file', 'date', 'time', 'color'].includes(el.type));
for (const ev of ['input', 'change']) document.addEventListener(ev, e => {
  const el = e.target.closest('[data-input]');
  const fn = el && INPUT[el.dataset.input];
  if (fn && (ev === 'input') === typing(el)) fn(el, e);
});
// Screen change: entrance motion plays once (html[data-enter]), and browsers with View Transitions crossfade.
// Going straight back to the screen just left (back arrow or phone back) returns to the same scroll position.
let shown = route(), left = null;
export const cameFrom = () => left?.to === route() ? left.route : null;
window.addEventListener('hashchange', () => {
  if (sheetOpen()) closeSheet();
  const r = route(), y = left && left.route === r && left.to === shown ? left.y : 0;
  left = { route: shown, y: window.scrollY, to: r };
  shown = r;
  const html = document.documentElement;
  html.dataset.enter = ''; clearTimeout(window.__enterT); window.__enterT = setTimeout(() => delete html.dataset.enter, 800);
  const run = () => { render(); window.scrollTo(0, y); };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(run); else run();
});

// Global actions used by every view.
Object.assign(ACT, {
  scan: () => $('#scan-input').click(),
  go: b => go(b.dataset.to),
  back: b => (cameFrom() ? history.back() : go(b.dataset.to || 'home')),
});
document.addEventListener('change', e => {
  if (e.target.id !== 'scan-input') return;
  const files = [...e.target.files];
  e.target.value = '';
  if (files.length) { review.enqueue(files); go('review'); }
});

// ---- boot ---------------------------------------------------------------------------------------------------------
function recovery(err) {
  document.body.innerHTML = `<main class="recover"><h1>${esc(t('Tally could not start'))}</h1><p>${esc(t('Your data is still on this phone. Reload to try again. If it keeps happening, back up first from Settings once it opens, or send us a note.'))}</p>
    <p class="fine">${esc(String(err?.message || err))}</p><button class="btn" id="reload">${esc(t('Reload'))}</button></main>`;
  document.getElementById('reload').addEventListener('click', () => location.reload());
}
window.addEventListener('error', e => { if (!document.getElementById('app')?.children.length) recovery(e.error || e.message); });
window.addEventListener('unhandledrejection', e => console.error(e.reason));

/** Files shared into Tally (Money Manager → Export → Share, Gallery, WhatsApp): photos go to the scanner, the rest to import. */
async function takeShared() {
  if (route() !== 'share') return;
  history.replaceState(null, '', '#/home');
  if (!('caches' in window)) return;
  const c = await caches.open('tally-share'), keys = await c.keys();
  const files = [];
  for (const k of keys) { const r = await c.match(k); files.push(new File([await r.blob()], decodeURIComponent(r.headers.get('x-name') || 'shared'), { type: r.headers.get('content-type') || '' })); }
  await caches.delete('tally-share');
  const photos = files.filter(f => f.type.startsWith('image/')), other = files.filter(f => !f.type.startsWith('image/'));
  if (other.length) setTimeout(() => setup.importFile(other[0]), 400);   // one import at a time
  else if (photos.length) { review.enqueue(photos); history.replaceState(null, '', '#/review'); }
}
export const refresh = () => { if (!sheetOpen()) render(); };
(async () => {
  // Never run inside another site's frame (clickjacking): GitHub Pages can't send frame-ancestors.
  if (window.top !== window.self) {
    $('#app').innerHTML = `<main class="recover"><h1>Tally can only run on its own page.</h1><p><a class="btn" href="${esc(location.href)}" target="_top" rel="noopener">Open Tally</a></p></main>`;
    return;
  }
  try {
    await load();
    await setLang(settings().lang || pickLang(navigator.languages || [navigator.language]));
    document.documentElement.style.fontSize = `${settings().textSize || 100}%`;
    onRemoteChange(async () => { await load(); refresh(); });
    onSaveFailed(() => toast(t('Could not save. Your phone may be out of space.'), { k: 'bad' }));
    if (storageMode() === 'localstorage') setTimeout(() => toast(t('Private browsing: data may be lost when you close this tab.'), { k: 'warn' }), 800);
    await takeShared();
    const resumed = await review.restoreDraft();
    if (resumed) { history.replaceState(null, '', '#/review'); toast(t('Picked up the receipt you were checking')); }
    render();
    if (!resumed) onboarding();
    flushFeedback().catch(() => {});
    registerSW(() => sheetOpen() || review.busy());
  } catch (err) { recovery(err); }
})();
