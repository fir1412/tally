// December: Year end. The December jar, Grace's Christmas open house with a RM30 gift exchange, school holidays
// with Arjun (park, library, picnic), the year-end sale with a list, rainy weekends cooking in, a bonus plan,
// a year in review and next year's goals, ending with New Year's Eve fireworks from the rooftop.
import { castKit, it } from './cast.js';

const K = castKit('b12-');
const { aina, wei, raju, duit, scene, kamala, arjun, grace } = K;
const NEW = '#B5533A'; // Uncle Raju's apron from October

const T = (en, ms, zh, zht, ja) => ({ en, ms, zh, 'zh-Hant': zht, ja });
const L = (who, ...t) => ({ who, text: T(...t) });
const stk = (id, en, ms, zh, zht, ja, item = id) => ({ id, name: T(en, ms, zh, zht, ja), svg: K.sticker(item) });
const SALE = 'YEAR-END SALE';

const panels = [
  { // 1
    art: scene('home') + aina({ x: 118, face: 'happy', pose: 'hold', item: 'jar' }) + wei({ x: 212, face: 'laugh', pose: 'hold', item: 'phone', is: 0.45, flip: true }) + duit({ x: 266, y: 190, face: 'happy', flip: true }),
    lines: [
      L('aina', 'December’s jar: RM22 already, and the month’s just started.', 'Balang Disember: dah RM22, padahal bulan baru bermula.', '十二月的罐子：已经有RM22了，这个月才刚开始。', '十二月的罐子：已經有RM22了，這個月才剛開始。', '12月のびん、月が始まったばかりでもうRM22。'),
      L('wei', 'And Grace invited us to her Christmas open house!', 'Dan Grace jemput kita ke rumah terbuka Krismas dia!', '还有，Grace邀请我们去她的圣诞开放门户！', '還有，Grace邀請我們去她的聖誕開放門戶！', 'それと、グレースがクリスマスのオープンハウスに招待してくれた！'),
    ],
  },
  { // 2
    art: scene('kopitiam') + grace({ x: 96, face: 'laugh', pose: 'hold', item: 'giftexchange' }) + wei({ x: 180, face: 'laugh', flip: true }) + aina({ x: 228, face: 'happy', flip: true }),
    lines: [
      L('grace', 'Gift exchange at my place. One gift each, RM30 max.', 'Tukar hadiah kat rumah aku. Satu hadiah seorang, maksimum RM30.', '在我家交换礼物。每人一份，最多RM30。', '在我家交換禮物。每人一份，最多RM30。', 'うちでプレゼント交換するよ。一人一つ、上限RM30。'),
      L('wei', 'A limit? Oh, thank goodness.', 'Ada had? Syukurlah.', '有上限？太好了。', '有上限？太好了。', '上限あり？よかったあ。'),
    ],
    tip: T('A gift exchange with a set amount: everyone gets a gift, nobody overspends.', 'Tukar hadiah dengan had harga: semua dapat hadiah, tiada yang berbelanja lebih.', '定好金额的礼物交换：人人有礼物，没人超支。', '定好金額的禮物交換：人人有禮物，沒人超支。', '金額を決めたプレゼント交換なら、みんなもらえて、誰も使いすぎない。'),
  },
  { // 3
    art: scene('shop', { sign: SALE }) + wei({ x: 120, face: 'surprised', pose: 'hold', item: 'list' }) + aina({ x: 212, face: 'think', flip: true }),
    lines: [
      L('wei', 'Everything’s on sale. Everything!', 'Semua jualan murah. Semua!', '全部都在打折。全部！', '全部都在打折。全部！', '全部セール中。全部だよ！'),
      L('aina', 'And what’s on your list?', 'Dan apa dalam senarai kau?', '那你的清单上有什么？', '那你的清單上有什麼？', 'で、リストには何が？'),
      L('wei', 'A rice cooker. Just the rice cooker.', 'Periuk nasi. Periuk nasi je.', '电饭锅。只有电饭锅。', '電飯鍋。只有電飯鍋。', '炊飯器。炊飯器だけ。'),
    ],
  },
  { // 4
    art: scene('shop', { sign: 'LAST DAY!' }) + wei({ x: 116, face: 'surprised', pose: 'point' }) + aina({ x: 212, face: 'happy', flip: true }) + it('hourglass', 268, 106, 0.6),
    lines: [
      L('wei', 'Last day! Only three left!', 'Hari terakhir! Tinggal tiga je!', '最后一天！只剩三个！', '最後一天！只剩三個！', '最終日！残り3つ！'),
      L('aina', 'There’s always another last day. Is it on the list?', 'Selalu ada hari terakhir yang lain. Ada dalam senarai?', '永远都有下一个“最后一天”。它在清单上吗？', '永遠都有下一個「最後一天」。它在清單上嗎？', '「最終日」はまた来るよ。リストにある？'),
    ],
    tip: T('“Last day!” is a sales line. If it’s not on your list, let it go.', '“Hari terakhir!” cuma ayat jualan. Kalau tiada dalam senarai, lepaskan.', '“最后一天！”只是促销话术。不在清单上，就放手。', '「最後一天！」只是促銷話術。不在清單上，就放手。', '「最終日！」は売り文句。リストになければ見送ろう。'),
  },
  { // 5
    art: scene('kopitiam') + raju({ x: 92, face: 'happy', apron: NEW }) + arjun({ x: 148, face: 'worried' }) + aina({ x: 228, face: 'happy', pose: 'point', flip: true }),
    lines: [
      L('raju', 'School holidays. Arjun says he’s bored already.', 'Cuti sekolah. Arjun kata dia dah bosan.', '学校假期到了。Arjun说他已经很无聊了。', '學校假期到了。Arjun說他已經很無聊了。', '学校の休みだ。アルジュンはもう退屈だって。'),
      L('arjun', 'So bored, Thatha.', 'Bosan sangat, Thatha.', '好无聊啊，爷爷。', '好無聊啊，爺爺。', 'すっごく退屈、おじいちゃん。'),
      L('aina', 'Park, library, picnic. We’ll take him. All free!', 'Taman, perpustakaan, berkelah. Kami bawa dia. Semua percuma!', '公园、图书馆、野餐。我们带他去。全都免费！', '公園、圖書館、野餐。我們帶他去。全都免費！', '公園、図書館、ピクニック。連れていくよ。全部タダ！'),
    ],
  },
  { // 6
    art: scene('park', { mat: true }) + aina({ x: 100, face: 'laugh' }) + arjun({ x: 156, face: 'laugh', pose: 'cheer' }) + wei({ x: 214, face: 'laugh', pose: 'hold', item: 'picnic', flip: true }),
    lines: [
      L('arjun', 'Best day of the holidays!', 'Hari paling best cuti ni!', '这是假期最棒的一天！', '這是假期最棒的一天！', '休み中で一番の日！'),
      L('wei', 'Sandwiches and a bottle of water: RM6 for three.', 'Sandwic dan sebotol air: RM6 untuk bertiga.', '三明治加一瓶水：三个人RM6。', '三明治加一瓶水：三個人RM6。', 'サンドイッチと水1本で、3人でRM6。'),
    ],
    tip: T('Parks, libraries, picnics: holiday fun that’s free or nearly free.', 'Taman, perpustakaan, berkelah: seronok cuti yang percuma atau hampir percuma.', '公园、图书馆、野餐：免费或几乎免费的假期乐趣。', '公園、圖書館、野餐：免費或幾乎免費的假期樂趣。', '公園、図書館、ピクニック。タダかほぼタダの休日の楽しみ。'),
  },
  { // 7
    art: scene('library') + arjun({ x: 130, face: 'surprised', pose: 'hold', item: 'books', is: 0.6 }) + aina({ x: 206, face: 'happy', flip: true }),
    lines: [
      L('arjun', 'I can borrow five books? For free?', 'Saya boleh pinjam lima buku? Percuma?', '我可以借五本书？免费的？', '我可以借五本書？免費的？', '本を5冊も借りられるの？タダで？'),
      L('aina', 'For free. Just bring them back in two weeks.', 'Percuma. Pulangkan dalam dua minggu.', '免费的。两个星期后还回来就好。', '免費的。兩個星期後還回來就好。', 'タダだよ。2週間後に返せばいいの。'),
    ],
  },
  { // 8
    art: scene('rain') + wei({ x: 124, face: 'worried', pose: 'hold', item: 'phone', is: 0.45 }) + aina({ x: 210, face: 'think', flip: true }) + duit({ x: 266, y: 190, pose: 'sleep', flip: true }),
    lines: [
      L('wei', 'Rain again. Let’s just order delivery.', 'Hujan lagi. Order makanan je lah.', '又下雨了。叫外卖吧。', '又下雨了。叫外賣吧。', 'また雨。デリバリー頼もうよ。'),
      L('aina', 'Or we cook. Rice, eggs and that last cabbage.', 'Atau kita masak. Nasi, telur dan kobis yang tinggal tu.', '或者我们自己煮。饭、鸡蛋，还有那颗剩下的包菜。', '或者我們自己煮。飯、雞蛋，還有那顆剩下的包菜。', 'それか作ろう。ご飯と卵と、残ってるキャベツで。'),
    ],
  },
  { // 9
    art: scene('kitchen') + wei({ x: 124, face: 'laugh', pose: 'hold', item: 'friedrice' }) + aina({ x: 210, face: 'laugh', flip: true }) + duit({ x: 268, y: 190, face: 'surprised', flip: true }),
    lines: [
      L('wei', 'Fried rice for two: RM6. Delivery would have been RM38.', 'Nasi goreng untuk dua orang: RM6. Kalau order, RM38.', '两人份炒饭：RM6。叫外卖要RM38。', '兩人份炒飯：RM6。叫外賣要RM38。', '2人分のチャーハンでRM6。デリバリーならRM38。'),
      L('aina', 'And it tastes like home.', 'Dan rasa macam masakan rumah.', '而且有家的味道。', '而且有家的味道。', 'しかも家の味。'),
    ],
    tip: T('Rainy day in? Cooking together costs a fraction of delivery.', 'Hujan di rumah? Masak bersama jauh lebih murah dari penghantaran.', '下雨天在家？一起煮饭，只要外卖的零头。', '下雨天在家？一起煮飯，只要外賣的零頭。', '雨の日は家で一緒に料理。デリバリーのほんの一部で済む。'),
  },
  { // 10
    art: scene('home') + wei({ x: 124, face: 'laugh', pose: 'hold', item: 'bonus' }) + aina({ x: 210, face: 'surprised', flip: true }),
    lines: [
      L('wei', 'I got a bonus! RM800!', 'Aku dapat bonus! RM800!', '我拿到花红了！RM800！', '我拿到花紅了！RM800！', 'ボーナス出た！RM800！'),
      L('aina', 'Nice! What’s the plan?', 'Bagusnya! Apa rancangan kau?', '太好了！有什么计划？', '太好了！有什麼計劃？', 'やったね！どうするの？'),
      L('wei', 'Um… shopping?', 'Err… shopping?', '呃……购物？', '呃……購物？', 'えっと…買い物？'),
    ],
  },
  { // 11
    art: scene('home') + aina({ x: 118, face: 'happy', pose: 'hold', item: 'split' }) + wei({ x: 210, face: 'think', flip: true }) + duit({ x: 266, y: 190, pose: 'sleep', flip: true }),
    lines: [
      L('aina', 'Try this: save half first, some for family, the rest for fun.', 'Cuba ni: simpan separuh dulu, sikit untuk keluarga, selebihnya untuk seronok.', '试试这样：先存一半，一些给家人，剩下的拿去玩。', '試試這樣：先存一半，一些給家人，剩下的拿去玩。', 'こうしてみて。まず半分貯金、少し家族に、残りは楽しみに。'),
      L('wei', 'RM400 saved, RM150 for Mum, RM250 for fun. Deal.', 'RM400 simpan, RM150 untuk Mak, RM250 untuk seronok. Setuju.', '存RM400，给妈妈RM150，RM250拿去玩。成交。', '存RM400，給媽媽RM150，RM250拿去玩。成交。', 'RM400貯金、お母さんにRM150、楽しみにRM250。決まり。'),
    ],
    tip: T('Got a bonus? Save a portion first, then enjoy the rest guilt-free.', 'Dapat bonus? Simpan sebahagian dulu, kemudian nikmati selebihnya tanpa rasa bersalah.', '拿到花红？先存一部分，剩下的安心享受。', '拿到花紅？先存一部分，剩下的安心享受。', 'ボーナスが出たら、まず一部を貯金。残りは気兼ねなく楽しもう。'),
  },
  { // 12
    art: scene('home', { day: true }) + aina({ x: 118, face: 'think' }) + wei({ x: 210, face: 'happy', pose: 'hold', item: 'mug', flip: true }),
    lines: [
      L('aina', 'No bonus for me this year. The company had a tough year.', 'Tahun ni aku tak dapat bonus. Syarikat pun susah tahun ni.', '我今年没有花红。公司今年也不好过。', '我今年沒有花紅。公司今年也不好過。', '私は今年ボーナスなし。会社も大変な年だったから。'),
      L('wei', 'Then the teh is on me this week.', 'Kalau macam tu, teh minggu ni aku belanja.', '那这个星期的茶我请。', '那這個星期的茶我請。', 'じゃあ今週のお茶は私のおごり。'),
      L('aina', 'And the jar has my back.', 'Dan balang tu ada untuk aku.', '还好我有罐子撑着。', '還好我有罐子撐著。', 'それに、びんが支えてくれる。'),
    ],
  },
  { // 13
    art: scene('shop', { sign: SALE }) + wei({ x: 124, face: 'laugh', pose: 'hold', item: 'ricecooker' }) + aina({ x: 212, face: 'happy', flip: true }),
    lines: [
      L('wei', 'Rice cooker: on the list, and 25% off.', 'Periuk nasi: ada dalam senarai, dan 25% diskaun.', '电饭锅：在清单上，又打七五折。', '電飯鍋：在清單上，又打七五折。', '炊飯器。リストにあって、25%オフ。'),
      L('aina', 'That’s what a sale is for.', 'Itulah guna jualan murah.', '这才是促销的用处。', '這才是促銷的用處。', 'セールってこういうためにあるんだよ。'),
    ],
  },
  { // 14
    art: scene('park') + arjun({ x: 120, face: 'laugh', pose: 'hold', item: 'tin', is: 0.5 }) + raju({ x: 190, face: 'happy', flip: true, apron: NEW }) + aina({ x: 252, face: 'happy', flip: true }),
    lines: [
      L('arjun', 'Bicycle fund: RM61. Halfway there!', 'Tabung basikal: RM61. Dah separuh jalan!', '脚车基金：RM61。已经一半了！', '腳車基金：RM61。已經一半了！', '自転車資金、RM61。半分まで来た！'),
      L('raju', 'Halfway is the hardest part. You’re doing it.', 'Separuh jalan paling susah. Kamu berjaya.', '一半是最难的。你做到了。', '一半是最難的。你做到了。', '半分が一番大変なんだ。よくやってる。'),
    ],
  },
  { // 15
    art: scene('home') + aina({ x: 118, face: 'happy', pose: 'hold', item: 'mug' }) + wei({ x: 210, face: 'laugh', pose: 'hold', item: 'gift', flip: true }) + it('giftwrap', 166, 176, 0.6),
    lines: [
      L('aina', 'My gift: a mug and good coffee. RM28.', 'Hadiah aku: mug dan kopi sedap. RM28.', '我的礼物：马克杯和好咖啡。RM28。', '我的禮物：馬克杯和好咖啡。RM28。', '私のプレゼントはマグと美味しいコーヒー。RM28。'),
      L('wei', 'A little plant. RM30 on the dot.', 'Pokok kecil. Tepat RM30.', '一盆小植物。刚好RM30。', '一盆小植物。剛好RM30。', '小さな植物。ぴったりRM30。'),
    ],
  },
  { // 16
    art: scene('night') + it('xmaslights', 36, 124, 0.9) + it('xmaslights', 150, 106, 0.9) + it('xmaslights', 272, 118, 0.9) + aina({ x: 124, face: 'laugh' }) + wei({ x: 194, face: 'laugh', flip: true }),
    lines: [
      L('narrator', 'The neighbours’ Christmas lights: the best free show in town.', 'Lampu Krismas jiran-jiran: pertunjukan percuma terbaik di bandar.', '邻居家的圣诞灯饰：城里最好看的免费表演。', '鄰居家的聖誕燈飾：城裡最好看的免費表演。', 'ご近所のクリスマスの明かり。街で一番の無料ショー。'),
      L('wei', 'Looking is free. Wallets stay in bags.', 'Tengok percuma. Dompet duduk dalam beg.', '看不用钱。钱包留在包里。', '看不用錢。錢包留在包裡。', '見るのはタダ。財布はかばんの中。'),
    ],
  },
  { // 17
    art: scene('library') + arjun({ x: 110, face: 'laugh', pose: 'hold', item: 'books', is: 0.6 }) + aina({ x: 180, face: 'happy', flip: true }) + wei({ x: 238, face: 'laugh', flip: true }),
    lines: [
      L('arjun', 'Five more, please! I finished all of them.', 'Lima lagi! Saya dah habis baca semua.', '再借五本！我全部看完了。', '再借五本！我全部看完了。', 'あと5冊！全部読んだよ。'),
      L('wei', 'Ten books this holiday, and not a sen spent.', 'Sepuluh buku cuti ni, satu sen pun tak keluar.', '这个假期看了十本书，一分钱都没花。', '這個假期看了十本書，一分錢都沒花。', 'この休みで10冊、1セントも使わず。'),
    ],
  },
  { // 18
    art: scene('rain') + aina({ x: 118, face: 'laugh', pose: 'hold', item: 'boardgame' }) + wei({ x: 212, face: 'laugh', flip: true }) + duit({ x: 166, y: 190, face: 'happy' }),
    lines: [
      L('narrator', 'Another rainy Saturday. Board games, hot drinks, no plans.', 'Satu lagi Sabtu hujan. Permainan papan, air panas, tiada rancangan.', '又一个下雨的星期六。桌游、热饮，没有计划。', '又一個下雨的星期六。桌遊、熱飲，沒有計劃。', 'また雨の土曜日。ボードゲームと温かい飲み物、予定なし。'),
      L('wei', 'Duit keeps sitting on the board. Is that a move?', 'Duit asyik duduk atas papan. Itu langkah ke?', 'Duit一直坐在棋盘上。这算一步吗？', 'Duit一直坐在棋盤上。這算一步嗎？', 'ドゥイットがずっと盤に座ってる。それって一手？'),
    ],
  },
  { // 19
    art: scene('kitchen', { items: it('murukku', 60, 108, 0.5) }) + aina({ x: 124, face: 'laugh', pose: 'hold', item: 'press' }) + wei({ x: 210, face: 'laugh', pose: 'hold', item: 'cookies', flip: true }),
    lines: [
      L('aina', 'Grace said bring nothing. We’re bringing murukku anyway.', 'Grace kata tak payah bawa apa-apa. Kita bawa murukku juga.', 'Grace说什么都不用带。我们还是带murukku去。', 'Grace說什麼都不用帶。我們還是帶murukku去。', 'グレースは何もいらないって。でもムルックは持っていく。'),
      L('wei', 'And star cookies. We’re famous now.', 'Dan biskut bintang. Kita dah terkenal.', '还有星星饼干。我们现在出名了。', '還有星星餅乾。我們現在出名了。', 'それと星のクッキー。私たち、もう有名だから。'),
    ],
  },
  { // 20
    art: scene('xmas', { day: true }) + wei({ x: 116, face: 'laugh' }) + grace({ x: 196, face: 'happy', pose: 'hold', item: 'bauble', is: 0.4, flip: true }),
    lines: [
      L('grace', 'Same tree for ten years. The lights came from my mum in Sabah.', 'Pokok yang sama sepuluh tahun. Lampu ni dari mak aku di Sabah.', '这棵树用了十年。灯是我妈妈从沙巴寄来的。', '這棵樹用了十年。燈是我媽媽從沙巴寄來的。', 'このツリーは10年もの。電飾はサバの母から。'),
      L('wei', 'Vintage. Very fashionable.', 'Vintaj. Sangat bergaya.', '复古风，很时髦。', '復古風，很時髦。', 'ヴィンテージ。すごくおしゃれ。'),
    ],
  },
  { // 21
    art: scene('home') + wei({ x: 124, face: 'laugh', pose: 'hold', item: 'card' }) + aina({ x: 210, face: 'happy', flip: true }) + duit({ x: 266, y: 190, face: 'happy', flip: true }),
    lines: [
      L('wei', 'A handmade card for Grace. One hour, RM2.', 'Kad buatan tangan untuk Grace. Sejam, RM2.', '给Grace的手作卡片。一个小时，RM2。', '給Grace的手作卡片。一個小時，RM2。', 'グレースに手作りカード。1時間、RM2。'),
      L('aina', 'The best ones usually are.', 'Yang terbaik biasanya begitu.', '最好的往往都是这样。', '最好的往往都是這樣。', '一番いいものって、たいていそう。'),
    ],
    tip: T('A thoughtful gift can cost very little.', 'Hadiah yang penuh makna boleh jadi sangat murah.', '用心的礼物，花费可以很少。', '用心的禮物，花費可以很少。', '心のこもった贈り物は、ほとんどお金がかからないことも。'),
  },
  { // 22
    art: scene('kopitiam') + kamala({ x: 104, face: 'laugh', pose: 'hold', item: 'payasam' }) + raju({ x: 176, face: 'laugh', flip: true, apron: NEW }) + aina({ x: 238, face: 'happy', flip: true }),
    lines: [
      L('kamala', 'Grace invited us too! I’m bringing payasam.', 'Grace jemput kami juga! Aunty bawa payasam.', 'Grace也邀请了我们！我带甜奶粥去。', 'Grace也邀請了我們！我帶甜奶粥去。', 'グレースが私たちも招いてくれたの！パヤサムを持っていくわ。'),
      L('raju', 'And I’m bringing my appetite.', 'Uncle bawa perut kosong.', '我带我的胃口去。', '我帶我的胃口去。', 'わしは食欲を持っていく。'),
    ],
  },
  { // 23
    art: scene('rain') + aina({ x: 124, face: 'happy', pose: 'hold', item: 'books', is: 0.45 }) + duit({ x: 200, y: 190, pose: 'sleep' }),
    lines: [
      L('aina', 'Nothing spent today. Rain, a library book, leftover fried rice.', 'Hari ni tak belanja langsung. Hujan, buku perpustakaan, nasi goreng semalam.', '今天一分钱没花。下雨、图书馆的书、剩下的炒饭。', '今天一分錢沒花。下雨、圖書館的書、剩下的炒飯。', '今日は何も使わなかった。雨と図書館の本と、残りのチャーハン。'),
    ],
  },
  { // 24
    art: scene('xmas') + aina({ x: 110, face: 'happy', pose: 'point' }) + grace({ x: 184, face: 'laugh', pose: 'wave', flip: true }) + wei({ x: 232, face: 'happy', flip: true }),
    lines: [
      L('grace', 'Tomorrow the house will be full. Thank you for helping!', 'Esok rumah ni penuh. Terima kasih sebab tolong!', '明天家里会坐满人。谢谢你们来帮忙！', '明天家裡會坐滿人。謝謝你們來幫忙！', '明日は家がいっぱいになる。手伝ってくれてありがとう！'),
      L('aina', 'The star’s on. Now it’s Christmas.', 'Bintang dah dipasang. Baru rasa Krismas.', '星星挂上了。这才是圣诞节。', '星星掛上了。這才是聖誕節。', '星がついた。これでクリスマスだね。'),
    ],
  },
  { // 25: Christmas
    art: scene('xmas') + grace({ x: 44, face: 'laugh', pose: 'cheer' }) + wei({ x: 92, face: 'laugh', pose: 'hold', item: 'gift', is: 0.4 }) + kamala({ x: 140, face: 'happy', pose: 'hold', item: 'payasam', is: 0.4 })
      + raju({ x: 188, face: 'laugh', apron: NEW, flip: true }) + arjun({ x: 222, face: 'laugh', pose: 'hold', item: 'books', is: 0.45, flip: true }) + aina({ x: 256, face: 'laugh', flip: true }),
    lines: [
      L('grace', 'Merry Christmas, everyone! Food first, gifts after!', 'Selamat Hari Krismas, semua! Makan dulu, hadiah kemudian!', '大家圣诞快乐！先吃饭，再拆礼物！', '大家聖誕快樂！先吃飯，再拆禮物！', 'みんな、メリークリスマス！まずは食べて、プレゼントはそのあと！'),
      L('arjun', 'I got a book about bicycles!', 'Saya dapat buku pasal basikal!', '我拿到一本关于脚车的书！', '我拿到一本關於腳車的書！', '自転車の本をもらった！'),
      L('narrator', 'Twelve gifts, RM30 each, and nobody went home broke.', 'Dua belas hadiah, RM30 setiap satu, dan tiada siapa pulang pokai.', '十二份礼物，每份RM30，没有人荷包大失血。', '十二份禮物，每份RM30，沒有人荷包大失血。', 'プレゼントは12個、どれもRM30まで。誰も懐を痛めずに帰った。'),
    ],
  },
  { // 26
    art: scene('home', { day: true }) + aina({ x: 118, face: 'happy', pose: 'hold', item: 'yearchart' }) + wei({ x: 210, face: 'surprised', flip: true }) + duit({ x: 266, y: 190, face: 'happy', flip: true }),
    lines: [
      L('aina', 'Year in review: we’ve logged every day since October.', 'Imbas kembali tahun: kita catat setiap hari sejak Oktober.', '年度回顾：从十月到现在，我们每天都有记账。', '年度回顧：從十月到現在，我們每天都有記帳。', '今年のふりかえり。10月から毎日記録してきた。'),
      L('wei', 'Biggest category: food. Obviously.', 'Kategori paling besar: makanan. Mestilah.', '最大的类别：吃的。当然。', '最大的類別：吃的。當然。', '一番多いのは食費。当然だね。'),
      L('aina', 'And one habit that stuck: the cash envelope.', 'Dan satu tabiat yang kekal: sampul duit tunai.', '还有一个坚持下来的习惯：现金信封。', '還有一個堅持下來的習慣：現金信封。', '続いた習慣がひとつ。現金の封筒。'),
    ],
    tip: T('Look back at your year: where it went, and one habit that worked.', 'Imbas kembali tahun anda: ke mana duit pergi, dan satu tabiat yang berjaya.', '回顾这一年：钱去了哪里，还有一个有用的习惯。', '回顧這一年：錢去了哪裡，還有一個有用的習慣。', '一年をふりかえろう。お金の行き先と、うまくいった習慣をひとつ。'),
  },
  { // 27
    art: scene('home') + aina({ x: 118, face: 'happy', pose: 'hold', item: 'planner' }) + wei({ x: 212, face: 'laugh', pose: 'hold', item: 'list', flip: true }),
    lines: [
      L('aina', 'Next year, goal one: RM1,000 for emergencies.', 'Tahun depan, matlamat pertama: RM1,000 untuk kecemasan.', '明年的第一个目标：RM1,000紧急备用金。', '明年的第一個目標：RM1,000緊急備用金。', '来年の目標その1。緊急用にRM1,000。'),
      L('wei', 'Mine: lunch from home, three days a week.', 'Aku: bawa bekal tiga hari seminggu.', '我的：一个星期三天自己带午餐。', '我的：一個星期三天自己帶午餐。', '私は、週3日お弁当。'),
    ],
    tip: T('Pick one or two simple goals. Small ones stick.', 'Pilih satu atau dua matlamat mudah. Yang kecil lebih bertahan.', '定一两个简单的目标。小目标才坚持得住。', '定一兩個簡單的目標。小目標才堅持得住。', 'シンプルな目標を1つか2つ。小さい目標ほど続く。'),
  },
  { // 28 (a filler)
    art: scene('home', { day: true }) + aina({ x: 100, face: 'laugh' }) + it('jar', 160, 172, 0.7) + duit({ x: 190, y: 190, pose: 'sleep' }) + wei({ x: 244, face: 'laugh', flip: true }),
    lines: [
      L('narrator', 'Duit’s goal for next year: more naps. Very achievable.', 'Matlamat Duit tahun depan: lebih banyak tidur. Sangat boleh dicapai.', 'Duit明年的目标：多睡午觉。非常可行。', 'Duit明年的目標：多睡午覺。非常可行。', 'ドゥイットの来年の目標：もっと昼寝。とても現実的。'),
    ],
  },
  { // 29 (a filler)
    art: scene('kopitiam') + raju({ x: 96, face: 'laugh', pose: 'hold', item: 'teh', apron: NEW }) + wei({ x: 182, face: 'laugh', flip: true }) + aina({ x: 230, face: 'happy', flip: true }),
    lines: [
      L('raju', 'My goal every year: same teh, same price, same friends.', 'Matlamat uncle setiap tahun: teh sama, harga sama, kawan sama.', '我每年的目标：一样的茶，一样的价钱，一样的朋友。', '我每年的目標：一樣的茶，一樣的價錢，一樣的朋友。', 'わしの毎年の目標：同じお茶、同じ値段、同じ仲間。'),
      L('wei', 'Uncle, the price part is up to you.', 'Uncle, bab harga tu terpulang pada uncle.', '叔叔，价钱那部分你说了算。', '叔叔，價錢那部分你說了算。', 'おじさん、値段はおじさん次第でしょ。'),
    ],
  },
  { // 30 (a filler)
    art: scene('home') + wei({ x: 124, face: 'laugh', pose: 'hold', item: 'picnic' }) + aina({ x: 210, face: 'happy', pose: 'hold', item: 'jarfull', flip: true }) + duit({ x: 266, y: 190, face: 'surprised', flip: true }),
    lines: [
      L('wei', 'Rooftop at 11:30. Bring the jar.', 'Bumbung pukul 11:30. Bawa balang.', '11点半天台见。带上罐子。', '11點半天台見。帶上罐子。', '11時半に屋上ね。びんも持って。'),
      L('aina', 'And Duit. Duit hates missing a party.', 'Dan Duit. Duit tak suka terlepas parti.', '还有Duit。Duit最讨厌错过派对。', '還有Duit。Duit最討厭錯過派對。', 'ドゥイットもね。パーティーを逃すのが嫌いだから。'),
    ],
  },
  { // 31: New Year's Eve
    art: scene('rooftop') + aina({ x: 92, face: 'laugh', pose: 'hold', item: 'jarfull' }) + wei({ x: 150, face: 'laugh', pose: 'cheer' }) + grace({ x: 208, face: 'laugh', pose: 'wave', flip: true }) + duit({ x: 252, y: 190, face: 'laugh', flip: true }),
    lines: [
      L('wei', 'Three, two, one… Happy New Year!', 'Tiga, dua, satu… Selamat Tahun Baru!', '三、二、一……新年快乐！', '三、二、一……新年快樂！', '3、2、1…あけましておめでとう！'),
      L('aina', 'Same jar, new year. Let’s fill it again.', 'Balang sama, tahun baru. Jom isi lagi.', '同一个罐子，新的一年。再把它装满吧。', '同一個罐子，新的一年。再把它裝滿吧。', '同じびんで、新しい年。また満たそう。'),
      L('narrator', 'Fireworks, friends, a jar and a cat. A good year to start.', 'Bunga api, kawan-kawan, sebuah balang dan seekor kucing. Permulaan tahun yang baik.', '烟花、朋友、一个罐子和一只猫。好的一年，从这里开始。', '煙火、朋友、一個罐子和一隻貓。好的一年，從這裡開始。', '花火と友だちと、びんと猫。いい一年の始まり。'),
    ],
    tip: T('A new year starts with one small habit. You already have one.', 'Tahun baru bermula dengan satu tabiat kecil. Anda sudah ada satu.', '新的一年从一个小习惯开始。你已经有一个了。', '新的一年從一個小習慣開始。你已經有一個了。', '新しい年は小さな習慣ひとつから。あなたにはもうある。'),
  },
];

export default {
  id: '12',
  theme: T('Year end', 'Hujung tahun', '年终', '年終', '年の瀬'),
  colours: { dark: ['#121C1E', '#1A2629', '#243236'], light: ['#F3F1EA', '#FFFFFF', '#E6E2D6'], accent: '#2F6B55' },
  /** Speakers new this month (the engine's WHO covers the rest). */
  who: {
    kamala: T('Aunty Kamala', 'Mak Cik Kamala', 'Kamala 阿姨', 'Kamala 阿姨', 'カマラおばさん'),
    arjun: T('Arjun', 'Arjun', 'Arjun', 'Arjun', 'アルジュン'),
    grace: T('Grace', 'Grace', 'Grace', 'Grace', 'グレース'),
  },
  stickers: [
    stk('wreath', 'Wreath', 'Kalungan Krismas', '圣诞花环', '聖誕花環', 'クリスマスリース'),
    stk('giftexchange', 'Gift exchange', 'Tukar hadiah', '交换礼物', '交換禮物', 'プレゼント交換'),
    stk('salesign', 'Sale sign', 'Papan jualan', '促销牌', '促銷牌', 'セールの看板'),
    stk('hourglass', 'Hourglass', 'Jam pasir', '沙漏', '沙漏', '砂時計'),
    stk('kite', 'Kite', 'Layang-layang', '风筝', '風箏', '凧'),
    stk('picnic', 'Picnic basket', 'Bakul berkelah', '野餐篮', '野餐籃', 'ピクニックバスケット'),
    stk('books', 'Library books', 'Buku perpustakaan', '图书馆的书', '圖書館的書', '図書館の本'),
    stk('umbrella', 'Umbrella', 'Payung', '雨伞', '雨傘', '傘'),
    stk('friedrice', 'Fried rice', 'Nasi goreng', '炒饭', '炒飯', 'チャーハン'),
    stk('bonus', 'Bonus slip', 'Slip bonus', '花红单', '花紅單', 'ボーナス明細'),
    stk('bonusplan', 'Bonus plan', 'Pelan bonus', '花红分配', '花紅分配', 'ボーナスの配分', 'split'),
    stk('hotdrink', 'Hot drink', 'Minuman panas', '热饮', '熱飲', '温かい飲み物', 'mug'),
    stk('ricecooker', 'Rice cooker', 'Periuk nasi', '电饭锅', '電飯鍋', '炊飯器'),
    stk('bicycle', 'Bicycle fund', 'Tabung basikal', '脚车基金', '腳車基金', '自転車資金'),
    stk('giftwrap', 'Wrapping paper', 'Kertas pembalut', '包装纸', '包裝紙', '包装紙'),
    stk('xmaslights', 'Fairy lights', 'Lampu lip-lap', '圣诞灯串', '聖誕燈串', '電飾'),
    stk('librarycard', 'Library card', 'Kad perpustakaan', '借书证', '借書證', '図書カード'),
    stk('boardgame', 'Board game', 'Permainan papan', '桌游', '桌遊', 'ボードゲーム'),
    stk('cookies', 'Star cookies', 'Biskut bintang', '星星饼干', '星星餅乾', '星のクッキー'),
    stk('xmastree', 'Christmas tree', 'Pokok Krismas', '圣诞树', '聖誕樹', 'クリスマスツリー'),
    stk('card', 'Handmade card', 'Kad buatan tangan', '手作卡片', '手作卡片', '手作りカード'),
    stk('bauble', 'Bauble', 'Hiasan bola', '圣诞吊球', '聖誕吊球', 'オーナメント'),
    stk('raincloud', 'Monsoon rain', 'Hujan monsun', '季候雨', '季候雨', 'モンスーンの雨'),
    stk('xmasstar', 'Tree-top star', 'Bintang pokok', '树顶星星', '樹頂星星', 'ツリーの星'),
    stk('feast', 'Christmas feast', 'Jamuan Krismas', '圣诞大餐', '聖誕大餐', 'クリスマスのごちそう', 'roastchicken'),
    stk('yearchart', 'Year in review', 'Imbasan tahun', '年度回顾', '年度回顧', '一年のふりかえり'),
    stk('goal', 'New goals', 'Matlamat baru', '新目标', '新目標', '新しい目標'),
    stk('pillow', 'Nap time', 'Masa tidur', '午睡时间', '午睡時間', '昼寝タイム'),
    stk('planner', 'New planner', 'Perancang baru', '新计划本', '新計劃本', '新しい手帳'),
    stk('clock', 'Almost midnight', 'Hampir tengah malam', '快到午夜', '快到午夜', 'もうすぐ真夜中'),
    stk('fireworks', 'Fireworks', 'Bunga api', '烟花', '煙火', '花火'),
  ],
  panels: panels.map(p => ({ ...p, art: p.art + K.grain() })),
  defs: K.defs(),
};
