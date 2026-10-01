// The comic's camera (frame) and the shot checker (lintShots): a panel's `cam` reframes its art without redrawing it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { frame, lintShots } from '../js/comic.js';

const ART = '<use href="#b10-street"/><text x="160" y="15">APAM</text>';
// The crop a frame() shows, in scene coords: undo translate(160 100) [scale(-1 1)] scale(sx sy) translate(-cx -cy).
const crop = out => { const [, sx, sy, cx, cy] = out.match(/scale\(([\d.]+) ([\d.]+)\) translate\((-?[\d.]+) (-?[\d.]+)\)/).map(Number);
  return { x0: -cx - 160 / sx, x1: -cx + 160 / sx, y0: -cy - 100 / sy, y1: -cy + 100 / sy, sx, sy }; };
const inside = (c, e = 0.02) => c.x0 >= -e && c.y0 >= -e && c.x1 <= 320 + e && c.y1 <= 200 + e;

test('no cam: the art as drawn, byte for byte', () => {
  assert.equal(frame(ART), ART); assert.equal(frame(ART, undefined), ART);
  assert.deepEqual(crop(frame(ART, {})), { x0: 0, x1: 320, y0: 0, y1: 200, sx: 1, sy: 1 });   // an empty cam: wide, eye level, the whole scene
});

test('the crop never shows past the scene, whatever the shot, focus or angle', () => {
  for (const shot of ['wide', 'medium', 'close', 'xclose', 'insert']) for (const angle of ['eye', 'low', 'high'])
    for (const on of [[0, 0], [320, 200], [-50, 400], [160, 110], [300, 20]]) {
      const c = crop(frame(ART, { shot, on, angle }));
      assert.ok(inside(c), `${shot} ${angle} ${on}: ${JSON.stringify(c)}`);
    }
  const c = crop(frame(ART, { shot: 'close', on: [100, 60] }));   // a close shot: 2.4x, centred on the focus
  assert.equal(c.sx, 2.4); assert.ok(Math.abs((c.x0 + c.x1) / 2 - 100) < 0.1 && Math.abs((c.y0 + c.y1) / 2 - 60) < 0.1);
  const low = crop(frame(ART, { angle: 'low' })), high = crop(frame(ART, { angle: 'high' }));
  assert.ok(low.sy > low.sx && high.sy < high.sx, 'low stretches, high squashes');
  assert.ok(low.y0 < high.y0, 'low sees higher up the scene than high');
});

test('a dutch angle zooms enough that the turned frame stays inside the scene', () => {
  for (const dutch of [-8, -3, 4, 8, 20]) for (const on of [[0, 0], [320, 200], [160, 110]]) {
    const out = frame(ART, { dutch, on }), a = Math.min(Math.abs(dutch), 8) * Math.PI / 180, { sx, sy } = crop(out), cx = -crop(out).x0 - 160 / sx, cy = -crop(out).y0 - 100 / sy;
    // the viewport's four corners, turned back and scaled into scene coords, all inside 0..320 x 0..200
    for (const [x, y] of [[-160, -100], [160, -100], [-160, 100], [160, 100]]) {
      const r = Math.sign(dutch) * a, px = -cx + (x * Math.cos(r) + y * Math.sin(r)) / sx, py = -cy + (-x * Math.sin(r) + y * Math.cos(r)) / sy;
      assert.ok(px >= -0.1 && px <= 320.1 && py >= -0.1 && py <= 200.1, `dutch ${dutch} on ${on}: corner at ${px},${py}`);
    }
    assert.match(out, new RegExp(`rotate\\(${Math.max(-8, Math.min(8, dutch))}\\)`));
  }
});

test('flip mirrors the panel but keeps inline words reading the right way; fg comes last, outside the camera', () => {
  const out = frame(ART, { flip: true, shot: 'medium', fg: '<path d="M0 0" id="fg"/>' });
  assert.match(out, /^<g transform="translate\(160 100\) scale\(-1 1\) /);
  assert.match(out, /<text transform="matrix\(-1 0 0 1 320 0\)" x="160"/);
  assert.ok(out.endsWith('</g><path d="M0 0" id="fg"/>'));
  assert.doesNotMatch(frame(ART, { shot: 'medium' }), /matrix/);   // unflipped: words untouched
  assert.match(frame('<text x="5" transform="rotate(3)">A</text>', { flip: true }), /^<g[^>]*><text x="5" transform="rotate\(3\)">/);   // its own transform: left alone
});

test('drift wraps the camera in a group that css animates once on screen; an unknown drift does nothing', () => {
  assert.match(frame(ART, { drift: 'in' }), /^<g class="cam-drift" style="--d0:scale\(1\);--d1:scale\(1.06\)"><g transform=/);
  assert.match(frame(ART, { drift: 'left' }), /translate\(-10px,0\) scale\(1.08\)/);
  assert.doesNotMatch(frame(ART, { drift: 'sideways' }), /cam-drift/);
});

const P = (shot, extra = {}, art = '<use href="#b10-street"/>') => ({ art, cam: { shot, ...extra }, lines: [] });
test('lintShots: repeats, too few shot sizes, scenes opened close, dutch, focus, typos, flipped words', () => {
  const good = ['wide', 'medium', 'close', 'xclose', 'medium', 'insert', 'wide'].map(s => P(s));
  assert.deepEqual(lintShots(good), []);
  assert.deepEqual(lintShots([P('wide'), P('wide')]), ['panel 2: same shot as panel 1 (wide eye)']);
  assert.deepEqual(lintShots([P('wide'), P('wide', { angle: 'low' }), P('wide', { flip: true })]), []);
  assert.deepEqual(lintShots(['wide', 'medium', 'wide', 'medium', 'close', 'wide', 'medium'].map(s => P(s))), ['panels 1-7: fewer than 4 shot sizes']);
  assert.deepEqual(lintShots([P('wide'), P('close', {}, '<use href="#b10-home-n"/>')]), ['panel 2: a new scene (home) opens on a close shot, not wide']);
  assert.deepEqual(lintShots([P('medium')]), ['panel 1: a new scene (street) opens on a medium shot, not wide']);
  assert.deepEqual(lintShots([P('wide'), { ...P('close'), scene: 'stall' }]), ['panel 2: a new scene (stall) opens on a close shot, not wide']);   // the scene hint wins
  assert.deepEqual(lintShots(['wide', 'medium', 'close', 'medium', 'close'].map(s => P(s, { dutch: 4 }))), ['panel 4: dutch angle number 4 (3 a book at most)', 'panel 5: dutch angle number 5 (3 a book at most)']);
  assert.deepEqual(lintShots([P('wide', { on: [330, 10] })]), ['panel 1: focus 330,10 is outside the scene']);
  assert.deepEqual(lintShots([P('wide', { angle: 'worm' })]), ['panel 1: unknown shot, angle or drift']);
  const defs = '<g id="b10-kopitiam"><text>KOPI</text></g><g id="b10-street"><path/></g>';
  assert.deepEqual(lintShots([P('wide', { flip: true }, '<use href="#b10-kopitiam"/>')], defs), ['panel 1: flipped, but its backdrop has painted words that would read backwards']);
  assert.deepEqual(lintShots([P('wide', { flip: true })], defs), []);
});

test('October\'s book has no shot problems', { todo: true }, async () => {
  const b = (await import('../js/books/10.js')).default;
  assert.deepEqual(lintShots(b.panels, b.defs), []);
});
