// A sticker for each day something is logged (after Household Account Book's picture rewards): twelve Malaysian things,
// then a new book. Nothing is ever taken away: a missed day just means no sticker that day (no streak to lose).
const ring = (n, f) => Array.from({ length: n }, (_, i) => f(i * 360 / n)).join('');

export const STICKERS = [
  ['tehtarik', 'Teh tarik', '<path d="M34 5c-7 5-7 11-2 17" fill="none" stroke="#C8773A" stroke-width="3" stroke-linecap="round"/><path d="M19 22h26l-3 33H22z" fill="#C8773A"/><path d="M19 22h26l-.7 7H19.7z" fill="#F7E7D0"/>'],
  ['nasilemak', 'Nasi lemak', '<path d="M32 9 55 51H9z" fill="#3E8E41"/><path d="M32 9 41 51H23z" fill="#2E7031"/><path d="M20 51h24l-3-7H23z" fill="#FFF6E0"/>'],
  ['roticanai', 'Roti canai', '<circle cx="32" cy="34" r="21" fill="#E8B04B"/><path d="M32 34a4 4 0 1 1 8 0a8 8 0 1 1-16 0a12 12 0 1 1 24 0a16 16 0 1 1-32 0" fill="none" stroke="#B87A22" stroke-width="2"/>'],
  ['satay', 'Satay', ring(3, a => `<g transform="rotate(${a / 6 - 20} 32 32)"><path d="M32 6v52" stroke="#C9A36B" stroke-width="2.5"/><rect x="26" y="12" width="12" height="9" rx="3" fill="#9A4F1E"/><rect x="26" y="23" width="12" height="9" rx="3" fill="#B5652A"/><rect x="26" y="34" width="12" height="9" rx="3" fill="#9A4F1E"/></g>`)],
  ['durian', 'Durian', `<g fill="#7F9A2A">${ring(10, a => `<path d="M32 10l4 9h-8z" transform="rotate(${a} 32 34)"/>`)}</g><circle cx="32" cy="34" r="17" fill="#A6BE45"/><path d="M32 17v-8" stroke="#6B4E2E" stroke-width="3" stroke-linecap="round"/>`],
  ['ketupat', 'Ketupat', '<path d="M40 14c6-6 12-6 16-8M24 14c-6-6-12-6-16-8" fill="none" stroke="#6FA83A" stroke-width="3" stroke-linecap="round"/><path d="M32 12 52 32 32 52 12 32z" fill="#8CC152"/><path d="M22 22l20 20M27 17l20 20M17 27l20 20M42 22 22 42M37 17 17 37M47 27 27 47" stroke="#5E9A2C" stroke-width="2"/>'],
  ['mooncake', 'Mooncake', `<g fill="#B7702A">${ring(12, a => `<circle cx="32" cy="12" r="5" transform="rotate(${a} 32 32)"/>`)}</g><circle cx="32" cy="32" r="20" fill="#D08A3C"/><circle cx="32" cy="32" r="12" fill="none" stroke="#9C5A1C" stroke-width="2"/><path d="M28 28h8v8h-8z" fill="none" stroke="#9C5A1C" stroke-width="2"/>`],
  ['wau', 'Wau', '<path d="M32 6c-10 8-26 10-26 18 8 0 18 2 26 10 8-8 18-10 26-10 0-8-16-10-26-18z" fill="#E4572E"/><path d="M32 34c-6 6-14 8-18 14 8 0 14-2 18-6 4 4 10 6 18 6-4-6-12-8-18-14z" fill="#F3A712"/><path d="M32 6v52" stroke="#2E4057" stroke-width="2"/><circle cx="32" cy="22" r="4" fill="#2E4057"/>'],
  ['bungaraya', 'Bunga raya', `<g fill="#D7263D">${ring(5, a => `<ellipse cx="32" cy="17" rx="9" ry="13" transform="rotate(${a} 32 32)"/>`)}</g><circle cx="32" cy="32" r="5" fill="#8C1C2A"/><path d="M32 32l12-14" stroke="#F4D35E" stroke-width="2.5" stroke-linecap="round"/><circle cx="44" cy="18" r="2.5" fill="#F4D35E"/>`],
  ['cendol', 'Cendol', '<path d="M8 30h48c0 14-10 24-24 24S8 44 8 30z" fill="#E9E4DA"/><path d="M12 30h40c-2 9-10 16-20 16S14 39 12 30z" fill="#F5F1E8"/><path d="M16 34c3-3 5 3 8 0s5 3 8 0 5 3 8 0 5 3 8 0" fill="none" stroke="#4CAF50" stroke-width="3" stroke-linecap="round"/><path d="M20 26c4-6 20-6 24 0" fill="#6B3E1E"/>'],
  ['kopi', 'Kopi', '<path d="M24 8c-3 4 3 6 0 10M32 6c-3 4 3 6 0 10" fill="none" stroke="#9AA0A6" stroke-width="2" stroke-linecap="round"/><ellipse cx="30" cy="52" rx="22" ry="5" fill="#D9D4CC"/><path d="M14 22h32v18a12 12 0 0 1-12 12h-8a12 12 0 0 1-12-12z" fill="#F4F1EC"/><path d="M46 28h4a6 6 0 0 1 0 12h-4" fill="none" stroke="#F4F1EC" stroke-width="4"/><ellipse cx="30" cy="22" rx="16" ry="3" fill="#3B2314"/>'],
  ['rambutan', 'Rambutan', `<g stroke="#B3122E" stroke-width="2.5" stroke-linecap="round">${ring(16, a => `<path d="M32 13v-6" transform="rotate(${a} 32 32)"/>`)}</g><circle cx="32" cy="32" r="17" fill="#E0233F"/><g fill="#6FA83A">${ring(8, a => `<circle cx="32" cy="10" r="1.8" transform="rotate(${a + 11} 32 32)"/>`)}</g>`],
];
export const BOOK = STICKERS.length;
/** A sticker as an image: `on` false draws the grey shape of one still to come. */
export const stickerSvg = (s, on = true, cls = 'stk') => `<svg class="${cls}${on ? '' : ' off'}" viewBox="0 0 64 64" aria-hidden="true">${s[2]}</svg>`;
/** Days logged → {n, book (1, 2…), got (stickers in this book), latest}. */
export function stickerState(n) {
  const book = Math.max(1, Math.ceil(n / BOOK)), got = n ? n - (book - 1) * BOOK : 0;
  return { n, book, got, latest: n ? STICKERS[(n - 1) % BOOK] : null };
}
