// tools/homecheck.mjs: the first and the last frame of the part against the CNS home shot built exactly as
// shared/README.md describes (software, low samples). Writes home-check.json.
import fs from 'node:fs'; import path from 'node:path';
import { serve, launch, openPage, ROOT, arg } from './common.mjs';
const n = +arg('samples', 2), W = +arg('w', 640), H = +arg('h', 360);
const { srv, url } = await serve(), { browser, mode } = await launch();
try {
  const page = await openPage(browser, url, { w: W, h: H, samples: n });
  const res = await page.evaluate(([n]) => {
    const px = () => { const c = document.getElementById('c'), x = document.createElement('canvas'); x.width = c.width; x.height = c.height; const g = x.getContext('2d'); g.drawImage(c, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
    window.CAPTIONS = true; window.seek(0, n); const first = px(); window.seek(window.DURATION, n); const last = px();
    window.LAB_UPDATE = () => window.HOME_REFERENCE(); window.seek(0, n); const ref = px(); window.LAB_UPDATE = null;
    const cmp = (a, b) => { let d = 0, mx = 0; for (let i = 0; i < a.length; i += 4) { const e = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (e) d++; mx = Math.max(mx, e); } return { pixelsDifferent: d, maxDifference: mx }; };
    return { firstVsHome: cmp(first, ref), lastVsHome: cmp(last, ref), firstVsLast: cmp(first, last) };
  }, [n]);
  const out = Object.assign({ size: [W, H], samples: n, browser: mode, made: new Date().toISOString() }, res, { identical: res.firstVsHome.pixelsDifferent === 0 && res.lastVsHome.pixelsDifferent === 0 });
  fs.writeFileSync(path.join(ROOT, 'home-check.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
} finally { await browser.close(); srv.close(); }
