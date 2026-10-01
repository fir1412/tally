// November: "Pay Later" (Deepavali, Sunday 8 November 2026). Wei promises Arjun a bicycle and pays for her festive
// month "later"; four apps come knocking, Arjun starts saying "pay later" too, and she has three weeks to keep her
// promise the honest way. The script is notes/comic-story-11.md. Panel 30 is skipped in November (30 days).
import { castKit, it, priceTag, cash, written, notebookAmt } from './cast.js';

// Each panel has a camera (cam, see comic.js frame) chosen for its beat (the comic-cinematography skill). The street
// and every stall are one place for the shot checker (scene: 'market'), the porch is Raju and Kamala's house.
const K = castKit('b11-');
const { aina, wei, raju, duit, scene, fg } = K;
const kamala = K.kamala, arjun = K.arjun;
const NEW = '#B5533A'; // the apron the girls gave Uncle Raju in October
const SK = { aina: '#D9A27E', wei: '#E3B48E', raju: '#8E5B3E', kamala: '#8A5A3E', arjun: '#8E5B3E' };
/** Raju's apam balik stall; `behind` behind the counter, `items` on it. */
const apamStall = (behind, items = '') => scene('stall', { sign: 'APAM BALIK', steam: 112, behind, items: it('apambalik', 262, 114, 0.6) + it('apambalik', 58, 114, 0.6) + items });
/** A floor seen from above: the backdrop lifted so the floor fills the bottom of a high shot. */
const lifted = (art, dy, floor) => `<g transform="translate(0 ${-dy})">${art}</g><path d="M-10 ${200 - dy}H330V210H-10Z" fill="${floor}"/>`;
/** A marble kopitiam table top seen close, filling the bottom of the frame. */
const MARBLE = '<path d="M-10 128Q160 112 330 128V210H-10Z" fill="#EDE7DC"/><path d="M-10 128Q160 112 330 128V131Q160 115-10 131Z" fill="#FFFFFF" opacity=".5"/><path d="M30 160Q90 150 140 170M200 150Q250 146 300 160" stroke="#D9D0C2" stroke-width="1" fill="none"/>';
/** A wall calendar with a day circled. */
const cal = (x, y, day, s = 1) => `<g transform="translate(${x} ${y}) rotate(3) scale(${s})"><rect x="-12" y="-13" width="24" height="26" rx="1.5" fill="#F4EEE2"/><path d="M-12-13h24v7h-24z" fill="#8E2F4F"/>`
  + `<text x="0" y="9" font-family="system-ui,sans-serif" font-weight="800" font-size="11" text-anchor="middle" fill="#4A2E24">${day}</text><ellipse cx="0" cy="5" rx="9" ry="6.5" fill="none" stroke="#C44A36" stroke-width="1.3"/></g>`;
/** The second-hand bicycle stall's bikes in a row (the red one is Arjun's), and its sign. */
const BIKES = [[214, 170, '#4F6D8F'], [254, 172, '#5E8B4A'], [294, 170, '#D9A441']].map(([x, y, c]) => it('bicycle', x, y - 18, 1.5).replace(/#C44A36/g, c)).join('');
const SIGN = (x, y, t, w = 120) => `<rect x="${x - w / 2}" y="${y - 9}" width="${w}" height="18" rx="3" fill="#2F5D5A"/><text x="${x}" y="${y + 4.2}" font-family="system-ui,sans-serif" font-weight="800" font-size="10" text-anchor="middle" fill="#F4EEE2" textLength="${w - 12}" lengthAdjust="spacingAndGlyphs">${t}</text>`;
/** The front of the kopitiam's drinks counter (the reverse set), drawn over whoever stands behind it. */
const KCOUNTER = '<path d="M20 108H230V172H20Z" fill="#6E4533"/><path d="M16 102H234V110H16Z" fill="#8A5A3C"/><path d="M20 110H230V118H20Z" fill="#1B1430" opacity=".22"/>';
/** A plain wooden table top filling the frame (calm behind an insert). */
const WOOD = '<path d="M-10-10H330V210H-10Z" fill="#8A5A3C"/><path d="M-10 40Q160 30 330 46M-10 96Q160 88 330 102M-10 150Q160 142 330 158" stroke="#7A4E33" stroke-width="1.2" fill="none" opacity=".7"/>';
/** Buzz lines round a phone. */
const buzz = (x, y) => `<path d="M${x - 14} ${y - 8}q-4 8 0 16M${x - 19} ${y - 11}q-6 11 0 22M${x + 14} ${y - 8}q4 8 0 16M${x + 19} ${y - 11}q6 11 0 22" stroke="#F2C77A" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
/** A pay-later list with `n` lines struck through. */
const payList = n => it('list', 0, 0) + [-8, 0, 8].slice(0, n).map(y => `<path d="M-6 ${y}H11" stroke="#C44A36" stroke-width="1.6"/>`).join('');

const T = (en, ms, zh, zht, ja, ta) => ({ en, ms, zh, 'zh-Hant': zht, ja, ta });
const L = (who, ...t) => ({ who, text: T(...t) });
// Stickers checked for saving as a WhatsApp sticker (sticker-export.js): no amounts, QR codes, promo or pay-later look.
// Opt-in: a sticker added later stays unsaveable until it is checked and listed here. Left out: paylater (reads as a pay-later promotion) and salebag (30%).
const SHARE = new Set('calendar kurta kolamdots redbike claypot press agal packet newbike apambalik reminders savingstin sixmonths murukku balloon latefee jasmine payasam sorry phonefall budgetlist thoranam coconut adhirasam jalebi bell present kandil chart'.split(' '));
const stk = (id, en, ms, zh, zht, ja, ta, item = id) => ({ id, name: T(en, ms, zh, zht, ja, ta), svg: K.sticker(item), share: SHARE.has(id) });

const panels = [
  // ---- Act 1: the promise ----
  { // 1 Sun: the whole street. Over Wei's shoulder, mid-sip: Raju by the door with his arms up; Aina at a table, looking up at him.
    art: scene('kopitiam', { table: 168, behind: aina({ x: 168, y: 180, s: 0.92, face: 'happy', pose: 'kneel', turn: 'r', look: 'up' }) })
      + raju({ x: 252, y: 186, s: 1.06, face: 'laugh', pose: 'cheer', apron: NEW, flip: true, turn: 'l' }) + notebookAmt('', 242, 128, 0.3),
    cam: { shot: 'wide', on: [160, 100], fg: fg.hand(SK.wei, 'bottom', { x: 84, y: 130, s: 1.1, a: 34, hold: `<g transform="translate(86 100) rotate(-20) scale(1.6)">${it('teh', 0, 0)}</g>` }) + fg.ots('wei', 'left') },
    lines: [
      L('raju', 'Deepavali\'s next Sunday! Open house, and the whole street\'s invited!', 'Deepavali Ahad depan! Rumah terbuka, satu jalan uncle jemput!', '下个星期天就是屠妖节！开放门户，整条街都请！', '下個星期天就是屠妖節！開放門戶，整條街都請！', 'ディーパバリは来週の日曜！オープンハウスに、通りのみんなを招待だ！', 'அடுத்த ஞாயிறு தீபாவளி! பொது உபசரிப்பு, தெரு முழுக்கக் கூப்பிட்டாச்சு!'),
      L('wei', 'The whole street? That\'s two hundred people, Uncle.', 'Satu jalan? Tu dua ratus orang, Uncle.', '整条街？那是两百个人耶，叔叔。', '整條街？那是兩百個人耶，叔叔。', '通りのみんな？200人だよ、おじさん。', 'தெரு முழுக்கவா? அது இருநூறு பேர், மாமா.'),
      L('narrator', 'Nobody had told Kamala yet.', 'Belum ada siapa beritahu Kamala lagi.', '还没有人告诉Kamala。', '還沒有人告訴Kamala。', 'カマラはまだ、何も聞かされていなかった。', 'இன்னும் யாரும் கமலாவிடம் சொல்லவில்லை.'),
    ],
  },
  { // 2 Mon: over budget. From above: the wedding kurta big on its hanger near us, Wei with the new one glowing on her phone, Aina with the list.
    art: lifted(scene('home', { back: true }), 22, '#5A3A2E') + '<ellipse cx="170" cy="186" rx="150" ry="20" fill="#2F5D5A"/>'
      + wei({ x: 156, y: 182, s: 0.95, face: 'think', pose: 'kneel', turn: 'r' }) + '<circle cx="160" cy="148" r="16" fill="#BFE3F0" opacity=".35" filter="url(#b11-bl)"/>'
      + `<g transform="translate(160 150) rotate(-8)"><rect x="-8" y="-13" width="16" height="26" rx="2.6" fill="#2E2A36"/><rect x="-6.4" y="-10" width="12.8" height="19" rx="1" fill="#F4EEE2"/>${it('kurta', 0, -0.5, 0.26)}</g>`
      + aina({ x: 236, y: 196, s: 1.02, face: 'happy', pose: 'hold', item: 'list', is: 0.55, flip: true, turn: 'l', look: 'down' }),
    scene: 'home', cam: { shot: 'wide', on: [160, 80], angle: 'high', fg: '<path d="M40-4V12" stroke="#8A8378" stroke-width="2"/><path d="M14 22L40 8L66 22" stroke="#8A8378" stroke-width="2.4" fill="none"/>'
      + `<g transform="translate(40 76) scale(3.1)">${it('kurta', 0, 0).replace(/<path d="M0-22Q3-25[^>]*>/, '').replace(/#8E2F4F/g, '#2F6B66').replace(/#D9A441/g, '#D3D7DA')}</g>` + '<path d="M86 50l7-6M92 84h8M8 120l-6 4" stroke="#F2C77A" stroke-width="2.4" stroke-linecap="round"/>' },
    tip: T('Set a festive budget before the rush, and shop your wardrobe first.', 'Tetapkan bajet perayaan sebelum musim sibuk, dan tengok almari dulu.', '购物热潮前先定好节日预算，也先逛逛自己的衣柜。', '購物熱潮前先定好節日預算，也先逛逛自己的衣櫃。', '混む前にお祝いの予算を決めて、まず自分のクローゼットを見よう。', 'நெரிசலுக்கு முன்பே பண்டிகை பட்ஜெட் அமையுங்கள், முதலில் உங்கள் அலமாரியைப் பாருங்கள்.'),
    lines: [
      L('aina', 'Festive budget: RM80 each. Clothes, gift, everything.', 'Bajet perayaan: RM80 seorang. Baju, hadiah, semua sekali.', '节日预算：每人RM80。衣服、礼物，全包。', '節日預算：每人RM80。衣服、禮物，全包。', 'お祝いの予算は一人RM80。服もプレゼントも全部。', 'பண்டிகை பட்ஜெட்: ஆளுக்கு RM80. உடுப்பு, பரிசு, எல்லாம்.'),
      L('wei', 'This kurta is RM89. Over budget… unless?', 'Kurta ni RM89. Lebih bajet… melainkan?', '这件库尔塔要RM89。超预算了……除非？', '這件庫爾塔要RM89。超預算了……除非？', 'このクルタ、RM89。予算オーバー…でも、もしかして？', 'இந்த குர்தா RM89. பட்ஜெட்டுக்கு மேல… இல்லன்னா?'),
      L('aina', 'Or wear the one from the wedding. Worn once. Free.', 'Atau pakai yang dari kenduri kahwin tu. Pakai sekali je. Percuma.', '或者穿婚礼那件。只穿过一次。免费。', '或者穿婚禮那件。只穿過一次。免費。', 'それか、結婚式の服を着たら？一回着ただけ。タダ。', 'இல்லன்னா கல்யாணத்துக்குப் போட்டதைப் போடு. ஒரே தடவை போட்டது. இலவசம்.'),
    ],
  },
  { // 3 Tue: the first "only". One tap.
    art: `<g filter="url(#b11-b2)">${scene('home')}</g>`, scene: 'home',
    cam: { shot: 'insert', on: [200, 110], fg: fg.phone([['Kurta', 'RM89.00'], ['PAY LATER · 3 × RM29.67', '', 'btn']], 84, 'Checkout', SK.wei, -4, 'Shop')
      + fg.hand(SK.wei, 'bottom', { x: 206, y: 212, s: 1.2, a: -22, point: true }) },
    lines: [
      L('wei', 'Pay later! Only RM30 a month!', 'Pay later! RM30 sebulan je!', '先买后付！每个月才RM30！', '先買後付！每個月才RM30！', '後払い！月たったRM30！', 'Pay later! மாசத்துக்கு RM30 தான்!'),
      L('narrator', '…said Wei. Her first \'only\' of the month.', '…kata Wei. ‘Je’ yang pertama bulan ini.', '……Wei说。这是她这个月第一个“才”。', '……Wei說。這是她這個月第一個「才」。', '…とウェイ。今月最初の「たった」だ。', '…என்றாள் வெய். இந்த மாதத்தின் முதல் ‘தான்’.'),
      L('aina', 'Wei. That\'s still RM89.', 'Wei. Tu tetap RM89.', 'Wei，那还是RM89。', 'Wei，那還是RM89。', 'ウェイ。それでもRM89だよ。', 'வெய். அதுவும் RM89 தான்.'),
    ],
  },
  { // 4 Wed: the real boss. Low: Kamala towers, hands on hips; Raju shrinks; Arjun bent over his kolam.
    art: `<g transform="translate(0 56)">${scene('porch', { day: true })}</g><path d="M-10-10H330V58H-10Z" fill="#E2C79C"/><path d="M-10-10H330V8H-10Z" fill="#5A3A2E"/>`
      + '<path d="M-10 8Q160 40 330 8" stroke="#3B5A2A" stroke-width="1" fill="none"/>' + Array.from({ length: 13 }, (_, i) => { const x = 4 + i * 26, y = 9 + 2 * 32 * (x / 320) * (1 - x / 320) * 2; return `<path d="M${x - 7} ${y}h14l-7 12Z" fill="${['#E08A2E', '#C44A36', '#2F6B66', '#D9A441'][i % 4]}"/>`; }).join('')
      + raju({ x: 176, y: 252, s: 1.18, face: 'worried', pose: 'chin', apron: NEW, flip: true, turn: 'l', look: 'down' }) + kamala({ x: 250, y: 280, s: 1.62, face: 'surprised', pose: 'hips', flip: true, turn: 'l' })
      + arjun({ x: 84, y: 214, s: 1.3, face: 'laugh', pose: 'hold', item: 'flour', is: 0.4, turn: 'r', bend: 22 }),
    scene: 'porch', cam: { shot: 'wide', on: [160, 136], angle: 'low', fg: `<g transform="translate(150 194) scale(3 .7)">${it('kolamdots', 0, 0)}</g>` },
    lines: [
      L('raju', 'Meet Kamala, the real boss of this house!', 'Kenalkan Kamala, bos sebenar rumah ni!', '这是Kamala，这个家真正的老大！', '這是Kamala，這個家真正的老大！', 'カマラだ。この家の本当のボスさ！', 'இவ தான் கமலா, இந்த வீட்டோட உண்மையான முதலாளி!'),
      L('kamala', 'Two hundred guests, Raju? TWO HUNDRED?', 'Dua ratus tetamu, Raju? DUA RATUS?', '两百个客人，Raju？两、百、个？', '兩百個客人，Raju？兩、百、個？', 'お客が200人、ラジュ？200人！？', 'இருநூறு விருந்தாளிங்களா, ராஜு? இருநூறா?'),
      L('arjun', 'I\'m drawing the peacock!', 'Saya lukis burung merak!', '我来画孔雀！', '我來畫孔雀！', 'ぼくはクジャクを描く！', 'நான் மயில் போடறேன்!'),
    ],
  },
  { // 5 Thu: WHOOSH. The market opens wide: Raju's stall and its QR stand on the left, the BASIKAL TERPAKAI stall on the right, Arjun hugging the red bike.
    art: scene('street') + SIGN(58, 38, 'APAM BALIK', 70) + it('qrnew', 102, 106, 0.3) + SIGN(252, 52, 'BASIKAL TERPAKAI', 118) + BIKES
      + K.folk([[296, 186, 0.8, { shirt: '#4F7A9A', skin: '#B07A54', pose: 'hip', turn: -1, flip: true, laugh: true }]])
      + aina({ x: 112, y: 176, s: 0.78, face: 'happy', turn: 'r', pose: 'rest' }) + arjun({ x: 222, y: 194, s: 1.14, face: 'laugh', pose: 'give', flip: true, turn: 'l' })
      + it('bicycle', 206, 182, 2.4) + priceTag('RM120', 244, 150, 0.95) + wei({ x: 150, y: 206, s: 1.14, face: 'laugh', turn: 'r', look: 'down', pose: 'gesture' }),
    scene: 'market', cam: { shot: 'wide', on: [160, 100], fg: fg.bulbs() + fg.crowd('left', 'pair') },
    lines: [
      L('arjun', 'Akka Wei, look! A red one! It goes WHOOSH.', 'Akka Wei, tengok! Yang merah! Dia pergi WHOOSH.', 'Wei姐姐，你看！红色的！骑起来咻——的。', 'Wei姐姐，你看！紅色的！騎起來咻——的。', 'ウェイお姉ちゃん、見て！赤いの！ビューンって走るんだ。', 'வெய் அக்கா, பாருங்க! சிவப்பு! அது விர்ர்ர்னு போகும்.'),
      L('wei', 'It\'s perfect. Are you buying it?', 'Cantik sangat. Nak beli ke?', '太完美了。你要买吗？', '太完美了。你要買嗎？', '最高だね。買うの？', 'சூப்பரா இருக்கு. வாங்கப் போறியா?'),
      L('arjun', 'When I\'m rich. I\'m saving my packets.', 'Bila saya dah kaya. Saya tengah simpan duit sampul.', '等我有钱的时候。我在存红包钱。', '等我有錢的時候。我在存紅包錢。', 'お金持ちになったらね。お祝い袋のお金、貯めてるんだ。', 'நான் பணக்காரன் ஆனதும். என் அங்பாவ் காசைச் சேர்த்து வைக்கிறேன்.'),
    ],
  },
  { // 6 Fri: Raju. / …Kamala. Face to face on the porch, Kamala holding his notebook up at him; Raju sheepish.
    art: scene('porch', { day: true }) + raju({ x: 194, y: 192, s: 0.98, face: 'worried', pose: 'chin', apron: NEW, flip: true, turn: 'l' })
      + kamala({ x: 150, y: 198, s: 1.04, face: 'think', pose: 'wave', turn: 'r', inHand: notebookAmt('', 0, 4, 0.5) }),
    cam: { shot: 'medium', on: [168, 110] },
    tip: T('Hosting? Share the load: each family brings a dish.', 'Jadi tuan rumah? Kongsi beban: setiap keluarga bawa satu lauk.', '要请客？大家分担：每家带一道菜。', '要請客？大家分擔：每家帶一道菜。', 'おもてなしするなら、分担しよう。各家庭が一品ずつ。', 'விருந்து வைக்கிறீர்களா? சுமையைப் பகிருங்கள்: ஒவ்வொரு குடும்பமும் ஒரு உணவு.'),
    lines: [
      L('kamala', 'Two hundred plates is about RM1,000. Raju.', 'Dua ratus pinggan, lebih kurang RM1,000. Raju.', '两百份，大概要RM1,000。Raju。', '兩百份，大概要RM1,000。Raju。', '200人分で、だいたいRM1,000。ラジュ。', 'இருநூறு தட்டு, சுமார் RM1,000. ராஜு.'),
      L('raju', '…Kamala.', '…Kamala.', '……Kamala。', '……Kamala。', '…カマラ。', '…கமலா.'),
      L('kamala', 'So my sisters each bring a dish. And so do the neighbours.', 'Jadi adik-beradik aunty bawa satu lauk seorang. Jiran-jiran pun sama.', '所以我的姐妹每人带一道菜。邻居们也一样。', '所以我的姐妹每人帶一道菜。鄰居們也一樣。', 'だから姉妹がそれぞれ一品ずつ。ご近所さんもね。', 'அதனால என் தங்கச்சிங்க ஆளுக்கு ஒரு கறி கொண்டு வருவாங்க. அக்கம்பக்கத்தாரும் தான்.'),
    ],
  },
  { // 7 Sat evening: the October jar. Hands at the murukku press over the pot; Aina sets out the agal behind.
    art: `<g filter="url(#b11-b2)">${scene('porch')}</g>` + '<path d="M60 150H260V200H60Z" fill="#6E4533"/><path d="M60 150H260V154H60Z" fill="#8A5A3C"/>'
      + it('bowl', 150, 140, 1.5) + it('murukku', 150, 128, 0.7) + it('murukku', 172, 132, 0.5) + it('agal', 236, 144, 0.55) + it('jarDempty', 108, 130, 0.62),
    scene: 'porch', cam: { shot: 'close', on: [160, 118], fg: fg.hand(SK.kamala, 'top', { x: 172, y: 70, s: 1.3, a: 10, sleeve: '#8E2F4F', hold: `<g transform="translate(166 66) scale(1.6)">${it('press', 0, 0)}</g>` })
      + fg.hand(SK.aina, 'right', { x: 300, y: 100, s: 1.1, a: -14, sleeve: '#29605B', hold: it('agal', 262, 92, 0.9) }) },
    tip: T('Making it yourself can cost less. Count your time, too.', 'Buat sendiri boleh jimat. Kira juga masa anda.', '自己做可以省钱，但也要算上时间。', '自己做可以省錢，但也要算上時間。', '手作りは安くなることも。かかる時間も考えよう。', 'நீங்களே செய்தால் செலவு குறையலாம். உங்கள் நேரத்தையும் கணக்கிடுங்கள்.'),
    lines: [
      L('kamala', 'From the shop: RM25 a tin. Ours: about RM9.', 'Kat kedai: RM25 satu tin. Kita buat: lebih kurang RM9.', '店里买：一罐RM25。我们自己做：大约RM9。', '店裡買：一罐RM25。我們自己做：大約RM9。', 'お店なら一缶RM25。うちのは約RM9。', 'கடையில: ஒரு டின் RM25. நம்மளோடது: சுமார் RM9.'),
      L('aina', 'Paid from our October jar. RM6 left in it.', 'Bayar guna balang Oktober kami. Tinggal RM6.', '用我们十月的罐子付的。还剩RM6。', '用我們十月的罐子付的。還剩RM6。', '10月のびんから払った。残りはRM6。', 'எங்க அக்டோபர் ஜாடியிலிருந்து கட்டினோம். அதுல RM6 மிச்சம்.'),
      L('narrator', 'Tomorrow, the whole street was coming.', 'Esok, satu jalan akan datang.', '明天，整条街的人都要来。', '明天，整條街的人都要來。', '明日は、通りじゅうの人がやって来る。', 'நாளை, தெரு முழுவதும் வரப்போகிறது.'),
    ],
  },
  { // 8 Sun night: DEEPAVALI. Through the crowd: Wei on one knee to Arjun, arms wide; Kamala in the lit doorway, hearing it.
    art: scene('porch') + K.folk([[244, 172, 0.66, { shirt: '#D9A441', skin: '#B07A54', pose: 'clap', laugh: true, flip: true, turn: -1 }], [100, 170, 0.64, { shirt: '#4F7A9A', skin: '#8E5B3E', pose: 'up', cup: true, turn: 1 }]])
      + kamala({ x: 160, y: 166, s: 0.8, face: 'surprised', pose: 'mouth', turn: 'r', look: 'down' })
      + raju({ x: 72, y: 188, s: 0.96, face: 'laugh', pose: 'cheer', apron: NEW, turn: 'r' }) + aina({ x: 120, y: 184, s: 0.86, face: 'laugh', pose: 'hold', item: 'murukku', is: 0.5, turn: 'r' })
      + `<g transform="translate(176 190) scale(1.5 .45)">${it('kolam', 0, 0)}</g>`
      + arjun({ x: 178, y: 196, s: 1.08, face: 'laugh', pose: 'cheer', turn: 'r' }) + wei({ x: 222, y: 198, s: 1.04, face: 'laugh', pose: 'kneelopen', flip: true, turn: 'l' }),
    cam: { shot: 'wide', on: [160, 100], drift: 'out', fg: fg.lantern(22, 30, 0.8) + fg.lantern(298, 30, 0.8)
      + K.folk([[22, 236, 1.3, { shirt: '#8E2F4F', back: true }], [300, 230, 1.22, { shirt: '#2F6B66', hair: '#D3CCC2', back: true }]]) },
    lines: [
      L('raju', 'Happy Deepavali! Come in, everyone, come in!', 'Selamat Hari Deepavali! Masuk, semua, masuk!', '屠妖节快乐！大家进来，进来！', '屠妖節快樂！大家進來，進來！', 'ディーパバリおめでとう！みんな、さあ入って、入って！', 'தீபாவளி வாழ்த்துகள்! எல்லாரும் உள்ளே வாங்க, வாங்க!'),
      L('wei', 'Arjun! That bicycle? For your birthday, it\'s on me!', 'Arjun! Basikal tu? Hari jadi nanti, Akka belanja!', 'Arjun！那辆脚车？你生日，我送你！', 'Arjun！那輛腳車？你生日，我送你！', 'アルジュン！あの自転車？誕生日に、私が買ってあげる！', 'அர்ஜுன்! அந்த சைக்கிள்? உன் பிறந்தநாளுக்கு, நான் வாங்கித் தரேன்!'),
      L('narrator', 'Arjun\'s birthday: the 29th. Wei\'s bank: RM62.', 'Hari jadi Arjun: 29 hari bulan. Duit Wei dalam bank: RM62.', 'Arjun的生日：29号。Wei的银行户口：RM62。', 'Arjun的生日：29號。Wei的銀行戶口：RM62。', 'アルジュンの誕生日は29日。ウェイの口座は、RM62。', 'அர்ஜுனின் பிறந்தநாள்: 29-ஆம் தேதி. வெய்யின் வங்கியில்: RM62.'),
    ],
  },
  // ---- Act 2A: only RM58 ----
  { // 9 Mon: promises cost money. The boy's real money, fanned over his tin.
    art: WOOD + it('tin', 186, 116, 0.5) + '<rect x="176" y="116" width="20" height="8" rx="1" fill="#F4EEE2"/>' + written('RM43', 186, 120, 0.3, '#3B2723'),
    scene: 'porch', cam: { shot: 'insert', on: [172, 118], angle: 'high', fg: fg.hand(SK.arjun, 'bottom', { x: 112, y: 160, s: 1.1, a: 22, sleeve: '#4F7A9A',
      hold: [[-30, 0], [-12, 1], [6, 2], [24, 3]].map(([r, i]) => `<g transform="translate(${100 + i * 6} 162) rotate(${r})">${it('packet', 0, -26, 1.3)}</g>`).join('') }) },
    tip: T('Help kids save part of their festive packets for something they want.', 'Bantu anak-anak simpan sebahagian duit sampul untuk benda yang mereka mahu.', '帮孩子把一部分红包存起来，买自己想要的东西。', '幫孩子把一部分紅包存起來，買自己想要的東西。', '子どもがお祝い袋の一部を、欲しいもののために貯められるよう手伝おう。', 'பிள்ளைகள் தங்கள் அங்பாவ் பணத்தில் ஒரு பகுதியை விரும்பியதற்காகச் சேமிக்க உதவுங்கள்.'),
    lines: [
      L('arjun', 'RM43 in packets! All for my bicycle!', 'RM43 duit sampul! Semua untuk basikal saya!', '红包有RM43！全部存来买脚车！', '紅包有RM43！全部存來買腳車！', 'お祝い袋でRM43！全部自転車用！', 'அங்பாவ்ல RM43! எல்லாம் என் சைக்கிளுக்கு!'),
      L('wei', 'Keep it, Arjun. The bicycle\'s on me, remember?', 'Simpan je, Arjun. Basikal tu Akka belanja, ingat?', '你留着吧，Arjun。脚车我送你，记得吗？', '你留著吧，Arjun。腳車我送你，記得嗎？', '取っておいて、アルジュン。自転車は私からでしょ？', 'அதை வச்சுக்கோ, அர்ஜுன். சைக்கிள் நான் வாங்கித் தரேன், ஞாபகம் இருக்கா?'),
      L('kamala', 'Wei. Promises cost money too.', 'Wei. Janji pun ada harganya.', 'Wei，承诺也是要花钱的。', 'Wei，承諾也是要花錢的。', 'ウェイ。約束にもお金がかかるのよ。', 'வெய். வாக்குறுதிக்கும் காசு ஆகும்.'),
    ],
  },
  { // 10 Tue: brand new. The wrong bike looks huge and perfect; Wei small beside it.
    art: scene('shop', { bikes: true, sign: 'BASIKAL' }) + '<circle cx="210" cy="132" r="56" fill="#FFF1D0" opacity=".45" filter="url(#b11-bl)"/>'
      + it('bicycle', 210, 142, 3.4) + '<path d="M176 108l4-4M232 100l5-3M246 128l6 0M184 160l-4 4" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/>' + priceTag('RM350', 262, 96, 1.05)
      + wei({ x: 108, y: 182, s: 0.82, face: 'laugh', pose: 'hold', item: 'phone', is: 0.5, turn: 'r', look: 'up' }),
    cam: { shot: 'wide', on: [160, 100] },
    lines: [
      L('wei', 'Second-hand? No way. Arjun deserves brand new.', 'Terpakai? Tak naklah. Arjun layak dapat yang baru.', '二手的？不行。Arjun值得全新的。', '二手的？不行。Arjun值得全新的。', '中古？ありえない。アルジュンには新品がふさわしい。', 'Second-hand-ஆ? முடியாது. அர்ஜுனுக்குப் புத்தம் புதுசு தான்.'),
      L('wei', 'RM350, or only RM58 a month!', 'RM350, atau RM58 sebulan je!', 'RM350，或者每个月才RM58！', 'RM350，或者每個月才RM58！', 'RM350、または月たったRM58！', 'RM350, இல்லன்னா மாசத்துக்கு RM58 தான்!'),
      L('narrator', 'Ordered, on pay later. Delivery: the 28th.', 'Dah dipesan guna pay later. Penghantaran: 28 hari bulan.', '下单了，先买后付。送货：28号。', '下單了，先買後付。送貨：28號。', '後払いで注文。配達は28日。', 'Pay later-ல ஆர்டர் ஆனது. டெலிவரி: 28-ஆம் தேதி.'),
    ],
  },
  { // 11 Wed midnight: 11.11. A dark room, Wei tiny in her phone's glow, Aina in the doorway.
    art: lifted(scene('home', { back: true }), 22, '#5A3A2E') + '<ellipse cx="226" cy="168" rx="28" ry="12" fill="#B5533A"/>'
      + wei({ x: 228, y: 176, s: 0.8, face: 'happy', pose: 'kneel', flip: true, turn: 'l', look: 'down' }) + it('phone', 220, 156, 0.26)
      + aina({ x: 58, y: 142, s: 0.76, face: 'think', turn: 'r' }) + K.dark([222, 120], 0.72, 46, 22),
    scene: 'home', cam: { shot: 'wide', on: [160, 80], angle: 'high', fg: `<g transform="translate(104 -26) scale(.6)">${fg.phone([['Earbuds', 'RM20/mo'], ['PAY LATER', '', 'btn'], ['Shoes', 'RM25/mo'], ['PAY LATER', '', 'btn']], 0, 'My list', 'none', -4, '11.11 SALE')}</g>` },
    tip: T('List what you need before a sale. Discounted extras still cost money.', 'Senaraikan keperluan sebelum jualan. Barang lebih yang didiskaun tetap makan duit.', '促销前先列出需要的东西。打折的多余东西也还是花钱。', '促銷前先列出需要的東西。打折的多餘東西也還是花錢。', 'セール前に必要なものを書き出そう。割引でも、余計なものは出費。', 'Sale-க்கு முன் தேவையானதைப் பட்டியலிடுங்கள். கழிவில் வாங்கும் தேவையற்றதும் செலவுதான்.'),
    lines: [
      L('wei', '11.11 sale! Earbuds, only RM20 a month!', 'Jualan 11.11! Earbuds, RM20 sebulan je!', '11.11大促！耳机，每个月才RM20！', '11.11大促！耳機，每個月才RM20！', '11.11セール！イヤホンが月たったRM20！', '11.11 sale! Earbuds, மாசத்துக்கு RM20 தான்!'),
      L('aina', 'Are earbuds on your list?', 'Earbuds ada dalam senarai kau?', '耳机在你的清单上吗？', '耳機在你的清單上嗎？', 'イヤホンって、リストにあった？', 'Earbuds உன் பட்டியல்ல இருக்கா?'),
      L('wei', 'My list is… also on pay later.', 'Senarai aku… pun pay later.', '我的清单……也是先买后付的。', '我的清單……也是先買後付的。', '私のリストも…後払いなの。', 'என் பட்டியலும்… pay later-ல தான்.'),
    ],
  },
  { // 12 Thu: I'll pay later! Arjun on tiptoe at the counter, Raju leaning over, Wei frozen mid-bite behind him.
    art: apamStall(raju({ x: 190, y: 164, s: 0.86, face: 'surprised', apron: NEW, flip: true, turn: 'l', bend: 14 }), it('qrnew', 236, 106, 0.4))
      + arjun({ x: 150, y: 170, s: 1.05, face: 'laugh', pose: 'point', turn: 'r', look: 'up' })
      + wei({ x: 96, y: 206, s: 1.18, face: 'surprised', pose: 'mouth', turn: 'r' }) + it('apambalik', 99, 86, 0.28),
    scene: 'market', cam: { shot: 'medium', on: [150, 100] },
    lines: [
      L('arjun', 'Thatha, two apam balik please. I\'ll pay later!', 'Thatha, apam balik dua. Saya pay later!', '爷爷，两个曼煎糕。我先买后付！', '爺爺，兩個曼煎糕。我先買後付！', 'おじいちゃん、アパム・バリック2つ。後払いで！', 'தாத்தா, ரெண்டு அப்பம் பாலிக். நான் pay later பண்றேன்!'),
      L('raju', 'Pay later? Who taught you that?', 'Pay later? Siapa ajar ni?', '先买后付？谁教你的？', '先買後付？誰教你的？', '後払い？誰に教わったんだ？', 'Pay later-ஆ? யார் சொல்லிக் குடுத்தா?'),
      L('arjun', 'Akka Wei!', 'Akka Wei!', 'Wei姐姐！', 'Wei姐姐！', 'ウェイお姉ちゃん！', 'வெய் அக்கா!'),
    ],
  },
  { // 13 Fri, same night: …Later. Four reminders, her thumb swiping them away.
    art: scene('street') + wei({ x: 214, y: 196, s: 1.05, face: 'think', turn: 'l', flip: true, look: 'down' }),
    scene: 'market', cam: { shot: 'close', on: [190, 96], fg: `<g transform="translate(0 -40)">${fg.phone([['Kurta', 'Due!', 1], ['Bicycle', 'Due!', 1], ['Earbuds', 'Due!', 1], ['Shoes', 'Due!', 1]], 4, '4 reminders', SK.wei, -6, 'Pay later')}</g>` },
    lines: [
      L('narrator', 'That night, four apps sent reminders.', 'Malam itu, empat aplikasi hantar peringatan.', '那天晚上，四个app都发来了提醒。', '那天晚上，四個app都發來了提醒。', 'その夜、4つのアプリから支払いの通知が来た。', 'அன்றிரவு, நான்கு app-களிலிருந்து நினைவூட்டல்கள் வந்தன.'),
      L('wei', '…Later.', '…Nanti.', '……等下再说。', '……等下再說。', '…あとで。', '…அப்புறம்.'),
    ],
  },
  { // 14 Sat: the tin. Kamala and Aina lean in over it; Wei at the edge, phone face down.
    art: scene('kopitiam', { back: true }) + `<g transform="rotate(6 140 196)">${kamala({ x: 140, y: 196, s: 1.04, face: 'happy', pose: 'hold', item: 'tin', is: 0.95, turn: 'r' })}</g>`
      + `<g transform="rotate(-10 196 196)">${aina({ x: 196, y: 196, s: 1, face: 'laugh', flip: true, turn: 'l' })}</g>`
      + '<path d="M60 150Q160 140 260 150L268 176Q160 166 52 176Z" fill="#EDE7DC"/><path d="M52 176Q160 166 268 176V200H52Z" fill="#D9D0C2"/>'
      + `<g transform="rotate(5 254 222)">${wei({ x: 254, y: 222, s: 1.4, face: 'worried', pose: 'hold', item: '<rect x="-9" y="-16" width="18" height="32" rx="3" fill="#2E2A36"/>', is: 0.5, turn: 'r', look: 'down' })}</g>`,
    scene: 'kopitiam', cam: { shot: 'medium', on: [176, 108] },
    tip: T('Save for festivals a little every month, so they never hurt.', 'Simpan untuk perayaan sikit setiap bulan, supaya tak membebankan.', '每个月为节日存一点，过节就不伤荷包。', '每個月為節日存一點，過節就不傷荷包。', 'お祭りのために毎月少しずつ貯めれば、困らない。', 'பண்டிகைகளுக்காக மாதந்தோறும் கொஞ்சம் சேமியுங்கள், அவை சுமையாகாது.'),
    lines: [
      L('kamala', 'I save in this tin all year. So Deepavali never hurts.', 'Aunty simpan dalam tin ni sepanjang tahun. Jadi Deepavali tak pernah membebankan.', '我一整年都存在这个罐子里。所以屠妖节从来不伤荷包。', '我一整年都存在這個罐子裡。所以屠妖節從來不傷荷包。', '一年中この缶に貯めてるの。だからディーパバリで困らない。', 'நான் வருஷம் முழுக்க இந்த டின்னுல சேமிப்பேன். அதனால தீபாவளி சுமையா இருக்காது.'),
      L('aina', 'Like our jar! Mine\'s an emergency fund: RM860 so far.', 'Macam balang kami! Saya punya tabung kecemasan: setakat ni RM860.', '就像我们的罐子！我的是应急基金：目前RM860。', '就像我們的罐子！我的是應急基金：目前RM860。', '私たちのびんみたい！私のは緊急用の貯金で、今RM860。', 'எங்க ஜாடி மாதிரி! என்னோடது அவசரகால நிதி: இதுவரை RM860.'),
      L('narrator', 'Wei\'s phone buzzed. She didn\'t look.', 'Telefon Wei bergetar. Dia tak tengok pun.', 'Wei的手机震了一下。她没看。', 'Wei的手機震了一下。她沒看。', 'ウェイのスマホが震えた。彼女は見なかった。', 'வெய்யின் phone அதிர்ந்தது. அவள் பார்க்கவில்லை.'),
    ],
  },
  // ---- Midpoint ----
  { // 15 Sun night: RM133 a month. Alone on the floor, adding it up; Duit watching from the shelf.
    art: lifted(scene('home', { back: true }), 18, '#5A3A2E') + duit({ x: 270, y: 110, s: 0.62, face: 'surprised', flip: true })
      + wei({ x: 214, y: 182, s: 0.92, face: 'worried', pose: 'kneel', flip: true, turn: 'l', look: 'down' }),
    scene: 'home', cam: { shot: 'medium', on: [196, 124], angle: 'high', fg: `<g transform="translate(0 -58)">${fg.phone([['Kurta', 'RM29.67'], ['Bicycle', 'RM58.00'], ['Earbuds', 'RM20.00'], ['Shoes', 'RM25.33'], ['A month', 'RM133', 'total']], 0, 'Every month, 6 months', SK.wei, -3, 'Pay later')}</g>` },
    lines: [
      L('wei', 'Four apps. RM133 a month, for six months.', 'Empat aplikasi. RM133 sebulan, selama enam bulan.', '四个app。每个月RM133，要六个月。', '四個app。每個月RM133，要六個月。', 'アプリ4つ。月RM133を、6か月。', 'நாலு app. மாசத்துக்கு RM133, ஆறு மாசம்.'),
      L('wei', 'After October? Aina can never know.', 'Lepas Oktober, jadi macam ni? Aina tak boleh tahu langsung.', '十月之后还这样？绝对不能让Aina知道。', '十月之後還這樣？絕對不能讓Aina知道。', '10月のあとで、これ？アイナには絶対言えない。', 'அக்டோபருக்கு அப்புறமும் இப்படியா? ஐனாவுக்குத் தெரியவே கூடாது.'),
      L('duit', '…Meow.', '…Meow.', '……喵。', '……喵。', '…ニャー。', '…மியாவ்.'),
    ],
  },
  // ---- Act 2B: hiding ----
  { // 16 Mon: spam. The cat sits on the secret.
    art: scene('home', { day: true }) + '<path d="M120 150H260V200H120Z" fill="#A9503A"/>' + '<ellipse cx="166" cy="146" rx="30" ry="9" fill="#F2C77A" opacity=".5" filter="url(#b11-b2)"/>'
      + `<g transform="translate(196 150) rotate(-80)">${it('phone', 0, 0, 0.55)}</g><circle cx="206" cy="146" r="3" fill="#C44A36"/>` + duit({ x: 168, y: 152, s: 1.25, pose: 'sleep' }) + buzz(166, 140),
    cam: { shot: 'xclose', on: [168, 138] },
    lines: [
      L('aina', 'Wei, your phone\'s buzzing under Duit. Again.', 'Wei, telefon kau bergetar bawah Duit. Lagi.', 'Wei，你的手机在Duit下面震。又来了。', 'Wei，你的手機在Duit下面震。又來了。', 'ウェイ、ドゥイットの下でスマホが震えてる。また。', 'வெய், துயிட்டுக்கு அடியில உன் phone அதிருது. மறுபடியும்.'),
      L('wei', 'Spam! Just spam.', 'Spam! Spam je.', '垃圾讯息！只是垃圾讯息。', '垃圾訊息！只是垃圾訊息。', '迷惑メール！ただの迷惑メール。', 'Spam! வெறும் spam தான்.'),
      L('duit', 'Meow.', 'Meow.', '喵。', '喵。', 'ニャー。', 'மியாவ்.'),
    ],
  },
  { // 17 Tue: just family. Close: Raju pinning up a balloon, Kamala's folded arms near us, Wei too cheerful with a thumbs-up.
    art: scene('kopitiam', { back: true }) + raju({ x: 164, y: 184, s: 0.9, face: 'laugh', pose: 'wave', apron: NEW, turn: 'r' }) + it('balloon', 186, 56, 0.7)
      + wei({ x: 222, y: 214, s: 1.18, face: 'laugh', pose: 'thumbs', flip: true, turn: 'l' }) + kamala({ x: 104, y: 252, s: 1.55, face: 'think', pose: 'cross', turn: 'r' }),
    scene: 'kopitiam', cam: { shot: 'medium', on: [160, 112] },
    lines: [
      L('raju', 'Arjun\'s party here on the 29th. Just family!', 'Parti Arjun kat sini 29 hari bulan. Keluarga je!', '29号在这里办Arjun的生日会。只请家人！', '29號在這裡辦Arjun的生日會。只請家人！', '29日にここでアルジュンのパーティー。家族だけだよ！', '29-ஆம் தேதி இங்கே அர்ஜுனோட party. குடும்பம் மட்டும்!'),
      L('kamala', 'Raju. Your \'family\' is two hundred people.', 'Raju. ‘Keluarga’ awak tu dua ratus orang.', 'Raju，你的“家人”有两百个。', 'Raju，你的「家人」有兩百個。', 'ラジュ。あなたの「家族」は200人よ。', 'ராஜு. உங்க ‘குடும்பம்’ இருநூறு பேர்.'),
      L('wei', 'And his present is on its way!', 'Dan hadiah dia tengah dalam perjalanan!', '他的礼物也已经在路上了！', '他的禮物也已經在路上了！', 'プレゼントも、もうすぐ届くよ！', 'அவனோட பரிசும் வந்துக்கிட்டிருக்கு!'),
    ],
  },
  { // 18 Wed: RM10. The first real cost, in numbers, her teh untouched.
    art: scene('kopitiam', { table: false }) + MARBLE + it('teh', 182, 138, 0.55),
    scene: 'kopitiam', cam: { shot: 'insert', on: [150, 150], fg: fg.phone([['Kurta', 'RM29.67'], ['Late fee', 'RM10.00', 1]], 92, 'Overdue', 'none', -14, 'Pay later') },
    tip: T('Pay later has due dates, and late fees can apply. Note every one.', 'Pay later ada tarikh akhir, dan caj lewat boleh dikenakan. Catat setiap satu.', '先买后付有到期日，逾期可能要付逾期费。每一笔都记下来。', '先買後付有到期日，逾期可能要付逾期費。每一筆都記下來。', '後払いには期日があり、延滞料がかかることも。全部メモしよう。', 'Pay later-க்குக் கடைசித் தேதிகள் உண்டு, தாமதக் கட்டணமும் விதிக்கப்படலாம். ஒவ்வொன்றையும் குறித்து வையுங்கள்.'),
    lines: [
      L('wei', 'A RM10 late fee? I was one day late!', 'Caj lewat RM10? Aku lambat sehari je!', '逾期费RM10？我才迟了一天！', '逾期費RM10？我才遲了一天！', '延滞料RM10？1日遅れただけなのに！', 'RM10 late fee-ஆ? நான் ஒரு நாள் தான் லேட்!'),
      L('narrator', 'The RM89 kurta had now cost RM99.', 'Kurta RM89 tu kini dah jadi RM99.', '那件RM89的库尔塔，现在花了RM99。', '那件RM89的庫爾塔，現在花了RM99。', 'RM89のクルタは、これでRM99になった。', 'RM89 குர்தா இப்போது RM99 ஆகிவிட்டது.'),
    ],
  },
  { // 19 Thu: this one goes WHOOSH. Back at the bike stall from the seller's side; Arjun's hand on the red saddle, Wei a step behind.
    art: scene('stall', { sign: 'BASIKAL TERPAKAI', a: '#2F5D5A', behind: K.folk([[208, 166, 0.86, { shirt: '#6E4533', skin: '#B07A54', hair: '#D3CCC2', pose: 'point', flip: true, laugh: true, turn: -1 }]]) })
      + arjun({ x: 162, y: 191, s: 1.1, face: 'happy', pose: 'rest', flip: true, turn: 'l', look: 'up' }) + it('bicycle', 150, 168, 2.3) + priceTag('RM120', 116, 138, 0.8)
      + '<ellipse cx="142" cy="143" rx="4" ry="2.8" fill="#8E5B3E"/>' + wei({ x: 52, y: 262, s: 1.7, face: 'surprised', turn: 'r', pose: 'mouth', look: 'down' }),
    scene: 'market', cam: { shot: 'wide', on: [160, 100], fg: fg.bulbs() },
    lines: [
      L('arjun', 'Uncle, keep the red one till Christmas? I\'ve saved RM43!', 'Uncle, simpan yang merah sampai Krismas? Saya dah simpan RM43!', '叔叔，红色那辆可以留到圣诞节吗？我存了RM43！', '叔叔，紅色那輛可以留到聖誕節嗎？我存了RM43！', 'おじさん、赤いの、クリスマスまで取っておいて？RM43貯めたんだ！', 'மாமா, சிவப்பைக் கிறிஸ்துமஸ் வரை வச்சிருப்பீங்களா? நான் RM43 சேர்த்திருக்கேன்!'),
      L('wei', 'Arjun, a brand new one is coming, remember?', 'Arjun, yang baru tengah nak sampai, ingat?', 'Arjun，全新的那辆快到了，记得吗？', 'Arjun，全新的那輛快到了，記得嗎？', 'アルジュン、新品が届くんだよ、覚えてる？', 'அர்ஜுன், புத்தம் புது சைக்கிள் வந்துக்கிட்டிருக்கு, ஞாபகம் இருக்கா?'),
      L('arjun', 'I know, Akka. But this one goes WHOOSH.', 'Tahu, Akka. Tapi yang ni pergi WHOOSH.', '我知道，姐姐。可是这辆骑起来咻——的。', '我知道，姐姐。可是這輛騎起來咻——的。', '知ってる、お姉ちゃん。でもこれはビューンって走るんだ。', 'தெரியும் அக்கா. ஆனா இது விர்ர்ர்னு போகும்.'),
    ],
  },
  { // 20 Fri: cancelled. Close on Wei's face, lit by the email, a hand at her mouth; the 29th circled behind her.
    art: scene('home') + cal(148, 64, 29, 1) + wei({ x: 112, y: 210, s: 1.15, face: 'worried', pose: 'mouth', turn: 'r', look: 'down' }) + '<ellipse cx="124" cy="78" rx="16" ry="18" fill="#BFE3F0" opacity=".3" filter="url(#b11-b2)"/>',
    cam: { shot: 'medium', on: [140, 108], fg: fg.phone([['New bicycle', 'RM350'], ['Order cancelled', '', 1]], 168, 'Account overdue', 'none', 6, 'Email') },
    lines: [
      L('wei', '\'Order cancelled: account overdue.\'', '‘Pesanan dibatalkan: akaun tertunggak.’', '“订单已取消：账户逾期。”', '「訂單已取消：帳戶逾期。」', '「注文キャンセル：お支払い遅延のため」', '‘ஆர்டர் ரத்து: கணக்கில் நிலுவை.’'),
      L('wei', 'His birthday is in nine days.', 'Hari jadi dia lagi sembilan hari.', '他的生日只剩九天了。', '他的生日只剩九天了。', '誕生日まで、あと9日。', 'அவனோட பிறந்தநாளுக்கு இன்னும் ஒன்பது நாள் தான்.'),
    ],
  },
  { // 21 Sat: sorry, four times. Low and wide: a lot of empty night round one small glowing phone; Duit follows.
    art: `<g transform="translate(0 40)">${scene('night')}</g><path d="M-10-10H330V42H-10Z" fill="#1E2340"/><path d="M300 0V120" stroke="#3A2F35" stroke-width="3"/>`
      + '<circle cx="186" cy="92" r="16" fill="#BFE3F0" opacity=".45" filter="url(#b11-b2)"/>'
      + wei({ x: 196, y: 216, s: 1.2, face: 'worried', pose: 'hold', item: 'phone', is: 0.5, flip: true, turn: 'l', look: 'down' }) + duit({ x: 262, y: 206, s: 0.9, pose: 'walk', flip: true }),
    scene: 'night', cam: { shot: 'wide', on: [160, 136], angle: 'low', fg: '<path d="M138 52L138 64L190 102Z" fill="#F4EEE2" opacity=".92"/>' + `<g transform="translate(58 -40) scale(.6)">${fg.phone([['sorry', ''], ['sorry', ''], ['sorry', ''], ['sorry', '']], 0, 'Not sent', 'none', -4, 'To: Aina')}</g>`
      .replace(/<rect x="12" y="54" width="128" height="190" rx="12" fill="#2E2A36"\/>/, '<rect x="12" y="54" width="128" height="190" rx="12" fill="#F4EEE2" stroke="#C9C1B6" stroke-width="2"/>') },
    lines: [
      L('narrator', 'Wei typed \'sorry\' four times. She sent nothing.', 'Wei taip ‘maaf’ empat kali. Satu pun tak dihantar.', 'Wei打了四次“对不起”。一次也没发出去。', 'Wei打了四次「對不起」。一次也沒發出去。', 'ウェイは「ごめん」と4回打った。どれも送らなかった。', 'வெய் ‘மன்னிச்சிடு’ என்று நான்கு முறை தட்டச்சு செய்தாள். எதையும் அனுப்பவில்லை.'),
    ],
  },
  // ---- Low point ----
  { // 22 Sun: no bicycle at all. From high above: the phone face up at Aina's feet, Duit mid-leap off the shelf, Wei small, head on her knees.
    art: lifted(scene('home', { back: true }), 40, '#5A3A2E') + '<ellipse cx="160" cy="184" rx="160" ry="26" fill="#2F5D5A"/>'
      + '<ellipse cx="236" cy="166" rx="28" ry="11" fill="#B5533A"/>' + wei({ x: 238, y: 176, s: 0.88, face: 'worried', pose: 'hug', flip: true, look: 'down' })
      + duit({ x: 268, y: 84, s: 0.66, pose: 'pounce', flip: true }) + '<path d="M286 72l6 2M284 64l6-1" stroke="#E3A24A" stroke-width="1" opacity=".7"/>'
      + `<g transform="translate(140 186) rotate(70)">${it('phone', 0, 0, 0.32)}</g>` + '<ellipse cx="140" cy="186" rx="12" ry="5" fill="#BFE3F0" opacity=".45" filter="url(#b11-b2)"/>'
      + aina({ x: 118, y: 190, s: 0.9, face: 'surprised', pose: 'pointdown', turn: 'r', bend: 16, look: 'down' }),
    scene: 'home', cam: { shot: 'medium', on: [196, 112], angle: 'high' },
    lines: [
      L('aina', 'Wei. Four apps? A late fee? The bicycle?', 'Wei. Empat aplikasi? Caj lewat? Basikal tu?', 'Wei。四个app？逾期费？还有脚车？', 'Wei。四個app？逾期費？還有腳車？', 'ウェイ。アプリ4つ？延滞料？自転車は？', 'வெய். நாலு app-ஆ? Late fee-ஆ? சைக்கிள்?'),
      L('wei', 'I was October\'s success story. I couldn\'t tell you.', 'Aku kan kisah kejayaan bulan Oktober. Aku tak sanggup beritahu kau.', '我可是十月的成功例子。我说不出口。', '我可是十月的成功例子。我說不出口。', '私、10月の成功例だったんだよ。言えなかった。', 'அக்டோபர்ல நான் தான் வெற்றிக் கதை. உன்கிட்ட சொல்ல முடியல.'),
      L('wei', 'And now there\'s no bicycle at all.', 'Dan sekarang basikal pun tak ada langsung.', '现在连脚车都没有了。', '現在連腳車都沒有了。', 'なのに今、自転車はどこにもない。', 'இப்போ சைக்கிளே இல்ல.'),
    ],
  },
  // ---- Act 3: the honest way ----
  { // 23 Mon: get a pen. Low and close on the sofa: Aina sits down beside her and slides over the pad and a pen.
    art: `<g transform="translate(0 24)">${scene('home')}</g><path d="M-10-10H330V26H-10Z" fill="#8C5A45"/>`
      + aina({ x: 132, y: 196, s: 1.05, face: 'happy', pose: 'kneel', turn: 'r' }) + wei({ x: 194, y: 198, s: 1.02, face: 'worried', pose: 'kneel', flip: true, turn: 'l', look: 'down' })
      + `<g transform="translate(160 136) rotate(-10)">${it('list', 0, 0, 0.6)}</g>` + '<path d="M170 144l10-12" stroke="#2E3F6E" stroke-width="2.2" stroke-linecap="round"/>',
    scene: 'home', cam: { shot: 'close', on: [162, 120], angle: 'low' },
    lines: [
      L('wei', 'Go on. Say \'I told you so\'.', 'Cakaplah. ‘Kan aku dah cakap.’', '说吧。说“我早就跟你说过”。', '說吧。說「我早就跟你說過」。', 'どうぞ。「だから言ったでしょ」って言いなよ。', 'சொல்லு. ‘நான் அப்பவே சொன்னேன்’னு சொல்லு.'),
      L('aina', 'I told you so. Now get a pen. We look at all four.', 'Kan aku dah cakap. Sekarang ambil pen. Kita tengok keempat-empatnya.', '我早就跟你说过。好，拿笔来。四个一起看。', '我早就跟你說過。好，拿筆來。四個一起看。', 'だから言ったでしょ。さあ、ペン持ってきて。4つ全部見よう。', 'நான் அப்பவே சொன்னேன். இப்போ ஒரு பேனா எடு. நாலையும் பார்ப்போம்.'),
    ],
  },
  { // 24 Tue: smallest first. Over Kamala's shoulder: Wei sits writing, a pen in her hand; Kamala's finger on the list.
    art: scene('kopitiam', { table: false }) + `<clipPath id="b11-sat"><path d="M0 0H320V156H0Z"/></clipPath><g clip-path="url(#b11-sat)">${wei({ x: 196, y: 222, s: 1.1, face: 'think', pose: 'flat', flip: true, turn: 'l', look: 'down' })}</g>`
      + '<path d="M96 146Q196 134 300 146L310 166Q196 154 86 166Z" fill="#EDE7DC"/><path d="M86 166Q196 154 310 166V200H86Z" fill="#D9D0C2"/>'
      + it('list', 196, 152, 0.62) + `<ellipse cx="174" cy="158" rx="4.6" ry="3.2" fill="${SK.wei}"/>` + `<path d="M232 144L215 157" stroke="${SK.wei}" stroke-width="5.4" stroke-linecap="round"/>` + '<path d="M212 158l9-12" stroke="#2E3F6E" stroke-width="2" stroke-linecap="round"/>'
      + `<ellipse cx="214" cy="157" rx="4.4" ry="3.4" fill="${SK.wei}"/><ellipse cx="210.6" cy="155" rx="1.8" ry="1.3" fill="${SK.wei}"/>`
      + `<path d="M96 200L176 160" stroke="#8E2F4F" stroke-width="11" stroke-linecap="round"/><path d="M150 173L182 157" stroke="${SK.kamala}" stroke-width="7" stroke-linecap="round"/>`
      + `<path d="M150 173l-2-4" stroke="#D9A441" stroke-width="2.4"/><ellipse cx="185" cy="155.5" rx="4.6" ry="3.4" fill="${SK.kamala}"/><path d="M188 154l7-3" stroke="${SK.kamala}" stroke-width="2.6" stroke-linecap="round"/>`,
    cam: { shot: 'medium', on: [182, 110], fg: fg.ots('kamala', 'left') },
    tip: T('Several pay-later apps? List them all, then clear one at a time.', 'Ada banyak aplikasi pay later? Senaraikan semua, kemudian langsaikan satu demi satu.', '用了好几个先买后付？全部列出来，一个一个还清。', '用了好幾個先買後付？全部列出來，一個一個還清。', '後払いアプリが複数あるなら、全部書き出して、一つずつ片づけよう。', 'பல pay later app-களா? எல்லாவற்றையும் பட்டியலிட்டு, ஒவ்வொன்றாக அடையுங்கள்.'),
    lines: [
      L('kamala', 'Pay later is still paying, Wei. Every month, every app.', 'Pay later tetap kena bayar, Wei. Setiap bulan, setiap aplikasi.', '先买后付，还是要付的，Wei。每个月，每个app。', '先買後付，還是要付的，Wei。每個月，每個app。', '後払いも支払いよ、ウェイ。毎月、アプリごとに。', 'Pay later-உம் கட்டுறது தான், வெய். ஒவ்வொரு மாசமும், ஒவ்வொரு app-உம்.'),
      L('kamala', 'No new ones. Clear the smallest first.', 'Jangan tambah yang baru. Langsaikan yang paling kecil dulu.', '不要再开新的。先还清最小的。', '不要再開新的。先還清最小的。', '新しいのはなし。一番小さいのから片づけて。', 'புதுசா எதுவும் வேணாம். சின்னதை முதல்ல அடைச்சிடு.'),
      L('wei', 'Kurta first. Then the earbuds. Then the shoes.', 'Kurta dulu. Lepas tu earbuds. Lepas tu kasut.', '先还库尔塔。然后耳机。然后鞋子。', '先還庫爾塔。然後耳機。然後鞋子。', 'まずクルタ。次にイヤホン。それから靴。', 'முதல்ல குர்தா. அப்புறம் earbuds. அப்புறம் ஷூ.'),
    ],
  },
  { // 25 Wed: RM74. The honest number, seen.
    art: scene('kopitiam', { table: false }) + MARBLE + `<g transform="translate(142 152) rotate(-6) scale(.95)">${payList(3)}</g>`
      + `<g transform="rotate(-8 176 142)">${cash(50, 176, 142, 0.46)}</g>` + `<g transform="rotate(6 180 160)">${cash(20, 180, 160, 0.46)}</g>` + it('coins', 194, 172, 0.26),
    scene: 'kopitiam', cam: { shot: 'insert', on: [162, 152], angle: 'high' },
    tip: T('On payday, pay your instalments first. Then plan the rest.', 'Hari gaji, bayar ansuran dulu. Baru rancang selebihnya.', '发薪日先付分期，再规划剩下的钱。', '發薪日先付分期，再規劃剩下的錢。', '給料日には、まず分割払いを。残りはそれから計画しよう。', 'சம்பள நாளில் முதலில் தவணைகளைக் கட்டுங்கள். பிறகு மீதியைத் திட்டமிடுங்கள்.'),
    lines: [
      L('wei', 'Payday. Three instalments and the late fee: paid first.', 'Hari gaji. Tiga ansuran dan caj lewat: bayar dulu.', '发薪日。三笔分期和逾期费：先付清。', '發薪日。三筆分期和逾期費：先付清。', '給料日。分割3回分と延滞料、まず払った。', 'சம்பள நாள். மூணு தவணையும் late fee-உம்: முதல்ல கட்டியாச்சு.'),
      L('narrator', 'Left for a bicycle: RM74.', 'Baki untuk basikal: RM74.', '剩下买脚车的钱：RM74。', '剩下買腳車的錢：RM74。', '自転車に回せるのは、RM74。', 'சைக்கிளுக்கு மிச்சம்: RM74.'),
      L('wei', 'Not RM350. Not even RM120.', 'Bukan RM350. RM120 pun tak sampai.', '不是RM350。连RM120都不到。', '不是RM350。連RM120都不到。', 'RM350どころか、RM120にも届かない。', 'RM350 இல்ல. RM120 கூட இல்ல.'),
    ],
  },
  { // 26 Thu: best served hot. From behind Raju's counter: Wei leans her arms on it and looks up at him; his shoulder near us, steam between them.
    art: scene('street') + wei({ x: 136, y: 252, s: 1.32, face: 'worried', pose: 'flat', turn: 'r', look: 'up', bend: 8 }),
    scene: 'market', cam: { shot: 'wide', on: [160, 100], fg: fg.counter() + `<g transform="translate(70 160) rotate(-6)"><path d="M-34 4A34 13 0 0 1 34 4Z" fill="#DDA552"/><path d="M-26-2Q-12-8 4-9" stroke="#F0C878" stroke-width="2" fill="none"/>`
      + `<path d="M-34 4H34V11Q0 15-34 11Z" fill="#C9955A"/>${[-28, -19, -9, 1, 11, 21, 29].map((x, i) => `<path d="M${x} ${6 + (i % 2) * 2}h3v2h-3z" fill="#8A5A2E"/>`).join('')}${[-23, -4, 16].map(x => `<path d="M${x} 9h4" stroke="#F2D04A" stroke-width="1.6"/>`).join('')}`
      + `<path d="M-34 11Q0 15 34 11V13Q0 17-34 13Z" fill="#B8783A"/></g>` + `<ellipse cx="128" cy="164" rx="6" ry="3.6" fill="${SK.wei}"/><ellipse cx="158" cy="163" rx="6" ry="3.6" fill="${SK.wei}"/>`
      + `<path d="M118 170L128 164M168 170L158 163" stroke="${SK.wei}" stroke-width="6.4" stroke-linecap="round"/>` + fg.ots('raju', 'right', -10) },
    lines: [
      L('wei', 'Uncle, I promised Arjun a bicycle I can\'t afford.', 'Uncle, saya janji dengan Arjun basikal yang saya tak mampu beli.', '叔叔，我答应送Arjun一辆我买不起的脚车。', '叔叔，我答應送Arjun一輛我買不起的腳車。', 'おじさん、買えない自転車をアルジュンに約束しちゃった。', 'மாமா, என்னால வாங்க முடியாத சைக்கிளை அர்ஜுனுக்கு வாக்குக் குடுத்துட்டேன்.'),
      L('raju', 'Then tell him. The truth is like teh tarik: best served hot.', 'Kalau macam tu, beritahu dia. Kebenaran ni macam teh tarik: paling sedap panas-panas.', '那就告诉他。真话就像拉茶：趁热最好。', '那就告訴他。真話就像拉茶：趁熱最好。', 'なら、話しなさい。本当のことはテタレと同じ。熱いうちが一番。', 'அப்போ அவன்கிட்ட சொல்லு. உண்மை தே தாரிக் மாதிரி: சூடா இருக்கும்போதே குடுக்கணும்.'),
      L('wei', 'Uncle, that makes no… no. It makes sense.', 'Uncle, tak masuk… eh. Masuk akal.', '叔叔，这说不……不。说得通。', '叔叔，這說不……不。說得通。', 'おじさん、意味わかん…ううん。わかる。', 'மாமா, அதுல ஒரு அர்த்தமும்… இல்ல. அர்த்தம் இருக்கு.'),
    ],
  },
  { // 27 Fri: Black Friday. Low: the sign and the new bike loom over her; she closes her bag.
    art: scene('shop', { bikes: true, sign: 'BLACK FRIDAY', signBg: '#1E1C26' }) + it('bicycle', 222, 128, 3.6) + priceTag('RM299', 256, 76, 0.85)
      + '<rect x="186" y="90" width="56" height="16" rx="3" fill="#1E1C26"/><text x="214" y="101.5" font-family="system-ui,sans-serif" font-weight="800" font-size="8" text-anchor="middle" fill="#F2C77A">0% PAY LATER</text>'
      + wei({ x: 112, y: 196, s: 1.2, face: 'think', pose: 'rest', turn: 'r', look: 'up', inHand: `<g transform="translate(0 6)">${it('tote', 0, 0, 0.62)}</g><g transform="translate(-2 -4) rotate(-8)"><rect x="-4" y="-9" width="8" height="14" rx="1.6" fill="#2E2A36"/></g>` }),
    cam: { shot: 'medium', on: [176, 82], angle: 'low' },
    tip: T('"0% pay later" is still a bill every month. Could you pay it today?', '“0% pay later” tetap bil setiap bulan. Mampu bayar hari ini?', '“0%先买后付”还是每个月的账单。你今天付得起吗？', '「0%先買後付」還是每個月的帳單。你今天付得起嗎？', '「0%後払い」も毎月の請求。今日払える？', '“0% pay later” என்றாலும் மாதந்தோறும் ஒரு பில் தான். இன்றே கட்ட முடியுமா?'),
    lines: [
      L('wei', 'RM299. Zero percent. Pay later…', 'RM299. Sifar peratus. Pay later…', 'RM299。零利息。先买后付……', 'RM299。零利息。先買後付……', 'RM299。金利ゼロ。後払い…', 'RM299. பூஜ்ஜிய சதவீதம். Pay later…'),
      L('narrator', 'Wei put her phone back in her bag. And walked out.', 'Wei simpan semula telefon dalam beg. Dan terus keluar.', 'Wei把手机放回包里。然后走了出去。', 'Wei把手機放回包裡。然後走了出去。', 'ウェイはスマホをかばんにしまった。そして店を出た。', 'வெய் phone-ஐப் பையில் வைத்தாள். வெளியே நடந்தாள்.'),
    ],
  },
  { // 28 Sat: only RM5. Aina holds the bell up, laughing; Wei on one knee with a big box and far too much tape.
    art: scene('home', { day: true }) + aina({ x: 110, y: 214, s: 1.16, face: 'laugh', pose: 'show', turn: 'r', inHand: it('bell', 1, -8, 0.42) })
      + wei({ x: 222, y: 204, s: 1.34, face: 'happy', pose: 'kneel', flip: true, turn: 'l', look: 'down' }) + `<g transform="rotate(-6 186 168)">${it('gifttaped', 186, 168, 1.05)}</g>`,
    cam: { shot: 'medium', on: [166, 116] },
    lines: [
      L('aina', 'A bicycle bell?', 'Loceng basikal?', '脚车铃？', '腳車鈴？', '自転車のベル？', 'சைக்கிள் மணியா?'),
      L('wei', 'It\'s only RM5. That\'s the point.', 'RM5 je. Itulah maksudnya.', '才RM5而已。重点就在这里。', '才RM5而已。重點就在這裡。', 'たったRM5。そこが大事なの。', 'RM5 தான். அதுதான் விஷயமே.'),
      L('narrator', 'Tomorrow: Arjun\'s birthday.', 'Esok: hari jadi Arjun.', '明天：Arjun的生日。', '明天：Arjun的生日。', '明日は、アルジュンの誕生日。', 'நாளை: அர்ஜுனின் பிறந்தநாள்.'),
    ],
  },
  // ---- Climax ----
  { // 29 Sun: the truth, hot. Low and close: Wei on one knee, eye to eye with Arjun as he rings the bell; the family soft behind, turned to them.
    art: `<g filter="url(#b11-b2)">${scene('kopitiam', { back: true }) + it('balloon', 60, 40, 0.9) + it('balloon', 270, 36, 0.9)
      + K.folk([[40, 170, 0.8, { shirt: '#8E2F4F', skin: '#8E5B3E', pose: 'clap', laugh: true, turn: 1 }], [288, 172, 0.8, { shirt: '#D9A441', skin: '#C98F6A', pose: 'up', cup: true, turn: -1, flip: true }]])
      + kamala({ x: 86, y: 176, s: 0.86, face: 'happy', pose: 'heart', turn: 'r' }) + raju({ x: 246, y: 180, s: 0.92, face: 'laugh', apron: NEW, pose: 'hip', flip: true, turn: 'l' })
      + aina({ x: 208, y: 168, s: 0.78, face: 'happy', flip: true, turn: 'l', pose: 'chin' })}</g>`
      + arjun({ x: 120, y: 240, s: 1.7, face: 'laugh', pose: 'point', turn: 'r', inHand: it('bell', 1, -8, 0.55) + it('ding', 4, -18, 0.55) }) + wei({ x: 204, y: 238, s: 1.48, face: 'worried', pose: 'kneelreach', flip: true, turn: 'l', look: 'up' }),
    scene: 'kopitiam', cam: { shot: 'medium', on: [162, 120], angle: 'low' },
    lines: [
      L('wei', 'Arjun, I promised you a bicycle I couldn\'t afford. Sorry.', 'Arjun, Akka janji basikal yang Akka tak mampu beli. Maaf.', 'Arjun，我答应你一辆我买不起的脚车。对不起。', 'Arjun，我答應你一輛我買不起的腳車。對不起。', 'アルジュン、買えない自転車を約束しちゃった。ごめんね。', 'அர்ஜுன், என்னால வாங்க முடியாத சைக்கிளை உனக்கு வாக்குக் குடுத்தேன். மன்னிச்சிடு.'),
      L('arjun', 'That\'s okay! I want the red one anyway. I have RM43!', 'Tak apa! Saya memang nak yang merah tu. Saya ada RM43!', '没关系！我本来就想要红色那辆。我有RM43！', '沒關係！我本來就想要紅色那輛。我有RM43！', 'いいよ！どっちにしても赤いのがいい。RM43あるよ！', 'பரவாயில்ல! எனக்கு எப்படியும் சிவப்பு தான் வேணும். என்கிட்ட RM43 இருக்கு!'),
      L('wei', 'Then every ringgit you save, I match. Red one by Christmas.', 'Kalau macam tu, setiap ringgit Arjun simpan, Akka tambah sama banyak. Yang merah sebelum Krismas.', '那你存一令吉，我就补一令吉。圣诞节前买红色那辆。', '那你存一令吉，我就補一令吉。聖誕節前買紅色那輛。', 'じゃあ、貯めた分と同じだけ私も出す。クリスマスまでに赤いのを。', 'அப்போ நீ சேர்க்கிற ஒவ்வொரு ரிங்கிட்டுக்கும் நானும் ஒண்ணு போடுறேன். கிறிஸ்துமஸுக்குள்ள சிவப்பு சைக்கிள்.'),
    ],
  },
  { // 30 (skipped in November): Duit asleep in the empty murukku tin under the party table.
    art: scene('kopitiam', { table: 160 }) + it('tinopen', 160, 186, 1.5) + duit({ x: 160, y: 184, s: 1, pose: 'sleep' }),
    cam: { shot: 'close', on: [160, 150] },
    lines: [
      L('narrator', 'Duit found the best use for an empty murukku tin.', 'Duit jumpa guna terbaik untuk tin murukku kosong.', 'Duit找到了空murukku罐的最佳用途。', 'Duit找到了空murukku罐的最佳用途。', 'ドゥイットは空のムルック缶の一番いい使い道を見つけた。', 'காலி முறுக்கு டின்னுக்குச் சிறந்த பயனைத் துயிட் கண்டுபிடித்தது.'),
    ],
  },
  // ---- Payoff ----
  { // 31 Mon 30: the charts on the fridge, Arjun's crayon squares and Wei's list with lines through it; Duit asleep in the empty murukku tin below.
    art: `<g transform="matrix(-1 0 0 1 320 0)">${scene('kitchen') + '<rect x="18" y="20" width="82" height="152" rx="5" fill="#EDEFF0"/><path d="M18 82H100" stroke="#C9CDD1" stroke-width="1.6"/><rect x="88" y="40" width="4" height="30" rx="2" fill="#B9BEC2"/><rect x="88" y="94" width="4" height="40" rx="2" fill="#B9BEC2"/>'
}</g>` + `<g transform="translate(274 74) rotate(4) scale(.95)">${it('crayonchart', 0, 0)}</g>` + `<g transform="translate(242 132) rotate(-5) scale(1.05)">${payList(1)}</g>`
      + it('tinopen', 92, 170, 0.9) + duit({ x: 92, y: 168, s: 0.62, pose: 'sleep' })
      + aina({ x: 136, y: 204, s: 1.04, face: 'happy', pose: 'hips', turn: 'r', look: 'up' }) + wei({ x: 202, y: 230, s: 1.12, face: 'laugh', pose: 'point', turn: 'r' }),
    scene: 'home', cam: { shot: 'medium', on: [188, 112] },
    tip: T('After a festival, check where it went. Plan next year with the answer.', 'Selepas perayaan, semak ke mana duit pergi. Rancang tahun depan dengan jawapannya.', '节日过后，看看钱花去哪里。用答案来计划明年。', '節日過後，看看錢花去哪裡。用答案來計劃明年。', 'お祝いのあと、お金の行き先を確かめよう。その答えで来年を計画。', 'பண்டிகைக்குப் பிறகு பணம் எங்கே போனது என்று பாருங்கள். அந்தப் பதிலோடு அடுத்த ஆண்டைத் திட்டமிடுங்கள்.'),
    lines: [
      L('wei', 'Arjun\'s chart: RM86 of RM120. Mine: three apps to clear.', 'Carta Arjun: RM86 daripada RM120. Aku: tiga aplikasi lagi nak langsai.', 'Arjun的表：RM120存到RM86了。我的：还有三个app要还。', 'Arjun的表：RM120存到RM86了。我的：還有三個app要還。', 'アルジュンの表はRM120中RM86。私のは、あと3つのアプリ。', 'அர்ஜுனோட chart: RM120-ல RM86. என்னோடது: இன்னும் மூணு app அடைக்கணும்.'),
      L('aina', 'And in December, my bonus makes my fund RM1,000.', 'Dan bulan Disember, bonus aku jadikan tabung aku RM1,000.', '十二月花红一到，我的基金就有RM1,000了。', '十二月花紅一到，我的基金就有RM1,000了。', '12月にはボーナスで、私の貯金はRM1,000になる。', 'டிசம்பர்ல, என் போனஸோட என் நிதி RM1,000 ஆகும்.'),
      L('narrator', 'Aina had it all planned.', 'Aina dah rancang semuanya.', 'Aina一切都计划好了。', 'Aina一切都計劃好了。', 'アイナには、すべて計画があった。', 'ஐனா எல்லாவற்றையும் திட்டமிட்டிருந்தாள்.'),
    ],
  },
];

export default {
  id: '11',
  theme: T('Deepavali', 'Deepavali', '屠妖节', '屠妖節', 'ディーパバリ', 'தீபாவளி'),
  colours: { dark: ['#1F1520', '#2A1D2B', '#352536'], light: ['#F8EFE4', '#FFFBF5', '#F1E0D2'], accent: '#A63D5B' },
  /** Speakers new this month (the engine's WHO covers the rest). */
  who: {
    kamala: T('Aunty Kamala', 'Mak Cik Kamala', 'Kamala 阿姨', 'Kamala 阿姨', 'カマラおばさん', 'கமலா அத்தை'),
    arjun: T('Arjun', 'Arjun', 'Arjun', 'Arjun', 'アルジュン', 'அர்ஜுன்'),
  },
  // one sticker a day, in story order (sticker N is day N's)
  stickers: [
    stk('calendar', 'Deepavali day', 'Hari Deepavali', '屠妖节当天', '屠妖節當天', 'ディーパバリの日', 'தீபாவளித் திருநாள்'),
    stk('kurta', 'New kurta', 'Kurta baru', '新库尔塔', '新庫爾塔', '新しいクルタ', 'புது குர்தா'),
    stk('paylater', 'Pay later', 'Pay later', '先买后付', '先買後付', '後払い', 'Pay later', 'phone'),
    stk('kolamdots', 'Dot kolam', 'Kolam titik', '点点彩米画', '點點彩米畫', '点のコーラム', 'புள்ளிக் கோலம்'),
    stk('redbike', 'Red bicycle', 'Basikal merah', '红色脚车', '紅色腳車', '赤い自転車', 'சிவப்புச் சைக்கிள்', 'bicycle'),
    stk('claypot', 'Curry pot', 'Periuk kari', '咖喱锅', '咖哩鍋', 'カレー鍋', 'கறிச் சட்டி'),
    stk('press', 'Murukku press', 'Acuan murukku', '螺旋饼模', '螺旋餅模', 'ムルック絞り器', 'முறுக்கு அச்சு'),
    stk('agal', 'Clay lamps', 'Pelita tanah liat', '陶土油灯', '陶土油燈', '素焼きの灯明', 'அகல் விளக்குகள்'),
    stk('packet', 'Money packet', 'Sampul duit', '红包', '紅包', 'お祝い袋', 'அங்பாவ் உறை'),
    stk('newbike', 'Shiny new bike', 'Basikal baru berkilat', '闪亮新脚车', '閃亮新腳車', 'ピカピカの新品自転車', 'பளபளக்கும் புதுச் சைக்கிள்'),
    stk('salebag', 'Sale bag', 'Beg jualan', '促销购物袋', '促銷購物袋', 'セールの袋', 'தள்ளுபடிப் பை', 'shopbag'),
    stk('apambalik', 'Apam balik', 'Apam balik', '曼煎糕', '曼煎糕', 'アパム・バリック', 'அப்பம் பாலிக்'),
    stk('reminders', 'Four reminders', 'Empat peringatan', '四个提醒', '四個提醒', '4つの通知', 'நான்கு நினைவூட்டல்கள்'),
    stk('savingstin', 'Savings tin', 'Tin simpanan', '存钱铁罐', '存錢鐵罐', '貯金缶', 'சேமிப்பு டின்', 'tin'),
    stk('sixmonths', 'Six months', 'Enam bulan', '六个月', '六個月', '6か月', 'ஆறு மாதங்கள்'),
    stk('murukku', 'Murukku', 'Murukku', '螺旋脆饼', '螺旋脆餅', 'ムルック', 'முறுக்கு'),
    stk('balloon', 'Balloons', 'Belon', '气球', '氣球', '風船', 'பலூன்கள்'),
    stk('latefee', 'Late fee', 'Caj lewat', '逾期费', '逾期費', '延滞料', 'தாமதக் கட்டணம்'),
    stk('jasmine', 'Jasmine string', 'Untaian melur', '茉莉花串', '茉莉花串', 'ジャスミンの花飾り', 'மல்லிகைச் சரம்'),
    stk('payasam', 'Payasam', 'Payasam', '甜奶粥', '甜奶粥', 'パヤサム', 'பாயாசம்'),
    stk('sorry', 'Unsent sorry', 'Maaf yang tak dihantar', '没发出的对不起', '沒發出的對不起', '送れなかった「ごめん」', 'அனுப்பாத மன்னிப்பு'),
    stk('phonefall', 'Phone on the floor', 'Telefon di lantai', '掉在地上的手机', '掉在地上的手機', '床に落ちたスマホ', 'தரையில் விழுந்த போன்', 'phonefall'),
    stk('budgetlist', 'Festive budget', 'Bajet perayaan', '节日预算', '節日預算', 'お祝いの予算', 'பண்டிகை பட்ஜெட்', 'list'),
    stk('thoranam', 'Mango-leaf garland', 'Thoranam daun mangga', '芒果叶门饰', '芒果葉門飾', 'マンゴーの葉飾り', 'மாவிலைத் தோரணம்'),
    stk('coconut', 'Coconut', 'Kelapa', '椰子', '椰子', 'ココナッツ', 'தேங்காய்'),
    stk('adhirasam', 'Adhirasam', 'Adhirasam', '印度甜饼', '印度甜餅', 'アディラサム', 'அதிரசம்'),
    stk('jalebi', 'Jalebi', 'Jalebi', '糖浆圈', '糖漿圈', 'ジャレビ', 'ஜிலேபி'),
    stk('bell', 'Bicycle bell', 'Loceng basikal', '脚车铃', '腳車鈴', '自転車のベル', 'சைக்கிள் மணி'),
    stk('present', 'Wrapped gift', 'Hadiah', '礼物', '禮物', 'プレゼント', 'பரிசுப் பொட்டலம்', 'gift'),
    stk('kandil', 'Star lantern', 'Tanglung bintang', '星形灯笼', '星形燈籠', '星のランタン', 'நட்சத்திர விளக்கு'),
    stk('chart', 'Arjun\'s chart', 'Carta Arjun', 'Arjun 的储蓄表', 'Arjun 的儲蓄表', 'アルジュンの貯金表', 'அர்ஜுனின் அட்டவணை', 'crayonchart'),
  ],
  // The paint grain goes in the camera's screen-space fg, so close-ups and inserts don't magnify it into blotches.
  panels: panels.map(p => p.cam ? { ...p, cam: { ...p.cam, fg: (p.cam.fg || '') + K.grain() } } : { ...p, art: p.art + K.grain() }),
  defs: K.defs(),
};
