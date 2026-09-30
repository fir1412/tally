// November: Deepavali (Sunday 8 November 2026). Uncle Raju's family gets ready, the girls come to the open house,
// then the "where did it all go" check, waiting for the year-end sales, and December's jar. Panels 28-30 are fillers.
import { castKit, it } from './cast.js';

const K = castKit('b11-');
const { aina, wei, raju, duit, scene } = K;
const kamala = K.kamala, arjun = K.arjun;
const NEW = '#B5533A'; // the apron the girls gave Uncle Raju in October

const T = (en, ms, zh, zht, ja, ta) => ({ en, ms, zh, 'zh-Hant': zht, ja, ta });
const L = (who, ...t) => ({ who, text: T(...t) });
const stk = (id, en, ms, zh, zht, ja, ta, item = id) => ({ id, name: T(en, ms, zh, zht, ja, ta), svg: K.sticker(item) });

const panels = [
  { // 1
    art: scene('kopitiam') + raju({ x: 96, face: 'laugh', pose: 'hold', item: 'teh', apron: NEW }) + wei({ x: 180, face: 'surprised', flip: true }) + aina({ x: 228, face: 'happy', flip: true }),
    lines: [
      L('raju', 'Deepavali is next Sunday. Open house at my place. You must come!', 'Deepavali Ahad depan. Rumah terbuka kat rumah uncle. Mesti datang!', '下个星期天就是屠妖节。来我家的开放门户，一定要来！', '下個星期天就是屠妖節。來我家的開放門戶，一定要來！', 'ディーパバリは来週の日曜。うちでオープンハウスをやるから、必ずおいで！', 'அடுத்த ஞாயிறு தீபாவளி. என் வீட்டுல பொது உபசரிப்பு. கண்டிப்பா வரணும்!'),
      L('wei', 'Yes! I need a new outfit!', 'Mestilah! Aku perlu baju baru!', '好啊！我需要新衣服！', '好啊！我需要新衣服！', '行く！新しい服がいる！', 'ஆமா! எனக்குப் புது உடுப்பு வேணும்!'),
      L('aina', 'First, a festive budget.', 'Tapi dulu, bajet perayaan.', '先定个节日预算。', '先定個節日預算。', 'まずはお祝いの予算からね。', 'முதல்ல, ஒரு பண்டிகை பட்ஜெட்.'),
    ],
  },
  { // 2
    art: scene('home') + aina({ x: 118, face: 'happy', pose: 'hold', item: 'list' }) + wei({ x: 212, face: 'think', flip: true }) + duit({ x: 266, y: 190, face: 'happy', flip: true }),
    lines: [
      L('aina', 'RM80 for everything: a gift, sweets, packets, clothes.', 'RM80 untuk semua: hadiah, kuih, sampul duit, baju.', '一共RM80：礼物、甜点、红包、衣服，全包。', '一共RM80：禮物、甜點、紅包、衣服，全包。', '全部でRM80。プレゼント、お菓子、お祝い袋、服。', 'எல்லாத்துக்கும் RM80: பரிசு, இனிப்பு, அங்பாவ், உடுப்பு.'),
      L('wei', 'Everything? Even the new clothes?', 'Semua? Baju baru pun?', '全部？连新衣服也算？', '全部？連新衣服也算？', '全部？新しい服も？', 'எல்லாத்துக்குமா? புது உடுப்புக்குமா?'),
    ],
    tip: T('Set a festive budget before the shopping rush starts.', 'Tetapkan bajet perayaan sebelum musim membeli-belah bermula.', '购物热潮开始前，先定好节日预算。', '購物熱潮開始前，先定好節日預算。', '買い物ラッシュの前に、お祝いの予算を決めよう。', 'கடை நெரிசல் தொடங்கும் முன்பே பண்டிகை பட்ஜெட் அமையுங்கள்.'),
  },
  { // 3
    art: scene('shop') + wei({ x: 124, face: 'surprised', pose: 'hold', item: 'kurta', is: 0.62 }) + aina({ x: 206, face: 'think', flip: true }),
    lines: [
      L('wei', 'It’s beautiful. It’s also RM89.', 'Cantiknya. Tapi RM89.', '好漂亮。但要RM89。', '好漂亮。但要RM89。', 'すてき。でもRM89。', 'அழகா இருக்கு. விலையும் RM89.'),
      L('aina', 'Before you decide, what’s already in your wardrobe?', 'Sebelum beli, apa yang dah ada dalam almari?', '决定之前，先看看衣柜里有什么？', '決定之前，先看看衣櫃裡有什麼？', '決める前に、クローゼットに何があるか見てみない？', 'முடிவு பண்றதுக்கு முன்னாடி, உன் அலமாரியில ஏற்கெனவே என்ன இருக்கு?'),
    ],
  },
  { // 4
    art: scene('home', { day: true }) + wei({ x: 124, face: 'laugh', pose: 'hold', item: 'dress', is: 0.62 }) + aina({ x: 208, face: 'happy', flip: true }) + duit({ x: 266, y: 190, face: 'surprised', flip: true }),
    lines: [
      L('wei', 'This one! Worn once, to a wedding.', 'Yang ni! Pakai sekali je, pergi kenduri kahwin.', '就这件！只在婚礼穿过一次。', '就這件！只在婚禮穿過一次。', 'これだ！結婚式で一回着ただけ。', 'இதுதான்! ஒரே ஒரு தடவை, ஒரு கல்யாணத்துக்குப் போட்டது.'),
      L('aina', 'It looks brand new. And it’s free.', 'Macam baru. Dan percuma.', '看起来跟新的一样，而且不用钱。', '看起來跟新的一樣，而且不用錢。', '新品みたい。しかもタダ。', 'புத்தம் புதுசு மாதிரி இருக்கு. இலவசமும் கூட.'),
    ],
    tip: T('Shop your wardrobe first. Festive clothes often get worn once.', 'Tengok almari dulu. Baju perayaan selalunya dipakai sekali saja.', '先逛逛自己的衣柜。节日衣服常常只穿一次。', '先逛逛自己的衣櫃。節日衣服常常只穿一次。', 'まず自分のクローゼットを見よう。お祝いの服は一度しか着ないことが多い。', 'முதலில் உங்கள் அலமாரியில் "ஷாப்பிங்" செய்யுங்கள். பண்டிகை உடைகள் பெரும்பாலும் ஒருமுறைதான் அணியப்படும்.'),
  },
  { // 5
    art: scene('porch', { day: true }) + aina({ x: 64, face: 'happy', flip: false }) + arjun({ x: 128, face: 'laugh', pose: 'cheer' }) + kamala({ x: 196, face: 'happy', pose: 'hold', item: 'bowl', flip: true }) + raju({ x: 256, face: 'laugh', pose: 'wave', flip: true, apron: NEW }),
    lines: [
      L('raju', 'Meet Aunty Kamala, the real boss of this house!', 'Kenalkan Aunty Kamala, bos sebenar rumah ni!', '这是Kamala阿姨，这个家真正的老大！', '這是Kamala阿姨，這個家真正的老大！', 'カマラおばさんだ。この家の本当のボスさ！', 'கமலா அத்தையைப் பாருங்க, இந்த வீட்டோட உண்மையான முதலாளி!'),
      L('kamala', 'Come, come. You can help with the kolam.', 'Mari, mari. Boleh tolong buat kolam.', '来来来，来帮忙画彩米画。', '來來來，來幫忙畫彩米畫。', 'さあさあ、コーラム作りを手伝って。', 'வாங்க, வாங்க. கோலம் போட உதவலாம்.'),
      L('arjun', 'I’m doing the peacock!', 'Saya buat burung merak!', '我来画孔雀！', '我來畫孔雀！', 'ぼくはクジャクを描く！', 'நான் மயில் போடறேன்!'),
    ],
  },
  { // 6
    art: scene('porch', { day: true }) + kamala({ x: 126, face: 'happy', pose: 'hold', item: 'bowl' }) + aina({ x: 206, face: 'surprised', flip: true }),
    lines: [
      L('kamala', 'We draw it with rice flour. The ants get a festival too.', 'Kami lukis dengan tepung beras. Semut pun dapat berpesta.', '我们用米粉画。蚂蚁也一起过节。', '我們用米粉畫。螞蟻也一起過節。', '米粉で描くの。アリたちにもお祭りのごちそう。', 'நாங்க அரிசி மாவுல போடுவோம். எறும்புகளுக்கும் ஒரு பண்டிகை.'),
      L('aina', 'So it’s pretty and kind at the same time.', 'Cantik dan baik hati sekali gus.', '又漂亮又善良。', '又漂亮又善良。', 'きれいで、しかも優しいんですね。', 'அப்போ அழகும் கருணையும் ஒரே நேரத்துல.'),
    ],
  },
  { // 7
    art: scene('kitchen', { items: it('murukku', 60, 108, 0.5) + it('press', 96, 106, 0.5) }) + aina({ x: 128, face: 'happy', pose: 'hold', item: 'flour' }) + wei({ x: 214, face: 'think', flip: true }) + duit({ x: 272, y: 190, face: 'surprised', flip: true }),
    lines: [
      L('aina', 'A tin of murukku is RM25. Making our own: about RM9.', 'Satu tin murukku RM25. Buat sendiri: lebih kurang RM9.', '一罐murukku要RM25。自己做：大约RM9。', '一罐murukku要RM25。自己做：大約RM9。', 'ムルックは一缶RM25。手作りなら約RM9。', 'ஒரு டின் முறுக்கு RM25. நாமளே செஞ்சா: சுமார் RM9.'),
      L('wei', 'But it takes a whole afternoon.', 'Tapi makan masa satu petang.', '可是要花一整个下午。', '可是要花一整個下午。', 'でも午後がまるまるつぶれるよ。', 'ஆனா ஒரு மதியம் முழுக்க ஆகும்.'),
      L('aina', 'An afternoon together. I’ll take it.', 'Satu petang bersama. Aku setuju.', '一起过一个下午，我愿意。', '一起過一個下午，我願意。', '一緒に過ごす午後なら、大歓迎。', 'ஒண்ணா ஒரு மதியம். எனக்கு ஓகே.'),
    ],
    tip: T('Making it yourself can cost less. Count your time, too.', 'Buat sendiri boleh jimat. Kira juga masa anda.', '自己做可以省钱，但也要算上时间。', '自己做可以省錢，但也要算上時間。', '手作りは安くなることも。かかる時間も考えよう。', 'நீங்களே செய்தால் செலவு குறையலாம். உங்கள் நேரத்தையும் கணக்கிடுங்கள்.'),
  },
  { // 8: Deepavali
    art: scene('porch') + aina({ x: 56, face: 'laugh', pose: 'hold', item: 'murukku' }) + raju({ x: 132, face: 'laugh', pose: 'cheer', apron: NEW }) + kamala({ x: 196, face: 'happy', flip: true }) + wei({ x: 262, face: 'laugh', pose: 'wave', flip: true }),
    lines: [
      L('raju', 'Happy Deepavali! Come in, come in!', 'Selamat Hari Deepavali! Masuk, masuk!', '屠妖节快乐！进来，进来！', '屠妖節快樂！進來，進來！', 'ディーパバリおめでとう！さあ入って、入って！', 'தீபாவளி வாழ்த்துகள்! உள்ளே வாங்க, வாங்க!'),
      L('aina', 'Happy Deepavali! We made murukku for you.', 'Selamat Hari Deepavali! Kami buat murukku untuk uncle.', '屠妖节快乐！我们做了murukku给你们。', '屠妖節快樂！我們做了murukku給你們。', 'ディーパバリおめでとう！ムルックを作ってきました。', 'தீபாவளி வாழ்த்துகள்! உங்களுக்காக முறுக்கு செஞ்சோம்.'),
      L('kamala', 'Homemade? Now that’s a real gift.', 'Buat sendiri? Itu hadiah yang sebenar.', '自己做的？这才是真正的礼物。', '自己做的？這才是真正的禮物。', '手作り？それこそ本物の贈り物ね。', 'வீட்டுல செஞ்சதா? அதுதான் உண்மையான பரிசு.'),
    ],
  },
  { // 9
    art: scene('porch') + wei({ x: 110, face: 'surprised', pose: 'hold', item: 'bananaleaf', is: 0.6 }) + raju({ x: 206, face: 'laugh', pose: 'wave', flip: true, apron: NEW }) + duit({ x: 262, y: 190, face: 'happy', flip: true }),
    lines: [
      L('narrator', 'Neighbours, kopitiam regulars, friends of every kind. All welcome.', 'Jiran, pelanggan kopitiam, kawan dari semua kaum. Semua dialu-alukan.', '邻居、咖啡店的老顾客、各族朋友，全都欢迎。', '鄰居、咖啡店的老顧客、各族朋友，全都歡迎。', 'ご近所さん、コピティアムの常連、いろんな友だち。みんな歓迎。', 'அக்கம்பக்கத்தார், kopitiam வாடிக்கையாளர்கள், எல்லா இன நண்பர்கள். எல்லோருக்கும் வரவேற்பு.'),
      L('wei', 'So many people! Who are they all?', 'Ramainya! Siapa semua ni?', '好多人！他们都是谁？', '好多人！他們都是誰？', '人がいっぱい！みんな誰？', 'எவ்வளவு பேர்! இவங்க எல்லாம் யாரு?'),
      L('raju', 'Family, neighbours, customers. Tonight, all family.', 'Keluarga, jiran, pelanggan. Malam ni, semua keluarga.', '家人、邻居、顾客。今晚，全都是一家人。', '家人、鄰居、顧客。今晚，全都是一家人。', '家族、ご近所、お客さん。今夜はみんな家族だ。', 'குடும்பம், அக்கம்பக்கம், வாடிக்கையாளர்கள். இன்னைக்கு ராத்திரி, எல்லாரும் குடும்பம்.'),
    ],
  },
  { // 10
    art: scene('porch') + aina({ x: 118, face: 'happy', pose: 'hold', item: 'packet', is: 0.42 }) + arjun({ x: 172, face: 'laugh', pose: 'cheer', flip: true }) + kamala({ x: 244, face: 'laugh', flip: true }),
    lines: [
      L('aina', 'Happy Deepavali, Arjun. A small packet, with big wishes.', 'Selamat Hari Deepavali, Arjun. Sampul kecil, doa yang besar.', 'Arjun，屠妖节快乐。红包小小，祝福大大。', 'Arjun，屠妖節快樂。紅包小小，祝福大大。', 'アルジュン、ディーパバリおめでとう。小さな袋に、大きな願いを。', 'தீபாவளி வாழ்த்துகள், அர்ஜுன். சின்ன அங்பாவ், பெரிய வாழ்த்து.'),
      L('arjun', 'Thank you, Akka!', 'Terima kasih, Akka!', '谢谢姐姐！', '謝謝姐姐！', 'ありがとう、お姉ちゃん！', 'நன்றி, அக்கா!'),
    ],
    tip: T('Packets are about the wish, not the amount. Give within your means.', 'Sampul duit tentang doa, bukan jumlah. Beri ikut kemampuan.', '红包重在心意，不在金额。量力而为。', '紅包重在心意，不在金額。量力而為。', 'お祝い袋は金額より気持ち。無理のない範囲で。', 'அங்பாவ் வாழ்த்துக்காக, தொகைக்காக அல்ல. உங்கள் சக்திக்கு ஏற்பக் கொடுங்கள்.'),
  },
  { // 11
    art: scene('porch') + kamala({ x: 108, face: 'laugh', pose: 'hold', item: 'claypot' }) + wei({ x: 196, face: 'surprised', flip: true }) + aina({ x: 254, face: 'happy', flip: true }),
    lines: [
      L('wei', 'Aunty, you cooked all this?', 'Aunty masak semua ni?', '阿姨，这些都是你煮的？', '阿姨，這些都是你煮的？', 'おばさん、これ全部作ったんですか？', 'அத்தை, இதெல்லாம் நீங்களா சமைச்சீங்க?'),
      L('kamala', 'No! My three sisters each brought one dish.', 'Tak! Tiga adik-beradik aunty masing-masing bawa satu lauk.', '不是！我三个姐妹每人带了一道菜。', '不是！我三個姐妹每人帶了一道菜。', 'まさか！姉妹三人が一品ずつ持ってきたの。', 'இல்ல! என் மூணு தங்கச்சிங்களும் ஆளுக்கு ஒரு கறி கொண்டு வந்தாங்க.'),
      L('aina', 'Smart. Everyone shares, nobody’s stretched.', 'Bijak. Semua berkongsi, tiada yang terbeban.', '聪明。大家分担，谁都不吃力。', '聰明。大家分擔，誰都不吃力。', '賢い。みんなで分ければ、誰も無理しない。', 'சாமர்த்தியம். எல்லாரும் பகிர்றாங்க, யாருக்கும் சுமையில்ல.'),
    ],
    tip: T('Share the load: each family brings a dish, and nobody overspends.', 'Kongsi beban: setiap keluarga bawa satu lauk, tiada yang berbelanja lebih.', '分担一下：每家带一道菜，谁都不会超支。', '分擔一下：每家帶一道菜，誰都不會超支。', '分担しよう。各家庭が一品ずつ持ち寄れば、誰も使いすぎない。', 'சுமையைப் பகிருங்கள்: ஒவ்வொரு குடும்பமும் ஒரு உணவு கொண்டு வந்தால், யாரும் அதிகம் செலவழிக்க மாட்டார்கள்.'),
  },
  { // 12
    art: scene('porch') + arjun({ x: 118, face: 'laugh', pose: 'hold', item: 'sparkler', is: 0.6 }) + wei({ x: 204, face: 'laugh', pose: 'cheer', flip: true }) + duit({ x: 158, y: 192, face: 'surprised' }),
    lines: [
      L('narrator', 'Lamps on every step, sparklers, and far too much ladoo.', 'Pelita di setiap anak tangga, bunga api, dan ladoo yang terlalu banyak.', '每级台阶都点着灯，还有仙女棒，和吃不完的ladoo。', '每級台階都點著燈，還有仙女棒，和吃不完的ladoo。', '階段ごとの灯り、手持ち花火、そして食べきれないほどのラドゥ。', 'ஒவ்வொரு படியிலும் விளக்கு, மத்தாப்பு, அளவுக்கு மீறிய லட்டு.'),
      L('arjun', 'Duit, look! Stars!', 'Duit, tengok! Bintang!', 'Duit，你看！星星！', 'Duit，你看！星星！', 'ドゥイット、見て！星だよ！', 'துயிட், பாரு! நட்சத்திரங்கள்!'),
    ],
  },
  { // 13
    art: scene('home') + wei({ x: 124, face: 'worried', pose: 'hold', item: 'phone', is: 0.45 }) + aina({ x: 210, face: 'think', flip: true }) + duit({ x: 268, y: 190, pose: 'sleep', flip: true }),
    lines: [
      L('wei', 'Festive budget RM80. I spent… RM112?', 'Bajet perayaan RM80. Aku belanja… RM112?', '节日预算RM80。我花了……RM112？', '節日預算RM80。我花了……RM112？', 'お祝いの予算はRM80。使ったのは…RM112？', 'பண்டிகை பட்ஜெட் RM80. நான் செலவு பண்ணது… RM112?'),
      L('aina', 'No stress. Let’s find where the extra went.', 'Jangan risau. Jom cari ke mana lebihan tu pergi.', '别紧张。我们来找找多出来的钱去哪了。', '別緊張。我們來找找多出來的錢去哪了。', '大丈夫。多かった分がどこへ行ったか探そう。', 'கவலைப்படாதே. அதிகப்படி எங்கே போச்சுன்னு பார்ப்போம்.'),
    ],
  },
  { // 14
    art: scene('home') + wei({ x: 124, face: 'think', pose: 'hold', item: 'receipt', is: 0.45 }) + aina({ x: 210, face: 'happy', pose: 'hold', item: 'list', flip: true }),
    lines: [
      L('wei', 'Parking, a second box of ladoo, a last-minute gift.', 'Parking, kotak ladoo kedua, hadiah saat akhir.', '停车费、第二盒ladoo、临时买的礼物。', '停車費、第二盒ladoo、臨時買的禮物。', '駐車代、2箱目のラドゥ、駆け込みのプレゼント。', 'Parking, ரெண்டாவது லட்டுப் பெட்டி, கடைசி நிமிஷப் பரிசு.'),
      L('aina', 'So next year’s list gets a “little extras” line.', 'Jadi senarai tahun depan ada baris “belanja kecil”.', '那明年的清单就加一行“零碎开销”。', '那明年的清單就加一行「零碎開銷」。', 'じゃあ来年のリストに「ちょっとした出費」の行を足そう。', 'அப்போ அடுத்த வருஷப் பட்டியல்ல "சின்னச் சின்னச் செலவு"ன்னு ஒரு வரி.'),
    ],
    tip: T('After a festival, check where it went. Plan next year with the answer.', 'Selepas perayaan, semak ke mana duit pergi. Rancang tahun depan dengan jawapannya.', '节日过后，看看钱花去哪里。用答案来计划明年。', '節日過後，看看錢花去哪裡。用答案來計劃明年。', 'お祝いのあと、お金の行き先を確かめよう。その答えで来年を計画。', 'பண்டிகைக்குப் பிறகு பணம் எங்கே போனது என்று பாருங்கள். அந்தப் பதிலோடு அடுத்த ஆண்டைத் திட்டமிடுங்கள்.'),
  },
  { // 15
    art: scene('kopitiam', { table: 70 }) + raju({ x: 150, face: 'happy', pose: 'hold', item: 'tin', apron: NEW }) + aina({ x: 240, face: 'surprised', flip: true }),
    lines: [
      L('raju', 'Kamala saves in this tin all year, a little every month.', 'Kamala simpan dalam tin ni sepanjang tahun, sikit setiap bulan.', 'Kamala整年都往这个罐子存钱，每个月一点点。', 'Kamala整年都往這個罐子存錢，每個月一點點。', 'カマラは一年中この缶に貯めてる。毎月少しずつ。', 'கமலா வருஷம் முழுக்க இந்த டின்னுல சேமிப்பா, மாசா மாசம் கொஞ்சம்.'),
      L('raju', 'So Deepavali never hurts.', 'Jadi Deepavali tak pernah membebankan.', '所以屠妖节从来不伤荷包。', '所以屠妖節從來不傷荷包。', 'だからディーパバリで困ったことがない。', 'அதனால தீபாவளி எப்பவும் சுமையா இருக்காது.'),
      L('aina', 'Like our jar from October!', 'Macam balang kami bulan Oktober!', '就像我们十月的罐子！', '就像我們十月的罐子！', '10月の私たちのびんと同じだ！', 'அக்டோபர்ல எங்க ஜாடி மாதிரியே!'),
    ],
  },
  { // 16
    art: scene('shop', { sign: 'SALE SOON' }) + wei({ x: 116, face: 'surprised', pose: 'point' }) + aina({ x: 214, face: 'think', flip: true }) + it('shopbag', 268, 108, 0.6),
    lines: [
      L('wei', 'Year-end sale soon. These shoes will be 30% off!', 'Jualan akhir tahun dah dekat. Kasut ni nanti 30% diskaun!', '年终大促快开始了。这双鞋会打七折！', '年終大促快開始了。這雙鞋會打七折！', '年末セールがもうすぐ。この靴、30%オフになるって！', 'ஆண்டு இறுதி sale சீக்கிரம் வருது. இந்த ஷூ 30% கழிவு!'),
      L('aina', 'A good deal, if you’d buy them anyway.', 'Berbaloi, kalau memang nak beli pun.', '如果你本来就要买，那就划算。', '如果你本來就要買，那就划算。', 'どうせ買うものなら、お得だね。', 'நல்ல deal தான், எப்படியும் வாங்குவேன்னா.'),
    ],
  },
  { // 17
    art: scene('home') + wei({ x: 124, face: 'happy', pose: 'hold', item: 'list' }) + aina({ x: 210, face: 'laugh', flip: true }) + duit({ x: 266, y: 190, pose: 'sleep', flip: true }),
    lines: [
      L('wei', 'My list before the sales: shoes, a kettle. That’s it.', 'Senarai aku sebelum jualan: kasut, cerek. Itu je.', '促销前的清单：鞋子、热水壶。就这样。', '促銷前的清單：鞋子、熱水壺。就這樣。', 'セール前のリスト：靴とやかん。それだけ。', 'Sale-க்கு முன்னாடி என் பட்டியல்: ஷூ, ஒரு kettle. அவ்வளவுதான்.'),
      L('aina', 'Short list. Strong list.', 'Senarai pendek. Senarai mantap.', '清单短，但很有力。', '清單短，但很有力。', '短いけど、強いリスト。', 'சின்னப் பட்டியல். உறுதியான பட்டியல்.'),
    ],
    tip: T('Before a sale, list what you need. A discount on extras is still spending.', 'Sebelum jualan, senaraikan keperluan. Diskaun untuk benda lebih tetap berbelanja.', '促销前先列出需要的东西。多余的东西打折也还是花钱。', '促銷前先列出需要的東西。多餘的東西打折也還是花錢。', 'セール前に必要なものを書き出そう。余計なものは割引でも出費。', 'Sale-க்கு முன் தேவையானதைப் பட்டியலிடுங்கள். தேவையில்லாததற்குக் கழிவும் செலவுதான்.'),
  },
  { // 18
    art: scene('home', { day: true }) + aina({ x: 118, face: 'think', pose: 'hold', item: 'phone', is: 0.45 }) + wei({ x: 210, face: 'happy', flip: true }),
    lines: [
      L('aina', 'The kettle’s RM79 now, and RM62 in the sale next week.', 'Cerek ni RM79 sekarang, RM62 masa jualan minggu depan.', '这个热水壶现在RM79，下星期促销RM62。', '這個熱水壺現在RM79，下星期促銷RM62。', 'やかんは今RM79、来週のセールでRM62。', 'Kettle இப்போ RM79, அடுத்த வாரம் sale-ல RM62.'),
      L('wei', 'So we wait a week and keep RM17.', 'Jadi tunggu seminggu, simpan RM17.', '那就等一个星期，省下RM17。', '那就等一個星期，省下RM17。', 'じゃあ1週間待って、RM17残そう。', 'அப்போ ஒரு வாரம் காத்திருந்து RM17 மிச்சம் பிடிப்போம்.'),
    ],
    tip: T('Wait and compare. Many prices drop in the year-end sales.', 'Tunggu dan bandingkan. Banyak harga turun semasa jualan akhir tahun.', '等一等，比一比。很多东西在年终促销时降价。', '等一等，比一比。很多東西在年終促銷時降價。', '待って比べよう。年末セールで下がる値段も多い。', 'காத்திருந்து ஒப்பிடுங்கள். ஆண்டு இறுதி sale-இல் பல விலைகள் குறையும்.'),
  },
  { // 19
    art: scene('porch', { day: true }) + kamala({ x: 116, face: 'happy', pose: 'hold', item: 'agal', is: 0.55 }) + arjun({ x: 172, face: 'laugh', flip: true }) + wei({ x: 246, face: 'happy', flip: true }),
    lines: [
      L('kamala', 'We wash every lamp and keep it for next year.', 'Kami basuh setiap pelita dan simpan untuk tahun depan.', '每盏灯我们都洗干净，留到明年。', '每盞燈我們都洗乾淨，留到明年。', '灯りは全部洗って、来年のためにしまうの。', 'ஒவ்வொரு விளக்கையும் கழுவி அடுத்த வருஷத்துக்கு வைப்போம்.'),
      L('arjun', 'Some of these lamps are older than Thatha!', 'Ada pelita yang lebih tua dari Thatha!', '有些灯比爷爷还老！', '有些燈比爺爺還老！', 'おじいちゃんより古い灯りもあるよ！', 'இதுல சில விளக்குகள் தாத்தாவைவிடப் பழசு!'),
      L('wei', 'Used again every year. The best kind of decoration.', 'Guna semula setiap tahun. Hiasan paling bagus.', '年年重复用，这才是最好的装饰。', '年年重複用，這才是最好的裝飾。', '毎年使い回し。それが一番いい飾りだね。', 'ஒவ்வொரு வருஷமும் மறுபடியும் பயன்படுது. இதுதான் சிறந்த அலங்காரம்.'),
    ],
  },
  { // 20
    art: scene('night') + aina({ x: 132, face: 'happy' }) + wei({ x: 200, face: 'laugh', flip: true }) + duit({ x: 76, y: 190, pose: 'walk' }),
    lines: [
      L('wei', 'Deepavali felt huge, and we didn’t spend huge.', 'Deepavali terasa meriah, tapi kita tak berbelanja besar.', '屠妖节过得很热闹，我们却没花大钱。', '屠妖節過得很熱鬧，我們卻沒花大錢。', 'ディーパバリはすごく楽しかったのに、大金は使わなかった。', 'தீபாவளி ரொம்பப் பெருசா இருந்துச்சு, ஆனா நாம பெருசா செலவு பண்ணல.'),
      L('aina', 'The best parts were free: lamps, kolam, people.', 'Yang terbaik percuma: pelita, kolam, orang-orangnya.', '最好的部分都是免费的：灯、彩米画、还有人。', '最好的部分都是免費的：燈、彩米畫、還有人。', '一番よかったのはタダのもの。灯り、コーラム、人。', 'சிறந்தவை எல்லாம் இலவசம்: விளக்குகள், கோலம், மனுஷங்க.'),
    ],
  },
  { // 21
    art: scene('kopitiam') + raju({ x: 98, face: 'laugh', pose: 'hold', item: 'teh', apron: NEW }) + aina({ x: 180, face: 'happy', flip: true }) + wei({ x: 230, face: 'laugh', flip: true }),
    lines: [
      L('raju', 'My new apron survived Deepavali. Curry, ghee, everything.', 'Apron baru uncle selamat lepas Deepavali. Kari, minyak sapi, semua.', '我的新围裙撑过了屠妖节。咖喱、酥油，什么都沾过。', '我的新圍裙撐過了屠妖節。咖哩、酥油，什麼都沾過。', '新しいエプロン、ディーパバリを乗り切ったよ。カレーもギーも全部。', 'என் புது apron தீபாவளியைத் தாங்கிடுச்சு. கறி, நெய், எல்லாம்.'),
      L('wei', 'Best RM35 we ever spent.', 'RM35 terbaik yang pernah kami belanja.', '这是我们花得最值的RM35。', '這是我們花得最值的RM35。', '今までで一番いいRM35の使い道。', 'நாங்க செலவு பண்ணதுலயே சிறந்த RM35.'),
    ],
  },
  { // 22
    art: scene('home') + aina({ x: 118, face: 'happy', pose: 'hold', item: 'jarempty' }) + wei({ x: 212, face: 'laugh', pose: 'cheer', flip: true }),
    lines: [
      L('aina', 'December’s jar starts today. RM5 a week.', 'Balang Disember bermula hari ni. RM5 seminggu.', '十二月的罐子今天开始。每星期RM5。', '十二月的罐子今天開始。每星期RM5。', '12月のびん、今日からスタート。週にRM5。', 'டிசம்பர் ஜாடி இன்னைக்குத் தொடங்குது. வாரத்துக்கு RM5.'),
      L('wei', 'Mine’s called “January me”. She’ll thank us.', 'Balang aku namanya “Aku bulan Januari”. Dia mesti berterima kasih.', '我的罐子叫“一月的我”。她会感谢我们的。', '我的罐子叫「一月的我」。她會感謝我們的。', '私のは「1月の私」って名前。きっと感謝されるよ。', 'என் ஜாடி பேரு "ஜனவரி நான்". அவ நமக்கு நன்றி சொல்வா.'),
    ],
    tip: T('Start next month’s saving before the month begins.', 'Mulakan simpanan bulan depan sebelum bulan itu bermula.', '下个月的储蓄，在月初之前就开始。', '下個月的儲蓄，在月初之前就開始。', '来月の貯金は、その月が始まる前に始めよう。', 'அடுத்த மாதம் தொடங்கும் முன்பே அதன் சேமிப்பைத் தொடங்குங்கள்.'),
  },
  { // 23
    art: scene('shop', { sign: 'SALE 30%' }) + wei({ x: 126, face: 'laugh', pose: 'hold', item: 'shopbag', is: 0.6 }) + aina({ x: 212, face: 'happy', flip: true }),
    lines: [
      L('wei', 'On my list, and 30% off. Now it’s a good buy.', 'Ada dalam senarai, dan 30% diskaun. Baru berbaloi.', '在我的清单上，又打七折。这才叫买得好。', '在我的清單上，又打七折。這才叫買得好。', 'リストにあって、30%オフ。これなら良い買い物。', 'என் பட்டியல்ல இருக்கு, 30% கழிவும். இப்போதான் நல்ல வாங்குதல்.'),
      L('aina', 'And the kettle?', 'Cerek pula?', '那热水壶呢？', '那熱水壺呢？', 'やかんは？', 'Kettle என்ன ஆச்சு?'),
      L('wei', 'RM62, like we said. RM17 goes in the jar.', 'RM62, macam kita cakap. RM17 masuk balang.', 'RM62，跟我们说的一样。RM17放进罐子。', 'RM62，跟我們說的一樣。RM17放進罐子。', '言ったとおりRM62。RM17はびんへ。', 'சொன்ன மாதிரியே RM62. RM17 ஜாடிக்குள்ள.'),
    ],
  },
  { // 24
    art: scene('home') + aina({ x: 118, face: 'happy', pose: 'hold', item: 'jar' }) + wei({ x: 238, face: 'laugh', flip: true }) + duit({ x: 180, y: 190, face: 'surprised' }),
    lines: [
      L('narrator', 'The December jar, one week in: RM22.', 'Balang Disember, seminggu: RM22.', '十二月的罐子，第一个星期：RM22。', '十二月的罐子，第一個星期：RM22。', '12月のびん、1週間でRM22。', 'டிசம்பர் ஜாடி, ஒரு வாரத்தில்: RM22.'),
      L('wei', 'Duit, you can stop guarding it.', 'Duit, tak payah jaga balang tu.', 'Duit，不用守着它啦。', 'Duit，不用守著它啦。', 'ドゥイット、見張らなくていいよ。', 'துயிட், நீ அதைக் காவல் காக்க வேணாம்.'),
    ],
  },
  { // 25
    art: scene('kopitiam', { table: 262 }) + arjun({ x: 118, face: 'laugh', pose: 'hold', item: 'packet', is: 0.4 }) + raju({ x: 184, face: 'happy', flip: true, apron: NEW }),
    lines: [
      L('arjun', 'I got RM43 in packets! I’m saving for a bicycle.', 'Saya dapat RM43 dalam sampul! Saya nak simpan untuk basikal.', '我收到RM43红包！我要存钱买脚车。', '我收到RM43紅包！我要存錢買腳車。', 'お祝い袋でRM43もらった！自転車のために貯める。', 'எனக்கு அங்பாவ்ல RM43 கிடைச்சுது! சைக்கிளுக்குச் சேமிக்கப் போறேன்.'),
      L('raju', 'Spend a little, save the rest. That’s my grandson.', 'Belanja sikit, simpan selebihnya. Itulah cucu atuk.', '花一点，存其余的。这才是我孙子。', '花一點，存其餘的。這才是我孫子。', '少し使って、残りは貯める。さすが私の孫だ。', 'கொஞ்சம் செலவு, மீதி சேமிப்பு. அதுதான் என் பேரன்.'),
    ],
    tip: T('Help children save part of their festive packets for something they want.', 'Bantu anak-anak simpan sebahagian duit sampul untuk sesuatu yang mereka mahu.', '帮孩子把部分红包存起来，买他们想要的东西。', '幫孩子把部分紅包存起來，買他們想要的東西。', '子どもがお祝い袋の一部を、欲しいもののために貯めるのを手伝おう。', 'பிள்ளைகள் அங்பாவ் பணத்தில் ஒரு பகுதியை அவர்கள் விரும்பும் ஒன்றுக்குச் சேமிக்க உதவுங்கள்.'),
  },
  { // 26
    art: scene('home', { day: true }) + wei({ x: 124, face: 'happy', pose: 'hold', item: 'phone', is: 0.45 }) + aina({ x: 210, face: 'laugh', flip: true }) + duit({ x: 266, y: 190, face: 'happy', flip: true }),
    lines: [
      L('wei', 'Year-end potluck with friends? Everyone brings one dish.', 'Potluck akhir tahun dengan kawan-kawan? Semua bawa satu lauk.', '年底和朋友来个一人一菜的聚餐？', '年底和朋友來個一人一菜的聚餐？', '年末は友だちと持ち寄りパーティー？一人一品で。', 'நண்பர்களோட ஆண்டு இறுதி potluck? ஆளுக்கு ஒரு உணவு.'),
      L('aina', 'Just like Aunty Kamala’s sisters!', 'Macam adik-beradik Aunty Kamala!', '就像Kamala阿姨的姐妹们！', '就像Kamala阿姨的姐妹們！', 'カマラおばさんの姉妹みたいに！', 'கமலா அத்தையோட தங்கச்சிங்க மாதிரியே!'),
    ],
  },
  { // 27
    art: scene('home') + aina({ x: 118, face: 'happy', pose: 'hold', item: 'list' }) + wei({ x: 212, face: 'laugh', pose: 'cheer', flip: true }) + duit({ x: 268, y: 190, face: 'happy', flip: true }),
    lines: [
      L('aina', 'November: festival done, budget nearly kept, jar started.', 'November: perayaan selesai, bajet hampir terjaga, balang dah bermula.', '十一月：节过完了，预算差不多守住，罐子也开始了。', '十一月：節過完了，預算差不多守住，罐子也開始了。', '11月：お祭りも終わり、予算はほぼ守れて、びんも始まった。', 'நவம்பர்: பண்டிகை முடிஞ்சுது, பட்ஜெட் கிட்டத்தட்டக் காப்பாத்தியாச்சு, ஜாடி தொடங்கியாச்சு.'),
      L('wei', 'Nearly kept still counts!', 'Hampir terjaga pun dikira!', '差不多也算数！', '差不多也算數！', 'ほぼ守れた、も立派！', 'கிட்டத்தட்டக் காப்பாத்தினதும் கணக்குதான்!'),
    ],
  },
  { // 28 (skipped in short months)
    art: scene('home') + it('tinopen', 160, 176, 1.5) + duit({ x: 162, y: 170, pose: 'sleep' }) + aina({ x: 96, face: 'laugh' }) + wei({ x: 236, face: 'laugh', flip: true }),
    lines: [
      L('narrator', 'Duit found the best use for an empty murukku tin.', 'Duit jumpa guna terbaik untuk tin murukku kosong.', 'Duit找到了空murukku罐的最佳用途。', 'Duit找到了空murukku罐的最佳用途。', 'ドゥイットは空のムルック缶の一番いい使い道を見つけた。', 'காலி முறுக்கு டின்னுக்குச் சிறந்த பயனைத் துயிட் கண்டுபிடித்தது.'),
    ],
  },
  { // 29 (skipped in short months)
    art: scene('porch', { day: true }) + arjun({ x: 120, face: 'laugh', pose: 'point' }) + wei({ x: 196, face: 'think', flip: true }),
    lines: [
      L('arjun', 'One dot, then a loop around it. Easy!', 'Satu titik, lepas tu satu gelung keliling. Senang!', '一个点，再绕一个圈。很简单！', '一個點，再繞一個圈。很簡單！', '点をひとつ、そのまわりに輪をひとつ。簡単！', 'ஒரு புள்ளி, அப்புறம் அதைச் சுத்தி ஒரு வளையம். ஈஸி!'),
      L('wei', 'Mine looks like a noodle.', 'Aku punya macam mi.', '我画的像一条面。', '我畫的像一條麵。', '私のは麺みたい。', 'என்னோடது நூடுல்ஸ் மாதிரி இருக்கு.'),
    ],
  },
  { // 30 (skipped in 30-day months)
    art: scene('home') + aina({ x: 118, face: 'laugh', pose: 'hold', item: 'teh', is: 0.45 }) + wei({ x: 208, face: 'laugh', pose: 'hold', item: 'teh', is: 0.45, flip: true }) + duit({ x: 264, y: 190, pose: 'sleep', flip: true }),
    lines: [
      L('wei', 'Same time next year?', 'Jumpa lagi tahun depan?', '明年同一时间？', '明年同一時間？', '来年もまた？', 'அடுத்த வருஷம் இதே நேரம்?'),
      L('aina', 'Same time, same budget, maybe more murukku.', 'Masa sama, bajet sama, mungkin lebih murukku.', '同一时间，同一个预算，也许多一点murukku。', '同一時間，同一個預算，也許多一點murukku。', '同じ時期、同じ予算、ムルックはたぶん多めに。', 'இதே நேரம், இதே பட்ஜெட், ஒருவேளை இன்னும் அதிக முறுக்கு.'),
    ],
  },
  { // 31: the ending
    art: scene('porch') + aina({ x: 42, face: 'laugh', pose: 'cheer' }) + wei({ x: 94, face: 'laugh', pose: 'wave' }) + raju({ x: 160, face: 'laugh', apron: NEW }) + kamala({ x: 212, face: 'laugh', flip: true })
      + arjun({ x: 256, face: 'laugh', pose: 'cheer', flip: true }) + duit({ x: 294, y: 192, face: 'laugh', flip: true }),
    lines: [
      L('raju', 'Kamala says you two are family now. Every Deepavali!', 'Kamala kata kamu berdua dah jadi keluarga. Setiap Deepavali!', 'Kamala说你们俩现在是家人了。每年屠妖节都来！', 'Kamala說你們倆現在是家人了。每年屠妖節都來！', 'カマラが、二人はもう家族だって。毎年のディーパバリにおいで！', 'நீங்க ரெண்டு பேரும் இப்போ குடும்பம்னு கமலா சொல்றா. ஒவ்வொரு தீபாவளிக்கும்!'),
      L('aina', 'Deal. And next year, we’ll start saving in October.', 'Setuju. Tahun depan, kami mula simpan dari Oktober.', '一言为定。明年我们十月就开始存钱。', '一言為定。明年我們十月就開始存錢。', '約束。来年は10月から貯め始めます。', 'டீல். அடுத்த வருஷம், அக்டோபர்லயே சேமிக்கத் தொடங்குவோம்.'),
      L('narrator', 'Lamps lit, a jar started, and a December with a plan.', 'Pelita menyala, balang bermula, dan Disember yang ada rancangan.', '灯亮了，罐子开始了，十二月也有了计划。', '燈亮了，罐子開始了，十二月也有了計劃。', '灯りがともり、びんが始まり、12月には計画がある。', 'விளக்குகள் ஏற்றப்பட்டன, ஒரு ஜாடி தொடங்கியது, திட்டத்துடன் ஒரு டிசம்பர்.'),
    ],
    tip: T('Festivals are for sharing. A plan lets you enjoy them fully.', 'Perayaan untuk dikongsi. Rancangan membolehkan anda menikmatinya sepenuhnya.', '节日是用来分享的。有计划，才能尽情享受。', '節日是用來分享的。有計劃，才能盡情享受。', 'お祭りは分かち合うもの。計画があれば思いきり楽しめる。', 'பண்டிகைகள் பகிர்வதற்கே. ஒரு திட்டம் அவற்றை முழுமையாக அனுபவிக்க உதவும்.'),
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
  stickers: [
    stk('budgetlist', 'Festive budget', 'Bajet perayaan', '节日预算', '節日預算', 'お祝いの予算', 'பண்டிகை பட்ஜெட்', 'list'),
    stk('packet', 'Money packet', 'Sampul duit', '红包', '紅包', 'お祝い袋', 'அங்பாவ் உறை'),
    stk('kurta', 'New kurta', 'Kurta baru', '新库尔塔', '新庫爾塔', '新しいクルタ', 'புது குர்தா'),
    stk('wardrobe', 'Wardrobe', 'Almari', '衣柜', '衣櫃', 'クローゼット', 'அலமாரி'),
    stk('kolamdots', 'Dot kolam', 'Kolam titik', '点点彩米画', '點點彩米畫', '点のコーラム', 'புள்ளிக் கோலம்'),
    stk('riceflour', 'Rice flour', 'Tepung beras', '米粉', '米粉', '米粉', 'அரிசி மாவு', 'flour'),
    stk('press', 'Murukku press', 'Acuan murukku', '螺旋饼模', '螺旋餅模', 'ムルック絞り器', 'முறுக்கு அச்சு'),
    stk('calendar', 'Deepavali day', 'Hari Deepavali', '屠妖节当天', '屠妖節當天', 'ディーパバリの日', 'தீபாவளித் திருநாள்'),
    stk('vilakku', 'Kuthu vilakku', 'Kuthu vilakku', '铜油灯', '銅油燈', '真鍮の灯明台', 'குத்துவிளக்கு'),
    stk('agal', 'Clay lamps', 'Pelita tanah liat', '陶土油灯', '陶土油燈', '素焼きの灯明', 'அகல் விளக்குகள்'),
    stk('bananaleaf', 'Banana leaf meal', 'Nasi daun pisang', '香蕉叶饭', '香蕉葉飯', 'バナナリーフの食事', 'வாழை இலைச் சாப்பாடு'),
    stk('sparkler', 'Sparkler', 'Bunga api', '仙女棒', '仙女棒', '手持ち花火', 'மத்தாப்பு'),
    stk('claypot', 'Curry pot', 'Periuk kari', '咖喱锅', '咖哩鍋', 'カレー鍋', 'கறிச் சட்டி'),
    stk('ladoo', 'Ladoo', 'Ladu', '拉杜球', '拉杜球', 'ラドゥ', 'லட்டு'),
    stk('murukku', 'Murukku', 'Murukku', '螺旋脆饼', '螺旋脆餅', 'ムルック', 'முறுக்கு'),
    stk('salebag', 'Sale bag', 'Beg jualan', '促销购物袋', '促銷購物袋', 'セールの袋', 'தள்ளுபடிப் பை', 'shopbag'),
    stk('saree', 'Saree', 'Sari', '纱丽', '紗麗', 'サリー', 'சேலை'),
    stk('bangles', 'Bangles', 'Gelang kaca', '手镯', '手鐲', 'バングル', 'வளையல்கள்'),
    stk('marigold', 'Marigold garland', 'Kalungan marigold', '万寿菊花环', '萬壽菊花環', 'マリーゴールドの花輪', 'சாமந்தி மாலை'),
    stk('thoranam', 'Mango-leaf garland', 'Thoranam daun mangga', '芒果叶门饰', '芒果葉門飾', 'マンゴーの葉飾り', 'மாவிலைத் தோரணம்'),
    stk('jasmine', 'Jasmine string', 'Untaian melur', '茉莉花串', '茉莉花串', 'ジャスミンの花飾り', 'மல்லிகைச் சரம்'),
    stk('savingstin', 'Savings tin', 'Tin simpanan', '存钱铁罐', '存錢鐵罐', '貯金缶', 'சேமிப்பு டின்', 'tin'),
    stk('sweetbox', 'Box of sweets', 'Kotak manisan', '甜点盒', '甜點盒', 'お菓子の箱', 'இனிப்புப் பெட்டி'),
    stk('payasam', 'Payasam', 'Payasam', '甜奶粥', '甜奶粥', 'パヤサム', 'பாயாசம்'),
    stk('henna', 'Henna', 'Inai', '指甲花彩绘', '指甲花彩繪', 'ヘナ', 'மருதாணி'),
    stk('panneer', 'Rose-water sprinkler', 'Bekas air mawar', '玫瑰水洒瓶', '玫瑰水灑瓶', 'ローズウォーター入れ', 'பன்னீர்ச் செம்பு'),
    stk('adhirasam', 'Adhirasam', 'Adhirasam', '印度甜饼', '印度甜餅', 'アディラサム', 'அதிரசம்'),
    stk('coconut', 'Coconut', 'Kelapa', '椰子', '椰子', 'ココナッツ', 'தேங்காய்'),
    stk('jalebi', 'Jalebi', 'Jalebi', '糖浆圈', '糖漿圈', 'ジャレビ', 'ஜிலேபி'),
    stk('present', 'Wrapped gift', 'Hadiah', '礼物', '禮物', 'プレゼント', 'பரிசுப் பொட்டலம்', 'gift'),
    stk('kandil', 'Star lantern', 'Tanglung bintang', '星形灯笼', '星形燈籠', '星のランタン', 'நட்சத்திர விளக்கு'),
  ],
  panels: panels.map(p => ({ ...p, art: p.art + K.grain() })),
  defs: K.defs(),
};
