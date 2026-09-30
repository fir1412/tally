// Live hints while framing a receipt: is it dark, glary, blurry, too far or cut off? Pixels only, on the phone, no OCR.
// Measured on a small grey copy of the camera's picture (all of it: what the shutter keeps), a few times a second.

/** RGBA pixels → grey (0–255). */
export function toGray(rgba) {
  const g = new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  return g;
}

/** Otsu's threshold: the grey level that best splits the picture into paper and the rest. */
export function otsu(hist, n) {
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let wB = 0, sumB = 0, best = 0, at = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = n - wB; if (!wF) break;
    sumB += i * hist[i];
    const d = sumB / wB - (sum - sumB) / wF, v = wB * wF * d * d;
    if (v > best) { best = v; at = i; }
  }
  return at;
}

/**
 * What the frame looks like: mean brightness, share of blown-out pixels, sharpness (strong edges against the contrast),
 * how much of it is paper, whether the paper runs off both the top and the bottom, and how clearly paper stands out.
 */
export function measure(gray, w, h) {
  const n = w * h, hist = new Uint32Array(256);
  let total = 0, blown = 0;
  for (let i = 0; i < n; i++) { const v = gray[i]; hist[v]++; total += v; if (v >= 250) blown++; }
  const cut = otsu(hist, n);
  let pN = 0, pSum = 0, dSum = 0;
  for (let i = 0; i < 256; i++) if (i > cut) { pN += hist[i]; pSum += i * hist[i]; } else dSum += i * hist[i];
  const sep = pN && pN < n ? pSum / pN - dSum / (n - pN) : 0;
  // Sharpness: the 98th percentile of |Laplacian| over the paper, relative to the paper/background contrast.
  const lap = new Uint32Array(1024);
  let m = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1, i = y * w + 1; x < w - 1; x++, i++) {
    if (gray[i] <= cut && gray[i - 1] <= cut && gray[i + 1] <= cut) continue;   // text sits on paper: only edges touching it count
    const l = Math.abs(4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w]);
    lap[Math.min(1023, l)]++; m++;
  }
  let acc = 0, p98 = 0;
  for (let i = 1023; i >= 0; i--) { acc += lap[i]; if (acc >= m * 0.02) { p98 = i; break; } }
  const band = Math.max(1, Math.round(h * 0.04)), rowPaper = (y0, y1) => { let c = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) if (gray[y * w + x] > cut) c++; return c / ((y1 - y0) * w); };
  return { mean: total / n, blown: blown / n, sharp: sep ? p98 / sep : 0, paper: pN / n, top: rowPaper(0, band), bottom: rowPaper(h - band, h), sep };
}

/**
 * The one thing to fix first: 'dark', 'glare', 'far', 'close' (the paper runs off the top and the bottom), 'blurry' or 'ok'.
 * Thresholds from receipt photos and blurred, darkened, glared, shrunk and cropped copies of them: sharp ones scored 1.4+
 * and a 3-pixel blur under 0.5; plain ones had no blown pixels and a third or more paper.
 * ponytail: a receipt on a white table can't be told from it (low `sep`): then only light, glare and blur are judged.
 */
export function hint(m) {
  if (m.mean < 50) return 'dark';
  if (m.blown > 0.05) return 'glare';
  if (m.sep > 25 && m.paper < 0.2) return 'far';
  if (m.sep > 25 && m.paper < 0.95 && m.top > 0.6 && m.bottom > 0.6) return 'close';   // near all "paper": the background was, a small receipt on it
  if (m.sharp < 0.8) return 'blurry';
  return 'ok';
}
