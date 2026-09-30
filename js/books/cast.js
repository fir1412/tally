// The sticker-book cast in a warm gouache style: Aina, Wei, Uncle Raju and Duit the cat, plus scenes and props.
// castKit(prefix) hands a book its drawing functions. Poses, faces and scenes are drawn once, as <g id> in
// kit.defs() (the book exports that as `defs`; the sheet puts it in one hidden <svg>), and panels <use> them.
// Characters stand with their feet at (x, y) in a 320x200 panel; s scales, flip mirrors (they face +x).
// Items are drawn centred on 0,0 in a box about 44 wide, so one drawing is both a sticker (64x64) and a prop.
// Stickers carry their own grain filter so they also work outside the sheet.
const f1 = n => Math.round(n * 10) / 10;
const INK = '#3B2723', SH = '#1B1430';
export const ring = (n, f) => Array.from({ length: n }, (_, i) => f(i * 360 / n)).join('');
const at = (x, y, s, inner, flip = false) => `<g transform="translate(${f1(x)} ${f1(y)})${s !== 1 || flip ? ` scale(${flip ? -s : s} ${s})` : ''}">${inner}</g>`;
const d = (p, c, more = '') => `<path d="${p}" fill="${c}"${more}/>`;
const e = (x, y, rx, ry, c, more = '') => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${rx}" ry="${ry}" fill="${c}"${more}/>`;
const C = (x, y, r, c, more = '') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${c}"${more}/>`;
const R = (x, y, w, h, c, more = '') => `<path d="M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z" fill="${c}"${more}/>`;
const RR = (x, y, w, h, rx, c, more = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c}"${more}/>`;
const ln = (p, c, w = 1, more = '') => `<path d="${p}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${more}/>`;
const shade = (p, o = 0.22) => `<path d="${p}" fill="${SH}" opacity="${o}"/>`;
const txt = (x, y, t, size, c, more = '') => `<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-weight="800" font-size="${size}" text-anchor="middle" fill="${c}"${more}>${t}</text>`;
const canopyD = (x, y, w, h, n) => { const r = w / n / 2; return `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}` + `a${f1(r)} ${f1(r)} 0 0 1 ${f1(-2 * r)} 0`.repeat(n) + 'Z'; };

// ---- faces, drawn around the head's centre; m = mouth height ---------------------------------------------
const dots = (a, b, c2, d2, w = 1.9) => ln(`M${a} ${b - 0.2}v.4M${c2} ${d2 - 0.2}v.4`, INK, w);
const MOUTH = '#7A3A34';
const FACE = {
  happy: m => dots(-2.8, 0, 2.8, 0) + ln(`M-4.3-3.4Q-3-4-1.6-3.6M1.6-3.6Q3-4 4.3-3.4M-1.9 ${m}Q0 ${m + 1.5} 1.9 ${m}`, INK, 0.75),
  laugh: m => ln(`M-4-.4Q-2.8-1.9-1.6-.4M1.6-.4Q2.8-1.9 4-.4M-4.3-3.8Q-3-4.4-1.6-4M1.6-4Q3-4.4 4.3-3.8`, INK, 0.75) + d(`M-2.4 ${m - 0.4}Q0 ${m + 3.4} 2.4 ${m - 0.4}Z`, MOUTH),
  worried: m => dots(-2.8, 0.3, 2.8, 0.3) + ln(`M-4.4-3L-1.6-4M1.6-4L4.4-3M-1.6 ${m + 1.2}Q0 ${m + 0.2} 1.6 ${m + 1.2}`, INK, 0.75),
  think: m => dots(-2, -0.6, 3.6, -0.6) + ln(`M-4.3-3.2H-1.6M1.6-4.3Q3-5.1 4.3-4.3M-1 ${m + 0.7}L2 ${m + 0.2}`, INK, 0.75),
  surprised: m => dots(-2.8, 0, 2.8, 0, 2.5) + ln('M-4.3-4.6Q-3-5.4-1.6-4.8M1.6-4.8Q3-5.4 4.3-4.6', INK, 0.75) + e(0, m + 1, 1.2, 1.6, MOUTH),
};
const cheeks = ln('M-4.4 3h0M4.4 3h0', '#D9776B', 2.6, ' opacity=".45"') + ln('M.2 1L-.4 2.6', INK, 0.6, ' opacity=".45"');
const faceArt = (kind, m = 4.4) => cheeks + (FACE[kind] || FACE.happy)(m);

// ---- people ----------------------------------------------------------------------------------------------
// Arms from shoulders (±sx, sy): [ctrl x, ctrl y, end x, end y] for the back (-x) and front (+x) arm.
const DOWN = [7, 17, 5.5, 37];
const POSES = { stand: [DOWN, DOWN], hold: [[6.5, 15, -3, 24.5], [6.5, 15, -3, 24.5]], point: [DOWN, [11.5, 5, 22, 1]], wave: [DOWN, [12.5, -5, 9.5, -24]], cheer: [[12.5, -5, 9.5, -24], [12.5, -5, 9.5, -24]] };
const arms = (sx, sy, pose) => { const [a, b] = POSES[pose] || POSES.stand;
  return { d: `M${-sx} ${sy}q${-a[0]} ${a[1]} ${-a[2]} ${a[3]}M${sx} ${sy}q${b[0]} ${b[1]} ${b[2]} ${b[3]}`, hands: [[-sx - a[2], sy + a[3] + 1], [sx + b[2], sy + b[3] + 1]] }; };
const hands = (hs, c) => hs.map(([x, y]) => e(x, y, 2.8, 3, c)).join('');
const foot = (c, a = -5.5, b = 5.5) => e(a, -2.4, 5, 2.4, c) + e(b, -2.6, 5, 2.4, c);
const shadowE = e(0, 0, 17, 3.4, '#120E1E', ' opacity=".35"');

const A = { skin: '#D9A27E', tudung: '#B8645E', tunic: '#2F6B66', arm: '#29605B', skirt: '#24504C', shoe: '#3A2A28' };
const TUDUNG = d('M0-133C-12-133-14.5-121-13.5-113C-15.5-106-19.5-99-16.5-90Q0-84 16.5-90C19.5-99 15.5-106 13.5-113C14.5-121 12-133 0-133Z', A.tudung)
  + shade('M4-132C10-130 14-122 13.5-113C15.5-106 19.5-99 16.5-90Q12-88 8-87C12-96 12-104 10-112C11-120 9-128 4-132Z')
  + e(0, -117.5, 7, 9, A.skin) + ln('M-8-128Q0-133 8-128', '#9E524D', 0.7) + C(0, -88, 1.3, '#D9A441');
function ainaBody(pose) {
  if (pose === 'kneel') { const k = arms(12.5, -57, 'hold');
    return d('M-12-60Q-16-34-20-4Q0 0 20-4Q16-34 12-60Z', A.tunic) + shade('M4-60Q9-60 12-60Q16-34 20-4Q13-2 8-2Q8-30 4-60Z')
      + ln('M-12.5-57Q-19-42-8-29M12.5-57Q19-42 9-27', A.arm, 6) + at(0, 40, 1, TUDUNG) + hands([[-7.5, -28], [8.5, -26]], A.skin); }
  const k = arms(12.5, -97, pose);
  return shadowE + foot(A.shoe, -6, 5) + d('M-10-70L-13.5-4Q0-1.5 13.5-4L10-70Z', A.skirt) + shade('M4-70L10-70L13.5-4Q9-3 6-3Z')
    + d('M-12-100Q-15.5-74-17.5-38Q0-34 17.5-38Q15.5-74 12-100Z', A.tunic) + shade('M4-100Q9-100 12-100Q15.5-74 17.5-38Q12-36.5 7-36Q8-70 4-100Z')
    + ln(k.d, A.arm, 6) + TUDUNG + (pose === 'hold' ? '' : hands(k.hands, A.skin));
}
const W = { skin: '#E3B48E', shirt: '#D9A441', jeans: '#46557E', shoe: '#E9DFCF', hair: '#2A2226' };
const weiHead = d('M-10-117Q-11-131.5 0-131.5Q11-131.5 10-117L10.5-106Q6-104 3.5-107.5H-3.5Q-6-104-10.5-106Z', W.hair) + e(0, -117, 7.2, 9.2, W.skin)
  + d('M-8-118.5Q-9-129.5 0-129.5Q9-129.5 8-118.5Q4-123-1-122Q-5-123-8-118.5Z', W.hair) + RR(3, -127, 4.5, 1.8, 0.8, '#D9A441');
function weiBody(pose) {
  if (pose === 'hug') return shadowE.replace('rx="17"', 'rx="22"') + d('M10-4Q12 0 6 0H-19Q-22-2-19-5L-16-7L-16.5-27Q-13-35-6-31L9-14Z', W.jeans) + shade('M-2-26L9-14L10-4H3Z') + e(-19, -2.5, 5, 2.6, W.shoe)
    + d('M-5-40Q4-44 11-38L12-4H0Q-5-22-5-40Z', W.shirt) + shade('M5-42Q9-41 11-38L12-4H7Q8-24 5-42Z')
    + ln('M1-37Q-6-28-15-26', W.skin, 4.6) + d('M-3-40L-9-31L-1-29Z', W.shirt) + e(-16, -26, 2.5, 2.7, W.skin) + R(-4.6, -43, 5.2, 6, W.skin) + at(-3, 72, 1, weiHead);
  const k = arms(12.5, -98, pose);
  return shadowE + foot(W.shoe, -6, 6) + d('M-10.5-66L-10-4H-2L0-50L2-4H10L10.5-66Z', W.jeans) + shade('M3-66H10.5L10-4H6Z')
    + R(-2.6, -110, 5.2, 10, W.skin) + d('M-12-101Q-13-84-11-63H11Q13-84 12-101Q0-104.5-12-101Z', W.shirt) + shade('M4-103Q9-102 12-101Q13-84 11-63H6Q8-84 4-103Z')
    + ln(k.d, W.skin, 4.6) + d('M-12-101L-17.5-88L-10.5-86.5ZM12-101L17.5-88L10.5-86.5Z', W.shirt) + weiHead + (pose === 'hold' ? '' : hands(k.hands, W.skin));
}
const J = { skin: '#8E5B3E', shirt: '#6F8FA6', apron: '#EDE0C8', trousers: '#4A4E5E', hair: '#D3CCC2', shoe: '#4A3A30' };
function rajuBody(pose) {
  const k = arms(14, -94, pose);
  return shadowE + foot(J.shoe, -6, 6) + d('M-13-60L-12-4H-2.5L0-46L2.5-4H12L13-60Z', J.trousers) + shade('M4-60H13L12-4H7Z')
    + R(-3, -106, 6, 12, J.skin) + d('M-14-95Q-19-78-15-58H15Q19-78 14-95Q0-98-14-95Z', J.shirt) + shade('M5-97Q12-96 14-95Q19-78 15-58H9Q11-78 5-97Z')
    + d('M-9-86H9L12-57Q0-54-12-57Z', J.apron) + ln('M-8.5-86L-5-96M8.5-86L5-96', J.apron, 1.3) + R(-5, -76, 10, 7, '#DDCFB5')
    + ln(k.d, J.skin, 5) + d('M-14-95L-19.5-83L-11.5-81ZM14-95L19.5-83L11.5-81Z', J.shirt)
    + e(-8, -113, 1.8, 2.6, J.skin) + e(8, -113, 1.8, 2.6, J.skin) + e(0, -114, 8, 9.5, J.skin) + e(-7.2, -115, 2.4, 4.4, J.hair) + e(7.2, -115, 2.4, 4.4, J.hair) + e(-2.5, -121, 3, 1.3, '#A87050')
    + (pose === 'hold' ? '' : hands(k.hands, J.skin));
}
const MOUSTACHE = d('M-4.8 5Q-2.4 2.4 0 3.8Q2.4 2.4 4.8 5Q2.4 6.2 0 5.3Q-2.4 6.2-4.8 5Z', '#DAD3C8');
const G = { fur: '#D98A3D', dark: '#B86E2A', cream: '#F1E3C8', collar: '#B5533A' };
const DUIT = {
  sit: e(0, 0, 11, 2.4, '#120E1E', ' opacity=".35"') + ln('M7-3Q20-2 17-15', G.fur, 3.2) + d('M-9 0Q-12-10-7-20Q0-26 7-20Q12-10 9 0Z', G.fur) + shade('M3-22Q12-10 9 0H4Q7-10 3-22Z')
    + d('M-4-2Q-5-12 0-17Q5-12 4-2Z', G.cream) + e(-3, -1, 2.6, 1.6, G.cream) + e(3, -1, 2.6, 1.6, G.cream)
    + d('M-7-27L-6.5-34.5L-2.5-29.5ZM7-27L6.5-34.5L2.5-29.5Z', G.fur) + e(0, -24.5, 7.5, 6.5, G.fur) + ln('M-2-30.5V-28M0-31V-28.5M2-30.5V-28', G.dark, 1)
    + e(0, -21.8, 3.4, 2.2, G.cream) + d('M-.9-23.2H.9L0-22.2Z', '#C9707A') + ln('M-5-18.5Q0-16.5 5-18.5', G.collar, 1.3) + C(0, -16.8, 1.2, '#D9A441'),
  walk: e(0, 0, 15, 3, '#120E1E', ' opacity=".35"') + ln('M-12-12Q-21-17-17-28', G.fur, 3.2) + ln('M-8-8V-.5M-3-8V-.5M6-8V-.5M10.5-8V-.5', G.dark, 3) + e(0, -11, 13, 6.5, G.fur)
    + shade('M-12-8Q0-3 12-8Q10-5 0-4.5Q-9-5-12-8Z') + ln('M-4-17Q-3-13-4-10M0-17.5Q1-13.5 0-10.5', G.dark, 1.1)
    + d('M9-22L9.5-28.5L13.5-23ZM14.5-23.5L18.5-27.5L18.5-21Z', G.fur) + e(13.5, -18, 6.2, 5.8, G.fur) + e(16.8, -16.5, 2.8, 1.9, G.cream) + ln('M15.2-19.4v.4', INK, 1.7) + ln('M9.5-13.5Q13-12 16-13.5', G.collar, 1.2),
  sleep: e(0, 0, 16, 3, '#120E1E', ' opacity=".35"') + e(0, -7, 14.5, 7.5, G.fur) + shade('M-13-4Q0 2 13-4Q12-1 0 .3Q-10-1-13-4Z') + ln('M-2-13Q-1-9-2-6M3-13.5Q4-9.5 3-6.5', G.dark, 1.1)
    + d('M-15-12L-15.5-18.5L-11-14ZM-8.5-14.5L-5-19L-4.5-12.5Z', G.fur) + e(-10, -9, 6, 5.3, G.fur) + ln('M-13-9.5Q-12-8.3-11-9.5M-8.5-9.5Q-7.5-8.3-6.5-9.5', INK, 0.7) + ln('M12-4Q16 2 2 1.8', G.fur, 3.2)
    + txt(-2, -18, 'z', 7, '#9FB0D9') + txt(4, -25, 'z', 5.5, '#9FB0D9'),
};

// ---- items (centred, ~44 box), in a muted gouache palette -------------------------------------------------
const tag = t => `<g transform="rotate(-12)">${d('M-19-11H9L19 0L9 11H-19Z', '#E3B54A')}${d('M-19 5H9L14 0L19 0L9 11H-19Z', SH, ' opacity=".12"')}${C(12, -3, 2.5, '#6E4533')}${txt(-5, 5, t, 13, '#5A2E12')}</g>`;
const jar = lv => { const top = 18 - 30 * lv;
  return RR(-15, -14, 30, 34, 7, '#CFDCD6') + d(`M-15 ${top}H15V13Q15 20 8 20H-8Q-15 20-15 13Z`, '#D9A441') + ln(`M-10 ${top + 4}h3M-2 ${top + 3}h4M6 ${top + 5}h3M-7 ${top + 9}h3M3 ${top + 10}h4`, '#B8862E', 2)
    + shade('M6-14H8Q15-14 15-7V13Q15 20 8 20H6Z', 0.12) + RR(-11, -21, 22, 8, 2, '#B5533A') + RR(-10, -9, 3.5, 20, 1.7, '#FFFFFF', ' opacity=".45"') + RR(-3, -2, 14, 10, 2, '#F1E3C8') + C(4, 3, 3, '#B5533A'); };
const cupT = (c, body) => d('M-12-12H12L9 20H-9Z', '#E4E6DC') + body + d('M-13-14H13V-11H-13Z', '#CBD1C6') + ln('M3-13L9-25', c, 3);
const ITEMS = {
  apambalik: d('M-22 3A22 22 0 0 1 22 3Z', '#D9954A') + d('M9-17A22 22 0 0 1 22 3H14A16 16 0 0 0 9-17Z', SH, ' opacity=".15"')
    + `<g fill="#B8763A">${[[-9, -9], [0, -13], [8, -8], [-2, -4], [12, -1], [-13, -2]].map(([a, b]) => C(a, b, 1.6, '')).join('')}</g>`
    + RR(-22, 3, 44, 8, 3, '#F0D48A') + `<g fill="#9C5E2E">${[-15, -7, 1, 9, 16].map(a => C(a, 7, 1.9, '')).join('')}</g>` + RR(-22, 11, 44, 5, 2.5, '#B8763A'),
  burger: d('M-20 12H20V15Q20 19 16 19H-16Q-20 19-20 15Z', '#C98A45') + RR(-20, 5, 40, 7, 3, '#5E3522') + d('M-9 11v5a2 2 0 0 0 4 0v-5Z', '#B5433A')
    + RR(-21, 1, 42, 5, 2, '#E3B54A') + d('M-22-2q3 5 6 0t6 0t6 0t6 0t6 0t6 0t6 0v4h-42Z', '#7FA35A') + d('M-20-1C-20-17 20-17 20-1Z', '#D08F4C') + shade('M8-11C16-9 20-5 20-1H10Z', 0.12)
    + `<g fill="#F4E6CC">${[[-9, -8], [-1, -11], [7, -8], [2, -5], [-5, -4]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="1.8" ry="1"/>`).join('')}</g>`,
  airtebu: `<g transform="rotate(-12)">${R(-21, -22, 7, 42, '#9AAE4A')}${ln('M-21-8H-14M-21 6H-14', '#6E7F2E', 2)}${d('M-18-22Q-25-26-23-29Q-16-27-17-22Z', '#6F8F45')}</g>`
    + cupT('#C44A36', d('M-11.3-5H11.3L9 20H-9Z', '#A8BA5E') + RR(-6, -2, 6, 6, 1, '#FFFFFF', ' opacity=".45"') + RR(2, 4, 6, 6, 1, '#FFFFFF', ' opacity=".45"')),
  lekor: e(0, 8, 22, 10, '#EDE3D2') + [[-8, -2, -14], [-3, 6, 4], [6, -3, 18]].map(([a, b, r]) => `<g transform="translate(${a} ${b}) rotate(${r})">${RR(-16, -4.5, 32, 9, 4.5, '#C9974F')}${RR(-13, -3, 24, 2.5, 1.2, '#E0B679')}${C(-6, 1, 1, '#8C6A44')}${C(5, 1.5, 1, '#8C6A44')}</g>`).join('')
    + C(14, -13, 8, '#EDE3D2') + C(14, -13, 5.5, '#A9463A'),
  sotong: ln('M0 4V23', '#B99A68', 3) + d('M-9-16L-15-10L-7-8ZM9-16L15-10L7-8Z', '#B85A34') + d('M0-23C10-18 11 0 7 6H-7C-11 0-10-18 0-23Z', '#C96A3F') + shade('M2-22C10-17 11 0 7 6H3C6-4 6-14 2-22Z', 0.15)
    + ln('M-5 6Q-7 12-5 16M-1.5 6V17M1.5 6V17M5 6Q7 12 5 16', '#B85A34', 2.2) + ln('M-5-10L5-8M-6-3L6-1', '#7E3A1E', 2),
  cucur: ring(12, a => C(0, -17, 5, '#C4863A', ` transform="rotate(${a})"`)) + C(0, 0, 18, '#D69A45') + `<g fill="#E8BA70">${C(-8, 6, 3, '')}${C(7, 8, 2.5, '')}${C(-9, -8, 2.5, '')}</g>`
    + ln('M-9 2C-10-10 8-12 9-1', '#D0674E', 6) + d('M-11 2L-7 8L-5 2Z', '#D0674E') + ln('M4 10L8 12M-3 12L0 15', '#5E8B4A', 2),
  pisanggoreng: RR(-20, -18, 40, 38, 3, '#EFE6D3', ' transform="rotate(8)"') + [-22, 0, 22].map((r, i) => `<g transform="translate(${(i - 1) * 3} ${(i - 1) * 10}) rotate(${r / 3})">${e(0, 0, 19, 6, '#D69A45')}${e(-3, -2, 11, 2.2, '#E8BC72')}${C(9, 2, 1.3, '#A86F2A')}${C(-8, 2, 1.3, '#A86F2A')}</g>`).join(''),
  loklok: [[-18, '#EFE8DA', 'c'], [0, '#B84A3A', 'r'], [18, '#D9B04A', 's']].map(([r, c, k]) => `<g transform="rotate(${r} 0 18)">${ln('M0 18V-24', '#B99A68', 2)}${k === 'c' ? C(0, -18, 4.5, c) + C(0, -8, 4.5, c) : k === 'r' ? RR(-3.5, -24, 7, 20, 3.5, c) : R(-4.5, -22, 9, 7, c) + R(-4.5, -13, 9, 7, c)}</g>`).join('')
    + d('M-12 8H12L9 22H-9Z', '#A9463A') + RR(-13, 6, 26, 4, 2, '#C45A45'),
  murtabak: RR(-19, -15, 34, 30, 5, '#C98F4B') + shade('M5-15H10Q15-15 15-10V10Q15 15 10 15H5Z', 0.12) + ln('M-2-15V15M-19 0H15', '#9C6230', 2.5) + ln('M-14-9L-8-9M4 6L10 6M-13 7L-7 7', '#DDB074', 2) + C(15, 13, 8, '#EDE3D2') + C(15, 13, 6, '#B25A2A'),
  ckt: e(0, 6, 22, 12, '#EDE3D2') + e(0, 8, 22, 10, SH, ' opacity=".08"') + e(0, 2, 16, 8, '#7E522B')
    + ln('M-12 2Q-6-3 0 2T12 2M-9 6Q-3 1 3 6T13 5M-10-2Q-4-6 2-2', '#A5723E', 2.4) + ln('M-6-3L-2-6M7-2L10-5M-12 4L-9 1', '#5E8B4A', 2)
    + ln('M4-4C7-8 11-6 9-2', '#D0674E', 3) + C(-4, 5, 2.2, '#E3B54A') + C(9, 6, 2, '#E3B54A'),
  putupiring: e(0, 4, 23, 12, '#5E8B4A', ' transform="rotate(-10)"') + ln('M-20 8L20 0', '#46703A', 1.5)
    + [[-10, 5], [10, 3], [0, -8]].map(([a, b]) => C(a, b, 9, '#F1EADB') + C(a, b, 4.5, '#7E4E26') + C(a - 3, b - 4, 1.5, '#FFFFFF', ' opacity=".7"')).join(''),
  kuihlapis: d('M-14-8L-6-16H18L10-8Z', '#E3AAB5') + d('M10-8L18-16V12L10 20Z', '#9E4A5E') + [0, 1, 2, 3, 4, 5, 6].map(i => R(-14, -8 + i * 4, 24, 4, i % 2 ? '#F1DDD8' : '#C4607A')).join(''),
  rojak: d('M-20-2Q0-20 20-2Z', '#4E2E1C') + [[-10, -6, '#D9B04A'], [-2, -10, '#7FA35A'], [6, -6, '#EFE8DA'], [0, -5, '#D9B04A']].map(([a, b, c]) => R(a, b, 7, 5, c, ` transform="rotate(${a * 3} ${a} ${b})"`)).join('')
    + `<g fill="#C9935C">${C(-5, -8, 1.2, '')}${C(3, -11, 1.2, '')}${C(10, -5, 1.2, '')}</g>` + d('M-22-2H22A22 18 0 0 1-22-2Z', '#EDE3D2') + shade('M8-2H22A22 18 0 0 1 8 14Z', 0.1) + R(-22, -2, 44, 4, '#4F7A9A'),
  cendol: d('M-13-12H13L10 22H-10Z', '#D6E2DE') + d('M-12 2H12L10 22H-10Z', '#F4EDE0') + d('M-10.8 13H10.8L10 22H-10Z', '#6E4222')
    + ln('M-8 8q2-3 4 0t4 0t4 0t4 0', '#6FA35A', 3) + C(-5, 17, 1.6, '#7E2F3A') + C(3, 18, 1.6, '#7E2F3A')
    + d('M-15-12Q0-32 15-12Z', '#F4F0E8') + ln('M-8-16Q-3-24 2-18T10-16', '#7E522B', 2.5),
  balloon: ln('M-9-2L0 22M9-6L0 22M0 4L0 22', '#8A8378', 1.2) + [[-9, -12, '#C44A36'], [9, -14, '#D9A441'], [0, -6, '#4F6D8F']].map(([a, b, c]) => `${e(a, b, 9, 11, c)}${d(`M${a - 2} ${b + 12}h4l-2-3Z`, c)}${e(a - 3, b - 4, 2, 3, '#FFFFFF', ' opacity=".45"')}`).join(''),
  lantern: C(0, 0, 22, '#E3A24A', ' opacity=".2"') + ln('M0-24V-16', '#6E4533', 1.5) + RR(-8, -18, 16, 5, 1.5, '#D9A441') + e(0, 0, 17, 14, '#C44A36') + shade('M5-13.5Q17-8 17 0Q17 9 5 13.5Q11 0 5-13.5Z', 0.2)
    + ln('M-9-13Q-14 0-9 13M0-14V14M9-13Q14 0 9 13', '#9E3A2A', 1.6) + RR(-8, 13, 16, 5, 1.5, '#D9A441') + ln('M-3 19V25M0 19V26M3 19V25', '#D9A441', 1.6),
  coins: [0, 1, 2, 3].map(i => e(-7, 15 - i * 5, 12, 4.5, i % 2 ? '#D9A441' : '#C9953A')).join('')
    + C(9, -6, 12, '#D9A441') + C(9, -6, 7.5, 'none', ' stroke="#B8862E" stroke-width="2"') + e(5, -11, 2, 3, '#F4E6CC') + shade('M13-17A12 12 0 0 1 13 5Q18-6 13-17Z', 0.12),
  envelope: R(-14, -20, 28, 14, '#7FA37A', ' transform="rotate(-6)"') + C(0, -14, 3, '#5E8B5A') + RR(-20, -12, 40, 28, 2, '#E8DCC0') + d('M-20-12L0 4L20-12', '#D9C9A4') + shade('M-20 10H20V16H-20Z', 0.08),
  jar: jar(0.5), jarempty: jar(0.12), jarfull: jar(0.85),
  receipt: d('M-13-21H13V17l-3.25 3-3.25-3-3.25 3-3.25-3-3.25 3-3.25-3-3.25 3-3.25-3Z', '#F4EEE2') + shade('M5-21H13V17l-3.25 3-3.25-3-1.5 1.4Z', 0.08)
    + ln('M-8-14H8M-8-8H4M-8-2H6M-8 4H2', '#B6AFA2', 2.2) + ln('M-8 11H8', '#4A3A30', 3),
  tote: ln('M-8-8Q-8-24 0-24Q8-24 8-8', '#A88A5A', 3.5) + d('M-16-8H16L14 21H-14Z', '#E3D3B3') + shade('M6-8H16L14 21H6Z', 0.1) + d('M0 2C7-4 10 4 0 12C-10 4-7-4 0 2Z', '#6F8F45') + ln('M0 3V16', '#4E6E30', 1.5),
  popiah: [[-12, 5], [12, 5], [0, -4]].map(([a, b]) => C(a, b, 10, '#EFE6D3') + C(a, b, 7, '#7FA35A') + C(a, b, 5.2, '#A5723E') + C(a + 1, b - 1, 1.6, '#D9BE8C') + C(a - 2, b + 2, 1.4, '#D0674E')).join('') + ln('M-18 15Q0 20 18 15', '#5E3522', 2.5),
  buahpotong: d('M-8-2L-12-24L-3-22Z', '#D9B04A') + d('M-4-4L2-26L9-20Z', '#C44A36') + ln('M2-26L9-20', '#5E8B4A', 2.5) + d('M4-2L14-20L16-12Z', '#8FB35E')
    + d('M-14-6H14L11 22H-11Z', '#D6E2DE', ' opacity=".95"') + ln('M-12-6H12', '#B4C4BF', 2),
  jagung: `<g fill="#D9B04A">${ring(7, a => C(0, -9, 4, '', ` transform="rotate(${a / 4 - 45})"`))}${C(-6, -12, 4.5, '')}${C(5, -13, 4.5, '')}${C(0, -16, 4.5, '')}${C(-11, -8, 4, '')}${C(10, -8, 4, '')}</g>`
    + RR(12, -26, 4, 20, 2, '#DAD6CC', ' transform="rotate(20 14 -16)"') + d('M-15-6H15L11 22H-11Z', '#F1E8D8') + R(-14, 2, 28, 5, '#C44A36') + R(-13, 12, 26, 3, '#C44A36') + shade('M5-6H15L11 22H5Z', 0.1),
  airbungkus: ln('M4-14L12-27', '#5E8B4A', 3) + d('M-12-6Q-19 16 0 21Q19 16 12-6Z', '#D98A93') + d('M-12-6L-4-16H4L12-6Z', '#EBC6CB')
    + RR(-6, 2, 6, 6, 1, '#FFFFFF', ' opacity=".4"') + RR(2, 8, 6, 6, 1, '#FFFFFF', ' opacity=".4"') + e(-7, 6, 1.8, 6, '#FFFFFF', ' opacity=".5"')
    + ln('M-5-15H5', '#B5433A', 3) + ln('M4-15Q20-24 16-8', '#B5433A', 1.8),
  selipar: [[-9, -4], [9, 4]].map(([a, b]) => `<g transform="translate(${a} ${b}) rotate(${a})">${e(0, 0, 8.5, 17, '#EFE6D3')}${e(0, 0, 7, 15.5, '#4F6D8F')}${ln('M0-9L-6 4M0-9L6 4', '#C44A36', 2.6)}</g>`).join(''),
  timbang: d('M-14 22H14L10 2H-10Z', '#A9463A') + C(0, 8, 9, '#F1E8D8') + C(0, 8, 9, 'none', ' stroke="#7E2F24" stroke-width="2"') + ln('M0 8L4 2', '#C44A36', 1.8) + ln('M-5 4L-4 5M0 1V2.5M5 4L4 5', '#555', 1.2)
    + R(-2, -6, 4, 8, '#8A8A8A') + e(0, -7, 19, 4.5, '#B9BEC2') + C(-7, -14, 6, '#D98A3D') + C(5, -14, 6, '#E0A04A') + C(-1, -21, 6, '#D98A3D'),
  price: tag('RM5'),
  otakotak: [[-3, -8, -12], [3, 8, 8]].map(([a, b, r]) => `<g transform="translate(${a} ${b}) rotate(${r})">${RR(-17, -6, 34, 12, 3, '#5E8B4A')}${R(-19, -3, 3, 6, '#D0674E')}${ln('M-8-5L-4 5M2-5L6 5', '#3B5A2A', 1.8)}${ln('M-21 0H-12M12 0H21', '#B99A68', 1.8)}</g>`).join(''),
  diya: C(0, -12, 12, '#E3A24A', ' opacity=".25"') + d('M0-24C7-15 6-8 0-4C-6-8-7-15 0-24Z', '#E3A24A') + d('M0-16C3-12 3-9 0-7C-3-9-3-12 0-16Z', '#C9632E')
    + d('M-20-2Q-18 16 0 16Q18 16 20-2Q10 3 0 3Q-10 3-20-2Z', '#B8603A') + d('M-20-2Q-10 3 0 3Q10 3 20-2Q10-4 0-4Q-10-4-20-2Z', '#D08A56')
    + `<g fill="#D9A441">${C(-10, 9, 1.8, '')}${C(0, 11, 1.8, '')}${C(10, 9, 1.8, '')}</g>`,
  kolam: ring(8, a => `<ellipse cx="0" cy="-12" rx="5" ry="9" fill="${a % 90 ? '#D98A3D' : '#C4607A'}" transform="rotate(${a})"/>`) + ring(8, a => C(0, -21, 2.6, '#4F7A9A', ` transform="rotate(${a + 22.5})"`))
    + C(0, 0, 6, '#E3B54A') + C(0, 0, 2.5, '#2F6B66'),
  // props only (not stickers)
  phone: RR(-9, -16, 18, 32, 3, '#2E2A36') + RR(-7, -12, 14, 22, 1, '#9EC3CF') + R(-5, -9, 10, 3, '#F4EEE2') + R(-5, -3, 7, 3, '#F4EEE2') + C(0, 13, 1.4, '#6B6570'),
  teh: d('M-9-12H9L7 14H-7Z', '#EDE6DA') + d('M-8.5-7H8.5L7 14H-7Z', '#B8723A') + R(-9, -7, 18, 4, '#EEDDC2') + ln('M9-4Q16-2 9 6', '#EDE6DA', 3),
  note: RR(-18, -9, 36, 18, 2, '#D98A4B') + C(-9, 0, 5, '#B8703A') + R(2, -3, 12, 2.5, '#F4DCC0') + R(2, 2, 8, 2.5, '#F4DCC0'),
  toy: ln('M0 22V-4', '#8A8378', 2.5) + C(0, -12, 17, '#E3A24A', ' opacity=".2"') + ring(4, a => d('M0-12L-4-24Q0-28 4-24Z', ['#C45A6A', '#D9B04A', '#5FA38A', '#6FA3B8'][a / 90], ` transform="rotate(${a} 0 -12)"`)) + C(0, -12, 3, '#F4EEE2'),
  apron: ln('M-8-18Q-8-30 0-30Q8-30 8-18', '#7E3A24', 2.5) + d('M-9-18H9L10-6Q14-4 16-2L18 20H-18L-16-2Q-14-4-10-6Z', '#B5533A') + shade('M4-18H9L10-6Q14-4 16-2L18 20H8Z', 0.15) + RR(-8, 2, 16, 9, 2, '#C9683F') + ln('M-16-6H-24M16-6H24', '#7E3A24', 2),
  gift: RR(-16, -8, 32, 26, 2, '#B5433A') + RR(-18, -14, 36, 8, 2, '#C45A4A') + R(-3, -14, 6, 32, '#D9A441') + d('M0-14C-10-26-16-16 0-14C16-16 10-26 0-14Z', '#D9A441') + shade('M6-8H16V18H6Z', 0.12),
};
/** An item at (x, y), s scale (1 = about 44 across). */
export const it = (name, x, y, s = 1) => at(x, y, s, ITEMS[name] || '');
/** A price tag with any text. */
export const priceTag = (t, x, y, s = 1) => at(x, y, s, tag(t));

// ---- the kit: everything that needs an id -------------------------------------------------------------------
export function castKit(pfx) {
  const defs = new Map();
  const id = (name, draw) => { const k = pfx + name; if (!defs.has(k)) defs.set(k, `<g id="${k}">${draw()}</g>`); return k; };
  const use = (name, draw, x, y) => `<use href="#${id(name, draw)}"${x || y ? ` x="${f1(x || 0)}" y="${f1(y || 0)}"` : ''}/>`;
  const glow = (x, y, r, o = 0.5, c = '#F2B45A') => C(x, y, f1(r * 0.6), c, ` opacity="${o}" filter="url(#${pfx}bl)"`);
  const steam = p => ln(p, '#F3E6CF', 3, ` opacity=".5" filter="url(#${pfx}b2)"`);
  const bulbs = ([x0, y0], [cx, cy], [x1, y1], n) => { const p = Array.from({ length: n }, (_, i) => { const t = (i + 0.5) / n, u = 1 - t; return `M${f1(u * u * x0 + 2 * u * t * cx + t * t * x1)} ${f1(u * u * y0 + 2 * u * t * cy + t * t * y1 + 2)}h0`; }).join('');
    return ln(`M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`, '#191726', 0.8) + ln(p, '#F2B45A', 9, ` opacity=".5" filter="url(#${pfx}b2)"`) + ln(p, '#F6D08A', 3.2); };
  const lanternU = (x, y, s) => glow(x, y, 22 * s, 0.6) + `<use href="#${id('lantern', () => ITEMS.lantern.replace(/^<circle[^>]*>/, ''))}" transform="translate(${x} ${y}) scale(${s})"/>`;
  const sky = () => R(0, 0, 320, 200, `url(#${pfx}sky)`);
  const moon = (x, y, o = 0.5) => glow(x, y, 34, o, '#F3E3B5') + C(x, y, 9, '#F3E3B5');
  const skyline = (base = 120) => { const far = [[0, 40, 66], [34, 30, 86], [60, 50, 58], [104, 34, 96], [134, 46, 72], [176, 40, 88], [212, 36, 62], [244, 44, 80], [284, 40, 68]];
    return d(far.map(([x, w, h]) => `M${x} ${base - h}h${w}v${h + 6}h${-w}z`).join(''), '#2B2C48') + d([[10, 64], [44, 44], [48, 70], [114, 36], [120, 60], [150, 60], [188, 44], [194, 70], [256, 52], [262, 76], [296, 64]].map(([x, y]) => `M${x} ${y + base - 120}h4v5h-4z`).join(''), '#E2A95A', ' opacity=".75"'); };
  const person = (x, y, s, headY) => C(x, y - s * 2.6, s, '#272539') + RR(f1(x - s * 1.4), f1(y - s * 1.6), f1(s * 2.8), f1(s * 3.4), s, '#272539');

  // characters
  const FY = { aina: -117.5, wei: -116.5, raju: -113.5 }, HOLD_Y = { aina: -71, wei: -72, raju: -68 };
  const SKIN = { aina: A.skin, wei: W.skin, raju: J.skin };
  const BODY = { aina: ainaBody, wei: weiBody, raju: rajuBody };
  const faceUse = (who, f, x, y) => who === 'raju' ? use(`rf-${f}`, () => faceArt(f, 7.2) + MOUSTACHE, x, y) : use(`f-${f}`, () => faceArt(f), x, y);
  const person3 = who => (o = {}) => {
    const { x = 160, y = 188, s = 1, face = 'happy', pose = 'stand', flip = false, item = null, is = 0.5 } = o;
    const fp = pose === 'kneel' ? [0, FY[who] + 40] : pose === 'hug' ? [-3, FY[who] + 72] : [0, FY[who]];
    let inner = use(`${who}-${pose}`, () => BODY[who](pose)) + faceUse(who, face, fp[0], fp[1]);
    if (pose === 'hold') { const k = arms(who === 'raju' ? 14 : 12.5, who === 'raju' ? -94 : who === 'wei' ? -98 : -97, 'hold');
      inner += (item ? `<g transform="scale(${flip ? -1 : 1} 1)">${it(item, 0, HOLD_Y[who] - 2, is)}</g>` : '') + hands(k.hands, SKIN[who]); }
    return at(x, y, s, inner, flip);
  };
  const duit = ({ x = 160, y = 188, s = 1, face = 'happy', pose = 'sit', flip = false } = {}) =>
    at(x, y, s, use(`duit-${pose}`, () => DUIT[pose] || DUIT.sit) + (pose === 'sit' ? use(`cf-${face}`, () => at(0, -24.6, 0.62, (FACE[face] || FACE.happy)(4.4))) : ''), flip);

  // scenes (each drawn once)
  const SCENES = {
    street: () => sky() + moon(262, 30) + skyline() + R(0, 120, 320, 80, '#35304A')
      + [[118, '#B5533A'], [156, '#C98F3C'], [194, '#2F5D5A'], [232, '#B5533A']].map(([x, c]) => glow(x + 17, 116, 26, 0.4) + R(x + 3, 110, 28, 12, '#E9B56A') + d(canopyD(x, 104, 34, 5, 4), c)).join('')
      + [[128, 128, 3], [150, 130, 3.4], [178, 127, 3], [206, 130, 3.3], [240, 128, 3]].map(([x, y, r]) => person(x, y, r)).join('')
      + R(0, 146, 320, 54, `url(#${pfx}road)`) + bulbs([0, 20], [170, 70], [320, 14], 14) + bulbs([110, 0], [220, 34], [320, 40], 7)
      + R(0, 46, 116, 74, '#E9B56A') + glow(58, 84, 70, 0.5)
      + d('M68 122Q68 104 84 103Q100 104 100 122Z', '#2F5D5A') + d('M77 122V108H91V122Z', '#F1E3C8') + e(84, 94, 6, 7, '#9A6446') + d('M78 92Q78 85 84 85Q90 85 90 92Q84 89 78 92Z', '#2A2226')
      + R(4, 44, 3.5, 128, '#3A2F35') + R(110, 44, 3.5, 128, '#3A2F35') + d(canopyD(-8, 30, 130, 16, 6), '#B5533A') + shade(canopyD(-8, 40, 130, 6, 6))
      + ln('M58 46V56', '#191726', 0.8) + glow(58, 58, 9, 0.6, '#F6D08A') + C(58, 58, 1.7, '#F6D08A')
      + R(-6, 116, 128, 6, '#8A5A3C') + R(-4, 122, 124, 50, '#6E4533') + shade('M-4 122H120V130H-4Z')
      + e(36, 116, 15, 4, '#2A2226') + e(70, 116, 7, 2.5, '#D98B3A') + e(88, 116.5, 7, 2.5, '#D98B3A') + e(104, 116.5, 5, 2, '#C98F3C')
      + steam('M30 110q-5-8 0-15t0-16') + steam('M40 108q5-9 0-17t1-18') + steam('M35 104q-3-6 1-12')
      + R(262, 52, 60, 62, '#E9B56A') + glow(292, 84, 50, 0.45) + d(canopyD(256, 38, 72, 14, 4), '#2F5D5A') + shade(canopyD(256, 47, 72, 5, 4)) + R(262, 50, 3.5, 122, '#3A2F35')
      + lanternU(284, 70, 0.55) + lanternU(310, 72, 0.55) + R(258, 112, 66, 60, '#6E4533') + R(256, 108, 70, 5, '#8A5A3C') + [270, 286, 302, 318].map(x => e(x, 106, 6.5, 2.4, '#D9954A')).join('')
      + glow(70, 176, 60, 0.22) + glow(290, 176, 40, 0.2),
    stall: () => sky() + moon(268, 22, 0.4) + skyline(112) + bulbs([0, 8], [160, 30], [320, 6], 13) + R(0, 150, 320, 50, `url(#${pfx}road)`)
      + R(26, 40, 268, 90, '#E9B56A') + glow(160, 86, 140, 0.45) + R(26, 40, 268, 90, '#8A5A3C', ' opacity=".12"')
      + ln('M40 70H130M190 70H280', '#6E4533', 2.5) + [[50, '#B5533A'], [64, '#2F6B66'], [78, '#D9A441'], [210, '#D9A441'], [226, '#B5533A'], [242, '#6F8FA6'], [258, '#2F6B66']].map(([x, c]) => RR(x, 57, 10, 12, 2, c)).join('')
      + R(22, 40, 4, 134, '#3A2F35') + R(294, 40, 4, 134, '#3A2F35') + lanternU(46, 66, 0.6) + lanternU(274, 66, 0.6),
    counter: () => R(26, 122, 268, 7, '#8A5A3C') + R(30, 129, 260, 47, '#6E4533') + shade('M30 129H290V136H30Z') + ln('M30 152H290', '#5E3A2A', 1.5) + glow(160, 186, 90, 0.18) + R(0, 176, 320, 24, '#2F2B3C', ' opacity=".35"'),
    night: () => sky() + moon(270, 34, 0.6) + d('M0 120Q30 96 60 112Q90 90 120 110V124H0Z', '#1F2238')
      + [[10, 50, 40], [70, 46, 58], [126, 60, 36], [196, 44, 54], [250, 60, 40]].map(([x, w, h]) => R(x, 172 - h, w, h, '#232540') + d(`M${x - 4} ${172 - h}L${x + w / 2} ${150 - h}L${x + w + 4} ${172 - h}Z`, '#1B1C33') + R(x + w / 2 - 5, 180 - h, 10, 10, '#E2A95A', ' opacity=".85"') + glow(x + w / 2, 185 - h, 14, 0.35)).join('')
      + R(0, 168, 320, 32, `url(#${pfx}road)`) + R(300, 76, 3, 96, '#3A2F35') + ln('M301 78Q301 70 292 70', '#3A2F35', 2.5) + e(292, 72, 5, 2.5, '#F6D08A') + glow(292, 76, 30, 0.55, '#F6D08A') + glow(292, 184, 60, 0.3, '#F6D08A'),
    kopitiam: () => R(0, 0, 320, 200, '#E8D4B0') + d('M196 18H300V104H196Z', '#F6E7C4') + glow(248, 70, 120, 0.55, '#FFF1D0') + R(190, 14, 8, 92, '#8A5A3C') + R(298, 14, 8, 92, '#8A5A3C') + R(190, 12, 116, 6, '#6E4533')
      + d('M200 104L214 40H232L222 104ZM254 104L262 40H278L274 104Z', '#FFFFFF', ' opacity=".25"')
      + R(0, 104, 320, 68, '#7FA88A') + ln(Array.from({ length: 16 }, (_, i) => `M${i * 20 + 10} 106V172`).join('') + 'M0 127H320M0 149H320', '#6E967A', 1.2) + R(0, 102, 320, 4, '#5E8B6E')
      + R(0, 172, 320, 28, '#C7B08C') + ln('M20 182h0M64 190h0M110 180h0M160 194h0M214 184h0M262 192h0M300 180h0', '#A8906C', 2.4)
      + RR(14, 14, 76, 58, 3, '#2F4A3E') + txt(52, 34, 'KOPI', 12, '#E3B54A') + txt(52, 50, 'TEH', 12, '#EFE6D3') + txt(52, 65, 'ROTI', 10, '#9EC3CF')
      + C(140, 40, 11, '#F1E8D8') + C(140, 40, 11, 'none', ' stroke="#6E4533" stroke-width="2"') + ln('M140 40V33M140 40L145 43', '#3B2723', 1.3)
      + ln('M160 0V12', '#4A4E5E', 2) + e(160, 14, 34, 3.5, '#6B6570') + C(160, 14, 5, '#4A4E5E') + e(160, 150, 150, 18, '#1B1430', ' opacity=".05"'),
    'home-n': () => home(false), 'home-d': () => home(true),
  };
  function home(day) {
    const wall = day ? '#C99A78' : '#8C5A45', dado = day ? '#B08466' : '#6E4538', glass = day ? '#A9C8CF' : '#27305A', floor = day ? '#7A5540' : '#5A3A2E';
    return R(0, 0, 320, 200, wall) + R(0, 118, 320, 44, dado) + (day ? glow(62, 90, 150, 0.35, '#FFF1D0') : glow(298, 92, 190, 0.55))
      + R(24, 22, 76, 72, '#E9D8B8') + R(29, 27, 66, 62, glass) + (day ? C(76, 44, 9, '#F4EEDD') + e(50, 70, 14, 5, '#F4EEDD', ' opacity=".6"') : C(76, 44, 7, '#F3E3B5')) + R(60.5, 27, 3, 62, '#E9D8B8') + R(29, 56, 66, 3, '#E9D8B8')
      + d('M16 16H34Q28 60 36 104H16Z', '#B5533A') + d('M108 16H90Q96 60 88 104H108Z', '#B5533A') + RR(12, 13, 100, 4, 2, '#8A5A3C')
      + R(138, 32, 44, 32, '#E9D8B8') + R(142, 36, 36, 24, '#2F5D5A') + d('M142 60L154 46L164 56L170 50L178 60Z', '#C98F3C')
      + R(0, 160, 320, 40, floor) + ln('M0 160H320', '#4A2E24', 1.2) + e(170, 186, 150, 13, '#2F5D5A')
      + e(222, 164, 80, 5, '#120E1E', ' opacity=".35"') + RR(150, 98, 146, 48, 10, '#A9503A') + RR(146, 136, 154, 24, 6, '#8E4232') + RR(140, 116, 18, 44, 7, '#A9503A') + RR(288, 116, 18, 44, 7, '#A9503A')
      + shade('M150 98H296V106H150Z', 0.12) + R(156, 158, 4, 6, '#3A2F35') + R(286, 158, 4, 6, '#3A2F35')
      + R(302, 112, 22, 50, '#8A5A3C') + R(310, 76, 3, 36, '#3A2F35') + d('M296 56H326L332 80H290Z', '#E9C48A') + (day ? '' : glow(311, 70, 40, 0.7))
      + RR(4, 138, 20, 24, 2, '#B5533A') + [[-30, 10], [-5, 12], [20, 11], [40, 9]].map(([a, h]) => e(14, 138 - h, 4, h, '#3F6B4A', ` transform="rotate(${a} 14 138)"`)).join('');
  }
  const CAN = { '#B5533A': '#B5533A', '#2A9D8F': '#2F5D5A', '#7B2CBF': '#6E4A7E' };
  /** Full-bleed background. kind: stall | street | home | kopitiam | night. stall opts: { sign, a, behind, items, steam } home opts: { day } kopitiam opts: { table } */
  function scene(kind, o = {}) {
    if (kind === 'stall') { const a = CAN[o.a] || o.a || '#B5533A';
      return use('stall', SCENES.stall) + (o.behind || '') + use(`can${a.slice(1)}`, () => d(canopyD(18, 24, 284, 16, 11), a) + shade(canopyD(18, 34, 284, 6, 11)) + R(16, 21, 288, 4, '#5A3A2A'))
        + (o.sign ? RR(100, 1, 120, 18, 4, '#E3C27A') + txt(160, 15, o.sign, 12, '#6E2E1A', ' letter-spacing="1"') : '') + (o.steam ? steam(`M${o.steam - 4} 116q-5-8 0-15t0-16`) + steam(`M${o.steam + 6} 114q5-9 0-17t1-18`) : '')
        + use('counter', SCENES.counter) + (o.items || ''); }
    if (kind === 'home') return use(o.day ? 'home-d' : 'home-n', SCENES[o.day ? 'home-d' : 'home-n']);
    if (kind === 'kopitiam') { const tx = o.table ?? 262;
      return use('kopitiam', SCENES.kopitiam) + (tx === false ? '' : e(tx, 172, 30, 3, '#120E1E', ' opacity=".3"') + e(tx, 140, 34, 7, '#EDE7DC') + shade(`M${tx} 133A34 7 0 0 1 ${tx + 34} 140A34 7 0 0 1 ${tx} 147Z`, 0.1) + R(tx - 3, 146, 6, 26, '#3E3A40') + RR(tx - 16, 170, 32, 4, 2, '#3E3A40') + it('teh', tx - 14, 129, 0.45) + it('teh', tx + 12, 129, 0.45)); }
    return use(kind === 'street' || kind === 'night' ? kind : 'street', SCENES[kind === 'night' ? 'night' : 'street']);
  }
  /** The coffee table in front of a kneeling figure (home, panel 7). */
  const coffeeTable = () => e(112, 186, 84, 5, '#120E1E', ' opacity=".35"') + RR(36, 146, 150, 7, 2, '#8A5A3C') + R(42, 153, 138, 30, '#6E4533') + shade('M42 153H180V159H42Z') + R(46, 183, 6, 6, '#6E4533') + R(170, 183, 6, 6, '#6E4533');
  /** A painterly grain over a whole panel; add last. */
  const grain = () => `<rect width="320" height="200" filter="url(#${pfx}pt)" opacity=".45"/>`;
  /** A sticker (inner markup for a 64x64 viewBox) with its own grain filter. */
  const sticker = name => `<defs><filter id="${pfx}s-${name}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .1 0 0 0 0 .07 0 0 0 0 .05 0 0 0 -.8 .5"/><feComposite in2="SourceAlpha" operator="in" result="g"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="g"/></feMerge></filter></defs>`
    + e(32, 57, 17, 2.6, SH, ' opacity=".16"') + `<g filter="url(#${pfx}s-${name})">${it(name, 32, 31, 1.2)}</g>`;
  const BASE = () => `<filter id="${pfx}bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter><filter id="${pfx}b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>`
    + `<filter id="${pfx}pt" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .1 0 0 0 0 .07 0 0 0 0 .05 0 0 0 -1.5 .88" result="g"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency=".03 .045" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 .93 0 0 0 0 .8 0 0 0 .42 -.2" result="m"/><feTurbulence type="fractalNoise" baseFrequency=".012 .3" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 .2 0 0 0 0 .14 0 0 0 0 .1 0 0 0 .5 -.26" result="s"/><feMerge><feMergeNode in="m"/><feMergeNode in="s"/><feMergeNode in="g"/></feMerge></filter>`
    + `<linearGradient id="${pfx}sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1E2340"/><stop offset=".62" stop-color="#463A55"/></linearGradient><linearGradient id="${pfx}road" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#3D3548"/><stop offset="1" stop-color="#4A3F4E"/></linearGradient>`;
  return {
    aina: person3('aina'), wei: person3('wei'), raju: person3('raju'), duit, scene, coffeeTable, grain, sticker, it, priceTag,
    /** Everything the panels <use>: put it once in a hidden <svg><defs>…</defs></svg>. Call after drawing the panels. */
    defs: () => BASE() + [...defs.values()].join(''),
  };
}
