// English text lives in the code as t('...'); Malay and Chinese are data files (js/i18n/ms.js, zh.js), so a typo
// in a translation can never break a script. tests/i18n.test.mjs fails if any t('...') string lacks a translation.
export const LANGS = [['en', 'English'], ['ms', 'Bahasa Melayu'], ['zh', '简体中文']];
let dict = null, lang = 'en';

/** Phone language list → 'ms', 'zh' or 'en'. */
export function pickLang(list) {
  for (const raw of (Array.isArray(list) ? list : [list]).filter(Boolean)) {
    const two = String(raw).toLowerCase().slice(0, 2);
    if (two === 'ms' || two === 'zh') return two;
    if (two === 'en') return 'en';
  }
  return 'en';
}
/** t('Spent {0} of {1}.', a, b): the current language's text with values filled in. Unknown text stays English. */
export function t(s, ...vals) {
  const tpl = (dict && Object.prototype.hasOwnProperty.call(dict, s) ? dict[s] : s);
  return vals.length ? tpl.replace(/\{(\d+)\}/g, (m, i) => (vals[+i] ?? m)) : tpl;
}
export async function setLang(want) {
  lang = LANGS.some(([k]) => k === want) ? want : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
  dict = lang === 'en' ? null : (await import(`./i18n/${lang}.js`)).default;
}
export const getLang = () => lang;
/** Dates for display: "28 Sep" / "28 Sep 2026" / Malay months / 9月28日. */
const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], ms: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'] };
export function fmtDate(iso, { year = false } = {}) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (lang === 'zh') return `${year ? y + '年' : ''}${m}月${d}日`;
  return `${d} ${(MON[lang] || MON.en)[m - 1]}${year ? ' ' + y : ''}`;
}
export function fmtMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return lang === 'zh' ? `${y}年${m}月` : `${(MON[lang] || MON.en)[m - 1]} ${y}`;
}
export const monShort = m => (lang === 'zh' ? `${m}月` : (MON[lang] || MON.en)[m - 1]);
