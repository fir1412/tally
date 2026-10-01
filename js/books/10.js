// October: "The Last Thursday" (pasar malam). Uncle Raju, the apam balik uncle, says he'll close his 30-year night
// stall; Aina, Wei and Duit learn to look at every ringgit, find out someone has been stealing his QR payments, and
// have one last Thursday before Deepavali to save it. The script is notes/comic-story-10.md.
import { castKit, it, priceTag, cash, envelopeAmt, written, notebookAmt } from './cast.js';

// Each panel has a camera (cam, see comic.js frame): shot size, focus, angle, and screen-space foreground (fg: strangers'
// shoulders, hands, a phone) chosen per beat. The street and every stall are one place for the shot checker
// (scene: 'market'). Market nights fall on the real Thursdays of October 2026: days 1, 8, 15, 22 and 29.
const K = castKit('b10-');
const { aina, wei, raju, duit, scene, fg } = K;
/** A price tag hanging on a string that ends at the tag's hole (the tag leans -12°). */
const hung = (t, x, y, s) => `<path d="M${x + 11.1 * s} 30V${y - 5.4 * s}" stroke="#3A2F35" stroke-width=".8"/>` + priceTag(t, x, y, s);
/** Raju's apam balik stall; `behind` is drawn behind the counter, `items` on it. */
const apamStall = (behind, items = '') => scene('stall', { sign: 'APAM BALIK', steam: 112, behind, items: it('apambalik', 262, 114, 0.6) + it('apambalik', 58, 114, 0.6) + items });
/** A thick counter top at the stall, for close shots that cut at the counter. */
const SLAB = '<path d="M24 112H296V123H24Z" fill="#8A5A3C"/><path d="M24 112H296V114H24Z" fill="#A9744C"/><path d="M24 121H296V123H24Z" fill="#5E3A2A"/>';
/** The front of the kopitiam's drinks counter (the reverse set), drawn over whoever stands behind it. */
const KCOUNTER = '<path d="M20 108H230V172H20Z" fill="#6E4533"/><path d="M16 102H234V110H16Z" fill="#8A5A3C"/><path d="M20 110H230V118H20Z" fill="#1B1430" opacity=".22"/>';
/** A floor seen from above: the backdrop lifted so the floor fills the bottom of a high shot. */
const lifted = (art, dy, floor) => `<g transform="translate(0 ${-dy})">${art}</g><path d="M-10 ${200 - dy}H330V210H-10Z" fill="${floor}"/>`;
/** A flat hand on a surface: a mitten with its thumb toward `side` (+1 right, -1 left). */
const palm = (x, y, side, skin = '#D9A27E') => `<ellipse cx="${x}" cy="${y}" rx="4.8" ry="3.2" fill="${skin}"/><ellipse cx="${x + side * 4.4}" cy="${y + 0.6}" rx="2" ry="1.3" fill="${skin}" transform="rotate(${side * 30} ${x + side * 4.4} ${y + 0.6})"/>`
  + `<path d="M${x - 2.6} ${y - 2.8}v1.6M${x} ${y - 3}v1.6M${x + 2.6} ${y - 2.8}v1.6" stroke="#3B2723" stroke-width=".35" opacity=".4"/>`;
/** A wall calendar with payday, the 25th, circled. */
const cal = (x, y, s = 1) => `<g transform="translate(${x} ${y}) rotate(3) scale(${s})"><rect x="-12" y="-13" width="24" height="26" rx="1.5" fill="#F4EEE2"/><path d="M-12-13h24v7h-24z" fill="#8E2F4F"/>`
  + '<text x="0" y="9" font-family="system-ui,sans-serif" font-weight="800" font-size="11" text-anchor="middle" fill="#4A2E24">25</text><ellipse cx="0" cy="5" rx="9" ry="6.5" fill="none" stroke="#C44A36" stroke-width="1.3"/></g>';
/** A marble kopitiam table top seen close, filling the bottom of the frame. */
const MARBLE = '<path d="M-10 128Q160 112 330 128V210H-10Z" fill="#EDE7DC"/><path d="M-10 128Q160 112 330 128V131Q160 115-10 131Z" fill="#FFFFFF" opacity=".5"/><path d="M30 160Q90 150 140 170M200 150Q250 146 300 160" stroke="#D9D0C2" stroke-width="1" fill="none"/>';
/** The jar with an amount written on a paper strip under its DEEPAVALI label. */
const jarAmt = (t, lv = 'jarD') => it(lv, 0, 0) + '<rect x="-12" y="1" width="24" height="11" rx="1.5" fill="#F4EEE2"/>' + written(t, 0, 6.6, 0.62, '#8E2F4F');
/** Peanuts falling from a hand. */
const peanuts = (x, y) => [[0, 0], [3, 5], [-2, 9], [4, 13], [1, 17]].map(([a, b]) => `<ellipse cx="${x + a}" cy="${y + b}" rx="1.1" ry=".8" fill="#B07A44"/>`).join('');

const T = (en, ms, zh, zht, ja, ta) => ({ en, ms, zh, 'zh-Hant': zht, ja, ta });
const L = (who, ...t) => ({ who, text: T(...t) });
const stk = (id, en, ms, zh, zht, ja, ta, item = id) => ({ id, name: T(en, ms, zh, zht, ja, ta), svg: K.sticker(item) });

const panels = [
  // ---- Act 1: the envelope ----
  { // 1 Thu: the rule. The market towers over them; the envelope is the only small thing in it.
    art: scene('street') + duit({ x: 124, y: 190, pose: 'walk' }) + wei({ x: 92, y: 192, s: 1.05, face: 'laugh', pose: 'cheer', turn: 'r', look: 'up' }),
    scene: 'market', cam: { shot: 'wide', on: [160, 136], angle: 'low', drift: 'right',
      fg: fg.bulbs() + fg.hand(K.skin.aina, 'bottom', { x: 252, y: 176, s: 2.1, a: -12, sleeve: K.sleeve.aina, hold: `<g transform="rotate(-8 244 136)">${envelopeAmt('RM30', 244, 136, 1.5)}</g>` }) },
    lines: [
      L('wei', 'Pasar malam\'s back on our street! I want everything.', 'Pasar malam dah balik kat jalan kita! Aku nak semua.', '夜市回到我们这条街了！我全部都要。', '夜市回到我們這條街了！我全部都要。', 'うちの通りにナイトマーケットが戻ってきた！全部ほしい。', 'நம்ம தெருவுல இரவுச் சந்தை மறுபடியும் வந்தாச்சு! எனக்கு எல்லாமே வேணும்.'),
      L('aina', 'RM30 in this envelope. When it\'s empty, we go home.', 'RM30 dalam sampul ni. Bila dah habis, kita balik.', '信封里有RM30。花完了，我们就回家。', '信封裡有RM30。花完了，我們就回家。', 'この封筒にRM30。なくなったら帰ろう。', 'இந்த உறையில RM30. தீர்ந்ததும் வீட்டுக்குப் போறோம்.'),
      L('wei', 'Only thirty?!', 'Tiga puluh je?!', '才三十？！', '才三十？！', 'たった30？！', 'முப்பது தானா?!'),
    ],
    tip: T('Decide the night\'s cash before you go, and bring only that.', 'Tetapkan duit untuk malam itu sebelum keluar, dan bawa itu saja.', '出门前先定好今晚的现金，只带那么多。', '出門前先定好今晚的現金，只帶那麼多。', '出かける前に今夜使う現金を決めて、それだけ持って行こう。', 'கிளம்பும் முன்பே அன்றைய ரொக்கத்தை முடிவு செய்யுங்கள், அதை மட்டும் எடுத்துச் செல்லுங்கள்.'),
  },
  { // 2 Fri, same night: thirty years. Raju over Aina's shoulder, scattering peanuts; his QR stand and torn pocket planted.
    art: apamStall(raju({ x: 208, y: 164, s: 0.85, face: 'laugh', pose: 'give', flip: true, turn: 'l' }), SLAB + it('apambalik', 184, 111, 0.55) + peanuts(184, 92) + it('qrreal', 240, 111, 0.55)),
    scene: 'market', cam: { shot: 'close', on: [190, 86], fg: fg.ots('aina', 'left') },
    lines: [
      L('raju', 'Apam balik! Crispy or soft, adik?', 'Apam balik! Nak rangup ke lembut, adik?', '曼煎糕！要脆的还是软的，妹妹？', '曼煎糕！要脆的還是軟的，妹妹？', 'アパム・バリックだよ！カリカリ？ふんわり？', 'அப்பம் பாலிக்! மொறுமொறுப்பா, மென்மையா, தங்கச்சி?'),
      L('aina', 'Uncle Raju? From the kopitiam?', 'Uncle Raju? Yang kat kopitiam tu?', 'Raju叔叔？你不是咖啡店的吗？', 'Raju叔叔？你不是咖啡店的嗎？', 'ラジュおじさん？コピティアムの？', 'ராஜு மாமா? நம்ம kopitiam மாமாவா?'),
      L('raju', 'Thirty years, every Thursday! Extra peanuts, on me.', 'Tiga puluh tahun, setiap Khamis! Kacang lebih, uncle belanja.', '三十年了，每个星期四都在！花生加多点，算我的。', '三十年了，每個星期四都在！花生加多點，算我的。', '30年、毎週木曜さ！ピーナッツ多めはおまけだよ。', 'முப்பது வருஷம், ஒவ்வொரு வியாழனும்! கடலை extra, என் செலவு.'),
    ],
  },
  { // 3 Sat: only RM5. Four RM5 tags crowd Wei's grin; Aina's hand points at a small, far RM4.
    art: scene('street') + hung('RM4', 214, 56, 0.3) + [[144, 60], [140, 98], [210, 99]].map(([x, y]) => hung('RM5', x, y, 0.45)).join('') + hung('RM5', 132, 79, 0.42)
      + wei({ x: 176, face: 'laugh', turn: 'r' }),
    scene: 'market', cam: { shot: 'xclose', on: [176, 74], fg: fg.hand(K.skin.aina, 'right', { x: 300, y: 150, s: 1.3, a: 62, sleeve: K.sleeve.aina, point: true }) },
    lines: [
      L('wei', 'It\'s only RM5!', 'RM5 je!', '才RM5而已！', '才RM5而已！', 'たったRM5だよ！', 'RM5 தான்!'),
      L('narrator', '…said Wei, for the fourth time.', '…kata Wei, buat kali keempat.', '……Wei第四次这样说。', '……Wei第四次這樣說。', '…とウェイは言った。これで4回目。', '…என்றாள் வெய், நான்காவது முறையாக.'),
      L('aina', 'And it\'s RM4 two stalls down.', 'Dua gerai kat sana, RM4 je.', '再过两档只要RM4。', '再過兩檔只要RM4。', '2軒先ならRM4だよ。', 'ரெண்டு கடை தள்ளி RM4 தான்.'),
    ],
    tip: T('Small buys add up. Four "only RM5" buys make RM20.', 'Belian kecil pun bertambah. Empat kali “RM5 je” jadi RM20.', '小钱会累积。四次“才RM5”就是RM20。', '小錢會累積。四次「才RM5」就是RM20。', '小さな買い物も積み重なる。「たったRM5」も4回でRM20。', 'சிறிய செலவுகளும் கூடும். நான்கு “RM5 தான்” சேர்ந்தால் RM20.'),
  },
  { // 4 Sun: the phone is money too. From the door side of the room: the night laid out like evidence, Duit on the empty envelope.
    art: lifted(scene('home', { back: true }), 26, '#5A3A2E') + '<ellipse cx="160" cy="184" rx="160" ry="22" fill="#2F5D5A"/><ellipse cx="236" cy="170" rx="30" ry="13" fill="#B5533A"/><ellipse cx="236" cy="166" rx="26" ry="9" fill="#C45F45"/>'
      + wei({ x: 240, y: 176, s: 0.95, face: 'worried', pose: 'hug', flip: true }) + '<circle cx="236" cy="140" r="14" fill="#BFE3F0" opacity=".35" filter="url(#b10-bl)"/>' + it('phone', 226, 152, 0.3)
      + aina({ x: 106, y: 182, s: 0.95, face: 'happy', pose: 'kneel', turn: 'r' }) + K.coffeeTable() + it('envfront', 70, 141, 0.55) + duit({ x: 70, y: 146, s: 0.62 })
      + it('coins', 122, 139, 0.5) + it('receipt', 152, 140, 0.45),
    scene: 'home', cam: { shot: 'wide', on: [160, 70], angle: 'high' },
    lines: [
      L('aina', 'RM30 out, RM8 back. Not bad!', 'Keluar RM30, balik RM8. Boleh tahan!', '带出去RM30，剩下RM8。还不错！', '帶出去RM30，剩下RM8。還不錯！', 'RM30持って出て、RM8残った。上出来！', 'RM30 எடுத்துட்டுப் போனேன், RM8 மிச்சம். பரவாயில்லையே!'),
      L('wei', 'Mine ran out at stall three… so I paid by phone.', 'Aku punya habis kat gerai ketiga… jadi aku bayar guna telefon.', '我的在第三档就花完了……所以我用手机付。', '我的在第三檔就花完了……所以我用手機付。', '私のは3軒目で尽きた…だからスマホで払った。', 'என்னோடது மூணாவது கடையிலேயே தீர்ந்துடுச்சு… அதனால phone-ல pay பண்ணிட்டேன்.'),
      L('aina', 'Wei. The phone is also money.', 'Wei. Telefon tu pun duit juga.', 'Wei，手机付的也是钱。', 'Wei，手機付的也是錢。', 'ウェイ。スマホ払いもお金だよ。', 'வெய். Phone-ல போறதும் காசுதான்.'),
    ],
    tip: T('Paying by phone is still spending. Count it in the same budget.', 'Bayar guna telefon pun tetap berbelanja. Kira dalam bajet yang sama.', '用手机付款也是花钱，要算进同一个预算。', '用手機付款也是花錢，要算進同一個預算。', 'スマホ払いも出費。同じ予算に入れて数えよう。', 'Phone-இல் கட்டுவதும் செலவுதான். அதையும் அதே பட்ஜெட்டில் கணக்கிடுங்கள்.'),
  },
  { // 5 Mon: the teh tarik proverb. From behind the customers: Raju pours at his own drinks counter; Wei near, arms folded; Aina amused.
    art: scene('kopitiam', { back: true }) + raju({ x: 128, y: 160, s: 1.05, face: 'laugh', pose: 'pull', turn: 'r' }) + KCOUNTER
      + aina({ x: 212, y: 172, s: 0.86, face: 'laugh', pose: 'rest', flip: true, turn: 'l' }) + it('teh', 190, 103, 0.3) + wei({ x: 258, y: 214, s: 1.3, face: 'think', pose: 'cross', flip: true, turn: 'l' }),
    scene: 'kopitiam', cam: { shot: 'wide', on: [160, 100] },
    lines: [
      L('raju', 'Money is like teh tarik. Pull it too far and it spills!', 'Duit ni macam teh tarik. Tarik jauh sangat, tumpah!', '钱就像拉茶。拉得太远，就会洒出来！', '錢就像拉茶。拉得太遠，就會灑出來！', 'お金はテタレと同じ。引っぱりすぎるとこぼれる！', 'பணம் தே தாரிக் மாதிரி. ரொம்ப இழுத்தா கொட்டிடும்!'),
      L('wei', 'Uncle, that makes no sense.', 'Uncle, tak masuk akal langsung.', '叔叔，这说不通啦。', '叔叔，這說不通啦。', 'おじさん、意味わかんないよ。', 'மாமா, அதுல ஒரு அர்த்தமும் இல்ல.'),
      L('raju', 'Wait till Thursday.', 'Tunggu Khamis nanti.', '等到星期四你就懂。', '等到星期四你就懂。', '木曜になればわかるさ。', 'வியாழன் வரை பொறு.'),
    ],
  },
  { // 6 Tue: the jar gets a name. Seen from above as their hands make it; Duit's paw on the lid.
    art: scene('home') + wei({ x: 158, y: 174, s: 0.95, face: 'happy', pose: 'hip', flip: true, turn: 'l', look: 'down' }) + aina({ x: 112, y: 188, s: 1.05, face: 'think', pose: 'kneel', turn: 'r', look: 'down' })
      + K.coffeeTable() + it('jarDempty', 136, 128, 0.85) + '<path d="M128 133l9-9" stroke="#2E3F6E" stroke-width="2" stroke-linecap="round"/>' + duit({ x: 170, y: 146, s: 0.7, flip: true }),
    cam: { shot: 'medium', on: [146, 118], angle: 'high' },
    lines: [
      L('aina', 'RM8 left over. Into a jar, but for what?', 'Baki RM8. Masuk balang, tapi untuk apa?', '剩下RM8。放进罐子，可是存来做什么？', '剩下RM8。放進罐子，可是存來做什麼？', '残りはRM8。びんに入れるけど、何のため？', 'RM8 மிச்சம். ஜாடியில போடலாம், ஆனா எதுக்கு?'),
      L('wei', 'Uncle Raju gives everyone extra. Nobody gives him anything.', 'Uncle Raju selalu bagi lebih kat semua orang. Tapi tak ada siapa bagi dia apa-apa.', 'Raju叔叔总是多给大家，却没人送他什么。', 'Raju叔叔總是多給大家，卻沒人送他什麼。', 'ラジュおじさんはみんなにおまけするのに、おじさんには誰も何も。', 'ராஜு மாமா எல்லாருக்கும் extra குடுப்பாரு. அவருக்கு யாரும் எதுவும் குடுக்கறதில்ல.'),
      L('aina', 'Then it\'s his Deepavali jar.', 'Kalau macam tu, ni balang Deepavali dia.', '那这就是他的屠妖节罐子。', '那這就是他的屠妖節罐子。', 'じゃあ、おじさんのディーパバリびんにしよう。', 'அப்போ இது அவருக்கான தீபாவளி ஜாடி.'),
    ],
    tip: T('Give your savings a name. A jar with a purpose fills faster.', 'Namakan simpanan anda. Balang yang ada tujuan lebih cepat penuh.', '给储蓄取个名字。有目标的罐子装得更快。', '給儲蓄取個名字。有目標的罐子裝得更快。', '貯金に名前をつけよう。目的のあるびんは早くたまる。', 'உங்கள் சேமிப்புக்கு ஒரு பெயர் வையுங்கள். நோக்கமுள்ள ஜாடி சீக்கிரம் நிரம்பும்.'),
  },
  { // 7 Wed: someone. Last Thursday after closing: a gloved hand presses a purple sticker onto the QR stand; only Duit sees.
    art: apamStall('', it('qrreal', 196, 108, 0.9)) + fg.hand('#57525F', 'top', { x: 198, y: 96, s: 0.46, a: -40, sleeve: '#17141F', rim: '#F2B45A', hold: it('qrfake', 196, 99, 0.6) })
      + duit({ x: 104, y: 170, s: 0.8, pose: 'arch' }) + K.dark([176, 46], 0.78, 46, 56) + K.duitEyes(104, 170, 0.8, 'arch'),
    scene: 'market', cam: { shot: 'medium', on: [158, 124], angle: 'low', dutch: 5 },
    lines: [
      L('narrator', 'Last Thursday, after closing. The street was empty. Almost.', 'Khamis lepas, selepas tutup. Jalan dah lengang. Hampir.', '上星期四，收摊后。街上空无一人。几乎。', '上星期四，收攤後。街上空無一人。幾乎。', '先週の木曜、閉店後。通りには誰もいなかった。ほぼ。', 'போன வியாழன், கடைகள் மூடிய பின். தெரு வெறிச்சோடியிருந்தது. கிட்டத்தட்ட.'),
      L('duit', '…Meow?', '…Meow?', '……喵？', '……喵？', '…ニャー？', '…மியாவ்?'),
    ],
  },
  // ---- Act 2A: the quiet phone ----
  { // 8 Thu: quiet. Only the cat reacts to the clue.
    art: apamStall(raju({ x: 214, y: 164, s: 0.85, face: 'think', pose: 'hold', item: 'phone', is: 0.45, turn: 'l', look: 'down' }), SLAB + it('qr', 178, 108, 0.6))
      + duit({ x: 136, y: 113, s: 0.72, pose: 'arch' }),
    scene: 'market', cam: { shot: 'close', on: [172, 88], fg: fg.hand(K.skin.wei, 'left', { x: 40, y: 150, s: 1.4, a: -14 }) },
    lines: [
      L('raju', 'Busy street, but my phone hasn\'t pinged all night.', 'Jalan ramai, tapi telefon uncle senyap je malam ni.', '街上这么多人，我的手机整晚都没响。', '街上這麼多人，我的手機整晚都沒響。', 'こんなに人がいるのに、スマホが一晩中鳴らない。', 'தெருவுல இவ்வளவு கூட்டம், ஆனா என் phone ராத்திரி முழுக்க சத்தமே இல்ல.'),
      L('wei', 'Duit! Stop growling at Uncle\'s QR stand!', 'Duit! Jangan menderam kat stand QR Uncle tu!', 'Duit！不要对叔叔的QR牌子凶啦！', 'Duit！不要對叔叔的QR牌子兇啦！', 'ドゥイット！おじさんのQRスタンドにうならないの！', 'துயிட்! மாமாவோட QR stand-ஐப் பார்த்து உறுமாதே!'),
      L('duit', 'MEOW!', 'MEOW!', '喵！！', '喵！！', 'ニャーッ！', 'மியாவ்!!'),
    ],
  },
  { // 9 Fri: spilled. From the floor beside Wei, looking up at Aina with her mug: a laugh, not a lecture.
    art: scene('home', { back: true }) + wei({ x: 134, y: 178, s: 0.95, face: 'worried', pose: 'hug' }) + `<g transform="rotate(10 131 118)">${it('envfront', 131, 118, 0.42)}</g>`
      + aina({ x: 206, y: 196, s: 1.05, face: 'happy', pose: 'hold', item: 'mug', is: 0.45, flip: true, turn: 'l', look: 'down' }),
    scene: 'home', cam: { shot: 'medium', on: [166, 112], angle: 'low' },
    lines: [
      L('aina', 'So? How did the envelope go?', 'Jadi? Sampul tu macam mana?', '怎样？信封那招怎么样？', '怎樣？信封那招怎麼樣？', 'で？封筒はどうだった？', 'சரி? உறை எப்படிப் போச்சு?'),
      L('wei', 'Empty by nine. Then three \'emergencies\' on my phone.', 'Pukul sembilan dah kosong. Lepas tu tiga ‘kecemasan’ guna telefon.', '九点就空了。接着手机又付了三笔“急用”。', '九點就空了。接著手機又付了三筆「急用」。', '9時には空っぽ。そのあとスマホで「緊急事態」が3回。', 'ஒன்பது மணிக்கே காலி. அப்புறம் phone-ல மூணு ‘அவசரம்’.'),
      L('wei', '…I pulled the teh too far, didn\'t I?', '…Aku tarik teh jauh sangat, kan?', '……我是不是把茶拉太远了？', '……我是不是把茶拉太遠了？', '…私、テタレを引っぱりすぎたよね？', '…நான் தே-வை ரொம்ப இழுத்துட்டேன், இல்ல?'),
    ],
  },
  { // 10 Sat: reading the history. The detail the reader must not miss.
    art: `<g filter="url(#b10-b2)">${scene('home')}</g>`, scene: 'home',
    cam: { shot: 'insert', on: [220, 110], fg: fg.phone([['Air tebu', '−RM3.00', 1], ['Air tebu', '−RM3.00', 1], ['Cendol', '−RM4.00']], 84, 'Thursday') },
    lines: [
      L('wei', 'Why does my e-wallet show RM3 twice?', 'Kenapa e-wallet aku tunjuk RM3 dua kali?', '为什么我的电子钱包扣了两次RM3？', '為什麼我的電子錢包扣了兩次RM3？', 'なんで電子マネーにRM3が2回あるの？', 'என் e-wallet-ல RM3 ஏன் ரெண்டு தடவை காட்டுது?'),
      L('aina', 'Double tap at the drinks stall. Ask them on Thursday.', 'Tertekan dua kali kat gerai air. Tanya dia hari Khamis.', '饮料档扫了两次吧。星期四去问问老板。', '飲料檔掃了兩次吧。星期四去問問老闆。', 'ドリンク屋で2回タップしたんだね。木曜に聞いてみよう。', 'பானக் கடையில ரெண்டு தடவை tap ஆயிருக்கு. வியாழன் அன்னைக்குக் கேளு.'),
      L('wei', 'I\'ve never actually read this thing before.', 'Sebelum ni aku tak pernah baca pun benda ni.', '我以前从来没认真看过这个。', '我以前從來沒認真看過這個。', 'これ、ちゃんと読んだの初めて。', 'இதை இதுவரைக்கும் நான் ஒழுங்கா படிச்சதே இல்ல.'),
    ],
    tip: T('Read your e-wallet history every week. Double charges happen.', 'Baca sejarah e-wallet setiap minggu. Caj berganda boleh berlaku.', '每个星期看一次电子钱包记录。重复扣款是会发生的。', '每個星期看一次電子錢包紀錄。重複扣款是會發生的。', '電子マネーの履歴は毎週読もう。二重請求は起こりうる。', 'உங்கள் e-wallet வரலாற்றை வாரந்தோறும் படியுங்கள். இரட்டைக் கட்டணம் நடக்கலாம்.'),
  },
  { // 11 Sun: a small hole. The coin's path across the floor is the joke.
    art: scene('kopitiam', { table: false }) + raju({ x: 100, y: 194, s: 1, face: 'laugh', pose: 'give', item: 'rag', is: 0.6, turn: 'r' })
      + '<ellipse cx="140" cy="186" rx="28" ry="3" fill="#120E1E" opacity=".3"/><path d="M137 124h6v62h-6z" fill="#3E3A40"/><rect x="124" y="183" width="32" height="4" rx="2" fill="#3E3A40"/><ellipse cx="140" cy="122" rx="32" ry="6.5" fill="#EDE7DC"/>'
      + '<path d="M108 132q10 30 40 56t84 4" stroke="#3B2723" stroke-width=".9" stroke-dasharray="2 4" fill="none" opacity=".5"/>' + it('coin', 108, 136, 0.9) + it('coin', 236, 191, 1)
      + wei({ x: 262, y: 232, s: 1.5, face: 'surprised', pose: 'pointdown', flip: true, turn: 'l', look: 'down' }),
    cam: { shot: 'wide', on: [160, 100] },
    lines: [
      L('raju', 'A small hole can sink a big boat.', 'Lubang kecil boleh karamkan kapal besar.', '小洞不补，大洞吃苦。', '小洞不補，大洞吃苦。', '蟻の穴から堤も崩れる、ってね。', 'சின்ன ஓட்டை பெரிய கப்பலையே மூழ்கடிக்கும்.'),
      L('wei', 'Uncle, that makes no sense. Also, your pocket just dropped a coin.', 'Uncle, tak masuk akal langsung. Lagi satu, syiling baru jatuh dari poket uncle.', '叔叔，这说不通啦。还有，你口袋刚掉了一个硬币。', '叔叔，這說不通啦。還有，你口袋剛掉了一個硬幣。', 'おじさん、意味わかんない。あと、ポケットから小銭落ちたよ。', 'மாமா, அதுல ஒரு அர்த்தமும் இல்ல. அப்புறம், உங்க பையிலிருந்து ஒரு காசு விழுந்துச்சு.'),
      L('raju', 'Aiyo. That pocket eats money.', 'Alamak. Poket tu makan duit.', '哎哟。这口袋会吃钱。', '哎喲。這口袋會吃錢。', 'あいや。このポケット、お金を食べるんだ。', 'ஐயோ. அந்தப் பை காசைத் தின்னுடும்.'),
    ],
  },
  { // 12 Mon: I trust. Her unspoken line is her flaw, so her face carries the panel.
    art: scene('kopitiam', { table: false }) + `<g filter="url(#b10-b2)">${raju({ x: 214, y: 190, s: 0.98, face: 'laugh', pose: 'wave', flip: true, turn: 'l' })}</g>`
      + aina({ x: 132, y: 200, s: 1.15, face: 'think', pose: 'hold', item: 'teh', is: 0.6, turn: 'r', look: 'down' }),
    cam: { shot: 'close', on: [150, 94] },
    lines: [
      L('aina', 'Uncle, do you check what you take in each night?', 'Uncle, ada kira tak berapa dapat setiap malam?', '叔叔，你每晚有没有对一下收了多少钱？', '叔叔，你每晚有沒有對一下收了多少錢？', 'おじさん、毎晩の売り上げ、確かめてる？', 'மாமா, ஒவ்வொரு ராத்திரியும் எவ்வளவு வந்துச்சுன்னு பார்க்கிறீங்களா?'),
      L('raju', 'Never! Kamala does the books at month-end. I trust.', 'Tak pernah! Kamala buat kira-kira hujung bulan. Uncle percaya.', '从来不！月底Kamala会算账。我相信大家啦。', '從來不！月底Kamala會算帳。我相信大家啦。', 'まさか！帳簿は月末にカマラがつける。信じてるから。', 'ஒருநாளும் இல்ல! மாசக் கடைசியில கமலா கணக்குப் பார்ப்பா. நான் எல்லாரையும் நம்புறவன்.'),
      L('narrator', 'Aina wanted to say more. She didn\'t.', 'Aina nak cakap lagi. Tapi dia diam.', 'Aina还想说什么，但没说出口。', 'Aina還想說什麼，但沒說出口。', 'アイナはもっと言いたかった。でも言わなかった。', 'ஐனா இன்னும் ஏதோ சொல்ல நினைத்தாள். சொல்லவில்லை.'),
    ],
  },
  { // 13 Tue: ZZ TRADING. The clue is the picture.
    art: scene('kopitiam', { table: 196 }) + raju({ x: 250, y: 204, s: 1.15, face: 'laugh', turn: 'l' }),
    cam: { shot: 'insert', on: [212, 140], fg: fg.phone([['ZZ TRADING', '−RM5.00', 1, '#7A3E96'], ['ZZ TRADING', '−RM5.00', 1, '#7A3E96'], ['Cendol', '−RM4.00']], 30, 'Last Thursday') },
    lines: [
      L('wei', 'Uncle, my RM5 last Thursday went to… \'ZZ TRADING\'?', 'Uncle, RM5 aku Khamis lepas pergi ke… ‘ZZ TRADING’?', '叔叔，我上星期四的RM5，付给了……“ZZ TRADING”？', '叔叔，我上星期四的RM5，付給了……「ZZ TRADING」？', 'おじさん、先週木曜の私のRM5、行き先が…「ZZ TRADING」？', 'மாமா, போன வியாழன் நான் கட்டின RM5 போனது… ‘ZZ TRADING’-க்கா?'),
      L('raju', 'Aiyo, phones make mistakes! Same QR for years.', 'Alamak, telefon pun boleh silap! QR uncle sama je dah bertahun-tahun.', '哎哟，手机也会出错的！我的QR用了好多年了。', '哎喲，手機也會出錯的！我的QR用了好多年了。', 'あいや、スマホだって間違えるさ！QRは何年も同じだよ。', 'ஐயோ, phone-உம் தப்பு பண்ணும்! பல வருஷமா அதே QR தான்.'),
      L('narrator', 'He was very sure.', 'Dia sangat yakin.', '他非常肯定。', '他非常肯定。', 'おじさんは自信満々だった。', 'அவர் மிக உறுதியாக இருந்தார்.'),
    ],
  },
  { // 14 Wed: claws. Duit sharpens them on the front door, the way to the street; the cat has a plan.
    art: scene('home', { back: true }) + '<path d="M82 112l3 14M86 110l3 14M90 111l3 12" stroke="#E9C9A8" stroke-width="1.2" opacity=".85"/>' + duit({ x: 68, y: 166, s: 1.3, pose: 'scratch' })
      + wei({ x: 236, y: 172, s: 0.8, face: 'happy', pose: 'hold', item: 'phone', is: 0.5, flip: true, turn: 'l', look: 'down' }) + aina({ x: 186, y: 208, s: 1.12, face: 'surprised', pose: 'mouth', flip: true, turn: 'l', look: 'down' }),
    scene: 'home', cam: { shot: 'medium', on: [150, 112] },
    lines: [
      L('wei', 'Tomorrow I read the name before I pay. Out loud.', 'Esok aku baca nama dulu sebelum bayar. Kuat-kuat.', '明天付钱前我要先看名字。还要大声念出来。', '明天付錢前我要先看名字。還要大聲唸出來。', '明日は払う前に名前を読む。声に出して。', 'நாளைக்கு pay பண்றதுக்கு முன்னாடி பேரைப் படிப்பேன். சத்தமா.'),
      L('aina', 'Duit, why are you sharpening your claws?', 'Duit, kenapa kau asah kuku?', 'Duit，你干嘛在磨爪子？', 'Duit，你幹嘛在磨爪子？', 'ドゥイット、なんで爪とぎしてるの？', 'துயிட், நீ ஏன் நகத்தைக் கூர் பண்ணிக்கிட்டிருக்க?'),
      L('duit', 'Meow.', 'Meow.', '喵。', '喵。', 'ニャー。', 'மியாவ்.'),
    ],
  },
  // ---- Midpoint ----
  { // 15 Thu: the sticker. A small cat made heroic, the frame tilted for the chaos.
    art: apamStall(raju({ x: 220, y: 164, s: 0.85, face: 'surprised', turn: 'l' }), SLAB + it('qrpeel', 172, 104, 0.8))
      + duit({ x: 142, y: 114, s: 0.85, pose: 'pounce' }) + wei({ x: 96, y: 198, s: 1.1, face: 'surprised', pose: 'hold', item: 'phone', is: 0.5, turn: 'r' }),
    scene: 'market', cam: { shot: 'medium', on: [158, 104], angle: 'low', dutch: -5 },
    lines: [
      L('narrator', 'Duit had waited two weeks for this.', 'Duit dah tunggu dua minggu untuk saat ni.', 'Duit等这一刻，已经等了两个星期。', 'Duit等這一刻，已經等了兩個星期。', 'ドゥイットはこの時を2週間待っていた。', 'இந்தத் தருணத்துக்காக துயிட் இரண்டு வாரம் காத்திருந்தது.'),
      L('duit', 'MEOW!', 'MEOW!', '喵！！', '喵！！', 'ニャーッ！', 'மியாவ்!!'),
      L('wei', 'Uncle… there\'s another QR code under this one.', 'Uncle… ada satu lagi kod QR kat bawah ni.', '叔叔……这个下面还有另一个QR码。', '叔叔……這個下面還有另一個QR碼。', 'おじさん…この下に、もう一つQRコードがある。', 'மாமா… இதுக்கு அடியில இன்னொரு QR code இருக்கு.'),
    ],
  },
  { // 16 Fri, same night: since when? Over Wei's shoulder: Raju holds the purple fake up, the real stand soft behind him.
    art: apamStall(raju({ x: 214, y: 164, s: 0.85, face: 'worried', pose: 'wave', turn: 'l' }), SLAB + it('qrreal', 252, 106, 0.7)) + it('qrfake', 197, 60, 0.5),
    scene: 'market', cam: { shot: 'close', on: [196, 84], fg: fg.ots('wei', 'left') },
    lines: [
      L('raju', 'My real QR, underneath. Since when?', 'QR uncle yang betul, kat bawah. Sejak bila?', '我真正的QR码在下面。从什么时候开始的？', '我真正的QR碼在下面。從什麼時候開始的？', '本物のQRが、下に。いつから？', 'என் உண்மையான QR, அடியில. எப்போலிருந்து?'),
      L('wei', 'Since your phone went quiet. Two Thursdays.', 'Sejak telefon uncle senyap. Dua Khamis.', '从你手机不响开始。已经两个星期四了。', '從你手機不響開始。已經兩個星期四了。', 'スマホが鳴らなくなってから。木曜2回分。', 'உங்க phone அமைதியானதிலிருந்து. ரெண்டு வியாழன்.'),
      L('aina', 'A small hole can sink a big boat, Uncle.', 'Lubang kecil boleh karamkan kapal besar, Uncle.', '叔叔，小洞不补，大洞吃苦啊。', '叔叔，小洞不補，大洞吃苦啊。', '蟻の穴から堤も崩れる、でしょ、おじさん。', 'சின்ன ஓட்டை பெரிய கப்பலையே மூழ்கடிக்கும், மாமா.'),
    ],
    tip: T('Paying by QR? Check the name on your screen before you confirm.', 'Bayar guna QR? Semak nama di skrin sebelum tekan sahkan.', '扫QR付款？确认前先看清屏幕上的名字。', '掃QR付款？確認前先看清螢幕上的名字。', 'QRで払うなら、確定する前に画面の名前を確かめよう。', 'QR மூலம் கட்டுகிறீர்களா? உறுதி செய்யும் முன் திரையில் உள்ள பெயரைச் சரிபாருங்கள்.'),
  },
  // ---- Act 2B: fallout ----
  { // 17 Sat: maybe it's time. From high in the window corner: Raju sunk at a table, phone face down by RM300; Aina crouched opposite, Wei behind her.
    art: lifted(scene('kopitiam', { table: false }), 28, '#C7B08C') + '<ellipse cx="268" cy="182" rx="34" ry="5" fill="#120E1E" opacity=".25"/><path d="M265 152h6v30h-6z" fill="#3E3A40"/>'
      + '<ellipse cx="276" cy="164" rx="14" ry="4" fill="#3E3A40"/><path d="M266 164l-3 22M286 164l3 22M276 166v20" stroke="#3E3A40" stroke-width="2.4"/>'
      + `<clipPath id="b10-sat"><path d="M200 0H320V160H200Z"/></clipPath><g clip-path="url(#b10-sat)">${raju({ x: 272, y: 196, s: 0.76, face: 'worried', turn: 'l', look: 'down' })}</g>` + '<ellipse cx="266" cy="146" rx="38" ry="13" fill="#EDE7DC"/><path d="M228 146a38 13 0 0 0 76 0v3a38 13 0 0 1-76 0z" fill="#D9D0C2"/>'
      + '<path d="M276 142h12l1 4h-12z" fill="#2E2A36"/><g transform="rotate(-8 250 146)"><rect x="240" y="141" width="20" height="10" fill="#F4EEE2"/></g>' + written('RM300', 250, 146, 0.34, '#3B2723')
      + wei({ x: 222, y: 170, s: 0.8, face: 'worried', pose: 'wrap', turn: 'r', look: 'down' }) + aina({ x: 196, y: 194, s: 0.92, face: 'worried', pose: 'kneel', turn: 'r' }),
    cam: { shot: 'medium', on: [228, 130], angle: 'high' },
    lines: [
      L('raju', 'Two Thursdays. About RM300, gone to a sticker.', 'Dua Khamis. Lebih kurang RM300, lesap sebab sekeping pelekat.', '两个星期四。大约RM300，全被一张贴纸吃掉了。', '兩個星期四。大約RM300，全被一張貼紙吃掉了。', '木曜2回で、RM300くらい。シール一枚に消えた。', 'ரெண்டு வியாழன். சுமார் RM300, ஒரு sticker-ஆல போச்சு.'),
      L('aina', 'Call your bank and 997 today, Uncle. Right now.', 'Telefon bank dan 997 hari ni, Uncle. Sekarang juga.', '叔叔，今天就打给银行和997。现在就打。', '叔叔，今天就打給銀行和997。現在就打。', 'おじさん、今日中に銀行と997に電話して。今すぐ。', 'மாமா, இன்னைக்கே bank-க்கும் 997-க்கும் call பண்ணுங்க. இப்பவே.'),
      L('raju', 'Maybe it\'s time I closed the night stall.', 'Mungkin dah tiba masa uncle tutup gerai malam.', '也许是时候把夜市的摊子收掉了。', '也許是時候把夜市的攤子收掉了。', '夜の屋台も、もうたたむ潮時かもしれない。', 'இரவுக் கடையை மூடுற நேரம் வந்துடுச்சோ என்னவோ.'),
    ],
    tip: T('Scammed? Call your bank or e-wallet, and 997 (scam hotline), fast.', 'Kena scam? Cepat hubungi bank atau e-wallet, dan 997 (talian aduan scam).', '被骗了？马上联络银行或电子钱包，并拨997（反诈骗热线）。', '被騙了？馬上聯絡銀行或電子錢包，並撥997（反詐騙熱線）。', '詐欺にあったら、すぐ銀行か電子マネー会社と997（詐欺相談窓口）へ。', 'ஏமாற்றப்பட்டீர்களா? உடனே வங்கி அல்லது e-wallet-ஐயும், 997 (மோசடி உதவி எண்)-ஐயும் அழையுங்கள்.'),
  },
  { // 18 Sun: whose place? Their first time apart; the space between them is the argument.
    art: scene('night') + aina({ x: 88, y: 178, s: 0.86, face: 'worried', pose: 'strap', flip: true, turn: 'l', look: 'down' })
      + '<path d="M95 96L80 136" stroke="#6E4533" stroke-width="1.8"/><rect x="72" y="132" width="13" height="11" rx="2" fill="#8A5A3C"/>' + duit({ x: 164, y: 184, s: 0.8 })
      + wei({ x: 242, y: 198, s: 1.12, face: 'worried', pose: 'gesture', flip: true, turn: 'l' }),
    cam: { shot: 'wide', on: [160, 100], fg: fg.leaves('right') },
    lines: [
      L('wei', 'Close it? After thirty years? We have to do something.', 'Tutup? Lepas tiga puluh tahun? Kita kena buat sesuatu.', '收掉？三十年了耶？我们一定要做点什么。', '收掉？三十年了耶？我們一定要做點什麼。', '閉める？30年もやってきたのに？何かしなきゃ。', 'மூடுறதா? முப்பது வருஷத்துக்கு அப்புறமா? நாம ஏதாவது பண்ணணும்.'),
      L('aina', 'It\'s his money, Wei. It\'s not our place.', 'Tu duit dia, Wei. Bukan hak kita nak campur.', '那是他的钱，Wei。轮不到我们插手。', '那是他的錢，Wei。輪不到我們插手。', 'おじさんのお金だよ、ウェイ。私たちが口を出すことじゃない。', 'அது அவரோட காசு, வெய். நாம தலையிடக் கூடாது.'),
      L('wei', 'Then whose place is it?', 'Habis tu, hak siapa?', '那轮得到谁？', '那輪得到誰？', 'じゃあ、誰なら口を出していいの？', 'அப்போ யார் தான் தலையிடணும்?'),
    ],
  },
  { // 19 Mon: pay me back whenever. The handover in the foreground; Wei's face knows Aina's flaw.
    art: scene('home') + cal(142, 64, 0.9) + aina({ x: 96, y: 204, s: 1.15, face: 'happy', turn: 'r', look: 'down' }) + wei({ x: 228, y: 198, s: 1.1, face: 'think', flip: true, turn: 'l' }),
    cam: { shot: 'medium', on: [160, 108], fg: fg.hand(K.skin.aina, 'left', { x: 92, y: 168, s: 1.25, a: 6, sleeve: K.sleeve.aina, hold: cash(20, 140, 162, 1.35) }) + fg.hand(K.skin.wei, 'right', { x: 206, y: 158, s: 1.25, a: -10 }) },
    lines: [
      L('wei', 'Payday\'s the 25th, and I have RM11 left.', 'Gaji masuk 25 hari bulan, dan aku tinggal RM11.', '25号才发薪水，我只剩RM11。', '25號才發薪水，我只剩RM11。', '給料日は25日なのに、残りはRM11。', 'சம்பளம் 25-ஆம் தேதி, என்கிட்ட RM11 தான் இருக்கு.'),
      L('aina', 'I\'ll lend you RM20. Pay me back… whenever.', 'Aku pinjamkan RM20. Bayar balik… bila-bila je lah.', '我借你RM20。什么时候还……都可以啦。', '我借你RM20。什麼時候還……都可以啦。', 'RM20貸すね。返すのは…いつでもいいよ。', 'நான் RM20 கடன் தரேன். திருப்பித் தர்றது… எப்போ வேணும்னாலும்.'),
      L('wei', 'The 25th. Write it down. I know you\'ll never ask.', '25 hari bulan. Tulis. Aku tahu kau takkan minta.', '25号。写下来。我知道你绝对不会开口要。', '25號。寫下來。我知道你絕對不會開口要。', '25日。書いといて。あなたは絶対催促しないから。', '25-ஆம் தேதி. எழுதி வை. நீ ஒருநாளும் கேட்க மாட்டேன்னு எனக்குத் தெரியும்.'),
    ],
    tip: T('Lending to a friend? Agree the amount and the day, kindly.', 'Pinjam duit kepada kawan? Setuju jumlah dan tarikh, dengan baik.', '借钱给朋友？好好说清楚金额和还钱的日子。', '借錢給朋友？好好說清楚金額和還錢的日子。', '友だちにお金を貸すなら、金額と返す日を気持ちよく決めよう。', 'நண்பருக்குக் கடனா? தொகையையும் தேதியையும் அன்பாகப் பேசி முடிவு செய்யுங்கள்.'),
  },
  { // 20 Tue: Aina's leak. The planner has one too, shown as plainly as Wei's.
    art: `<g filter="url(#b10-b2)">${scene('home')}</g>`, scene: 'home',
    cam: { shot: 'insert', on: [120, 120], angle: 'high', fg: fg.phone([['Movie app', '−RM15.90', 1], ['Movie app', '−RM15.90', 1], ['Movie app', '−RM15.90', 1]], 64, 'Every month since March', K.skin.aina, 4)
      + fg.hand(K.skin.wei, 'right', { x: 254, y: 128, s: 1.25, a: -4, point: true }) },
    lines: [
      L('wei', 'Aina, what\'s \'Movie app, RM15.90\', every month since March?', 'Aina, apa ni ‘Movie app, RM15.90’, setiap bulan sejak Mac?', 'Aina，“Movie app，RM15.90”是什么？三月起每个月都扣。', 'Aina，「Movie app，RM15.90」是什麼？三月起每個月都扣。', 'アイナ、「Movie app、RM15.90」って何？3月から毎月。', 'ஐனா, ‘Movie app, RM15.90’ இது என்ன? மார்ச்லருந்து ஒவ்வொரு மாசமும்?'),
      L('aina', '…I watched one film.', '…Aku tengok satu filem je.', '……我只看了一部电影。', '……我只看了一部電影。', '…映画、1本しか観てない。', '…நான் ஒரே ஒரு படம் தான் பார்த்தேன்.'),
      L('wei', 'Budget queen, meet your leak.', 'Ratu bajet pun bocor rupanya.', '预算女王，原来你也会漏钱。', '預算女王，原來你也會漏錢。', '予算の女王にも、穴があったね。', 'பட்ஜெட் ராணி, இதோ உன் ஓட்டை.'),
    ],
    tip: T('Check your subscriptions. Cancel the ones you forgot you had.', 'Semak langganan anda. Batalkan yang anda sendiri dah lupa.', '检查一下你的订阅，把忘了的那些取消。', '檢查一下你的訂閱，把忘了的那些取消。', 'サブスクを確認しよう。忘れていたものは解約を。', 'உங்கள் சந்தாக்களைச் சரிபாருங்கள். மறந்துபோனவற்றை ரத்து செய்யுங்கள்.'),
  },
  { // 21 Wed: forecast. A small win (the new stand) knocked flat by the last line.
    art: scene('kopitiam', { table: false, storm: true }) + raju({ x: 112, y: 168, s: 0.8, face: 'laugh', pose: 'hold', item: 'qrnew', is: 0.95, turn: 'r' })
      + wei({ x: 240, y: 252, s: 1.55, face: 'worried', pose: 'hold', item: it('phone', 0, 0) + '<rect x="-7" y="-12" width="14" height="22" rx="1" fill="#DCE4EA"/>' + it('raincloud', 0, -2, 0.3), is: 0.62, flip: true, turn: 'l', look: 'down' }),
    cam: { shot: 'medium', on: [168, 108] },
    lines: [
      L('raju', 'New QR stand. My name in big letters, under plastic!', 'Stand QR baru. Nama uncle huruf besar, siap berlamina!', '新的QR牌！我的名字大大的，还过了胶！', '新的QR牌！我的名字大大的，還過了膠！', '新しいQRスタンド。名前を大きく書いて、ラミネートした！', 'புது QR stand. என் பேரு பெரிய எழுத்துல, plastic-க்குள்ள!'),
      L('wei', 'Nice, Uncle! And tomorrow\'s forecast says…', 'Cantik, Uncle! Ramalan cuaca esok pula kata…', '不错哦，叔叔！然后明天的天气预报说……', '不錯哦，叔叔！然後明天的天氣預報說……', 'いいね、おじさん！で、明日の天気予報は…', 'சூப்பர் மாமா! நாளைக்கு வானிலை அறிக்கை சொல்லுது…'),
      L('narrator', 'Storms. All evening.', 'Ribut. Sepanjang malam.', '暴风雨。一整个晚上。', '暴風雨。一整個晚上。', '嵐。夕方から、ずっと。', 'புயல் மழை. மாலை முழுவதும்.'),
    ],
  },
  // ---- Low point ----
  { // 22 Thu: today it rained. The street empty, the bulbs off but his one, Raju hunched over the pan, his bulb in a puddle.
    art: scene('street') + '<path d="M68 82h34v40H68z" fill="#E9B56A"/><path d="M122 114h12v16h-12zM144 115h13v17h-13zM172 113h12v16h-12zM199 115h14v17h-14zM234 114h12v16h-12z" fill="#35304A"/>'
      + '<rect x="-10" y="-10" width="340" height="120" fill="#0B0918" opacity=".55"/>'
      + raju({ x: 100, y: 180, s: 0.95, face: 'worried', pose: 'hold', item: '<ellipse cx="0" cy="0" rx="16" ry="5" fill="#3E302E"/><path d="M16 0h12" stroke="#3E302E" stroke-width="3"/>', is: 0.6, turn: 'r', look: 'down', bend: 22 })
      + K.rain({ tarps: true }) + '<ellipse cx="150" cy="178" rx="40" ry="6" fill="#46506A"/><ellipse cx="140" cy="178" rx="6" ry="3.4" fill="#F6D08A" opacity=".8" filter="url(#b10-b2)"/>'
      + '<circle cx="58" cy="58" r="44" fill="#F6D08A" opacity=".22" filter="url(#b10-bl)"/><circle cx="58" cy="58" r="2.6" fill="#F6D08A"/>',
    scene: 'market', cam: { shot: 'wide', on: [160, 70], angle: 'high', fg: `<g transform="translate(296 0) scale(2)">${it('umbrellabig', 0, 0)}</g>` },
    lines: [
      L('raju', 'Thirty years I told everyone: save for a rainy day.', 'Tiga puluh tahun uncle pesan kat semua orang: sediakan payung sebelum hujan.', '三十年来，我跟每个人说：要未雨绸缪。', '三十年來，我跟每個人說：要未雨綢繆。', '30年、みんなに言ってきた。雨の日に備えて貯めろって。', 'முப்பது வருஷமா எல்லாருக்கும் சொன்னேன்: வெள்ளம் வருமுன் அணை போடு.'),
      L('raju', 'Today it rained. And I never did.', 'Hari ni hujan. Dan uncle tak pernah sediakan payung.', '今天真的下雨了。我自己却从来没存。', '今天真的下雨了。我自己卻從來沒存。', '今日、雨が降った。なのに自分は備えてこなかった。', 'இன்னைக்கு மழை வந்துச்சு. நான் அணை போடவே இல்ல.'),
      L('raju', 'Next Thursday is my last night.', 'Khamis depan, malam terakhir uncle.', '下个星期四，是我最后一晚。', '下個星期四，是我最後一晚。', '来週の木曜が、最後の夜だ。', 'அடுத்த வியாழன் தான் என் கடைசி ராத்திரி.'),
    ],
  },
  // ---- Act 3: turn and prep ----
  { // 23 Fri, same rainy night: our street. A low angle gives them power for the first time.
    art: `<g transform="translate(0 34)">${scene('street')}</g><path d="M-10-10H330V36H-10Z" fill="#1E2340"/>` + K.rain() + '<circle cx="110" cy="40" r="60" fill="#F6D08A" opacity=".3" filter="url(#b10-bl)"/>'
      + wei({ x: 184, y: 196, s: 1, face: 'laugh', flip: true, turn: 'l' }) + aina({ x: 146, y: 198, s: 1.05, face: 'think', pose: 'wave', turn: 'r' }) + it('umbrellabig', 163, 42, 0.85)
      + '<ellipse cx="163" cy="72" rx="3.6" ry="3.8" fill="#D9A27E"/><path d="M160 70.4q3-1.6 6 0" stroke="#3B2723" stroke-width=".4" fill="none" opacity=".4"/>',
    scene: 'market', cam: { shot: 'close', on: [164, 84], angle: 'low', drift: 'in', fg: fg.bulbs() },
    lines: [
      L('aina', 'You were right, Wei. It\'s our street too.', 'Kau betul, Wei. Ni jalan kita juga.', '你说得对，Wei。这也是我们的街。', '你說得對，Wei。這也是我們的街。', 'ウェイの言うとおり。ここは私たちの通りでもある。', 'நீ சொன்னது சரி, வெய். இது நம்ம தெருவும் கூட.'),
      L('aina', 'Tomorrow I\'ll tell him. Kindly, but I\'ll tell him.', 'Esok aku cakap dengan dia. Elok-elok, tapi aku akan cakap.', '明天我会跟他说。好好地说，但一定要说。', '明天我會跟他說。好好地說，但一定要說。', '明日、おじさんに言う。やさしく、でもちゃんと言う。', 'நாளைக்கு அவர்கிட்ட சொல்லப் போறேன். அன்பா, ஆனா கண்டிப்பா சொல்லுவேன்.'),
      L('wei', 'And I\'ll tell everybody else.', 'Orang lain semua, biar aku bagitahu.', '其他人就交给我来说。', '其他人就交給我來說。', 'じゃあ、ほかのみんなには私が言う。', 'மத்த எல்லாருக்கும் நான் சொல்றேன்.'),
    ],
  },
  { // 24 Sat: the hard thing, kindly. Over Raju's shoulder; the face we see carries the lesson.
    art: scene('kopitiam', { table: false }) + aina({ x: 196, y: 204, s: 1.1, face: 'think', pose: 'flat', flip: true, turn: 'l' })
      + '<path d="M100 146Q196 134 296 146L306 166Q196 154 90 166Z" fill="#EDE7DC"/><path d="M90 166Q196 154 306 166V200H90Z" fill="#D9D0C2"/>'
      + notebookAmt('', 196, 152, 0.78) + palm(171, 151, 1) + palm(221, 151, -1),
    cam: { shot: 'medium', on: [180, 110], fg: fg.ots('raju', 'left') },
    lines: [
      L('aina', 'Uncle, your stall isn\'t slow. Someone was robbing it.', 'Uncle, gerai uncle bukan tak laku. Ada orang curi duitnya.', '叔叔，不是你生意不好。是有人在偷你的钱。', '叔叔，不是你生意不好。是有人在偷你的錢。', 'おじさん、お店が暇なんじゃない。誰かに盗まれてたの。', 'மாமா, உங்க கடையில வியாபாரம் குறையல. யாரோ திருடிக்கிட்டு இருந்தாங்க.'),
      L('aina', 'Month-end is too late. Count one night with me, properly.', 'Hujung bulan dah terlambat. Kira satu malam dengan saya, betul-betul.', '等到月底就太迟了。跟我好好数一个晚上。', '等到月底就太遲了。跟我好好數一個晚上。', '月末じゃ遅いの。一晩だけ、私とちゃんと数えて。', 'மாசக் கடைசி ரொம்ப லேட். ஒரு ராத்திரி என்கூட ஒழுங்கா எண்ணிப் பாருங்க.'),
      L('raju', '…One night. Then I decide.', '…Satu malam. Lepas tu uncle putuskan.', '……一个晚上。然后我再决定。', '……一個晚上。然後我再決定。', '…一晩だけ。それから決める。', '…ஒரு ராத்திரி. அப்புறம் நான் முடிவு பண்றேன்.'),
    ],
    tip: T('Look at your money every day. Month-end is too late to catch a leak.', 'Tengok duit anda setiap hari. Hujung bulan dah terlambat untuk kesan kebocoran.', '每天看一看你的钱。等到月底才找漏洞就太迟了。', '每天看一看你的錢。等到月底才找漏洞就太遲了。', 'お金は毎日見よう。月末では、もれに気づくのが遅すぎる。', 'உங்கள் பணத்தை தினமும் பாருங்கள். கசிவைக் கண்டுபிடிக்க மாதக் கடைசி மிகத் தாமதம்.'),
  },
  { // 25 Sun: as written. The promised money, seen; "only RM5" becomes "RM5 for the jar".
    art: scene('kopitiam', { table: false }) + MARBLE + it('jarD', 132, 148, 0.55) + `<g transform="rotate(-10 156 152)">${cash(20, 156, 152, 0.55)}</g>` + `<g transform="rotate(6 174 161)">${cash(5, 174, 161, 0.55)}</g>` + it('teh', 128, 168, 0.32),
    cam: { shot: 'insert', on: [158, 150], angle: 'high', fg: fg.hand(K.skin.wei, 'right', { x: 304, y: 168, s: 1.4, a: -10 }) + fg.hand(K.skin.aina, 'bottom', { x: 40, y: 226, s: 1.5, a: 24, sleeve: K.sleeve.aina }) },
    lines: [
      L('wei', 'Payday! Your RM20, on the day, as written.', 'Hari gaji! RM20 kau, tepat pada harinya, macam yang ditulis.', '发薪日！你的RM20，当天还，跟写的一样。', '發薪日！你的RM20，當天還，跟寫的一樣。', '給料日！RM20、書いたとおり当日に返すね。', 'சம்பள நாள்! உன் RM20, எழுதின மாதிரியே, அதே நாள்ல.'),
      L('aina', 'You remembered before I did.', 'Kau ingat lebih awal daripada aku.', '你比我还先记得。', '你比我還先記得。', '私より先に覚えてたね。', 'எனக்கு முன்னாடியே உனக்கு ஞாபகம் இருந்திருக்கு.'),
      L('wei', 'And RM5 for the jar. Saving first this time.', 'Dan RM5 untuk balang. Kali ni simpan dulu.', '再放RM5进罐子。这次先存钱。', '再放RM5進罐子。這次先存錢。', 'あとびんにRM5。今回は先に貯金。', 'ஜாடிக்கு RM5-உம். இந்த முறை முதல்ல சேமிப்பு.'),
    ],
    tip: T('On payday, put the saving aside first, then spend.', 'Hari gaji, asingkan simpanan dulu, baru belanja.', '发薪日先把储蓄放一边，然后才花。', '發薪日先把儲蓄放一邊，然後才花。', '給料日には、まず貯金を分けてから使おう。', 'சம்பள நாளில் முதலில் சேமிப்பை ஒதுக்குங்கள், பிறகு செலவு செய்யுங்கள்.'),
  },
  { // 26 Mon: call number twelve. Wei paces toward us mid-call; Aina on the sofa behind her with the RM50 jar.
    art: scene('home') + aina({ x: 214, y: 150, s: 0.86, face: 'happy', pose: 'kneel', turn: 'l', flip: true }) + jarAmt('RM50').replace(/^/, '<g transform="translate(208 132) scale(.82)">') + '</g>'
      + wei({ x: 108, y: 238, s: 1.42, face: 'laugh', pose: 'call2', turn: 'r' }),
    cam: { shot: 'medium', on: [166, 112] },
    lines: [
      L('wei', '…yes, Thursday, his last night! Bring your whole office!', '…ya, Khamis, malam terakhir dia! Bawa satu ofis sekali!', '……对，星期四，他最后一晚！叫你整个办公室一起来！', '……對，星期四，他最後一晚！叫你整個辦公室一起來！', '…そう、木曜、おじさんの最後の夜！会社のみんなも連れてきて！', '…ஆமா, வியாழன், அவரோட கடைசி ராத்திரி! உங்க office முழுசையும் கூட்டிட்டு வாங்க!'),
      L('aina', 'That\'s call number twelve. The jar says RM50.', 'Tu panggilan ke-12. Balang dah RM50.', '这是第十二通电话了。罐子里有RM50。', '這是第十二通電話了。罐子裡有RM50。', 'これで12本目の電話。びんはRM50。', 'இது பன்னிரண்டாவது call. ஜாடியில RM50.'),
      L('wei', 'His pocket eats money. Let\'s get him one with no holes.', 'Poket dia makan duit. Jom belikan yang tak berlubang.', '他的口袋会吃钱。我们送他一个没洞的吧。', '他的口袋會吃錢。我們送他一個沒洞的吧。', 'おじさんのポケット、お金を食べるでしょ。穴のないのを贈ろう。', 'அவரோட பை காசைத் தின்னுடுது. ஓட்டை இல்லாத ஒண்ணு வாங்கித் தருவோம்.'),
    ],
  },
  { // 27 Tue: no holes. A new place opens wide; the red apron reads as the gift at once.
    art: scene('shop', { sign: 'KAIN' }) + '<path d="M28 104H236" stroke="#6E4533" stroke-width="2"/>' + it('apron', 70, 132, 0.8).replace(/#B5533A/g, '#4F6D8F').replace(/#C9683F/g, '#6F8FAF') + it('apron', 200, 132, 0.8).replace(/#B5533A/g, '#5E8B4A').replace(/#C9683F/g, '#7FA35A')
      + aina({ x: 136, y: 184, s: 0.92, face: 'happy', pose: 'hold', item: it('apron', 0, 0) + priceTag('RM35', 14, 16, 0.85), is: 1.15, turn: 'r' })
      + wei({ x: 262, y: 222, s: 1.4, face: 'laugh', pose: 'hold', item: jarAmt('RM50'), is: 1, flip: true, turn: 'l' }),
    cam: { shot: 'wide', on: [160, 100] },
    lines: [
      L('narrator', 'Wei checked three shops first. Her idea.', 'Wei semak tiga kedai dulu. Idea dia sendiri.', 'Wei先比较了三家店。是她自己的主意。', 'Wei先比較了三家店。是她自己的主意。', 'ウェイはまず3軒の店を見比べた。本人のアイデアで。', 'வெய் முதலில் மூன்று கடைகளைப் பார்த்தாள். அது அவளுடைய யோசனை.'),
      L('aina', 'This one. Thick cloth, big pockets, no holes. RM35.', 'Yang ni. Kain tebal, poket besar, tak berlubang. RM35.', '就这件。布料厚，口袋大，没有洞。RM35。', '就這件。布料厚，口袋大，沒有洞。RM35。', 'これにしよう。厚い生地、大きいポケット、穴なし。RM35。', 'இதுதான். தடிமனான துணி, பெரிய பைகள், ஓட்டை இல்ல. RM35.'),
      L('wei', 'And RM15 stays in the jar for next month.', 'Dan RM15 kekal dalam balang untuk bulan depan.', '还有RM15留在罐子里，给下个月。', '還有RM15留在罐子裡，給下個月。', 'RM15は来月のためにびんに残そう。', 'அடுத்த மாசத்துக்கு RM15 ஜாடியிலேயே இருக்கட்டும்.'),
    ],
    tip: T('For a bigger buy, check three places first. Prices differ.', 'Nak beli barang besar? Semak tiga tempat dulu. Harga berbeza.', '买大件前，先比较三个地方。价钱会不一样。', '買大件前，先比較三個地方。價錢會不一樣。', '大きな買い物は、まず3か所で比べよう。値段は違う。', 'பெரிய பொருள் வாங்கும் முன், மூன்று இடங்களில் பாருங்கள். விலை மாறுபடும்.'),
  },
  { // 28 Wed: wrapped with love. The taped gift big in Wei's hands near us, Aina laughing over her shoulder, Duit in the paper.
    art: scene('home', { back: true }) + duit({ x: 96, y: 178, s: 0.82 }) + it('wrapheap', 96, 179, 0.74) + aina({ x: 186, y: 182, s: 0.9, face: 'laugh', pose: 'chin', flip: true, turn: 'l' })
      + wei({ x: 252, y: 246, s: 1.5, face: 'think', pose: 'give', item: 'gifttaped', is: 0.95, flip: true, turn: 'l' }),
    scene: 'home', cam: { shot: 'medium', on: [170, 112] },
    lines: [
      L('wei', 'Is it wrapped, or just crumpled?', 'Ni dah dibalut, atau renyuk je?', '这是包好了，还是只是揉皱了？', '這是包好了，還是只是揉皺了？', 'これ、包んだの？それともしわくちゃにしただけ？', 'இது பரிசுத் தாள்ல சுத்தியிருக்கா, இல்ல கசங்கியிருக்கா?'),
      L('aina', 'Wrapped with love. And a lot of tape.', 'Dibalut dengan kasih sayang. Dan banyak selotep.', '是用爱包的。还有很多胶带。', '是用愛包的。還有很多膠帶。', '愛情で包んだの。テープもたっぷり。', 'அன்போட சுத்தியிருக்கு. நிறைய tape-ஓடவும்.'),
      L('narrator', 'Tomorrow: Uncle Raju\'s last Thursday. Maybe.', 'Esok: Khamis terakhir Uncle Raju. Mungkin.', '明天：Raju叔叔的最后一个星期四。也许。', '明天：Raju叔叔的最後一個星期四。也許。', '明日は、ラジュおじさんの最後の木曜。たぶん。', 'நாளை: ராஜு மாமாவின் கடைசி வியாழன். ஒருவேளை.'),
    ],
  },
  // ---- Climax ----
  { // 29 Thu: the queue. From the tail of the line, low: it curves from the lower left to Raju's pans; Aina at the stand, Wei on her stool calling.
    art: apamStall(raju({ x: 144, y: 164, s: 0.86, face: 'laugh', pose: 'give', turn: 'r' }), it('apambalik', 156, 116, 0.48) + it('apambalik', 128, 117, 0.42) + it('qrnew', 196, 106, 0.4))
      + '<path d="M162 96l8 18" stroke="#8A5A3C" stroke-width="1.6"/><path d="M167 113l8-2 2 5-8 2z" fill="#B9BEC2"/><ellipse cx="162.4" cy="98.6" rx="1.5" ry="2" fill="#8E5B3E"/>'
      + aina({ x: 190, y: 170, s: 0.76, face: 'happy', pose: 'hold', item: notebookAmt('RM', 0, 0, 1) + '<path d="M6-10l8-8" stroke="#2E3F6E" stroke-width="1.8"/>', is: 0.5, turn: 'l', look: 'down' })
      + '<circle cx="240" cy="44" r="46" fill="#F6D08A" opacity=".4" filter="url(#b10-bl)"/><path d="M226 162h28M230 162v22M250 162v22" stroke="#6E4533" stroke-width="3"/>' + wei({ x: 240, y: 162, s: 0.86, face: 'laugh', pose: 'cheer', flip: true, turn: 'l' })
      + K.folk([[116, 166, 0.52, { shirt: '#4F7A9A', turn: 1, laugh: true }], [92, 170, 0.56, { shirt: '#B5533A', hair: '#5A3A2E', skin: '#E0B08A', back: true, pose: 'hip' }],
        [106, 176, 0.62, { shirt: '#5E8B4A', skin: '#8E5B3E', laugh: true, turn: 1, pose: 'point' }], [132, 188, 0.7, { shirt: '#D9A441', pose: 'cross', w: 1.2, turn: -1, flip: true }],
        [96, 194, 0.8, { shirt: '#8E2F4F', skin: '#D9A27E', back: true, kid: { shirt: '#C44A36', skin: '#D9A27E', laugh: true } }], [130, 204, 0.9, { shirt: '#2F6B66', skin: '#B07A54', laugh: true, turn: -1, pose: 'shoulder', flip: true }],
        [76, 214, 1.02, { shirt: '#C9683F', skin: '#8A5A3E', hair: '#D3CCC2', back: true, pose: 'hip' }]]),
    scene: 'market', cam: { shot: 'wide', on: [160, 136], angle: 'low', drift: 'out', fg: fg.awning('#B5533A') + fg.bulbs() + fg.crowd('left', 'pair') },
    lines: [
      L('wei', 'Apam balik! Crispy or soft? It\'s only RM5!', 'Apam balik! Nak rangup ke lembut? RM5 je!', '曼煎糕！要脆的还是软的？才RM5而已！', '曼煎糕！要脆的還是軟的？才RM5而已！', 'アパム・バリックだよ！カリカリ？ふんわり？たったRM5！', 'அப்பம் பாலிக்! மொறுமொறுப்பா, மென்மையா? RM5 தான்!'),
      L('raju', 'Where did all these people come from?', 'Dari mana datang semua orang ni?', '这些人都是从哪里来的？', '這些人都是從哪裡來的？', 'こんなに大勢、どこから来たんだ？', 'இவ்வளவு பேரும் எங்கிருந்து வந்தாங்க?'),
      L('aina', 'Thirty years of extra peanuts, Uncle.', 'Tiga puluh tahun kacang lebih, Uncle.', '叔叔，是你三十年多给的花生啊。', '叔叔，是你三十年多給的花生啊。', '30年分のピーナッツのおまけだよ、おじさん。', 'முப்பது வருஷ extra கடலை, மாமா.'),
    ],
  },
  // ---- Payoff ----
  { // 30 Fri, after closing, same night: count it while it's hot. Day 7's dark stall and single light, the opposite feeling.
    art: apamStall(raju({ x: 178, y: 164, s: 0.85, face: 'laugh', pose: 'give', turn: 'l', look: 'down', item: `<g transform="rotate(84)">${cash(20, 0, 0, 0.5)}</g>`, is: 1 }),
      SLAB + notebookAmt('RM520', 198, 114, 0.72) + it('raintin', 156, 106, 0.55) + duit({ x: 132, y: 114, s: 0.5 }))
      + aina({ x: 118, y: 198, s: 1.02, face: 'happy', turn: 'r', look: 'down' }) + `<g transform="rotate(-8 244 200)">${wei({ x: 244, y: 200, s: 1.02, face: 'happy', flip: true, turn: 'l' })}</g>`
      + K.dark([176, 46], 0.78, 46, 56),
    scene: 'market', cam: { shot: 'close', on: [172, 92] },
    lines: [
      L('aina', 'Tonight: RM520. Every ringgit to the right name.', 'Malam ni: RM520. Setiap ringgit masuk nama yang betul.', '今晚：RM520。每一令吉都付对了人。', '今晚：RM520。每一令吉都付對了人。', '今夜はRM520。1リンギットも残らず、正しい名前へ。', 'இன்னைக்கு: RM520. ஒவ்வொரு ரிங்கிட்டும் சரியான பேருக்கு.'),
      L('raju', 'Money is like apam balik. Count it while it\'s hot!', 'Duit ni macam apam balik. Kira masa panas-panas!', '钱就像曼煎糕。要趁热数！', '錢就像曼煎糕。要趁熱數！', 'お金はアパム・バリックと同じ。熱いうちに数えろ！', 'பணம் அப்பம் பாலிக் மாதிரி. சூடா இருக்கும்போதே எண்ணிடணும்!'),
      L('wei', 'Uncle, that actually makes sense. So… do you stay?', 'Uncle, kali ni masuk akal pula. Jadi… uncle teruskan?', '叔叔，这次真的说得通。那……你还会继续摆吗？', '叔叔，這次真的說得通。那……你還會繼續擺嗎？', 'おじさん、今度は本当に意味わかる。で…続けるの？', 'மாமா, இது உண்மையிலேயே அர்த்தமா இருக்கு. அப்போ… கடையைத் தொடர்வீங்களா?'),
    ],
    tip: T('Keep a rainy-day fund. Even RM5 a week adds up.', 'Simpan duit kecemasan. RM5 seminggu pun lama-lama jadi banyak.', '存一笔应急钱。每星期RM5也会积少成多。', '存一筆應急錢。每星期RM5也會積少成多。', 'もしもの時の貯金を。週RM5でも積み重なる。', 'அவசரகால நிதி வையுங்கள். வாரத்துக்கு RM5 கூடச் சேர்ந்து பெருகும்.'),
  },
  { // 31 Sat: the stall stays. Through the kopitiam's front glass: Raju with the apron, the new QR stand on the table, regulars cheering.
    art: scene('kopitiam', { table: 142 }) + K.folk([[120, 166, 0.84, { shirt: '#B5533A', pose: 'up', cup: true, laugh: true, turn: 1 }], [162, 164, 0.82, { shirt: '#5E8B4A', skin: '#8E5B3E', hair: '#D3CCC2', pose: 'clap', laugh: true, turn: 1 }],
        [188, 158, 0.74, { shirt: '#D9A441', skin: '#E0B08A', pose: 'shoulder', laugh: true, flip: true, lean: -6, turn: -1 }]])
      + it('jarD', 130, 126, 0.45) + it('qrnew', 156, 124, 0.38)
      + raju({ x: 236, y: 200, s: 1.3, face: 'laugh', pose: 'hold', item: 'apron', is: 1.1, turn: 'l' }) + duit({ x: 196, y: 176, s: 0.95, face: 'laugh' }) + it('wrapheap', 196, 177, 0.88),
    cam: { shot: 'wide', on: [160, 100], drift: 'out', fg: `<g transform="translate(-10 104) scale(.5)">${fg.ots('wei', 'left', 100)}${fg.ots('aina', 'left')}</g>`
      + '<path d="M-2-2H322V16H-2Z" fill="#4A2E24"/><path d="M-2-2H8V202H-2ZM312-2H322V202H312ZM-2 192H322V202H-2Z" fill="#5E3A2A"/>'
      + '<path d="M8 16H96V100Q52 112 8 100Z" fill="#232A44" opacity=".82"/><path d="M8 60Q52 50 96 58" stroke="#191726" stroke-width=".8" fill="none"/>'
      + [20, 38, 56, 74, 90].map((x, i) => `<circle cx="${x}" cy="${60 - (i % 2) * 4 + 2}" r="3" fill="#F6D08A" opacity=".8"/><circle cx="${x}" cy="${62 - (i % 2) * 4}" r="7" fill="#F6D08A" opacity=".25"/>`).join('')
      + '<path d="M120 16L140 16L80 192H62Z" fill="#FFFFFF" opacity=".1"/><g transform="translate(160 10)"><text x="0" y="4" font-family="system-ui,sans-serif" font-weight="800" font-size="11" text-anchor="middle" fill="#E3B54A" letter-spacing="2">KOPITIAM</text></g>' },
    lines: [
      L('aina', 'Happy early Deepavali, Uncle! Big pockets, no holes.', 'Selamat Hari Deepavali awal-awal, Uncle! Poket besar, tak berlubang.', '提前祝你屠妖节快乐，叔叔！口袋大，没有洞。', '提前祝你屠妖節快樂，叔叔！口袋大，沒有洞。', '早めのディーパバリおめでとう！大きいポケット、穴なし。', 'முன்கூட்டியே தீபாவளி வாழ்த்துகள், மாமா! பெரிய பைகள், ஓட்டை இல்ல.'),
      L('raju', 'An apron like this needs a stall. The stall stays!', 'Apron macam ni mesti ada gerai. Gerai ni kekal!', '这样的围裙，一定要有个摊子配。摊子不收了！', '這樣的圍裙，一定要有個攤子配。攤子不收了！', 'こんなエプロンには、屋台がいる。屋台は続けるぞ！', 'இப்படிப்பட்ட apron-க்கு ஒரு கடை வேணும். கடை தொடரும்!'),
      L('narrator', 'The jar kept RM15. The street kept its apam balik.', 'Balang masih ada RM15. Jalan kita masih ada apam balik.', '罐子留住了RM15。这条街留住了它的曼煎糕。', '罐子留住了RM15。這條街留住了它的曼煎糕。', 'びんにはRM15が残った。通りには、アパム・バリックが残った。', 'ஜாடியில் RM15 மிஞ்சியது. தெருவுக்கு அதன் அப்பம் பாலிக் மிஞ்சியது.'),
    ],
    tip: T('A budget isn\'t saying no. It\'s saying yes to what matters.', 'Bajet bukan tentang berkata tidak. Ia berkata ya kepada yang penting.', '预算不是说“不”，而是对重要的事说“好”。', '預算不是說「不」，而是對重要的事說「好」。', '予算は「ダメ」と言うことじゃない。大切なことに「いいよ」と言うこと。', 'பட்ஜெட் என்பது “வேண்டாம்” சொல்வது அல்ல. முக்கியமானதற்கு “சரி” சொல்வது.'),
  },
];

export default {
  id: '10',
  theme: T('Pasar malam', 'Pasar malam', '夜市', '夜市', 'ナイトマーケット', 'இரவுச் சந்தை'),
  colours: { dark: ['#1C1A2B', '#252236', '#2F2B42'], light: ['#F7F0E4', '#FFFCF6', '#EFE3D0'], accent: '#B5533A' },
  // one sticker a day, in story order (sticker N is day N's)
  stickers: [
    stk('envelope', 'Cash envelope', 'Sampul duit', '现金信封', '現金信封', '現金の封筒', 'பண உறை'),
    stk('apambalik', 'Apam balik', 'Apam balik', '曼煎糕', '曼煎糕', 'アパム・バリック', 'அப்பம் பாலிக்'),
    stk('price', 'Price tag', 'Tanda harga', '价钱牌', '價錢牌', '値札', 'விலைச் சீட்டு'),
    stk('coins', 'Coins', 'Syiling', '硬币', '硬幣', '小銭', 'நாணயங்கள்'),
    stk('tehtarik', 'Teh tarik', 'Teh tarik', '拉茶', '拉茶', 'テタレ', 'தே தாரிக்', 'teh'),
    stk('jar', 'Savings jar', 'Balang simpanan', '储蓄罐', '儲蓄罐', '貯金びん', 'சேமிப்பு ஜாடி', 'jarD'),
    stk('qrstand', 'QR stand', 'Papan kod QR', 'QR码牌', 'QR碼牌', 'QRスタンド', 'QR பலகை', 'qrreal'),
    stk('airtebu', 'Sugarcane juice', 'Air tebu', '甘蔗水', '甘蔗水', 'サトウキビジュース', 'கரும்புச் சாறு'),
    stk('receipt', 'Receipt', 'Resit', '收据', '收據', 'レシート', 'ரசீது'),
    stk('ewallet', 'E-wallet', 'E-wallet', '电子钱包', '電子錢包', '電子マネー', 'இ-வாலட்', 'phone'),
    stk('sotong', 'Grilled squid', 'Sotong bakar', '烤苏东', '烤蘇東', 'イカ焼き', 'சுட்ட கணவாய்'),
    stk('ckt', 'Char kuey teow', 'Char kuey teow', '炒粿条', '炒粿條', 'チャー・クイティオ', 'சார் குவே தியாவ்'),
    stk('lekor', 'Keropok lekor', 'Keropok lekor', '鱼饼条', '魚餅條', '魚のすり身スティック', 'கெரோப்போக் லெக்கோர்'),
    stk('pisanggoreng', 'Banana fritters', 'Pisang goreng', '炸香蕉', '炸香蕉', '揚げバナナ', 'வாழைப்பழ பஜ்ஜி'),
    stk('loklok', 'Lok lok', 'Lok lok', '碌碌', '碌碌', 'ロックロック串', 'லொக் லொக்'),
    stk('otakotak', 'Otak-otak', 'Otak-otak', '乌达', '烏達', 'オタオタ', 'ஒட்டாக்-ஒட்டாக்'),
    stk('rojak', 'Rojak', 'Rojak', '啰惹', '囉惹', 'ロジャック', 'ரோஜாக்'),
    stk('putupiring', 'Putu piring', 'Putu piring', '椰糖蒸米糕', '椰糖蒸米糕', 'プトゥ・ピリン', 'புட்டு பிரிங்'),
    stk('kuihlapis', 'Kuih lapis', 'Kuih lapis', '九层糕', '九層糕', 'クエ・ラピス', 'குவே லாப்பிஸ்'),
    stk('popiah', 'Popiah', 'Popiah', '薄饼', '薄餅', 'ポピア', 'போப்பியா'),
    stk('buahpotong', 'Cut fruit', 'Buah potong', '切片水果', '切片水果', 'カットフルーツ', 'வெட்டிய பழங்கள்'),
    stk('umbrella', 'Umbrella', 'Payung', '雨伞', '雨傘', '傘', 'குடை', 'umbrellabig'),
    stk('cendolcup', 'Cendol', 'Cendol', '煎蕊', '煎蕊', 'チェンドル', 'செண்டோல்', 'cendol'),
    stk('notebook', 'Takings notebook', 'Buku kira-kira', '记账本', '記帳本', '売上ノート', 'கணக்குப் புத்தகம்'),
    stk('jagung', 'Corn cup', 'Jagung cawan', '杯装玉米', '杯裝玉米', 'カップコーン', 'கப் சோளம்'),
    stk('burger', 'Street burger', 'Burger tepi jalan', '路边汉堡', '路邊漢堡', '屋台バーガー', 'சாலையோர பர்கர்'),
    stk('apron', 'New apron', 'Apron baru', '新围裙', '新圍裙', '新しいエプロン', 'புது ஏப்ரான்'),
    stk('present', 'Wrapped gift', 'Hadiah', '礼物', '禮物', 'プレゼント', 'பரிசுப் பொட்டலம்', 'gifttaped'),
    stk('airbungkus', 'Drink in a bag', 'Air bungkus', '袋装饮料', '袋裝飲料', '袋ドリンク', 'பையில் பானம்'),
    stk('raintin', 'Rainy-day tin', 'Tin kecemasan', '未雨绸缪罐', '未雨綢繆罐', 'もしもの時の缶', 'அவசரச் சேமிப்பு டின்'),
    stk('diya', 'Diya lamp', 'Pelita', '油灯', '油燈', 'ディヤ（灯明）', 'அகல் விளக்கு'),
  ],
  // The paint grain goes in the camera's screen-space fg, so close-ups and inserts don't magnify it into blotches.
  panels: panels.map(p => p.cam ? { ...p, cam: { ...p.cam, fg: (p.cam.fg || '') + K.grain() } } : { ...p, art: p.art + K.grain() }),

  defs: K.defs(),
};
