// Learn Tally (the mission list, its Home card and Settings card, "Show me") and Streaks and badges (off unless
// turned on). Missions tick themselves off after any screen, tap or field that could have done one (pattern from we go gim).
import { S, settings, setSetting, today, startDay, budgetsFor } from '../state.js';
import { t, fmtDate, getLang } from '../i18n.js';
import { esc, ICON, toast, sheetOpen } from '../ui.js';
import { render, go, route } from '../app.js';
import { progress, doneByData, missionFor, byUser } from '../learn.js';
import { streak, loggedDays, earned, BADGES } from '../gamify.js';

const TEXT = {
  scan: () => [t('Scan a receipt'), t('Tap the camera and snap a receipt. Tally reads it on this phone and splits it into items and categories.')],
  fixcat: () => [t('Fix an item\'s category'), t('While checking a receipt, change a category Tally got wrong. It remembers for next time.')],
  split: () => [t('Type a breakdown'), t('Paid for several things at once? Split into items, one per line, and each goes to its own category.')],
  hand: () => [t('Add an expense by hand'), t('No receipt? Type the amount and pick a category. Sums like 12.50+8 work too.')],
  budget: () => [t('Set a monthly budget'), t('Tally warns you when you are heading over, before the month ends.')],
  bill: () => [t('Add a regular bill'), t('Rent, phone, a loan: Tally reminds you when it is due and can add it by itself.')],
  table: () => [t('Look at the month table in Insights'), t('Every category month by month, like a spreadsheet. Tap an amount to see what made it up.')],
  lang: () => [t('Switch language or text size'), t('English, Bahasa Melayu or 简体中文, and bigger text if you like.')],
  backup: () => [t('Back up your data'), t('Everything lives only on this phone. A backup file, with or without photos, keeps it safe.')],
  import: () => [t('Import from another app or a bank statement'), t('Bring your history from Money Manager, Excel, Google Sheets or a bank PDF.')],
  lock: () => [t('Turn on the app lock'), t('A PIN, or your fingerprint, keeps Tally private when someone picks up your phone.')],
  joint: () => [t('Share with your spouse'), t('Send your joint accounts as a file. Their changes come back the same way.')],
};
const BTEXT = {
  scan1: () => [t('First scan'), t('Scanned your first receipt.')],
  streak7: () => [t('7-day streak'), t('Logged something 7 days in a row.')],
  streak30: () => [t('30-day streak'), t('Logged something 30 days in a row.')],
  budget: () => [t('Under budget'), t('Finished a month within your monthly budget.')],
  fullmonth: () => [t('Every day logged'), t('Logged every day of a month, even the days with nothing spent.')],
  scan10: () => [t('10 receipts'), t('Scanned 10 receipts.')],
  nospend: () => [t('No-spend day'), t('A whole day with nothing spent.')],
  less: () => [t('Spent less'), t('Spent less in a month than the month before.')],
  backup: () => [t('Safe and sound'), t('Made a backup.')],
  import: () => [t('History moved in'), t('Brought your history from another app or a bank.')],
  learned: () => [t('Knows Tally'), t('Did every Learn Tally mission.')],
};

const data = () => ({ tx: S.tx, recurring: S.recurring, accounts: S.accounts, settings: settings(), budgets: S.kv.budgets, rules: S.kv.rules, lastBackup: S.kv.lastBackup });
/** Streaks and badges are off unless turned on in Settings; off, nothing of them is shown. */
export const gameOn = () => settings().gamify === true;
const game = () => {
  const s = settings(), p = progress(data());
  return { tx: S.tx, today: today(), startDay: startDay(), budget: budgetsFor('all').total, noSpend: s.noSpend || [], lastBackup: S.kv.lastBackup, me: s.myName || '', learnedOn: p.all ? Object.values(s.learn || {}).sort().pop() : null };
};
const myStreak = () => streak(loggedDays(S.tx, settings().noSpend || [], settings().myName || ''), today());
const meter = p => `<div class="meter" role="progressbar" aria-label="${esc(t('Missions done'))}" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.n}"><i style="width:${Math.round(p.n / p.total * 100)}%"></i></div>`;
const chip = (m, done) => `<span class="lic${done ? ' done' : ''}">${done ? `${ICON.check}<span class="sr">${esc(t('Done'))}</span>` : ICON[m.icon]}</span>`;

// ---- Home and Settings cards ------------------------------------------------------------------------------------
/** Home, for someone new: the next mission, until the list is done or hidden. */
export function learnHome() {
  const d = data(), p = progress(d), s = settings();
  if (p.all || s.learnHidden || d.tx.filter(x => byUser(x, s.myName)).length >= 30) return '';
  const [title, why] = TEXT[p.next.id]();
  return `<section class="card learncard"><div class="rowb"><span class="lbl">${esc(t('Learn Tally'))}</span><span class="fine num">${p.n}/${p.total}</span></div>${meter(p)}
    <div class="lm">${chip(p.next)}<span class="grow"><b>${esc(title)}</b><small>${esc(why)}</small></span></div>
    <div class="row2"><button class="btn small" data-act="learn-go" data-id="${p.next.id}">${esc(t('Show me'))}</button><button class="btn small ghost" data-act="go" data-to="learn">${esc(t('All missions'))}</button></div>
    <button class="link lhide" data-act="learn-hide">${esc(t('Not now'))}</button></section>`;
}
/** Home, when streaks are on: the streak, and a way to count a day with nothing spent. */
export function streakHome() {
  if (!gameOn()) return '';
  const st = myStreak();
  const sub = [st.loggedToday ? t('Logged today') : st.streak ? t('Add something today to keep it going') : t('Add what you spend today, or mark a day with nothing spent'),
    st.best > st.streak && t('Best: {0} days', st.best), st.rest && t('Rest day used this week')].filter(Boolean).join(' · ');
  return `<section class="streak"><a href="#/badges" class="streak-go">${ICON.flame}<span class="grow"><b>${esc(st.streak ? t('{0}-day logging streak', st.streak) : t('Start a logging streak'))}</b><small>${esc(sub)}</small></span></a>
    ${st.loggedToday ? '' : `<button class="btn small ghost" data-act="no-spend">${esc(t('Nothing spent today'))}</button>`}</section>`;
}
export function settingsCard() {
  const p = progress(data()), on = gameOn();
  return `<section class="card" id="learn"><h2>${esc(t('Learn Tally'))}</h2>
    <button class="txrow" data-act="go" data-to="learn"><span class="lic">${ICON.sparkles}</span><span class="grow"><b>${esc(t('{0} of {1} missions done', p.n, p.total))}</b><small>${esc(t('Short missions that show what Tally can do. Each ticks itself off when you do it.'))}</small></span><span class="flip chev">${ICON.back}</span></button>
    ${meter(p)}
    <label class="toggle"><span class="grow"><b>${esc(t('Streaks and badges'))}</b><small>${esc(t('A logging streak and badges for good money habits. Off unless you turn it on.'))}</small></span><input type="checkbox" class="switch" role="switch" data-input="gamify"${on ? ' checked' : ''}></label>
    ${on ? `<button class="btn ghost wide" data-act="go" data-to="badges">${ICON.award}${esc(t('See your streak and badges'))}</button>` : ''}</section>`;
}

// ---- screens -----------------------------------------------------------------------------------------------------
const head = title => `<header class="top"><button class="icon-btn" data-act="back" data-to="settings" aria-label="${esc(t('Back'))}">${ICON.back}</button><h1>${esc(title)}</h1><span></span></header>`;
export const learnView = {
  title: 'Learn Tally',
  render() {
    const p = progress(data()), s = settings();
    return `${head(t('Learn Tally'))}
      <section class="card"><div class="rowb"><b>${esc(t('{0} of {1} missions done', p.n, p.total))}</b>${p.all ? `<span class="pill good">${esc(t('All done'))}</span>` : ''}</div>${meter(p)}
        <p class="fine">${esc(t('Each mission shows one thing Tally can do. Do it once and it ticks itself off. What you did before this list existed counts too.'))}</p></section>
      <ul class="card learnlist">${p.list.map(m => {
        const done = p.done.has(m.id), [title, why] = TEXT[m.id]();
        return `<li class="${done ? 'done' : ''}">${chip(m, done)}<span class="grow"><b>${esc(title)}</b><small>${esc(why)}</small></span><button class="btn small${m === p.next ? '' : ' ghost'}" data-act="learn-go" data-id="${m.id}" aria-label="${esc(`${t('Show me')}: ${title}`)}">${esc(t('Show me'))}</button></li>`;
      }).join('')}</ul>
      ${p.all ? '' : s.learnHidden ? `<button class="btn ghost wide" data-act="learn-unhide">${esc(t('Show the next mission on Home'))}</button>` : `<button class="btn ghost wide" data-act="learn-hide">${esc(t('Hide from Home'))}</button>`}`;
  },
};

const weekday = iso => new Intl.DateTimeFormat(getLang() === 'zh' ? 'zh-CN' : getLang(), { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const plusDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const badgesView = {
  title: 'Streaks and badges',
  render() {
    if (!gameOn()) return `${head(t('Streaks and badges'))}<section class="card center">${ICON.award}<p>${esc(t('Streaks and badges are off. Turn them on for a logging streak and badges for good money habits.'))}</p>
      <button class="btn" data-act="gamify-on">${esc(t('Turn on'))}</button></section>`;
    const tdy = today(), st = myStreak(), days = loggedDays(S.tx, settings().noSpend || [], settings().myName || ''), got = earned(game());
    const mon = plusDays(tdy, -((new Date(`${tdy}T00:00:00Z`).getUTCDay() + 6) % 7));
    const week = Array.from({ length: 7 }, (_, i) => plusDays(mon, i)).map(d => {
      const k = days.has(d) ? 'logged' : d === st.rest ? 'rest' : d > tdy ? 'later' : d === tdy ? 'now' : 'missed';
      const word = { logged: t('logged'), rest: t('rest day'), later: '', now: t('today'), missed: t('not logged') }[k];
      return `<li class="${k}"><span aria-hidden="true">${esc(weekday(d))}</span><i aria-hidden="true">${k === 'logged' ? ICON.check : ''}</i><span class="sr">${esc(fmtDate(d))}${word ? `: ${esc(word)}` : ''}</span></li>`;
    }).join('');
    const n = Object.keys(got).length;
    return `${head(t('Streaks and badges'))}
      <section class="card streakcard"><div class="sbig">${ICON.flame}<span class="grow"><span class="lbl">${esc(t('Logging streak'))}</span><b class="num">${st.streak}</b><small>${esc(st.streak === 1 ? t('day') : t('days'))}${st.best ? ` · ${esc(t('Best: {0} days', st.best))}` : ''}</small></span></div>
        <ol class="week" aria-label="${esc(t('This week'))}">${week}</ol>
        <p class="fine">${esc(st.rest ? t('Rest day used this week. Another missed day starts the streak again.') : t('One rest day a week: missing a single day will not break your streak.'))}</p>
        ${st.loggedToday ? '' : `<button class="btn ghost wide" data-act="no-spend">${ICON.leaf}${esc(t('Nothing spent today'))}</button>`}</section>
      <div class="rowb"><h2>${esc(t('Badges'))}</h2><span class="fine num">${n}/${BADGES.length}</span></div>
      <ul class="badges">${BADGES.map(b => {
        const d = got[b.id], [name, about] = BTEXT[b.id]();
        return `<li class="${d ? 'got' : ''}"><span class="medal">${ICON[b.icon]}</span><span class="grow"><b>${esc(name)}</b><small>${esc(about)}</small><small class="when">${esc(d ? t('Earned {0}', fmtDate(d, { year: d.slice(0, 4) !== tdy.slice(0, 4) })) : t('Not yet'))}</small></span></li>`;
      }).join('')}</ul>
      <p class="fine">${esc(t('A streak counts the days you add something yourself: a receipt, an entry, or a tap on Nothing spent today. Imports and bills that add themselves do not count, and nothing here rewards spending.'))}</p>`;
  },
};

// ---- ticking missions off, and badges earned --------------------------------------------------------------------
/** Waits for a toast already on screen (never covers an Undo), then shows this one. */
const quiet = (fn, n = 0) => { const el = document.getElementById('toast'); if (el?.classList.contains('on') && (n < 4 || el.classList.contains('has-undo'))) return setTimeout(() => quiet(fn, n + 1), 1500); fn(); };
const redraw = () => { if (['home', 'learn', 'settings'].includes(route()) && !sheetOpen() && !document.activeElement?.matches('input, textarea, select')) render(); };
async function tick(ids) {
  const got = { ...(settings().learn || {}) }, add = ids.filter(id => !got[id]);
  if (!add.length) return;
  for (const id of add) got[id] = today();
  await setSetting('learn', got);
  const p = progress(data()), shown = add.filter(id => p.list.some(m => m.id === id));
  if (!shown.length) return;
  redraw();
  quiet(() => toast(p.all ? t('All {0} missions done. You know Tally inside out.', p.total) : t('Learned: {0} · {1} of {2}', TEXT[shown[0]]()[0], p.n, p.total), { k: 'good', icon: 'check' }));
}
async function celebrate() {
  const seen = new Set(settings().badgesSeen || []), fresh = Object.keys(earned(game())).filter(id => !seen.has(id));
  if (!fresh.length) return;
  await setSetting('badgesSeen', [...seen, ...fresh]);
  const names = fresh.map(id => BTEXT[id]()[0]);
  quiet(() => {
    toast(names.length === 1 ? t('New badge: {0}', names[0]) : t('New badges: {0}', names.join(', ')), { k: 'good', icon: 'award' });
    const el = document.getElementById('toast');   // a small shine on the toast; none with reduced motion (CSS)
    el?.classList.remove('cheer'); void el?.offsetWidth; el?.classList.add('cheer');
  });
}
let checkT = null, tableIO = null;
/** What the data already shows is ticked without a toast: on the first start with this list, and after a restore. */
export async function tickQuietly() {
  const got = settings().learn || {}, fresh = doneByData(data()).filter(id => !got[id]);
  if (fresh.length || !settings().learn) await setSetting('learn', { ...got, ...Object.fromEntries(fresh.map(id => [id, today()])) });
}
async function check() {
  if (!S.accounts.length && !settings().learn) return;
  if (!settings().learn) { await tickQuietly(); redraw(); }
  else await tick(doneByData(data()));
  if (gameOn()) await celebrate();
}
/** After every screen, tap or field: look for missions done and badges earned (a moment later, once saves are in). */
const soon = () => { clearTimeout(checkT); checkT = setTimeout(() => check().catch(console.error), 600); };
export function afterRender() {
  soon();
  tableIO?.disconnect(); tableIO = null;
  const tbl = route() === 'insights' && !settings().learn?.table && document.querySelector('.tablewrap');
  if (tbl && 'IntersectionObserver' in window) {
    tableIO = new IntersectionObserver(([e]) => { if (e.isIntersecting && !sheetOpen()) { tableIO?.disconnect(); noticed('see:table'); } }, { threshold: 0.6 });
    tableIO.observe(tbl);
  }
}
/** A tap (act:name), a field (input:name:key) or a sighting (see:name) that completes a mission with no data to show it. */
export function noticed(what) {
  const id = missionFor(what, data());
  if (id) setTimeout(() => tick([id]).catch(console.error), 350);
  soon();
}

// ---- "Show me": the screen where it happens, with the control pointed at ------------------------------------------
function spot(sel, r, tries = 0) {
  const el = (!r || document.querySelector(`main.view-${r}`)) && (document.querySelector(`.scrim:not(.out) ${sel}`) || document.querySelector(sel));
  if (!el) { if (tries < 15) setTimeout(() => spot(sel, r, tries + 1), 150); return; }
  const box = el.closest('.segs, .rmin, .tablewrap') || el;
  box.classList.add('learn-spot');
  box.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  setTimeout(() => box.classList.remove('learn-spot'), 4200);
}
const at = (r, sel) => () => { go(r); spot(sel, r); };
const SHOW = {
  scan: at('home', '.fab'),
  fixcat: async () => {
    const x = [...S.tx].sort((a, b) => b.createdAt - a.createdAt).find(y => y.source === 'receipt' && y.items?.length);
    if (!x) { toast(t('Scan a receipt first: its items come with a category you can change.')); return at('home', '.fab')(); }
    if (!S.kv.reviewDraft) (await import('./review.js')).editExisting(x); else go('review');   // never over a receipt being checked
    spot('.icat', 'review');
  },
  split: async () => { (await import('./money.js')).openTxSheet(); spot('[data-act="tx-split"]'); },
  hand: at('home', '[data-act="tx-new"]'),
  budget: at('budgets', '[data-cat="total"]'),
  bill: at('budgets', 'button.wide[data-act="bill-edit"]'),
  table: at('insights', '.tablewrap'),
  lang: at('settings', '[data-act="set-lang"]'),
  backup: at('settings', '#backup [data-act="backup"]'),
  import: at('settings', '[data-act="import-open"]'),
  lock: at('settings', '[data-act="lock-set"]'),
  joint: at('settings', '[data-act="joint-share"]'),
};

async function gamify(on) {
  if (on) {
    const n = Object.keys(earned(game()));
    await setSetting('badgesSeen', n);   // badges already earned are shown, not celebrated one by one
    await setSetting('gamify', true);
    toast(n.length > 1 ? t('Streaks and badges are on. You already have {0} badges.', n.length) : n.length ? t('Streaks and badges are on. You already have 1 badge.') : t('Streaks and badges are on.'), { k: 'good', icon: 'award' });
  } else { await setSetting('gamify', false); toast(t('Streaks and badges are off.')); }
  render();
}
export const act = {
  'learn-go': b => SHOW[b.dataset.id]?.(),
  'learn-hide': async () => { await setSetting('learnHidden', true); render(); toast(t('Hidden. Find it any time in Settings → Learn Tally.')); },
  'learn-unhide': async () => { await setSetting('learnHidden', false); render(); toast(t('The next mission shows on Home.')); },
  'gamify-on': () => gamify(true),
  'no-spend': async () => {
    const d = today();
    await setSetting('noSpend', [...(settings().noSpend || []).filter(x => x !== d), d].slice(-400));
    render(); toast(t('Marked: nothing spent today. Your streak keeps going.'), { k: 'good', icon: 'check' });
  },
};
export const input = { gamify: el => gamify(el.checked) };
