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
| Instrument Sans, Instrument Serif (The Instrument Project Authors), JetBrains Mono (JetBrains), via Google Fonts | `fonts/instrument-*.woff2`, `fonts/jetbrains-mono-500-latin.woff2` (Latin subsets, the landing page start.html) | SIL Open Font License 1.1 ([Instrument Sans](LICENSES/OFL-1.1-instrumentsans.txt), [Instrument Serif](LICENSES/OFL-1.1-instrumentserif.txt), [JetBrains Mono](LICENSES/OFL-1.1-jetbrainsmono.txt)) |
| pdf.js (Mozilla) | `vendor/pdf.min.mjs`, `vendor/pdf.worker.min.mjs` (4.10.38) | Apache-2.0 |
| sql.js (SQLite compiled to WebAssembly) | `vendor/sql-wasm.js`, `vendor/sql-wasm.wasm` | MIT (SQLite is public domain) |
| Grocery chain names from OpenDOSM PriceCatcher (KPDN, DOSM), changed | `js/shops.js` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Contains data from data.gov.my |
| Company-to-brand names from Wikidata | `js/shops.js` | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Malaysian shop names and their kinds, © OpenStreetMap contributors | `js/shops.js` (built by `tools/shops-build.mjs`) | [ODbL 1.0](https://www.openstreetmap.org/copyright): the list is a database under the ODbL |

`vendor/ocr.js` was built with esbuild from `@gutenye/ocr-browser@1.4.9` aliased to `onnxruntime-web/wasm`.
Parts of `js/db.js`, `js/ui.js`, `js/io.js`, `js/calendar.js` and `sw.js` are adapted from the author's own "we go gim" (MIT).

Full licence texts: [MIT](LICENSE) (Tally, and the MIT parts above: the permission notice is the same), [Apache-2.0](LICENSES/Apache-2.0.txt),
[BSL-1.0](LICENSES/BSL-1.0.txt), [OFL-1.1 for IBM Plex](LICENSES/OFL-1.1-IBM-Plex.txt) and
[OFL-1.1 for Bricolage Grotesque](LICENSES/OFL-1.1-Bricolage-Grotesque.txt).
