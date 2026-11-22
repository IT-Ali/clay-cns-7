// tools/windows.mjs: 1/30 s strips (contact sheets) of the transition windows of the review, every frame, captions off.
// Writes checks/transitions/window_<from>-<to>.jpg.   node tools/windows.mjs [--w 240]
import fs from 'node:fs'; import path from 'node:path';
import { serve, launch, openPage, ROOT, arg } from './common.mjs';
const WINS = [[43.8, 45.0, 'knee support arriving'], [56.4, 57.8, 'knee support leaving'], [85.6, 86.8, 'Hoffmann R set-up'], [89.0, 90.0, 'Hoffmann L set-up']];
const OUT = path.join(ROOT, 'checks', 'transitions'); fs.mkdirSync(OUT, { recursive: true });
const w = arg('w', 240), h = Math.round(w * 9 / 16), COLS = 8;
const { srv, url } = await serve(), { browser } = await launch();
try {
  const page = await openPage(browser, url, { w, h, samples: 1 });
  for (const [a, b, name] of WINS) {
    const f0 = Math.round(a * 30), f1 = Math.round(b * 30);
    const b64 = await page.evaluate(async ({ f0, f1, name, COLS }) => {
      const cv = document.getElementById('c'), w = cv.width, h = cv.height, n = f1 - f0 + 1, rows = Math.ceil(n / COLS);
      const o = document.createElement('canvas'); o.width = COLS * (w + 2); o.height = 22 + rows * (h + 16); const x = o.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, o.width, o.height);
      x.fillStyle = '#ffe14d'; x.font = '600 14px sans-serif'; x.fillText(`${name}: ${(f0 / 30).toFixed(2)}-${(f1 / 30).toFixed(2)} s, every frame (1/30 s)`, 6, 16);
      for (let k = 0; k < n; k++) { const i = f0 + k, cx = (k % COLS) * (w + 2), cy = 22 + Math.floor(k / COLS) * (h + 16); window.CAPTIONS = false; window.seek(i / 30, 1); x.drawImage(cv, cx, cy + 14); x.fillStyle = '#fff'; x.font = '600 11px sans-serif'; x.fillText(`${i}  ${(i / 30).toFixed(3)} s`, cx + 3, cy + 11); }
      return o.toDataURL('image/jpeg', 0.85).split(',')[1];
    }, { f0, f1, name, COLS });
    const file = path.join(OUT, `window_${a.toFixed(1)}-${b.toFixed(1)}.jpg`); fs.writeFileSync(file, Buffer.from(b64, 'base64')); console.log(file);
  }
} finally { await browser.close(); srv.close(); }
