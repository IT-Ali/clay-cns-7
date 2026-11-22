// tools/scan.mjs: a per-frame scan of the WHOLE part, from the same update(t) as the render (30 fps).
// Every frame: anything within 15 cm of the lens; the examiner's share of the frame (> 35 % is flagged); the picture's
// change from the previous frame (a jump list outside the planned cuts). Every pose frame (poses change on twos): the
// examiner (hands, forearms, sleeves) or the hammer through his skin, through the mattress, or through each other
// (> 1.5 mm), and the hammer within 10 mm of him away from a strike (0.35 s either side).
//   node tools/scan.mjs [--from F --to F --part name]   (parts run in parallel, then: node tools/scan.mjs --merge)
import fs from 'node:fs'; import path from 'node:path';
import { serve, launch, openPage, grab, ROOT, arg } from './common.mjs';
const OUT = path.join(ROOT, 'checks', 'scan'); fs.mkdirSync(OUT, { recursive: true });
const CUTS = () => JSON.parse(fs.readFileSync(path.join(OUT, 'cuts-frames.json'), 'utf8'));

if (arg('merge')) {
  const parts = fs.readdirSync(OUT).filter((f) => /^part-.*\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')));
  const frames = parts.flatMap((p) => p.frames).sort((a, b) => a.i - b.i), cuts = new Set(CUTS().frames);
  const flags = [];
  for (const f of frames) for (const fl of f.flags) flags.push(Object.assign({ frame: f.i, t: +(f.i / 30).toFixed(3) }, fl));
  // the jump list: a frame whose picture changes far more than its neighbours' (median of the 10 frames either side),
  // outside the planned cuts (the cut frame itself)
  const d = frames.map((f) => f.diff), jumps = [];
  for (let k = 1; k < frames.length; k++) {
    if (cuts.has(frames[k].i)) continue;
    const nb = d.slice(Math.max(1, k - 10), k).concat(d.slice(k + 1, k + 11)).filter((x, j) => x != null).sort((a, b) => a - b), med = nb.length ? nb[Math.floor(nb.length / 2)] : 0;
    if (d[k] != null && d[k] > Math.max(6 * med, 4)) jumps.push({ frame: frames[k].i, t: +(frames[k].i / 30).toFixed(3), change: +d[k].toFixed(2), neighbourMedian: +med.toFixed(2) });
  }
  const worst = (key) => { let w = null; for (const f of frames) if (f[key] != null && (w == null || f[key] < w.v)) w = { v: f[key], frame: f.i, t: +(f.i / 30).toFixed(3) }; return w; };
  const most = (key) => { let w = null; for (const f of frames) if (f[key] != null && (w == null || f[key] > w.v)) w = { v: f[key], frame: f.i, t: +(f.i / 30).toFixed(3) }; return w; };
  const rep = { frames: frames.length, poseFramesChecked: frames.filter((f) => f.pose).length, plannedCutFrames: [...cuts].sort((a, b) => a - b),
    thresholds: { penetrationMM: 1.5, lensCM: 15, examinerShare: 0.35, hammerAwayFromStrikeMM: 10, jump: '> 6x the neighbours median and > 4 (mean 0-255 change)' },
    worst: { examinerToSkinMM: worst('exSkin'), hammerToSkinMM: worst('hamSkin'), examinerToMattressMM: worst('exBed'), hammerToMattressMM: worst('hamBed'), handToHandMM: worst('exEx'), hammerHeadToHandsMM: worst('hamEx'), hammerAwayFromStrikeMM: worst('hamAway'), lensCM: worst('lens'), examinerShare: most('share') },
    flags, jumps };
  fs.writeFileSync(path.join(ROOT, 'checks', 'report.json'), JSON.stringify(rep, null, 1));
  console.log(JSON.stringify({ frames: rep.frames, flags: flags.length, jumps: jumps.length, worst: rep.worst }, null, 1));
  process.exit(0);
}

const from = +arg('from', 0), to = +arg('to', 2910), part = arg('part', 'all');
const { srv, url } = await serve(), { browser } = await launch();
const t0 = Date.now();
try {
  const page = await openPage(browser, url, { w: 160, h: 90, samples: 1 });
  // the planned cuts (every 'cut' key of every channel), as frames
  const cutInfo = await page.evaluate(() => { const K = window.CNS7_TIMELINE.KEYS, s = new Set(); for (const ch of Object.values(K)) for (const k of ch) if (k[2] === 'cut') s.add(Math.round(k[0] * 30)); return { frames: [...s].sort((a, b) => a - b) }; });
  if (part === 'all' || from === 0) fs.writeFileSync(path.join(OUT, 'cuts-frames.json'), JSON.stringify(cutInfo));
  await page.evaluate(() => {
    const W = window.W, C = window.CONTACT, P = W.P, V = (x, y, z) => new THREE.Vector3(x, y, z), STR = window.STYLE.content.STRIKES;
    const Dm = window.BED.DIM;
    const meshesOf = (o) => { const a = []; o.traverse((m) => { if (m.isMesh && m.visible) a.push(m); }); return a; };
    const patient = () => { const a = []; P.group.traverse((m) => { if (m.isMesh && m.visible && m.geometry && m.geometry.attributes.position.count > 200) a.push(m); }); return a; };
    // the mattress as a height field, only over the bed
    const bedGap = (ms, step = 3) => { let g = Infinity; const w = V(0, 0, 0); for (const m of ms) { m.updateMatrixWorld(true); const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i += step) { w.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); if (Math.abs(w.z) > Dm.half - 0.1 || w.x < -9.3 || w.x > Dm.xEnd - 0.1) continue; const d = w.y - W.SH.heightAt(w.x, w.z); if (d < g) g = d; } } return g; };
    const prevPx = { a: null };
    window.SCAN_FRAME = (i, pose) => {
      const t = i / 30; window.CAPTIONS = false; window.S.seek(t, 1);
      const out = { i, flags: [], pose };
      // the picture change from the previous frame
      const c = document.getElementById('c'), x = document.createElement('canvas'); x.width = c.width; x.height = c.height; const g = x.getContext('2d'); g.drawImage(c, 0, 0); const px = g.getImageData(0, 0, c.width, c.height).data;
      if (prevPx.a) { let s = 0; for (let k = 0; k < px.length; k += 4) s += Math.abs(px[k] - prevPx.a[k]) + Math.abs(px[k + 1] - prevPx.a[k + 1]) + Math.abs(px[k + 2] - prevPx.a[k + 2]); out.diff = s / (px.length / 4) / 3; }
      prevPx.a = px;
      const cam = W.S.camera; cam.updateMatrixWorld(true); const cp = cam.getWorldPosition(V(0, 0, 0));
      // anything within 15 cm of the lens (all visible meshes but the paper sweep)
      let lens = Infinity; const w = V(0, 0, 0), fwd = V(0, 0, -1).transformDirection(cam.matrixWorld);
      W.S.scene.traverse((m) => { if (!m.isMesh || !m.visible || m.name === 'sweep' || !m.geometry || !m.geometry.attributes.position) return; let v = true; m.traverseAncestors((a) => { if (a.visible === false) v = false; }); if (!v) return;
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); const bs = m.geometry.boundingSphere.clone().applyMatrix4(m.matrixWorld); if (bs.center.distanceTo(cp) - bs.radius > 1.5) return;
        const pa = m.geometry.attributes.position; for (let k = 0; k < pa.count; k += 2) { w.fromBufferAttribute(pa, k).applyMatrix4(m.matrixWorld); if (w.clone().sub(cp).dot(fwd) < 0) continue; const d = w.distanceTo(cp); if (d < lens) lens = d; } });   // in front of the lens only
      out.lens = isFinite(lens) ? +(lens * 10).toFixed(1) : null; if (lens < 1.5) out.flags.push({ check: 'within 15 cm of the lens', cm: out.lens });
      // the examiner's share of the frame: his triangles rasterised on a 96x54 grid (ignoring what hides them: an upper bound)
      const GW = 96, GH = 54, grid = new Uint8Array(GW * GH), vp = V(0, 0, 0), M = new THREE.Matrix4();
      for (const h of ['L', 'R']) for (const m of meshesOf(W.EX[h].group)) {
        M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).multiply(m.matrixWorld);
        const pa = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : pa.count, sx = new Float32Array(3), sy = new Float32Array(3); const e = M.elements;
        for (let k = 0; k < n; k += 3) {
          let bad = false;
          for (let j = 0; j < 3; j++) { const vi = idx ? idx.getX(k + j) : k + j; const X = pa.getX(vi), Y = pa.getY(vi), Z = pa.getZ(vi); const cw = e[3] * X + e[7] * Y + e[11] * Z + e[15]; if (cw <= 0.01) { bad = true; break; } sx[j] = ((e[0] * X + e[4] * Y + e[8] * Z + e[12]) / cw + 1) / 2 * GW; sy[j] = (1 - (e[1] * X + e[5] * Y + e[9] * Z + e[13]) / cw) / 2 * GH; }
          if (bad) continue;
          const x0 = Math.max(0, Math.floor(Math.min(sx[0], sx[1], sx[2]))), x1 = Math.min(GW - 1, Math.ceil(Math.max(sx[0], sx[1], sx[2]))), y0 = Math.max(0, Math.floor(Math.min(sy[0], sy[1], sy[2]))), y1 = Math.min(GH - 1, Math.ceil(Math.max(sy[0], sy[1], sy[2])));
          if (x0 > x1 || y0 > y1) continue;
          const ar = (sx[1] - sx[0]) * (sy[2] - sy[0]) - (sx[2] - sx[0]) * (sy[1] - sy[0]); if (Math.abs(ar) < 1e-9) continue;
          for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const px2 = xx + 0.5, py2 = yy + 0.5;
            const w0 = (sx[1] - px2) * (sy[2] - py2) - (sx[2] - px2) * (sy[1] - py2), w1 = (sx[2] - px2) * (sy[0] - py2) - (sx[0] - px2) * (sy[2] - py2), w2 = (sx[0] - px2) * (sy[1] - py2) - (sx[1] - px2) * (sy[0] - py2);
            if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) grid[yy * GW + xx] = 1; }
        }
      }
      let cov = 0; for (let k = 0; k < grid.length; k++) cov += grid[k]; out.share = +(cov / grid.length).toFixed(3); if (out.share > 0.35) out.flags.push({ check: 'examiner > 35 % of the frame', share: out.share });
      if (!pose) return out;
      // geometry (the pose of this frame)
      const pf = C.field(patient()), mm = (d) => (isFinite(d) ? +(d * 100).toFixed(2) : null);
      const exM = { L: meshesOf(W.EX.L.group), R: meshesOf(W.EX.R.group) }, ham = W.hammer.group.visible ? meshesOf(W.hammer.group) : [], head = W.hammer.group.visible ? W.hammer.head.children.filter((m) => m.isMesh) : [];
      const exAll = exM.L.concat(exM.R), partsOf = (h) => ({ hand: meshesOf(W.EX[h].hand.group), forearm: W.EX[h].fore.children.filter((m) => m.isMesh), sleeve: W.EX[h].upper.children.filter((m) => m.isMesh) });
      let ws = { g: Infinity }, wb = { g: Infinity };
      for (const h of ['L', 'R']) { if (!W.EX[h].group.visible) continue; for (const [pn, ms] of Object.entries(partsOf(h))) { const g = C.minGap(ms, pf, null, 0, 0.03, 2).gap; if (g < ws.g) ws = { g, who: `examiner ${h} ${pn}` }; const b = bedGap(ms); if (b < wb.g) wb = { g: b, who: `examiner ${h} ${pn}` }; } }
      out.exSkin = mm(ws.g); if (out.exSkin != null && out.exSkin < -1.5) out.flags.push({ check: 'examiner through his skin', mm: out.exSkin, part: ws.who });
      out.exBed = mm(wb.g); if (out.exBed != null && out.exBed < -1.5) out.flags.push({ check: 'examiner through the mattress', mm: out.exBed, part: wb.who });
      { let we = { g: Infinity }; const pR = partsOf('R'), pL = partsOf('L');
        for (const [nr, mr] of Object.entries(pR)) { const fR = C.field(mr.filter((m) => m.geometry.attributes.position.count > 60)); for (const [nl, ml] of Object.entries(pL)) { const g = C.minGap(ml, fR, null, 0, 0.03, 3).gap; if (g < we.g) we = { g, who: `L ${nl} / R ${nr}` }; } }
        out.exEx = mm(we.g); if (out.exEx != null && out.exEx < -1.5) out.flags.push({ check: 'examiner arms through each other', mm: out.exEx, part: we.who }); }
      if (ham.length) {
        out.hamSkin = mm(C.minGap(ham, pf, null, 0, 0.03, 2).gap); if (out.hamSkin != null && out.hamSkin < -1.5) out.flags.push({ check: 'hammer through his skin', mm: out.hamSkin });
        out.hamBed = mm(bedGap(ham, 2)); if (out.hamBed != null && out.hamBed < -1.5) out.flags.push({ check: 'hammer through the mattress', mm: out.hamBed });
        { const hands = C.field(W.EX.L.hand.group.children.length ? meshesOf(W.EX.L.hand.group).concat(meshesOf(W.EX.R.hand.group)) : []); out.hamEx = mm(C.minGap(head, hands, null, 0, 0.03, 2).gap); if (out.hamEx != null && out.hamEx < -1.5) out.flags.push({ check: 'hammer head through a hand', mm: out.hamEx }); }
        if (!STR.some((k) => Math.abs(t - k.t) < 0.35)) { out.hamAway = out.hamSkin; if (out.hamAway != null && out.hamAway < 10) out.flags.push({ check: 'hammer within 10 mm of him away from a strike', mm: out.hamAway }); }
      }
      return out;
    };
  });
  const frames = [], only = arg('frames', null) ? String(arg('frames')).split(',').map(Number) : null, live = path.join(OUT, `live-${part}.jsonl`); fs.writeFileSync(live, '');
  const start = Math.max(0, from - 1);    // one frame before, for the picture change
  for (let i = start; i < Math.min(to, 2911); i++) {
    if (only && !only.includes(i)) continue;
    const pose = i % 2 === 0 && i >= from;   // poses change on twos
    const r = await page.evaluate(([i, pose]) => window.SCAN_FRAME(i, pose), [i, pose]);
    if (i >= from) { frames.push(r); if (r.flags.length) fs.appendFileSync(live, JSON.stringify({ i, t: +(i / 30).toFixed(3), flags: r.flags }) + '\n'); }
    if (i % 60 === 0) console.log(`${part}: frame ${i} (${((Date.now() - t0) / 1000).toFixed(0)} s) flags so far ${frames.reduce((a, f) => a + f.flags.length, 0)}`);
  }
  fs.writeFileSync(path.join(OUT, `part-${part}.json`), JSON.stringify({ from, to, frames }));
} finally { await browser.close(); srv.close(); }
console.log('done', part, ((Date.now() - t0) / 1000).toFixed(0), 's');
