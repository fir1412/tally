# Security

## Reporting a problem

Please report security issues privately through **GitHub → Security → Report a vulnerability** on this repository
(private vulnerability reporting), not in a public issue. Include the steps to reproduce and the build you tested
(Settings shows the version). You'll get a reply within 7 days. There is no bug bounty.

Supported: the live build at https://tallymy.github.io/ (the Play Store app wraps the same site, so it is
always the latest version).

## What Tally is, security-wise

Tally is a static web app: no server, no accounts, no cookies, no payments, no ads, no analytics, no AI service.
All data (transactions, accounts, receipt photos) stays in the browser's IndexedDB on the device, with a
localStorage fallback only when IndexedDB is unavailable. Receipts are read on the device (PaddleOCR in a Web
Worker). The only outbound traffic is:

- the optional **Send feedback** form (Google Forms): the typed message, optional contact, app version, device
  type, screen and language. Never amounts, shops, accounts or photos (a test checks this);
- a **Google Sheets link**, fetched only when the user pastes one (credentials omitted);
- an **exchange rate** from `api.frankfurter.dev`, only when the user taps "Get today's rate" on a foreign-currency
  account: the request names the currency and nothing else (credentials omitted);
- a **Google Calendar link**, only when the user taps it for a bill or the daily reminder: it opens Google Calendar
  with the reminder's title (the bill's name and amount) filled in, and Google receives that text;
- the app's own files from GitHub Pages.

Settings → Privacy → "Check what Tally contacted" lists every address the page has contacted since it opened, from
the browser's own record (`performance.getEntriesByType`).

Reviewed 2026-09-29. Re-check whenever one of the triggers below becomes true.

## Applies now (done)

| Item | Status |
|---|---|
| HTTPS / HSTS | GitHub Pages serves HTTPS with HSTS and redirects http → https. |
| Content Security Policy | Every page has a `<meta>` CSP. `index.html`: `default-src 'self'`; scripts only from self plus `'wasm-unsafe-eval'` (WebAssembly for OCR and sql.js, never JS `eval`); `connect-src` limited to self, docs.google.com and googleusercontent.com; `object-src 'none'`; `base-uri 'self'`; `form-action 'none'`. No inline scripts. Pinned by `tests/security.test.mjs`. **Limit:** a `<meta>` CSP covers only the page. The Web Workers (OCR in `js/ocr-worker.js`, pdf.js) take their policy from their own response headers, and GitHub Pages sends none, so the workers run without a CSP. They load only files from this site. |
| Clickjacking | GitHub Pages can't send `frame-ancestors`, so the app refuses to start inside another site's frame. |
| Output escaping | All text reaches the page through `esc()`; no user text is inserted as HTML. Routes and `data-act` names are looked up only as a table's own keys, so `#/constructor` shows Home. |
| Untrusted files: routing | Imports are routed **mostly** by content. A `.mmbackup` or `.json` file name is checked first. After that the zip, `{`, `%PDF-` and Excel signatures decide, and anything else is read as CSV text. |
| Untrusted files: caps | Any picked or shared file: 200 MB (a share carries at most 20 files). CSV / Excel: 25 MB, 50,000 rows (and 200 columns in Excel). Google Sheets link: 25 MB, checked by Content-Length and again while streaming, with a 20 s timeout. Pasted cells: 50,000 rows. PDF statements: 25 MB, first 80 pages, 20,000 text items a page, images over 16 megapixels never decoded. Tally backup JSON: 50 MB of text, 200 accounts, 200,000 transactions, 500 bills, 50 custom categories, 5,000 rules, 500 items per receipt. Zips (Excel, photo backups, Money Manager): 150 MB inflated per file in total, no entry past its declared size, at most 5,000 entries read, a repeated name read once, and every offset checked (else "bad zip"). Money Manager: 200 accounts, 200,000 transactions, 2,000 categories (at most 50 become custom ones). Photos: 40 MB and 50 megapixels. |
| Crafted backups | `readBackup` rebuilds every record field by field. Ids must match `[\w-]{1,60}` and may not be `__proto__`, `constructor` or `prototype` (the same goes for rule keys). Dates must be real and amounts are bounded integers. Custom categories are checked first, and only a built-in or checked custom category is accepted anywhere else. Text is cleaned (`cleanText`: NFKC, hidden and bidi characters removed). Anything else is dropped and counted. A test checks that `Object.prototype` is untouched after `mergeBackup`. |
| Money Manager backups | Read with sql.js, using fixed queries only. Every table read must be a real table in `sqlite_master` (not a view) with no generated columns. Their ids go through the same `okId` rule as backups (a uid that fails it is hashed). Links are kept in a `Map`, so a crafted uid can't reach `Object.prototype`. Opening balances are bounded like backup amounts. |
| Calendar files (.ics) | Text values are escaped per RFC 5545 (`\ ; ,`, line breaks as `\n`, control characters dropped). UIDs and file names keep only `[\w-]`, and no value can start a new line. Tested with `\r\nATTACH:` in a category. |
| Spreadsheet injection | CSV export prefixes cells starting with `= + - @` so Excel and Sheets don't run them as formulas. |
| PDFs | pdf.js 4.10.38 (past CVE-2024-4367) with `isEvalSupported: false`, no font loading and `maxImageSize` set. Password-locked statements are opened only on the device. |
| Photos | Every photo from outside is re-encoded to a 1200 px JPEG, which also drops EXIF data such as GPS location. That covers receipt scans, Money Manager photos and the photos in a restored photo backup (only JPEG or PNG there, by magic bytes). The pixel size is read from the JPEG/PNG header before decoding. WebP/HEIC scans are covered only by the 40 MB cap. |
| Saving | Records go to the database first and appear on screen only after that. Settings roll back if their save fails. A failed save, including a photo, shows "Could not save". In the localStorage fallback a failed save rejects instead of silently keeping the change in memory. "Replace everything" also clears old photos and the rules, budgets, custom categories and dismissed tips. |
| Test clock | `?today=` and `?now=` (for tests and simulations) work only on localhost / 127.0.0.1. A link to the live site can't move anyone's date. |
| Parsers | Hostile input (huge lines, repeated patterns) is tested not to freeze the CSV, receipt and statement parsers. PDF text is grouped into rows in linear time (50,000 scattered items tested). |
| Feedback spam | 1 message per minute and 10 per day per device; offline queue capped at 20; 4000 characters. A test checks that exactly 4 form fields are posted. |
| Other network paths | None: a test checks that `js/` and `sw.js` use no `sendBeacon`, `WebSocket`, `XMLHttpRequest` or `EventSource`, and that `fetch` goes only to the feedback form, a pasted Sheets link and the exchange-rate address. |
| Supply chain | Everything is vendored and self-hosted (OCR bundle, ONNX Runtime, models, sql.js, pdf.js, fonts). No page loads a script from a CDN at runtime (the OCR spike page was removed in 73ac174, and a test checks every tracked page). Licences in `THIRD_PARTY_NOTICES.md`. |
| Secrets | None in the code. The feedback form address is public by design. Real receipts and test data are git-ignored. |
| App lock | Optional (Settings → Lock Tally), `js/lock.js`. A 4–6 digit PIN stored only as a salted PBKDF2-SHA-256 hash (210,000 iterations, WebCrypto), plus the phone's fingerprint or face through a WebAuthn platform authenticator with `userVerification: 'required'` (only the credential id is stored). Asked on open and after more than a minute in the background; the screen is blank in the app switcher while hidden. 5 wrong PINs → growing waits. Forgot PIN → fingerprint/face, or erase everything. Never in backups. A privacy screen, **not encryption**: anyone who can read the browser's storage (a rooted phone, devtools) can read the data, and a 4–6 digit PIN hash can be brute-forced offline. Pinned by `tests/security.test.mjs`. |
| Data loss | `navigator.storage.persist()` is requested after setup; Settings shows whether storage is protected, and Settings and the tour say that uninstalling or clearing site data deletes everything. |

## Not applicable today, with the trigger that makes each relevant

| Item | Why not now | Becomes relevant when… |
|---|---|---|
| CSRF, session cookies, CORS | No server, no cookies, no API of our own | a backend or cloud sync is added |
| Passwords, account lockout, reset links | No accounts | sign-in is added: use a managed provider and verify each control |
| Database permissions | Data is on-device only (per-origin IndexedDB) | cloud sync: per-user row-level security, no admin keys in the client |
| Payment verification | No payments | paid features or Play billing |
| Prompt injection, AI cost caps | No AI service | an AI assistant is added: treat receipts and imports as untrusted input |
| Server logs | No server | a backend exists (log without financial data) |

## Known limits and follow-ups

- **Backups and joint-account share files are plain JSON (or a zip) unless a password is set.** With a password they
  are sealed with AES-GCM under a PBKDF2-SHA-256 key (310,000 iterations, random salt and IV; `sealBackup`, tested).
  Without one, anyone who gets the file can read it: send it only to yourself or your partner over a channel you trust.
  A forgotten password can't be recovered.
- **Joint share files** hold only accounts marked Joint, their rows (a transfer from a personal account appears as
  money in, without the personal side), joint budgets and the custom categories those rows use (`makeJointShare`,
  tested). Importing one goes through `readBackup`, then `mergeJoint`: records merge by id and the newer `updatedAt`
  wins (clamped to now, so a crafted file can't win forever), and a file can never overwrite or re-scope a personal
  account or a row that uses one. Deletions travel: a deleted joint entry is recorded (`jointGone`, the last 1,000) and
  the partner's next import removes it there too.
- **Origin.** Tally now has its own origin, `https://tallymy.github.io/`, and the Play Store app wraps that one. The
  old address, `fir1412.github.io/tally/`, shares its origin with every other GitHub Pages project of that account.
  Data someone saved there stays readable by any page published on that account until they back it up and restore
  it at the new address. The old address shows a banner asking them to do that. The service worker clears only
  `tally-` caches, because a site root may be shared.
- **SQLite version.** The vendored sql.js bundles SQLite 3.49.1. The newest sql.js on npm (1.14.2) still bundles
  3.49.1, so no build with the SQLite ≥ 3.50.2 fixes (CVE-2025-6965) is available yet. Tally's own queries are fixed
  and it reads only real tables with no generated columns, so a crafted `.mmbackup` can't supply the SQL. Upgrade when
  a newer sql.js ships.
- The app lock doesn't encrypt anything and trusts the phone's "user verified" flag without checking the WebAuthn
  signature (no server). If data encryption is ever added, derive the key from the PIN and verify signatures.
- Check that the Google Form's response sheet is private to its owner (it may hold contact details).
