// Every on-screen string has a Malay and a Chinese entry, and every entry keeps the same {0} placeholders.
// `node tests/i18n.test.mjs --list` prints the missing strings (for writing translations).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../js/', import.meta.url));
function files(dir) {
  return readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === 'i18n' ? [] : files(p)) : p.endsWith('.js') ? [p] : []; });
}
const unq = s => s.replace(/\\'/g, "'").replace(/\\"/g, '"');
export function strings() {
  const out = new Set();
  for (const f of files(ROOT)) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) out.add(unq(m[1]));
    for (const m of s.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) out.add(unq(m[1]));
    for (const m of s.matchAll(/t\(\{\s*expense: '([^']+)', income: '([^']+)', transfer: '([^']+)'/g)) [1, 2, 3].forEach(i => out.add(m[i]));
    for (const m of s.matchAll(/t\(h\.days === 'weekend' \? '([^']+)' : '([^']+)'/g)) { out.add(m[1]); out.add(m[2]); }
  }
  const eng = readFileSync(join(ROOT, 'engine.js'), 'utf8');
  for (const m of eng.matchAll(/(?:title|body): (?:[\w.]+ > 0 \? )?\[(?:[\w.]+ > 0 \? )?(['"])((?:(?!\1).)+)\1(?: : (['"])((?:(?!\3).)+)\3)?/g)) { out.add(m[2]); if (m[4]) out.add(m[4]); }
  for (const m of eng.matchAll(/\[(['"])((?:(?!\1).)+?)\1\]/g)) if (/[a-z] /.test(m[2])) out.add(m[2]);
  for (const m of eng.matchAll(/\[change > 0 \? '([^']+)' : '([^']+)'/g)) { out.add(m[1]); out.add(m[2]); }
  for (const m of eng.matchAll(/\bname: '([^']+)'/g)) out.add(m[1]);
  const io = readFileSync(join(ROOT, 'io.js'), 'utf8') + readFileSync(join(ROOT, 'mmimport.js'), 'utf8');
  for (const m of io.matchAll(/throw new Error\('([^']+)'\)/g)) if (!/^(bad zip|no sheet|mmbackup|sql\.js failed to load|private|too big)$/.test(m[1])) out.add(m[1]);
  const tour = readFileSync(join(ROOT, 'tour.js'), 'utf8'), w = tour.indexOf('WHATS_NEW = {');
  for (const m of tour.slice(w, tour.indexOf('};', w)).matchAll(/^\s+'((?:[^'\\]|\\.)*)',$/gm)) out.add(unq(m[1]));
  for (const s of ['Bug', 'Idea', 'Question', 'Other', 'Cash', 'Bank account', 'E-wallet', 'Credit card', 'Savings', 'Home', 'Activity', 'Insights', 'Budgets', 'Settings', 'Welcome', 'Review receipt']) out.add(s);
  return [...out].filter(s => /[A-Za-z]/.test(s)).sort();
}
const load = async l => (await import(new URL(`../js/i18n/${l}.js`, import.meta.url))).default;
const holes = s => [...String(s).matchAll(/\{(\d+)\}/g)].map(m => m[1]).sort().join(',');

if (process.argv.includes('--list')) {
  const all = strings(), ms = await load('ms').catch(() => ({})), zh = await load('zh').catch(() => ({}));
  console.log(JSON.stringify(all.filter(s => !(s in ms) || !(s in zh)), null, 1));
} else {
  for (const l of ['ms', 'zh']) test(`${l}: every string translated, placeholders kept`, async () => {
    const d = await load(l), all = strings();
    const missing = all.filter(s => !Object.prototype.hasOwnProperty.call(d, s));
    assert.deepEqual(missing, [], `${missing.length} missing in ${l}`);
    const bad = all.filter(s => holes(s) !== holes(d[s]));
    assert.deepEqual(bad, [], 'placeholders differ');
  });
}
