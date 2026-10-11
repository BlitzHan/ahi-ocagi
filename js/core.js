'use strict';
/* Ahi Ocağı — oyun verisi, durum, kayıt, eşya/yoldaş üretimi, savaş mantığı ve çevrimdışı ilerleme. Görsel yok. */

// ---------- Olay yolu ----------
const Bus = {
  h: {},
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); },
  emit(e, d) { (this.h[e] || []).forEach((f) => f(d)); },
};

// ---------- Veri ----------
const SLOTS = [
  { id: 'weapon',   name: 'Silah',  main: 'atk', w: 1.0, bases: ['Yatağan', 'Pala', 'Kılıç', 'Gaddare', 'Şimşir'] },
  { id: 'helmet',   name: 'Başlık', main: 'hp',  w: 0.8, bases: ['Tolga', 'Miğfer', 'Börk', 'Kavuk'] },
  { id: 'armor',    name: 'Zırh',   main: 'hp',  w: 1.2, bases: ['Zırh Gömlek', 'Kaftan', 'Cebe', 'Çukal'] },
  { id: 'gloves',   name: 'Kolçak', main: 'atk', w: 0.5, bases: ['Kolçak', 'Bazubent', 'Eldiven'] },
  { id: 'necklace', name: 'Muska',  main: 'hp',  w: 0.7, bases: ['Muska', 'Nazarlık', 'Gerdanlık'] },
  { id: 'ring',     name: 'Yüzük',  main: 'atk', w: 0.5, bases: ['Zihgir', 'Mühür Yüzüğü', 'Yüzük'] },
  { id: 'boots',    name: 'Çizme',  main: 'hp',  w: 0.7, bases: ['Çizme', 'Mest', 'Edik'] },
  { id: 'belt',     name: 'Kuşak',  main: 'hp',  w: 0.6, bases: ['Kuşak', 'Silahlık', 'Kemer'] },
];
const SLOT_BY_ID = Object.fromEntries(SLOTS.map((s) => [s.id, s]));
const RARITIES = [
  { name: 'Sade',     color: '#b7c0cc', dark: '#5d6673', mult: 1.0, subs: 0 },
  { name: 'Nakışlı',  color: '#3fa9ff', dark: '#1a4f9c', mult: 1.6, subs: 1 },
  { name: 'Murassa',  color: '#b66bff', dark: '#5a2399', mult: 2.5, subs: 2 },
  { name: 'Efsanevi', color: '#ffb52e', dark: '#a35a00', mult: 3.9, subs: 3 },
  { name: 'Destansı', color: '#ff4466', dark: '#8f0f2c', mult: 6.0, subs: 3 },
  { name: 'Ezelî',    color: '#32f5c8', dark: '#0b7a66', mult: 9.5, subs: 4 },
];
// Ek özellikler. "rare": yalnızca bu nadirlik ve üstünde çıkar.
const SUBSTATS = {
  critChance: { name: 'Kritik Şansı',  min: 2,   max: 6,   unit: '%' },
  critDmg:    { name: 'Kritik Hasarı', min: 8,   max: 25,  unit: '%' },
  atkSpeed:   { name: 'Saldırı Hızı',  min: 3,   max: 10,  unit: '%' },
  lifesteal:  { name: 'Can Çalma',     min: 1,   max: 4,   unit: '%' },
  dodge:      { name: 'Kaçınma',       min: 1,   max: 4,   unit: '%' },
  regen:      { name: 'Can Yenileme',  min: 0.3, max: 1.2, unit: '%/sn' },
  dmgPct:     { name: 'Hasar',         min: 4,   max: 12,  unit: '%' },
  hpPct:      { name: 'Can',           min: 4,   max: 12,  unit: '%' },
  goldPct:    { name: 'Ganimet',       min: 5,   max: 15,  unit: '%' },
  bossDmg:    { name: 'Boss Hasarı',   min: 6,   max: 18,  unit: '%', rare: 1 },
  doubleHit:  { name: 'Çift Vuruş',    min: 2,   max: 6,   unit: '%', rare: 2 },
  thorns:     { name: 'Diken',         min: 6,   max: 16,  unit: '%', rare: 2 },
};
const CAPS = { critChance: 75, dodge: 40, lifesteal: 30, atkSpeed: 200, doubleHit: 50, thorns: 150 };

// Bölgeler: her 10 aşamada bir değişir, 5 bölgede döner.
const THEMES = [
  { name: 'Söğüt Ovası', sky: ['#5fb4ef', '#d6f0ff'], fog: '#c4e6f8', ground: '#6cbf4f', path: '#d9b47a', tree: 'round', leaf: '#3f9a3c', trunk: '#7a5232', rock: '#9aa0a8', flowers: '#e8233a', props: 'tent',
    enemies: [{ kind: 'bandit', color: '#c9925a', name: 'Eşkıya' }, { kind: 'wolf', color: '#8a8f99', name: 'Kurt' }], boss: { kind: 'bandit', color: '#b07a4a', name: 'Eşkıya Reisi' } },
  { name: 'Bozkır', sky: ['#f29a52', '#ffe2ae'], fog: '#f6d29c', ground: '#e0b46a', path: '#c48a4a', tree: 'shrub', leaf: '#8a8f4a', trunk: '#6a5232', rock: '#b9825a', flowers: '#f2d24a', props: 'ruin',
    enemies: [{ kind: 'ghoul', color: '#7a7a6a', name: 'Gulyabani' }, { kind: 'wisp', color: '#ff9a2a', name: 'Çöl Cini' }], boss: { kind: 'ghoul', color: '#5a5a4a', name: 'Ulu Gulyabani' } },
  { name: 'Kaçkar Yaylası', sky: ['#7aa6d6', '#eef6ff'], fog: '#dce9f7', ground: '#eef4fb', path: '#b8c8dc', tree: 'pine', leaf: '#2f6f5a', trunk: '#5a4030', rock: '#a9b9cc', flowers: null, props: 'kumbet',
    enemies: [{ kind: 'furry', color: '#5a4030', name: 'Karakoncolos' }, { kind: 'golem', color: '#6f8aa8', name: 'Taş Dev' }], boss: { kind: 'cyclops', color: '#c9a27a', name: 'Tepegöz' } },
  { name: 'Ateş Vadisi', sky: ['#3a1018', '#c2452a'], fog: '#6a2a20', ground: '#3a2a2a', path: '#5a3a30', tree: 'dead', leaf: '#ff6a2a', trunk: '#2a1a1a', rock: '#4a3a3a', flowers: null, props: 'ruin',
    enemies: [{ kind: 'ifrit', color: '#e2463a', name: 'İfrit' }, { kind: 'golem', color: '#5a4040', name: 'Lav Devi' }], boss: { kind: 'ifrit', color: '#b8141e', name: 'Kara İfrit' } },
  { name: 'Kaf Dağı', sky: ['#1c1838', '#6a4f9a'], fog: '#3d3364', ground: '#3a4a3a', path: '#4a4058', tree: 'pine', leaf: '#3a2f5a', trunk: '#2a2030', rock: '#5a5470', flowers: '#b46aff', props: 'kumbet',
    enemies: [{ kind: 'albasti', color: '#d8e0d0', name: 'Albastı' }, { kind: 'wisp', color: '#a86aff', name: 'Cin' }], boss: { kind: 'div', color: '#7a6a9a', name: 'Div' } },
];

// Yoldaşlar (pet)
const PETS = [
  { id: 'kedi',   name: 'Van Kedisi',       r: 0, kind: 'cat',    color: '#f4f1ea', bonus: 'dodge',      base: 3 },
  { id: 'tilki',  name: 'Kızıl Tilki',      r: 1, kind: 'fox',    color: '#e8762a', bonus: 'goldPct',    base: 12 },
  { id: 'kurt',   name: 'Kurt Yavrusu',     r: 1, kind: 'wolf',   color: '#9aa0aa', bonus: 'critChance', base: 4 },
  { id: 'kaplum', name: 'Bilge Kaplumbağa', r: 2, kind: 'turtle', color: '#5aa04a', bonus: 'hpPct',      base: 14 },
  { id: 'dogan',  name: 'Doğan',            r: 2, kind: 'bird',   color: '#9a6a3a', bonus: 'atkSpeed',   base: 10 },
  { id: 'ejder',  name: 'Yavru Ejder',      r: 3, kind: 'dragon', color: '#3ac46a', bonus: 'dmgPct',     base: 16 },
  { id: 'anka',   name: 'Zümrüd-ü Anka',    r: 4, kind: 'phoenix', color: '#1fbf7a', bonus: 'lifesteal', base: 5 },
  { id: 'gokboru', name: 'Gökbörü',         r: 5, kind: 'spirit', color: '#7ad8ff', bonus: 'doubleHit',  base: 8 },
];
const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));
const PET_DMG = [0.2, 0.28, 0.38, 0.5, 0.65, 0.85];   // kahraman hasarının yüzdesi
const PET_INTERVAL = 2.2;
const PET_MAX_LVL = 20;
const HATCH_SEC = [60, 180, 420, 900, 1800, 3600];
const EGG_INV_MAX = 12;
const INCUBATORS = 2;

const HAMMER_REGEN_SEC = 45;
const HAMMER_REGEN_CAP = 40;
const HAMMER_DROP_CHANCE = 0.12;
const FIRST_CLEAR_HAMMERS = 3;
const FIRST_BOSS_HAMMERS = 12;
const ENEMIES_PER_STAGE = 5;
const BOSS_TIME = 30;
const MAX_FORGE = 30;
const OFFLINE_EFF = 0.8;
const OFFLINE_CAP_SEC = 12 * 3600;
const SAVE_KEY = 'ahiOcagi.v1';
const OLD_SAVE_KEY = 'forgeMasterWeb.v2';

// ---------- Yardımcılar ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const upper = (s) => s.toLocaleUpperCase('tr-TR');
function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const u = ['', 'K', 'M', 'B', 'T', 'Q'];
  let i = 0, v = n;
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + u[i];
}
const fmtSub = (k, v) => `+${v.toFixed(v < 10 ? 1 : 0)}${SUBSTATS[k].unit}`;
function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h) return `${h}sa ${m}dk`;
  return m ? `${m}dk ${s % 60}sn` : `${s}sn`;
}
const themeOf = (stage) => THEMES[Math.floor(stage / 10) % THEMES.length];
const ROMAN = ['', '', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
const themeName = (stage) => { const cyc = Math.floor(stage / (10 * THEMES.length)) + 1; return themeOf(stage).name + (cyc < ROMAN.length ? ROMAN[cyc] : ' ' + cyc); };
const isBossStage = (g) => g % 10 === 9;
const stageLabel = (g) => `${Math.floor(g / 10) + 1}-${(g % 10) + 1}`;
const itemName = (it) => `${RARITIES[it.r].name} ${it.base || SLOT_BY_ID[it.slot].bases[0]}`;

// ---------- Durum ----------
let S = defaultState();
function defaultState() {
  return {
    gold: 60, hammers: 30, hammerAcc: 0, clearedMax: -1,
    forgeLevel: 1, forgeUpgradeEnd: 0,
    stage: 0, maxStage: 0, autoAdvance: true,
    equipped: {},
    auto: false, autoKeepRarity: 4, autoEquip: true,   // autoKeepRarity 6 = hiç durma
    muted: false,
    lastSeen: Date.now(), totalForged: 0, bestRarity: 0, totalKills: 0,
    pets: {},            // id -> { lvl }
    activePet: null,
    eggs: [],            // [{ r }]
    incub: [],           // [{ r, end }]
    eggsBought: 0, eggDay: '',
    autoRetry: true, stuckPower: 0, pending: null, hiddenAt: 0,
    berat: 0, beratCount: 0,
  };
}
const today = () => new Date().toISOString().slice(0, 10);
function save() {
  S.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* depolama yok */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY);
    if (raw) S = Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { /* bozuk kayıt: yeni oyun */ }
  if (S.clearedMax < S.maxStage - 1) S.clearedMax = S.maxStage - 1;
  for (const id in S.equipped) { const it = S.equipped[id]; if (it && !it.base) it.base = SLOT_BY_ID[it.slot].bases[0]; }
}

// ---------- Usta Kalfa (otomatik dövme) ----------
// Bir eşya döver ve ne yapılacağına karar verir: 'equip' (daha güçlü, kuşanıldı), 'sell' (satıldı), 'stop' (oyuncuya gösterilmeli).
function autoForgeOne() {
  S.hammers--; S.totalForged++;
  const item = makeItem();
  S.bestRarity = Math.max(S.bestRarity, item.r);
  const better = powerWith(item) > heroPower();
  if (item.r >= S.autoKeepRarity) return { item, action: 'stop', better };
  if (better && S.autoEquip) {
    const old = S.equipped[item.slot];
    if (old) S.gold += sellValue(old);
    S.equipped[item.slot] = item;
    return { item, action: 'equip', old };
  }
  if (better) return { item, action: 'stop', better };
  const g = sellValue(item);
  S.gold += g;
  return { item, action: 'sell', gold: g };
}

// ---------- Ocak ----------
function rarityOdds(L) {
  const imm = clamp((L - 20) * 0.3, 0, 3);
  const myth = clamp((L - 14) * 0.6, 0, 9.6);
  const leg = clamp((L - 8) * 1.0, 0, 22);
  const epic = clamp((L - 3) * 2.2, 0, 35);
  const rare = Math.min(30, 8 + L * 2);
  return [Math.max(0, 100 - imm - myth - leg - epic - rare), rare, epic, leg, myth, imm];
}
const forgeUpgradeCost = (L) => Math.floor(150 * Math.pow(1.75, L - 1));
const forgeUpgradeTime = (L) => Math.min(1800, 8 * L * L / 2 + 10);
// Kalan süreyi altınla bitirme: dakikası başına yükseltme bedelinin %12'si
const forgeRushCost = () => {
  const left = Math.max(0, (S.forgeUpgradeEnd - Date.now()) / 1000);
  return Math.ceil(left / 60) * Math.floor(forgeUpgradeCost(S.forgeLevel) * 0.12);
};
// Bileme: kuşanılan eşyanın ana değerini her seviyede %8 artırır
const ENHANCE_STEP = 0.08;
const enhanceCost = (it) => Math.floor(12 * Math.pow(1.1, it.lvl) * Math.pow(it.r + 1, 1.5) * Math.pow(1.45, it.plus || 0));
const itemMain = (it) => (it.atk != null ? it.atk : it.hp) * (1 + ENHANCE_STEP * (it.plus || 0));
// Ahilik Beratı (prestij)
const BERAT_MIN_STAGE = 30;
const beratGain = () => (S.maxStage < BERAT_MIN_STAGE ? 0 : Math.max(0, Math.floor((S.maxStage - 20) / 4) - S.berat));
const BERAT_BONUS = 0.08;
function takeBerat() {
  const gain = beratGain();
  if (gain <= 0) return 0;
  const keep = { pets: S.pets, activePet: S.activePet, eggs: S.eggs, incub: S.incub, muted: S.muted, forgeLevel: S.forgeLevel, forgeUpgradeEnd: S.forgeUpgradeEnd,
    totalForged: S.totalForged, bestRarity: S.bestRarity, totalKills: S.totalKills, autoKeepRarity: S.autoKeepRarity, autoEquip: S.autoEquip,
    autoRetry: S.autoRetry, berat: S.berat + gain, beratCount: S.beratCount + 1, eggsBought: S.eggsBought, eggDay: S.eggDay };
  S = Object.assign(defaultState(), keep);
  return gain;
}

function rollRarity(shift = 0) {
  const odds = rarityOdds(Math.max(1, S.forgeLevel + shift));
  let r = Math.random() * 100;
  for (let i = 0; i < odds.length; i++) if ((r -= odds[i]) < 0) return i;
  return 0;
}
function makeItem() {
  const slot = pick(SLOTS);
  const r = rollRarity();
  const rar = RARITIES[r];
  const lvl = Math.max(1, S.maxStage + 1 + randInt(-2, 1));
  const scale = Math.pow(1.1, lvl - 1) * rar.mult * rand(0.9, 1.1) * slot.w;
  const item = { slot: slot.id, base: pick(slot.bases), r, lvl, subs: {} };
  if (slot.main === 'atk') item.atk = Math.max(1, Math.round(6 * scale));
  else item.hp = Math.max(1, Math.round(30 * scale));
  const keys = Object.keys(SUBSTATS).filter((k) => !SUBSTATS[k].rare || r >= SUBSTATS[k].rare);
  const n = rar.subs + (r === 0 && Math.random() < 0.35 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const k = keys.splice(Math.floor(Math.random() * keys.length), 1)[0];
    const d = SUBSTATS[k];
    item.subs[k] = +(rand(d.min, d.max) * (1 + r * 0.25)).toFixed(1);
  }
  return item;
}
const sellValue = (it) => Math.floor(3 * Math.pow(1.1, it.lvl) * Math.pow(it.r + 1, 2));

// ---------- Yoldaşlar ----------
const petLvl = (id) => (S.pets[id] ? S.pets[id].lvl : 0);
const petBonusValue = (p, lvl) => p.base * (1 + 0.25 * (lvl - 1));
const petDmgPct = (p, lvl) => PET_DMG[p.r] * (1 + 0.2 * (lvl - 1));
const hatchTime = (r) => HATCH_SEC[r];
// Pazar fiyatı her gün sıfırlanır
const eggCost = () => { if (S.eggDay !== today()) { S.eggDay = today(); S.eggsBought = 0; } return Math.floor(250 * Math.pow(1.11, S.maxStage) * Math.pow(1.15, S.eggsBought)); };
function rollEgg(boss) {
  // Boss yumurtası ocak şansını kullanır; normal düşmanınki bir kademe aşağıdan.
  return Math.min(5, rollRarity(boss ? 2 : -4));
}
function addEgg(r, at = Date.now()) {
  if (S.eggs.length >= EGG_INV_MAX) { S.gold += 50 * (r + 1) * (r + 1); return false; }
  S.eggs.push({ r });
  fillIncubators(at);
  return true;
}
function fillIncubators(now) {
  while (S.incub.length < INCUBATORS && S.eggs.length) {
    // En nadir yumurta önce
    S.eggs.sort((a, b) => b.r - a.r);
    const e = S.eggs.shift();
    S.incub.push({ r: e.r, end: now + hatchTime(e.r) * 1000 });
  }
}
function hatchPet(r) {
  let pool = PETS.filter((p) => p.r === r);
  for (let rr = r; !pool.length && rr >= 0; rr--) pool = PETS.filter((p) => p.r === rr);
  const p = pick(pool);
  const had = S.pets[p.id];
  if (had) had.lvl = Math.min(PET_MAX_LVL, had.lvl + 1);
  else S.pets[p.id] = { lvl: 1 };
  // Güce göre seç: yeni yoldaş daha çok güç katıyorsa yanına al
  if (!S.activePet || powerOf(heroStats(S.equipped, p.id)) > powerOf(heroStats(S.equipped, S.activePet))) S.activePet = p.id;
  return { pet: p, lvl: S.pets[p.id].lvl, dup: !!had };
}
// Biten kuluçkaları işler; kapalıyken de doğru sırayla devam eder. Çıkan yoldaşları döndürür.
function processIncubators(now) {
  const out = [];
  let guard = 0;
  while (guard++ < 200) {
    const i = S.incub.findIndex((x) => x.end <= now);
    if (i < 0) break;
    const done = S.incub.splice(i, 1)[0];
    out.push(hatchPet(done.r));
    if (S.eggs.length) {
      S.eggs.sort((a, b) => b.r - a.r);
      const e = S.eggs.shift();
      S.incub.push({ r: e.r, end: done.end + hatchTime(e.r) * 1000 });
    }
  }
  fillIncubators(now);
  return out;
}

// ---------- Kahraman ----------
function heroStats(equip = S.equipped, petId = S.activePet) {
  const st = { atk: 12, hp: 150, critChance: 5, critDmg: 50, atkSpeed: 0, lifesteal: 0, dodge: 0, regen: 0, dmgPct: 0, hpPct: 0,
    goldPct: 0, bossDmg: 0, doubleHit: 0, thorns: 0 };
  for (const id in equip) {
    const it = equip[id];
    if (!it) continue;
    const mul = 1 + ENHANCE_STEP * (it.plus || 0);
    st.atk += (it.atk || 0) * mul;
    st.hp += (it.hp || 0) * mul;
    for (const k in it.subs) st[k] += it.subs[k];
  }
  const bm = 1 + BERAT_BONUS * (S.berat || 0);
  st.atk *= bm; st.hp *= bm;
  st.goldPct += 3 * (S.berat || 0);
  if (petId && S.pets[petId]) {
    const p = PET_BY_ID[petId];
    st[p.bonus] += petBonusValue(p, S.pets[petId].lvl);
  }
  for (const k in CAPS) st[k] = Math.min(CAPS[k], st[k]);
  const h = {
    atk: st.atk * (1 + st.dmgPct / 100),
    hp: st.hp * (1 + st.hpPct / 100),
    aps: 1 + st.atkSpeed / 100,
    crit: st.critChance / 100,
    critMult: 1.5 + st.critDmg / 100,
    lifesteal: st.lifesteal / 100,
    dodge: st.dodge / 100,
    regen: st.regen / 100,
    goldPct: st.goldPct / 100,
    bossDmg: st.bossDmg / 100,
    doubleHit: st.doubleHit / 100,
    thorns: st.thorns / 100,
    petDmg: 0,
  };
  if (petId && S.pets[petId]) h.petDmg = h.atk * petDmgPct(PET_BY_ID[petId], S.pets[petId].lvl);
  return h;
}
function powerOf(h) {
  const dps = h.atk * h.aps * (1 + h.crit * (h.critMult - 1)) * (1 + h.lifesteal) * (1 + h.doubleHit * 0.6) + h.petDmg / PET_INTERVAL;
  const ehp = h.hp / (1 - h.dodge) * (1 + h.regen * 5) * (1 + h.thorns * 0.3);
  return Math.round(Math.sqrt(dps * ehp) * 10);
}
const heroPower = () => powerOf(heroStats());
const powerWith = (item) => powerOf(heroStats(Object.assign({}, S.equipped, { [item.slot]: item })));

// ---------- Düşman ----------
const enemyHp = (g, boss) => 40 * Math.pow(1.13, g) * (boss ? 5 : 1);
const enemyAtk = (g, boss) => 5 * Math.pow(1.125, g) * (boss ? 1.6 : 1);
const goldFor = (g, boss) => 4 * Math.pow(1.11, g) * (boss ? 10 : 1);
function makeEnemy(g) {
  const boss = isBossStage(g);
  const th = themeOf(g);
  const def = boss ? th.boss : pick(th.enemies);
  const hp = enemyHp(g, boss);
  return { kind: def.kind, color: def.color, boss, name: def.name, hp, maxHp: hp, atk: enemyAtk(g, boss), aps: boss ? 0.7 : 0.8 };
}

// ---------- Savaş ----------
const WALK_TIME = 1.6;
const HERO_WINDUP = 0.26;
const ENEMY_WINDUP = 0.4;
const B = {
  state: 'walk', t: 0, enemy: null, kills: 0,
  heroHp: 150, heroMax: 150,
  heroAtkT: 0, enemyAtkT: 0, heroRecover: 0, enemyRecover: 0, petAtkT: 1, petRecover: 0,
  bossT: BOSS_TIME, timeScale: 1, hitStop: 0,
};
const stageNeed = () => (isBossStage(S.stage) ? 1 : ENEMIES_PER_STAGE);

function startStage() {
  B.kills = 0;
  const h = heroStats();
  B.heroMax = h.hp; B.heroHp = h.hp;
  Bus.emit('stageStart', { stage: S.stage });
  spawnEnemy();
}
function spawnEnemy() {
  B.enemy = makeEnemy(S.stage);
  B.state = 'walk'; B.t = 0;
  B.bossT = BOSS_TIME;
  B.heroAtkT = 0.45; B.enemyAtkT = 0.9; B.petAtkT = 0.8;
  Bus.emit('enemySpawn', B.enemy);
}
function setState(s) { B.state = s; B.t = 0; }

function dealToEnemy(dmg) { B.enemy.hp -= dmg; }
function updateBattle(rawDt) {
  if (B.hitStop > 0) { B.hitStop -= rawDt; return; }
  const dt = rawDt * B.timeScale;
  const h = heroStats();
  if (Math.abs(h.hp - B.heroMax) > 0.5) { B.heroHp = B.heroHp / B.heroMax * h.hp; B.heroMax = h.hp; }
  const e = B.enemy;
  B.t += dt;
  B.heroRecover = Math.max(0, B.heroRecover - dt);
  B.enemyRecover = Math.max(0, B.enemyRecover - dt);
  B.petRecover = Math.max(0, B.petRecover - dt);

  switch (B.state) {
    case 'walk':
      if (B.t >= WALK_TIME) {
        if (e.boss) { setState('intro'); Bus.emit('bossIntro', e); }
        else setState('fight');
      }
      break;
    case 'intro':
      if (B.t >= 1.4) setState('fight');
      break;
    case 'fight': {
      B.heroHp = Math.min(B.heroMax, B.heroHp + B.heroMax * h.regen * dt);
      const bossMul = e.boss ? 1 + h.bossDmg : 1;
      B.heroAtkT -= dt;
      if (B.heroAtkT <= 0) {
        B.heroAtkT += 1 / h.aps;
        B.heroRecover = 0.22;
        const crit = Math.random() < h.crit;
        const dmg = h.atk * bossMul * (crit ? h.critMult : 1) * rand(0.92, 1.08);
        dealToEnemy(dmg);
        if (h.lifesteal) B.heroHp = Math.min(B.heroMax, B.heroHp + dmg * h.lifesteal);
        if (crit) B.hitStop = 0.07;
        Bus.emit('heroHit', { dmg, crit });
        if (h.doubleHit && Math.random() < h.doubleHit) {
          const d2 = h.atk * bossMul * 0.6 * rand(0.92, 1.08);
          dealToEnemy(d2);
          Bus.emit('heroHit', { dmg: d2, double: true });
        }
      }
      if (h.petDmg > 0) {
        B.petAtkT -= dt;
        if (B.petAtkT <= 0) {
          B.petAtkT += PET_INTERVAL;
          B.petRecover = 0.5;
          const pd = h.petDmg * bossMul * rand(0.9, 1.1);
          dealToEnemy(pd);
          Bus.emit('petHit', { dmg: pd });
        }
      }
      if (e.hp > 0) {
        B.enemyAtkT -= dt;
        if (B.enemyAtkT <= 0) {
          B.enemyAtkT += 1 / e.aps;
          B.enemyRecover = 0.25;
          if (Math.random() < h.dodge) Bus.emit('enemyHit', { dodged: true });
          else {
            const dmg = e.atk * rand(0.9, 1.1);
            B.heroHp -= dmg;
            Bus.emit('enemyHit', { dmg });
            if (h.thorns > 0) { const td = dmg * h.thorns; dealToEnemy(td); Bus.emit('thorns', { dmg: td }); }
          }
        }
      }
      if (e.boss) B.bossT -= dt;
      if (e.hp <= 0) killEnemy(h);
      else if (B.heroHp <= 0 || (e.boss && B.bossT <= 0)) {
        B.heroHp = Math.max(0, B.heroHp);
        setState('heroDeath');
        Bus.emit('heroDied', { timeout: e.boss && B.bossT <= 0 });
      }
      break;
    }
    case 'enemyDeath':
      if (B.t >= 0.75) {
        if (B.kills >= stageNeed()) {
          let bonus = 0;
          if (S.stage > S.clearedMax) { bonus = e.boss ? FIRST_BOSS_HAMMERS : FIRST_CLEAR_HAMMERS; S.clearedMax = S.stage; S.hammers += bonus; }
          setState('clear'); Bus.emit('stageClear', { boss: e.boss, stage: S.stage, bonus });
        }
        else spawnEnemy();
      }
      break;
    case 'clear':
      if (B.t >= 1.3) {
        if (S.autoAdvance) { S.stage++; S.maxStage = Math.max(S.maxStage, S.stage); }
        save();
        startStage();
      }
      break;
    case 'heroDeath':
      if (B.t >= 2.2) {
        if (S.stage > 0) S.stage--;
        S.autoAdvance = false;
        Bus.emit('retreat', {});
        startStage();
      }
      break;
  }
}
function killEnemy(h) {
  const e = B.enemy;
  e.hp = 0;
  const gold = Math.round(goldFor(S.stage, e.boss) * (1 + h.goldPct));
  const hammers = Math.random() < HAMMER_DROP_CHANCE ? 1 : 0;
  S.gold += gold; S.hammers += hammers; S.totalKills++;
  B.heroHp = Math.min(B.heroMax, B.heroHp + B.heroMax * 0.2);
  B.kills++;
  let egg = null, eggSold = false;
  if (e.boss || Math.random() < 0.015) { egg = rollEgg(e.boss); eggSold = !addEgg(egg); }
  setState('enemyDeath');
  Bus.emit('enemyKilled', { gold, hammers, boss: e.boss, egg, eggSold });
}
function challengeNext() {
  S.autoAdvance = true;
  S.stage++;
  S.maxStage = Math.max(S.maxStage, S.stage);
  startStage();
}

// ---------- Çevrimdışı ilerleme ----------
// Bir aşamanın ortalama sonucunu hesaplar (rastgelelik yerine beklenen değerler).
function stageOutcome(g, h) {
  const boss = isBossStage(g);
  const n = boss ? 1 : ENEMIES_PER_STAGE;
  let hp = h.hp, time = 0, gold = 0, ham = 0;
  for (let i = 0; i < n; i++) {
    const ehp = enemyHp(g, boss), eatk = enemyAtk(g, boss), eaps = boss ? 0.7 : 0.8;
    const edps = eatk * eaps * (1 - h.dodge);
    const mul = boss ? 1 + h.bossDmg : 1;
    const dps = h.atk * mul * h.aps * (1 + h.crit * (h.critMult - 1)) * (1 + h.doubleHit * 0.6) + h.petDmg * mul / PET_INTERVAL + edps * h.thorns;
    const t = ehp / dps;
    if (boss && t > BOSS_TIME) return { ok: false, time: time + WALK_TIME + 1.4 + BOSS_TIME + 2.2 };
    const loss = (edps - dps * h.lifesteal - h.regen * h.hp) * t;
    hp = Math.min(h.hp, hp - loss);
    if (hp <= 0) return { ok: false, time: time + WALK_TIME + t + 2.2 };
    hp = Math.min(h.hp, hp + h.hp * 0.2);
    time += WALK_TIME + t + 0.75 + (boss ? 1.4 : 0);
    gold += goldFor(g, boss) * (1 + h.goldPct);
    ham += HAMMER_DROP_CHANCE;
  }
  return { ok: true, time: time + 1.3, gold, ham, kills: n, boss };
}
// Dilimlere bölünmüş çevrimdışı simülasyon: her 10 dakikada güç yeniden hesaplanır,
// Usta Kalfa döver, kuluçka ilerler, takılan aşama yeniden denenir. Verim %80.
const OFFLINE_SLICE = 600;
function simulateOffline(awaySec) {
  const now = Date.now();
  const sec = Math.min(OFFLINE_CAP_SEC, awaySec);
  const start = now - sec * 1000;
  const rep = {
    away: awaySec, capped: awaySec > OFFLINE_CAP_SEC, eff: OFFLINE_EFF,
    stageFrom: S.stage, stageTo: S.stage, maxFrom: S.maxStage, kills: 0, bosses: 0, gold: 0, hammers: 0, regen: 0, eggs: 0, eggsSold: 0,
    pets: [], forgeFrom: S.forgeLevel, forgeTo: S.forgeLevel, powerFrom: heroPower(),
    forged: 0, sold: 0, soldGold: 0, equipped: [], stopItem: null,
  };
  let elapsed = 0, hamCarry = 0, regenCarry = 0, eggChance = 0;
  while (elapsed < sec) {
    const sl = Math.min(OFFLINE_SLICE, sec - elapsed);
    const tEnd = start + (elapsed + sl) * 1000;
    // Çekiç yenilenmesi
    if (S.hammers < HAMMER_REGEN_CAP) {
      regenCarry += sl * OFFLINE_EFF / HAMMER_REGEN_SEC;
      const add = Math.min(HAMMER_REGEN_CAP - S.hammers, Math.floor(regenCarry));
      regenCarry -= Math.floor(regenCarry);
      S.hammers += add; rep.regen += add;
    }
    // Takıldıysa yeniden dene
    if (!S.autoAdvance && S.autoRetry) { S.autoAdvance = true; S.stage++; }
    // Savaş
    const h = heroStats();
    let t = sl * OFFLINE_EFF, guard = 0;
    const cache = {};
    const outcome = (x) => cache[x] || (cache[x] = stageOutcome(x, h));
    while (t > 0 && guard++ < 5000) {
      const g = S.stage;
      const o = outcome(g);
      if (!o.ok) {
        t -= o.time;
        S.autoAdvance = false;
        if (g === 0) break;
        S.stage--;
        continue;
      }
      if (t < o.time) break;
      let times = 1;
      if (!S.autoAdvance) times = Math.floor(t / o.time);
      t -= o.time * times;
      rep.gold += o.gold * times; hamCarry += o.ham * times; rep.kills += o.kills * times;
      if (o.boss) { rep.bosses += times; for (let i = 0; i < Math.min(times, 5); i++) { if (addEgg(rollEgg(true), tEnd)) rep.eggs++; else rep.eggsSold++; } }
      else eggChance += o.kills * times * 0.015;
      if (g > S.clearedMax) { const b = o.boss ? FIRST_BOSS_HAMMERS : FIRST_CLEAR_HAMMERS; S.hammers += b; rep.hammers += b; S.clearedMax = g; }
      if (S.autoAdvance) { S.stage++; S.maxStage = Math.max(S.maxStage, S.stage); }
      else break;
    }
    S.gold += Math.floor(rep.gold) - (rep._goldAdded || 0); rep._goldAdded = Math.floor(rep.gold);
    const hamAdd = Math.floor(hamCarry); hamCarry -= hamAdd; S.hammers += hamAdd; rep.hammers += hamAdd;
    while (eggChance >= 1) { eggChance--; if (addEgg(rollEgg(false), tEnd)) rep.eggs++; else rep.eggsSold++; }
    // Ocak yükseltmesi ve kuluçka
    if (S.forgeUpgradeEnd && tEnd >= S.forgeUpgradeEnd) { S.forgeUpgradeEnd = 0; S.forgeLevel++; }
    rep.pets.push(...processIncubators(tEnd));
    // Usta Kalfa
    if (S.auto && !rep.stopItem) {
      while (S.hammers >= 1 && rep.forged < 3000) {
        const res = autoForgeOne();
        rep.forged++;
        if (res.action === 'equip') rep.equipped.push(res.item);
        else if (res.action === 'sell') { rep.sold++; rep.soldGold += res.gold; }
        else { rep.stopItem = res.item; S.pending = res.item; break; }
      }
    }
    elapsed += sl;
  }
  if (Math.random() < eggChance) { if (addEgg(rollEgg(false), now)) rep.eggs++; else rep.eggsSold++; }
  rep.gold = Math.floor(rep.gold);
  S.totalKills += rep.kills;
  rep.stageTo = S.stage;
  rep.forgeTo = S.forgeLevel;
  rep.equipped = rep.equipped.filter((it) => S.equipped[it.slot] === it);
  rep.powerTo = heroPower();
  return rep;
}