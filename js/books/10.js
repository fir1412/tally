// October: Pasar malam. Aina, Wei, Uncle Raju and Duit go to the Thursday night market all month,
// learn to carry a set amount, compare, share and save, and end by giving Uncle Raju a Deepavali gift.
import { aina, wei, raju, duit, scene, it, priceTag } from './cast.js';

const T = (en, ms, zh, zht, ja) => ({ en, ms, zh, 'zh-Hant': zht, ja });
const L = (who, ...t) => ({ who, text: T(...t) });
const stk = (id, en, ms, zh, zht, ja) => ({ id, name: T(en, ms, zh, zht, ja), svg: it(id, 32, 32, 1.2) });
const apamStall = (behind, items = '') => scene('stall', { sign: 'APAM BALIK', behind, items: it('apambalik', 262, 114, 0.6) + it('apambalik', 58, 114, 0.6) + items });

export default {
  id: '10',
  theme: T('Pasar malam', 'Pasar malam', '夜市', '夜市', 'ナイトマーケット'),
  colours: { dark: ['#12132A', '#1A1C38', '#232646'], light: ['#FBF4EC', '#FFFFFF', '#F3E4D4'], accent: '#C2410C' },
  stickers: [
    stk('apambalik', 'Apam balik', 'Apam balik', '曼煎糕', '曼煎糕', 'アパム・バリック'),
    stk('burger', 'Street burger', 'Burger tepi jalan', '路边汉堡', '路邊漢堡', '屋台バーガー'),
    stk('airtebu', 'Sugarcane juice', 'Air tebu', '甘蔗水', '甘蔗水', 'サトウキビジュース'),
    stk('lekor', 'Keropok lekor', 'Keropok lekor', '鱼饼条', '魚餅條', '魚のすり身スティック'),
    stk('sotong', 'Grilled squid', 'Sotong bakar', '烤苏东', '烤蘇東', 'イカ焼き'),
    stk('cucur', 'Cucur udang', 'Cucur udang', '虾饼', '蝦餅', 'エビのかき揚げ'),
    stk('pisanggoreng', 'Banana fritters', 'Pisang goreng', '炸香蕉', '炸香蕉', '揚げバナナ'),
    stk('loklok', 'Lok lok', 'Lok lok', '碌碌', '碌碌', 'ロックロック串'),
    stk('murtabak', 'Murtabak', 'Murtabak', '夹馅煎饼', '夾餡煎餅', 'ムルタバ'),
    stk('ckt', 'Char kuey teow', 'Char kuey teow', '炒粿条', '炒粿條', 'チャー・クイティオ'),
    stk('putupiring', 'Putu piring', 'Putu piring', '椰糖蒸米糕', '椰糖蒸米糕', 'プトゥ・ピリン'),
    stk('kuihlapis', 'Kuih lapis', 'Kuih lapis', '九层糕', '九層糕', 'クエ・ラピス'),
    stk('rojak', 'Rojak', 'Rojak', '啰惹', '囉惹', 'ロジャック'),
    stk('cendol', 'Cendol', 'Cendol', '煎蕊', '煎蕊', 'チェンドル'),
    stk('balloon', 'Balloons', 'Belon', '气球', '氣球', '風船'),
    stk('lantern', 'Lantern', 'Tanglung', '灯笼', '燈籠', 'ちょうちん'),
    stk('coins', 'Coins', 'Syiling', '硬币', '硬幣', '小銭'),
    stk('envelope', 'Cash envelope', 'Sampul duit', '现金信封', '現金信封', '現金の封筒'),
    stk('jar', 'Savings jar', 'Balang simpanan', '储蓄罐', '儲蓄罐', '貯金びん'),
    stk('receipt', 'Receipt', 'Resit', '收据', '收據', 'レシート'),
    stk('tote', 'Own bag', 'Beg sendiri', '环保袋', '環保袋', 'マイバッグ'),
    stk('popiah', 'Popiah', 'Popiah', '薄饼', '薄餅', 'ポピア'),
    stk('buahpotong', 'Cut fruit', 'Buah potong', '切片水果', '切片水果', 'カットフルーツ'),
    stk('jagung', 'Corn cup', 'Jagung cawan', '杯装玉米', '杯裝玉米', 'カップコーン'),
    stk('airbungkus', 'Drink in a bag', 'Air bungkus', '袋装饮料', '袋裝飲料', '袋ドリンク'),
    stk('selipar', 'Flip-flops', 'Selipar', '拖鞋', '拖鞋', 'ビーチサンダル'),
    stk('timbang', 'Fruit scale', 'Penimbang', '水果秤', '水果秤', 'はかり'),
    stk('price', 'Price tag', 'Tanda harga', '价钱牌', '價錢牌', '値札'),
    stk('otakotak', 'Otak-otak', 'Otak-otak', '乌达', '烏達', 'オタオタ'),
    stk('diya', 'Diya lamp', 'Pelita', '油灯', '油燈', 'ディヤ（灯明）'),
    stk('kolam', 'Kolam', 'Kolam', '彩米画', '彩米畫', 'コーラム'),
  ],
  panels: [
    { // 1
      art: scene('home') + aina({ x: 118, face: 'happy', pose: 'wave' }) + wei({ x: 214, face: 'laugh', pose: 'hold', item: 'phone', flip: true }) + duit({ x: 166, y: 190, face: 'happy' }),
      lines: [
        L('wei', 'Pasar malam is back on our street, every Thursday!', 'Pasar malam dah buka balik kat jalan kita, setiap Khamis!', '夜市又回到我们这条街了，每个星期四！', '夜市又回到我們這條街了，每個星期四！', 'うちの通りのナイトマーケット、毎週木曜に復活だよ！'),
        L('aina', 'Yes! This time, let’s go with a plan.', 'Best! Kali ni, jom pergi dengan plan.', '太好了！这次我们要有计划地去。', '太好了！這次我們要有計劃地去。', 'やった！今回は計画を立てて行こう。'),
      ],
    },
    { // 2
      art: scene('home') + aina({ x: 122, face: 'happy', pose: 'hold', item: 'envelope' }) + wei({ x: 214, face: 'surprised', flip: true }),
      lines: [
        L('aina', 'RM30 in this envelope for tonight. When it’s empty, we’re done.', 'RM30 dalam sampul ni untuk malam ni. Bila habis, kita balik.', '今晚就用信封里的RM30。花完了，我们就回家。', '今晚就用信封裡的RM30。花完了，我們就回家。', '今夜はこの封筒のRM30だけ。なくなったら帰ろう。'),
        L('wei', 'Only thirty?!', 'Tiga puluh je?!', '才三十？！', '才三十？！', 'たった30？！'),
      ],
      tip: T('Decide the night’s cash before you go, and bring only that.', 'Tetapkan duit untuk malam itu sebelum keluar, dan bawa itu saja.', '出门前先定好今晚的现金，只带那么多。', '出門前先定好今晚的現金，只帶那麼多。', '出かける前に今夜使う現金を決めて、それだけ持って行こう。'),
    },
    { // 3
      art: scene('street') + aina({ x: 110, face: 'happy', pose: 'hold', item: 'envelope', is: 0.6 }) + wei({ x: 196, face: 'laugh', pose: 'cheer' }) + duit({ x: 262, y: 190, face: 'surprised', flip: true }),
      lines: [
        L('narrator', 'Thursday night. Smoke, lights and a hundred good smells.', 'Malam Khamis. Asap, lampu dan seratus bau yang sedap.', '星期四晚上。炊烟、灯光，还有一百种香味。', '星期四晚上。炊煙、燈光，還有一百種香味。', '木曜の夜。煙と明かりと、百のいい匂い。'),
        L('wei', 'I want everything.', 'Aku nak semua.', '我全部都要。', '我全部都要。', '全部ほしい。'),
        L('aina', 'Let’s walk the whole row first.', 'Jom jalan habis satu barisan dulu.', '先把整排走一遍吧。', '先把整排走一遍吧。', 'まずは端から端まで歩いてみよう。'),
      ],
    },
    { // 4
      art: apamStall(raju({ x: 176, y: 156, face: 'laugh', pose: 'wave', s: 0.85 })) + aina({ x: 84, face: 'surprised', pose: 'point' }),
      lines: [
        L('raju', 'Apam balik! Crispy or soft, adik?', 'Apam balik! Nak rangup ke lembut, adik?', '曼煎糕！要脆的还是软的，妹妹？', '曼煎糕！要脆的還是軟的，妹妹？', 'アパム・バリックだよ！カリカリ？ふんわり？'),
        L('aina', 'Uncle Raju? You sell here too?', 'Uncle Raju? Uncle meniaga kat sini juga?', 'Raju叔叔？你也在这里摆摊？', 'Raju叔叔？你也在這裡擺攤？', 'ラジュおじさん？ここでもお店を？'),
        L('raju', 'Kopitiam by day, apam balik by night!', 'Siang kopitiam, malam apam balik!', '白天咖啡店，晚上曼煎糕！', '白天咖啡店，晚上曼煎糕！', '昼はコピティアム、夜はアパム・バリック！'),
      ],
    },
    { // 5
      art: scene('street') + wei({ x: 150, face: 'laugh', pose: 'hold', item: 'airbungkus' }) + aina({ x: 250, face: 'think', flip: true })
        + priceTag('RM5', 64, 70, 0.7) + priceTag('RM5', 206, 58, 0.6) + priceTag('RM5', 90, 118, 0.55) + priceTag('RM5', 34, 110, 0.6),
      lines: [
        L('wei', 'It’s only RM5!', 'RM5 je!', '才RM5而已！', '才RM5而已！', 'たったRM5だよ！'),
        L('narrator', '…said Wei, for the fourth time.', '…kata Wei, buat kali keempat.', '……Wei第四次这样说。', '……Wei第四次這樣說。', '…とウェイは言った。これで4回目。'),
      ],
      tip: T('Small buys add up. Four “just RM5” buys make RM20.', 'Belian kecil pun bertambah. Empat kali “RM5 je” jadi RM20.', '小钱会累积。四次“才RM5”就是RM20。', '小錢會累積。四次「才RM5」就是RM20。', '小さな買い物も積み重なる。「たったRM5」も4回でRM20。'),
    },
    { // 6
      art: scene('street') + it('airtebu', 56, 122, 0.7) + priceTag('RM6', 56, 90, 0.7) + it('airtebu', 264, 122, 0.7) + priceTag('RM4', 264, 90, 0.7)
        + wei({ x: 110, face: 'surprised' }) + aina({ x: 196, face: 'happy', pose: 'point' }),
      lines: [
        L('aina', 'Same air tebu, RM4 just two stalls down.', 'Air tebu sama, RM4 je dua gerai ke bawah.', '一样的甘蔗水，再过两档只要RM4。', '一樣的甘蔗水，再過兩檔只要RM4。', '同じサトウキビジュースが、2軒先だとRM4。'),
        L('wei', 'Wah, I almost paid RM6.', 'Wah, hampir aku bayar RM6.', '哇，我差点付了RM6。', '哇，我差點付了RM6。', 'わあ、RM6払うところだった。'),
      ],
      tip: T('Walk the row once before buying. Prices differ stall to stall.', 'Jalan satu pusingan dulu sebelum beli. Harga lain-lain ikut gerai.', '买之前先走一圈。每档价钱都不一样。', '買之前先走一圈。每檔價錢都不一樣。', '買う前に一周しよう。値段は店ごとに違う。'),
    },
    { // 7
      art: scene('home') + aina({ x: 124, face: 'happy', pose: 'hold', item: 'coins' }) + wei({ x: 216, face: 'worried', flip: true }) + duit({ x: 268, y: 190, face: 'think', flip: true }),
      lines: [
        L('aina', 'RM30 out, RM8 back. Not bad!', 'Keluar RM30, balik RM8. Boleh tahan!', '带出去RM30，剩下RM8。还不错！', '帶出去RM30，剩下RM8。還不錯！', 'RM30持って出て、RM8残った。上出来！'),
        L('wei', 'I spent RM35… and I can’t remember on what.', 'Aku habis RM35… dan tak ingat beli apa.', '我花了RM35……可是想不起买了什么。', '我花了RM35……可是想不起買了什麼。', '私はRM35使った…何に使ったか覚えてない。'),
      ],
      tip: T('Note it down tonight. By tomorrow, it’s a blur.', 'Catat malam ini juga. Esok dah lupa.', '当晚就记下来。到了明天就忘了。', '當晚就記下來。到了明天就忘了。', 'その夜のうちにメモしよう。明日にはもう忘れてる。'),
    },
    { // 8
      art: scene('kopitiam') + raju({ x: 96, face: 'laugh', pose: 'hold', item: 'teh' }) + wei({ x: 176, face: 'laugh', flip: true }) + aina({ x: 226, face: 'happy', flip: true }),
      lines: [
        L('raju', 'Money is like teh tarik. Pull too far and it spills!', 'Duit ni macam teh tarik. Tarik jauh sangat, tumpah!', '钱就像拉茶。拉得太远，就会洒出来！', '錢就像拉茶。拉得太遠，就會灑出來！', 'お金はテタレと同じ。引きすぎるとこぼれる！'),
        L('wei', 'Uncle, that makes no sense.', 'Uncle, tak masuk akal langsung.', '叔叔，这说不通啦。', '叔叔，這說不通啦。', 'おじさん、意味わかんないよ。'),
        L('raju', 'Wait till next Thursday.', 'Tunggu Khamis depan.', '等下个星期四你就懂。', '等下個星期四你就懂。', '来週の木曜になればわかるさ。'),
      ],
    },
    { // 9
      art: scene('home') + wei({ x: 116, face: 'happy', pose: 'point' }) + aina({ x: 206, face: 'happy', pose: 'hold', item: 'envelope', flip: true }) + duit({ x: 272, y: 190, face: 'laugh', flip: true }),
      lines: [
        L('wei', 'Next Thursday, I’m bringing an envelope too.', 'Khamis depan, aku pun nak bawa sampul.', '下个星期四，我也要带信封。', '下個星期四，我也要帶信封。', '次の木曜は、私も封筒を持っていく。'),
        L('aina', 'Here, a spare one. Write the amount on it.', 'Nah, satu lagi. Tulis jumlah kat depan.', '给，多一个。把金额写在上面。', '給，多一個。把金額寫在上面。', 'はい、予備のをどうぞ。金額を書いておいてね。'),
        L('duit', 'Meow.', 'Meow.', '喵。', '喵。', 'ニャー。'),
      ],
    },
    { // 10
      art: apamStall(raju({ x: 190, y: 156, face: 'happy', pose: 'hold', item: 'apambalik', s: 0.85, flip: true })) + aina({ x: 96, face: 'happy', pose: 'hold', item: 'tote', is: 0.65 }),
      lines: [
        L('raju', 'Plastic bag, adik?', 'Nak plastik, adik?', '要塑料袋吗，妹妹？', '要塑膠袋嗎，妹妹？', '袋いるかい？'),
        L('aina', 'No need, Uncle. I brought my own!', 'Tak apa, Uncle. Saya bawa beg sendiri!', '不用了叔叔，我自己带了袋子！', '不用了叔叔，我自己帶了袋子！', '大丈夫、おじさん。マイバッグ持ってきた！'),
      ],
      tip: T('Bring a bag. Some places charge for plastic, and it adds up.', 'Bawa beg sendiri. Ada tempat caj untuk plastik, lama-lama banyak juga.', '自备袋子。有些地方塑料袋要收钱，积少成多。', '自備袋子。有些地方塑膠袋要收錢，積少成多。', 'マイバッグを持って行こう。レジ袋が有料の所もあり、積み重なる。'),
    },
    { // 11
      art: scene('stall', { sign: 'MURTABAK', a: '#2A9D8F', items: it('murtabak', 160, 110, 0.8) + priceTag('RM12', 214, 108, 0.6) }) + wei({ x: 84, face: 'think' }) + aina({ x: 250, face: 'happy', pose: 'point', flip: true }),
      lines: [
        L('wei', 'A whole murtabak is RM12. Too much for one.', 'Satu murtabak RM12. Banyak sangat untuk seorang.', '一整个Murtabak要RM12。一个人吃太多了。', '一整個Murtabak要RM12。一個人吃太多了。', 'ムルタバ丸ごとRM12。一人には多すぎる。'),
        L('aina', 'Half each? RM6 each, and nothing wasted.', 'Kongsi separuh? RM6 seorang, tak membazir.', '一人一半？每人RM6，也不浪费。', '一人一半？每人RM6，也不浪費。', '半分こする？一人RM6で、無駄もなし。'),
      ],
      tip: T('Share a big buy. Half the price, and nothing goes to waste.', 'Kongsi belian besar. Separuh harga, tiada yang membazir.', '大份的一起分。一半价钱，也不浪费。', '大份的一起分。一半價錢，也不浪費。', '大きいものはシェアしよう。半額で、無駄も出ない。'),
    },
    { // 12
      art: apamStall(raju({ x: 196, y: 156, face: 'surprised', pose: 'hold', item: 'note', s: 0.85, flip: true })) + aina({ x: 100, face: 'think', pose: 'point' }),
      lines: [
        L('aina', 'Uncle, I gave RM20. Change should be RM12, not RM2.', 'Uncle, saya bagi RM20. Baki patut RM12, bukan RM2.', '叔叔，我给了RM20。应该找RM12，不是RM2。', '叔叔，我給了RM20。應該找RM12，不是RM2。', 'おじさん、RM20渡したよ。おつりはRM2じゃなくてRM12。'),
        L('raju', 'Aiyo, sorry! My mistake. Here, RM12.', 'Alamak, maaf! Silap uncle. Nah, RM12.', '哎哟，对不起！我算错了。来，RM12。', '哎喲，對不起！我算錯了。來，RM12。', 'あいや、ごめん！計算違いだ。はい、RM12。'),
      ],
      tip: T('Count your change before you walk away. Mistakes go both ways.', 'Kira baki sebelum beredar. Silap boleh berlaku kedua-dua belah.', '离开前先数找回的钱。谁都可能算错。', '離開前先數找回的錢。誰都可能算錯。', '立ち去る前におつりを数えよう。間違いはどちらにも起こる。'),
    },
    { // 13
      art: scene('home') + wei({ x: 130, face: 'surprised', pose: 'hold', item: 'phone' }) + aina({ x: 214, face: 'think', flip: true }) + duit({ x: 60, y: 190, pose: 'sleep' }),
      lines: [
        L('wei', 'Why does my e-wallet show RM3 twice?', 'Kenapa e-wallet aku tunjuk RM3 dua kali?', '为什么我的电子钱包扣了两次RM3？', '為什麼我的電子錢包扣了兩次RM3？', 'なんで電子マネーにRM3が2回あるの？'),
        L('aina', 'A double tap at the drinks stall. Ask them next week.', 'Tertekan dua kali kat gerai air. Tanya dia minggu depan.', '饮料档扫了两次吧。下星期问问老板。', '飲料檔掃了兩次吧。下星期問問老闆。', 'ドリンク屋で2回タップしたんだね。来週聞いてみよう。'),
      ],
      tip: T('Check your e-wallet history too. Double charges happen.', 'Semak juga sejarah e-wallet. Caj berganda boleh berlaku.', '也要查看电子钱包记录。重复扣款是会发生的。', '也要查看電子錢包紀錄。重複扣款是會發生的。', '電子マネーの履歴も確認しよう。二重請求は起こりうる。'),
    },
    { // 14
      art: scene('kopitiam', { table: 70 }) + raju({ x: 150, face: 'happy', pose: 'hold', item: 'jar' }) + aina({ x: 240, face: 'surprised', flip: true }),
      lines: [
        L('raju', 'Deepavali is early November. I save a little every week.', 'Deepavali awal November. Uncle simpan sikit-sikit tiap minggu.', '屠妖节在十一月初。我每个星期存一点。', '屠妖節在十一月初。我每個星期存一點。', 'ディーパバリは11月の初め。毎週少しずつ貯めてるんだ。'),
        L('aina', 'Can we come to your open house?', 'Boleh kami datang rumah terbuka Uncle?', '我们可以去你的开放门户吗？', '我們可以去你的開放門戶嗎？', 'おじさんのオープンハウスに行ってもいい？'),
        L('raju', 'Of course! Come hungry.', 'Mestilah! Datang dengan perut kosong.', '当然！空着肚子来。', '當然！空著肚子來。', 'もちろん！お腹をすかせておいで。'),
      ],
    },
    { // 15
      art: scene('home') + aina({ x: 120, face: 'happy', pose: 'hold', item: 'jarempty' }) + wei({ x: 210, face: 'laugh', pose: 'cheer', flip: true }),
      lines: [
        L('aina', 'Let’s get Uncle Raju a Deepavali gift.', 'Jom belikan Uncle Raju hadiah Deepavali.', '我们送Raju叔叔一份屠妖节礼物吧。', '我們送Raju叔叔一份屠妖節禮物吧。', 'ラジュおじさんにディーパバリのプレゼントを贈ろう。'),
        L('wei', 'From our leftover pasar malam money!', 'Guna baki duit pasar malam kita!', '就用逛夜市剩下的钱！', '就用逛夜市剩下的錢！', 'ナイトマーケットの残りのお金で！'),
      ],
      tip: T('Give your savings a name. A jar with a purpose fills faster.', 'Namakan simpanan anda. Balang yang ada tujuan lebih cepat penuh.', '给储蓄取个名字。有目标的罐子装得更快。', '給儲蓄取個名字。有目標的罐子裝得更快。', '貯金に名前をつけよう。目的のあるびんは早くたまる。'),
    },
    { // 16
      art: scene('street') + it('toy', 60, 104, 1.1) + priceTag('RM15', 60, 150, 0.6) + wei({ x: 136, face: 'surprised', pose: 'point', flip: true }) + aina({ x: 224, face: 'think', flip: true }),
      lines: [
        L('wei', 'A glowing spinny thing! Only RM15!', 'Mainan berpusing yang bercahaya! RM15 je!', '会发光的旋转玩具！才RM15！', '會發光的旋轉玩具！才RM15！', '光ってくるくる回るやつ！たったRM15！'),
        L('aina', 'Do you need it, or does it just look nice at night?', 'Kau perlukan ke, atau cantik sebab malam je?', '你是需要它，还是只是晚上看起来漂亮？', '你是需要它，還是只是晚上看起來漂亮？', '必要なの？それとも夜だからきれいに見えるだけ？'),
      ],
      tip: T('Not sure? Wait a week. If you still want it, it’ll be there.', 'Tak pasti? Tunggu seminggu. Kalau masih nak, ia masih ada.', '拿不定主意？等一个星期。还想要的话，它还在。', '拿不定主意？等一個星期。還想要的話，它還在。', '迷ったら1週間待とう。まだ欲しければ、まだそこにある。'),
    },
    { // 17
      art: scene('street') + wei({ x: 124, face: 'laugh', pose: 'hold', item: 'cendol' }) + aina({ x: 200, face: 'laugh', flip: true }) + duit({ x: 262, y: 190, face: 'happy', flip: true }),
      lines: [
        L('wei', 'Fine. Cendol instead. Two straws?', 'Okey. Cendol je lah. Dua straw?', '好吧，改买煎蕊。两根吸管？', '好吧，改買煎蕊。兩根吸管？', 'わかった。代わりにチェンドル。ストロー2本？'),
        L('aina', 'Two straws.', 'Dua straw.', '两根吸管。', '兩根吸管。', 'ストロー2本。'),
        L('narrator', 'The spinny thing stayed at the stall. Nobody missed it.', 'Mainan tu tinggal kat gerai. Tak ada siapa rindu.', '那个旋转玩具留在了摊上。没人想念它。', '那個旋轉玩具留在了攤上。沒人想念它。', '光るおもちゃは店に残った。誰も恋しくならなかった。'),
      ],
    },
    { // 18
      art: scene('home') + aina({ x: 116, face: 'happy', pose: 'hold', item: 'jar' }) + wei({ x: 250, face: 'laugh', flip: true }) + duit({ x: 184, y: 190, face: 'surprised' }) + it('coins', 152, 178, 0.5),
      lines: [
        L('narrator', 'Back home: RM9 left over. Into the jar it goes.', 'Balik rumah: baki RM9. Terus masuk balang.', '回到家：剩下RM9。全部放进罐子。', '回到家：剩下RM9。全部放進罐子。', '帰宅：残りはRM9。そのまま貯金びんへ。'),
        L('wei', 'Duit, those are not for you.', 'Duit, itu bukan untuk kau.', 'Duit，那不是给你的。', 'Duit，那不是給你的。', 'ドゥイット、それはあなたのじゃないよ。'),
      ],
    },
    { // 19
      art: scene('home', { day: true }) + aina({ x: 116, face: 'happy', pose: 'hold', item: 'phone' }) + wei({ x: 214, face: 'laugh', pose: 'hold', item: 'murtabak', is: 0.6, flip: true }) + duit({ x: 272, y: 190, pose: 'sleep' }),
      lines: [
        L('aina', 'Cooked at home, spent nothing today. Tick!', 'Masak kat rumah, hari ni tak belanja langsung. Tanda!', '在家煮饭，今天一分钱都没花。打勾！', '在家煮飯，今天一分錢都沒花。打勾！', '家で料理して、今日は何も使わなかった。チェック！'),
        L('wei', 'I ate leftover murtabak. Also free!', 'Aku makan baki murtabak. Percuma juga!', '我吃了剩下的Murtabak。也是免费的！', '我吃了剩下的Murtabak。也是免費的！', '私は残りのムルタバを食べた。これもタダ！'),
      ],
    },
    { // 20
      art: scene('home') + wei({ x: 124, face: 'worried', pose: 'hold', item: 'envelope' }) + aina({ x: 214, face: 'think', flip: true }),
      lines: [
        L('wei', 'Payday is on the 25th, and I have RM11 left.', 'Gaji masuk 25 hari bulan, dan aku tinggal RM11.', '25号才发薪水，我只剩RM11。', '25號才發薪水，我只剩RM11。', '給料日は25日なのに、残りはRM11。'),
        L('aina', 'Hmm. What do you really need till then?', 'Hmm. Apa yang kau betul-betul perlukan sampai masa tu?', '嗯……到那天之前，你真正需要的是什么？', '嗯……到那天之前，你真正需要的是什麼？', 'うーん。それまでに本当に必要なものは何？'),
      ],
    },
    { // 21
      art: scene('home') + wei({ x: 124, face: 'happy' }) + aina({ x: 200, face: 'happy', pose: 'hold', item: 'note', flip: true }) + duit({ x: 268, y: 190, pose: 'sleep', flip: true }),
      lines: [
        L('wei', 'Bus fare and lunch. That’s all.', 'Tambang bas dan makan tengah hari. Itu je.', '车费和午餐。就这些。', '車費和午餐。就這些。', 'バス代とお昼代。それだけ。'),
        L('aina', 'I’ll lend you RM20. Pay me back on payday, okay?', 'Aku pinjamkan RM20. Bayar balik hari gaji, okey?', '我借你RM20。发薪水那天还我，好吗？', '我借你RM20。發薪水那天還我，好嗎？', 'RM20貸すね。給料日に返してくれればいいよ。'),
        L('wei', 'Deal. I’ll write it down so we both remember.', 'Setuju. Aku tulis supaya kita berdua ingat.', '一言为定。我记下来，我们都不会忘。', '一言為定。我記下來，我們都不會忘。', '了解。二人とも忘れないようにメモしておく。'),
      ],
      tip: T('Lending to a friend? Agree the amount and the day, kindly.', 'Pinjam duit kepada kawan? Setuju jumlah dan tarikh, dengan baik.', '借钱给朋友？好好说清楚金额和还钱的日子。', '借錢給朋友？好好說清楚金額和還錢的日子。', '友だちにお金を貸すなら、金額と返す日を気持ちよく決めよう。'),
    },
    { // 22
      art: scene('street') + wei({ x: 140, face: 'think', pose: 'hold', item: 'envelope' }) + aina({ x: 226, face: 'laugh', flip: true }) + duit({ x: 66, y: 190, face: 'happy' }),
      lines: [
        L('wei', 'RM10 tonight, in my envelope. Watch me.', 'RM10 malam ni, dalam sampul aku. Tengok ni.', '今晚RM10，都在我的信封里。看我的。', '今晚RM10，都在我的信封裡。看我的。', '今夜はRM10、封筒に入れてきた。見てて。'),
        L('narrator', 'Wei walked the whole row. Twice.', 'Wei jalan habis satu barisan. Dua kali.', 'Wei把整排走了一遍。走了两遍。', 'Wei把整排走了一遍。走了兩遍。', 'ウェイは端から端まで歩いた。2往復。'),
      ],
    },
    { // 23
      art: apamStall(raju({ x: 170, y: 156, face: 'happy', pose: 'point', s: 0.85, flip: true })) + wei({ x: 84, face: 'surprised' }) + it('kuihlapis', 250, 114, 0.6),
      lines: [
        L('raju', 'Come near closing time. Some stalls sell off the kuih cheaper.', 'Datang dekat waktu tutup. Ada gerai jual murah kuih yang tinggal.', '快收摊的时候来。有些档口会便宜卖剩下的糕点。', '快收攤的時候來。有些檔口會便宜賣剩下的糕點。', '閉店間際においで。残りのお菓子を安くする店もある。'),
        L('wei', 'Uncle, you’re a genius.', 'Uncle, uncle memang genius.', '叔叔，你真是天才。', '叔叔，你真是天才。', 'おじさん、天才だね。'),
        L('raju', 'No lah. Just been here thirty years.', 'Mana ada. Dah tiga puluh tahun kat sini je.', '哪有，只是在这里三十年了。', '哪有，只是在這裡三十年了。', 'いやいや、ここに30年いるだけさ。'),
      ],
    },
    { // 24
      art: scene('night') + wei({ x: 130, face: 'laugh', pose: 'hold', item: 'coins' }) + aina({ x: 212, face: 'laugh', flip: true }) + duit({ x: 268, y: 190, face: 'happy', flip: true }),
      lines: [
        L('wei', 'RM10 out, RM2 back! And I ate well!', 'Keluar RM10, balik RM2! Dan kenyang pula!', '带出去RM10，剩RM2回来！还吃得很饱！', '帶出去RM10，剩RM2回來！還吃得很飽！', 'RM10持って出て、RM2戻ってきた！しかもお腹いっぱい！'),
        L('aina', 'Look at you, budget queen.', 'Wah, ratu bajet dah!', '看看你，预算女王。', '看看你，預算女王。', 'すごい、予算の女王だね。'),
      ],
    },
    { // 25
      art: scene('home', { day: true }) + wei({ x: 130, face: 'laugh', pose: 'hold', item: 'note' }) + aina({ x: 214, face: 'happy', flip: true }) + it('jar', 276, 150, 0.7),
      lines: [
        L('wei', 'Payday! Your RM20, as promised.', 'Hari gaji! RM20 kau, macam dijanji.', '发薪日！还你RM20，说到做到。', '發薪日！還你RM20，說到做到。', '給料日！約束のRM20、返すね。'),
        L('aina', 'Right on time. Thank you!', 'Tepat masa. Terima kasih!', '准时还钱，谢谢！', '準時還錢，謝謝！', '時間ぴったり。ありがとう！'),
        L('wei', 'And RM5 for the Deepavali jar. Saving first this time.', 'Dan RM5 untuk balang Deepavali. Kali ni simpan dulu.', '再放RM5进屠妖节罐子。这次先存钱。', '再放RM5進屠妖節罐子。這次先存錢。', 'あとディーパバリのびんにRM5。今回は先に貯金。'),
      ],
      tip: T('On payday, put the saving aside first, then spend.', 'Hari gaji, asingkan simpanan dulu, baru belanja.', '发薪日先把储蓄放一边，然后才花。', '發薪日先把儲蓄放一邊，然後才花。', '給料日には、まず貯金を分けてから使おう。'),
    },
    { // 26
      art: scene('kopitiam', { table: 160 }) + raju({ x: 286, y: 176, s: 0.7, face: 'happy', pose: 'hold', item: 'teh', flip: true }) + wei({ x: 86, face: 'think' }) + aina({ x: 232, face: 'think', flip: true }) + duit({ x: 150, y: 134, s: 0.8 }),
      lines: [
        L('wei', 'So what do we get Uncle Raju?', 'Jadi nak hadiahkan apa untuk Uncle Raju?', '那我们送Raju叔叔什么好？', '那我們送Raju叔叔什麼好？', 'で、ラジュおじさんに何を贈る？'),
        L('aina', 'Something he’ll use every single night.', 'Sesuatu yang dia guna setiap malam.', '他每晚都会用到的东西。', '他每晚都會用到的東西。', '毎晩使うものがいいな。'),
        L('wei', '…His apron is full of holes.', '…Apron dia dah penuh lubang.', '……他的围裙都是洞了。', '……他的圍裙都是洞了。', '…おじさんのエプロン、穴だらけだよ。'),
      ],
    },
    { // 27
      art: scene('stall', { sign: 'APRON • KAIN', a: '#7B2CBF', items: it('apron', 110, 104, 0.8) + it('apron', 200, 104, 0.8) + priceTag('RM35', 156, 112, 0.55) }) + aina({ x: 70, face: 'happy', pose: 'point' }) + wei({ x: 256, face: 'laugh', pose: 'hold', item: 'jar', flip: true }),
      lines: [
        L('narrator', 'Last Thursday. The jar: RM48, from leftovers and Wei’s RM5.', 'Khamis terakhir. Balang: RM48, dari baki dan RM5 Wei.', '最后一个星期四。罐子里有RM48，来自剩下的钱和Wei的RM5。', '最後一個星期四。罐子裡有RM48，來自剩下的錢和Wei的RM5。', '最後の木曜。びんには残りのお金とウェイのRM5で、RM48。'),
        L('aina', 'This apron. Thick cloth, big pockets. RM35.', 'Apron ni. Kain tebal, poket besar. RM35.', '就这件围裙。布料厚，口袋大。RM35。', '就這件圍裙。布料厚，口袋大。RM35。', 'このエプロンにしよう。生地が厚くて、ポケットが大きい。RM35。'),
        L('wei', 'And RM13 stays in the jar for next month.', 'Dan RM13 kekal dalam balang untuk bulan depan.', '还有RM13留在罐子里，给下个月。', '還有RM13留在罐子裡，給下個月。', 'RM13は来月のためにびんに残そう。'),
      ],
    },
    { // 28 (skipped in short months)
      art: scene('kopitiam', { table: false }) + raju({ x: 92, face: 'think', pose: 'hold', item: 'teh' }) + wei({ x: 190, face: 'laugh', flip: true }) + aina({ x: 250, face: 'happy', flip: true }),
      lines: [
        L('raju', 'Why are you two smiling like that?', 'Kenapa kamu berdua senyum macam tu?', '你们两个干嘛笑成这样？', '你們兩個幹嘛笑成這樣？', '二人とも、なんでそんなにニヤニヤしてるんだい？'),
        L('wei', 'No reason, Uncle!', 'Tak ada apa-apa, Uncle!', '没什么啦，叔叔！', '沒什麼啦，叔叔！', 'なんでもないよ、おじさん！'),
      ],
    },
    { // 29 (skipped in short months)
      art: scene('street') + it('lantern', 196, 96, 1.2) + duit({ x: 150, y: 190, s: 1.7, face: 'surprised' }),
      lines: [
        L('narrator', 'Meanwhile, Duit found a lantern that was clearly a toy.', 'Sementara itu, Duit jumpa tanglung yang jelas sekali mainan.', '与此同时，Duit发现了一个显然是玩具的灯笼。', '與此同時，Duit發現了一個顯然是玩具的燈籠。', 'その頃ドゥイットは、どう見てもおもちゃのちょうちんを見つけた。'),
        L('duit', 'Meow?', 'Meow?', '喵？', '喵？', 'ニャー？'),
      ],
    },
    { // 30 (skipped in short months)
      art: scene('home') + wei({ x: 126, face: 'laugh', pose: 'hold', item: 'gift', is: 0.6 }) + aina({ x: 212, face: 'laugh', flip: true }) + duit({ x: 270, y: 190, face: 'happy', flip: true }),
      lines: [
        L('wei', 'Is it wrapped, or just crumpled?', 'Ni dah dibalut, atau renyuk je?', '这是包好了，还是只是揉皱了？', '這是包好了，還是只是揉皺了？', 'これ、包んだの？それともしわくちゃにしただけ？'),
        L('aina', 'Wrapped with love. And a lot of tape.', 'Dibalut dengan kasih sayang. Dan banyak selotep.', '是用爱包的。还有很多胶带。', '是用愛包的。還有很多膠帶。', '愛情で包んだの。テープもたっぷり。'),
      ],
    },
    { // 31: the ending
      art: apamStall(raju({ x: 160, y: 156, face: 'laugh', pose: 'hold', item: 'apron', is: 0.7, s: 0.85 }), it('diya', 250, 114, 0.5) + it('jarfull', 222, 112, 0.5))
        + aina({ x: 66, face: 'laugh', pose: 'cheer' }) + wei({ x: 266, face: 'laugh', pose: 'wave', flip: true }) + duit({ x: 116, y: 192, face: 'laugh' }),
      lines: [
        L('aina', 'Happy early Deepavali, Uncle Raju!', 'Selamat Hari Deepavali awal-awal, Uncle Raju!', '提前祝你屠妖节快乐，Raju叔叔！', '提前祝你屠妖節快樂，Raju叔叔！', 'ちょっと早いけど、ディーパバリおめでとう、ラジュおじさん！'),
        L('raju', 'Aiyo, so thoughtful! Apam balik for everyone, on me.', 'Alamak, baiknya kamu! Apam balik untuk semua, uncle belanja.', '哎哟，你们真有心！曼煎糕我请大家吃。', '哎喲，你們真有心！曼煎糕我請大家吃。', 'あいや、なんて優しいんだ！アパム・バリックはみんなにおごりだ。'),
        L('narrator', 'The plan worked. And the jar is ready for November.', 'Plan menjadi. Dan balang dah sedia untuk November.', '计划成功了。罐子也准备好迎接十一月。', '計劃成功了。罐子也準備好迎接十一月。', '計画はうまくいった。びんも11月の準備ばっちり。'),
      ],
      tip: T('A budget isn’t saying no. It’s saying yes to what matters.', 'Bajet bukan tentang berkata tidak. Ia berkata ya kepada yang penting.', '预算不是说“不”，而是对重要的事说“好”。', '預算不是說「不」，而是對重要的事說「好」。', '予算は「ダメ」と言うことじゃない。大切なことに「いいよ」と言うこと。'),
    },
  ],
};
