// Build js/shops.js: Malaysian chains and repeat shop names from OpenStreetMap (ODbL), with Tally's category for each.
// curl -A tally -o my.tsv --data-urlencode data@tools/shops-query.overpassql https://overpass.kumi.systems/api/interpreter
// node tools/shops-build.mjs my.tsv
// Keeps every brand-tagged name and any plain name seen at 2+ places; drops generic names ("Restoran", "Kedai Runcit")
// and malls (a mall in the address line is not the shop).
import { readFileSync, writeFileSync } from 'node:fs';
const src = process.argv[2] || 'D:/tally-shops/my.tsv';
const CAT = {   // OSM value → Tally category; anything else is kept as a name without a category ('-')
  groceries: 'supermarket convenience grocery greengrocer butcher seafood deli frozen_food general wholesale marketplace beverages dairy farm health_food spices tea coffee',
  dining: 'restaurant fast_food cafe food_court bar pub ice_cream bakery pastry confectionery bubble_tea chocolate',
  transport: 'fuel car_wash charging_station car_repair car_parts tyres motorcycle motorcycle_repair car',
  health: 'pharmacy chemist clinic doctors dentist hospital optician medical_supply hearing_aids',
  personal: 'beauty cosmetics hairdresser perfumery massage tattoo',
  household: 'hardware doityourself houseware furniture variety_store kitchen bed interior_decoration garden_centre trade paint electrical lighting laundry dry_cleaning bathroom_furnishing curtain flooring',
  electronics: 'electronics mobile_phone computer appliance hifi camera',
  shopping: 'clothes shoes department_store fashion_accessories jewelry bag sports boutique gift watches outdoor second_hand fabric tailor',
  kids: 'toys baby_goods childcare',
  education: 'books stationery school college university kindergarten',
  fun: 'cinema fitness_centre sports_centre bowling_alley amusement_arcade water_park theme_park zoo aquarium museum games video_games music musical_instrument',
};
const CODE = { groceries: 'g', dining: 'd', transport: 't', health: 'h', personal: 'p', household: 'o', electronics: 'e', shopping: 's', kids: 'k', education: 'u', fun: 'f' };
const catOf = new Map(Object.entries(CAT).flatMap(([c, vs]) => vs.split(' ').map(v => [v, c])));
const SKIP = new Set(['mall', 'bank', 'parking', 'vending_machine', 'vacant', 'yes']);
const GENERIC = new Set(('restoran restaurant rest kedai makan runcit warung gerai cafe kafe klinik clinic farmasi pharmacy mini market pasar mart ' +
  'supermarket hotel bengkel workshop shop store food court kopitiam stall mamak nasi lemak bakery dobi laundry salon barber gunting rambut tayar sdn bhd ' +
  'enterprise trading the and dan cawangan branch tomyam tom yam mee roti canai kopi coffee station petrol minyak car wash cuci kereta motor motosikal ' +
  'hospital pusat perubatan dental dr doktor medical centre center plaza kompleks complex sekolah kebangsaan jenis sk sjk smk tadika taman asuhan ' +
  'masjid surau hardware electrical elektrik aircond handphone phone mobile repair service services spa beauty butik boutique pakaian cloth clothing ' +
  'hair frozen fresh sayur buah ikan ayam daging seafood kitchen dapur western cina chinese india indian thai kandar penyet ' +
  'duty free korean japanese bbq grill steamboat burger express corner house point star food cafe bistro station').split(' '));
const compact = s => s.toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
const words = s => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const count = new Map();   // key → {names: Map(name → n), cats: Map(cat → n), brand, n}
for (const line of readFileSync(src, 'utf8').split('\n')) {
  const [brand, name, nameEn, shop, amenity, hc, leisure, tourism] = line.split('\t').map(s => (s || '').trim());
  const kind = shop || amenity || leisure || tourism || hc;
  if (SKIP.has(kind)) continue;
  const n = brand || name || nameEn;
  if (!n || n.length > 40 || /[<>|\n"\\]/.test(n)) continue;
  const k = compact(n);
  if (k.length < 5 || /^\d+$/.test(k)) continue;
  if (words(n).every(w => GENERIC.has(w) || /^\d+$/.test(w))) continue;   // "Kedai Runcit", "Restoran 88"
  const e = count.get(k) || count.set(k, { names: new Map(), cats: new Map(), brand: false, n: 0 }).get(k);
  e.n++; e.brand ||= !!brand;
  e.names.set(n, (e.names.get(n) || 0) + 1);
  const c = catOf.get(kind); if (c) e.cats.set(c, (e.cats.get(c) || 0) + 1);
}
const top = m => [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
// One-word names only when they are a brand: "Burger", "Express" are words.
const out = [...count].filter(([k, e]) => (e.brand || e.n >= 2) && (words(top(e.names)).length > 1 || (e.brand && k.length >= 6))).sort((a, b) => b[1].n - a[1].n)
  .map(([, e]) => `${top(e.names)}|${CODE[top(e.cats)] || '-'}`);
// The companies behind brands, as receipts print them ("Trendcell Sdn Bhd" is Jaya Grocer): name|code|brand. From
// D:/tally-data/products/operators.tsv (OSM operator tags, ODbL, and Wikidata, CC0). Holding companies and the pairs
// that point a company at a sister brand are left out.
const ops = process.argv[3] || 'D:/tally-data/products/operators.tsv';
const SKIP_OP = /\b(group|holdings?|plantations|axiata|ytl|drb|usaha tegas|lion|gch retail|aeon co|mr\.? ?d\.?i\.?y|eco-shop|gerbang alaf)\b/i;
const codeOf = new Map(out.map(l => l.split('|')).map(([n, c]) => [compact(n), c]));
const legal = s => s.replace(/\(\s*(m|malaysia)\s*\)|\b(sdn\.?|sendirian|berhad|bhd\.?|enterprise|trading|marketing)\b/gi, ' ').replace(/\s+/g, ' ').trim();
let aliases = 0;
try {
  const [head, ...rows] = readFileSync(ops, 'utf8').trim().split('\n').map(l => l.split('\t'));
  const col = n => head.indexOf(n);
  for (const r of rows) {
    const name = legal(r[col('operator_or_legal_name')]), brand = r[col('brand')];
    if (r[col('new_vs_app')] !== '1' || SKIP_OP.test(r[col('operator_or_legal_name')]) || !brand || /[|"\\]/.test(name + brand)) continue;
    if (/bank|insur|takaful|financ|credit|capital|securit|assurance|invest/i.test(name + ' ' + brand)) continue;   // a card slip prints the bank above the shop: never the shop
    if (compact(name).length < 6 || (words(name).length < 2 && compact(name).length < 8) || codeOf.has(compact(name))) continue;   // short or one-word: too easily a word
    out.push(`${name}|${codeOf.get(compact(brand)) || '-'}|${brand}`); codeOf.set(compact(name), '-'); aliases++;
  }
} catch { console.log('no operators file: skipped'); }
const body = `// Malaysian chains and shop names seen at 2+ places, with their category: ${out.length} names from OpenStreetMap
// (© OpenStreetMap contributors, ODbL: https://www.openstreetmap.org/copyright). Built by tools/shops-build.mjs; don't edit.
// Each line: name|category code (g groceries, d dining, t transport, h health, p personal, o household, e electronics,
// s shopping, k kids, u education, f fun, - unknown)[|the brand it is, for a company name]. Company names: OSM and Wikidata (CC0).
export default ${JSON.stringify(out.join('\n'))};
`;
writeFileSync(new URL('../js/shops.js', import.meta.url), body);
console.log(out.length, 'names,', (body.length / 1024).toFixed(0), 'KB; brands', [...count.values()].filter(e => e.brand).length, '; company aliases', aliases);
console.log(out.slice(0, 60).join('  '));
