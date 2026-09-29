# Tally

**▶ Open the app: https://tallymy.github.io/** (on Android, open it in Chrome, then ⋮ → Install app)

Snap any receipt and see what you actually spent on, item by item. A free money manager for Malaysia that keeps
everything on your phone: no account, no ads, no tracking. English, Bahasa Melayu and 简体中文.

- **Receipts, item by item:** photograph one or several receipts; they're read on the phone (PaddleOCR, works
  offline after the first download), straightened automatically, and split into items with categories. SST,
  service charge and 5-sen rounding are spread across the items so the categories add up to the real total.
  Lines Tally isn't sure about are flagged, and it checks that the items add up before you save.
- **Or type the breakdown:** "Phone 1299", "Ikan kembung 25.50", one per line, and each item is sorted into its
  category (Electronics, Groceries…). Your corrections are remembered.
- **Money at a glance:** balance across cash, bank, e-wallet and card accounts; this month against the same point
  last month; budgets per category with a pace warning; insights such as unusual weeks and repeat items; a
  6- or 12-month category table with money in and net.
- **Habits and bills:** Tally learns when you usually spend (lunch around 12:35 on weekdays) and nudges you to log
  it; regular bills are detected and can go into your calendar as reminders (.ics or Google Calendar).
- **Bring your history:** Money Manager (Innim) backups with receipt photos; Money Manager (Realbyte) backups and
  Excel exports; the exports of Money Lover, Spendee, Wallet, Monefy, YNAB, Cashew, Bluecoins, 1Money, Toshl and
  AndroMoney, recognised with no column matching, their transfers, accounts and categories included; Excel (.xlsx),
  CSV, Google Sheets (paste the cells or a share link) and bank or e-wallet statements (PDF or CSV). Imports show
  their totals first, and statements are checked against their own opening and closing balances.
- **Joint account for couples:** mark an account as Joint and switch between Me, Joint and All; joint budgets are
  separate. Share the joint accounts (only those) with your spouse as a file; changes come back the same way and the
  newer edit wins.
- **Your data stays yours:** export to CSV for Excel or Sheets; back up to a file (optionally with receipt photos)
  and restore on a new phone.

## Privacy

Everything is stored in the browser on your device (IndexedDB). The only things that ever leave it are a feedback
message you choose to send and a Google Sheets link you choose to paste. See [privacy.html](privacy.html),
[terms.html](terms.html) and [SECURITY.md](SECURITY.md).

## Run locally

No build step. Serve the folder and open it:

```sh
python -m http.server 8770
# http://127.0.0.1:8770/   add ?today=2026-09-29&now=12:40 to fake the date and time (localhost only), &notour to skip the tour
```

## Tests

```sh
npm test            # node --test tests/*.test.mjs: parsers, engine, import/export, i18n, security, syntax
```

`spike/bench.mjs` measures the receipt reader on the public SROIE receipts. Persona and crowd simulations run
outside the repo.

## Structure

| Path | What |
| --- | --- |
| `js/app.js` | Boot, hash routing, navigation, delegated events |
| `js/state.js`, `js/db.js` | In-memory state over IndexedDB (localStorage fallback) |
| `js/engine.js` | Pure money logic: categories, item split, balances, budget pace, insights, habits, bills |
| `js/parse.js`, `js/align.js` | Receipt text → items and totals; typed item lines; photo straightening |
| `js/scan.js`, `js/ocr-worker.js` | On-device OCR in a Web Worker |
| `js/io.js`, `js/statement.js`, `js/mmimport.js`, `js/presets.js` | CSV/Excel/Sheets import, bank statements, Money Manager, other apps' exports, backups (zip with photos), CSV export |
| `js/i18n.js`, `js/i18n/` | English, Malay and Chinese |
| `js/tour.js`, `js/feedback.js` | First-run tour, What's new, updates; in-app feedback |
| `js/views/*.js` | Home & Insights, Activity & Budgets, Review receipt, Welcome & Settings |
| `sw.js` | Offline cache |
| `models/`, `vendor/`, `fonts/` | OCR models, bundled libraries and fonts (see `THIRD_PARTY_NOTICES.md`) |

## Licence

MIT for the code ([LICENSE](LICENSE)). Bundled models, libraries and fonts keep their own licences, listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
