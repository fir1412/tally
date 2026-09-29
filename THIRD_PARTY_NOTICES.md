# Third-party notices

Tally ships these files unchanged (except bundling) so it can run offline on the phone.

| Component | Files | License |
|---|---|---|
| PaddleOCR PP-OCRv4 models (PaddlePaddle) | `models/ch_PP-OCRv4_det_infer.onnx`, `models/ch_PP-OCRv4_rec_infer.onnx`, `models/ppocr_keys_v1.txt` | Apache-2.0 |
| @gutenye/ocr-browser, @gutenye/ocr-common (Guten Ye) | bundled in `vendor/ocr.js` | MIT |
| OpenCV.js via @techstark/opencv-js | bundled in `vendor/ocr.js` | Apache-2.0 |
| ONNX Runtime Web (Microsoft) | bundled in `vendor/ocr.js`, `vendor/ort-wasm-simd-threaded.*` | MIT |
| js-clipper, tiny-invariant | bundled in `vendor/ocr.js` | BSL-1.0, MIT |
| Bricolage Grotesque (Mathieu Triay), IBM Plex Sans and IBM Plex Mono (IBM), via Fontsource | `fonts/*.woff2` (Latin subsets) | SIL Open Font License 1.1 |
| pdf.js (Mozilla) | `vendor/pdf.min.mjs`, `vendor/pdf.worker.min.mjs` (4.10.38) | Apache-2.0 |
| sql.js (SQLite compiled to WebAssembly) | `vendor/sql-wasm.js`, `vendor/sql-wasm.wasm` | MIT (SQLite is public domain) |

`vendor/ocr.js` was built with esbuild from `@gutenye/ocr-browser@1.4.9` aliased to `onnxruntime-web/wasm`.
Parts of `js/db.js`, `js/ui.js`, `js/io.js`, `js/calendar.js` and `sw.js` are adapted from the author's own "we go gim" (MIT).

Full licence texts: [MIT](LICENSE) (Tally, and the MIT parts above: the permission notice is the same), [Apache-2.0](LICENSES/Apache-2.0.txt),
[BSL-1.0](LICENSES/BSL-1.0.txt), [OFL-1.1 for IBM Plex](LICENSES/OFL-1.1-IBM-Plex.txt) and
[OFL-1.1 for Bricolage Grotesque](LICENSES/OFL-1.1-Bricolage-Grotesque.txt).
