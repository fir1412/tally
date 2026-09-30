import test from 'node:test';
import assert from 'node:assert/strict';
import { rotate90, rotateBy, skewAngle, verticalShare, readAligned } from '../js/align.js';

// 3x2 image; each pixel's red channel holds its index so moves are easy to follow.
const img = () => ({ width: 3, height: 2, data: Uint8ClampedArray.from({ length: 24 }, (_, i) => (i % 4 === 0 ? i / 4 + 1 : 255)) });
const reds = r => Array.from({ length: r.width * r.height }, (_, i) => r.data[i * 4]);

test('rotate90: clockwise quarter turns, and four turns return the original', () => {
  // 1 2 3        4 1
  // 4 5 6   →    5 2
  //              6 3
  assert.deepEqual(reds(rotate90(img(), 1)), [4, 1, 5, 2, 6, 3]);
  assert.deepEqual(reds(rotate90(img(), 2)), [6, 5, 4, 3, 2, 1]);
  assert.deepEqual(reds(rotate90(img(), 3)), [3, 6, 2, 5, 1, 4]);
  assert.deepEqual(reds(rotate90(rotate90(img(), 3), 1)), reds(img()));
});

test('rotateBy turns clockwise for positive degrees (a dot right of centre moves below it)', () => {
  const w = 21, h = 21, data = new Uint8ClampedArray(w * h * 4).fill(255);
  const dot = (x, y) => { const i = (y * w + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0; };
  dot(15, 10); dot(16, 10); dot(15, 11); dot(16, 11);
  const out = rotateBy({ data, width: w, height: h }, 90);
  const dark = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (out.data[(y * w + x) * 4] < 128) dark.push([x, y]);
  assert.ok(dark.length > 0);
  assert.ok(dark.every(([x, y]) => Math.abs(x - 10) <= 1 && y >= 14), JSON.stringify(dark));
});

const box = (x, y, w, h, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return { text: 'NASI LEMAK 12.90', mean: 0.95, box: [[x, y], [x + w * c, y + w * s], [x + w * c - h * s, y + w * s + h * c], [x - h * s, y + h * c]] }; };

const tall = (x, y) => ({ text: 'NASI', mean: 0.3, box: [[x, y], [x + 20, y], [x + 20, y + 300], [x, y + 300]] });

test('skewAngle is the median tilt of wide boxes; verticalShare spots sideways text', () => {
  assert.equal(Math.round(skewAngle([box(0, 0, 300, 20, 4), box(0, 40, 250, 20, 5), box(0, 80, 280, 20, 4.5), box(0, 0, 20, 20, 40)])), 5);
  assert.equal(skewAngle([box(0, 0, 300, 20, 4)]), 0); // too little to tell
  assert.equal(verticalShare([tall(0, 0), tall(40, 0), box(0, 0, 300, 20, 0)]), 2 / 3);
});

test('readAligned tries quarter turns for sideways text and straightens a tilt', async () => {
  const raw = { width: 4, height: 2, data: new Uint8ClampedArray(32).fill(255) };
  const calls = [];
  const detect = async r => { calls.push(`${r.width}x${r.height}`);
    // Upright (after 1 turn: 2x4) reads well but tilted 5°; the original orientation looks sideways.
    if (r.width === 2) return { texts: [box(0, 0, 300, 20, 5), box(0, 40, 300, 20, 5), box(0, 80, 300, 20, 5), box(0, 120, 300, 20, 5)] };
    return { texts: [tall(0, 0), tall(40, 0), tall(80, 0), tall(120, 0)] };
  };
  const r = await readAligned(detect, raw);
  assert.equal(r.turns, 1);
  assert.equal(Math.round(r.angle), 5);
  assert.equal(r.tries, 4); // original, 90°, 270°, straightened
});

test('the reading screen hears about each extra pass, and its bar never ends before the read does', async () => {
  const raw = { width: 4, height: 2, data: new Uint8ClampedArray(32).fill(255) }, stages = [];
  const detect = async r => ({ texts: r.width === 2 ? [box(0, 0, 300, 20, 5), box(0, 40, 300, 20, 5), box(0, 80, 300, 20, 5), box(0, 120, 300, 20, 5)] : [tall(0, 0), tall(40, 0), tall(80, 0), tall(120, 0)] });
  await readAligned(detect, raw, s => stages.push(s));
  assert.deepEqual(stages, ['turn', 'straighten']);
  const { readPct } = await import('../js/scan.js');
  const at = [0, 1000, 5000, 20000, 600000].map(ms => readPct(ms, 5000));
  assert.deepEqual(at, [...at].sort((a, b) => a - b), 'only moves forward');
  assert.ok(at[2] >= 75 && at.at(-1) <= 95, `about 80 % at the usual time, never full: ${at}`);
});
