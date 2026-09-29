// Split a bill with friends: tap a person, tap what they had; anything left untapped is shared by everyone. Tax, service
// charge and rounding are spread over the items first (as in Insights), so the shares add up to what was paid, to the sen.
// The result goes out as a picture or as text (WhatsApp); nothing is saved except the names, for next time.
import { settings, setSetting, cat } from '../state.js';
import { t, fmtDate } from '../i18n.js';
import { esc, ICON, openSheet, toast } from '../ui.js';
import { fmtRM, allocate } from '../engine.js';
import { download, shareFile } from '../io.js';

/** items [{name, cents}], total (sen), who: [[person ids] per item, empty = everyone], people [ids] → {id: sen}. */
export function splitBill(items, total, who, people) {
  const extra = allocate(items.map(i => i.cents), total - items.reduce((s, i) => s + i.cents, 0));
  const owe = Object.fromEntries(people.map(p => [p, 0]));
  items.forEach((it, n) => {
    const by = who[n]?.length ? who[n].filter(p => p in owe) : people, cost = it.cents + extra[n];
    if (!by.length) return;
    const each = Math.trunc(cost / by.length);
    allocate(by.map(() => 1), cost - by.length * each).forEach((r, k) => { owe[by[k]] += each + r; });
  });
  return owe;
}

const ME = '__me';
export function openSplit(tx) {
  const items = tx.items?.length ? tx.items.map(i => ({ name: i.name || t(cat(i.category).name), cents: i.cents })) : [{ name: tx.merchant || t(cat(tx.category).name), cents: tx.amount }];
  const people = [ME, ...(settings().friends || []).slice(0, 3)], who = items.map(() => []);
  let current = people[1] || ME;
  const name = p => (p === ME ? t('Me') : p);
  const body = () => {
    const owe = splitBill(items, tx.amount, who, people);
    return `<div class="chips" role="group" aria-label="${esc(t('Who'))}">${people.map(p => `<button type="button" class="chip${p === current ? ' on' : ''}" data-p="${esc(p)}" aria-pressed="${p === current}">${esc(name(p))}</button>`).join('')}
      <input id="sp-new" class="chip sp-new" maxlength="20" placeholder="${esc(t('+ Name'))}" aria-label="${esc(t('Add a person'))}" autocomplete="off"></div>
      <p class="fine">${esc(t('Tap a person, then what they had. Anything not tapped is shared by everyone.'))}</p>
      <ul class="relief sp-items">${items.map((it, n) => `<li><button type="button" class="rbtn${who[n].includes(current) ? ' on' : ''}" data-i="${n}" aria-pressed="${who[n].includes(current)}"><span class="rowb"><b>${esc(it.name)}</b><span class="num">${esc(fmtRM(it.cents))}</span></span>
        <small>${esc(who[n].length ? who[n].map(name).join(', ') : t('Everyone'))}</small></button></li>`).join('')}</ul>
      <ul class="list sp-sum">${people.map(p => `<li class="rowb"><span>${esc(name(p))}</span><b class="num">${esc(fmtRM(owe[p]))}</b></li>`).join('')}</ul>`;
  };
  const el = openSheet(`<h2 class="sh-title">${esc(t('Split with friends'))}</h2><p class="fine">${esc(`${tx.merchant || ''} · ${fmtDate(tx.date)} · ${fmtRM(tx.amount)}`)}</p>
    <div class="sp-body">${body()}</div>
    <div class="row2 sheetfoot"><button class="btn ghost" data-x="text">${esc(t('Copy text'))}</button><button class="btn" data-x="img">${esc(t('Share picture'))}</button></div>`, { label: t('Split with friends') });
  const redraw = () => { el.querySelector('.sp-body').innerHTML = body(); };
  const addPerson = async v => {
    v = v.trim().slice(0, 20); if (!v || people.includes(v) || people.length >= 8) return;
    people.push(v); current = v;
    await setSetting('friends', [v, ...(settings().friends || []).filter(x => x !== v)].slice(0, 12));   // remembered for next time
    redraw(); el.querySelector('#sp-new')?.focus();
  };
  el.addEventListener('keydown', e => { if (e.target.id === 'sp-new' && e.key === 'Enter') { e.preventDefault(); addPerson(e.target.value); } });
  el.addEventListener('change', e => { if (e.target.id === 'sp-new') addPerson(e.target.value); });
  el.addEventListener('click', async e => {
    const pb = e.target.closest('[data-p]'), ib = e.target.closest('[data-i]'), x = e.target.closest('[data-x]')?.dataset.x;
    if (pb) { current = pb.dataset.p; redraw(); return; }
    if (ib) { const w = who[+ib.dataset.i], k = w.indexOf(current); if (k < 0) w.push(current); else w.splice(k, 1); redraw(); return; }
    if (!x) return;
    const owe = splitBill(items, tx.amount, who, people);
    if (x === 'text') {
      const text = [`${tx.merchant || t('Bill')} · ${fmtDate(tx.date)} · ${fmtRM(tx.amount)}`, ...people.map(p => `${name(p)}: ${fmtRM(owe[p])}`)].join('\n');
      try { await navigator.clipboard.writeText(text); toast(t('Copied. Paste it in your chat.'), { k: 'good', icon: 'check' }); } catch { toast(text); }
    }
    if (x === 'img') {
      const blob = await picture(tx, items, who, people, owe, name), file = `tally-split-${tx.date}.png`;
      try { if (!(await shareFile(file, blob, 'image/png'))) download(file, blob, 'image/png'); } catch (err) { if (err?.name !== 'AbortError') download(file, blob, 'image/png'); }
    }
  });
}

/** The split as a picture to send: the bill, then each person with what they had and what they owe. */
function picture(tx, items, who, people, owe, name) {
  const W = 720, pad = 40, lh = 36;
  const c = Object.assign(document.createElement('canvas'), { width: W, height: pad + (people.length * 2 + 2) * lh + 24 }), g = c.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height);
  let y = pad + 16;
  const line = (left, right, { size = 24, weight = 400, color = '#0F172A' } = {}) => {
    g.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`; g.fillStyle = color; g.textAlign = 'left';
    g.fillText(left.length > 40 ? `${left.slice(0, 39)}…` : left, pad, y);
    if (right) { g.textAlign = 'right'; g.fillText(right, W - pad, y); }
    y += lh;
  };
  line(`${tx.merchant || t('Bill')} · ${fmtDate(tx.date, { year: true })}`, fmtRM(tx.amount), { size: 28, weight: 700 });
  y += 8;
  for (const p of people) {
    line(name(p), fmtRM(owe[p]), { size: 26, weight: 700, color: '#1E40AF' });
    line(items.filter((_, n) => (who[n].length ? who[n] : people).includes(p)).map(i => i.name).join(', ') || t('Nothing'), '', { size: 20, color: '#55607A' });
  }
  line(t('Split with Tally · tallymy.github.io'), '', { size: 18, color: '#8A94A8' });
  return new Promise(r => c.toBlob(r, 'image/png'));
}
