// App lock: a PIN (4–6 digits) and, where the phone has one, its fingerprint or face (WebAuthn platform
// authenticator). Asked when Tally opens and after it was in the background for over a minute.
// Honest scope: a privacy screen against someone holding the unlocked phone. The data itself is NOT encrypted.
// Stored in settings (never in backups): {hash: PBKDF2-SHA-256 of the PIN, salt, iter, len, cred?: credential id}.
import { settings, setSetting, eraseAll } from './state.js';
import { t } from './i18n.js';
import { esc, ICON, openSheet, closeSheet, toast } from './ui.js';

const ITER = 210_000, AWAY = 60_000;
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const rand = n => crypto.getRandomValues(new Uint8Array(n));

/** PBKDF2-SHA-256 of the PIN with its salt (base64). Only this is kept, never the PIN. */
export async function hashPin(pin, salt, iter = ITER) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: iter }, key, 256));
}
export const validPin = p => /^\d{4,6}$/.test(p);
export async function makeLock(pin, cred = null) {
  const salt = b64(rand(16));
  return { hash: await hashPin(pin, salt), salt, iter: ITER, len: pin.length, ...(cred ? { cred } : {}) };
}
export const checkPin = async (pin, lock) => !!lock?.hash && (await hashPin(pin, lock.salt, lock.iter)) === lock.hash;
export const lockOn = () => !!settings().lock?.hash;

// ---- fingerprint / face ------------------------------------------------------------------------------------------
export async function bioAvailable() {
  try { return !!(await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.()); } catch { return false; }
}
async function bioRegister() {
  const c = await navigator.credentials.create({ publicKey: {
    challenge: rand(32), rp: { name: 'Tally' }, user: { id: rand(16), name: 'Tally', displayName: 'Tally' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000, attestation: 'none',
  } });
  return b64(c.rawId);
}
// ponytail: trusts the phone's "user verified" flag and doesn't check the signature against a stored public key. Enough
// for a privacy screen with no server; verify the signature if the lock ever guards encryption keys.
async function bioCheck(id) {
  try {
    const a = await navigator.credentials.get({ publicKey: { challenge: rand(32), allowCredentials: [{ type: 'public-key', id: unb64(id) }], userVerification: 'required', timeout: 60000 } });
    return !!(new Uint8Array(a.response.authenticatorData)[32] & 0x04);
  } catch { return false; }
}

// ---- the lock screen -----------------------------------------------------------------------------------------------
/**
 * One try per PIN entered. An empty field, or a second submit while that PIN is still being checked (it submits itself at
 * full length, then Unlock is tapped), is not a try. From the 5th wrong PIN: a wait of 30 s, 30 s longer each time.
 * st: {fails, until} (kept by the caller). → 'ok' | 'wrong' | 'wait' | 'ignored'.
 */
export function pinGuard(check, st, now = () => Date.now()) {
  let busy = false;
  return async pin => {
    if (!pin || busy) return 'ignored';
    if (now() < st.until) return 'wait';
    busy = true;
    try {
      if (await check(pin)) { st.fails = 0; st.until = 0; return 'ok'; }
      st.fails++; if (st.fails >= 5) st.until = now() + 30_000 * (st.fails - 4);
      return 'wrong';
    } finally { busy = false; }
  };
}
// Wrong tries survive a reload, so reloading doesn't buy 5 fresh guesses. (localStorage can throw: then memory only.)
const tries = { get: () => { try { return JSON.parse(localStorage.getItem('tally-pin-tries')) || [0, 0]; } catch { return [0, 0]; } },
  set: v => { try { localStorage.setItem('tally-pin-tries', JSON.stringify(v)); } catch {} } };
let pending = null;
const st = (([fails, until]) => ({ fails, until }))(tries.get());
/** Cover everything with the lock screen until the PIN or fingerprint is right. Resolves at once without a lock. */
export function gate() {
  if (!lockOn()) return Promise.resolve();
  if (pending) return pending;
  const el = document.createElement('div');
  const kids = [...document.body.children], wasInert = new Set(kids.filter(x => x.inert));
  for (const x of kids) { x.inert = true; x.classList.add('veiled'); }
  el.className = 'lock'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', t('Tally is locked'));
  document.body.append(el);
  pending = new Promise(resolve => {
    const lock = settings().lock;
    const done = () => { el.remove(); for (const x of kids) { x.classList.remove('veiled'); if (!wasInert.has(x)) x.inert = false; } pending = null; st.fails = 0; st.until = 0; tries.set([0, 0]); resolve(); };
    const err = m => { el.querySelector('#lock-err').textContent = m; };
    const main = () => {
      el.innerHTML = `<div class="lockbox"><div class="tour-ic">${ICON.lock}</div><h1>Tally</h1><p>${esc(t('Enter your PIN'))}</p>
        <input id="lock-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" enterkeyhint="done" aria-label="${esc(t('PIN'))}">
        <p class="err" id="lock-err" role="alert"></p><button class="btn wide" data-l="pin">${esc(t('Unlock'))}</button>
        ${lock.cred ? `<button class="btn ghost wide" data-l="bio">${ICON.lock}${esc(t('Use fingerprint or face'))}</button>` : ''}
        <button class="link" data-l="forgot">${esc(t('Forgot PIN?'))}</button></div>`;
      setTimeout(() => el.querySelector('#lock-pin')?.focus(), 30);
    };
    const forgot = (confirm = false) => {
      el.innerHTML = `<div class="lockbox"><div class="tour-ic">${ICON.lock}</div><h2>${esc(confirm ? t('Erase everything?') : t('Forgot your PIN?'))}</h2>
        <p>${esc(confirm ? t('This deletes all accounts, transactions and photos on this phone. It cannot be undone. Back up first if you might want them.') : t('Tally keeps no copy of your PIN, so it cannot be shown or reset. You can still get in with your fingerprint or face if you set it up, or erase everything and start again (a backup file can be restored afterwards).'))}</p>
        ${!confirm && lock.cred ? `<button class="btn wide" data-l="bio">${esc(t('Use fingerprint or face'))}</button>` : ''}
        <button class="btn ${confirm ? 'danger' : 'ghost danger'} wide" data-l="${confirm ? 'erase-yes' : 'erase'}">${esc(t('Erase everything'))}</button>
        <button class="btn ghost wide" data-l="back">${esc(t('Back'))}</button></div>`;
    };
    const guard = pinGuard(pin => checkPin(pin, lock), st);
    const tryPin = async () => {
      const r = await guard(el.querySelector('#lock-pin').value);
      if (r === 'ok') return done();
      if (r === 'wait') { const s = Math.ceil((st.until - Date.now()) / 1000); return err(s === 1 ? t('Too many tries. Wait 1 second.') : t('Too many tries. Wait {0} seconds.', s)); }
      if (r !== 'wrong') return;
      tries.set([st.fails, st.until]);
      el.querySelector('#lock-pin').value = '';
      err(st.fails >= 5 ? t('Too many tries. Wait {0} seconds.', 30 * (st.fails - 4)) : t('That PIN is not right.'));
    };
    el.addEventListener('click', async e => {
      const k = e.target.closest('[data-l]')?.dataset.l;
      if (k === 'pin') tryPin();
      else if (k === 'bio') { if (await bioCheck(lock.cred)) done(); else if (el.querySelector('#lock-err')) err(t('Not recognised. Use your PIN.')); }
      else if (k === 'forgot') forgot();
      else if (k === 'erase') forgot(true);
      else if (k === 'back') main();
      else if (k === 'erase-yes') { await eraseAll(); location.hash = '#/welcome'; location.reload(); }
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'lock-pin') tryPin(); });
    el.addEventListener('input', e => { if (e.target.id === 'lock-pin' && e.target.value.length === lock.len) tryPin(); });
    main();
  });
  return pending;
}
/** Lock again after more than a minute away; while hidden, the app switcher shows a blank screen. Then `onResume`. */
export function watch(onResume) {
  let away = Date.now();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') { away = Date.now(); if (lockOn()) document.body.classList.add('veil'); return; }
    document.body.classList.remove('veil');
    if (lockOn() && Date.now() - away > AWAY) await gate();
    onResume();
  });
}

// ---- Settings → Lock Tally ----------------------------------------------------------------------------------------
/** Set or change the PIN (and fingerprint). `after` runs once saved. */
export async function lockSheet(after) {
  const bio = await bioAvailable();
  const el = openSheet(`<h2 class="sh-title">${esc(lockOn() ? t('Change PIN') : t('Lock Tally'))}</h2>
    <p class="sh-body">${esc(t('Tally will ask for a PIN when it opens and after it has been in the background for a minute. This is a privacy lock: it keeps people who pick up your phone out of Tally, but the data on the phone is not encrypted.'))}</p>
    <label class="field"><span>${esc(t('New PIN (4 to 6 digits)'))}</span><input id="pin1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" autofocus></label>
    <label class="field"><span>${esc(t('Enter it again'))}</span><input id="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password"></label>
    ${bio ? `<label class="check"><input type="checkbox" id="pin-bio"${!lockOn() || settings().lock.cred ? ' checked' : ''}> ${esc(t('Also unlock with fingerprint or face'))}</label>` : ''}
    <p class="fine">${esc(t('If you forget the PIN, the only way back in is your fingerprint or face (if set) or erasing everything. Keep a backup.'))}</p>
    <p class="err" id="pin-err" role="alert"></p>
    <div class="row2"><button class="btn ghost" data-x="no">${esc(t('Cancel'))}</button><button class="btn" data-x="yes">${esc(t('Turn on the lock'))}</button></div>`, { label: t('Lock Tally') });
  el.addEventListener('click', async e => {
    const x = e.target.closest('[data-x]')?.dataset.x;
    if (x === 'no') return closeSheet();
    if (x !== 'yes') return;
    const p1 = el.querySelector('#pin1').value, p2 = el.querySelector('#pin2').value, err = m => { el.querySelector('#pin-err').textContent = m; };
    if (!validPin(p1)) return err(t('Use 4 to 6 digits.'));
    if (p1 !== p2) return err(t('The two PINs are different.'));
    let cred = null;
    if (el.querySelector('#pin-bio')?.checked) cred = settings().lock?.cred || await bioRegister().catch(() => null);
    await setSetting('lock', await makeLock(p1, cred));
    closeSheet(); after?.();
    toast(el.querySelector('#pin-bio')?.checked && !cred ? t('PIN lock on. Fingerprint or face could not be set up; use the PIN.') : t('Tally is locked with your PIN'), { k: 'good', icon: 'check' });
  });
}
export const lockOff = () => setSetting('lock', null);
