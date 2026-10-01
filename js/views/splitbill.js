// Split a bill with friends: tap a person, tap what they had; anything left untapped is shared by everyone. Tax, service
// charge and rounding are spread over the items first (as in Insights), so the shares add up to what was paid, to the sen.
// The result goes out as a picture or as text (WhatsApp), and "Save my share" records it: the bill becomes my share, the
// friends' shares money owed (engine OWING_KINDS). The names are remembered for next time.
import { S, settings, setSetting, cat, putAll, uid, today as todayIso } from '../state.js';
import { t, fmtDate } from '../i18n.js';
import { esc, openSheet, closeSheet, toast } from '../ui.js';
import { fmtRM, allocate, isFx } from '../engine.js';
import { typedShift } from '../io.js';
import { send, caption } from '../share.js';

/** splitBill, and what each person had of each item: {owe: {id: sen}, parts: {id: [sen per item]}}, parts summing to owe. */
export function splitShares(items, total, who, people) {
  const extra = allocate(items.map(i => i.cents), total - items.reduce((s, i) => s + i.cents, 0));
  const owe = Object.fromEntries(people.map(p => [p, 0])), parts = Object.fromEntries(people.map(p => [p, items.map(() => 0)]));
  items.forEach((it, n) => {
    const by = who[n]?.length ? who[n].filter(p => p in owe) : people, cost = it.cents + extra[n];
    if (!by.length) return;
    const each = Math.trunc(cost / by.length);
    // The odd sen of each item starts one person further along, so over a long receipt it isn't always the same one's.
    allocate(by.map(() => 1), cost - by.length * each).forEach((r, k) => { const p = by[(k + n) % by.length]; owe[p] += each + r; parts[p][n] += each + r; });
  });
  return { owe, parts };
}
/** items [{name, cents}], total (sen), who: [[person ids] per item, empty = everyone], people [ids] → {id: sen}. */
export const splitBill = (items, total, who, people) => splitShares(items, total, who, people).owe;

export const ME = '__me';
/** A split entry as it was before the split (to split it again): what was paid, its items, the account that paid. */
export function original(tx) {
  if (!tx.split) return tx;
  const { split, owedTo, items, ...o } = tx;
  return { ...o, amount: split.total, ...(split.acc ? { accountId: split.acc } : {}), ...(split.items ? { items: split.items } : {}) };
}
/** The lines the sheet splits: the receipt's items, or the payment as one. */
const linesOf = o => (o.items?.length ? o.items.map(i => ({ name: i.name || t(cat(i.category).name), cents: i.cents })) : [{ name: o.merchant || t(cat(o.category).name), cents: o.amount }]);
const OWING_NAME = { owedme: 'Owed to you', iowe: 'You owe' };
/**
 * "Save my share" as one write for putAll ({accounts, tx, del}). The bill becomes my share: its amount, and my part of
 * each item (the ones I had none of left out), so spending and reliefs count only mine. I paid: each friend's share is a
 * transfer from the paying account to Owed to you, so that account's balance doesn't move. A friend paid: my share is
 * owed to them (the bill moves to You owe; the others settle with them). Split again: the old shares go first.
 */
export function splitRows({ tx, people, who, paidBy = ME, shop = tx.merchant || '', accounts = S.accounts, txs = S.tx, today = todayIso(), now = Date.now() }) {
  const o = original(tx), { owe, parts } = splitShares(linesOf(o), o.amount, who, people), friends = people.filter(p => p !== ME);
  const made = [], acct = kind => accounts.find(a => a.kind === kind) || made.find(a => a.kind === kind)
    || made[made.push({ id: uid('a'), name: OWING_NAME[kind], kind, opening: 0, createdAt: now, updatedAt: now }) - 1];   // never `typed`: no balance to keep
  const mine = o.items?.length ? o.items.map(({ qty, unit, ...i }, n) => ({ ...i, cents: parts[ME][n] })).filter(i => i.cents) : [];
  const { items, owedTo, split, ...base } = o, friendPaid = paidBy !== ME;
  const bill = { ...base, amount: owe[ME], ...(mine.length ? { items: mine } : {}),
    split: { total: o.amount, with: friends, who: who.map(w => w.map(p => (p === ME ? '' : p))), ...(items?.length ? { items } : {}), ...(friendPaid ? { acc: o.accountId } : {}) },
    ...(friendPaid ? { accountId: acct('iowe').id, owedTo: paidBy } : {}) };
  const shares = friendPaid ? [] : friends.filter(f => owe[f] > 0).map(f => ({ id: uid('t'), type: 'transfer', date: o.date, ...(o.time ? { time: o.time } : {}), amount: owe[f],
    accountId: o.accountId, toAccountId: acct('owedme').id, category: 'other', merchant: `${f} · ${shop}`.slice(0, 80), owedBy: f, splitOf: o.id, source: 'quick', createdAt: now }));
  // A balance typed today already holds the back-dated entries (state keepToday): an account's starting balance moves by
  // what this changes in it before that day, in the same write. Paid by me, it nets to nothing.
  const old = txs.filter(x => x.splitOf === tx.id), rest = txs.filter(x => x.id !== tx.id && x.splitOf !== tx.id), typed = accounts.filter(a => a.typed);
  const was = typedShift(typed, rest, [tx, ...old], today), is = typedShift(typed, rest, [bill, ...shares], today);
  const moved = typed.filter(a => (is[a.id] || 0) !== (was[a.id] || 0)).map(a => ({ ...a, opening: (a.opening || 0) + (is[a.id] || 0) - (was[a.id] || 0), updatedAt: now }));
  return { accounts: [...made, ...moved], tx: [bill, ...shares], del: { tx: old.map(x => x.id) } };
}
/** splitRows, written all or nothing. */
export const saveSplit = o => putAll({ ...splitRows(o), edit: true });

export function openSplit(tx) {
  const o = original(tx), items = linesOf(o), sp = tx.split;
  // Split before: the same people, who had what and who paid, to change and save again.
  const people = sp ? [ME, ...sp.with] : [ME, ...(settings().friends || []).slice(0, 3)];
  const who = items.map((_, n) => (sp?.who?.[n] || []).map(p => (p === '' ? ME : p)).filter(p => people.includes(p)));
  let current = people[1] || ME, paidBy = people.includes(tx.owedTo) ? tx.owedTo : ME;
  const name = p => (p === ME ? t('Me') : p);
  const chip = (p, on, data) => `<button type="button" class="chip${on ? ' on' : ''}" ${data}="${esc(p)}" aria-pressed="${on}">${esc(name(p))}</button>`;
  const body = () => {
    const owe = splitBill(items, o.amount, who, people), others = o.amount - owe[ME];
    return `<div class="chips" role="group" aria-label="${esc(t('Who'))}">${people.map(p => chip(p, p === current, 'data-p')).join('')}
      <input id="sp-new" class="chip sp-new" maxlength="20" placeholder="${esc(t('+ Name'))}" aria-label="${esc(t('Add a person'))}" autocomplete="off"></div>
      <p class="fine">${esc(t('Tap a person, then what they had. Anything not tapped is shared by everyone.'))}</p>
      ${people.length > 1 ? `<div class="sp-paid" role="group" aria-label="${esc(t('Paid by'))}"><span class="fine">${esc(t('Paid by'))}</span><div class="chips">${people.map(p => chip(p, p === paidBy, 'data-by')).join('')}</div></div>` : ''}
      <ul class="relief sp-items">${items.map((it, n) => `<li><button type="button" class="rbtn${who[n].includes(current) ? ' on' : ''}" data-i="${n}" aria-pressed="${who[n].includes(current)}"><span class="rowb"><b>${esc(it.name)}</b><span class="num">${esc(fmtRM(it.cents))}</span></span>
        <small>${esc(who[n].length ? who[n].map(name).join(', ') : t('Everyone'))}</small></button></li>`).join('')}</ul>
      <ul class="list sp-sum">${people.map(p => `<li class="rowb"><span>${esc(name(p))}${p === paidBy && people.length > 1 ? ` <small class="pill">${esc(t('paid'))}</small>` : ''}</span><b class="num">${esc(fmtRM(owe[p]))}</b></li>`).join('')}
        ${people.length > 1 ? `<li class="rowb sp-owed"><span>${esc(paidBy === ME ? t('Owed to you') : t('You owe {0}', paidBy))}</span><b class="num">${esc(fmtRM(paidBy === ME ? others : owe[ME]))}</b></li>` : ''}</ul>`;
  };
  // A share in another currency would land in the RM accounts of what is owed: that one is shared, not saved.
  // ponytail: RM only; convert at the account's rate if people split bills abroad.
  const canSave = !isFx(S.accounts.find(a => a.id === o.accountId));
  const el = openSheet(`<h2 class="sh-title">${esc(t('Split with friends'))}</h2><p class="fine">${esc(`${o.merchant || ''} · ${fmtDate(o.date)} · ${fmtRM(o.amount)}`)}</p>
    <div class="sp-body">${body()}</div>
    <div class="sheetfoot sp-foot"><div class="row2"><button class="btn ghost" data-x="text">${esc(t('Copy text'))}</button><button class="btn ghost" data-x="img">${esc(t('Share picture'))}</button></div>
    ${canSave ? `<button class="btn wide" data-x="save">${esc(t('Save my share'))}</button>` : ''}</div>`, { label: t('Split with friends') });
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
    const pb = e.target.closest('[data-p]'), by = e.target.closest('[data-by]'), ib = e.target.closest('[data-i]'), xb = e.target.closest('[data-x]'), x = xb?.dataset.x;
    if (pb) { current = pb.dataset.p; redraw(); return; }
    if (by) { paidBy = by.dataset.by; redraw(); return; }
    if (ib) { const w = who[+ib.dataset.i], k = w.indexOf(current); if (k < 0) w.push(current); else w.splice(k, 1); redraw(); return; }
    if (!x) return;
    const owe = splitBill(items, o.amount, who, people);
    if (x === 'save') {
      xb.disabled = true;
      try { await saveSplit({ tx: S.tx.find(y => y.id === tx.id) || tx, people, who, paidBy }); } catch (err) { console.error(err); xb.disabled = false; return toast(t('Could not save. Your phone may be out of space.'), { k: 'bad' }); }
      closeSheet(); (await import('../app.js')).render();
      toast(paidBy === ME ? t('Saved. Your share: {0}. Owed to you: {1}', fmtRM(owe[ME]), fmtRM(o.amount - owe[ME])) : t('Saved. You owe {0}: {1}', paidBy, fmtRM(owe[ME])), { icon: 'check' });
    }
    if (x === 'text') {
      const text = [`${o.merchant || t('Bill')} · ${fmtDate(o.date)} · ${fmtRM(o.amount)}`, ...people.map(p => `${name(p)}: ${fmtRM(owe[p])}`), t('Split with Tally · tallymy.github.io')].join('\n');
      try { await navigator.clipboard.writeText(text); toast(t('Copied. Paste it in your chat.'), { k: 'good', icon: 'check' }); } catch { toast(text); }
    }
    if (x === 'img') {
      const blob = await picture(o, items, who, people, owe, name);
      if (blob) await send(blob, `tally-split-${o.date}`, o.merchant || t('Bill'), caption('split'));
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
