// tools/solve.mjs: runs every contact solve ONCE (in the page, SOLVE mode) and saves solved.json. The preview and the
// final render only LOAD it. Run it again whenever src/contact.js, the SOLVE section of src/cns7-style.js or shared/ change.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch, openPage, ROOT, sha } from './common.mjs';
export const solveInputs = () => {
  const style = fs.readFileSync(path.join(ROOT, 'src/cns7-style.js'), 'utf8');
  const sect = style.slice(style.indexOf('SOLVE BEGIN'), style.indexOf('SOLVE END'));
  const shared = fs.readdirSync(path.join(ROOT, 'shared')).sort().map((f) => fs.readFileSync(path.join(ROOT, 'shared', f)));
  return sha(Buffer.concat([Buffer.from(sect), fs.readFileSync(path.join(ROOT, 'src/contact.js')), ...shared]).toString('base64'));
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const t0 = Date.now(), { srv, url } = await serve(), { browser } = await launch();
  try {
    const page = await openPage(browser, url, { w: 320, h: 180, samples: 1, solve: 1 });
    const out = await page.evaluate(() => ({ version: window.STYLE.SOLVE_VERSION, data: window.SOLVED_OUT }));
    out.inputs = solveInputs(); out.made = new Date().toISOString();
    fs.writeFileSync(path.join(ROOT, 'solved.json'), JSON.stringify(out));
    fs.writeFileSync(path.join(ROOT, 'checks/solve-log.txt'), out.data.log.join('\n') + '\n');
    console.log('solved.json written in', ((Date.now() - t0) / 1000).toFixed(0), 's;', out.data.log.length, 'log lines (checks/solve-log.txt)');
  } finally { await browser.close(); srv.close(); }
}
