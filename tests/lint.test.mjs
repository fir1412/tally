// A trailing comment that swallowed code (a comment added before the rest of a line): the code after it never runs,
// and nothing fails loudly (the Add sheet stopped redrawing once). Code-looking text inside a // comment fails here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const files = ['js', 'js/views'].flatMap(d => readdirSync(new URL(`../${d}/`, import.meta.url)).filter(f => f.endsWith('.js')).map(f => `${d}/${f}`));
const CODE = /[\w$]+\.[\w$]+\([^)]*\);|\b(if|for|while)\s*\(.*\)\s*[\w$.]+|[\w$.]+\([^)]*\);\s*[\w$.]+\(|\b(reopen|render|refresh|closeSheet|persist)\(\);?\s*$|\bawait\s+[\w$.]+\(|=>\s*\{/;
test('no comment swallows the code after it', () => {
  const bad = [];
  for (const f of files) readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').split('\n').forEach((line, i) => {
    const at = line.search(/(?<=[;,)}\]]\s+)\/\/ /);   // a comment after code on the same line
    if (at > 0 && CODE.test(line.slice(at + 3))) bad.push(`${f}:${i + 1}: ${line.slice(at, at + 90)}`);
  });
  assert.deepEqual(bad, []);
});
test('the check catches the swallowed line it was made for', () => {
  assert.ok(CODE.test("lit up when words are typed el.removeAttribute('aria-invalid'); },"));
  assert.ok(CODE.test("a pension: the kind used last, not always Salary if (draft.type === 'expense' && x) draft.category = 'other'; reopen();"));
});
