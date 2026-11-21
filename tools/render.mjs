// tools/render.mjs: the two render commands for the PC (Windows, Chrome with the GPU).
//   npm run preview  [-- --beats 2,6 | --beats all]   960x540, 30 fps, 8 samples, captions on (default: beats 4 and 8):
//                                       out/preview/preview.mp4 (+ check.json, sheet.jpg); frames in out/preview/frames*
//   npm run preview -- --frames 810,811,812   only those frames (a quick test), encoded as preview.mp4
//   npm start                           1920x1080, 30 fps, 64 samples (SET.RENDER): the full part and every beat, both
//                                       versions (_captions / _clean), with sound, in out/final/
// Frames are kept (out/<mode>/frames...), so running the same command again carries on where it stopped.
// solved.json (every contact pose, made once by npm run solve) is LOADED, never re-solved; the command stops if it is
// missing or out of date. Paths come from fileURLToPath(import.meta.url) (works on Windows).
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { serve, launch, openPage, ROOT, arg, ffmpegPath } from './common.mjs';
import { solveInputs } from './solve.mjs';

const FINAL = !!arg('final'), MODE = FINAL ? 'final' : 'preview';
const W = FINAL ? 1920 : 960, H = FINAL ? 1080 : 540, FPS = 30, SAMPLES = +arg('samples', FINAL ? 64 : 8);
const OUT = path.join(ROOT, 'out', MODE), FR = path.join(OUT, 'frames'), FRC = path.join(OUT, 'frames_captions');
fs.mkdirSync(FR, { recursive: true }); fs.mkdirSync(FRC, { recursive: true });

// ---- solved.json must exist and match the solver's inputs
const SJ = path.join(ROOT, 'solved.json');
if (!fs.existsSync(SJ)) { console.error('STOP: solved.json is missing. It is made once on the solving machine (npm run solve) and shipped with this folder.'); process.exit(1); }
const solved = JSON.parse(fs.readFileSync(SJ, 'utf8'));
if (solved.inputs !== solveInputs()) { console.error('STOP: solved.json is out of date (src/contact.js, the SOLVE section of src/cns7-style.js or shared/ changed since it was made). Re-run npm run solve on the solving machine.'); process.exit(1); }

const FF = await ffmpegPath();
const ff = (args) => { const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }); if (r.status !== 0) { console.error(String(r.stderr)); throw new Error('ffmpeg failed: ' + args.join(' ')); } return String(r.stderr); };
// a measuring pass (info level, so the ebur128 summary is printed)
const ffm = (args) => { const r = spawnSync(FF, ['-hide_banner', '-nostats', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }); return String(r.stderr); };
const measure = (file) => { const o = ffm(['-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']); const sum = o.slice(o.lastIndexOf('Summary:')); const I = sum.match(/I:\s+(-?[\d.]+) LUFS/), TP = sum.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/); return { lufs: I ? +I[1] : null, truePeak: TP ? (TP[1] === '-inf' ? -99 : +TP[1]) : null }; };
// the true-peak guard: every encoded MP4 is measured; above -1.0 dBTP its audio alone is re-encoded with the gain lowered
const LOUD = [];
const guard = (file) => {
  let m = measure(file), gain = 0;
  for (let it = 0; it < 3 && m.truePeak != null && m.truePeak > -1.0; it++) {
    gain += -1.2 - m.truePeak; const tmp = file.replace(/\.mp4$/, '.tp.mp4');
    ff(['-i', file, '-map', '0:v', '-map', '0:a', '-c:v', 'copy', '-af', `volume=${gain.toFixed(2)}dB,aformat=sample_fmts=fltp:channel_layouts=stereo`, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp]);
    fs.renameSync(tmp, file); m = measure(file);
  }
  LOUD.push({ file: path.relative(OUT, file).replace(/\\/g, '/'), truePeakDBTP: m.truePeak, loudnessLUFS: m.lufs, audioGainChangeDB: +gain.toFixed(2) });
};

const { srv, url } = await serve(), { browser, mode } = await launch();
console.log(`${MODE}: ${W}x${H}, ${FPS} fps, ${SAMPLES} samples, browser ${mode}`);
const t0 = Date.now();
try {
  const page = await openPage(browser, url, { w: W, h: H, samples: SAMPLES }, { width: Math.min(W, 1920), height: Math.min(H, 1080) });
  const D = await page.evaluate(() => window.DURATION), BEATS = await page.evaluate(() => window.STYLE.content.BEATS);
  const N = Math.round(D * FPS);
  // which frames: all, or only the frames of the chosen beats (preview --beats 2,6)
  const beatsArg = arg('beats', FINAL ? 'all' : '4,8'), chosen = String(beatsArg) === 'all' ? null : String(beatsArg).split(',').map(Number);
  const framesArg = arg('frames', null), only = framesArg ? String(framesArg).split(',').map(Number) : null;
  const want = []; for (let i = 0; i < N; i++) { const t = i / FPS; if (only ? only.includes(i) : (!chosen || BEATS.some((b) => chosen.includes(b.n) && t >= b.t0 && t < b.t1))) want.push(i); }
  // the page renders the clean frame, then draws the caption over it (the stage's own overlay pass, done in 2D)
  await page.exposeFunction('saveFrames', (i, clean, cap) => {
    fs.writeFileSync(path.join(FR, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(clean, 'base64'));
    if (cap) fs.writeFileSync(path.join(FRC, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(cap, 'base64'));
  });
  let done = 0;
  for (const i of want) {
    const f = path.join(FR, `${String(i).padStart(5, '0')}.jpg`), fc = path.join(FRC, `${String(i).padStart(5, '0')}.jpg`);
    if (fs.existsSync(f) && fs.existsSync(fc)) { done++; continue; }
    await page.evaluate(async (i) => {
      const t = i / 30; window.CAPTIONS = false; window.seek(t);
      const cv = document.getElementById('c'), clean = cv.toDataURL('image/jpeg', 0.95).split(',')[1];
      const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const x = c2.getContext('2d');
      x.drawImage(cv, 0, 0); window.CAPTION.at(x, t, window.STYLE.content.CAPTIONS, cv.width, cv.height);
      await window.saveFrames(i, clean, c2.toDataURL('image/jpeg', 0.95).split(',')[1]);
    }, i);
    done++;
    if (done % 15 === 0 || done === want.length) { const el = (Date.now() - t0) / 1000; console.log(`frame ${done}/${want.length}  ${el.toFixed(0)} s  (~${(el / done * (want.length - done) / 60).toFixed(1)} min left)`); }
  }
  // ---- sound: the style's score, rendered offline, normalised to about -15 LUFS
  const wav = path.join(OUT, 'sound.wav'), wavN = path.join(OUT, 'sound_norm.wav');
  if (!fs.existsSync(wavN)) {
    const b64 = await page.evaluate(async (D) => {
      const r = await window.SOUND.renderOffline((k) => window.STYLE.sound(k), D, 48000, { voiceover: false });
      const n = r.frames, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf), s = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
      s(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, 48000, true); v.setUint32(28, 48000 * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 4, true);
      for (let i = 0; i < n * 2; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, r.inter[i])) * 32767, true);
      let bin = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(bin);
    }, D);
    fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
    ff(['-i', wav, '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo', wavN]);   // about -15 LUFS; ends with aformat s16 stereo
  }
  // ---- encode
  const enc = (dir, from, count, t0s, dur, outFile) => {
    ff(['-framerate', String(FPS), '-start_number', String(from), '-i', path.join(dir, '%05d.jpg'), '-frames:v', String(count), '-ss', t0s.toFixed(3), '-t', dur.toFixed(3), '-i', wavN,
      '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', FINAL ? 'slow' : 'medium', '-crf', FINAL ? '16' : '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFile]);
  };
  if (only) {   // a quick test: the chosen (consecutive) frames
    enc(FRC, want[0], want.length, want[0] / FPS, want.length / FPS, path.join(OUT, 'preview.mp4')); guard(path.join(OUT, 'preview.mp4'));
  } else if (!FINAL) {
    if (chosen) {   // the chosen beats, one after another
      const lst = path.join(OUT, 'list.txt'), parts = [];
      for (const b of BEATS.filter((x) => chosen.includes(x.n))) { const f0 = Math.round(b.t0 * FPS), f1 = Math.round(b.t1 * FPS), o = path.join(OUT, `beat${String(b.n).padStart(2, '0')}.mp4`); enc(FRC, f0, f1 - f0, b.t0, b.t1 - b.t0, o); parts.push(`file '${o.replace(/\\/g, '/')}'`); }
      fs.writeFileSync(lst, parts.join('\n')); ff(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', path.join(OUT, 'preview.mp4')]);
      for (const b of BEATS.filter((x) => chosen.includes(x.n))) guard(path.join(OUT, `beat${String(b.n).padStart(2, '0')}.mp4`));
    } else enc(FRC, 0, N, 0, D, path.join(OUT, 'preview.mp4'));
    guard(path.join(OUT, 'preview.mp4'));
  } else {
    fs.mkdirSync(path.join(OUT, 'beats'), { recursive: true });
    for (const [dir, suf] of [[FRC, '_captions'], [FR, '_clean']]) {
      enc(dir, 0, N, 0, D, path.join(OUT, `cns7_reflexes${suf}.mp4`)); guard(path.join(OUT, `cns7_reflexes${suf}.mp4`));
      for (const b of BEATS) { const f0 = Math.round(b.t0 * FPS), f1 = Math.round(b.t1 * FPS), o = path.join(OUT, 'beats', `cns7_beat${String(b.n).padStart(2, '0')}_${b.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/-+$/, '')}${suf}.mp4`); enc(dir, f0, f1 - f0, b.t0, b.t1 - b.t0, o); guard(o); }
    }
  }
  // ---- checks: first vs last frame, loudness, duration, a contact sheet (a frame every 2 s with its time)
  const first = want[0], last = want[want.length - 1];
  const diff = await page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = src; });
    const [A, B] = await Promise.all([load(a), load(b)]); const c = document.createElement('canvas'); c.width = A.width; c.height = A.height; const x = c.getContext('2d');
    x.drawImage(A, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data; x.drawImage(B, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0, sum = 0; for (let i = 0; i < da.length; i += 4) { const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]); sum += d; if (d > 12) n++; }
    return { pixelsDifferent: n, meanAbsDiff: +(sum / (da.length / 4) / 3).toFixed(3) };
  }, ['data:image/jpeg;base64,' + fs.readFileSync(path.join(FR, `${String(first).padStart(5, '0')}.jpg`)).toString('base64'), 'data:image/jpeg;base64,' + fs.readFileSync(path.join(FR, `${String(last).padStart(5, '0')}.jpg`)).toString('base64')]);
  const loud = measure(wavN);
  const sheet = want.filter((i) => i % (2 * FPS) === 0).map((i) => ({ i, t: i / FPS, src: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(FRC, `${String(i).padStart(5, '0')}.jpg`)).toString('base64') }));
  const sheetB64 = await page.evaluate(async (items) => {
    const cols = 6, w = 320, h = 180, c = document.createElement('canvas'); c.width = cols * w; c.height = Math.ceil(items.length / cols) * h; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    for (let k = 0; k < items.length; k++) { const im = await new Promise((ok) => { const m = new Image(); m.onload = () => ok(m); m.src = items[k].src; }); const X = (k % cols) * w, Y = Math.floor(k / cols) * h; x.drawImage(im, X, Y, w, h); x.font = '600 20px sans-serif'; x.fillStyle = '#000'; x.fillRect(X, Y, 78, 26); x.fillStyle = '#fff'; x.fillText(items[k].t.toFixed(1) + ' s', X + 6, Y + 19); }
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  }, sheet);
  fs.writeFileSync(path.join(OUT, 'sheet.jpg'), Buffer.from(sheetB64, 'base64'));
  const check = { mode: MODE, size: [W, H], fps: FPS, samples: SAMPLES, frames: want.length, duration: +(want.length / FPS).toFixed(3), firstFrame: first, lastFrame: last, firstVsLast: diff, soundTrack: { loudnessLUFS: loud.lufs, truePeakDBTP: loud.truePeak }, encodedFiles: LOUD, browser: mode, seconds: Math.round((Date.now() - t0) / 1000) };
  fs.writeFileSync(path.join(OUT, 'check.json'), JSON.stringify(check, null, 1));
  console.log(JSON.stringify(check));
} finally { await browser.close(); srv.close(); }
