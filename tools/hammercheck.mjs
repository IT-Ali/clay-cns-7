// tools/hammercheck.mjs: the hammer is never on him between strikes. Every 0.1 s, away from the strikes (0.35 s either
// side), the hammer (head and handle) is measured against all of his skin; anything closer than 10 mm is listed.
// Writes checks/hammer-clearance.json.
import fs from 'node:fs'; import path from 'node:path';
import { serve, launch, openPage, ROOT } from './common.mjs';
const { srv, url } = await serve(), { browser } = await launch();
try {
  const page = await openPage(browser, url, { w: 320, h: 180, samples: 1 });
  const res = await page.evaluate(() => {
    const W = window.W, C = window.CONTACT, STR = window.STYLE.content.STRIKES, out = [];
    const ms = []; W.P.group.traverse((m) => { if (m.isMesh && window.SHOWN(m) && m.geometry && m.geometry.attributes.position.count > 200) ms.push(m); });
    let worst = { gap: Infinity, t: null };
    for (let t = 0; t <= window.DURATION + 1e-6; t += 0.1) {
      if (STR.some((k) => Math.abs(t - k.t) < 0.35)) continue;
      window.LAB_UPDATE = null; W.S.setApi; window.S.seek(t, 1);   // the real frame
      if (!W.hammer.group.visible) continue;
      const f = C.field(ms), hm = []; W.hammer.group.traverse((m) => { if (m.isMesh) hm.push(m); });
      const g = C.minGap(hm, f, null, 0, 0.1).gap;
      if (g < worst.gap) worst = { gap: g, t: +t.toFixed(2) };
      if (g < 0.1) out.push({ t: +t.toFixed(2), mm: isFinite(g) ? +(g * 100).toFixed(1) : null });
    }
    return { closerThan10mm: out, closest: { t: worst.t, mm: isFinite(worst.gap) ? +(worst.gap * 100).toFixed(1) : '> 10' } };
  });
  fs.writeFileSync(path.join(ROOT, 'checks/hammer-clearance.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res).slice(0, 600));
} finally { await browser.close(); srv.close(); }
