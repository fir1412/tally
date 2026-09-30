// English text lives in the code as t('...'); the other languages are data files (js/i18n/ms.js, zh.js…), so a typo
// in a translation can never break a script. tests/i18n.test.mjs fails if any t('...') string lacks a translation.
import { cycleSpan } from './engine.js';
export const LANGS = [['en', 'English'], ['ms', 'Bahasa Melayu'], ['zh', '简体中文'], ['zh-Hant', '繁體中文'], ['ja', '日本語'], ['ta', 'தமிழ்']];
/** The language's tag for the page and for dates (Intl). */
export const langTag = (l = lang) => (l === 'zh' ? 'zh-Hans' : l);
const CJK = () => lang === 'zh' || lang === 'zh-Hant' || lang === 'ja';
let dict = null, lang = 'en';

/** Phone language list → 'ms', 'zh', 'zh-Hant', 'ja', 'ta' or 'en'. */
export function pickLang(list) {
  for (const raw of (Array.isArray(list) ? list : [list]).filter(Boolean)) {
    const low = String(raw).toLowerCase(), two = low.slice(0, 2);
    if (/^zh-(hant|tw|hk|mo)/.test(low)) return 'zh-Hant';   // Taiwan, Hong Kong, Macau
    if (two === 'ms' || two === 'zh' || two === 'ja') return two;
    if (two === 'id') return 'ms';   // Indonesian readers (domestic helpers, students) read Malay far better than English
    if (two === 'ta') return 'ta';
    if (two === 'en') return 'en';
  }
  return 'en';
}
// Copy is written for phones; on a tablet or computer "this phone" reads as "this device".
const DEVICE = { en: [/\b(this|the|your) phone\b/g, '$1 device'], ms: [/\btelefon (ini|anda|hilang)\b/g, 'peranti $1'], zh: [/(这部|此)手机|手机(?=上|丢失)/g, '此设备'], 'zh-Hant': [/(這部|此)手機|手機(?=上|丟失)/g, '此裝置'], ja: [/このスマホ/g, 'この端末'], ta: [/(இந்தக் |உங்கள் )கைப்பேசி/g, '$1கருவி'] };
// Decided once from the browser's own description, so the same phone always gets the same word (a screen size or
// pointer check flipped with rotation and split screen). Phones say "Mobile"; tablets and computers don't.
const notPhone = typeof document !== 'undefined' && !/Mobi|iPhone|iPod/i.test(navigator.userAgent || '');
const bigScreen = () => notPhone;
/** t('Spent {0} of {1}.', a, b): the current language's text with values filled in. Unknown text stays English. */
export function t(s, ...vals) {
  let tpl = (dict && Object.prototype.hasOwnProperty.call(dict, s) ? dict[s] : s);
  if (bigScreen()) tpl = tpl.replace(...DEVICE[lang]);
  return vals.length ? tpl.replace(/\{(\d+)\}/g, (m, i) => (vals[+i] ?? m)) : tpl;
}
export async function setLang(want) {
  lang = LANGS.some(([k]) => k === want) ? want : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = langTag();
  dict = lang === 'en' ? null : (await import(`./i18n/${lang}.js`)).default;
}
export const getLang = () => lang;
/** Dates for display: "28 Sep" / "28 Sep 2026" / Malay or Tamil months / 9月28日. */
const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], ms: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
  ta: ['ஜன.', 'பிப்.', 'மார்.', 'ஏப்.', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக.', 'செப்.', 'அக்.', 'நவ.', 'டிச.'] };
export function fmtDate(iso, { year = false } = {}) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (CJK()) return `${year ? y + '年' : ''}${m}月${d}日`;
  return `${d} ${(MON[lang] || MON.en)[m - 1]}${year ? ' ' + y : ''}`;
}
/** "Sep 2026"; with a month start day other than 1, the cycle the key names: "25 Sep – 24 Oct". */
export function fmtMonth(ym, sd = 1) {
  if (sd !== 1) { const c = cycleSpan(ym, sd); return `${fmtDate(c.start)} – ${fmtDate(c.end)}`; }
  const [y, m] = ym.split('-').map(Number);
  return CJK() ? `${y}年${m}月` : `${(MON[lang] || MON.en)[m - 1]} ${y}`;
}
export const monShort = m => (CJK() ? `${m}月` : (MON[lang] || MON.en)[m - 1]);
/** Column label for a month or cycle: "Sep", or "25 Sep" when months start on the 25th. */
export const cycleShort = (ym, sd = 1) => (sd !== 1 ? fmtDate(cycleSpan(ym, sd).start) : monShort(+ym.slice(5)));
