// tools/cuts.mjs: every hard cut on the 1/15 s pose grid, with camera, patient and examiner changing on the SAME frame.
// For each cut time (any channel's 'cut' key) the frames f-2 .. f+1 (1/30 s apart) are stepped with the real update(t);
// each channel that cuts there must jump exactly between f-1 and f. Writes checks/transitions/cuts.json (allOk) and a
// strip per cut (checks/transitions/cut_<time>.jpg: f-2, f-1, f, f+1).
import fs from 'node:fs'; import path from 'node:path';
import { serve, launch, openPage, ROOT } from './common.mjs';
const OUT = path.join(ROOT, 'checks', 'transitions'); fs.mkdirSync(OUT, { recursive: true });
const { srv, url } = await serve(), { browser } = await launch();
try {
  const page = await openPage(browser, url, { w: 240, h: 136, samples: 1 });
  const res = await page.evaluate(() => {
    const T = window.CNS7_TIMELINE, KEYS = T.KEYS, W = window.W, P = W.P;
    const byT = new Map(); for (const [ch, keys] of Object.entries(KEYS)) for (const k of keys) if (k[2] === 'cut') { const tk = Math.round(k[0] * 15) / 15, key = tk.toFixed(4); if (!byT.has(key)) byT.set(key, { t: k[0], ch: new Set() }); byT.get(key).ch.add(ch); }
    const sig = (t) => { window.CNS7_UPDATE(t); const v = (o) => o.getWorldPosition(new THREE.Vector3());
      return { cam: T.camAt(t), exL: v(W.EX.L.hand.group).toArray(), exR: v(W.EX.R.hand.group).toArray(), armR: v(P.arms.R.hand.group).toArray(), armL: v(P.arms.L.hand.group).toArray(), legR: Object.values(P.leg('R')).slice(0, 5), legL: Object.values(P.leg('L')).slice(0, 5) }; };
    const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
    const out = [];
    for (const [key, c] of [...byT.entries()].sort((a, b) => a[1].t - b[1].t)) {
      const onGrid = Math.abs(c.t * 15 - Math.round(c.t * 15)) < 1e-6, f = Math.round(c.t * 30);
      const s = [f - 2, f - 1, f, f + 1].map((i) => sig(i / 30)), chans = {};
      for (const ch of c.ch) { const d = [0, 1, 2].map((k) => dist(s[k][ch], s[k + 1][ch])); const at = d.indexOf(Math.max(...d)); chans[ch] = { jumps: d.map((x) => +x.toFixed(3)), jumpsOnCutFrame: Math.max(...d) < 1e-4 || (at === 1 && d[1] > 1e-6) }; }
      out.push({ t: +c.t.toFixed(4), frame: f, onPoseGrid: onGrid, evenFrame: f % 2 === 0, channels: chans, ok: onGrid && f % 2 === 0 && Object.values(chans).every((x) => x.jumpsOnCutFrame) });
    }
    return out;
  });
  // the strips (1/30 s apart)
  for (const c of res) {
    const b64 = await page.evaluate(async (f) => {
      const cv = document.getElementById('c'), w = cv.width, h = cv.height, o = document.createElement('canvas'); o.width = w * 4 + 6; o.height = h + 18; const x = o.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, o.width, o.height);
      for (let k = 0; k < 4; k++) { const i = f - 2 + k; window.CAPTIONS = false; window.seek(i / 30, 1); x.drawImage(cv, k * (w + 2), 18); x.fillStyle = i === f ? '#ffe14d' : '#fff'; x.font = '600 12px sans-serif'; x.fillText(`frame ${i}  ${(i / 30).toFixed(3)} s${i === f ? '  CUT' : ''}`, k * (w + 2) + 4, 13); }
      return o.toDataURL('image/jpeg', 0.85).split(',')[1];
    }, c.frame);
    c.strip = `cut_${c.t.toFixed(3)}.jpg`; fs.writeFileSync(path.join(OUT, c.strip), Buffer.from(b64, 'base64'));
  }
  const rep = { allOk: res.every((c) => c.ok), cuts: res };
  fs.writeFileSync(path.join(OUT, 'cuts.json'), JSON.stringify(rep, null, 1));
  console.log('allOk', rep.allOk, res.filter((c) => !c.ok).map((c) => c.t + ' ' + JSON.stringify(c.channels)).join('\n'));
} finally { await browser.close(); srv.close(); }
