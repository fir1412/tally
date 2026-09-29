// Builds js/i18n/zh-Hant.js (Traditional Chinese, Taiwan / Hong Kong usage) from js/i18n/zh.js: character by character,
// then the words Traditional readers use (設定, 預設, 資料, 螢幕…). Run: node tests/fixtures/make-hant.mjs
// ponytail: a character table for the characters Tally's text uses, not a full OpenCC; a new string with a new character
// shows it in Simplified until it is added here (tests/i18n.test.mjs lists any string left untranslated).
import { readFileSync, writeFileSync } from 'node:fs';

const PAIRS = '续續飞飛发發验驗态態权權专專员員静靜询詢愿願宽寬盐鹽适適岁歲监監征徵简簡体體测測请請对對无無称稱张張据據连連码碼纹紋锁鎖别別机機里裡内內记記账帳数數财財习習惯慣认認关關闭閉开開决決计計亲親录錄笔筆点點没沒钱錢导導动動单單这這奖獎励勵会會户戶细細类類遗遺项項历歷让讓费費标標几幾周週时時间間后後并並务務设設钮鈕扫掃个個经經过過应應带帶来來占佔额額将將备備余餘与與显顯银銀长長从從预預现現选選择擇颜顏确確复複该該击擊链鏈为為贴貼读讀储儲满滿当當删刪学學饮飲弃棄载載电電绍紹获獲编編辑輯还還调調输輸娱娛乐樂护護负負谁誰给給准準识識约約离離线線杂雜货貨医醫疗療隐隱随隨页頁迁遷总總检檢黄黃达達语語组組么麼继繼两兩边邊荐薦贷貸册冊广廣踪蹤买買够夠样樣结結换換筛篩试試帮幫旧舊断斷须須暂暫东東归歸价價浏瀏览覽签簽丢丟钟鐘话話忧憂资資侣侶传傳购購错錯吗嗎头頭启啟拥擁邮郵较較万萬摄攝着著摊攤统統销銷范範围圍装裝转轉欢歡规規则則们們条條损損坏壞涨漲证證号號图圖误誤舍捨税稅于於问問题題议議联聯馈饋变變报報谢謝写寫网網马馬亚亞势勢终終属屬颠顛夹夾赖賴产產净淨鱼魚进進独獨补補响響温溫触觸频頻腾騰尝嘗栏欄纸紙缘緣浅淺挡擋闪閃灯燈阴陰轻輕倾傾办辦顶頂画畫抚撫尽盡稳穩热熱节節压壓创創库庫处處络絡许許观觀紧緊凑湊义義败敗订訂阅閱书書脑腦儿兒园園卖賣车車弹彈减減运運篮籃课課况況实實强強圆圓环環顾顧顺順说說币幣种種亿億蓝藍绿綠红紅兑兌际際汇匯宠寵业業忆憶铺鋪刚剛鲜鮮艳豔云雲盘盤构構诉訴献獻斋齋浆漿饭飯饼餅莲蓮风風筝箏兰蘭欧歐';
const MAP = new Map(); for (let i = 0; i < PAIRS.length; i += 2) MAP.set(PAIRS[i], PAIRS[i + 1]);
// After the characters: words that differ between the two (and characters that depend on the word).
const WORDS = [['複制', '複製'], ['制作', '製作'], ['恢複', '恢復'], ['回複', '回復'], ['答複', '答覆'], ['聯系', '聯繫'], ['面包', '麵包'], ['面粉', '麵粉'],
  ['面條', '麵條'], ['炒面', '炒麵'], ['饼干', '餅乾'], ['餅干', '餅乾'], ['干淨', '乾淨'], ['日歷', '日曆'], ['公裡', '公里'], ['粘貼', '貼上'], ['設置', '設定'],
  ['默認', '預設'], ['數據', '資料'], ['網絡', '網路'], ['屏幕', '螢幕'], ['鏈接', '連結'], ['搜索', '搜尋'], ['保存', '儲存'], ['信息', '訊息'], ['文件', '檔案'],
  ['菜單', '選單'], ['用戶', '使用者'], ['視頻', '影片'], ['軟件', '軟體'], ['打印', '列印'], ['反饋', '意見回饋'], ['源代碼', '原始碼'], ['哈希', '雜湊']];

const src = readFileSync(new URL('../../js/i18n/zh.js', import.meta.url), 'utf8');
const conv = s => { let out = [...s].map(ch => MAP.get(ch) || ch).join(''); for (const [a, b] of WORDS) out = out.split(a).join(b); return out; };
const dict = (await import(new URL('../../js/i18n/zh.js', import.meta.url))).default;
const lines = Object.entries(dict).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(conv(v))},`);
writeFileSync(new URL('../../js/i18n/zh-Hant.js', import.meta.url), `// 繁體中文 (Traditional Chinese). Made from zh.js by tests/fixtures/make-hant.mjs; edit zh.js, then run it again.\nexport default {\n${lines.join('\n')}\n};\n`);
console.log(`${lines.length} strings; ${[...new Set([...src].filter(c => /[一-鿿]/.test(c) && !MAP.has(c)))].length} characters kept as they are`);
