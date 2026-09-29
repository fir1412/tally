// Adds translations for new UI strings. Run from the repo root: node tests/fixtures/add-translations.cjs rows.json
// rows.json: [[english, bahasa melayu, 简体中文, 日本語], ...]. Rows whose English key is already there are skipped.
// Then run node tests/fixtures/make-hant.mjs (繁體中文 is made from zh.js) and node tests/i18n.test.mjs.
const fs = require('fs'), T = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const [l, i] of [['ms', 1], ['zh', 2], ['ja', 3]]) {
  const p = `js/i18n/${l}.js`; let s = fs.readFileSync(p, 'utf8'); const k = s.lastIndexOf('};');
  s = s.slice(0, k) + T.filter(r => !s.includes(JSON.stringify(r[0]) + ':')).map(r => `  ${JSON.stringify(r[0])}: ${JSON.stringify(r[i])},\n`).join('') + s.slice(k);
  fs.writeFileSync(p, s);
}
