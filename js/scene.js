'use strict';
/* Three.js ile 3D savaş sahnesi: çizgi film (toon) görünüm, konturlar, prosedürel animasyon, parçacıklar. */
const Scene3D = (() => {
  THREE.ColorManagement.legacyMode = false;
  const wrap = document.getElementById('battleWrap');
  const canvas = document.getElementById('scene');
  const fxLayer = document.getElementById('fx');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 200);
  const camTarget = new THREE.Vector3(0, 1.1, 0);
  const camBase = new THREE.Vector3(0, 2.3, 8);
  let camZoom = 0, shake = 0, bossK = 0;
  const REDUCE_MOTION = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Malzemeler ----------
  const gradTex = (() => {
    const d = new Uint8Array([70, 150, 255]);
    const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  })();
  function toon(color, extra = {}) {
    const m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradTex }, extra));
    m.userData.baseEm = m.emissive.clone();
    return m;
  }
  const outlineMat = new THREE.ShaderMaterial({
    uniforms: { thickness: { value: 0.022 }, color: { value: new THREE.Color('#1b1530') } },
    vertexShader: 'uniform float thickness; void main(){ vec3 p = position + normal * thickness; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform vec3 color; void main(){ gl_FragColor = vec4(color, 1.0); }',
    side: THREE.BackSide,
  });
  outlineMat.userData.shared = true;
  function part(geo, mat, x = 0, y = 0, z = 0, outline = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    if (outline) m.add(new THREE.Mesh(geo, outlineMat));
    return m;
  }
  function makeCanvasTex(size, draw) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  const glowTex = makeCanvasTex(64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });
  const sparkTex = makeCanvasTex(64, (g, s) => {
    g.translate(s / 2, s / 2);
    const r = g.createRadialGradient(0, 0, 0, 0, 0, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.15, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 4); g.fillRect(-s / 2, -2, s, 4); }
    g.beginPath(); g.arc(0, 0, s / 7, 0, Math.PI * 2); g.fill();
  });
  const smokeTex = makeCanvasTex(64, (g, s) => {
    for (let i = 0; i < 6; i++) {
      const x = s / 2 + rand(-10, 10), y = s / 2 + rand(-10, 10), rr = rand(12, 22);
      const r = g.createRadialGradient(x, y, 0, x, y, rr);
      r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    }
  });

  // ---------- Işıklar ----------
  const hemi = new THREE.HemisphereLight('#ffffff', '#556644', 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e0', 1.25);
  sun.position.set(-4, 9, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 7, bottom: -4, near: 1, far: 30 });
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#9fd0ff', 0.55);
  rim.position.set(5, 4, -6);
  scene.add(rim);

  // ---------- Dünya ----------
  const world = new THREE.Group();
  scene.add(world);
  let decor = [], ambient = null, ambientMode = 'leaves', themeIdx = -1;
  const groundMat = toon('#6cbf4f');
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 80), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const pathMat = toon('#d9b47a');
  const path = new THREE.Mesh(new THREE.PlaneGeometry(160, 2.6), pathMat);
  path.rotation.x = -Math.PI / 2; path.position.y = 0.01;
  path.receiveShadow = true;
  scene.add(path);
  const mountains = new THREE.Group();
  scene.add(mountains);

  function skyTexture(top, bottom) {
    return makeCanvasTex(256, (g, s) => {
      const r = g.createLinearGradient(0, 0, 0, s);
      r.addColorStop(0, top); r.addColorStop(0.75, bottom); r.addColorStop(1, bottom);
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    });
  }
  function clearGroup(g) {
    while (g.children.length) { const c = g.children.pop(); disposeTree(c); }
  }
  function disposeTree(obj) {
    obj.traverse((o) => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => { if (!m.userData.shared) m.dispose(); });
      }
    });
    if (obj.parent) obj.parent.remove(obj);
  }

  function buildTree(th, leafMat, trunkMat, scale) {
    const g = new THREE.Group();
    if (th.tree === 'round') {
      g.add(part(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 7), trunkMat, 0, 0.6, 0, false));
      const n = randInt(2, 3);
      for (let i = 0; i < n; i++) g.add(part(new THREE.IcosahedronGeometry(rand(0.6, 0.9), 0), leafMat, rand(-0.3, 0.3), 1.4 + i * 0.45, rand(-0.3, 0.3), false));
    } else if (th.tree === 'pine') {
      g.add(part(new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6), trunkMat, 0, 0.4, 0, false));
      for (let i = 0; i < 3; i++) g.add(part(new THREE.ConeGeometry(0.9 - i * 0.22, 1.0, 7), leafMat, 0, 1.0 + i * 0.55, 0, false));
    } else if (th.tree === 'shrub') {
      // Bozkır geveni: alçak, dağınık çalı kümesi
      for (let i = 0; i < 5; i++) {
        const s = part(new THREE.IcosahedronGeometry(rand(0.25, 0.45), 0), leafMat, rand(-0.5, 0.5), rand(0.2, 0.4), rand(-0.5, 0.5), false);
        s.scale.y = 0.6; g.add(s);
      }
      g.add(part(new THREE.CylinderGeometry(0.05, 0.08, 0.4, 5), trunkMat, 0, 0.2, 0, false));
    } else if (th.tree === 'cactus') {
      g.add(part(new THREE.CapsuleGeometry(0.22, 1.3, 4, 8), leafMat, 0, 0.85, 0, false));
      const a = part(new THREE.CapsuleGeometry(0.13, 0.5, 4, 8), leafMat, 0.35, 1.1, 0, false); g.add(a);
      const b = part(new THREE.CapsuleGeometry(0.13, 0.4, 4, 8), leafMat, -0.33, 0.9, 0, false); g.add(b);
    } else {
      g.add(part(new THREE.CylinderGeometry(0.08, 0.2, 1.8, 6), trunkMat, 0, 0.9, 0, false));
      for (let i = 0; i < 3; i++) {
        const br = part(new THREE.CylinderGeometry(0.03, 0.07, 0.8, 5), trunkMat, 0, 1.0 + i * 0.3, 0, false);
        br.rotation.z = (i % 2 ? 1 : -1) * rand(0.6, 1.0); br.position.x = (i % 2 ? -0.25 : 0.25);
        g.add(br);
      }
      const em = part(new THREE.IcosahedronGeometry(0.12, 0), leafMat, 0, 1.85, 0, false); g.add(em);
    }
    g.scale.setScalar(scale);
    g.rotation.y = rand(0, Math.PI * 2);
    return g;
  }
  function setTheme(idx) {
    if (idx === themeIdx) return;
    themeIdx = idx;
    const th = THEMES[idx];
    if (scene.background) scene.background.dispose();
    scene.background = skyTexture(th.sky[0], th.sky[1]);
    scene.fog = new THREE.Fog(th.fog, 16, 46);
    groundMat.color.set(th.ground);
    pathMat.color.set(th.path);
    hemi.color.set(th.sky[1]); hemi.groundColor.set(th.ground);
    const dark = idx >= 3;
    hemi.intensity = dark ? 0.75 : 0.95;
    sun.intensity = dark ? 0.8 : 1.25;
    sun.color.set(idx === 3 ? '#ff9a6a' : idx === 4 ? '#b8a6ff' : '#fff4e0');
    rim.color.set(idx === 3 ? '#ff5a2a' : idx === 4 ? '#9a6aff' : '#9fd0ff');
    rim.intensity = dark ? 1.0 : 0.55;

    // Dekor
    decor.forEach((d) => disposeTree(d));
    decor = [];
    const leafMat = toon(th.leaf, idx === 3 ? { emissive: new THREE.Color('#ff4a10'), emissiveIntensity: 0.9 } : idx === 4 ? { emissive: new THREE.Color('#2a1a5a'), emissiveIntensity: 0.6 } : {});
    const trunkMat = toon(th.trunk);
    const rockMat = toon(th.rock);
    const tuftMat = toon(idx === 2 ? '#ffffff' : th.leaf);
    const pebbleMat = toon(new THREE.Color(th.path).multiplyScalar(0.8));
    const add = (obj, x, z) => { obj.position.x = x; obj.position.z = z; world.add(obj); decor.push(obj); };
    for (let i = 0; i < 34; i++) add(buildTree(th, leafMat, trunkMat, rand(0.9, 1.6)), rand(-32, 32), -rand(3.5, 18));
    for (let i = 0; i < 18; i++) {
      const r = part(new THREE.DodecahedronGeometry(rand(0.2, 0.6), 0), rockMat, 0, 0.1, 0, false);
      r.scale.y = rand(0.5, 0.9); r.rotation.set(rand(0, 3), rand(0, 3), 0); r.receiveShadow = true;
      const g = new THREE.Group(); g.add(r);
      add(g, rand(-32, 32), Math.random() < 0.5 ? -rand(1.8, 5) : rand(1.8, 4.5));
    }
    for (let i = 0; i < 60; i++) {
      const t = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const c = part(new THREE.ConeGeometry(0.05, rand(0.2, 0.35), 4), tuftMat, rand(-0.08, 0.08), 0.1, rand(-0.08, 0.08), false);
        c.rotation.z = rand(-0.3, 0.3); c.castShadow = false; t.add(c);
      }
      add(t, rand(-32, 32), Math.random() < 0.5 ? -rand(1.4, 4) : rand(1.4, 4));
    }
    for (let i = 0; i < 30; i++) {
      const p = part(new THREE.SphereGeometry(rand(0.05, 0.12), 6, 4), pebbleMat, 0, 0.02, 0, false);
      p.scale.y = 0.4; p.castShadow = false;
      const g = new THREE.Group(); g.add(p);
      add(g, rand(-32, 32), rand(-1.1, 1.1));
    }
    // Laleler
    if (th.flowers) {
      const fm = toon(th.flowers), sm = toon('#2f8a3a');
      for (let i = 0; i < 40; i++) {
        const f = new THREE.Group();
        const stem = part(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 4), sm, 0, 0.14, 0, false); stem.castShadow = false; f.add(stem);
        const bloom = part(new THREE.SphereGeometry(0.06, 8, 6, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.75), fm, 0, 0.3, 0, false);
        bloom.rotation.x = Math.PI; bloom.scale.y = 1.4; f.add(bloom);
        add(f, rand(-32, 32), Math.random() < 0.5 ? -rand(1.4, 4.5) : rand(1.4, 3.6));
      }
    }
    // Bölge yapıları
    const propMat = toon(idx === 0 ? '#c8202a' : th.rock), propMat2 = toon(idx === 0 ? '#f4efe4' : new THREE.Color(th.rock).multiplyScalar(0.8));
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      if (th.props === 'tent') {
        // Akıncı otağı
        g.add(part(new THREE.CylinderGeometry(1.0, 1.0, 1.0, 12), propMat2, 0, 0.5, 0, false));
        g.add(part(new THREE.ConeGeometry(1.25, 1.0, 12), propMat, 0, 1.5, 0, false));
        g.add(part(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 4), trunkMat, 0, 2.2, 0, false));
        const flag = part(new THREE.PlaneGeometry(0.4, 0.25), toon('#c8202a', { side: THREE.DoubleSide }), 0.2, 2.42, 0, false); g.add(flag);
        const door = part(new THREE.PlaneGeometry(0.5, 0.75), toon('#3a1a10'), 0, 0.38, 1.01, false); g.add(door);
      } else if (th.props === 'ruin') {
        for (let k = 0; k < 3; k++) {
          const h = rand(0.8, 2.4);
          g.add(part(new THREE.CylinderGeometry(0.22, 0.26, h, 10), propMat2, k * 0.9 - 0.9, h / 2, 0, false));
        }
        g.add(part(new THREE.BoxGeometry(2.4, 0.3, 0.6), propMat, 0, 0.15, 0.7, false));
      } else {
        // Selçuklu kümbeti: kaide, sekizgen gövde, sekizgen külah; yanında taş yayla evi
        const stone = toon(new THREE.Color(th.rock).lerp(new THREE.Color('#d8c8a8'), 0.4));
        const roof = toon(new THREE.Color(th.rock).multiplyScalar(0.7));
        g.add(part(new THREE.CylinderGeometry(1.0, 1.05, 0.35, 8), roof, 0, 0.17, 0, false));
        g.add(part(new THREE.CylinderGeometry(0.8, 0.8, 1.8, 8), stone, 0, 1.25, 0, false));
        g.add(part(new THREE.CylinderGeometry(0.86, 0.86, 0.12, 8), roof, 0, 2.2, 0, false));
        g.add(part(new THREE.ConeGeometry(0.9, 1.1, 8), roof, 0, 2.8, 0, false));
        g.add(part(new THREE.BoxGeometry(0.4, 0.75, 0.05), toon('#2a1a12'), 0, 0.75, 0.78, false));
        if (Math.random() < 0.5) {
          g.add(part(new THREE.BoxGeometry(1.6, 0.9, 1.1), stone, 2.0, 0.45, 0.3, false));
          const r2 = part(new THREE.ConeGeometry(1.2, 0.6, 4), roof, 2.0, 1.2, 0.3, false); r2.rotation.y = Math.PI / 4; r2.scale.z = 0.75; g.add(r2);
        }
      }
      g.scale.setScalar(rand(0.8, 1.1));
      add(g, -30 + i * 13 + rand(-3, 3), -rand(6, 10));
    }
    // Dağlar
    clearGroup(mountains);
    const mMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(th.fog).lerp(new THREE.Color(th.rock), 0.35), fog: false });
    const mMat2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(th.fog).lerp(new THREE.Color(th.sky[0]), 0.25), fog: false });
    for (let i = 0; i < 9; i++) {
      const h = rand(8, 16);
      const m = new THREE.Mesh(new THREE.ConeGeometry(rand(6, 10), h, 5), i % 2 ? mMat : mMat2);
      m.position.set(-50 + i * 12 + rand(-3, 3), h / 2 - 1, -55 - rand(0, 10));
      m.rotation.y = rand(0, 3);
      mountains.add(m);
    }
    // Ortam parçacıkları
    ambientMode = ['leaves', 'sand', 'snow', 'embers', 'wisps'][idx];
    buildAmbient(th);
  }
  function buildAmbient(th) {
    if (ambient) disposeTree(ambient);
    const N = 160;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = rand(-14, 14); pos[i * 3 + 1] = rand(0, 8); pos[i * 3 + 2] = rand(-8, 5); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const colors = { leaves: '#cfff9a', sand: '#fff0c8', snow: '#ffffff', embers: '#ff8a2a', wisps: '#c7a8ff' };
    const add = ambientMode === 'embers' || ambientMode === 'wisps';
    const mat = new THREE.PointsMaterial({
      color: colors[ambientMode], size: ambientMode === 'snow' ? 0.12 : 0.09, map: glowTex, transparent: true,
      depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: add ? 1 : 0.85,
    });
    ambient = new THREE.Points(geo, mat);
    scene.add(ambient);
  }
  function updateAmbient(dt, scroll) {
    if (!ambient) return;
    const p = ambient.geometry.attributes.position;
    const a = p.array, t = performance.now() / 1000;
    for (let i = 0; i < a.length; i += 3) {
      let vx = -scroll, vy = 0;
      switch (ambientMode) {
        case 'leaves': vx += -0.4 + Math.sin(t + i) * 0.3; vy = -0.35; break;
        case 'sand': vx += -2.2; vy = Math.sin(t * 2 + i) * 0.2; break;
        case 'snow': vx += -0.3 + Math.sin(t + i) * 0.2; vy = -0.6; break;
        case 'embers': vx += Math.sin(t * 1.5 + i) * 0.3; vy = 0.7; break;
        case 'wisps': vx += Math.sin(t * 0.7 + i) * 0.25; vy = Math.cos(t * 0.9 + i) * 0.2; break;
      }
      a[i] += vx * dt; a[i + 1] += vy * dt;
      if (a[i] < -14) a[i] += 28; if (a[i] > 14) a[i] -= 28;
      if (a[i + 1] < 0) a[i + 1] += 8; if (a[i + 1] > 8) a[i + 1] -= 8;
    }
    p.needsUpdate = true;
  }

  // ---------- Karakter yapımı ----------
  const SPHERE = new THREE.SphereGeometry(1, 20, 14); SPHERE.userData.shared = true;

  function newRig(kind) {
    const rig = { kind, root: new THREE.Group(), pivot: new THREE.Group(), mats: [], flash: 0, hurt: 0, walk: 0, dodge: 0, glow: [] };
    rig.root.add(rig.pivot);
    rig.M = (c, ex) => { const m = toon(c, ex); rig.mats.push(m); return m; };
    return rig;
  }
  function buildSword(rig, r, rusty) {
    const g = new THREE.Group();
    const rar = r == null ? null : RARITIES[r];
    const bladeCol = rusty ? '#9a8a7a' : rar ? new THREE.Color('#dfe6f0').lerp(new THREE.Color(rar.color), 0.35) : new THREE.Color('#c9ced6');
    const ex = rar && r >= 2 ? { emissive: new THREE.Color(rar.color), emissiveIntensity: 0.25 * (r - 1) } : {};
    const len = 0.72 + (r || 0) * 0.06, w = 0.055 + (r || 0) * 0.006;
    const shape = new THREE.Shape();
    // Yatağan: öne kıvrık tek ağızlı bıçak
    shape.moveTo(-w, 0); shape.lineTo(w, 0);
    shape.quadraticCurveTo(w + 0.03, len * 0.55, 0.14, len + 0.12);
    shape.quadraticCurveTo(-w + 0.05, len * 0.7, -w, 0);
    const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 });
    bladeGeo.translate(0, 0, -0.0125);
    const blade = part(bladeGeo, rig.M(bladeCol, ex), 0, 0.1, 0);
    g.add(blade);
    const guardCol = rar ? rar.color : rusty ? '#5a4a3a' : '#8a6a3a';
    g.add(part(new THREE.BoxGeometry(0.32 + (r || 0) * 0.03, 0.06, 0.08), rig.M(guardCol), 0, 0.08, 0));
    g.add(part(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), rig.M('#5a3a22'), 0, -0.04, 0));
    const pommel = part(new THREE.SphereGeometry(0.05, 10, 8), rig.M(rar ? rar.color : '#8a6a3a', rar && r >= 1 ? { emissive: new THREE.Color(rar.color), emissiveIntensity: 0.5 } : {}), 0, -0.17, 0);
    g.add(pommel);
    if (rar && r >= 3) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: rar.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
      sp.scale.set(0.5, len + 0.5, 1); sp.position.y = 0.1 + len / 2;
      g.add(sp); rig.glow.push(sp);
    }
    g.userData.tip = new THREE.Vector3(0, 0.1 + len + 0.1, 0);
    rig.blade = blade;
    return g;
  }
  function buildClub(rig, color) {
    const g = new THREE.Group();
    const m = rig.M(color || '#7a5232');
    g.add(part(new THREE.CylinderGeometry(0.11, 0.04, 0.7, 8), m, 0, 0.3, 0));
    for (let i = 0; i < 4; i++) {
      const c = part(new THREE.ConeGeometry(0.035, 0.12, 5), rig.M('#d8d8d8'), 0, 0.45 + (i % 2) * 0.12, 0);
      c.rotation.z = Math.PI / 2; c.rotation.y = i * Math.PI / 2; c.translateY(0.1); g.add(c);
    }
    return g;
  }
  function addEyes(rig, parent, y, z, spread, size, opts = {}) {
    const eyeM = rig.M(opts.color || '#161025', opts.glow ? { emissive: new THREE.Color(opts.glow), emissiveIntensity: 1.2 } : {});
    [-1, 1].forEach((s) => {
      const e = new THREE.Mesh(new THREE.CapsuleGeometry(size * 0.55, size * 0.7, 4, 8), eyeM);
      e.position.set(spread * s, y, z);
      parent.add(e);
      if (!opts.glow) {
        const hl = new THREE.Mesh(new THREE.SphereGeometry(size * 0.28, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
        hl.position.set(spread * s + size * 0.2, y + size * 0.35, z + size * 0.4);
        parent.add(hl);
      }
    });
  }
  // Ortak insansı iskelet: kahraman, goblin, iskelet, iblis
  function buildHumanoid(o) {
    const rig = newRig('humanoid');
    rig.pivot.scale.setScalar(o.scale || 1);
    const bulk = o.bulk || 1;
    const limbR = o.thin ? 0.055 : 0.09;
    const skin = rig.M(o.skin), body = rig.M(o.body, o.bodyEx || {}), legs = rig.M(o.legs || o.body);
    const boots = rig.M(o.boots || '#4a3426', o.bootsEx || {}), gloves = rig.M(o.gloves || o.skin, o.glovesEx || {});
    rig.legs = [-1, 1].map((s) => {
      const g = new THREE.Group(); g.position.set(0.15 * s * bulk, 0.62, 0); rig.pivot.add(g);
      g.add(part(new THREE.CapsuleGeometry(limbR + 0.01, 0.26, 4, 8), legs, 0, -0.26, 0));
      const b = part(SPHERE, boots, 0, -0.54, 0.05); b.scale.set(0.13, 0.1, 0.19); g.add(b);
      return g;
    });
    rig.torso = new THREE.Group(); rig.torso.position.y = 0.62; rig.pivot.add(rig.torso);
    const chest = part(new THREE.CapsuleGeometry(0.27 * bulk, 0.22, 4, 14), body, 0, 0.3, 0);
    chest.scale.z = 0.85; rig.torso.add(chest);
    if (o.ribs) {
      for (let i = 0; i < 3; i++) {
        const rb = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16, Math.PI), rig.M('#2a2030'));
        rb.position.set(0, 0.42 - i * 0.1, 0.18); rb.rotation.z = Math.PI; rb.scale.set(1, 0.4, 1); rig.torso.add(rb);
      }
    }
    rig.belt = part(new THREE.CylinderGeometry(0.285 * bulk, 0.285 * bulk, 0.09, 16), rig.M(o.belt || '#5a3a22', o.beltEx || {}), 0, 0.12, 0);
    rig.belt.scale.z = 0.88; rig.torso.add(rig.belt);
    if (o.skirt) {
      // Kaftan eteği
      const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.29 * bulk, 0.4 * bulk, 0.46, 18, 1, true), rig.M(o.skirt, Object.assign({ side: THREE.DoubleSide }, o.bodyEx || {})));
      sk.position.y = -0.14; sk.scale.z = 0.9; sk.castShadow = true;
      sk.add(new THREE.Mesh(sk.geometry, outlineMat));
      rig.torso.add(sk);
      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.4 * bulk, 0.025, 6, 24), rig.M(o.trim || '#e8c45a'));
      trim.rotation.x = Math.PI / 2; trim.position.y = -0.37; trim.scale.y = 0.9; rig.torso.add(trim);
    }
    rig.head = new THREE.Group(); rig.head.position.y = 0.84; rig.torso.add(rig.head);
    const head = part(new THREE.SphereGeometry(0.36, 22, 16), skin, 0, 0.3, 0);
    rig.head.add(head);
    if (o.headType === 'skull') {
      [-1, 1].forEach((s) => {
        const so = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), rig.M('#120a18'));
        so.position.set(0.13 * s, 0.33, 0.28); so.scale.z = 0.6; rig.head.add(so);
        const pu = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), rig.M('#000', { emissive: new THREE.Color(o.eyeGlow || '#ff3a3a'), emissiveIntensity: 2 }));
        pu.position.set(0.13 * s, 0.33, 0.33); rig.head.add(pu);
      });
      const jaw = part(new THREE.BoxGeometry(0.34, 0.1, 0.2), skin, 0, 0.08, 0.14); rig.head.add(jaw);
    } else if (o.headType !== 'cyclops') {
      addEyes(rig, rig.head, 0.33, 0.31, 0.13, 0.07, o.eyeGlow ? { glow: o.eyeGlow, color: '#000' } : {});
    }
    if (o.headType === 'goblin') {
      [-1, 1].forEach((s) => {
        const ear = part(new THREE.ConeGeometry(0.09, 0.4, 6), skin, 0.4 * s, 0.38, 0);
        ear.rotation.z = -s * (Math.PI / 2 + 0.35); rig.head.add(ear);
      });
      rig.head.add(part(new THREE.SphereGeometry(0.08, 10, 8), skin, 0, 0.25, 0.36));
    }
    if (o.horns) {
      [-1, 1].forEach((s) => {
        const h = part(new THREE.ConeGeometry(0.08, 0.38, 8), rig.M(o.horns), 0.2 * s, 0.66, 0);
        h.rotation.z = -s * 0.5; rig.head.add(h);
      });
    }
    if (o.longHair) {
      // Albastı: dağınık uzun saç
      const hm = rig.M(o.longHair);
      const cap = part(new THREE.SphereGeometry(0.39, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hm, 0, 0.32, -0.03); rig.head.add(cap);
      for (let i = 0; i < 5; i++) {
        const lock = part(new THREE.CapsuleGeometry(0.07, 0.75, 4, 8), hm, (i - 2) * 0.12, -0.1, -0.24 + Math.abs(i - 2) * 0.04);
        lock.rotation.x = 0.15; lock.rotation.z = (i - 2) * 0.08; rig.head.add(lock);
      }
    }
    if (o.flameHair) {
      // İfrit: alev saç
      const fm = rig.M('#ffb02a', { emissive: new THREE.Color('#ff5a00'), emissiveIntensity: 1.1 });
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const f = part(new THREE.ConeGeometry(0.11, rand(0.35, 0.6), 8), fm, Math.cos(a) * 0.18, 0.65, Math.sin(a) * 0.18 - 0.04, false);
        f.rotation.x = -0.25; rig.head.add(f);
      }
      rig.flames = true;
    }
    if (o.tusks) {
      [-1, 1].forEach((s) => {
        const t = part(new THREE.ConeGeometry(0.035, 0.16, 6), rig.M('#f4ecd8'), 0.12 * s, 0.17, 0.3); t.rotation.x = 0.3; rig.head.add(t);
      });
    }
    if (o.fur) {
      // Kıllı yaratık: gövde ve omuzlarda yün tutamları
      const fm = rig.M(o.fur);
      for (let i = 0; i < 10; i++) {
        const a = rand(0, Math.PI * 2);
        const tuft = part(new THREE.ConeGeometry(0.08, 0.22, 5), fm, Math.cos(a) * 0.27 * bulk, rand(0.15, 0.55), Math.sin(a) * 0.24, false);
        tuft.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); rig.torso.add(tuft);
      }
    }
    if (o.mustache) {
      [-1, 1].forEach((s) => {
        const m = part(new THREE.CapsuleGeometry(0.03, 0.12, 4, 8), rig.M(o.mustache), 0.08 * s, 0.2, 0.33);
        m.rotation.z = s * 1.15; rig.head.add(m);
      });
    }
    if (o.turban) {
      // Sarık: üst üste sarılmış bez + kırmızı kavuk tepesi
      const tm = rig.M(o.turban);
      const g = new THREE.Group(); g.position.set(0, 0.52, -0.02); rig.head.add(g);
      const t1 = part(new THREE.TorusGeometry(0.29, 0.13, 10, 22), tm, 0, 0, 0); t1.rotation.x = Math.PI / 2; g.add(t1);
      const t2 = part(new THREE.TorusGeometry(0.2, 0.11, 10, 20), tm, 0, 0.13, 0); t2.rotation.x = Math.PI / 2; g.add(t2);
      g.add(part(new THREE.SphereGeometry(0.16, 14, 10), rig.M('#b3202a'), 0, 0.2, 0));
      g.rotation.x = -0.12;
      rig.turban = g;
    }
    if (o.headType === 'bandit') {
      const k = part(new THREE.CylinderGeometry(0.27, 0.33, 0.3, 14), rig.M('#2a1e18'), 0, 0.62, -0.02); rig.head.add(k);
      const patch = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), rig.M('#111'));
      patch.position.set(0.13, 0.34, 0.35); rig.head.add(patch);
    }
    if (o.headType === 'cyclops') {
      const w = part(new THREE.SphereGeometry(0.15, 16, 12), rig.M('#ffffff'), 0, 0.36, 0.26); rig.head.add(w);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), rig.M('#b3202a', { emissive: new THREE.Color('#ff2a2a'), emissiveIntensity: 0.6 }));
      p.position.set(0, 0.36, 0.39); rig.head.add(p);
      const brow = part(new THREE.BoxGeometry(0.34, 0.05, 0.08), rig.M('#3a2a1a'), 0, 0.52, 0.3); brow.rotation.x = 0.3; rig.head.add(brow);
    }
    rig.headTop = new THREE.Vector3(0, 0.66, 0);
    rig.arms = [-1, 1].map((s) => {
      const g = new THREE.Group(); g.position.set(0.36 * s * bulk, 0.5, 0); rig.torso.add(g);
      g.add(part(new THREE.CapsuleGeometry(limbR, 0.24, 4, 8), o.sleeve ? rig.M(o.sleeve) : skin, 0, -0.18, 0));
      const hand = new THREE.Group(); hand.position.y = -0.4; g.add(hand);
      const hs = o.claws ? 0.14 : 0.105;
      const h = part(SPHERE, gloves, 0, 0, 0); h.scale.setScalar(hs); hand.add(h);
      g.hand = hand; g.side = s;
      return g;
    });
    const ws = o.weaponSide || -1;
    rig.weaponArm = rig.arms[ws === -1 ? 0 : 1];
    rig.offArm = rig.arms[ws === -1 ? 1 : 0];
    if (o.weapon) {
      const w = o.weapon === 'club' ? buildClub(rig) : buildSword(rig, o.swordR, o.weapon === 'rusty');
      w.rotation.x = 1.2;
      rig.weaponArm.hand.add(w);
      rig.weapon = w;
    }
    if (o.wings) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(0.9, 0.5); shape.lineTo(0.75, 0.1); shape.lineTo(0.95, -0.15); shape.lineTo(0.6, -0.1); shape.lineTo(0.55, -0.4); shape.closePath();
      const wm = rig.M(o.wings, { side: THREE.DoubleSide });
      rig.wings = [-1, 1].map((s) => {
        const wg = new THREE.Group(); wg.position.set(0.1 * s, 0.45, -0.2); rig.torso.add(wg);
        const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), wm); m.castShadow = true;
        m.scale.x = s; wg.add(m); wg.rotation.y = s * 0.5;
        return wg;
      });
    }
    return rig;
  }

  function buildSlime(color) {
    const rig = newRig('slime');
    const m = rig.M(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.12 });
    rig.body = new THREE.Group(); rig.pivot.add(rig.body);
    const b = part(new THREE.SphereGeometry(0.6, 28, 20), m, 0, 0.5, 0);
    b.scale.set(1, 0.85, 1); rig.body.add(b);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }));
    hl.position.set(-0.22, 0.85, 0.32); hl.scale.set(1, 0.6, 0.5); rig.body.add(hl);
    [-1, 1].forEach((s) => {
      const w = part(new THREE.SphereGeometry(0.13, 14, 10), rig.M('#ffffff'), 0.18 * s, 0.62, 0.45);
      rig.body.add(w);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), rig.M('#161025'));
      p.position.set(0.18 * s, 0.6, 0.56); rig.body.add(p);
    });
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12, Math.PI), rig.M('#161025'));
    mouth.position.set(0, 0.42, 0.55); mouth.rotation.z = Math.PI; rig.body.add(mouth);
    rig.headTop = new THREE.Vector3(0, 1.0, 0);
    return rig;
  }
  // Cin: havada süzülen alev ruhu (balçık animasyonunu kullanır)
  function buildWisp(color) {
    const rig = newRig('slime');
    rig.hover = true;
    const m = rig.M(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.7 });
    rig.body = new THREE.Group(); rig.pivot.add(rig.body);
    const b = part(new THREE.SphereGeometry(0.42, 22, 16), m, 0, 0.75, 0); rig.body.add(b);
    const flame = part(new THREE.ConeGeometry(0.36, 0.8, 18), m, 0, 1.3, -0.05); flame.rotation.x = -0.25; rig.body.add(flame);
    const tail = part(new THREE.ConeGeometry(0.25, 0.5, 14), m, 0, 0.35, 0); tail.rotation.x = Math.PI; rig.body.add(tail);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    sp.scale.setScalar(2.2); sp.position.y = 0.85; rig.body.add(sp); rig.glow.push(sp);
    [-1, 1].forEach((s) => {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), rig.M('#ffffff', { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1 }));
      w.position.set(0.14 * s, 0.82, 0.36); w.scale.y = 1.4; rig.body.add(w);
    });
    rig.headTop = new THREE.Vector3(0, 1.75, 0);
    return rig;
  }
  function buildWolf(color) {
    const rig = newRig('wolf');
    const m = rig.M(color), dk = rig.M(new THREE.Color(color).multiplyScalar(0.6));
    rig.body = new THREE.Group(); rig.body.position.y = 0.62; rig.pivot.add(rig.body);
    const torso = part(new THREE.CapsuleGeometry(0.27, 0.6, 4, 12), m, 0, 0, 0);
    torso.rotation.x = Math.PI / 2; rig.body.add(torso);
    rig.head = new THREE.Group(); rig.head.position.set(0, 0.22, 0.55); rig.body.add(rig.head);
    const hd = part(new THREE.SphereGeometry(0.26, 16, 12), m, 0, 0, 0); hd.scale.z = 1.05; rig.head.add(hd);
    const snout = part(new THREE.CapsuleGeometry(0.11, 0.2, 4, 8), m, 0, -0.06, 0.25); snout.rotation.x = Math.PI / 2; rig.head.add(snout);
    rig.head.add(part(new THREE.SphereGeometry(0.06, 8, 6), rig.M('#161025'), 0, -0.04, 0.42));
    [-1, 1].forEach((s) => {
      const ear = part(new THREE.ConeGeometry(0.08, 0.22, 4), dk, 0.14 * s, 0.25, -0.05); ear.rotation.z = -s * 0.25; rig.head.add(ear);
    });
    addEyes(rig, rig.head, 0.07, 0.2, 0.11, 0.05, { glow: '#ffd23a', color: '#000' });
    rig.legs = [];
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
      const g = new THREE.Group(); g.position.set(0.16 * sx, -0.05, 0.32 * sz); rig.body.add(g);
      g.add(part(new THREE.CapsuleGeometry(0.075, 0.32, 4, 8), m, 0, -0.27, 0));
      g.add(part(new THREE.SphereGeometry(0.09, 8, 6), dk, 0, -0.5, 0.03));
      g.phase = (sx * sz > 0 ? 0 : Math.PI);
      rig.legs.push(g);
    });
    rig.tail = new THREE.Group(); rig.tail.position.set(0, 0.1, -0.55); rig.body.add(rig.tail);
    const tl = part(new THREE.ConeGeometry(0.1, 0.5, 8), dk, 0, 0.2, 0); tl.rotation.x = -0.4; rig.tail.add(tl);
    rig.headTop = new THREE.Vector3(0, 1.2, 0.5);
    return rig;
  }
  function buildGolem(color, eye) {
    const rig = newRig('golem');
    const lava = eye === '#ff6a1a';
    const m = rig.M(color, lava ? { emissive: new THREE.Color('#ff3a00'), emissiveIntensity: 0.3 } : {});
    const dk = rig.M(new THREE.Color(color).multiplyScalar(0.7), lava ? { emissive: new THREE.Color('#ff3a00'), emissiveIntensity: 0.18 } : {});
    const crystal = rig.M(eye, { emissive: new THREE.Color(eye), emissiveIntensity: 1.0 });
    rig.legs = [-1, 1].map((s) => {
      const g = new THREE.Group(); g.position.set(0.28 * s, 0.5, 0); rig.pivot.add(g);
      g.add(part(new THREE.DodecahedronGeometry(0.25, 0), dk, 0, -0.25, 0));
      return g;
    });
    rig.torso = new THREE.Group(); rig.torso.position.y = 0.5; rig.pivot.add(rig.torso);
    const t = part(new THREE.DodecahedronGeometry(0.6, 0), m, 0, 0.55, 0); t.scale.set(1, 0.9, 0.8); rig.torso.add(t);
    rig.head = new THREE.Group(); rig.head.position.y = 1.15; rig.torso.add(rig.head);
    rig.head.add(part(new THREE.DodecahedronGeometry(0.28, 0), dk, 0, 0.1, 0.05));
    [-1, 1].forEach((s) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), crystal); e.position.set(0.1 * s, 0.13, 0.3); rig.head.add(e);
      const c = part(new THREE.ConeGeometry(0.08, 0.3, 5), crystal, 0.45 * s, 0.95, -0.1); c.rotation.z = -s * 0.4; rig.torso.add(c);
    });
    rig.arms = [-1, 1].map((s) => {
      const g = new THREE.Group(); g.position.set(0.7 * s, 0.85, 0); rig.torso.add(g);
      g.add(part(new THREE.DodecahedronGeometry(0.2, 0), dk, 0, -0.15, 0));
      g.add(part(new THREE.DodecahedronGeometry(0.3, 0), m, 0, -0.6, 0.05));
      return g;
    });
    rig.headTop = new THREE.Vector3(0, 1.95, 0);
    return rig;
  }
  function buildEnemyRig(e) {
    let rig;
    const c = e.color;
    switch (e.kind) {
      case 'slime': rig = buildSlime(c); break;
      case 'wolf': rig = buildWolf(c); break;
      case 'golem': rig = buildGolem(c, themeIdx === 3 ? '#ff6a1a' : '#6ae8ff'); break;
      case 'wisp': rig = buildWisp(c); break;
      case 'bandit': rig = buildHumanoid({ skin: '#e2b48a', body: '#6a4a3a', legs: '#3a2a2a', boots: '#2a1a12', belt: '#8a1a1a', sleeve: '#e8dcc0', headType: 'bandit', mustache: '#1a1210', weapon: e.boss ? 'rusty' : 'club', weaponSide: 1 }); break;
      case 'furry': rig = buildHumanoid({ skin: c, body: c, legs: new THREE.Color(c).multiplyScalar(0.7), boots: '#1a1010', belt: '#1a1010', horns: '#d8ccb0', claws: true, bulk: 1.2, eyeGlow: '#ff4a2a', weaponSide: 1, headType: 'goblin', fur: new THREE.Color(c).multiplyScalar(0.8) }); break;
      case 'ghoul': rig = buildHumanoid({ skin: '#cfc6a8', body: c, legs: new THREE.Color(c).multiplyScalar(0.7), boots: '#2a2418', belt: '#2a2418', sleeve: c, headType: 'skull', claws: true, bulk: 1.1, eyeGlow: '#c8ff3a', weaponSide: 1, fur: new THREE.Color(c).multiplyScalar(0.85) }); break;
      case 'albasti': rig = buildHumanoid({ skin: c, body: '#ece6f4', legs: '#ece6f4', boots: '#ece6f4', belt: '#6a2a4a', sleeve: '#ece6f4', skirt: '#ece6f4', trim: '#b46aff', longHair: '#1e1424', claws: true, thin: true, eyeGlow: '#ff3a5a', weaponSide: 1 }); rig.float = true; break;
      case 'ifrit': rig = buildHumanoid({ skin: c, body: new THREE.Color(c).multiplyScalar(0.6), bodyEx: { emissive: new THREE.Color('#ff3a00'), emissiveIntensity: 0.25 }, legs: new THREE.Color(c).multiplyScalar(0.5), boots: '#1a1010', belt: '#ffb02a', flameHair: true, claws: true, bulk: 1.15, eyeGlow: '#ffe14a', weaponSide: 1 }); break;
      case 'div': rig = buildHumanoid({ skin: c, body: '#3a2a4a', legs: '#2a2034', boots: '#1a1424', belt: '#8a6a2a', tusks: true, weapon: 'club', bulk: 1.35, eyeGlow: '#ffd23a', weaponSide: 1, fur: '#2a2034' }); break;
      case 'cyclops': rig = buildHumanoid({ skin: c, body: '#5a3a22', legs: '#4a3020', boots: '#2a1a10', belt: '#3a2010', headType: 'cyclops', weapon: 'club', weaponSide: 1, bulk: 1.3, horns: '#e8dcc0' }); break;
      case 'skeleton': rig = buildHumanoid({ skin: c, body: c, legs: c, boots: c, belt: '#5a4a3a', headType: 'skull', thin: true, ribs: true, weapon: 'rusty', weaponSide: 1, eyeGlow: themeIdx === 4 ? '#b46aff' : '#ff3a3a' }); break;
      case 'demon': rig = buildHumanoid({ skin: c, body: new THREE.Color(c).multiplyScalar(0.55), legs: new THREE.Color(c).multiplyScalar(0.45), boots: '#1a1018', belt: '#1a1018', horns: '#f0e6d0', wings: new THREE.Color(c).multiplyScalar(0.4), claws: true, bulk: 1.15, eyeGlow: '#ffe14a', weaponSide: 1 }); break;
    }
    rig.enemy = true;
    rig.kind2 = e.kind;
    const s = e.boss ? 1.6 : 1;
    rig.root.scale.setScalar(s);
    if (e.boss) {
      const crown = new THREE.Group();
      const gold = rig.M('#ffcf3a', { emissive: new THREE.Color('#ffa000'), emissiveIntensity: 0.35 });
      crown.add(part(new THREE.CylinderGeometry(0.2, 0.22, 0.13, 14, 1, true), gold, 0, 0, 0));
      for (let i = 0; i < 5; i++) {
        const sp = part(new THREE.ConeGeometry(0.05, 0.15, 5), gold, Math.cos(i / 5 * Math.PI * 2) * 0.2, 0.13, Math.sin(i / 5 * Math.PI * 2) * 0.2);
        crown.add(sp);
      }
      crown.add(part(new THREE.SphereGeometry(0.045, 8, 6), rig.M('#ff2a4a', { emissive: new THREE.Color('#ff2a4a'), emissiveIntensity: 0.8 }), 0, 0.02, 0.21));
      crown.position.copy(rig.headTop).add(new THREE.Vector3(0, -0.02, 0));
      (rig.head && rig.kind !== 'golem' ? rig.head : rig.pivot).add(crown);
      if (rig.head && rig.kind !== 'golem') crown.position.set(0, rig.kind === 'wolf' ? 0.25 : 0.66, 0);
      const aura = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 40), new THREE.MeshBasicMaterial({ color: '#ff3a3a', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      aura.rotation.x = -Math.PI / 2; aura.position.y = 0.03;
      rig.root.add(aura); rig.aura = aura;
    }
    return rig;
  }
  function buildHero() {
    const eq = S.equipped;
    const col = (id, def) => (eq[id] ? RARITIES[eq[id].r].color : def);
    const em = (id) => (eq[id] && eq[id].r >= 3 ? { emissive: new THREE.Color(RARITIES[eq[id].r].color), emissiveIntensity: 0.18 } : {});
    const rig = buildHumanoid({
      skin: '#f2c49a', body: col('armor', '#2f5d8a'), bodyEx: em('armor'), legs: '#e8dcc0',
      boots: col('boots', '#8a2a1a'), bootsEx: em('boots'), gloves: col('gloves', '#f2c49a'), glovesEx: em('gloves'),
      belt: col('belt', '#b3202a'), beltEx: em('belt'), sleeve: col('armor', '#2f5d8a'),
      skirt: col('armor', '#2f5d8a'), trim: '#e8c45a',
      mustache: '#2a1a10', turban: eq.helmet ? null : '#f4efe4',
      weapon: 'sword', swordR: eq.weapon ? eq.weapon.r : null, weaponSide: -1,
    });
    if (eq.helmet) {
      // Osmanlı tolgası: sivri kubbe, tepe çivisi, burun siperi, zincir ense örtüsü
      const r = eq.helmet.r, rar = RARITIES[r];
      const hm = rig.M(rar.color, em('helmet'));
      const steel = rig.M('#c9ced6');
      const dome = part(new THREE.SphereGeometry(0.41, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), hm, 0, 0.3, 0);
      rig.head.add(dome);
      rig.head.add(part(new THREE.ConeGeometry(0.3, 0.32, 20), hm, 0, 0.78, 0));
      rig.head.add(part(new THREE.CylinderGeometry(0.018, 0.03, 0.22, 8), steel, 0, 1.02, 0));
      rig.head.add(part(new THREE.SphereGeometry(0.04, 8, 6), rig.M('#e8c45a'), 0, 1.14, 0));
      const brim = part(new THREE.TorusGeometry(0.4, 0.045, 8, 28), rig.M(new THREE.Color(rar.color).multiplyScalar(0.7)), 0, 0.41, 0);
      brim.rotation.x = Math.PI / 2; rig.head.add(brim);
      rig.head.add(part(new THREE.BoxGeometry(0.05, 0.24, 0.05), steel, 0, 0.36, 0.42));
      const mail = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.26, 22, 1, true, Math.PI * 0.62, Math.PI * 0.76), rig.M('#9aa3b4', { side: THREE.DoubleSide }));
      mail.position.y = 0.2; mail.castShadow = true; rig.head.add(mail);
      if (r >= 2) {
        const pl = part(new THREE.ConeGeometry(0.075, 0.42, 8), rig.M(new THREE.Color(rar.color).lerp(new THREE.Color('#ffffff'), 0.4), { emissive: new THREE.Color(rar.color), emissiveIntensity: 0.3 }), 0, 1.0, -0.18);
        pl.rotation.x = -0.55; pl.position.set(0, 0.95, -0.12); rig.head.add(pl);
      }
    }
    if (eq.armor && eq.armor.r >= 2) {
      const pm = rig.M(new THREE.Color(RARITIES[eq.armor.r].color).multiplyScalar(0.8), em('armor'));
      [-1, 1].forEach((s) => {
        const p = part(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), pm, 0.36 * s, 0.53, 0);
        rig.torso.add(p);
      });
    }
    if (eq.armor && eq.armor.r >= 3) {
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.95, 1, 6), rig.M(new THREE.Color(RARITIES[eq.armor.r].color).multiplyScalar(0.75), { side: THREE.DoubleSide }));
      cape.geometry.translate(0, -0.475, 0);
      cape.position.set(0, 0.58, -0.24); cape.rotation.x = 0.15; cape.castShadow = true;
      rig.torso.add(cape); rig.cape = cape;
    }
    if (eq.necklace) {
      const rar = RARITIES[eq.necklace.r];
      const ch = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 20), rig.M('#e8c45a'));
      ch.position.set(0, 0.6, 0.06); ch.rotation.x = Math.PI / 2 - 0.5; rig.torso.add(ch);
      const gem = part(new THREE.OctahedronGeometry(0.07, 0), rig.M(rar.color, { emissive: new THREE.Color(rar.color), emissiveIntensity: 0.6 }), 0, 0.47, 0.23);
      rig.torso.add(gem);
    }
    if (eq.ring) {
      const rar = RARITIES[eq.ring.r];
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: rar.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.scale.setScalar(0.3); rig.offArm.hand.add(sp); rig.glow.push(sp);
    }
    return rig;
  }

  // ---------- Yoldaş modelleri ----------
  function buildPetRig(p) {
    let rig;
    const c = p.color;
    if (p.kind === 'cat' || p.kind === 'fox' || p.kind === 'wolf' || p.kind === 'spirit') {
      rig = buildWolf(c);
      rig.kind = 'pet-walk';
      const s = p.kind === 'cat' ? 0.42 : p.kind === 'spirit' ? 0.85 : 0.5;
      rig.pivot.scale.setScalar(s);
      if (p.kind === 'cat') { rig.tail.rotation.x = -1.0; rig.tail.scale.set(0.6, 1.6, 0.6); }
      if (p.kind === 'fox') { rig.tail.scale.set(1.8, 1.6, 1.8); rig.tail.children[0].material = rig.M('#ffffff'); }
      if (p.kind === 'spirit') {
        rig.mats.forEach((m) => { m.emissive.set(c); m.emissiveIntensity = 0.6; m.userData.baseEm = m.emissive.clone(); });
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        sp.scale.setScalar(2.6); sp.position.y = 0.6; rig.root.add(sp); rig.glow.push(sp);
      }
    } else if (p.kind === 'turtle') {
      rig = newRig('pet-walk');
      const m = rig.M(c), sk = rig.M('#9ad07a');
      rig.body = new THREE.Group(); rig.pivot.add(rig.body);
      const shell = part(new THREE.SphereGeometry(0.35, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 0.12, 0); rig.body.add(shell);
      rig.body.add(part(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 16), rig.M('#c9a86a'), 0, 0.12, 0));
      rig.head = new THREE.Group(); rig.head.position.set(0, 0.2, 0.38); rig.body.add(rig.head);
      rig.head.add(part(new THREE.SphereGeometry(0.12, 12, 10), sk, 0, 0, 0));
      addEyes(rig, rig.head, 0.03, 0.1, 0.05, 0.03);
      rig.legs = [];
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
        const g = new THREE.Group(); g.position.set(0.24 * sx, 0.1, 0.2 * sz); rig.body.add(g);
        g.add(part(new THREE.SphereGeometry(0.08, 8, 6), sk, 0, -0.04, 0)); g.phase = sx * sz > 0 ? 0 : Math.PI; rig.legs.push(g);
      });
      rig.tail = new THREE.Group(); rig.body.add(rig.tail);
    } else {
      // Kuş, Anka, ejder: uçan yoldaş
      rig = newRig('pet-fly');
      const m = rig.M(c, p.kind === 'phoenix' ? { emissive: new THREE.Color('#0aa860'), emissiveIntensity: 0.35 } : {});
      const belly = rig.M(lighten(c, 0.45));
      rig.body = new THREE.Group(); rig.pivot.add(rig.body);
      const b = part(new THREE.SphereGeometry(0.22, 14, 10), m, 0, 0, 0); b.scale.set(1, 0.95, 1.25); rig.body.add(b);
      rig.body.add(part(new THREE.SphereGeometry(0.14, 10, 8), belly, 0, -0.05, 0.12));
      rig.head = new THREE.Group(); rig.head.position.set(0, 0.2, 0.2); rig.body.add(rig.head);
      rig.head.add(part(new THREE.SphereGeometry(0.15, 12, 10), m, 0, 0, 0));
      addEyes(rig, rig.head, 0.04, 0.12, 0.07, 0.03, p.kind === 'dragon' ? { glow: '#ffd23a', color: '#000' } : {});
      const beak = part(new THREE.ConeGeometry(0.05, 0.14, 6), rig.M(p.kind === 'dragon' ? c : '#ffc21a'), 0, -0.02, 0.18); beak.rotation.x = Math.PI / 2; rig.head.add(beak);
      if (p.kind === 'dragon') [-1, 1].forEach((s) => { const h = part(new THREE.ConeGeometry(0.03, 0.14, 6), rig.M('#f0e6c8'), 0.07 * s, 0.14, -0.04); h.rotation.x = -0.4; rig.head.add(h); });
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0); wingShape.quadraticCurveTo(0.35, 0.25, 0.6, 0.05); wingShape.lineTo(0.45, -0.05); wingShape.lineTo(0.5, -0.15); wingShape.lineTo(0.3, -0.1); wingShape.quadraticCurveTo(0.15, -0.15, 0, -0.1);
      const wm = rig.M(p.kind === 'phoenix' ? '#ffd23a' : p.kind === 'dragon' ? lighten(c, 0.2) : darken(c, 0.25), { side: THREE.DoubleSide });
      rig.wings = [-1, 1].map((s) => {
        const g = new THREE.Group(); g.position.set(0.15 * s, 0.08, 0); rig.body.add(g);
        const w = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), wm); w.scale.x = s; w.rotation.x = -Math.PI / 2; g.add(w);
        return g;
      });
      const tail = part(new THREE.ConeGeometry(0.1, 0.35, 6), wm, 0, 0, -0.35); tail.rotation.x = -Math.PI / 2 - 0.3; rig.body.add(tail);
      rig.fire = p.kind === 'phoenix';
      if (p.kind === 'phoenix') {
        // Zümrüd-ü Anka: büyük, zümrüt yeşili, uzun altın kuyruk tüyleri ve tepelik
        rig.pivot.scale.setScalar(1.5);
        const gold = rig.M('#ffd23a', { emissive: new THREE.Color('#ffb000'), emissiveIntensity: 0.5 });
        for (let i = -1; i <= 1; i++) {
          const f = part(new THREE.CapsuleGeometry(0.035, 0.7, 4, 8), gold, i * 0.08, -0.05, -0.55);
          f.rotation.x = -Math.PI / 2 - 0.35 + Math.abs(i) * 0.15; f.rotation.z = i * 0.25; rig.body.add(f);
        }
        for (let i = -1; i <= 1; i++) { const cr = part(new THREE.ConeGeometry(0.025, 0.16, 5), gold, i * 0.05, 0.16, -0.02); cr.rotation.x = -0.3; rig.head.add(cr); }
      }
      if (p.kind === 'dragon') {
        // Yavru ejder: sırt dikenleri ve kuyruk
        for (let i = 0; i < 4; i++) rig.body.add(part(new THREE.ConeGeometry(0.04, 0.12, 5), rig.M('#f0e6c8'), 0, 0.2 - i * 0.02, 0.1 - i * 0.12));
        const tl = part(new THREE.CapsuleGeometry(0.05, 0.4, 4, 8), m, 0, -0.05, -0.4); tl.rotation.x = Math.PI / 2 + 0.3; rig.body.add(tl);
        rig.pivot.scale.setScalar(1.2);
      }    }
    rig.petId = p.id;
    return rig;
  }

  // ---------- Parçacıklar ----------
  const particles = [];
  const pool = [];
  function spawn(pos, o) {
    const n = o.count || 8;
    for (let i = 0; i < n; i++) {
      let sp = pool.pop();
      if (!sp) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); }
      const m = sp.material;
      m.map = o.tex === 'spark' ? sparkTex : o.tex === 'smoke' ? smokeTex : glowTex;
      m.blending = o.tex === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending;
      m.color.set(Array.isArray(o.color) ? pick(o.color) : o.color);
      m.opacity = 1;
      m.needsUpdate = true;
      sp.position.copy(pos);
      const a = rand(0, Math.PI * 2), el = rand(-0.3, 1.2), sp0 = rand(0.4, 1) * (o.speed || 3);
      sp.userData = {
        v: new THREE.Vector3(Math.cos(a) * Math.cos(el) * sp0 + (o.dir || 0), Math.sin(el) * sp0 + (o.up || 0), Math.sin(a) * Math.cos(el) * sp0 * 0.6),
        life: rand(0.6, 1) * (o.life || 0.6), t: 0, size: rand(0.6, 1.2) * (o.size || 0.25), g: o.gravity == null ? 6 : o.gravity, grow: o.grow || 0,
      };
      sp.scale.setScalar(sp.userData.size);
      scene.add(sp);
      particles.push(sp);
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i], u = p.userData;
      u.t += dt;
      if (u.t >= u.life) { scene.remove(p); particles.splice(i, 1); pool.push(p); continue; }
      u.v.y -= u.g * dt;
      u.v.multiplyScalar(1 - dt * 1.5);
      p.position.addScaledVector(u.v, dt);
      const k = u.t / u.life;
      p.material.opacity = 1 - k * k;
      p.scale.setScalar(u.size * (1 + u.grow * k));
    }
  }
  // Kılıç izi
  const slashes = [];
  function slash(x, y, color, big, flip) {
    const geo = new THREE.RingGeometry(0.7, big ? 1.25 : 1.05, 36, 1, 0, Math.PI * 0.85);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y, 0.4);
    m.rotation.z = flip ? Math.PI * 0.85 + rand(-0.3, 0.3) : -0.4 + rand(-0.3, 0.3);
    m.rotation.y = flip ? Math.PI : 0;
    m.userData.t = 0;
    scene.add(m); slashes.push(m);
  }
  function updateSlashes(dt) {
    for (let i = slashes.length - 1; i >= 0; i--) {
      const s = slashes[i];
      s.userData.t += dt;
      const k = s.userData.t / 0.2;
      if (k >= 1) { scene.remove(s); s.geometry.dispose(); s.material.dispose(); slashes.splice(i, 1); continue; }
      s.material.opacity = 0.95 * (1 - k);
      s.scale.setScalar(1 + k * 0.35);
      s.rotation.z += (s.rotation.y ? 1 : -1) * dt * 6;
    }
  }
  // Hasar yazıları (DOM)
  const v3 = new THREE.Vector3();
  function screenPos(v) {
    v3.copy(v).project(camera);
    return { x: (v3.x + 1) / 2 * wrap.clientWidth, y: (1 - v3.y) / 2 * wrap.clientHeight };
  }
  function floatText(worldPos, text, cls) {
    const p = screenPos(worldPos);
    const d = document.createElement('div');
    d.className = 'dmg ' + (cls || '');
    d.textContent = text;
    d.style.left = (p.x + rand(-20, 20)) + 'px';
    d.style.top = p.y + 'px';
    fxLayer.appendChild(d);
    setTimeout(() => d.remove(), 1000);
  }

  // ---------- Sahne durumu ----------
  const HERO_X = -1.35, ENEMY_X = 1.35;
  const HERO_YAW = Math.PI / 2 - 0.5, ENEMY_YAW = -Math.PI / 2 + 0.5;
  let hero = null, enemy = null, enemyData = null, scrollV = 0;

  function rebuildHero() {
    let pos = null;
    if (hero) { pos = hero.root.position.clone(); disposeTree(hero.root); }
    hero = buildHero();
    hero.root.position.set(HERO_X, 0, 0);
    hero.root.rotation.y = HERO_YAW;
    scene.add(hero.root);
    spawn(new THREE.Vector3(HERO_X, 1.2, 0.2), { count: 14, color: ['#ffffff', '#ffe08a'], tex: 'spark', speed: 3, size: 0.25, gravity: 2 });
  }
  function spawnEnemyRig(e) {
    if (enemy) disposeTree(enemy.root);
    enemyData = e;
    enemy = buildEnemyRig(e);
    enemy.root.position.set(9, 0, 0);
    enemy.root.rotation.y = ENEMY_YAW;
    scene.add(enemy.root);
  }
  let pet = null;
  const PET_HOME = new THREE.Vector3(HERO_X - 0.95, 0, -0.75);
  function rebuildPet() {
    if (pet) { disposeTree(pet.root); pet = null; }
    if (!S.activePet || !S.pets[S.activePet]) return;
    const p = PET_BY_ID[S.activePet];
    pet = buildPetRig(p);
    pet.root.position.copy(PET_HOME);
    if (pet.kind === 'pet-fly') pet.root.position.set(HERO_X - 0.9, 2.75, -0.6);
    pet.root.rotation.y = HERO_YAW;
    scene.add(pet.root);
    spawn(pet.root.position.clone().add(new THREE.Vector3(0, 0.4, 0)), { count: 16, color: [p.color, '#ffffff'], tex: 'spark', speed: 2.5, size: 0.22, gravity: 1 });
  }
  function animatePet(dt) {
    if (!pet) return;
    const t = performance.now() / 1000;
    const walking = B.state === 'walk' || (B.state === 'clear' && B.t > 0.6);
    const fly = pet.kind === 'pet-fly';
    const home = fly ? new THREE.Vector3(HERO_X - 0.9, 2.75 + Math.sin(t * 2.5) * 0.15, -0.6) : PET_HOME.clone();
    let k = 0;
    if (B.state === 'fight' && B.petRecover > 0) k = Math.sin((1 - B.petRecover / 0.5) * Math.PI);
    const target = new THREE.Vector3(ENEMY_X - 0.7, fly ? 1.3 : 0, 0.2);
    pet.root.position.lerpVectors(home, target, k);
    if (!fly && k > 0) pet.root.position.y = Math.sin(k * Math.PI) * 0.5;
    pet.root.rotation.y = HERO_YAW + (k > 0 ? 0.3 : 0);
    if (pet.legs) {
      pet.walk += dt * (walking || k > 0 ? 16 : 0);
      pet.legs.forEach((l) => { l.rotation.x = walking || k > 0 ? Math.sin(pet.walk + l.phase) * 0.8 : 0; });
      if (pet.tail) pet.tail.rotation.z = Math.sin(t * 6) * 0.3;
      if (!walking && k === 0 && pet.head) pet.head.rotation.y = Math.sin(t * 0.8) * 0.3;
    }
    if (pet.wings) {
      const f = Math.sin(t * (k > 0 ? 30 : 16)) * 0.7;
      pet.wings[0].rotation.z = -f; pet.wings[1].rotation.z = f;
      pet.body.rotation.x = k > 0 ? 0.5 : 0.1;
    }
    if (pet.fire && Math.random() < dt * 20) spawn(pet.root.position.clone(), { count: 1, color: ['#ffd23a', '#3aff9a'], tex: 'glow', speed: 0.4, size: 0.3, gravity: -2, life: 0.5 });
    pet.glow.forEach((g) => { g.material.opacity = 0.5 + Math.sin(t * 4) * 0.2; });
    pet.flash = Math.max(0, pet.flash - dt * 6); applyFlash(pet);
  }
  const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const easeIn = (k) => clamp(k, 0, 1) ** 2;

  function applyFlash(rig) {
    if (!rig) return;
    const f = rig.flash * 0.6;
    for (const m of rig.mats) {
      if (!m.emissive) continue;
      m.emissive.copy(m.userData.baseEm).lerp(WHITE, f);
      if (f > 0 && m.emissiveIntensity < 1) { m.userData.ei = m.userData.ei ?? m.emissiveIntensity; m.emissiveIntensity = Math.max(m.userData.ei, f); }
      else if (m.userData.ei != null) { m.emissiveIntensity = m.userData.ei; }
    }
  }
  const WHITE = new THREE.Color('#ffffff');

  // Humanoid saldırı pozu: windup → vuruş → toparlanma
  function humanoidAttackPose(rig, windupT, windupDur, recoverT, recoverDur) {
    let arm = -0.5, twist = 0, lunge = 0;
    if (recoverT > 0) {
      const q = 1 - recoverT / recoverDur;
      if (q < 0.35) { const k = ease(q / 0.35); arm = -2.7 + (0.35 + 2.7) * k; twist = 0.35 * k; lunge = 0.45 * k; }
      else { const k = ease((q - 0.35) / 0.65); arm = 0.35 + (-0.5 - 0.35) * k; twist = 0.35 * (1 - k); lunge = 0.45 * (1 - k); }
    } else if (windupT < windupDur) {
      const k = ease(1 - windupT / windupDur);
      arm = -0.5 + (-2.7 + 0.5) * k; twist = -0.3 * k; lunge = -0.08 * k;
    }
    return { arm, twist, lunge };
  }
  function animateHumanoid(rig, dt, o) {
    const t = performance.now() / 1000;
    const walking = o.walking;
    rig.walk += dt * (walking ? 11 : 0);
    const sw = walking ? Math.sin(rig.walk) : 0;
    rig.legs[0].rotation.x = sw * 0.75;
    rig.legs[1].rotation.x = -sw * 0.75;
    rig.pivot.position.y = walking ? Math.abs(Math.cos(rig.walk)) * 0.07 : 0;
    rig.torso.scale.y = 1 + Math.sin(t * 3) * 0.015;
    rig.torso.rotation.x = walking ? 0.12 : 0.05;
    rig.offArm.rotation.x = walking ? -sw * 0.7 : -0.35 + Math.sin(t * 2.5) * 0.06;
    rig.offArm.rotation.z = rig.offArm.side * 0.18;
    if (o.attack) {
      rig.weaponArm.rotation.x = walking ? sw * 0.6 - 0.5 : o.attack.arm;
      rig.torso.rotation.y = o.attack.twist;
      rig.pivot.position.z = o.attack.lunge;
    }
    rig.weaponArm.rotation.z = rig.weaponArm.side * 0.12;
    if (rig.wings) rig.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (0.5 + Math.sin(t * 6) * 0.35); });
    if (rig.cape) rig.cape.rotation.x = 0.15 + (walking ? 0.5 : 0.08) + Math.sin(t * 4) * 0.08;
  }

  function animateHero(dt) {
    const r = hero;
    const st = B.state;
    const walking = st === 'walk' || (st === 'clear' && B.t > 0.6);
    const pose = st === 'fight' ? humanoidAttackPose(r, B.heroAtkT, HERO_WINDUP, B.heroRecover, 0.22) : { arm: -0.5, twist: 0, lunge: 0 };
    animateHumanoid(r, dt, { walking, attack: pose });
    // hasar alma / kaçınma
    r.hurt = Math.max(0, r.hurt - dt * 4);
    r.dodge = Math.max(0, r.dodge - dt * 3);
    r.pivot.rotation.x = -r.hurt * 0.25;
    r.pivot.position.z += -Math.sin(r.dodge * Math.PI) * 0.6;
    r.pivot.position.y += Math.sin(r.dodge * Math.PI) * 0.25;
    // ölüm
    if (st === 'heroDeath') {
      const k = ease(B.t / 0.6);
      r.pivot.rotation.x = -1.45 * k;
      r.pivot.position.y = 0.15 * k;
    } else if (st === 'clear' && B.t < 0.6) {
      // zafer zıplaması
      r.pivot.position.y = Math.sin(B.t / 0.6 * Math.PI) * 0.6;
      r.weaponArm.rotation.x = -2.9;
    }
    r.flash = Math.max(0, r.flash - dt * 6);
    applyFlash(r);
    const t = performance.now() / 1000;
    r.glow.forEach((g, i) => { g.material.opacity = 0.55 + Math.sin(t * 4 + i) * 0.25; });
    // Efsanevi+ kılıçtan parıltı
    if (S.equipped.weapon && S.equipped.weapon.r >= 3 && r.weapon && Math.random() < dt * 10) {
      const tip = r.weapon.localToWorld(r.weapon.userData.tip.clone());
      spawn(tip, { count: 1, color: RARITIES[S.equipped.weapon.r].color, tex: 'spark', speed: 0.5, size: 0.18, gravity: -1, life: 0.6 });
    }
  }
  function animateEnemy(dt) {
    const r = enemy, e = enemyData;
    if (!r) return;
    const st = B.state;
    const t = performance.now() / 1000;
    // pozisyon: yürüyerek gelir
    if (st === 'walk') r.root.position.x = 9 + (ENEMY_X - 9) * ease(B.t / WALK_TIME);
    else r.root.position.x = ENEMY_X;
    const walking = st === 'walk';
    const fighting = st === 'fight' || st === 'intro';
    let windK = 0, strikeK = 0;
    if (st === 'fight') {
      if (B.enemyRecover > 0) strikeK = 1 - B.enemyRecover / 0.25;
      else if (B.enemyAtkT < ENEMY_WINDUP) windK = 1 - B.enemyAtkT / ENEMY_WINDUP;
    }
    r.hurt = Math.max(0, r.hurt - dt * 4);
    r.pivot.rotation.x = 0;
    switch (r.kind) {
      case 'humanoid': {
        const pose = st === 'fight' ? humanoidAttackPose(r, B.enemyAtkT, ENEMY_WINDUP, B.enemyRecover, 0.25) : { arm: -0.5, twist: 0, lunge: 0 };
        if (r.kind2 === 'demon') { pose.arm -= 0; }
        animateHumanoid(r, dt, { walking: walking && !r.float, attack: pose });
        if (r.float) r.pivot.position.y += 0.3 + Math.sin(t * 2.2) * 0.1;
        break;
      }
      case 'slime': {
        r.walk += dt * (walking ? 9 : 3);
        const hop = walking ? Math.abs(Math.sin(r.walk)) * 0.4 : 0;
        let sy = 1 + Math.sin(r.walk * 2) * 0.05, sx = 1 / Math.sqrt(sy);
        let fz = 0, fy = hop;
        if (windK) { sy = 1 - windK * 0.35; sx = 1 + windK * 0.25; }
        if (strikeK) { const a = Math.sin(strikeK * Math.PI); fz = a * 1.0; fy = a * 0.6; sy = 1 + a * 0.2; sx = 1 - a * 0.1; }
        r.body.scale.set(sx, sy, sx);
        r.pivot.position.set(0, fy + (r.hover ? 0.25 + Math.sin(t * 3) * 0.12 : 0), fz);
        r.glow.forEach((g) => { g.material.opacity = 0.55 + Math.sin(t * 7) * 0.2; });
        break;
      }
      case 'wolf': {
        r.walk += dt * (walking ? 14 : 0);
        r.legs.forEach((l) => { l.rotation.x = walking ? Math.sin(r.walk + l.phase) * 0.7 : 0; });
        r.tail.rotation.x = Math.sin(t * 8) * 0.3;
        let py = walking ? Math.abs(Math.sin(r.walk)) * 0.06 : Math.sin(t * 3) * 0.02, pz = 0, rx = 0;
        if (windK) { py = -0.12 * windK; rx = -0.15 * windK; pz = -0.15 * windK; }
        if (strikeK) { const a = Math.sin(strikeK * Math.PI); pz = a * 1.2; py = a * 0.5; rx = 0.2 * a; }
        r.pivot.position.set(0, py, pz); r.pivot.rotation.x = rx;
        r.head.rotation.x = windK * 0.2;
        break;
      }
      case 'golem': {
        r.walk += dt * (walking ? 7 : 0);
        const sw = walking ? Math.sin(r.walk) : 0;
        r.legs[0].rotation.x = sw * 0.5; r.legs[1].rotation.x = -sw * 0.5;
        r.pivot.position.y = walking ? Math.abs(Math.cos(r.walk)) * 0.05 : 0;
        let arm = -0.2 + Math.sin(t * 2) * 0.05, lean = 0, pz = 0;
        if (walking) arm = sw * 0.4;
        if (windK) { arm = -0.2 - 2.4 * ease(windK); lean = -0.15 * windK; }
        if (strikeK) { const k = ease(Math.min(1, strikeK / 0.4)); arm = -2.6 + 2.6 * k; lean = 0.25 * Math.sin(strikeK * Math.PI); pz = 0.3 * Math.sin(strikeK * Math.PI); }
        r.arms.forEach((a) => { a.rotation.x = arm; });
        r.torso.rotation.x = lean; r.pivot.position.z = pz;
        break;
      }
    }
    r.pivot.rotation.z = 0;
    if (r.hurt > 0 && st !== 'enemyDeath') { r.pivot.position.z -= r.hurt * 0.25; r.pivot.rotation.x -= r.hurt * 0.2; }
    if (st === 'intro') {
      const k = Math.sin(clamp(B.t / 1.4, 0, 1) * Math.PI);
      r.pivot.scale.setScalar(1 + k * 0.12);
    } else r.pivot.scale.setScalar(1);
    if (st === 'enemyDeath') {
      const k = ease(B.t / 0.6);
      r.root.scale.setScalar((e.boss ? 1.6 : 1) * (1 - k));
      r.root.rotation.y = ENEMY_YAW + k * 4;
      r.root.position.y = Math.sin(k * Math.PI) * 0.4;
    }
    if (r.aura) { r.aura.rotation.z += dt * 1.5; r.aura.material.opacity = 0.35 + Math.sin(t * 5) * 0.15; }
    r.flash = Math.max(0, r.flash - dt * 6);
    applyFlash(r);
  }

  // ---------- Olaylar ----------
  const enemyCenter = () => new THREE.Vector3(ENEMY_X, enemyData && enemyData.boss ? 1.5 : 0.9, 0.2);
  const heroCenter = () => new THREE.Vector3(HERO_X, 1.1, 0.2);
  Bus.on('stageStart', ({ stage }) => setTheme(Math.floor(stage / 10) % THEMES.length));
  Bus.on('enemySpawn', (e) => spawnEnemyRig(e));
  Bus.on('gearChanged', () => rebuildHero());
  Bus.on('petChanged', () => rebuildPet());
  Bus.on('petHit', ({ dmg }) => {
    const p = PET_BY_ID[S.activePet];
    const target = enemy;
    setTimeout(() => {
      if (enemy !== target || B.state !== 'fight') return;
      const c = enemyCenter();
      spawn(c, { count: 8, color: [p ? p.color : '#fff', '#ffffff'], tex: 'spark', speed: 3, size: 0.22, dir: 1 });
      if (enemy) { enemy.flash = 0.7; enemy.hurt = 0.6; }
      floatText(new THREE.Vector3(ENEMY_X - 0.3, c.y + 0.5, 0.3), fmt(dmg), 'pet');
    }, 220);
  });
  Bus.on('thorns', ({ dmg }) => {
    const c = enemyCenter();
    spawn(c, { count: 5, color: ['#9cff7a', '#ffffff'], tex: 'spark', speed: 2, size: 0.18 });
    floatText(new THREE.Vector3(ENEMY_X + 0.4, c.y + 0.3, 0.3), fmt(dmg), 'thorn');
  });
  Bus.on('heroHit', ({ dmg, crit, double }) => {
    const c = enemyCenter();
    const wr = S.equipped.weapon ? RARITIES[S.equipped.weapon.r].color : '#ffffff';
    slash(ENEMY_X - 0.35, c.y + 0.1, crit ? '#ffd23a' : wr, crit, !!double);
    spawn(c, { count: crit ? 18 : 9, color: crit ? ['#ffd23a', '#ffffff', '#ff8a2a'] : ['#ffffff', wr], tex: 'spark', speed: crit ? 5 : 3.5, size: crit ? 0.35 : 0.25, dir: 1.5 });
    spawn(c, { count: 1, color: crit ? '#ffd23a' : '#ffffff', tex: 'glow', speed: 0, size: crit ? 1.6 : 0.9, gravity: 0, life: 0.15 });
    if (enemy) { enemy.flash = 1; enemy.hurt = 1; }
    floatText(new THREE.Vector3(ENEMY_X, c.y + 0.9, 0.3), fmt(dmg), crit ? 'crit' : double ? 'double' : '');
    shake = Math.max(shake, crit ? 0.18 : 0.05);
  });
  Bus.on('enemyHit', ({ dodged, dmg }) => {
    const c = heroCenter();
    if (dodged) { hero.dodge = 1; floatText(new THREE.Vector3(HERO_X, 2.3, 0.3), 'KAÇTI!', 'dodge'); return; }
    slash(HERO_X + 0.3, c.y, '#ff4a4a', false, true);
    spawn(c, { count: 7, color: ['#ff6a6a', '#ffffff'], tex: 'spark', speed: 3, size: 0.22, dir: -1.5 });
    hero.flash = 0.9; hero.hurt = 1;
    floatText(new THREE.Vector3(HERO_X, 2.3, 0.3), '-' + fmt(dmg), 'hurt');
    shake = Math.max(shake, enemyData.boss ? 0.2 : 0.07);
  });
  Bus.on('enemyKilled', ({ boss }) => {
    const c = enemyCenter();
    spawn(c, { count: boss ? 26 : 14, color: [new THREE.Color(enemyData.color).getStyle(), '#ffffff'], tex: 'smoke', speed: 2.5, size: boss ? 0.9 : 0.6, gravity: -0.5, life: 0.9, grow: 1.2 });
    spawn(c, { count: boss ? 40 : 16, color: ['#ffd23a', '#ffe98a', '#ffb300'], tex: 'spark', speed: 5, size: 0.22, up: 3, gravity: 9, life: 0.9 });
    shake = Math.max(shake, boss ? 0.35 : 0.1);
  });
  Bus.on('bossIntro', () => { shake = 0.3; });
  Bus.on('stageClear', () => {
    spawn(new THREE.Vector3(HERO_X, 2.2, 0.2), { count: 24, color: ['#ffd23a', '#7cf2ff', '#ff7ad9', '#9cff7a'], tex: 'spark', speed: 4, size: 0.25, up: 3, gravity: 5, life: 1.2 });
  });

  // ---------- Kamera / boyut ----------
  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camBase.z = Math.max(7.2, 2.9 / (tanH * camera.aspect));
    camBase.y = 2.0 + (camBase.z - 7.2) * 0.05;
  }
  new ResizeObserver(resize).observe(wrap);

  function update(dt) {
    if (!hero) { rebuildHero(); rebuildPet(); }
    // dünya kaydırma
    const target = (B.state === 'walk' || (B.state === 'clear' && B.t > 0.6)) ? 4.5 : 0;
    scrollV += (target - scrollV) * Math.min(1, dt * 6);
    for (const d of decor) { d.position.x -= scrollV * dt; if (d.position.x < -32) d.position.x += 64; }
    updateAmbient(dt, scrollV);
    animateHero(dt);
    animateEnemy(dt);
    animatePet(dt);
    updateParticles(dt);
    updateSlashes(dt);
    // kamera
    const zoomTarget = B.state === 'intro' ? 1 : 0;
    camZoom += (zoomTarget - camZoom) * Math.min(1, dt * 4);
    shake = Math.max(0, shake - dt * 1.2);
    const s = REDUCE_MOTION ? 0 : shake * shake * 3;
    // Boss büyük: kamerayı geri çek ve yukarı bak
    const bossTarget = enemyData && enemyData.boss && B.state !== 'clear' ? 1 : 0;
    bossK += (bossTarget - bossK) * Math.min(1, dt * 3);
    camera.position.set(
      camBase.x + camZoom * 1.0 + rand(-s, s),
      camBase.y + bossK * 0.6 - camZoom * 0.1 + rand(-s, s),
      camBase.z + bossK * 2.4 - camZoom * 2.5);
    camera.lookAt(camTarget.x + camZoom * 0.9, camTarget.y + bossK * 0.6 + camZoom * 0.9, 0);
    renderer.render(scene, camera);
  }

  resize();
  return {
    update, resize,
    screenPos,
    enemyScreen: () => screenPos(enemyCenter()),
    heroScreen: () => screenPos(heroCenter()),
    rebuildHero,
  };
})();
