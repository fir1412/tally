// index.html lists every module app.js imports at start (rel="modulepreload"), so a slow phone fetches them all at once
// instead of one import level per round trip. This keeps the list equal to the real import graph.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export function startGraph(entry = 'js/app.js') {
  const seen = new Set();
  const walk = f => {
    if (seen.has(f)) return;
    seen.add(f);
    const src = readFileSync(join(ROOT, f), 'utf8');
    for (const m of src.matchAll(/^\s*(?:import|export)\s[^'"`;]*?from\s*['"](\.[^'"]+)['"]|^\s*import\s*['"](\.[^'"]+)['"]/gm))
      walk(relative(ROOT, join(ROOT, dirname(f), m[1] || m[2])).split('\\').join('/'));
  };
  walk(entry);
  return [...seen].sort();
}

test('index.html preloads exactly the modules app.js imports at start', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const listed = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(m => m[1]).sort();
  assert.deepEqual(listed, startGraph());
});
