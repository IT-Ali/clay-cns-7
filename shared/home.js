// shared/home.js (v4): the HOME POSES of the patient's arms and the examiner's hands, for both modes, so every part
// starts and ends on exactly the same picture. Classic script; needs THREE, HANDS, BED (load after sheet.js). Defines
// window.HOME.
//
//   HOME.restArm(side, mode, SH, P) -> { wrist, quat, pose, pole }       the patient's arm at rest (P.setArm); flat mode with
//                                  P (as HOME.apply does): the hand settled ON the sheet (palm, each finger, thumb)
//   HOME.exRest(side, mode, SH)    -> { contact, at, quat, pose, back }   the examiner's hand at rest (before solving)
//        side 'R' | 'L'; mode 'reclined45' (default) | 'flat'; SH = the sheet from SHEET.build (the poses rest on it)
//   HOME.solveEx(EX, side, st)     -> { wrist, quat, pose, back }   puts the contact on its point (cvs1's exSolve)
//   HOME.applyArm(P, side, st)     P.setArm with an arm state (cvs1's applyArm)
//   HOME.applyEx(EX, side, st)     places an examiner hand and its forearm (cvs1's applyEx)
//   HOME.apply(P, EX, SH, mode)    all four at once: both arms of the patient, both examiner hands
//   HOME.handGaps(hand, surface)   { palm, index, middle, ring, little, thumb } -> { gap, at }: the lowest point of each
//                                  part above surface(x, z) (negative = sinking in); used to check resting hands
//
// 'reclined45' returns EXACTLY what restArm and exRest in cvs1-style.js return (they are copied unchanged).
// v5 'cns' (neuro patient, sheet from the foot): HOME.apply(P, EX, SH, 'cns') also sets his CNS home state
// (HOME.cnsPatient: trousers rolled above the knees, oedema 0, legs and head straight, trunk at 45 degrees); his arms
// rest as in 'reclined45', the examiner's hands rest flat at his right side (HOME.CNS). SET.HOME_CNS is the camera.
// 'flat': his arms lie by his sides on the mattress, palms down, the hands resting on the top of the sheet beside his
// thighs; the examiner's gloved hands rest at his right side on the sheet near the mattress edge, palms down, fingers
// together and flat.
(function (root) {
  const THREE = root.THREE, HANDS = root.HANDS, BED = root.BED;
  const HOME = (root.HOME = {});
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const q = (f, d) => HANDS.quat(f, d);
  HOME.MODES = ['reclined45', 'flat', 'cns'];
  const check = (mode, SH) => {
    if (!HOME.MODES.includes(mode)) throw new Error('HOME: unknown mode ' + mode);
    if (!SH || !SH.heightAt) throw new Error('HOME: pass the sheet (SHEET.build result) as the third argument');
  };

  // ---------------------------------------------------------------- reclined45: copied from cvs1-style.js unchanged
  const relaxed = { all: [0.22, 0.32, 0.18], spread: 0.8, thumb: [0.15, 0, 0.12, 0.08] };
  const pole = (side) => V(0, -1, side === 'R' ? 0.7 : -0.7);
  const restArm45 = (side, hs) => {
    const sz = side === 'R' ? 1 : -1, x = 0.15, z = sz * 2.6;
    return { wrist: V(x, Math.max(hs(x, z), hs(x + 0.9, z)) + 0.19, z), quat: q(V(1, -0.1, -sz * 0.12), V(0, 1, 0)), pose: relaxed, pole: pole(side) };
  };
  const exRest45 = (side, hs) => {
    const x = side === 'R' ? 2.9 : -0.9, z = 3.75;
    return { contact: 'palm', at: V(x, hs(x, z) + 0.012, z), quat: q(V(side === 'R' ? -0.75 : 0.75, -0.04, -0.66), V(0, 1, 0)), pose: { all: [0.16, 0.24, 0.14], spread: 0.8, thumb: [0.12, 0, 0.1, 0.06] }, back: V(side === 'R' ? 0.8 : -0.8, -0.04, 0.75) };
  };

  // ---------------------------------------------------------------- flat
  HOME.FLAT = {
    arm: { dx: 0.38, z: 2.55, lift: 0.125 },        // wrist 3.8 cm past the sheet's top edge (the hand lies on the sheet, the forearm across the hem), 25.5 cm out from his midline
    armPose: { all: [0.1, 0.16, 0.1], spread: 0.75, thumb: [0.12, 0, 0.1, 0.06] },
    ex: { R: [3.3, 3.78], L: [1.05, 3.78] },       // palm centres (x, z) on the sheet near the mattress edge at his right
    exPose: { all: [0.02, 0.03, 0.02], fan: { index: 0.07, middle: 0.0, ring: -0.06, little: -0.12 }, thumb: [0.08, 0, 0.05, 0.03] },   // flat hand, fingers together, thumb alongside (the curls are then solved so each part rests ON the sheet)
    restGap: 0.0005,                               // the gap left under each resting part of the glove (0.05 mm; never into the sheet)
  };
  const restArmFlat = (side, hs, SH, P) => {
    const sz = side === 'R' ? 1 : -1, F = HOME.FLAT.arm, x = SH.x0 + F.dx, z = sz * F.z, Ym = BED.DIM.Ym;
    let top = SH.hemTop ? SH.hemTop(z) - 0.06 : Ym; for (let k = 0; k <= 6; k++) top = Math.max(top, hs(x + 0.2 * k, z));
    // the hand lies on the sheet where it slopes up over his thigh: the back of the hand faces the sheet's normal there
    const cx = x + 0.95, e = 0.25, nrm = V(-(hs(cx + e, z) - hs(cx - e, z)) / (2 * e), 1, -(hs(cx, z + e) - hs(cx, z - e)) / (2 * e)).normalize();
    const st = { wrist: V(x, top + F.lift, z), quat: q(V(1, -0.12, sz * 0.06), nrm), pose: HOME.FLAT.armPose, pole: V(0, -0.35, sz) };
    return P ? settleArm(P, side, st, hs) : st;
  };
  // Settle his resting hand ON the sheet (flat mode): his palm (the palm skin of his arm piece) down to restGap above the
  // sheet, then each finger and the thumb bend at their knuckles until they rest on it too; nothing sinks in.
  const armGaps = (P, side, surf) => {
    const hand = P.arms[side].hand, g = HOME.handGaps(hand, surf), m = P.arms[side].armMesh, c = hand.world('palm'), A = m.geometry.attributes.position;
    let best = { gap: Infinity, at: null };
    for (let i = 0; i < A.count; i++) { _v.fromBufferAttribute(A, i); if (_v.distanceTo(c) > 0.5) continue; const gg = _v.y - surf(_v.x, _v.z); if (gg < best.gap) best = { gap: gg, at: _v.clone() }; }
    g.palm = best.gap < g.palm.gap ? best : g.palm;
    return g;
  };
  const settleArm = (P, side, st, surf) => {
    const gap0 = HOME.FLAT.restGap, base = st.pose, curl = {}, th = (base.thumb || [0.12, 0, 0.1, 0.06]).slice(), hand = P.arms[side].hand;
    for (const k of Object.keys(hand.fingers)) curl[k] = ((base.curl && base.curl[k]) || base.all).slice();
    const out = Object.assign({}, st, { wrist: st.wrist.clone() }), pose = () => Object.assign({}, base, { curl, thumb: th });
    for (let it = 0; it < 14; it++) {
      out.pose = pose(); P.setArm(side, out.wrist, out.quat, out.pose, out.pole);
      const g = armGaps(P, side, surf);
      out.wrist.y += gap0 - g.palm.gap;
      if (it < 3) continue;
      for (const k of Object.keys(curl)) curl[k][0] = Math.max(-0.3, Math.min(0.9, curl[k][0] + (g[k].gap - gap0) / 0.8));
      const tg = (g.thumb.gap - gap0) / 2; th[2] = Math.max(-0.4, Math.min(0.8, th[2] + tg / 0.35)); th[3] = Math.max(-0.3, Math.min(0.6, th[3] + tg / 0.6));
    }
    out.pose = pose(); P.setArm(side, out.wrist, out.quat, out.pose, out.pole);
    { const g = armGaps(P, side, surf), mn = Math.min(...Object.values(g).map((q2) => q2.gap)); if (mn < gap0) out.wrist.y += gap0 - mn; }   // nothing below the sheet
    P.setArm(side, out.wrist, out.quat, out.pose, out.pole);
    return out;
  };
  const exRestFlat = (side, hs) => {
    const [x, z] = HOME.FLAT.ex[side], sx = side === 'R' ? -1 : 1;
    return { contact: 'palm', at: V(x, hs(x, z) + 0.012, z), quat: q(V(sx * 0.55, 0, -0.83), V(0, 1, 0)), pose: HOME.FLAT.exPose, back: V(-sx * 0.55, -0.05, 0.83), rest: { surface: hs } };
  };

  // ---------------------------------------------------------------- resting a hand ON a surface (flat mode)
  // The gap from each part of a hand (palm, each finger, the thumb) to a height field surface(x, z): the lowest point of
  // each part, measured straight down. Negative = into the surface.
  const _v = V(0, 0, 0);
  HOME.handGaps = (hand, surface) => {
    const parts = { palm: [] }, F = hand.fingers;
    for (const k of Object.keys(F)) parts[k] = [F[k].mcp];
    parts.thumb = [hand.thumb.mcp];                                          // the thumb's two phalanges
    for (const c of hand.body.children) if (c.isMesh) parts.palm.push(c);
    for (const c of hand.thumb.meta.children) if (c.isMesh) parts.palm.push(c);   // its metacarpal lies in the thenar mound: palm
    hand.group.updateMatrixWorld(true);
    const out = {};
    for (const [name, roots] of Object.entries(parts)) {
      let best = { gap: Infinity, at: null };
      for (const r of roots) (r.isMesh ? [r] : [r]).forEach((r0) => r0.traverse((m) => {
        if (!m.isMesh || !m.visible) return; const P = m.geometry.attributes.position;
        for (let i = 0; i < P.count; i++) { _v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); const g = _v.y - surface(_v.x, _v.z); if (g < best.gap) best = { gap: g, at: _v.clone() }; }
      }));
      out[name] = best;
    }
    return out;
  };
  // Settle a resting hand onto the surface: the palm is lowered or lifted until its lowest point is restGap above the
  // surface, then each finger and the thumb bend (or straighten) at their knuckles until their pads rest on it too.
  const settle = (hand, st) => {
    const surf = st.rest.surface, gap0 = HOME.FLAT.restGap, base = st.pose, curl = {}, th = (base.thumb || [0.15, 0, 0.12, 0.08]).slice();
    for (const k of Object.keys(hand.fingers)) curl[k] = ((base.curl && base.curl[k]) || base.all).slice();
    const at = st.at.clone(), pose = () => Object.assign({}, base, { curl, thumb: th }), Z = V(0, 0, 1);
    let pitch = 0, quat = st.quat.clone();
    const turn = () => { quat = st.quat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Z, pitch)); };
    for (let it = 0; it < 18; it++) {
      hand.pose(pose()); HANDS.place(hand, st.contact, at, quat);
      const g = HOME.handGaps(hand, surf), fk = Object.keys(curl);
      at.y += gap0 - g.palm.gap;
      // the hand tips up (or down) about its knuckles until the fingers as a whole lie on the surface ...
      if (it < 7) { const gf = fk.reduce((m, k) => m + g[k].gap, 0) / fk.length; pitch = Math.max(-0.3, Math.min(0.3, pitch - (gf - gap0) / 1.1)); turn(); continue; }
      // ... then each finger and the thumb settle at its knuckle
      for (const k of fk) curl[k][0] = Math.max(-0.15, Math.min(0.6, curl[k][0] + (g[k].gap - gap0) / 0.8));
      const tg = (g.thumb.gap - gap0) / 2;            // the thumb: a little swing (it stays alongside the index) and its joints
      th[0] = Math.max(-0.15, Math.min(0.6, th[0] + tg / 0.5)); th[2] = Math.max(-0.45, Math.min(0.6, th[2] + tg / 0.35)); th[3] = Math.max(-0.3, Math.min(0.5, th[3] + tg / 0.6));
    }
    hand.pose(pose()); HANDS.place(hand, st.contact, at, quat);
    { const g = HOME.handGaps(hand, surf); at.y += gap0 - Math.min(...Object.values(g).map((q2) => q2.gap)); }   // nothing below the surface
    hand.pose(pose()); HANDS.place(hand, st.contact, at, quat);
    return Object.assign({}, st, { at, quat, pose: pose() });
  };

  // ---------------------------------------------------------------- v5: cns (the neurological examination)
  // Reclined at 45 degrees exactly as the cardiovascular home shot; the sheet folded at the foot of the bed
  // (SHEET.build(S, P, { from: 'foot' })), so his arms rest as in the 45-degree home (now on the bare mattress beside his
  // thighs); the examiner's gloved hands rest at his right side on the mattress near its edge, palms down, fingers
  // together and flat (never upright), settled onto the mattress like the flat-mode hands.
  HOME.CNS = {
    ex: { R: [3.5, 3.72], L: [0.9, 3.72] },
    exPose: HOME.FLAT.exPose,
    patient: { trouserRoll: 1, oedema: 0, recline: 45 },
  };
  const exRestCns = (side, hs) => {
    const [x, z] = HOME.CNS.ex[side], sx = side === 'R' ? -1 : 1;
    return { contact: 'palm', at: V(x, hs(x, z) + 0.012, z), quat: q(V(sx * 0.55, 0, -0.83), V(0, 1, 0)), pose: HOME.CNS.exPose, back: V(-sx * 0.55, -0.05, 0.83), rest: { surface: hs } };
  };
  // the patient's whole CNS home state (neuro patient): trousers rolled above the knees, normal ankles, legs straight,
  // head straight, no shrug, trunk at 45 degrees. Applied by HOME.apply(P, EX, SH, 'cns').
  HOME.cnsPatient = (P) => {
    if (!P.neuro) throw new Error("HOME 'cns' needs the neuro patient: PATIENT.build(S, { neuro: true })");
    const C = HOME.CNS.patient;
    if (P.recline && P.recline() !== C.recline) P.setRecline(C.recline);
    P.setShrug(0); P.setHead({}); P.setTrouserRoll(C.trouserRoll); P.setOedema(C.oedema); P.setRoll(0);
    for (const s of ['R', 'L']) { P.setLeg(s, {}); P.setPit(s, 0); }
  };

  // v5: lowering and raising the backrest during a part (meningism: supine, no pillow). Sets the bed (bed.setBackrest),
  // his trunk (P.setRecline), the pillow (on: placed under his head for the angle; off: hidden and his head extends
  // until the back of it rests on the mattress), and his resting arms (as in the 45-degree home, the hands moving along
  // the mattress with his shoulders). Returns { headFlex, arms: { R, L } }. Call it again with 45 and pillow on to get the
  // exact home back. opts: { pillow: true|false, arms: true|false, headFlex (a head flexion to keep, overrides the
  // resting extension) }.
  HOME.recline = (P, bed, SH, deg, opts = {}) => {
    const pillow = opts.pillow !== false;
    bed.setBackrest(deg); P.setRecline(deg); bed.setPillow(pillow);
    let headFlex = opts.headFlex != null ? opts.headFlex : 0;
    const hp = P.headPose();
    if (pillow) { P.setHead(Object.assign({}, hp, { flex: headFlex })); bed.placePillow(P.headBack(), deg === 45 ? 7.15 : HOME.pillowS(P)); }
    else if (opts.headFlex == null) {
      // the back of his head comes down onto the mattress (the backrest's surface under it)
      const gap = (f) => { P.setHead(Object.assign({}, hp, { flex: f })); const h = P.headBack(), n = BED.normal, o = new THREE.Vector3(BED.DIM.Xh, BED.DIM.Ym, 0); return h.clone().sub(o).dot(n) - 0.07; };
      let lo = -40, hi = 25; if (gap(hi) > 0) headFlex = hi; else { for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (gap(m) > 0) lo = m; else hi = m; } headFlex = (lo + hi) / 2; }
      P.setHead(Object.assign({}, hp, { flex: headFlex }));
    } else P.setHead(Object.assign({}, hp, { flex: headFlex }));
    const arms = {};
    if (opts.arms !== false) for (const s of ['R', 'L']) { arms[s] = HOME.restArmAt(P, s, SH); HOME.applyArm(P, s, arms[s]); }
    return { headFlex, arms };
  };
  // the distance along the backrest from the hinge to the middle of the pillow for the current angle
  HOME.pillowS = (P) => { const h = P.headBack(), o = new THREE.Vector3(BED.DIM.Xh, BED.DIM.Ym, 0); return h.clone().sub(o).dot(BED.slope) - 0.3; };
  // his arm at rest for the current recline: the 45-degree rest pose, the hand moved along the mattress so it stays in
  // reach of the shoulder (identical to HOME.restArm(side, 'reclined45', SH) at 45 degrees)
  HOME.restArmAt = (P, side, SH) => {
    const st = HOME.restArm(side, 'reclined45', SH);
    if (!P.recline || Math.abs(P.recline() - 45) < 1e-9) return st;
    const sh = P.shoulder(side), x = Math.min(0.15, sh.x + 4.95), sz = side === 'R' ? 1 : -1, z = sz * 2.6, hs = (a, b) => SH.heightAt(a, b);
    return Object.assign({}, st, { wrist: V(x, Math.max(hs(x, z), hs(x + 0.9, z)) + 0.19, z) });
  };

  HOME.restArm = (side, mode = 'reclined45', SH, P) => {
    check(mode, SH); const hs = (x, z) => SH.heightAt(x, z);
    return mode === 'flat' ? restArmFlat(side, hs, SH, P) : restArm45(side, hs);
  };
  HOME.exRest = (side, mode = 'reclined45', SH) => {
    check(mode, SH); const hs = (x, z) => SH.heightAt(x, z);
    return mode === 'flat' ? exRestFlat(side, hs) : mode === 'cns' ? exRestCns(side, hs) : exRest45(side, hs);
  };

  // ---------------------------------------------------------------- applying the states (cvs1's helpers)
  HOME.solveEx = (EX, side, st) => {
    const hand = EX[side].hand;
    if (st.rest) st = settle(hand, st);          // flat mode: rest ON the sheet (reclined states have no .rest: unchanged)
    hand.pose(st.pose);
    const w = HANDS.place(hand, st.contact, st.at, st.quat);
    return { wrist: w, quat: st.quat.clone(), pose: st.pose, back: st.back || V(0, -0.3, 1) };
  };
  HOME.applyArm = (P, side, st) => P.setArm(side, st.wrist, st.quat, st.pose, st.pole);
  HOME.applyEx = (EX, side, st) => { const a = EX[side]; a.hand.pose(st.pose); if (st.thumbQ) { const t = a.hand.thumb; t.meta.quaternion.copy(st.thumbQ[0]); t.mcp.quaternion.copy(st.thumbQ[1]); t.ip.quaternion.copy(st.thumbQ[2]); } a.hand.group.position.copy(st.wrist); a.hand.group.quaternion.copy(st.quat); a.follow(st.back); };
  HOME.apply = (P, EX, SH, mode = 'reclined45') => {
    if (mode === 'cns') HOME.cnsPatient(P);
    for (const s of ['R', 'L']) HOME.applyArm(P, s, HOME.restArm(s, mode, SH, P));
    if (EX) for (const s of ['R', 'L']) HOME.applyEx(EX, s, HOME.solveEx(EX, s, HOME.exRest(s, mode, SH)));
  };
})(typeof window !== 'undefined' ? window : globalThis);
