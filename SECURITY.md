# Security

## Reporting a problem

Please report security issues privately through **GitHub → Security → Report a vulnerability** on this repository
(private vulnerability reporting), not in a public issue. Include the steps to reproduce and the build you tested
(Settings shows the version). You'll get a reply within 7 days. There is no bug bounty.

Supported: the live build at https://fir1412.github.io/tally/ (the Play Store app wraps the same site, so it is
always the latest version).

## What Tally is, security-wise

Tally is a static web app: no server, no accounts, no cookies, no payments, no ads, no analytics, no AI service.
All data (transactions, accounts, receipt photos) stays in the browser's IndexedDB on the device, with a
localStorage fallback only when IndexedDB is unavailable. Receipts are read on the device (PaddleOCR in a Web
Worker). The only outbound traffic is:

- the optional **Send feedback** form (Google Forms): the typed message, optional contact, app version, device
  type, screen and language. Never amounts, shops, accounts or photos (a test checks this);
- a **Google Sheets link**, fetched only when the user pastes one (credentials omitted);
- the app's own files from GitHub Pages.

Reviewed 2026-09-29. Re-check whenever one of the triggers below becomes true.

## Applies now (done)

| Item | Status |
|---|---|
| HTTPS / HSTS | GitHub Pages serves HTTPS with HSTS and redirects http → https. |
| Content Security Policy | `index.html`: `default-src 'self'`; scripts only from self plus `'wasm-unsafe-eval'` (WebAssembly for OCR and sql.js, never JS `eval`); `connect-src` limited to self, docs.google.com and googleusercontent.com; `object-src 'none'`; `base-uri 'self'`; `form-action 'none'`. No inline scripts. Pinned by `tests/security.test.mjs`. |
| Clickjacking | GitHub Pages can't send `frame-ancestors`, so the app refuses to start inside another site's frame. |
| Output escaping | All text reaches the page through `esc()`; no user text is inserted as HTML. |
| Untrusted files | Imports are routed by content (magic bytes), not by name. Caps: 25 MB for CSV/Excel/PDF text files, 200 MB for backups, 50,000 rows, 60 MB per zip entry after inflating (zip bombs), 40 MB per photo. |
| Crafted backups | `readBackup` rebuilds every record field by field: ids must match `[\w-]{1,60}`, dates must be real, amounts are bounded integers, categories must exist, text is cleaned (`cleanText`: NFKC, hidden and bidi characters removed). Anything else is dropped and counted. |
| Spreadsheet injection | CSV export prefixes cells starting with `= + - @` so Excel and Sheets don't run them as formulas. |
| PDFs | pdf.js 4.10.38 (past CVE-2024-4367) with `isEvalSupported: false` and no font loading; password-locked statements are opened only on the device. |
| Photos | Re-encoded to a 1200 px JPEG, which also drops EXIF data such as GPS location. |
| Parsers | Hostile input (huge lines, repeated patterns) is tested not to freeze the CSV, receipt and statement parsers. |
| Feedback spam | 1 message per minute and 10 per day per device; offline queue capped at 20; 4000 characters. |
| Supply chain | Everything is vendored and self-hosted (OCR bundle, ONNX Runtime, models, sql.js, pdf.js, fonts); no CDN at runtime. Licences in `THIRD_PARTY_NOTICES.md`. |
| Secrets | None in the code. The feedback form address is public by design. Real receipts and test data are git-ignored. |

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

- **Backups and joint-account share files are plain JSON (or a zip).** Anyone who gets the file can read it. Send
  them only to yourself or your spouse over a channel you trust. Optional password encryption (WebCrypto AES-GCM)
  is a candidate for a later version.
- **Joint share files** hold only accounts marked Joint, their rows (a transfer from a personal account appears as
  money in, without the personal side), joint budgets and the custom categories those rows use (`makeJointShare`,
  tested). Importing one goes through `readBackup`, then `mergeJoint`: records merge by id and the newer `updatedAt`
  wins (clamped to now, so a crafted file can't win forever), and a file can never overwrite or re-scope a personal
  account or a row that uses one. Deletions don't travel: an entry deleted on one phone comes back from the other
  until it is deleted there too.
- Anyone with the unlocked phone can open the app. An app lock (PIN/biometric) is a candidate for a later version.
- Check that the Google Form's response sheet is private to its owner (it may hold contact details).
