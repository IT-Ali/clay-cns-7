// shared/patient-neuro.js (v5): THE NEURO MODE of the recurring patient, for the neurological (CNS) examination.
// Classic script; needs THREE, K, CLAY, HANDS, BED and shared/patient.js (load right after patient.js). Defines
// PATIENT.neuro, which PATIENT.build calls when it is given { neuro: true }. Without that option nothing here runs and
// the patient is exactly the v4b patient (same code path, same seeds, same pixels).
//
//   const P = PATIENT.build(S, { neuro: true })                     (works with pose 'reclined45' and pose 'flat')
//
// LEGS (both sides, angles in degrees, every key optional; {} = today's straight leg exactly at rest):
//   P.setLeg(side, { hipFlex, hipAbd, hipRot, knee, ankle, ankleInv, bigToe, toes, fan })
//      hipFlex 0..110 (thigh up off the bed), hipAbd 0..40 (out to his side), hipRot -40..40 (+ = external, knee and foot
//      turn out), knee 0..130 (flexion), ankle -40..20 (+ = dorsiflexion, - = plantar flexion, 0 = the resting foot),
//      ankleInv -20..20 (+ = inversion, sole turns in), bigToe -40..40 (+ = extension / up, - = flexion), toes 0..40
//      (the other toes curl), fan 0..1 (the other toes spread apart). Returns the full state.
//   P.leg(side)                      the current state
//   P.legPoint(side, name)           world point on the posed leg: 'hip', 'knee', 'ankle' (joint centres), 'heel'
//                                    (bottom of the heel), 'heelBack', 'patella', 'tibialTuberosity', 'shinMid',
//                                    'lateralMalleolus', 'medialMalleolus', 'achilles', 'sole', 'ball', 'toeTip', 'calf'
//   P.legFit(side, targets, opts)    solves the angles so leg points reach world targets: targets = [{ point, at, w }],
//                                    opts { free: ['hipFlex', 'knee', ...], start: {...}, iters } -> the state (applied)
//   P.legSDF(side, worldPoint)       approximate signed distance to the whole posed leg (thigh, knee, lower leg, foot)
//   P.setTrouserRoll(u)              0 = the trousers as now, 1 = rolled up to about 5 cm above both knees with a neat cuff
//   P.setOedema(u)                   1 = as now (mildly puffy ankles, default), 0 = normal ankles: crisp malleoli and
//                                    Achilles tendons
//   P.setRoll(u), P.setPit(side, d)  as before, on the new legs
// HEAD, NECK AND SHOULDERS:
//   P.setHead({ turn, flex, tilt })  degrees. turn + = face turns to his RIGHT (toward the examiner), about +-60;
//                                    flex + = chin toward the chest (about 0..50), - = extension; tilt + = right ear
//                                    toward the right shoulder. The slim neck follows (never widened); the
//                                    sternocleidomastoid stands out on the side opposite the turn.
//   P.setShrug(u)                    0..1: both shoulders up by 3 cm (the trapezius rises); call before P.setArm
//   P.setRecline(deg)                runtime: his trunk follows the backrest (45 -> 0 and back), pivoting at the hips
//                                    (reclined45 build only; use with bed.setBackrest(deg))
// FACE: P.setFace({...}) keeps every v4 key (jaw, tongue, gazeUp, pullR, blink) and adds (all default 0 / as now):
//   gazeX (deg, + = to his right, about +-35), gazeY (deg, + = up, about +-25), converge (deg, each eye turns in),
//   pupilR / pupilL (mm across; default 4.8 = as now; 2 = constricted, 3.5 = normal, 6 = dilated), closed (0..1, eyes
//   gently closed), squeeze (0..1, eyes screwed tightly shut), brows (0..1, eyebrows raised, forehead wrinkles),
//   smile (0..1, showing the upper teeth), puff (0..1, cheeks blown out), ah (0..1, mouth wide open saying "Ah": the
//   soft palate and the uvula rise; the tongue lies on the floor of the mouth), cheekR / cheekL (0..1, the tongue pushed
//   into that cheek), tongueX (-1..1 with tongue out: to his right +), clench (0..1, masseter and temporalis bulge),
//   swallow (0..1: the larynx rises and falls back over one swallow), cough (0..1: a small jolt), round / wide (0..1,
//   lip shapes for silent speech), viseme ('rest' | 'A' | 'E' | 'O' | 'U' | 'M' | 'F'). jaw may now go up to 3.
(function (root) {
  const THREE = root.THREE, K = root.K, CLAY = root.CLAY, BED = root.BED;
  const PATIENT = root.PATIENT;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rad = Math.PI / 180;
  const gauss = (x, s) => Math.exp(-(x * x) / (2 * s * s));
  const angD = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  const band = (x, a, b, e) => K.smooth(a - e, a + e, x) * (1 - K.smooth(b - e, b + e, x));
  const IDQ = new THREE.Quaternion();
  const qPow = (q, w, out) => (w <= 0 ? out.identity() : w >= 1 ? out.copy(q) : out.copy(IDQ).slerp(q, w));

  PATIENT.NEURO = {
    LEG_DEFAULT: { hipFlex: 0, hipAbd: 0, hipRot: 0, knee: 0, ankle: 0, ankleInv: 0, bigToe: 0, toes: 0, fan: 0 },
    LEG_RANGE: { hipFlex: [-5, 120], hipAbd: [-30, 45], hipRot: [-45, 45], knee: [0, 135], ankle: [-45, 25], ankleInv: [-25, 25], bigToe: [-45, 45], toes: [0, 45], fan: [0, 1] },
    ROLL_TO: 1.72,            // setTrouserRoll(1): the hem 5 cm above the top of the patella (leg coordinate se)
  };

  PATIENT.neuro = (X) => {
    const { P, D, M, C, flat } = X;
    const N = { X };
    P.neuro = true;
    const mat = (a, b, o) => CLAY.mat(a, b, Object.assign({ fixedSeed: 9000 + (N.seed = (N.seed || 0) + 1) }, o));
    // the same even skin as the patient's, textured by the rest shape of the deformed meshes
    M.skinRest = CLAY.restVariant(mat(C.skin[0], C.skin[0], { prints: 0, rough: 0.58, streak: 0.0, freq: 1.4, bump: 0.55, lump: 0 }));
    buildLegs(N);
    buildHead(N);
    buildFace(N);
    buildRecline(N);
    buildShoulders(N);
    return P;
  };

  // ================================================================================================ LEGS
  // One continuous surface from the hip through the knee and the ankle into the foot, swept along a leg coordinate se
  // (se = x on the straight part: hip root -1.75 (flat: -1.0), knee 2.45, ankle 6.4, then on along the curve of the foot).
  // The rest shape is the v4 straight leg (the same centre line, foot standing up, turned out 7 degrees). The pose is
  // forward kinematics with smooth joints: each vertex is turned about the ankle, knee and hip centres by its share of
  // each joint's rotation (blended over a few cm), so the knee and ankle bend with no ring and no seam.
  function buildLegs(N) {
    const { P, D, M, C, flat, legR, legL, lr, ll, trousers, pressInfo } = N.X;
    const S0 = flat ? D.thighFrom : -1.75, SA = 6.4, BEND = 1.28, LB = 1.4, FOOT = 0.84, EXT = 0.12;
    const ca = Math.cos(EXT), sa = Math.sin(EXT);
    const T0 = V(1, 0, 0), N0 = V(0, ca, sa), B0 = V(0, -sa, ca);
    const lin = (s, pts) => { if (s <= pts[0][0]) return pts[0].slice(1); for (let i = 1; i < pts.length; i++) if (s <= pts[i][0]) { const u = (s - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]); return [K.lerp(pts[i - 1][1], pts[i][1], u), K.lerp(pts[i - 1][2], pts[i][2], u)]; } return pts[pts.length - 1].slice(1); };
    const CL = [[-1.75, 6.86, 0.85], [0, 6.8, 0.9], [1.5, 6.7, 0.96], [2.45, 6.617, 1.0017], [6.72, 6.43, 1.15]];
    const centre = (s) => { const [v, u] = lin(s, CL); return V(s, v, u); };
    // sections: a lateral, b medial, c front, d back
    const LEG = [
      { s: -2.0, a: 0.9, b: 0.88, c: 0.86, d: 0.86 }, { s: -1.0, a: 0.89, b: 0.87, c: 0.85, d: 0.86 }, { s: 0.0, a: 0.84, b: 0.82, c: 0.79, d: 0.82 },
      { s: 0.9, a: 0.75, b: 0.74, c: 0.7, d: 0.72 }, { s: 1.7, a: 0.63, b: 0.65, c: 0.58, d: 0.58 }, { s: 2.2, a: 0.54, b: 0.57, c: 0.5, d: 0.5 },
      { s: 2.55, a: 0.52, b: 0.55, c: 0.47, d: 0.47 }, { s: 2.95, a: 0.5, b: 0.52, c: 0.43, d: 0.53 }, { s: 3.4, a: 0.53, b: 0.54, c: 0.43, d: 0.6 },
      { s: 4.3, a: 0.5, b: 0.5, c: 0.4, d: 0.56 }, { s: 5.3, a: 0.4, b: 0.4, c: 0.34, d: 0.41 }, { s: 5.9, a: 0.36, b: 0.36, c: 0.31, d: 0.33 },
      { s: 6.62, a: 0.36, b: 0.36, c: 0.31, d: 0.33 }];
    const KMAX = 2 * BEND / LB;
    const thAt = (t) => (t >= LB ? BEND : KMAX * (t / 2 - LB / (4 * Math.PI) * Math.sin(2 * Math.PI * t / LB)));
    const FOOTS = [{ t: 0, a: 0.36, b: 0.36, c: 0.31, d: 0.33 }, { t: 0.45, a: 0.36, b: 0.38, c: 0.32, d: 0.36 }, { t: 0.8, a: 0.37, b: 0.41, c: 0.33, d: 0.33 },
      { t: LB, a: 0.41, b: 0.45, c: 0.29, d: 0.23 }, { t: LB + 0.4, a: 0.45, b: 0.48, c: 0.22, d: 0.17 }, { t: LB + FOOT, a: 0.44, b: 0.46, c: 0.16, d: 0.14 }];
    const HEEL = (se) => 0.102 * gauss(se - (SA + 0.62), 0.28);
    const SOLE = (se) => K.smooth(SA + 0.8, SA + LB + 0.3, se);
    const cr = (Sx, key, x) => {
      let i = 0; while (i < Sx.length - 2 && Sx[i + 1][key] < x) i++;
      const p0 = Sx[Math.max(0, i - 1)], p1 = Sx[i], p2 = Sx[i + 1], p3 = Sx[Math.min(Sx.length - 1, i + 2)], t = K.clamp((x - p1[key]) / (p2[key] - p1[key])), t2 = t * t, t3 = t2 * t;
      const o = {}; for (const k of ['a', 'b', 'c', 'd']) { const m1 = (p2[k] - p0[k]) * 0.5, m2 = (p3[k] - p1[k]) * 0.5; o[k] = (2 * t3 - 3 * t2 + 1) * p1[k] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[k] + (t3 - t2) * m2; }
      return o;
    };
    const A0 = centre(SA);
    const PATH = (() => {
      const n = 600, L = LB + FOOT, out = [], c = A0.clone();
      for (let i = 0; i <= n; i++) {
        const t = L * i / n, q = new THREE.Quaternion().setFromAxisAngle(B0, thAt(t));
        if (i > 0) { const tm = L * (i - 0.5) / n; c.addScaledVector(T0.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(B0, thAt(tm))), L / n); }
        out.push({ t, c: c.clone(), T: T0.clone().applyQuaternion(q), N: N0.clone().applyQuaternion(q) });
      }
      return { at: (t) => out[Math.round(K.clamp(t / L) * n)], L };
    })();
    const FR = Math.PI / 2, BK = -Math.PI / 2, MED = Math.PI, LAT = 0;
    const MM = { s: 6.47, ang: Math.PI - 0.45 }, LMx = { s: 6.6, ang: -0.3 };
    // the anatomy, as height over the base sections (world units) at leg coordinate se and angle ang round the leg
    const bumps = (se, ang, oed) => {
      const fr = angD(ang, FR), bk = angD(ang, BK);
      let h = 0;
      // thigh: quadriceps (rectus down the front, vastus lateralis, the vastus medialis teardrop above the knee), the
      // quadriceps tendon just above the patella; hamstrings: two cords behind toward the knee, the popliteal hollow
      h += 0.02 * band(se, -0.6, 1.7, 0.5) * gauss(fr, 0.45);
      h += 0.022 * band(se, -0.4, 1.9, 0.5) * gauss(angD(ang, 0.55), 0.5);
      h += 0.05 * gauss(se - 1.88, 0.2) * gauss(angD(ang, FR + 0.95), 0.35);
      h -= 0.012 * gauss(se - 2.1, 0.07) * gauss(fr, 0.22);
      h += 0.03 * band(se, 0.4, 2.35, 0.3) * (gauss(angD(ang, BK - 0.62), 0.22) + gauss(angD(ang, BK + 0.62), 0.22));
      h -= 0.045 * gauss(se - 2.6, 0.16) * gauss(bk, 0.32);
      // the knee: patella (a rounded plate), the patellar tendon below it with a soft hollow either side, the tibial
      // tuberosity, the femoral condyles at the sides
      { const r = Math.hypot((se - 2.4) / 0.2, fr / 0.62); h += 0.075 * Math.exp(-Math.pow(r, 4)); }
      { const t = band(se, 2.6, 2.98, 0.06); h += 0.026 * t * gauss(fr, 0.14) - 0.022 * t * gauss(Math.abs(fr) - 0.45, 0.13); }
      h += 0.032 * gauss(se - 3.03, 0.08) * gauss(fr, 0.22);
      h += 0.02 * gauss(se - 2.4, 0.18) * (gauss(angD(ang, LAT), 0.45) + gauss(angD(ang, MED), 0.45));
      // the shin bone (subcutaneous crest), the calf (gastrocnemius heads: medial larger and lower), tibialis anterior
      h += 0.022 * K.smooth(2.9, 3.4, se) * (1 - K.smooth(5.2, 5.9, se)) * gauss(angD(ang, FR + 0.15), 0.22);
      h += 0.04 * gauss(se - 3.55, 0.33) * gauss(angD(ang, BK - 0.45), 0.4) + 0.03 * gauss(se - 3.4, 0.28) * gauss(angD(ang, BK + 0.45), 0.4);
      h += 0.018 * band(se, 3.1, 4.9, 0.4) * gauss(angD(ang, FR - 0.55), 0.3);
      // the Achilles tendon (a cord behind the ankle) with a hollow either side, crisper without oedema
      { const t = band(se, 5.55, 6.6, 0.15); h += 0.016 * t * gauss(bk, 0.17) - (0.04 - 0.03 * oed) * band(se, 5.75, 6.55, 0.12) * gauss(Math.abs(bk) - 0.62, 0.2); }
      // malleoli: medial (inner, higher) and lateral (outer, lower); crisper without oedema
      const ms = 0.14 - 0.03 * (1 - oed);
      h += (0.085 + 0.01 * (1 - oed)) * gauss(se - MM.s, ms) * gauss(angD(ang, MM.ang), 0.6 - 0.12 * (1 - oed));
      h += (0.06 + 0.012 * (1 - oed)) * gauss(se - LMx.s, ms - 0.01) * gauss(angD(ang, LMx.ang), 0.55 - 0.1 * (1 - oed));
      // oedema: the v4 gentle fullness of both ankles (oed = 1), gone at oed = 0
      h += 0.03 * oed * K.smooth(5.3, 6.25, se) * (1 - K.smooth(6.9, 7.5, se));
      return h;
    };
    const ringUV = (sec, se, ang, oed) => {
      const heel = HEEL(se), fl = SOLE(se), cu = Math.cos(ang), su = Math.sin(ang);
      const pw = su < 0 ? 2 + 1.2 * fl : 2, sf = (x) => Math.sign(x) * Math.pow(Math.abs(x), 2 / pw);
      const U = (cu >= 0 ? sec.a : sec.b) * (su < 0 ? sf(cu) : cu), Vv = (su >= 0 ? sec.c : sec.d + heel) * (su < 0 ? sf(su) : su);
      const r = Math.hypot(U, Vv) || 1e-6, k = 1 + bumps(se, ang, oed) / r;
      return [U * k, Vv * k];
    };
    // the ring list (topology fixed; positions depend on the oedema)
    const RAD = 96, rings = [];
    const NS = Math.round((SA - S0) * 42);
    rings.push({ kind: 'capS' });
    for (let i = 0; i < NS; i++) rings.push({ kind: 's', se: K.lerp(S0, SA, i / NS) });
    const NF = 110;
    for (let i = 0; i <= NF; i++) rings.push({ kind: 'f', t: PATH.L * i / NF });
    for (let k = 1; k <= 6; k++) rings.push({ kind: 'capE', k });
    const NR = rings.length, NV = NR * RAD;
    const SE = new Float32Array(NV), ANG = new Float32Array(NV);
    rings.forEach((r, i) => { const se = r.kind === 's' ? r.se : r.kind === 'f' ? SA + r.t : r.kind === 'capS' ? S0 - 0.1 : SA + PATH.L + 0.05; for (let j = 0; j < RAD; j++) { SE[i * RAD + j] = se; ANG[i * RAD + j] = (j / RAD) * Math.PI * 2; } });
    const restOf = (oed) => {
      const out = new Float32Array(NV * 3), pts = [];
      let w = 0;
      for (let i = 0; i < NR; i++) {
        const r = rings[i];
        if (r.kind === 's' || r.kind === 'f') {
          const c = r.kind === 's' ? centre(r.se) : PATH.at(r.t).c, Nn = r.kind === 's' ? N0 : PATH.at(r.t).N, sec = r.kind === 's' ? cr(LEG, 's', r.se) : cr(FOOTS, 't', r.t), se = r.kind === 's' ? r.se : SA + r.t;
          for (let j = 0; j < RAD; j++) { const [U, Vv] = ringUV(sec, se, (j / RAD) * Math.PI * 2, oed); out[w++] = c.x + B0.x * U + Nn.x * Vv; out[w++] = c.y + B0.y * U + Nn.y * Vv; out[w++] = c.z + B0.z * U + Nn.z * Vv; }
        } else w += RAD * 3;
      }
      // caps: the hip end closes inside the trousers; the toe end rounds off under the toes (as v4)
      const ringC = (i) => { const c = V(0, 0, 0); for (let j = 0; j < RAD; j++) c.x += out[(i * RAD + j) * 3] / RAD, c.y += out[(i * RAD + j) * 3 + 1] / RAD, c.z += out[(i * RAD + j) * 3 + 2] / RAD; return c; };
      { const c = ringC(1); for (let j = 0; j < RAD; j++) for (let k = 0; k < 3; k++) out[j * 3 + k] = c.getComponent(k) + (out[(RAD + j) * 3 + k] - c.getComponent(k)) * 0.35 - (k === 0 ? 0.25 : 0); }
      const last = NR - 7, cE = ringC(last), Te = PATH.at(PATH.L).T;
      for (let k = 1; k <= 6; k++) { const f = Math.cos((k / 6) * Math.PI / 2), e = 0.1 * Math.sin((k / 6) * Math.PI / 2); for (let j = 0; j < RAD; j++) for (let c = 0; c < 3; c++) out[((last + k) * RAD + j) * 3 + c] = cE.getComponent(c) + (out[(last * RAD + j) * 3 + c] - cE.getComponent(c)) * f + Te.getComponent(c) * e; }
      return out;
    };
    const idx = [];
    for (let i = 0; i < NR - 1; i++) for (let j = 0; j < RAD; j++) { const a2 = i * RAD + j, b2 = i * RAD + (j + 1) % RAD, c2 = a2 + RAD, d2 = b2 + RAD; idx.push(a2, c2, b2, b2, c2, d2); }
    // joints (rest positions) and the share of each joint's turn that every vertex takes
    const Jh = centre(-1.3).addScaledVector(N0, -0.08), Jk = centre(2.45).addScaledVector(N0, -0.1), Ja = PATH.at(0.12).c.clone().addScaledVector(PATH.at(0.12).N, -0.04);
    const hipW = (se) => K.smooth(S0 + 0.1, S0 + 1.15, se), kneeW = (se) => K.smooth(2.1, 2.8, se), ankW = (se) => K.smooth(6.25, 6.85, se);
    const WH = new Float32Array(NV), WK = new Float32Array(NV), WA = new Float32Array(NV);
    for (let i = 0; i < NV; i++) { WH[i] = hipW(SE[i]); WK[i] = kneeW(SE[i]); WA[i] = ankW(SE[i]); }
    const footEnd = PATH.at(PATH.L - 0.12), FT = footEnd.T.clone(), FN = footEnd.N.clone();

    const state = { R: Object.assign({}, PATIENT.NEURO.LEG_DEFAULT), L: Object.assign({}, PATIENT.NEURO.LEG_DEFAULT) };
    let oedema = 1, rollT = 0;
    let REST = restOf(oedema);
    const pits = { R: null, L: null };
    // the rotations of the three joints for a state (in the rest frame of the right leg; the left leg is its mirror)
    const qs = (st) => {
      const q = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a * rad);
      const qh = q(V(0, 0, 1), st.hipFlex).multiply(q(V(0, 1, 0), -st.hipAbd)).multiply(q(T0, st.hipRot));
      const qk = q(B0, -st.knee);
      const qa = q(B0, st.ankle).multiply(q(FT, st.ankleInv));
      return { qh, qk, qa };
    };
    const tq = new THREE.Quaternion(), tv = V(0, 0, 0);
    // pose one rest point (leg space) with weights
    const posePt = (Q, p, wh, wk, wa, out) => {
      out.copy(p).sub(Ja).applyQuaternion(qPow(Q.qa, wa, tq)).add(Ja);
      out.sub(Jk).applyQuaternion(qPow(Q.qk, wk, tq)).add(Jk);
      out.sub(Jh).applyQuaternion(qPow(Q.qh, wh, tq)).add(Jh);
      return out;
    };
    const legs = {};
    const legGeo = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NV * 3), 3));
      g.setAttribute('restPos', new THREE.BufferAttribute(new Float32Array(NV * 3), 3));
      g.setAttribute('restNrm', new THREE.BufferAttribute(new Float32Array(NV * 3), 3));
      g.setIndex(idx.slice());
      return g;
    };
    // the old v4 leg pieces are hidden (they stay built, so the scene keeps its seeds); the new legs go in the same groups
    for (const [side, grp, parts] of [['R', legR, lr], ['L', legL, ll]]) {
      for (const m of parts.parts) m.visible = false;
      parts.foot.visible = false;
      for (const c of grp.children) if (c.isMesh && (c.material === M.pyjamaIn || /^cuff-|^trouser-shin-/.test(c.name))) c.visible = false;
      const skinMesh = CLAY.mesh(legGeo(), M.skinRest, grp, null, null, 'leg-skin-' + side);
      skinMesh.frustumCulled = false;
      // toes: in the foot's frame (X along the foot, Y the top of the foot, Z lateral), each on its own joint
      const footG = new THREE.Group(); grp.add(footG);
      const frame = new THREE.Group(); footG.add(frame);
      frame.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(FT, FN, B0)); frame.position.copy(footEnd.c);
      const toes = [];
      for (const [z, r, L] of [[-0.29, 0.14, 0.36], [-0.06, 0.1, 0.31], [0.11, 0.094, 0.28], [0.25, 0.088, 0.25], [0.37, 0.08, 0.21]]) {
        const j = new THREE.Group(); j.position.set(0, 0, z); frame.add(j);
        const m = CLAY.mesh(CLAY.loft([{ s: 0, a: r, c: r * 0.85 }, { s: L, a: r * 0.92, c: r * 0.8 }], { axis: 'x', radial: 24, rings: 10, capStart: 0.8, capEnd: 0.9 }), M.skin, j, null, null, 'toe');
        const td = { L, halfW: (x) => K.lerp(r, r * 0.92, x / L), top: (x) => K.lerp(r * 0.85, r * 0.8, x / L) };
        CLAY.mesh(root.HANDS.nailGeo(td, L * 0.48, L * 1.0, 0.56, 0.004), M.nail, m);
        toes.push({ j, m, z, r, L });
      }
      legs[side] = { grp, skinMesh, footG, frame, toes, Q: qs(state[side]) };
    }
    // the trousers: one pyjama sleeve per leg over the thigh (and the shin when let down), with a cuff at the hem, posed
    // with the same joints; and (reclined) the pyjama pants over his pelvis
    const TRAD = 48, TROWS = 46, CUFF = 14;
    const tSec = (se) => { const s = cr(LEG, 's', Math.min(se, SA)), g = 0.065 + 0.05 * K.smooth(1.4, 3.0, se) - 0.02 * K.smooth(4.5, 6.0, se); return { a: s.a + g, b: s.b + g, c: s.c + g, d: s.d + g * 1.1 }; };
    const trGeo = () => {
      const n = (TROWS + CUFF) * TRAD, g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const I = []; for (let i = 0; i < TROWS + CUFF - 1; i++) for (let j = 0; j < TRAD; j++) { const a2 = i * TRAD + j, b2 = i * TRAD + (j + 1) % TRAD, c2 = a2 + TRAD, d2 = b2 + TRAD; I.push(a2, c2, b2, b2, c2, d2); }
      g.setIndex(I); return g;
    };
    const tr = {};
    for (const side of ['R', 'L']) {
      const m = CLAY.mesh(trGeo(), M.pyjamaIn, legs[side].grp, null, null, 'trouser-leg-' + side); m.frustumCulled = false;
      tr[side] = { mesh: m, rest: new Float32Array((TROWS + CUFF) * TRAD * 3), se: new Float32Array((TROWS + CUFF) * TRAD) };
    }
    let trEnd = -1;
    const trRest = () => {
      const u = rollT, rv = N.rollV || 0;   // rollV: the v4 setRoll (mid-calf) on the new legs
      const sEnd = Math.min(K.lerp(6.12, PATIENT.NEURO.ROLL_TO, u), K.lerp(6.12, 4.3, rv)), s0 = S0 - 0.3;
      if (Math.abs(sEnd - trEnd) < 1e-6 && N._trU === u) return; trEnd = sEnd; N._trU = u;
      const thick = 0.045 + 0.04 * Math.max(u, rv), wid = 0.12 + 0.16 * Math.max(u, rv);   // the cuff: a rolled band, thicker the more is rolled
      for (const side of ['R', 'L']) {
        const T = tr[side]; let w = 0;
        const put = (se, grow) => {
          const c = centre(Math.min(se, SA)), sec = tSec(se), wob = 1 + 0.01 * Math.sin(se * 5.3 + (side === 'R' ? 0 : 1));
          for (let j = 0; j < TRAD; j++) {
            const an = (j / TRAD) * Math.PI * 2, cu = Math.cos(an), su = Math.sin(an);
            const U = (cu >= 0 ? sec.a : sec.b) * cu * wob + cu * grow, Vv = (su >= 0 ? sec.c : sec.d) * su * wob + su * grow;
            T.rest[w * 3] = c.x + B0.x * U + N0.x * Vv; T.rest[w * 3 + 1] = c.y + B0.y * U + N0.y * Vv; T.rest[w * 3 + 2] = c.z + B0.z * U + N0.z * Vv; T.se[w] = se; w++;
          }
        };
        for (let i = 0; i < TROWS; i++) put(K.lerp(s0, sEnd - wid, i / TROWS), 0);
        // the cuff: the rolled fabric, a soft band that rises off the trouser leg and turns under at the hem
        for (let k = 0; k < CUFF; k++) { const u2 = k / (CUFF - 1), ph = Math.PI * Math.min(1, u2 * 1.15); put(sEnd - wid + wid * (0.5 - 0.5 * Math.cos(Math.PI * u2)), thick * Math.pow(Math.sin(ph), 0.6) + 0.003); }
      }
    };
    const pants = !flat ? buildPants(N) : null;

    // ---- posing
    const pv = V(0, 0, 0);
    const skinLeg = (side) => {
      const L = legs[side], Q = L.Q = qs(state[side]), g = L.skinMesh.geometry, A = g.attributes.position.array, R = g.attributes.restPos.array;
      const pit = pits[side];
      if (N._restDirty) { for (const sd of ['R', 'L']) { const rp = legs[sd].skinMesh.geometry.attributes.restPos; rp.array.set(REST); if (pits[sd]) addPit(sd, rp.array); rp.needsUpdate = true; } N._restDirty = false; }
      for (let i = 0; i < NV; i++) {
        pv.set(R[3 * i], R[3 * i + 1], R[3 * i + 2]);
        posePt(Q, pv, WH[i], WK[i], WA[i], pv);
        A[3 * i] = pv.x; A[3 * i + 1] = pv.y; A[3 * i + 2] = pv.z;
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
      if (N._nrmDirty !== false || !g.userData.rn) {   // rest normals for the texture (once per rest change)
        const tmpG = new THREE.BufferGeometry(); tmpG.setAttribute('position', new THREE.BufferAttribute(R, 3)); tmpG.setIndex(g.index); tmpG.computeVertexNormals();
        g.attributes.restNrm.array.set(tmpG.attributes.normal.array); g.attributes.restNrm.needsUpdate = true; g.userData.rn = true;
      }
      // the foot (toes) rigidly with the ankle
      const qf = Q.qh.clone().multiply(Q.qk).multiply(Q.qa);
      const o = posePt(Q, V(0, 0, 0), 1, 1, 1, V(0, 0, 0));
      L.footG.quaternion.copy(qf); L.footG.position.copy(o);
      const st = state[side];
      L.toes.forEach((t, i) => {
        if (i === 0) t.j.rotation.set(0, 0, -0.22 + st.bigToe * rad);
        else t.j.rotation.set(0, -st.fan * 0.35 * (t.z - 0.11) / 0.26, -0.22 - st.toes * rad);
      });
      // the trousers
      trRest();
      const T = tr[side], TA = T.mesh.geometry.attributes.position.array;
      for (let i = 0; i < T.se.length; i++) { const se = T.se[i]; pv.set(T.rest[3 * i], T.rest[3 * i + 1], T.rest[3 * i + 2]); posePt(Q, pv, hipW(se), kneeW(se), ankW(se), pv); TA[3 * i] = pv.x; TA[3 * i + 1] = pv.y; TA[3 * i + 2] = pv.z; }
      T.mesh.geometry.attributes.position.needsUpdate = true; T.mesh.geometry.computeVertexNormals(); T.mesh.geometry.computeBoundingSphere();
    };
    N._nrmDirty = true; N._restDirty = true;
    const clampSt = (st) => { const Rg = PATIENT.NEURO.LEG_RANGE; for (const k of Object.keys(Rg)) st[k] = K.clamp(+st[k] || 0, Rg[k][0], Rg[k][1]); return st; };
    P.setLeg = (side, o = {}) => {
      const st = clampSt(Object.assign({}, PATIENT.NEURO.LEG_DEFAULT, o));
      const old = state[side], same = Object.keys(st).every((k) => Math.abs(st[k] - old[k]) < 1e-6);
      state[side] = st;
      if (!same || N._restDirty || N._trDirty || !legs[side].posed) { skinLeg(side); legs[side].posed = true; N._nrmDirty = false; }
      return Object.assign({}, st);
    };
    P.leg = (side) => Object.assign({}, state[side]);
    const reskinAll = () => { N._nrmDirty = true; for (const s of ['R', 'L']) skinLeg(s); N._nrmDirty = false; };
    P.setOedema = (u) => { u = K.clamp(u); if (Math.abs(u - oedema) < 1e-6) return; oedema = u; REST = restOf(oedema); N._restDirty = true; reskinAll(); };
    P.oedema = () => oedema;
    P.setTrouserRoll = (u) => { u = K.clamp(u); if (Math.abs(u - rollT) < 1e-6) return; rollT = u; trRest(); for (const s of ['R', 'L']) skinLeg(s); };
    P.trouserRoll = () => rollT;
    P.setRoll = (u) => { u = K.clamp(u); if (Math.abs(u - (N.rollV || 0)) < 1e-6) return; N.rollV = u; trRest(); for (const s of ['R', 'L']) skinLeg(s); };

    // ---- named points on the leg (rest vertex or rest point -> posed, world)
    const vIdx = (se, ang) => { let best = 0, bd = 1e9; for (let i = 0; i < NR; i++) { const d = Math.abs(SE[i * RAD] - se); if (d < bd) { bd = d; best = i; } } return best * RAD + (Math.round(((ang % (2 * Math.PI)) + 2 * Math.PI) / (2 * Math.PI) * RAD) % RAD); };
    const LMV = {
      patella: vIdx(2.4, FR), patellarTendon: vIdx(2.8, FR), tibialTuberosity: vIdx(3.03, FR), shinMid: vIdx(4.3, FR + 0.15), calf: vIdx(3.55, BK),
      quadriceps: vIdx(0.9, FR), hamstrings: vIdx(1.1, BK), tibialisAnterior: vIdx(3.9, FR - 0.55),
      medialMalleolus: vIdx(MM.s, MM.ang), lateralMalleolus: vIdx(LMx.s, LMx.ang), achilles: vIdx(6.05, BK),
      heel: vIdx(SA + 0.62, BK - 0.3), heelBack: vIdx(SA + 0.45, BK), sole: vIdx(SA + LB + 0.2, BK), ball: vIdx(SA + LB + 0.7, BK),
      dorsum: vIdx(SA + LB + 0.35, FR), L2: vIdx(-0.2, FR), L3: vIdx(2.42, MED - 0.42), L4: vIdx(4.6, MED - 0.55), L4mm: vIdx(MM.s + 0.02, MM.ang),
      L5: vIdx(SA + LB + 0.3, FR), S1: vIdx(SA + LB + 0.2, LAT - 0.35), S1heel: vIdx(SA + 0.75, LAT - 0.9), pressPt: vIdx(MM.s - PATIENT.PRESS_ABOVE_MM / 100, Math.PI - 0.92),
    };
    // the lateral border of the sole, from the heel to the base of the little toe
    // the plantar stroke: up the LATERAL border of the sole from the heel to the ball of the foot, then curving medially
    // across the ball (the metatarsal heads) toward the base of the big toe, stopping short of the big toe
    LMV.solePath = [];
    for (let k = 0; k <= 7; k++) LMV.solePath.push(vIdx(SA + 0.72 + (LB + 0.5 - 0.72) * k / 7, K.lerp(BK + 0.82, LAT - 0.6, K.smooth(0, 0.35, k / 7))));
    for (const [dt, an] of [[0.55, -0.78], [0.58, -1.08], [0.6, -1.42], [0.61, -1.76], [0.6, -2.08], [0.58, -2.36]]) LMV.solePath.push(vIdx(SA + LB + dt, an));
    N.LMV = LMV;
    const toWorld = (side, p) => { const g = legs[side].grp; g.updateMatrixWorld(true); return p.applyMatrix4(g.matrixWorld); };
    const vertexWorld = (side, i) => { const A = legs[side].skinMesh.geometry.attributes.position; return toWorld(side, V(A.getX(i), A.getY(i), A.getZ(i))); };
    const vertexNormal = (side, i) => { const A = legs[side].skinMesh.geometry.attributes.normal, g = legs[side].grp; g.updateMatrixWorld(true); return V(A.getX(i), A.getY(i), A.getZ(i)).transformDirection(g.matrixWorld).normalize(); };
    N.legVertex = vertexWorld; N.legNormal = vertexNormal;
    const joints = { hip: [Jh, 0, 0, 0], knee: [Jk, 1, 0, 0], ankle: [Ja, 1, 1, 0] };
    P.legPoint = (side, name) => {
      if (joints[name]) { const [p, wh, wk, wa] = joints[name]; return toWorld(side, posePt(legs[side].Q, p, 1, wk ? 1 : 0, wa ? 1 : 0, V(0, 0, 0))); }
      if (name === 'toeTip') { const t = legs[side].toes[0]; t.m.updateMatrixWorld(true); return t.m.localToWorld(V(t.L + t.r * 0.7, 0, 0)); }
      if (LMV[name] == null) throw new Error('P.legPoint: unknown point ' + name);
      return vertexWorld(side, LMV[name]);
    };
    P.legNormal = (side, name) => vertexNormal(side, LMV[name]);
    P.legSolePath = (side) => LMV.solePath.map((i) => vertexWorld(side, i));   // the lateral border of the sole, heel -> little toe
    // big toe: the sides of the distal phalanx, the tip and the nail
    P.toePoint = (side, which) => {
      const t = legs[side].toes[which === 'little' ? 4 : 0]; t.m.updateMatrixWorld(true);
      const L = t.L, r = t.r, mir = side === 'L' ? -1 : 1, map = { medial: [L * 0.72, 0, -r * 1.0], lateral: [L * 0.72, 0, r * 1.0], tip: [L + r * 0.7, 0, 0], nail: [L * 0.7, r * 0.85, 0], pad: [L * 0.7, -r * 0.9, 0], base: [0.05, 0, 0] };
      const p = map[which] || map.tip; return t.m.localToWorld(V(p[0], p[1], p[2] * (which === 'medial' || which === 'lateral' ? 1 : 1)));
    };
    // ---- solving the angles so chosen leg points reach targets (Nelder-Mead on the free angles)
    const restPt = (name) => { if (joints[name]) return { p: joints[name][0], w: joints[name].slice(1) }; const i = LMV[name]; return { p: V(REST[3 * i], REST[3 * i + 1], REST[3 * i + 2]), w: [WH[i], WK[i], WA[i]] }; };
    P.legFit = (side, targets, o = {}) => {
      const free = o.free || ['hipFlex', 'knee'], base = Object.assign({}, state[side], o.start || {}), mir = side === 'L' ? -1 : 1;
      const T = targets.map((t) => { const g = legs[side].grp; g.updateMatrixWorld(true); const at = t.at.clone().applyMatrix4(new THREE.Matrix4().copy(g.matrixWorld).invert()); return { r: restPt(t.point), at, w: t.w == null ? 1 : t.w, axis: t.axis }; });
      const cost = (x) => {
        const st = clampSt(Object.assign({}, base)); free.forEach((k, i) => (st[k] = x[i])); clampSt(st);
        let c = 0; const Q = qs(st);
        for (const t of T) { const p = posePt(Q, t.r.p, t.r.w[0], t.r.w[1], t.r.w[2], V(0, 0, 0)); if (t.axis) { const ai = { x: 0, y: 1, z: 2 }[t.axis] ?? t.axis, d = p.getComponent(ai) - t.at.getComponent(ai); c += t.w * d * d; } else c += t.w * p.distanceToSquared(t.at); }
        for (const k of free) { const Rg = PATIENT.NEURO.LEG_RANGE[k]; const v = x[free.indexOf(k)]; if (v < Rg[0]) c += (Rg[0] - v) ** 2; if (v > Rg[1]) c += (v - Rg[1]) ** 2; }
        return c + (o.reg || 0) * free.reduce((m, k, i) => m + (x[i] - base[k]) ** 2, 0);
      };
      let simplex = [free.map((k) => base[k])];
      for (let i = 0; i < free.length; i++) { const x = simplex[0].slice(); x[i] += 8; simplex.push(x); }
      let F = simplex.map(cost);
      for (let it = 0; it < (o.iters || 400); it++) {
        const ord = F.map((f, i) => i).sort((a, b) => F[a] - F[b]); simplex = ord.map((i) => simplex[i]); F = ord.map((i) => F[i]);
        const n = free.length, cen = simplex[0].map((_, j) => simplex.slice(0, n).reduce((m, x) => m + x[j], 0) / n);
        const pt = (k) => cen.map((c, j) => c + k * (simplex[n][j] - c));
        const xr = pt(-1), fr = cost(xr);
        if (fr < F[0]) { const xe = pt(-2), fe = cost(xe); if (fe < fr) { simplex[n] = xe; F[n] = fe; } else { simplex[n] = xr; F[n] = fr; } }
        else if (fr < F[n - 1]) { simplex[n] = xr; F[n] = fr; }
        else { const xc = pt(0.5), fc = cost(xc); if (fc < F[n]) { simplex[n] = xc; F[n] = fc; } else for (let i = 1; i <= n; i++) { simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j])); F[i] = cost(simplex[i]); } }
      }
      const st = Object.assign({}, base); free.forEach((k, i) => (st[k] = simplex[0][i]));
      if (o.apply === false) return clampSt(st);
      return Object.assign(P.setLeg(side, st), { error: Math.sqrt(F[0] / Math.max(1, T.length)) });
    };

    // ---- the pitting oedema press (as v4 setPit), now on the new legs
    const pitAmt = { R: 0, L: 0 };
    const addPit = (side, R) => {
      const d = pitAmt[side]; if (!d) return;
      const i0 = LMV.pressPt, P0 = V(REST[3 * i0], REST[3 * i0 + 1], REST[3 * i0 + 2]);
      const n = V(REST[3 * (i0 + 1)] - REST[3 * (i0 - 1)], REST[3 * (i0 + 1) + 1] - REST[3 * (i0 - 1) + 1], REST[3 * (i0 + 1) + 2] - REST[3 * (i0 - 1) + 2]).cross(T0).normalize();
      const c = centre(SE[i0]); if (n.dot(P0.clone().sub(c)) < 0) n.negate();
      const tn = new THREE.Vector3().crossVectors(n, T0).normalize(), ax = new THREE.Vector3().crossVectors(tn, n).normalize(), t = V(0, 0, 0);
      for (let i = 0; i < NV; i++) {
        t.set(R[3 * i] - P0.x, R[3 * i + 1] - P0.y, R[3 * i + 2] - P0.z);
        const dx = t.dot(ax), dt = t.dot(tn), dn = t.dot(n), q = (dx / 0.085) ** 2 + (dt / 0.105) ** 2;
        const f = dn > -0.2 && q < 9 ? Math.exp(-Math.pow(q, 1.7)) : 0;
        if (f) { R[3 * i] -= n.x * d * f; R[3 * i + 1] -= n.y * d * f; R[3 * i + 2] -= n.z * d * f; }
      }
    };
    P.setPit = (side, depth) => { if (Math.abs(pitAmt[side] - depth) < 1e-5) return; pitAmt[side] = depth; pits[side] = depth > 0; N._restDirty = true; reskinAll(); };

    // ---- legSDF: the distance to the posed leg, found in the rest shape of the bone nearest to the point
    const legSDFold = P.legSDF;
    const NB = 72;
    const polar = (sec, se) => { const r = new Float32Array(NB); for (let j = 0; j < 288; j++) { const [U, Vv] = ringUV(sec, se, (j / 288) * Math.PI * 2, oedema), b = Math.round(((Math.atan2(Vv, U) + Math.PI) / (2 * Math.PI)) * NB) % NB; r[b] = Math.max(r[b], Math.hypot(U, Vv)); } for (let k = 0; k < 2; k++) for (let b = 0; b < NB; b++) if (!r[b]) r[b] = Math.max(r[(b + 1) % NB], r[(b + NB - 1) % NB]); return r; };
    const NSS = 160, straight = [], bendT = [];
    for (let i = 0; i <= NSS; i++) { const s2 = K.lerp(S0, SA, i / NSS); straight.push(polar(cr(LEG, 's', s2), s2)); }
    for (let i = 0; i <= NSS; i++) { const t = PATH.L * i / NSS; bendT.push(polar(cr(FOOTS, 't', t), SA + t)); }
    const look = (tab, u, U, Vv) => { const r = tab[Math.round(K.clamp(u) * NSS)], b = Math.round(((Math.atan2(Vv, U) + Math.PI) / (2 * Math.PI)) * NB) % NB; return Math.hypot(U, Vv) - r[b]; };
    const restSDF = (p, part) => {
      if (part !== 'foot') {
        const s2 = K.clamp(p.x, S0, SA), c = centre(s2), q = p.clone().sub(c); q.x = p.x - s2;
        const lo = part === 'thigh' ? S0 : 2.45, hi = part === 'thigh' ? 2.45 : SA, out = Math.max(lo - p.x, p.x - hi, 0);
        return look(straight, (s2 - S0) / (SA - S0), q.dot(B0), q.dot(N0)) + out;
      }
      let lo = 0, hi = PATH.L; const q = V(0, 0, 0);
      const f = (t) => { const g = PATH.at(t); return q.copy(p).sub(g.c).dot(g.T); };
      if (f(0) < 0) return Infinity;
      if (f(hi) > 0) lo = hi; else for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
      const g = PATH.at(lo), axv = q.copy(p).sub(g.c).dot(g.T), d = look(bendT, lo / PATH.L, q.dot(B0), q.dot(g.N));
      return lo >= PATH.L ? Math.max(d, axv - 0.1) : d;
    };
    P.legSDF = (side, w) => {
      const L = legs[side], g = L.grp; g.updateMatrixWorld(true);
      const p = w.clone().applyMatrix4(new THREE.Matrix4().copy(g.matrixWorld).invert()), Q = L.Q;
      const inv = (q) => q.clone().invert();
      const pt = p.clone().sub(Jh).applyQuaternion(inv(Q.qh)).add(Jh);                 // thigh rest space
      const ps = pt.clone().sub(Jk).applyQuaternion(inv(Q.qk)).add(Jk);                // shank rest space
      const pf = ps.clone().sub(Ja).applyQuaternion(inv(Q.qa)).add(Ja);                // foot rest space
      return Math.min(restSDF(pt, 'thigh'), restSDF(ps, 'shank'), restSDF(pf, 'foot'));
    };
    P._legSDFv4 = legSDFold;
    // the anchors the v4 parts used on the legs (press points, medial malleoli) now follow the pose
    const anchorOld = P.anchor, normalOld = P.anchorNormal;
    P.anchor = (name) => { const m = /^([RL])(press|mm)$/.exec(name); if (m) return vertexWorld(m[1], m[2] === 'press' ? LMV.pressPt : LMV.medialMalleolus); return anchorOld(name); };
    P.anchorNormal = (name) => { const m = /^([RL])(press|mm)$/.exec(name); if (m) return vertexNormal(m[1], m[2] === 'press' ? LMV.pressPt : LMV.medialMalleolus); return normalOld(name); };
    // the meshes a sheet drapes over: the new legs and trousers
    P.sheetMeshes = P.sheetMeshes.filter((m) => m.visible && m.parent && m.parent.visible !== false);
    P.sheetMeshes.push(legs.R.skinMesh, legs.L.skinMesh, tr.R.mesh, tr.L.mesh, ...legs.R.toes.map((t) => t.m), ...legs.L.toes.map((t) => t.m));
    if (pants) P.sheetMeshes.push(pants.mesh);
    N.legs = legs; N.tr = tr; N.pants = pants;
    P.legMeshes = { R: legs.R.skinMesh, L: legs.L.skinMesh };
    trRest(); reskinAll(); legs.R.posed = legs.L.posed = true;
  }

  // the pyjama pants over his pelvis on the reclined torso (the flat torso has its own trouser shell, v4)
  function buildPants(N) {
    const { torsoMesh, chest, M } = N.X;
    const g = torsoMesh.geometry, R = 72, A = g.attributes.position, Nn = g.attributes.normal;
    const waist = 0.92, ringS = (k) => (k < 7 ? -1 : 5.45 * (k - 7) / 70);
    const kTop = 7 + Math.floor(waist / 5.45 * 70), u = (waist - ringS(kTop)) / (ringS(kTop + 1) - ringS(kTop));
    const rows = kTop + 2, pos = new Float32Array((rows + 10) * R * 3);
    const at = (k, j) => [A.getX(k * R + j), A.getY(k * R + j), A.getZ(k * R + j), Nn.getX(k * R + j), Nn.getY(k * R + j), Nn.getZ(k * R + j)];
    let w = 0;
    const off = 0.032;
    for (let k = 0; k < rows; k++) for (let j = 0; j < R; j++) {
      let p = at(Math.min(k, kTop), j);
      if (k === rows - 1) { const a = at(kTop, j), b = at(kTop + 1, j); p = a.map((v, i) => K.lerp(v, b[i], u)); }
      const ln = Math.hypot(p[3], p[4], p[5]) || 1;
      pos[w++] = p[0] + p[3] / ln * off; pos[w++] = p[1] + p[4] / ln * off; pos[w++] = p[2] + p[5] / ln * off;
    }
    // the waistband: a soft roll on the top edge
    const top = rows - 1;
    for (let k = 0; k < 10; k++) {
      const ph = Math.PI * (k + 1) / 10, rr = 0.03;
      for (let j = 0; j < R; j++) {
        const i0 = (top * R + j) * 3, n = at(kTop, j), ln = Math.hypot(n[3], n[4], n[5]) || 1;
        pos[w++] = pos[i0] + n[3] / ln * rr * (1 - Math.cos(ph)); pos[w++] = pos[i0 + 1] + n[4] / ln * rr * (1 - Math.cos(ph)) - rr * Math.sin(ph) * 0.9; pos[w++] = pos[i0 + 2] + n[5] / ln * rr * (1 - Math.cos(ph));
      }
    }
    const nRows = rows + 10, idx = [];
    for (let k = 0; k < nRows - 1; k++) for (let j = 0; j < R; j++) { const a = k * R + j, b = k * R + (j + 1) % R, c = a + R, d = b + R; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const mesh = CLAY.mesh(geo, M.pyjamaIn, chest, null, null, 'pyjama-pants');
    return { mesh };
  }

  // ================================================================================================ HEAD, NECK, SHRUG
  // The head turns about a pivot at the base of the neck; every neck vertex takes its share of the turn (none at the
  // base, all of it inside the head), so the slim neck bends and twists like a neck and is never widened. The
  // sternocleidomastoid of the side opposite the turn stands out, both a little when he flexes against a hand.
  function buildHead(N) {
    const { P, M, torso, chest, torsoMesh, neck, head, flat, bender, flatData } = N.X;
    const C0 = V(0, 5.25, 0.12), Cb = bender ? bender.point(C0.clone()) : C0.clone();
    const H0 = { p: head.position.clone(), q: head.quaternion.clone() };
    const g = neck.geometry, NV = g.attributes.position.count, base = Float32Array.from(g.attributes.position.array), baseN = Float32Array.from(g.attributes.normal.array);
    g.setAttribute('restPos', new THREE.BufferAttribute(Float32Array.from(base), 3)); g.setAttribute('restNrm', new THREE.BufferAttribute(Float32Array.from(baseN), 3));
    neck.material = M.skinRest;
    const vOf = (y) => { const T = [[4.85, -0.22], [5.55, -0.02], [6.25, 0.28], [6.75, 0.45]]; if (y <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (y <= T[i][0]) return K.lerp(T[i - 1][1], T[i][1], (y - T[i - 1][0]) / (T[i][0] - T[i - 1][0])); return T[3][1]; };
    const W = new Float32Array(NV), PHI = new Float32Array(NV);
    for (let i = 0; i < NV; i++) { const y = base[3 * i + 1]; W[i] = K.smooth(4.98, 6.6, y); PHI[i] = Math.atan2(base[3 * i + 2] - vOf(y), base[3 * i]); }
    const scmPhi = (y, sx) => { const u = K.clamp((y - 5.0) / 1.45), ph = K.lerp(1.2, -0.5, u); return sx > 0 ? ph : Math.PI - ph; };
    const st = { turn: 0, flex: 0, tilt: 0, cough: 0, swallow: 0 };
    const axTurn = V(0, 1, 0.3).normalize(), q = new THREE.Quaternion(), tq = new THREE.Quaternion(), p = V(0, 0, 0), n = V(0, 0, 0);
    let memo = '';
    const update = () => {
      const key = [st.turn, st.flex, st.tilt, st.cough, st.swallow].map((v) => v.toFixed(4)).join(',');
      if (key === memo) return; memo = key;
      const flex = st.flex + 7 * st.cough;
      q.setFromAxisAngle(V(1, 0, 0), flex * rad).multiply(new THREE.Quaternion().setFromAxisAngle(axTurn, -st.turn * rad)).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), st.tilt * rad));
      head.position.copy(H0.p).sub(Cb).applyQuaternion(q).add(Cb); head.quaternion.copy(q).multiply(H0.q);
      const aL = 0.09 * K.clamp(st.turn / 60) + 0.02 * K.clamp(st.flex / 40), aR = 0.09 * K.clamp(-st.turn / 60) + 0.02 * K.clamp(st.flex / 40);
      const su = K.clamp(st.swallow), sw = Math.sin(Math.PI * su), swY = 5.3 + 0.28 * sw, swA = 0.075 * K.smooth(0, 0.12, su) * K.smooth(1, 0.88, su);   // the larynx: shows, rises 4 cm, falls back
      const A = g.attributes.position.array, R = g.attributes.restPos.array, still = q.lengthSq() && Math.abs(q.w - 1) < 1e-9 && !aL && !aR && !swA;
      for (let i = 0; i < NV; i++) {
        const y = base[3 * i + 1];
        let h = 0;
        if (aL || aR) { const b2 = band(y, 5.05, 6.45, 0.12); if (b2) h += b2 * (aL * gauss(angD(PHI[i], scmPhi(y, 1)), 0.24) + aR * gauss(angD(PHI[i], scmPhi(y, -1)), 0.24)); }
        if (swA) h += swA * gauss(y - swY, 0.08) * gauss(angD(PHI[i], Math.PI / 2), 0.26);
        p.set(base[3 * i] + baseN[3 * i] * h, y + baseN[3 * i + 1] * h, base[3 * i + 2] + baseN[3 * i + 2] * h);
        R[3 * i] = p.x; R[3 * i + 1] = p.y; R[3 * i + 2] = p.z;
        if (W[i] > 0) p.sub(C0).applyQuaternion(qPow(q, W[i], tq)).add(C0);
        A[3 * i] = p.x; A[3 * i + 1] = p.y; A[3 * i + 2] = p.z;
      }
      g.attributes.position.needsUpdate = true; g.attributes.restPos.needsUpdate = true;
      if (still) { g.attributes.normal.array.set(baseN); g.attributes.normal.needsUpdate = true; } else g.computeVertexNormals();
      g.computeBoundingSphere();
    };
    N.headState = st; N.updateHead = update;
    P.setHead = (o = {}) => { st.turn = K.clamp(o.turn || 0, -80, 80); st.flex = K.clamp(o.flex || 0, -40, 60); st.tilt = K.clamp(o.tilt || 0, -40, 40); update(); return { turn: st.turn, flex: st.flex, tilt: st.tilt }; };
    P.headPose = () => ({ turn: st.turn, flex: st.flex, tilt: st.tilt });

    // ---- the shrug: the shoulders rise 3 cm (the shoulder joints, the tops of the shoulders, the clavicles and the
    // skin over the trapezius from the neck to the shoulder tip)
    const LIFT = 0.3;
    const shoulderBalls = torso.children.filter((m) => m.isMesh && m.geometry.type === 'SphereGeometry' && Math.abs(Math.abs(m.position.x) - 1.62) < 0.3);
    const ballRest = shoulderBalls.map((m) => ({ m, p: m.position.clone() }));
    const clav = chest.children.filter((m) => m.isMesh && m.geometry.type === 'TubeGeometry').map((m) => ({ m, sx: m.geometry.parameters.path.points[2].x > 0 ? 1 : -1 }));
    const tg = torsoMesh.geometry, TA = tg.attributes.position, TN = tg.attributes.normal, TV = TA.count, delta = new Float32Array(TV * 3);
    for (let i = 0; i < TV; i++) {
      const x = TA.getX(i), y = TA.getY(i), z = TA.getZ(i), ax = Math.abs(x);
      const yy = flat ? y + 0.0 : y;
      let lift = LIFT * K.smooth(0.42, 1.15, ax) * K.smooth(4.45, 5.15, yy) * (1 - K.smooth(1.95, 2.2, ax));
      // the trapezius: a sloping ridge from the side of the neck down to the tip of the shoulder, on the top and back
      const sx = Math.sign(x) || 1, ax0 = 0.45, ay0 = 5.42, bx0 = 1.72, by0 = 5.02, t = K.clamp(((ax - ax0) * (bx0 - ax0) + (yy - ay0) * (by0 - ay0)) / ((bx0 - ax0) ** 2 + (by0 - ay0) ** 2));
      const d = Math.hypot(ax - (ax0 + (bx0 - ax0) * t), yy - (ay0 + (by0 - ay0) * t)), bulge = 0.075 * Math.exp(-((d / 0.24) ** 2)) * K.smooth(0.5, -0.4, z);
      const th = flat && bender ? bender.theta(y) : 0, ny = Math.cos(th), nz = Math.sin(th);
      delta[3 * i] = TN.getX(i) * bulge; delta[3 * i + 1] = lift * ny + TN.getY(i) * bulge; delta[3 * i + 2] = lift * nz + TN.getZ(i) * bulge;
    }
    const tRest = Float32Array.from(TA.array), fdBase = flatData ? Float32Array.from(flatData.base) : null;
    let shrug = 0;
    P.setShrug = (u) => {
      u = K.clamp(u); if (Math.abs(u - shrug) < 1e-6) return; shrug = u;
      N.X.setShrugY(LIFT * u);
      for (const b of ballRest) { const pp = V(b.p.x, b.p.y, b.p.z); if (bender) { const th = bender.theta(4.9); pp.y += LIFT * u * Math.cos(th); pp.z += LIFT * u * Math.sin(th); } else pp.y += LIFT * u; b.m.position.copy(pp); }
      for (const c of clav) { const sx = c.sx, pts = [[sx * 0.22, 5.12, 0.6], [sx * 0.9, 5.14 + 0.13 * u, 0.55], [sx * 1.6, 5.05 + 0.27 * u, 0.28]]; c.m.geometry.dispose(); c.m.geometry = K.tube(pts, 0.075, { radial: 12 }); }
      if (flatData) { for (let i = 0; i < fdBase.length; i++) flatData.base[i] = fdBase[i] + delta[i] * u; N.X.rebreathe(); tg.computeVertexNormals(); }
      else { for (let i = 0; i < tRest.length; i++) TA.array[i] = tRest[i] + delta[i] * u; TA.needsUpdate = true; tg.computeVertexNormals(); }
      tg.computeBoundingSphere();
    };
    P.shrug = () => shrug;
  }

  // ================================================================================================ FACE
  function buildFace(N) {
    const X = N.X, { P, M, C, head, cranium, crBase, crBaseN, skin, jaw, lowerLip, llBase, upperLip, mous, mouthG, dish, upTeeth, loTeeth, tongueDown, tongueOut, placeMouth, eyes, surf, g2, MOUTH_Y, mouthY, latW } = X;
    const setFace4 = P.setFace;
    const ulBase = Float32Array.from(upperLip.geometry.attributes.position.array), msBase = Float32Array.from(mous.geometry.attributes.position.array);
    const NVc = crBase.length / 3;
    const front = []; for (let i = 0; i < NVc; i++) if (crBase[3 * i + 2] > -0.35) front.push(i);
    const jw = new Float32Array(NVc); for (const [i, w] of skin) jw[i] = w;
    const G = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
    const segD = (x, y, ax, ay, bx, by) => { const t = K.clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)); return Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t); };
    // the face's shape changes, as a displacement of a rest point (head local: x his left, y up, z forward)
    const morph = (x, y, z, f, out, lip) => {
      out.set(0, 0, 0); if (z < 0.05) return out;
      const ax = Math.abs(x), sx = Math.sign(x) || 1, fr = K.smooth(0.05, 0.45, z);
      if (f.brows) {   // eyebrows raised: the forehead skin rides up into horizontal wrinkles (frontalis) above the brows
        const fx = 1 - K.smooth(0.4, 0.54, ax);
        let w = 0; for (const yk of [0.458, 0.476, 0.494, 0.512, 0.53]) w += Math.exp(-(((y - yk) / 0.0065) ** 2)) - 0.6 * Math.exp(-(((y - yk - 0.011) / 0.005) ** 2));
        const top = 0.488 + 0.06 * K.smooth(0.08, 0.34, ax);   // the hairline: low in the middle, higher at the temples
        out.z += 0.017 * f.brows * w * fx * K.smooth(0.448, 0.458, y) * (1 - K.smooth(top - 0.012, top + 0.004, y));   // raised folds (the skin is never pushed in under the hairline)
        out.y += 0.03 * f.brows * fx * Math.exp(-(((y - 0.37) / 0.09) ** 2)) * fr * (1 - K.smooth(0.44, 0.5, y));
      }
      if (f.squeeze) {   // eyes screwed shut: crow's feet at the outer corners, the cheeks pushed up, brows down and in
        const u = f.squeeze, rx = ax - 0.43, ry = y - 0.155, r = Math.hypot(rx, ry);
        if (rx > -0.02) out.z -= 0.0075 * u * (0.5 + 0.5 * Math.cos(8 * Math.atan2(ry, rx))) * band(r, 0.05, 0.17, 0.025);
        const ch = G(ax, y, 0.36, -0.05, 0.15, 0.12);
        out.y += 0.035 * u * ch; out.z += 0.025 * u * ch;
        out.z += 0.012 * u * G(ax, y, 0.3, 0.04, 0.11, 0.04);
        out.y -= 0.025 * u * G(ax, y, 0.3, 0.33, 0.2, 0.08);
        out.z -= 0.007 * u * Math.exp(-(((ax - 0.07) / 0.016) ** 2)) * band(y, 0.26, 0.4, 0.03);
        if (ax < 0.09) { let w = 0; for (const yk of [0.19, 0.225, 0.26]) w += Math.exp(-(((y - yk) / 0.008) ** 2)); out.z -= 0.004 * u * w; }
      }
      const corner = G(ax, y, 0.2, MOUTH_Y, 0.075, 0.07);
      if (f.smile) {    // mouth corners up and back, the cheeks lifted, the nasolabial folds deepen (equally)
        const u = f.smile;
        out.y += 0.042 * u * corner; out.z -= 0.016 * u * corner; out.x += sx * 0.016 * u * corner;
        const ch = G(ax, y, 0.33, -0.28, 0.12, 0.1); out.z += 0.03 * u * ch; out.y += 0.015 * u * ch;
        const d = segD(ax, y, 0.1, -0.26, 0.25, -0.57); out.z -= 0.02 * u * Math.exp(-((d / 0.022) ** 2)) * fr;
        if (lip === 'upper') out.y += 0.022 * u * (1 - K.smooth(0.05, 0.2, ax));
        if (lip === 'lower') out.y -= 0.012 * u * (1 - K.smooth(0.05, 0.2, ax));
      }
      if (f.wide) { out.x += sx * 0.022 * f.wide * corner; out.z -= 0.012 * f.wide * corner; }
      if (f.round) {
        const m = G(ax, y, 0, MOUTH_Y, 0.24, 0.1);
        out.x -= x * 0.3 * f.round * m; out.z += 0.03 * f.round * m * (lip ? 1 : 0.6);
      }
      if (f.puff) {     // cheeks blown out (lips sealed)
        const ch = G(ax, y, 0.4, -0.45, 0.2, 0.2) * K.smooth(-0.05, 0.3, z);
        out.x += sx * 0.13 * f.puff * ch; out.z += 0.09 * f.puff * ch; out.y -= 0.012 * f.puff * ch;
        out.z += 0.03 * f.puff * G(ax, y, 0, MOUTH_Y, 0.22, 0.08) * (lip ? 1.2 : 1);   // lips sealed and pushed a little forward
      }
      for (const [k, s2] of [['cheekR', -1], ['cheekL', 1]]) if (f[k] && sx === s2) {   // the tongue pushed into one cheek
        const b = Math.exp(-Math.pow((((ax - 0.37) / 0.11) ** 2 + ((y + 0.5) / 0.1) ** 2), 1.4)); out.x += sx * 0.11 * f[k] * b; out.z += 0.085 * f[k] * b;   // a round bulge
      }
      if (f.clench) {   // masseter (angle of the jaw) and temporalis (temple) bulge
        out.x += sx * 0.065 * f.clench * G(ax, y, 0.58, -0.5, 0.12, 0.18) * K.smooth(-0.3, 0.1, z);
        out.x += sx * 0.022 * f.clench * G(ax, y, 0.64, 0.33, 0.1, 0.13);
      }
      return out;
    };
    // the mouth wide open ("Ah"): the skin between the lips opens into a real mouth (a hole in the face; behind it the
    // cavity, the hard and soft palate with the uvula in the middle, the back of the throat, the tongue on the floor)
    // v5 round 2: the jaw drops by turning the MANDIBLE about the jaw joints (in front of the ears): everything below a
    // line from the mouth corners up to the joints turns with it (the chin keeps its shape and width), the cheeks between
    // stretch, the neck is not touched. (v4 turned only the middle of the chin about a point behind the head, which
    // pulled the lower face into a V.)
    const JP = V(0, -0.12, -0.08), JK = 0.22;          // the joint axis (x) through JP; radians of turn per unit of f.jaw
    const mandW = (x, y, z) => {
      const ax = Math.abs(x), b = ax <= 0.18 ? mouthY(ax) : K.lerp(mouthY(0.18), -0.14, K.clamp((ax - 0.18) / 0.44)), tw = 0.012 + 0.11 * K.smooth(0.14, 0.45, ax);
      return K.smooth(b + tw, b - tw, y) * K.smooth(-0.42, -0.12, z) * (1 - K.smooth(0.66, 0.8, ax) * K.smooth(-0.05, -0.3, z));
    };
    const mw = new Float32Array(NVc); for (let i = 0; i < NVc; i++) mw[i] = mandW(crBase[3 * i], crBase[3 * i + 1], crBase[3 * i + 2]);
    const turnJaw = (ang, Y, Z, o) => { const c = Math.cos(ang), sn = Math.sin(ang), yy = Y - JP.y, zz = Z - JP.z; o[0] = JP.y + yy * c - zz * sn; o[1] = JP.z + yy * sn + zz * c; return o; };
    const llC = [0, mouthY(0) - 0.036, surf(0, mouthY(0) - 0.036)], tj = [0, 0];
    const I0 = Array.from(cranium.geometry.index.array), holeIdx = [];
    for (let t = 0; t < I0.length; t += 3) {
      const ws = [I0[t], I0[t + 1], I0[t + 2]].map((i) => mw[i]), mx = Math.max(...ws), mn = Math.min(...ws);
      const cx = Math.abs(crBase[3 * I0[t]]), cz = crBase[3 * I0[t] + 2], cy = crBase[3 * I0[t] + 1];
      if (mx > 0.35 && mn < 0.65 && cz > 0.35 && cx < 0.2 && Math.abs(cy - mouthY(cx)) < 0.05) continue;
      holeIdx.push(I0[t], I0[t + 1], I0[t + 2]);
    }
    // the hair cap is a whole shell just under the skin (hair shows only above the hairline): open it at the mouth too
    const hairM = head.children.find((m) => m.isMesh && m.material === M.hair), hI0 = Array.from(hairM.geometry.index.array), hHole = [];
    { const hp = hairM.geometry.attributes.position; for (let t = 0; t < hI0.length; t += 3) { const i = hI0[t]; if (Math.abs(hp.getX(i)) < 0.32 && hp.getY(i) < -0.3 && hp.getY(i) > -1.1 && hp.getZ(i) > 0.15) continue; hHole.push(hI0[t], hI0[t + 1], hI0[t + 2]); } }
    const ahG = new THREE.Group(); ahG.visible = false; head.add(ahG);
    const ML = surf(0, MOUTH_Y);
    const mk = (geo, col, side, pos, rot, sc, glow) => { const mt = CLAY.mat(col[0], col[1], { prints: 0, rough: 0.45, streak: 0.2, freq: 6, bump: 0.3, side, fixedSeed: 9400 + ahG.children.length }); mt.emissive = new THREE.Color(col[0]).multiplyScalar(glow == null ? 0.35 : glow); const m = CLAY.mesh(geo, mt, ahG, pos, rot); if (sc) m.scale.set(...sc); return m; };   // a little glow: the inside of the mouth stays readable in the shadow of the face
    const cav = mk(new THREE.SphereGeometry(1, 40, 28), ['#8a3038', '#7a2830'], THREE.BackSide, [0, MOUTH_Y - 0.13, ML - 0.3], null, [0.21, 0.2, 0.3], 0.7);
    const palate = mk(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, 1.25), ['#e08a92', '#d27c85'], THREE.BackSide, [0, MOUTH_Y - 0.1, ML - 0.28], null, [0.17, 0.12, 0.26], 1.0);
    const throat = mk(CLAY.ellipsoid(0.1, 0.12, 0.02), ['#5e1a21', '#4a141a'], THREE.FrontSide, [0, MOUTH_Y - 0.17, ML - 0.52], null, null, 0.5);
    const pillars = [-1, 1].map((sx) => mk(K.tube([[sx * 0.1, MOUTH_Y - 0.03, ML - 0.4], [sx * 0.12, MOUTH_Y - 0.14, ML - 0.42], [sx * 0.11, MOUTH_Y - 0.26, ML - 0.4]], 0.022, { radial: 10 }), ['#d77580', '#c66872'], THREE.FrontSide, null, null, null, 0.9));
    const uvG = new THREE.Group(); uvG.position.set(0, MOUTH_Y - 0.02, ML - 0.42); ahG.add(uvG);
    const uvula = CLAY.mesh(CLAY.loft([{ s: 0, a: 0.03, c: 0.022 }, { s: -0.05, a: 0.022, c: 0.02 }, { s: -0.085, a: 0.02, c: 0.019 }], { axis: 'y', radial: 20, rings: 10, capStart: 0.3, capEnd: 0.9 }), palate.material, uvG, null, null, 'uvula');
    const softPal = CLAY.mesh(CLAY.ellipsoid(0.13, 0.025, 0.06), palate.material, uvG, [0, 0.01, 0.02]);
    uvula.material = softPal.material = new THREE.MeshPhysicalMaterial().copy(palate.material); uvula.material.side = softPal.material.side = THREE.FrontSide; uvula.material.onBeforeCompile = palate.material.onBeforeCompile; uvula.material.customProgramCacheKey = palate.material.customProgramCacheKey;
    const ahTongue = mk(CLAY.ellipsoid(0.15, 0.05, 0.25), [C.tongue[0], C.tongue[0]], THREE.FrontSide, [0, MOUTH_Y - 0.27, ML - 0.27], null, null, 0.6);
    { const p2 = ahTongue.geometry.attributes.position; for (let i = 0; i < p2.count; i++) if (p2.getY(i) > 0) p2.setY(i, p2.getY(i) - 0.012 * Math.exp(-((p2.getX(i) / 0.03) ** 2))); ahTongue.geometry.computeVertexNormals(); }
    N.ah = { ahG, uvG, uvula };

    // brows (two tubes on the brow) and the pupils
    const brows = head.children.filter((m) => m.isMesh && m.material === M.brow && m.name !== 'moustache');
    const browPts = (sx, f) => [[sx * 0.45, 0.33], [sx * 0.31, 0.375], [sx * 0.15, 0.355]].map(([x, y], k) => {
      const yy = y + 0.08 * (f.brows || 0) - 0.03 * (f.squeeze || 0) * (k === 2 ? 1.2 : 0.8), xx = x - sx * 0.02 * (f.squeeze || 0) * (k === 2 ? 1 : 0.3);
      return [xx, yy, surf(xx, yy) + 0.012];
    });
    const pupils = {}; for (const s of ['R', 'L']) pupils[s] = { m: eyes[s].ball.children.find((m) => m.material === M.pupil), mm: 4.8 };
    // v5 round 2 (neuro mode only): a lighter warm mid-brown iris with a darker rim (limbal ring), so the black pupil
    // reads at every size. The v4 iris (near-black brown) stays for the default patient.
    M.irisNeuro = CLAY.mat('#a06a3a', '#7c4e28', { prints: 0, rough: 0.2, sheen: 0.1, streak: 0.55, freq: 30, bump: 0.2, fixedSeed: 9450 });
    M.irisRim = CLAY.mat('#3a2214', '#2c190e', { prints: 0, rough: 0.22, sheen: 0.1, streak: 0.2, bump: 0.1, fixedSeed: 9451 });
    for (const s of ['R', 'L']) {
      const ball = eyes[s].ball, irisMesh = ball.children.find((m) => m.material === M.iris);
      if (irisMesh) irisMesh.material = M.irisNeuro;
      const rg = new THREE.SphereGeometry(0.12 * 1.0055, 48, 3, 0, Math.PI * 2, 0.445, 0.077); rg.rotateX(Math.PI / 2);
      CLAY.mesh(rg, M.irisRim, ball, null, null, 'iris-rim');
    }
    const setPupil = (s, mm) => {
      const pp = pupils[s]; if (Math.abs(mm - pp.mm) < 1e-4) return; pp.mm = mm;
      const r = 0.12 * 1.008, ang = Math.asin(K.clamp(mm / 200 / r, 0.01, 0.9));
      const g = new THREE.SphereGeometry(r, 40, 10, 0, Math.PI * 2, 0, Math.abs(mm - 4.8) < 1e-4 ? 0.2 : ang); g.rotateX(Math.PI / 2);
      pp.m.geometry.dispose(); pp.m.geometry = g;
    };
    const VIS = { rest: {}, A: { jaw: 0.9, wide: 0.2 }, E: { jaw: 0.35, wide: 0.8 }, O: { jaw: 0.7, round: 0.9 }, U: { jaw: 0.25, round: 1 }, M: { jaw: 0, round: 0.15 }, F: { jaw: 0.2, wide: 0.3 } };
    PATIENT.NEURO.VISEMES = VIS;
    const out = V(0, 0, 0), o2 = V(0, 0, 0);
    let memo = '';
    const KEYS = ['brows', 'squeeze', 'smile', 'wide', 'round', 'puff', 'cheekR', 'cheekL', 'clench'];
    P.setFace = (f = {}) => {
      f = Object.assign({}, f);
      if (f.viseme && VIS[f.viseme]) { for (const [k, v] of Object.entries(VIS[f.viseme])) if (f[k] == null) f[k] = v; }
      const ah = K.clamp(f.ah || 0);
      if (ah > 0) f.jaw = Math.max(f.jaw || 0, 1.6);   // any ah opens the mouth wide; ah 0..1 lifts the soft palate and uvula
      if (f.cough) f.jaw = Math.max(f.jaw || 0, 0.7 * K.clamp(f.cough));
      if (f.smile) f.jaw = Math.max(f.jaw || 0, 0.1 * f.smile);
      const active = KEYS.some((k) => f[k]) || (f.jaw || 0) > 0 || (f.tongue || 0) > 0;   // any open mouth takes the mandible path
      // the head: cough (a small jolt) and swallow (the larynx)
      if (N.headState) { N.headState.cough = K.clamp(f.cough || 0); N.headState.swallow = K.clamp(f.swallow || 0); N.updateHead(); }
      const key = KEYS.map((k) => (f[k] || 0).toFixed(4)).join(',') + '|' + (f.jaw || 0).toFixed(4) + '|' + (ah > 0);
      if (!active && !(ah > 0)) {
        if (memo !== '' && memo !== 'v4') {   // back to the v4 face: restore the rest shapes, then the v4 code path
          cranium.geometry.attributes.position.array.set(crBase); cranium.geometry.attributes.normal.array.set(crBaseN);
          cranium.geometry.attributes.position.needsUpdate = cranium.geometry.attributes.normal.needsUpdate = true; cranium.geometry.setIndex(I0); hairM.geometry.setIndex(hI0);
          upperLip.geometry.attributes.position.array.set(ulBase); upperLip.geometry.attributes.position.needsUpdate = true; upperLip.geometry.computeVertexNormals();
          mous.geometry.attributes.position.array.set(msBase); mous.geometry.attributes.position.needsUpdate = true; mous.geometry.computeVertexNormals();
          P._ja = -1;
        }
        memo = 'v4';
        dish.visible = true; loTeeth.visible = true;
        setFace4(f);
      } else if (key !== memo) {
        memo = key;
        const ja = JK * (f.jaw || 0);
        jaw.rotation.x = 0.14 * (f.jaw || 0); P._ja = -1;
        const pa = cranium.geometry.attributes.position, A = pa.array;
        A.set(crBase);
        for (const i of front) {
          const x = crBase[3 * i], y = crBase[3 * i + 1], z = crBase[3 * i + 2];
          morph(x, y, z, f, out);
          let X2 = x + out.x, Y2 = y + out.y, Z2 = z + out.z;
          const w = mw[i];
          if (w > 0 && ja > 0) { turnJaw(ja * w, Y2, Z2, tj); Y2 = tj[0]; Z2 = tj[1]; }
          A[3 * i] = X2; A[3 * i + 1] = Y2; A[3 * i + 2] = Z2;
        }
        pa.needsUpdate = true; cranium.geometry.setIndex(ah > 0 ? holeIdx : I0); hairM.geometry.setIndex(ah > 0 ? hHole : hI0); cranium.geometry.computeVertexNormals(); cranium.geometry.computeBoundingSphere();
        const lipSet = (mesh, B, which, rot) => {
          const pl = mesh.geometry.attributes.position;
          for (let i = 0; i < pl.count; i++) {
            const x = B[3 * i], y = B[3 * i + 1], z = B[3 * i + 2];
            morph(x, y, z + 0.0, f, o2, which);
            let X2 = x + o2.x, Y2 = y + o2.y, Z2 = z + o2.z;
            if (rot && ja > 0) { turnJaw(ja * Math.max(0.35, mandW(x, Math.min(y, mouthY(x) - 0.03), Math.max(z, 0.3))), Y2, Z2, tj); Y2 = tj[0]; Z2 = tj[1]; }
            pl.setXYZ(i, X2, Y2, Z2);
          }
          pl.needsUpdate = true; mesh.geometry.computeVertexNormals();
        };
        lipSet(upperLip, ulBase, 'upper', false); lipSet(lowerLip, llBase, 'lower', true); lipSet(mous, msBase, 'upper', false);
      }
      if (active || ah > 0) {
        // the mouth piece: the v4 dish (teeth, tongue) for small openings; the real mouth for "Ah"
        // the v4 mouth piece is sized by the opening: give it the opening the turned mandible really makes
        turnJaw(JK * (f.jaw || 0), llC[1], llC[2], tj);
        const openEq = (f.jaw || 0) > 0 ? Math.max(0, (llC[1] + 0.016 - tj[0]) / 0.2) : 0;
        placeMouth(openEq, f.tongue || 0);
        if (f.smile && !(f.jaw > 0.5)) { mouthG.visible = true; dish.visible = true; const top = mouthY(0) - 0.01 + 0.022 * f.smile; upTeeth.position.y = top + 0.006; loTeeth.visible = false; tongueDown.visible = false; tongueOut.visible = false; dish.scale.y = 0.05 + 0.1 * f.smile; dish.position.y = top - 0.012; }
        else { loTeeth.visible = true; dish.visible = true; }
        ahG.visible = ah > 0;
        if (ah > 0) {
          dish.visible = false; tongueDown.visible = false; tongueOut.visible = false;
          const bot = mouthY(0) - 0.02 - 0.2 * openEq;
          upTeeth.position.set(0, mouthY(0) + 0.004, ML - 0.03); loTeeth.position.set(0, bot + 0.02, ML - 0.05);
          uvG.position.y = MOUTH_Y - 0.07 + 0.04 * ah; uvG.scale.set(1, 1 - 0.15 * ah, 1);
          ahTongue.position.y = bot - 0.02;
        }
      } else ahG.visible = false;
      // eyes: gaze (both together), convergence, pupils, lids
      const gx = (f.gazeX || 0) * rad, gy = (f.gazeY || 0) * rad, cv = (f.converge || 0) * rad, up = f.gazeUp || 0;
      const shut = Math.max(f.blink || 0, f.closed || 0, f.squeeze || 0), sq = f.squeeze || 0, br = f.brows || 0;
      for (const s of ['R', 'L']) {
        const e = eyes[s];
        e.ball.rotation.set(-0.42 * up - gy, -gx + (s === 'R' ? cv : -cv), 0);
        e.upper.rotation.x = -0.16 * up + (-0.45 * gy - 0.26 * br) * (1 - shut) + 0.95 * shut;
        const pull = s === 'R' ? (f.pullR || 0) : 0;
        e.lower.rotation.x = 0.62 * pull - 0.05 * up - 0.2 * Math.min(0, gy) * (1 - shut) - 0.4 * shut - 0.14 * sq;
        e.lower.scale.setScalar(1 + 0.1 * pull);
        e.conjG.rotation.x = (1 - pull) * 0.7; e.conjG.visible = pull > 0.02;
        setPupil(s, f['pupil' + s] == null ? 4.8 : K.clamp(f['pupil' + s], 1, 9));
      }
      for (let k = 0; k < brows.length; k++) {
        const sx = k === 0 ? -1 : 1, bkey = (f.brows || 0).toFixed(4) + (f.squeeze || 0).toFixed(4);
        if (brows[k].userData.key !== bkey) { if (brows[k].userData.key != null || bkey !== '0.00000.0000') { brows[k].geometry.dispose(); brows[k].geometry = K.tube(browPts(sx, f), 0.03, { radial: 10, segments: 18 }); } brows[k].userData.key = bkey; }
      }
      // the tongue to one side (with the tongue out)
      tongueOut.rotation.y = -0.4 * K.clamp(f.tongueX || 0, -1, 1);
    };
    P.FACE_KEYS = ['jaw', 'tongue', 'gazeUp', 'pullR', 'blink', 'gazeX', 'gazeY', 'converge', 'pupilR', 'pupilL', 'closed', 'squeeze', 'brows', 'smile', 'puff', 'ah', 'cheekR', 'cheekL', 'tongueX', 'clench', 'swallow', 'cough', 'round', 'wide', 'viseme'];
  }

  // ================================================================================================ SHOULDERS
  // v4 setArm turns the whole upper arm about the shoulder joint, so with the arm raised forward or out its rounded root
  // swings out behind the shoulder and shows. In the neuro mode, the more the arm is raised from his side, the more the
  // root of the arm (its end cap and the first 6 cm) is drawn in toward the joint centre, inside the top of the
  // shoulder, so the raised arm comes cleanly out of the shoulder. With the arm by his side nothing changes.
  function buildShoulders(N) {
    const { P, torso, arms, D } = N.X, set4 = P.setArm;
    // the upper arm and the elbow, re-skinned: the upper arm keeps the forearm's cross-section carried over by the smallest
    // turn (v4 projects it, which flattens the upper arm when the forearm is square to it), and across the 6 cm of the
    // elbow each ring turns about the joint by its share of the bend (v4 blends straight, which flattens the back of a
    // strongly bent elbow into a cut end). The wrist and the hand are as v4.
    const L1 = D.upperArm, WR = D.upperArm + D.foreArm, e1 = V(0, 0, 0), e2 = V(0, 0, 0), eu = V(0, 0, 0), ef = V(0, 0, 0), ey = V(0, 0, 0), ez = V(0, 0, 0), ew = V(0, 0, 0), ax = V(0, 0, 0), qq = new THREE.Quaternion(), qb = new THREE.Quaternion();
    const qT = new THREE.Quaternion(), pU = V(0, 0, 0);
    const elbow = (a, B, pos) => {
      eu.set(1, 0, 0).applyQuaternion(a.up.quaternion); ef.set(1, 0, 0).applyQuaternion(a.fore.quaternion);
      ey.set(0, 1, 0).applyQuaternion(a.fore.quaternion); ez.set(0, 0, 1).applyQuaternion(a.fore.quaternion);
      const th = eu.angleTo(ef); ax.crossVectors(eu, ef); if (ax.lengthSq() < 1e-10) ax.set(0, 0, 1); ax.normalize();
      qT.setFromUnitVectors(ef, eu);                      // carries the forearm's cross-section onto the upper arm without twisting it
      const Sh = a.up.position, E = a.fore.position;
      for (let i = 0; i < pos.count; i++) {
        const x = B[3 * i]; if (x > L1 + 0.32) continue;
        ew.copy(ey).multiplyScalar(B[3 * i + 1]).addScaledVector(ez, B[3 * i + 2]);
        pU.copy(ew).applyQuaternion(qT).add(Sh).addScaledVector(eu, x);
        const we = K.smooth(L1 - 0.3, L1 + 0.3, x);
        if (we <= 0) { pos.setXYZ(i, pU.x, pU.y, pU.z); continue; }
        e1.copy(pU).sub(E).applyQuaternion(qq.setFromAxisAngle(ax, we * th));
        e2.copy(E).addScaledVector(ef, x - L1).add(ew).sub(E).applyQuaternion(qb.setFromAxisAngle(ax, (we - 1) * th));
        e1.multiplyScalar(1 - we).addScaledVector(e2, we).add(E);
        pos.setXYZ(i, e1.x, e1.y, e1.z);
      }
    };
    const ux = V(0, 0, 0), ur = V(0, 0, 0), a1 = V(0, 0, 0), a2 = V(0, 0, 0);
    P.setArm = (side, wrist, quat, pose, pole) => {
      const W = set4(side, wrist, quat, pose, pole), a = arms[side], m = a.armMesh, pos = m.geometry.attributes.position, B = m.userData.base;
      const Sh = a.up.position, sz = side === 'R' ? 1 : -1;
      ux.set(1, 0, 0).applyQuaternion(a.up.quaternion);
      elbow(a, B, pos);
      torso.updateMatrixWorld(true);
      // the resting direction of the upper arm: down the side of his trunk, a little out
      ur.set(-sz * 0.18 * 0, -1, 0).transformDirection(torso.matrixWorld); ur.add(V(0, 0, 0.18 * sz)).normalize();
      const ang = ux.angleTo(ur); if (ang < 0.35) { pos.needsUpdate = true; m.geometry.computeVertexNormals(); return W; }
      const k0 = K.smooth(0.35, 1.2, ang);
      for (let i = 0; i < pos.count; i++) {
        const x = B[3 * i]; if (x > 0.6) continue;
        const w = k0 * (1 - K.smooth(-0.62, 0.6, x)); if (w <= 0) continue;
        a2.set(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(Sh);
        const along = a2.dot(ux); a1.copy(a2).addScaledVector(ux, -along);
        a1.multiplyScalar(1 - 0.3 * w); a2.copy(a1).addScaledVector(ux, along > 0 ? along : along * (1 - 0.35 * w)).add(Sh);
        pos.setXYZ(i, a2.x, a2.y, a2.z);
      }
      pos.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere();
      return W;
    };
  }

  // ================================================================================================ RECLINE (runtime)
  // His trunk (with the head, the shoulders and the pyjama pants) turns with the backrest about his hips: the pelvis
  // slides a little along the backrest so the hips stay where they are (they sit at the hinge of the bed). The legs
  // stay on the flat part of the mattress. Use with bed.setBackrest(deg) (bed.js) and re-apply the arms after.
  function buildRecline(N) {
    const { P, D, torso, flat, O } = N.X;
    const Xh = BED.DIM.Xh, Ym = BED.DIM.Ym, r45 = Math.PI / 4, c45 = (D.backOff - D.s0) * Math.sin(r45);
    const O45 = O.clone(), Q45 = torso.quaternion.clone();
    let deg = flat ? 0 : 45;
    P.setRecline = (d) => {
      if (flat) throw new Error("P.setRecline: built with pose 'flat'; build the reclined45 patient to lower and raise the backrest");
      d = K.clamp(d, 0, 80); if (Math.abs(d - deg) < 1e-6) return; deg = d;
      if (Math.abs(d - 45) < 1e-9) { torso.position.copy(O45); torso.quaternion.copy(Q45); return; }
      const th = d * rad, slope = V(-Math.cos(th), Math.sin(th), 0), nrm = V(Math.sin(th), Math.cos(th), 0);
      const s0 = (D.backOff * Math.sin(th) - c45) / Math.cos(th);
      torso.position.set(Xh, Ym, 0).addScaledVector(slope, s0).addScaledVector(nrm, D.backOff);
      torso.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, -1), slope, nrm));
    };
    P.recline = () => deg;
  }
})(typeof window !== 'undefined' ? window : globalThis);
