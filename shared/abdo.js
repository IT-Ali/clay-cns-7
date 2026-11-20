// shared/abdo.js (v4): the abdominal landmarks of the recurring patient, as WORLD points on his skin, the same for every
// part of the abdominal (GIT) examination. Classic script; needs THREE, PATIENT (patient.js). Defines window.ABDO.
// Load it after patient.js.
//
//   const A = ABDO.points(P)    every landmark below, recomputed now (so it follows his breathing: call it each frame
//                               you need it, after P.breathe(t)). P from PATIENT.build(S, { pose: 'flat' }).
//   ABDO.list(P)                the same as a flat list [{ name, point, normal }] (for labels and checks)
//   ABDO.LM                     the torso-local definitions (= PATIENT.LM): x toward his LEFT, s up the body, 1 = 10 cm
//
// In A: single points are THREE.Vector3; lines are arrays of Vector3; A.normals[name] is the outward skin normal at each
// single point. R = the patient's RIGHT (toward +Z, the examiner's side), L = his LEFT. All points lie on the skin, so a
// finger pad placed on one (HANDS.place) touches him there. Points under him (the renal angles) lie on his back.
//
//   xiphisternum, umbilicus, pubicSymphysis
//   costalMarginR / costalMarginL         lines from the xiphisternum to the 10th costal cartilage
//   mclR / mclL                           mid-clavicular lines, from the clavicle down to the mid-inguinal point
//   asisR / asisL                         anterior superior iliac spines
//   inguinalLigamentR / L                 lines ASIS -> pubic tubercle;  midInguinalR / L (on the ligament, under the
//                                         midpoint of ASIS-symphysis: the femoral pulse); midLigamentR / L (deep ring)
//   pubicTubercleR / L, groinCreaseR / L (lines)
//   regions: { RH, epigastric, LH, Rlumbar, umbilical, Llumbar, RIF, suprapubic, LIF }   the nine region centres
//   lines:   { mclR, mclL, subcostal, intertubercular }                                  the four dividing lines
//   rightIliacFossa, leftHypochondrium, epigastrium, suprapubic                           (the same centres, by name)
//   liver: { upperBorder (R 5th intercostal space, MCL), lowerEdge (R costal margin, MCL: not palpable), edge (line),
//            spanCm (about 10) }
//   gallbladder                           R costal margin at the MCL (tip of the 9th costal cartilage)
//   spleen: { centre, ribs (9th-11th, behind the mid-axillary line: not palpable), path (from the left costal margin
//             toward the right iliac fossa, the way an enlarged spleen grows) }
//   kidneyR / kidneyL: { front (below the costal margin, lateral to the rectus), back (renal angle) }
//   bladder                               suprapubic, not palpable
//   ics: { R3, R4, R5, L3, L4, L5 }        intercostal spaces in the mid-clavicular lines
//   ausc: { bowel (just right of the umbilicus), aorta (just above it), renalR, renalL (2-3 cm above and lateral),
//           liver (over the liver) }
//   hernia: { groinR, groinL (deep ring, at the midpoint of the ligament), superficialR, superficialL (above and lateral
//             to the pubic tubercle), umbilical }
//   mcBurney                              (bonus) two thirds of the way from the umbilicus to the right ASIS
(function (root) {
  const THREE = root.THREE;
  const ABDO = (root.ABDO = {});
  ABDO.LM = root.PATIENT.LM;

  // the torso-local [x, s] (and the side the skin is found from) of every single point. R points mirror x.
  const defs = (L) => {
    const R = ([x, s]) => [-x, s], cm = L.costalMargin, mcl = L.mclX;
    const lig = L.inguinalLigament, ligAt = (x) => {         // the ligament's s at x (his left side)
      for (let i = 1; i < lig.length; i++) { const [ax, as] = lig[i - 1], [bx, bs] = lig[i]; if ((x - ax) * (x - bx) <= 0) return as + (bs - as) * (x - ax) / (bx - ax); }
      return lig[lig.length - 1][1];
    };
    const midIng = (L.asis[0] + L.pubicSymphysis[0]) / 2, midLig = [(L.asis[0] + L.pubicTubercle[0]) / 2, ligAt((L.asis[0] + L.pubicTubercle[0]) / 2)];
    const cmAt = (x) => { for (let i = 1; i < cm.length; i++) { const [ax, as] = cm[i - 1], [bx, bs] = cm[i]; if ((x - ax) * (x - bx) <= 0) return as + (bs - as) * (x - ax) / (bx - ax); } return cm[cm.length - 1][1]; };
    const sub = L.subcostalS, it = L.intertubercularS;
    const p = {
      xiphisternum: L.xiphisternum, umbilicus: L.umbilicus, pubicSymphysis: L.pubicSymphysis,
      asisL: L.asis, asisR: R(L.asis), pubicTubercleL: L.pubicTubercle, pubicTubercleR: R(L.pubicTubercle),
      midInguinalL: [midIng, ligAt(midIng)], midInguinalR: R([midIng, ligAt(midIng)]), midLigamentL: midLig, midLigamentR: R(midLig),
      gallbladder: R([mcl, cmAt(mcl)]),
      bladder: [0, 0.18],
      'regions.RH': [-1.2, (cmAt(1.2) + sub) / 2], 'regions.epigastric': [0, 2.5], 'regions.LH': [1.2, (cmAt(1.2) + sub) / 2],
      'regions.Rlumbar': [-1.22, (sub + it) / 2], 'regions.umbilical': [0, 1.3], 'regions.Llumbar': [1.22, (sub + it) / 2],
      'regions.RIF': [-0.98, 0.42], 'regions.suprapubic': [0, 0.38], 'regions.LIF': [0.98, 0.42],
      'liver.upperBorder': R([mcl, L.ics[5]]), 'liver.lowerEdge': R([mcl, cmAt(mcl)]),
      'kidneyR.front': [-1.1, 1.62], 'kidneyL.front': [1.1, 1.62],
      'ics.R3': [-mcl, L.ics[3]], 'ics.R4': [-mcl, L.ics[4]], 'ics.R5': [-mcl, L.ics[5]], 'ics.L3': [mcl, L.ics[3]], 'ics.L4': [mcl, L.ics[4]], 'ics.L5': [mcl, L.ics[5]],
      'ausc.bowel': [-0.28, 1.33], 'ausc.aorta': [0.03, 1.62], 'ausc.renalR': [-0.27, 1.6], 'ausc.renalL': [0.27, 1.6], 'ausc.liver': [-mcl, 2.9],
      'hernia.groinR': R(midLig), 'hernia.groinL': midLig, 'hernia.superficialR': [-0.36, -0.03], 'hernia.superficialL': [0.36, -0.03], 'hernia.umbilical': L.umbilicus,
      mcBurney: [K_lerp(0, -L.asis[0], 2 / 3), K_lerp(L.umbilicus[1], L.asis[1], 2 / 3)],
    };
    // points found from other sides: the spleen (his left flank, behind the mid-axillary line) and the renal angles (his back)
    const side = {
      'spleen.centre': [[0, 2.55], [-0.93, 0.37]],
      'kidneyR.back': [[-0.62, 1.95], 'back'], 'kidneyL.back': [[0.62, 1.95], 'back'],
    };
    const line = (pts, n = 6) => { const out = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) { const u = k / n; out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]); } out.push(pts[pts.length - 1]); return out; };
    const mclLine = [[mcl, L.mclTop], [mcl, L.ics[3]], [mcl, cmAt(mcl)], [midIng, ligAt(midIng)]];
    const lines = {
      costalMarginL: line([L.xiphisternum, ...cm]), costalMarginR: line([L.xiphisternum, ...cm]).map(R),
      mclL: line(mclLine, 8), mclR: line(mclLine, 8).map(R),
      inguinalLigamentL: line(lig), inguinalLigamentR: line(lig).map(R),
      groinCreaseL: line(L.groinCrease), groinCreaseR: line(L.groinCrease).map(R),
      'lines.subcostal': line([[-cm[cm.length - 1][0], sub], [cm[cm.length - 1][0], sub]], 12),
      'lines.intertubercular': line([[-L.iliacTubercle[0] + 0.12, it], [L.iliacTubercle[0] - 0.12, it]], 12),
      'liver.edge': line([[-1.42, 1.72], [-1.3, 1.9], [-1.15, 2.15], [-mcl, cmAt(mcl)], [-0.42, 2.88], [0, 3.02], [0.5, 2.92], [0.85, 2.85]], 4),
      'spleen.path': line([[1.3, 1.9], [0.75, 1.55], [0.2, 1.1], [-0.45, 0.62], [-0.98, 0.42]], 4),
    };
    lines['lines.mclR'] = lines.mclR; lines['lines.mclL'] = lines.mclL;
    return { p, side, lines };
  };
  const K_lerp = (a, b, u) => a + (b - a) * u;

  const setPath = (o, path, v) => { const k = path.split('.'); let q = o; for (let i = 0; i < k.length - 1; i++) q = q[k[i]] = q[k[i]] || {}; q[k[k.length - 1]] = v; };

  ABDO.points = (P) => {
    const L = P.LM || root.PATIENT.LM, D = defs(L), A = { normals: {} };
    const at = (xs, dir) => P.surfacePoint(xs[0], xs[1], dir || 'front');
    for (const [name, xs] of Object.entries(D.p)) { const h = at(xs); if (!h) continue; setPath(A, name, h.point); A.normals[name] = h.normal; }
    for (const [name, [xs, dir]] of Object.entries(D.side)) { const h = at(xs, dir); if (!h) continue; setPath(A, name, h.point); A.normals[name] = h.normal; }
    for (const [name, pts] of Object.entries(D.lines)) setPath(A, name, pts.map((xs) => { const h = at(xs); return h ? h.point : null; }).filter(Boolean));
    // the spleen's ribs: the 9th to 11th ribs on his left flank, behind the mid-axillary line
    A.spleen.ribs = [2.85, 2.55, 2.25].map((s) => at([0, s], [-0.93, 0.37]).point);
    // names a part would look for directly
    A.rightIliacFossa = A.regions.RIF; A.leftHypochondrium = A.regions.LH; A.epigastrium = A.regions.epigastric; A.suprapubic = A.regions.suprapubic;
    A.liver.spanCm = Math.round(A.liver.upperBorder.distanceTo(A.liver.lowerEdge) * 100) / 10;
    return A;
  };

  ABDO.list = (P) => {
    const A = ABDO.points(P), out = [];
    const walk = (o, pre) => { for (const [k, v] of Object.entries(o)) { if (k === 'normals') continue; const name = pre ? pre + '.' + k : k; if (v && v.isVector3) out.push({ name, point: v, normal: A.normals[name] || null }); else if (Array.isArray(v)) v.forEach((q, i) => q && q.isVector3 && out.push({ name: name + '[' + i + ']', point: q, normal: null, line: name })); else if (v && typeof v === 'object') walk(v, name); } };
    walk(A, '');
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
