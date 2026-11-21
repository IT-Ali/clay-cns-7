// tools/storyvsanim.mjs: story_vs_anim.png - for beats 2, 3, 4, 5, 8, 10, 11, the animation frame (the render path:
// the clean frame with the caption drawn over it, at the frame's own time) next to its storyboard panel (storyboard/img).
import fs from 'node:fs'; import path from 'node:path';
import { serve, launch, openPage, ROOT, arg } from './common.mjs';
import { PANELS } from './storyboard-data.mjs';
const BEATS = [2, 3, 4, 5, 8, 10, 11], W = 480, H = 270;
// the panel of each beat at its mid-hold (the strike / contact panel nearest the middle of the beat's panels)
const pick = BEATS.map((b) => { const ps = PANELS.map((p, i) => Object.assign({ i }, p)).filter((p) => p.beat === b && !/HOLD/.test(p.what)); return ps[Math.floor((ps.length - 1) / 2)]; });
const { srv, url } = await serve(), { browser } = await launch();
try {
  const page = await openPage(browser, url, { w: 960, h: 540, samples: +arg('samples', 6) });
  const items = pick.map((p) => ({ beat: p.beat, t: p.t, panel: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'storyboard', 'img', `p${String(p.i + 1).padStart(2, '0')}.jpg`)).toString('base64') }));
  const b64 = await page.evaluate(async ([items, W, H, n]) => {
    const o = document.createElement('canvas'); o.width = 2 * W + 30; o.height = items.length * (H + 30) + 10; const x = o.getContext('2d'); x.fillStyle = '#10272a'; x.fillRect(0, 0, o.width, o.height);
    const cv = document.getElementById('c');
    for (let k = 0; k < items.length; k++) {
      const it = items[k], y = k * (H + 30) + 26;
      window.CAPTIONS = false; window.seek(it.t, n);
      const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const g = c2.getContext('2d'); g.drawImage(cv, 0, 0); window.CAPTION.at(g, it.t, window.STYLE.content.CAPTIONS, cv.width, cv.height);
      x.drawImage(c2, 10, y, W, H);
      const im = await new Promise((ok) => { const m = new Image(); m.onload = () => ok(m); m.src = it.panel; }); x.drawImage(im, W + 20, y, W, H);
      x.fillStyle = '#fff'; x.font = '600 15px sans-serif'; x.fillText(`Beat ${it.beat}, ${it.t.toFixed(2)} s: animation (render path)`, 12, y - 7); x.fillText('storyboard panel', W + 22, y - 7);
    }
    return o.toDataURL('image/png').split(',')[1];
  }, [items, W, H, +arg('samples', 6)]);
  fs.writeFileSync(path.join(ROOT, 'story_vs_anim.png'), Buffer.from(b64, 'base64'));
  console.log('story_vs_anim.png:', pick.map((p) => `beat ${p.beat} ${p.t} s`).join(', '));
} finally { await browser.close(); srv.close(); }
