// tools/storyboard.mjs: renders the storyboard stills and the review panels from the ANIMATION itself (the same timeline,
// poses and cameras: every still is window.seek(t) of the real page), then writes storyboard/storyboard.html.
//   node tools/storyboard.mjs [--samples 16] [--w 960] [--h 540] [--only panels|review] [--from N]
import fs from 'node:fs'; import path from 'node:path';
import { serve, launch, openPage, grab, ROOT, arg } from './common.mjs';
import { PANELS, REVIEW } from './storyboard-data.mjs';

const OUT = path.join(ROOT, 'storyboard'); fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
const samples = +arg('samples', 16), W = +arg('w', 960), H = +arg('h', 540), only = arg('only', 'all'), from = +arg('from', 0);
const { srv, url } = await serve(), { browser } = await launch();
const t0 = Date.now();
try {
  const page = await openPage(browser, url, { w: W, h: H, samples });
  // the panel facts, from the live style (the same schedule as the picture and the sound)
  const meta = await page.evaluate((ts) => {
    const C = window.STYLE.content, TL = window.CNS7_TIMELINE;
    const camName = (t) => { let n = null; for (const k of C.KEYS.cam) if (k[0] <= t + 1e-6) n = k; return n ? n[1] : null; };
    return ts.map((t) => { const b = C.BEATS.find((x) => t >= x.t0 && (t < x.t1 || x.n === 12)); const cap = C.CAPTIONS.find((c) => t >= c.t0 && t <= c.t1);
      const strikes = C.STRIKES.filter((k) => k.t >= b.t0 && k.t < b.t1).map((k) => k.id + ' ' + k.t.toFixed(2) + ' s');
      return { t, beat: b.n, name: b.name, t0: b.t0, t1: b.t1, hold: b.hold || null, caption: cap ? cap.text : '', cam: camName(t), strikes, captionsInBeat: C.CAPTIONS.filter((c) => c.t0 < b.t1 && c.t1 > b.t0).map((c) => c.text) }; });
  }, PANELS.map((p) => p.t));
  fs.writeFileSync(path.join(OUT, 'panels.json'), JSON.stringify(meta, null, 1));
  if (only === 'all' || only === 'panels') {
    const pick = arg('pick', null) ? String(arg('pick')).split(',').map(Number) : null;
    for (let i = from; i < PANELS.length; i++) {
      if (pick && !pick.includes(i + 1)) continue;
      const p = PANELS[i], f = path.join(OUT, 'img', `p${String(i + 1).padStart(2, '0')}.jpg`);
      await page.evaluate(([t, n]) => { window.CAPTIONS = true; window.seek(t, n); }, [p.t, samples]);
      fs.writeFileSync(f, await grab(page, 'jpeg', 88));
      console.log(`panel ${i + 1}/${PANELS.length} t=${p.t} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }
  if (only === 'all' || only === 'review') {
    const ids = arg('ids', null) ? String(arg('ids')).split(',') : null, RJ = path.join(OUT, 'review.json');
    const res = ids && fs.existsSync(RJ) ? JSON.parse(fs.readFileSync(RJ, 'utf8')).filter((x) => !ids.includes(x.id)) : [];
    for (let i = 0; i < REVIEW.length; i++) {
      const r = REVIEW[i]; if (ids && !ids.includes(r.id)) continue;
      // put the frame at time t, then (optionally) a close review camera; measure every listed contact on the meshes
      const info = await page.evaluate(([r, n]) => window.REVIEW_SHOT(r, n), [r, r.n || +arg('rsamples', 6)]);
      const f = path.join(OUT, 'img', `r_${r.id}.jpg`);
      fs.writeFileSync(f, await grab(page, 'jpeg', 86));
      res.push(Object.assign({ id: r.id }, info));
      console.log(`review ${r.id}: ${JSON.stringify(info.gaps || info.values || {})}`);
    }
    fs.writeFileSync(path.join(OUT, 'review.json'), JSON.stringify(res, null, 1));
  }
} finally { await browser.close(); srv.close(); }
console.log('done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
