// Well-known shops in Malaysia: how a receipt prints them (logo text, outlet line or the company behind the brand)
// → the name people use. "HEXTAR LUCKIN M SDN BHD" is Luckin Coffee; "GERBANG ALAF RESTAURANTS" is McDonald's.
// Public brands only, matched loosely because OCR drops spaces and mixes up letters. Pure: no DOM.
// ponytail: a fixed list; a user's own corrections (review screen) cover every other shop.
export const BRANDS = [
  // Coffee, tea, desserts
  [/luckin/i, 'Luckin Coffee'], [/starbucks/i, 'Starbucks'], [/\bzus\s*coffee|\bzus\b/i, 'ZUS Coffee'],
  [/tea\s*live|loob holding/i, 'Tealive'], [/chatime/i, 'Chatime'], [/chagee|霸王茶姬/i, 'Chagee'], [/cha\s*tra\s*mue|great\s*white\s*pelican/i, 'ChaTraMue'],
  [/gong\s*cha/i, 'Gong Cha'], [/baker'?s\s*cottage/i, "Baker's Cottage"], [/dunkin|golden\s*donuts/i, "Dunkin'"], [/jollibee/i, 'Jollibee'], [/mixue|蜜雪/i, 'Mixue'],
  [/coffee\s*bean/i, 'The Coffee Bean & Tea Leaf'], [/tim\s*hortons/i, 'Tim Hortons'], [/gigi\s*coffee/i, 'Gigi Coffee'],
  [/kenangan\s*coffee|kopi\s*kenangan/i, 'Kopi Kenangan'], [/old\s*town\s*white|oldtown/i, 'OldTown White Coffee'], [/secret\s*recipe/i, 'Secret Recipe'],
  [/llao\s*llao/i, 'llaollao'], [/baskin/i, 'Baskin-Robbins'], [/inside\s*scoop/i, 'Inside Scoop'], [/daily\s*fresh/i, 'Daily Fresh'],
  [/tiger\s*sugar/i, 'Tiger Sugar'], [/xing\s*fu\s*tang/i, 'Xing Fu Tang'], [/family\s*mart|ql maxincome/i, 'FamilyMart'],
  [/bask\s*bear/i, 'Bask Bear Coffee'], [/kopi\s*saigon/i, 'Kopi Saigon'], [/hwc\s*coffee/i, 'HWC Coffee'], [/beutea/i, 'Beutea'],
  // Fast food and restaurants
  [/mc\s*donald|gerbang\s*alaf|\bmcd\b|mcdelivery/i, "McDonald's"], [/\bkfc\b|kentucky fried/i, 'KFC'], [/texas\s*chick/i, 'Texas Chicken'],
  [/marry\s*brown/i, 'Marrybrown'], [/pizza\s*hut/i, 'Pizza Hut'], [/domino'?s|dommal/i, "Domino's"], [/\bsubway\b|belle\s*vue\s*food/i, 'Subway'], [/\bkgb\b|killer\s*gourmet/i, 'KGB'], [/sushi\s*zanmai/i, 'Sushi Zanmai'],
  [/burger\s*king/i, 'Burger King'], [/\ba\s*&\s*w\b/i, 'A&W'], [/taco\s*bell/i, 'Taco Bell'], [/nando'?s/i, "Nando's"],
  [/kenny\s*rogers|berjaya roasters/i, 'Kenny Rogers Roasters'], [/sushi\s*king/i, 'Sushi King'], [/sushi\s*mentai/i, 'Sushi Mentai'],
  [/sukiya/i, 'Sukiya'], [/yoshinoya/i, 'Yoshinoya'], [/genki\s*sushi/i, 'Genki Sushi'], [/morgan\s*f[il]e?[il]d/i, "Morganfield's"],
  [/tuk\s*tuk/i, 'Mr Tuk Tuk'], [/4\s*fingers/i, '4Fingers'], [/kyochon/i, 'Kyochon'], [/shihlin/i, 'Shihlin Taiwan Street Snacks'],
  [/chicken\s*rice\s*shop/i, 'The Chicken Rice Shop'], [/nasi\s*kandar\s*pelita/i, 'Nasi Kandar Pelita'], [/dubuyo/i, 'Dubuyo'],
  [/din\s*tai\s*fung/i, 'Din Tai Fung'], [/haidilao|海底捞/i, 'Haidilao'], [/tony\s*roma/i, "Tony Roma's"], [/wendy'?s/i, "Wendy's"],
  [/popeyes/i, 'Popeyes'], [/grab\s*food/i, 'GrabFood'], [/\byour grab e-?receipt\b|^grab\s*(car|taxi|bike|express|mart)\b/i, 'Grab'], [/food\s*panda/i, 'foodpanda'], [/shopee\s*food/i, 'ShopeeFood'],
  // Groceries and convenience
  [/99\s*speed\s*[mh]art|\bspeed\s*mart/i, '99 Speedmart'], [/lotus'?s|ek-chor/i, "Lotus's"], [/\btesco\b/i, 'Tesco'], [/aeon\s*big/i, 'AEON BiG'],
  [/\baeon\b/i, 'AEON'], [/\bgiant\b|gch\s*retail/i, 'Giant'], [/\bmydin\b/i, 'Mydin'], [/jaya\s*grocer/i, 'Jaya Grocer'],
  [/village\s*grocer/i, 'Village Grocer'], [/\bnsk\s*(trade|grocer)/i, 'NSK'], [/econsave/i, 'Econsave'], [/hero\s*market/i, 'HeroMarket'],
  [/7\s*-?\s*eleven|seven\s*eleven/i, '7-Eleven'], [/\bmy\s*news\b|mynews/i, 'myNEWS'], [/\bkk\s*super\s*mart/i, 'KK Super Mart'],
  [/\bcu\s*(mart|again)\b|mycu\s*retai|^cu\s*[-–]\s/i, 'CU'], [/emart\s*24/i, 'emart24'], [/cold\s*storage/i, 'Cold Storage'],
  [/ben'?s\s*independent/i, "Ben's Independent Grocer"],
  // Health, beauty, household, shopping
  [/watson/i, 'Watsons'], [/guardian/i, 'Guardian'], [/\bcaring\b/i, 'Caring Pharmacy'], [/big\s*pharmacy/i, 'BIG Pharmacy'],
  [/alpro\s*pharm/i, 'Alpro Pharmacy'], [/aa\s*pharmacy/i, 'AA Pharmacy'], [/sephora/i, 'Sephora'],
  [/mr\.?\s*d\.?\s*i\.?\s*y|mrdiy/i, 'Mr DIY'], [/daiso/i, 'Daiso'], [/\bikea\b|ikano\s*handel/i, 'IKEA'], [/jalan\s*jalan\s*japan/i, 'Jalan Jalan Japan'], [/nitori/i, 'Nitori'],
  [/bath\s*&?\s*body\s*works/i, 'Bath & Body Works'], [/don\s*don\s*donki|\bdonki\b/i, 'Don Don Donki'], [/eco\s*-?\s*shop/i, 'Eco-Shop'],
  [/kaison/i, 'Kaison'], [/mr\.?\s*toy/i, 'Mr Toy'], [/\bmuji\b/i, 'MUJI'], [/miniso/i, 'MINISO'], [/uniqlo/i, 'Uniqlo'],
  [/\bh\s*&\s*m\b/i, 'H&M'], [/padini/i, 'Padini'], [/brands\s*outlet/i, 'Brands Outlet'], [/cotton\s*on\b/i, 'Cotton On'],
  [/decathlon/i, 'Decathlon'], [/popular\s*book/i, 'Popular'], [/senheng/i, 'Senheng'], [/harvey\s*norman/i, 'Harvey Norman'],
  [/eyeslab/i, 'Eyeslab'], [/owndays/i, 'OWNDAYS'],
  // Fuel and transport
  [/petronas/i, 'Petronas'], [/\bshell\b/i, 'Shell'], [/\bpetron\b/i, 'Petron'], [/caltex/i, 'Caltex'], [/bh\s*petrol/i, 'BHPetrol'],
  [/touch\s*'?n\s*go/i, "Touch 'n Go"], [/rapid\s*kl|prasarana/i, 'Rapid KL'], [/air\s*asia/i, 'AirAsia'],
  // Online and services
  [/shopee/i, 'Shopee'], [/carousell/i, 'Carousell'], [/lazada/i, 'Lazada'], [/airbnb/i, 'Airbnb'], [/golden\s*screen|\bgsc\b/i, 'GSC'], [/\btgv\b/i, 'TGV Cinemas'],
  [/\bunifi\b/i, 'Unifi'], [/\bmaxis\b/i, 'Maxis'], [/celcom|\bdigi\b/i, 'CelcomDigi'], [/u\s*mobile/i, 'U Mobile'],
  [/tenaga\s*nasional/i, 'TNB'], [/indah\s*water/i, 'Indah Water'], [/air\s*selangor/i, 'Air Selangor'],
];

/** The brand a receipt's top lines name, or null. Earlier lines win; each line is tried against the whole list. */
export function brandOf(lines, max = 10) {
  for (const l of lines.slice(0, max)) { const hit = BRANDS.find(([re]) => re.test(l)); if (hit) return hit[1]; }
  return null;
}
