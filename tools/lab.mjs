// tools/lab.mjs: run a script in the page (for exploring and checking) and save canvas grabs.
// node tools/lab.mjs script.js [--w 960 --h 540 --samples 4]   the script is an async function body; it gets
// save(name) to write the canvas to checks/lab/<name>.png and log(...) to print; its return value is printed as JSON.
import fs from 'node:fs'; import path from 'node:path';
import { serve, launch, openPage, grab, ROOT, arg } from './common.mjs';
const file = process.argv[2];
const { srv, url } = await serve();
const { browser } = await launch();
const t0 = Date.now();
try {
  const q = { w: arg('w', 960), h: arg('h', 540), samples: arg('samples', 4) }; if (arg('solve')) q.solve = 1; if (arg('only')) q.only = arg('only');
  const page = await openPage(browser, url, q);
  console.log('built in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  const out = path.join(ROOT, arg('out', 'checks/lab')); fs.mkdirSync(out, { recursive: true });
  await page.exposeFunction('saveGrab', async (name) => { fs.writeFileSync(path.join(out, name + '.png'), await grab(page)); });
  const body = fs.readFileSync(file, 'utf8');
  const res = await page.evaluate(`(async () => { const save = (n) => window.saveGrab(n); const log = (...a) => console.log('[cns7]', ...a.map((x) => typeof x === 'string' ? x : JSON.stringify(x))); ${body}\n })()`);
  if (res !== undefined) console.log(JSON.stringify(res, null, 1));
} finally { await browser.close(); srv.close(); console.log('total', ((Date.now() - t0) / 1000).toFixed(1), 's'); }
