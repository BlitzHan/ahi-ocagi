'use strict';
/* Elle çizilmiş SVG eşya ikonları. Renkler nadirliğe göre değişir. */

let _iconUid = 0;
function itemIconSVG(slotId, r, opts = {}) {
  const rar = r == null ? { color: '#6a6488', dark: '#3a3550' } : RARITIES[r];
  const u = 'ic' + (++_iconUid);
  const C = rar.color, D = rar.dark;
  const O = '#1b1530'; // kontur
  const sw = 3;
  const metal = `url(#${u}m)`, main = `url(#${u}c)`;
  const defs = `<defs>
    <linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#cfd6e2"/><stop offset="1" stop-color="#7d8597"/></linearGradient>
    <linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighten(C, .35)}"/><stop offset=".55" stop-color="${C}"/><stop offset="1" stop-color="${D}"/></linearGradient>
    <radialGradient id="${u}g" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${lighten(C, .3)}"/><stop offset="1" stop-color="${D}"/></radialGradient>
  </defs>`;
  const gem = `url(#${u}g)`;
  const st = `stroke="${O}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  let body = '';
  switch (slotId) {
    case 'weapon':
      body = `<g transform="rotate(45 32 32)">
        <path d="M40 2 Q44 18 38 42 L26 42 Q34 24 40 2 Z" fill="${metal}" ${st}/>
        <path d="M38 10 Q37 24 32 38" stroke="#ffffff" stroke-width="2" fill="none" opacity=".7"/>
        <rect x="18" y="41" width="28" height="7" rx="3" fill="${main}" ${st}/>
        <rect x="28.5" y="47" width="7" height="11" rx="2" fill="#6b4426" ${st}/>
        <circle cx="32" cy="60" r="4" fill="${gem}" ${st}/>
      </g>`;
      break;
    case 'helmet':
      body = `<path d="M10 40 Q10 9 32 9 Q54 9 54 40 L54 50 L43 50 L43 38 L21 38 L21 50 L10 50 Z" fill="${main}" ${st}/>
        <path d="M14 28 Q18 14 32 13" stroke="#ffffff" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>
        <rect x="28.5" y="34" width="7" height="18" rx="2" fill="${metal}" ${st}/>
        <path d="M10 33 L54 33" stroke="${O}" stroke-width="${sw}"/>
        <path d="M32 9 Q36 0 46 3 Q40 6 38 12" fill="${gem}" ${st}/>`;
      break;
    case 'armor':
      body = `<path d="M17 12 L26 8 Q32 15 38 8 L47 12 L56 25 L47 31 L47 56 L17 56 L17 31 L8 25 Z" fill="${main}" ${st}/>
        <path d="M32 18 L32 54" stroke="${O}" stroke-width="2" opacity=".5"/>
        <path d="M20 22 Q24 18 27 22" stroke="#fff" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>
        <rect x="17" y="43" width="30" height="7" fill="${metal}" ${st}/>
        <circle cx="32" cy="30" r="5" fill="${gem}" ${st}/>`;
      break;
    case 'gloves':
      body = `<path d="M18 30 L18 14 Q18 10 22 10 Q26 10 26 14 L26 26 L26 10 Q26 6 30 6 Q34 6 34 10 L34 26 L34 12 Q34 8 38 8 Q42 8 42 12 L42 30 L46 24 Q50 20 53 24 L46 40 Q42 48 34 48 L24 48 Q18 48 18 40 Z" fill="${main}" ${st}/>
        <rect x="16" y="46" width="30" height="12" rx="3" fill="${metal}" ${st}/>
        <path d="M22 16 L22 22" stroke="#fff" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>
        <circle cx="31" cy="52" r="3.5" fill="${gem}" ${st}/>`;
      break;
    case 'necklace':
      body = `<path d="M12 10 Q14 36 32 40 Q50 36 52 10" fill="none" stroke="${O}" stroke-width="7" stroke-linecap="round"/>
        <path d="M12 10 Q14 36 32 40 Q50 36 52 10" fill="none" stroke="#e8c45a" stroke-width="3.5" stroke-dasharray="4 3" stroke-linecap="round"/>
        <path d="M32 36 L44 48 L32 62 L20 48 Z" fill="${gem}" ${st}/>
        <path d="M32 40 L38 48 L32 56" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>`;
      break;
    case 'ring':
      body = `<circle cx="32" cy="38" r="17" fill="none" stroke="${O}" stroke-width="12"/>
        <circle cx="32" cy="38" r="17" fill="none" stroke="#e8c45a" stroke-width="6"/>
        <path d="M20 30 Q24 24 30 23" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7" stroke-linecap="round"/>
        <path d="M32 8 L42 18 L32 28 L22 18 Z" fill="${gem}" ${st}/>
        <path d="M27 18 L32 13" stroke="#fff" stroke-width="2" opacity=".8" stroke-linecap="round"/>`;
      break;
    case 'boots':
      body = `<path d="M18 6 L38 6 L38 38 L52 44 Q58 47 56 54 L56 58 L14 58 L14 50 Q18 46 18 38 Z" fill="${main}" ${st}/>
        <rect x="15" y="6" width="26" height="9" rx="2" fill="${metal}" ${st}/>
        <path d="M14 52 L56 52" stroke="${O}" stroke-width="${sw}"/>
        <path d="M23 20 L23 34" stroke="#fff" stroke-width="3" opacity=".5" stroke-linecap="round"/>
        <circle cx="30" cy="38" r="3.5" fill="${gem}" ${st}/>`;
      break;
    case 'belt':
      body = `<path d="M4 24 Q32 18 60 24 L60 40 Q32 34 4 40 Z" fill="${main}" ${st}/>
        <path d="M8 27 Q32 22 56 27" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>
        <rect x="21" y="19" width="22" height="24" rx="4" fill="${metal}" ${st}/>
        <rect x="27" y="25" width="10" height="12" rx="2" fill="none" ${st}/>
        <circle cx="32" cy="31" r="3" fill="${gem}" stroke="${O}" stroke-width="2"/>`;
      break;
  }
  const empty = r == null ? 'opacity=".35"' : '';
  return `<svg class="item-svg" viewBox="0 0 64 64" ${empty}>${defs}${body}</svg>`;
}
// Yoldaş portreleri
function petIconSVG(petId, dim) {
  const p = PET_BY_ID[petId];
  const C = p.color, D = darken(C, 0.35), O = '#1b1530';
  const st = `stroke="${O}" stroke-width="3" stroke-linejoin="round"`;
  const eyes = (y, dx, glow) => `<circle cx="${32 - dx}" cy="${y}" r="4" fill="${glow || O}"/><circle cx="${32 + dx}" cy="${y}" r="4" fill="${glow || O}"/>
    <circle cx="${33 - dx}" cy="${y - 1.5}" r="1.4" fill="#fff"/><circle cx="${33 + dx}" cy="${y - 1.5}" r="1.4" fill="#fff"/>`;
  let b = '';
  switch (p.kind) {
    case 'cat':
      b = `<path d="M14 26 L16 8 L28 18 Q32 17 36 18 L48 8 L50 26 Q54 50 32 54 Q10 50 14 26 Z" fill="${C}" ${st}/>
        <path d="M18 14 L20 22 L25 19 Z M46 14 L44 22 L39 19 Z" fill="#ffb3c0"/>
        <circle cx="25" cy="32" r="4.5" fill="#f2c12e" stroke="${O}" stroke-width="2"/><circle cx="39" cy="32" r="4.5" fill="#3a9be8" stroke="${O}" stroke-width="2"/>
        <circle cx="25" cy="32" r="1.8" fill="${O}"/><circle cx="39" cy="32" r="1.8" fill="${O}"/>
        <path d="M30 40 L34 40 L32 43 Z" fill="#ff8aa0"/><path d="M12 40 L24 41 M12 45 L24 43 M52 40 L40 41 M52 45 L40 43" stroke="${O}" stroke-width="1.5"/>`;
      break;
    case 'fox':
      b = `<path d="M10 8 L24 22 L32 20 L40 22 L54 8 L50 34 Q44 52 32 56 Q20 52 14 34 Z" fill="${C}" ${st}/>
        <path d="M14 34 Q22 44 32 56 Q42 44 50 34 Q40 40 32 40 Q24 40 14 34 Z" fill="#fff4e8"/>
        ${eyes(31, 9)}<circle cx="32" cy="50" r="3.5" fill="${O}"/>`;
      break;
    case 'wolf': case 'spirit':
      b = `<path d="M12 6 L24 20 L32 18 L40 20 L52 6 L52 30 Q50 50 32 58 Q14 50 12 30 Z" fill="${C}" ${st}/>
        <path d="M22 38 Q32 34 42 38 Q42 52 32 56 Q22 52 22 38 Z" fill="${darken(C, -0.4)}"/>
        ${eyes(29, 9, p.kind === 'spirit' ? '#ffffff' : null)}<path d="M28 42 L36 42 L32 47 Z" fill="${O}"/>
        ${p.kind === 'spirit' ? `<path d="M32 2 L35 10 L32 8 L29 10 Z" fill="#fff"/>` : ''}`;
      break;
    case 'turtle':
      b = `<ellipse cx="32" cy="22" rx="11" ry="10" fill="#9ad07a" ${st}/>${eyes(21, 5)}
        <path d="M6 48 Q8 26 32 26 Q56 26 58 48 Z" fill="${C}" ${st}/>
        <path d="M22 30 L32 36 L42 30 M32 36 L32 47 M14 42 L22 38 M50 42 L42 38" stroke="${D}" stroke-width="3" fill="none"/>
        <rect x="6" y="46" width="52" height="7" rx="3" fill="#c9a86a" ${st}/>`;
      break;
    case 'bird': case 'phoenix':
      b = `${p.kind === 'phoenix' ? `<path d="M10 40 Q4 20 18 10 Q16 24 24 26 Q22 12 34 4 Q32 18 40 22 Q44 10 56 12 Q46 22 50 34 Z" fill="#ffd23a" ${st}/>` : ''}
        <path d="M12 34 Q12 12 32 12 Q52 12 52 34 Q52 54 32 56 Q12 54 12 34 Z" fill="${C}" ${st}/>
        <path d="M18 40 Q32 30 46 40 Q42 54 32 54 Q22 54 18 40 Z" fill="${darken(C, -0.45)}"/>
        ${eyes(28, 9)}<path d="M26 34 L38 34 L32 44 Z" fill="#ffc21a" ${st}/>`;
      break;
    case 'dragon':
      b = `<path d="M18 16 L14 2 L24 12 M46 16 L50 2 L40 12" stroke="#f0e6c8" stroke-width="5" stroke-linecap="round"/>
        <path d="M12 30 Q12 10 32 10 Q52 10 52 30 L54 44 Q50 56 32 56 Q14 56 10 44 Z" fill="${C}" ${st}/>
        <path d="M20 44 Q32 38 44 44 Q42 54 32 54 Q22 54 20 44 Z" fill="${darken(C, -0.45)}"/>
        ${eyes(27, 10, '#ffd23a')}<circle cx="27" cy="47" r="2" fill="${O}"/><circle cx="37" cy="47" r="2" fill="${O}"/>`;
      break;
  }
  return `<svg class="item-svg" viewBox="0 0 64 64" ${dim ? 'opacity=".3" style="filter:grayscale(1)"' : ''}>${b}</svg>`;
}
function eggIconSVG(r) {
  const rar = RARITIES[r];
  return `<svg class="item-svg" viewBox="0 0 64 64">
    <path d="M32 4 Q52 6 52 38 Q52 60 32 60 Q12 60 12 38 Q12 6 32 4 Z" fill="${rar.color}" stroke="#1b1530" stroke-width="3"/>
    <path d="M14 34 L22 28 L30 36 L38 28 L46 36 L51 31" fill="none" stroke="${rar.dark}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="24" cy="46" r="3" fill="${rar.dark}"/><circle cx="40" cy="48" r="4" fill="${rar.dark}"/><circle cx="34" cy="16" r="2.5" fill="${rar.dark}"/>
    <path d="M22 14 Q26 9 31 9" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/></svg>`;
}
function darken(hex, amt) { return amt < 0 ? lighten(hex, -amt) : (() => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * (1 - amt));
  return '#' + ((1 << 24) + (f(n >> 16) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
})(); }
// Lale logosu
const TULIP_SVG = `<svg viewBox="0 0 64 64" class="tulip"><path d="M32 60 L32 34" stroke="#2f8a3a" stroke-width="4"/><path d="M32 50 Q20 46 16 34 Q28 36 32 46" fill="#3aa64a" stroke="#14111f" stroke-width="2"/>
  <path d="M32 36 Q16 34 16 16 Q22 22 26 18 Q28 8 32 4 Q36 8 38 18 Q42 22 48 16 Q48 34 32 36 Z" fill="#e8233a" stroke="#14111f" stroke-width="3" stroke-linejoin="round"/>
  <path d="M32 8 Q30 20 32 34" stroke="#ff7a8a" stroke-width="2" fill="none"/></svg>`;

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
