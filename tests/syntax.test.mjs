// Every file the browser loads must parse as an ES module (from we go gim: a stray apostrophe once stopped the whole
// app at "Loading…" and `node --check file.js` did not catch it, so each file is piped in as a module).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const walk = dir => readdirSync(join(ROOT, dir)).flatMap(f => { const p = join(dir, f); return statSync(join(ROOT, p)).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
const check = src => spawnSync(process.execPath, ['--input-type=module', '--check'], { input: src, encoding: 'utf8' });

for (const f of ['sw.js', ...walk('js')]) test(`parses as a module: ${f}`, () => {
  const r = check(readFileSync(join(ROOT, f)));
  assert.equal(r.status, 0, `${f}\n${r.stderr}`);
});
test('the check itself catches a broken file', () => assert.notEqual(check("export const a = ['it's broken'];").status, 0));

test('every app file is cached for offline use by the service worker', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  for (const f of walk('js')) assert.ok(sw.includes(`'./${f.replace(/\\/g, '/')}'`), `${f} missing from sw.js CORE`);
});
