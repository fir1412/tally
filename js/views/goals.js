// Savings goals: a name, a target, maybe a date and the account the money sits in (kv 'goals'). Progress is that
// account's balance; with a date, what a month gets there. On Home (a compact card) and in Settings → Accounts.
import { S, today, booked, setKv, uid } from '../state.js';
import { t, fmtMonth } from '../i18n.js';
import { esc, ICON, MASK, balHidden, openSheet, closeSheet, confirmSheet, toast } from '../ui.js';
import { balances, goalProgress, calcAmount, validIso, fmtAcct, owing } from '../engine.js';
import { cleanText } from '../io.js';
import { on } from '../features.js';

const goals = () => S.kv.goals || [];
const acctOf = g => S.accounts.find(a => a.id === g.accountId);
/** The line under a goal: what a month gets there, reached, past its date, or what is left. */
function goalLine(g, p, hide) {
  const money = v => (hide ? MASK : fmtAcct(acctOf(g), v));
  return p.reached ? t("You're there!") : p.overdue ? t('Past its date: {0} to go', money(p.left))
    : p.months ? t('{0} a month gets you there by {1}', money(p.perMonth), fmtMonth(g.by.slice(0, 7))) : t('{0} to go', money(p.left));
}
/** Home: each goal with a thin bar (the bar stays when the balance is hidden; the amounts don't). Nothing without goals. */
export function goalsCard() {
  if (!on('goals') || !goals().length) return '';
  const bal = balances(S.accounts, booked()).by, hide = balHidden(), tdy = today();
  return `<section class="card goals"><h2>${esc(t('Goals'))}</h2><ul class="goallist">${goals().map(g => {
    const p = goalProgress(g, bal, tdy), pct = Math.round(p.pct * 100);
    return `<li><div class="rowb"><b>${esc(g.name)}</b><span class="num fine">${esc(hide ? MASK : `${fmtAcct(acctOf(g), Math.max(0, p.have))} / ${fmtAcct(acctOf(g), g.target)}`)}</span></div>
      <div class="meter${p.overdue ? ' warn' : ''}" role="img" aria-label="${esc(t('{0}% saved', pct))}"><i style="width:${pct}%"></i></div><small class="fine">${esc(goalLine(g, p, hide))}</small></li>`;
  }).join('')}</ul></section>`;
}
/** Settings → Accounts: the goals, each opening its sheet, and Add. */
export function goalsSettings() {
  if (!on('goals')) return '';
  return `<h3>${esc(t('Savings goals'))}</h3>${goals().length ? `<ul class="list">${goals().map(g => `<li><button class="txrow" data-act="goal-edit" data-id="${esc(g.id)}"><span class="grow"><b>${esc(g.name)}</b><small>${esc([fmtAcct(acctOf(g), g.target), g.by && fmtMonth(g.by.slice(0, 7)), acctOf(g)?.name].filter(Boolean).join(' · '))}</small></span><span class="fine">${esc(t('Edit'))}</span></button></li>`).join('')}</ul>` : ''}
    <button class="btn ghost wide" data-act="goal-edit">${ICON.plus}${esc(t('Add a savings goal'))}</button>`;
}
/** Add or edit a goal. A savings account is suggested; any account but a card (it owes, it doesn't hold) can hold one. */
function goalSheet(g = {}) {
  const accts = S.accounts.filter(a => a.kind !== 'card' && !owing(a)).sort((a, b) => (b.kind === 'savings') - (a.kind === 'savings'));
  const pick = g.id ? g.accountId || '' : accts.find(a => a.kind === 'savings')?.id || '';
  const el = openSheet(`<h2 class="sh-title">${esc(g.id ? t('Edit goal') : t('Add a savings goal'))}</h2>
    <label class="field"><span>${esc(t('Name'))}</span><input id="g-name" maxlength="30" autocomplete="off" value="${esc(g.name || '')}" placeholder="${esc(t('e.g. Emergency fund, Hari Raya, a new phone'))}"${g.id ? '' : ' autofocus'}></label>
    <div class="grid2 keep2"><label class="field"><span>${esc(t('Target (RM)'))}</span><input id="g-amt" inputmode="decimal" autocomplete="off" aria-describedby="g-err" value="${g.target ? (g.target / 100).toFixed(2) : ''}" placeholder="0.00"></label>
    <label class="field"><span>${esc(t('By (optional)'))}</span><input id="g-by" type="date" min="1990-01-01" value="${esc(g.by || '')}"></label></div>
    <label class="field"><span>${esc(t('Saved in'))}</span><select id="g-acc"><option value="">${esc(t('Not linked to an account'))}</option>${accts.map(a => `<option value="${esc(a.id)}"${a.id === pick ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
      <small>${esc(t("The account's balance is the progress. A savings account is best."))}</small></label>
    <p class="err" id="g-err" role="alert"></p>
    <div class="row2">${g.id ? `<button class="btn ghost danger" data-x="del">${esc(t('Delete'))}</button>` : `<button class="btn ghost" data-act="sheet-close">${esc(t('Cancel'))}</button>`}<button class="btn" data-x="save">${esc(t('Save'))}</button></div>`, { label: t('Savings goals') });
  el.addEventListener('click', async e => {
    const x = e.target.closest('[data-x]')?.dataset.x, { render } = await import('../app.js');
    if (x === 'del') {
      if (!(await confirmSheet({ title: t('Delete this goal?'), body: g.name, ok: t('Delete'), danger: true }))) return;
      await setKv('goals', goals().filter(y => y.id !== g.id)); closeSheet(); render(); return toast(t('Deleted'));
    }
    if (x !== 'save') return;
    const name = cleanText(el.querySelector('#g-name').value, 30), target = calcAmount(el.querySelector('#g-amt').value), by = el.querySelector('#g-by').value, accountId = el.querySelector('#g-acc').value;
    const err = m => { el.querySelector('#g-err').textContent = m; };
    if (!name) return err(t('Give the goal a name.'));
    if (!(target > 0)) return err(t('Enter an amount, for example 12.50.'));
    if (by && !validIso(by)) return err(t('Pick a date.'));
    if (!g.id && goals().length >= 20) return err(t('20 goals is the most Tally keeps.'));   // what a backup restores
    const goal = { id: g.id || uid('g'), name, target, ...(by ? { by } : {}), ...(accountId ? { accountId } : {}), createdAt: g.createdAt || Date.now() };
    await setKv('goals', g.id ? goals().map(y => (y.id === g.id ? goal : y)) : [...goals(), goal]);
    closeSheet(); render(); toast(t('Saved'), { icon: 'check' });
  });
}
export const act = { 'goal-edit': b => goalSheet(goals().find(g => g.id === b.dataset.id) || {}) };
