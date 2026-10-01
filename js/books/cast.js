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
const POSES = { stand: [DOWN, DOWN], hold: [[6.5, 15, -3, 24.5], [6.5, 15, -3, 24.5]], point: [DOWN, [11.5, 5, 22, 1]], wave: [DOWN, [12.5, -5, 9.5, -24]], cheer: [[12.5, -5, 9.5, -24], [12.5, -5, 9.5, -24]],
  // teh tarik: the back arm crosses the body to hold the low glass out in front, the front hand high pouring
  pull: [[-2, 26, -32, 33], [12.5, -5, 9.5, -24]],
  hip: [DOWN, [17, 14, 3, 30]], hips: [[26, 10, 0, 27], [26, 10, 0, 27]], show: [DOWN, [16, 0, 14, -16]], call: [DOWN, [10, -3, -5, -20]], call2: [[14, 6, 22, 10], [10, -3, -5, -20]], chin: [[10, 4, -9, -10], [10, 4, -9, -10]], mouth: [DOWN, [9, -2, -10, -14]], thumbs: [DOWN, [12, 8, 2, -6]], heart: [DOWN, [8, 12, -12, 4]],
  rest: [DOWN, [8, 18, 14, 26]], pointdown: [DOWN, [18, 6, 32, 24]], strap: [DOWN, [8, 12, -8, 6]], wrap: [[4, 26, -18, 12], [4, 26, -18, 14]], gesture: [DOWN, [14, 6, 22, 10]], shout: [[11, 3, -9.5, -13], [11, 3, -9.5, -13]], cross: [[7.5, 37, -20.5, 17], [7.5, 37, -20.5, 19]], flat: [[9, 22, 9, 37], [9, 22, 9, 37]], give: [[-4, 12, -30, 19], [9, 13, 19, 19]] };
const arms = (sx, sy, pose, k = 1) => { const [a0, b0] = POSES[pose] || POSES.stand, a = k === 1 ? a0 : a0.map(v => f1(v * k)), b = k === 1 ? b0 : b0.map(v => f1(v * k));
  // A raised arm (end above the elbow line) gets its sleeve drawn along the upper arm, not hanging down: a hanging
  // sleeve with a bare arm rising beside it read as an arm floating loose from the body. sl: [back, front], '' = down.
  const half = (s, c) => `M${s * sx} ${sy}l${f1(s * (0.36 * c[0] + 0.06 * c[2]))} ${f1(0.36 * c[1] + 0.06 * c[3])}`;
  return { d: `M${-sx} ${sy}q${-a[0]} ${a[1]} ${-a[2]} ${a[3]}M${sx} ${sy}q${b[0]} ${b[1]} ${b[2]} ${b[3]}`, hands: [[-sx - a[2], sy + a[3] + 1], [sx + b[2], sy + b[3] + 1]],
    sl: [a[3] < 20 ? half(-1, a) : '', b[3] < 20 ? half(1, b) : ''] }; };
/** Short sleeves: the hanging triangle on a lowered arm, a sleeve along the upper arm on a raised one. tri: [back, front]. */
const sleeves = (k, c, w, tri) => k.sl.map((s, i) => s ? ln(s, c, w) : tri[i] ? d(tri[i], c) : '').join('');
const hands = (hs, c) => hs.map(([x, y]) => { const i = x < 0 ? 1 : -1;
  return e(x, y, 2.8, 3, c) + e(f1(x + 2.2 * i), f1(y - 1.4), 1.3, 1, c, ` transform="rotate(${-35 * i} ${f1(x + 2.2 * i)} ${f1(y - 1.4)})"`) + ln(`M${f1(x - 1.6)} ${f1(y + 1.2)}h3.2`, INK, 0.3, ' opacity=".35"'); }).join('');
/** Hands holding something: a mitten with the thumb wrapped over the front, toward the middle. */
const mitts = (hs, c) => hs.map(([x, y]) => { const i = x < 0 ? 1 : -1;
  return e(x, y, 2.9, 3.2, c) + e(x + 2 * i, y - 1.2, 1.5, 1.1, c, ` transform="rotate(${-30 * i} ${x + 2 * i} ${y - 1.2})"`) + ln(`M${f1(x + 0.6 * i)} ${f1(y - 0.4)}q${1.2 * i} -.6 ${2.4 * i} -.6`, INK, 0.35, ' opacity=".4"'); }).join('');
// The three-quarter turn (person3 `turn`): the far cheek under the hair or tudung, drawn for a turn toward +x.
const FAR = 0.74;
const TURN = { aina: e(-6.4, -117.5, 2.3, 8.8, '#B8645E'), wei: e(-6.7, -117, 2.3, 8.8, '#2A2226'), raju: e(4.8, -114.5, 2.3, 5, '#8E5B3E') + e(-7.2, -115, 2.6, 4.6, '#8E5B3E') + ln('M-6.6-121Q-9.6-116-7.6-109.5', '#C9C1B6', 1.5) + e(-6.6, -113, 1.6, 2.5, '#8E5B3E') + ln('M-6.2-114.4q-.8.8 0 2', '#6E4530', 0.5) };
const foot = (c, a = -5.5, b = 5.5) => e(a, -2.4, 5, 2.4, c) + e(b, -2.6, 5, 2.4, c);
const shadowE = e(0, 0, 17, 3.4, '#120E1E', ' opacity=".35"');

const A = { skin: '#D9A27E', tudung: '#B8645E', tunic: '#2F6B66', arm: '#29605B', skirt: '#24504C', shoe: '#3A2A28' };
const TUDUNG = d('M0-133C-12-133-14.5-121-13.5-113C-15.5-106-19.5-99-16.5-90Q0-84 16.5-90C19.5-99 15.5-106 13.5-113C14.5-121 12-133 0-133Z', A.tudung)
  + shade('M4-132C10-130 14-122 13.5-113C15.5-106 19.5-99 16.5-90Q12-88 8-87C12-96 12-104 10-112C11-120 9-128 4-132Z')
  + e(0, -117.5, 7, 9, A.skin) + ln('M-8-128Q0-133 8-128', '#9E524D', 0.7) + C(0, -88, 1.3, '#D9A441');
function ainaBody(pose) {
  // sitting on the floor hugging her knees, head down on them: hips behind, shins and feet in front of the tudung,
  // arms round the shins
  if (pose === 'hug') return shadowE.replace('rx="17"', 'rx="26"') + d('M-24-2Q-27-16-16-22H6L10-2Z', A.skirt) + d('M-18-20Q-22-34-12-46H6Q4-30 6-20Z', A.tunic)
    + d('M6-34L15-38L22-3H12Z', A.skirt) + e(19, -2.4, 5.2, 2.6, A.shoe) + d('M12-36L22-40L30-3H20Z', '#3A7F79') + e(27, -2.4, 5.4, 2.6, A.shoe) + e(17, -38, 6, 4.4, '#3A7F79') + shade('M20-38L22-40L30-3H25Z', 0.14)
    + at(-3, 72, 1, TUDUNG) + ln('M2-36Q14-31 22-25M-2-30Q10-25 19-19', A.arm, 4.6) + e(23, -24, 2.6, 2.8, A.skin) + e(20, -18, 2.6, 2.8, A.skin);
  if (pose === 'kneel') { const k = arms(12.5, -57, 'hold');
    return e(-16, -2, 5.4, 2.4, A.shoe) + d('M2-16Q18-20 25-8Q26-1 18 0H2Z', A.skirt) + shade('M14-18Q22-16 25-8Q26-1 18 0H14Z', 0.18) + d('M-12-60Q-16-34-20-4Q0 0 20-4Q16-34 12-60Z', A.tunic) + shade('M4-60Q9-60 12-60Q16-34 20-4Q13-2 8-2Q8-30 4-60Z')
      + ln('M-12.5-57Q-19-42-8-29M12.5-57Q19-42 9-27', A.arm, 6) + at(0, 40, 1, TUDUNG) + hands([[-7.5, -28], [8.5, -26]], A.skin); }
  const k = arms(12.5, -97, pose);
  return shadowE + foot(A.shoe, -6, 5) + d('M-10-70L-13.5-4Q0-1.5 13.5-4L10-70Z', A.skirt) + shade('M4-70L10-70L13.5-4Q9-3 6-3Z')
    + d('M-12-100Q-15.5-74-17.5-38Q0-34 17.5-38Q15.5-74 12-100Z', A.tunic) + shade('M4-100Q9-100 12-100Q15.5-74 17.5-38Q12-36.5 7-36Q8-70 4-100Z')
    + ln(k.d, A.arm, 6) + sleeves(k, A.arm, 8.5, ['', '']) + TUDUNG
    // a raised arm lifts the tudung's edge, so the arm comes out from under the cloth instead of floating beside it
    + k.sl.map((s, i) => s ? d('M13-106Q22-102 25-95Q20-91 15-89Z', A.tudung, i ? '' : ' transform="scale(-1 1)"') : '').join('') + (pose === 'hold' || pose === 'give' ? '' : hands(k.hands, A.skin));
}
const W = { skin: '#E3B48E', shirt: '#D9A441', jeans: '#46557E', shoe: '#E9DFCF', hair: '#2A2226' };
const weiHead = d('M-10-117Q-11-131.5 0-131.5Q11-131.5 10-117L10.5-106Q6-104 3.5-107.5H-3.5Q-6-104-10.5-106Z', W.hair) + e(0, -117, 7.2, 9.2, W.skin)
  + d('M-8-118.5Q-9-129.5 0-129.5Q9-129.5 8-118.5Q4-123-1-122Q-5-123-8-118.5Z', W.hair) + RR(3, -127, 4.5, 1.8, 0.8, '#D9A441');
function weiBody(pose) {
  if (pose === 'kneel' || pose === 'kneelopen' || pose === 'kneelreach') {
    const legsBack = e(0, 0, 24, 3, '#120E1E', ' opacity=".35"') + ln('M-4-22L-9-4', W.jeans, 9.5) + ln('M-9-4L-25-3', W.jeans, 7.5) + e(-28, -3.4, 4.4, 2.6, W.shoe) + e(-9, -3.2, 4.6, 3, W.jeans);
    const legsFront = ln('M3-23L20-25', W.jeans, 10) + shade('M3-19L20-21L20-29Z', 0.15) + ln('M20-25L20-4', W.jeans, 8.4) + e(22, -2.4, 6, 2.6, W.shoe) + e(20, -25, 5, 5, W.jeans);
    const arm = pose === 'kneelreach' ? ln('M-12.5-58Q-19-44-8-31M12.5-58Q24-60 36-66', W.skin, 4.6) + d('M-9-62.5Q-16-62-19-47L-10-45.5ZM9-62.5Q18-63 22-57L12-52Z', W.shirt) + hands([[-7.5, -30], [37, -66]], W.skin)
      : pose === 'kneelopen' ? ln('M-12.5-58Q-24-60-32-74M12.5-58Q24-60 32-74', W.skin, 4.6) + d('M-9-62.5Q-18-63-22-57L-12-52ZM9-62.5Q18-63 22-57L12-52Z', W.shirt) + hands([[-33, -75], [33, -75]], W.skin)
      : ln('M-12.5-58Q-19-44-8-31M12.5-58Q19-44 12-28', W.skin, 4.6) + d('M-9-62.5Q-16-62-19-47L-10-45.5ZM9-62.5Q16-62 19-47L10-45.5Z', W.shirt) + hands([[-7.5, -30], [12, -27]], W.skin);
    return legsBack + R(-2.6, -70, 5.2, 10, W.skin) + d('M-12-61Q-13-44-11-20H11Q13-44 12-61Q0-64.5-12-61Z', W.shirt) + shade('M4-63Q9-62 12-61Q13-44 11-20H6Q8-44 4-63Z')
      + legsFront + arm + at(0, 40, 1, weiHead); }
  if (pose === 'hug') return shadowE.replace('rx="17"', 'rx="22"') + d('M10-4Q12 0 6 0H-19Q-22-2-19-5L-16-7L-16.5-27Q-13-35-6-31L9-14Z', W.jeans) + shade('M-2-26L9-14L10-4H3Z') + e(-19, -2.5, 5, 2.6, W.shoe)
    + d('M-5-40Q4-44 11-38L12-4H0Q-5-22-5-40Z', W.shirt) + shade('M5-42Q9-41 11-38L12-4H7Q8-24 5-42Z')
    + ln('M1-37Q-6-28-15-26', W.skin, 4.6) + d('M-3-40L-9-31L-1-29Z', W.shirt) + e(-16, -26, 2.5, 2.7, W.skin) + R(-4.6, -43, 5.2, 6, W.skin) + at(-3, 72, 1, weiHead);
  const k = arms(12.5, -98, pose);
  return shadowE + foot(W.shoe, -6, 6) + d('M-10.5-66L-10-4H-2L0-50L2-4H10L10.5-66Z', W.jeans) + shade('M3-66H10.5L10-4H6Z')
    + R(-2.6, -110, 5.2, 10, W.skin) + d('M-12-101Q-13-84-11-63H11Q13-84 12-101Q0-104.5-12-101Z', W.shirt) + shade('M4-103Q9-102 12-101Q13-84 11-63H6Q8-84 4-103Z')
    + ln(k.d, W.skin, 4.6) + sleeves(k, W.shirt, 7.5, ['M-9-102.5Q-16-102-19-87L-10-85.5Z', 'M9-102.5Q16-102 19-87L10-85.5Z']) + weiHead + (pose === 'hold' || pose === 'give' ? '' : hands(k.hands, W.skin));
}
const J = { skin: '#8E5B3E', shirt: '#6F8FA6', apron: '#EDE0C8', trousers: '#4A4E5E', hair: '#D3CCC2', shoe: '#4A3A30' };
function rajuBody(pose, apron = J.apron) {
  const k = arms(14, -94, pose);
  return shadowE + foot(J.shoe, -6, 6) + d('M-13-60L-12-4H-2.5L0-46L2.5-4H12L13-60Z', J.trousers) + shade('M4-60H13L12-4H7Z')
    + R(-3, -106, 6, 12, J.skin) + d('M-14-95Q-19-78-15-58H15Q19-78 14-95Q0-98-14-95Z', J.shirt) + shade('M5-97Q12-96 14-95Q19-78 15-58H9Q11-78 5-97Z')
    + d('M-9-86H9L12-57Q0-54-12-57Z', apron) + ln('M-8.5-86L-5-96M8.5-86L5-96', apron, 1.3) + R(-5, -76, 10, 7, apron === J.apron ? '#DDCFB5' : '#C9683F') + (apron === J.apron ? d('M-.5-69L5-69V-74.5L2.4-71.5Z', '#3B2723') + d('M5-74.5L9.4-66L4.2-67.6Z', '#DDCFB5') + ln('M5-74.5L9.4-66', '#B9AC94', 0.5) : '')
    + ln(k.d, J.skin, 5) + sleeves(k, J.shirt, 8, ['M-11-97Q-18-96-20.5-82L-11.5-80Z', 'M11-97Q18-96 20.5-82L11.5-80Z'])
    + e(-8, -113, 1.8, 2.6, J.skin) + e(8, -113, 1.8, 2.6, J.skin) + e(0, -114, 8, 9.5, J.skin) + e(-7.2, -115, 2.4, 4.4, J.hair) + e(7.2, -115, 2.4, 4.4, J.hair) + e(-2.5, -121, 3, 1.3, '#A87050')
    + (pose === 'hold' || pose === 'give' ? '' : hands(k.hands, J.skin));
}
const KM = { skin: '#8A5A3E', saree: '#8E2F4F', dark: '#74263F', gold: '#D9A441', blouse: '#C9923A', hair: '#1F1A1C', shoe: '#6E4533' };
/** Aunty Kamala, Uncle Raju's wife: saree with the pallu over her left shoulder, jasmine in her hair, a pottu. */
function kamalaBody(pose) {
  const k = arms(11.5, -95, pose);
  return shadowE + foot(KM.shoe) + d('M-11-68L-14-4Q0-1.5 14-4L11-68Z', KM.saree) + ln('M-2-62L-3.5-6M2.5-62L3.5-6M6.5-60L8-6', KM.dark, 0.8)
    + d('M-14.2-8.5Q0-6 14.2-8.5L14-4Q0-1.5-14-4Z', KM.gold) + shade('M4-68H11L14-4Q10-3 7-3Z')
    + R(-2.6, -107, 5.2, 10, KM.skin) + d('M-11.5-96Q-14-82-11-68H11Q14-82 11.5-96Q0-99-11.5-96Z', KM.blouse) + d('M12-96Q18-80 16-52L11-54Q13-74 10-92Z', KM.dark)
    + ln(k.d, KM.skin, 4.4) + sleeves(k, KM.blouse, 7, ['M-11.5-96L-15.5-86L-9.5-85Z', ''])
    + d('M-11.5-66Q-3-74 3-96Q8-100 12.5-96L13-86Q5-78-3-64Z', KM.saree) + ln('M-11.5-66Q-3-74 3-96', KM.gold, 1.6) + shade('M4-94Q9-99 12.5-96L13-86Q9-83 6-81Z', 0.18)
    + d('M-8.6-113Q-9.6-124.5 0-124.8Q9.6-124.5 8.6-113L8.4-106Q0-103-8.4-106Z', KM.hair) + e(0, -113.5, 7.2, 8.8, KM.skin)
    + d('M-7.6-115Q-8-123 0-123.4Q8-123 7.6-115Q5-120.5.4-120.6L0-119.5L-.4-120.6Q-5-120.5-7.6-115Z', KM.hair) + ln('M-2-123Q-5-121.5-7-117', '#8A8580', 0.9)
    + C(0, -119, 0.9, '#B5332A') + ln('M8.8-118h0M9.2-114.5h0M9-111h0', '#F4EEE2', 2.2) + C(-7.3, -110, 1, KM.gold) + C(7.3, -110, 1, KM.gold)
    + (pose === 'hold' || pose === 'give' ? '' : hands(k.hands, KM.skin));
}
const AJ = { skin: '#8E5B3E', kurta: '#4F7A9A', trim: '#D9A441', pants: '#EFE6D3', hair: '#1F1A1C', shoe: '#6E4533' };
/** Arjun, their grandson (about eight): kurta and white trousers. */
function arjunBody(pose) {
  if (pose === 'ride') {
    const H = [0, -34], th = 22 * Math.PI / 180, rot = ([x, y]) => [f1(H[0] + (x - H[0]) * Math.cos(th) - (y - H[1]) * Math.sin(th)), f1(H[1] + (x - H[0]) * Math.sin(th) + (y - H[1]) * Math.cos(th))];
    const leg = (P, col) => { const dx = P[0] - H[0], dy = P[1] - H[1], dd = Math.hypot(dx, dy), L1 = 16, L2 = 17, a = (L1 * L1 - L2 * L2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
      const kx = f1(H[0] + a * dx / dd - h * dy / dd), ky = f1(H[1] + a * dy / dd + h * dx / dd);
      return ln(`M${H[0]} ${H[1]}L${kx} ${ky}L${P[0]} ${P[1]}`, col, 6.4) + e(P[0] + 1.5, P[1] + 1, 3.6, 1.8, AJ.shoe); };
    const [sf, sb] = [rot([8, -62]), rot([-8, -62])], G = [[20, -36], [23, -37.5]];
    return leg([3.75, -3.2], '#D9CFBE') + ln(`M${sb[0]} ${sb[1]}Q${f1((sb[0] + G[0][0]) / 2 - 2)} ${f1((sb[1] + G[0][1]) / 2 - 4)} ${G[0][0]} ${G[0][1]}`, AJ.kurta, 4)
      + `<g transform="rotate(22 0 -34)">${R(-2, -68, 4, 6, AJ.skin) + d('M-8-64Q-10-48-11-28Q0-25 11-28Q10-48 8-64Q0-66.5-8-64Z', AJ.kurta) + shade('M3-66Q6-65 8-64Q10-48 11-28Q8-27 6-27Q6-48 3-66Z')
        + ln('M0-64V-50M-3-64Q0-61 3-64', AJ.trim, 1) + e(-7.3, -73.5, 1.5, 2.2, AJ.skin) + e(7.3, -73.5, 1.5, 2.2, AJ.skin) + e(0, -74, 7.4, 8.4, AJ.skin)
        + d('M-7.6-75Q-8.4-84.6 0-84.8Q8.4-84.6 7.6-75Q6-79.5 1-80Q-5-80-7.6-75Z', AJ.hair) + ln('M1-84.5Q2.5-87.5 4.5-86.5', AJ.hair, 1.4)}</g>`
      + leg([13.75, -4.8], AJ.pants) + ln(`M${sf[0]} ${sf[1]}Q${f1((sf[0] + G[1][0]) / 2 + 2)} ${f1((sf[1] + G[1][1]) / 2 - 2)} ${G[1][0]} ${G[1][1]}`, AJ.kurta, 4) + mitts(G, AJ.skin);
  }
  const k = arms(8, -62, pose, 0.65);
  return e(0, 0, 11, 2.6, '#120E1E', ' opacity=".35"') + e(-3.6, -1.8, 3.6, 1.8, AJ.shoe) + e(3.6, -1.9, 3.6, 1.8, AJ.shoe)
    + d('M-7-36L-6.5-3H-1.5L0-26L1.5-3H6.5L7-36Z', AJ.pants) + R(-2, -68, 4, 6, AJ.skin)
    + d('M-8-64Q-10-48-11-28Q0-25 11-28Q10-48 8-64Q0-66.5-8-64Z', AJ.kurta) + shade('M3-66Q6-65 8-64Q10-48 11-28Q8-27 6-27Q6-48 3-66Z') + ln('M0-64V-50M-3-64Q0-61 3-64', AJ.trim, 1)
    + ln(k.d, AJ.kurta, 4) + e(-7.3, -73.5, 1.5, 2.2, AJ.skin) + e(7.3, -73.5, 1.5, 2.2, AJ.skin) + e(0, -74, 7.4, 8.4, AJ.skin)
    + d('M-7.6-75Q-8.4-84.6 0-84.8Q8.4-84.6 7.6-75Q6-79.5 1-80Q-5-80-7.6-75Z', AJ.hair) + ln('M1-84.5Q2.5-87.5 4.5-86.5', AJ.hair, 1.4)
    + (pose === 'hold' || pose === 'give' ? '' : hands(k.hands, AJ.skin));
}
const GR = { skin: '#D6A078', top: '#B5433A', arm: '#A33B33', pants: '#8A7456', hair: '#221C1E', shoe: '#EFE6D3' };
/** Grace, the girls' friend from Sabah, who hosts a Christmas open house: long hair, glasses (drawn with her face). */
function graceBody(pose) {
  const k = arms(12.5, -98, pose);
  return shadowE + foot(GR.shoe, -6, 6) + d('M-10.5-64L-10-4H-2L0-50L2-4H10L10.5-64Z', GR.pants) + shade('M3-64H10.5L10-4H6Z')
    + d('M-10-117Q-11-131.5 0-131.5Q11-131.5 10-117L11.5-90Q6-88 4-93H-4Q-6-88-11.5-90Z', GR.hair) + R(-2.6, -110, 5.2, 10, GR.skin)
    + d('M-12-101Q-14-84-13.5-60Q0-57 13.5-60Q14-84 12-101Q0-104.5-12-101Z', GR.top) + shade('M4-103Q9-102 12-101Q14-84 13.5-60Q9-58.5 6-58.5Q8-84 4-103Z') + ln('M-3-101L0-96L3-101', '#EFE6D3', 1.2)
    + ln(k.d, GR.arm, 5.2) + sleeves(k, GR.arm, 7.5, ['', '']) + e(0, -117, 7.2, 9.2, GR.skin) + d('M-8.2-117Q-8.5-130 1-129.8Q9-129.4 8.4-119Q3-126-8.2-117Z', GR.hair)
    + (pose === 'hold' || pose === 'give' ? '' : hands(k.hands, GR.skin));
}
const GLASSES = ln('M-5.2 0a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0M.4 0a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0M-.4-.3Q0-.8.4-.3', INK, 0.6);
const MOUSTACHE = d('M-4.8 5Q-2.4 2.4 0 3.8Q2.4 2.4 4.8 5Q2.4 6.2 0 5.3Q-2.4 6.2-4.8 5Z', '#DAD3C8');
const G = { fur: '#D98A3D', dark: '#B86E2A', cream: '#F1E3C8', collar: '#B5533A' };
const DUIT = {
  arch: e(0, 0, 15, 3, '#120E1E', ' opacity=".35"') + ln('M-12-14Q-20-24-15-37', G.fur, 4.4) + ln('M-17-22l-3-1M-18-28l-3 0M-17-33l-3 1', G.dark, 1) + ln('M-11-12V-.5M-7-12V-.5M7-12V-.5M11-12V-.5', G.dark, 3)
    + ln('M-11-11Q-11-29 0-29Q11-29 11-11', G.fur, 10) + ln('M-12-30l2-3l2 2l2-3l2 2l2-3l2 2l2-3l2 2l2-3l2 2', G.fur, 1.6) + ln('M-6-8Q0-11 6-8', G.dark, 1, ' opacity=".5"')
    + d('M12-23L9-28.5L15-25ZM18-25L20-30L21.5-23Z', G.fur) + e(17, -19, 6.6, 6, G.fur) + e(20.4, -16.4, 2.8, 2, G.cream) + ln('M15-21.4l1.8.5M19-21.2l1.8.5', INK, 1.3) + e(21.6, -15.4, 1.3, 1.1, '#7A3A34') + ln('M12-14.5Q17-12 22-14.5', G.collar, 1.2),
  pounce: e(0, 6, 15, 2.6, '#120E1E', ' opacity=".22"') + ln('M-15-13Q-25-13-31-7', G.fur, 3.2) + ln('M-11-11L-21-3M-8-10L-17 0', G.dark, 3) + e(0, -15, 16, 6.4, G.fur, ' transform="rotate(-12 0 -15)"')
    + ln('M9-20L23-29M11-17L25-24', G.fur, 3) + ln('M23-29l3-2.4M23-29l3.4-.4M25-24l3.2-1.6M25-24l3.4.6', '#F4EEE2', 0.8)
    + d('M10-31L10-37.5L14.5-32.5ZM16-32.5L20.5-37L20-30Z', G.fur) + e(15, -27, 6.2, 5.6, G.fur) + e(18.4, -25, 2.7, 1.9, G.cream) + C(17, -28.4, 1.1, INK) + e(19.6, -23.8, 1, 0.8, '#7A3A34') + ln('M10-22.5Q14-20.5 18-22.5', G.collar, 1.2),
  scratch: e(0, 0, 10, 2.4, '#120E1E', ' opacity=".35"') + ln('M-5-3Q-16-2-14-12', G.fur, 3.2) + e(-2, -4, 6, 3, G.fur) + e(0, -20, 6.6, 15, G.fur, ' transform="rotate(10 0 -20)"') + e(2.6, -18, 3, 9, G.cream, ' transform="rotate(10 2.6 -18)"')
    + ln('M3-28L12-37M2-23L12-30', G.fur, 3) + ln('M12-37l2.6-1.6M12-37l2.8.4M12-30l2.6-1.2M12-30l2.6.8', '#F4EEE2', 0.8)
    + d('M1-41L0-47.5L5-43ZM7-43L11-47L10.6-40Z', G.fur) + e(5.6, -38, 6.2, 5.6, G.fur) + e(9, -36, 2.6, 1.8, G.cream) + C(7.6, -39.4, 1.1, INK) + ln('M.5-33Q5-31 9-33', G.collar, 1.2),

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
const CENDOL = d('M-14-11H14L11 22H-11Z', '#DCE7E3') + d('M-13.6-6H13.6L11 22H-11Z', '#F2EBDD') + d('M-11.3 17H11.3L11 22H-11Z', '#6E3A1E')
  + ln('M-10-2q2-2.5 4 0t4 0t4 0t4 0M-11 4q2 2.5 4 0t4 0t4 0t4 0t4 0M-10 10q2-2.5 4 0t4 0t4 0t4 0M-9 15q2 2.5 4 0t4 0t4 0', '#5E9E4A', 2.2)
  + C(-5, 7, 1.4, '#7E2F3A') + C(5, 1.5, 1.4, '#7E2F3A') + C(1, 13, 1.3, '#7E2F3A') + RR(-12, -6, 3, 24, 1.5, '#FFFFFF', ' opacity=".35"')
  + d('M-15.5-11Q0-31 15.5-11Z', '#F4F1EA') + ln('M-6-21q2 1.5 3 0M4-22q1.5 1.5 3 0', '#5E9E4A', 1.6)
  + d('M-10-19Q0-27 10-19L9.4-15Q8.6-12 7.8-15.6L5.5-16Q4.6-11.5 3.6-16L.4-16.4Q-.6-10-1.6-16.4L-5-16Q-6-12.4-7-16L-9-16.4Z', '#5A2A12') + e(-3, -21.5, 2.5, 0.9, '#8A4A22', ' opacity=".8"');
const cupT = (c, body) => d('M-12-12H12L9 20H-9Z', '#E4E6DC') + body + d('M-13-14H13V-11H-13Z', '#CBD1C6') + ln('M3-13L9-25', c, 3);
const ITEMS = {
  // apam balik: a thin golden crust folded into a half-moon, faint honeycomb on top, and at the straight open edge a
  // thick band of crushed peanut, sugar and creamed corn
  apambalik: `<g transform="rotate(-8)">${e(0, 14, 25, 3.5, SH, ' opacity=".15"') + d('M-24 5A24 14 0 0 1 24 5Z', '#DDA552') + d('M8-8A24 14 0 0 1 24 5L15 5Q16-3 8-8Z', SH, ' opacity=".1"')
    + ln('M-17-1Q-12-7-3-9', '#F0C878', 1.6, ' opacity=".8"')
    + d('M-24 5H24V12Q0 15-24 12Z', '#C9955A') + `<g fill="#8A5A2E">${[-20, -14, -7, -1, 6, 12, 18].map((a, i) => R(a, 6.4 + (i % 2) * 1.6, 2.2, 1.6, '')).join('')}</g>`
    + `<g fill="#F2D04A">${[-17, -4, 9, 20].map((a, i) => C(a, 9 + (i % 2), 1.2, '')).join('')}</g>` + `<g fill="#FFF3DA">${[-11, 3, 15].map(a => C(a, 7.4, 0.6, '')).join('')}</g>`
    + d('M-24 12Q0 15 24 12V13.6Q0 17-24 13.6Z', '#B8783A')}</g>`,
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
  cendol: CENDOL,
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
  // December: year end
  wreath: C(0, 0, 15, 'none', ' stroke="#3F6B4A" stroke-width="8"') + C(0, 0, 15, 'none', ' stroke="#5E8B4A" stroke-width="3" stroke-dasharray="3 4"') + ln('M-10-10h0M12-6h0M-13 6h0M6 13h0M14 6h0', '#C44A36', 3.6)
    + d('M0 14L-7 20L-6 12ZM0 14L7 20L6 12Z', '#C44A36') + C(0, 14, 2.6, '#9E3A2A'),
  giftexchange: RR(-16, -6, 28, 24, 2, '#2F6B66') + RR(-18, -12, 32, 7, 2, '#3E8A83') + R(-4.5, -12, 5, 30, '#D9A441') + d('M-2-12C-11-23-16-14-2-12C12-14 8-23-2-12Z', '#D9A441')
    + ln('M12-2L17 2', '#8A8378', 0.8) + `<g transform="translate(17 8) rotate(20)">${RR(-7, -5, 14, 10, 2, '#E3B54A')}${txt(0, 2.6, 'RM30', 5.5, '#5A2E12')}</g>`,
  salesign: ln('M-12-22L0-14L12-22', '#8A8378', 1) + RR(-20, -14, 40, 26, 3, '#C44A36') + txt(0, 4, 'SALE', 12, '#F4EEE2') + R(-20, 8, 40, 4, SH, ' opacity=".15"'),
  hourglass: R(-13, -21, 26, 4, '#8A5A3C') + R(-13, 17, 26, 4, '#8A5A3C') + d('M-10-17H10Q10-6 2 0Q10 6 10 17H-10Q-10 6-2 0Q-10-6-10-17Z', '#DCE7E4') + d('M-6-9H6Q4-4 0-1Q-4-4-6-9Z', '#E3B54A') + d('M-8 16Q0 6 8 16Z', '#E3B54A') + ln('M0 0V14', '#E3B54A', 0.8),
  kite: d('M0-22L14-4L0 14L-14-4Z', '#C4607A') + d('M0-22L14-4H0Z', '#E3B54A') + d('M0 14L-14-4H0Z', '#4F7A9A') + ln('M0-22V14M-14-4H14', '#6E4533', 0.8) + ln('M0 14Q-6 18 0 22Q6 26 2 30', '#8A8378', 0.8) + d('M-3 19L0 17L3 19L0 21Z', '#C44A36'),
  picnic: d('M-18-4H18L15 18H-15Z', '#B99A68') + ln('M-17 3H17M-16 10H16M-8-4L-7 18M0-4V18M8-4L7 18', '#9C7A48', 1) + ln('M-12-4Q0-22 12-4', '#8A6A3A', 2.4) + d('M-16-6H16L12 0H-12Z', '#C44A36') + ln('M-10-3h0M-2-3h0M6-3h0', '#EFE6D3', 2.4),
  books: RR(-18, 8, 36, 9, 1.5, '#2F6B66') + RR(-15, -1, 32, 9, 1.5, '#C44A36') + RR(-17, -10, 30, 9, 1.5, '#D9A441') + ln('M-14 12.5H14M-11 3.5H13M-13-5.5H9', '#EFE6D3', 1.4, ' opacity=".6"') + shade('M8 8H18V17H8Z', 0.12),
  umbrella: d('M-20 0Q-20-20 0-20Q20-20 20 0Q15-4 10 0Q5-4 0 0Q-5-4-10 0Q-15-4-20 0Z', '#2F6B66') + d('M0-20Q-6-10-10 0Q-5-4 0 0Q5-4 10 0Q6-10 0-20Z', '#3E8A83') + ln('M0-20V14Q0 19 5 19', '#6E4533', 2) + ln('M-16 8l-2 5M-6 12l-2 5M14 6l-2 5', '#8FB9C9', 1.6),
  friedrice: e(0, 8, 21, 9, '#EDE3D2') + e(0, 5, 15, 7, '#D9A860') + ln('M-8 4h0M-3 8h0M4 3h0M9 7h0M-6 9h0M2 10h0', '#B8763A', 1.6) + ln('M-5 2h0M6 6h0M0 7h0', '#7FA35A', 2) + e(6, 0, 7, 4, '#F4EEE2') + C(7, 0, 2.6, '#E3B54A'),
  bonus: RR(-15, -20, 30, 40, 2, '#F4EEE2') + R(-15, -20, 30, 8, '#2F6B66') + ln('M-9-6H9M-9 0H5M-9 6H7', '#B6AFA2', 2) + C(6, 13, 6, '#5E8B4A') + ln('M6 10V16M3 13H9', '#F4EEE2', 1.8),
  split: C(0, 0, 18, '#5E8B4A') + d('M0 0V-18A18 18 0 0 1 17.1 5.6Z', '#D9A441') + d('M0 0L17.1 5.6A18 18 0 0 1 5.6 17.1Z', '#C4607A') + C(0, 0, 18, 'none', ' stroke="#F4EEE2" stroke-width="1"') + ln('M0 0V-18M0 0L17.1 5.6M0 0L5.6 17.1', '#F4EEE2', 1),
  mug: RR(-13, -10, 22, 26, 4, '#C44A36') + ln('M9-4Q18-2 16 6Q14 12 9 11', '#C44A36', 3) + e(-2, -10, 11, 2.6, '#7A4424') + ln('M-6-14q-2-3 0-5t0-5M1-14q-2-3 0-5t0-5', '#D9D0C0', 1.6) + shade('M2-10H9V16H2Z', 0.15),
  ricecooker: RR(-16, -8, 32, 24, 7, '#EFE6D3') + d('M-15-6Q-15-16 0-16Q15-16 15-6Z', '#D9D0C0') + R(-4, -19, 8, 3, '#8A8378') + R(-10, 4, 20, 6, '#2F6B66') + C(7, 7, 1.4, '#E3B54A') + ln('M-3-21q-2-3 0-5t0-5M4-21q-2-3 0-5t0-5', '#D9D0C0', 1.4) + shade('M6-14Q15-14 15-6V14Q13 16 8 16Z', 0.1),
  bicycle: C(-12, 8, 10, 'none', ' stroke="#8A8378" stroke-width="2.6"') + C(12, 8, 10, 'none', ' stroke="#8A8378" stroke-width="2.6"') + ln('M-12 8L-4-6H8L12 8M-4-6L2 8L8-6M2 8H-12M8-6L6-12H10M-4-6L-6-11H-1', '#C44A36', 2) + C(2, 8, 2, '#8A8378'),
  giftwrap: `<g transform="rotate(-20)">${RR(-20, -6, 36, 12, 3, '#C4607A')}${ln('M-16-6V6M-8-6V6M0-6V6M8-6V6', '#E3B54A', 1.4)}${e(16, 0, 3, 6, '#9E4A5E')}</g>` + C(8, 14, 6, '#D9A441') + C(8, 14, 2, '#8A6A2A'),
  xmaslights: ln('M-22-8Q-10 8 0-2Q10-12 22 4', '#3F6B4A', 1.2) + [[-18, -2, '#C44A36'], [-10, 3, '#E3B54A'], [-2, 1, '#2F6B66'], [6, -4, '#C4607A'], [14, -2, '#E3B54A'], [21, 5, '#4F7A9A']].map(([x, y, c]) => e(x, y + 5, 3, 4.4, c) + R(x - 1.8, y, 3.6, 2.4, '#6B6A78')).join(''),
  librarycard: RR(-20, -13, 40, 26, 3, '#F4EEE2') + R(-20, -13, 40, 7, '#4F6D8F') + R(-15, -2, 11, 11, '#D9C4A0') + C(-9.5, 1, 2.6, '#A87050') + d('M-14 9Q-9.5 3-5 9Z', '#A87050') + ln('M0 0H14M0 5H10', '#B6AFA2', 1.8),
  boardgame: `<g transform="rotate(-12 -8 2)">${RR(-18, -8, 18, 18, 3, '#F4EEE2')}${ln('M-13-3h0M-9 1h0M-5 5h0', '#3B2723', 2.6)}</g><g transform="rotate(14 10 -2)">${RR(2, -12, 18, 18, 3, '#C44A36')}${ln('M6-8h0M16-8h0M6 2h0M16 2h0', '#F4EEE2', 2.6)}</g>` + shade('M-2 10H20V14H-2Z', 0.1),
  cookies: e(0, 10, 21, 6, '#EDE3D2') + [[-9, 2, -8], [8, 0, 12], [0, -9, 0]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">${d('M0-9L2.6-3.4L8.8-2.8L4.2 1.4L5.4 7.6L0 4.4L-5.4 7.6L-4.2 1.4L-8.8-2.8L-2.6-3.4Z', '#D69A45')}${ln('M0-5V2M-3-1H3', '#F4EEE2', 1)}</g>`).join(''),
  xmastree: d('M0-22L10-8H-10Z', '#3F6B4A') + d('M0-14L13 2H-13Z', '#3F6B4A') + d('M0-5L16 14H-16Z', '#37603F') + shade('M0-22L10-8H0ZM0-14L13 2H0ZM0-5L16 14H0Z', 0.1) + R(-3, 14, 6, 6, '#6E4533')
    + ln('M-5-6h0M5-1h0M-7 8h0M8 10h0M0 4h0', '#C44A36', 3.2) + d('M0-27L1.6-23H5.6L2.4-20.6L3.6-16.6L0-19L-3.6-16.6L-2.4-20.6L-5.6-23H-1.6Z', '#E3B54A'),
  card: d('M-18-14L0-18V18L-18 14Z', '#E3CBA6') + d('M0-18L18-14V14L0 18Z', '#F4EEE2') + d('M9 0C9-5 3-5 3-1C3-5-3-5-3 0C-3 4 3 7 3 9C3 7 9 4 9 0Z', '#C44A36', ' transform="translate(3 -1) scale(.9)"') + ln('M-14-6L-4-8M-14 0L-4-2M-14 6L-6 4', '#B6AFA2', 1.4),
  bauble: ln('M0-24Q4-28 6-24', '#8A8378', 1) + R(-4, -22, 8, 5, '#D9A441') + C(0, 0, 17, '#C44A36') + ln('M-16-3Q0 6 16-3', '#D9A441', 2.4) + ln('M-12-8h0M-4-5h0M4-5h0M12-8h0', '#F4EEE2', 1.6) + e(-6, -8, 4, 2.6, '#FFFFFF', ' opacity=".45"') + shade('M6-15A17 17 0 0 1 6 15Q14 0 6-15Z', 0.12),
  raincloud: C(-8, -6, 9, '#9AABB4') + C(4, -10, 11, '#AEBDC4') + C(14, -3, 7, '#9AABB4') + R(-17, -4, 38, 9, '#9AABB4') + ln('M-10 10l-2 6M-2 12l-2 6M6 10l-2 6M14 12l-2 6', '#4F7A9A', 2),
  xmasstar: C(0, 0, 20, '#E3A24A', ' opacity=".2"') + d('M0-19L4.5-6.2H18L7.2 1.8L11.2 15.4L0 7.4L-11.2 15.4L-7.2 1.8L-18-6.2H-4.5Z', '#E3B54A') + d('M0-19L4.5-6.2H18L7.2 1.8L0 0Z', '#F0CB6A'),
  roastchicken: e(0, 9, 22, 8, '#EDE3D2') + e(0, 3, 15, 10, '#C98A45') + e(-4, 0, 8, 5, '#DDA35C') + ln('M12 4L20-4', '#EFE6D3', 3.4) + ln('M-12 4L-20-4', '#EFE6D3', 3.4) + ln('M-8 13h0M8 13h0M0 15h0', '#7FA35A', 3),
  yearchart: R(-20, 16, 40, 2, '#6B6570') + RR(-17, 4, 7, 12, 1, '#9AABB4') + RR(-7, -3, 7, 19, 1, '#4F7A9A') + RR(3, -8, 7, 24, 1, '#2F6B66') + RR(13, -16, 7, 32, 1, '#5E8B4A') + ln('M-14-4L-4-10L6-14L17-22', '#C44A36', 1.6) + d('M17-22L11-21L15-17Z', '#C44A36'),
  goal: C(0, 0, 19, '#C44A36') + C(0, 0, 14, '#F4EEE2') + C(0, 0, 9, '#C44A36') + C(0, 0, 4, '#F4EEE2') + ln('M0 0L16-16', '#6E4533', 2) + d('M16-16L14-22L18-20L22-18L20-14Z', '#2F6B66'),
  // a cushion with a sleeping moon stitched on it: one clean outline (no separate dots or floating letters), so a
  // die-cut sticker keeps a single rim
  pillow: d('M-21-13Q-23-19-17-19Q0-16 17-19Q23-19 21-13Q19 0 21 13Q23 19 17 19Q0 16-17 19Q-23 19-21 13Q-19 0-21-13Z', '#4F6D8F') + shade('M8-17Q17-19 21-13Q19 0 21 13Q23 19 17 19Q12 18 8 17Z', 0.16)
    + d('M-4-10A11 11 0 1 0 9 6A8.5 8.5 0 1 1-4-10Z', '#E3B54A') + ln('M8-11h5l-5 6h5M13-4h3.4l-3.4 4h3.4', '#C9D3DC', 1.3) + ln('M-21-13Q-23-19-17-19M17-19Q23-19 21-13M21 13Q23 19 17 19M-17 19Q-23 19-21 13', '#3B5577', 1.4),
  planner: RR(-16, -20, 32, 40, 3, '#2F6B66') + RR(-12, -16, 26, 32, 2, '#F4EEE2') + ln('M-16-12h4M-16-4h4M-16 4h4M-16 12h4', '#D9A441', 2) + ln('M-6-8H10M-6 0H10M-6 8H6', '#B6AFA2', 1.8) + R(-9, -10, 3, 3, 'none', ' stroke="#2F6B66" stroke-width="1"') + ln('M-8.6-7.5L-7.8-6.4L-6-9', '#C44A36', 1),
  clock: C(0, 0, 19, '#8A5A3C') + C(0, 0, 16, '#F4EEE2') + ln('M0-13V-10M13 0H10M0 13V10M-13 0H-10', '#8A8378', 1.6) + ln('M0 0V-11M0 0L-1.8-8', '#3B2723', 1.8) + C(0, 0, 1.6, '#C44A36'),
  fireworks: [[-8, -6, 12, '#E3B54A'], [10, -10, 9, '#C4607A'], [6, 10, 8, '#6FA3B8']].map(([x, y, r, c]) => C(x, y, r * 1.1, c, ' opacity=".15"') + ln(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `M${f1(x + Math.cos(a) * r * 0.3)} ${f1(y + Math.sin(a) * r * 0.3)}L${f1(x + Math.cos(a) * r)} ${f1(y + Math.sin(a) * r)}`; }).join(''), c, 1.5)).join(''),
  // props only (not stickers)
  phone: RR(-9, -16, 18, 32, 3, '#2E2A36') + RR(-7, -12, 14, 22, 1, '#9EC3CF') + R(-5, -9, 10, 3, '#F4EEE2') + R(-5, -3, 7, 3, '#F4EEE2') + C(0, 13, 1.4, '#6B6570'),
  teh: d('M-9-12H9L7 14H-7Z', '#EDE6DA') + d('M-8.5-7H8.5L7 14H-7Z', '#B8723A') + R(-9, -7, 18, 4, '#EEDDC2') + ln('M9-4Q16-2 9 6', '#EDE6DA', 3),
  note: RR(-18, -9, 36, 18, 2, '#D98A4B') + C(-9, 0, 5, '#B8703A') + R(2, -3, 12, 2.5, '#F4DCC0') + R(2, 2, 8, 2.5, '#F4DCC0'),
  toy: ln('M0 22V-4', '#8A8378', 2.5) + C(0, -12, 17, '#E3A24A', ' opacity=".2"') + ring(4, a => d('M0-12L-4-24Q0-28 4-24Z', ['#C45A6A', '#D9B04A', '#5FA38A', '#6FA3B8'][a / 90], ` transform="rotate(${a} 0 -12)"`)) + C(0, -12, 3, '#F4EEE2'),
  apron: ln('M-8-18Q-8-30 0-30Q8-30 8-18', '#7E3A24', 2.5) + d('M-9-18H9L10-6Q14-4 16-2L18 20H-18L-16-2Q-14-4-10-6Z', '#B5533A') + shade('M4-18H9L10-6Q14-4 16-2L18 20H8Z', 0.15) + RR(-8, 2, 16, 9, 2, '#C9683F') + ln('M-16-6H-24M16-6H24', '#7E3A24', 2),
  gift: RR(-16, -8, 32, 26, 2, '#B5433A') + RR(-18, -14, 36, 8, 2, '#C45A4A') + R(-3, -14, 6, 32, '#D9A441') + d('M0-14C-10-26-16-16 0-14C16-16 10-26 0-14Z', '#D9A441') + shade('M6-8H16V18H6Z', 0.12),
  // October inserts: the gift wrapped by hand (a crumpled corner, too much tape) and a cendol to share
  gifttaped: d('M-16-8H14L17-4V18H-16Z', '#B5433A') + d('M14-8L17-4L13-3Z', '#8E2F3A') + RR(-18, -14, 36, 8, 2, '#C45A4A') + R(-3, -14, 6, 32, '#D9A441') + d('M0-14C-10-26-16-16 0-14C16-16 10-26 0-14Z', '#D9A441')
    + ln('M-10-4L-4 4M8 2L14 10M-14 10L-6 16M4-12L12-6M-16-2L-9-9M6 12L15 16', '#E9EEF0', 3.4, ' opacity=".75"') + shade('M6-8H16V18H6Z', 0.12),
  cendol2: CENDOL + ln('M-4-17L-12-34', '#C44A36', 2.4) + ln('M4-17L13-33', '#4F7A9A', 2.4),
};
// Ringgit notes in their real colours with the value big enough to read in an insert (36x18, like `note`).
const NOTE = { 1: ['#4F6D8F', '#F4EEE2'], 5: ['#5E8B4A', '#F4EEE2'], 10: ['#C44A36', '#F4EEE2'], 20: ['#D98A4B', '#4A2412'], 50: ['#2F7F86', '#F4EEE2'], 100: ['#6E4A7E', '#F4EEE2'] };
const cashArt = v => { const [c, t] = NOTE[v] || NOTE[1];
  return RR(-18, -9, 36, 18, 2, c) + RR(-16, -7, 32, 14, 1.5, 'none', ` stroke="${t}" stroke-width=".6" opacity=".45"`) + C(-9, 0, 5, t, ' opacity=".25"') + C(-9, -1, 2.2, t, ' opacity=".35"')
    + txt(-9, 6.4, 'RM', 4.2, t) + txt(6, 5, v, String(v).length > 2 ? 11 : 13, t) + shade('M8-9H16Q18-9 18-7V7Q18 9 16 9H8Z', 0.1); };
// The night's cash envelope with its amount written on the front.
const envFront = RR(-20, -12, 40, 28, 2, '#E8DCC0') + d('M-20-12L0 1L20-12', '#D9C9A4');
// Handwriting as strokes (no handwriting font on Android): R, M and a few digits in a 6x10 box, slanted, centred on x 0.
const GLYPH = { R: 'M0 10V0h3.4a2.6 2.6 0 0 1 0 5.2H0M2.8 5.2L6 10', M: 'M0 10L.4 0L3 6.4L5.6 0L6 10', 0: 'M3 0C-.8 0-.8 10 3 10C6.8 10 6.8 0 3 0Z', 1: 'M1 2.2L3.6 0V10',
  2: 'M.4 2Q2.6-1 5 1.4Q6 4 .2 10H6', 3: 'M.4 1.2Q3-1 5 1.4Q5.8 4 2.4 4.8Q6.2 5.2 5.6 8.2Q4 11 .2 9.2', 4: 'M4.4 10V0L0 6.8H6', 5: 'M5.6 0H1L.6 4.4Q4.6 3 5.6 6.4Q5.6 10 .4 9.4' };
const scrawl = (t, c = '#2E3F6E', w = 1.5) => { const cs = [...String(t)], x0 = -(cs.length * 7.4 - 1.4) / 2;
  return `<g transform="skewX(-10)">${cs.map((ch, i) => GLYPH[ch] ? ln(GLYPH[ch], c, w, ` transform="translate(${f1(x0 + i * 7.4)} -5)"`) : '').join('')}</g>`; };
const envArt = t => R(-14, -20, 28, 14, '#7FA37A', ' transform="rotate(-6)"') + envFront + `<g transform="translate(0 6) rotate(-4) scale(.92)">${scrawl(t)}</g>` + shade('M-20 13H20V16H-20Z', 0.08);
// The Deepavali jar: the savings jar with a big front label, so its name reads in a close-up.
const jarD = lv => jar(lv).replace(lv < 0.2 ? /<path[^>]*stroke="#B8862E"[^>]*\/>/ : /^$/, '').replace(/<rect x="-3"[^>]*\/><circle[^>]*\/>$/, '') + RR(-14, -13, 28, 11, 1.5, '#F1E3C8') + txt(0, -5.3, 'DEEPAVALI', 6.5, '#8E2F4F', ' textLength="25" lengthAdjust="spacingAndGlyphs"');
Object.assign(ITEMS, Object.fromEntries(Object.keys(NOTE).map(v => [`rm${v}`, cashArt(v)])), { envfront: envFront, envopen: RR(-20, -12, 40, 28, 2, '#E8DCC0') + d('M-20-12L0-27L20-12Z', '#D9C9A4') + shade('M-20-12L0-27L0-12Z', 0.08) + d('M-20-12L0 1L20-12', '#DED0AE'), envRM30: envArt('RM30'), envRM10: envArt('RM10'), jarD: jarD(0.5), jarDempty: jarD(0.12), jarDfull: jarD(0.85) });
// A QR code: 13x13 modules (17 units across) centred on 0,0, three finder squares and the rest from a seed, so the
// real code and the scammer's sticker are visibly different patterns.
const qrCode = seed => { let r = seed, p = '';
  const rnd = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648, fz = (x, y) => (x < 6 && y < 6) || (x > 6 && y < 6) || (x < 6 && y > 6);
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
    const fx = x > 7 ? x - 8 : x, fy = y > 7 ? y - 8 : y, on = fz(x, y) ? fx < 5 && fy < 5 && (fx === 0 || fx === 4 || fy === 0 || fy === 4 || (fx === 2 && fy === 2)) : rnd() < 0.5;
    if (on) p += `M${f1(-8.45 + x * 1.3)} ${f1(-8.45 + y * 1.3)}h1.3v1.3h-1.3z`; }
  return p; };
const QR_REAL = qrCode(7), QR_FAKE = qrCode(91);
const ZZ = '#7A3E96';
const qrSticker = RR(-11, -11, 22, 26, 1.2, ZZ) + RR(-9.4, -9.4, 18.8, 18.8, 0.6, '#FFFFFF') + `<g transform="scale(.94)">${d(QR_FAKE, '#2A1838')}</g>` + txt(0, 13.6, 'ZZ', 4.6, '#FFFFFF') + ln('M-8-8h5', '#FFFFFF', 0.8, ' opacity=".7"');
const qrStand = (top = '', over = '') => d('M-10 15H10L12.5 18H-12.5Z', '#AEB7BB') + RR(-12, -22, 24, 38, 2, '#DDE6E9', ' opacity=".92"') + RR(-10.5, -20.5, 21, 31, 1, '#FFFFFF')
  + `<g transform="translate(0 -10)">${d(QR_REAL, '#1E1B26')}${top}</g>` + R(-10.5, 4, 21, 6, '#C44A36') + txt(0, 8.4, 'RAJU APAM BALIK', 3, '#F4EEE2', ' textLength="19" lengthAdjust="spacingAndGlyphs"')
  + shade('M6-22H10Q12-22 12-20V14Q12 16 10 16H6Z', 0.1) + (over ? `<g transform="translate(0 -10)">${over}</g>` : '');
// the takings notebook, open, with an amount handwritten on the right page
const nbArt = t => e(0, 15, 22, 2.6, SH, ' opacity=".15"') + RR(-21, -13, 21, 27, 1, '#F4EEE2') + RR(0, -13, 21, 27, 1, '#FBF7EE') + ln('M-17-7H-4M-17-2H-4M-17 3H-6M-17 8H-8', '#B6AFA2', 1)
  + ln('M0-11v1.6M0-6v1.6M0-1v1.6M0 4v1.6M0 9v1.6', '#8A8378', 2) + (t ? `<g transform="translate(10.5 -1) scale(.6)">${scrawl(t)}</g>` + ln('M4 7H17', '#2E3F6E', 0.9) : ln('M4-7H17M4-2H15', '#B6AFA2', 1));
Object.assign(ITEMS, {
  qrreal: qrStand(), qr: qrStand(`<g transform="translate(.5 -.4) rotate(2.5)">${qrSticker}</g>`), qrfake: `<g transform="rotate(-8)">${qrSticker}${shade('M5-11H11V15H5Z', 0.12)}</g>`,
  // the sticker caught by a claw at its top-left corner and peeling off the real code
  qrpeel: qrStand('', `<g transform="translate(-11 15) rotate(38) translate(11 -15) translate(-2 -3)">${qrSticker}</g>`),
  qrnew: d('M-12 21H12L15 25H-15Z', '#AEB7BB') + RR(-15, -27, 30, 49, 3, '#E8F0F2') + RR(-13, -25, 26, 45, 1.5, '#FFFFFF') + txt(0, -15.5, 'RAJU', 10, '#C44A36', ' letter-spacing=".5"')
    + `<g transform="translate(0 2) scale(.9)">${d(QR_REAL, '#1E1B26')}</g>` + txt(0, 17, 'APAM BALIK', 4, '#3B2723', ' textLength="20" lengthAdjust="spacingAndGlyphs"')
    + d('M-13-25H-2L-13-6Z', '#FFFFFF', ' opacity=".55"') + RR(-15, -27, 30, 49, 3, 'none', ' stroke="#B9C8CE" stroke-width="1"'),
  notebook: nbArt(''),
  // the rainy-day tin: an old navy biscuit tin with a gold lid, a coin slot and a raincloud drawn on a round label
  raintin: e(0, 19, 17, 3, SH, ' opacity=".15"') + RR(-16, -10, 32, 29, 4, '#2E4A7A') + R(-16, 8, 32, 3, '#C9A040') + RR(-17.5, -16, 35, 8, 3, '#C9A040') + e(0, -16, 17.5, 3, '#E0BC5A')
    + R(-5, -17, 10, 1.6, '#3B2723') + C(0, 1, 8.5, '#F4EEE2') + `<g transform="translate(0 1) scale(.34)">${C(-8, -6, 9, '#7E95A5') + C(4, -10, 11, '#8FA4B2') + C(14, -3, 7, '#7E95A5') + R(-17, -4, 38, 9, '#7E95A5') + ln('M-10 10l-2 6M-2 12l-2 6M6 10l-2 6M14 12l-2 6', '#4F7A9A', 2.4)}</g>`
    + ln('M-12-4l3 1M10 14l3-1', '#5E7AA6', 0.8) + shade('M7-10H12Q16-10 16-6V15Q16 19 12 19H7Z', 0.18),
  // an umbrella big enough for two, centred on its canopy; the shaft runs down to y 64
  umbrellabig: ln('M0 2V62Q0 68 5 68', '#3A2F35', 1.6) + d('M-44 6Q-44-30 0-30Q44-30 44 6Q38 1 29 6Q22 1 15 6Q7 1 0 6Q-7 1-15 6Q-22 1-29 6Q-38 1-44 6Z', '#4F6D8F')
    + d('M-15 6Q-14-20 0-30Q-6-10-7 4Q-11 1-15 6ZM15 6Q14-20 0-30Q6-10 7 4Q11 1 15 6Z', '#6F8FAF') + d('M29 6Q30-14 0-30Q40-26 44 6Q38 1 29 6Z', SH, ' opacity=".18"') + ln('M0-30V-35', '#3A2F35', 1.6),
  // crumpled red wrapping paper with tape, drawn over the bottom of whatever sits in it
  wrapheap: e(0, 4, 24, 3, SH, ' opacity=".2"') + d('M-23 4L-21-7L-15-3L-11-11L-5-5L1-12L6-5L12-10L16-3L22-8L24 4Z', '#B5433A') + d('M-11-11L-5-5L1-12L1 4H-13ZM12-10L16-3L22-8L24 4H14Z', '#8E2F3A', ' opacity=".6"')
    + ln('M-17-3L-10 2M4-9L9-2M15-6L19 1', '#E9EEF0', 2.4, ' opacity=".75"') + ln('M-21-7L-15-3M6-5L12-10', '#D9A441', 1.2),
  bell: RR(-14, 6, 28, 7, 3.5, '#5A5560') + RR(-5, 4, 10, 11, 2, '#9AA0A6') + R(-5, 8, 10, 2, '#6E6A72') + d('M-10 4Q-10-9 0-9Q10-9 10 4Z', '#D3D7DA')
    + d('M4-8Q10-5 10 4H5Q6-3 4-8Z', SH, ' opacity=".18"') + e(-4, -3, 2, 3.4, '#FFFFFF', ' opacity=".75"') + R(-11, 3, 22, 2.6, '#9AA0A6') + C(0, -10, 1.6, '#9AA0A6')
    + d('M8 8L22 0Q26-2 26 2L25 5Q24 7 21 7L10 12Z', '#C44A36') + d('M21 1Q24 0 25 2L24 5Q22 6 20 5Z', '#E06A55'),
  ding: ln('M0-6l-4-6M8-8l2-7M15-4l6-4', '#E3A24A', 2.2) + ln('M-6 4h-6M24 2h6', '#E3A24A', 1.6, ' opacity=".7"'),
  phonefall: ln('M-16-16l-6-4M-18-8h-7M-14-22l-4-6', '#8A8378', 1.4) + `<g transform="rotate(-24)">${RR(-9, -16, 18, 32, 3, '#2E2A36') + RR(-7, -12, 14, 22, 1, '#BFE3F0') + R(-5, -9, 10, 3, '#F2C9C0') + R(-5, -4, 10, 3, '#F2C9C0') + ln('M-4 2l6 4-3 3', '#FFFFFF', 0.8)}</g>`
    + e(0, 22, 14, 2.4, SH, ' opacity=".15"'),
  crayonchart: RR(-20, -26, 40, 52, 1, '#FBF7EE') + `<g transform="translate(0 -14) scale(.62)">${C(-12, 8, 10, 'none', ' stroke="#3B2723" stroke-width="2"') + C(12, 8, 10, 'none', ' stroke="#3B2723" stroke-width="2"') + ln('M-12 8L-4-6H8L12 8M-4-6L2 8L8-6M2 8H-12', '#C44A36', 2.4)}</g>`
    + Array.from({ length: 12 }, (_, i) => RR(-16 + (i % 4) * 8.4, 2 + Math.floor(i / 4) * 7.6, 7, 6.4, 0.6, i < 9 ? ['#C44A36', '#D9A441', '#2F6B66', '#5E8B4A'][i % 4] : 'none', ` stroke="#8A8378" stroke-width=".5"${i < 9 ? ' opacity=".85"' : ''}`)).join('')
    + ln('M-17-24l3 2M15-24l2 3', '#C44A36', 1, ' opacity=".6"') + C(0, -27, 1.6, '#B5533A'),
  newbike: C(0, 0, 21, '#FFF1D0', ' opacity=".6"') + `<g transform="scale(1.15)">${ITEMS.bicycle}</g>` + ln('M-16-14l-4-4M16-16l4-4M20 2h5M-22 0h-5', '#E3A24A', 1.6),
  phonebuzz: RR(-9, -16, 18, 32, 3, '#2E2A36') + RR(-7, -12, 14, 22, 1, '#F4EEE2') + R(-5, -9, 10, 3, '#F2C9C0') + R(-5, -4, 10, 3, '#F2C9C0') + R(-5, 1, 10, 3, '#F2C9C0') + R(-5, 6, 10, 3, '#F2C9C0') + C(8, -15, 4, '#C44A36')
    + ln('M-13-8q-3 8 0 16M-17-11q-5 11 0 22M13-8q3 8 0 16M17-11q5 11 0 22', '#E3A24A', 1.4),
  phonesorry: RR(-9, -16, 18, 32, 3, '#2E2A36') + RR(-7, -12, 14, 22, 1, '#F4EEE2') + [-8, -3, 2, 7].map(y => RR(-5, y, 9, 3.4, 1.7, '#BFD8E8')).join('') + ln('M-17-18l4 4M-15 14l3-3', '#8A8378', 1.2) + d('M10-22h12v9H15l-3 3v-3h-2Z', '#F4EEE2', ' stroke="#8A8378" stroke-width=".6"') + txt(16, -15.4, '…', 6, '#8A8378'),
  // November's story stickers (no amounts, no bank or e-wallet look): notification bubbles, an hourglass, an overdue bill
  reminders: RR(-12, -20, 24, 40, 4, '#2E2A36') + RR(-10, -16, 20, 30, 1.5, '#DCE4EA') + [[-22, -16], [-18, -4], [-24, 8], [-20, 20]].map(([x, y], i) => `<g transform="translate(${x + 2 * i} ${y}) rotate(${i % 2 ? 3 : -3})">`
      + RR(0, -5, 32, 10, 5, '#F4EEE2', ' stroke="#B6AFA2" stroke-width=".8"') + C(5, 0, 3, '#E3A24A') + d('M3.6 1.4Q3.6-2 5-2Q6.4-2 6.4 1.4Z', '#FFFFFF') + R(10, -1.6, 15, 1.6, '#B6AFA2') + R(10, 1.2, 10, 1.4, '#D3CCC2') + '</g>').join('')
    + C(10, -19, 4.4, '#C44A36') + ln('M9 -21v3M9-16.4v.2', '#FFFFFF', 1.4),
  latefee: `<g transform="rotate(-6)">${d('M-14-20H14V20H-14Z', '#F4EEE2') + shade('M6-20H14V20H6Z', 0.08) + R(-14, -20, 28, 6, '#8A8378') + ln('M-9-8H9M-9-3H6M-9 2H8M-9 7H4', '#B6AFA2', 1.6)}</g>`
    + `<g transform="translate(10 10) rotate(-14)">${C(0, 0, 9.5, 'none', ' stroke="#C44A36" stroke-width="2.4"') + ln('M0-5V1.5M0 4.6v.2', '#C44A36', 2.6)}</g>`
    + `<g transform="translate(-12 14)">${C(0, 0, 8, '#F1E8D8') + C(0, 0, 8, 'none', ' stroke="#6E4533" stroke-width="1.6"') + ln('M0 0V-5M0 0L3.6 2', INK, 1.2)}</g>`,
  // December's story stickers
  fundmeter: RR(-15, -22, 30, 44, 2, '#F4EEE2') + RR(-4, -16, 8, 30, 4, '#FFFFFF', ' stroke="#B6AFA2" stroke-width="1"') + C(0, 15, 6.4, '#C44A36') + RR(-2, -8, 4, 22, 2, '#C44A36')
    + ln('M5-14h4M5-8h3M5-2h4M5 4h3M5 10h4', '#8A8378', 0.9) + d('M-9-10L-5-8L-9-6Z', '#2F6B66') + shade('M7-22H15V22H7Z', 0.07),
  roof: d('M-22 2L0-18L22 2Z', '#B5533A') + ln('M-14-5h28M-8-11h16', '#8E3A26', 1.2) + R(-16, 2, 32, 18, '#E9D8B8') + R(-5, 8, 10, 12, '#6E4533') + R(8, 6, 6, 6, '#A9C8CF')
    + shade('M0-18L22 2H0Z', 0.1) + ln('M-20 1L0-17L20 1', '#E3B54A', 1.4, ' opacity=".8"'),
  scamtext: RR(-12, -20, 24, 40, 4, '#2E2A36') + RR(-10, -16, 20, 30, 1.5, '#F4EEE2') + RR(-8, -12, 16, 9, 3, '#DCE4EA') + R(-6, -9, 10, 1.4, '#8A8378') + R(-6, -6.4, 7, 1.4, '#8A8378')
    + ln('M-6 2h12', '#4F6D8F', 1.6, ' stroke-dasharray="2 1.4"') + `<g transform="translate(10 8)">${C(0, 0, 9, '#C44A36') + ln('M-5-5L5 5M5-5L-5 5', '#FFFFFF', 2.4)}</g>`,
  slips: d('M-11-6H11L9 20H-9Z', '#4F7A9A') + d('M-9-2H9L8 18H-8Z', '#6F95B2') + [[-6, -10, -14], [1, -13, 8], [6, -8, 20], [-2, -6, -4]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">${R(-4, -6, 8, 12, '#FFFFFF') + R(-4, -6, 8, 2.6, '#C44A36') + ln('M-2-1h4M-2 2h3', '#8A8378', 0.8)}</g>`).join('')
    + R(-12, -7, 24, 2.4, '#2E4A6A') + shade('M4-6H11L9 20H4Z', 0.18) + RR(-8, 4, 3, 12, 1.5, '#FFFFFF', ' opacity=".35"'),
  invitecrumple: d('M-17-11L-6-19L7-15L18-6L15 9L4 17L-11 15L-19 4Z', '#FBF7EE') + d('M-6-19L-2-4L7-15ZM18-6L-2-4L15 9ZM-11 15L-2-4L-19 4Z', SH, ' opacity=".07"')
    + ln('M-6-19L-2-4L7-15M-2-4L18-6M-2-4L15 9M-2-4L4 17M-2-4L-11 15M-2-4L-19 4', '#C9C1B6', 1) + d('M3-17L13-9L6-5Z', '#3F6B4A') + d('M-14 6l6-2 1 5Z', '#C44A36'),
  patch: d('M-11-8a13 13 0 1 0 26 0a13 13 0 1 0-26 0ZM-7-8a9 9 0 1 1 18 0a9 9 0 1 1-18 0Z', '#3E3A40', ' fill-rule="evenodd"') + C(2, -8, 3.2, '#8A8378') + ln('M2-8L2-18M2-8L11-3M2-8L-7-3', '#8A8378', 0.8)
    + RR(-18, 0, 30, 20, 3, '#C44A36') + R(-18, 0, 30, 5, '#A33B30') + RR(-13, 8, 9, 9, 2, '#2E2A36') + RR(-1, 9, 9, 7, 3.5, '#E3B54A') + C(3.5, 12.5, 1.4, '#B8862E'),
  rainyjar: jar(0.25).replace(/<rect x="-3"[^>]*\/><circle[^>]*\/>$/, '') + RR(-14, -13, 28, 11, 1.5, '#F1E3C8') + txt(0, -5.3, 'RAINY DAY', 6.5, '#2E4A7A', ' textLength="25" lengthAdjust="spacingAndGlyphs"')
    + `<g transform="translate(-3 9) rotate(-8) scale(.32)">${cashArt(20)}</g><g transform="translate(5 12) rotate(10) scale(.3)">${cashArt(5)}</g>`,
  coin: C(0, 0, 4, '#D9A441') + C(0, 0, 2.6, 'none', ' stroke="#B8862E" stroke-width=".8"') + e(-1.4, -1.6, 0.9, 1.3, '#F4E6CC'),
  rag: d('M-8-3Q0-6 8-3L9 4Q0 7-9 4Z', '#EDE7DC') + ln('M-6 0H6', '#C9C1B6', 0.8),
});
// sticker aliases: a sticker id that names an existing drawing
Object.assign(ITEMS, { sixmonths: ITEMS.hourglass, sorry: ITEMS.phonesorry });
/** An item at (x, y), s scale (1 = about 44 across). */
export const it = (name, x, y, s = 1) => at(x, y, s, ITEMS[name] || '');
/** A price tag with any text. */
export const priceTag = (t, x, y, s = 1) => at(x, y, s, tag(t));
/** A ringgit note (1, 5, 10, 20, 50, 100) and the cash envelope with any amount written on it. */
export const cash = (v, x, y, s = 1) => at(x, y, s, cashArt(v));
export const envelopeAmt = (t, x, y, s = 1) => at(x, y, s, envArt(t));
/** Handwriting (R, M and the digits 0 1 2 3 5) centred at (x, y), 10 units tall at s 1; and the notebook with an amount. */
export const written = (t, x, y, s = 1, c) => at(x, y, s, scrawl(t, c));
export const notebookAmt = (t, x, y, s = 1) => at(x, y, s, nbArt(t));

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
    return d(far.map(([x, w, h]) => `M${x} ${base - h}h${w}v${h + 6}h${-w}z`).join(''), '#2B2C48') + d([[10, 64], [44, 44], [48, 70], [114, 36], [120, 60], [150, 60], [188, 44], [194, 70], [256, 52], [262, 76], [296, 64]].map(([x, y]) => `M${x + 2} ${y + base - 117.5}h0`).join(''), '#E2A95A', ' opacity=".6" stroke="#E2A95A" stroke-width="4.4" stroke-linecap="round" filter="url(#${pfx}b2)"'); };
  const person = (x, y, s, headY) => C(x, y - s * 2.6, s, '#272539') + RR(f1(x - s * 1.4), f1(y - s * 1.6), f1(s * 2.8), f1(s * 3.4), s, '#272539');

  // characters
  const FY = { aina: -117.5, wei: -116.5, raju: -113.5, kamala: -113.5, arjun: -73.5, grace: -116.5 }, HOLD_Y = { aina: -71, wei: -72, raju: -68, kamala: -69.5, arjun: -45, grace: -72 };
  const FORE = { aina: A.arm, wei: W.skin, raju: J.skin, kamala: KM.skin, arjun: AJ.kurta, grace: GR.arm };
  const SKIN = { aina: A.skin, wei: W.skin, raju: J.skin, kamala: KM.skin, arjun: AJ.skin, grace: GR.skin };
  const BODY = { aina: ainaBody, wei: weiBody, raju: rajuBody, kamala: kamalaBody, arjun: arjunBody, grace: graceBody };
  const RIG = { aina: [12.5, -97], wei: [12.5, -98], raju: [14, -94], kamala: [11.5, -95], arjun: [8, -62, 0.65], grace: [12.5, -98] };
  const faceUse = (who, f, x, y) => who === 'grace' ? use(`gf-${f}`, () => faceArt(f) + GLASSES, x, y) : who === 'raju' ? use(`rf-${f}`, () => faceArt(f, 7.2) + MOUSTACHE, x, y) : use(`f-${f}`, () => faceArt(f), x, y);
  const person3 = who => (o = {}) => {
    const { x = 160, y = 188, s = 1, face = 'happy', pose = 'stand', flip = false, item = null, is = 0.5, apron = null, turn = null, look = null, bend = 0, inHand = '' } = o;
    const fp = pose === 'ride' ? [15, FY[who] + 2.4] : pose === 'kneel' || pose === 'kneelopen' || pose === 'kneelreach' ? [0, FY[who] + 40] : pose === 'hug' ? [-3, FY[who] + 72] : [0, FY[who]];
    const body = use(`${who}-${pose}${apron ? '-a' : ''}`, () => BODY[who](pose, ...(apron ? [apron] : [])));
    // turn 'l' | 'r' (in the art's own left/right): a three-quarter turn toward a partner. The body narrows, the far
    // cheek goes under the hair or tudung, and the eyes, nose and mouth slide toward the partner, so eyelines meet.
    // look 'up' | 'down' tips the features.
    const t = turn ? (turn === 'r' ? 1 : -1) * (flip ? -1 : 1) : 0, dy = look === 'up' ? -1.3 : look === 'down' ? 1.3 : 0;
    let inner = !t ? body + (dy ? `<g transform="translate(0 ${dy})">${faceUse(who, face, fp[0], fp[1])}</g>` : faceUse(who, face, fp[0], fp[1]))
      // turned toward +x: the half on that side goes away from us and is squeezed (drawn first, a little past the middle,
      // so the near half's edge lands on it; opacity makes the near half one layer, else each shape's clipped edge
      // blends on its own and leaves a hairline down the face) (the far shoulder, the face side of
      // the head), the other half is drawn as is (the near shoulder, more hair or tudung at the back of the head)
      : `<g transform="scale(${t} 1)"><g transform="scale(${FAR} 1)" clip-path="url(#${pfx}hf)">${body}</g><g clip-path="url(#${pfx}hn)" opacity=".999">${body}</g>${at(fp[0], fp[1] - FY[who], 1, TURN[who] || '')}</g>`
        + `<g transform="translate(${f1(fp[0] + 2.2 * t)} ${f1(fp[1] + dy)}) scale(.84 1)">${faceUse(who, face, 0, 0)}</g>`;
    const farX = ([hx, hy]) => [f1((t || 1) * (t && hx > 0 ? hx * FAR : hx)), hy];

    if (pose === 'thumbs') { const [hx, hy] = farX(arms(RIG[who][0], RIG[who][1], 'thumbs', RIG[who][2]).hands[1]);
      inner += e(hx, hy, 3.4, 3.6, SKIN[who]) + RR(f1(hx - 1.4), f1(hy - 8.4), 2.8, 6, 1.4, SKIN[who]) + ln(`M${f1(hx - 2.6)} ${f1(hy)}h5.2`, INK, 0.35, ' opacity=".4"'); }
    if (inHand) { const [hx, hy] = farX(arms(RIG[who][0], RIG[who][1], pose, RIG[who][2]).hands[1]);
      inner += `<g transform="translate(${hx} ${hy}) scale(${flip ? -1 : 1} 1)">${inHand}</g>` + mitts([[hx, hy]], SKIN[who]); }
    if (pose === 'chin' || pose === 'mouth') { const k = arms(RIG[who][0], RIG[who][1], pose, RIG[who][2]);
      // the forearm comes up over the tudung or shirt to the hand, which gets an outline so it reads against the face
      const up = k.hands.map((h, i) => [h, i ? 1 : -1]).filter(([[, hy]]) => hy < -100);
      inner += up.map(([h, sg]) => { const [ex, ey] = farX([sg * (RIG[who][0] - 1), RIG[who][1] + 10]), [hx, hy] = farX(h);
        return ln(`M${ex} ${ey}L${hx} ${f1(hy + 2)}`, FORE[who], 5.4) + e(hx, hy, 3.3, 3.5, 'none', ` stroke="${INK}" stroke-width=".7" opacity=".5"`); }).join('') + mitts(up.map(([h]) => farX(h)), SKIN[who]); }
    if (pose === 'call' || pose === 'call2') { const [fx, fy] = farX(arms(RIG[who][0], RIG[who][1], pose, RIG[who][2]).hands[1]);
      inner += `<g transform="translate(${f1(fx + 0.6)} ${f1(fy + 1.5)}) rotate(14)">${RR(-2.6, -6, 5.2, 11, 1.2, '#2E2A36')}</g>` + e(fx, fy + 2.4, 2.8, 3, SKIN[who]); }
    if (pose === 'give') { const k = arms(RIG[who][0], RIG[who][1], 'give', RIG[who][2]), [[ax, ay], [bx, by]] = k.hands.map(farX);
      const my = (ay + by) / 2 - 4, top = f1(my - 13 * is);
      inner += item ? mitts([[ax, ay], [bx, by]], SKIN[who]) + `<g transform="translate(${f1((ax + bx) / 2)} ${f1(my)}) scale(${flip ? -1 : 1} 1)">${at(0, 0, is, ITEMS[item] ?? item)}</g>`
        + [ax, bx].map(hx => e(hx, top, 1.7, 2.2, SKIN[who]) + ln(`M${f1(hx - 1)} ${f1(+top + 1.4)}h2`, INK, 0.3, ' opacity=".35"')).join('') : mitts([[ax, ay], [bx, by]], SKIN[who]); }
    if (pose === 'hold') { const k = arms(RIG[who][0], RIG[who][1], 'hold', RIG[who][2]);
      // item: an ITEMS name, or markup centred on 0,0 (a note peeking out of an envelope)
      inner += (item ? `<g transform="scale(${flip ? -1 : 1} 1)">${at(0, HOLD_Y[who] - 2, is, ITEMS[item] ?? item)}</g>` : '') + mitts(k.hands.map(farX), SKIN[who]); }
    if (pose === 'pull') { const k = arms(RIG[who][0], RIG[who][1], 'pull', RIG[who][2]), [[bx, by], [fx, fy]] = k.hands.map(farX);
      const sx = fx + 2.6, sy = fy - 1, ex = bx + 1, ey = by - 7;
      inner += it('teh', fx, fy - 4, 0.34) + d(`M${f1(sx - 1.1)} ${sy}Q${f1(sx + 1)} ${f1((sy + ey) / 2)} ${f1(ex - 0.4)} ${ey}H${f1(ex + 0.4)}Q${f1(sx + 2)} ${f1((sy + ey) / 2)} ${f1(sx + 1.1)} ${sy}Z`, '#B8723A')
        + it('teh', bx, by - 3, 0.36) + e(ex, ey + 1, 4, 1.4, '#F1DDB8') + C(ex - 3.5, ey - 1.5, 0.8, '#F1DDB8') + C(ex + 3.2, ey - 2.4, 0.6, '#F1DDB8'); }
    if (bend) inner = `<g clip-path="url(#${pfx}lo)">${inner}</g><g transform="rotate(${bend} 0 -60)"><g clip-path="url(#${pfx}up)">${inner}</g></g>`;
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
    'home-n': () => home(false), homeback: homeBack, kopiback: kopiBack, 'home-d': () => home(true), 'porch-n': () => porch(false), 'porch-d': () => porch(true),
    'home-r': () => home(true).replace(/#C99A78/g, '#A8876C').replace(/#B08466/g, '#94735A').replace(/#7A5540/g, '#6A4A38').replace('#A9C8CF', '#7F95A2').replace(' opacity="0.35" filter', ' opacity="0.1" filter')
      .replace('r="9" fill="#F4EEDD"', 'r="9" fill="#7F95A2"').replace('rx="14" ry="5" fill="#F4EEDD" opacity=".6"', 'rx="14" ry="5" fill="#9AABB4" opacity=".8"')
      + ln('M34 30l-4 10M44 34l-4 10M54 30l-4 10M70 36l-4 10M82 30l-4 10M90 40l-4 10M36 56l-4 10M50 62l-4 10M66 58l-4 10M80 64l-4 10M40 76l-4 10M58 80l-4 10M76 76l-4 10M90 70l-4 10', '#C9D6DC', 0.9, ' opacity=".7"'),
    'xmas-n': () => xmas(false), 'xmas-d': () => xmas(true),
    park: () => `<defs><linearGradient id="${pfx}dsky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8FB9C9"/><stop offset="1" stop-color="#E6DDC0"/></linearGradient></defs>` + R(0, 0, 320, 130, `url(#${pfx}dsky)`) + glow(270, 30, 60, 0.5, '#FFF1D0')
      + e(70, 30, 26, 7, '#FFFFFF', ' opacity=".6"') + e(200, 20, 34, 8, '#FFFFFF', ' opacity=".55"')
      + d('M0 118Q20 92 44 104Q60 84 86 100Q104 86 128 102Q150 88 170 104Q196 86 220 102Q246 88 268 104Q290 90 320 100V124H0Z', '#6F8F5A') + d('M0 122Q40 108 80 116Q130 106 180 118Q240 106 320 116V126H0Z', '#5E7F4A')
      + R(0, 122, 320, 78, '#8FAE62') + d('M130 200Q150 160 200 140Q240 126 320 128V140Q250 140 214 152Q176 166 170 200Z', '#D9C7A0')
      + R(24, 56, 10, 76, '#6E4533') + C(18, 48, 22, '#4F7A42') + C(44, 44, 20, '#5E8B4A') + C(30, 30, 18, '#5E8B4A') + e(30, 134, 30, 5, SH, ' opacity=".2"')
      + ln('M262 136V96M278 136V96M262 104H278M262 114H278M262 124H278', '#6E4533', 1.6) + ln('M278 96Q300 104 308 134', '#C44A36', 4) + R(258, 92, 24, 5, '#C44A36')
      + R(96, 118, 36, 3, '#8A5A3C') + ln('M100 121V130M128 121V130', '#6E4533', 1.6) + R(96, 112, 36, 2.5, '#8A5A3C'),
    library: () => { const cols = ['#8E2F4F', '#2F6B66', '#D9A441', '#4F6D8F', '#C44A36', '#6E4A7E', '#E9D8B8', '#5E8B4A'], paths = cols.map(() => []);
      [20, 48, 76, 104].forEach((y, r) => { let x = 14; let i = r * 3; while (x < 300) { const w = 5 + (i * 7 % 4), h = 22 + (i * 5 % 5); paths[(i * 3 + r) % 8].push(`M${x} ${y + 26 - h}h${w}v${h}h${-w}z`); x += w + 0.8; i++; } });
      return R(0, 0, 320, 200, '#D9C4A0') + R(8, 14, 304, 120, '#6E4533') + R(12, 18, 296, 112, '#3E261E') + paths.map((q, i) => d(q.join(''), cols[i])).join('')
        + ln('M12 46.5H308M12 74.5H308M12 102.5H308M12 130.5H308', '#8A5A3C', 3) + glow(160, 70, 140, 0.25) + R(0, 134, 320, 30, '#CDB894') + R(0, 164, 320, 36, '#9C7A5A') + ln('M0 180H320', '#86664A', 0.8); },
    rooftop: () => sky() + ln('M20 20h0M60 12h0M140 16h0M230 10h0M300 24h0M104 40h0', '#FFFFFF', 1.6, ' opacity=".7"') + skyline(150)
      + [[70, 48, 26, '#E8B04A'], [178, 34, 30, '#C4607A'], [262, 60, 22, '#6FA3B8'], [124, 82, 14, '#8FB35E']].map(([x, y, r, c]) => glow(x, y, r * 1.6, 0.35, c)
        + ln(Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return `M${f1(x + Math.cos(a) * r * 0.3)} ${f1(y + Math.sin(a) * r * 0.3)}L${f1(x + Math.cos(a) * r)} ${f1(y + Math.sin(a) * r)}`; }).join(''), c, 1.3)
        + ln(Array.from({ length: 14 }, (_, i) => { const a = (i + 0.5) / 14 * Math.PI * 2; return `M${f1(x + Math.cos(a) * r * 1.12)} ${f1(y + Math.sin(a) * r * 1.12)}h0`; }).join(''), '#F6E2A8', 2)).join('')
      + R(0, 144, 320, 6, '#807F8C') + R(0, 150, 320, 26, '#6B6A78') + shade('M0 150H320V156H0Z') + bulbs([0, 142], [160, 152], [320, 142], 14) + R(0, 176, 320, 24, '#4A4956') + R(280, 110, 34, 34, '#5A5966') + e(297, 110, 17, 4, '#6B6A78'),
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
  function xmas(day) {
    const wall = day ? '#E3CBA6' : '#9C7A5C';
    const tri = (y, h, w, c) => d(`M272 ${y}L${272 + w} ${y + h}H${272 - w}Z`, c) + shade(`M272 ${y}L${272 + w} ${y + h}H272Z`, 0.12);
    return R(0, 0, 320, 200, wall) + (day ? '' : glow(250, 100, 170, 0.45)) + R(0, 120, 320, 44, day ? '#D2B690' : '#86664C')
      + R(24, 26, 72, 68, '#E9D8B8') + R(28, 30, 64, 60, day ? '#A9C8CF' : '#27305A') + R(58.5, 30, 3, 60, '#E9D8B8') + d('M16 20H32Q27 58 34 100H16Z', '#3F6B4A') + d('M104 20H88Q93 58 86 100H104Z', '#3F6B4A') + RR(12, 17, 96, 4, 2, '#8A5A3C')
      + ln('M112 14Q150 30 190 14Q214 26 232 14', '#3F6B4A', 3) + ln('M126 21h0M150 25h0M174 20h0M204 20h0M222 17h0', '#C44A36', 3.4)
      + R(20, 124, 104, 8, '#EFE6D3') + R(24, 132, 4, 32, '#6E4533') + R(116, 132, 4, 32, '#6E4533') + e(40, 122, 10, 3, '#D9A441') + e(70, 121, 12, 3.5, '#B8703A') + e(100, 122, 9, 3, '#C44A36') + ln('M70 116q-3-4 1-8', '#F3E6CF', 1.2, ' opacity=".6"')
      + R(0, 164, 320, 36, day ? '#8A6246' : '#6A4A38') + e(200, 186, 110, 11, '#8E2F3A', ' opacity=".8"')
      + R(266, 146, 12, 16, '#6E4533') + tri(34, 44, 26, '#3F6B4A') + tri(58, 54, 32, '#3F6B4A') + tri(86, 64, 40, '#37603F')
      + ln('M254 70h0M284 64h0M264 94h0M292 100h0M248 118h0M276 124h0M298 136h0M258 140h0', '#C44A36', 5) + ln('M270 80h0M296 118h0M252 104h0M280 142h0', '#D9A441', 4.6)
      + (day ? '' : ln('M252 56h0M266 62h0M282 56h0M246 88h0M262 96h0M280 92h0M298 88h0M240 124h0M258 132h0M276 130h0M296 128h0M308 144h0', '#F2B45A', 7, ` opacity=".5" filter="url(#${pfx}b2)"`))
      + ln('M252 56h0M266 62h0M282 56h0M246 88h0M262 96h0M280 92h0M298 88h0M240 124h0M258 132h0M276 130h0M296 128h0M308 144h0', '#F6D08A', 2.6)
      + (day ? '' : glow(272, 30, 20, 0.7)) + d('M272 20L275 28L283 28L277 33L279 41L272 36L265 41L267 33L261 28L269 28Z', '#E3B54A')
      + RR(236, 150, 18, 14, 2, '#C44A36') + R(243.5, 150, 3, 14, '#D9A441') + RR(284, 148, 20, 16, 2, '#2F6B66') + R(292.5, 148, 3, 16, '#D9A441') + RR(258, 154, 14, 10, 2, '#D9A441') + R(263.5, 154, 3, 10, '#C44A36');
  }
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
  function kopiBack() {
    return R(0, 0, 320, 200, '#E8D4B0') + glow(160, 60, 200, 0.4, '#FFF1D0') + R(0, 92, 320, 80, '#7FA88A') + ln(Array.from({ length: 16 }, (_, i) => `M${i * 20 + 10} 94V172`).join('') + 'M0 116H320M0 140H320', '#6E967A', 1.2)
      + R(0, 90, 320, 4, '#5E8B6E') + R(18, 24, 120, 6, '#8A5A3C') + [[30, '#C44A36'], [58, '#2F6B66'], [86, '#D9A441'], [112, '#4F6D8F']].map(([x, c]) => RR(x, 10, 18, 14, 2, c)).join('')
      + R(150, 18, 78, 40, '#F4EEE2') + R(150, 18, 78, 9, '#B5533A') + ln('M158 34H220M158 42H212M158 50H216', '#B6AFA2', 2)
      + R(244, 30, 56, 108, '#DDE3E6') + R(248, 34, 48, 48, '#A9C8CF', ' opacity=".7"') + R(248, 86, 48, 48, '#A9C8CF', ' opacity=".7"') + R(290, 70, 3, 24, '#8A8378')
      + R(20, 108, 210, 64, '#6E4533') + R(16, 102, 218, 8, '#8A5A3C') + shade('M20 110H230V118H20Z')
      + [[44, 1], [76, 0.9], [106, 1]].map(([x, k]) => RR(x - 11 * k, 68, 22 * k, 34, 4, '#B9BEC2') + e(x, 68, 11 * k, 3, '#D3D7D9') + ln(`M${x + 11 * k} 80h6v8`, '#8A8378', 2) + R(x - 2, 62, 4, 6, '#8A8378')).join('')
      + R(140, 74, 80, 28, '#E9EEF0', ' opacity=".85"') + R(140, 74, 80, 3, '#B9C2C6') + [150, 166, 182, 198].map(x => RR(x, 86, 12, 8, 2, '#D9A050')).join('') + d('M140 74L160 74L146 102H140Z', '#FFFFFF', ' opacity=".35"')
      + R(0, 172, 320, 28, '#C7B08C') + ln('M20 182h0M64 190h0M110 180h0M160 194h0M214 184h0M262 192h0M300 180h0', '#A8906C', 2.4);
  }
  function homeBack() {
    return R(0, 0, 320, 200, '#8C5A45') + R(0, 118, 320, 44, '#6E4538') + glow(40, 60, 170, 0.35, '#F2B45A')
      + R(26, 30, 64, 132, '#5E3A2E') + R(30, 34, 56, 126, '#7A4A36') + R(36, 42, 44, 50, '#6A4030') + R(36, 100, 44, 54, '#6A4030') + C(80, 104, 2.2, '#D9A441') + R(44, 46, 28, 14, '#27305A', ' opacity=".8"')
      + RR(14, 152, 26, 8, 2, '#4A2E24') + e(20, 152, 5, 2, '#C44A36') + e(32, 152, 5, 2, '#4F6D8F')
      + C(126, 52, 11, '#F1E8D8') + C(126, 52, 11, 'none', ' stroke="#6E4533" stroke-width="2"') + ln('M126 52V45M126 52L131 55', INK, 1.3)
      + R(150, 128, 112, 32, '#6E4533') + R(150, 128, 112, 4, '#8A5A3C') + R(156, 138, 48, 18, '#5A3A2E') + R(208, 138, 48, 18, '#5A3A2E') + C(180, 147, 1.4, '#D9A441') + C(232, 147, 1.4, '#D9A441')
      + RR(172, 86, 70, 40, 2, '#1E1C26') + d('M176 90H198L184 122H176Z', '#FFFFFF', ' opacity=".07"') + R(203, 126, 8, 3, '#1E1C26')
      + R(274, 36, 44, 126, '#7A4A36') + [60, 90, 120, 150].map(y => R(274, y, 44, 3, '#5A3A2E')).join('')
      + [[278, '#B5533A'], [285, '#2F6B66'], [291, '#D9A441'], [298, '#4F6D8F'], [305, '#8E2F4F']].map(([x, c], i) => R(x, 42 + (i % 2) * 4 + 0, 5, 18 - (i % 2) * 4, c) + R(x + (i % 3), 66 + (i % 2) * 3, 5, 24 - (i % 2) * 3, c)).join('')
      + R(0, 160, 320, 40, '#5A3A2E') + ln('M0 160H320', '#4A2E24', 1.2) + e(170, 188, 150, 12, '#2F5D5A');
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
  /** Full-bleed background. kind: stall | street | home | kopitiam | night | porch | kitchen | shop | xmas | rain | park | library | rooftop. stall opts: { sign, a, behind, items, steam } home opts: { day } kopitiam opts: { table } */
  function scene(kind, o = {}) {
    if (kind === 'stall') { const a = CAN[o.a] || o.a || '#B5533A';
      return use('stall', SCENES.stall) + (o.behind || '') + use(`can${a.slice(1)}`, () => d(canopyD(18, 24, 284, 16, 11), a) + shade(canopyD(18, 34, 284, 6, 11)) + R(16, 21, 288, 4, '#5A3A2A'))
        + (o.sign ? RR(100, 1, 120, 18, 4, '#E3C27A') + txt(160, 15, o.sign, 12, '#6E2E1A', o.sign.length > 12 ? ' textLength="110" lengthAdjust="spacingAndGlyphs"' : ' letter-spacing="1"') : '') + (o.steam ? steam(`M${o.steam - 4} 116q-5-8 0-15t0-16`) + steam(`M${o.steam + 6} 114q5-9 0-17t1-18`) : '')
        + use('counter', SCENES.counter) + (o.items || ''); }
    if (kind === 'home') return o.back ? use('homeback', SCENES.homeback) : use(o.day ? 'home-d' : 'home-n', SCENES[o.day ? 'home-d' : 'home-n']);
    if (kind === 'xmas') return use(o.day ? 'xmas-d' : 'xmas-n', SCENES[o.day ? 'xmas-d' : 'xmas-n']);
    if (kind === 'rain') return use('home-r', SCENES['home-r']);
    if (kind === 'park') return use('park', SCENES.park) + (o.mat ? e(160, 182, 72, 11, '#C44A36') + ln('M104 182H216M130 173L118 191M160 171V193M190 173L202 191', '#EFE6D3', 2, ' opacity=".7"') : '');
    if (kind === 'library' || kind === 'rooftop') return use(kind, SCENES[kind]);
    if (kind === 'porch') return use(o.day ? 'porch-d' : 'porch-n', SCENES[o.day ? 'porch-d' : 'porch-n']);
    if (kind === 'kitchen') return use('kitchen', SCENES.kitchen) + (o.items || '');
    if (kind === 'shop' && o.bikes) return use('shop', SCENES.shop) + R(10, 20, 300, 98, '#C9B596') + ln(Array.from({ length: 14 }, (_, i) => `M${24 + i * 21} 26v86`).join(''), '#B8A384', 0.6, ' stroke-dasharray="1 4"')
      + [[52, 50, '#4F6D8F'], [118, 46, '#2F6B66'], [200, 50, '#D9A441'], [266, 46, '#6E4A7E']].map(([x, y, c]) => `<g transform="translate(${x} ${y}) scale(1.5)">${ITEMS.bicycle.replace(/#C44A36/g, c)}</g>` + ln(`M${x} ${y - 14}v-8`, '#6E4533', 1.2)).join('')
      + R(14, 112, 292, 4, '#8A5A3C') + (o.sign ? RR(100, 1, 120, 18, 4, o.signBg || '#C44A36') + txt(160, 15, o.sign, 12, '#F4EEE2', ' letter-spacing="1"') : '') + (o.items || '');
    if (kind === 'shop') return use('shop', SCENES.shop) + (o.sign ? RR(100, 1, 120, 18, 4, '#C44A36') + txt(160, 15, o.sign, 12, '#F4EEE2', ' letter-spacing="1"') : '') + (o.items || '');
    if (kind === 'kopitiam' && o.back) return use('kopiback', SCENES.kopiback) + (o.items || '');
    if (kind === 'kopitiam') { const tx = o.table ?? 262;
      return use('kopitiam', SCENES.kopitiam) + (o.storm ? R(196, 18, 104, 86, '#7D8894', ' opacity=".85"') + ln(Array.from({ length: 14 }, (_, i) => `M${200 + i * 7} ${22 + (i * 23) % 50}l-3 9`).join(''), '#C9D3DC', 0.8, ' opacity=".7"') : '') + (o.behind || '') + (tx === false ? '' : e(tx, 172, 30, 3, '#120E1E', ' opacity=".3"') + e(tx, 140, 34, 7, '#EDE7DC') + shade(`M${tx} 133A34 7 0 0 1 ${tx + 34} 140A34 7 0 0 1 ${tx} 147Z`, 0.1) + R(tx - 3, 146, 6, 26, '#3E3A40') + RR(tx - 16, 170, 32, 4, 2, '#3E3A40') + it('teh', tx - 14, 129, 0.45) + it('teh', tx + 12, 129, 0.45)); }
    return use(kind === 'street' || kind === 'night' ? kind : 'street', SCENES[kind === 'night' ? 'night' : 'street']);
  }
  /** The coffee table in front of a kneeling figure (home, panel 7). */
  const coffeeTable = () => e(112, 186, 84, 5, '#120E1E', ' opacity=".35"') + RR(36, 146, 150, 7, 2, '#8A5A3C') + R(42, 153, 138, 30, '#6E4533') + shade('M42 153H180V159H42Z') + R(46, 183, 6, 6, '#6E4533') + R(170, 183, 6, 6, '#6E4533');
  // ---- foreground for a panel's cam.fg: drawn in screen space (320x200) on top of the zoomed art, so these are sized
  // for the frame, not the scene. Near things sit a little darker and softer than the focus (b2 blur, shadow wash).
  const near = (inner, o = 0.3) => `<g filter="url(#${pfx}b2)">${inner}<g opacity="${o}">${inner.replace(/fill="#[0-9A-Fa-f]{6}"/g, `fill="${SH}"`)}</g></g>`;
  const side = (s, inner) => s === 'right' ? `<g transform="matrix(-1 0 0 1 320 0)">${inner}</g>` : inner;
  // Backs of heads and shoulders for over-the-shoulder shots, drawn at the left edge; side 'right' mirrors them.
  const BACK = {
    kamala: () => e(34, 220, 90, 66, KM.blouse) + d('M-10 168Q30 140 80 150L96 210H-10Z', KM.saree) + ln('M-10 168Q30 140 80 150', KM.gold, 3) + R(23, 122, 22, 28, KM.skin)
      + e(34, 88, 30, 36, KM.hair) + e(34, 124, 14, 11, KM.hair) + C(34, 132, 8, '#1A1517') + ln('M52 118h0M56 124h0M54 130h0', '#F4EEE2', 4),
    aina: () => e(30, 216, 88, 70, A.arm) + d('M30 40C6 40-4 62-2 84C-14 104-38 124-36 150Q-10 172 30 174Q70 172 96 150C98 124 74 104 62 84C64 62 54 40 30 40Z', A.tudung)
      + shade('M30 40C54 40 64 62 62 84C74 104 98 124 96 150Q86 160 70 166C76 136 60 108 52 86C56 64 46 46 30 40Z', 0.25) + ln('M8 92Q30 104 52 92', '#9E524D', 1.6),
    wei: () => e(34, 214, 90, 68, W.shirt) + shade('M80 160Q120 180 124 214H90Z', 0.2) + R(23, 124, 22, 26, W.skin) + shade('M23 128H45V136H23Z', 0.25)
      + d('M34 42C6 42 0 66 2 90L-2 130Q18 138 34 132Q50 138 70 130L66 90C68 66 62 42 34 42Z', W.hair) + RR(56, 72, 14, 6, 2.5, '#D9A441', ' transform="rotate(-20 63 75)"'),
    raju: () => e(34, 222, 92, 66, J.shirt) + ln('M10 168Q16 150 26 140M58 168Q52 150 42 140', J.apron, 5) + R(20, 118, 28, 34, J.skin) + shade('M20 126H48V136H20Z', 0.25)
      + e(34, 86, 30, 36, J.skin) + e(2, 92, 6, 10, J.skin) + e(66, 92, 6, 10, J.skin) + d('M4 90Q6 122 34 124Q62 122 64 90Q60 108 34 110Q8 108 4 90Z', J.hair),
  };
  /** Over-the-shoulder: `who`'s back of head and shoulder at the `s` edge ('left' | 'right'). */
  const ots = (who, s = 'left', dx = 0) => side(s, `<g transform="translate(${dx} 0)">${near(BACK[who](), 0.32)}</g>`);
  /** A forearm and mitten hand entering from an edge ('bottom' | 'top' | 'left' | 'right'), the palm at (x, y). hold: markup
   *  drawn at the palm unturned (a note, coins), under the thumb. sleeve: a cuff colour (Aina's long sleeves). */
  const hand = (skin, from, { x = 160, y = 120, hold = '', sleeve = null, a = 0, s = 1, point = false, rim = null } = {}) => {
    const r = { bottom: 0, top: 180, left: 90, right: -90 }[from] + a, g = inner => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${inner}</g>`;
    return g(d('M-11 6L-13 260H13L11 6Z', skin) + shade('M3 6L11 6L13 260H5Z', 0.18) + (sleeve ? d('M-15 34L-17 260H17L15 34Z', sleeve) + ln('M-15 36H15', SH, 2, ' opacity=".25"') : '')
      + (rim ? ln('M12 40L14 260', rim, 2.4, ' opacity=".75"') : '')
      + (point ? d('M-13 4Q-15-10 0-12Q15-10 13 4Q0 12-13 4Z', skin) + RR(-5, -42, 10, 34, 5, skin) + ln('M-9-8Q0-11 9-8', SH, 0.9, ' opacity=".3"')
        : d('M-13 4Q-15-22 0-24Q15-22 13 4Q0 12-13 4Z', skin) + ln('M-6-22V-12M0-23V-12M6-22V-12', SH, 0.9, ' opacity=".3"')))
      + hold + g(e(13, -2, 5, 9, skin, ' transform="rotate(-24 13 -2)"') + ln('M12-8Q15-2 13 5', SH, 0.9, ' opacity=".25"'));
  };
  /** Wei's phone held up in the lower left: an e-wallet list, rows [label, amount, highlight]. */
  const phone = (rows, dx = 0, sub = 'Today', skin = W.skin, rot = -5, title = 'e-wallet') => `<g transform="translate(${dx} 0) rotate(${rot} 76 150)">` + RR(12, 54, 128, 190, 12, '#2E2A36') + RR(19, 66, 114, 170, 4, '#F4EEE2') + R(19, 66, 114, 22, '#2F6B66')
    + txt(76, 81, title, 10, '#F4EEE2') + txt(76, 102, sub, 8, '#8A8378')
    + rows.map(([l, v, hi, mark], i) => { const y = 110 + i * 26;
      if (hi === 'btn') return RR(22, y, 108, 22, 8, '#7A3E96') + txt(76, y + 14.5, l, 8.6, '#FFFFFF', ' textLength="96" lengthAdjust="spacingAndGlyphs"');
      if (hi === 'total') return R(24, y - 2, 104, 1.4, '#3B2723') + `<text x="27" y="${y + 15}" font-family="system-ui,sans-serif" font-weight="800" font-size="10.5" fill="#3B2723">${l}</text>`
        + `<text x="127" y="${y + 15}" font-family="system-ui,sans-serif" font-weight="800" font-size="11" text-anchor="end" fill="#B5332A">${v}</text>`;
      return (hi ? RR(22, y, 108, 22, 3, '#F2C9C0') : '') + (mark ? C(29, y + 11, 3.4, mark) : '') + `<text x="${mark ? 35 : 27}" y="${y + 15}" font-family="system-ui,sans-serif" font-weight="700" font-size="10" fill="#3B2723"${l.length > 8 ? ' textLength="44" lengthAdjust="spacingAndGlyphs"' : ''}>${l}</text>`
        + `<text x="127" y="${y + 15}" font-family="system-ui,sans-serif" font-weight="800" font-size="10" text-anchor="end" fill="${hi ? '#B5332A' : '#3B2723'}">${v}</text>`; }).join('')
    + '</g>' + e(10 + dx, 196, 12, 22, skin, ` transform="rotate(-10 ${10 + dx} 196)"`);


  /** Duit's ears and eyes rising over the bottom edge. */
  const duitPeek = (s = 'right') => side(s === 'left' ? 'right' : 'left', `<g transform="translate(250 200) scale(3.2)">${d('M-7-3L-6.5-10.5L-2.5-5.5ZM7-3L6.5-10.5L2.5-5.5Z', G.fur)}${e(0, 2, 8, 6.5, G.fur)}${ln('M-2-4V-2M0-4.5V-2.5M2-4V-2', G.dark, 0.8)}${C(-3, -0.5, 1.3, INK)}${C(3, -0.5, 1.3, INK)}${C(-2.6, -0.9, 0.4, '#FFFFFF')}${C(3.4, -0.9, 0.4, '#FFFFFF')}</g>`);
  /** A near string of big soft bulbs sagging across the top edge. */
  const fgBulbs = () => ln('M-10-6Q160 46 330-6', '#191726', 1.6) + [28, 92, 160, 228, 292].map(x => { const t = (x + 10) / 340, y = f1(-6 + 2 * t * (1 - t) * 52 + 6);
    return C(x, y + 6, 16, '#F2B45A', ` opacity=".45" filter="url(#${pfx}bl)"`) + R(x - 2.5, y - 3, 5, 5, '#3A2F35') + e(x, y + 6, 5.5, 7, '#F6D08A') + e(x - 1.5, y + 4, 1.6, 2.4, '#FFF6DC'); }).join('');
  /** One or two passers-by, cut by the `s` edge. */
  // Strangers cut by the `s` edge, lit from the stalls behind (a warm rim on the side facing in). kind: shoulder (one
  // big back of head + shoulder), pair (two heads along the bottom), kid (a small child with a balloon), legs (two
  // pairs of legs from the knee down, for cat-height shots).
  const rim = p => ln(p, '#F2B45A', 2, ' opacity=".55"');
  const CROWD = {
    shoulder: () => C(18, 92, 26, '#272539') + RR(-40, 118, 110, 120, 40, '#272539') + rim('M38 72Q46 84 42 104M66 128Q72 136 72 150'),
    pair: () => C(30, 168, 24, '#272539') + RR(-20, 188, 100, 40, 20, '#272539') + C(92, 182, 20, '#2E2B42') + RR(56, 198, 74, 30, 14, '#2E2B42') + rim('M50 152Q56 160 54 174M108 168Q114 176 112 188'),
    kid: () => ln('M58 112L66 40', '#8A8378', 1.2) + e(66, 30, 13, 16, '#C44A36') + e(62, 25, 3, 5, '#FFFFFF', ' opacity=".4"') + C(40, 140, 15, '#272539') + RR(18, 154, 46, 60, 16, '#272539') + ln('M54 160Q60 140 58 114', '#272539', 7) + rim('M52 130Q56 138 54 148'),
    queue: () => [[10, 150, 24, '#272539'], [70, 172, 21, '#2E2B42'], [124, 190, 18, '#272539'], [200, 196, 16, '#2E2B42']].map(([x, y, r, c]) => C(x, y, r, c) + RR(x - r * 1.9, y + r * 0.9, r * 3.8, 60, r * 0.9, c)).join('')
      + rim('M28 132Q34 140 32 156M86 156Q92 164 90 178M139 176Q144 182 142 194'),
    legs: () => [[-6, 40, '#272539', '#C44A36']].map(([x, t, c, sl]) => d([[x, t], [x + 34, t - 8]].map(([a, b]) => `M${a} ${b}Q${a - 5} ${b + 60} ${a + 4} ${b + 110}L${a + 6} 190h14l2-${190 - b - 110}Q${a + 32} ${b + 60} ${a + 26} ${b}Z`).join(''), c)
 + e(x + 13, 192, 17, 6, sl) + e(x + 47, 192, 17, 6, sl)).join('') + rim('M54 34L52 184'),


  };
  const crowd = (s = 'right', kind = 'shoulder') => side(s, near((CROWD[kind] || CROWD.shoulder)(), 0));
  /** A stall canopy's scalloped edge across the top. */
  const awning = (c = '#B5533A') => near(d(canopyD(-12, -8, 344, 16, 12), c) + shade(canopyD(-12, 2, 344, 6, 12), 0.3), 0.15);
  /** A dark stall post at the `s` edge with a lantern hanging off it. */
  const post = (s = 'left') => side(s, near(R(-2, -4, 16, 208, '#3A2F35') + ln('M14 20H34', '#3A2F35', 3), 0) + lanternU(34, 44, 1));

  /** The apam balik counter edge across the bottom, a pan and steam: we stand behind the stall. */
  const fcounter = () => near(R(-4, 164, 328, 10, '#8A5A3C') + R(-4, 174, 328, 30, '#6E4533') + shade('M-4 174H324V180H-4Z') + R(110, 162, 30, 5, '#3E302E') + e(70, 167, 46, 9, '#6A5650') + e(70, 165, 42, 7, '#5A4844') + e(70, 165, 42, 7, 'none', ' stroke="#C9B6A6" stroke-width="2"') + ln('M36 162Q70 156 104 162', '#E3D2C0', 2, ' opacity=".7"'), 0.1) + `<g transform="translate(70 158) scale(1.2)">${ITEMS.apambalik}</g>`

    + steam('M60 150q-6-10 0-19t0-20') + steam('M80 148q6-11 0-21t1-22');
  /** A kopitiam marble table edge with a glass of teh in a bottom corner. */
  const table = (s = 'right') => side(s === 'left' ? 'left' : 'right', near(e(60, 214, 130, 40, '#EDE7DC') + shade('M-70 214Q60 236 190 214V230H-70Z', 0.12) + `<g transform="translate(52 160) scale(1.7)">${ITEMS.teh}</g>`, 0.12));
  /** A dark leafy plant in a bottom corner. */
  const leaves = (s = 'left') => side(s, near([[-20, 18, 46], [5, 30, 52], [30, 22, 40], [-5, 50, 36], [24, 60, 30]].map(([r, x, l], i) => e(x, 200 - l * 0.6, 9, l * 0.7, i % 2 ? '#2F4A30' : '#3F6B4A', ` transform="rotate(${r} ${x} 200)"`)).join(''), 0.2));
  /** Lights out: a dark wash over everything drawn so far, then one warm light at `light` [x, y]. */
  const dark = (light, o = 0.62, r = 70, dy = r * 0.6) => (light ? `<rect x="${light[0] - r * 6}" y="${light[1] + dy - r * 6}" width="${r * 12}" height="${r * 12}" fill="url(#${pfx}pool)" opacity="${o}"/>`
      + glow(light[0], light[1] + dy, r, 0.2, '#F6D08A') + ln(`M${light[0]} 0V${light[1] - 4}`, '#191726', 0.8) + C(light[0], light[1], 2.6, '#F6D08A') + glow(light[0], light[1], 18, 0.8, '#F6D08A')
    : R(-10, -10, 340, 220, '#0B0918', ` opacity="${o}"`));
  /** Rain: a cold wash, streaks, a wet sheen on the road, and (street) tarps over the far stalls. */
  const rain = (o = {}) => (o.tarps ? [118, 156, 194, 232].map(x => d(`M${x - 2} 101h38v14q-19 5-38 0z`, '#5E6B7E')).join('') + d('M254 36h70v24q-35 8-70 0z', '#56637A') : '')
    + R(-10, -10, 340, 220, '#16203A', ` opacity="${o.wash ?? 0.42}"`) + ln(Array.from({ length: 90 }, (_, i) => { const c = i % 10, r = Math.floor(i / 10); return `M${c * 34 + (r * 23) % 34 - 6} ${r * 23 + (c * 13) % 23 - 8}l-3 10`; }).join(''), '#B9C8DA', 0.7, ' opacity=".5"')
    + ln('M20 172H90M130 184H230M250 168H310M60 194H150', '#9FB0C8', 1.4, ' opacity=".25"');
  /** Strangers in the scene (not foreground): [x, feet y, s] silhouettes with a warm rim; up: arms raised. */
  const people = (list, up = false) => list.map(([x, y, s, c = '#2B2838']) => C(x, y - 31 * s, 6.5 * s, c) + RR(f1(x - 9 * s), f1(y - 24 * s), f1(18 * s), f1(24 * s), f1(7 * s), c)
    + (up ? ln(`M${f1(x - 7 * s)} ${f1(y - 21 * s)}l${f1(-4 * s)} ${f1(-14 * s)}M${f1(x + 7 * s)} ${f1(y - 21 * s)}l${f1(4 * s)} ${f1(-14 * s)}`, c, f1(4 * s)) : '')
    + ln(`M${f1(x + 5 * s)} ${f1(y - 36 * s)}q${f1(2.6 * s)} ${f1(4 * s)} 0 ${f1(8 * s)}`, '#F2B45A', f1(1.2 * s), ' opacity=".6"')).join('');
  // pose (for the +x arm; the other hangs unless noted): down, up (raised; with cup: a toast), both (both up), clap (hands
  // together at the chest), point (out at shoulder height), shoulder (out sideways, a hand on a neighbour), hip.
  const FOLK = { down: [[15, -78, 13, -62], [15, -78, 13, -62]], up: [[15, -78, 13, -62], [19, -108, 15, -126]], both: [[19, -108, 15, -126], [19, -108, 15, -126]],
    clap: [[16, -76, 2, -82], [16, -76, 2, -82]], point: [[15, -78, 13, -62], [22, -96, 32, -98]], shoulder: [[15, -78, 13, -62], [22, -100, 30, -96]], hip: [[15, -78, 13, -62], [22, -80, 12, -68]], cross: [[18, -68, -8, -80], [18, -68, -8, -78]] };
  const folk = list => list.map(([x, y, s, o = {}]) => { const { shirt = '#6F8FA6', pants = '#3E3A4E', skin = '#C98F6A', hair = '#2A2226', up = 0, cup = false, laugh = false, flip = false, lean = 0, turn = 0, w = 1, kid = null } = o;
    const pose = o.pose || (up === 2 ? 'both' : up ? 'up' : 'down'), [pa, pb] = FOLK[pose] || FOLK.down;
    const arm = (sg, [cx, cy, ex, ey]) => `M${sg * 11}-96Q${sg * cx} ${cy} ${sg * ex} ${ey}`, hs = [[-pa[2], pa[3]], [pb[2], pb[3]]];
    const fx = turn * 2.2, back = turn ? d(`M${-turn * 8}-117Q${-turn * 9}-126 ${-turn * 2}-128Q${-turn * 7}-120 ${-turn * 7}-108Z`, hair) : '';
    return at(x, y, s, `<g transform="rotate(${lean} 0 0)">` + e(0, 0, 14, 3, '#120E1E', ' opacity=".3"') + (o.nolegs ? '' : ln('M-5-58V-4M5-58V-4', pants, 7) + e(-5, -2, 5, 2.4, '#3A2F35') + e(5, -2, 5, 2.4, '#3A2F35')) + RR(f1(-12 * w), -100, f1(24 * w), 46, 8, shirt)
      + shade('M4-100H4Q12-100 12-92V-62Q12-54 4-54Z', 0.15) + ln(arm(-1, pa) + arm(1, pb), shirt, 6) + hs.map(([a, b]) => C(a, b, 3, skin)).join('')
      + (cup ? RR(hs[1][0] - 3, hs[1][1] - 9, 6, 8, 1, '#F4EEE2') + R(hs[1][0] - 3, hs[1][1] - 9, 6, 3, '#B8723A') : '') + (kid ? `<g transform="translate(0 -86) scale(.5)">${folk([[0, 0, 1, { ...kid, kid: null, nolegs: true, back: o.back, pose: kid.pose || 'both' }]])}</g>` : '')
      + R(-2.6, -108, 5.2, 9, skin) + e(0, -117, 7.4, 9, skin)
      + (o.back ? e(0, -118, 8, 10, hair) + e(-7.6, -116, 1.6, 2.4, skin) + e(7.6, -116, 1.6, 2.4, skin)
        : d('M-8-117Q-9-128 0-128.5Q9-128 8-117Q5-123 0-123Q-5-123-8-117Z', hair) + back + `<g transform="translate(${fx} 0)">` + C(-2.6, -117, 0.95, INK) + C(2.6, -117, 0.95, INK)
        + (laugh ? d('M-2.4-112.6Q0-108.8 2.4-112.6Z', '#7A3A34') : ln('M-2-112.4Q0-110.8 2-112.4', INK, 0.7)) + ln('M-4.6-114h0M4.6-114h0', '#D9776B', 2.4, ' opacity=".4"') + '</g>')
      + '</g>', flip); }).join('');
  /** Duit's eyes shining in the dark, for a sitting Duit at (x, y, s). */
  const duitEyes = (x, y, s = 1, pose = 'sit') => (pose === 'arch' ? [[15.9, -21.2], [19.9, -21]] : [[-1.8, -24.8], [1.8, -24.8]]).map(([dx, dy]) => C(x + dx * s, y + dy * s, f1(2.4 * s), '#E8F27A', ` opacity=".55" filter="url(#${pfx}b2)"`)
    + e(x + dx * s, y + dy * s, 1.3 * s, 1.5 * s, '#F2F7A0') + e(x + dx * s, y + dy * s, 0.35 * s, 1.2 * s, '#1B1430')).join('');
  const fg = { ots, hand, phone, duitPeek, bulbs: fgBulbs, crowd, awning, post, counter: fcounter, table, leaves, lantern: lanternU };

  /** A painterly grain over a whole panel; add last. */
  // Subtle on purpose: at phone size a stronger speckle read as a rash on skin. Books with a camera put it in the panel's
  // cam.fg, so it stays at screen scale and a close-up doesn't magnify it.
  const grain = () => `<rect width="320" height="200" filter="url(#${pfx}pt)" opacity=".32"/>`;
  /** A sticker (inner markup for a 64x64 viewBox) with its own grain filter. */
  const sticker = name => `<defs><filter id="${pfx}s-${name}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .1 0 0 0 0 .07 0 0 0 0 .05 0 0 0 -.8 .5"/><feComposite in2="SourceAlpha" operator="in" result="g"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="g"/></feMerge></filter></defs>`
    + e(32, 57, 17, 2.6, SH, ' opacity=".16"') + `<g filter="url(#${pfx}s-${name})">${it(name, 32, 31, 1.2)}</g>`;
  const BASE = () => `<clipPath id="${pfx}lo"><path d="M-90-64H90V40H-90Z"/></clipPath><clipPath id="${pfx}up"><path d="M-90-240H90V-58H-90Z"/></clipPath><radialGradient id="${pfx}pool"><stop offset=".08" stop-color="#0B0918" stop-opacity="0"/><stop offset=".2" stop-color="#0B0918" stop-opacity=".9"/><stop offset=".3" stop-color="#0B0918"/></radialGradient><clipPath id="${pfx}hn"><path d="M0-240H-90V40H0Z"/></clipPath><clipPath id="${pfx}hf"><path d="M-2-240H90V40H-2Z"/></clipPath><filter id="${pfx}bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter><filter id="${pfx}b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>`
    + `<filter id="${pfx}pt" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .1 0 0 0 0 .07 0 0 0 0 .05 0 0 0 -1.6 .78" result="g"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency=".03 .045" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 .93 0 0 0 0 .8 0 0 0 .42 -.2" result="m"/><feTurbulence type="fractalNoise" baseFrequency=".012 .3" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 .2 0 0 0 0 .14 0 0 0 0 .1 0 0 0 .5 -.26" result="s"/><feMerge><feMergeNode in="m"/><feMergeNode in="s"/><feMergeNode in="g"/></feMerge></filter>`
    + `<linearGradient id="${pfx}sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1E2340"/><stop offset=".62" stop-color="#463A55"/></linearGradient><linearGradient id="${pfx}road" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#3D3548"/><stop offset="1" stop-color="#4A3F4E"/></linearGradient>`;
  return {
    aina: person3('aina'), wei: person3('wei'), raju: person3('raju'), kamala: person3('kamala'), arjun: person3('arjun'), grace: person3('grace'), duit, scene, coffeeTable, grain, dark, rain, people, folk, duitEyes, sticker, it, priceTag, fg, skin: { aina: A.skin, wei: W.skin, raju: J.skin }, sleeve: { aina: A.arm, wei: W.shirt, raju: J.shirt },
    /** Everything the panels <use>: put it once in a hidden <svg><defs>…</defs></svg>. Call after drawing the panels. */
    defs: () => BASE() + [...defs.values()].join(''),
  };
}
