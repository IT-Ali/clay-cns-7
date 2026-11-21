// src/contact.js: contacts between the examiner's gloved hands (and the hammer) and the patient's skin, measured on the
// real meshes. Classic script; needs THREE, K, HANDS. Defines window.CONTACT. Nothing in shared/ is changed.
//
//   CONTACT.field(meshes)               a signed distance to the union of the meshes' surfaces as they are posed NOW
//                                       (closest point on the nearest triangle; sign from the interpolated vertex normal)
//     .query(p, R) -> { d, q, n }       d < 0 = inside the skin; Infinity when nothing is within R
//   CONTACT.gapNear(hand, contact, field, r)   the smallest signed gap from the hand's vertices within r of a contact
//                                       point (the part that touches) to the skin -> { gap, at, q }
//   CONTACT.partGaps(hand, field, parts)       per named part (palm, thumb, index, ...): the smallest signed gap
//   CONTACT.rest(hand, contact, at, normal, quat, field, gap)   places the hand so the contact region rests `gap` above the skin
//   CONTACT.thumbIK(hand, scale, Pt, n) -> [meta, mcp, ip] local quaternions: the thumb pad on Pt facing into n (cvs1)
//   CONTACT.curlToTouch(hand, fingers, field, base, gap)  curls each finger until its pad rests on the skin
//   CONTACT.hammerStrike(...)           the hand and the hammer at the moment of a strike (see below)
(function (root) {
  const THREE = root.THREE, K = root.K, HANDS = root.HANDS;
  const CONTACT = (root.CONTACT = {});
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------------------------------------------------------------- the skin field
  CONTACT.field = (meshes, o = {}) => {
    const cell = o.cell || 0.08, tris = [], grid = new Map();
    const key = (i, j, k) => (i * 73856093) ^ (j * 19349663) ^ (k * 83492791);
    const a = V(0, 0, 0), b = V(0, 0, 0), c = V(0, 0, 0), na = V(0, 0, 0), nb = V(0, 0, 0), nc = V(0, 0, 0), nm = new THREE.Matrix3();
    for (const m of meshes) {
      if (!m || !m.visible) continue;
      m.updateMatrixWorld(true);
      const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, I = g.index, mw = m.matrixWorld;
      nm.getNormalMatrix(mw);
      const n = I ? I.count / 3 : P.count / 3;
      const W = new Float32Array(P.count * 3), WN = new Float32Array(P.count * 3);
      for (let i = 0; i < P.count; i++) {
        a.fromBufferAttribute(P, i).applyMatrix4(mw); W[3 * i] = a.x; W[3 * i + 1] = a.y; W[3 * i + 2] = a.z;
        if (N) { na.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); WN[3 * i] = na.x; WN[3 * i + 1] = na.y; WN[3 * i + 2] = na.z; }
      }
      for (let t = 0; t < n; t++) {
        const i0 = I ? I.getX(3 * t) : 3 * t, i1 = I ? I.getX(3 * t + 1) : 3 * t + 1, i2 = I ? I.getX(3 * t + 2) : 3 * t + 2;
        const T = { W, WN, i0, i1, i2 };
        const id = tris.push(T) - 1;
        let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        for (const ii of [i0, i1, i2]) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], W[3 * ii + k]); hi[k] = Math.max(hi[k], W[3 * ii + k]); }
        for (let i = Math.floor(lo[0] / cell); i <= Math.floor(hi[0] / cell); i++) for (let j = Math.floor(lo[1] / cell); j <= Math.floor(hi[1] / cell); j++) for (let k = Math.floor(lo[2] / cell); k <= Math.floor(hi[2] / cell); k++) {
          const kk = key(i, j, k); let l = grid.get(kk); if (!l) grid.set(kk, (l = [])); l.push(id);
        }
      }
    }
    const cp = V(0, 0, 0), e0 = V(0, 0, 0), e1 = V(0, 0, 0), v = V(0, 0, 0);
    // closest point on triangle (Ericson) -> barycentrics
    const closest = (p, A, B, C, out) => {
      e0.subVectors(B, A); e1.subVectors(C, A); v.subVectors(p, A);
      const d1 = e0.dot(v), d2 = e1.dot(v);
      if (d1 <= 0 && d2 <= 0) return out.set(1, 0, 0);
      const bp = V(0, 0, 0).subVectors(p, B), d3 = e0.dot(bp), d4 = e1.dot(bp);
      if (d3 >= 0 && d4 <= d3) return out.set(0, 1, 0);
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const w = d1 / (d1 - d3); return out.set(1 - w, w, 0); }
      const cpp = V(0, 0, 0).subVectors(p, C), d5 = e0.dot(cpp), d6 = e1.dot(cpp);
      if (d6 >= 0 && d5 <= d6) return out.set(0, 0, 1);
      const vb = d5 * d2 - d1 * d6;
      if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return out.set(1 - w, 0, w); }
      const va = d3 * d6 - d5 * d4;
      if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return out.set(0, 1 - w, w); }
      const den = 1 / (va + vb + vc), vv = vb * den, ww = vc * den; return out.set(1 - vv - ww, vv, ww);
    };
    const bc = V(0, 0, 0), q = V(0, 0, 0), nn = V(0, 0, 0), seen = new Set();
    const query = (p, R = 0.06) => {
      let best = { d: Infinity, q: null, n: null }, bd = R * R;
      seen.clear();
      for (let i = Math.floor((p.x - R) / cell); i <= Math.floor((p.x + R) / cell); i++) for (let j = Math.floor((p.y - R) / cell); j <= Math.floor((p.y + R) / cell); j++) for (let k = Math.floor((p.z - R) / cell); k <= Math.floor((p.z + R) / cell); k++) {
        const l = grid.get(key(i, j, k)); if (!l) continue;
        for (const id of l) {
          if (seen.has(id)) continue; seen.add(id);
          const T = tris[id], W = T.W;
          a.set(W[3 * T.i0], W[3 * T.i0 + 1], W[3 * T.i0 + 2]); b.set(W[3 * T.i1], W[3 * T.i1 + 1], W[3 * T.i1 + 2]); c.set(W[3 * T.i2], W[3 * T.i2 + 1], W[3 * T.i2 + 2]);
          closest(p, a, b, c, bc);
          q.set(0, 0, 0).addScaledVector(a, bc.x).addScaledVector(b, bc.y).addScaledVector(c, bc.z);
          const dd = q.distanceToSquared(p);
          if (dd < bd) {
            bd = dd; const WN = T.WN;
            nn.set(0, 0, 0).addScaledVector(na.set(WN[3 * T.i0], WN[3 * T.i0 + 1], WN[3 * T.i0 + 2]), bc.x).addScaledVector(nb.set(WN[3 * T.i1], WN[3 * T.i1 + 1], WN[3 * T.i1 + 2]), bc.y).addScaledVector(nc.set(WN[3 * T.i2], WN[3 * T.i2 + 1], WN[3 * T.i2 + 2]), bc.z).normalize();
            const s = Math.sign(cp.subVectors(p, q).dot(nn)) || 1;
            best = { d: s * Math.sqrt(dd), q: q.clone(), n: nn.clone() };
          }
        }
      }
      return best;
    };
    return { query, tris: tris.length };
  };

  // ---------------------------------------------------------------- gaps
  const _w = V(0, 0, 0);
  const meshesOf = (roots) => { const out = []; for (const r of roots) r.traverse((m) => { if (m.isMesh && m.visible) out.push(m); }); return out; };
  CONTACT.handParts = (hand) => {
    const F = hand.fingers, body = hand.body.children.filter((c) => c.isMesh);
    const own = (g) => g.children.filter((c) => c.isMesh);   // a joint's own meshes (not its children's)
    const parts = { palm: body.concat(own(hand.thumb.meta)) };
    for (const k of Object.keys(F)) { parts[k] = own(F[k].mcp).concat(own(F[k].pip), own(F[k].dip)); parts[k + 'Tip'] = own(F[k].dip); }
    parts.thumb = own(hand.thumb.mcp).concat(own(hand.thumb.ip)); parts.thumbTip = own(hand.thumb.ip);
    return parts;
  };
  // the smallest gap over the vertices of `meshes` (optionally only those within r of a point)
  CONTACT.minGap = (meshes, field, near, r, R = 0.06, step = 1) => {
    let best = { gap: Infinity, at: null, q: null };
    for (const m of meshes) {
      m.updateMatrixWorld(true); const P = m.geometry.attributes.position;
      for (let i = 0; i < P.count; i += step) {
        _w.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
        if (near && _w.distanceTo(near) > r) continue;
        const h = field.query(_w, R);
        if (h.d < best.gap) best = { gap: h.d, at: _w.clone(), q: h.q };
      }
    }
    return best;
  };
  CONTACT.gapNear = (hand, contact, field, r = 0.09) => {
    hand.group.updateMatrixWorld(true);
    return CONTACT.minGap(meshesOf([hand.group]), field, hand.world(contact), r, 0.15);
  };
  CONTACT.partGaps = (hand, field, names) => {
    hand.group.updateMatrixWorld(true);
    const parts = CONTACT.handParts(hand), out = {};
    for (const n of names || Object.keys(parts)) out[n] = CONTACT.minGap(parts[n], field, null, 0, 0.15);
    return out;
  };

  // ---------------------------------------------------------------- placing
  // put a contact of a hand on a point, then slide the hand along the skin normal until the region around the contact
  // rests exactly `gap` above the skin (measured, not assumed)
  CONTACT.rest = (hand, contact, at, normal, quat, field, gap = 0.0005, r = 0.09) => {
    let off = gap;
    for (let it = 0; it < 6; it++) {
      HANDS.place(hand, contact, at.clone().addScaledVector(normal, off), quat);
      const g = CONTACT.gapNear(hand, contact, field, r);
      if (!isFinite(g.gap)) { off -= 0.01; continue; }
      if (Math.abs(g.gap - gap) < 0.0001) break;
      off += gap - g.gap;
    }
    return hand.group.position.clone();
  };

  // the thumb placed joint by joint so its pad sits on Pt facing into the skin (normal n): from cvs1-style.js (thumbIK),
  // with the hand's scale as a parameter
  const PAD = [0.174, -0.1169];
  const segQ = (dir, nail) => { const x = dir.clone().normalize(), y = nail.clone().addScaledVector(x, -nail.dot(x)).normalize(), z = new THREE.Vector3().crossVectors(x, y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
  CONTACT.thumbIK = (hand, Pt, n, along, tilt = 0) => {
    // solved in the hand's own frame (a left hand is a mirrored right hand: in its own frame it is an ordinary right
    // hand, and lengths are in hand units), so it works the same for both hands
    hand.group.updateMatrixWorld(true);
    const inv = hand.group.matrixWorld.clone().invert(), lin = new THREE.Matrix3().setFromMatrix4(inv);
    const P = Pt.clone().applyMatrix4(inv), N = n.clone().applyMatrix3(lin).normalize();
    const C = hand.thumb.base.position.clone();
    const t = along ? along.clone().applyMatrix3(lin) : P.clone().sub(C); t.addScaledVector(N, -t.dot(N)).normalize();   // the thumb lies across the skin
    // tilt: the distal phalanx turned about the pad, its tip lifted away from the skin (for a concave place like a crease)
    const ct = Math.cos(tilt), st = Math.sin(tilt), t2 = t.clone().multiplyScalar(ct).addScaledVector(N, st), N2 = N.clone().multiplyScalar(ct).addScaledVector(t, -st);
    const B = P.clone().addScaledVector(t2, -PAD[0]).addScaledVector(N2, -PAD[1]);   // the IP joint
    const r1 = 0.42, r2 = 0.32, e = B.clone().sub(C), d = Math.min(e.length(), r1 + r2 - 1e-4); e.normalize();
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const wv = N2.clone().addScaledVector(e, -N2.dot(e)).normalize();                   // the knuckle bulges away from the skin
    const Am = C.clone().addScaledVector(e, a).addScaledVector(wv, h);
    const qm = segQ(Am.clone().sub(C), N2), qp = segQ(B.clone().sub(Am), N2), qd = segQ(t2, N2);
    return [qm, qm.clone().invert().multiply(qp), qp.clone().invert().multiply(qd)];
  };
  // the thumb pad `gap` above the skin at T (normal n), its tip tilted just enough that no part of the thumb sinks in
  CONTACT.thumbOn = (hand, T, n, field, gap = 0.0006, along) => {
    const parts = CONTACT.handParts(hand); let best = null;
    hand.group.updateMatrixWorld(true);
    const base = hand.thumb.base.getWorldPosition(new THREE.Vector3()), t0 = (along ? along.clone() : T.clone().sub(base)); t0.addScaledVector(n, -t0.dot(n)).normalize();
    for (let phi = -1.2; phi <= 1.21; phi += 0.2) for (let tilt = -0.4; tilt <= 0.41; tilt += 0.1) {
      const dir = t0.clone().applyAxisAngle(n, phi);
      let off = gap, tq = null, g = null;
      for (let it = 0; it < 6; it++) {
        tq = CONTACT.thumbIK(hand, T.clone().addScaledVector(n, off), n, dir, tilt); CONTACT.setThumbQ(hand, tq);
        g = CONTACT.gapNear(hand, 'thumbPad', field, 0.05);
        if (!isFinite(g.gap) || Math.abs(g.gap - gap) < 0.00012) break;
        off += gap - g.gap;
      }
      const all = CONTACT.minGap(parts.thumb.concat(parts.palm), field, null, 0, 0.15).gap;
      const e = Math.abs(g.gap - gap) + 4 * Math.max(0, -all) + 0.0004 * Math.abs(phi);
      if (!best || e < best.e) best = { e, tq, tilt, phi, pad: g.gap, all };
    }
    CONTACT.setThumbQ(hand, best.tq);
    return best;
  };
  // a thumb pressed on a point by orienting the WHOLE hand (the thumb's own pose fixed): the pad faces into the skin,
  // the thumb lies along a direction turned by psi about the normal; score(hand, psi) picks the best turn (lower is
  // better); the pad is then slid along the normal until it rests `gap` above the skin. Returns { quat, wrist, psi }.
  CONTACT.thumbPress = (hand, T, n, t0, poses, field, score, gap = 0.0006) => {
    let best = null;
    for (const pose of poses) {
      hand.pose(pose); hand.group.position.set(0, 0, 0); hand.group.quaternion.identity(); hand.group.updateMatrixWorld(true);
      const ipW = hand.thumb.ip.matrixWorld, a = new THREE.Vector3(1, 0, 0).transformDirection(ipW), pn = new THREE.Vector3(0, -1, 0).transformDirection(ipW);
      pn.addScaledVector(a, -pn.dot(a)).normalize();
      const Mloc = new THREE.Matrix4().makeBasis(a, pn, new THREE.Vector3().crossVectors(a, pn)).invert();
      for (const beta of [0, 0.35, 0.7, 1.0]) for (let psi = -Math.PI; psi < Math.PI; psi += Math.PI / 18) {
        const t = t0.clone().addScaledVector(n, -t0.dot(n)).normalize().applyAxisAngle(n, psi);
        const ax = t.clone().multiplyScalar(Math.cos(beta)).addScaledVector(n, -Math.sin(beta));         // the thumb points into the skin by beta
        const pd = n.clone().multiplyScalar(-Math.cos(beta)).addScaledVector(t, -Math.sin(beta));        // its pad faces the skin
        const quat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax, pd, new THREE.Vector3().crossVectors(ax, pd)).multiply(Mloc));
        const contact = beta > 0.5 ? 'thumbTip' : 'thumbPad';
        HANDS.place(hand, contact, T.clone().addScaledVector(n, gap + (beta > 0.5 ? 0.012 : 0)), quat);
        const sc = score(hand, psi, beta);
        if (!best || sc < best.sc) best = { sc, quat: quat.clone(), psi, beta, pose, contact };
      }
    }
    hand.pose(best.pose);
    CONTACT.rest(hand, best.contact, T, n, best.quat, field, gap, 0.05);
    return { quat: best.quat, wrist: hand.group.position.clone(), psi: best.psi, beta: best.beta, pose: best.pose, contact: best.contact, score: best.sc };
  };
  // a cheap solid for deep checks: capsules [a, b, r]; negative = inside
  CONTACT.capsules = (caps) => (p) => { let d = Infinity; const ab = new THREE.Vector3(), ap = new THREE.Vector3(); for (const [a, b, r] of caps) { ab.subVectors(b, a); ap.subVectors(p, a); const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.lengthSq())); d = Math.min(d, ap.addScaledVector(ab, -t).length() - r); } return d; };
  CONTACT.minSdf = (meshes, sdf, step = 3) => { let m = Infinity; const w = new THREE.Vector3(); for (const me of meshes) { me.updateMatrixWorld(true); const P = me.geometry.attributes.position; for (let i = 0; i < P.count; i += step) { w.fromBufferAttribute(P, i).applyMatrix4(me.matrixWorld); m = Math.min(m, sdf(w)); } } return m; };
  CONTACT.setThumbQ = (hand, tq) => { const t = hand.thumb; t.meta.quaternion.copy(tq[0]); t.mcp.quaternion.copy(tq[1]); t.ip.quaternion.copy(tq[2]); hand.group.updateMatrixWorld(true); };

  // curl each finger [mcp, pip, dip] = base + c * pattern until its pad rests `gap` on the skin (or as far as it can go
  // without sinking in); fingers that cannot reach stay at their base curl
  CONTACT.curlToTouch = (hand, fingers, field, pose, o = {}) => {
    const gap = o.gap == null ? 0.0006 : o.gap, pat = o.pattern || [0.55, 1, 0.7], parts = CONTACT.handParts(hand), out = JSON.parse(JSON.stringify(pose));
    out.curl = out.curl || {}; for (const k of ['index', 'middle', 'ring', 'little']) if (!out.curl[k]) out.curl[k] = (pose.all || [0.12, 0.18, 0.1]).slice();
    if (o.together) {                                   // one curl for all the fingers (they stay together, never a V)
      const bases = fingers.map((k) => out.curl[k].slice()); let best = null;
      for (let c = o.from == null ? -0.3 : o.from; c <= (o.to == null ? 1.6 : o.to); c += 0.02) {
        fingers.forEach((k, i) => { out.curl[k] = bases[i].map((v, j) => v + c * pat[j]); }); hand.pose(out); hand.group.updateMatrixWorld(true);
        let sink = 0, tipE = 0;
        for (const k of fingers) { const g = CONTACT.minGap(parts[k], field, null, 0, 0.08), tip = CONTACT.minGap(parts[k + 'Tip'], field, null, 0, 0.08); sink = Math.max(sink, -g.gap - 0.0002); tipE = Math.min(tipE === 0 ? Infinity : tipE, isFinite(tip.gap) ? tip.gap : 0.08); }
        const e = 40 * Math.max(0, sink) + Math.abs(tipE - gap);
        if (!best || e < best.e) best = { e, c };
      }
      fingers.forEach((k, i) => { out.curl[k] = bases[i].map((v, j) => v + best.c * pat[j]); }); hand.pose(out);
      return out;
    }
    for (const k of fingers) {
      const base = out.curl[k].slice(); let best = null;
      for (let c = o.from == null ? -0.3 : o.from; c <= (o.to == null ? 1.6 : o.to); c += 0.02) {
        out.curl[k] = base.map((v, i) => v + c * pat[i]); hand.pose(out); hand.group.updateMatrixWorld(true);
        const g = CONTACT.minGap(parts[k], field, null, 0, 0.08), tip = CONTACT.minGap(parts[k + 'Tip'], field, null, 0, 0.08);
        const sink = Math.max(0, -(g.gap) - 0.0002), e = 40 * sink + Math.abs((isFinite(tip.gap) ? tip.gap : 0.08) - gap);
        if (!best || e < best.e) best = { e, c, gap: tip.gap, min: g.gap };
      }
      out.curl[k] = base.map((v, i) => v + best.c * pat[i]);
      hand.pose(out);
    }
    return out;
  };

  // ---------------------------------------------------------------- the tendon hammer
  // At a strike the hammer lies in a frame X = dir (along the handle, from the grip to the head), Y = the outward skin
  // normal at the target (the head's strike rim is at -Y), so the head travels along -normal into the tendon. The
  // examiner's hand holds the END of the handle between the thumb and the fingers, its fingers along the handle and its
  // back facing Y, so the swing is a turn of the wrist (about the hand's own z axis, through the wrist).
  CONTACT.GRIP = { curl: { index: [0.55, 0.85, 0.55], middle: [0.85, 1.15, 0.7], ring: [1.0, 1.3, 0.8], little: [1.05, 1.35, 0.85] }, spread: 0.35, thumb: [0.55, 0.45, 0.35, 0.25] };
  CONTACT.hammerFrame = (dir, normal) => { const x = dir.clone().normalize(), y = normal.clone().addScaledVector(x, -normal.dot(x)).normalize(), z = V(0, 0, 0).crossVectors(x, y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
  // returns { wrist, quat, pose, hammerPos, hammerQuat, strike } for the moment of contact; gap in world units
  CONTACT.hammerStrike = (hammer, hand, target, normal, dir, gap = 0.0006, gripPose) => {
    const qh = CONTACT.hammerFrame(dir, normal), x = V(1, 0, 0).applyQuaternion(qh), y = V(0, 1, 0).applyQuaternion(qh);
    const L = hammer.pts.strike;                    // (LEN + R, -R - rim, 0) in the hammer's frame
    const O = target.clone().addScaledVector(normal, gap).addScaledVector(x, -L.x).addScaledVector(y, -L.y);
    const G = O.clone().addScaledVector(x, hammer.pts.grip.x);
    const pose = gripPose || CONTACT.GRIP;
    hand.pose(pose);
    const quat = HANDS.quat(x, y);                  // fingers along the handle, the back of the hand toward +normal
    HANDS.place(hand, 'thumbPad', G, quat);
    hand.group.updateMatrixWorld(true);
    const mid = hand.world('thumbPad').add(hand.world('indexPad')).multiplyScalar(0.5);
    hand.group.position.add(G.clone().sub(mid)); hand.group.updateMatrixWorld(true);
    return { wrist: hand.group.position.clone(), quat, pose, hammerPos: O, hammerQuat: qh, strike: target.clone().addScaledVector(normal, gap) };
  };
  // the swing: the hand and the hammer turned together about the hand's z axis through the wrist by angle a (+ = up)
  CONTACT.swing = (st, a) => {
    const axis = V(0, 0, 1).applyQuaternion(st.quat).normalize(), r = new THREE.Quaternion().setFromAxisAngle(axis, a);
    return { wrist: st.wrist.clone(), quat: r.clone().multiply(st.quat), hammerPos: st.wrist.clone().add(st.hammerPos.clone().sub(st.wrist).applyQuaternion(r)), hammerQuat: r.clone().multiply(st.hammerQuat) };
  };
})(typeof window !== 'undefined' ? window : globalThis);
