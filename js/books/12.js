// December: "The One With the Plan" (year end). Aina plans her emergency fund around a bonus that never comes; when the
// fund pays for her mother's roof instead, the friend with the plan learns that savings are for using and help is for
// taking, before the last Thursday of the year. The script is notes/comic-story-12.md.
import { castKit, it, priceTag, cash, written, notebookAmt } from './cast.js';

// Each panel has a camera (cam, see comic.js frame) chosen for its beat. The street and every stall are one place for
// the shot checker (scene: 'market'). The year ends at the Thursday market where October began.
const K = castKit('b12-');
const { aina, wei, raju, duit, scene, fg, kamala, arjun, grace } = K;
const NEW = '#B5533A'; // Uncle Raju's apron from October
const SK = { aina: '#D9A27E', wei: '#E3B48E', raju: '#8E5B3E', kamala: '#8A5A3E', arjun: '#8E5B3E', grace: '#D6A078' };
/** A floor seen from above: the backdrop lifted so the floor fills the bottom of a high shot. */
const lifted = (art, dy, floor) => `<g transform="translate(0 ${-dy})">${art}</g><path d="M-10 ${200 - dy}H330V210H-10Z" fill="${floor}"/>`;
/** The backdrop dropped (a low camera): the horizon sinks and the top fills with `top`. */
const dropped = (art, dy, top) => `<g transform="translate(0 ${dy})">${art}</g><path d="M-10-10H330V${dy + 2}H-10Z" fill="${top}"/>`;
const txt = (x, y, t, size, c, more = '') => `<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-weight="800" font-size="${size}" text-anchor="middle" fill="${c}"${more}>${t}</text>`;
/** The front of the kopitiam's drinks counter (the reverse set), drawn over whoever stands behind it. */
const KCOUNTER = '<path d="M20 108H230V172H20Z" fill="#6E4533"/><path d="M16 102H234V110H16Z" fill="#8A5A3C"/><path d="M20 110H230V118H20Z" fill="#1B1430" opacity=".22"/>';
/** The girls' fridge, standing at (x, 172), 58 wide. */
const fridge = x => `<rect x="${x}" y="40" width="58" height="132" rx="5" fill="#EDEFF0"/><path d="M${x} 88H${x + 58}" stroke="#C9CDD1" stroke-width="1.6"/><rect x="${x + 6}" y="56" width="4" height="22" rx="2" fill="#B9BEC2"/><rect x="${x + 6}" y="98" width="4" height="34" rx="2" fill="#B9BEC2"/>`;
/** Aina's printed fund thermometer: "RM1,000" in type at the top, the red filled to `lv` (0..1). */
const meter = (x, y, lv, s = 1) => { const top = -26 + 46 * (1 - lv);
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-16" y="-40" width="32" height="74" rx="1.5" fill="#FBF7EE"/><path d="M-16-40h32v10h-32z" fill="#2F6B66"/>`
    + txt(0, -33, 'MY FUND', 5, '#F4EEE2') + txt(0, -23.4, 'RM1,000', 6, '#2F6B66') + '<rect x="-4" y="-20" width="8" height="40" rx="4" fill="#FFFFFF" stroke="#B6AFA2" stroke-width="1"/>'
    + `<path d="M-2 ${f1(top + 6)}V20h4V${f1(top + 6)}z" fill="#C44A36"/><circle cx="0" cy="24" r="6" fill="#C44A36"/><path d="M5-18h4M5-10h3M5-2h4M5 6h3M5 14h4" stroke="#8A8378" stroke-width=".9"/>`
    + `<path d="M-11 ${f1(top + 6)}l5 2.4-5 2.4z" fill="#2F6B66"/><circle cx="12" cy="-38" r="1.8" fill="#C44A36"/></g>`; };
const f1 = n => Math.round(n * 10) / 10;
/** Grace's hand-drawn invitation; crumpled: the same card balled up. */
const invite = (x, y, s = 1, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><rect x="-12" y="-16" width="24" height="32" rx="1" fill="#FBF7EE"/><path d="M-12-16h24v6h-24z" fill="#3F6B4A"/>`
  + `<path d="M0-6L5 4H2L6 12H-6L-2 4H-5Z" fill="#3F6B4A"/><circle cx="0" cy="-6" r="1.4" fill="#E3B54A"/><path d="M-8 14h16" stroke="#C44A36" stroke-width="1.2"/></g>`;
const crumpled = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-9-6L-3-10L4-8L10-3L8 5L2 9L-6 8L-10 2Z" fill="#FBF7EE"/><path d="M-3-10L-1-2L4-8M-1-2L8 5M-1-2L-6 8M-10 2L-1-2" stroke="#C9C1B6" stroke-width=".8" fill="none"/>`
  + '<path d="M2-9L8-4L4-2Z" fill="#3F6B4A"/></g>';
/** A folded Secret Santa slip with a printed name. */
const slip = (t, x, y, s = 1, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><rect x="-10" y="-6" width="20" height="12" fill="#FBF7EE"/><path d="M-10 0H10" stroke="#E3DACB" stroke-width=".6"/>` + (t ? txt(0, 3, t, 6.4, '#2E4A7A') : '') + '</g>';
/** The bike seller's QR stand. */
const pakMat = (x, y, s) => it('qrreal', x, y, s).replace('RAJU APAM BALIK', 'PAK MAT BASIKAL');
/** Raju's apam balik stall; `behind` behind the counter, `items` on it. */
const apamStall = (behind, items = '', o = {}) => scene('stall', { sign: 'APAM BALIK', steam: 112, behind, items: it('apambalik', 262, 114, 0.6) + it('apambalik', 58, 114, 0.6) + items, ...o });
/** Arjun riding the red bicycle at (x, wheels on y), facing +x unless flip: hips on the saddle, knees bent to the
 *  pedals, hands on the grips; bell: the bike bell on the bar. */
const riding = (x, y, s = 1, flip = false, bell = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">` + it('bicycle', 0, -34, 1.9)
  + '<circle cx="3.8" cy="-18.8" r="2.6" fill="#6B6570"/>' + arjun({ x: -6.6, y: -14.1, s: 1.2, face: 'laugh', pose: 'ride' }) + (bell ? it('bell', 17, -61, 0.22) : '') + '</g>';
/** Bring a medium in to waist height: the art scaled up `k` round (cx, cy) (the backdrop still fills the frame). */
const closer = (art, k, cx = 160, cy = 100) => `<g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})">${art}</g>`;
/** A wall calendar with a day circled and a word on its band. */
const cal = (x, y, day, word, s = 1) => `<g transform="translate(${x} ${y}) rotate(3) scale(${s})"><rect x="-12" y="-13" width="24" height="26" rx="1.5" fill="#F4EEE2"/><path d="M-12-13h24v7h-24z" fill="#8E2F4F"/>`
  + txt(0, -7.6, word, 5, '#F4EEE2') + txt(0, 9, day, 11, '#4A2E24') + '<ellipse cx="0" cy="5" rx="9" ry="6.5" fill="none" stroke="#C44A36" stroke-width="1.3"/></g>';
/** A torn stall canopy: a rip and a flapping corner. */
const TORN = '<path d="M150 24L160 40L150 52L164 66L172 40Z" fill="#1E2340"/><path d="M164 66L186 70L176 52Z" fill="#9E3A2A"/><path d="M150 24L160 40L150 52" stroke="#6E2A1E" stroke-width="1.2" fill="none"/>';

const T = (en, ms, zh, zht, ja, ta) => ({ en, ms, zh, 'zh-Hant': zht, ja, ta });
const L = (who, ...t) => ({ who, text: T(...t) });
const stk = (id, en, ms, zh, zht, ja, ta, item = id) => ({ id, name: T(en, ms, zh, zht, ja, ta), svg: K.sticker(item) });

const panels = [
  // ---- Act 1: the plan ----
  { // 1 Tue: the plan. Aina pins her fund chart to the fridge; Wei salutes; Duit on top of the fridge.
    art: scene('home') + fridge(18) + meter(47, 104, 0.86, 1.4) + duit({ x: 46, y: 40, s: 0.7, flip: false })
      + aina({ x: 100, y: 192, s: 1.02, face: 'happy', pose: 'show', flip: true, turn: 'l' }) + wei({ x: 176, y: 194, s: 1.02, face: 'laugh', pose: 'wave', flip: true, turn: 'l' }),
    cam: { shot: 'wide', on: [160, 100] },
    lines: [
      L('aina', 'Emergency fund: RM900. My bonus on the 15th makes it RM1,000.', 'Tabung kecemasan: RM900. Bonus aku 15 hari bulan nanti jadikan RM1,000.', '应急基金：RM900。15号花红一到，就有RM1,000。', '應急基金：RM900。15號花紅一到，就有RM1,000。', '緊急用の貯金はRM900。15日のボーナスでRM1,000になる。', 'அவசரகால நிதி: RM900. 15-ஆம் தேதி போனஸ் வந்தா RM1,000 ஆகும்.'),
      L('wei', 'And my December rule: no new pay-laters. Watch me.', 'Dan peraturan Disember aku: tak ada pay later baru. Tengok ni.', '我的十二月规矩：不再开新的先买后付。看我的。', '我的十二月規矩：不再開新的先買後付。看我的。', '私の12月のルール：新しい後払いはなし。見ててよ。', 'என் டிசம்பர் விதி: புது pay later கிடையாது. பாரு.'),
      L('narrator', 'Aina\'s plans always worked. Almost always.', 'Rancangan Aina sentiasa menjadi. Hampir sentiasa.', 'Aina的计划总是行得通。几乎总是。', 'Aina的計劃總是行得通。幾乎總是。', 'アイナの計画は、いつもうまくいった。ほとんどいつも。', 'ஐனாவின் திட்டங்கள் எப்போதும் வெற்றி பெற்றன. கிட்டத்தட்ட எப்போதும்.'),
    ],
  },
  { // 2 Wed: only thirty?! Grace at the door with her invitation; Aina near us, aghast; Wei grinning at her.
    art: scene('home', { back: true }) + grace({ x: 72, y: 166, s: 0.78, face: 'laugh', pose: 'give', turn: 'r' }) + invite(90, 98, 1.25, -6) + `<g transform="rotate(-6 90 98)"><rect x="76" y="110" width="28" height="9" fill="#FBF7EE"/>${txt(90, 117, 'RM30 max', 6, '#C44A36')}</g>`
      + aina({ x: 130, y: 210, s: 1.06, face: 'surprised', pose: 'mouth', flip: true, turn: 'l' }) + wei({ x: 176, y: 200, s: 0.94, face: 'laugh', flip: true, turn: 'l', pose: 'hip' }),
    scene: 'home', cam: { shot: 'close', on: [124, 104] },
    tip: T('Gift exchange with a set amount: everyone gets one, nobody overspends.', 'Tukar hadiah dengan had harga: semua dapat, tiada yang berbelanja lebih.', '定好金额的礼物交换：人人有份，没人超支。', '定好金額的禮物交換：人人有份，沒人超支。', '金額を決めたプレゼント交換なら、みんなもらえて、誰も使いすぎない。', 'நிர்ணயத் தொகையுடன் பரிசுப் பரிமாற்றம்: எல்லோருக்கும் ஒன்று, யாரும் அதிகம் செலவழிப்பதில்லை.'),
    lines: [
      L('grace', 'Christmas open house at mine! Gift exchange, RM30 max.', 'Rumah terbuka Krismas kat rumah aku! Tukar hadiah, maksimum RM30.', '来我家的圣诞开放门户！交换礼物，最多RM30。', '來我家的聖誕開放門戶！交換禮物，最多RM30。', 'うちでクリスマスのオープンハウス！プレゼント交換、上限RM30。', 'என் வீட்டுல கிறிஸ்துமஸ் பொது உபசரிப்பு! பரிசுப் பரிமாற்றம், அதிகபட்சம் RM30.'),
      L('aina', 'Only thirty?!', 'Tiga puluh je?!', '才三十？！', '才三十？！', 'たった30？！', 'முப்பது தானா?!'),
      L('wei', 'Hey. That\'s my line.', 'Eh. Tu ayat aku.', '喂，那是我的台词。', '喂，那是我的台詞。', 'ちょっと。それ私のセリフ。', 'ஏய். அது என் டயலாக்.'),
    ],
  },
  { // 3 Thu: only RM34 to go. The year's market re-opened from the bike seller's side, low; Arjun on tiptoe at the red bike.
    art: scene('stall', { sign: 'BASIKAL TERPAKAI', a: '#2F5D5A', behind: K.folk([[96, 166, 0.86, { shirt: '#6E4533', skin: '#B07A54', hair: '#D3CCC2', pose: 'hip', laugh: true, turn: 1 }]]) })
      + pakMat(140, 106, 0.4) + it('bicycle', 196, 168, 2.3) + priceTag('RM120', 214, 152, 1.15)
      + raju({ x: 290, y: 200, s: 1.02, face: 'laugh', apron: NEW, pose: 'hip', flip: true, turn: 'l' })
      + arjun({ x: 178, y: 192, s: 1.12, face: 'laugh', pose: 'show', turn: 'r', look: 'up' }) + wei({ x: 72, y: 206, s: 1.12, face: 'happy', pose: 'thumbs', turn: 'r' }),
    scene: 'market', cam: { shot: 'wide', on: [160, 136], angle: 'low', fg: fg.bulbs() },
    lines: [
      L('arjun', 'RM86 saved! Only RM34 to go.', 'Dah simpan RM86! Tinggal RM34 je.', '存了RM86！才差RM34而已。', '存了RM86！才差RM34而已。', 'RM86貯まった！あとたったRM34。', 'RM86 சேர்த்தாச்சு! இன்னும் RM34 தான்.'),
      L('raju', 'And the tyres, we fix ourselves.', 'Tayar tu, kita baiki sendiri.', '轮胎嘛，我们自己修。', '輪胎嘛，我們自己修。', 'タイヤは、自分たちで直そう。', 'டயரை நாமளே சரி பண்ணுவோம்.'),
      L('wei', 'Every ringgit he saves, I match. A deal\'s a deal.', 'Setiap ringgit dia simpan, aku tambah sama banyak. Janji tetap janji.', '他存一令吉，我补一令吉。说到做到。', '他存一令吉，我補一令吉。說到做到。', 'アルジュンが貯めた分だけ、私も出す。約束は約束。', 'அவன் சேர்க்கிற ஒவ்வொரு ரிங்கிட்டுக்கும் நானும் ஒண்ணு போடுவேன். சொன்னா சொன்னதுதான்.'),
    ],
  },
  { // 4 Fri, same night: very sure. Aina on the phone under one bulb, smiling and certain.
    art: scene('street') + '<circle cx="190" cy="40" r="40" fill="#F6D08A" opacity=".35" filter="url(#b12-bl)"/>' + aina({ x: 160, y: 198, s: 1, face: 'happy', pose: 'call', turn: 'r', look: 'up' }),
    scene: 'market', cam: { shot: 'insert', on: [165, 80] },
    lines: [
      L('aina', 'Go ahead with the roofer, Mak. My bonus comes on the 15th.', 'Mak teruskan je dengan tukang bumbung tu. Bonus Aina masuk 15 hari bulan.', '妈，就叫师傅修屋顶吧。我的花红15号就到。', '媽，就叫師傅修屋頂吧。我的花紅15號就到。', 'お母さん、屋根屋さんに頼んでいいよ。ボーナスは15日に入るから。', 'அம்மா, கூரைக்காரரை வேலையை ஆரம்பிக்கச் சொல்லுங்க. என் போனஸ் 15-ஆம் தேதி வரும்.'),
      L('narrator', 'Aina was very sure.', 'Aina sangat yakin.', 'Aina非常肯定。', 'Aina非常肯定。', 'アイナは自信満々だった。', 'ஐனா மிக உறுதியாக இருந்தாள்.'),
    ],
  },
  { // 5 Sat: free. The park: Arjun mid-cartwheel over the mat, the girls laughing on it with the picnic.
    art: scene('park', { mat: true }) + aina({ x: 128, y: 190, s: 0.86, face: 'laugh', pose: 'kneel', turn: 'r' }) + it('picnic', 160, 176, 0.6)
      + wei({ x: 196, y: 192, s: 0.88, face: 'laugh', pose: 'kneelopen', flip: true, turn: 'l' }) + `<g transform="rotate(-70 262 150)">${arjun({ x: 262, y: 184, s: 0.9, face: 'laugh', pose: 'cheer' })}</g>` + '<path d="M232 120Q262 96 292 122M226 136Q262 104 298 140" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/>',
    cam: { shot: 'wide', on: [160, 100] },
    tip: T('Parks, libraries, picnics: holiday fun that\'s free or nearly free.', 'Taman, perpustakaan, berkelah: seronok cuti yang percuma atau hampir percuma.', '公园、图书馆、野餐：免费或几乎免费的假期乐趣。', '公園、圖書館、野餐：免費或幾乎免費的假期樂趣。', '公園、図書館、ピクニック。タダかほぼタダの休日の楽しみ。', 'பூங்கா, நூலகம், சுற்றுலா: இலவசமான அல்லது கிட்டத்தட்ட இலவசமான விடுமுறைக் கொண்டாட்டம்.'),
    lines: [
      L('arjun', 'Best day of the holidays!', 'Hari cuti paling best!', '这是假期最棒的一天！', '這是假期最棒的一天！', '休みで一番楽しい日！', 'லீவுலயே இதுதான் சூப்பர் நாள்!'),
      L('wei', 'Sandwiches and water: RM6 for three.', 'Sandwic dan air: RM6 untuk bertiga.', '三明治加水：三个人RM6。', '三明治加水：三個人RM6。', 'サンドイッチと水で、3人でRM6。', 'சாண்ட்விச்சும் தண்ணியும்: மூணு பேருக்கு RM6.'),
    ],
  },
  { // 6 Sun: five books. Low, under the tall shelves: Arjun small, holding up his five books.
    art: dropped(scene('library'), 30, '#4A2E24') + aina({ x: 206, y: 200, s: 1.0, face: 'happy', pose: 'chin', flip: true, turn: 'l' })
      + arjun({ x: 140, y: 196, s: 0.92, face: 'surprised', pose: 'hold', item: 'books', is: 0.7, turn: 'r', look: 'up' }),
    scene: 'library', cam: { shot: 'wide', on: [160, 136], angle: 'low' },
    lines: [
      L('arjun', 'Five books? For free?', 'Lima buku? Percuma?', '五本书？免费的？', '五本書？免費的？', '本が5冊？タダで？', 'அஞ்சு புத்தகமா? இலவசமா?'),
      L('aina', 'Free. Just bring them back in two weeks.', 'Percuma. Pulangkan je dalam dua minggu.', '免费。两个星期内还回来就好。', '免費。兩個星期內還回來就好。', 'タダ。2週間後に返せばいいの。', 'இலவசம். ரெண்டு வாரத்துல திருப்பிக் குடுத்தா போதும்.'),
      L('arjun', 'Is there one about fixing bicycles?', 'Ada tak buku pasal baiki basikal?', '有没有教人修脚车的书？', '有沒有教人修腳車的書？', '自転車の直し方の本、ある？', 'சைக்கிள் சரி பண்றது பத்தி ஏதாவது இருக்கா?'),
    ],
  },
  { // 7 Mon: done right. Wei waves her bonus slip over the split chart; Aina proud, her fund chart on the wall behind.
    art: scene('home', { back: true }) + meter(150, 84, 0.86, 0.7) + K.coffeeTable() + it('split', 150, 134, 0.6)
      + wei({ x: 214, y: 194, s: 1.0, face: 'laugh', pose: 'show', flip: true, turn: 'l', inHand: it('bonus', 0, -10, 0.55) }) + aina({ x: 96, y: 236, s: 1.42, face: 'happy', pose: 'hips', turn: 'r' }),
    scene: 'home', cam: { shot: 'medium', on: [158, 110] },
    tip: T('Got a bonus? Save a part first, then enjoy the rest guilt-free.', 'Dapat bonus? Simpan sebahagian dulu, kemudian nikmati selebihnya tanpa rasa bersalah.', '拿到花红？先存一部分，剩下的安心享受。', '拿到花紅？先存一部分，剩下的安心享受。', 'ボーナスが出たら、まず一部を貯金。残りは気兼ねなく楽しもう。', 'போனஸ் கிடைத்ததா? முதலில் ஒரு பகுதியைச் சேமியுங்கள், பிறகு மீதியைக் குற்ற உணர்வின்றி அனுபவியுங்கள்.'),
    lines: [
      L('wei', 'Bonus, RM800! Half saved, and every pay-later cleared.', 'Bonus RM800! Separuh simpan, dan semua pay later dah langsai.', '花红RM800！一半存起来，先买后付全部还清。', '花紅RM800！一半存起來，先買後付全部還清。', 'ボーナスRM800！半分は貯金、後払いも全部完済。', 'போனஸ் RM800! பாதி சேமிப்பு, எல்லா pay later-உம் அடைச்சாச்சு.'),
      L('aina', 'Look at you. Mine comes on the 15th.', 'Wah, hebat kau. Aku punya masuk 15 hari bulan.', '你看你，真棒！我的15号才到。', '你看你，真棒！我的15號才到。', 'すごいじゃん。私のは15日。', 'பாரேன் உன்னை. என்னோடது 15-ஆம் தேதி வரும்.'),
    ],
  },
  // ---- Act 2A: the tin ----
  { // 8 Tue: don't click. Kamala holds out her phone; Wei half out of her chair; Raju behind the counter in the red apron.
    art: scene('kopitiam', { back: true }) + raju({ x: 104, y: 160, s: 1, face: 'laugh', pose: 'rest', apron: NEW, turn: 'r' }) + KCOUNTER
      + '<path d="M170 150h40v4h-40zM174 154h4v30h-4zM202 154h4v30h-4z" fill="#3E3A40"/>' + wei({ x: 186, y: 194, s: 1.0, face: 'surprised', pose: 'rest', turn: 'r', bend: 24 })
      + kamala({ x: 268, y: 304, s: 2.1, face: 'think', pose: 'show', flip: true, turn: 'l', inHand: it('scamtext', 0, -14, 0.5) }),
    scene: 'kopitiam', cam: { shot: 'wide', on: [160, 100] },
    tip: T('A parcel "fee" by text link? Don\'t click. Ask the courier yourself.', '“Caj” bungkusan melalui pautan dalam mesej? Jangan klik. Tanya sendiri syarikat kurier.', '短信链接要你付包裹“费用”？别点。自己去问快递公司。', '簡訊連結要你付包裹「費用」？別點。自己去問快遞公司。', '荷物の「手数料」をリンクで請求？クリックせず、配送会社に自分で確認を。', 'இணைப்பு வழியாகப் பார்சல் “கட்டணம்” கேட்கிறார்களா? கிளிக் செய்யாதீர்கள். கூரியரிடம் நீங்களே கேளுங்கள்.'),
    lines: [
      L('kamala', 'A text says my parcel\'s stuck. Pay RM2.50 at this link?', 'Ada mesej kata bungkusan aunty tersangkut. Bayar RM2.50 kat link ni?', '有短信说我的包裹卡住了。要在这个链接付RM2.50？', '有簡訊說我的包裹卡住了。要在這個連結付RM2.50？', '荷物が止まってるってメッセージが来たの。このリンクでRM2.50払うの？', 'என் பார்சல் நின்னுடுச்சுன்னு ஒரு மெசேஜ். இந்த link-ல RM2.50 கட்டணுமா?'),
      L('wei', 'Aunty, don\'t! That\'s a scam. I know scams now.', 'Aunty, jangan! Tu scam. Saya dah kenal scam sekarang.', '阿姨，不要！那是诈骗。我现在懂诈骗了。', '阿姨，不要！那是詐騙。我現在懂詐騙了。', 'おばさん、だめ！それ詐欺だよ。今の私、詐欺には詳しいの。', 'அத்தை, வேணாம்! அது மோசடி. இப்போ எனக்கு மோசடி நல்லாத் தெரியும்.'),
      L('raju', 'She caught one for me too. Ask her about stickers.', 'Dia pernah tangkap satu untuk uncle juga. Tanya dia pasal pelekat.', '她也帮我抓过一个。问问她贴纸的事。', '她也幫我抓過一個。問問她貼紙的事。', 'わしのも見破ってくれた。シールの話、聞いてごらん。', 'எனக்கும் ஒண்ணைக் கண்டுபிடிச்சுக் குடுத்தா. Sticker பத்திக் கேளு.'),
    ],
  },
  { // 9 Wed: the slip. Aina reads hers aloud; Wei beside her hides hers, and we see it: AINA.
    art: scene('kopitiam', { table: 160 }) + it('slips', 160, 120, 0.7)
      + aina({ x: 128, y: 190, s: 0.9, face: 'happy', pose: 'show', turn: 'r', inHand: slip('', 0, -8, 0.7) })
      + wei({ x: 196, y: 192, s: 0.9, face: 'think', pose: 'hip', flip: true, turn: 'l', inHand: slip('AINA', -10, 4, 0.9, -10) }),
    scene: 'kopitiam', cam: { shot: 'close', on: [162, 104] },
    lines: [
      L('raju', 'Grace left the names with me. Pick one!', 'Grace tinggalkan nama-nama dengan uncle. Pilih satu!', 'Grace把名字留在我这里。抽一个！', 'Grace把名字留在我這裡。抽一個！', 'グレースが名前を預けていった。一枚引いて！', 'கிரேஸ் பேருங்களை என்கிட்ட விட்டுட்டுப் போனா. ஒண்ணு எடுங்க!'),
      L('aina', 'Grace. Handmade, and under RM30.', 'Grace. Buatan tangan, dan bawah RM30.', 'Grace。手作的，不超过RM30。', 'Grace。手作的，不超過RM30。', 'グレース。手作りで、RM30以内。', 'கிரேஸ். கையால செஞ்சது, RM30-க்குள்ள.'),
      L('narrator', 'Wei\'s slip said AINA.', 'Kertas Wei tertulis AINA.', 'Wei的纸条上写着：AINA。', 'Wei的紙條上寫著：AINA。', 'ウェイの紙には、AINAと書いてあった。', 'வெய்யின் சீட்டில் AINA என்று இருந்தது.'),
    ],
  },
  { // 10 Thu (rain): it rained again. Low, under the torn canopy: Raju calmly opens his rainy-day tin; the girls under one umbrella.
    art: apamStall(raju({ x: 180, y: 164, s: 0.88, face: 'happy', pose: 'give', item: 'raintin', is: 0.75, apron: NEW, flip: true, turn: 'l', look: 'down' }), '') + TORN + K.rain()
      + aina({ x: 64, y: 206, s: 1.06, face: 'surprised', turn: 'r' }) + wei({ x: 102, y: 210, s: 1.08, face: 'laugh', pose: 'show', turn: 'r', inHand: it('umbrellabig', -2, -54, 0.62) }),
    scene: 'market', cam: { shot: 'medium', on: [146, 104], angle: 'low' },
    lines: [
      L('raju', 'It rained again. This time, I had the tin.', 'Hujan lagi. Kali ni, uncle ada tin.', '又下雨了。这一次，我有罐子。', '又下雨了。這一次，我有罐子。', 'また雨が降った。今度は、缶があった。', 'மறுபடியும் மழை. இந்த முறை, என்கிட்ட டின் இருந்துச்சு.'),
      L('wei', 'Uncle! Best line of the year.', 'Uncle! Ayat terbaik tahun ni.', '叔叔！年度最佳金句。', '叔叔！年度最佳金句。', 'おじさん！今年一番の名言。', 'மாமா! இந்த வருஷத்தோட சிறந்த வசனம்.'),
    ],
  },
  { // 11 Fri, same night: a tin you never open. Close on Aina explaining, rain off the canopy edge, Raju soft behind.
    art: apamStall(`<g filter="url(#b12-b2)">${raju({ x: 192, y: 164, s: 0.88, face: 'happy', apron: NEW, flip: true, turn: 'l' })}</g>`, '') + K.rain()
      + aina({ x: 150, y: 202, s: 1.04, face: 'happy', pose: 'gesture', turn: 'r' }) + '<path d="M90 44Q150 32 210 44" stroke="#9E3A2A" stroke-width="10" fill="none"/><path d="M110 50v8M140 48v10M172 48v7M196 50v8" stroke="#B9C8DA" stroke-width="1" opacity=".7"/>',
    scene: 'market', cam: { shot: 'xclose', on: [152, 82] },
    lines: [
      L('raju', 'A tin you never open is just a tin.', 'Tin yang tak pernah dibuka, cuma tin biasa.', '从来不打开的罐子，就只是个罐子。', '從來不打開的罐子，就只是個罐子。', '開けない缶は、ただの缶だ。', 'திறக்காத டின், வெறும் டின் தான்.'),
      L('wei', 'Uncle, that makes no sense.', 'Uncle, tak masuk akal langsung.', '叔叔，这说不通啦。', '叔叔，這說不通啦。', 'おじさん、意味わかんないよ。', 'மாமா, அதுல ஒரு அர்த்தமும் இல்ல.'),
      L('aina', 'It does. Savings are for days like this.', 'Masuk akal. Simpanan memang untuk hari macam ni.', '说得通啊。存钱就是为了这种日子。', '說得通啊。存錢就是為了這種日子。', 'わかるよ。貯金は、こういう日のためにあるの。', 'அர்த்தம் இருக்கு. சேமிப்பு இப்படிப்பட்ட நாளுக்குத்தான்.'),
    ],
  },
  { // 12 Sat: patch it. From a little above on the five-foot way: the red bike upside down on saddle and bars, Raju's hands on the tyre, Arjun with the patch kit.
    art: scene('kopitiam', { table: false }) + '<path d="M-10 150H330V210H-10Z" fill="#C7B08C"/><path d="M-10 150H330V154H-10Z" fill="#A8906C"/>'
      + raju({ x: 150, y: 178, s: 0.92, face: 'think', pose: 'rest', apron: NEW, turn: 'r', bend: 26, look: 'down' })
      + '<ellipse cx="160" cy="181" rx="40" ry="3.4" fill="#120E1E" opacity=".25"/>' + `<g transform="translate(160 154) rotate(180)">${it('bicycle', 0, 0, 2.2)}</g>`
      + '<path d="M182 116a22 22 0 0 1 22 18" stroke="#E3B54A" stroke-width="3" fill="none"/><path d="M123 115a22 22 0 0 1 21-1.4l-.9 4.4a18 18 0 0 0-19 1.2Z" fill="#E3B54A" stroke="#B8862E" stroke-width=".6"/>'
      + `<path d="M156 102L128 112M164 108L146 114" stroke="${SK.raju}" stroke-width="4.6" stroke-linecap="round"/><path d="M158 101L152 103M166 107L160 109" stroke="#6F8FA6" stroke-width="7" stroke-linecap="round"/>`
      + `<ellipse cx="125.6" cy="114" rx="3.2" ry="2.3" fill="${SK.raju}"/><ellipse cx="144" cy="115" rx="3.2" ry="2.3" fill="${SK.raju}"/><path d="M123.6 112.8l3.6 1M142 113.8l3.6 1" stroke="#3B2723" stroke-width=".4" opacity=".5"/>` + arjun({ x: 236, y: 196, s: 1.08, face: 'laugh', pose: 'show', flip: true, turn: 'l', inHand: it('patch', 0, -8, 0.42) }),
    scene: 'kopitiam', cam: { shot: 'medium', on: [168, 122], angle: 'high' },
    tip: T('Second-hand and fixed up can be as good as new, for far less.', 'Barang terpakai yang dibaiki boleh sebagus baru, dengan harga jauh lebih murah.', '二手的修一修，可以跟新的一样好，还便宜得多。', '二手的修一修，可以跟新的一樣好，還便宜得多。', '中古も直せば新品同様。しかもずっと安い。', 'பழையதைச் சரிசெய்தால் புதியது போலவே இருக்கும், விலையோ மிகக் குறைவு.'),
    lines: [
      L('raju', 'New tyres: RM50. A patch and two afternoons: RM12.', 'Tayar baru: RM50. Tampal, dan dua petang: RM12.', '新轮胎：RM50。补一补，花两个下午：RM12。', '新輪胎：RM50。補一補，花兩個下午：RM12。', '新しいタイヤはRM50。パッチと午後2回でRM12。', 'புது டயர்: RM50. ஒரு ஒட்டும் ரெண்டு மதியமும்: RM12.'),
      L('arjun', 'So RM34 to save. I\'m nearly rich!', 'Jadi kena simpan RM34. Saya dah nak kaya!', '那就只要存RM34。我快变有钱人了！', '那就只要存RM34。我快變有錢人了！', 'じゃあ貯めるのはRM34。もうすぐお金持ち！', 'அப்போ RM34 சேர்க்கணும். நான் கிட்டத்தட்டப் பணக்காரன்!'),
    ],
  },
  { // 13 Sun: the free show. Low: the neighbours' lights strung across the houses, three small figures under them.
    art: dropped(scene('night'), 26, '#1E2340') + [[60, 74], [160, 62], [262, 74]].map(([x, y]) => it('xmaslights', x, y, 2.4)).join('')
      + K.folk([]) + aina({ x: 132, y: 196, s: 0.7, face: 'laugh', turn: 'r', look: 'up' }) + arjun({ x: 158, y: 196, s: 0.72, face: 'laugh', pose: 'point', look: 'up' }) + wei({ x: 186, y: 196, s: 0.7, face: 'happy', flip: true, turn: 'l', look: 'up', pose: 'rest' }),
    scene: 'night', cam: { shot: 'wide', on: [160, 136], angle: 'low' },
    lines: [
      L('narrator', 'The neighbours\' Christmas lights: the best free show in town.', 'Lampu Krismas jiran-jiran: pertunjukan percuma terbaik di bandar.', '邻居家的圣诞灯饰：城里最好看的免费表演。', '鄰居家的聖誕燈飾：城裡最好看的免費表演。', 'ご近所のクリスマスの明かり。街で一番の無料ショー。', 'அக்கம்பக்கத்தாரின் கிறிஸ்துமஸ் விளக்குகள்: ஊரிலேயே சிறந்த இலவசக் காட்சி.'),
      L('wei', 'Looking is free. Wallets stay in bags.', 'Tengok percuma. Dompet duduk dalam beg.', '看不用钱。钱包留在包里。', '看不用錢。錢包留在包裡。', '見るのはタダ。財布はかばんの中。', 'பார்க்கிறது இலவசம். பர்ஸ் பைக்குள்ளேயே இருக்கட்டும்.'),
      L('aina', 'Two more days to my bonus.', 'Lagi dua hari bonus aku masuk.', '再两天，我的花红就到了。', '再兩天，我的花紅就到了。', 'ボーナスまで、あと2日。', 'என் போனஸுக்கு இன்னும் ரெண்டு நாள்.'),
    ],
  },
  { // 14 Mon: due Friday. Waist-up at the counter: Aina leans in over her teh, Raju's finger on a line in his notebook, the 18th, a Friday, circled behind him.
    art: closer(scene('kopitiam', { back: true }) + cal(224, 40, '18', 'FRI', 1.1) + raju({ x: 114, y: 160, s: 1, face: 'happy', pose: 'rest', apron: NEW, turn: 'r', bend: 10, look: 'down' }) + KCOUNTER
      + notebookAmt('', 146, 104, 0.42) + '<ellipse cx="153" cy="103" rx="5" ry="3" fill="none" stroke="#C44A36" stroke-width=".9"/>' + aina({ x: 206, y: 200, s: 1.12, face: 'laugh', pose: 'rest', flip: true, turn: 'l', bend: 12 }) + it('teh', 182, 100, 0.4), 1.2, 160, 96),
    scene: 'kopitiam', cam: { shot: 'medium', on: [160, 76] },
    lines: [
      L('raju', 'Bonus tomorrow, Aina?', 'Esok bonus, Aina?', '明天发花红吗，Aina？', '明天發花紅嗎，Aina？', '明日ボーナスかい、アイナ？', 'நாளைக்கு போனஸா, ஐனா?'),
      L('aina', 'Tomorrow. And Mak\'s roof is already fixed!', 'Esok. Dan bumbung Mak dah siap dibaiki!', '明天！我妈的屋顶也已经修好了！', '明天！我媽的屋頂也已經修好了！', '明日！お母さんの屋根も、もう直ったの！', 'நாளைக்கு. அம்மாவோட கூரையும் சரி பண்ணியாச்சு!'),
      L('narrator', 'The roofer\'s bill: RM600. Due Friday.', 'Bil tukang bumbung: RM600. Perlu dibayar hari Jumaat.', '修屋顶的账单：RM600。星期五到期。', '修屋頂的帳單：RM600。星期五到期。', '屋根屋の請求はRM600。支払いは金曜。', 'கூரைக்காரரின் பில்: RM600. வெள்ளிக்கிழமைக்குள் கட்ட வேண்டும்.'),
    ],
  },
  // ---- Midpoint ----
  { // 15 Tue: no bonus. From above: Aina on the floor by the sofa with the email; Wei crouched beside her; the chart behind.
    art: lifted(scene('home') + meter(140, 70, 0.86, 0.75), 24, '#5A3A2E') + '<ellipse cx="170" cy="186" rx="150" ry="20" fill="#2F5D5A"/>'
      + aina({ x: 118, y: 188, s: 0.94, face: 'worried', pose: 'kneel', turn: 'r', look: 'down' }) + wei({ x: 172, y: 190, s: 0.94, face: 'worried', pose: 'kneelreach', flip: true, turn: 'l' }),
    scene: 'home', cam: { shot: 'medium', on: [160, 112], angle: 'high', fg: `<g transform="translate(206 -8) scale(.68)">${fg.phone([["'No bonus this year.", ''], ['The company had', ''], ["a tough year.'", '']], 0, 'HR · 15 Dec', 'none', 6, 'Email')}</g>` },
    lines: [
      L('aina', '\'No bonus this year. The company had a tough year.\'', '‘Tiada bonus tahun ini. Syarikat melalui tahun yang sukar.’', '“今年没有花红。公司今年经营困难。”', '「今年沒有花紅。公司今年經營困難。」', '「今年は賞与なし。会社にとって厳しい一年でした」', '‘இந்த ஆண்டு போனஸ் இல்லை. நிறுவனத்துக்குக் கடினமான ஆண்டு.’'),
      L('wei', 'Oh, Aina.', 'Aduh, Aina.', '噢，Aina……', '噢，Aina……', 'ああ、アイナ…', 'ஐயோ, ஐனா.'),
      L('aina', 'And the roof is already done. RM600.', 'Dan bumbung dah siap. RM600.', '屋顶已经修好了。RM600。', '屋頂已經修好了。RM600。', '屋根はもう直っちゃった。RM600。', 'கூரை வேலை முடிஞ்சாச்சு. RM600.'),
    ],
  },
  // ---- Act 2B: the one with the plan ----
  { // 16 Wed: one transfer. The transfer in Aina's hand; her other hand pulls the chart's marker down.
    art: `<g filter="url(#b12-b2)">${scene('home')}</g>` + '<rect x="160" y="60" width="90" height="110" fill="#EDEFF0"/>' + meter(204, 108, 0.3, 0.8),
    scene: 'home', cam: { shot: 'insert', on: [200, 108], fg: `<g transform="translate(8 26) scale(.8)">${fg.phone([['Emergency fund', 'RM900'], ['To: Roofer', '−RM600', 1], ['Left', 'RM300', 'total']], 0, 'Transfer done', SK.aina, -4, 'Bank')}</g>`
      + fg.hand(SK.aina, 'right', { x: 190, y: 142, s: 1.0, a: -6, sleeve: '#29605B', point: true }) },
    tip: T('Never spend a bonus before it\'s in your account.', 'Jangan belanja bonus sebelum ia masuk akaun.', '花红还没进户口，就别先花。', '花紅還沒進戶口，就別先花。', 'ボーナスは、口座に入るまで使わない。', 'போனஸ் உங்கள் கணக்கில் வரும் முன் அதைச் செலவழிக்காதீர்கள்.'),
    lines: [
      L('aina', 'Emergency fund to roofer: RM600. RM300 left.', 'Tabung kecemasan ke tukang bumbung: RM600. Tinggal RM300.', '应急基金转给修屋顶的：RM600。剩RM300。', '應急基金轉給修屋頂的：RM600。剩RM300。', '緊急用の貯金から屋根屋へRM600。残りRM300。', 'அவசரகால நிதியிலிருந்து கூரைக்காரருக்கு: RM600. மிச்சம் RM300.'),
      L('aina', 'Three months of saving. One transfer.', 'Tiga bulan menyimpan. Satu pindahan.', '存了三个月。一次转账就没了。', '存了三個月。一次轉帳就沒了。', '3か月の貯金が、振込一回で。', 'மூணு மாசச் சேமிப்பு. ஒரே ஒரு transfer.'),
    ],
  },
  { // 17 Thu: busy. Over Aina's back at the table: Wei at the door with her tote.
    art: scene('home', { back: true }) + wei({ x: 58, y: 176, s: 0.8, face: 'happy', pose: 'hold', item: 'tote', is: 0.6, turn: 'r' }),
    scene: 'home', cam: { shot: 'close', on: [76, 104], flip: true, fg: fg.ots('aina', 'left') },
    lines: [
      L('wei', 'Thursday! Coming to the market?', 'Khamis! Nak pergi pasar malam?', '星期四！要去夜市吗？', '星期四！要去夜市嗎？', '木曜だよ！マーケット行く？', 'வியாழன்! சந்தைக்கு வர்றியா?'),
      L('aina', 'Busy.', 'Sibuk.', '没空。', '沒空。', '忙しい。', 'பிஸி.'),
      L('narrator', 'Aina was never busy on Thursdays.', 'Aina tak pernah sibuk pada hari Khamis.', 'Aina星期四从来不忙。', 'Aina星期四從來不忙。', 'アイナが木曜に忙しいことなど、一度もなかった。', 'ஐனா வியாழக்கிழமைகளில் ஒருபோதும் பிஸியாக இருந்ததில்லை.'),
    ],
  },
  { // 18 Fri: that's different. The kitchen: Wei at the stove cooking for her; Aina at the counter, arms folded.
    art: scene('kitchen') + wei({ x: 222, y: 222, s: 1.36, face: 'surprised', pose: 'gesture', flip: true, turn: 'l', inHand: '<ellipse cx="0" cy="-6" rx="11" ry="4" fill="#3E302E"/><path d="M10-6h12" stroke="#3E302E" stroke-width="3" stroke-linecap="round"/><path d="M-7-9h14" stroke="#D9A860" stroke-width="2.6" stroke-linecap="round"/>' })
      + aina({ x: 96, y: 222, s: 1.34, face: 'think', pose: 'cross', turn: 'r' }) + '',
    cam: { shot: 'wide', on: [160, 100] },
    lines: [
      L('aina', 'I\'m skipping Grace\'s gift exchange.', 'Aku tak pergi tukar hadiah Grace.', 'Grace的交换礼物，我不去了。', 'Grace的交換禮物，我不去了。', 'グレースのプレゼント交換、パスする。', 'கிரேஸோட பரிசுப் பரிமாற்றத்துக்கு நான் வரல.'),
      L('wei', 'It\'s RM30. You lent me RM20 when I had RM11.', 'RM30 je. Kau pinjamkan aku RM20 masa aku tinggal RM11.', '才RM30。我只剩RM11的时候，你借了我RM20。', '才RM30。我只剩RM11的時候，你借了我RM20。', 'RM30だよ。私の残りがRM11のとき、RM20貸してくれたじゃん。', 'RM30 தான். என்கிட்ட RM11 இருந்தப்போ நீ RM20 கடன் குடுத்தே.'),
      L('aina', 'That\'s different. I\'m the one with the plan.', 'Tu lain. Aku yang selalu ada rancangan.', '那不一样。我是那个有计划的人。', '那不一樣。我是那個有計劃的人。', 'それとこれは別。計画を立てる側は私なの。', 'அது வேற. திட்டம் போடுறவ நான் தான்.'),
    ],
  },
  { // 19 Sat: tastes like home. Two plates on the counter, the delivery basket never ordered; Wei's hand pushes a spoon over.
    art: scene('kitchen') + '<path d="M0 118H320V124H0Z" fill="#C9B28A"/>' + it('friedrice', 157, 114, 0.42) + it('friedrice', 187, 116, 0.42) + '<path d="M168 119l9-2" stroke="#B9BEC2" stroke-width="1.4" stroke-linecap="round"/>',
    scene: 'kitchen', cam: { shot: 'insert', on: [172, 112], fg: `<g transform="translate(-2 -26) scale(.5)">${fg.phone([['Fried rice ×2', 'RM38'], ['Not ordered', '', 1]], 0, 'Delivery basket', 'none', -6, 'Food app')}</g>`
      + fg.hand(SK.wei, 'right', { x: 246, y: 130, s: 0.85, a: -14 }) },
    tip: T('Rainy day in? Cooking together costs a fraction of delivery.', 'Hujan, duduk rumah? Masak bersama jauh lebih murah daripada order.', '下雨待在家？一起煮饭，花费只是外卖的零头。', '下雨待在家？一起煮飯，花費只是外賣的零頭。', '雨で家にいる日は、一緒に料理。デリバリーよりずっと安い。', 'மழையில் வீட்டிலா? சேர்ந்து சமைப்பது delivery செலவில் ஒரு சிறு பங்குதான்.'),
    lines: [
      L('wei', 'Fried rice for two: RM6. Delivery would\'ve been RM38.', 'Nasi goreng untuk dua orang: RM6. Kalau order, RM38.', '两人份炒饭：RM6。叫外卖要RM38。', '兩人份炒飯：RM6。叫外賣要RM38。', '2人分のチャーハンでRM6。デリバリーならRM38。', 'ரெண்டு பேருக்கு நாசி கோரெங்: RM6. Delivery-ன்னா RM38 ஆயிருக்கும்.'),
      L('aina', '…It tastes like home.', '…Rasa macam masakan rumah.', '……有家的味道。', '……有家的味道。', '…家の味がする。', '…வீட்டுச் சாப்பாடு மாதிரியே இருக்கு.'),
      L('wei', 'Then eat. Plans can wait.', 'Jadi makanlah. Rancangan boleh tunggu.', '那就吃吧。计划可以等。', '那就吃吧。計劃可以等。', 'なら食べて。計画はあとでいい。', 'அப்போ சாப்பிடு. திட்டம் காத்திருக்கட்டும்.'),
    ],
  },
  { // 20 Sun: working on it. Low under the ten-year tree: Grace high on the step ladder with the star; Wei's hands steadying it in front of us.
    art: dropped(scene('xmas', { day: true }), 22, '#E3CBA6') + '<path d="M214 186L226 132M250 186L238 132M218 168h28M221 150h22M224 134h16" stroke="#8A8378" stroke-width="3" fill="none" stroke-linecap="round"/>'
      + ['M206 214L217 168', 'M258 214L246 168'].map(p => `<path d="${p}" stroke="${SK.wei}" stroke-width="9" stroke-linecap="round"/>`).join('')
      + [[218, 166, -1], [245, 166, 1]].map(([x, y, sg]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="5" fill="${SK.wei}"/><path d="M${x - 5} ${y - 2}h10M${x - 5} ${y + 1}h10" stroke="#3B2723" stroke-width=".5" opacity=".4"/><ellipse cx="${x + sg * 5}" cy="${y + 2}" rx="2.2" ry="3.2" fill="${SK.wei}"/>`).join('')
      + grace({ x: 232, y: 134, s: 0.8, face: 'laugh', pose: 'wave', turn: 'r', look: 'up', inHand: it('xmasstar', 0, -6, 0.32) }),
    scene: 'xmas', cam: { shot: 'wide', on: [160, 136], angle: 'low', fg: '' },
    lines: [
      L('grace', 'Same tree for ten years. The lights came from my mum in Sabah.', 'Pokok yang sama sepuluh tahun. Lampu ni dari mak aku di Sabah.', '这棵树用了十年。灯是我妈妈从沙巴寄来的。', '這棵樹用了十年。燈是我媽媽從沙巴寄來的。', 'このツリーは10年もの。電飾はサバの母から。', 'பத்து வருஷமா அதே மரம். விளக்குகள் சபாவுல இருக்கிற என் அம்மா குடுத்தது.'),
      L('grace', 'Is Aina coming?', 'Aina datang tak?', 'Aina会来吗？', 'Aina會來嗎？', 'アイナは来る？', 'ஐனா வருவாளா?'),
      L('wei', 'Working on it.', 'Tengah usahakan.', '我在想办法。', '我在想辦法。', 'なんとかするよ。', 'முயற்சி பண்றேன்.'),
    ],
  },
  { // 21 Mon: off the fridge. Close at the fridge door: Aina's hand lifting the invitation off, the lowered chart beside it, Duit watching from on top.
    art: closer(scene('home') + fridge(120) + meter(164, 104, 0.3, 0.9) + duit({ x: 150, y: 40, s: 0.72 })
      + aina({ x: 218, y: 204, s: 1.1, face: 'worried', pose: 'show', flip: true, turn: 'l', look: 'up', inHand: invite(0, -8, 0.8, -12) }), 1.5, 176, 92),
    scene: 'home', cam: { shot: 'medium', on: [160, 100] },
    lines: [
      L('narrator', 'That night, Aina took Grace\'s invitation off the fridge.', 'Malam itu, Aina tanggalkan kad jemputan Grace dari peti sejuk.', '那天晚上，Aina把Grace的请柬从冰箱上拿了下来。', '那天晚上，Aina把Grace的請柬從冰箱上拿了下來。', 'その夜、アイナはグレースの招待状を冷蔵庫から外した。', 'அன்றிரவு, கிரேஸின் அழைப்பிதழை ஐனா ஃப்ரிட்ஜிலிருந்து எடுத்தாள்.'),
    ],
  },
  // ---- Low point ----
  { // 22 Tue (rain): some planner. From behind and a little above: Aina small on the floor before a big grey window streaked with rain; Duit pushes the invitation to her.
    art: '<rect x="-10" y="-10" width="340" height="220" fill="#7E6656"/><path d="M-10 142H330V210H-10Z" fill="#4E3A30"/><ellipse cx="160" cy="156" rx="70" ry="8" fill="#2F5D5A" opacity=".85"/>'
      + '<rect x="108" y="76" width="104" height="60" fill="#E9D8B8"/><rect x="112" y="80" width="96" height="52" fill="#7D8894"/><rect x="112" y="80" width="96" height="52" fill="#9AA8B4" opacity=".4"/>'
      + '<ellipse cx="152" cy="116" rx="16" ry="12" fill="#C9D3DC" opacity=".2"/>' + `<path d="${Array.from({ length: 40 }, (_, i) => `M${114 + (i % 8) * 12 + (i * 7) % 9} ${82 + Math.floor(i / 8) * 9 + (i * 5) % 7}l-2 6`).join('')}" stroke="#DCE4EA" stroke-width=".7" opacity=".75"/>`
      + '<path d="M160 80v52M112 106h96" stroke="#E9D8B8" stroke-width="2"/><path d="M98 72H116Q112 104 117 140H98Z" fill="#B5533A"/><path d="M222 72H204Q208 104 203 140H222Z" fill="#B5533A"/><path d="M96 70H224" stroke="#8A5A3C" stroke-width="2.4"/>'
      + `<clipPath id="b12-sit"><path d="M0 0H320V150H0Z"/></clipPath><g clip-path="url(#b12-sit)"><g transform="translate(140 112) scale(.17)">${fg.ots('aina', 'left').replace(/filter="url\(#b12-b2\)"/g, '')}</g></g>`
      + crumpled(182, 150, 0.6) + duit({ x: 198, y: 154, s: 0.5, pose: 'walk', flip: true }),
    scene: 'home', cam: { shot: 'close', on: [160, 106], angle: 'high' },
    lines: [
      L('aina', 'Three months of plans, and I\'m back to RM300.', 'Tiga bulan merancang, dan aku balik ke RM300.', '计划了三个月，结果又回到RM300。', '計劃了三個月，結果又回到RM300。', '3か月計画して、またRM300に逆戻り。', 'மூணு மாசத் திட்டம், மறுபடியும் RM300-க்கு வந்துட்டேன்.'),
      L('aina', 'Some planner I am.', 'Perancang konon.', '我还算什么计划高手。', '我還算什麼計劃高手。', '計画の達人が聞いてあきれる。', 'நான் பெரிய திட்டக்காரி தான்.'),
      L('duit', '…Meow.', '…Meow.', '……喵。', '……喵。', '…ニャー。', '…மியாவ்.'),
    ],
  },
  // ---- Turn ----
  { // 23 Wed: gone where? Over Raju's shoulder at the counter: Aina takes his line as it lands, his tin between them.
    art: closer(scene('kopitiam', { table: false }) + aina({ x: 150, y: 212, s: 1.12, face: 'think', pose: 'flat', turn: 'r', look: 'up' })
      + '<path d="M-10 150H330V210H-10Z" fill="#8A5A3C"/><path d="M-10 150H330V155H-10Z" fill="#A9744C"/>' + it('raintin', 188, 138, 0.62) + it('teh', 112, 140, 0.4), 1.2, 150, 110),
    scene: 'kopitiam', cam: { shot: 'medium', on: [160, 108], fg: fg.ots('raju', 'right') },
    tip: T('An emergency fund is meant to be used. Using it is the plan working.', 'Tabung kecemasan memang untuk digunakan. Menggunakannya bermakna rancangan berjaya.', '应急基金本来就是要用的。用了，就是计划成功了。', '應急基金本來就是要用的。用了，就是計劃成功了。', '緊急用の貯金は使うためのもの。使えたなら、計画はうまくいった。', 'அவசரகால நிதி பயன்படுத்தவே. அதைப் பயன்படுத்துவதே திட்டம் வேலை செய்வது.'),
    lines: [
      L('aina', 'I emptied my emergency fund, Uncle. Three months, gone.', 'Saya dah kosongkan tabung kecemasan, Uncle. Tiga bulan, lesap.', '叔叔，我的应急基金花光了。三个月，没了。', '叔叔，我的應急基金花光了。三個月，沒了。', 'おじさん、緊急用の貯金を使い切っちゃった。3か月分が消えた。', 'மாமா, என் அவசரகால நிதியைக் காலி பண்ணிட்டேன். மூணு மாசம், போச்சு.'),
      L('raju', 'Gone? It\'s over your mother\'s head, keeping her dry.', 'Lesap? Duit tu ada atas kepala mak kamu, jaga dia daripada basah.', '没了？它就在你妈妈头顶上，帮她挡雨呢。', '沒了？它就在你媽媽頭頂上，幫她擋雨呢。', '消えた？お母さんの頭の上で、雨から守ってるじゃないか。', 'போச்சா? அது உன் அம்மா தலைக்கு மேல இருக்கு, அவங்களை நனையாமக் காக்குது.'),
      L('raju', 'A tin you never open is just a tin. Yours worked.', 'Tin yang tak pernah dibuka, cuma tin biasa. Tin kamu dah berjasa.', '从来不打开的罐子，就只是个罐子。你的派上用场了。', '從來不打開的罐子，就只是個罐子。你的派上用場了。', '開けない缶は、ただの缶だ。君の缶は役目を果たした。', 'திறக்காத டின், வெறும் டின் தான். உன்னோடது வேலை செஞ்சுது.'),
    ],
  },
  // ---- Climax ----
  { // 24 Thu, Christmas Eve: WHOOSH. Low down the row: Arjun pedalling through the cheering crowd; Pak Mat's QR stand near us; Aina at the far end.
    art: scene('street') + aina({ x: 214, y: 160, s: 0.62, face: 'happy', turn: 'r', pose: 'show', inHand: crumpled(0, -6, 0.6) })
      + K.folk([[56, 180, 0.82, { shirt: '#8E2F4F', skin: '#8E5B3E', pose: 'both', laugh: true, turn: 1 }], [268, 176, 0.78, { shirt: '#2F6B66', skin: '#C98F6A', pose: 'clap', laugh: true, turn: -1, flip: true }],
        [96, 176, 0.74, { shirt: '#D9A441', skin: '#B07A54', pose: 'up', laugh: true, turn: 1 }]])
      + riding(150, 198, 0.95) + '<path d="M96 168q-14 0-22-4M100 176q-16 0-26-2" stroke="#F4EEE2" stroke-width="1.6" opacity=".7" stroke-linecap="round"/>'
      + wei({ x: 262, y: 210, s: 1.06, face: 'laugh', pose: 'thumbs', flip: true, turn: 'l' }),
    scene: 'market', cam: { shot: 'wide', on: [160, 136], angle: 'low', drift: 'right', fg: fg.bulbs() + `<g transform="translate(36 160) scale(2.2)">${pakMat(0, 0, 1)}</g>` },
    lines: [
      L('arjun', 'Paid! And I read the name first, like Akka Wei!', 'Dah bayar! Saya baca nama dulu, macam Akka Wei!', '付好了！我还先看了名字，跟Wei姐姐一样！', '付好了！我還先看了名字，跟Wei姐姐一樣！', '払った！ウェイお姉ちゃんみたいに、先に名前を読んだよ！', 'கட்டியாச்சு! வெய் அக்கா மாதிரி, முதல்ல பேரைப் படிச்சேன்!'),
      L('narrator', 'Then the red bicycle went WHOOSH down the whole row.', 'Lalu basikal merah itu pergi WHOOSH sepanjang barisan.', '接着，红色脚车咻——地冲过整排摊位。', '接著，紅色腳車咻——地衝過整排攤位。', 'そして赤い自転車は、ビューンと通りを駆け抜けた。', 'பிறகு சிவப்பு சைக்கிள் வரிசை முழுவதும் விர்ர்ர்னு பறந்தது.'),
      L('wei', '…Aina? You came!', '…Aina? Kau datang!', '……Aina？你来了！', '……Aina？你來了！', '…アイナ？来てくれたんだ！', '…ஐனா? நீ வந்துட்டியா!'),
    ],
  },
  { // 25 Fri, Christmas: my turn. Wei holds out the RAINY DAY jar; Aina's hands hover; Grace and the guests soft behind.
    art: `<g filter="url(#b12-b2)">${scene('xmas') + grace({ x: 250, y: 176, s: 0.84, face: 'laugh', pose: 'chin', flip: true, turn: 'l' }) + K.folk([[40, 172, 0.8, { shirt: '#C44A36', pose: 'up', cup: true, laugh: true, turn: 1 }]])}</g>`
      + '<circle cx="164" cy="116" r="46" fill="#F6D08A" opacity=".62" filter="url(#b12-bl)"/>' + aina({ x: 112, y: 206, s: 1.18, face: 'surprised', pose: 'give', turn: 'r' }) + wei({ x: 210, y: 206, s: 1.18, face: 'happy', pose: 'give', item: 'rainyjar', is: 1.25, flip: true, turn: 'l' }),
    scene: 'xmas', cam: { shot: 'medium', on: [160, 108] },
    lines: [
      L('wei', 'I drew you. A jar and RM25: RM30 exactly. For rainy days.', 'Aku dapat nama kau. Balang dan RM25: tepat RM30. Untuk hari hujan.', '我抽到你。罐子加RM25：刚好RM30。留给下雨天。', '我抽到你。罐子加RM25：剛好RM30。留給下雨天。', 'あなたを引いたの。びんとRM25で、ぴったりRM30。雨の日用に。', 'எனக்கு உன் பேரு வந்துச்சு. ஜாடியும் RM25-உம்: சரியா RM30. மழை நாளுக்கு.'),
      L('aina', 'Wei, I can\'t take this.', 'Wei, aku tak boleh terima ni.', 'Wei，这个我不能收。', 'Wei，這個我不能收。', 'ウェイ、これは受け取れないよ。', 'வெய், இதை என்னால வாங்க முடியாது.'),
      L('wei', 'October. RM20. When I had RM11. My turn.', 'Oktober. RM20. Masa aku tinggal RM11. Giliran aku pula.', '十月。RM20。我只剩RM11的时候。换我了。', '十月。RM20。我只剩RM11的時候。換我了。', '10月。RM20。私の残りがRM11だったとき。今度は私の番。', 'அக்டோபர். RM20. என்கிட்ட RM11 இருந்தப்போ. இப்போ என் முறை.'),
    ],
  },
  { // 26 Sat, same night: not one drop. Aina laughing and teary on the phone, the jar hugged to her chest, tree lights behind.
    art: `<g filter="url(#b12-b2)">${scene('xmas')}</g>` + aina({ x: 172, y: 204, s: 1.04, face: 'laugh', pose: 'call', turn: 'r' }) + it('rainyjar', 166, 118, 0.5)
      + '<path d="M176.6 91.6q1.4 2.6 0 3.6q-1.4-1-0 -3.6Z" fill="#9EC3CF"/>',
    scene: 'xmas', cam: { shot: 'xclose', on: [170, 100] },
    lines: [
      L('aina', 'Mak? Pouring at home… and not one drop inside?', 'Mak? Hujan lebat kat rumah… dan setitik pun tak masuk?', '妈？家里下大雨……屋里一滴都没漏？', '媽？家裡下大雨……屋裡一滴都沒漏？', 'お母さん？そっちは大雨…なのに一滴も漏れてないの？', 'அம்மா? அங்க பேய் மழையா… உள்ள ஒரு சொட்டுக் கூட இல்லையா?'),
      L('wei', 'Best RM600 you ever spent.', 'RM600 terbaik yang pernah kau belanja.', '这是你花得最值的RM600。', '這是你花得最值的RM600。', '今までで一番いいRM600の使い道だね。', 'நீ செலவு பண்ணதுலயே சிறந்த RM600.'),
      L('aina', '…Thank you. For the jar, too.', '…Terima kasih. Untuk balang tu juga.', '……谢谢你。还有那个罐子。', '……謝謝你。還有那個罐子。', '…ありがとう。びんのことも。', '…நன்றி. ஜாடிக்கும் சேர்த்து.'),
    ],
  },
  // ---- Payoff ----
  { // 27 Sun: we get it. Low: Arjun pedals past us, bell on the bar, speed lines behind; Kamala, Raju and the girls turn to watch him go.
    art: dropped(scene('park'), 18, '#8FB9C9') + '<path d="M150 154h70v6h-70zM154 160v16M216 160v16" stroke="#6E4533" stroke-width="3" fill="#8A5A3C"/>'
      + kamala({ x: 168, y: 176, s: 0.8, face: 'laugh', pose: 'clap', flip: true, turn: 'l' }) + raju({ x: 202, y: 176, s: 0.84, face: 'laugh', pose: 'gesture', apron: NEW, flip: true, turn: 'l' })
      + aina({ x: 248, y: 190, s: 0.9, face: 'laugh', turn: 'l', flip: true, pose: 'mouth' }) + wei({ x: 288, y: 194, s: 0.94, face: 'laugh', pose: 'cheer', flip: true, turn: 'l' })
      + '<path d="M14 150h40M6 162h52M20 174h34M10 186h44" stroke="#FFFFFF" stroke-width="2" opacity=".8" stroke-linecap="round"/>' + riding(104, 196, 1.08, false, true) + it('ding', 128, 116, 0.5) + '<ellipse cx="64" cy="194" rx="10" ry="4" fill="#D9C9A4" opacity=".7"/><ellipse cx="52" cy="190" rx="7" ry="3" fill="#D9C9A4" opacity=".5"/>',
    scene: 'park', cam: { shot: 'wide', on: [160, 136], angle: 'low' },
    lines: [
      L('arjun', 'WHOOOSH!', 'WHOOOSH!', '咻————！', '咻————！', 'ビューーン！', 'விர்ர்ர்ர்ர்!'),
      L('raju', 'Money is like a bicycle. Keep pedalling or you—', 'Duit ni macam basikal. Kena terus kayuh, kalau tak—', '钱就像脚车。要一直踩，不然就——', '錢就像腳車。要一直踩，不然就——', 'お金は自転車と同じ。こぎ続けないと——', 'பணம் சைக்கிள் மாதிரி. மிதிச்சுக்கிட்டே இருக்கணும், இல்லன்னா—'),
      L('wei', 'Uncle. We get it. We really get it.', 'Uncle. Kami faham. Betul-betul faham.', '叔叔，我们懂了。真的懂了。', '叔叔，我們懂了。真的懂了。', 'おじさん、わかった。ほんとにわかったから。', 'மாமா. புரிஞ்சுது. நிஜமாவே புரிஞ்சுது.'),
    ],
  },
  { // 28 Mon: the year. The year chart pinned up with the October envelope beside it; Aina points, Wei laughs.
    art: closer(scene('home', { back: true }) + '<rect x="160" y="34" width="96" height="70" rx="2" fill="#B9935E"/><rect x="164" y="38" width="88" height="62" fill="#D9BC8A"/>'
      + it('yearchart', 214, 68, 1.0) + `<g transform="translate(180 84) rotate(-8)">${it('envfront', 0, 0, 0.42)}${written('RM30', 0, 4, 0.36)}</g>` + '<circle cx="214" cy="42" r="1.8" fill="#C44A36"/><circle cx="180" cy="74" r="1.8" fill="#C44A36"/>'
      + wei({ x: 236, y: 198, s: 1.04, face: 'laugh', pose: 'hip', flip: true, turn: 'l' }) + aina({ x: 140, y: 214, s: 1.2, face: 'happy', pose: 'point', turn: 'r' }), 1.25, 200, 90),
    scene: 'home', cam: { shot: 'medium', on: [160, 84] },
    tip: T('Look back at your year: where it went, and one habit that worked.', 'Imbas kembali tahun anda: ke mana duit pergi, dan satu tabiat yang berjaya.', '回顾这一年：钱去了哪里，还有一个有用的习惯。', '回顧這一年：錢去了哪裡，還有一個有用的習慣。', '一年をふりかえろう。お金の行き先と、うまくいった習慣をひとつ。', 'உங்கள் ஆண்டைத் திரும்பிப் பாருங்கள்: பணம் எங்கே போனது, வேலை செய்த ஒரு பழக்கம் எது.'),
    lines: [
      L('aina', 'We\'ve logged every day since October.', 'Kita catat setiap hari sejak Oktober.', '从十月到现在，我们每天都有记账。', '從十月到現在，我們每天都有記帳。', '10月から毎日記録してきた。', 'அக்டோபர்ல இருந்து ஒவ்வொரு நாளும் பதிஞ்சிருக்கோம்.'),
      L('wei', 'Biggest category: food. Obviously.', 'Kategori paling besar: makanan. Mestilah.', '最大的类别：吃的。当然。', '最大的類別：吃的。當然。', '一番多いのは食費。当然だね。', 'பெரிய வகை: சாப்பாடு. சொல்லவே வேணாம்.'),
      L('aina', 'And one habit that stuck: the cash envelope.', 'Dan satu tabiat yang kekal: sampul duit tunai.', '还有一个坚持下来的习惯：现金信封。', '還有一個堅持下來的習慣：現金信封。', '続いた習慣がひとつ。現金の封筒。', 'நிலைச்சு நின்ன ஒரு பழக்கம்: பண உறை.'),
    ],
  },
  { // 29 Tue: small goals. The planner open between them at the low table; the RAINY DAY jar on the shelf behind.
    art: scene('home', { back: true }) + it('rainyjar', 206, 112, 0.42) + aina({ x: 124, y: 192, s: 0.94, face: 'happy', pose: 'kneel', turn: 'r' })
      + wei({ x: 196, y: 192, s: 0.94, face: 'happy', pose: 'kneel', flip: true, turn: 'l', look: 'down' }) + K.coffeeTable() + it('planner', 160, 140, 0.6)
      + `<path d="M170 146l9-11" stroke="#2E3F6E" stroke-width="2" stroke-linecap="round"/><ellipse cx="171" cy="146" rx="3.4" ry="2.6" fill="${SK.wei}"/>`,
    scene: 'home', cam: { shot: 'close', on: [156, 108] },
    tip: T('Pick one or two simple goals. Small ones stick.', 'Pilih satu atau dua matlamat mudah. Yang kecil lebih bertahan.', '定一两个简单的目标。小目标才坚持得住。', '定一兩個簡單的目標。小目標才堅持得住。', 'シンプルな目標を1つか2つ。小さい目標ほど続く。', 'ஒன்றோ இரண்டோ எளிய இலக்குகளைத் தேர்ந்தெடுங்கள். சிறியவை நிலைக்கும்.'),
    lines: [
      L('aina', 'Goal one: my fund back to RM1,000, from what I have.', 'Matlamat satu: tabung aku balik ke RM1,000, dengan apa yang aku ada.', '目标一：用手上有的钱，把基金存回RM1,000。', '目標一：用手上有的錢，把基金存回RM1,000。', '目標その1：今あるお金から、貯金をRM1,000に戻す。', 'இலக்கு ஒண்ணு: என்கிட்ட இருக்கிறதை வச்சு, நிதியை மறுபடியும் RM1,000 ஆக்குறது.'),
      L('wei', 'Mine: lunch from home, three days a week.', 'Aku: bawa bekal tiga hari seminggu.', '我的：一个星期三天自己带午餐。', '我的：一個星期三天自己帶午餐。', '私は、週3日お弁当。', 'என்னோடது: வாரத்துல மூணு நாள் வீட்டுச் சாப்பாடு.'),
      L('aina', 'And when it rains, I use it. That\'s what it\'s for.', 'Dan bila hujan, aku guna. Memang itu tujuannya.', '下雨的时候，我就用它。它本来就是做这个的。', '下雨的時候，我就用它。它本來就是做這個的。', 'そして雨の日には使う。そのためのお金だから。', 'மழை வந்தா, அதைப் பயன்படுத்துவேன். அது அதுக்குத்தானே.'),
    ],
  },
  { // 30 Wed: same friends. From the regulars' side of the counter: Raju pulling teh, regulars' backs near us, Wei leaning in.
    art: closer(scene('kopitiam', { back: true }) + raju({ x: 130, y: 160, s: 1.04, face: 'laugh', pose: 'pull', apron: NEW, turn: 'r' }) + KCOUNTER + it('teh', 196, 100, 0.36)
      + wei({ x: 214, y: 196, s: 1.08, face: 'laugh', pose: 'rest', flip: true, turn: 'l' }), 1.2, 160, 64),
    scene: 'kopitiam', cam: { shot: 'medium', on: [160, 100], fg: K.folk([[26, 252, 1.5, { shirt: '#5E8B4A', back: true, pose: 'up', cup: true }], [300, 262, 1.6, { shirt: '#4F7A9A', hair: '#D3CCC2', back: true }]]) },
    lines: [
      L('raju', 'My goal every year: same teh, same price, same friends.', 'Matlamat uncle setiap tahun: teh sama, harga sama, kawan sama.', '我每年的目标：一样的茶，一样的价钱，一样的朋友。', '我每年的目標：一樣的茶，一樣的價錢，一樣的朋友。', 'わしの毎年の目標：同じお茶、同じ値段、同じ仲間。', 'ஒவ்வொரு வருஷமும் என் இலக்கு: அதே டீ, அதே விலை, அதே நண்பர்கள்.'),
      L('wei', 'Uncle, the price part is up to you.', 'Uncle, bab harga tu terpulang pada uncle.', '叔叔，价钱那部分你说了算。', '叔叔，價錢那部分你說了算。', 'おじさん、値段はおじさん次第でしょ。', 'மாமா, விலை விஷயம் உங்க கையிலதான் இருக்கு.'),
      L('narrator', 'Tomorrow: the last Thursday of the year.', 'Esok: Khamis terakhir tahun ini.', '明天：今年最后一个星期四。', '明天：今年最後一個星期四。', '明日は、今年最後の木曜。', 'நாளை: இந்த ஆண்டின் கடைசி வியாழன்.'),
    ],
  },
  { // 31 Thu, New Year's Eve: same street, new year. Midnight at the market, fireworks over the bulbs, everyone the year gave them.
    art: apamStall(raju({ x: 214, y: 164, s: 0.82, face: 'laugh', pose: 'wave', apron: NEW, flip: true, turn: 'l', inHand: '<path d="M0 0L-4-14" stroke="#8A5A3C" stroke-width="2"/><path d="M-7-14l7-2 1 5-7 2z" fill="#B9BEC2"/>' }), duit({ x: 72, y: 120, s: 0.6 }) + it('qrnew', 250, 106, 0.36))
      + it('fireworks', 60, 20, 1.5) + it('fireworks', 262, 18, 1.3)
      + kamala({ x: 36, y: 192, s: 0.88, face: 'laugh', pose: 'chin', turn: 'r' }) + grace({ x: 302, y: 194, s: 0.88, face: 'laugh', pose: 'cheer', flip: true, turn: 'l' })
      + riding(250, 198, 0.86, true) + aina({ x: 110, y: 214, s: 1.12, face: 'laugh', pose: 'show', turn: 'r', inHand: it('rainyjar', 0, -8, 0.5) }) + wei({ x: 150, y: 216, s: 1.14, face: 'laugh', pose: 'gesture', flip: true, turn: 'l' }),
    scene: 'market', cam: { shot: 'wide', on: [160, 100], drift: 'out' },
    tip: T('A new year starts with one small habit. You already have one.', 'Tahun baru bermula dengan satu tabiat kecil. Anda sudah ada satu.', '新的一年从一个小习惯开始。你已经有一个了。', '新的一年從一個小習慣開始。你已經有一個了。', '新しい年は小さな習慣ひとつから。あなたにはもうある。', 'புத்தாண்டு ஒரு சிறிய பழக்கத்துடன் தொடங்குகிறது. உங்களிடம் ஏற்கெனவே ஒன்று உள்ளது.'),
    lines: [
      L('wei', 'Three, two, one… Happy New Year!', 'Tiga, dua, satu… Selamat Tahun Baru!', '三、二、一……新年快乐！', '三、二、一……新年快樂！', '3、2、1…あけましておめでとう！', 'மூணு, ரெண்டு, ஒண்ணு… புத்தாண்டு வாழ்த்துகள்!'),
      L('aina', 'A new year, and a jar to fill. Again.', 'Tahun baru, dan balang untuk diisi. Sekali lagi.', '新的一年，又有一个罐子要存满。', '新的一年，又有一個罐子要存滿。', '新しい年と、満たすびん。また一から。', 'புது வருஷம், நிரப்ப ஒரு ஜாடி. மறுபடியும்.'),
      L('wei', 'Mum says: \'Chinese New Year at home. Bring everyone!\'', 'Mak aku kata: ‘Tahun Baru Cina kat rumah. Bawa semua orang!’', '我妈说：“回家过年。大家都带来！”', '我媽說：「回家過年。大家都帶來！」', 'お母さんが「旧正月はうちで。みんな連れておいで！」だって。', 'அம்மா சொல்றாங்க: ‘சீனப் புத்தாண்டுக்கு வீட்டுக்கு வா. எல்லாரையும் கூட்டிட்டு வா!’'),
    ],
  },
];

export default {
  id: '12',
  theme: T('Year end', 'Hujung tahun', '年终', '年終', '年の瀬', 'ஆண்டு இறுதி'),
  colours: { dark: ['#121C1E', '#1A2629', '#243236'], light: ['#F3F1EA', '#FFFFFF', '#E6E2D6'], accent: '#2F6B55' },
  /** Speakers new this month (the engine's WHO covers the rest). */
  who: {
    kamala: T('Aunty Kamala', 'Mak Cik Kamala', 'Kamala 阿姨', 'Kamala 阿姨', 'カマラおばさん', 'கமலா அத்தை'),
    arjun: T('Arjun', 'Arjun', 'Arjun', 'Arjun', 'アルジュン', 'அர்ஜுன்'),
    grace: T('Grace', 'Grace', 'Grace', 'Grace', 'グレース', 'கிரேஸ்'),
  },
  // one sticker a day, in story order (sticker N is day N's)
  stickers: [
    stk('fundmeter', 'My fund', 'Tabung aku', '我的基金', '我的基金', '私の貯金', 'என் நிதி'),
    stk('giftexchange', 'Gift exchange', 'Tukar hadiah', '交换礼物', '交換禮物', 'プレゼント交換', 'பரிசுப் பரிமாற்றம்'),
    stk('bicycle', 'Bicycle fund', 'Tabung basikal', '脚车基金', '腳車基金', '自転車資金', 'சைக்கிள் நிதி'),
    stk('roof', 'Mak\'s roof', 'Bumbung Mak', '妈妈的屋顶', '媽媽的屋頂', 'お母さんの屋根', 'அம்மாவின் கூரை'),
    stk('picnic', 'Picnic basket', 'Bakul berkelah', '野餐篮', '野餐籃', 'ピクニックバスケット', 'சுற்றுலாக் கூடை'),
    stk('books', 'Library books', 'Buku perpustakaan', '图书馆的书', '圖書館的書', '図書館の本', 'நூலகப் புத்தகங்கள்'),
    stk('bonusplan', 'Bonus plan', 'Pelan bonus', '花红分配', '花紅分配', 'ボーナスの配分', 'போனஸ் திட்டம்', 'split'),
    stk('scamtext', 'Scam text', 'Mesej scam', '诈骗短信', '詐騙簡訊', '詐欺メッセージ', 'மோசடி மெசேஜ்'),
    stk('slips', 'Secret Santa', 'Secret Santa', '圣诞交换礼物', '聖誕交換禮物', 'シークレットサンタ', 'Secret Santa'),
    stk('raintin', 'Rainy-day tin', 'Tin kecemasan', '未雨绸缪罐', '未雨綢繆罐', 'もしもの時の缶', 'அவசரச் சேமிப்பு டின்'),
    stk('raincloud', 'Monsoon rain', 'Hujan monsun', '季候雨', '季候雨', 'モンスーンの雨', 'பருவமழை'),
    stk('patch', 'Patch kit', 'Kit tampal', '补胎工具', '補胎工具', 'パンク修理キット', 'பஞ்சர் ஒட்டும் கிட்'),
    stk('xmaslights', 'Fairy lights', 'Lampu lip-lap', '圣诞灯串', '聖誕燈串', '電飾', 'மின்மினி விளக்குகள்'),
    stk('hourglass', 'Hourglass', 'Jam pasir', '沙漏', '沙漏', '砂時計', 'மணல் கடிகாரம்'),
    stk('bonus', 'Bonus slip', 'Slip bonus', '花红单', '花紅單', 'ボーナス明細', 'போனஸ் சீட்டு'),
    stk('wreath', 'Wreath', 'Kalungan Krismas', '圣诞花环', '聖誕花環', 'クリスマスリース', 'கிறிஸ்துமஸ் மலர்வளையம்'),
    stk('cookies', 'Star cookies', 'Biskut bintang', '星星饼干', '星星餅乾', '星のクッキー', 'நட்சத்திர பிஸ்கட்'),
    stk('ricecooker', 'Rice cooker', 'Periuk nasi', '电饭锅', '電飯鍋', '炊飯器', 'ரைஸ் குக்கர்'),
    stk('friedrice', 'Fried rice', 'Nasi goreng', '炒饭', '炒飯', 'チャーハン', 'நாசி கோரெங்'),
    stk('xmasstar', 'Tree-top star', 'Bintang pokok', '树顶星星', '樹頂星星', 'ツリーの星', 'மர உச்சி நட்சத்திரம்'),
    stk('card', 'Handmade card', 'Kad buatan tangan', '手作卡片', '手作卡片', '手作りカード', 'கையால் செய்த அட்டை'),
    stk('invitecrumple', 'Crumpled invitation', 'Jemputan renyuk', '揉皱的请帖', '揉皺的請帖', 'くしゃくしゃの招待状', 'கசங்கிய அழைப்பிதழ்'),
    stk('umbrella', 'Umbrella', 'Payung', '雨伞', '雨傘', '傘', 'குடை'),
    stk('redbike', 'Red bicycle', 'Basikal merah', '红色脚车', '紅色腳車', '赤い自転車', 'சிவப்புச் சைக்கிள்', 'bicycle'),
    stk('rainyjar', 'Rainy-day jar', 'Balang hari hujan', '雨天储蓄罐', '雨天儲蓄罐', '雨の日のびん', 'மழைநாள் சேமிப்பு ஜாடி'),
    stk('xmastree', 'Christmas tree', 'Pokok Krismas', '圣诞树', '聖誕樹', 'クリスマスツリー', 'கிறிஸ்துமஸ் மரம்'),
    stk('bell', 'Bicycle bell', 'Loceng basikal', '脚车铃', '腳車鈴', '自転車のベル', 'சைக்கிள் மணி'),
    stk('yearchart', 'Year in review', 'Imbasan tahun', '年度回顾', '年度回顧', '一年のふりかえり', 'ஆண்டின் மீள்பார்வை'),
    stk('goal', 'New goals', 'Matlamat baru', '新目标', '新目標', '新しい目標', 'புதிய இலக்குகள்'),
    stk('hotdrink', 'Hot drink', 'Minuman panas', '热饮', '熱飲', '温かい飲み物', 'சூடான பானம்', 'mug'),
    stk('fireworks', 'Fireworks', 'Bunga api', '烟花', '煙火', '花火', 'வாணவேடிக்கை'),
  ],
  // The paint grain goes in the camera's screen-space fg, so close-ups and inserts don't magnify it into blotches.
  panels: panels.map(p => p.cam ? { ...p, cam: { ...p.cam, fg: (p.cam.fg || '') + K.grain() } } : { ...p, art: p.art + K.grain() }),
  defs: K.defs(),
};
