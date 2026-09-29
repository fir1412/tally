// Category icons: one for every built-in category, and a set to choose from for any category (Settings → Categories).
// 24px line icons in the style of ui.js ICON; drawn on the category's colour (see badge in views/money.js).
export const CAT_ICONS = {
  basket: '<path d="M3 9h18l-2 11H5z"/><path d="M8 9l4-6 4 6"/>',
  utensils: '<path d="M6 3v7a3 3 0 0 0 3 3v8M9 3v5M12 3v7a3 3 0 0 1-3 3"/><path d="M18 21V3a4 4 0 0 0-3 4v6h3"/>',
  car: '<path d="M5 17h14v-5l-2-5H7l-2 5z"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  house: '<path d="M3 11l9-7 9 7v9H3z"/><path d="M10 20v-6h4v6"/>',
  heart: '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  balloon: '<circle cx="12" cy="9" r="6"/><path d="M12 15v7M10 15h4"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  film: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="m3 7 3-4h3l-3 4M10 7l3-4h3l-3 4"/>',
  book: '<path d="M4 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-4a3 3 0 0 0-2 1v16a2 2 0 0 1 2-2h4z"/>',
  gift: '<rect x="3" y="8" width="18" height="4"/><path d="M5 12v9h14v-9M12 8v13M12 8S9 3 7 5s5 3 5 3M12 8s3-5 5-3-5 3-5 3"/>',
  dots: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  family: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5A5 5 0 0 1 21 19"/>',
  undo: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  coins: '<circle cx="9" cy="9" r="6"/><path d="M15.5 9.5a6 6 0 1 1-6 6"/>',
  tag: '<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  paw: '<circle cx="12" cy="15" r="4"/><circle cx="6" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/>',
  plane: '<path d="M10.5 12.5 3 10l17-7-7 17-2.5-7.5z"/>',
  coffee: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 2v3M12 2v3"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8l4 3v7a2 2 0 0 0 4 0V9l-3-3"/>',
  gym: '<path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12"/>',
  shirt: '<path d="M8 3 3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1"/>',
  piggy: '<path d="M4 11a7 6 0 0 1 13-3h3v4l-2 1v3h-3v3h-3v-2H9v2H6v-3a6 6 0 0 1-2-5z"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
};
/** Each built-in category's icon; a category added by hand starts with the tag. */
export const DEFAULT_ICON = {
  groceries: 'basket', dining: 'utensils', transport: 'car', bills: 'zap', household: 'house', health: 'heart', personal: 'scissors',
  kids: 'balloon', electronics: 'phone', shopping: 'bag', fun: 'film', education: 'book', giving: 'gift', other: 'dots',
  salary: 'briefcase', allowance: 'cap', family: 'family', refund: 'undo', income: 'coins',
};
/** A category's icon as SVG: its chosen one, else its built-in one, else a tag. */
export const catIcon = c => `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CAT_ICONS[c?.icon] || CAT_ICONS[DEFAULT_ICON[c?.id]] || CAT_ICONS.tag}</svg>`;
