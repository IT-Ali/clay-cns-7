// shared/bed.js: the clay hospital bed (pale grey frame, pale sage mattress, backrest raised to 45 degrees, one white
// pillow) and the bedside table with a clear glass of water. Classic script; needs THREE, K, CLAY. Defines window.BED.
//   BED.DIM          the bed's key measurements (shared with the patient model)
//   BED.build(S)     -> { group, pillow, placePillow(headBackWorld) }
//   BED.table(S)     -> { group, glass }   (on the patient's LEFT, the far side, near his head)
// v4: BED.configure({ backrestDeg }) BEFORE BED.build and PATIENT.build: 45 (default, unchanged) or 0 (flat: the backrest
//   lies down in line with the mattress, the head board moves to the new head end, and the bed gets TWO stacked white
// v5: out.setBackrest(deg) at RUNTIME (45 -> 0 -> 45 in the CNS video), out.setPillow(on), out.backrest(). See below.
//   pillows: out.pillows = [lower, upper], the same pillow twice). Everything derived from the angle (BED.DIM.angle,
//   BED.slope, BED.normal, BED.onBack, the backrest pieces, the strut) follows it. BED.flat is true when the angle is 0.
(function (root) {
  const THREE = root.THREE, K = root.K, CLAY = root.CLAY;
  const BED = (root.BED = {});
  const r45 = Math.PI / 4;
  BED.DIM = {
    Ym: 6.0,          // top of the flat part of the mattress
    Xh: -2.0,         // hinge where the backrest rises
    back: 8.4,        // backrest length along its slope
    angle: r45,       // 45 degrees
    xEnd: 10.6,       // foot end of the mattress
    half: 4.5,        // half width of the mattress (Z)
    thick: 1.2,
  };
  const D = BED.DIM;
  BED.slope = new THREE.Vector3(-Math.cos(D.angle), Math.sin(D.angle), 0);   // up the backrest
  BED.normal = new THREE.Vector3(Math.sin(D.angle), Math.cos(D.angle), 0);   // out of the backrest, toward the patient
  BED.onBack = (s, off) => new THREE.Vector3(D.Xh, D.Ym, 0).addScaledVector(BED.slope, s).addScaledVector(BED.normal, off);
  // v4: the backrest angle. Call before BED.build and PATIENT.build. 45 is the default (exactly the v3 bed); 0 is flat.
  BED.DEFAULT_DEG = 45;
  BED.config = { backrestDeg: 45 };
  BED.flat = false;
  BED.configure = (o = {}) => {
    const deg = o.backrestDeg == null ? BED.DEFAULT_DEG : +o.backrestDeg;
    if (!(deg >= 0 && deg <= 80)) throw new Error('BED.configure: backrestDeg must be between 0 and 80');
    BED.config = Object.assign({}, BED.config, { backrestDeg: deg });
    D.angle = deg === 45 ? r45 : deg * Math.PI / 180;           // 45 keeps the exact v3 value
    BED.slope.set(-Math.cos(D.angle), Math.sin(D.angle), 0);
    BED.normal.set(Math.sin(D.angle), Math.cos(D.angle), 0);
    BED.flat = deg === 0;
    return BED;
  };

  BED.mats = () => ({
    frame: CLAY.mat('#c8cbcf', '#b3b7bc', { rough: 0.55, streak: 0.4, scale: 2.7 }),
    frameDark: CLAY.mat('#9ea4aa', '#8b9197', { rough: 0.55, streak: 0.3, scale: 2.7 }),
    mattress: CLAY.mat('#c4d9c8', '#afc8b4', { rough: 0.7, streak: 0.5, scale: 2.7 }),
    pillow: CLAY.mat('#f3efe7', '#ddd5c6', { rough: 0.68, streak: 0.45, scale: 2.7 }),
    wood: CLAY.mat('#c69f77', '#ad8660', { rough: 0.62, streak: 0.6, freq: 1.6, scale: 2.7 }),
  });

  BED.build = (S, M) => {
    M = M || BED.mats();
    const g = new THREE.Group(); g.name = 'bed'; S.scene.add(g);
    let seed = 30;   // every piece shaped by hand (the reference lumpy(), scaled to the size of the piece)
    const box = (w, h, d, r, mat, p, rz) => { const big = Math.max(w, h, d), soft = mat === M.mattress; return CLAY.mesh(CLAY.lumpy(K.roundedBox(w, h, d, r, 5), { amount: soft ? 0.05 : 0.018, size: soft ? 2.2 : 1.2, seed: seed++, dents: soft ? 4 : 0, dentSize: 1.1, dentDepth: 0.05 }), mat, g, p, rz ? [0, 0, rz] : null); };
    // mattress: flat part and backrest part
    const flatL = D.xEnd - D.Xh;
    box(flatL, D.thick, D.half * 2, 0.45, M.mattress, [D.Xh + flatL / 2, D.Ym - D.thick / 2, 0]);
    const bc = BED.onBack(D.back / 2, -D.thick / 2);
    const backMat = box(D.back, D.thick, D.half * 2, 0.45, M.mattress, [bc.x, bc.y, 0], -D.angle);
    // fill the outer corner at the hinge
    CLAY.mesh(new THREE.CylinderGeometry(D.thick * 0.62, D.thick * 0.62, D.half * 2 - 0.3, 32).rotateX(Math.PI / 2), M.mattress, g, [D.Xh + 0.15, D.Ym - D.thick * 0.6, 0]);
    // frame: base deck, rails, backrest plate, legs and castors, head and foot boards
    box(flatL + 0.6, 0.45, D.half * 2 + 0.2, 0.18, M.frame, [D.Xh + flatL / 2, D.Ym - D.thick - 0.25, 0]);
    const pc = BED.onBack(D.back / 2, -D.thick - 0.25);
    const backPlate = box(D.back, 0.4, D.half * 2 + 0.2, 0.16, M.frame, [pc.x, pc.y, 0], -D.angle);
    // v4: any angle other than the default moves the head end with the backrest (v3 values kept exactly at 45 degrees)
    const v3 = D.angle === r45, headX = v3 ? -9.15 : Math.min(-9.15, BED.onBack(D.back, 0).x - 0.45);
    const xs = [v3 ? -6.6 : Math.min(-6.6, headX + 2.3), 10.0], zs = [-D.half + 0.6, D.half - 0.6];
    const railL = v3 ? 18.2 : 10.8 - (headX + 0.55), railX = v3 ? 1.7 : 10.8 - railL / 2;
    const rails = [box(railL, 0.5, 0.45, 0.2, M.frame, [railX, 3.6, zs[0]]), box(railL, 0.5, 0.45, 0.2, M.frame, [railX, 3.6, zs[1]])], headLegs = [];
    for (const x of xs) for (const z of zs) {
      const legParts = [CLAY.mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.6, 20), M.frame, g, [x, 2.4 + 0.1, z]),
        CLAY.mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 24).rotateX(Math.PI / 2), M.frameDark, g, [x, 0.42, z]),
        CLAY.mesh(K.roundedBox(0.6, 0.3, 0.5, 0.1), M.frameDark, g, [x, 0.75, z])];
      if (x === xs[0]) headLegs.push(...legParts);
    }
    // cross bar under the deck
    box(0.5, 0.45, D.half * 2 - 1, 0.2, M.frame, [2, 3.6, 0]);
    // backrest support strut
    // (at 45 degrees its points are the v3 literals; otherwise the same points under the backrest plate follow the angle)
    const strut = v3 ? [[-2.8, 3.9, 0], [-4.6, 6.0, 0], [-5.4, 7.3, 0]] : [[-2.8, 3.9, 0], BED.onBack(1.84, -1.84).toArray(), BED.onBack(3.32, -1.48).toArray()];
    if (!v3 && D.angle < 0.35) { strut[1][1] = Math.min(strut[1][1], 4.15); strut[2][1] = Math.min(strut[2][1], 4.3); }   // folded flat under the deck
    const strutMesh = CLAY.mesh(K.tube(strut, 0.2, { radial: 12 }), M.frame, g);
    // foot board (low) and head board
    box(0.45, 3.4, D.half * 2 + 0.3, 0.2, M.frame, [D.xEnd + 0.45, D.Ym - 0.5, 0]);
    const headBoard = box(0.45, 8.6, D.half * 2 + 0.3, 0.2, M.frame, [headX, 7.6, 0]);
    // pillow: placed against the head by placePillow
    const pillow = CLAY.mesh(K.roundedBox(2.6, 1.0, 5.4, 0.48, 8), M.pillow, g, null, null, 'pillow');
    // soften the pillow: pinch the corners and dent the middle a little
    { const p = pillow.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const e = Math.pow(Math.abs(z) / 2.7, 4); p.setY(i, y * (1 - 0.35 * e)); p.setX(i, x * (1 - 0.12 * e)); } pillow.geometry.computeVertexNormals(); pillow.geometry = CLAY.lumpy(pillow.geometry, { amount: 0.04, size: 1.0, seed: 77, dents: 3, dentSize: 0.8, dentDepth: 0.05 }); }
    // v4 flat bed: a second, identical pillow stacked on the first (turned round, so the two do not look stamped)
    const pillow2 = BED.flat ? CLAY.mesh(pillow.geometry, M.pillow, g, null, [0, Math.PI, 0], 'pillow-2') : null;
    const out = {
      group: g, pillow, pillows: pillow2 ? [pillow, pillow2] : [pillow],
      // the head rests on the pillow: thickness fills the gap between the mattress and the back of the head
      placePillow(headBack, s) {
        const n = BED.normal, off = headBack.clone().sub(new THREE.Vector3(D.Xh, D.Ym, 0)).dot(n);
        if (pillow2) {
          // flat: two pillows, each squashed to half the gap under the back of his head. The lower one reaches under his
          // shoulders, the upper one sits under his head. s (distance from the hinge toward the head end) is optional:
          // by default the pillows centre on the back of his head.
          const th = Math.max(1.0, off + 0.12), t1 = th / 2, xc = s == null ? headBack.x : BED.onBack(s, 0).x;
          pillow.scale.set(1, t1 / 1.0, 1); pillow2.scale.set(1, t1 / 1.0, 1);
          pillow.position.set(xc + 0.55, D.Ym + t1 / 2, 0); pillow.rotation.set(0, 0, 0);
          pillow2.position.set(xc + 0.15, D.Ym + t1 * 1.5 - 0.04, 0); pillow2.rotation.set(0, Math.PI, 0.03);
          return;
        }
        const th = Math.max(0.6, off + 0.14);
        pillow.scale.set(1, th / 1.0, 1);
        const c = BED.onBack(s, th / 2);
        pillow.position.set(c.x, c.y, 0); pillow.rotation.set(0, 0, -D.angle);
      },
    };
    // v5: the backrest at runtime (the CNS video lowers it from 45 degrees to flat and back) and the pillow on or off.
    // setBackrest(deg) turns the backrest mattress and plate about the hinge, folds the strut, and moves the head board,
    // the rails and the head-end legs exactly as BED.configure would have built them for that angle; BED.DIM.angle,
    // BED.slope, BED.normal and BED.onBack follow, so placePillow works at any angle. setBackrest(builtAngle) restores the
    // build exactly. The patient follows with P.setRecline(deg) (patient-neuro.js); re-apply his arms afterwards.
    const built = { deg: BED.config.backrestDeg, angle: D.angle, railL, railX, headX, xs0: xs[0], strut: strutMesh.geometry,
      backMat: [backMat.position.clone(), backMat.rotation.z], backPlate: [backPlate.position.clone(), backPlate.rotation.z] };
    let curDeg = built.deg;
    out.setBackrest = (deg) => {
      deg = K.clamp(+deg, 0, 80); if (Math.abs(deg - curDeg) < 1e-6) return; curDeg = deg;
      const a = Math.abs(deg - built.deg) < 1e-9 ? built.angle : deg === 45 ? r45 : deg * Math.PI / 180;
      D.angle = a; BED.slope.set(-Math.cos(a), Math.sin(a), 0); BED.normal.set(Math.sin(a), Math.cos(a), 0); BED.flat = deg === 0;
      if (a === built.angle) {
        backMat.position.copy(built.backMat[0]); backMat.rotation.z = built.backMat[1]; backPlate.position.copy(built.backPlate[0]); backPlate.rotation.z = built.backPlate[1];
        if (strutMesh.geometry !== built.strut) { strutMesh.geometry.dispose(); strutMesh.geometry = built.strut; }
        headBoard.position.x = built.headX; for (const r of rails) { r.scale.x = 1; r.position.x = built.railX; } for (const m of headLegs) m.position.x = built.xs0;
        return;
      }
      const bc2 = BED.onBack(D.back / 2, -D.thick / 2), pc2 = BED.onBack(D.back / 2, -D.thick - 0.25);
      backMat.position.set(bc2.x, bc2.y, 0); backMat.rotation.z = -a; backPlate.position.set(pc2.x, pc2.y, 0); backPlate.rotation.z = -a;
      const st = [[-2.8, 3.9, 0], BED.onBack(1.84, -1.84).toArray(), BED.onBack(3.32, -1.48).toArray()];
      if (a < 0.35) { st[1][1] = Math.min(st[1][1], 4.15); st[2][1] = Math.min(st[2][1], 4.3); }
      if (strutMesh.geometry !== built.strut) strutMesh.geometry.dispose(); strutMesh.geometry = K.tube(st, 0.2, { radial: 12 });
      const hx = Math.min(-9.15, BED.onBack(D.back, 0).x - 0.45), rl = 10.8 - (hx + 0.55);
      headBoard.position.x = hx; for (const r of rails) { r.scale.x = rl / built.railL; r.position.x = 10.8 - rl / 2; }
      for (const m of headLegs) m.position.x = Math.min(-6.6, hx + 2.3);
    };
    out.backrest = () => curDeg;
    out.setPillow = (on) => { for (const p of out.pillows) p.visible = !!on; };
    return out;
  };

  // the bedside table on the patient's LEFT (far side, -Z) near his head, with only a clear glass of water on it
  BED.table = (S, M) => {
    M = M || BED.mats();
    const g = new THREE.Group(); g.name = 'table'; S.scene.add(g);
    const x = -4.6, z = -7.6, top = 7.6;
    CLAY.mesh(CLAY.lumpy(K.roundedBox(4.2, 0.45, 3.4, 0.18, 5), { amount: 0.025, size: 1.2, seed: 81, dents: 2, dentSize: 0.6, dentDepth: 0.03 }), M.wood, g, [x, top - 0.22, z]);
    CLAY.mesh(CLAY.lumpy(K.roundedBox(3.7, 2.2, 3.0, 0.2, 5), { amount: 0.03, size: 1.4, seed: 82, dents: 2, dentSize: 0.7, dentDepth: 0.03 }), M.wood, g, [x, top - 1.8, z]);   // drawer box
    CLAY.mesh(K.roundedBox(1.2, 0.18, 0.2, 0.08, 4), M.frameDark || M.frame, g, [x, top - 1.75, z + 1.52]); // drawer handle
    for (const dx of [-1.7, 1.7]) for (const dz of [-1.3, 1.3]) CLAY.mesh(new THREE.CylinderGeometry(0.17, 0.14, top - 2.9, 16), M.wood, g, [x + dx, (top - 2.9) / 2, z + dz]);
    // glass of water: clear glass with a thick base, and the water inside
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, transmission: 1, thickness: 0.25, ior: 1.5, metalness: 0, transparent: false, specularIntensity: 1, envMapIntensity: 1.6 });
    const waterMat = new THREE.MeshPhysicalMaterial({ color: '#dff4f6', roughness: 0.02, transmission: 1, thickness: 0.8, ior: 1.33, metalness: 0, attenuationColor: new THREE.Color('#b9e3e6'), attenuationDistance: 3 });
    const gp = [x + 0.6, top, z + 0.2];
    const prof = [[0, 0], [0.42, 0], [0.47, 0.06], [0.5, 1.4], [0.53, 1.42], [0.5, 1.44], [0.45, 1.42], [0.43, 0.16], [0, 0.16]].map(([r, y]) => new THREE.Vector2(r, y));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glassMat); glass.position.set(...gp); glass.castShadow = true; g.add(glass);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.425, 0.42, 0.9, 48), waterMat); water.position.set(gp[0], top + 0.16 + 0.45, gp[2]); g.add(water);
    return { group: g, glass, water, at: new THREE.Vector3(gp[0], top + 0.7, gp[2]) };
  };
})(typeof window !== 'undefined' ? window : globalThis);
