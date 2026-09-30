// The camera's live hints: a drawn receipt (white paper, rows of dark text on a table), then spoiled one way at a time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { measure, hint } from '../js/camcheck.js';

const W = 240, H = 320;
/** A receipt `pw` × `ph` (fractions of the frame) centred on a table, with text rows. */
function receipt({ pw = 0.6, ph = 0.8, table = 90, paper = 225, ink = 40, dy = 0 } = {}) {
  const g = new Uint8Array(W * H).fill(table), x0 = Math.round(W * (1 - pw) / 2), y0 = Math.round(H * (1 - ph) / 2) + dy;
  for (let y = Math.max(0, y0); y < Math.min(H, y0 + H * ph); y++) for (let x = x0; x < x0 + W * pw; x++) {
    const r = y - y0, c = x - x0;
    g[y * W + x] = r % 8 < 2 && c % 6 < 4 && c > 4 && c < W * pw - 5 ? ink : paper;   // letters: short dark strokes in rows
  }
  return g;
}
const box = (g, r) => {   // a blur of radius r
  const out = new Uint8Array(g.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const yy = y + j, xx = x + i; if (yy >= 0 && yy < H && xx >= 0 && xx < W) { s += g[yy * W + xx]; n++; } } out[y * W + x] = s / n; }
  return out;
};
const say = g => hint(measure(g, W, H));

test('a clear, whole receipt looks good', () => assert.equal(say(receipt()), 'ok'));
test('too dark', () => assert.equal(say(receipt().map(v => v * 0.2)), 'dark'));
test('glare: a blown-out patch', () => { const g = receipt(); for (let y = 100; y < 180; y++) for (let x = 80; x < 170; x++) g[y * W + x] = 255; assert.equal(say(g), 'glare'); });
test('too far: a small receipt in the frame', () => assert.equal(say(receipt({ pw: 0.25, ph: 0.3 })), 'far'));
test('too close: the receipt runs off the top and the bottom', () => assert.equal(say(receipt({ pw: 0.9, ph: 1.4, dy: -20 })), 'close'));   // held close, it fills the width too
test('blurry: the text is smeared', () => assert.equal(say(box(receipt(), 2)), 'blurry'));
