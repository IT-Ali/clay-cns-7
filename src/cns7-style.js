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
  // ---------------------------------------------------------------- the timeline keys (one schedule for picture and sound)
  // [time, state, 'cut'?]: between two keys the state moves (eased); a 'cut' key jumps. Names: see the states in build().
  const KEYS = {
    cam: [[0, 'home'], [HOME_HOLD, 'home'], [4.6, 'upper'], [6.5, 'upper'], [8.2, 'bicR'], [10.8, 'bicR'], [10.8, 'bicL', 'cut'],
      [15.0, 'supR', 'cut'], [18.4, 'supL', 'cut'], [24.0, 'triR', 'cut'], [30.1, 'triL', 'cut'],
      [34.0, 'reinf', 'cut'], [41.0, 'knees', 'cut'], [51.0, 'jend', 'cut'], [59.0, 'legsWide', 'cut'], [60.9, 'legsWide'], [60.9, 'ankR', 'cut'], [63.4, 'ankL', 'cut'],
      [69.0, 'clonR', 'cut'], [74.2, 'clonL', 'cut'], [78.0, 'kneeClonR', 'cut'], [81.6, 'kneeClonL', 'cut'], [85.0, 'hoffR', 'cut'], [89.2, 'hoffL', 'cut'],
      [94.0, 'upper', 'cut'], [96.0, 'home'], [D, 'home']],
    armR: [[0, 'home'], [6.5, 'home'], [7.6, 'abdR'], [24.9, 'abdR'], [26.2, 'chestR'], [28.3, 'chestR'], [29.3, 'abdR'], [42.5, 'abdR'], [43.4, 'home'], [52.5, 'home'], [53.6, 'jend0R'], [54.25, 'jend0R'], [54.4, 'jend1R'], [55.6, 'jend1R'], [56.1, 'jend0R'], [57.1, 'home'],
      [85.6, 'home'], [86.6, 'hoffR'], [89.2, 'home', 'cut'], [D, 'home']],
    armL: [[0, 'home'], [6.5, 'home'], [7.6, 'abdL'], [30.1, 'chestL', 'cut'], [34.0, 'abdL', 'cut'], [42.5, 'abdL'], [43.4, 'home'], [52.5, 'home'], [53.6, 'jend0L'], [54.25, 'jend0L'], [54.4, 'jend1L'], [55.6, 'jend1L'], [56.1, 'jend0L'], [57.1, 'home'],
      [89.2, 'hoffL', 'cut'], [94.0, 'home', 'cut'], [D, 'home']],
    legR: [[0, 'rest'], [43.5, 'rest'], [44.4, 'kneeJerk'], [57.3, 'kneeJerk'], [58.4, 'rest'], [59.4, 'rest'], [60.8, 'ankleJerkR'], [63.4, 'rest', 'cut'],
      [69.3, 'rest'], [70.5, 'clonusR0'], [71.2, 'clonusR0'], [71.33, 'clonusR1'], [73.4, 'clonusR1'], [73.8, 'clonusR0'], [74.2, 'rest', 'cut'], [D, 'rest']],
    legL: [[0, 'rest'], [43.5, 'rest'], [44.4, 'kneeJerk'], [57.3, 'kneeJerk'], [58.4, 'rest'], [63.4, 'ankleJerkR', 'cut'], [69.0, 'rest', 'cut'],
      [74.2, 'clonusR0', 'cut'], [74.9, 'clonusR0'], [75.03, 'clonusR1'], [77.1, 'clonusR1'], [77.5, 'clonusR0'], [78.0, 'rest', 'cut'], [D, 'rest']],
    exL: [[0, 'home'], [7.4, 'home'], [8.3, 'thumbR'], [10.8, 'S:bicL', 'cut'], [15.0, 'home', 'cut'], [18.4, 'S:supL', 'cut'], [24.0, 'home', 'cut'],
      [24.1, 'home'], [24.9, 'rel:wristRel:handR'], [29.3, 'rel:wristRel:handR'], [29.9, 'home'], [30.1, 'S:triL', 'cut'],
      [34.0, 'home', 'cut'], [35.7, 'home'], [36.5, 'thumbR'], [38.2, 'thumbR'], [39.0, 'home'], [42.5, 'home'], [43.6, 'kneeSupport'], [57.2, 'kneeSupport'], [58.6, 'home'],
      [59.3, 'home'], [60.8, 'footR'], [63.4, 'S:ankL', 'cut'], [69.0, 'home', 'cut'], [69.3, 'home'], [70.5, 'calfR'], [74.2, 'clonusFootL0', 'cut'], [74.9, 'clonusFootL0'], [75.03, 'clonusFootL1'], [77.1, 'clonusFootL1'], [77.5, 'clonusFootL0'],
      [78.0, 'kneeClonusR', 'cut'], [81.6, 'parkFar', 'cut'], [85.0, 'home', 'cut'], [85.2, 'home'], [85.6, 'rel:hoffSupRel:handR'], [89.2, 'hoffPinL', 'cut'], [94.0, 'home', 'cut'], [D, 'home']],
    exR: [[0, 'home'], [1.4, 'home'], [2.3, 'park'], [7.6, 'park'], [8.6, 'S:bicR'], [10.8, 'thumbL', 'cut'], [15.0, 'S:supR', 'cut'], [18.4, 'homeFar', 'cut'], [24.0, 'park', 'cut'],
      [25.4, 'park'], [26.6, 'S:triR'], [30.1, 'wristL', 'cut'], [34.0, 'S:bicR@reinfR', 'cut'], [38.4, 'S:bicR@reinfR'], [39.4, 'park'], [43.4, 'park'], [44.8, 'S:kneeR'], [46.3, 'S:kneeR'], [47.1, 'S:kneeL'], [48.6, 'S:kneeL'], [49.6, 'S:kneeR@jendR'],
      [59.4, 'S:kneeR@jendR'], [61.0, 'S:ankR'], [63.4, 'footL', 'cut'], [69.0, 'park', 'cut'], [69.6, 'park'], [70.6, 'clonusFootR0'], [71.2, 'clonusFootR0'], [71.33, 'clonusFootR1'], [73.4, 'clonusFootR1'], [73.8, 'clonusFootR0'],
      [74.2, 'calfL', 'cut'], [78.0, 'park', 'cut'], [81.6, 'kneeClonusL', 'cut'], [85.0, 'park', 'cut'], [86.0, 'park'], [86.8, 'rel:hoffPinRel:handR'], [89.2, 'hoffSupL', 'cut'], [94.0, 'park', 'cut'], [94.6, 'park'], [95.6, 'home'], [D, 'home']],
  };

  // ================================================================ the style
  const style = {
    id: 'cns7-soft-clay', name: 'Soft Clay - CNS part 7: tendon reflexes, reinforcement, clonus, Hoffmann', duration: D,
    fonts: ['600 56px "Fredoka"'],
    render: Object.assign({}, root.SET.RENDER),                       // the series grade (64 samples for the final)
    content: { BEATS, CAPTIONS, STRIKES, SWING, REFLEX, HOME_HOLD, KEYS },
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

      // a strike state at swing angle a (0 = the head on the target, + = raised): the hand and the hammer turn together at the wrist
      const applyStrike = (k, a = 0) => {
        const sw = CONTACT.swing({ wrist: k.ex.wrist, quat: k.ex.quat, hammerPos: k.hammerPos, hammerQuat: k.hammerQuat }, a);
        applyEx(k.ex.hand, Object.assign({}, k.ex, { quat: sw.quat }));
        hammer.group.visible = true; hammer.group.position.copy(sw.hammerPos); hammer.group.quaternion.copy(sw.hammerQuat); hammer.setSwing(0); hammer.group.updateMatrixWorld(true);
      };
      // ------------------------------------------------------------ mirroring through the bed's midplane (z = 0)
      // The left-side tests are the right-side solutions reflected: positions z -> -z, rotations q -> (-x, -y, z, w); a hand
      // state moves to the examiner's other hand (a left hand is a mirrored right hand, so its joint angles are the same).
      const mz = (v) => V(v.x, v.y, -v.z), mq = (q) => new THREE.Quaternion(-q.x, -q.y, q.z, q.w);
      const mirArm = (st) => ({ wrist: mz(st.wrist), quat: mq(st.quat), pose: st.pose, pole: mz(st.pole) });
      const mirEx = (st) => Object.assign({}, st, { hand: st.hand === 'R' ? 'L' : 'R', wrist: mz(st.wrist), quat: mq(st.quat), back: mz(st.back), far: !st.far, thumbQ: st.thumbQ });
      const mirStrike = (k) => ({ ex: mirEx(k.ex), hammerPos: mz(k.hammerPos), hammerQuat: mq(k.hammerQuat), target: mz(k.target), normal: mz(k.normal), gap: k.gap });
      // a hand state expressed in another object's frame (position + rotation only), and back
      const frameOf = (obj) => { obj.updateMatrixWorld(true); const p = V(0, 0, 0), q = new THREE.Quaternion(), sc = V(0, 0, 0); obj.matrixWorld.decompose(p, q, sc); return { p, q }; };
      const relTo = (st, obj) => { const f = frameOf(obj), qi = f.q.clone().invert(); return Object.assign({}, st, { wrist: st.wrist.clone().sub(f.p).applyQuaternion(qi), quat: qi.clone().multiply(st.quat), back: st.back.clone().applyQuaternion(qi) }); };
      const fromRel = (st, obj) => { const f = frameOf(obj); return Object.assign({}, st, { wrist: st.wrist.clone().applyQuaternion(f.q).add(f.p), quat: f.q.clone().multiply(st.quat), back: st.back.clone().applyQuaternion(f.q) }); };
      const mirCam = (c) => Object.assign({}, c, { pos: mz(V(...c.pos)).toArray(), target: mz(V(...c.target)).toArray(), focus: mz(V(...c.focus)).toArray(), up: c.up ? [c.up[0], c.up[1], -c.up[2]] : undefined });

      // ================================================================ SOLVE BEGIN
      // Everything below runs ONCE (tools/solve.mjs) and is saved to solved.json. Contacts are measured on the meshes.
      const solveAll = (prev) => {
        // dev only: ?only=a,b re-solves just those sections on top of the saved solved.json (the real solve runs them all)
        const want = (k) => !root.SOLVE_ONLY || root.SOLVE_ONLY.includes(k);
        const SOL = prev ? Object.assign(prev, { log: [] }) : { arms: {}, legs: {}, ex: {}, strikes: {}, lm: {}, cams: {}, gaps: {}, log: [] };
        const log = (...a) => { SOL.log.push(a.join(' ')); console.log('[cns7] ' + a.join(' ')); };
        const r3 = (v) => [v.x, v.y, v.z].map((a) => +a.toFixed(3)).join(', ');
        const cam = (pos, target, focus, aperture, fov = 28) => ({ pos: pos.toArray(), target: target.toArray(), focus: (focus || target).toArray(), aperture: aperture == null ? 0.02 : aperture, fov });
        const mm = (d) => +(d * 100).toFixed(2);
        // A camera with a clear view: candidates on a cone round `prefer` at `dist` from `target`; each point in `see` must be
        // visible (the first thing a ray from the camera hits lies within 1.2 cm of it), the camera must be outside the bed,
        // the table and every arm. Picks the candidate closest to `prefer`. -> cam
        const sceneMeshes = () => { const out = []; S.scene.traverse((m) => { if (m.isMesh && m.visible && m.name !== 'sweep' && m.geometry && m.geometry.attributes.position) { let v = true; m.traverseAncestors((a) => { if (a.visible === false) v = false; }); if (v) out.push(m); } }); return out; };
        const pickCam = (target, prefer, dist, see, o = {}) => {
          const ms = sceneMeshes(), rc3 = new THREE.Raycaster(); let best = null, part = null;
          const exPts = []; for (const h of ['L', 'R']) EX[h].group.traverse((m) => { if (m.isMesh && m.visible) { m.updateMatrixWorld(true); const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i += 8) exPts.push(V(0, 0, 0).fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld)); } });
          const pf = prefer.clone().normalize(), e1 = V(0, 0, 0).crossVectors(pf, Math.abs(pf.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).normalize(), e2 = V(0, 0, 0).crossVectors(pf, e1);
          for (const cone of [0, 5, 10, 15, 20, 25, 30, 40, 50, 60].filter((c) => c <= (o.maxCone == null ? 60 : o.maxCone))) for (let k = 0; k < (cone ? 12 : 1); k++) {
            const a = k / 12 * Math.PI * 2, c = Math.cos(cone * Math.PI / 180), sn = Math.sin(cone * Math.PI / 180);
            const dir = pf.clone().multiplyScalar(c).addScaledVector(e1, sn * Math.cos(a)).addScaledVector(e2, sn * Math.sin(a)), pos = target.clone().addScaledVector(dir, dist);
            if (pos.y < Dm.Ym + 1.0 && Math.abs(pos.z) < Dm.half + 0.5 && pos.x > -9.5 && pos.x < Dm.xEnd + 0.5) continue;          // inside the bed
            if (pos.x < Dm.Xh && Math.abs(pos.z) < Dm.half + 0.5 && pos.y < 4 - pos.x + 1.5) continue;                                  // below the backrest
            if (pos.distanceTo(V(-4, 8.3, -7.4)) < 2.6) continue;                                                                       // the bedside table
            if (exPts.some((q) => q.distanceTo(pos) < 0.7)) continue;                                                                    // not inside or against the examiner's arm
            let nOk = 0;
            for (const it of see) { const p = it.isVector3 ? it : it[0], tol = it.isVector3 ? 0.012 : it[1], owner = it[2]; const d = p.clone().sub(pos), L = d.length(); rc3.set(pos, d.normalize()); rc3.far = L + 0.5; const h = rc3.intersectObjects(ms, false)[0]; let mine = false; if (h && owner) h.object.traverseAncestors((a) => { if (a === owner) mine = true; }); if (h && (mine || h.distance >= L - tol)) nOk++; }
            if (!part || nOk > part.n) part = { n: nOk, cone, pos };
            if (nOk < see.length) continue;
            if (!best || cone < best.cone) best = { cone, pos };
          }
          if (!best) { log('pickCam: no fully clear view for', o.name || '?', '- best sees', part ? part.n : 0, 'of', see.length, 'at', part ? part.cone : '-', 'deg'); best = part || { cone: -1, pos: target.clone().addScaledVector(pf, dist) }; }
          else log('pickCam', o.name || '', 'clear view at', best.cone, 'deg from the preferred direction');
          return cam(best.pos, o.aim || target, o.focus || target, o.aperture == null ? 0.02 : o.aperture);
        };                         // world units -> mm (1 unit = 10 cm = 100 mm)
        // the hammer at the moment of a strike (examiner's RIGHT hand on his right side): the head's rim on the target, the
        // gap measured from the head's meshes to the target's skin; dir = from the grip toward the head
        // NO SINKING: slide a placed hand along `dir` until its LOWEST point (palm, every finger, the thumb) rests `gap` on the
        // skin field; the hand then touches by its lowest point and nothing of it is under the skin
        const liftClear = (handSide, ex, dir, fld, gap = 0.0003) => {
          const hand = EX[handSide].hand;
          for (let it = 0; it < 6; it++) {
            applyEx(handSide, ex);
            const g = CONTACT.minGap(handMeshes(hand), fld, null, 0, 0.15).gap;
            if (!isFinite(g) || Math.abs(g - gap) < 0.00008) break;
            ex.wrist = ex.wrist.clone().addScaledVector(dir, gap - g);
          }
          applyEx(handSide, ex); return ex;
        };
        // all of his skin (and the pyjama), for checks
        const patientMeshes = () => { const out = []; P.group.traverse((m) => { if (m.isMesh && m.visible && m.geometry && m.geometry.attributes.position.count > 200) out.push(m); }); return out; };
        // the examiner's palm FLAT across the ball of his foot: palm against the sole, fingers together across the sole, the
        // thumb on the inner (medial) side; the hand rests by its lowest point (nothing sinks)
        const palmOnBall = (side, handSide) => {
          const hand = EX[handSide].hand, fld = CONTACT.field([P.legMeshes[side]]);
          const B = P.legPoint(side, 'ball'), q0 = fld.query(B, 0.1), nOut = q0.n.clone();          // the sole's outward normal (measured)
          const toe = P.legPoint(side, 'toeTip'), heel = P.legPoint(side, 'heel');
          const along = toe.clone().sub(heel); along.addScaledVector(nOut, -along.dot(nOut)).normalize();
          const medial = P.legPoint(side, 'medialMalleolus').sub(P.legPoint(side, 'lateralMalleolus')); medial.addScaledVector(nOut, -medial.dot(nOut)).normalize();
          let across = V(0, 0, 0).crossVectors(nOut, along).normalize();
          const POSE = { all: [0.06, 0.08, 0.05], spread: 0.15, fan: { index: 0.03, middle: 0, ring: -0.03, little: -0.07 }, thumb: [0.1, 0, 0.1, 0.05] };
          const mk = (ac) => HANDS.quat(ac, nOut);                       // the back of the hand faces away from the sole: the palm faces it
          hand.pose(POSE); let quat = mk(across); HANDS.place(hand, 'palm', B, quat); hand.group.updateMatrixWorld(true);
          if (hand.world('thumbTip').sub(hand.world('palm')).dot(medial) < 0) { across.negate(); quat = mk(across); }   // the thumb on the inner side
          // searched: how far the hand sits toward the inner edge (so the fingers lie ON the sole, not past its outer edge)
          // and how the thumb lies (so it does not dig into the inner edge); each placement rests by its lowest point
          const toward = V(0, -0.25, 1).normalize(), back = across.clone().negate().multiplyScalar(0.7).add(toward.clone().multiplyScalar(0.7)).normalize();
          const THUMBS = [[0.1, 0, 0.1, 0.05], [-0.15, -0.3, 0, 0], [0.3, 0.4, 0.25, 0.15], [-0.3, 0.2, 0, 0]];
          let ex = null, bestSc = Infinity;
          for (const o of [0, 0.1, 0.2, 0.3, 0.4]) for (const th of THUMBS) {
            const P0 = Object.assign({}, POSE, { thumb: th }), at = B.clone().addScaledVector(along, -0.15).addScaledVector(across, -o);
            hand.pose(P0); CONTACT.rest(hand, 'palm', at, nOut, quat, fld, 0.0006, 0.25);
            const e = { hand: handSide, wrist: hand.group.position.clone(), quat, pose: P0, back };
            applyEx(handSide, e);
            e.pose = CONTACT.curlToTouch(hand, ['index', 'middle', 'ring', 'little'], fld, P0, { gap: 0.0006, from: -0.55, to: 0.6, together: true }); applyEx(handSide, e);
            liftClear(handSide, e, nOut, fld, 0.0003);
            const pr = CONTACT.handParts(hand), pg = CONTACT.minGap(pr.palm, fld, null, 0, 0.15).gap;
            let fs = 0; for (const k of ['index', 'middle', 'ring', 'little']) { const g = CONTACT.minGap(pr[k], fld, null, 0, 0.15).gap; fs += Math.min(isFinite(g) ? g : 0.02, 0.02); }
            const sc = Math.abs((isFinite(pg) ? pg : 0.05) - 0.0005) + 0.15 * fs;
            if (sc < bestSc) { bestSc = sc; ex = Object.assign({}, e, { o }); }
          }
          applyEx(handSide, ex); delete ex.o;
          log('palm across the ball of the foot', side, '(' + handSide + ' hand): palm', mm(CONTACT.minGap(CONTACT.handParts(hand).palm, fld, null, 0, 0.15).gap), 'mm, lowest point of the hand', mm(CONTACT.minGap(handMeshes(hand), fld, null, 0, 0.15).gap), 'mm');
          return ex;
        };
        const STRIKE_DIR = { bic: V(-0.2, -1, 0.35), sup: V(-0.3, -1, -0.3), tri: V(0, -1, 0), knee: V(-0.1, -0.35, -1), kneeL: V(-0.1, -0.55, -1), ank: V(1, -0.2, 0.3) };
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
        const ABD = { z: 3.0, s: 0.45 };          // elbow on the mattress 30 cm out from his midline; wrist on his lower abdomen (elbow ~105 degrees)
        const FINGERS_REST = { all: [0.26, 0.36, 0.2], spread: 0.3, thumb: [0.2, 0, 0.14, 0.1] };
        const abdArm = (side, up = 0, o = {}) => {
          const ES = o.z || ABD.z, WS = o.s || ABD.s, WX = o.x0 || 0.2;
          const sz = side === 'R' ? 1 : -1, Sh = P.shoulder(side), F = trunk(), L1 = 3.0, L2 = 2.6;
          // the elbow: out from his trunk (z = 3.0), so the front of the elbow faces up, resting on the backrest mattress, at upper-arm length from the shoulder
          const elbowAt = (x) => { const z = sz * ES, n = mattressNormal(x), base = V(x, hs(x, z), z); return base.addScaledVector(n, 0.405 + up); };
          let lo = -4.5, hi = -0.5; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (elbowAt(m).distanceTo(Sh) < L1 - 0.02) lo = m; else hi = m; }
          const E = elbowAt((lo + hi) / 2);
          let lift = 0.2, st = null;
          for (let it = 0; it < 6; it++) {
            // the wrist on his lower abdomen at forearm length from the elbow
            const wAt = (xw) => { const r = P.surfacePoint(-sz * xw, WS, 'front'); if (!r) return null; return { p: r.point.clone().addScaledVector(r.normal, lift), n: r.normal }; };
            let a = WX, b = 2.6; for (let k = 0; k < 40; k++) { const m = (a + b) / 2, wm = wAt(m); if (wm && wm.p.distanceTo(E) > L2 - 0.03) a = m; else b = m; }
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
        root.W_TEST = { abdArmTest: abdArm, frontTest: (side) => { const b = bendInside(side), f = elbowPoint(side, 2.42, 2.62, 'front'); return { angle: b.angle, n: f.normal.toArray(), wrist: P.arms[side].hand.group.position.toArray() }; } };
        if (want('arms')) { SOL.arms.abdR = abdArm('R', 0); SOL.arms.abdL = mirArm(SOL.arms.abdR); }
        applyArm('R', SOL.arms.abdR); applyArm('L', SOL.arms.abdL);
        if (want('arms')) {
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
        // The examiner's thumb, extended, pressed straight onto the tendon; the rest of his hand held just clear above,
        // the fingers loosely curled (they touch nothing); the forearm back toward where he stands (his right, footward).
        const PRESS_POSES = [
          { all: [0.95, 1.2, 0.8], spread: 0.3, thumb: [0.1, 0.1, 0.25, 0.15] },     // a loose fist, the thumb along the index
          { all: [0.95, 1.2, 0.8], spread: 0.3, thumb: [-0.35, -0.6, 0.2, 0.1] },    // a loose fist, the thumb out to the side
        ];
        const armCaps = (side) => { const a = P.arms[side]; a.group.updateMatrixWorld(true); const Sh = a.up.getWorldPosition(V(0, 0, 0)), E = a.fore.getWorldPosition(V(0, 0, 0)), Wr = a.hand.group.getWorldPosition(V(0, 0, 0)); return CONTACT.capsules([[Sh, E, 0.44], [E, Wr, 0.33]]); };
        const pressScore = (fields, caps, want) => (hand) => {
          hand.group.updateMatrixWorld(true);
          const parts = CONTACT.handParts(hand), others = parts.palm.concat(parts.index, parts.middle, parts.ring, parts.little);
          let clear = Infinity; for (const f of fields) clear = Math.min(clear, CONTACT.minGap(others, f, null, 0, 0.06).gap);
          const deep = CONTACT.minSdf(others.concat(parts.thumb), caps, 4);
          const fore = V(-1, 0, 0).transformDirection(hand.group.matrixWorld).normalize();
          const bed = bedGap(handMeshes(hand)).gap;
          return 60 * Math.max(0, -clear) + 4 * Math.max(0, 0.003 - clear) + 60 * Math.max(0, -0.006 - deep) + 30 * Math.max(0, 0.004 - bed) + 0.5 * (1 - fore.dot(want));
        };
        // The grasp: the palm rests against the outside of his elbow, the fingers settle round it, the thumb reaches across
        // the front of the elbow and its pad rests on the tendon. Searched: where the palm rests (round the arm, along it),
        // how the hand is turned on the skin; scored on the thumb's reach, no part sinking, the forearm toward the examiner.
        const GRASP_POSE = { all: [0.35, 0.5, 0.3], spread: 0.3, fan: { index: 0.03, middle: 0, ring: -0.03, little: -0.07 }, thumb: [0.2, 0, 0.15, 0.1] };
        const graspTendon = (side, hand, T, n, want, o = {}) => {
          const a = P.arms[side], b = bendInside(side), fld = CONTACT.field([a.armMesh]), tor = CONTACT.field(torsoMeshes()), caps = armCaps(side);
          const rcm = new THREE.Mesh(a.armMesh.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); rcm.matrixWorld.copy(a.armMesh.matrixWorld); rcm.matrixAutoUpdate = false;
          const e1 = V(0, 1, 0).addScaledVector(b.u, -b.u.y).normalize(), e2 = V(0, 0, 0).crossVectors(b.u, e1);
          let best = null;
          for (const along of o.along || [0.25, 0.5, 0.75]) for (let ang = 0; ang < 360; ang += 30) for (let psi = 0; psi < 360; psi += 30) {
            const dir = e1.clone().multiplyScalar(Math.cos(ang * Math.PI / 180)).addScaledVector(e2, Math.sin(ang * Math.PI / 180));
            const c = b.E.clone().addScaledVector(b.u, along), hit = new THREE.Raycaster(c.clone().addScaledVector(dir, 1.5), dir.clone().negate()).intersectObject(rcm, false)[0];
            if (!hit) continue;
            const q0 = fld.query(hit.point, 0.05); if (!q0.n) continue;
            const nn = q0.n, tang = b.u.clone().addScaledVector(nn, -b.u.dot(nn)).normalize().applyAxisAngle(nn, psi * Math.PI / 180);
            const quat = HANDS.quat(tang, nn.clone().negate());                // the palm against the skin (the back of the hand faces out)
            hand.pose(GRASP_POSE); HANDS.place(hand, 'palm', hit.point.clone().addScaledVector(nn, 0.12), quat);   // the palm surface ~0.6 cm out
            hand.group.updateMatrixWorld(true);
            const reach = hand.thumb.base.getWorldPosition(V(0, 0, 0)).distanceTo(T) / 1.04;
            if (reach > 0.95 || reach < 0.35) continue;
            const tq = CONTACT.thumbIK(hand, T.clone().addScaledVector(n, 0.0006), n); CONTACT.setThumbQ(hand, tq);
            const parts = CONTACT.handParts(hand), body = parts.palm.concat(parts.index, parts.middle, parts.ring, parts.little);
            const deep = Math.min(CONTACT.minSdf(body, caps, 5), CONTACT.minSdf(parts.thumb, caps, 3) + 0.004);
            const tg = CONTACT.gapNear(hand, 'thumbPad', fld, 0.04).gap, thumbAll = CONTACT.minGap(parts.thumb, fld, null, 0, 0.03).gap, torsoG = CONTACT.minGap(body, tor, null, 0, 0.03).gap;
            const fore = V(-1, 0, 0).transformDirection(hand.group.matrixWorld).normalize(), bed = bedGap(handMeshes(hand)).gap;
            const sc = 20 * Math.max(0, -0.008 - deep) + 40 * Math.max(0, -thumbAll - 0.0002) + 40 * Math.max(0, -torsoG) + 20 * Math.abs((isFinite(tg) ? tg : 0.02) - 0.0006) + 20 * Math.max(0, 0.002 - bed) + 0.6 * (1 - fore.dot(want)) + 0.3 * Math.abs(reach - 0.7);
            if (!best || sc < best.sc) best = { sc, quat, at: hit.point.clone(), nn: nn.clone(), along, ang, psi, reach };
          }
          // settle: the palm onto the skin, then the fingers round the arm, then the thumb pad on the tendon
          hand.pose(GRASP_POSE);
          CONTACT.rest(hand, 'palm', best.at, best.nn, best.quat, fld, 0.0006, 0.3);
          const ex = { hand: hand === EX.L.hand ? 'L' : 'R', wrist: hand.group.position.clone(), quat: best.quat, pose: GRASP_POSE, back: V(-1, 0, 0).applyQuaternion(best.quat).normalize() };
          applyEx(ex.hand, ex);
          ex.pose = CONTACT.curlToTouch(hand, ['index', 'middle', 'ring', 'little'], fld, GRASP_POSE, { gap: 0.0006, from: -0.3, to: 1.4 });
          applyEx(ex.hand, ex);
          const th = CONTACT.thumbOn(hand, T, n, fld, 0.0006);
          ex.thumbQ = th.tq;
          log('grasp', side, 'palm at', best.along, 'along, round', best.ang, 'turn', best.psi, 'reach', best.reach.toFixed(2), 'score', best.sc.toFixed(3), '| thumb pad', mm(th.pad), 'mm, lowest thumb point', mm(th.all), 'mm');
          return ex;
        };
        // the hand flat on the FRONT of his upper arm (which faces the same way as the tendon), fingers together pointing up
        // his arm toward the shoulder; the thumb then lies along the crease and its pad rests on the tendon
        const FRONT_POSE = { all: [0.12, 0.16, 0.1], spread: 0.25, fan: { index: 0.03, middle: 0, ring: -0.03, little: -0.07 }, thumb: [0.2, 0, 0.15, 0.1] };
        const thumbBiceps = () => {
          const side = 'R', hand = EX.L.hand; applyArm(side, SOL.arms.abdR);
          const T = SOL.lm.bicepsTendon_R.point, n = SOL.lm.bicepsTendon_R.normal, b = bendInside(side), fld = CONTACT.field([P.arms[side].armMesh]);
          const rcm = new THREE.Mesh(P.arms[side].armMesh.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); rcm.matrixWorld.copy(P.arms[side].armMesh.matrixWorld); rcm.matrixAutoUpdate = false;
          let ex = null;
          const placeAt = (back) => {
            const c = T.clone().addScaledVector(b.u, back), hit = new THREE.Raycaster(c.clone().addScaledVector(n, 1.2), n.clone().negate()).intersectObject(rcm, false)[0];
            const nn = fld.query(hit.point, 0.05).n, fingers = b.u.clone().addScaledVector(nn, -b.u.dot(nn)).normalize(), quat = HANDS.quat(fingers, nn);
            hand.pose(FRONT_POSE); CONTACT.rest(hand, 'palm', hit.point, nn, quat, fld, 0.0006, 0.3);
            ex = { hand: 'L', wrist: hand.group.position.clone(), quat, pose: FRONT_POSE, back: V(0.6, -0.5, 0.62).normalize() };   // from below and toward his feet, toward the examiner: clear of a side camera
            applyEx('L', ex); hand.group.updateMatrixWorld(true);
            return hand.thumb.base.getWorldPosition(V(0, 0, 0)).distanceTo(T) / 1.04;
          };
          let lo = 0.0, hi = 1.6; for (let it = 0; it < 14; it++) { const m = (lo + hi) / 2; if (placeAt(m) < 0.6) lo = m; else hi = m; }
          const reach = placeAt((lo + hi) / 2);
          ex.pose = CONTACT.curlToTouch(hand, ['index', 'middle', 'ring', 'little'], fld, FRONT_POSE, { gap: 0.0006, from: -0.2, to: 1.0, together: true }); applyEx('L', ex);
          const th = CONTACT.thumbOn(hand, T, n, fld, 0.0009); ex.thumbQ = th.tq; applyEx('L', ex);
          liftClear('L', ex, n, fld, 0.0003);
          th.pad = CONTACT.gapNear(hand, 'thumbPad', fld, 0.05).gap; th.all = CONTACT.minGap(CONTACT.handParts(hand).thumb, fld, null, 0, 0.15).gap;
          const deep = CONTACT.minSdf(handMeshes(hand), armCaps(side), 2);
          log('biceps hand on the front of the arm:', ((lo + hi) / 2 * 10).toFixed(1), 'cm above the tendon, reach', reach.toFixed(2), '| thumb pad', mm(th.pad), 'mm, lowest thumb point', mm(th.all), 'mm, deepest point in the arm capsules', mm(deep), 'mm');
          return ex;
        };
        if (want('biceps')) for (const s of ['R', 'L']) {
          const f = elbowPoint(s, 2.35, 2.55, 'front');   // 4.5-6.5 cm above the elbow joint centre, at the top of the fossa where the tendon is felt (the surface is convex there)
          SOL.lm['bicepsTendon_' + s] = Object.assign(f, { kit: SOL.lm['bicepsTendon_' + s].point, kitNormal: SOL.lm['bicepsTendon_' + s].normal });
          log('biceps tendon', s, 'measured', r3(f.point), 'normal', r3(f.normal), 'facing the inside of the bend', f.score);
        }
        if (want('biceps2')) {
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
          const Tb = SOL.lm.bicepsTendon_R.point;
          applyStrike(SOL.strikes.bicR, 0);
          // from his side at elbow height: the whole forearm and elbow, the thumb on the tendon, the hammer head, the biceps
          const armCam = (sd, exThumb, strike, name) => {
            const sz = sd === 'R' ? 1 : -1, Tq = SOL.lm['bicepsTendon_' + sd].point, bel = elbowPoint(sd, 1.6, 1.9, 'front'), a = P.arms[sd];
            const E = a.fore.getWorldPosition(V(0, 0, 0)), Wr = a.hand.group.getWorldPosition(V(0, 0, 0)), aim = E.clone().lerp(Wr, 0.35).lerp(Tq, 0.3);
            return pickCam(aim, V(-0.25, 0.32, sz), 8.0, [[EX[exThumb].hand.world('thumbTip'), 0.02, EX[exThumb].hand.group], [hammer.group.localToWorld(hammer.pts.centre.clone()), 0.06, hammer.group], [bel.point.clone().addScaledVector(bel.normal, 0.004), 0.02, a.group], [Wr.clone().add(V(0, 0.3, 0)), 0.06, a.group]], { name, maxCone: 30, aperture: 0.025 });
          };
          SOL.cams.bicR = armCam('R', 'L', SOL.strikes.bicR, 'biceps R');
          applyEx('L', HOME_EX.L); applyEx('R', SOL.ex.thumbL); applyStrike(SOL.strikes.bicL, 0);
          SOL.cams.bicL = armCam('L', 'R', SOL.strikes.bicL, 'biceps L');
          applyEx('R', HOME_EX.R); applyEx('L', HOME_EX.L);
        }
        // --------------------------------------------------- supinator jerk: the hammer on the brachioradialis tendon (radial
        // side of the forearm ~5 cm above the wrist, kit landmark); the examiner's left hand resting at his side
        applyArm('R', SOL.arms.abdR); applyArm('L', SOL.arms.abdL);
        if (want('sup')) {
          const k = NEURO.points(P), T = k.brachioradialisTendon_R, n = k.normals.brachioradialisTendon_R;
          const fld = CONTACT.field([P.arms.R.armMesh]);
          SOL.strikes.supR = solveStrike(T, n, STRIKE_DIR.sup, fld); SOL.strikes.supL = mirStrike(SOL.strikes.supR);
          applyStrike(SOL.strikes.supR, 0); applyEx('L', HOME_EX.L);
          const supCam = (sd, name) => {
            const sz = sd === 'R' ? 1 : -1, a = P.arms[sd], kk = NEURO.points(P), Tq = kk['brachioradialisTendon_' + sd], E = a.fore.getWorldPosition(V(0, 0, 0)), Wr = a.hand.group.getWorldPosition(V(0, 0, 0));
            return pickCam(Tq.clone().lerp(E, 0.45), V(0.1, 0.32, sz), 8.0, [[hammer.group.localToWorld(hammer.pts.centre.clone()), 0.06, hammer.group], [Tq.clone().lerp(E, 0.5).addScaledVector(kk.normals['brachioradialisTendon_' + sd], 0.3), 0.08, a.group], [E.clone().add(V(0, 0.42, 0)), 0.06, a.group], [Wr.clone().add(V(0, 0.2, 0)), 0.06, a.group]], { name, maxCone: 30, aperture: 0.025 });
          };
          SOL.cams.supR = supCam('R', 'supinator R');
          applyEx('L', SOL.ex.homeFarL || HOME_EX.L); applyStrike(SOL.strikes.supL, 0); applyEx('R', mirEx(Object.assign({ hand: 'L' }, HOME_EX.L)));
          SOL.cams.supL = supCam('L', 'supinator L');
          applyEx('R', HOME_EX.R); applyEx('L', HOME_EX.L);
          const Wr = P.arms.R.hand.group.getWorldPosition(V(0, 0, 0));
          SOL.lm.supDistR = +(T.distanceTo(Wr) * 10).toFixed(2);
          log('supinator strike gap', mm(SOL.strikes.supR.gap), 'mm; brachioradialisTendon is', (T.distanceTo(Wr) * 10).toFixed(1), 'cm from the wrist joint, on the radial (thumb) side');
        }
        // --------------------------------------------------- triceps jerk: his forearm across his chest (kit acrossChest), the
        // examiner's left hand holding his right wrist from above, fingers round it; the hammer just above the olecranon
        if (want('tri')) {
          // the kit preset bends the elbow to ~53 degrees: open it to 90 (the forearm turned about the elbow, across his chest)
          let st = NEURO.arm(P, 'R', 'acrossChest'); applyArm('R', st);
          { const b0 = bendInside('R'), ax = V(0, 0, 0).crossVectors(b0.u, b0.f).normalize(), r = new THREE.Quaternion().setFromAxisAngle(ax, (90 - b0.angle) * Math.PI / 180);
            st = Object.assign({}, st, { wrist: b0.E.clone().add(st.wrist.clone().sub(b0.E).applyQuaternion(r)), quat: r.clone().multiply(st.quat) }); applyArm('R', st);
            log('triceps: elbow opened from', b0.angle, 'to', bendInside('R').angle, 'deg; his hand to his chest', mm(CONTACT.minGap(handMeshes(P.arms.R.hand), CONTACT.field(torsoMeshes()), null, 0, 0.15).gap), 'mm'); }
          SOL.arms.chestR = st; SOL.arms.chestL = mirArm(st);
          const b = bendInside('R'), tri = elbowPoint('R', 2.55, 2.75, 'back');
          SOL.lm.tricepsTendon_R = tri; SOL.lm.tricepsTendon_L = { point: mz(tri.point), normal: mz(tri.normal) };
          const kt = NEURO.points(P);
          log('triceps tendon measured', r3(tri.point), 'normal', r3(tri.normal), '; kit tricepsTendon is', (kt.normals.tricepsTendon_R.angleTo(tri.normal) * 180 / Math.PI).toFixed(0), 'deg away; elbow', b.angle, 'deg');
          // the wrist hold
          const hand = EX.L.hand, a = P.arms.R, fld = CONTACT.field(armMeshes('R')); a.group.updateMatrixWorld(true);
          const Wr = a.hand.group.getWorldPosition(V(0, 0, 0)), fx = b.f.clone(), F = trunk();
          const top = F.front.clone().addScaledVector(fx, -F.front.dot(fx)).normalize();          // the top of his wrist (away from his chest)
          const at = Wr.clone().addScaledVector(fx, -0.3), around = V(0, 0, 0).crossVectors(fx, top).normalize();
          const rcm = new THREE.Mesh(a.armMesh.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); rcm.matrixWorld.copy(a.armMesh.matrixWorld); rcm.matrixAutoUpdate = false;
          const hit = new THREE.Raycaster(at.clone().addScaledVector(top, 1.2), top.clone().negate()).intersectObject(rcm, false)[0];
          const WRIST_POSE = { all: [0.55, 0.75, 0.45], spread: 0.25, fan: { index: 0.03, middle: 0, ring: -0.03, little: -0.07 }, thumb: [0.45, 0.2, 0.3, 0.2] };
          const quat = HANDS.quat(around.clone().negate().addScaledVector(F.up, -0.3).normalize(), top);
          hand.pose(WRIST_POSE); CONTACT.rest(hand, 'palm', hit.point, top, quat, fld, 0.0006, 0.3);
          const ex = { hand: 'L', wrist: hand.group.position.clone(), quat, pose: WRIST_POSE, back: V(0.1, 0.5, 0.86).normalize() };
          applyEx('L', ex);
          ex.pose = CONTACT.curlToTouch(hand, ['index', 'middle', 'ring', 'little'], fld, WRIST_POSE, { gap: 0.0006, from: -0.3, to: 1.4 }); applyEx('L', ex);   // each finger round his wrist
          {   // the thumb pad on the far side of his wrist, facing the thumb's base
            hand.group.updateMatrixWorld(true);
            const tb = hand.thumb.base.getWorldPosition(V(0, 0, 0)), B = a.armMesh.userData.base, pa = a.armMesh.geometry.attributes.position, na = a.armMesh.geometry.attributes.normal;
            let best = -2, bi = 0; const nv = V(0, 0, 0), pv = V(0, 0, 0);
            for (let i = 0; i < pa.count; i++) { const x = B[3 * i]; if (x < 5.15 || x > 5.4) continue; pv.fromBufferAttribute(pa, i).applyMatrix4(a.armMesh.matrixWorld); nv.fromBufferAttribute(na, i).transformDirection(a.armMesh.matrixWorld); const sc = nv.dot(tb.clone().sub(pv).normalize()); if (sc > best) { best = sc; bi = i; } }
            const Tp = V(0, 0, 0).fromBufferAttribute(pa, bi).applyMatrix4(a.armMesh.matrixWorld), Tn = V(0, 0, 0).fromBufferAttribute(na, bi).transformDirection(a.armMesh.matrixWorld).normalize();
            const th = CONTACT.thumbOn(hand, Tp, Tn, fld, 0.0008); ex.thumbQ = th.tq; applyEx('L', ex);
            log('wrist hold thumb pad', mm(th.pad), 'mm, lowest thumb point', mm(th.all), 'mm');
          }
          SOL.ex.wristR = ex; SOL.ex.wristL = mirEx(ex);
          SOL.ex.wristRel = relTo(ex, a.hand.group);           // the hold, carried with his hand while the examiner lifts it
          const g = CONTACT.partGaps(hand, fld);
          SOL.gaps.wristR = Object.fromEntries(Object.entries(g).map(([k2, v]) => [k2, mm(v.gap)]));
          log('wrist hold gaps (mm)', JSON.stringify(SOL.gaps.wristR));
          SOL.strikes.triR = solveStrike(tri.point, tri.normal, STRIKE_DIR.tri, CONTACT.field([a.armMesh])); SOL.strikes.triL = mirStrike(SOL.strikes.triR);
          log('triceps strike gap', mm(SOL.strikes.triR.gap), 'mm');
          const Tt = tri.point;
          applyEx('L', ex); applyStrike(SOL.strikes.triR, 0);
          // from his side, a little from the head end, the back of the elbow facing the camera; the triceps in frame
          const triCam = (sd, exH, name) => {
            const sz = sd === 'R' ? 1 : -1, tq = SOL.lm['tricepsTendon_' + sd], belly = elbowPoint(sd, 1.3, 1.7, 'back'), a = P.arms[sd];
            const pref = tq.normal.clone().multiplyScalar(0.8).add(V(-0.35, 0.3, 0.5 * sz)).normalize();
            return pickCam(tq.point.clone().lerp(belly.point, 0.4), pref, 7.5, [[hammer.group.localToWorld(hammer.pts.centre.clone()), 0.06, hammer.group], [belly.point.clone().addScaledVector(belly.normal, 0.004), 0.03, a.group], [tq.point.clone().addScaledVector(tq.normal, 0.3), 0.25, a.group]], { name, maxCone: 35, aperture: 0.025 });
          };
          SOL.cams.triR = triCam('R', 'L', 'triceps R');
          applyArm('R', SOL.arms.abdR); applyArm('L', SOL.arms.chestL); applyEx('R', SOL.ex.wristL); applyStrike(SOL.strikes.triL, 0);
          SOL.cams.triL = triCam('L', 'R', 'triceps L');
          applyArm('L', SOL.arms.abdL); applyEx('R', HOME_EX.R); applyEx('L', HOME_EX.L);
        }
        // --------------------------------------------------- reinforcement: the biceps jerk again while he clenches his teeth;
        // wide enough for his jaw and his right elbow
        if (want('reinf')) {
          applyArm('R', SOL.arms.abdR); P.setFace({ clench: 1 });
          const k = NEURO.points(P), jaw = k.masseter_R, Tb = SOL.lm.bicepsTendon_R.point, M = jaw.clone().lerp(Tb, 0.5);
          applyEx('L', SOL.ex.thumbR); applyStrike(SOL.strikes.bicR, 0);
          SOL.cams.reinf = pickCam(M.clone().lerp(jaw, 0.25), V(0.42, 0.42, 0.8), 15.0, [[jaw.clone().addScaledVector(k.normals.masseter_R, 0.004), 0.02, P.head], [EX.L.hand.world('thumbTip'), 0.03, EX.L.hand.group], [hammer.group.localToWorld(hammer.pts.centre.clone()), 0.06, hammer.group]], { name: 'reinforcement', aperture: 0.03, maxCone: 35 });
          P.setFace({ pupilR: 3.5, pupilL: 3.5 });
        }
        // ============================================================ THE LEGS
        const legMeshes = (sides = ['R', 'L']) => { const out = []; for (const sd of sides) { out.push(P.legMeshes[sd]); P.legs[sd].traverse((m) => { if (m.isMesh && m.visible && m !== P.legMeshes[sd]) out.push(m); }); } return out; };
        const legField = (sides) => CONTACT.field(legMeshes(sides));
        const strikeLeg = (name, side, lm, dirHint, sides) => {
          const k = NEURO.points(P), T = k[lm + '_' + side], n = k.normals[lm + '_' + side];
          const st = solveStrike(T, n, dirHint, legField(sides || [side]));
          log('strike', name, 'gap', mm(st.gap), 'mm');
          return st;
        };
        // --------------------------------------------------- knee jerks: both knees bent ~30 degrees (kit kneeJerk, heels on the
        // bed), the examiner's left forearm under both knees (kit kneeSupport), lifted until it just meets the backs of the knees
        for (const sd of ['R', 'L']) applyArm(sd, HOME_ARM[sd]);
        SOL.legs.kneeJerk = NEURO.leg(P, 'R', 'kneeJerk'); NEURO.leg(P, 'L', 'kneeJerk');
        if (want('knee')) {
          const ks = NEURO.kneeSupport(P), a = EX.L, fld = legField(['R', 'L']);
          const SUP_POSE = { all: [0.35, 0.5, 0.3], spread: 0.3, thumb: [0.3, 0, 0.2, 0.1] };
          let y = ks.y, ex = null;
          let tilt = 0;
          const put = (yy) => {
            const back = V(0.08, -0.18 + tilt, 1).normalize(), W0 = V(ks.x + 0.05, yy, ks.z - 1.75);   // the wrist beyond his left knee; the forearm runs back under both knees
            ex = { hand: 'L', wrist: W0, quat: HANDS.quat(V(-0.08, 0.05, -1).normalize(), V(0, 1, 0)), pose: SUP_POSE, back };
            applyEx('L', ex); a.fore.updateMatrixWorld(true);
            return CONTACT.minGap(a.fore.children.filter((m) => m.isMesh), fld, null, 0, 0.15).gap;
          };
          // slide up until the forearm just meets the backs of the knees
          let lo = ks.y - 1.0, hi = ks.y + 1.0;
          for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2, g = put(m); if (!isFinite(g) || g > 0.0006) lo = m; else hi = m; }
          const gapOf = (sd) => CONTACT.minGap(a.fore.children.filter((m) => m.isMesh), legField([sd]), null, 0, 0.15).gap;
          // tilt the forearm (and lift it) until it meets the backs of BOTH knees: for each tilt, lift until the first knee
          // touches; keep the tilt where the other knee is closest too
          let bestT = null;
          for (let tl = -0.5; tl <= 0.501; tl += 0.05) {
            tilt = tl; lo = ks.y - 1.2; hi = ks.y + 1.2;
            for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2, gg = put(m); if (!isFinite(gg) || gg > 0.0006) lo = m; else hi = m; }
            put((lo + hi) / 2); const dR = gapOf('R'), dL = gapOf('L'), e = Math.abs(dR - dL) + 10 * Math.max(0, -Math.min(dR, dL));
            if (!bestT || e < bestT.e) bestT = { e, tl, y: (lo + hi) / 2 };
          }
          tilt = bestT.tl; put(bestT.y);
          SOL.ex.kneeSupport = ex;
          const gR = CONTACT.minGap(a.fore.children.filter((m) => m.isMesh), legField(['R']), null, 0, 0.15).gap, gL = CONTACT.minGap(a.fore.children.filter((m) => m.isMesh), legField(['L']), null, 0, 0.15).gap;
          const heel = { R: P.legPoint('R', 'heel').y - Dm.Ym, L: P.legPoint('L', 'heel').y - Dm.Ym };
          SOL.gaps.kneeSupport = { rightKnee: mm(gR), leftKnee: mm(gL), heelR: mm(heel.R), heelL: mm(heel.L) };
          log('knee support: forearm to right knee', mm(gR), 'mm, to left knee', mm(gL), 'mm; heels above the mattress R', mm(heel.R), 'L', mm(heel.L), 'mm');
          SOL.strikes.kneeR = strikeLeg('kneeR', 'R', 'patellarTendon', STRIKE_DIR.knee);
          SOL.strikes.kneeL = strikeLeg('kneeL', 'L', 'patellarTendon', STRIKE_DIR.kneeL, ['L', 'R']);
          applyStrike(SOL.strikes.kneeR, 0);
          const k = NEURO.points(P), mid = k.patellarTendon_R.clone().lerp(k.patellarTendon_L, 0.5);
          SOL.cams.knees = pickCam(mid, V(0.75, 0.35, 0.55), 9.5, [[k.patellarTendon_R.clone().addScaledVector(k.normals.patellarTendon_R, 0.01), 0.03, P.legs.R], [hammer.group.localToWorld(hammer.pts.centre.clone()), 0.06, hammer.group]], { name: 'knees', aim: mid.clone().add(V(0, -0.2, 0)), aperture: 0.03 });
          // Jendrassik: hands hooked in front of his chest (kit), pulled apart; the knee jerk again on the right
          const Fj = trunk();
          const jend = (pull) => {                       // the kit preset, the hands moved apart just until the hooked fingers touch
            const r0 = NEURO.arm(P, 'R', 'jendrassik', { pull }), l0 = NEURO.arm(P, 'L', 'jendrassik', { pull });
            // Two hooks nest: the right hand (back up, fingers curled down) above, the left (back down, fingers curled up)
            // below. The left hand stays; the right hand moves along the hands' back-to-palm axis and toward the left hand
            // until the curled fingers rest on each other: the deepest hook in which no finger passes through another.
            applyArm('L', l0); const lf = CONTACT.field(handMeshes(P.arms.L.hand));
            const dors = V(0, 1, 0).applyQuaternion(r0.quat).normalize();
            const at = (d, up) => { const r = Object.assign({}, r0, { wrist: r0.wrist.clone().addScaledVector(Fj.left, -d).addScaledVector(dors, up) }); applyArm('R', r); return { r, l: l0, g: CONTACT.minGap(handMeshes(P.arms.R.hand), lf, null, 0, 0.15, 3).gap }; };
            let best = null;
            // (an offset counts only if the hands really touch there: the closest point 0 to 1.5 mm)
            for (let up = -0.32; up <= 0.321; up += 0.04) { let lo = -0.3, hi = 1.6; for (let it = 0; it < 13; it++) { const m = (lo + hi) / 2, r = at(m, up); if (!isFinite(r.g) || r.g > 0.0006) hi = m; else lo = m; } const g = at(hi, up).g; if (g >= 0 && g < 0.0015 && (!best || hi < best.d)) best = { d: hi, up }; }
            if (best) { let d2 = best.d; for (let it = 0; it < 30; it++) { applyArm('R', Object.assign({}, r0, { wrist: r0.wrist.clone().addScaledVector(Fj.left, -d2).addScaledVector(dors, best.up) })); if (CONTACT.minGap(handMeshes(P.arms.R.hand), lf, null, 0, 0.15).gap >= 0) break; d2 += 0.003; } best.d = d2; }   // verified on every vertex
            if (!best) best = { d: 0.6, up: 0 };
            const r = at(best.d, best.up); log('Jendrassik pull', pull, 'right hand moved', mm(best.d), 'mm toward his right, along the back of the hand', mm(best.up), 'mm; closest point between the hands', mm(r.g), 'mm'); return r;
          };
          { const j0 = jend(0); SOL.arms.jend0R = j0.r; SOL.arms.jend0L = j0.l; const j1 = jend(1); SOL.arms.jend1R = j1.r; SOL.arms.jend1L = j1.l; }
          for (const pull of [0, 1]) {
            applyArm('R', SOL.arms['jend' + pull + 'R']); applyArm('L', SOL.arms['jend' + pull + 'L']);
            const hf = CONTACT.field(handMeshes(P.arms.L.hand)), g2 = CONTACT.minGap(handMeshes(P.arms.R.hand), hf, null, 0, 0.15);
            SOL.gaps['jendrassik' + pull] = mm(g2.gap);
            log('Jendrassik pull', pull, ': closest point between his two hands', mm(g2.gap), 'mm (negative = fingers through each other)');
          }
          applyStrike(SOL.strikes.kneeR, 0);
          const hookC = P.arms.R.hand.world('middleTip').lerp(P.arms.L.hand.world('middleTip'), 0.5);
          SOL.cams.jend = pickCam(hookC.clone().lerp(k.patellarTendon_R, 0.5), V(0.22, 0.12, 1), 15.5, [[hookC, 0.05, P.group], [k.patellarTendon_R.clone().addScaledVector(k.normals.patellarTendon_R, 0.01), 0.03, P.legs.R], [hammer.group.localToWorld(hammer.pts.centre.clone()), 0.06, hammer.group]], { name: 'Jendrassik', aperture: 0.04, maxCone: 25 });
          for (const sd of ['R', 'L']) applyArm(sd, HOME_ARM[sd]);
        }
        // --------------------------------------------------- ankle jerk (right): the kit ankleJerk preset, fine-tuned so the
        // outer ankle RESTS on the other shin (measured), the foot held slightly up; the examiner's left palm on the ball of
        // the foot; the hammer on the Achilles tendon
        NEURO.leg(P, 'L', 'rest');
        if (want('ankle')) {
          const base = NEURO.leg(P, 'R', 'ankleJerk');
          const fitWith = (lift) => {
            const on = P.legPoint('L', 'shinMid').clone().lerp(P.legPoint('L', 'medialMalleolus'), 0.25).addScaledVector(P.legNormal('L', 'shinMid'), lift);
            return P.legFit('R', [{ point: 'lateralMalleolus', at: on, w: 4 }], { free: ['hipFlex', 'hipAbd', 'hipRot', 'knee'], start: base, reg: 0.0004, iters: 600 });
          };
          // the contact is where the outer ankle meets the other shin: measured in the 6 cm round the lateral malleolus
          const fl = legField(['L']), gapLegs = () => CONTACT.minGap([P.legMeshes.R], fl, P.legPoint('R', 'lateralMalleolus'), 0.6, 0.2).gap;
          let bestA = null;
          for (let lift = 0.2; lift <= 1.0; lift += 0.05) { const s2 = Object.assign({}, fitWith(lift)); const g = gapLegs(); const e = Math.abs(g - 0.0006) + 10 * Math.max(0, -g); if (!bestA || e < bestA.e) bestA = { e, s2, lift }; }
          const st = bestA.s2; st.ankle = 8; P.setLeg('R', st);
          for (const key of ['hipFlex', 'knee']) {                       // then raise or lower it until the outer ankle just rests on the shin
            let lo2 = -10, hi2 = 10; const b0 = st[key];
            for (let it = 0; it < 18; it++) { const m = (lo2 + hi2) / 2; P.setLeg('R', Object.assign({}, st, { [key]: b0 + m })); const g = gapLegs(); if (!isFinite(g) || g > 0.0006) hi2 = m; else lo2 = m; }
            P.setLeg('R', Object.assign({}, st, { [key]: b0 + hi2 })); if (Math.abs(gapLegs() - 0.0006) < 0.0004) { st[key] = b0 + hi2; break; }
          }
          P.setLeg('R', st);
          SOL.legs.ankleJerkR = P.leg('R');
          const thigh = CONTACT.minGap([P.legMeshes.R], fl, P.legPoint('R', 'hip'), 2.5, 0.2).gap;
          log('ankle jerk leg', JSON.stringify(Object.fromEntries(Object.entries(SOL.legs.ankleJerkR).map(([k2, v]) => [k2, +(+v).toFixed(1)]))), '| outer ankle on the other shin', mm(gapLegs()), 'mm (the inner thighs near the groin, inside the trousers:', mm(thigh), 'mm)');
          SOL.gaps.ankleLegOnShin = mm(gapLegs());
          SOL.ex.footR = palmOnBall('R', 'L');
          SOL.ex.footL = mirEx(SOL.ex.footR);
          SOL.strikes.ankR = strikeLeg('ankR', 'R', 'achillesTendon', STRIKE_DIR.ank); SOL.strikes.ankL = mirStrike(SOL.strikes.ankR);
          applyEx('L', SOL.ex.footR); applyStrike(SOL.strikes.ankR, 0);
          // low, from his side, a little behind the heel: the Achilles tendon, the calf, the palm on the foot, the hammer head
          const ankCam = (sd, exPalm, name) => {
            const sz = sd === 'R' ? 1 : -1, k = NEURO.points(P), A0 = k['achillesTendon_' + sd], nA = k.normals['achillesTendon_' + sd], heel = P.legPoint(sd, 'heel');
            const pref = V(0.15, 0.2, sz).normalize().addScaledVector(nA, 0.55).normalize();
            return pickCam(A0.clone().lerp(P.legPoint(sd, 'ball'), 0.3).lerp(k['calf_' + sd], 0.2), pref, 8.5, [[hammer.group.localToWorld(hammer.pts.centre.clone()), 0.06, hammer.group], [k['calf_' + sd].clone().addScaledVector(k.normals['calf_' + sd], 0.01), 0.04, P.legs[sd]], [EX[exPalm].hand.world('dorsum'), 0.06, EX[exPalm].hand.group], [heel, 0.08, P.legs[sd]]], { name, maxCone: 40, aperture: 0.025 });
          };
          SOL.cams.ankR = ankCam('R', 'L', 'ankle jerk R');
          P.setLeg('R', {}); P.setLeg('L', SOL.legs.ankleJerkR); applyEx('R', SOL.ex.footL); applyStrike(SOL.strikes.ankL, 0);
          SOL.cams.ankL = ankCam('L', 'R', 'ankle jerk L');
          P.setLeg('L', {}); applyEx('R', HOME_EX.R); applyEx('L', HOME_EX.L);
        }
        // --------------------------------------------------- ankle clonus (right): knee slightly bent, leg turned a little out,
        // the calf resting on the examiner's left palm; his right palm on the ball of the foot, pushing up and holding
        if (want('clonus')) {
          NEURO.leg(P, 'L', 'rest');
          const st0 = { hipFlex: 16, hipAbd: 4, hipRot: 14, knee: 24, ankle: 0 };
          P.setLeg('R', st0);
          const hand = EX.L.hand, fld = legField(['R']);
          const C0 = P.legPoint('R', 'calf'), nC = P.legNormal('R', 'calf');
          const CAL_POSE = { all: [0.15, 0.22, 0.12], spread: 0.3, fan: { index: 0.03, middle: 0, ring: -0.03, little: -0.07 }, thumb: [0.2, 0, 0.15, 0.1] };
          const quat = HANDS.quat(V(0.05, 0, -1).addScaledVector(nC, -V(0.05, 0, -1).dot(nC)).normalize(), nC);
          hand.pose(CAL_POSE); CONTACT.rest(hand, 'palm', C0, nC, quat, fld, 0.0006, 0.3);
          const ex = { hand: 'L', wrist: hand.group.position.clone(), quat, pose: CAL_POSE, back: V(0.15, -0.3, 1).normalize() };
          applyEx('L', ex); ex.pose = CONTACT.curlToTouch(hand, ['index', 'middle', 'ring', 'little'], fld, CAL_POSE, { gap: 0.0006, from: -0.2, to: 1.2, together: true }); applyEx('L', ex);
          liftClear('L', ex, nC, fld, 0.0003);
          const bg = bedGap(handMeshes(hand)).gap;
          SOL.legs.clonusR0 = P.leg('R'); SOL.ex.calfR = ex; SOL.ex.calfL = mirEx(ex);
          log('ankle clonus: palm under the calf', mm(CONTACT.gapNear(hand, 'palm', fld, 0.3).gap), 'mm; hand above the mattress', mm(bg), 'mm');
          SOL.ex.clonusFootR0 = palmOnBall('R', 'R');
          P.setLeg('R', Object.assign({}, st0, { ankle: 18 })); SOL.legs.clonusR1 = P.leg('R');
          SOL.ex.clonusFootR1 = palmOnBall('R', 'R');
          SOL.ex.clonusFootL0 = mirEx(SOL.ex.clonusFootR0); SOL.ex.clonusFootL1 = mirEx(SOL.ex.clonusFootR1);
          applyEx('L', ex); applyEx('R', SOL.ex.clonusFootR1);
          const ball = P.legPoint('R', 'ball');
          // from his side at foot height: the foot, the palm on it, the calf on the other palm (never behind a sleeve)
          const clonCam = (sd, name) => {
            const sz = sd === 'R' ? 1 : -1, b2 = P.legPoint(sd, 'ball'), c2 = P.legPoint(sd, 'calf');
            return pickCam(b2.clone().lerp(c2, 0.45), V(0.75, 0.3, 0.6 * sz), 9.0, [[EX.R.hand.world('palm'), 0.05, EX.R.hand.group], [EX.L.hand.world('palm'), 0.05, EX.L.hand.group], [P.legPoint(sd, 'achilles'), 0.08, P.legs[sd]], [b2, 0.08, P.legs[sd]]], { name, maxCone: 40, aperture: 0.025 });
          };
          SOL.cams.clonR = clonCam('R', 'ankle clonus R');
          P.setLeg('R', {}); P.setLeg('L', SOL.legs.clonusR1); applyEx('R', SOL.ex.calfL); applyEx('L', SOL.ex.clonusFootL1);
          SOL.cams.clonL = clonCam('L', 'ankle clonus L');
          P.setLeg('L', {}); applyEx('R', HOME_EX.R); applyEx('L', HOME_EX.L);
          NEURO.leg(P, 'R', 'rest');
        }
        // --------------------------------------------------- knee clonus (right): leg straight; the examiner's left hand on his
        // thigh, the tips of the thumb and the index finger together on the top edge of the kneecap, pushing it toward the foot
        if (want('kneeClonus')) {
          NEURO.leg(P, 'R', 'rest'); NEURO.leg(P, 'L', 'rest');
          const hand = EX.L.hand, fld = legField(['R']);
          const Pt = P.legPoint('R', 'patella'), kn = P.legPoint('R', 'knee'), ank = P.legPoint('R', 'ankle'), hip = P.legPoint('R', 'hip');
          const axis = kn.clone().sub(hip).normalize();                               // down the thigh, toward the foot
          const up = P.legNormal('R', 'patella');
          // the top edge of the kneecap: from the middle of the patella 2.4 cm up the thigh, onto the skin
          const rcm = new THREE.Mesh(P.legMeshes.R.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); rcm.matrixWorld.copy(P.legMeshes.R.matrixWorld); rcm.matrixAutoUpdate = false;
          const c = Pt.clone().addScaledVector(axis, -0.26), hit = new THREE.Raycaster(c.clone().addScaledVector(up, 1), up.clone().negate()).intersectObject(rcm, false)[0];
          const E0 = hit.point, nE = fld.query(E0, 0.05).n;
          // the tips of the thumb and the index finger TOGETHER (a pinch) on the top edge, the pads facing toward the foot;
          // the other fingers tucked into the palm, clear of the thigh
          // The hand over the thigh, palm down, fingers toward his foot; the index finger bent down so its tip rests on the top
          // edge, the thumb tip beside it on the same edge (the two tips together, ~1.5 cm apart, pads toward the foot: no V);
          // the middle, ring and little fingers tucked into the palm, clear of the thigh.
          const KC_POSE = { curl: { index: [0.6, 1.2, 0.72], middle: [1.25, 1.45, 0.95], ring: [1.3, 1.5, 0.95], little: [1.35, 1.5, 0.95] }, spread: 0.15, thumb: [1.0, -0.4, 0.3, 0] };   // the index and thumb tips side by side, 15 mm apart
          const pushDir = axis.clone().negate().addScaledVector(nE, 0.6).normalize();
          const side = V(0, 0, 0).crossVectors(axis, up).normalize();                      // across the thigh
          hand.group.position.set(0, 0, 0); hand.group.quaternion.identity(); hand.pose(KC_POSE); hand.group.updateMatrixWorld(true);
          const iL = hand.world('indexTip'), tL = hand.world('thumbTip'), mL = iL.clone().lerp(tL, 0.5), uL = tL.clone().sub(iL).normalize();
          // searched: which way across the edge the thumb lies, and the roll of the hand about that line; the two tips rest on
          // the edge (slid along the push), scored on both tip gaps, nothing sinking, the hand above the thigh pointing footward
          let best = null; const tK = performance.now();
          for (const sg of [1, -1]) for (let r = 0; r < 24; r++) {
            const q = new THREE.Quaternion().setFromAxisAngle(side, r * Math.PI / 12).multiply(new THREE.Quaternion().setFromUnitVectors(uL, side.clone().multiplyScalar(sg)));
            const dir = mL.clone().applyQuaternion(q).normalize(), dors = V(0, 1, 0).applyQuaternion(q);
            if (dir.dot(axis) < 0.15 || dir.dot(up) > -0.1 || dors.dot(up) < 0.35) continue;   // the back of the hand up: never upright
            const ex = { hand: 'L', wrist: E0.clone().sub(mL.clone().applyQuaternion(q)).addScaledVector(pushDir, 0.05), quat: q, pose: KC_POSE, back: axis.clone().multiplyScalar(-0.5).addScaledVector(up, 0.5).add(V(0, 0, 0.6)).normalize() };
            let gi, gt, all;
            for (let it = 0; it < 8; it++) {
              applyEx('L', ex); const pr = CONTACT.handParts(hand);
              gi = CONTACT.minGap(pr.indexTip, fld, null, 0, 0.15).gap; gt = CONTACT.minGap(pr.thumbTip, fld, null, 0, 0.15).gap; all = CONTACT.minGap(handMeshes(hand), fld, null, 0, 0.15, 4).gap;
              const g = Math.min(isFinite(gi) ? gi : 0.05, isFinite(gt) ? gt : 0.05), step = Math.max(g - 0.0006, isFinite(all) ? all - 0.0003 : g) ;
              if (Math.abs(step) < 0.00008) break;
              ex.wrist = ex.wrist.clone().addScaledVector(pushDir, -Math.max(-0.02, Math.min(step, 0.05)));
            }
            const sc = Math.abs((isFinite(gi) ? gi : 0.05) - 0.0006) + Math.abs((isFinite(gt) ? gt : 0.05) - 0.0006) + 4 * Math.max(0, -all) + 0.003 * (1 - dors.dot(up));
            if (!best || sc < best.sc) best = { sc, ex, gi, gt, all, r, sg, q };
          }
          {   // the edge curves down at its sides: tilt the line of the two tips (about the thigh's axis) so both tips meet it
            const q0 = best.q;
            for (let tl = -0.6; tl <= 0.61; tl += 0.1) {
              const q = new THREE.Quaternion().setFromAxisAngle(axis, tl).multiply(q0), dors = V(0, 1, 0).applyQuaternion(q);
              const ex = { hand: 'L', wrist: E0.clone().sub(mL.clone().applyQuaternion(q)).addScaledVector(pushDir, 0.05), quat: q, pose: KC_POSE, back: best.ex.back };
              let gi, gt, all;
              for (let it = 0; it < 8; it++) {
                applyEx('L', ex); const pr = CONTACT.handParts(hand);
                gi = CONTACT.minGap(pr.indexTip, fld, null, 0, 0.15).gap; gt = CONTACT.minGap(pr.thumbTip, fld, null, 0, 0.15).gap; all = CONTACT.minGap(handMeshes(hand), fld, null, 0, 0.15, 4).gap;
                const g = Math.min(isFinite(gi) ? gi : 0.05, isFinite(gt) ? gt : 0.05), step = Math.max(g - 0.0006, isFinite(all) ? all - 0.0003 : g);
                if (Math.abs(step) < 0.00008) break;
                ex.wrist = ex.wrist.clone().addScaledVector(pushDir, -Math.max(-0.02, Math.min(step, 0.05)));
              }
              const sc = Math.abs((isFinite(gi) ? gi : 0.05) - 0.0006) + Math.abs((isFinite(gt) ? gt : 0.05) - 0.0006) + 4 * Math.max(0, -all) + 0.003 * (1 - dors.dot(up));
              if (sc < best.sc) best = Object.assign({}, best, { sc, ex, gi, gt, all, tl });
            }
            log('knee clonus tilt', best.tl == null ? 0 : +best.tl.toFixed(2), 'index', mm(best.gi), 'thumb', mm(best.gt));
          }
          const ex = best.ex; applyEx('L', ex);
          if (CONTACT.minGap(handMeshes(hand), fld, null, 0, 0.15).gap < 0) liftClear('L', ex, nE, fld, 0.0003);      // nothing under the skin
          log('knee clonus search', ((performance.now() - tK) / 1000).toFixed(1), 's');
          {   // the thumb tip settles onto the edge where it is (the edge curves; the index already rests on it)
            const q0 = fld.query(hand.world('thumbTip'), 0.15);
            if (q0.q && q0.d > 0.0012) { const to = CONTACT.thumbOn(hand, q0.q, q0.n, fld, 0.0006, axis); const sn = CONTACT.minGap(handMeshes(hand), fld, null, 0, 0.15).gap;
              if (to.pad < q0.d && sn >= 0) { ex.thumbQ = to.tq.map((q) => q.clone()); } applyEx('L', ex); }
          }
          log('knee clonus pinch: roll', best.r * 15, 'thumb side', best.sg, 'tips apart', mm(hand.world('indexTip').distanceTo(hand.world('thumbTip'))), 'mm');
          const th = { pad: CONTACT.minGap(CONTACT.handParts(hand).thumbTip, fld, null, 0, 0.15).gap };
          const parts = CONTACT.partGaps(hand, fld);
          SOL.ex.kneeClonusR = ex; SOL.ex.kneeClonusL = mirEx(ex);
          SOL.lm.patellaTopR = { point: E0, normal: nE };
          SOL.gaps.kneeClonus = { indexTip: mm(CONTACT.minGap(CONTACT.handParts(hand).indexTip, fld, null, 0, 0.15).gap), thumbTip: mm(th.pad), lowest: mm(Math.min(...Object.values(parts).map((v) => v.gap))) };
          log('knee clonus gaps (mm)', JSON.stringify(SOL.gaps.kneeClonus));
          SOL.cams.kneeClonR = pickCam(E0, V(0.25, 0.8, 1), 6.5, [[hand.world('indexTip'), 0.03, EX.L.hand.group], [hand.world('thumbTip'), 0.03, EX.L.hand.group], [Pt.clone().addScaledVector(up, 0.01), 0.03, P.legs.R]], { name: 'knee clonus R', aim: E0.clone().addScaledVector(up, 0.35), aperture: 0.015, maxCone: 35 });
          SOL.cams.kneeClonL = mirCam(SOL.cams.kneeClonR);
        }
        // ============================================================ the two medium shots (upper body; legs)
        {
          for (const sd of ['R', 'L']) { applyArm(sd, HOME_ARM[sd]); P.setLeg(sd, {}); }
          const head = P.headBack(), hip = P.legPoint('R', 'hip'), mid = head.clone().lerp(hip, 0.45).add(V(0.6, 0.6, 0.6));
          SOL.cams.upper = cam(mid.clone().add(V(4.5, 6.5, 14.0)), mid, mid, 0.05);
          const lm = P.legPoint('R', 'knee').lerp(P.legPoint('R', 'ankle'), 0.4).add(V(0, 0, -0.6));
          SOL.cams.legs = cam(lm.clone().add(V(1.5, 7.5, 12.5)), lm, lm, 0.05);
        }
        // ============================================================ HOFFMANN'S SIGN (right; the left is the mirror)
        // His forearm out toward the examiner, the hand palm down and resting on the examiner's left palm (palm up), the wrist
        // a little flexed; the examiner's right index finger under the tip of his middle finger, the right thumb on its nail.
        if (want('hoff')) {
          for (const sd of ['R', 'L']) { applyArm(sd, HOME_ARM[sd]); P.setLeg(sd, {}); }
          const F = trunk(), Sh = P.shoulder('R');
          const wrist = V(-0.6, Dm.Ym + 3.15, 3.25);                                  // his wrist held out over the edge of the bed at his right
          const fingersDir = V(0.25, -0.22, 1).normalize();                           // toward the examiner, the wrist flexed a little (hand tilted down)
          const HPOSE = { curl: { index: [0.3, 0.42, 0.25], middle: [0.14, 0.2, 0.1], ring: [0.32, 0.45, 0.27], little: [0.36, 0.5, 0.3] }, spread: 0.12, fan: { index: 0.04, middle: 0, ring: -0.04, little: -0.09 }, thumb: [0.18, 0, 0.15, 0.1] };   // relaxed: fingers together, slightly curled
          const pq = HANDS.quat(fingersDir, V(0, 1, 0).addScaledVector(fingersDir, -fingersDir.y).normalize());
          const arm = { wrist, quat: pq, pose: HPOSE, pole: V(-0.2, -1, 0.3).normalize() };
          applyArm('R', arm); SOL.arms.hoffR = arm; SOL.arms.hoffL = mirArm(arm);
          const ph = P.arms.R.hand; ph.group.updateMatrixWorld(true);
          const pfld = CONTACT.field(handMeshes(ph).concat([P.arms.R.armMesh]));
          // the examiner's left palm up under his palm, the examiner's fingers across under it toward his wrist (headward and
          // in), the heel of the hand under his knuckles; searched: slide and turn; it rests by its lowest point on HIS HAND
          // only (nothing of either hand sinks)
          const hfld = CONTACT.field(handMeshes(ph));
          const sup = EX.L.hand, pdn = V(0, -1, 0).transformDirection(ph.group.matrixWorld).normalize();   // the way his palm faces
          const SPOSE = { all: [0.1, 0.14, 0.08], spread: 0.05, fan: { index: 0.0, middle: 0, ring: -0.01, little: -0.02 }, thumb: [0.25, 0.05, 0.15, 0.1] };   // fingers together
          const f00 = V(-0.45, 0, -1).addScaledVector(pdn, -V(-0.45, 0, -1).dot(pdn)).normalize();
          let bestS = null;
          for (const turn of [-0.45, -0.3, -0.15, 0, 0.15, 0.3]) for (const sl of [-0.35, -0.25, -0.15, -0.05, 0.05]) {
            const fd = f00.clone().applyAxisAngle(pdn, turn), sq = HANDS.quat(fd, pdn);
            sup.pose(SPOSE); CONTACT.rest(sup, 'palm', ph.world('palm').addScaledVector(fd, sl), pdn, sq, hfld, 0.0006, 0.35);
            const e = { hand: 'L', wrist: sup.group.position.clone(), quat: sq, pose: SPOSE, back: fd.clone().negate().add(V(0, -0.35, 0)).normalize() };
            liftClear('L', e, pdn, hfld, 0.0003);
            const pg = CONTACT.minGap(CONTACT.handParts(sup).palm, hfld, null, 0, 0.15).gap, ag = CONTACT.minGap(handMeshes(sup), pfld, null, 0, 0.15).gap;
            const sc = Math.abs((isFinite(pg) ? pg : 0.05) - 0.0005) + 4 * Math.max(0, -ag) + 0.0004 * Math.abs(turn);
            if (!bestS || sc < bestS.sc) bestS = { sc, e, pg, ag, turn, sl };
          }
          const exS = bestS.e; applyEx('L', exS);
          for (let it = 0; it < 10; it++) {   // nothing of it under his hand or arm (all vertices)
            const g = CONTACT.minGap(handMeshes(sup), pfld, null, 0, 0.15).gap; if (!isFinite(g) || g >= 0.0002) break;
            exS.wrist = exS.wrist.clone().addScaledVector(pdn, 0.0004 - g); applyEx('L', exS);
          }
          bestS.pg = CONTACT.minGap(CONTACT.handParts(sup).palm, hfld, null, 0, 0.15).gap; bestS.ag = CONTACT.minGap(handMeshes(sup), pfld, null, 0, 0.15).gap;
          log('Hoffmann support: turn', bestS.turn, 'slide', bestS.sl, 'palm on palm', mm(bestS.pg), 'mm, lowest vs his hand + arm', mm(bestS.ag), 'mm');
          // the pinch: the examiner's right index pad under the tip of his middle finger, the thumb pad on its nail. The pinch
          // pose is turned so the line index pad -> thumb pad runs up through his fingertip; searched: the roll about that line
          // (the forearm back toward the examiner, clear of both hands), then the index rests and the thumb settles on the nail.
          const pin = EX.R.hand, mid = ph.fingers.middle.dip; mid.updateMatrixWorld(true);
          const mfld = CONTACT.field(handMeshes(ph).concat(handMeshes(sup)));
          const tipM = CONTACT.field(mid.children.filter((m) => m.isMesh));
          const under = ph.world('middlePad'), nail = ph.world('middleNail');
          const nailN = V(0, 1, 0).transformDirection(mid.matrixWorld).normalize(), nailQ = tipM.query(nail, 0.05).q || nail, padQ = tipM.query(under, 0.05).q || under;
          const ax = nailQ.clone().sub(padQ).normalize();                 // up through his fingertip
          const PPOSE = { curl: { index: [0.8, 0.9, 0.54], middle: [1.15, 1.35, 0.85], ring: [1.25, 1.45, 0.9], little: [1.3, 1.5, 0.9] }, spread: 0.2, thumb: [1.0, -0.4, 0, 0] };   // the pads 24.7 mm apart, facing (his fingertip, ~2.4 cm thick here, between)
          pin.group.position.set(0, 0, 0); pin.group.quaternion.identity(); pin.pose(PPOSE); pin.group.updateMatrixWorld(true);
          const vloc = pin.world('thumbPad').sub(pin.world('indexPad')).normalize();
          const q0 = new THREE.Quaternion().setFromUnitVectors(vloc, ax);
          const want = V(0.2, -0.3, 1).normalize();                      // the examiner's forearm straight back toward him (his side), clear of a side camera
          let bestP = null;
          for (let k2 = 0; k2 < 24; k2++) {
            const q2 = new THREE.Quaternion().setFromAxisAngle(ax, k2 * Math.PI / 12).multiply(q0);
            pin.pose(PPOSE); CONTACT.rest(pin, 'indexPad', padQ, ax.clone().negate(), q2, tipM, 0.0006, 0.025);
            const e2 = { hand: 'R', wrist: pin.group.position.clone(), quat: q2, pose: PPOSE, back: V(0, 0, 0) };
            pin.group.updateMatrixWorld(true); const fwd = pin.world('middleTip').sub(pin.group.position).normalize();
            e2.back = fwd.clone().negate().add(V(0, -0.2, 0)).normalize(); applyEx('R', e2);
            e2.fwd = fwd;
            const pr = CONTACT.handParts(pin), tg = CONTACT.minGap(pr.thumbTip, tipM, null, 0, 0.15).gap, ig = CONTACT.minGap(pr.indexTip, tipM, null, 0, 0.15).gap;
            const sink = CONTACT.minGap(handMeshes(pin), mfld, null, 0, 0.15, 3).gap, sinkArm = CONTACT.minGap(handMeshes(pin), pfld, null, 0, 0.15, 3).gap;
            const sc = Math.abs((isFinite(tg) ? tg : 0.05) - 0.0006) + Math.abs((isFinite(ig) ? ig : 0.05) - 0.0006) + 4 * Math.max(0, -Math.min(sink, sinkArm)) + 0.003 * (1 - e2.back.dot(want));
            if (!bestP || sc < bestP.sc) bestP = { sc, e2, tg, ig, sink: Math.min(sink, sinkArm), k2 };
          }
          const exP = bestP.e2; applyEx('R', exP);
          for (let it = 0; it < 10; it++) {   // the index tip rests under his fingertip: pushed out along the skin normal at its deepest point
            const r = CONTACT.minGap(CONTACT.handParts(pin).index, mfld, null, 0, 0.15); if (!isFinite(r.gap) || (r.gap >= 0.0003 && r.gap <= 0.001)) break;
            const n = mfld.query(r.at, 0.15).n; if (!n) break;
            exP.wrist = exP.wrist.clone().addScaledVector(n, 0.0006 - r.gap); applyEx('R', exP);
          }
          {   // the thumb pad settles on the nail (kept only if nothing sinks and it is closer than the pose's own thumb)
            const tg0 = CONTACT.minGap(CONTACT.handParts(pin).thumbTip, tipM, null, 0, 0.15).gap;
            const to = CONTACT.thumbOn(pin, nailQ, nailN, tipM, 0.0006, exP.fwd); exP.thumbQ = to.tq.map((q) => q.clone()); applyEx('R', exP);
            const tg1 = CONTACT.minGap(CONTACT.handParts(pin).thumbTip, tipM, null, 0, 0.15).gap, s1 = CONTACT.minGap(handMeshes(pin), mfld, null, 0, 0.15).gap;
            if (!(isFinite(tg1) && s1 >= 0 && (tg0 < 0 || Math.abs(tg1 - 0.0006) < Math.abs((isFinite(tg0) ? tg0 : 0.05) - 0.0006)))) { delete exP.thumbQ; applyEx('R', exP); }
            bestP.tg = CONTACT.minGap(CONTACT.handParts(pin).thumbTip, tipM, null, 0, 0.15).gap; delete exP.fwd;
          }
          log('Hoffmann pinch: roll', bestP.k2 * 15, 'deg, index', mm(bestP.ig), 'thumb', mm(bestP.tg), 'lowest', mm(bestP.sink), 'mm');
          const th = { pad: bestP.tg, all: CONTACT.minGap(CONTACT.handParts(pin).thumb, mfld, null, 0, 0.15).gap };
          SOL.ex.hoffSupR = exS; SOL.ex.hoffPinR = exP; SOL.ex.hoffSupL = mirEx(exS); SOL.ex.hoffPinL = mirEx(exP);
          SOL.ex.hoffSupRel = relTo(exS, ph.group); SOL.ex.hoffPinRel = relTo(exP, ph.group);
          SOL.gaps.hoff = { palmOnPalm: mm(CONTACT.minGap(CONTACT.handParts(sup).palm, hfld, null, 0, 0.15).gap), indexUnderTip: mm(CONTACT.minGap(CONTACT.handParts(pin).indexTip, tipM, null, 0, 0.15).gap), thumbOnNail: mm(th.pad), thumbLowest: mm(th.all) };
          log("Hoffmann gaps (mm)", JSON.stringify(SOL.gaps.hoff));
          const thumbP = ph.world('thumbTip');
          // a close-up from his side, a little below the hand: his whole hand and his thumb (which must be seen to stay still)
          const hoffCam = (sd, pinH, name) => {
            const sz = sd === 'R' ? 1 : -1, hh = P.arms[sd].hand, tp = hh.world('thumbTip'), c = hh.world('palm').lerp(hh.world('middleTip'), 0.35).lerp(tp, 0.2);
            const ts = tp.clone().sub(hh.world('palm')); ts.y = 0; ts.normalize();       // the side his thumb is on
            log(name, 'his thumb side', r3(ts));
            return pickCam(c, ts.clone().add(V(0, 0, -0.1 * sz)), 6.0, [[tp, 0.03, P.arms[sd].group], [EX[pinH].hand.world('thumbTip'), 0.04, EX[pinH].hand.group], [hh.world('middleTip'), 0.04, P.arms[sd].group]], { name, aim: c, aperture: 0.012, maxCone: 30 });
          };
          SOL.cams.hoffR = hoffCam('R', 'R', 'Hoffmann R');
          applyArm('R', HOME_ARM.R); applyArm('L', SOL.arms.hoffL); applyEx('R', SOL.ex.hoffSupL); applyEx('L', SOL.ex.hoffPinL);
          SOL.cams.hoffL = hoffCam('L', 'L', 'Hoffmann L');
          applyEx('R', HOME_EX.R); applyEx('L', HOME_EX.L);
          for (const sd of ['R', 'L']) applyArm(sd, HOME_ARM[sd]);
        }
        return SOL;
      };
      // ================================================================ SOLVE END

      let SOL;
      if (root.SOLVE_MODE) {
        let prev = null;
        if (root.SOLVE_ONLY) { const r = await fetch('solved.json', { cache: 'no-store' }); prev = dec((await r.json()).data); }
        SOL = solveAll(prev); root.SOLVED_OUT = enc(SOL);
      }
      else {
        let raw = root.SOLVED;
        if (!raw) { const r = await fetch('solved.json', { cache: 'no-store' }).catch(() => null); if (!r || !r.ok) throw new Error('solved.json is missing: run "npm run solve" (it is made once, then loaded)'); raw = await r.json(); }
        if (raw.version !== style.SOLVE_VERSION) throw new Error('solved.json is out of date (version ' + raw.version + ', the style needs ' + style.SOLVE_VERSION + '): run "npm run solve"');
        SOL = dec(raw.data);
      }
      root.W = Object.assign(root.W_TEST || {}, { S, L, bed, table, P, SH, EX, hammer, SOL, applyArm, applyEx, applyStrike, HOME_ARM, HOME_EX, enc, dec });

      // ================================================================ THE TIMELINE
      // Every channel is a list of keys [time, state, 'cut'?]; between two keys the state moves (eased) over the gap,
      // a 'cut' key jumps. Poses read the stop-motion clock (on twos); only the camera reads real time.
      const tq = SET.poseTime;
      const BREATH = 4.6 / (60 / 14);                                     // P.breathe's period is 4.6 s: 14 breaths a minute
      const PK = ['index', 'middle', 'ring', 'little'];
      const blendPose = (a, b, u) => {
        const ca = (p, k) => (p.curl && p.curl[k]) || p.all || [0.12, 0.18, 0.1];
        const curl = {}; for (const k of PK) curl[k] = ca(a, k).map((v, i) => K.lerp(v, ca(b, k)[i], u));
        const ta = a.thumb || [0.15, 0, 0.12, 0.08], tb = b.thumb || [0.15, 0, 0.12, 0.08], F = HANDS.FINGERS;
        const sp0 = a.spread == null ? 1 : a.spread, sp1 = b.spread == null ? 1 : b.spread;
        const fan = (a.fan || b.fan) ? Object.fromEntries(PK.map((k) => [k, K.lerp(a.fan ? a.fan[k] : F[k].spread * sp0 * 2.2, b.fan ? b.fan[k] : F[k].spread * sp1 * 2.2, u)])) : null;
        return { curl, spread: K.lerp(sp0, sp1, u), fan, thumb: ta.map((v, i) => K.lerp(v, tb[i], u)) };
      };
      const thumbQOf = (hand, pose) => { hand.pose(pose); return [hand.thumb.meta.quaternion.clone(), hand.thumb.mcp.quaternion.clone(), hand.thumb.ip.quaternion.clone()]; };
      // ---- the states by name
      const other = (h) => (h === 'R' ? 'L' : 'R');
      const park = (st, far) => Object.assign({}, st, { wrist: V(st.wrist.x, Dm.Ym - 3.0, (far ? -1 : 1) * 7.5), back: V(0, -0.3, far ? -1 : 1).normalize(), far: !!far });
      const exState = (h, name, t) => {
        if (name === 'home') return Object.assign({ hand: h }, HOME_EX[h]);
        if (name === 'homeFar') return mirEx(Object.assign({ hand: other(h) }, HOME_EX[other(h)]));
        if (name === 'park') return park(Object.assign({ hand: h }, HOME_EX[h]), false);
        if (name === 'parkFar') return park(mirEx(Object.assign({ hand: other(h) }, HOME_EX[other(h)])), true);
        if (name.startsWith('S:')) { const [geo, when] = name.slice(2).split('@'); const k = SOL.strikes[geo]; return Object.assign({}, k.ex, { strike: when || geo, geo }); }   // 'S:bicR@reinfR' = the bicR pose, struck at the reinfR time
        if (name.startsWith('rel:')) { const [, nm, obj] = name.split(':'); const o = obj === 'handR' ? P.arms.R.hand.group : P.arms.L.hand.group; return fromRel(SOL.ex[nm], o); }
        const st = SOL.ex[name]; if (!st) throw new Error('no examiner state ' + name); return st;
      };
      const lerpEx = (h, a, b, u) => {
        const o = Object.assign({}, b, { wrist: a.wrist.clone().lerp(b.wrist, u), quat: a.quat.clone().slerp(b.quat, u), pose: blendPose(a.pose, b.pose, u), back: a.back.clone().lerp(b.back, u).normalize() });
        if (a.thumbQ || b.thumbQ) { const hd = EX[h].hand, qa = a.thumbQ || thumbQOf(hd, a.pose), qb = b.thumbQ || thumbQOf(hd, b.pose); o.thumbQ = qa.map((q, i) => q.clone().slerp(qb[i], u)); }
        return o;
      };
      const armState = (side, name) => (name === 'home' ? HOME_ARM[side] : SOL.arms[name]);
      const lerpArm = (a, b, u) => ({ wrist: a.wrist.clone().lerp(b.wrist, u), quat: a.quat.clone().slerp(b.quat, u), pose: blendPose(a.pose, b.pose, u), pole: a.pole.clone().lerp(b.pole, u).normalize() });
      const legState = (name) => (name === 'rest' ? {} : SOL.legs[name]);
      const LEGK = ['hipFlex', 'hipAbd', 'hipRot', 'knee', 'ankle', 'ankleInv', 'bigToe', 'toes', 'fan'];
      const lerpLeg = (a, b, u) => Object.fromEntries(LEGK.map((k) => [k, K.lerp(a[k] || 0, b[k] || 0, u)]));
      // ---- a keyed channel
      const channel = (keys) => (t, get, lerp) => {
        let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
        const [t0, n0] = keys[i];
        if (i === keys.length - 1 || keys[i + 1][2] === 'cut' || n0 === keys[i + 1][1]) return get(n0, t);
        const [t1, n1] = keys[i + 1], u = K.ease.inOut(K.clamp((t - t0) / (t1 - t0)));
        return lerp(get(n0, t), get(n1, t), u);
      };
      // ================================================ KEYS (seconds). R / L = the patient's sides; ex hands by the examiner's hand.
      const S_ = Object.fromEntries(STRIKES.map((k) => [k.id, k.t]));
      const HAMMER = [[1.9, 69.0]];                                        // the hammer in his hand (picked up and put down off camera)
      const CH = Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [k, channel(v)]));
      // ---- cameras: one object per shot (solved), plus the two wide ones
      const CAMS = Object.assign({ home: Object.assign({}, SET.HOME_CNS) }, SOL.cams);
      {   // the leg being turned out (59.0-60.9 s): a wide shot of both legs from his right and above, nothing close to the lens
        const tt = SOL.cams.legs.target, lt = tt.isVector3 ? tt.clone() : V(...tt);
        CAMS.legsWide = { pos: lt.clone().add(V(2, 11, 15)).toArray(), target: lt.toArray(), focus: lt.toArray(), aperture: 0.03, fov: 28 };
      }
      {   // the knee jerks: from his right, footward and above, both knees (built from the two solved tendon points)
        const mid = SOL.strikes.kneeR.target.clone().lerp(SOL.strikes.kneeL.target, 0.5), d = V(0.75, 0.35, 0.55).normalize();
        CAMS.knees = { pos: mid.clone().addScaledVector(d, 9.5).toArray(), target: mid.clone().add(V(0, -0.2, 0)).toArray(), focus: mid.toArray(), aperture: 0.03, fov: 28 };
      }
      const camVec = (c) => [...c.pos, ...c.target, ...(Array.isArray(c.focus) ? c.focus : c.target), c.fov || 28, c.aperture == null ? 0.02 : c.aperture];
      const camAt = (t) => CH.cam(t, (n) => camVec(CAMS[n]), (a, b, u) => a.map((v, i) => K.lerp(v, b[i], u)));
      const shoot = (v) => { K.look(S.camera, v.slice(0, 3), v.slice(3, 6), v[9]); K.focus(S.camera, v.slice(6, 9), v[10]); };
      // ---- the strikes: the hammer hand's swing (radians, + = raised) at time t for a strike state
      const swingAt = (id, t) => {
        const ts = S_[id]; if (ts == null) return SWING.up;
        const d = t - ts;
        if (d < -SWING.fall) return SWING.up;
        if (d < 0) { const u = (d + SWING.fall) / SWING.fall; return SWING.up * (1 - u * u); }       // falls by its own weight, faster and faster
        if (d < SWING.bounce) return SWING.bounceUp * Math.sin(Math.PI * d / SWING.bounce * 0.5);     // bounces straight off
        return K.lerp(SWING.bounceUp, SWING.up, K.ease.inOut(K.clamp((d - SWING.bounce) / 0.5)));
      };
      const bump = (t, ts) => { const d = t - ts - REFLEX.delay; if (d < 0 || d > REFLEX.rise + REFLEX.back) return 0; return d < REFLEX.rise ? K.ease.out(d / REFLEX.rise) : 1 - K.ease.inOut((d - REFLEX.rise) / REFLEX.back); };
      const firmAt = (t, ts) => { const d = t - ts - REFLEX.delay; if (d < 0 || d > REFLEX.firm) return 0; return Math.sin(Math.PI * d / REFLEX.firm); };
      // ---- the reflexes: the elbow bends (or straightens) about its own axis, the knee / ankle move; the muscle firms
      const flexElbow = (side, st, deg) => {
        if (!deg) return st;
        applyArm(side, st); const a = P.arms[side]; a.group.updateMatrixWorld(true);
        const Sh = a.up.getWorldPosition(V(0, 0, 0)), E = a.fore.getWorldPosition(V(0, 0, 0)), u = Sh.clone().sub(E).normalize(), f = st.wrist.clone().sub(E).normalize();
        const ax = V(0, 0, 0).crossVectors(u, f).normalize(), r = new THREE.Quaternion().setFromAxisAngle(ax, -deg * Math.PI / 180);   // + = toward the upper arm (flexion: the elbow angle gets smaller)
        return Object.assign({}, st, { wrist: E.clone().add(st.wrist.clone().sub(E).applyQuaternion(r)), quat: r.clone().multiply(st.quat) });
      };
      const firmed = [];                                                   // [attribute, index, original x, y, z] to undo next frame
      const unfirm = () => { const touched = new Set(); for (const [at, i, x, y, z] of firmed) { at.setXYZ(i, x, y, z); touched.add(at); } firmed.length = 0; for (const at of touched) at.needsUpdate = true; };
      const firm = (mesh, center, dir, radius, amp) => {
        if (amp <= 0) return;
        const pa = mesh.geometry.attributes.position, na = mesh.geometry.attributes.normal, inv = mesh.matrixWorld.clone().invert(), c = center.clone().applyMatrix4(inv), dl = dir.clone().transformDirection(inv), p = V(0, 0, 0), n = V(0, 0, 0);
        for (let i = 0; i < pa.count; i++) {
          p.fromBufferAttribute(pa, i); const d = p.distanceTo(c); if (d > radius) continue;
          n.fromBufferAttribute(na, i); const w = Math.max(0, n.dot(dl)); if (w <= 0) continue;
          const k = amp * w * Math.pow(Math.cos(Math.PI / 2 * d / radius), 2);
          firmed.push([pa, i, p.x, p.y, p.z]); pa.setXYZ(i, p.x + n.x * k, p.y + n.y * k, p.z + n.z * k);
        }
        pa.needsUpdate = true; mesh.geometry.computeVertexNormals();
      };
      const reflexFor = (t) => STRIKES.filter((k) => t > k.t + REFLEX.delay - 0.01 && t < k.t + 0.6);
      // ---- the knee clonus push (the kneecap and the hand move 8 mm toward the foot) and the Hoffmann flick
      const pushKneeAt = (t, t0, t1) => K.seg(t, t0, t0 + 0.1, K.ease.out) * (1 - K.seg(t, t1, t1 + 0.35, K.ease.inOut));
      const KNEE_PUSH = { R: [79.0, 81.0], L: [82.3, 84.3] }, FLICK = { R: snap(87.6), L: snap(90.8) };
      const flickAt = (t, tf) => { const d = t - tf; return d < 0 || d > 0.4 ? 0 : d < 0.07 ? d / 0.07 : 1 - K.ease.inOut((d - 0.07) / 0.33); };
      const homeLock = (t) => t <= HOME_HOLD + 1e-6 || t >= D - 1.0 - 1e-6;

      const update = (t) => {
        if (root.LAB_UPDATE) return root.LAB_UPDATE(t);
        unfirm();
        const p = tq(t), still = homeLock(t);
        // legs
        const legs = { R: CH.legR(p, legState, lerpLeg), L: CH.legL(p, legState, lerpLeg) };
        for (const k of reflexFor(p)) if (REFLEX[k.reflex].joint === 'knee') legs[k.side] = Object.assign({}, legs[k.side], { knee: (legs[k.side].knee || 0) + REFLEX.knee.deg * bump(p, k.t) });
        for (const k of reflexFor(p)) if (REFLEX[k.reflex].joint === 'ankle') legs[k.side] = Object.assign({}, legs[k.side], { ankle: (legs[k.side].ankle || 0) + REFLEX.ankle.deg * bump(p, k.t) });
        P.setLeg('R', legs.R); P.setLeg('L', legs.L);
        // arms (and the elbow reflexes)
        const arms = { R: CH.armR(p, (n) => armState('R', n), lerpArm), L: CH.armL(p, (n) => armState('L', n), lerpArm) };
        for (const k of reflexFor(p)) if (REFLEX[k.reflex].joint === 'elbow') arms[k.side] = flexElbow(k.side, arms[k.side], REFLEX[k.reflex].deg * bump(p, k.t));
        applyArm('R', arms.R); applyArm('L', arms.L);
        // Hoffmann: the flick bends the tip of his middle finger down a little and it springs back; his thumb stays still
        for (const sd of ['R', 'L']) { const f = flickAt(p, FLICK[sd]); if (f > 0) { const dip = P.arms[sd].hand.fingers.middle.dip; dip.rotation.z -= 0.22 * f; dip.updateMatrixWorld(true); } }
        // face and breathing
        const clench = K.seg(p, 35.5, 35.9, K.ease.out) * (1 - K.seg(p, 38.6, 39.0, K.ease.inOut));
        P.setFace(Object.assign({ pupilR: 3.5, pupilL: 3.5 }, clench > 0 ? { clench } : {}));
        P.breathe(still ? 0 : p * BREATH);
        // the examiner's hands and the hammer
        for (const h of ['R', 'L']) {
          let st = CH['ex' + h](p, (n) => exState(h, n, p), (a, b, u) => lerpEx(h, a, b, u));
          if (st.strike) { const a = swingAt(st.strike, p); if (a) { const axis = V(0, 0, 1).applyQuaternion(st.quat).normalize(); st = Object.assign({}, st, { quat: new THREE.Quaternion().setFromAxisAngle(axis, a).multiply(st.quat) }); } }
          // knee clonus: the hand moves 8 mm toward his foot with the kneecap
          if (/kneeClonus/.test(KEYS['ex' + h].find((k, i, arr) => k[0] <= p && (!arr[i + 1] || arr[i + 1][0] > p))[1])) {
            const sd = st.far ? 'L' : 'R', u = pushKneeAt(p, KNEE_PUSH[sd][0], KNEE_PUSH[sd][1]);
            if (u > 0) { const ax = P.legPoint(sd, 'knee').sub(P.legPoint(sd, 'hip')).normalize(); st = Object.assign({}, st, { wrist: st.wrist.clone().addScaledVector(ax, 0.08 * u) }); }
          }
          // Hoffmann: the examiner's thumb flicks down over the nail
          if (/hoffPin/.test(KEYS['ex' + h].find((k, i, arr) => k[0] <= p && (!arr[i + 1] || arr[i + 1][0] > p))[1])) {
            const f = flickAt(p, FLICK[st.far ? 'L' : 'R']);
            if (f > 0 && st.thumbQ) st = Object.assign({}, st, { thumbQ: [st.thumbQ[0], st.thumbQ[1].clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -0.35 * f)), st.thumbQ[2].clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -0.45 * f))] });
          }
          applyEx(h, st);
          if (st.strike) {                                                  // the hammer, rigid in this hand
            const k = SOL.strikes[st.geo || st.strike], hg = EX[h].hand.group, qa = st.quat.clone().multiply(k.ex.quat.clone().invert());
            hammer.group.visible = true; hammer.group.position.copy(st.wrist).add(k.hammerPos.clone().sub(k.ex.wrist).applyQuaternion(qa)); hammer.group.quaternion.copy(qa.clone().multiply(k.hammerQuat)); hammer.setSwing(0);
          }
        }
        const holding = HAMMER.some(([a, b]) => p >= a && p < b);
        if (!holding || (!CH.exR(p, (n) => ({ strike: n.startsWith('S:') }), (a, b) => b).strike && !CH.exL(p, (n) => ({ strike: n.startsWith('S:') }), (a, b) => b).strike)) {
          hammer.group.visible = holding;
          if (holding) {                                                   // in the right hand on the way (parked / travelling): rigid as at the first strike
            const k = SOL.strikes.bicR, st = { wrist: EX.R.hand.group.position.clone(), quat: EX.R.hand.group.quaternion.clone() }, qa = st.quat.clone().multiply(k.ex.quat.clone().invert());
            hammer.group.position.copy(st.wrist).add(k.hammerPos.clone().sub(k.ex.wrist).applyQuaternion(qa)); hammer.group.quaternion.copy(qa.clone().multiply(k.hammerQuat)); hammer.setSwing(0);
          }
        }
        hammer.group.updateMatrixWorld(true);
        // the muscle firms briefly after each strike (a subtle, blended swelling of the belly; undone next frame)
        for (const k of reflexFor(p)) {
          const a = firmAt(p, k.t); if (a <= 0) continue;
          const pts = NEURO.points(P), sd = k.side, m = REFLEX[k.reflex].muscle;
          if (m === 'quadriceps') firm(P.legMeshes[sd], pts['quadriceps_' + sd], pts.normals['quadriceps_' + sd], 1.2, 0.035 * a);
          else if (m === 'calf') firm(P.legMeshes[sd], pts['calf_' + sd], pts.normals['calf_' + sd], 0.9, 0.03 * a);
          else if (m === 'brachioradialis') firm(P.arms[sd].armMesh, pts['brachioradialisTendon_' + sd].clone().lerp(P.arms[sd].fore.getWorldPosition(V(0, 0, 0)), 0.6), pts.normals['brachioradialisTendon_' + sd], 0.8, 0.025 * a);
          else if (m === 'biceps') { const b = SOL.lm['bicepsTendon_' + sd]; firm(P.arms[sd].armMesh, b.point.clone().lerp(P.arms[sd].up.getWorldPosition(V(0, 0, 0)), 0.4), b.normal, 0.9, 0.03 * a); }
          else if (m === 'triceps') { const b = SOL.lm['tricepsTendon_' + sd]; firm(P.arms[sd].armMesh, b.point.clone().lerp(P.arms[sd].up.getWorldPosition(V(0, 0, 0)), 0.4), b.normal, 0.9, 0.03 * a); }
        }
        // knee clonus: the kneecap (the skin over it) moves 8 mm toward the foot
        for (const sd of ['R', 'L']) {
          const u = pushKneeAt(p, KNEE_PUSH[sd][0], KNEE_PUSH[sd][1]); if (u <= 0) continue;
          const c = P.legPoint(sd, 'patella'), ax = P.legPoint(sd, 'knee').sub(P.legPoint(sd, 'hip')).normalize(), mesh = P.legMeshes[sd], pa = mesh.geometry.attributes.position, inv = mesh.matrixWorld.clone().invert(), cl = c.applyMatrix4(inv), al = ax.transformDirection(inv), q = V(0, 0, 0);
          for (let i = 0; i < pa.count; i++) { q.fromBufferAttribute(pa, i); const d = q.distanceTo(cl); if (d > 0.45) continue; const k = 0.08 * u * Math.pow(Math.cos(Math.PI / 2 * d / 0.45), 2); firmed.push([pa, i, q.x, q.y, q.z]); pa.setXYZ(i, q.x + al.x * k, q.y + al.y * k, q.z + al.z * k); }
          pa.needsUpdate = true; mesh.geometry.computeVertexNormals();
        }
        // camera (real time) and lights
        shoot(root.CAM_OVERRIDE ? camVec(root.CAM_OVERRIDE) : camAt(t));
        L.set(still ? 0 : p, {});
        if (still) L.lamp.intensity = SET.LAMP.power;                      // no flicker on the home shot (it must match the other parts)
        S.R.grain = still ? 0 : SET.RENDER.grain;                         // the grain is seeded by the frame number: off on the still home frames so the first and last frames are identical
      };
      root.CNS7_TIMELINE = { KEYS, CAMS, STRIKES, camAt, swingAt };
      // the CNS home shot exactly as shared/README.md builds it (for home-check.json)
      root.HOME_REFERENCE = () => {
        HOME.apply(P, EX, SH, 'cns'); P.setFace({ pupilR: 3.5, pupilL: 3.5 }); P.breathe(0); hammer.group.visible = false;
        SET.shoot(S, SET.HOME_CNS); L.set(0, {}); L.lamp.intensity = SET.LAMP.power; S.R.grain = 0;
      };
      const overlay = (ctx, t, W, H) => {
        const on = root.CAPTIONS != null ? !!root.CAPTIONS : style.captions; if (on) CAPTION.at(ctx, t, CAPTIONS, W, H);
        if (root.REVIEW_MARKS) drawMarks(ctx, W, H, root.REVIEW_MARKS);           // review panels only (never in the video)
      };
      // ---------------------------------------------------------------- REVIEW (storyboard panels a-g; tools only)
      const proj = (p, W, H) => { const v = (p.isVector3 ? p.clone() : V(...p)).project(S.camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; };
      const drawMarks = (ctx, W, H, marks) => {
        ctx.save(); ctx.lineWidth = Math.max(2, W / 480); ctx.font = `600 ${Math.round(W / 48)}px "Fredoka", sans-serif`; ctx.textBaseline = 'middle';
        for (const m of marks) {
          const a = proj(m.at, W, H); if (a[2] > 1) continue;
          const col = m.color || (m.v == null ? '#ffe14d' : m.v < 0 ? '#ff3b30' : m.v < 1.5 ? '#5ef08a' : m.v < 3 ? '#ffb340' : '#c9d3d6');
          if (m.to) { const b = proj(m.to, W, H); ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.beginPath(); ctx.arc(b[0], b[1], ctx.lineWidth * 1.6, 0, 7); ctx.fillStyle = col; ctx.fill(); }
          ctx.beginPath(); ctx.arc(a[0], a[1], ctx.lineWidth * 1.4, 0, 7); ctx.fillStyle = col; ctx.fill();
          if (m.label) { const off = m.off || [12, -18], x = a[0] + off[0] * W / 960, y = a[1] + off[1] * W / 960; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(m.label, x, y); ctx.fillStyle = col; ctx.fillText(m.label, x, y); ctx.lineWidth = Math.max(2, W / 480); ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(x, y); ctx.stroke(); }
        }
        ctx.restore();
      };
      const FIELDS = {
        armR: () => CONTACT.field(armMeshes('R')), armL: () => CONTACT.field(armMeshes('L')),
        legR: () => CONTACT.field([P.legMeshes.R]), legL: () => CONTACT.field([P.legMeshes.L]), legs: () => CONTACT.field([P.legMeshes.R, P.legMeshes.L]),
        handR: () => CONTACT.field(handMeshes(P.arms.R.hand)), handL: () => CONTACT.field(handMeshes(P.arms.L.hand)),
        midR: () => CONTACT.field(P.arms.R.hand.fingers.middle.dip.children.filter((m) => m.isMesh)), midL: () => CONTACT.field(P.arms.L.hand.fingers.middle.dip.children.filter((m) => m.isMesh)),
        patient: () => { const ms = []; P.group.traverse((m) => { if (m.isMesh && m.visible && m.geometry && m.geometry.attributes.position.count > 200) ms.push(m); }); return CONTACT.field(ms); },
        thumbNailR: () => CONTACT.field(EX.R.hand.thumb.ip.children.filter((m) => m.isMesh)), thumbNailL: () => CONTACT.field(EX.L.hand.thumb.ip.children.filter((m) => m.isMesh)),
      };
      const partMeshes = (h, part) => {
        if (part === 'hammer') return hammer.head.children.filter((m) => m.isMesh);
        if (part === 'fore') return EX[h].fore.children.filter((m) => m.isMesh);
        if (part === 'legR' || part === 'legL') return [P.legMeshes[part.slice(3)]];
        if (part.startsWith('p:')) { const [, sd, k] = part.split(':'); return CONTACT.handParts(P.arms[sd].hand)[k]; }   // his own hand's parts
        if (part === 'phandR' || part === 'phandL') return handMeshes(P.arms[part.slice(5)].hand);
        const parts = CONTACT.handParts(EX[h].hand); if (parts[part]) return parts[part];
        throw new Error('no part ' + part);
      };
      root.REVIEW_SHOT = (r, n) => {
        root.CAPTIONS = false; root.REVIEW_MARKS = null; root.CAM_OVERRIDE = null;
        update(r.t);
        const gaps = {}, marks = [], values = {};
        const fcache = {};
        for (const c of r.contacts || []) {
          const fld = fcache[c.field] || (fcache[c.field] = FIELDS[c.field]());
          const near = c.near ? (c.near.startsWith('leg:') ? P.legPoint(c.near.split(':')[1], c.near.split(':')[2]) : null) : null;
          const g = CONTACT.minGap(partMeshes(c.hand, c.part), fld, near, c.r || 0, 0.15), v = +(g.gap * 100).toFixed(2);
          gaps[c.label || c.part] = isFinite(v) ? v : null;
          if (g.at) marks.push({ at: g.at, to: g.q, label: (c.label || c.part) + ' ' + (isFinite(v) ? v.toFixed(2) : '>15') + ' mm', v: isFinite(v) ? v : 99, off: c.off });
        }
        for (const hb of r.heels || []) {   // his heel on the mattress (the lowest point of the heel above the mattress)
          const m = P.legMeshes[hb], pa = m.geometry.attributes.position, w = V(0, 0, 0), hp = P.legPoint(hb, 'heel'); let best = Infinity, at = null; m.updateMatrixWorld(true);
          for (let i = 0; i < pa.count; i++) { w.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); if (w.distanceTo(hp) > 0.6) continue; const d = w.y - hs(w.x, w.z); if (d < best) { best = d; at = w.clone(); } }
          const v = +(best * 100).toFixed(2); gaps['heel ' + hb + ' on the mattress'] = v;
          if (at) marks.push({ at, to: V(at.x, hs(at.x, at.z), at.z), label: 'heel ' + hb + ' ' + v.toFixed(2) + ' mm', v });
        }
        if (r.landmark) {   // where the hammer's contact point is, against the kit landmark, measured now
          const hp = hammer.strikeWorld(), lm = NEURO.points(P)[r.landmark], d = +(hp.distanceTo(lm) * 10).toFixed(2);
          values['hammer contact to ' + r.landmark + ' (cm)'] = d;
          if (r.landmark.startsWith('brachioradialis')) values[r.landmark + ' to the wrist joint (cm)'] = +(lm.distanceTo(P.arms[r.landmark.slice(-1)].hand.group.getWorldPosition(V(0, 0, 0))) * 10).toFixed(2);
          marks.push({ at: lm, label: r.landmark, color: '#7cf0ff', off: [16, 30] });
        }
        for (const a of r.angles || []) {
          if (a.joint === 'elbow') { const m = P.arms[a.side]; m.group.updateMatrixWorld(true); const Sh = m.up.getWorldPosition(V(0, 0, 0)), E = m.fore.getWorldPosition(V(0, 0, 0)), Wr = m.hand.group.getWorldPosition(V(0, 0, 0)); values[a.label] = +(Sh.sub(E).angleTo(Wr.sub(E)) * 180 / Math.PI).toFixed(1); }
          else values[a.label] = +(+P.leg(a.side)[a.joint]).toFixed(1);
        }
        for (const l of r.labels || []) marks.push({ at: V(...l.at), label: l.text, color: l.color || '#ffffff', off: l.off || [10, 0] });
        for (const pt of r.points || []) { const w = pt.hand ? EX[pt.hand].hand.world(pt.name) : pt.patient ? P.arms[pt.patient].hand.world(pt.name) : null; if (w) { marks.push({ at: w, label: pt.label, color: pt.color || '#7cf0ff', off: pt.off }); values[pt.label] = w.toArray().map((x) => +x.toFixed(3)); } }
        if (r.cam) root.CAM_OVERRIDE = r.cam;
        else if (r.close) {   // closer along the shot's own view: the contact seen from the same side as in the film
          const c0 = camAt(r.t), at = marks.length ? marks[0].at : V(...c0.slice(3, 6)), dir = V(...c0.slice(0, 3)).sub(at).normalize();
          root.CAM_OVERRIDE = { pos: at.clone().addScaledVector(dir, r.close).toArray(), target: at.toArray(), focus: at.toArray(), aperture: 0, fov: 28 };
        }
        root.REVIEW_MARKS = marks;
        S.seek(r.t, n);
        root.REVIEW_MARKS = null; root.CAM_OVERRIDE = null; root.CAPTIONS = true;
        return { gaps, values };
      };
      return { update, overlay };
    },

    // ================================================================ sound: real events only, from the same schedule
    sound(k) {
      // the quiet room under everything: fades in over the first 0.5 s and out over the last 0.5 s (no clicks at the joins)
      k.noise(0, { dur: D, color: 'brown', filter: 'lowpass', f: 300, gain: 0.11, a: 0.5, hold: D - 1.0, bus: 'amb' });
      k.noise(0, { dur: D, color: 'pink', filter: 'highpass', f: 4500, gain: 0.012, a: 0.5, hold: D - 1.0, bus: 'amb' });
      // the tendon hammer: a soft rubber tap, a short dull thud, the same on both sides, at the frame the head lands
      for (const s of STRIKES) {
        k.tone(s.t, { f: [[0, 210], [0.045, 95]], dur: 0.085, gain: 0.34, a: 0.002 });
        k.noise(s.t, { dur: 0.03, color: 'brown', filter: 'lowpass', f: 1300, gain: 0.16, a: 0.001 });
        k.noise(s.t, { dur: 0.018, color: 'pink', filter: 'bandpass', f: 700, q: 1.2, gain: 0.05, a: 0.001 });
      }
      // a very soft rustle of the sheet when one of his limbs starts to move
      for (const ch of ['armR', 'armL', 'legR', 'legL']) {
        const ks = KEYS[ch];
        for (let i = 0; i < ks.length - 1; i++) {
          const [t0, a] = ks[i], [t1, b, cut] = ks[i + 1];
          if (cut || a === b || t1 - t0 < 0.1) continue;
          const d = Math.min(0.9, t1 - t0);
          k.noise(t0 + 0.05, { dur: d, color: 'pink', filter: 'bandpass', f: [[0, 900], [d, 1600]], q: 0.7, gain: 0.035, a: d * 0.4, hold: d * 0.2 });
        }
      }
    },
  };
  root.CNS7 = style;
})(typeof window !== 'undefined' ? window : globalThis);
