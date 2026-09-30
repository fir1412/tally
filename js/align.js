// Straighten a receipt before reading it: sideways / upside-down photos, and small tilts that make rows drift into
// each other. Pure pixel maths on raw RGBA ({data, width, height}), shared by the app and the benchmark.

/** Rotate by quarter turns clockwise (1 = 90°, 2 = 180°, 3 = 270°). */
export function rotate90(raw, turns) {
  turns = ((turns % 4) + 4) % 4;
  if (!turns) return raw;
  const { data, width: w, height: h } = raw;
  const W = turns % 2 ? h : w, H = turns % 2 ? w : h;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [X, Y] = turns === 1 ? [h - 1 - y, x] : turns === 2 ? [w - 1 - x, h - 1 - y] : [y, w - 1 - x];
    const s = (y * w + x) * 4, d = (Y * W + X) * 4;
    out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
  }
  return { data: out, width: W, height: H };
}

/** Rotate by `deg` clockwise (image coordinates, y down) around the centre, on a white background, same size. */
export function rotateBy(raw, deg) {
  const { data, width: w, height: h } = raw;
  const out = new Uint8ClampedArray(w * h * 4).fill(255);
  const t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // Source of this output pixel: rotate back by -t.
    const dx = x - cx, dy = y - cy;
    const sx = c * dx + s * dy + cx, sy = -s * dx + c * dy + cy;
    const x0 = Math.floor(sx), y0 = Math.floor(sy);
    if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) continue;
    const fx = sx - x0, fy = sy - y0, d = (y * w + x) * 4, a = y0 * w + x0;
    for (let k = 0; k < 3; k++) {
      const p = i => data[i * 4 + k];
      out[d + k] = p(a) * (1 - fx) * (1 - fy) + p(a + 1) * fx * (1 - fy) + p(a + w) * (1 - fx) * fy + p(a + w + 1) * fx * fy;
    }
  }
  return { data: out, width: w, height: h };
}

const edge = b => { const [p0, p1, , p3] = b.box; return { w: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), h: Math.hypot(p3[0] - p0[0], p3[1] - p0[1]), a: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180 / Math.PI }; };
/** Median tilt (degrees, clockwise positive) of wide text boxes; 0 when there is too little text to tell. */
export function skewAngle(boxes) {
  const as = boxes.map(edge).filter(e => e.w > 2.5 * e.h && e.w > 40).map(e => e.a).sort((x, y) => x - y);
  return as.length < 3 ? 0 : as[Math.floor(as.length / 2)];
}
/** Share of text boxes taller than wide (a sideways photo). */
export const verticalShare = boxes => (boxes.length ? boxes.filter(b => {
  const xs = b.box.map(p => p[0]), ys = b.box.map(p => p[1]);
  return Math.max(...ys) - Math.min(...ys) > 1.3 * (Math.max(...xs) - Math.min(...xs)); // bounding box: detector boxes are axis-aligned
}).length / boxes.length : 0);
/** How well a reading went: confident characters that look like receipt text. */
export const readScore = boxes => boxes.reduce((s, b) => s + (b.mean ?? 0) * (String(b.text).match(/[\p{L}\p{N}]/gu) || []).length, 0);
const meanConf = boxes => (boxes.length ? boxes.reduce((s, b) => s + (b.mean ?? 0), 0) / boxes.length : 0);

/**
 * Read with alignment: detect once; if the text looks sideways or reads badly, try the other quarter turns; then
 * straighten a tilt over 3°. detect(raw) → {texts}. Returns {texts, turns, angle, tries}. onStage('turn'|'straighten') before
 * each extra pass, so the screen can say why the read is taking longer.
 * ponytail: rotation only, no perspective correction (a receipt photographed at a steep angle stays trapezoid).
 */
export async function readAligned(detect, raw, onStage = () => {}) {
  let tries = 1;
  let best = { raw, turns: 0, texts: (await detect(raw)).texts };
  best.score = readScore(best.texts);
  // Each try is a whole detect + read. Tall boxes: a quarter turn either way. Level boxes that read badly: only
  // upside down is left (a quarter turn would stand the lines on end). Too few boxes to tell: every turn.
  const few = best.texts.length < 4, sideways = verticalShare(best.texts) > 0.5, poor = few || meanConf(best.texts) < 0.8;
  if (sideways || poor) {
    onStage('turn');
    for (const turns of sideways ? [1, 3] : few ? [2, 1, 3] : [2]) {
      const r = rotate90(raw, turns), texts = (await detect(r)).texts, score = readScore(texts);
      tries++;
      if (score > best.score * 1.15) best = { raw: r, turns, texts, score };
    }
  }
  const angle = skewAngle(best.texts);
  if (Math.abs(angle) > 3 && Math.abs(angle) < 30) { // small tilts: PaddleOCR copes, resampling only blurs (A/B on real photos)
    onStage('straighten');
    const texts = (await detect(rotateBy(best.raw, -angle))).texts;
    tries++;
    if (readScore(texts) >= best.score * 0.95) return { texts, turns: best.turns, angle, tries };
  }
  return { texts: best.texts, turns: best.turns, angle: 0, tries };
}
