// src/cns7-style.js: "Soft Clay" style object for PART 7 OF 11 of the neurological (CNS) examination: the deep tendon
// reflexes (biceps, supinator, triceps, knee, ankle), reinforcement, clonus and Hoffmann's sign. Classic script; needs
// THREE, K (lib/stage.js), SOUND (lib/sound.js), the shared/ scripts (v5, neuro mode) and src/contact.js.
// Defines window.CNS7 (the style object).
// Units: 1 = 10 cm. Head at screen left (-X), feet at screen right (+X), the patient's RIGHT side toward the camera (+Z).
//
// One set of data drives the storyboard and the animation: every camera (SHOT) and every contact pose is defined once,
// solved once (tools/solve.mjs, in this page, in SOLVE mode) and saved to solved.json; the page loads it and never
// re-solves. update(t) reads only that data and the timeline below.
(function (root) {
  const THREE = root.THREE, K = root.K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ================================================================ CONTENT (the story, in order; times in seconds)
  const D = 97;
  const POSES = 15;                                                   // stop-motion: poses on twos
  const snap = (t) => Math.round(t * POSES) / POSES;                  // an event exactly on a pose
  const BEATS = [
    { n: 1, name: 'Position', t0: 0, t1: 5 },
    { n: 2, name: 'Biceps jerk (C5)', t0: 5, t1: 15, hold: [5.0, 6.5] },
    { n: 3, name: 'Supinator jerk (C6)', t0: 15, t1: 24 },
    { n: 4, name: 'Triceps jerk (C7)', t0: 24, t1: 34 },
    { n: 5, name: 'Reinforcement (arms)', t0: 34, t1: 41, hold: [34.0, 35.5] },
    { n: 6, name: 'Knee jerks (L3, L4)', t0: 41, t1: 51, hold: [41.0, 42.5] },
    { n: 7, name: 'Jendrassik', t0: 51, t1: 59, hold: [51.0, 52.5] },
    { n: 8, name: 'Ankle jerks (S1)', t0: 59, t1: 69 },
    { n: 9, name: 'Ankle clonus', t0: 69, t1: 78 },
    { n: 10, name: 'Knee clonus', t0: 78, t1: 85 },
    { n: 11, name: "Hoffmann's sign", t0: 85, t1: 94 },
    { n: 12, name: 'End', t0: 94, t1: 97 },
  ];
  const CAPTIONS = [
    { t0: 1.3, t1: 4.8, text: 'Reflexes', place: 'top' },
    { t0: 8.4, t1: 14.7, text: 'Biceps jerk (C5): tap my thumb on the tendon - present, equal', place: 'top' },
    { t0: 15.5, t1: 23.7, text: 'Supinator jerk (C6): just above the wrist - present, equal', place: 'top' },
    { t0: 26.2, t1: 33.7, text: 'Triceps jerk (C7): just above the elbow - present, equal', place: 'top' },
    { t0: 35.9, t1: 40.7, text: 'Reinforcement: clench the teeth, then tap - before calling a reflex absent', place: 'top' },
    { t0: 44.6, t1: 50.7, text: 'Knee jerks (L3, L4): both knees supported - present, equal', place: 'top' },
    { t0: 53.2, t1: 58.7, text: 'Jendrassik for the legs: hook, pull, then tap', place: 'top' },
    { t0: 61.0, t1: 68.7, text: 'Ankle jerks (S1): foot held slightly up - present, equal', place: 'top' },
    { t0: 70.6, t1: 77.7, text: 'Ankle clonus: sharp push up and hold - no clonus', place: 'top' },
    { t0: 78.6, t1: 84.7, text: 'Knee clonus: kneecap pushed down sharply and held - none', place: 'top' },
    { t0: 86.4, t1: 93.7, text: "Hoffmann's: flick the middle-finger nail - the thumb stays still: negative", place: 'top' },
  ];
  // every strike of the hammer (picture and sound read this one list); `on`: what the head lands on
  const STRIKES = [
    { id: 'bicR', t: snap(9.2), side: 'R', reflex: 'biceps' },
    { id: 'bicL', t: snap(12.2), side: 'L', reflex: 'biceps' },
    { id: 'supR', t: snap(16.8), side: 'R', reflex: 'supinator' },
    { id: 'supL', t: snap(19.8), side: 'L', reflex: 'supinator' },
    { id: 'triR', t: snap(27.6), side: 'R', reflex: 'triceps' },
    { id: 'triL', t: snap(30.8), side: 'L', reflex: 'triceps' },
    { id: 'reinfR', t: snap(37.4), side: 'R', reflex: 'biceps' },
    { id: 'kneeR', t: snap(45.8), side: 'R', reflex: 'knee' },
    { id: 'kneeL', t: snap(47.8), side: 'L', reflex: 'knee' },
    { id: 'jendR', t: snap(54.6), side: 'R', reflex: 'knee' },
    { id: 'ankR', t: snap(61.8), side: 'R', reflex: 'ankle' },
    { id: 'ankL', t: snap(64.8), side: 'L', reflex: 'ankle' },
  ];
  const SWING = { up: 0.62, fall: 0.27, bounce: 0.22, bounceUp: 0.3 };   // radians at the top; seconds to fall; bounce
  const REFLEX = {                                                     // the reflex: delay after the strike, rise, size
    delay: 0.05, firm: 0.15, rise: 0.08, back: 0.22,
    biceps: { joint: 'elbow', deg: 10, muscle: 'biceps' }, supinator: { joint: 'elbow', deg: 8, muscle: 'brachioradialis' },
    triceps: { joint: 'elbow', deg: -10, muscle: 'triceps' }, knee: { joint: 'knee', deg: -12, muscle: 'quadriceps' }, ankle: { joint: 'ankle', deg: -10, muscle: 'calf' },
  };
  const HOME_HOLD = 1.0;

  // ================================================================ the style
  const style = {
    id: 'cns7-soft-clay', name: 'Soft Clay - CNS part 7: tendon reflexes, reinforcement, clonus, Hoffmann', duration: D,
    fonts: ['600 56px "Fredoka"'],
    render: Object.assign({}, root.SET.RENDER),                       // the series grade (64 samples for the final)
    content: { BEATS, CAPTIONS, STRIKES, SWING, REFLEX, HOME_HOLD },
    captions: true,                                                    // the CAPTIONS switch (window.CAPTIONS = false: the clean version)
    SOLVE_VERSION: 1,

    async build(S) {
      const SET = root.SET, BED = root.BED, PATIENT = root.PATIENT, SHEET = root.SHEET, HANDS = root.HANDS, CLAY = root.CLAY, HOME = root.HOME, NEURO = root.NEURO, CONTACT = root.CONTACT, CAPTION = root.CAPTION;
      // ------------------------------------------------------------ the set, exactly as the README's CNS home shot
      const L = SET.build(S);
      const bed = BED.build(S);
      const table = BED.table(S);
      const P = PATIENT.build(S, { neuro: true });
      const SH = SHEET.build(S, P, { from: 'foot' });
      bed.placePillow(P.headBack(), 7.15);
      const exM = { glove: CLAY.mat('#5a8fd8', '#3e73c3', { rough: 0.42, sheen: 0.25, streak: 0.5, freq: 2, tile: 0.8, bump: 0.45, lump: 0.006, lumpSize: 0.6 }), sleeve: CLAY.mat('#24636a', '#1d5359', { rough: 0.82, streak: 0.4, scale: 1.6, side: THREE.DoubleSide }) };
      const EX = { R: HANDS.examinerArm(S, exM, 'R'), L: HANDS.examinerArm(S, exM, 'L') };
      const hammer = root.PROPS.tendonHammer(S);
      HOME.apply(P, EX, SH, 'cns');
      P.setFace({ pupilR: 3.5, pupilL: 3.5 }); P.breathe(0);
      const HOME_ARM = { R: HOME.restArm('R', 'reclined45', SH), L: HOME.restArm('L', 'reclined45', SH) };
      const HOME_EX = { R: HOME.solveEx(EX, 'R', HOME.exRest('R', 'cns', SH)), L: HOME.solveEx(EX, 'L', HOME.exRest('L', 'cns', SH)) };
      const Dm = BED.DIM, hs = (x, z) => SH.heightAt(x, z);

      // ------------------------------------------------------------ serialising (solved.json)
      const enc = (v) => (v == null ? v : v.isVector3 ? { v: [v.x, v.y, v.z] } : v.isQuaternion ? { q: [v.x, v.y, v.z, v.w] } : Array.isArray(v) ? v.map(enc) : typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) : v);
      const dec = (v) => (v == null ? v : Array.isArray(v) ? v.map(dec) : typeof v === 'object' ? (v.v ? V(...v.v) : v.q ? new THREE.Quaternion(...v.q) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)]))) : v);

      // ------------------------------------------------------------ applying states (every frame)
      const applyArm = (side, st) => P.setArm(side, st.wrist, st.quat, st.pose, st.pole);
      // the examiner's hand; far = he stands on the patient's LEFT (the sleeve leaves the frame toward -Z)
      const applyEx = (side, st) => {
        const a = EX[side]; a.group.visible = st.hidden !== true;
        a.hand.pose(st.pose);
        if (st.thumbQ) { const t = a.hand.thumb; t.meta.quaternion.copy(st.thumbQ[0]); t.mcp.quaternion.copy(st.thumbQ[1]); t.ip.quaternion.copy(st.thumbQ[2]); }
        a.hand.group.position.copy(st.wrist); a.hand.group.quaternion.copy(st.quat); a.follow(st.back);
        if (st.far) {                                                    // the upper sleeve leaves toward his left (-Z), down and out of frame
          const sd = V(0, -0.42, -1).normalize(), sz = V(0, 0, 0).crossVectors(sd, V(0, 1, 0)).normalize(), sy = V(0, 0, 0).crossVectors(sz, sd);
          a.upper.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(sd, sy, sz));
        }
        a.group.updateMatrixWorld(true);
      };

      // ------------------------------------------------------------ the frames of his trunk
      const trunk = () => { P.torso.updateMatrixWorld(true); const m = P.torso.matrixWorld; return { left: V(1, 0, 0).transformDirection(m), up: V(0, 1, 0).transformDirection(m), front: V(0, 0, 1).transformDirection(m) }; };
      const armMeshes = (side) => { const a = P.arms[side], out = [a.armMesh]; a.hand.group.traverse((m) => { if (m.isMesh && m.visible) out.push(m); }); return out; };
      const torsoMeshes = () => [P.torsoMesh, P.group.getObjectByName('pyjama-pants')].filter(Boolean);
      const handMeshes = (hand) => { const out = []; hand.group.traverse((m) => { if (m.isMesh && m.visible) out.push(m); }); return out; };
      // the mattress (and the folded sheet) as a height field: the gap of a set of meshes above it
      const bedGap = (meshes) => { let g = Infinity, at = null; const w = V(0, 0, 0); for (const m of meshes) { m.updateMatrixWorld(true); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) { w.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); const d = w.y - hs(w.x, w.z); if (d < g) { g = d; at = w.clone(); } } } return { gap: g, at }; };
      const mattressNormal = (x) => (x < Dm.Xh ? BED.normal.clone() : V(0, 1, 0));

      // ------------------------------------------------------------ mirroring through the bed's midplane (z = 0)
      // The left-side tests are the right-side solutions reflected: positions z -> -z, rotations q -> (-x, -y, z, w); a hand
      // state moves to the examiner's other hand (a left hand is a mirrored right hand, so its joint angles are the same).
      const mz = (v) => V(v.x, v.y, -v.z), mq = (q) => new THREE.Quaternion(-q.x, -q.y, q.z, q.w);
      const mirArm = (st) => ({ wrist: mz(st.wrist), quat: mq(st.quat), pose: st.pose, pole: mz(st.pole) });
      const mirEx = (st) => Object.assign({}, st, { hand: st.hand === 'R' ? 'L' : 'R', wrist: mz(st.wrist), quat: mq(st.quat), back: mz(st.back), far: !st.far, thumbQ: st.thumbQ });
      const mirStrike = (k) => ({ ex: mirEx(k.ex), hammerPos: mz(k.hammerPos), hammerQuat: mq(k.hammerQuat), target: mz(k.target), normal: mz(k.normal), gap: k.gap });
      const mirCam = (c) => Object.assign({}, c, { pos: mz(V(...c.pos)).toArray(), target: mz(V(...c.target)).toArray(), focus: mz(V(...c.focus)).toArray(), up: c.up ? [c.up[0], c.up[1], -c.up[2]] : undefined });

      // ================================================================ SOLVE BEGIN
      // Everything below runs ONCE (tools/solve.mjs) and is saved to solved.json. Contacts are measured on the meshes.
      const solveAll = () => {
        const SOL = { arms: {}, legs: {}, ex: {}, strikes: {}, lm: {}, cams: {}, gaps: {}, log: [] };
        const log = (...a) => { SOL.log.push(a.join(' ')); console.log('[cns7] ' + a.join(' ')); };
        const r3 = (v) => [v.x, v.y, v.z].map((a) => +a.toFixed(3)).join(', ');
        const mm = (d) => +(d * 100).toFixed(2);                         // world units -> mm (1 unit = 10 cm = 100 mm)
        // the hammer at the moment of a strike (examiner's RIGHT hand on his right side): the head's rim on the target, the
        // gap measured from the head's meshes to the target's skin; dir = from the grip toward the head
        const STRIKE_DIR = { bic: V(-0.5, 0, -0.85) };
        const solveStrike = (target, normal, dirHint, fld) => {
          const d = dirHint.clone().addScaledVector(normal, -dirHint.dot(normal)).normalize();
          let gap = 0.0006, k;
          for (let it = 0; it < 6; it++) {
            k = CONTACT.hammerStrike(hammer, EX.R.hand, target, normal, d, gap);
            hammer.group.position.copy(k.hammerPos); hammer.group.quaternion.copy(k.hammerQuat); hammer.setSwing(0); hammer.group.updateMatrixWorld(true);
            const g = CONTACT.minGap(hammer.head.children.filter((m) => m.isMesh), fld, null, 0, 0.05);
            if (!isFinite(g.gap) || Math.abs(g.gap - 0.0006) < 0.00015) { k.measured = g.gap; break; }
            gap += 0.0006 - g.gap; k.measured = g.gap;
          }
          return { ex: { hand: 'R', wrist: k.wrist, quat: k.quat, pose: k.pose, back: d.clone().negate().add(V(0.2, -0.25, 0.7)).normalize() }, hammerPos: k.hammerPos, hammerQuat: k.hammerQuat, target: target.clone(), normal: normal.clone(), hand: 'R', gap: k.measured };
        };

        // --------------------------------------------------- his arms across his abdomen (biceps and supinator jerks)
        // The kit's acrossAbdomen preset, fine-tuned: the elbow rests on the mattress beside his trunk (or, lifted
        // `up` units, in the examiner's cupped palm), the forearm across his lower abdomen, the hand palm down on it,
        // fingers together, the fingertips short of the midline (the hands never overlap). Both sides the same.
        const FINGERS_REST = { all: [0.26, 0.36, 0.2], spread: 0.3, thumb: [0.2, 0, 0.14, 0.1] };
        const abdArm = (side, up = 0) => {
          const sz = side === 'R' ? 1 : -1, Sh = P.shoulder(side), F = trunk(), L1 = 3.0, L2 = 2.6;
          // the elbow: out from his trunk (z = 3.0), so the front of the elbow faces up, resting on the backrest mattress, at upper-arm length from the shoulder
          const elbowAt = (x) => { const z = sz * 3.0, n = mattressNormal(x), base = V(x, hs(x, z), z); return base.addScaledVector(n, 0.405 + up); };
          let lo = -4.5, hi = -0.5; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (elbowAt(m).distanceTo(Sh) < L1 - 0.02) lo = m; else hi = m; }
          const E = elbowAt((lo + hi) / 2);
          let lift = 0.2, st = null;
          for (let it = 0; it < 6; it++) {
            // the wrist on his lower abdomen at forearm length from the elbow
            const wAt = (xw) => { const r = P.surfacePoint(-sz * xw, 1.35, 'front'); return { p: r.point.clone().addScaledVector(r.normal, lift), n: r.normal }; };
            let a = 0.2, b = 2.2; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (wAt(m).p.distanceTo(E) > L2 - 0.03) a = m; else b = m; }
            const w = wAt((a + b) / 2);
            const fd = F.left.clone().multiplyScalar(sz).addScaledVector(F.up, -0.18).normalize();
            const mid = Sh.clone().lerp(w.p, 0.5), pole = E.clone().sub(mid).normalize();
            st = { wrist: w.p, quat: HANDS.quat(fd, w.n), pose: FINGERS_REST, pole };
            applyArm(side, st);
            const fld = CONTACT.field(torsoMeshes()), g = Math.min(CONTACT.minGap(armMeshes(side).slice(0, 1), fld, w.p, 1.3).gap, CONTACT.minGap(armMeshes(side).slice(1), fld, null, 0).gap);
            if (!isFinite(g)) { lift -= 0.06; continue; }
            if (Math.abs(g - 0.0006) < 0.0002) break;
            lift -= g - 0.0006;
          }
          // the fingers settle on his abdomen
          const fld = CONTACT.field(torsoMeshes());
          st.pose = CONTACT.curlToTouch(P.arms[side].hand, ['index', 'middle', 'ring', 'little'], fld, FINGERS_REST, { gap: 0.0006, from: -0.25, to: 0.8 });
          applyArm(side, st);
          return st;
        };
        // the inside of the elbow bend (for the check: the kit's bicepsTendon must face it)
        const bendInside = (side) => {
          const a = P.arms[side]; a.group.updateMatrixWorld(true);
          const Sh = a.up.getWorldPosition(V(0, 0, 0)), E = a.fore.getWorldPosition(V(0, 0, 0)), Wr = a.hand.group.getWorldPosition(V(0, 0, 0));
          const u = Sh.clone().sub(E).normalize(), f = Wr.clone().sub(E).normalize();
          return { E, u, f, inside: u.clone().add(f).normalize(), angle: +(u.angleTo(f) * 180 / Math.PI).toFixed(1) };
        };
        SOL.arms.abdR = abdArm('R', 0); SOL.arms.abdL = mirArm(SOL.arms.abdR);
        applyArm('R', SOL.arms.abdR); applyArm('L', SOL.arms.abdL);
        {
          const k = NEURO.points(P);
          for (const s of ['R', 'L']) {
            const b = bendInside(s);
            SOL.lm['bicepsTendon_' + s] = { point: k['bicepsTendon_' + s], normal: k.normals['bicepsTendon_' + s] };
            SOL.lm['brachioradialisTendon_' + s] = { point: k['brachioradialisTendon_' + s], normal: k.normals['brachioradialisTendon_' + s] };
            log('abd', s, 'elbow', b.angle, 'deg; kit bicepsTendon', r3(k['bicepsTendon_' + s]), 'its normal is', (k.normals['bicepsTendon_' + s].angleTo(b.inside) * 180 / Math.PI).toFixed(0), 'deg from the inside of the bend; brachioradialisTendon normal', r3(k.normals['brachioradialisTendon_' + s]));
          }
        }

        // --------------------------------------------------- the elbow tendons, measured on the posed arm
        // The kit's bicepsTendon / tricepsTendon vertices follow the palm's roll into the elbow, so with his forearm
        // pronated across his abdomen they are not on the front / back of the elbow (logged above). These two points are
        // measured instead: the skin vertex just above the elbow (arm coordinate x0..x1, elbow at 3.0) whose normal faces
        // the inside of the bend (biceps tendon) or the outside, square to the upper arm (triceps tendon).
        const elbowPoint = (side, x0, x1, which) => {
          const b = bendInside(side), a = P.arms[side], B = a.armMesh.userData.base, pa = a.armMesh.geometry.attributes.position, na = a.armMesh.geometry.attributes.normal;
          const dir = (which === 'front' ? b.inside.clone() : b.inside.clone().negate()); dir.addScaledVector(b.u, -dir.dot(b.u)).normalize();
          a.armMesh.updateMatrixWorld(true);
          let best = -2, bi = -1; const n = V(0, 0, 0);
          for (let i = 0; i < pa.count; i++) { const x = B[3 * i]; if (x < x0 || x > x1) continue; n.fromBufferAttribute(na, i).transformDirection(a.armMesh.matrixWorld); const sc = n.dot(dir); if (sc > best) { best = sc; bi = i; } }
          const p = V(0, 0, 0).fromBufferAttribute(pa, bi).applyMatrix4(a.armMesh.matrixWorld), nn = V(0, 0, 0).fromBufferAttribute(na, bi).transformDirection(a.armMesh.matrixWorld).normalize();
          return { point: p, normal: nn, vertex: bi, score: +best.toFixed(3) };
        };
        // --------------------------------------------------- the biceps jerk: the examiner's left hand rests on his upper arm
        // just above the elbow, fingers together pointing up his arm toward his shoulder, the pad of the left thumb on his
        // biceps tendon at the front of the elbow; the hammer falls on the examiner's thumbnail.
        const THUMB_POSE = { all: [0.1, 0.14, 0.08], spread: 0.25, fan: { index: 0.03, middle: 0, ring: -0.03, little: -0.07 }, thumb: [0.2, 0, 0.15, 0.1] };
        const thumbBiceps = () => {
          const hand = EX.L.hand, arm = SOL.arms.abdR; applyArm('R', arm);
          const T = SOL.lm.bicepsTendon_R.point, n = SOL.lm.bicepsTendon_R.normal, b = bendInside('R');
          const top = V(0, 1, 0.45).addScaledVector(b.u, -V(0, 1, 0.45).dot(b.u)).normalize();     // the top of his upper arm (away from the mattress and the trunk)
          const fld = CONTACT.field([P.arms.R.armMesh]);
          let ex = null;
          const placeAt = (back) => {
            // the palm rests on the top of his upper arm `back` units above the tendon
            const at0 = T.clone().addScaledVector(b.u, back);
            const rc2 = new THREE.Raycaster(at0.clone().addScaledVector(top, 1.0), top.clone().negate()); const msh = new THREE.Mesh(P.arms.R.armMesh.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); msh.matrixWorld.copy(P.arms.R.armMesh.matrixWorld); msh.matrixAutoUpdate = false;
            const h = rc2.intersectObject(msh, false)[0], at = h.point, nrm = fld.query(at, 0.05).n;
            const across = trunk().left.clone(); const fingers = across.addScaledVector(nrm, -across.dot(nrm)).normalize();   // across his arm, toward his trunk
            const quat = HANDS.quat(fingers, nrm);
            hand.pose(THUMB_POSE);
            CONTACT.rest(hand, 'palm', at, nrm, quat, fld, 0.0006, 0.3);
            ex = { hand: 'L', wrist: hand.group.position.clone(), quat, pose: THUMB_POSE, back: V(0.25, -0.28, 1).normalize() };
            applyEx('L', ex); hand.group.updateMatrixWorld(true);
            return hand.thumb.base.getWorldPosition(V(0, 0, 0)).distanceTo(T) / 1.04;   // thumb base to the tendon, hand units
          };
          let lo = -0.2, hi = 1.4;
          for (let it = 0; it < 14; it++) { const m = (lo + hi) / 2; if (placeAt(m) < 0.66) lo = m; else hi = m; }
          const reach = placeAt((lo + hi) / 2);
          log('biceps thumb: palm', (((lo + hi) / 2) * 10).toFixed(1), 'cm above the tendon; thumb base to tendon', reach.toFixed(3), 'hand units');
          ex.pose = CONTACT.curlToTouch(hand, ['index', 'middle', 'ring', 'little'], fld, THUMB_POSE, { gap: 0.0006, from: -0.2, to: 1.2 });
          applyEx('L', ex);
          let off = 0.0006;
          for (let it = 0; it < 8; it++) {
            ex.thumbQ = CONTACT.thumbIK(hand, T.clone().addScaledVector(n, off), n); applyEx('L', ex);
            const g = CONTACT.gapNear(hand, 'thumbPad', fld, 0.07);
            if (!isFinite(g.gap) || Math.abs(g.gap - 0.0006) < 0.00015) break;
            off += 0.0006 - g.gap;
          }
          return ex;
        };
        for (const s of ['R', 'L']) {
          const f = elbowPoint(s, 2.62, 2.9, 'front');
          SOL.lm['bicepsTendon_' + s] = Object.assign(f, { kit: SOL.lm['bicepsTendon_' + s].point, kitNormal: SOL.lm['bicepsTendon_' + s].normal });
          log('biceps tendon', s, 'measured', r3(f.point), 'normal', r3(f.normal), 'facing the inside of the bend', f.score);
        }
        {
          const ex = thumbBiceps();
          SOL.ex.thumbR = ex; SOL.ex.thumbL = mirEx(ex);
          applyArm('R', SOL.arms.abdR); applyArm('L', SOL.arms.abdL); applyEx('L', ex);
          const fld = CONTACT.field([P.arms.R.armMesh]), parts = CONTACT.partGaps(EX.L.hand, fld);
          const tg = CONTACT.gapNear(EX.L.hand, 'thumbPad', fld, 0.07), pg = CONTACT.gapNear(EX.L.hand, 'palm', fld, 0.3);
          SOL.gaps.thumbR = { thumbPad: mm(tg.gap), palm: mm(pg.gap), index: mm(parts.indexTip.gap), middle: mm(parts.middleTip.gap), ring: mm(parts.ringTip.gap), little: mm(parts.littleTip.gap), min: mm(Math.min(...Object.values(parts).map((p) => p.gap))) };
          log('biceps thumb gaps (mm)', JSON.stringify(SOL.gaps.thumbR), 'parts', JSON.stringify(Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, mm(v.gap)]))));
          // the strike on the examiner's thumbnail
          const h = EX.L.hand; h.group.updateMatrixWorld(true);
          const nail = h.world('thumbNail'), nn = V(0, 1, 0).transformDirection(h.thumb.ip.matrixWorld).normalize();
          const nailField = CONTACT.field(h.thumb.ip.children.filter((m) => m.isMesh));
          const q = nailField.query(nail, 0.05);
          SOL.strikes.bicR = solveStrike(q.q, q.n, STRIKE_DIR.bic, nailField);
          SOL.strikes.bicL = mirStrike(SOL.strikes.bicR);
        }
        return SOL;
      };
      // ================================================================ SOLVE END

      let SOL;
      if (root.SOLVE_MODE) { SOL = solveAll(); root.SOLVED_OUT = enc(SOL); }
      else {
        let raw = root.SOLVED;
        if (!raw) { const r = await fetch('solved.json', { cache: 'no-store' }).catch(() => null); if (!r || !r.ok) throw new Error('solved.json is missing: run "npm run solve" (it is made once, then loaded)'); raw = await r.json(); }
        if (raw.version !== style.SOLVE_VERSION) throw new Error('solved.json is out of date (version ' + raw.version + ', the style needs ' + style.SOLVE_VERSION + '): run "npm run solve"');
        SOL = dec(raw.data);
      }
      // a strike state at swing angle a (0 = the head on the target, + = raised): the hand and the hammer turn together at the wrist
      const applyStrike = (k, a = 0) => {
        const sw = CONTACT.swing({ wrist: k.ex.wrist, quat: k.ex.quat, hammerPos: k.hammerPos, hammerQuat: k.hammerQuat }, a);
        applyEx(k.ex.hand, Object.assign({}, k.ex, { quat: sw.quat }));
        hammer.group.visible = true; hammer.group.position.copy(sw.hammerPos); hammer.group.quaternion.copy(sw.hammerQuat); hammer.setSwing(0); hammer.group.updateMatrixWorld(true);
      };
      root.W = { S, L, bed, table, P, SH, EX, hammer, SOL, applyArm, applyEx, applyStrike, HOME_ARM, HOME_EX, enc, dec };

      // ------------------------------------------------------------ the frame for time t (filled in below)
      const update = (t) => {
        if (root.LAB_UPDATE) return root.LAB_UPDATE(t);
        SET.shoot(S, SET.HOME_CNS); L.set(0, {}); L.lamp.intensity = SET.LAMP.power;
      };
      const overlay = (ctx, t, W, H) => { const on = root.CAPTIONS != null ? !!root.CAPTIONS : style.captions; if (on) CAPTION.at(ctx, t, CAPTIONS, W, H); };
      return { update, overlay };
    },

    sound(k) {},
  };
  root.CNS7 = style;
})(typeof window !== 'undefined' ? window : globalThis);
