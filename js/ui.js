// Shared UI helpers: escaping, charts, sheets, toasts, icons. Sheets, toasts and charts adapted from we go gim.
import { t, fmtDate } from './i18n.js';
import { fmtRM, parseAmount, calcAmount } from './engine.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** table[key] for the table's own keys only: a route or action named "constructor" finds nothing. */
export const own = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined);
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

// ---- charts (SVG, colours from CSS tokens so both themes work) -----------------------------------------
function niceTicks(a, b, n) {
  const span = b - a || 1, raw = span / n, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => span / s <= n + 1) || mag * 10;
  const out = [];
  for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(v);
  return out;
}
const short = sen => { const r = sen / 100; return Math.abs(r) >= 1000 ? `${+(r / 1000).toFixed(1)}k` : `${Math.round(r)}`; };
/** Area line over dates. series: [{date, v (sen)}]. goal: a flat line (budget). */
export function lineChart(series, { goal = null, height = 160, label = 'chart', k = 'accent' } = {}) {
  if (!series.length) return `<p class="fine">${esc(t('Not enough data yet.'))}</p>`;
  const W = 340, H = height, L = 40, R = 16, T = 18, B = 22;
  const ts = series.map(p => Date.parse(p.date)), t0 = Math.min(...ts), span = Math.max(...ts) - t0 || 1;
  let vs = series.map(p => p.v); if (goal != null) vs = vs.concat(goal);
  let y0 = Math.min(0, ...vs), y1 = Math.max(...vs); const pad = (y1 - y0) * 0.1 || 100; y1 += pad;
  const X = ms => (series.length === 1 ? (L + W - R) / 2 : L + (ms - t0) / span * (W - L - R));
  const Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  let g = '';
  for (const v of niceTicks(y0, y1, 3)) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--mute)">${short(v)}</text>`;
  if (goal != null) g += `<line x1="${L}" x2="${W - R}" y1="${Y(goal).toFixed(1)}" y2="${Y(goal).toFixed(1)}" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${W - R}" y="${(Y(goal) - 5).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--warn)">${esc(t('Budget'))} ${short(goal)}</text>`;
  const pts = series.map(p => [X(Date.parse(p.date)), Y(p.v)]);
  const line = pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  if (pts.length > 1) g += `<polygon points="${pts[0][0].toFixed(1)},${(H - B).toFixed(1)} ${line} ${pts.at(-1)[0].toFixed(1)},${(H - B).toFixed(1)}" fill="var(--${k})" opacity=".14"/><polyline points="${line}" fill="none" stroke="var(--${k})" stroke-width="2.5" stroke-linejoin="round"/>`;
  pts.forEach((p, i) => { g += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 4.5 : 2.5}" fill="var(--${k})"><title>${esc(fmtDate(series[i].date))}: ${esc(fmtRM(series[i].v))}</title></circle>`; });
  const lp = pts.at(-1);
  g += `<text class="endlabel" x="${Math.min(lp[0], W - R)}" y="${Math.max(12, lp[1] - 9).toFixed(1)}" text-anchor="end" font-size="12" font-weight="700" fill="var(--ink)">${esc(fmtRM(series.at(-1).v))}</text>`;
  g += `<text x="${L}" y="${H - 5}" font-size="11" fill="var(--mute)">${esc(fmtDate(series[0].date))}</text>`;
  if (series.length > 1) g += `<text x="${W - R}" y="${H - 5}" text-anchor="end" font-size="11" fill="var(--mute)">${esc(fmtDate(series.at(-1).date))}</text>`;
  return `<svg class="chartsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}</svg>`;
}
/** Grouped bars: data [{label, a, b}] (sen), two series with names and colour tokens. */
export function pairBars(data, { names = ['a', 'b'], ks = ['chart-good', 'chart-bad'], height = 150, label = 'chart' } = {}) {
  const W = 340, H = height, L = 8, R = 8, T = 18, B = 22;
  const mx = Math.max(1, ...data.flatMap(d => [d.a, d.b])), bw = (W - L - R) / data.length;
  let g = `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="var(--line)"/>`; // empty months read as zero
  data.forEach((d, i) => {
    [d.a, d.b].forEach((v, j) => {
      const h = v / mx * (H - T - B), w = bw * 0.32, x = L + i * bw + bw * 0.16 + j * w, y = H - B - h;
      g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="2" fill="var(--${ks[j]})"><title>${esc(d.label)} · ${esc(names[j])}: ${esc(fmtRM(v))}</title></rect>`;
    });
    g += `<text x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--mute)">${esc(d.label)}</text>`;
  });
  return `<svg class="chartsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}</svg>`;
}
/** Donut from [{name, color, v}], at most 5 slices (the rest become "Other"). Always shown with a labelled list. */
export function donut(parts, center) {
  const sorted = [...parts].filter(p => p.v > 0).sort((a, b) => b.v - a.v);
  const top = sorted.slice(0, 5), rest = sorted.slice(5).reduce((s, p) => s + p.v, 0);
  if (rest) top.push({ name: t('Other'), color: '#64748B', v: rest });
  const total = top.reduce((s, p) => s + p.v, 0) || 1;
  let at = 0;
  const stops = top.map(p => { const a = at; at += p.v / total * 100; return `${p.color} ${a.toFixed(2)}% ${at.toFixed(2)}%`; }).join(',');
  return { slices: top, html: `<div class="donut" style="background:conic-gradient(${stops || 'var(--line) 0 100%'})" aria-hidden="true"><div>${center}</div></div>` };
}

// ---- sheets & toasts (from we go gim) ------------------------------------------------------------
let sheetClose = null, staleHref = null;
export function openSheet(html, { onClose, label = 'Dialog' } = {}) {
  closeSheet();
  const opener = document.activeElement, app = document.getElementById('app');
  const wrap = document.createElement('div');
  wrap.className = 'scrim';
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1"><div class="grab" aria-hidden="true"></div>${html}</div>`;
  document.body.appendChild(wrap);
  app?.setAttribute('inert', '');
  const sheet = wrap.querySelector('.sheet');
  wrap.addEventListener('click', e => { if (e.target === wrap) closeSheet(); });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    if (e.key === 'Tab') {
      const f = [...sheet.querySelectorAll('button:not([disabled]), a[href], input, select, textarea')].filter(x => !x.hidden && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  });
  if (!history.state?.sheet) history.pushState({ sheet: true }, ''); // Android back closes the sheet
  sheetClose = () => {
    sheetClose = null;
    wrap.classList.add('out'); wrap.style.pointerEvents = 'none';   // exit animation, then gone
    setTimeout(() => wrap.remove(), 200);
    staleHref = history.state?.sheet ? location.href : null;
    app?.removeAttribute('inert');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    onClose?.();
  };
  const f = sheet.querySelector('[autofocus]') || sheet.querySelector('input, select, textarea, button');
  setTimeout(() => (f || sheet).focus({ preventScroll: true }), 30);
  return sheet;
}
export function closeSheet() { sheetClose?.(); }
export const sheetOpen = () => !!sheetClose;
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (sheetClose) { sheetClose(); staleHref = null; return; }
    const skip = staleHref && location.href === staleHref; staleHref = null;
    if (skip) history.back();
  });
  window.addEventListener('hashchange', () => { staleHref = null; });
}
/** In-app confirmation (never window.confirm). Resolves true / false. */
export function confirmSheet({ title, body = '', ok = t('Confirm'), danger = false }) {
  return new Promise(resolve => {
    let done = false;
    const el = openSheet(`<h2 class="sh-title">${esc(title)}</h2>${body ? `<p class="sh-body">${esc(body)}</p>` : ''}
      <div class="row2"><button class="btn ghost" data-x="no">${esc(t('Cancel'))}</button><button class="btn ${danger ? 'danger' : ''}" data-x="yes">${esc(ok)}</button></div>`,
    { label: title, onClose: () => { if (!done) resolve(false); } });
    el.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (!b) return; done = true; resolve(b.dataset.x === 'yes'); closeSheet(); });
  });
}
let toastT;
/** Short message in a live region; optional Undo. */
export function toast(msg, { undo = null, k = 'ink', icon = null } = {}) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.textContent = msg;
  if (icon) el.insertAdjacentHTML('afterbegin', ICON[icon] || '');
  el.classList.toggle('has-undo', !!undo);
  el.style.setProperty('--k', `var(--${k})`);
  if (undo) {
    const b = document.createElement('button');
    b.className = 'tundo'; b.type = 'button'; b.textContent = t('Undo');
    b.addEventListener('click', () => { hideToast(); undo(); });
    el.append(' ', b);
  }
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(hideToast, undo ? 12000 : Math.min(7000, Math.max(2600, String(msg).length * 55)));
}
export function hideToast() { const el = $('#toast'); if (el) { el.classList.remove('on'); setTimeout(() => { if (!el.classList.contains('on')) el.textContent = ''; }, 250); } }
export function announce(msg) { const el = $('#sr-status'); if (!el) return; el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 60); }

// ---- calculator in amount fields -------------------------------------------------------------------------------------
// Any amount field takes a sum ("12.50+8*2"): phone number pads have no + or ×, so on touch screens a bar of
// operators sits above the keyboard while one is focused and shows the result; leaving the field puts the result in it.
if (typeof document !== 'undefined') {
  const touch = matchMedia('(pointer: coarse)');
  const AMT = 'input[inputmode=decimal]:not([readonly])';
  const bar = Object.assign(document.createElement('div'), { className: 'calcbar', hidden: true });
  bar.innerHTML = `${['+', '−', '×', '÷', '(', ')'].map(o => `<button type="button" tabindex="-1" data-op="${o}">${o}</button>`).join('')}<output aria-live="polite"></output>`;
  document.body.append(bar);
  let field = null;
  const isSum = v => parseAmount(v) == null && calcAmount(v) != null;
  const place = () => { const v = window.visualViewport; bar.style.top = `${(v ? v.offsetTop + v.height : innerHeight) - bar.offsetHeight}px`; };
  const show = () => { bar.querySelector('output').textContent = field && isSum(field.value) ? `= ${fmtRM(calcAmount(field.value), { plain: true })}` : ''; };
  // The room left for the bar goes a moment later, so the tap that left the field (on Save) lands where it aimed.
  const hide = () => { field = null; bar.hidden = true; setTimeout(() => field || document.body.classList.remove('calc-on'), 400); };
  document.addEventListener('focusin', e => {
    if (!e.target.matches?.(AMT)) return hide();
    field = e.target;
    if (touch.matches) { bar.hidden = false; document.body.classList.add('calc-on'); place(); show(); }
  });
  document.addEventListener('focusout', e => {
    if (e.target !== field) return;
    if (isSum(field.value)) { field.value = (calcAmount(field.value) / 100).toFixed(2); field.dispatchEvent(new Event('input', { bubbles: true })); }
    hide();
  });
  document.addEventListener('input', e => { if (e.target === field) show(); });
  document.addEventListener('pointerdown', () => { if (field && !field.isConnected) hide(); }, true);
  bar.addEventListener('pointerdown', e => e.preventDefault());   // keep the field focused and the keyboard up
  bar.addEventListener('click', e => {
    const op = e.target.closest('[data-op]')?.dataset.op; if (!op || !field) return;
    field.setRangeText(op, field.selectionStart ?? field.value.length, field.selectionEnd ?? field.value.length, 'end');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  window.visualViewport?.addEventListener('resize', () => field && place());
  window.visualViewport?.addEventListener('scroll', () => field && place());
}

// ---- icons (24px line icons; decorative, controls carry their own labels) ------------------------------
const I = d => `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICON = {
  home: I('<path d="M3 11l9-7 9 7v9H3z"/>'),
  list: I('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  camera: I('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  chart: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  wallet: I('<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>'),
  gear: I('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  sparkles: I('<path d="M9.94 14.06 7 21l-2.94-6.94L-2.88 11.1 4.06 8.16 7 1.22l2.94 6.94 6.94 2.94z" transform="translate(4 1) scale(.8)"/><path d="M19 3v4M17 5h4"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  x: I('<path d="M6 6l12 12M18 6L6 18"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  alert: I('<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.5"/>'),
  bell: I('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  upload: I('<path d="M12 15V4M7 9l5-5 5 5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>'),
  download: I('<path d="M12 4v11M7 10l5 5 5-5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  clock: I('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/>'),
  check: I('<path d="M5 12l5 5 9-10"/>'),
  chat: I('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  swap: I('<path d="M7 7h13l-3-3M17 17H4l3 3"/>'),
  receipt: I('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
  lock: I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  globe: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  users: I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>'),
  flame: I('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
  award: I('<circle cx="12" cy="9" r="6"/><path d="M15.5 13.8 17 22l-5-3-5 3 1.5-8.2"/>'),
  calendar: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>'),
  leaf: I('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6 2.4-.5 4.9-2 5.9-3"/>'),
  down: I('<path d="M22 17l-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>'),
};
