// Security guarantees that are easy to lose in a later edit: the page policy, what goes over the network,
// the pdf.js hardening, and parsers that must not freeze on hostile input. (Crafted backups: io.test.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCSV, sheetCsvUrl } from '../js/io.js';
import { parseReceipt } from '../js/parse.js';
import { parseStatement } from '../js/statement.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = f => readFileSync(join(ROOT, f), 'utf8');
const jsFiles = dir => readdirSync(join(ROOT, dir)).flatMap(f => { const p = join(dir, f); return statSync(join(ROOT, p)).isDirectory() ? jsFiles(p) : p.endsWith('.js') ? [p] : []; });
const csp = html => html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] || '';

test('page policy: no eval, no inline or third-party scripts, network limited to Google Forms/Sheets', () => {
  const d = Object.fromEntries(csp(read('index.html')).split(';').map(s => s.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
  assert.deepEqual(d['script-src'], ["'self'", "'wasm-unsafe-eval'"]);   // WebAssembly for OCR/sql.js, never JS eval
  assert.deepEqual(d['object-src'], ["'none'"]);
  assert.deepEqual(d['form-action'], ["'none'"]);
  assert.deepEqual(d['base-uri'], ["'self'"]);
  assert.deepEqual(d['connect-src'], ["'self'", 'https://docs.google.com', 'https://*.googleusercontent.com']);
});

test('no inline scripts in any page', () => {
  for (const f of ['index.html', 'privacy.html', 'terms.html', '404.html']) assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(read(f)), f);
});

test('network calls: only the feedback form and a pasted Google Sheets link', () => {
  const calls = jsFiles('js').flatMap(f => [...read(f).matchAll(/\bfetch\(([^,)]+)/g)].map(m => `${f.replace(/\\/g, '/')}:${m[1].trim()}`));
  assert.deepEqual(calls.sort(), ['js/feedback.js:FORM', 'js/views/setup.js:url']);
  assert.match(read('js/feedback.js'), /const FORM = 'https:\/\/docs\.google\.com\/forms\//);
  assert.match(read('js/views/setup.js'), /const url = sheetCsvUrl\(/);
  assert.match(read('js/views/setup.js'), /credentials: 'omit'/);
  for (const bad of ['https://evil.example/spreadsheets/d/abc', 'javascript:alert(1)', 'https://docs.google.com.evil.io/spreadsheets/d/abc'])
    assert.equal(sheetCsvUrl(bad), null, bad);
});

test('feedback never reads money data', () => {
  const src = read('js/feedback.js');
  assert.ok(!/S\.(tx|accounts|recurring)|engine\.js|getPhoto/.test(src));
  assert.equal([...src.matchAll(/entry\.\d+/g)].length, 4);   // type, message, contact, app info
});

test('pdf.js: scripts inside a PDF are never evaluated, and the vendored build is past CVE-2024-4367', () => {
  const calls = jsFiles('js').flatMap(f => [...read(f).matchAll(/getDocument\(\{[^}]*\}/g)].map(m => m[0]));
  assert.ok(calls.length > 0);
  for (const c of calls) assert.match(c, /isEvalSupported: false/);
  const v = read('vendor/pdf.min.mjs').match(/"(\d+)\.(\d+)\.(\d+)"/);
  assert.ok(v && (+v[1] > 4 || (+v[1] === 4 && +v[2] >= 2)), `pdf.js ${v?.[0]}`);   // fixed in 4.2.67
});

test('frame-busting runs before any data loads', () => {
  const app = read('js/app.js');
  assert.ok(app.indexOf('window.top !== window.self') < app.indexOf('await load()'));
});

test('hostile input cannot freeze the parsers', () => {
  const huge = ['1'.repeat(50000), '"'.repeat(50000), 'RM' + ' 1.'.repeat(20000), ('TOTAL ' + '9'.repeat(40) + '\n').repeat(2000), '01/01/2026 '.repeat(8000)];
  for (const s of huge) {
    const t0 = performance.now();
    parseCSV(s);
    parseReceipt(s);
    parseStatement(s.split('\n'));
    assert.ok(performance.now() - t0 < 1500, `took ${Math.round(performance.now() - t0)} ms on ${s.slice(0, 20)}…`);
  }
});

test('every page has a CSP that defaults to self, and no tracked page loads a script from another site', () => {
  const pages = readdirSync(ROOT).filter(f => f.endsWith('.html'));
  assert.ok(pages.length >= 4);
  for (const f of pages) {
    assert.match(csp(read(f)), /default-src 'self'/, f);
    assert.ok(!/<script[^>]+src=["']?https?:/i.test(read(f)), f);
  }
});

test('the service worker only clears its own caches (the site root is shared)', () => {
  assert.match(read('sw.js'), /k\.startsWith\('tally-'\)/);
});

test('app lock keeps only a salted PBKDF2 hash of the PIN, never the PIN', async () => {
  const L = await import('../js/lock.js');
  const a = await L.makeLock('482915'), b = await L.makeLock('482915');
  assert.ok(!JSON.stringify(a).includes('482915'));
  assert.notEqual(a.hash, b.hash);                        // own salt each time
  assert.ok(a.iter >= 100_000);
  assert.equal(await L.checkPin('482915', a), true);
  assert.equal(await L.checkPin('482916', a), false);
  assert.equal(await L.checkPin('482915', null), false);
  assert.deepEqual(['1234', '123456', '12345', '123', '1234567', '12a4'].map(L.validPin), [true, true, true, false, false, false]);
  assert.match(read('js/lock.js'), /userVerification: 'required'/);
  assert.ok(!/makeBackup\([^)]*settings/.test(read('js/views/setup.js')));   // settings (and the lock) never go into backups
});
