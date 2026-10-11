'use strict';
/* Ahi Ocağı — arayüz, ocak animasyonu, eşya/yoldaş açılışı, Usta Kalfa, çevrimdışı rapor ve ana döngü. */
const $ = (id) => document.getElementById(id);
const GEAR_L = ['weapon', 'helmet', 'armor', 'belt'];
const GEAR_R = ['gloves', 'necklace', 'ring', 'boots'];
const COIN_HTML = '<span class="res-ic coin" style="width:22px;height:22px"></span>';
const HAM_HTML = '<span class="res-ic ham" style="width:22px;height:22px"></span>';
const STAT_ROWS = (h) => [
  ['Can', fmt(h.hp)], ['Hasar', fmt(h.atk)],
  ['Saldırı Hızı', h.aps.toFixed(2)], ['Kritik', Math.round(h.crit * 100) + '%'],
  ['Kritik Hasarı', Math.round(h.critMult * 100) + '%'], ['Can Çalma', Math.round(h.lifesteal * 100) + '%'],
  ['Kaçınma', Math.round(h.dodge * 100) + '%'], ['Yenileme', (h.regen * 100).toFixed(1) + '%/sn'],
  ['Çift Vuruş', Math.round(h.doubleHit * 100) + '%'], ['Diken', Math.round(h.thorns * 100) + '%'],
  ['Boss Hasarı', '+' + Math.round(h.bossDmg * 100) + '%'], ['Ganimet', '+' + Math.round(h.goldPct * 100) + '%'],
  ['Yoldaş Hasarı', fmt(h.petDmg)],
];
$('brandIc').innerHTML = TULIP_SVG;

// ---------- Yumuşak sayaçlar ----------
const disp = { gold: 0, power: 0 };
function bump(id) { const el = $(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

// ---------- Sekmeler ----------
let curTab = 'gear';
document.querySelectorAll('.tab').forEach((b) => b.onclick = () => setTab(b.dataset.tab));
function setTab(t) {
  curTab = t;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  $('tab-gear').classList.toggle('hidden', t !== 'gear');
  $('tab-pets').classList.toggle('hidden', t !== 'pets');
  if (t === 'pets') renderPets();
}

// ---------- Teçhizat ----------
function slotHTML(id) {
  const it = S.equipped[id];
  if (!it) return `${itemIconSVG(id, null)}<span class="sname">${SLOT_BY_ID[id].name}</span>`;
  return `${itemIconSVG(id, it.r)}<span class="lv">Sv.${it.lvl}${it.plus ? ` <i class="plus">+${it.plus}</i>` : ''}</span>`;
}
function renderGear(pulseSlot) {
  [['gearL', GEAR_L], ['gearR', GEAR_R]].forEach(([col, ids]) => {
    const el = $(col);
    el.innerHTML = '';
    for (const id of ids) {
      const it = S.equipped[id];
      const b = document.createElement('button');
      b.className = 'slot' + (it ? ' r' : '') + (it && it.r >= 3 ? ' shine' : '') + (pulseSlot === id ? ' pulse' : '');
      b.id = 'slot-' + id;
      b.title = it ? itemName(it) : SLOT_BY_ID[id].name;
      if (it) b.style.setProperty('--rc', RARITIES[it.r].color);
      b.innerHTML = slotHTML(id);
      b.onclick = () => (it ? showItemDetail(it) : toast(`${SLOT_BY_ID[id].name} yuvası boş. Dövmeye devam!`));
      el.appendChild(b);
    }
  });
}
function renderStats() {
  $('statList').innerHTML = STAT_ROWS(heroStats()).slice(0, 8).map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
}
function showAllStats() {
  openModal(`<h2>Akıncının Özellikleri</h2>
    <ul style="display:grid;grid-template-columns:1fr 1fr;gap:6px;list-style:none;padding:0">${STAT_ROWS(heroStats()).map(([k, v]) => `<li style="background:#070d1a80;border-radius:10px;padding:6px 10px"><span class="muted" style="display:block;font-size:11px">${k}</span><b style="font-family:var(--font-game);font-weight:400;font-size:18px">${v}</b></li>`).join('')}</ul>
    <p class="muted">Kritik %75, kaçınma %40, can çalma %30, çift vuruş %50 ile sınırlıdır.</p>
    <div class="actions"><button class="btn btn-sell" id="mClose">KAPAT</button></div>`);
  $('mClose').onclick = () => { closeModal(); renderStats(); };
}

// ---------- HUD ----------
let lastHeroFrac = 1;
function updateHUD() {
  const hf = clamp(B.heroHp / B.heroMax, 0, 1);
  $('heroHp').style.width = hf * 100 + '%';
  if (hf < lastHeroFrac || hf > lastHeroFrac + 0.01) $('heroHpLag').style.width = hf * 100 + '%';
  lastHeroFrac = hf;
  $('heroHpTxt').textContent = fmt(Math.max(0, B.heroHp));
  const e = B.enemy;
  if (e) {
    const ef = clamp(e.hp / e.maxHp, 0, 1);
    $('enemyHp').style.width = ef * 100 + '%';
    $('enemyHpLag').style.width = ef * 100 + '%';
    $('enemyName').textContent = (e.boss ? '👑 ' : '') + upper(e.name);
    $('enemyHpTxt').textContent = fmt(Math.max(0, e.hp));
  }
  const bt = $('bossTimer');
  const showTimer = e && e.boss && (B.state === 'fight' || B.state === 'intro');
  bt.classList.toggle('hidden', !showTimer);
  if (showTimer) { bt.textContent = '⏱ ' + Math.max(0, B.bossT).toFixed(1); bt.classList.toggle('low', B.bossT < 8); }
  $('vignette').classList.toggle('on', hf < 0.3 && B.state === 'fight');
}
function updateStageUI() {
  $('stageName').textContent = stageLabel(S.stage);
  $('themeName').textContent = themeName(S.stage);
  const d = $('stageDots');
  if (isBossStage(S.stage)) d.innerHTML = `<i class="boss ${B.kills ? 'on' : ''}">💀</i>`;
  else d.innerHTML = Array.from({ length: ENEMIES_PER_STAGE }, (_, i) => `<i class="${i < B.kills ? 'on' : ''}"></i>`).join('');
  $('advanceBtn').classList.toggle('hidden', S.autoAdvance);
  $('advanceBtn').textContent = isBossStage(S.stage + 1) ? 'BOSSA SALDIR 👑' : 'İLERLE ⚔';
  $('vignette').classList.toggle('boss', !!(B.enemy && B.enemy.boss));
}
function updateTop(dt) {
  const k = Math.min(1, dt * 8);
  disp.gold += (S.gold - disp.gold) * k; if (Math.abs(S.gold - disp.gold) < 1) disp.gold = S.gold;
  const p = heroPower();
  disp.power += (p - disp.power) * k; if (Math.abs(p - disp.power) < 1) disp.power = p;
  $('gold').textContent = fmt(disp.gold);
  $('hammers').textContent = fmt(S.hammers);
  $('power').textContent = fmt(disp.power);
  $('power2').textContent = fmt(disp.power);
  $('hammerTimer').textContent = S.hammers < HAMMER_REGEN_CAP ? `+1 · ${Math.ceil(HAMMER_REGEN_SEC - S.hammerAcc)}sn` : 'DOLU';
  $('forgeBtn').disabled = S.hammers < 1;
  $('forgeLvl').textContent = `Sv. ${S.forgeLevel}`;
  const left = (S.forgeUpgradeEnd - Date.now()) / 1000;
  let ready = false;
  if (S.forgeUpgradeEnd && left > 0) $('forgeUpState').textContent = '⏳ ' + fmtTime(left);
  else if (S.forgeLevel >= MAX_FORGE) $('forgeUpState').textContent = 'EN ÜST';
  else { ready = S.gold >= forgeUpgradeCost(S.forgeLevel); $('forgeUpState').textContent = ready ? 'YÜKSELT ⬆' : fmt(forgeUpgradeCost(S.forgeLevel)) + ' altın'; }
  $('forgeLvlBtn').classList.toggle('ready', ready);
  $('petBadge').classList.toggle('hidden', !(S.eggs.length && S.incub.length < INCUBATORS) && !(curTab !== 'pets' && pendingHatches.length));
}

// ---------- Bildirim, afiş, flaş ----------
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = msg;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 2600);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
}
function banner(html, cls = '') {
  const b = $('banner');
  b.className = 'banner'; b.innerHTML = html; void b.offsetWidth;
  b.className = 'banner show ' + cls;
}
function screenFlash() { const f = $('screenFlash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
function bodyShake() { document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); }
function restartAnim(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

// ---------- Uçan simgeler ----------
function fly(html, fromX, fromY, toEl, { delay = 0, dur = 750, onEnd } = {}) {
  const r = toEl.getBoundingClientRect();
  const tx = r.left + Math.min(20, r.width / 2), ty = r.top + r.height / 2;
  const d = document.createElement('div');
  d.className = 'fly'; d.innerHTML = html;
  $('flyLayer').appendChild(d);
  const sx = fromX + rand(-30, 30), sy = fromY + rand(-20, 20);
  const mx = (sx + tx) / 2 + rand(-120, 120), my = Math.min(sy, ty) - rand(40, 160);
  const kf = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * mx + t * t * tx;
    const y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * my + t * t * ty;
    kf.push({ transform: `translate(${x}px,${y}px) scale(${0.6 + 0.7 * Math.sin(t * Math.PI) + 0.3 * (1 - t)})`, opacity: t < 0.05 ? 0 : 1 });
  }
  const a = d.animate(kf, { duration: dur, delay, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'both' });
  a.onfinish = () => { d.remove(); if (onEnd) onEnd(); };
}
function battleToViewport(p) {
  const r = $('battleWrap').getBoundingClientRect();
  return { x: r.left + p.x, y: r.top + p.y };
}

// ---------- Ocak kıvılcımları ----------
const Embers = (() => {
  const cv = $('embers'), ctx = cv.getContext('2d');
  const ps = [];
  function size() { cv.width = cv.clientWidth * devicePixelRatio; cv.height = cv.clientHeight * devicePixelRatio; }
  new ResizeObserver(size).observe(cv);
  function burst(n, big) {
    const W = cv.width, H = cv.height;
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const sp = rand(150, big ? 700 : 480) * devicePixelRatio;
      ps.push({ x: W * 0.5 + rand(-20, 20), y: H * 0.72, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.9), t: 0, s: rand(1.5, 3.5) * devicePixelRatio, spark: true });
    }
  }
  function update(dt) {
    const W = cv.width, H = cv.height;
    if (!W || !H) return;
    if (Math.random() < dt * 14) ps.push({ x: W * 0.5 + rand(-W * 0.3, W * 0.3), y: H + 5, vx: rand(-15, 15), vy: rand(-60, -30) * devicePixelRatio, life: rand(1.5, 3), t: 0, s: rand(1, 2.2) * devicePixelRatio });
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.t += dt;
      if (p.t > p.life) { ps.splice(i, 1); continue; }
      if (p.spark) { p.vy += 900 * devicePixelRatio * dt; p.vx *= 0.98; } else p.vx += Math.sin(p.t * 3 + i) * 10 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = 1 - p.t / p.life;
      ctx.fillStyle = p.spark ? `rgba(255,${200 + 55 * k | 0},${120 * k | 0},${k})` : `rgba(255,${140 + 60 * k | 0},40,${k * 0.8})`;
      if (p.spark) {
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = p.s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  return { burst, update };
})();

// ---------- Dövme ----------
let forgeBusy = false, pendingItem = null;
function anvilStrike(fromAuto) {
  restartAnim($('hammerArt'), 'strike');
  restartAnim($('forgeBtn'), 'press');
  setTimeout(() => $('forgeBtn').classList.remove('press'), 120);
  return new Promise((res) => setTimeout(() => {
    Sfx.clang();
    restartAnim($('anvilArt'), 'hit');
    restartAnim($('forgeFlash'), 'on');
    Embers.burst(fromAuto ? 12 : 26);
    $('hotSpot').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
    res();
  }, fromAuto ? 150 : 200));
}
async function forge() {
  if (forgeBusy || pendingItem || S.hammers < 1) return;
  Sfx.init();
  forgeBusy = true;
  S.hammers--; S.totalForged++;
  await anvilStrike(false);
  const item = makeItem();
  S.bestRarity = Math.max(S.bestRarity, item.r);
  S.pending = item; save();   // sayfa yenilense de eşya kaybolmasın
  if (item.r >= 3) Embers.burst(40, true);
  setTimeout(() => { forgeBusy = false; showReveal(item); }, 260);
}
async function autoForgeStep() {
  if (forgeBusy || pendingItem || S.hammers < 1) return;
  forgeBusy = true;
  await anvilStrike(true);
  const res = autoForgeOne();
  forgeBusy = false;
  if (res.action === 'sell') soldChip(res.item, res.gold);
  else if (res.action === 'equip') {
    Sfx.equip();
    toast(`⚒ Usta Kalfa kuşandı: <b style="color:${RARITIES[res.item.r].color}">${itemName(res.item)}</b>`);
    const fr = $('furnace').getBoundingClientRect();
    afterEquip(res.item, fr.left + fr.width / 2, fr.top + fr.height * 0.4);
  } else {
    stopAuto();
    S.pending = res.item; save();
    if (res.item.r >= 3) Embers.burst(40, true);
    showReveal(res.item);
  }
}
function soldChip(item, g) {
  const c = document.createElement('div');
  c.className = 'sold-chip';
  c.style.setProperty('--rc', RARITIES[item.r].color);
  c.innerHTML = `${itemIconSVG(item.slot, item.r)}<span>+${fmt(g)}</span>${COIN_HTML}`;
  $('furnace').appendChild(c);
  setTimeout(() => c.remove(), 1000);
  Sfx.coin();
}
const revealQueue = [];
function showReveal(item) {
  if (pendingItem && pendingItem !== item) { revealQueue.push(item); return; }
  pendingItem = item;
  const cur = S.equipped[item.slot];
  const before = heroPower(), after = powerWith(item), diff = after - before;
  const rar = RARITIES[item.r];
  const mainKey = item.atk != null ? 'atk' : 'hp';
  const mainLbl = mainKey === 'atk' ? '⚔ Hasar' : '❤ Can';
  const oldV = cur ? cur[mainKey] || 0 : 0, newV = item[mainKey];
  const subs = Object.entries(item.subs).map(([k, v]) => `<span>${SUBSTATS[k].name} <b>${fmtSub(k, v)}</b></span>`).join('');
  const oldSubs = cur ? Object.entries(cur.subs).map(([k, v]) => `${SUBSTATS[k].name} ${fmtSub(k, v)}`).join(' · ') : '';
  const el = $('reveal');
  el.style.setProperty('--rc', rar.color);
  el.innerHTML = `
    <div class="rays"></div>
    <div class="rv-top">
      <div class="rv-rarity">${upper(rar.name)}!</div>
      <div class="rv-icon" id="rvIcon">${itemIconSVG(item.slot, item.r)}</div>
      <div class="rv-name" style="color:${rar.color}">${item.base}<small>${item.base === SLOT_BY_ID[item.slot].name ? '' : SLOT_BY_ID[item.slot].name + ' · '}Seviye ${item.lvl}</small></div>
    </div>
    <div class="rv-panel">
      <div class="cmp-row"><span class="old">${cur ? fmt(oldV) : '—'}</span><span class="lbl">${mainLbl}</span><span class="new ${newV >= oldV ? 'up' : 'down'}">${fmt(newV)} ${newV >= oldV ? '▲' : '▼'}</span></div>
      ${subs ? `<div class="subs">${subs}</div>` : '<div class="hint">Ek özellik yok</div>'}
      ${cur ? `<div class="hint" style="margin-top:4px">Kuşanılan: ${itemName(cur)} Sv.${cur.lvl}${oldSubs ? ' · ' + oldSubs : ''}</div>` : '<div class="hint">Bu yuva boş!</div>'}
      <div class="pdelta ${diff >= 0 ? 'up' : 'down'}"><small>GÜÇ</small>${fmt(before)} → ${fmt(after)} ${diff >= 0 ? '▲' : '▼'}</div>
      <div class="actions">
        <button class="btn btn-sell" id="rvSell">SAT<small>+${fmt(sellValue(item))} altın</small></button>
        <button class="btn btn-equip ${diff > 0 ? 'better' : ''}" id="rvEquip">KUŞAN<small>${cur ? 'eskisi ' + fmt(sellValue(cur)) + ' altına satılır' : 'boş yuvaya'}</small></button>
      </div>
      <div class="hint">Kısayol: E kuşan · S sat</div>
    </div>`;
  el.classList.remove('hidden');
  Sfx.reveal(item.r);
  if (item.r >= 3) { screenFlash(); bodyShake(); }
  $('rvSell').onclick = sellPending;
  $('rvEquip').onclick = equipPending;
}
function closeReveal() {
  $('reveal').classList.add('hidden');
  if (pendingItem && !pendingItem.pet) S.pending = null;
  pendingItem = null;
  if (revealQueue.length) setTimeout(() => showReveal(revealQueue.shift()), 150);
}
function sellPending() {
  const it = pendingItem; if (!it) return;
  S.gold += sellValue(it);
  Sfx.sell();
  const r = $('rvSell').getBoundingClientRect();
  for (let i = 0; i < 5; i++) fly(COIN_HTML, r.left + r.width / 2, r.top, $('goldBox'), { delay: i * 50, dur: 600, onEnd: () => bump('goldBox') });
  closeReveal(); save();
}
function equipPending() {
  const it = pendingItem; if (!it) return;
  const cur = S.equipped[it.slot];
  if (cur) S.gold += sellValue(cur);
  const ir = $('rvIcon').getBoundingClientRect();
  S.equipped[it.slot] = it;
  closeReveal();
  Sfx.equip();
  afterEquip(it, ir.left + ir.width / 2, ir.top + ir.height / 2);
  save();
}
function afterEquip(it, x, y) {
  if (curTab !== 'gear') setTab('gear');
  const target = $('slot-' + it.slot);
  fly(`<div style="width:64px;height:64px;margin:-21px">${itemIconSVG(it.slot, it.r)}</div>`, x, y, target, { dur: 450, onEnd: () => renderGear(it.slot) });
  renderStats();
  Bus.emit('gearChanged');
}

// ---------- Usta Kalfa ----------
let autoTimer = 0;
function stopAuto() { S.auto = false; updateAutoUI(); }
function updateAutoUI() {
  $('autoBtn').classList.toggle('on', S.auto);
  $('autoState').textContent = S.auto ? 'ÇALIŞIYOR' : 'KAPALI';
  $('autoSub').textContent = S.auto ? 'Durdur' : 'Otomatik döv';
}
function openAutoModal() {
  if (S.auto) { stopAuto(); return; }
  const opts = RARITIES.map((r, i) => `<option value="${i}" ${i === S.autoKeepRarity ? 'selected' : ''}>${r.name} ve üstü çıkınca</option>`).join('')
    + `<option value="6" ${S.autoKeepRarity >= 6 ? 'selected' : ''}>Hiç durma</option>`;
  openModal(`<h2>⚒ Usta Kalfa</h2>
    <p class="muted">Kalfa senin yerine döver. Gücünü artıran eşyayı kendisi kuşanır, eskisini ve işe yaramayanları satar. Oyun kapalıyken de biriken çekiçleri döver.</p>
    <label class="check"><input type="checkbox" id="autoEq" ${S.autoEquip ? 'checked' : ''}> Daha güçlüsünü kendisi kuşansın</label>
    <div class="row"><span>Durup bana göster:</span><select id="keepSel">${opts}</select></div>
    <div class="actions"><button class="btn btn-sell" id="aCancel">VAZGEÇ</button><button class="btn btn-equip" id="aStart">BAŞLAT</button></div>`);
  $('aCancel').onclick = closeModal;
  $('aStart').onclick = () => {
    S.autoKeepRarity = +$('keepSel').value; S.autoEquip = $('autoEq').checked; S.auto = true;
    closeModal(); updateAutoUI(); Sfx.init(); save();
    if (S.hammers < 1) toast('Çekiç yok. Kalfa yeni çekiç gelince dövecek.');
  };
}

// ---------- Yoldaşlar ----------
let pendingHatches = [];
function petDesc(p, lvl) {
  const v = petBonusValue(p, lvl);
  return `${SUBSTATS[p.bonus].name} +${v.toFixed(1)}${SUBSTATS[p.bonus].unit} · Saldırı gücü %${Math.round(petDmgPct(p, lvl) * 100)}`;
}
function renderPets() {
  const el = $('tab-pets');
  const ap = S.activePet ? PET_BY_ID[S.activePet] : null;
  const now = Date.now();
  const active = ap ? `<div class="pet-active">
      <div class="pet-portrait" style="--rc:${RARITIES[ap.r].color}">${petIconSVG(ap.id)}</div>
      <div><h3 style="color:${RARITIES[ap.r].color}">${ap.name}</h3>
      <p>${RARITIES[ap.r].name} · Seviye <b>${S.pets[ap.id].lvl}</b>/${PET_MAX_LVL}</p>
      <p>${petDesc(ap, S.pets[ap.id].lvl)}</p>
      <p>Her ${PET_INTERVAL} sn'de bir saldırır. Aynı yoldaştan tekrar çıkarsa seviye atlar.</p></div></div>`
    : `<div class="pet-active"><div class="pet-portrait" style="--rc:#3a5487">${eggIconSVG(0)}</div><div><h3>Yoldaşın yok</h3>
      <p>Bosslar yumurta düşürür; normal düşmanlardan da nadiren çıkar. Pazardan da alabilirsin.</p></div></div>`;
  const inc = Array.from({ length: INCUBATORS }, (_, i) => {
    const x = S.incub[i];
    if (!x) return `<div class="inc-slot"><small>Boş kuluçka</small></div>`;
    const total = hatchTime(x.r) * 1000, left = Math.max(0, x.end - now);
    return `<div class="inc-slot">${eggIconSVG(x.r)}<div style="flex:1"><b style="color:${RARITIES[x.r].color}">${RARITIES[x.r].name} Yumurta</b>
      <small data-inc="${i}">⏳ ${fmtTime(left / 1000)}</small><div class="inc-bar"><div data-incbar="${i}" style="width:${(1 - left / total) * 100}%"></div></div></div></div>`;
  }).join('');
  const eggs = S.eggs.length ? S.eggs.map((e) => `<div class="egg" title="${RARITIES[e.r].name} yumurta">${eggIconSVG(e.r)}</div>`).join('') : '<span class="muted">Sırada yumurta yok</span>';
  const cost = eggCost();
  const grid = PETS.map((p) => {
    const lvl = petLvl(p.id);
    return `<button class="pet-card ${lvl ? '' : 'locked'} ${S.activePet === p.id ? 'active' : ''}" data-pet="${p.id}" style="--rc:${RARITIES[p.r].color}" title="${p.name}">
      ${petIconSVG(p.id, !lvl)}${lvl ? `<span class="lv">Sv.${lvl}</span>` : ''}</button>`;
  }).join('');
  el.innerHTML = `${active}
    <div class="sec-title"><span>KULUÇKA</span><span>${S.eggs.length}/${EGG_INV_MAX} yumurta sırada</span></div>
    <div class="incub">${inc}</div>
    <div class="egg-row">${eggs}</div>
    <div class="sec-title"><span>YUMURTA PAZARI</span><button class="small-btn" id="buyEgg" ${S.gold < cost || S.eggs.length >= EGG_INV_MAX ? 'disabled' : ''}>YUMURTA AL · ${fmt(cost)} 🪙</button></div>
    <div class="sec-title"><span>YOLDAŞLAR</span><span>${Object.keys(S.pets).length}/${PETS.length}</span></div>
    <div class="pet-grid">${grid}</div>`;
  $('buyEgg').onclick = () => {
    const c = eggCost();
    if (S.gold < c || S.eggs.length >= EGG_INV_MAX) return;
    S.gold -= c; S.eggsBought++;
    const r = rollEgg(false);
    addEgg(r); Sfx.pop();
    toast(`🥚 <b style="color:${RARITIES[r].color}">${RARITIES[r].name}</b> yumurta alındı`);
    save(); renderPets();
  };
  el.querySelectorAll('.pet-card').forEach((b) => b.onclick = () => showPetDetail(b.dataset.pet));
}
function updatePetTimers() {
  if (curTab !== 'pets') return;
  const now = Date.now();
  S.incub.forEach((x, i) => {
    const t = document.querySelector(`[data-inc="${i}"]`), bar = document.querySelector(`[data-incbar="${i}"]`);
    if (!t) return;
    const left = Math.max(0, x.end - now);
    t.textContent = '⏳ ' + fmtTime(left / 1000);
    bar.style.width = (1 - left / (hatchTime(x.r) * 1000)) * 100 + '%';
  });
}
function showPetDetail(id) {
  const p = PET_BY_ID[id], lvl = petLvl(id);
  openModal(`<div class="item-detail"><div class="pet-portrait" style="--rc:${RARITIES[p.r].color}">${petIconSVG(id, !lvl)}</div>
    <div><h2 style="color:${RARITIES[p.r].color}">${p.name}</h2><div class="muted">${RARITIES[p.r].name} yoldaş${lvl ? ` · Seviye ${lvl}/${PET_MAX_LVL}` : ' · henüz bulunmadı'}</div>
    <p style="margin:8px 0 0">${petDesc(p, Math.max(1, lvl))}</p></div></div>
    <div class="actions"><button class="btn btn-sell" id="mClose">KAPAT</button>${lvl && S.activePet !== id ? '<button class="btn btn-equip" id="mUse">YANINA AL</button>' : ''}</div>`);
  $('mClose').onclick = closeModal;
  const u = $('mUse');
  if (u) u.onclick = () => { S.activePet = id; closeModal(); Bus.emit('petChanged'); renderPets(); renderStats(); Sfx.equip(); save(); };
}
function showPetReveal(h) {
  const p = h.pet, rar = RARITIES[p.r];
  const el = $('reveal');
  el.style.setProperty('--rc', rar.color);
  el.innerHTML = `<div class="rays"></div>
    <div class="rv-top"><div class="rv-rarity">${h.dup ? 'SEVİYE ATLADI!' : 'YENİ YOLDAŞ!'}</div>
    <div class="rv-icon" id="rvIcon">${petIconSVG(p.id)}</div>
    <div class="rv-name" style="color:${rar.color}">${p.name}<small>${rar.name} · Seviye ${h.lvl}</small></div></div>
    <div class="rv-panel"><div class="subs" style="justify-content:center"><span>${petDesc(p, h.lvl)}</span></div>
    <div class="hint">${S.activePet === p.id ? 'Yanında savaşıyor.' : 'Yoldaş sekmesinden yanına alabilirsin.'}</div>
    <div class="actions"><button class="btn btn-equip" id="pOk">HARİKA!</button></div></div>`;
  el.classList.remove('hidden');
  pendingItem = { pet: true };
  Sfx.reveal(p.r); if (p.r >= 3) { screenFlash(); bodyShake(); }
  $('pOk').onclick = () => { closeReveal(); Bus.emit('petChanged'); renderStats(); if (curTab === 'pets') renderPets(); showNextHatch(); };
}
function showNextHatch() {
  if (pendingItem || !pendingHatches.length) return;
  showPetReveal(pendingHatches.shift());
}

// ---------- Modallar ----------
function openModal(html, kind = '') {
  $('modalCard').innerHTML = html;
  $('modalCard').dataset.kind = kind;
  $('modal').classList.remove('hidden');
}
function closeModal() { $('modal').classList.add('hidden'); $('modalCard').dataset.kind = ''; }
$('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && $('modalCard').dataset.kind !== 'report') closeModal(); });

function showItemDetail(it) {
  const rar = RARITIES[it.r];
  const plus = it.plus || 0;
  const main = it.atk != null ? `⚔ Hasar <b>+${fmt(itemMain(it))}</b>` : `❤ Can <b>+${fmt(itemMain(it))}</b>`;
  const subs = Object.entries(it.subs).map(([k, v]) => `<span>${SUBSTATS[k].name} <b>${fmtSub(k, v)}</b></span>`).join('');
  const cost = enhanceCost(it);
  const equipped = S.equipped[it.slot] === it;
  openModal(`<div style="--rc:${rar.color}">
    <div class="item-detail"><div class="rv-icon">${itemIconSVG(it.slot, it.r)}</div>
      <div><h2 style="color:${rar.color}">${itemName(it)}${plus ? ` <span style="color:#fff">+${plus}</span>` : ''}</h2>
      <div class="muted">${SLOT_BY_ID[it.slot].name} · Seviye ${it.lvl} · satış ${fmt(sellValue(it))} altın</div>
      <div style="margin-top:8px;font-size:16px">${main}</div></div></div>
    ${subs ? `<div class="subs">${subs}</div>` : '<p class="muted">Ek özellik yok.</p>'}
    ${equipped ? `<p class="muted">Bileme ana değeri her seviyede %${Math.round(ENHANCE_STEP * 100)} artırır. Eşyayı değiştirince bileme gider.</p>` : ''}
    <div class="actions"><button class="btn btn-sell" id="mClose">KAPAT</button>
      ${equipped ? `<button class="btn btn-gold" id="mEnh" ${S.gold < cost ? 'disabled' : ''}>BİLE +${plus + 1}<small>${fmt(cost)} altın</small></button>` : ''}</div></div>`);
  $('mClose').onclick = closeModal;
  const e = $('mEnh');
  if (e) e.onclick = () => {
    if (S.gold < enhanceCost(it)) return;
    S.gold -= enhanceCost(it); it.plus = plus + 1;
    Sfx.clang(); Embers.burst(20);
    renderGear(it.slot); renderStats(); save(); showItemDetail(it);
  };
}
function oddsTable(L) {
  const cur = rarityOdds(L), nxt = L < MAX_FORGE ? rarityOdds(L + 1) : null;
  return `<table class="odds">` + RARITIES.map((r, i) => `<tr>
    <td style="color:${r.color}">${r.name}</td>
    <td style="width:40%"><div class="bar-mini"><div style="width:${cur[i]}%;background:${r.color}"></div></div></td>
    <td>${cur[i].toFixed(1)}%</td>
    ${nxt ? `<td class="${nxt[i] > cur[i] + 0.01 ? 'up' : nxt[i] < cur[i] - 0.01 ? 'down' : 'muted'}">${nxt[i] > cur[i] + 0.01 ? '▲' : nxt[i] < cur[i] - 0.01 ? '▼' : ''} ${nxt[i].toFixed(1)}%</td>` : ''}
  </tr>`).join('') + '</table>';
}
function showForgeModal() {
  const L = S.forgeLevel, cost = forgeUpgradeCost(L);
  const busy = S.forgeUpgradeEnd && S.forgeUpgradeEnd > Date.now();
  openModal(`<h2>🔥 Ocak · Seviye ${L}</h2>
    <p class="muted">Ocak yükseldikçe nadir eşya ve nadir yumurta şansı artar. Yükseltme oyun kapalıyken de sürer.</p>
    ${oddsTable(L)}
    ${L >= MAX_FORGE ? '<p class="muted">Ocak en üst seviyede.</p>' : busy
      ? `<div class="timer-big" id="fTime">⏳ ${fmtTime((S.forgeUpgradeEnd - Date.now()) / 1000)}</div>`
      : `<p class="muted">Yükseltme süresi: ${fmtTime(forgeUpgradeTime(L))} · ${MAX_FORGE - L} seviye kaldı</p>`}
    <div class="actions"><button class="btn btn-sell" id="fClose">KAPAT</button>
      ${L < MAX_FORGE && !busy ? `<button class="btn btn-gold" id="fUp" ${S.gold < cost ? 'disabled' : ''}>YÜKSELT<small>${fmt(cost)} altın</small></button>` : ''}
      ${busy ? `<button class="btn btn-gold" id="fRush" ${S.gold < forgeRushCost() ? 'disabled' : ''}>HEMEN BİTİR<small>${fmt(forgeRushCost())} altın</small></button>` : ''}</div>`, 'forge');
  $('fClose').onclick = closeModal;
  const rush = $('fRush');
  if (rush) rush.onclick = () => {
    const rc = forgeRushCost();
    if (S.gold < rc) return;
    S.gold -= rc; S.forgeUpgradeEnd = Date.now() - 1; checkForgeUpgrade(); showForgeModal();
  };
  const up = $('fUp');
  if (up) up.onclick = () => {
    if (S.gold < cost) return;
    S.gold -= cost; S.forgeUpgradeEnd = Date.now() + forgeUpgradeTime(L) * 1000;
    Sfx.equip(); save(); showForgeModal();
  };
}
function checkForgeUpgrade() {
  if (S.forgeUpgradeEnd && Date.now() >= S.forgeUpgradeEnd) {
    S.forgeUpgradeEnd = 0; S.forgeLevel++;
    Sfx.levelUp();
    toast(`🔥 Ocak seviye ${S.forgeLevel} oldu! Nadir eşya şansı arttı.`);
    restartAnim($('forgeFlash'), 'on'); Embers.burst(50, true);
    save();
    if (!$('modal').classList.contains('hidden') && $('modalCard').dataset.kind === 'forge') showForgeModal();
  }
}
function showHelp() {
  openModal(`<h2>Nasıl Oynanır?</h2><div class="help">
    <p>Sen bir <b>Ahi ustasısın</b>. Ocağında dövdüğün silahlarla akıncın Söğüt'ten Kaf Dağı'na kadar masal yaratıklarıyla savaşır.</p>
    <p><b>DÖV</b>: 1 çekiç harcar, rastgele bir eşya çıkar. Daha güçlüyse kuşan, değilse sat.</p>
    <p><b>Çekiç kıttır</b>: aşamayı ilk kez geçince +${FIRST_CLEAR_HAMMERS}, bossu ilk kez yenince +${FIRST_BOSS_HAMMERS} çekiç verir. Düşmanlardan %${Math.round(HAMMER_DROP_CHANCE * 100)} ihtimalle düşer, ocak ${HAMMER_REGEN_SEC} sn'de bir 1 çekiç yeniler (en fazla ${HAMMER_REGEN_CAP}). Yani ilerledikçe dövebilirsin.</p>
    <p><b>Usta Kalfa</b>: otomatik döver, daha güçlüsünü kendisi kuşanır.</p>
    <p><b>Ocak</b>: altınla yükselt, nadir eşya şansı artar.</p>
    <p><b>Yoldaşlar</b>: yumurtalar kuluçkada zamanla çatlar. Yoldaş yanında savaşır ve bir özellik verir. Aynısı çıkarsa seviye atlar.</p>
    <p><b>Kapalıyken</b>: akıncı %80 verimle savaşmaya devam eder (en fazla 12 saat). Açık oynamak %25 daha kârlıdır.</p>
    <p>Kısayollar: Boşluk döv · A Usta Kalfa · E kuşan · S sat · M ses</p></div>
    <div class="actions"><button class="btn btn-equip" id="mClose">ANLADIM</button></div>`);
  $('mClose').onclick = closeModal;
}
function showSettings() {
  openModal(`<h2>⚙ Ayarlar</h2>
    <p class="muted">Oyun tarayıcıda otomatik kaydedilir.</p>
    <p class="muted">Toplam dövülen: <b>${S.totalForged}</b> · Yenilen düşman: <b>${fmt(S.totalKills)}</b> · En iyi: <b style="color:${RARITIES[S.bestRarity].color}">${RARITIES[S.bestRarity].name}</b> · En ileri aşama: <b>${stageLabel(S.maxStage)}</b> · Berat: <b>${S.berat}</b></p>
    <label class="check"><input type="checkbox" id="sRetry" ${S.autoRetry ? 'checked' : ''}> Takılınca kendiliğinden yeniden dene (90 sn'de bir ya da güç %10 artınca)</label>
    <div class="actions"><button class="btn btn-sell" id="sReset" style="color:var(--bad)">SIFIRLA</button><button class="btn btn-equip" id="sClose">KAPAT</button></div>`);
  $('sClose').onclick = closeModal;
  $('sRetry').onchange = (e) => { S.autoRetry = e.target.checked; save(); };
  $('sReset').onclick = () => {
    if (!confirm('Tüm ilerleme silinsin mi?')) return;
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_SAVE_KEY); } catch (e) { /* yok say */ }
    S = defaultState(); closeModal(); renderGear(); renderStats(); updateAutoUI(); Bus.emit('gearChanged'); Bus.emit('petChanged'); startStage();
  };
}
// ---------- Ahilik Beratı (prestij) ----------
const beratBtn = document.createElement('button');
beratBtn.className = 'icon-btn berat-btn hidden'; beratBtn.id = 'beratBtn'; beratBtn.title = 'Ahilik Beratı'; beratBtn.textContent = '📜';
$('muteBtn').before(beratBtn);
function updateBeratBtn() {
  const g = beratGain();
  beratBtn.classList.toggle('hidden', !(g > 0 || S.berat > 0));
  beratBtn.classList.toggle('ready', g > 0);
}
function showBerat() {
  const g = beratGain();
  const next = S.maxStage < BERAT_MIN_STAGE ? BERAT_MIN_STAGE : 20 + (S.berat + g + 1) * 4;
  openModal(`<h2>📜 Ahilik Beratı</h2>
    <p class="muted">Usta olmanın yolu yeniden başlamaktan geçer. Berat alınca aşama, altın, çekiç ve teçhizat sıfırlanır. <b>Ocak seviyesi, yoldaşlar ve yumurtalar kalır.</b> Her berat puanı kalıcı olarak <b>+%${Math.round(BERAT_BONUS * 100)} hasar ve can</b>, <b>+%3 ganimet</b> verir.</p>
    <div class="rep-grid"><div><small>Şu anki berat</small><b>${S.berat}</b></div><div><small>Bu turda kazanılacak</small><b style="color:var(--gold)">+${g}</b></div></div>
    <p class="muted">Bir sonraki puan için en ileri aşama: <b>${stageLabel(next)}</b></p>
    <div class="actions"><button class="btn btn-sell" id="bClose">KAPAT</button>
      <button class="btn btn-gold" id="bTake" ${g > 0 ? '' : 'disabled'}>BERAT AL<small>+${g} puan</small></button></div>`);
  $('bClose').onclick = closeModal;
  $('bTake').onclick = () => {
    if (!confirm(`Berat alınca ilerleme sıfırlanacak, +${g} kalıcı puan kazanacaksın. Emin misin?`)) return;
    takeBerat();
    closeModal(); revealQueue.length = 0; pendingItem = null; $('reveal').classList.add('hidden');
    renderGear(); renderStats(); updateAutoUI(); Bus.emit('gearChanged'); Bus.emit('petChanged'); lastTheme = -1; startStage(); save();
    banner(`BERAT ALINDI!<small>KALICI GÜÇ +%${Math.round(S.berat * BERAT_BONUS * 100)}</small>`, 'gold'); screenFlash(); Sfx.levelUp();
  };
}
beratBtn.onclick = showBerat;

function toggleMute() { S.muted = !S.muted; $('muteBtn').textContent = S.muted ? '🔇' : '🔊'; save(); }

// ---------- Çevrimdışı rapor ----------
function showOfflineReport(rep) {
  const list = [];
  const li = (icon, html) => list.push(`<li>${icon}<span>${html}</span></li>`);
  if (rep.stageTo !== rep.stageFrom) li('🗺', `Aşama <b>${stageLabel(rep.stageFrom)}</b> → <b>${stageLabel(rep.stageTo)}</b>`);
  if (rep.powerTo > rep.powerFrom) li('⚡', `Güç <b>${fmt(rep.powerFrom)}</b> → <b>${fmt(rep.powerTo)}</b>`);
  if (rep.forgeTo > rep.forgeFrom) li('🔥', `Ocak yükseltmesi bitti: <b>Sv. ${rep.forgeTo}</b>`);
  rep.pets.slice(0, 3).forEach((h) => li(petIconSVG(h.pet.id), `${h.dup ? 'Seviye atladı' : 'Yumurtadan çıktı'}: <b style="color:${RARITIES[h.pet.r].color}">${h.pet.name}</b> Sv.${h.lvl}`));
  if (rep.pets.length > 3) li('🥚', `ve ${rep.pets.length - 3} yoldaş daha`);
  if (rep.forged) li('⚒', `Usta Kalfa <b>${rep.forged}</b> eşya dövdü, <b>${rep.equipped.length}</b> tanesi hâlâ üstünde, <b>${rep.sold}</b> tanesini sattı (+${fmt(rep.soldGold)} altın)`);
  if (rep.equipped.length) li(rep.equipped.slice(0, 4).map((it) => itemIconSVG(it.slot, it.r)).join(''), 'Yeni kuşanılanlar');
  if (rep.stopItem) li(itemIconSVG(rep.stopItem.slot, rep.stopItem.r), `Senin için ayırdı: <b style="color:${RARITIES[rep.stopItem.r].color}">${itemName(rep.stopItem)}</b>`);
  if (rep.eggsSold) li('🪙', `Kuluçka sırası dolu olduğu için ${rep.eggsSold} yumurta altına çevrildi`);
  if (!S.autoAdvance && rep.kills) li('⚠', `<b>${stageLabel(rep.stageTo)}</b> aşamasında takıldı, ganimet topluyor`);
  openModal(`<div class="report"><h2>Sen Yokken…</h2>
    <div class="away">${fmtTime(rep.away)} uzaktaydın${rep.capped ? ' (en fazla 12 saat sayılır)' : ''}</div>
    <div class="eff"><span>Çevrimdışı verim %${Math.round(rep.eff * 100)}</span><span>Çevrimiçi %100</span></div>
    <div class="rep-grid">
      <div><small>Yenilen düşman</small><b>${fmt(rep.kills)}</b>${rep.bosses ? ` <small>${rep.bosses} boss</small>` : ''}</div>
      <div><small>Altın</small><b style="color:var(--gold)">+${fmt(rep.gold)}</b></div>
      <div><small>Çekiç</small><b>+${fmt(rep.hammers + rep.regen)}</b></div>
      <div><small>Yumurta</small><b>+${rep.eggs}</b></div>
    </div>
    <ul class="rep-list">${list.join('')}</ul>
    <div class="actions sticky-actions"><button class="btn btn-equip" id="repOk">DEVAM ET</button></div></div>`, 'report');
  Sfx.levelUp();
  $('repOk').onclick = () => {
    closeModal();
    renderGear(); renderStats(); Bus.emit('gearChanged'); Bus.emit('petChanged');
    if (S.pending) showReveal(S.pending);
  };
}
function runOffline(awaySec) {
  if (awaySec < 60) return;
  const rep = simulateOffline(awaySec);
  updateAutoUI();
  startStage();
  save();
  if (awaySec >= 300) showOfflineReport(rep);
  else {
    toast(`Sen yokken: +${fmt(rep.gold)} altın, +${rep.hammers + rep.regen} çekiç, ${fmt(rep.kills)} düşman`);
    renderGear(); renderStats(); Bus.emit('gearChanged');
    if (S.pending && !pendingItem) showReveal(S.pending);
  }
}


// ---------- Savaş olaylarına tepkiler ----------
let lastTheme = -1;
Bus.on('stageStart', ({ stage }) => {
  const ti = Math.floor(stage / 10);
  if (ti !== lastTheme) {
    if (lastTheme !== -1) banner(`${upper(themeName(stage))}<small>BÖLÜM ${ti + 1}</small>`, 'gold');
    lastTheme = ti;
  }
  updateStageUI();
});
Bus.on('enemySpawn', () => updateStageUI());
Bus.on('heroHit', ({ crit }) => Sfx.hit(crit));
Bus.on('petHit', () => setTimeout(() => Sfx.hit(false), 220));
Bus.on('enemyHit', ({ dodged }) => { if (dodged) Sfx.dodge(); else Sfx.hurt(); });
Bus.on('bossIntro', (e) => { banner(`BOSS!<small>${upper(e.name)}</small>`, 'red'); Sfx.boss(); bodyShake(); });
Bus.on('enemyKilled', ({ gold, hammers, boss, egg, eggSold }) => {
  Sfx.enemyDie();
  updateStageUI();
  const p = battleToViewport(Scene3D.enemyScreen());
  disp.gold = Math.min(disp.gold, S.gold - gold);
  const coins = boss ? 12 : 4;
  for (let i = 0; i < coins; i++) fly(COIN_HTML, p.x, p.y, $('goldBox'), { delay: 120 + i * 45, dur: 700, onEnd: () => { bump('goldBox'); if (i % 2 === 0) Sfx.coin(); } });
  for (let i = 0; i < hammers; i++) fly(HAM_HTML, p.x, p.y, $('hammerBox'), { delay: 200 + i * 60, dur: 800, onEnd: () => bump('hammerBox') });
  if (egg != null) {
    fly(`<div style="width:40px;height:40px;margin:-9px">${eggIconSVG(egg)}</div>`, p.x, p.y, document.querySelector('[data-tab="pets"]'), { delay: 250, dur: 900 });
    toast(eggSold ? `🥚 Yumurta sırası dolu (${EGG_INV_MAX}), yumurta altına çevrildi.`
      : `🥚 <b style="color:${RARITIES[egg].color}">${RARITIES[egg].name}</b> yumurta düştü! Kuluçka sırasına kondu.`);
    if (curTab === 'pets') renderPets();
  }
});
Bus.on('stageClear', ({ boss, stage, bonus }) => {
  Sfx.clear();
  const extra = bonus ? `+${bonus} ÇEKİÇ` : '';
  if (boss) { banner(`BÖLÜM ${Math.floor(stage / 10) + 1} TAMAM!<small>${extra || 'ZAFER'}</small>`, 'gold'); screenFlash(); }
  else banner(`AŞAMA ${stageLabel(stage)}<small>${extra || 'TAMAMLANDI'}</small>`);
  if (bonus) { const r = $('battleWrap').getBoundingClientRect(); for (let i = 0; i < Math.min(bonus, 8); i++) fly(HAM_HTML, r.left + r.width / 2, r.top + r.height * 0.45, $('hammerBox'), { delay: 300 + i * 70, dur: 800, onEnd: () => bump('hammerBox') }); }
});
Bus.on('heroDied', ({ timeout }) => { Sfx.lose(); banner(timeout ? 'SÜRE DOLDU!<small>BOSS KAÇTI</small>' : 'YENİLDİN!<small>GERİ ÇEKİLİYORSUN</small>', 'red'); });
Bus.on('retreat', () => toast(S.autoRetry ? 'Geri çekildin. Güçlenince akıncı kendiliğinden yeniden dener.' : 'Daha güçlü eşya döv ya da yoldaş edin, sonra İLERLE ⚔ butonuna bas.'));

// ---------- Girdi ----------
$('forgeBtn').onclick = () => forge();
$('autoBtn').onclick = openAutoModal;
$('forgeLvlBtn').onclick = showForgeModal;
$('settingsBtn').onclick = showSettings;
$('helpBtn').onclick = showHelp;
$('allStatsBtn').onclick = showAllStats;
$('muteBtn').onclick = toggleMute;
$('advanceBtn').onclick = () => { Sfx.init(); challengeNext(); };
document.addEventListener('pointerdown', () => Sfx.init(), { once: true });
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  if (e.repeat && e.code !== 'Space') return;
  const k = e.key.toLocaleLowerCase('tr-TR');
  const modalOpen = !$('modal').classList.contains('hidden');
  if (e.code === 'Space') { e.preventDefault(); if (!pendingItem && !modalOpen) forge(); }
  else if (pendingItem && !pendingItem.pet && k === 'e') equipPending();
  else if (pendingItem && !pendingItem.pet && k === 's') sellPending();
  else if (k === 'a' && !pendingItem && !modalOpen) { if (S.auto) stopAuto(); else { S.auto = true; updateAutoUI(); Sfx.init(); toast(`⚒ Usta Kalfa çalışıyor · ${S.autoKeepRarity >= 6 ? 'hiç durmaz' : RARITIES[S.autoKeepRarity].name + '+ çıkınca durur'}`); } }
  else if (k === 'm') toggleMute();
  else if (k === 'escape' && $('modalCard').dataset.kind !== 'report') closeModal();
});

// ---------- Ana döngü ----------
let last = performance.now(), slowAcc = 0, saveAcc = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (S.hammers < HAMMER_REGEN_CAP) {
    S.hammerAcc += dt;
    if (S.hammerAcc >= HAMMER_REGEN_SEC) { S.hammerAcc -= HAMMER_REGEN_SEC; S.hammers++; }
  } else S.hammerAcc = 0;
  if (S.auto && !pendingItem && !forgeBusy && $('modal').classList.contains('hidden')) {
    autoTimer -= dt;
    if (autoTimer <= 0 && S.hammers >= 1) { autoTimer = 0.45; autoForgeStep(); }
  }
  updateBattle(dt);
  Scene3D.update(dt);
  Embers.update(dt);
  updateHUD();
  updateTop(dt);
  updateTop(dt);
  // Takıldıysa kendiliğinden yeniden dene
  if (!S.autoAdvance && S.autoRetry && B.state === 'walk' && !frozen) {
    retryT += dt;
    if (retryT >= 90 || heroPower() >= S.stuckPower * 1.1) {
      retryT = 0;
      toast('⚔ Akıncı yeniden deniyor…');
      challengeNext();
    }
  }
  slowAcc += dt; saveAcc += dt;
  if (slowAcc > 0.5) {
    slowAcc = 0;
    checkForgeUpgrade();
    updateBeratBtn();
    const hatched = processIncubators(Date.now());
    if (hatched.length) { pendingHatches.push(...hatched); if (curTab === 'pets') renderPets(); save(); }
    if ($('modal').classList.contains('hidden')) showNextHatch();
    updatePetTimers();
    const ft = $('fTime');
    if (ft) ft.textContent = '⏳ ' + fmtTime((S.forgeUpgradeEnd - Date.now()) / 1000);
  }
  if (saveAcc > 5) { saveAcc = 0; save(); }
  if (!frozen) requestAnimationFrame(loop);
}
let retryT = 0;
Bus.on('retreat', () => { S.stuckPower = heroPower(); retryT = 0; });

// Gizlenince zamanı kaydet; sekme gizliyken kapanırsa da süre kaybolmasın
function markHidden() { if (frozen) return; S.hiddenAt = S.hiddenAt || Date.now(); save(); }
window.addEventListener('beforeunload', () => { if (!frozen) save(); });
window.addEventListener('pagehide', markHidden);
document.addEventListener('visibilitychange', () => {
  if (frozen) return;
  if (document.hidden) markHidden();
  else if (S.hiddenAt) {
    const away = (Date.now() - S.hiddenAt) / 1000;
    S.hiddenAt = 0; last = performance.now();
    runOffline(away);
  }
});

// Aynı oyun iki sekmede açılırsa eski sekme durur (kayıtlar birbirini ezmesin)
let frozen = false;
try {
  const bc = new BroadcastChannel('ahi-ocagi');
  const myId = Math.random().toString(36).slice(2);
  bc.onmessage = (e) => {
    if (e.data && e.data.t === 'hello' && e.data.id !== myId && !frozen) {
      save(); frozen = true;
      window.save = () => {};
      openModal(`<h2>Oyun başka sekmede açıldı</h2><p class="muted">İlerlemen korunsun diye bu sekme durduruldu. Diğer sekmeden devam edebilir ya da burada yenileyebilirsin.</p>
        <div class="actions"><button class="btn btn-equip" onclick="location.reload()">BURADA DEVAM ET</button></div>`, 'report');
    }
  };
  bc.postMessage({ t: 'hello', id: myId });
} catch (e) { /* BroadcastChannel yok */ }

// ---------- Başlat ----------
const awaySec = (() => {
  let had = false;
  try { had = !!(localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY)); } catch (e) { /* yok */ }
  load();
  if (!had) return 0;
  const left = S.hiddenAt && S.hiddenAt < S.lastSeen ? S.hiddenAt : S.lastSeen;
  S.hiddenAt = 0;
  return (Date.now() - left) / 1000;
})();
disp.gold = S.gold; disp.power = heroPower();
$('muteBtn').textContent = S.muted ? '🔇' : '🔊';
renderGear(); renderStats(); updateAutoUI(); updateBeratBtn();
startStage();
if (awaySec >= 60) runOffline(awaySec);
else if (S.pending) showReveal(S.pending);
else if (!S.totalForged) setTimeout(showHelp, 500);
requestAnimationFrame(loop);