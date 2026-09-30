// Regression tests for the security audit's confirmed findings (run-3, the code changed since run-2): each failed before its fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as IO from '../js/io.js';

const HIDDEN = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/;

test('a category name decoded from HTML codes is cleaned again: no bidi, hidden or control characters come back', async () => {
  for (const s of ['&#x202e;dooF', '&#8238;Food 1', '&#x200b;Food', 'Fo&#1;od', 'A&#10;B', '&#x2066;x', '&#65309;x']) assert.doesNotMatch(IO.catName(IO.cleanText(s, 40)), HIDDEN, s);
  assert.equal(IO.catName('&#65309;x'), '=x');   // NFKC like every other file text
  assert.equal(IO.catName('&#x200b;Food'), 'Food');   // not a lookalike of the user's own Food
  // Restored or merged, then repaired at start: the stored name has none either.
  const shim = await import('./fixtures/idbshim.mjs'); shim.reset();
  const A = await shim.tab(); await A.S.load();
  await A.S.setKv('customCats', [{ id: 'c_file1', name: '&#x202e;dooF', color: '#111111' }]);
  await A.S.repairCatNames();
  assert.doesNotMatch(A.S.S.kv.customCats[0].name, HIDDEN);
});
