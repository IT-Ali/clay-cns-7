// tools/storyboard-html.mjs: builds storyboard/storyboard.html from the rendered stills (storyboard/img), the panel facts
// (storyboard/panels.json), the measured review panels (storyboard/review.json) and the solve log (checks/solve-log.txt).
import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from './common.mjs';
import { PANELS, REVIEW } from './storyboard-data.mjs';

const SB = path.join(ROOT, 'storyboard');
const meta = JSON.parse(fs.readFileSync(path.join(SB, 'panels.json'), 'utf8'));
const review = fs.existsSync(path.join(SB, 'review.json')) ? JSON.parse(fs.readFileSync(path.join(SB, 'review.json'), 'utf8')) : [];
const log = fs.existsSync(path.join(ROOT, 'checks/solve-log.txt')) ? fs.readFileSync(path.join(ROOT, 'checks/solve-log.txt'), 'utf8') : '';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SOUND = { 1: 'Room ambience fades in over 0.5 s; nothing else.', 12: 'Soft sheet rustles as his limbs go home; the ambience fades out over the last 0.5 s.' };
const soundFor = (m) => SOUND[m.beat] || [m.strikes.length ? 'Hammer: a soft rubber tap (short dull thud) at ' + m.strikes.join(', ') + '.' : 'No hammer.', 'Very soft sheet rustle when a limb moves. Room ambience under everything.'].join(' ');
const CAMS = { home: 'CNS home shot (SET.HOME_CNS), still', upper: 'medium shot of his upper body from his right', bicR: 'from his right side, a little above arm level', bicL: 'from his LEFT side, a little above arm level (mirror; closer, wider lens: the wall is near)', supR: 'from his right side at arm level, a little footward', supL: 'from his LEFT side at arm level (mirror)', triR: 'from his right side, a little from the head end: elbow, strike, forearm across his trunk', triL: 'from his LEFT side at arm level (mirror)', reinf: 'from his right side, a little from the head end, tight: his face (jaw), elbow, thumb, hammer', reinfFace: 'close insert of his face from his right front (the clench)', knees: 'from his right side, both knees', jend: 'wide, from his right side: hooked hands, right knee, hammer', legs: 'medium shot of his legs from his right', legsWide: 'wide shot of both legs from his right, above', ankR: 'from the side of the foot (his left, toward his head): heel and Achilles tendon in profile', ankL: 'from the side of the foot (his right): the mirror', clonR: 'from his right side at foot height', clonL: 'from his LEFT side (mirror)', kneeClonR: 'low, from his right side: the knee in profile', kneeClonL: 'low, from his LEFT side (mirror)', hoffR: 'at hand height from his thumb side', hoffL: 'from his LEFT side (mirror)' };

const panel = (p, i) => {
  const m = meta[i], img = `img/p${String(i + 1).padStart(2, '0')}.jpg`;
  return `<figure class="panel">
  <img src="${img}" alt="Beat ${m.beat} at ${p.t.toFixed(2)} s" loading="lazy" width="960" height="540">
  <figcaption>
    <div class="ph"><span class="beat">Beat ${m.beat}</span><span class="time">${p.t.toFixed(2)} s</span><span class="span">beat ${m.t0}-${m.t1} s</span></div>
    <dl>
      <dt>On screen</dt><dd>${m.caption ? '<q>' + esc(m.caption) + '</q>' : '<em>no caption</em>'}</dd>
      <dt>What changes</dt><dd>${esc(p.what)}</dd>
      <dt>Camera</dt><dd>${esc(CAMS[m.cam] || m.cam)}</dd>
      <dt>Sound</dt><dd>${esc(soundFor(m))}</dd>
    </dl>
  </figcaption>
</figure>`;
};
const beats = [];
PANELS.forEach((p, i) => { const b = meta[i].beat; (beats[b] = beats[b] || []).push(panel(p, i)); });
const beatName = (b) => meta.find((m) => m.beat === b).name;

const GROUPS = { a: 'a. Plan: his right and left', b: 'b. The hammer: top of the swing and the strike (gap at the strike)', c: 'c. The reflex movement: joint angle before and at its peak', d: "d. Jendrassik: hooked hands, and the clenched jaw", e: 'e. The knee support', f: 'f. Clonus: palm on the ball of the foot; thumb and index on the kneecap', g: "g. Hoffmann's sign: before and after the flick", x: 'Skin-level contact panels (every other contact)' };
const cls = (v) => (v == null ? 'clear' : v < 0 ? 'bad' : v < 1.5 ? 'good' : v < 3 ? 'warn' : 'clear');
const rv = (r) => {
  const d = review.find((x) => x.id === r.id) || {}, gaps = d.gaps || {}, vals = d.values || {};
  const rows = Object.entries(gaps).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num ${cls(v)}">${v == null ? '&gt; 15' : v.toFixed(2)} mm</td></tr>`).concat(Object.entries(vals).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${Array.isArray(v) ? v.join(', ') : v + (/elbow|knee|ankle/.test(k) ? '°' : '')}</td></tr>`)).join('');
  return `<figure class="rv"><img src="img/r_${r.id}.jpg" alt="${esc(r.title)}" loading="lazy" width="960" height="540"><figcaption><b>${esc(r.title)}</b> <span class="time">${r.t} s</span>${rows ? `<table>${rows}</table>` : ''}</figcaption></figure>`;
};
// c: angles as one table (before / peak / change), right and left
const angleTable = () => {
  const rows = [];
  for (const id of ['bicR', 'bicL', 'supR', 'supL', 'triR', 'triL', 'kneeR', 'kneeL', 'ankR', 'ankL']) {
    const a = review.find((x) => x.id === `c_${id}_before`), b = review.find((x) => x.id === `c_${id}_peak`); if (!a || !b) continue;
    const k = Object.keys(a.values)[0], v0 = a.values[k], v1 = b.values[k];
    rows.push(`<tr><td>${id}</td><td>${k}</td><td class="num">${v0}°</td><td class="num">${v1}°</td><td class="num">${(v1 - v0 >= 0 ? '+' : '') + (v1 - v0).toFixed(1)}°</td></tr>`);
  }
  return `<div class="tablewrap"><table class="angles"><thead><tr><th>Reflex</th><th>Joint</th><th>Before</th><th>Peak</th><th>Change</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
  <p class="note">Elbow: the angle between upper arm and forearm (smaller = flexed). Knee: flexion (smaller = extended). Ankle: + = dorsiflexion. Targets: biceps flexes ~10°, supinator ~8°, triceps extends ~10°, knee kicks ~12°, ankle plantar-flexes ~10°; right and left the same.</p>`;
};
const reviewHtml = Object.entries(GROUPS).map(([g, title]) => {
  const items = REVIEW.filter((r) => r.group === g);
  if (g === 'c') return `<section class="rgroup"><h3>${esc(title)}</h3>${angleTable()}<div class="rgrid">${items.filter((r) => /peak/.test(r.id)).map(rv).join('')}</div></section>`;
  return `<section class="rgroup"><h3>${esc(title)}</h3><div class="rgrid">${items.map(rv).join('')}</div></section>`;
}).join('\n');

const ASSUME = [
  'Every left-side test is the exact mirror of the right one (positions reflected through the bed\'s midline), so right and left are the same size. That means the examiner\'s hands swap roles on his left: the hammer is in the examiner\'s LEFT hand there (it changes hands as he walks round, off camera). The knee jerks are both done from his right, as asked.',
  "The kit's bicepsTendon and tricepsTendon vertices follow the palm's roll into the elbow. With his forearm pronated across his abdomen they are not on the front or back of the elbow (measured 81° and 24° off). These two tendon points are measured on the posed mesh instead: the skin vertex just above the elbow that faces the inside (biceps) or the outside (triceps) of the bend. Every other landmark is NEURO.points / P.legPoint.",
  'Arms across the tummy: the kit acrossAbdomen preset, fine-tuned: elbows resting on the mattress 30 cm out from his midline, hands palm down on his lower abdomen, elbows about 106°. For the biceps jerk the examiner\'s left hand rests on the front of his upper arm just above the elbow, its thumb pad on the tendon and the fingers together curled round the outside of the elbow onto the skin; the examiner\'s forearm rises from it toward him.',
  'Triceps: his arm is built like the arms-across preset but further out and higher: the upper arm resting on the mattress (abducted about 35°), the elbow at 90°, the forearm across his abdomen, the hand palm down toward his other side. The strike point is on the back of the arm 2-3 cm above the olecranon, where it faces out to his side and up.',
  'Supinator: the examiner\'s left index and middle fingers lie straight and side by side along the radial border of his forearm, 5 cm above the wrist joint (measured along the forearm), ring and little curled, the thumb alongside; the hammer lands on the back of the two fingers, as on the thumb for the biceps.',
  'Ankle jerk: the strike point is on the Achilles tendon about 2 cm above the level of the ankle bones, on its inner edge (the turned-out leg lifts that edge clear of the other shin, so the hammer head has room; straight behind, the head would sink into the other shin). The kit\'s achillesTendon point is about 5 cm up, where it reads as the lower calf. The examiner\'s left palm holds the sole up (foot 8° dorsiflexed).',
  'Sleeves: in the arm shots the examiner\'s upper arms rise toward his shoulders (he leans over the bed) so his sleeves leave the frame at the top, out of the side cameras.',
  'The patient does not speak in this part (he follows the instructions silently), so no visemes are used. The speech holds are still frames with no caption.',
  'The hammer is picked up off camera during the push-in; the examiner\'s right hand brings it into frame at 7.6 s, just after the first hold, so the still hold picture is not crossed by his sleeve.',
  'The hammer is put aside off camera after the ankle jerks: clonus and Hoffmann\'s need both hands. It is back in no shot after that.',
  'Breathing: P.breathe at 14 breaths a minute (its 4.6 s period sped up by 7%), off in the first and last second.',
  'Ankle clonus: the push dorsiflexes the foot by 18° in 0.13 s and holds it for about 2 s. Knee clonus: the kneecap (the skin over it) moves 8 mm toward the foot and is held for 2 s.',
  'Reflex timing: the muscle firms from 0.05 s after the strike for 0.15 s (a bulge of up to 3 mm, blended); the joint moves to its peak in 0.08 s and back in 0.22 s.',
  "Knee clonus grip: the examiner's left hand comes from above his thigh, back of the hand up; the index finger bent so its tip, and the thumb tip beside it (15 mm apart, side by side, not a V), rest on the top edge of the kneecap; the other three fingers tucked into the palm.",
  "Hoffmann's: his forearm held out at his right, hand palm down and limp, the wrist flexed about 28°, the fingers loosely curled; the examiner's left palm under his wrist (fingers together); the examiner's right index pad under the tip of his middle finger and the right thumb pad on its nail, which it flicks. The clay fingertip is about 2.4 cm thick, so the pinch is that wide.",
  'Every contact number is measured on the posed meshes (every vertex of the named part against the skin it touches), in the solve (solved.json, checks/solve-log.txt) and again on the rendered frame (the review panels).',
];
const KNOWN = [
  'The close shots are fixed camera directions tested frame by frame. Left-side shots mirror the right ones; where the wall is close on his left the camera comes in closer with a wider lens for the same view.',
  'Knee clonus, during the push: the kneecap skin and the hand both move 8 mm toward the foot, but not exactly together, so the thumb tip is 1.7 mm and the index tip 2.6 mm off the skin at 79.8 s (they rest on it before the push). I will lock the hand to the moving skin in the build.',
  'In-between travel of the hands (between holds) is still the straight blend between the solved holds; I will check it in the transitions scan after you approve the poses.',
];

const html = `<title>CNS Part 7 Storyboard</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
/* layout: a review document; beats as numbered sections (the order is the film's order), two panels per row, one on phones */
:root { --bg: #f4f7f6; --surface: #ffffff; --ink: #1f2a44; --muted: #5a6577; --line: #d6e0de; --teal: #12808a; --plaque: #f8eedb; --navy: #26336b; --good: #1d7a46; --bad: #c0362c; --warn: #a86400;
  --display: "Fredoka", "Trebuchet MS", sans-serif; --body: "Inter", system-ui, sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0b1c1e; --surface: #12292c; --ink: #e8efee; --muted: #9fb2b1; --line: #24413f; --teal: #3fb6c0; --plaque: #2a3036; --navy: #f3e6cd; --good: #6fd39a; --bad: #ff8a7f; --warn: #f0b24a; color-scheme: dark } }
:root[data-theme="dark"] { --bg: #0b1c1e; --surface: #12292c; --ink: #e8efee; --muted: #9fb2b1; --line: #24413f; --teal: #3fb6c0; --plaque: #2a3036; --navy: #f3e6cd; --good: #6fd39a; --bad: #ff8a7f; --warn: #f0b24a; color-scheme: dark }
body { background: var(--bg); color: var(--ink); font-family: var(--body); font-size: 15px; line-height: 1.5; }
.wrap { max-width: 1240px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 36px; }
h1, h2, h3 { font-family: var(--display); font-weight: 600; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(26px, 4vw, 38px); color: var(--teal); }
h2 { font-size: 22px; display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
h2 .n { color: var(--teal); }
h2 .t { font-family: var(--body); font-size: 14px; font-weight: 500; color: var(--muted); }
h3 { font-size: 18px; }
header { display: grid; gap: 10px; max-width: 80ch; }
header p { margin: 0; color: var(--muted); }
.facts { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 13px; color: var(--muted); }
.facts b { color: var(--ink); font-weight: 600; }
.beat-sec { display: grid; gap: 14px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 520px), 1fr)); gap: 18px; }
.panel { margin: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; display: grid; min-width: 0; }
.panel img, .rv img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; background: #0d3a3d; max-width: 100%; }
figcaption { padding: 12px 14px 14px; display: grid; gap: 8px; min-width: 0; }
.ph { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; font-size: 13px; }
.beat { font-family: var(--display); font-weight: 600; color: var(--teal); font-size: 15px; }
.time { font-variant-numeric: tabular-nums; font-weight: 600; }
.span { color: var(--muted); font-variant-numeric: tabular-nums; }
dl { margin: 0; display: grid; grid-template-columns: 7.5em 1fr; gap: 4px 10px; font-size: 13.5px; }
dt { color: var(--muted); font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.06em; padding-top: 2px; }
dd { margin: 0; min-width: 0; }
q { quotes: none; background: var(--plaque); color: var(--navy); font-family: var(--display); font-weight: 600; padding: 1px 8px; border-radius: 8px; display: inline-block; }
.rgroup { display: grid; gap: 12px; }
.rgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 14px; }
.rv { margin: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; min-width: 0; }
.rv figcaption { font-size: 13px; }
table { border-collapse: collapse; font-size: 13px; width: 100%; }
td, th { padding: 3px 8px 3px 0; border-bottom: 1px solid var(--line); text-align: left; }
.num { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.good { color: var(--good); } .bad { color: var(--bad); font-weight: 600; } .warn { color: var(--warn); font-weight: 600; } .clear { color: var(--muted); }
.tablewrap { overflow-x: auto; max-width: 640px; }
.note { color: var(--muted); font-size: 13px; margin: 0; max-width: 80ch; }
ol, ul { margin: 0; padding-left: 1.3em; display: grid; gap: 6px; max-width: 85ch; }
details { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; }
summary { cursor: pointer; font-weight: 600; }
pre { overflow-x: auto; font-size: 12px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
a { color: var(--teal); }
:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
</style>
<div class="wrap">
<header>
  <h1>CNS part 7: tendon reflexes, reinforcement, clonus, Hoffmann's sign</h1>
  <p>Storyboard for review. Every still is a frame of the animation itself (the same timeline, poses and cameras), rendered in software at 16 samples, with captions on. Below the panels: the review panels a to g, with every gap measured on the meshes.</p>
  <div class="facts"><span><b>97 s</b>, 12 beats</span><span><b>Soft Clay</b>, series look from shared/ v5</span><span>starts and ends on the <b>CNS home shot</b></span><span>speech holds at <b>5.0</b>, <b>34.0</b>, <b>41.0</b>, <b>51.0 s</b></span></div>
</header>
${fs.existsSync(path.join(ROOT, 'checks/round3.json')) ? `<section class="beat-sec"><h2>Round 3: your four points (beats 2-5 re-rendered)</h2><ol>${JSON.parse(fs.readFileSync(path.join(ROOT, 'checks/round3.json'), 'utf8')).map((x) => `<li><b>${esc(x.point)}</b> ${esc(x.done)}</li>`).join('')}</ol><p class="note">Kept unchanged from round 2, as approved: the ankle jerk, the Jendrassik shot, the contacts, the knee-clonus grip, Hoffmann's, the hammer never on him, the knee jerks and the reflex angles. Only the panels of beats 2 to 5 were re-rendered.</p></section>` : ''}
${fs.existsSync(path.join(ROOT, 'checks/round2.json')) ? `<details><summary>Round 2: your ten points (approved)</summary><ol>${JSON.parse(fs.readFileSync(path.join(ROOT, 'checks/round2.json'), 'utf8')).map((x) => `<li><b>${esc(x.point)}</b> ${esc(x.done)}</li>`).join('')}</ol></details>` : ''}
${beats.map((ps, b) => ps ? `<section class="beat-sec"><h2><span class="n">${b}</span> ${esc(beatName(b))} <span class="t">${meta.find((m) => m.beat === b).t0}-${meta.find((m) => m.beat === b).t1} s</span></h2><div class="grid">${ps.join('\n')}</div></section>` : '').join('\n')}
<section class="beat-sec"><h2>Review panels</h2><p class="note">Gaps are measured from the meshes: the closest point of each part (the palm and all five digits of every working hand, the hammer head, his heels and ankle) to his skin. Green: touching (0 to 1.5 mm). Amber: 1.5 to 3 mm (close but not touching). Grey: clear of the skin (a part that is not in contact). Red: under the skin. Arrows in the pictures run from the part to the skin.</p></section>
${reviewHtml}
<section class="beat-sec"><h2>Facts and numbers I assumed</h2><ol>${ASSUME.map((a) => `<li>${esc(a)}</li>`).join('')}</ol></section>
<section class="beat-sec"><h2>Known open points</h2><ul>${KNOWN.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></section>
<details><summary>Solve log (every measurement, from the solve that made solved.json)</summary><pre>${esc(log)}</pre></details>
</div>
`;
fs.writeFileSync(path.join(SB, 'storyboard.html'), html);
console.log('storyboard.html written,', (html.length / 1024).toFixed(0), 'KB');
