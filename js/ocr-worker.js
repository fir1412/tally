// PaddleOCR in a worker: the page stays responsive while a receipt is read, and OpenCV's Emscripten glue (which
// needs `new Function`) runs here instead of loosening the page's Content Security Policy.
// The browser OCR build draws through document.createElement('canvas'); a worker has OffscreenCanvas instead.
self.document = { createElement: () => new OffscreenCanvas(1, 1) };
import { readAligned } from './align.js';

let ocr = null;
async function ready() {
  if (ocr) return ocr;
  const { Ocr, env } = await import('../vendor/ocr.js');
  env.wasm.wasmPaths = new URL('../vendor/', import.meta.url).href;
  env.wasm.numThreads = 1; // GitHub Pages can't enable threads; one thread is what every user gets
  ocr = await Ocr.create({ models: {
    detectionPath: new URL('../models/ch_PP-OCRv4_det_infer.onnx', import.meta.url).href,
    recognitionPath: new URL('../models/ch_PP-OCRv4_rec_infer.onnx', import.meta.url).href,
    dictionaryPath: new URL('../models/ppocr_keys_v1.txt', import.meta.url).href,
  } });
  return ocr;
}
self.onmessage = async ({ data: { id, raw } }) => {
  try {
    const o = await ready();
    if (!raw) return self.postMessage({ id, texts: [] });
    // Straighten first (sideways/upside-down turns, big tilts): the pixel work stays off the page's thread.
    const r = await readAligned(x => o.detect(x), raw, stage => self.postMessage({ id, stage }));
    self.postMessage({ id, texts: r.texts.map(({ text, mean, box }) => ({ text, mean, box })), turns: r.turns, angle: r.angle });
  } catch (e) { self.postMessage({ id, error: String(e?.message || e) }); }
};
