// shared/neuro.js (v5): the NEURO landmarks and the CNS poses, so every part of the neurological examination uses the
// same points and the same positions. Classic script; needs THREE, K, HANDS, BED, HOME and the neuro patient
// (PATIENT.build(S, { neuro: true }), shared/patient-neuro.js). Defines window.NEURO.
//
//   NEURO.points(P)     -> { name: THREE.Vector3 | [Vector3, ...] }  world points ON his skin, recomputed on every call, so
//                          they follow every pose (legs, arms, head, face, shrug, recline) and the breathing. Call it after
//                          posing the frame. Single points have their outward normals in .normals[name]. R = his RIGHT
//                          (+Z, the examiner's side), L = his LEFT. Names: see NEURO.NAMES (and README "v5: neuro mode").
//   NEURO.list(P)       -> [{ name, group, point, normal }] the same, flat (lines are given as their points name.0, name.1 ...)
//   NEURO.HAND          the patient's hand poses for hand.pose / P.setArm: relaxed, open, together, fist, grip, point, hook, thumbFlex,
//                       spread, cup, pat
//   NEURO.arm(P, side, name, opts) -> an arm state { wrist, quat, pose, pole } for P.setArm (HOME.applyArm): 'rest',
//                       'outstretched' (straight out in front, horizontal at shoulder height, palms up, fingers together; opts.drift 0..1 turns the palm in and lets it sink),
//                       'acrossAbdomen', 'acrossChest', 'fingerNose' (index tip on the tip of his nose), 'fingerTo' (index tip
//                       on opts.at), 'abduct90' (shoulder out 90 degrees, elbow bent 90), 'wrist' (forearm out in front,
//                       palm down; opts.flex + = wrist bent up (extension), - = down), 'jendrassik' (both hands hooked
//                       in front of his chest; opts.pull 0..1), 'pat' (rapid alternating: the left palm up on his lap,
//                       the right hand patting it; opts.flip 0 = palm, 1 = back of the hand; opts.lift 0..1 height),
//                       'palmUp' (resting palm up beside him: stereognosis, opts.pose)
//   NEURO.leg(P, side, name, opts) -> sets and returns the leg state: 'rest', 'kneeLift' (opts.knee 0..80: the knee rises,
//                       the heel slides on the mattress), '9090', 'kernig' (hip 90, opts.knee from 90 down to 0),
//                       'footFlat' (knee bent, the foot flat on the mattress, opts.knee), 'heelShin' (the heel on the other
//                       knee, opts.u 0..1 slides it down the shin), 'kneeJerk' (knee slightly bent, heel on the bed;
//                       opts.knee, default 30), 'ankleJerk' (turned out, knee bent, the outer ankle resting across the
//                       other shin), 'plantar' (opts.response: 'flexor' | 'extensor')
//   NEURO.kneeSupport(P) -> world point under both knees, where the examiner's forearm goes for the knee jerks
(function (root) {
  const THREE = root.THREE, K = root.K, HANDS = root.HANDS, BED = root.BED;
  const NEURO = (root.NEURO = {});
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rc = new THREE.Raycaster();

  // ------------------------------------------------------------------------------------------------ the face
  // head-local points (x his left, y up, z forward) found once on the face surface (from the front or the side), then
  // read from the live surface (vertex) every call, so they move with the jaw, the face shapes and the head
  const FACE = {
    V1: { at: [0.24, 0.5], dir: 'front' }, V2: { at: [0.42, -0.14], dir: 'front' }, V3: { at: [0.24, -0.66], dir: 'front' },
    jawAngle: { at: [-0.64, 0.05], dir: 'side' }, masseter: { at: [-0.46, 0.32], dir: 'side' }, temporalis: { at: [0.34, 0.2], dir: 'side' },
    chin: { at: [0, -0.76], dir: 'front', single: true }, noseTip: { at: [0, -0.2], dir: 'front', single: true }, forehead: { at: [0, 0.48], dir: 'front', single: true },
  };
  const faceIdx = new WeakMap();
  const faceVertex = (P, cr, name, sx) => {
    let m = faceIdx.get(cr); if (!m) faceIdx.set(cr, (m = {}));
    const key = name + sx;
    if (m[key] == null) {
      const f = FACE[name], g = cr.geometry, A = g.attributes.position;
      // first call: raycast the current surface in head-local space, keep the nearest vertex of the face hit
      const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      let o, d;
      if (f.dir === 'front') { o = V(sx * f.at[0], f.at[1], 3); d = V(0, 0, -1); } else { o = V(sx * 3, f.at[0], f.at[1]); d = V(-sx, 0, 0); }
      rc.set(o, d); const h = rc.intersectObject(mesh, false)[0];
      if (!h) throw new Error('NEURO: face point ' + name + ' not found on the face');
      let best = 0, bd = 1e9; for (const vi of [h.face.a, h.face.b, h.face.c]) { const dd = V(A.getX(vi), A.getY(vi), A.getZ(vi)).distanceTo(h.point); if (dd < bd) { bd = dd; best = vi; } }
      m[key] = best;
    }
    const A = cr.geometry.attributes.position, Nn = cr.geometry.attributes.normal, i = m[key];
    cr.updateMatrixWorld(true);
    return { p: V(A.getX(i), A.getY(i), A.getZ(i)).applyMatrix4(cr.matrixWorld), n: V(Nn.getX(i), Nn.getY(i), Nn.getZ(i)).transformDirection(cr.matrixWorld).normalize() };
  };
  // ------------------------------------------------------------------------------------------------ the arms
  // a point on the one-piece arm: x along the arm from the shoulder (elbow at 3.0, wrist at 5.6), on the side given
  // ('palmar', 'dorsal', 'radial', 'ulnar' or a mix as [dy, dz-radial]); the vertex is found on the rest shape once
  const ARM = {
    bicepsTendon: [2.95, 'palmar', 0.15], tricepsTendon: [2.68, 'dorsal', 0], brachioradialisTendon: [5.1, 'radial', 0.25],
    C5: [1.45, 'radial', 0.2], T1: [3.95, 'ulnar', -0.45],
    deltoid: [0.55, 'radial', 0.35], biceps: [1.75, 'palmar', 0], triceps: [1.6, 'dorsal', 0], wristExtensors: [3.85, 'dorsal', 0.35], fingerFlexors: [3.95, 'palmar', -0.3],
  };
  const armIdx = {};
  const armVertex = (P, side, name) => {
    const a = P.arms[side], m = a.armMesh, B = m.userData.base, zs = side === 'R' ? 1 : -1, key = side + name;
    if (armIdx[key] == null) {
      const [x, kind, mix] = ARM[name];
      // directions in the arm's rest cross-section: palmar -y, dorsal +y, radial -z*zs, ulnar +z*zs
      const D = { palmar: [-1, 0], dorsal: [1, 0], radial: [0, -zs], ulnar: [0, zs] }[kind], dir = kind === 'palmar' || kind === 'dorsal' ? [D[0], -zs * mix] : [mix, D[1]];
      const L = Math.hypot(dir[0], dir[1]); dir[0] /= L; dir[1] /= L;
      let best = 0, bs = -1e9;
      for (let i = 0; i < B.length / 3; i++) { const dx = Math.abs(B[3 * i] - x); if (dx > 0.04) continue; const y = B[3 * i + 1], z = B[3 * i + 2], r = Math.hypot(y, z) || 1; const sc = (y * dir[0] + z * dir[1]) / r - dx * 5; if (sc > bs) { bs = sc; best = i; } }
      armIdx[key] = best;
    }
    const A = m.geometry.attributes.position, Nn = m.geometry.attributes.normal, i = armIdx[key];
    m.updateMatrixWorld(true);
    return { p: V(A.getX(i), A.getY(i), A.getZ(i)).applyMatrix4(m.matrixWorld), n: V(Nn.getX(i), Nn.getY(i), Nn.getZ(i)).transformDirection(m.matrixWorld).normalize() };
  };
  // ------------------------------------------------------------------------------------------------ the trunk (torso-local [x, s], x = his LEFT)
  const TRUNK = { sternum: [0, 4.15], upperChest: [0, 4.65] };
  const STROKES = { abdRUQ: [[-1.25, 2.45], [-0.35, 1.75]], abdLUQ: [[1.25, 2.45], [0.35, 1.75]], abdRLQ: [[-1.2, 0.98], [-0.35, 1.2]], abdLLQ: [[1.2, 0.98], [0.35, 1.2]] };

  NEURO.NAMES = {
    face: ['V1_R', 'V1_L', 'V2_R', 'V2_L', 'V3_R', 'V3_L', 'jawAngle_R', 'jawAngle_L', 'cornea_R', 'cornea_L', 'masseter_R', 'masseter_L', 'temporalis_R', 'temporalis_L', 'chin', 'nostril_R', 'nostril_L', 'noseTip', 'forehead'],
    arm: ['bicepsTendon', 'brachioradialisTendon', 'tricepsTendon', 'C5', 'C6', 'C7', 'C8', 'T1', 'deltoid', 'biceps', 'triceps', 'wristExtensors', 'fingerFlexors'].flatMap((n) => [n + '_R', n + '_L']),
    leg: ['patellarTendon', 'achillesTendon', 'solePath', 'bigToeMedial', 'bigToeLateral', 'medialMalleolus', 'L2', 'L3', 'L4', 'L4malleolus', 'L5', 'S1', 'S1heel', 'quadriceps', 'hamstrings', 'tibialisAnterior', 'calf'].flatMap((n) => [n + '_R', n + '_L']),
    trunk: ['sternum', 'upperChest', 'abdRUQ', 'abdLUQ', 'abdRLQ', 'abdLLQ'],
  };
  NEURO.points = (P) => {
    if (!P.neuro) throw new Error('NEURO.points needs the neuro patient: PATIENT.build(S, { neuro: true })');
    const out = { normals: {} }, put = (name, r) => { out[name] = r.p; out.normals[name] = r.n; };
    P.group.updateMatrixWorld(true);
    const cr = P.head.children.find((m) => m.name === 'cranium');
    for (const [name, f] of Object.entries(FACE)) {
      if (f.single) put(name, faceVertex(P, cr, name, 1));
      else for (const [s, sx] of [['R', -1], ['L', 1]]) put(name + '_' + s, faceVertex(P, cr, name, sx));
    }
    for (const [s, sx] of [['R', -1], ['L', 1]]) {
      const ball = P.eyes[s].ball; ball.updateMatrixWorld(true);
      const a = 0.5, p = ball.localToWorld(V(sx * 0.12 * 1.004 * Math.sin(a), 0, 0.12 * 1.004 * Math.cos(a)));   // the lateral edge of the cornea (limbus)
      put('cornea_' + s, { p, n: p.clone().sub(ball.getWorldPosition(V(0, 0, 0))).normalize() });
      const nos = P.head.children.filter((m) => m.isMesh && m.geometry.type === 'SphereGeometry' && Math.abs(m.position.y + 0.3) < 0.01 && Math.abs(Math.abs(m.position.x) - 0.052) < 0.005).find((m) => Math.sign(m.position.x) === sx);
      if (nos) put('nostril_' + s, { p: nos.getWorldPosition(V(0, 0, 0)), n: V(0, -0.6, 1).transformDirection(P.head.matrixWorld).normalize() });
    }
    for (const s of ['R', 'L']) {
      for (const name of Object.keys(ARM)) put(name + '_' + s, armVertex(P, s, name));
      const h = P.arms[s].hand, hw = (c) => ({ p: h.world(c), n: V(0, -1, 0).transformDirection(h.group.matrixWorld).normalize() });
      put('C6_' + s, hw('thumbPad')); put('C7_' + s, hw('middlePad')); put('C8_' + s, hw('littlePad'));
      const lp = (n) => ({ p: P.legPoint(s, n), n: P.legNormal(s, n) });
      put('patellarTendon_' + s, lp('patellarTendon')); put('achillesTendon_' + s, lp('achilles')); put('medialMalleolus_' + s, lp('medialMalleolus'));
      for (const n of ['L2', 'L3', 'L4', 'L5', 'S1', 'S1heel', 'quadriceps', 'hamstrings', 'tibialisAnterior', 'calf']) put(n + '_' + s, lp(n));
      put('L4malleolus_' + s, lp('L4mm'));
      out['solePath_' + s] = P.legSolePath(s);
      put('bigToeMedial_' + s, { p: P.toePoint(s, 'medial'), n: V(0, 0, 0) }); put('bigToeLateral_' + s, { p: P.toePoint(s, 'lateral'), n: V(0, 0, 0) });
    }
    for (const [name, [x, s]] of Object.entries(TRUNK)) { const r = P.surfacePoint(x, s, 'front'); if (r) put(name, { p: r.point, n: r.normal }); }
    for (const [name, line] of Object.entries(STROKES)) out[name] = line.map(([x, s]) => { const r = P.surfacePoint(x, s, 'front'); return r ? r.point : null; }).filter(Boolean);
    return out;
  };
  NEURO.list = (P) => {
    const pts = NEURO.points(P), out = [];
    for (const [g, names] of Object.entries(NEURO.NAMES)) for (const n of names) { const v = pts[n]; if (!v) continue; if (Array.isArray(v)) v.forEach((p, i) => out.push({ name: n + '.' + i, group: g, point: p, normal: null })); else out.push({ name: n, group: g, point: v, normal: pts.normals[n] }); }
    return out;
  };

  // ------------------------------------------------------------------------------------------------ hand poses
  const fist = [1.45, 1.6, 1.0];
  NEURO.HAND = {
    relaxed: { all: [0.22, 0.32, 0.18], spread: 0.8, thumb: [0.15, 0, 0.12, 0.08] },
    open: { all: [0.02, 0.03, 0.02], spread: 1, thumb: [0.05, 0, 0.05, 0.03] },
    together: { all: [0.03, 0.04, 0.03], spread: 0.12, fan: { index: 0.02, middle: 0.0, ring: -0.02, little: -0.05 }, thumb: [0.02, 0, 0.04, 0.03] },   // flat, fingers together (pronator drift)
    fist: { all: fist, spread: 0.3, thumb: [0.75, 0.7, 0.55, 0.5] },
    grip: { all: [0.95, 1.25, 0.85], spread: 0.45, thumb: [0.62, 0.55, 0.4, 0.35] },              // round two of the examiner's fingers
    point: { curl: { index: [0.04, 0.05, 0.03], middle: fist, ring: fist, little: fist }, spread: 0.4, thumb: [0.78, 0.65, 0.55, 0.45] },
    hook: { all: [0.25, 1.55, 1.15], spread: 0.35, thumb: [0.25, 0, 0.25, 0.15] },                // Jendrassik: the fingers hooked
    thumbFlex: { all: [0.3, 0.42, 0.25], spread: 0.8, thumb: [0.45, 0.3, 0.75, 0.85] },           // Hoffmann's sign: the thumb flexes
    spread: { all: [0.02, 0.03, 0.02], fan: { index: -0.3, middle: -0.02, ring: 0.2, little: 0.45 }, thumb: [-0.25, 0, 0.05, 0.03] },
    cup: { all: [0.5, 0.62, 0.35], spread: 0.55, thumb: [0.42, 0.25, 0.3, 0.2] },               // a coin or a key in the palm
    pat: { all: [0.05, 0.06, 0.04], spread: 0.6, thumb: [0.08, 0, 0.05, 0.03] },
  };

  // ------------------------------------------------------------------------------------------------ arm states
  const q = (f, d) => HANDS.quat(f, d);
  const frame = (P) => { P.torso.updateMatrixWorld(true); const m = P.torso.matrixWorld; return { front: V(0, 0, 1).transformDirection(m), up: V(0, 1, 0).transformDirection(m), left: V(1, 0, 0).transformDirection(m), at: (x, s, z) => P.torso.localToWorld(V(x, s, z || 0)) }; };
  // put a contact of his hand on a world point (the hand turned by quat) -> arm state
  NEURO.place = (P, side, contact, at, quat, pose, pole) => {
    const hand = P.arms[side].hand; hand.pose(pose);
    const w = HANDS.place(hand, contact, at, quat);
    return { wrist: w, quat: quat.clone(), pose, pole: pole || V(0, -1, side === 'R' ? 0.7 : -0.7) };
  };
  NEURO.arm = (P, side, name, o = {}) => {
    const sz = side === 'R' ? 1 : -1, F = frame(P), sh = P.shoulder(side), lat = V(0, 0, sz), Hh = NEURO.HAND;
    const L = 3.0 + 2.6 - 0.04;
    switch (name) {
      case 'rest': return root.HOME.restArmAt(P, side, o.SH || o.sheet);
      case 'outstretched': {      // straight out in front, palms up (pronator drift: opts.drift turns the palm in and lets it sink)
        // horizontal (parallel to the floor) at shoulder height, straight ahead toward his feet, the arms parallel
        const u = o.drift || 0, w = sh.clone().add(V(L, -0.45 * u, -0.25 * sz));
        const fd = V(1, -0.45 * u / L, 0).normalize(), quat = q(fd, V(0, -1, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), sz * 1.05 * u));
        return { wrist: w, quat, pose: o.pose || Hh.together, pole: V(0, -1, sz * 0.3) };
      }
      case 'wrist': {             // forearm out in front, palm down, the wrist bent up (+) or down (-)
        const d = V(1, 0.32, 0).normalize(), w = sh.clone().addScaledVector(d, L * 0.97), fd = w.clone().sub(sh).normalize();
        const quat = q(fd, V(0, 1, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), (o.flex || 0) * Math.PI / 180));
        return { wrist: w, quat, pose: o.pose || Hh.relaxed, pole: V(0, -1, sz * 0.3) };
      }
      case 'acrossAbdomen': {     // the forearm across his abdomen, the hand resting palm down on the far side
        const r = P.surfacePoint(-sz * -0.55, 1.95, 'front'), w = r.point.clone().addScaledVector(r.normal, 0.24);
        return { wrist: w, quat: q(F.left.clone().multiplyScalar(sz).addScaledVector(F.up, -0.15).normalize(), r.normal), pose: o.pose || Hh.relaxed, pole: V(0.2, -0.6, sz) };
      }
      case 'acrossChest': {       // elbow out to his side and bent 90 degrees, the forearm across his chest (the examiner supports it)
        const E = sh.clone().addScaledVector(lat.clone().multiplyScalar(0.62).addScaledVector(F.front, 0.7).addScaledVector(F.up, -0.36).normalize(), 2.98);
        const w = E.clone().addScaledVector(lat, -2.35).addScaledVector(F.front, 0.25).addScaledVector(F.up, -1.45 * 0.0 + 0.2);
        const mid = sh.clone().lerp(w, 0.5), pole = E.clone().sub(mid).normalize();
        return { wrist: w, quat: q(w.clone().sub(E).normalize(), F.front), pose: o.pose || Hh.relaxed, pole };
      }
      case 'abduct90': {          // shoulder out 90 degrees, elbow bent 90 degrees, forearm pointing forward
        const E = sh.clone().addScaledVector(lat, 3.0), w = E.clone().addScaledVector(F.front, 2.58);
        return { wrist: w, quat: q(F.front, F.up.clone().negate().addScaledVector(lat, 0)), pose: o.pose || Hh.fist, pole: lat.clone().addScaledVector(F.front, -0.2) };
      }
      case 'fingerNose': case 'fingerTo': {
        const nose = name === 'fingerNose' ? NEURO.points(P).noseTip : o.at;
        const from = sh.clone().addScaledVector(F.front, 2.4).addScaledVector(lat, 0.6).addScaledVector(F.up, -0.6), fd = nose.clone().sub(from).normalize();
        const quat = q(fd, F.up.clone().addScaledVector(lat, 0.5));
        const at = name === 'fingerNose' ? nose.clone().addScaledVector(fd, -0.012) : nose;
        return NEURO.place(P, side, 'indexTip', at, quat, Hh.point, F.up.clone().negate().addScaledVector(lat, 0.9).addScaledVector(F.front, 0.2));
      }
      case 'jendrassik': {        // both hands hooked together in front of his lower chest, pulling apart (opts.pull)
        const c = F.at(0, 3.0, 2.0), u = o.pull || 0, w = c.clone().addScaledVector(F.left, -sz * (0.62 + 0.08 * u));
        const quat = q(F.left.clone().multiplyScalar(sz), side === 'R' ? F.up.clone() : F.up.clone().negate());
        return { wrist: w, quat, pose: Hh.hook, pole: V(0, -1, sz) };
      }
      case 'pat': {               // rapid alternating movements: the left palm up on his lap, the right hand pats it
        const lap = F.at(0, 0.9, 1.45);
        if (side === 'L') { const w = lap.clone().addScaledVector(F.left, 0.55).addScaledVector(F.up, -0.1); return { wrist: w, quat: q(F.left.clone().negate().addScaledVector(F.up, -0.3).normalize(), F.front.clone().negate()), pose: Hh.pat, pole: V(0, -1, -0.5) }; }
        const flip = o.flip || 0, lift = o.lift || 0, w = lap.clone().addScaledVector(F.left, -0.55).addScaledVector(F.front, 0.28 + 0.9 * lift).addScaledVector(F.up, -0.1);
        return { wrist: w, quat: q(F.left.clone().addScaledVector(F.up, -0.3).normalize(), flip > 0.5 ? F.front.clone().negate() : F.front.clone()), pose: Hh.pat, pole: V(0, -1, 0.6) };
      }
      case 'palmUp': {            // resting palm up beside him (a coin or a key placed in the palm)
        const st = root.HOME.restArmAt(P, side, o.SH || o.sheet);
        return Object.assign({}, st, { wrist: st.wrist.clone().add(V(0, 0.05, 0)), quat: q(V(1, -0.1, -sz * 0.12), V(0, -1, 0)), pose: o.pose || Hh.cup });
      }
      default: throw new Error('NEURO.arm: unknown pose ' + name);
    }
  };
  // the world point in his palm where a small object rests (after P.setArm)
  NEURO.palmPoint = (P, side) => { const h = P.arms[side].hand; h.group.updateMatrixWorld(true); return { point: h.world('palm').clone().addScaledVector(V(0, -1, 0).transformDirection(h.group.matrixWorld), 0.04), normal: V(0, -1, 0).transformDirection(h.group.matrixWorld).normalize() }; };

  // ------------------------------------------------------------------------------------------------ leg poses
  const heelRestY = new WeakMap();
  const restHeel = (P, side) => { if (!heelRestY.has(P)) { const st = { R: P.leg('R'), L: P.leg('L') }; P.setLeg('R', {}); P.setLeg('L', {}); heelRestY.set(P, { R: P.legPoint('R', 'heel').y, L: P.legPoint('L', 'heel').y, ballR: P.legPoint('R', 'ball').y }); P.setLeg('R', st.R); P.setLeg('L', st.L); } return heelRestY.get(P); };
  NEURO.leg = (P, side, name, o = {}) => {
    const other = side === 'R' ? 'L' : 'R', ry = restHeel(P, side), Ym = BED.DIM.Ym;
    switch (name) {
      case 'rest': return P.setLeg(side, {});
      case '9090': return P.setLeg(side, { hipFlex: 90, knee: 90, ankle: o.ankle || 0 });
      case 'kernig': return P.setLeg(side, { hipFlex: 90, knee: o.knee == null ? 90 : o.knee });
      case 'kneeLift': case 'kneeJerk': {
        const knee = o.knee == null ? (name === 'kneeJerk' ? 30 : 45) : o.knee;
        P.setLeg(side, { knee, ankle: o.ankle || 0 });
        return P.legFit(side, [{ point: 'heel', at: V(0, ry[side], 0), axis: 'y' }], { free: ['hipFlex'], start: { knee, hipFlex: knee * 0.5, ankle: o.ankle || 0 } });
      }
      case 'footFlat': {
        const knee = o.knee == null ? 95 : o.knee, y = Ym + 0.03;
        P.setLeg(side, { knee });
        return P.legFit(side, [{ point: 'heel', at: V(0, y + 0.0, 0), axis: 'y', w: 2 }, { point: 'ball', at: V(0, y, 0), axis: 'y' }, { point: 'sole', at: V(0, y, 0), axis: 'y' }], { free: ['hipFlex', 'ankle'], start: { knee, hipFlex: knee * 0.5, ankle: -20 } });
      }
      case 'heelShin': {          // the heel on the other knee, sliding down the shin to the ankle (opts.u 0..1)
        const u = o.u || 0, a = P.legPoint(other, 'patella'), b = P.legPoint(other, 'shinMid'), c = P.legPoint(other, 'medialMalleolus');
        const on = u < 0.5 ? a.clone().lerp(b, u * 2) : b.clone().lerp(c, (u - 0.5) * 2);
        const up = P.legNormal(other, 'shinMid'); on.addScaledVector(up, 0.12);
        return P.legFit(side, [{ point: 'heel', at: on, w: 4 }, { point: 'ankle', at: on.clone().add(V(0.3, 0.45, 0)), w: 0.15 }], { free: ['hipFlex', 'hipAbd', 'hipRot', 'knee'], start: Object.assign({ hipFlex: 45, hipAbd: -8, hipRot: 25, knee: 80 }, o.start || {}), reg: 0.00002, iters: 900 });
      }
      case 'ankleJerk': {         // leg turned out, knee bent, the outer side of the ankle resting across the other shin
        const on = P.legPoint(other, 'shinMid').clone().lerp(P.legPoint(other, 'medialMalleolus'), 0.25).addScaledVector(P.legNormal(other, 'shinMid'), 0.42);
        return P.legFit(side, [{ point: 'lateralMalleolus', at: on, w: 4 }], { free: ['hipFlex', 'hipAbd', 'hipRot', 'knee'], start: { hipFlex: 25, hipAbd: 12, hipRot: 38, knee: 55, ankle: 8 }, reg: 0.0004, iters: 900 });
      }
      case 'plantar': {
        const ext = o.response === 'extensor';
        return P.setLeg(side, Object.assign(P.leg(side), ext ? { bigToe: 40, fan: 1, toes: 0 } : { bigToe: -30, toes: 25, fan: 0 }));
      }
      default: throw new Error('NEURO.leg: unknown pose ' + name);
    }
  };
  // under both knees (for the examiner's forearm in the knee jerks): midway between the backs of the knees
  NEURO.kneeSupport = (P) => { const a = P.legPoint('R', 'knee'), b = P.legPoint('L', 'knee'); return a.add(b).multiplyScalar(0.5).add(V(0, -0.55, 0)); };
})(typeof window !== 'undefined' ? window : globalThis);
