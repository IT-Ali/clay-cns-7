// tools/plan.mjs: plans, ONCE (here, like npm run solve), how each move of the examiner's hands arrives and leaves.
// For every move between two different hand states, a few approaches are tried (slide along the forearm / straight up /
// along the back of the hand / along the forearm tilted up; how far; how high the arc; fingers straight or as they are;
// a last 2.5 cm straight off the skin or not). Each is measured on every pose frame of the move with the real update(t):
// the hand and forearm against all of his skin, the mattress and the examiner's other arm. The cleanest is kept.
// Writes transitions.json (the render only loads it).   node tools/plan.mjs
import fs from 'node:fs'; import path from 'node:path';
import { serve, launch, openPage, ROOT } from './common.mjs';
const CANDS = [
  { dir: 'back', dist: 1.2, arc: 1.5, open: true, two: true }, { dir: 'back', dist: 1.2, arc: 1.5, open: false, two: false },
  { dir: 'up', dist: 1.2, arc: 1.5, open: false, two: false }, { dir: 'up', dist: 2.0, arc: 2.5, open: true, two: false },
  { dir: 'backUp', dist: 1.5, arc: 2.0, open: false, two: false }, { dir: 'backUp', dist: 1.5, arc: 2.0, open: true, two: true },
  { dir: 'dorsum', dist: 1.2, arc: 1.5, open: false, two: false }, { dir: 'back', dist: 2.0, arc: 3.0, open: false, two: false },
  { dir: 'back', dist: 0.6, arc: 1.5, open: true, two: false }, { dir: 'up', dist: 0.8, arc: 2.0, open: true, two: true },
  { dir: 'back', dist: 1.2, arc: 1.5, open: true, two: false, low: 0.2 }, { dir: 'back', dist: 1.5, arc: 1.5, open: true, two: false, low: 0.35 },
  { dir: 'back', dist: 0.8, arc: 0.3, open: true, two: false }, { dir: 'up', dist: 0.6, arc: 0.3, open: true, two: false },
];
const { srv, url } = await serve(), { browser } = await launch();
const t0 = Date.now();
try {
  fs.rmSync(path.join(ROOT, 'transitions.json'), { force: true });   // plan from the defaults
  const page = await openPage(browser, url, { w: 160, h: 90, samples: 1 });
  const res = await page.evaluate((CANDS) => {
    const W = window.W, C = window.CONTACT, P = W.P, K = window.CNS7_TIMELINE.KEYS, Dm = window.BED.DIM, V = (x, y, z) => new THREE.Vector3(x, y, z);
    const segs = [];
    for (const h of ['L', 'R']) { const ks = K['ex' + h]; for (let i = 0; i < ks.length - 1; i++) { const [a, n0] = ks[i], [b, n1, cut] = ks[i + 1]; if (cut || n0 === n1 || b - a < 1e-6) continue; segs.push({ h, t0: a, t1: b, n0, n1, key: h + ':' + a.toFixed(3) }); } }
    const meshesOf = (o) => { const a = []; o.traverse((m) => { if (m.isMesh && m.visible) a.push(m); }); return a; };
    const patient = () => { const a = []; P.group.traverse((m) => { if (m.isMesh && m.visible && m.geometry && m.geometry.attributes.position.count > 200) a.push(m); }); return a; };
    const bedGap = (ms) => { let g = Infinity; const w = V(0, 0, 0); for (const m of ms) { m.updateMatrixWorld(true); const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i += 3) { w.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); if (Math.abs(w.z) > Dm.half - 0.1 || w.x < -9.3 || w.x > Dm.xEnd - 0.1) continue; const d = w.y - W.SH.heightAt(w.x, w.z); if (d < g) g = d; } } return g; };
    const out = {}, cache = new Map();
    for (const sg of segs) {
      const frames = []; for (let k = Math.ceil(sg.t0 * 15 + 1e-6); k / 15 < sg.t1 - 1e-6; k++) frames.push(k / 15);
      if (!frames.length) continue;
      let best = null;
      CANDS.forEach((cd, ci) => {
        window.TRANS_OVERRIDE = { [sg.key]: cd }; let cost = 0, worst = 0, wb = 0, wo = 0;
        for (const t of frames) {
          window.CNS7_UPDATE(t);
          if (!cache.has(t)) cache.set(t, C.field(patient()));
          const pf = cache.get(t), mine = meshesOf(W.EX[sg.h].hand.group).concat(W.EX[sg.h].fore.children.filter((m) => m.isMesh)), oh = sg.h === 'L' ? 'R' : 'L';
          const skin = C.minGap(mine, pf, null, 0, 0.06, 3).gap, bed = bedGap(mine.concat(W.EX[sg.h].upper.children.filter((m) => m.isMesh)));
          const of = C.field(meshesOf(W.EX[oh].hand.group).concat(W.EX[oh].fore.children.filter((m) => m.isMesh))), oth = C.minGap(mine, of, null, 0, 0.06, 4).gap;
          // and the lens: nothing of the moving arm within 25 cm of the camera, inside the picture
          const cam = W.S.camera; cam.updateMatrixWorld(true); const cp = cam.getWorldPosition(V(0, 0, 0)); let lens = Infinity; const w = V(0, 0, 0);
          for (const m of mine.concat(W.EX[sg.h].upper.children.filter((x) => x.isMesh))) { const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i += 4) { w.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); const nd = w.clone().project(cam); if (nd.z > 1 || Math.abs(nd.x) > 1 || Math.abs(nd.y) > 1) continue; lens = Math.min(lens, w.distanceTo(cp)); } }
          const pl = Math.max(0, 2.5 - lens);
          const ps = Math.max(0, -(isFinite(skin) ? skin : 0)), pb = Math.max(0, -(isFinite(bed) ? bed : 0)), po = Math.max(0, -(isFinite(oth) ? oth : 0));
          cost += 10 * ps + 5 * po + pb + 0.05 * pl; worst = Math.max(worst, ps); wb = Math.max(wb, pb); wo = Math.max(wo, po);   // his skin and the other arm count far more than the soft mattress
        }
        if (!best || cost < best.cost - 1e-6) best = { ci, cost, worst, wb, wo };
      });
      out[sg.key] = Object.assign({}, CANDS[best.ci], { candidate: best.ci, worstMM: +(best.worst * 100).toFixed(2), mattressMM: +(best.wb * 100).toFixed(2), otherArmMM: +(best.wo * 100).toFixed(2), from: sg.n0, to: sg.n1, t0: sg.t0, t1: sg.t1 });
      cache.clear();
    }
    window.TRANS_OVERRIDE = null;
    return out;
  }, CANDS);
  fs.writeFileSync(path.join(ROOT, 'transitions.json'), JSON.stringify({ made: new Date().toISOString(), note: 'planned by tools/plan.mjs; worstMM = the deepest penetration left on any frame of the move (0 = clean)', moves: res }, null, 1));
  const bad = Object.entries(res).filter(([, v]) => v.worstMM > 0.15 || v.mattressMM > 0.15 || v.otherArmMM > 0.15);
  console.log(Object.keys(res).length, 'moves planned in', ((Date.now() - t0) / 1000).toFixed(0), 's;', bad.length, 'with some contact left (skin / mattress / other arm, mm):', bad.map(([k, v]) => `${k} ${v.from}->${v.to} ${v.worstMM} / ${v.mattressMM} / ${v.otherArmMM}`).join('; '));
} finally { await browser.close(); srv.close(); }
