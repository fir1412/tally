// Regression tests for the security audit's confirmed findings (run-2): each failed before its fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

const ms = f => { const t = performance.now(); f(); return performance.now() - t; };

test('matching a line against the tax reliefs is linear in its length (the EV pattern was quadratic)', () => {
  const words = i => `${'kedai runcit barang harian '.repeat(26)}${i}`;   // ~700 characters that match nothing
  assert.ok(ms(() => { for (let i = 0; i < 500; i++) E.reliefOf(words(i), words(i + 1), 'other'); }) < 300, 'relief matching took too long');
  assert.equal(E.reliefOf('EV charger installation', '', 'other'), 'ev');
  assert.equal(E.reliefOf('Wallbox', 'monthly subscription', 'other'), 'ev');
  assert.equal(E.reliefOf('EV charging', '', 'other'), null);   // both halves are still needed
});
