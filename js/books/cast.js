// The sticker-book cast, drawn as code: Aina, Wei, Uncle Raju and Duit the cat, plus scenes and props.
// Characters take their feet at (x, y) in a 320x200 panel; s scales, flip mirrors (they face +x unless flipped).
// Items are drawn centred on 0,0 in a box about 44 wide, so the same drawing is a sticker (64x64) and a prop.
const O = '#2E2622';                                            // outline and ink
const S = `stroke="${O}" stroke-width="2" stroke-linejoin="round"`;
export const ring = (n, f) => Array.from({ length: n }, (_, i) => f(i * 360 / n)).join('');
const at = (x, y, s, inner, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">${inner}</g>`;
const R = (x, y, w, h, c, more = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" ${more}/>`;
const C = (x, y, r, c, more = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${more}/>`;
const P = (d, c, more = '') => `<path d="${d}" fill="${c}" ${more}/>`;
const line = (d, c, w = 2) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const limb = (d, c, w = 6) => line(d, O, w + 4) + line(d, c, w);
const txt = (x, y, t, size, c, more = '') => `<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-weight="800" font-size="${size}" text-anchor="middle" fill="${c}" ${more}>${t}</text>`;

// ---- faces, drawn around the head's centre -------------------------------------------------------------
const E = (x, y, rx = 2, ry = 2.6) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${O}"/>`;
const L = d => line(d, O, 2);
const FACE = {
  happy: m => E(-6.5, 0) + E(6.5, 0) + L(`M-5 ${m} Q0 ${m + 5} 5 ${m}`),
  laugh: m => L('M-9 1 Q-6.5 -3 -4 1') + L('M4 1 Q6.5 -3 9 1') + P(`M-6 ${m - 1} Q0 ${m + 10} 6 ${m - 1}Z`, '#8E3B3B', S),
  worried: m => E(-6.5, 1) + E(6.5, 1) + L('M-10 -5 L-4 -8') + L('M4 -8 L10 -5') + L(`M-4 ${m + 2} Q0 ${m - 1} 4 ${m + 2}`),
  think: m => E(-4.5, -1) + E(8.5, -1) + L('M4 -8 Q8 -11 12 -8') + L(`M-3 ${m + 1} L4 ${m}`),
  surprised: m => E(-6.5, 0, 2.4, 3.4) + E(6.5, 0, 2.4, 3.4) + L('M-10 -8 Q-6.5 -11 -3 -8') + L('M3 -8 Q6.5 -11 10 -8') + `<ellipse cx="0" cy="${m + 2}" rx="3" ry="4" fill="#8E3B3B" ${S}/>`,
};
const cheeks = `<g fill="#E8666B" opacity=".4"><ellipse cx="-10.5" cy="5" rx="3.5" ry="2"/><ellipse cx="10.5" cy="5" rx="3.5" ry="2"/></g>`;
const face = (kind, y, m = 8, k = 1) => at(0, y, k, cheeks + (FACE[kind] || FACE.happy)(m));

// ---- people -------------------------------------------------------------------------------------------
// Arms from the shoulders (±15,-70): [path, hand x, hand y] for the back and the front arm.
const ARMS = {
  stand: [['M-15 -70 Q-22 -56 -21 -42', -21, -42], ['M15 -70 Q22 -56 21 -42', 21, -42]],
  point: [['M-15 -70 Q-22 -56 -21 -42', -21, -42], ['M15 -70 Q30 -64 42 -70', 42, -70]],
  hold: [['M-15 -70 Q-24 -58 -15 -50', -15, -50], ['M15 -70 Q24 -58 15 -50', 15, -50]],
  wave: [['M-15 -70 Q-22 -56 -21 -42', -21, -42], ['M15 -70 Q31 -80 30 -98', 30, -98]],
  cheer: [['M-15 -70 Q-31 -80 -30 -98', -30, -98], ['M15 -70 Q31 -80 30 -98', 30, -98]],
};
function person(o, p) {
  const { x = 160, y = 188, s = 1, face: f = 'happy', pose = 'stand', flip = false, item = null, is = 0.75 } = o;
  const arms = ARMS[pose] || ARMS.stand;
  const inner = p.legs + p.body
    + arms.map(([d]) => limb(d, p.sleeve)).join('')
    + (p.cap ? C(-16, -71, 6.5, p.cap, S) + C(16, -71, 6.5, p.cap, S) : '')
    + p.head + face(f, p.fy, p.m)
    + (p.after || '')
    + (item && pose === 'hold' ? `<g transform="scale(${flip ? -1 : 1} 1)">${it(item, 0, -52, is)}</g>` : '')
    + arms.map(([, hx, hy]) => C(hx, hy, 4.5, p.skin, S)).join('');
  return at(x, y, s, inner, flip);
}
const feet = c => `<ellipse cx="-8" cy="-3" rx="7" ry="3.5" fill="${c}" ${S}/><ellipse cx="8" cy="-3" rx="7" ry="3.5" fill="${c}" ${S}/>`;
const trousers = (w, c) => P(`M-${w} -32 L-${w - 1} -6 H-2 L0 -24 L2 -6 H${w - 1} L${w} -32Z`, c, S);
const tee = (w, c) => P(`M-16 -76 Q0 -80 16 -76 Q${w + 3} -54 ${w} -30 H-${w} Q-${w + 3} -54 -16 -76Z`, c, S);

/** Aina: tudung, baju kurung. The careful one (the app user). */
export const aina = (o = {}) => person(o, {
  skin: '#EDBE98', sleeve: '#2A9D8F', fy: -95,
  legs: feet('#5B3A29') + P('M-19 -30 L-17 -5 H17 L19 -30Z', '#1F7A70', S),
  body: P('M-15 -76 Q0 -80 15 -76 Q22 -52 23 -24 H-23 Q-22 -52 -15 -76Z', '#2A9D8F', S),
  head: P('M0 -121 C-27 -121 -29 -92 -24 -80 Q-27 -68 -18 -62 Q0 -56 18 -62 Q27 -68 24 -80 C29 -92 27 -121 0 -121Z', '#D8587A', S)
    + `<ellipse cx="0" cy="-95" rx="14" ry="16" fill="#EDBE98" stroke="${O}" stroke-width="1.5"/>` + line('M-17 -113 Q0 -123 17 -113', '#B8405F', 2) + C(0, -70, 2.6, '#F4C542', S),
});
/** Wei: bob, orange tee, jeans. Fun, impulsive, learns fast. */
export const wei = (o = {}) => person(o, {
  skin: '#F6D3B3', sleeve: '#F6D3B3', cap: '#F07B3F', fy: -95,
  legs: feet('#F4F4F4') + trousers(16, '#3D5A80'),
  body: tee(16, '#F07B3F') + C(0, -56, 4, '#FFD166'),
  head: P('M-20 -92 Q-22 -118 0 -118 Q22 -118 20 -92 V-80 H11 V-86 H-11 V-80 H-20Z', '#26221F', S)
    + C(0, -95, 16, '#F6D3B3', `stroke="${O}" stroke-width="1.5"`)
    + P('M-16 -97 Q-17 -114 0 -114 Q17 -114 16 -97 Q8 -103 0 -101 Q-8 -103 -16 -97Z', '#26221F')
    + R(6, -111, 8, 3.5, '#FFD166', 'rx="1.5" transform="rotate(-20 10 -109)"'),
});
/** Uncle Raju: kopitiam uncle by day, apam balik stall by night. Grey moustache, apron. */
export const raju = (o = {}) => person(o, {
  skin: '#A26B47', sleeve: '#A26B47', cap: '#6FA8DC', fy: -96, m: 14,
  legs: feet('#4A3426') + trousers(18, '#56606E'),
  body: P('M-18 -76 Q0 -80 18 -76 Q26 -54 22 -30 H-22 Q-26 -54 -18 -76Z', '#6FA8DC', S)
    + P('M-12 -64 H12 L15 -30 H-15Z', '#F5EFE3', S) + L('M-12 -64 L-7 -77 M12 -64 L7 -77') + R(-6, -50, 12, 8, '#E4DACA', 'rx="1.5"'),
  head: `<ellipse cx="-17" cy="-96" rx="4.5" ry="7" fill="#D5D5D5" ${S}/><ellipse cx="17" cy="-96" rx="4.5" ry="7" fill="#D5D5D5" ${S}/>`
    + C(0, -96, 18, '#A26B47', S) + `<ellipse cx="-5" cy="-108" rx="5" ry="2" fill="#C08A63"/>`,
  after: P('M-11 -86 Q-5 -92 0 -88 Q5 -92 11 -86 Q5 -83 0 -85.5 Q-5 -83 -11 -86Z', '#DADADA', `stroke="${O}" stroke-width="1.2"`),
});
/** Duit: the ginger cat (duit = money). pose 'sit' | 'sleep'. */
export const duit = ({ x = 160, y = 188, s = 1, face: f = 'happy', pose = 'sit', flip = false } = {}) => {
  const G = '#F2A541', W = '#FFF6E8', D = '#D07F2A';
  const inner = pose === 'sleep'
    ? limb('M14 -4 Q22 -2 20 -10', G, 5) + `<ellipse cx="2" cy="-9" rx="17" ry="10" fill="${G}" ${S}/>` + C(-12, -12, 10, G, S)
      + P('M-20 -18 L-20 -26 L-14 -20Z', G, S) + P('M-9 -21 L-5 -28 L-3 -19Z', G, S) + L('M-17 -12 Q-15 -10 -13 -12') + L('M-9 -12 Q-7 -10 -5 -12')
      + txt(-2, -30, 'z', 9, '#8FA7FF') + txt(6, -38, 'z', 7, '#8FA7FF')
    : limb('M10 -5 Q26 -6 22 -24', G, 5) + `<ellipse cx="0" cy="-14" rx="13" ry="14" fill="${G}" ${S}/>` + `<ellipse cx="0" cy="-10" rx="7" ry="9" fill="${W}"/>`
      + `<ellipse cx="-5" cy="-1.5" rx="4" ry="2.6" fill="${W}" ${S}/><ellipse cx="5" cy="-1.5" rx="4" ry="2.6" fill="${W}" ${S}/>`
      + P('M-11 -38 L-11 -51 L-2 -44Z', G, S) + P('M11 -38 L11 -51 L2 -44Z', G, S) + P('M-9.5 -41 L-9.5 -47 L-5 -43.5Z', '#F29CA3') + P('M9.5 -41 L9.5 -47 L5 -43.5Z', '#F29CA3')
      + C(0, -34, 12, G, S) + line('M-3 -45 V-41 M0 -46 V-41 M3 -45 V-41', D, 1.6) + `<ellipse cx="0" cy="-29" rx="6" ry="4" fill="${W}"/>`
      + face(f, -34, 6, 0.55) + P('M-1.6 -31.5 H1.6 L0 -29.8Z', '#E0707A') + line('M-8 -23 Q0 -20 8 -23', '#D7263D', 2.4) + C(0, -20.5, 2.4, '#F4C542', `stroke="${O}" stroke-width="1"`);
  return at(x, y, s, inner, flip);
};

// ---- items (centred, ~44 box) ---------------------------------------------------------------------------
const tag = t => P('M-19 -11 H9 L19 0 L9 11 H-19Z', '#FFD166', 'transform="rotate(-12)"') + C(12, -3, 2.5, '#8A5A2B', 'transform="rotate(-12)"') + txt(-5, 5, t, 13, '#5A2E12', 'transform="rotate(-12)"');
const jar = lv => { const top = 18 - 32 * lv; return R(-15, -14, 30, 34, '#D6ECF3', 'rx="7"')
  + `<clipPath id="jc${Math.round(lv * 10)}"><rect x="-15" y="-14" width="30" height="34" rx="7"/></clipPath><g clip-path="url(#jc${Math.round(lv * 10)})">${R(-15, top, 30, 40, '#F2C14E')}${ring(6, a => C(-10 + a / 30, top + 3 + (a % 120) / 40, 3.2, '#E0A82E'))}</g>`
  + R(-11, -21, 22, 8, '#C94F3D', 'rx="2"') + R(-10, -9, 4, 20, '#FFFFFF', 'rx="2" opacity=".6"') + R(-3, -2, 14, 10, '#FFFFFF', 'rx="2"') + C(4, 3, 3, '#F2C14E'); };
const cupT = (c, body) => P('M-12 -12 H12 L9 20 H-9Z', '#EEF3F0') + body + P('M-13 -14 H13 V-11 H-13Z', '#D9E2DD') + line('M3 -13 L9 -25', c, 3);
export const ITEMS = {
  apambalik: P('M-22 3 A22 22 0 0 1 22 3Z', '#E3A247') + P('M-17 3 A17 17 0 0 1 17 3', 'none', 'stroke="#C47F2C" stroke-width="2"')
    + `<g fill="#C47F2C">${[[-9, -9], [0, -13], [8, -8], [-2, -4], [12, -1], [-13, -2]].map(([a, b]) => C(a, b, 1.6, '')).join('')}</g>`
    + R(-22, 3, 44, 8, '#F6D98B', 'rx="3"') + `<g fill="#A8672F">${[-15, -7, 1, 9, 16].map(a => C(a, 7, 1.9, '')).join('')}</g>` + R(-22, 11, 44, 5, '#D08E3A', 'rx="2.5"'),
  burger: P('M-20 12 H20 V15 Q20 19 16 19 H-16 Q-20 19 -20 15Z', '#D98C43') + R(-20, 5, 40, 7, '#6B3A22', 'rx="3"') + P('M-9 11 v5 a2 2 0 0 0 4 0 v-5Z', '#D7263D')
    + R(-21, 1, 42, 5, '#F6D04D', 'rx="2"') + P('M-22 -2 q3 5 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0 v4 h-42Z', '#6DBE45') + P('M-20 -1 C-20 -17 20 -17 20 -1Z', '#E09A4F')
    + `<g fill="#FFF3D6">${[[-9, -8], [-1, -11], [7, -8], [2, -5], [-5, -4]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="1.8" ry="1"/>`).join('')}</g>`,
  airtebu: `<g transform="rotate(-12)">${R(-21, -22, 7, 42, '#9DBB3E', 'rx="3"')}${line('M-21 -8 H-14 M-21 6 H-14', '#6E8B22', 2)}${P('M-18 -22 Q-25 -26 -23 -29 Q-16 -27 -17 -22Z', '#6FA83A')}</g>`
    + cupT('#E5484D', P('M-11.3 -5 H11.3 L9 20 H-9Z', '#A5CB55') + R(-6, -2, 6, 6, '#FFFFFF', 'opacity=".55" rx="1"') + R(2, 4, 6, 6, '#FFFFFF', 'opacity=".55" rx="1"')),
  lekor: `<ellipse cx="0" cy="8" rx="22" ry="10" fill="#F2EEE6"/>` + [[-8, -2, -14], [-3, 6, 4], [6, -3, 18]].map(([a, b, r]) => `<g transform="translate(${a} ${b}) rotate(${r})">${R(-16, -4.5, 32, 9, '#D9A55B', 'rx="4.5"') + R(-13, -3, 24, 2.5, '#EBC285', 'rx="1.2"')}${C(-6, -1, 1.1, '#8C6A44')}${C(3, 1, 1.1, '#8C6A44')}${C(9, -1, 1.1, '#8C6A44')}</g>`).join('')
    + C(14, -13, 8, '#FFFFFF', 'stroke="#D5DCE3" stroke-width="1.5"') + C(14, -13, 5.5, '#C8302C'),
  sotong: line('M0 4 V23', '#C9A36B', 3) + P('M-9 -16 L-15 -10 L-7 -8Z M9 -16 L15 -10 L7 -8Z', '#C85F30') + P('M0 -23 C10 -18 11 0 7 6 H-7 C-11 0 -10 -18 0 -23Z', '#D9713F')
    + line('M-5 6 Q-7 12 -5 16 M-1.5 6 V17 M1.5 6 V17 M5 6 Q7 12 5 16', '#C85F30', 2.2) + line('M-5 -10 L5 -8 M-6 -3 L6 -1', '#8E3B1E', 2),
  cucur: ring(12, a => C(0, -17, 5, '#D48E2C', `transform="rotate(${a})"`)) + C(0, 0, 18, '#E2A13B') + `<g fill="#F3C267">${C(-8, 6, 3, '')}${C(7, 8, 2.5, '')}${C(-9, -8, 2.5, '')}</g>`
    + line('M-9 2 C-10 -10 8 -12 9 -1', '#EF6B3A', 6) + P('M-11 2 L-7 8 L-5 2Z', '#EF6B3A') + line('M4 10 L8 12 M-3 12 L0 15', '#4E9A3C', 2),
  pisanggoreng: R(-20, -18, 40, 38, '#F5EFE0', 'rx="3" transform="rotate(8)"') + [-22, 0, 22].map((r, i) => `<g transform="translate(${(i - 1) * 3} ${(i - 1) * 10}) rotate(${r / 3})"><ellipse cx="0" cy="0" rx="19" ry="6" fill="#E3A63E"/><ellipse cx="-3" cy="-2" rx="11" ry="2.2" fill="#F2C470"/>${C(9, 2, 1.3, '#B77420')}${C(-8, 2, 1.3, '#B77420')}</g>`).join(''),
  loklok: [[-18, '#F2EFE8', 'c'], [0, '#D9483B', 'r'], [18, '#F2C94C', 's']].map(([r, c, k]) => `<g transform="rotate(${r} 0 18)">${line('M0 18 V-24', '#C9A36B', 2)}${k === 'c' ? C(0, -18, 4.5, c) + C(0, -8, 4.5, c) : k === 'r' ? R(-3.5, -24, 7, 20, c, 'rx="3.5"') : R(-4.5, -22, 9, 7, c) + R(-4.5, -13, 9, 7, c)}</g>`).join('')
    + P('M-12 8 H12 L9 22 H-9Z', '#C0392B') + R(-13, 6, 26, 4, '#E05A47', 'rx="2"'),
  murtabak: R(-19, -15, 34, 30, '#D69A4E', 'rx="5"') + line('M-2 -15 V15 M-19 0 H15', '#A86A2A', 2.5) + line('M-14 -9 L-8 -9 M4 6 L10 6 M-13 7 L-7 7', '#E8B872', 2) + C(15, 13, 8, '#FFFFFF') + C(15, 13, 6, '#C45A1E'),
  ckt: `<ellipse cx="0" cy="6" rx="22" ry="12" fill="#FFFFFF" stroke="#D5DCE3" stroke-width="2"/><ellipse cx="0" cy="2" rx="16" ry="8" fill="#8B5A2B"/>`
    + line('M-12 2 Q-6 -3 0 2 T12 2 M-9 6 Q-3 1 3 6 T13 5 M-10 -2 Q-4 -6 2 -2', '#B07A40', 2.4) + line('M-6 -3 L-2 -6 M7 -2 L10 -5 M-12 4 L-9 1', '#4E9A3C', 2)
    + line('M4 -4 C7 -8 11 -6 9 -2', '#F07B4F', 3) + C(-4, 5, 2.2, '#F6D04D') + C(9, 6, 2, '#F6D04D'),
  putupiring: `<ellipse cx="0" cy="4" rx="23" ry="12" fill="#4E9A3C" transform="rotate(-10)"/>` + line('M-20 8 L20 0', '#3E7F2E', 1.5)
    + [[-10, 5], [10, 3], [0, -8]].map(([a, b]) => C(a, b, 9, '#F7F4EC') + C(a, b, 4.5, '#8A5427') + C(a - 3, b - 4, 1.5, '#FFFFFF')).join(''),
  kuihlapis: P('M-14 -8 L-6 -16 H18 L10 -8Z', '#FFB3C7') + P('M10 -8 L18 -16 V12 L10 20Z', '#C23B63')
    + [0, 1, 2, 3, 4, 5, 6].map(i => R(-14, -8 + i * 4, 24, 4, i % 2 ? '#FBE3EA' : '#E75480')).join(''),
  rojak: P('M-20 -2 Q0 -20 20 -2Z', '#5A3420') + [[-10, -6, '#F4C542'], [-2, -10, '#7BBF4A'], [6, -6, '#F3F1E6'], [0, -5, '#F4C542']].map(([a, b, c]) => R(a, b, 7, 5, c, `transform="rotate(${a * 3} ${a} ${b})"`)).join('')
    + `<g fill="#D9A066">${C(-5, -8, 1.2, '')}${C(3, -11, 1.2, '')}${C(10, -5, 1.2, '')}</g>` + P('M-22 -2 H22 A22 18 0 0 1 -22 -2Z', '#F1E7D8') + R(-22, -2, 44, 4, '#3A86C8'),
  cendol: P('M-13 -12 H13 L10 22 H-10Z', '#D8EEF0', 'stroke="#A9CBD1" stroke-width="1.5"') + P('M-12 2 H12 L10 22 H-10Z', '#FFF8EC') + P('M-10.8 13 H10.8 L10 22 H-10Z', '#7A4A24')
    + line('M-8 8 q2 -3 4 0 t4 0 t4 0 t4 0', '#5CB85C', 3) + C(-5, 17, 1.6, '#8E2F3A') + C(3, 18, 1.6, '#8E2F3A')
    + P('M-15 -12 Q0 -32 15 -12Z', '#F7F7F7') + line('M-8 -16 Q-3 -24 2 -18 T10 -16', '#8B5A2B', 2.5),
  balloon: line('M-9 -2 L0 22 M9 -6 L0 22 M0 4 L0 22', '#8A8A8A', 1.2) + [[-9, -12, '#E63946'], [9, -14, '#F4C542'], [0, -6, '#3A86FF']].map(([a, b, c]) => `<ellipse cx="${a}" cy="${b}" rx="9" ry="11" fill="${c}"/>${P(`M${a - 2} ${b + 12} h4 l-2 -3Z`, c)}<ellipse cx="${a - 3}" cy="${b - 4}" rx="2" ry="3" fill="#FFFFFF" opacity=".6"/>`).join(''),
  lantern: C(0, 0, 22, '#FFB703', 'opacity=".22"') + line('M0 -24 V-16', '#8A5A2B', 1.5) + R(-8, -18, 16, 5, '#F4C542', 'rx="1.5"') + `<ellipse cx="0" cy="0" rx="17" ry="14" fill="#E63946"/>`
    + line('M-9 -13 Q-14 0 -9 13 M0 -14 V14 M9 -13 Q14 0 9 13', '#B82232', 1.6) + R(-8, 13, 16, 5, '#F4C542', 'rx="1.5"') + line('M-3 19 V25 M0 19 V26 M3 19 V25', '#F4C542', 1.6),
  coins: [0, 1, 2, 3].map(i => `<ellipse cx="-7" cy="${15 - i * 5}" rx="12" ry="4.5" fill="#E9B949" stroke="#C8962E" stroke-width="1.5"/>`).join('')
    + C(9, -6, 12, '#F4C542', 'stroke="#C8962E" stroke-width="1.5"') + C(9, -6, 7.5, 'none', 'stroke="#D39E2A" stroke-width="2"') + `<ellipse cx="5" cy="-11" rx="2" ry="3" fill="#FFF6D0"/>`,
  envelope: R(-14, -20, 28, 14, '#6FBF73', 'rx="1.5" transform="rotate(-6)"') + C(0, -14, 3, '#4E9A52') + R(-20, -12, 40, 28, '#F3E3C0', 'rx="2"') + P('M-20 -12 L0 4 L20 -12', '#E6D1A6'),
  jar: jar(0.5), jarempty: jar(0.12), jarfull: jar(0.85),
  receipt: P('M-13 -21 H13 V17 l-3.25 3 -3.25 -3 -3.25 3 -3.25 -3 -3.25 3 -3.25 -3 -3.25 3 -3.25 -3Z', '#FFFFFF', 'stroke="#C9CED6" stroke-width="1.5"')
    + line('M-8 -14 H8 M-8 -8 H4 M-8 -2 H6 M-8 4 H2', '#B6BCC6', 2.2) + line('M-8 11 H8', '#4A4A4A', 3),
  tote: line('M-8 -8 Q-8 -24 0 -24 Q8 -24 8 -8', '#B99A66', 3.5) + P('M-16 -8 H16 L14 21 H-14Z', '#E8D5B0') + P('M0 2 C7 -4 10 4 0 12 C-10 4 -7 -4 0 2Z', '#6DAA45') + line('M0 3 V16', '#4E8A30', 1.5),
  popiah: [[-12, 5], [12, 5], [0, -4]].map(([a, b]) => C(a, b, 10, '#F4EEDC') + C(a, b, 7, '#6DBE45') + C(a, b, 5.2, '#B07A40') + C(a + 1, b - 1, 1.6, '#E0C38C') + C(a - 2, b + 2, 1.4, '#F07B4F')).join('') + line('M-18 15 Q0 20 18 15', '#6B3A22', 2.5),
  buahpotong: P('M-8 -2 L-12 -24 L-3 -22Z', '#F4C542') + P('M-4 -4 L2 -26 L9 -20Z', '#E63946') + line('M2 -26 L9 -20', '#4E9A3C', 2.5) + P('M4 -2 L14 -20 L16 -12Z', '#9BD15B')
    + P('M-14 -6 H14 L11 22 H-11Z', '#DDEFF2', 'opacity=".95"') + line('M-12 -6 H12', '#B7D3D9', 2),
  jagung: `<g fill="#F4C542">${ring(7, a => C(0, -9, 4, '', `transform="rotate(${a / 4 - 45} 0 0)"`))}${C(-6, -12, 4.5, '')}${C(5, -13, 4.5, '')}${C(0, -16, 4.5, '')}${C(-11, -8, 4, '')}${C(10, -8, 4, '')}</g>`
    + R(12, -26, 4, 20, '#E9EDF1', 'rx="2" transform="rotate(20 14 -16)"') + P('M-15 -6 H15 L11 22 H-11Z', '#FFF8EC', 'stroke="#D9CBB6" stroke-width="1.5"') + R(-14, 2, 28, 5, '#E63946') + R(-13, 12, 26, 3, '#E63946'),
  airbungkus: line('M4 -14 L12 -27', '#35A06A', 3) + P('M-12 -6 Q-19 16 0 21 Q19 16 12 -6Z', '#F29AB9') + P('M-12 -6 L-4 -16 H4 L12 -6Z', '#F7D3E1')
    + R(-6, 2, 6, 6, '#FFFFFF', 'opacity=".5" rx="1"') + R(2, 8, 6, 6, '#FFFFFF', 'opacity=".5" rx="1"') + `<ellipse cx="-7" cy="6" rx="1.8" ry="6" fill="#FFFFFF" opacity=".6"/>`
    + line('M-5 -15 H5', '#E63946', 3) + line('M4 -15 Q20 -24 16 -8', '#E63946', 1.8),
  selipar: [[-9, -4, '#3A86FF'], [9, 4, '#3A86FF']].map(([a, b, c]) => `<g transform="translate(${a} ${b}) rotate(${a})"><ellipse cx="0" cy="0" rx="8.5" ry="17" fill="#FFFFFF"/><ellipse cx="0" cy="0" rx="7" ry="15.5" fill="${c}"/>${line('M0 -9 L-6 4 M0 -9 L6 4', '#E63946', 2.6)}</g>`).join(''),
  timbang: P('M-14 22 H14 L10 2 H-10Z', '#C0392B') + C(0, 8, 9, '#FFFFFF', 'stroke="#8E2A20" stroke-width="2"') + line('M0 8 L4 2', '#E63946', 1.8) + line('M-5 4 L-4 5 M0 1 V2.5 M5 4 L4 5', '#555', 1.2)
    + R(-2, -6, 4, 8, '#8E8E8E') + `<ellipse cx="0" cy="-7" rx="19" ry="4.5" fill="#C3CAD2"/>` + C(-7, -14, 6, '#F39C12') + C(5, -14, 6, '#F5A623') + C(-1, -21, 6, '#F39C12'),
  price: tag('RM5'),
  otakotak: [[-3, -8, -12], [3, 8, 8]].map(([a, b, r]) => `<g transform="translate(${a} ${b}) rotate(${r})">${R(-17, -6, 34, 12, '#5E9E3A', 'rx="3"')}${R(-19, -3, 3, 6, '#E8793A')}${line('M-8 -5 L-4 5 M2 -5 L6 5', '#3B5E22', 1.8)}${line('M-21 0 H-12 M12 0 H21', '#C9A36B', 1.8)}</g>`).join(''),
  diya: P('M0 -24 C7 -15 6 -8 0 -4 C-6 -8 -7 -15 0 -24Z', '#FFB703') + P('M0 -16 C3 -12 3 -9 0 -7 C-3 -9 -3 -12 0 -16Z', '#FF6B00')
    + P('M-20 -2 Q-18 16 0 16 Q18 16 20 -2 Q10 3 0 3 Q-10 3 -20 -2Z', '#C8672E') + P('M-20 -2 Q-10 3 0 3 Q10 3 20 -2 Q10 -4 0 -4 Q-10 -4 -20 -2Z', '#E08A4C')
    + `<g fill="#F4C542">${C(-10, 9, 1.8, '')}${C(0, 11, 1.8, '')}${C(10, 9, 1.8, '')}</g>`,
  kolam: ring(8, a => `<ellipse cx="0" cy="-12" rx="5" ry="9" fill="${a % 90 ? '#F28C28' : '#E63973'}" transform="rotate(${a})"/>`) + ring(8, a => C(0, -21, 2.6, '#3A86FF', `transform="rotate(${a + 22.5})"`))
    + C(0, 0, 6, '#FFD166') + C(0, 0, 2.5, '#2A9D8F'),
  // props only (not stickers)
  phone: R(-9, -16, 18, 32, '#2B2F3A', 'rx="3"') + R(-7, -12, 14, 22, '#8ED1FC', 'rx="1"') + R(-5, -9, 10, 3, '#FFFFFF') + R(-5, -3, 7, 3, '#FFFFFF') + C(0, 13, 1.4, '#6B7280'),
  teh: P('M-9 -12 H9 L7 14 H-7Z', '#F4F1EC') + P('M-8.5 -7 H8.5 L7 14 H-7Z', '#C8773A') + R(-9, -7, 18, 4, '#F7E7D0') + line('M9 -4 Q16 -2 9 6', '#F4F1EC', 3),
  note: R(-18, -9, 36, 18, '#E58E4B', 'rx="2"') + C(-9, 0, 5, '#C8702E') + R(2, -3, 12, 2.5, '#FFE2C4') + R(2, 2, 8, 2.5, '#FFE2C4'),
  toy: line('M0 22 V-4', '#8A8A8A', 2.5) + C(0, -12, 17, '#9D4EDD', 'opacity=".25"') + ring(4, a => P('M0 -12 L-4 -24 Q0 -28 4 -24Z', ['#FF4D6D', '#FFD166', '#06D6A0', '#4CC9F0'][a / 90], `transform="rotate(${a} 0 -12)"`)) + C(0, -12, 3, '#FFFFFF'),
  apron: line('M-8 -18 Q-8 -30 0 -30 Q8 -30 8 -18', '#7C2D12', 2.5) + P('M-9 -18 H9 L10 -6 Q14 -4 16 -2 L18 20 H-18 L-16 -2 Q-14 -4 -10 -6Z', '#C2410C') + R(-8, 2, 16, 9, '#E0632A', 'rx="2"') + line('M-16 -6 H-24 M16 -6 H24', '#7C2D12', 2),
  gift: R(-16, -8, 32, 26, '#E63946', 'rx="2"') + R(-18, -14, 36, 8, '#F25C68', 'rx="2"') + R(-3, -14, 6, 32, '#F4C542') + P('M0 -14 C-10 -26 -16 -16 0 -14 C16 -16 10 -26 0 -14Z', '#F4C542'),
};
/** An item at (x, y), s scale (1 = about 44 across). */
export const it = (name, x, y, s = 1) => at(x, y, s, ITEMS[name] || '');
/** A price tag with any text. */
export const priceTag = (t, x, y, s = 1) => at(x, y, s, tag(t));

// ---- scenery -------------------------------------------------------------------------------------------
const STARS = [[18, 16], [62, 38], [108, 10], [150, 30], [204, 14], [246, 40], [296, 20], [304, 64], [30, 64], [176, 56]];
const sky = (a = '#1C2750', b = '#26356A') => R(0, 0, 320, 200, a) + R(0, 96, 320, 104, b) + `<g fill="#FFFFFF" opacity=".75">${STARS.map(([x, y]) => C(x, y, 1.2, '')).join('')}</g>`;
const ground = (c = '#3A3446') => R(0, 172, 320, 28, c) + R(0, 172, 320, 3, '#4E4860');
const moon = (x = 272, y = 36, bg = '#1C2750') => C(x, y, 14, '#FFF3C4') + C(x + 7, y - 5, 12, bg);
const BULB = ['#FFD166', '#EF476F', '#06D6A0', '#FFFFFF', '#FF9F1C'];
/** A string of fairy lights sagging across the top. */
export const lights = (y = 10) => line(`M0 ${y} Q80 ${y + 36} 160 ${y} Q240 ${y + 36} 320 ${y}`, '#1A1A1A', 1.2)
  + Array.from({ length: 16 }, (_, i) => { const x = 10 + i * 20, u = (x % 160) / 160, yy = y + 36 * u * (1 - u); return C(x, yy + 3, 5, BULB[i % 5], 'opacity=".25"') + C(x, yy + 3, 2.4, BULB[i % 5]); }).join('');
/** A striped awning with a scalloped edge. */
export const canopy = (x, y, w, h = 16, a = '#E63946', b = '#F1FAEE') => {
  const n = Math.max(2, Math.round(w / 16)), sw = w / n;
  return Array.from({ length: n }, (_, i) => R(x + i * sw, y, sw + 0.3, h, i % 2 ? b : a) + C(x + i * sw + sw / 2, y + h, sw / 2, i % 2 ? b : a)).join('') + R(x - 2, y - 3, w + 4, 4, '#5A3A2A', 'rx="2"');
};
const miniStall = (x, w, a, b) => R(x + 4, 104, w - 8, 60, '#2A2140') + R(x + 8, 110, w - 16, 26, '#FFB85C', 'opacity=".55"') + R(x, 136, w, 30, '#6A4B3A') + R(x + 2, 88, 3, 76, '#6B5B4D') + R(x + w - 5, 88, 3, 76, '#6B5B4D') + canopy(x, 84, w, 12, a, b);
const crowd = [[36, 162, 7], [94, 160, 6], [205, 163, 7], [286, 160, 6]].map(([x, y, r]) => C(x, y - r * 2.4, r, '#2A2F4A') + R(x - r * 1.4, y - r * 1.4, r * 2.8, r * 3, '#2A2F4A', `rx="${r}"`)).join('');
const house = (x, w, h) => R(x, 172 - h, w, h, '#161E3C') + P(`M${x - 4} ${172 - h} L${x + w / 2} ${150 - h} L${x + w + 4} ${172 - h}Z`, '#161E3C') + R(x + w / 2 - 5, 182 - h, 10, 10, '#FFD166', 'opacity=".85"');

/** A full-bleed background. kind: stall | street | home | kopitiam | night | bus.
 *  stall opts: { sign, a, b (canopy colours), behind (markup drawn behind the counter), items (markup on the counter) } */
export function scene(kind, o = {}) {
  if (kind === 'stall') return sky() + ground() + canopy(18, 24, 284, 16, o.a, o.b) + R(22, 40, 4, 134, '#6B5B4D') + R(294, 40, 4, 134, '#6B5B4D')
    + it('lantern', 46, 68, 0.6) + it('lantern', 274, 68, 0.6) + (o.sign ? R(100, 1, 120, 18, '#FFD166', 'rx="4"') + txt(160, 15, o.sign, 13, '#7A2E1A', 'letter-spacing="1"') : '')
    + (o.behind || '') + R(26, 124, 268, 8, '#8C5E3B', 'rx="2"') + R(30, 132, 260, 44, '#B5835A') + line('M30 150 H290', '#9C6C47', 2) + (o.items || '');
  if (kind === 'street') return sky() + ground() + miniStall(8, 96, '#E63946', '#F1FAEE') + miniStall(112, 96, '#2A9D8F', '#F1FAEE') + miniStall(216, 96, '#F4A261', '#FFFFFF') + crowd + lights(6);
  if (kind === 'night') return sky() + moon() + house(10, 50, 40) + house(74, 40, 60) + house(128, 60, 34) + house(204, 44, 54) + house(262, 52, 38) + ground('#2F2B3C');
  if (kind === 'home') {
    const day = o.day, glass = day ? '#9FD3F0' : '#22305A';
    return R(0, 0, 320, 200, '#F6E7CF') + R(0, 128, 320, 44, '#EAD3B2') + R(0, 172, 320, 28, '#C58F5E') + line('M0 172 H320', '#A87547', 3)
      + R(28, 26, 84, 72, '#FFFFFF', 'rx="3"') + R(33, 31, 74, 62, glass) + (day ? C(86, 50, 10, '#FFE27A') : moon(86, 50, glass) + C(48, 44, 1.2, '#FFF') + C(60, 70, 1.2, '#FFF')) + line('M70 31 V93 M33 62 H107', '#FFFFFF', 3)
      + P('M22 22 H40 Q34 60 42 102 H22Z', '#E07A5F') + P('M118 22 H100 Q106 60 98 102 H118Z', '#E07A5F') + R(20, 18, 100, 5, '#8C5E3B', 'rx="2"')
      + R(232, 36, 48, 36, '#FFFFFF', 'rx="2"') + R(236, 40, 40, 28, '#8ECAE6') + P('M236 68 L250 50 L262 62 L268 56 L276 68Z', '#2A9D8F') + C(268, 47, 3.5, '#FFD166')
      + P('M280 172 L284 148 H304 L308 172Z', '#C2410C') + ring(5, a => `<ellipse cx="294" cy="132" rx="5" ry="16" fill="#3E8E41" transform="rotate(${a / 5 - 36} 294 148)"/>`);
  }
  if (kind === 'kopitiam') {
    const tx = o.table ?? 262;
    return R(0, 0, 320, 200, '#FFF4DA') + R(0, 104, 320, 68, '#8CC7A1') + Array.from({ length: 16 }, (_, i) => line(`M${i * 20 + 10} 104 V172`, '#76B08C', 1.5)).join('') + line('M0 126 H320 M0 149 H320', '#76B08C', 1.5)
      + R(0, 172, 320, 28, '#D9C7A5') + Array.from({ length: 8 }, (_, i) => R(i * 40 + (i % 2) * 20, 180, 20, 20, '#CDB893')).join('')
      + R(14, 14, 76, 58, '#2F3E46', 'rx="3"') + txt(52, 34, 'KOPI', 12, '#FFD166') + txt(52, 50, 'TEH', 12, '#FFFFFF') + txt(52, 65, 'MILO', 10, '#8ED1FC')
      + line('M160 0 V12', '#555', 2) + `<ellipse cx="160" cy="14" rx="34" ry="3.5" fill="#6B7280"/>` + C(160, 14, 5, '#4B5563')
      + (tx === false ? '' : `<ellipse cx="${tx}" cy="140" rx="34" ry="7" fill="#F2F2F0" ${S}/>` + R(tx - 3, 146, 6, 26, '#4B5563') + R(tx - 16, 170, 32, 4, '#4B5563', 'rx="2"') + it('teh', tx - 14, 129, 0.45) + it('teh', tx + 12, 129, 0.45));
  }
  if (kind === 'bus') return R(0, 0, 320, 200, '#E8EDF2') + [16, 120, 224].map(x => R(x, 26, 88, 70, '#9AA6B6', 'rx="8"') + R(x + 4, 30, 80, 62, '#2C3E66', 'rx="6"') + C(x + 20, 70, 4, '#FFD166', 'opacity=".7"') + C(x + 56, 58, 3, '#EF476F', 'opacity=".7"')).join('')
    + R(0, 100, 320, 4, '#C7CFD9') + R(0, 172, 320, 28, '#8A94A6') + R(258, 0, 6, 172, '#F4C542') + R(270, 118, 50, 40, '#3867D6', 'rx="8"') + R(274, 150, 46, 22, '#2E56B8');
  return sky() + ground();
}
