// App lock: a PIN (4–6 digits) or a password (8+ characters) and, where the phone has one, its fingerprint or face
// (WebAuthn platform authenticator). Asked when Tally opens and after it was in the background for over a minute.
// Optionally the data is encrypted too (db.js): a random data key, wrapped (AES-GCM) with a key made from the PIN or
// password (PBKDF2-SHA-256). Changing the PIN re-wraps that key; nothing is re-encrypted. A fingerprint can't give
// the key, so while encrypted only the PIN or password opens Tally.
// Stored in settings (never in backups): {hash, salt, iter, kind: 'pin'|'pass', len (PIN only), cred?} or, encrypted,
// {kind, len, cred?, enc: {salt, iter, iv, key}}: no fast hash to guess against, only the slow unwrap.
import { S, settings, setSetting, eraseAll } from './state.js';
import * as db from './db.js';
import { t } from './i18n.js';
import { esc, ICON, openSheet, closeSheet, toast } from './ui.js';

const ITER = 600_000, AWAY = 60_000;   // PBKDF2-SHA-256 rounds for new PINs (OWASP 2023); older locks keep theirs
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const rand = n => crypto.getRandomValues(new Uint8Array(n));

/** PBKDF2-SHA-256 of the PIN with its salt (base64). Only this is kept, never the PIN. */
export async function hashPin(pin, salt, iter = ITER) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: iter }, key, 256));
}
export const validPin = p => /^\d{4,6}$/.test(p);
/** A PIN of 4–6 digits, or a password of 8–64 characters. */
export const validCode = (p, kind) => (kind === 'pass' ? p.length >= 8 && p.length <= 64 : validPin(p));
export async function makeLock(pin, cred = null, kind = 'pin') {
  const salt = b64(rand(16));
  return { hash: await hashPin(pin, salt), salt, iter: ITER, kind, ...(kind === 'pin' ? { len: pin.length } : {}), ...(cred ? { cred } : {}) };
}

// ---- encryption: the data key, wrapped with a key made from the PIN or password ------------------------------------
const ENC_ITER = 600_000;
const kekOf = async (code, salt, iter) => crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: iter },
  await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']);
export async function wrapDek(dek, code) {
  const salt = b64(rand(16)), iv = rand(12);
  return { salt, iter: ENC_ITER, iv: b64(iv), key: b64(await crypto.subtle.wrapKey('raw', dek, await kekOf(code, salt, ENC_ITER), { name: 'AES-GCM', iv })) };
}
/** The data key, or a rejection when the PIN or password is wrong (AES-GCM checks it). */
export const unwrapDek = async (code, enc) => crypto.subtle.unwrapKey('raw', unb64(enc.key), await kekOf(code, enc.salt, enc.iter), { name: 'AES-GCM', iv: unb64(enc.iv) }, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
export const encOn = () => !!settings().lock?.enc;
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
/** Encrypt everything on this phone with the current PIN or password (checked first). Photos go a few at a time. */
const encLock = ({ hash, salt, iter, ...rest }, enc) => ({ ...rest, enc });   // the fast PIN hash goes: the unwrap checks
export async function encryptOn(code) {
  const lock = settings().lock;
  if (!lock?.hash || !(await checkPin(code, lock))) throw new Error('wrong');
  const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']), enc = await wrapDek(dek, code);
  const [accounts, tx, recurring, kv] = await Promise.all(['accounts', 'tx', 'recurring', 'kv'].map(s => db.all(s)));
  const next = { ...settings(), lock: encLock(lock, enc) };
  db.setKey(dek); db.expectSealed(true);
  try { await db.writeAtomic({ put: { accounts, tx, recurring, kv: [...kv.filter(r => r.key !== 'settings'), { key: 'settings', value: next }] } }); }
  catch (e) { db.setKey(null); db.expectSealed(false); throw e; }
  S.kv.settings = next;
  for (const ids of chunks(await db.keys('receipts'), 20)) await db.putMany('receipts', (await Promise.all(ids.map(id => db.get('receipts', id)))).filter(Boolean));
}
/** Back to plain storage with the current PIN or password (it gets its hash back). Photos first, while the key is here. */
export async function encryptOff(code) {
  const key = db.getKey(), old = settings().lock;
  if (!key || !(await checkPin(code, old))) throw new Error('wrong');
  for (const ids of chunks(await db.keys('receipts'), 20)) await db.putRaw('receipts', (await Promise.all(ids.map(id => db.get('receipts', id)))).filter(Boolean));
  const [accounts, tx, recurring, kv] = await Promise.all(['accounts', 'tx', 'recurring', 'kv'].map(s => db.all(s)));
  const next = { ...settings(), lock: await makeLock(code, old.cred, old.kind) };
  db.setKey(null); db.expectSealed(false);
  try { await db.writeAtomic({ put: { accounts, tx, recurring, kv: [...kv.filter(r => r.key !== 'settings'), { key: 'settings', value: next }] } }); }
  catch (e) { db.setKey(key); db.expectSealed(true); throw e; }
  S.kv.settings = next;
}
/** Is this the PIN or password? Encrypted: only if it unwraps the data key (kept for the lock screen: `opened`). */
let opened = null;
export async function checkPin(pin, lock) {
  if (lock?.enc) { try { opened = await unwrapDek(pin, lock.enc); return true; } catch { return false; } }
  return !!lock?.hash && (await hashPin(pin, lock.salt, lock.iter)) === lock.hash;
}
export const lockOn = () => !!(settings().lock?.hash || settings().lock?.enc);
/** Ask for the current PIN or password before a change to the lock. → the code, or null if cancelled. */
export function askCode(title) {
  const lock = settings().lock, pass = lock.kind === 'pass';
  return new Promise(done => {
    const el = openSheet(`<h2 class="sh-title">${esc(title)}</h2>
      <label class="field"><span>${esc(pass ? t('Your password') : t('Your PIN'))}</span><input id="ask-code" type="password" ${pass ? 'maxlength="64"' : 'inputmode="numeric" pattern="[0-9]*" maxlength="6"'} autocomplete="current-password" autofocus></label>
      <p class="err" id="ask-err" role="alert"></p>
      <div class="row2"><button class="btn ghost" data-x="no">${esc(t('Cancel'))}</button><button class="btn" data-x="ok">${esc(t('Continue'))}</button></div>`, { label: title, onClose: () => done(null) });
    let tries = 0;
    const go = async () => {
      const code = el.querySelector('#ask-code').value;
      if (!code) return;
      el.querySelector('[data-x="ok"]').disabled = true;
      const ok = await checkPin(code, lock);
      el.querySelector('[data-x="ok"]').disabled = false;
      if (ok) { done(code); return closeSheet(); }
      if (++tries >= 5) { done(null); return closeSheet(); }
      el.querySelector('#ask-code').value = ''; el.querySelector('#ask-err').textContent = pass ? t('That password is not right.') : t('That PIN is not right.');
    };
    el.addEventListener('click', e => { const x = e.target.closest('[data-x]')?.dataset.x; if (x === 'no') { done(null); closeSheet(); } else if (x === 'ok') go(); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  });
}

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
    const lock = settings().lock, pass = lock.kind === 'pass', bio = lock.cred && !lock.enc;
    const done = () => { el.remove(); for (const x of kids) { x.classList.remove('veiled'); if (!wasInert.has(x)) x.inert = false; } pending = null; st.fails = 0; st.until = 0; tries.set([0, 0]); resolve(); };
    const err = m => { el.querySelector('#lock-err').textContent = m; };
    const main = () => {
      el.innerHTML = `<div class="lockbox"><div class="tour-ic">${ICON.lock}</div><h1>Tally</h1><p>${esc(pass ? t('Enter your password') : t('Enter your PIN'))}</p>
        <input id="lock-pin" type="password" ${pass ? 'maxlength="64"' : 'inputmode="numeric" pattern="[0-9]*" maxlength="6"'} autocomplete="off" enterkeyhint="done" aria-label="${esc(pass ? t('Password') : t('PIN'))}">
        <p class="err" id="lock-err" role="alert"></p><button class="btn wide" data-l="pin">${esc(t('Unlock'))}</button>
        ${bio ? `<button class="btn ghost wide" data-l="bio">${ICON.lock}${esc(t('Use fingerprint or face'))}</button>` : ''}
        <button class="link" data-l="forgot">${esc(pass ? t('Forgot your password?') : t('Forgot PIN?'))}</button></div>`;
      setTimeout(() => el.querySelector('#lock-pin')?.focus(), 30);
    };
    const forgot = (confirm = false) => {
      el.innerHTML = `<div class="lockbox"><div class="tour-ic">${ICON.lock}</div><h2>${esc(confirm ? t('Erase everything?') : t('Forgot your PIN?'))}</h2>
        <p>${esc(confirm ? t('This deletes all accounts, transactions and photos on this phone. It cannot be undone. Back up first if you might want them.') : t('Tally keeps no copy of your PIN, so it cannot be shown or reset. You can still get in with your fingerprint or face if you set it up, or erase everything and start again (a backup file can be restored afterwards).'))}</p>
        ${!confirm && bio ? `<button class="btn wide" data-l="bio">${esc(t('Use fingerprint or face'))}</button>` : ''}
        <button class="btn ${confirm ? 'danger' : 'ghost danger'} wide" data-l="${confirm ? 'erase-yes' : 'erase'}">${esc(t('Erase everything'))}</button>
        <button class="btn ghost wide" data-l="back">${esc(t('Back'))}</button></div>`;
    };
    const guard = pinGuard(pin => checkPin(pin, lock), st);
    const tryPin = async () => {
      const code = el.querySelector('#lock-pin').value, r = await guard(code);
      if (r === 'ok') {
        if (!lock.enc) return done();
        db.setKey(opened); opened = null; return done();
      }
      if (r === 'wait') { const s = Math.ceil((st.until - Date.now()) / 1000); return err(s === 1 ? t('Too many tries. Wait 1 second.') : t('Too many tries. Wait {0} seconds.', s)); }
      if (r !== 'wrong') return;
      tries.set([st.fails, st.until]);
      el.querySelector('#lock-pin').value = '';
      err(st.fails >= 5 ? t('Too many tries. Wait {0} seconds.', 30 * (st.fails - 4)) : t('That PIN is not right.'));
    };
    el.addEventListener('click', async e => {
      const k = e.target.closest('[data-l]')?.dataset.l;
      if (k === 'pin') tryPin();
      else if (k === 'bio') { if (bio && await bioCheck(lock.cred)) done(); else if (el.querySelector('#lock-err')) err(t('Not recognised. Use your PIN.')); }
      else if (k === 'forgot') forgot();
      else if (k === 'erase') forgot(true);
      else if (k === 'back') main();
      else if (k === 'erase-yes') { await eraseAll(); location.hash = '#/welcome'; location.reload(); }
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'lock-pin') tryPin(); });
    el.addEventListener('input', e => { if (e.target.id === 'lock-pin' && !pass && e.target.value.length === lock.len) tryPin(); });
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
  const bio = (await bioAvailable()) && !encOn();   // encrypted: only the PIN or password can unlock the key
  const el = openSheet(`<h2 class="sh-title">${esc(lockOn() ? t('Change PIN') : t('Lock Tally'))}</h2>
    <p class="sh-body">${esc(encOn() ? t('Tally will ask for it when it opens and after it has been in the background for a minute. Your data stays encrypted; it is locked with the new one from now on.') : t('Tally will ask for a PIN when it opens and after it has been in the background for a minute. This is a privacy lock: it keeps people who pick up your phone out of Tally, but the data on the phone is not encrypted.'))}</p>
    <label class="check"><input type="checkbox" id="pin-pass"${settings().lock?.kind === 'pass' ? ' checked' : ''}> ${esc(t('Use a password (8 or more characters) instead of a PIN'))}</label>
    <label class="field"><span id="pin1-l">${esc(t('New PIN (4 to 6 digits)'))}</span><input id="pin1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" autofocus></label>
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
    const kind = el.querySelector('#pin-pass').checked ? 'pass' : 'pin';
    if (!validCode(p1, kind)) return err(kind === 'pass' ? t('Use 8 or more characters.') : t('Use 4 to 6 digits.'));
    if (p1 !== p2) return err(kind === 'pass' ? t('The two passwords are different.') : t('The two PINs are different.'));
    let cred = null;
    if (el.querySelector('#pin-bio')?.checked) cred = settings().lock?.cred || await bioRegister().catch(() => null);
    const key = db.getKey();
    if (encOn() && !key) return err(t('Could not unlock the data with this PIN.'));
    const made = await makeLock(p1, cred, kind), next = encOn() ? encLock(made, await wrapDek(key, p1)) : made;
    await setSetting('lock', next);
    closeSheet(); after?.();
    toast(el.querySelector('#pin-bio')?.checked && !cred ? t('PIN lock on. Fingerprint or face could not be set up; use the PIN.') : t('Tally is locked with your PIN'), { k: 'good', icon: 'check' });
  });
}
export async function lockOff(code) { if (encOn()) await encryptOff(code); return setSetting('lock', null); }
// Switch the PIN fields to a password and back.
globalThis.document?.addEventListener('change', e => {
  if (e.target?.id !== 'pin-pass') return;
  const pass = e.target.checked, lbl = document.getElementById('pin1-l');
  for (const id of ['pin1', 'pin2']) { const f = document.getElementById(id); if (!f) continue; f.value = ''; if (pass) { f.removeAttribute('inputmode'); f.removeAttribute('pattern'); f.maxLength = 64; } else { f.inputMode = 'numeric'; f.pattern = '[0-9]*'; f.maxLength = 6; } }
  if (lbl) lbl.textContent = pass ? t('New password (8 or more characters)') : t('New PIN (4 to 6 digits)');
});
