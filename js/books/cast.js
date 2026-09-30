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
const arms = (sx, sy, pose, k = 1) => { const [a0, b0] = POSES[pose] || POSES.stand, a = k === 1 ? a0 : a0.map(v => f1(v * k)), b = k === 1 ? b0 : b0.map(v => f1(v * k));
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
function rajuBody(pose, apron = J.apron) {
  const k = arms(14, -94, pose);
  return shadowE + foot(J.shoe, -6, 6) + d('M-13-60L-12-4H-2.5L0-46L2.5-4H12L13-60Z', J.trousers) + shade('M4-60H13L12-4H7Z')
    + R(-3, -106, 6, 12, J.skin) + d('M-14-95Q-19-78-15-58H15Q19-78 14-95Q0-98-14-95Z', J.shirt) + shade('M5-97Q12-96 14-95Q19-78 15-58H9Q11-78 5-97Z')
    + d('M-9-86H9L12-57Q0-54-12-57Z', apron) + ln('M-8.5-86L-5-96M8.5-86L5-96', apron, 1.3) + R(-5, -76, 10, 7, apron === J.apron ? '#DDCFB5' : '#C9683F')
    + ln(k.d, J.skin, 5) + d('M-14-95L-19.5-83L-11.5-81ZM14-95L19.5-83L11.5-81Z', J.shirt)
    + e(-8, -113, 1.8, 2.6, J.skin) + e(8, -113, 1.8, 2.6, J.skin) + e(0, -114, 8, 9.5, J.skin) + e(-7.2, -115, 2.4, 4.4, J.hair) + e(7.2, -115, 2.4, 4.4, J.hair) + e(-2.5, -121, 3, 1.3, '#A87050')
    + (pose === 'hold' ? '' : hands(k.hands, J.skin));
}
const KM = { skin: '#8A5A3E', saree: '#8E2F4F', dark: '#74263F', gold: '#D9A441', blouse: '#C9923A', hair: '#1F1A1C', shoe: '#6E4533' };
/** Aunty Kamala, Uncle Raju's wife: saree with the pallu over her left shoulder, jasmine in her hair, a pottu. */
function kamalaBody(pose) {
  const k = arms(11.5, -95, pose);
  return shadowE + foot(KM.shoe) + d('M-11-68L-14-4Q0-1.5 14-4L11-68Z', KM.saree) + ln('M-2-62L-3.5-6M2.5-62L3.5-6M6.5-60L8-6', KM.dark, 0.8)
    + d('M-14.2-8.5Q0-6 14.2-8.5L14-4Q0-1.5-14-4Z', KM.gold) + shade('M4-68H11L14-4Q10-3 7-3Z')
    + R(-2.6, -107, 5.2, 10, KM.skin) + d('M-11.5-96Q-14-82-11-68H11Q14-82 11.5-96Q0-99-11.5-96Z', KM.blouse) + d('M12-96Q18-80 16-52L11-54Q13-74 10-92Z', KM.dark)
    + ln(k.d, KM.skin, 4.4) + d('M-11.5-96L-15.5-86L-9.5-85Z', KM.blouse)
    + d('M-11.5-66Q-3-74 3-96Q8-100 12.5-96L13-86Q5-78-3-64Z', KM.saree) + ln('M-11.5-66Q-3-74 3-96', KM.gold, 1.6) + shade('M4-94Q9-99 12.5-96L13-86Q9-83 6-81Z', 0.18)
    + d('M-8.6-113Q-9.6-124.5 0-124.8Q9.6-124.5 8.6-113L8.4-106Q0-103-8.4-106Z', KM.hair) + e(0, -113.5, 7.2, 8.8, KM.skin)
    + d('M-7.6-115Q-8-123 0-123.4Q8-123 7.6-115Q5-120.5.4-120.6L0-119.5L-.4-120.6Q-5-120.5-7.6-115Z', KM.hair) + ln('M-2-123Q-5-121.5-7-117', '#8A8580', 0.9)
    + C(0, -119, 0.9, '#B5332A') + ln('M8.8-118h0M9.2-114.5h0M9-111h0', '#F4EEE2', 2.2) + C(-7.3, -110, 1, KM.gold) + C(7.3, -110, 1, KM.gold)
    + (pose === 'hold' ? '' : hands(k.hands, KM.skin));
}
const AJ = { skin: '#8E5B3E', kurta: '#4F7A9A', trim: '#D9A441', pants: '#EFE6D3', hair: '#1F1A1C', shoe: '#6E4533' };
/** Arjun, their grandson (about eight): kurta and white trousers. */
function arjunBody(pose) {
  const k = arms(8, -62, pose, 0.65);
  return e(0, 0, 11, 2.6, '#120E1E', ' opacity=".35"') + e(-3.6, -1.8, 3.6, 1.8, AJ.shoe) + e(3.6, -1.9, 3.6, 1.8, AJ.shoe)
    + d('M-7-36L-6.5-3H-1.5L0-26L1.5-3H6.5L7-36Z', AJ.pants) + R(-2, -68, 4, 6, AJ.skin)
    + d('M-8-64Q-10-48-11-28Q0-25 11-28Q10-48 8-64Q0-66.5-8-64Z', AJ.kurta) + shade('M3-66Q6-65 8-64Q10-48 11-28Q8-27 6-27Q6-48 3-66Z') + ln('M0-64V-50M-3-64Q0-61 3-64', AJ.trim, 1)
    + ln(k.d, AJ.kurta, 4) + e(-7.3, -73.5, 1.5, 2.2, AJ.skin) + e(7.3, -73.5, 1.5, 2.2, AJ.skin) + e(0, -74, 7.4, 8.4, AJ.skin)
    + d('M-7.6-75Q-8.4-84.6 0-84.8Q8.4-84.6 7.6-75Q6-79.5 1-80Q-5-80-7.6-75Z', AJ.hair) + ln('M1-84.5Q2.5-87.5 4.5-86.5', AJ.hair, 1.4)
    + (pose === 'hold' ? '' : hands(k.hands, AJ.skin));
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
  // November: Deepavali
  list: RR(-15, -20, 30, 40, 2, '#F4EEE2') + R(-15, -20, 30, 5, '#B5533A') + ln('M-4-8H9M-4 0H9M-4 8H6', '#B6AFA2', 2) + ln('M-11-9L-9-6.5L-6-11M-11-1L-9 1.5L-6-3', '#2F6B66', 1.6) + R(-11.5, 5.5, 5, 5, 'none', ' stroke="#B6AFA2" stroke-width="1.2"') + shade('M7-15H15V20H7Z', 0.08),
  packet: RR(-14, -20, 28, 40, 2, '#6E3A7E') + d('M-14-20H14V-8Q0-2-14-8Z', '#5A2E68') + C(0, 7, 8.5, 'none', ' stroke="#D9A441" stroke-width="1.4"')
    + d('M-5 8Q-4 12 0 12Q4 12 5 8Z', '#D9A441') + d('M0 1.5C1.6 4 1.4 5.5 0 6.5C-1.4 5.5-1.6 4 0 1.5Z', '#E8B04A') + R(-14, 16, 28, 2, '#D9A441'),
  kurta: ln('M0-22Q3-25 3-21Q3-19 0-18L-15-11H15Z', '#8A8378', 1.4) + d('M-15-11L-21 0L-15 4L-12-3V21H12V-3L15 4L21 0L15-11Q8-13 0-9Q-8-13-15-11Z', '#8E2F4F') + ln('M-4-10Q0-3 4-10M0-6V3', '#D9A441', 1.4) + R(-12, 17, 24, 3, '#D9A441') + shade('M4-12L15-11L21 0L15 4L12-3V21H4Z', 0.12),
  dress: ln('M0-22Q3-25 3-21Q3-19 0-18L-15-11H15Z', '#8A8378', 1.4) + d('M-15-11L-21 0L-15 4L-12-3V21H12V-3L15 4L21 0L15-11Q8-13 0-9Q-8-13-15-11Z', '#5E8B4A') + ln('M-4-10Q0-3 4-10', '#E8B04A', 1.4) + ln('M-12 10H12M-12 15H12', '#E8B04A', 1) + shade('M4-12L15-11L21 0L15 4L12-3V21H4Z', 0.12),
  wardrobe: RR(-17, -22, 34, 44, 2, '#8A5A3C') + R(-14, -19, 28, 38, '#4A2E24') + ln('M-14-14H14', '#9AA0A6', 1.2) + [[-10, '#8E2F4F'], [-3, '#5E8B4A'], [4, '#D9A441'], [10, '#4F6D8F']].map(([x, c]) => d(`M${x - 3} -14H${x + 3}L${x + 4} 12H${x - 4}Z`, c)).join('') + d('M17-22L27-18V24L17 22Z', '#6E4533') + C(21, 2, 1.2, '#D9A441'),
  kolamdots: d('M0-22L22 0L0 22L-22 0Z', '#A9583E') + `<g transform="rotate(45)">${ln([-7, 0, 7].map(i => [-7, 0, 7].map(j => `M${i} ${j}h0`).join('')).join(''), '#F4EEE2', 2.4) + ln([-7, 0, 7].map(i => [-7, 0, 7].map(j => `M${i - 3.5} ${j}a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0`).join('')).join(''), '#F4EEE2', 1)}${RR(-13, -13, 26, 26, 6, 'none', ' stroke="#F4EEE2" stroke-width="1.2"')}</g>`,
  flour: d('M-14-12Q-16 16-12 20H12Q16 16 14-12Q0-8-14-12Z', '#EDE3D2') + ln('M-10-12Q0-18 10-12', '#B99A68', 2) + R(-8, 0, 16, 9, '#C44A36') + e(13, 20, 9, 2.4, '#F4EEE2') + shade('M5-10Q14-12 14-12Q16 16 12 20H6Q8 4 5-10Z', 0.1),
  bowl: d('M-19-2Q-17 14 0 14Q17 14 19-2Z', '#B9BEC2') + e(0, -2, 19, 4.5, '#D3D7D9') + e(0, -3, 15, 4, '#F4EEE2') + d('M-12-4Q0-12 12-4Z', '#F8F4EA') + shade('M6-2H19Q17 14 0 14Q9 8 6-2Z', 0.12),
  press: ln('M-12-20H12M0-20V-14', '#9C7230', 2.6) + RR(-7, -15, 14, 24, 2, '#C9973E') + R(-7, -9, 14, 2, '#9C7230') + d('M-5 9H5L3 13H-3Z', '#9C7230') + ln('M0 14Q-8 16-2 19Q8 20 6 13', '#C98F4B', 3) + shade('M2-15H7V9H2Z', 0.15),
  calendar: RR(-18, -18, 36, 38, 3, '#F4EEE2') + R(-18, -18, 36, 10, '#8E2F4F') + ln('M-10-21V-15M10-21V-15', '#6E4533', 2) + txt(-3, 14, '8', 20, '#4A2E24') + d('M8 10Q9 15 12 15Q15 15 16 10Z', '#B8603A') + d('M12 3C13.6 6 13.4 7.6 12 9C10.6 7.6 10.4 6 12 3Z', '#E3A24A'),
  vilakku: e(0, 20, 13, 3.4, '#9C7230') + d('M-9 20Q-6 12-2 10H2Q6 12 9 20Z', '#C9973E') + R(-1.8, -8, 3.6, 18, '#C9973E') + e(0, 4, 4, 1.6, '#B08434') + e(0, -3, 3.5, 1.4, '#B08434')
    + d('M-15-10Q0-2 15-10Q12-14 0-14Q-12-14-15-10Z', '#C9973E') + shade('M4-13Q12-14 15-10Q9-6 4-5Z', 0.15) + d('M-1.6-14L0-22L1.6-14Z', '#C9973E')
    + [-12, -6, 6, 12].map(x => d(`M${x}-21C${x + 2.2}-17.5 ${x + 1.8}-15 ${x}-14C${x - 1.8}-15 ${x - 2.2}-17.5 ${x}-21Z`, '#E3A24A')).join(''),
  agal: [[-14, 4], [0, -2], [14, 4]].map(([x, y]) => d(`M${x - 8} ${y + 6}Q${x - 7} ${y + 14} ${x} ${y + 14}Q${x + 7} ${y + 14} ${x + 8} ${y + 6}Q${x} ${y + 9} ${x - 8} ${y + 6}Z`, '#B8603A') + e(x, y + 6, 8, 2.2, '#D08A56') + d(`M${x + 5} ${y - 4}C${x + 7} ${y} ${x + 6.6} ${y + 2.4} ${x + 5} ${y + 4}C${x + 3.4} ${y + 2.4} ${x + 3} ${y} ${x + 5} ${y - 4}Z`, '#E3A24A')).join(''),
  bananaleaf: d('M-22 8Q-20-12 0-14Q20-14 22 4Q10 16-22 8Z', '#5E8B4A') + ln('M-20 7Q0-2 20 2', '#46703A', 1) + e(-2, 0, 9, 6, '#F4EEE2') + C(10, -4, 4, '#B8603A') + C(12, 5, 3.5, '#D9A441') + C(-12, 4, 3, '#C44A36') + C(-10, -7, 5, '#E8D2A0'),
  sparkler: C(8, -8, 16, '#E3A24A', ' opacity=".2"') + ln('M-14 20L6-6', '#8A8378', 1.6) + ln('M8.0 -12.0L8.0 -23.0M10.0 -11.5L15.5 -21.0M11.5 -10.0L21.0 -15.5M12.0 -8.0L23.0 -8.0M11.5 -6.0L21.0 -0.5M10.0 -4.5L15.5 5.0M8.0 -4.0L8.0 7.0M6.0 -4.5L0.5 5.0M4.5 -6.0L-5.0 -0.5M4.0 -8.0L-7.0 -8.0M4.5 -10.0L-5.0 -15.5M6.0 -11.5L0.5 -21.0', '#E8B04A', 1.2) + ln('M9.1 -10.8L11.0 -15.4M10.8 -9.2L15.4 -11.1M10.8 -6.9L15.4 -5.0M9.2 -5.2L11.1 -0.6M6.9 -5.2L5.0 -0.6M5.2 -6.8L0.6 -4.9M5.2 -9.1L0.6 -11.0M6.8 -10.8L4.9 -15.4', '#F6E2A8', 1.4) + C(8, -8, 2.4, '#FFF6DC'),
  claypot: d('M-16-6Q-18 16 0 18Q18 16 16-6Z', '#9C5A38') + e(0, -6, 16, 4, '#B8703A') + e(0, -6, 13, 2.8, '#A0461E') + shade('M6-6H16Q18 16 0 18Q10 8 6-6Z', 0.15) + ln('M6-8L16-22', '#8A8378', 2) + ln('M-6-12q-3-5 1-9M2-13q3-5 0-9', '#F3E6CF', 1.4, ' opacity=".7"'),
  ladoo: e(0, 15, 21, 5, '#EDE3D2') + [[-12, 7], [0, 7], [12, 7], [-6, -4], [6, -4], [0, -15]].map(([x, y]) => C(x, y, 6.5, '#E3A83A') + e(x - 2, y - 2.6, 2, 1.3, '#F6D48A')).join('') + ln([[-12, 7], [0, 7], [12, 7], [-6, -4], [6, -4], [0, -15]].map(([x, y]) => `M${x + 2} ${y + 1}h0M${x - 1.5} ${y + 3}h0`).join(''), '#C98A2A', 1.2),
  murukku: e(0, 16, 20, 4, SH, ' opacity=".1"') + `<g transform="translate(-3 0)">${ln('M1 0a3 3 0 0 1 6 0a6 6 0 0 1-12 0a9 9 0 0 1 18 0a12 12 0 0 1-24 0a15 15 0 0 1 30 0', '#C98F4B', 5)}${ln('M1 0a3 3 0 0 1 6 0a6 6 0 0 1-12 0a9 9 0 0 1 18 0a12 12 0 0 1-24 0a15 15 0 0 1 30 0', '#9C6230', 5, ' stroke-dasharray="1.2 2.6" opacity=".55"')}</g>`,
  shopbag: ln('M-8-8Q-8-20 0-20Q8-20 8-8', '#7E3A24', 2.4) + d('M-15-8H15L13 20H-13Z', '#C44A36') + shade('M5-8H15L13 20H5Z', 0.12) + `<g transform="translate(6 6) rotate(-14)">${RR(-9, -6, 18, 12, 2, '#E3B54A')}${txt(0, 3.5, '30%', 7.5, '#5A2E12')}</g>`,
  saree: RR(-20, 4, 40, 14, 2, '#2F6B66') + R(-20, 14, 40, 2.5, '#D9A441') + RR(-18, -10, 36, 15, 2, '#8E2F4F') + R(-18, 1, 36, 3, '#D9A441') + ln('M-12-5h0M-4-5h0M4-5h0M12-5h0', '#E8B04A', 1.6) + shade('M8-10H18V5H8Z', 0.12),
  bangles: ['#C44A36', '#D9A441', '#2F6B66', '#D9A441', '#8E2F4F', '#D9A441'].map((c, i) => `<ellipse cx="0" cy="${12 - i * 5}" rx="17" ry="5.5" fill="none" stroke="${c}" stroke-width="3.2"/>`).join('') + ln('M-12-14Q-4-16 4-15.6', '#FFFFFF', 1, ' opacity=".5"'),
  marigold: ln('M-20-12Q0 18 20-12', '#5E8B4A', 1) + Array.from({ length: 9 }, (_, i) => { const t = i / 8, x = -20 + 40 * t, y = -12 + 60 * t * (1 - t); return C(x, y, 3.8, i % 2 ? '#E8B04A' : '#E08A2E') + C(x, y, 1.2, '#B8602A'); }).join('') + d('M-22-14L-17-19L-17-12ZM22-14L17-19L17-12Z', '#5E8B4A') + C(0, 12, 3, '#E08A2E') + C(0, 18, 2.4, '#E8B04A'),
  thoranam: ln('M-22-16Q0-9 22-16', '#8A5A3C', 1.2) + Array.from({ length: 9 }, (_, i) => { const x = -20 + i * 5, y = -15 + Math.sin(i / 8 * Math.PI) * 3.2; return d(`M${f1(x)} ${f1(y)}Q${f1(x - 3.6)} ${f1(y + 10)} ${f1(x)} ${f1(y + 17)}Q${f1(x + 3.6)} ${f1(y + 10)} ${f1(x)} ${f1(y)}Z`, i % 2 ? '#5E8B4A' : '#7FA35A'); }).join('') + C(0, -12, 3, '#E08A2E'),
  jasmine: ln('M-18 8Q-10-14 4-6Q18 2 10 14Q0 22-12 12', '#5E8B4A', 1) + ln('M-18 8h.6M-15 0h.6M-10-6h.6M-4-8h.6M2-7h.6M8-4h.6M13 0h.6M14 6h.6M11 12h.6M5 15h.6M-2 16h.6M-8 14h.6', '#F4EEE2', 3.8) + e(-20, 12, 3, 1.6, '#5E8B4A', ' transform="rotate(30 -20 12)"'),
  tin: RR(-14, -16, 28, 34, 3, '#2F6B66') + e(0, -16, 14, 3.5, '#3E8A83') + R(-5, -17, 10, 1.6, '#1F3A38') + R(-14, -2, 28, 10, '#D9A441') + C(0, -25, 4, '#D9A441') + shade('M5-16H14V18H5Z', 0.15),
  sweetbox: d('M-20-2H20L17 18H-17Z', '#C44A36') + R(-19, 6, 38, 3, '#D9A441') + C(-11, -6, 5, '#E3A83A') + C(-3, -8, 5, '#E3A83A') + d('M4-12L9-6L4 0L-1-6Z', '#EDE3D2') + d('M12-10L17-4L12 2L7-4Z', '#EDE3D2') + ln('M-15-2a3 3 0 1 1 3 3', '#E08A2E', 2) + shade('M5-2H20L17 18H5Z', 0.12),
  payasam: d('M-20-2Q-18 16 0 16Q18 16 20-2Z', '#C9973E') + e(0, -2, 19, 4.5, '#F1E4C8') + ln('M-8-3q2-2 4 0M3-2q2-2 4 0', '#E8C890', 1.6) + ln('M-2-4h0M8-3h0M-12-2h0', '#6E3A2A', 1.8) + ln('M10-6L22-18', '#B9BEC2', 2) + shade('M6-2H20Q18 16 0 16Q10 8 6-2Z', 0.12),
  panneer: e(0, 20, 11, 3, '#8A9096') + C(0, 8, 10, '#C3C8CC') + R(-2.2, -20, 4.4, 20, '#C3C8CC') + e(0, -21, 3, 2, '#AEB4B9') + shade('M3 0Q10 2 10 8Q10 16 3 18Z', 0.12) + e(-3, 4, 1.6, 4, '#FFFFFF', ' opacity=".5"') + C(-15, 17, 4.6, '#C4405A') + C(-15, 17, 2, '#A0304A') + e(-10, 20, 3, 1.4, '#5E8B4A'),
  henna: RR(-11, -8, 22, 26, 7, '#C98A62') + [[-10, -21, 17], [-4.5, -24, 20], [1, -23, 19], [6.5, -19, 15]].map(([x, y, h]) => RR(x, y, 5, h, 2.5, '#C98A62')).join('') + RR(-17, -2, 5, 14, 2.5, '#C98A62', ' transform="rotate(-35 -14 5)"')
    + C(0, 5, 5, 'none', ' stroke="#7A3A1E" stroke-width="1.2"') + C(0, 5, 1.6, '#7A3A1E') + ln('M-8-19V-16M-2-22V-19M3-21V-18M8.5-17V-14M-6 13Q0 16 6 13', '#7A3A1E', 1.2),
  adhirasam: [[-6, 8], [7, 4], [-1, -5]].map(([x, y]) => e(x, y + 1, 12, 6, '#5E3218') + e(x, y, 12, 5.5, '#7A4424') + e(x, y - 1, 9, 3.4, '#8C5230') + ln(`M${x - 4} ${y - 1}h0M${x + 3} ${y}h0`, '#E8D2A0', 1.3)).join(''),
  coconut: C(8, -8, 11, '#6E4225') + ln('M5-12h0M9-13h0M7-9h0', '#3A2414', 1.8) + d('M-20 0A20 14 0 0 0 20 0Z', '#7A4A2A') + e(0, 0, 18, 4.6, '#F4EEE2') + e(0, 0, 13, 3, '#E4E0D2') + shade('M8 1A20 14 0 0 1 20 0A20 14 0 0 1 5 13Z', 0.15),
  jalebi: e(0, 10, 21, 6, '#EDE3D2') + [[-9, 2], [7, 0], [-1, -9]].map(([x, y]) => `<g transform="translate(${x} ${y})">${ln('M0 0a2.5 2.5 0 1 1 2.5 2.5a5.5 5.5 0 1 1 5.5-5.5a8 8 0 0 1-8 8', '#E08A2E', 3.4)}${ln('M0 0a2.5 2.5 0 1 1 2.5 2.5a5.5 5.5 0 1 1 5.5-5.5', '#F6C27A', 0.9, ' opacity=".8"')}</g>`).join(''),
  kandil: C(0, -2, 22, '#E3A24A', ' opacity=".22"') + ln('M0-24V-20', '#6E4533', 1.4) + d('M' + Array.from({ length: 10 }, (_, i) => { const a = (i * 36 - 90) * Math.PI / 180, r = i % 2 ? 7.5 : 17; return `${f1(r * Math.cos(a))} ${f1(r * Math.sin(a) - 2)}`; }).join('L') + 'Z', '#C44A36')
    + d('M' + Array.from({ length: 10 }, (_, i) => { const a = (i * 36 - 90) * Math.PI / 180, r = i % 2 ? 4 : 9; return `${f1(r * Math.cos(a))} ${f1(r * Math.sin(a) - 2)}`; }).join('L') + 'Z', '#E3A24A') + ln('M-4 12V24M0 11V25M4 12V24', '#D9A441', 1.4) + ln('M-2 12V22M2 12V22', '#C44A36', 1.2),
  tinopen: d('M-18-6V14Q0 21 18 14V-6Z', '#C44A36') + e(0, -6, 18, 4.5, '#9E3A2A') + e(0, -6, 15.5, 3.4, '#4A1C1C') + R(-18, 3, 36, 4, '#D9A441') + shade('M6-4H18V14Q12 17 6 18Z', 0.15),
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
  const FY = { aina: -117.5, wei: -116.5, raju: -113.5, kamala: -113.5, arjun: -73.5 }, HOLD_Y = { aina: -71, wei: -72, raju: -68, kamala: -69.5, arjun: -45 };
  const SKIN = { aina: A.skin, wei: W.skin, raju: J.skin, kamala: KM.skin, arjun: AJ.skin };
  const BODY = { aina: ainaBody, wei: weiBody, raju: rajuBody, kamala: kamalaBody, arjun: arjunBody };
  const RIG = { aina: [12.5, -97], wei: [12.5, -98], raju: [14, -94], kamala: [11.5, -95], arjun: [8, -62, 0.65] };
  const faceUse = (who, f, x, y) => who === 'raju' ? use(`rf-${f}`, () => faceArt(f, 7.2) + MOUSTACHE, x, y) : use(`f-${f}`, () => faceArt(f), x, y);
  const person3 = who => (o = {}) => {
    const { x = 160, y = 188, s = 1, face = 'happy', pose = 'stand', flip = false, item = null, is = 0.5, apron = null } = o;
    const fp = pose === 'kneel' ? [0, FY[who] + 40] : pose === 'hug' ? [-3, FY[who] + 72] : [0, FY[who]];
    let inner = use(`${who}-${pose}${apron ? '-a' : ''}`, () => BODY[who](pose, ...(apron ? [apron] : []))) + faceUse(who, face, fp[0], fp[1]);
    if (pose === 'hold') { const k = arms(RIG[who][0], RIG[who][1], 'hold', RIG[who][2]);
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
    'home-n': () => home(false), 'home-d': () => home(true), 'porch-n': () => porch(false), 'porch-d': () => porch(true),
    kitchen: () => R(0, 0, 320, 200, '#D9C4A0') + R(0, 58, 320, 62, '#ECE4D4') + ln(Array.from({ length: 21 }, (_, i) => `M${i * 16} 58V120`).join('') + 'M0 74H320M0 90H320M0 106H320', '#D6CBB6', 0.8)
      + R(226, 12, 82, 60, '#E9D8B8') + R(230, 16, 74, 52, '#A9C8CF') + glow(267, 44, 90, 0.45, '#FFF1D0') + R(265.5, 16, 3, 52, '#E9D8B8') + R(222, 70, 90, 4, '#8A5A3C')
      + R(12, 30, 116, 4, '#8A5A3C') + [[18, 10, 14, '#C9953A'], [32, 9, 12, '#B5533A'], [46, 12, 16, '#2F6B66'], [64, 10, 13, '#E9D8B8'], [80, 12, 15, '#6F8FA6'], [98, 9, 11, '#C9953A'], [112, 10, 14, '#8E2F4F']].map(([x, w, h, c]) => RR(x, 30 - h, w, h, 2, c)).join('')
      + ln('M146 16V40M158 16V36M170 16V42', '#6E4533', 1.4) + e(146, 42, 3.5, 2.5, '#9AA0A6') + e(158, 38, 3, 4, '#9AA0A6') + e(170, 44, 4, 2.2, '#9AA0A6') + R(140, 14, 36, 3, '#6E4533')
      + R(0, 118, 320, 6, '#C9B28A') + R(0, 124, 320, 48, '#8A5A3C') + ln('M64 124V172M128 124V172M192 124V172M256 124V172', '#6E4533', 1.4) + ln('M58 144V152M70 144V152M186 144V152M198 144V152', '#D9A441', 1.6)
      + R(172, 110, 56, 8, '#4A4E5E') + e(188, 109, 12, 3, '#2A2226') + RR(208, 96, 16, 14, 2, '#9AA0A6') + ln('M212 90q-3-5 1-9M220 92q3-5 0-9', '#F3E6CF', 1.6, ' opacity=".6"')
      + R(0, 172, 320, 28, '#9C7A5A') + ln('M0 186H320M40 172L34 200M120 172L118 200M200 172L202 200M280 172L286 200', '#86664A', 0.8),
    shop: () => R(0, 0, 320, 200, '#E6D2B0') + R(10, 20, 300, 98, '#8A5A3C') + R(14, 24, 292, 90, '#5A3A2E')
      + [28, 58, 88].map((y, r) => Array.from({ length: 18 }, (_, i) => { const c = ['#8E2F4F', '#D9A441', '#2F6B66', '#C44A36', '#4F6D8F', '#C4607A', '#6E4A7E', '#E08A2E'][(i * 3 + r * 5) % 8]; return RR(18 + i * 16, y, 13, 24, 2, c) + R(20 + i * 16, y + 4, 9, 2, '#FFFFFF', ' opacity=".25"'); }).join('') + R(14, y + 24, 292, 3, '#8A5A3C')).join('')
      + glow(160, 60, 150, 0.35) + ln('M0 10Q80 24 160 10Q240 24 320 10', '#6E4533', 0.8) + Array.from({ length: 15 }, (_, i) => { const x = 11 + i * 21.4; return d(`M${x - 5} ${12 + (i % 8 < 4 ? i % 4 : 4 - i % 4) * 2}h10l-5 8Z`, ['#C44A36', '#D9A441', '#2F6B66', '#8E2F4F'][i % 4]); }).join('')
      + R(0, 118, 320, 54, '#D8C09A') + R(0, 172, 320, 28, '#B08A64') + ln('M0 186H320', '#9C7A58', 0.8)
      + R(236, 124, 84, 48, '#6E4533') + R(232, 118, 88, 7, '#8A5A3C') + shade('M236 125H320V132H236Z'),

  };
  function porch(day) {
    const wall = day ? '#E2C79C' : '#9A7450', lit = day ? '#F1E3C8' : '#F2C77A', glass = day ? '#A9C8CF' : lit;
    const leaves = Array.from({ length: 9 }, (_, i) => { const x = 131 + i * 7.25, y = 50 + Math.sin(i / 8 * Math.PI) * 5; return d(`M${f1(x - 2.6)} ${f1(y)}Q${f1(x)} ${f1(y + 12)} ${f1(x)} ${f1(y + 12)}Q${f1(x)} ${f1(y + 12)} ${f1(x + 2.6)} ${f1(y)}Z`, i % 2 ? '#5E8B4A' : '#7FA35A'); }).join('');
    const marigold = Array.from({ length: 11 }, (_, i) => { const t = i / 10, x = 126 + 68 * t, y = 46 + 4 * 16 * t * (1 - t) / 1.6; return C(x, y, 2.4, i % 2 ? '#E8B04A' : '#E08A2E'); }).join('');
    const lamp = x => e(x, 161, 5, 2, '#B8603A') + d(`M${x} 151C${x + 2.6} 155 ${x + 2.2} 158 ${x} 159C${x - 2.2} 158 ${x - 2.6} 155 ${x} 151Z`, day ? '#D9C9A4' : '#F2B45A') + (day ? '' : glow(x, 155, 22, 0.85));
    return R(0, 0, 320, 200, wall) + (day ? '' : glow(160, 100, 170, 0.5)) + R(0, 0, 320, 14, '#5A3A2E') + R(0, 14, 320, 5, SH, ' opacity=".25"')
      + (day ? ln('M0 18Q160 30 320 18', '#3A2F35', 0.8) : bulbs([0, 18], [160, 32], [320, 18], 16))
      + [36, 228].map(x => R(x, 50, 56, 52, '#8A5A3C') + R(x + 4, 54, 48, 44, glass) + ln(`M${x + 20} 54V98M${x + 36} 54V98M${x + 4} 76H${x + 52}`, '#5A3A2E', 1.2) + (day ? '' : glow(x + 28, 76, 44, 0.45))).join('')
      + R(130, 42, 60, 124, '#8A5A3C') + R(134, 46, 52, 120, lit) + (day ? '' : glow(160, 110, 70, 0.5)) + d('M134 46L150 52V160L134 166Z', '#6E4533')
      + ln('M128 49Q160 57 192 49', '#3B5A2A', 0.9) + leaves + marigold
      + [112, 208].map(x => `<g transform="translate(${x} 146) scale(.55)">${ITEMS.vilakku}</g>` + (day ? '' : glow(x, 139, 18, 0.6))).join('')
      + R(0, 164, 320, 36, day ? '#B8674A' : '#86452E') + R(0, 162, 320, 4, '#7E3A28') + ln('M0 178H320M0 192H320M44 166L36 200M112 166L108 200M208 166L212 200M276 166L284 200', day ? '#A45A3E' : '#86452E', 0.8)
      + [14, 42, 70, 250, 278, 306].map(lamp).join('')
      + `<g transform="translate(160 186) scale(1 .34)">${ring(8, a => `<ellipse cx="0" cy="-17" rx="7" ry="13" fill="${a % 90 ? '#E08A2E' : '#C4607A'}" transform="rotate(${a})"/>`)}${ring(16, a => C(0, -31, 2.2, '#F4EEE2', ` transform="rotate(${a})"`))}${C(0, 0, 9, '#D9B04A')}${C(0, 0, 4, '#2F6B66')}</g>`
      + RR(4, 128, 18, 34, 2, '#B5533A') + RR(298, 128, 18, 34, 2, '#B5533A') + [8, 302].map(x => [[-24, 12], [0, 15], [24, 12]].map(([a, h]) => e(x + 5, 128 - h, 4, h, '#3F6B4A', ` transform="rotate(${a} ${x + 5} 128)"`)).join('')).join('');
  }
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
  /** Full-bleed background. kind: stall | street | home | kopitiam | night | porch | kitchen | shop. stall opts: { sign, a, behind, items, steam } home opts: { day } kopitiam opts: { table } */
  function scene(kind, o = {}) {
    if (kind === 'stall') { const a = CAN[o.a] || o.a || '#B5533A';
      return use('stall', SCENES.stall) + (o.behind || '') + use(`can${a.slice(1)}`, () => d(canopyD(18, 24, 284, 16, 11), a) + shade(canopyD(18, 34, 284, 6, 11)) + R(16, 21, 288, 4, '#5A3A2A'))
        + (o.sign ? RR(100, 1, 120, 18, 4, '#E3C27A') + txt(160, 15, o.sign, 12, '#6E2E1A', ' letter-spacing="1"') : '') + (o.steam ? steam(`M${o.steam - 4} 116q-5-8 0-15t0-16`) + steam(`M${o.steam + 6} 114q5-9 0-17t1-18`) : '')
        + use('counter', SCENES.counter) + (o.items || ''); }
    if (kind === 'home') return use(o.day ? 'home-d' : 'home-n', SCENES[o.day ? 'home-d' : 'home-n']);
    if (kind === 'porch') return use(o.day ? 'porch-d' : 'porch-n', SCENES[o.day ? 'porch-d' : 'porch-n']);
    if (kind === 'kitchen') return use('kitchen', SCENES.kitchen) + (o.items || '');
    if (kind === 'shop') return use('shop', SCENES.shop) + (o.sign ? RR(100, 1, 120, 18, 4, '#C44A36') + txt(160, 15, o.sign, 12, '#F4EEE2', ' letter-spacing="1"') : '') + (o.items || '');
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
    aina: person3('aina'), wei: person3('wei'), raju: person3('raju'), kamala: person3('kamala'), arjun: person3('arjun'), duit, scene, coffeeTable, grain, sticker, it, priceTag,
    /** Everything the panels <use>: put it once in a hidden <svg><defs>…</defs></svg>. Call after drawing the panels. */
    defs: () => BASE() + [...defs.values()].join(''),
  };
}
