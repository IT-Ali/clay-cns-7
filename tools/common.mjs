// tools/common.mjs: the static server and the browser launcher shared by every tool.
// Works here (Linux, no GPU: software WebGL through SwiftShader) and on the Windows PC (Chrome with the GPU, D3D11).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

export function serve(port = 0) {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok({ srv, url: `http://127.0.0.1:${srv.address().port}/` })));
}

// mode: 'gpu' (the PC: Chrome with the GPU) or 'soft' (here: software WebGL). Auto: soft on Linux without a GPU.
export async function launch(mode) {
  const { chromium } = await import('playwright-core');
  const win = process.platform === 'win32';
  mode = mode || process.env.RENDER_MODE || (win || process.platform === 'darwin' ? 'gpu' : 'soft');
  const args = ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'];
  if (mode === 'gpu') args.push('--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', win ? '--use-angle=d3d11' : '--use-angle=default');
  else args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  const opts = { headless: true, args };
  const exe = process.env.CHROME_PATH || (fs.existsSync('/opt/pw-browsers/chromium-1243/chrome-linux64/chrome') ? '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' : null);
  if (exe && !win) opts.executablePath = exe; else opts.channel = 'chrome';
  const browser = await chromium.launch(opts);
  return { browser, mode };
}

// open the player page in render mode; the three.js CDN and Google Fonts are served from local copies (works offline)
export async function openPage(browser, base, query = {}, viewport = { width: 1280, height: 720 }) {
  const page = await browser.newPage({ viewport });
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || /^\[cns7\]/.test(t)) console.log('  page:', t); });
  page.on('pageerror', (e) => console.log('  page error:', e.message));
  await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.187\.0\/build\/three\.module\.js/, (r) => r.fulfill({ path: path.join(ROOT, 'node_modules/three/build/three.module.js'), contentType: 'text/javascript' }));
  await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.187\.0\/build\/three\.core\.js/, (r) => r.fulfill({ path: path.join(ROOT, 'node_modules/three/build/three.core.js'), contentType: 'text/javascript' }));
  await page.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ path: path.join(ROOT, 'assets/fonts/fredoka.css'), contentType: 'text/css' }));
  await page.route(/fonts\.gstatic\.com/, (r) => r.fulfill({ path: path.join(ROOT, 'assets/fonts', path.basename(new URL(r.request().url()).pathname)), contentType: 'font/ttf' }));
  const qs = new URLSearchParams(Object.assign({ render: 1 }, query)).toString();
  await page.goto(base + 'index.html?' + qs, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.READY === true || window.FAILED, null, { timeout: 0 });
  const failed = await page.evaluate(() => window.FAILED || null);
  if (failed) throw new Error(failed);
  return page;
}

// grab the canvas as PNG bytes (after window.seek)
export async function grab(page, type = 'png', quality = 92) {
  const url = await page.evaluate(([t, q]) => document.getElementById('c').toDataURL(t === 'png' ? 'image/png' : 'image/jpeg', q / 100), [type, quality]);
  return Buffer.from(url.split(',')[1], 'base64');
}

export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const ffmpegPath = async () => {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { const m = await import('ffmpeg-static'); if (m.default && fs.existsSync(m.default)) return m.default; } catch (e) {}
  return 'ffmpeg';
};
export const arg = (name, def) => { const i = process.argv.indexOf('--' + name); if (i < 0) return def; const v = process.argv[i + 1]; return v == null || v.startsWith('--') ? true : v; };
