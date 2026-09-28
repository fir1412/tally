// App shell: boot, hash routing, bottom nav, one delegated click/input handler, recovery screen on errors.
import { S, load, settings, onRemoteChange, onSaveFailed, storageMode } from './state.js';
import { t, setLang, pickLang } from './i18n.js';
import { $, esc, ICON, toast, closeSheet, sheetOpen } from './ui.js';
import * as home from './views/home.js';
import * as money from './views/money.js';
import * as review from './views/review.js';
import * as setup from './views/setup.js';

export const APP_VERSION = '0.1.0';
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
  const nav = r === 'welcome' ? '' : `<nav class="tabs" aria-label="${esc(t('Main'))}">${tabs.map(x => x ? `<a href="#/${x[0]}" class="tab${r === x[0] ? ' on' : ''}"${r === x[0] ? ' aria-current="page"' : ''}>${x[1]}<span>${esc(x[2])}</span></a>`
    : `<button class="fab" data-act="scan" aria-label="${esc(t('Scan a receipt'))}">${ICON.camera}</button>`).join('')}</nav>`;
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
  try { await fn(b, e); } catch (err) { console.error(err); toast(t('Something went wrong: {0}', err.message || String(err)), { k: 'bad' }); }
});
for (const ev of ['input', 'change']) document.addEventListener(ev, e => {
  const el = e.target.closest('[data-input]');
  const fn = el && INPUT[el.dataset.input];
  if (fn && (ev === 'input' || el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'file' || el.type === 'date')) fn(el, e);
});
window.addEventListener('hashchange', () => { if (sheetOpen()) closeSheet(); render(); window.scrollTo(0, 0); });

// Global actions used by every view.
Object.assign(ACT, {
  scan: () => $('#scan-input').click(),
  go: b => go(b.dataset.to),
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

export const refresh = () => { if (!sheetOpen()) render(); };
(async () => {
  try {
    await load();
    await setLang(settings().lang || pickLang(navigator.languages || [navigator.language]));
    document.documentElement.style.fontSize = `${settings().textSize || 100}%`;
    onRemoteChange(async () => { await load(); refresh(); });
    onSaveFailed(() => toast(t('Could not save. Your phone may be out of space.'), { k: 'bad' }));
    if (storageMode() === 'localstorage') setTimeout(() => toast(t('Private browsing: data may be lost when you close this tab.'), { k: 'warn' }), 800);
    render();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
  } catch (err) { recovery(err); }
})();
