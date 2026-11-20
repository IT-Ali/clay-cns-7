// shared/neuro-props.js (v5): the neurological instruments and test objects, in clay, at real size (1 unit = 10 cm).
// Classic script; needs THREE, K, CLAY and shared/props.js (adds to window.PROPS). Load after props.js.
//
// Every factory builds into S.scene and returns { group, pts: { name: local Vector3 }, ... }. Each object's own frame:
// +X along its length (from the end you hold toward its working end), +Y its "up" side, origin where it is held.
//   PROPS.tendonHammer(S)      Queen Square type: round disc head with a soft rubber rim on a long thin handle (29 cm), held
//                              at the end of the handle (pts.grip) so it swings; pts.strike = the rim that strikes,
//                              pts.pivot = the wrist end. hammer.setSwing(rad) turns the head about the grip (for the swing)
//   PROPS.tuningFork(S, { hz }) 128 (vibration: 20 cm, small weights on the prong ends) or 512 (hearing: 15 cm, plain prongs);
//                              a round foot, a stem, a U yoke and two prongs side by side (in the fork's XZ plane);
//                              pts.foot = the round foot placed on a bony point, pts.tips = between the prong tips;
//                              fork.setVibrate(u) spreads the prongs a hair (pose on twos for a buzz)
//   PROPS.cottonWisp(S)        a wisp of cotton wool twisted to a fine point (pts.tip), for the corneal reflex and light touch
//   PROPS.neuroPin(S)          a disposable neurological pin (Neurotip): plastic handle, sharp end (pts.sharp), blunt end (pts.blunt)
//   PROPS.coldMetal(S)         a cold steel rod (8 cm), pts.end
//   PROPS.penTorch(S)          pen torch with a soft light spot (a small spot light from the lens); torch.setOn(bool),
//                              pts.lens; torch.light is the THREE.SpotLight (aims along +X)
//   PROPS.key(S)               a brass door key (6.5 cm): a round bow with a hole, a shoulder, a toothed blade; pts.tip
//   PROPS.tongueDepressor(S)   wooden, 15 x 1.8 cm, pts.tip
//   PROPS.smellBottles(S)      two small brown glass bottles with black caps, side by side; returns { group, bottles: [a, b] }
//   PROPS.snellen(S)           a Snellen chart (22 x 50 cm card, real letters, rows 6/60 ... 6/5), front +Z, standing on its
//                              bottom edge (origin at the bottom centre)
//   PROPS.ishihara(S, { number })  an Ishihara book lying open at a plate with a number (default 12); origin at the spine
//   PROPS.pen(S), PROPS.wristwatch(S), PROPS.coin(S), PROPS.cupOfWater(S)
//   PROPS.place(prop, local, worldPoint, xDir, yDir)  turns the prop so its +X points along xDir (+Y toward yDir) and moves it
//                              so its local point (a name in prop.pts or a Vector3) sits on worldPoint
//   PROPS.inHand(prop, hand, opts)  holds the prop in a hand: its pts.grip (or opts.local) at the hand's contact
//                              (opts.contact, default 'thumbPad' and 'indexPad' midway), +X along the fingers turned by
//                              opts.roll; for a pinch use the defaults, for a fist grip pass { contact: 'palm' }
(function (root) {
  const THREE = root.THREE, K = root.K, CLAY = root.CLAY;
  const PROPS = root.PROPS || (root.PROPS = {});
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let seed = 9500;
  const mat = (a, b, o) => CLAY.mat(a, b, Object.assign({ fixedSeed: seed++ }, o));
  const M = () => PROPS._m || (PROPS._m = {
    steel: mat('#c3c8cd', '#a9afb5', { rough: 0.32, sheen: 0.2, streak: 0.35, freq: 3, bump: 0.5 }),
    chrome: mat('#d7dbdf', '#bcc2c8', { rough: 0.24, sheen: 0.1, streak: 0.25, freq: 3, bump: 0.35 }),
    rubber: mat('#c9352b', '#a92a22', { rough: 0.7, streak: 0.3, freq: 3 }),
    handle: mat('#2f3a7a', '#24305f', { rough: 0.45, streak: 0.4, freq: 3 }),
    white: mat('#f4efe6', '#e2dacb', { rough: 0.55, streak: 0.35, freq: 3 }),
    cotton: mat('#fbf8f2', '#ece5d8', { rough: 0.95, streak: 0.4, freq: 8, bump: 2.5, sheen: 0.7 }),
    yellow: mat('#f4ad08', '#ee7f14', { rough: 0.45, streak: 0.4, freq: 3 }),
    brass: mat('#d4a64a', '#b48633', { rough: 0.33, sheen: 0.25, streak: 0.45, freq: 3 }),
    wood: mat('#e3c590', '#cfae78', { rough: 0.7, streak: 0.6, freq: 4 }),
    amber: mat('#7a3d12', '#5c2c0b', { rough: 0.2, sheen: 0.3, streak: 0.3, freq: 3 }),
    black: mat('#24252a', '#16171b', { rough: 0.5, streak: 0.3, freq: 3 }),
    navy: mat('#253677', '#4467b8', { rough: 0.4, streak: 0.4, freq: 3 }),
    strap: mat('#5a3a26', '#46301f', { rough: 0.65, streak: 0.4, freq: 3 }),
    cup: mat('#f3f1ec', '#e3dfd6', { rough: 0.5, streak: 0.3, freq: 3 }),
  });
  const grp = (S, name) => { const g = new THREE.Group(); g.name = name; S.scene.add(g); return g; };
  const mesh = (geo, m, parent, pos, rot, name) => CLAY.mesh(geo, m, parent, pos, rot, name);
  const rodX = (r0, r1, L, rad = 20) => { const g = new THREE.CylinderGeometry(r1, r0, L, rad); g.rotateZ(-Math.PI / 2); g.translate(L / 2, 0, 0); return g; };
  const pts = (o) => { const out = {}; for (const [k, v] of Object.entries(o)) out[k] = V(...v); return out; };
  // a canvas texture on a clay card face
  const faceMat = (w, h, draw, rough = 0.6) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const m = mat('#ffffff', '#ffffff', { rough, streak: 0, freq: 3, bump: 0.3 }); m.map = t; return m;
  };

  PROPS.tendonHammer = (S) => {
    const m = M(), g0 = grp(S, 'tendon-hammer'), g = new THREE.Group(), head = new THREE.Group(); g0.add(g); g.add(head);   // g turns inside g0 about the end of the handle (the swing)
    const LEN = 2.6, R = 0.27;
    mesh(CLAY.loft([{ s: 0, a: 0.05, c: 0.05 }, { s: 0.25, a: 0.042, c: 0.042 }, { s: 1.4, a: 0.034, c: 0.034 }, { s: LEN, a: 0.03, c: 0.03 }], { axis: 'x', radial: 18, rings: 30, capStart: 0.9, capEnd: 0.3 }), m.chrome, g, null, null, 'hammer-handle');
    head.position.set(LEN, 0, 0);
    // the disc stands in the plane of the handle (XY), the handle entering its edge; a soft rubber rim all round
    mesh(new THREE.CylinderGeometry(R * 0.92, R * 0.92, 0.07, 48).rotateX(Math.PI / 2), m.steel, head, [R * 0.98, 0, 0]);
    mesh(new THREE.TorusGeometry(R * 0.93, 0.055, 16, 64), m.rubber, head, [R * 0.98, 0, 0]);
    mesh(new THREE.SphereGeometry(0.05, 16, 12), m.steel, head, [R * 0.98, 0, 0.045]); mesh(new THREE.SphereGeometry(0.05, 16, 12), m.steel, head, [R * 0.98, 0, -0.045]);
    return { group: g0, head, pts: pts({ grip: [0.12, 0, 0], pivot: [0, 0, 0], strike: [LEN + R * 0.98, -R * 0.98 - 0.05, 0], strikeTop: [LEN + R * 0.98, R * 0.98 + 0.05, 0], centre: [LEN + R * 0.98, 0, 0] }),
      setSwing(a) { g.rotation.z = a; }, strikeWorld() { g0.updateMatrixWorld(true); return g.localToWorld(V(LEN + R * 0.98, -R * 0.98 - 0.05, 0)); } };
  };
  PROPS.tuningFork = (S, o = {}) => {
    // a round foot, a stem, the U-shaped yoke and two prongs side by side (in the object's XZ plane, so both prongs show
    // when the fork lies flat); the 128 Hz fork (20 cm) has the small square weights on the prong ends, the 512 Hz (15 cm) none
    const m = M(), lo = (o.hz || 128) <= 256, g = grp(S, 'tuning-fork-' + (lo ? 128 : 512));
    const LEN = lo ? 2.0 : 1.5, stem = lo ? 0.62 : 0.5, gap = lo ? 0.2 : 0.15, w = lo ? 0.075 : 0.06, th = lo ? 0.085 : 0.07, yokeR = gap / 2 + w / 2;
    mesh(new THREE.CylinderGeometry(0.11, 0.115, 0.05, 32).rotateZ(Math.PI / 2), m.steel, g, [0.025, 0, 0]);       // the round foot
    mesh(rodX(0.038, 0.034, stem, 18), m.steel, g, [0.03, 0, 0]);                                                   // the stem
    const yx = 0.03 + stem + yokeR;                                                                                   // the centre of the U
    const U = []; for (let k = 0; k <= 16; k++) { const a = Math.PI / 2 + Math.PI * k / 16; U.push([yx + Math.cos(a) * yokeR, 0, Math.sin(a) * yokeR]); }
    mesh(K.tube(U, w * 0.55, { radial: 14, segments: 40 }), m.steel, g);
    const prong = LEN - (yx - 0.0), prongs = [];
    for (const sz of [-1, 1]) {
      const pg = new THREE.Group(); pg.position.set(yx, 0, sz * yokeR); g.add(pg);
      mesh(K.roundedBox(prong, th, w, w * 0.45, 3).translate(prong / 2, 0, 0), m.steel, pg);
      if (lo) mesh(K.roundedBox(0.22, th * 1.6, w * 1.9, 0.035, 3), m.chrome, pg, [prong - 0.13, 0, sz * w * 0.55]);   // the weights (dampers)
      prongs.push({ pg, sz, z0: pg.position.z });
    }
    return { group: g, hz: lo ? 128 : 512, length: LEN, pts: pts({ foot: [-0.002, 0, 0], grip: [stem * 0.45, 0, 0], tips: [LEN, 0, 0], prongTip: [LEN, 0, yokeR] }),
      setVibrate(u) { for (const p of prongs) p.pg.position.z = p.z0 + p.sz * 0.008 * u; } };
  };
  PROPS.cottonWisp = (S) => {
    const m = M(), g = grp(S, 'cotton-wisp');
    const geo = CLAY.loft([{ s: 0, a: 0.06, c: 0.055 }, { s: 0.06, a: 0.075, c: 0.065 }, { s: 0.15, a: 0.05, c: 0.045 }, { s: 0.26, a: 0.018, c: 0.016 }, { s: 0.33, a: 0.004, c: 0.004 }], { axis: 'x', radial: 28, rings: 30, capStart: 0.9, capEnd: 0.2, deform: (p, s, a) => { const k = 1 + 0.18 * Math.sin(a * 5 + s * 40) * K.smooth(0.0, 0.2, s); p.y *= k; p.z *= k; const tw = s * 9; const y = p.y, z = p.z; p.y = y * Math.cos(tw) - z * Math.sin(tw); p.z = y * Math.sin(tw) + z * Math.cos(tw); } });
    mesh(CLAY.lumpy(geo, { amount: 0.008, size: 0.05, seed: 77, dents: 4, dentSize: 0.03, dentDepth: 0.006 }), m.cotton, g);
    return { group: g, pts: pts({ grip: [0.03, 0, 0], tip: [0.33, 0, 0] }) };
  };
  PROPS.neuroPin = (S) => {
    const m = M(), g = grp(S, 'neuro-pin');
    mesh(CLAY.loft([{ s: 0, a: 0.03, c: 0.03 }, { s: 0.05, a: 0.038, c: 0.038 }, { s: 0.55, a: 0.036, c: 0.03 }, { s: 0.66, a: 0.024, c: 0.022 }], { axis: 'x', radial: 20, rings: 16, capStart: 0.9, capEnd: 0.5 }), m.yellow, g);
    mesh(rodX(0.009, 0.0015, 0.09, 10), m.chrome, g, [0.66, 0, 0]);
    mesh(new THREE.SphereGeometry(0.032, 14, 10), m.white, g, [0.0, 0, 0]);
    return { group: g, pts: pts({ grip: [0.3, 0, 0], sharp: [0.75, 0, 0], blunt: [-0.03, 0, 0] }) };
  };
  PROPS.coldMetal = (S) => {
    const m = M(), g = grp(S, 'cold-metal');
    mesh(CLAY.loft([{ s: 0, a: 0.06, c: 0.06 }, { s: 0.8, a: 0.06, c: 0.06 }], { axis: 'x', radial: 28, rings: 6, capStart: 0.35, capEnd: 0.35 }), m.chrome, g);
    return { group: g, pts: pts({ grip: [0.25, 0, 0], end: [0.82, 0, 0], side: [0.6, 0.06, 0] }) };
  };
  PROPS.penTorch = (S, o = {}) => {
    const m = M(), g = grp(S, 'pen-torch');
    mesh(CLAY.loft([{ s: 0, a: 0.06, c: 0.06 }, { s: 1.15, a: 0.065, c: 0.065 }, { s: 1.3, a: 0.07, c: 0.07 }], { axis: 'x', radial: 24, rings: 10, capStart: 0.5, capEnd: 0 }), m.navy, g);
    mesh(K.roundedBox(0.45, 0.02, 0.04, 0.01, 2), m.chrome, g, [0.35, 0.075, 0]);
    const lensMat = new THREE.MeshPhysicalMaterial({ color: '#fffbe8', emissive: new THREE.Color('#fff4cf'), emissiveIntensity: 0, roughness: 0.15 });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24).rotateZ(Math.PI / 2), lensMat); lens.position.set(1.305, 0, 0); g.add(lens);
    const light = new THREE.SpotLight('#fff3d6', 0, 12, 0.16, 0.85, 2); light.position.set(1.33, 0, 0); light.target.position.set(4, 0, 0); g.add(light, light.target);
    const power = o.power || 45;
    return { group: g, light, lens, pts: pts({ grip: [0.5, 0, 0], lens: [1.32, 0, 0] }),
      setOn(on) { light.intensity = on ? power : 0; lensMat.emissiveIntensity = on ? 3.0 : 0; } };
  };
  PROPS.key = (S) => {
    // a door key, 6 cm: a round bow with a hole, a shoulder, a shank and a toothed blade (flat: thickness along Y)
    const m = M(), g = grp(S, 'key'), T = 0.024;
    const ext = (shape) => { const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 32 }); geo.translate(0, 0, -T / 2); geo.rotateX(Math.PI / 2); geo.computeVertexNormals(); return geo; };
    const bow = new THREE.Shape(); bow.absarc(0.11, 0, 0.11, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0.085, 0, 0.038, 0, Math.PI * 2, true); bow.holes.push(hole);
    mesh(ext(bow), m.brass, g, null, null, 'key-bow');
    const b = new THREE.Shape(), P2 = [[0.2, 0.05], [0.25, 0.05], [0.25, 0.03], [0.62, 0.03], [0.65, 0.0], [0.62, -0.03], [0.6, -0.03], [0.57, -0.06], [0.54, -0.03], [0.51, -0.075], [0.47, -0.035], [0.44, -0.065], [0.41, -0.035], [0.38, -0.07], [0.34, -0.03], [0.25, -0.03], [0.25, -0.05], [0.2, -0.05]];
    b.moveTo(...P2[0]); for (const q of P2.slice(1)) b.lineTo(...q); b.closePath();
    mesh(ext(b), m.brass, g, null, null, 'key-blade');
    mesh(K.roundedBox(0.36, 0.012, 0.008, 0.004, 2), m.brass, g, [0.44, T / 2 + 0.002, 0.008]);   // the groove ridge along the blade
    return { group: g, pts: pts({ grip: [0.11, 0, 0], tip: [0.65, 0, 0] }) };
  };
  PROPS.tongueDepressor = (S) => {
    const m = M(), g = grp(S, 'tongue-depressor');
    const geo = K.roundedBox(1.5, 0.022, 0.18, 0.011, 3), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), ex = Math.max(0, Math.abs(x) - 0.66); if (ex > 0) p.setZ(i, p.getZ(i) * Math.sqrt(Math.max(0, 1 - (ex / 0.09) ** 2))); }
    geo.computeVertexNormals(); geo.translate(0.75, 0, 0);
    mesh(geo, m.wood, g);
    return { group: g, pts: pts({ grip: [0.2, 0, 0], tip: [1.45, 0, 0], blade: [1.2, 0.011, 0] }) };
  };
  PROPS.smellBottles = (S) => {
    const m = M(), g = grp(S, 'smell-bottles'), bottles = [];
    for (const dx of [-0.17, 0.17]) {
      const b = new THREE.Group(); b.position.x = dx; g.add(b);
      mesh(new THREE.LatheGeometry([[0, 0], [0.12, 0], [0.13, 0.02], [0.13, 0.3], [0.1, 0.36], [0.055, 0.39], [0.055, 0.42], [0, 0.42]].map(([r, y]) => new THREE.Vector2(r, y)), 32), m.amber, b);
      mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.1, 24), m.black, b, [0, 0.46, 0]);
      mesh(K.roundedRect(0.16, 0.12, 0.02), faceMat(128, 96, (c, w, h) => { c.fillStyle = '#f4efe2'; c.fillRect(0, 0, w, h); c.fillStyle = '#26336b'; for (let k = 0; k < 3; k++) c.fillRect(14, 22 + k * 22, w - 28 - k * 18, 8); }), b, [0, 0.17, 0.131]);
      bottles.push(b);
    }
    return { group: g, bottles, pts: pts({ neckA: [-0.17, 0.42, 0], neckB: [0.17, 0.42, 0] }) };
  };
  PROPS.snellen = (S) => {
    const m = M(), g = grp(S, 'snellen-chart'), W = 2.2, H = 5.0;
    mesh(CLAY.lumpy(K.roundedBox(W, H, 0.06, 0.03, 3), { amount: 0.004, size: 0.8, seed: 41 }), m.white, g, [0, H / 2, 0]);
    const rows = [['E', '6/60'], ['F P', '6/36'], ['T O Z', '6/24'], ['L P E D', '6/18'], ['P E C F D', '6/12'], ['E D F C Z P', '6/9'], ['F E L O P Z D', '6/6'], ['D E F P O T E C', '6/5']];
    const face = faceMat(440, 1000, (c, w, h) => {
      c.fillStyle = '#fbf9f4'; c.fillRect(0, 0, w, h); c.fillStyle = '#121212'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const sizes = [190, 118, 82, 62, 44, 33, 23, 17]; let y = 40;
      rows.forEach(([t, lab], i) => {
        y += sizes[i] * 1.18 + 10; c.font = `bold ${sizes[i]}px "DejaVu Sans", Arial, sans-serif`;
        c.save(); c.translate(w / 2 - 10, y); const letters = t.split(' '), sp = sizes[i] * 0.95; letters.forEach((L, k) => c.fillText(L, (k - (letters.length - 1) / 2) * sp, 0)); c.restore();
        c.font = '13px "DejaVu Sans", Arial, sans-serif'; c.fillStyle = '#7a1c1c'; c.textAlign = 'right'; c.fillText(lab, w - 8, y); c.fillStyle = '#121212'; c.textAlign = 'center';
        if (i === 6) { c.fillStyle = '#b52a2a'; c.fillRect(20, y + 8, w - 40, 3); c.fillStyle = '#121212'; }
      });
    }, 0.7);
    mesh(K.roundedRect(W - 0.12, H - 0.12, 0.03), face, g, [0, H / 2, 0.032]);
    return { group: g, pts: pts({ top: [0, H, 0], centre: [0, H / 2, 0.04], bottom: [0, 0, 0] }) };
  };
  PROPS.ishihara = (S, o = {}) => {
    const m = M(), g = grp(S, 'ishihara-book'), num = String(o.number == null ? 12 : o.number), PW = 1.25, PH = 1.75, tilt = 0.1;
    const plate = faceMat(512, 716, (c, w, h) => {
      c.fillStyle = '#f6f1e6'; c.fillRect(0, 0, w, h);
      const mk = document.createElement('canvas'); mk.width = mk.height = 400; const x = mk.getContext('2d'); x.fillStyle = '#000'; x.font = 'bold 250px "DejaVu Sans", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(num, 200, 210);
      const md = x.getImageData(0, 0, 400, 400).data, r = K.rng(5), cx = w / 2, cy = h * 0.44, R = 225, dots = [];
      for (let t = 0; t < 60000 && dots.length < 4200; t++) {
        const rr = r.range(2.6, 7.5), a = r.range(0, 6.283), d = Math.sqrt(r.range(0, 1)) * (R - rr), px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d;
        if (dots.some((q) => Math.hypot(q[0] - px, q[1] - py) < q[2] + rr + 1.2)) continue;
        dots.push([px, py, rr]);
        const mx = Math.round((px - cx) / R * 200 + 200), my = Math.round((py - cy) / R * 200 + 200), inside = md[(my * 400 + mx) * 4 + 3] > 120;
        const pal = inside ? ['#e2561f', '#d9471a', '#ef6f2c', '#e86424'] : ['#6f9a3c', '#86ad48', '#9fbd57', '#5f8a33', '#a9b85e'];
        c.fillStyle = pal[Math.floor(r() * pal.length)]; c.beginPath(); c.arc(px, py, rr, 0, 7); c.fill();
      }
      c.fillStyle = '#9a9286'; c.font = '20px "DejaVu Sans", Arial, sans-serif'; c.textAlign = 'center'; c.fillText('1', w / 2, h - 40);
    }, 0.65);
    const blank = faceMat(256, 358, (c, w, h) => { c.fillStyle = '#f6f1e6'; c.fillRect(0, 0, w, h); c.fillStyle = '#b8b0a2'; for (let k = 0; k < 8; k++) c.fillRect(30, 60 + k * 26, w - 60 - (k % 3) * 30, 6); }, 0.65);
    for (const s of [-1, 1]) {
      const pg = new THREE.Group(); pg.rotation.z = -s * tilt; g.add(pg);
      mesh(K.roundedBox(PW, 0.08, PH, 0.03, 3), m.navy, pg, [s * PW / 2, -0.03, 0]);                // the cover
      mesh(K.roundedBox(PW - 0.06, 0.05, PH - 0.08, 0.02, 3), m.white, pg, [s * (PW / 2 - 0.01), 0.03, 0]);   // the pages
      const f = mesh(K.roundedRect(PW - 0.12, PH - 0.14, 0.02), s > 0 ? plate : blank, pg, [s * (PW / 2 - 0.01), 0.057, 0], [-Math.PI / 2, 0, 0]);
    }
    return { group: g, pts: pts({ plate: [PW / 2, 0.06, -0.1], spine: [0, 0, 0] }) };
  };
  PROPS.pen = (S) => {
    const m = M(), g = grp(S, 'pen');
    mesh(CLAY.loft([{ s: 0, a: 0.004, c: 0.004 }, { s: 0.08, a: 0.035, c: 0.035 }, { s: 1.38, a: 0.045, c: 0.045 }], { axis: 'x', radial: 20, rings: 14, capStart: 0, capEnd: 0.4 }), m.navy, g);
    mesh(new THREE.ConeGeometry(0.012, 0.05, 10).rotateZ(Math.PI / 2), m.chrome, g, [-0.012, 0, 0]);
    mesh(K.roundedBox(0.4, 0.016, 0.035, 0.008, 2), m.chrome, g, [1.12, 0.055, 0]);
    return { group: g, pts: pts({ grip: [0.5, 0, 0], tip: [-0.035, 0, 0] }) };
  };
  PROPS.wristwatch = (S) => {
    const m = M(), g = grp(S, 'wristwatch');
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 40), m.steel, g, [0, 0, 0]);
    const face = faceMat(256, 256, (c, w, h) => {
      c.fillStyle = '#f8f5ee'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill(); c.strokeStyle = '#1b1d2a';
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; c.lineWidth = k % 3 ? 4 : 8; c.beginPath(); c.moveTo(128 + Math.sin(a) * 98, 128 - Math.cos(a) * 98); c.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116); c.stroke(); }
      const hand = (a, L, wd) => { c.lineWidth = wd; c.lineCap = 'round'; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.sin(a) * L, 128 - Math.cos(a) * L); c.stroke(); };
      hand(10.1 / 12 * 6.283, 60, 9); hand(2 / 12 * 6.283, 92, 6); c.fillStyle = '#1b1d2a'; c.beginPath(); c.arc(128, 128, 8, 0, 7); c.fill();
    }, 0.3);
    mesh(new THREE.CircleGeometry(0.17, 40).rotateX(-Math.PI / 2), face, g, [0, 0.046, 0]);
    mesh(new THREE.TorusGeometry(0.18, 0.022, 10, 40).rotateX(Math.PI / 2), m.chrome, g, [0, 0.05, 0]);
    for (const s of [-1, 1]) mesh(CLAY.loft([{ s: 0, a: 0.13, c: 0.02 }, { s: 0.55, a: 0.12, c: 0.018 }], { axis: 'x', radial: 16, rings: 8, pow: 4, capStart: 0.2, capEnd: 0.4, deform: (p, sx) => { p.y -= 0.35 * sx * sx; } }), m.strap, g, [s * 0.17, 0, 0], [0, s > 0 ? 0 : Math.PI, 0]);
    return { group: g, pts: pts({ face: [0, 0.05, 0], grip: [0.45, 0, 0] }) };
  };
  PROPS.coin = (S) => {
    const m = M(), g = grp(S, 'coin'), R = 0.12, T = 0.02;
    const prof = [[0, T / 2 - 0.003], [R * 0.75, T / 2 - 0.003], [R * 0.85, T / 2], [R * 0.97, T / 2 - 0.001], [R, T / 2 - 0.006], [R, -T / 2 + 0.006], [R * 0.97, -T / 2 + 0.001], [R * 0.85, -T / 2], [R * 0.75, -T / 2 + 0.003], [0, -T / 2 + 0.003]].reverse();
    mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48), m.brass, g);
    mesh(new THREE.TorusGeometry(R * 0.45, 0.004, 6, 32).rotateX(Math.PI / 2), m.brass, g, [0, T / 2 - 0.002, 0]);
    return { group: g, pts: pts({ grip: [0, 0, 0], edge: [R, 0, 0] }) };
  };
  PROPS.cupOfWater = (S) => {
    const m = M(), g = grp(S, 'cup-of-water'), H = 0.7, R1 = 0.33, R0 = 0.25;
    mesh(new THREE.LatheGeometry([[0, 0], [R0, 0], [R0 + 0.01, 0.01], [R1, H - 0.02], [R1 + 0.015, H], [R1 - 0.01, H + 0.005], [R1 - 0.025, H - 0.02], [R0 - 0.02, 0.03], [0, 0.03]].map(([r, y]) => new THREE.Vector2(r, y)), 40), m.cup, g);
    const water = new THREE.Mesh(new THREE.CircleGeometry(R0 + (R1 - R0) * 0.78 - 0.03, 40).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#cfe9ee', roughness: 0.05, metalness: 0, transmission: 0.6, transparent: true, opacity: 0.85, ior: 1.33 }));
    water.position.y = H * 0.78; g.add(water);
    return { group: g, pts: pts({ rim: [R1, H, 0], grip: [R1 * 0.9, H * 0.5, 0], water: [0, H * 0.78, 0] }) };
  };
  // ---- placing
  PROPS.place = (prop, local, at, xDir, yDir) => {
    const lp = typeof local === 'string' ? prop.pts[local] : local, x = xDir.clone().normalize(), y0 = (yDir || V(0, 1, 0)).clone();
    const y = y0.sub(x.clone().multiplyScalar(y0.dot(x))).normalize(), z = new THREE.Vector3().crossVectors(x, y);
    const g = prop.group; g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    g.position.copy(at).sub(lp.clone().applyQuaternion(g.quaternion).multiply(g.scale));
    g.updateMatrixWorld(true); return prop;
  };
  PROPS.inHand = (prop, hand, o = {}) => {
    hand.group.updateMatrixWorld(true);
    const at = o.contact ? hand.world(o.contact) : hand.world('thumbPad').add(hand.world('indexPad')).multiplyScalar(0.5);
    const mw = hand.group.matrixWorld, fd = V(1, 0, 0).transformDirection(mw), dd = V(0, 1, 0).transformDirection(mw);
    const x = o.xDir || fd.clone().applyAxisAngle(dd, o.roll || 0), y = o.yDir || dd;
    return PROPS.place(prop, o.local || 'grip', at.add(o.offset || V(0, 0, 0)), x, y);
  };
})(typeof window !== 'undefined' ? window : globalThis);
