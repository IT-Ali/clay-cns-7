// tools/round2.mjs: the storyboard's "Round 2: your eight points" list, every number read from the measured files
// (storyboard/review.json, solved.json, checks/hammer-clearance.json). Writes checks/round2.json.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const review = Object.fromEntries(rd('storyboard/review.json').map((r) => [r.id, r]));
const G = rd('solved.json').data.gaps;
const hc = fs.existsSync(path.join(ROOT, 'checks/hammer-clearance.json')) ? rd('checks/hammer-clearance.json') : null;
const v = (id, key) => { const r = review[id]; if (!r) return '?'; const x = (r.values || {})[key] ?? (r.gaps || {})[key]; return x == null ? '?' : x; };
const gaps = (id) => { const r = review[id]; if (!r || !r.gaps) return '?'; return Object.entries(r.gaps).map(([k, x]) => `${k} ${x == null ? '> 15' : x} mm`).join(', '); };
const ang = (id) => v(id, 'elbow');
const out = [
  { point: '1. Ankle jerk.', done: `The hammer's contact point is on NEURO.points achillesTendon: ${v('b_ankR_hit', 'hammer contact to achillesTendon_R (cm)')} cm (right) and ${v('b_ankL_hit', 'hammer contact to achillesTendon_L (cm)')} cm (left). His outer ankle rests on the other shin: ${v('x_foot', 'his outer ankle on the other shin')} mm. The examiner's palm lies flat across the ball of the foot, fingers together across the sole (${gaps('x_foot')}). New camera: low, from his side, a little behind the heel.` },
  { point: '2. Arm cameras.', done: 'Biceps and supinator: from his side at elbow height. Triceps: from his side, a little from the head end. Reinforcement: a wider 3/4 view from his right, with his jaw (masseters) and right elbow in frame.' },
  { point: '3. Supinator.', done: `The hammer's contact point to NEURO.points brachioradialisTendon: ${v('b_supR_hit', 'hammer contact to brachioradialisTendon_R (cm)')} cm (right), ${v('b_supL_hit', 'hammer contact to brachioradialisTendon_L (cm)')} cm (left); that point is ${v('b_supR_hit', 'brachioradialisTendon_R to the wrist joint (cm)')} cm above the wrist joint, on the thumb side.` },
  { point: '4. Triceps.', done: `Elbow ${ang('c_triR_before')}° (right), ${ang('c_triL_before')}° (left); the forearm across his chest, the back of the elbow facing the camera.` },
  { point: '5. Jendrassik.', done: `One wide side shot from his right at knee height. Hooked fingers measured on every vertex: ${gaps('d_hooked')}.` },
  { point: '6. Contacts.', done: `Biceps thumb pad ${G.thumbR ? G.thumbR.thumbPad : '?'} mm (whole hand lowest ${G.thumbR ? G.thumbR.min : '?'} mm); ankle-clonus palm: ${gaps('f_ankle')}; knee-clonus thumb ${G.kneeClonus ? G.kneeClonus.thumbTip : '?'} mm, index ${G.kneeClonus ? G.kneeClonus.indexTip : '?'} mm; Hoffmann palm on palm ${G.hoff ? G.hoff.palmOnPalm : '?'} mm, index under the fingertip ${G.hoff ? G.hoff.indexUnderTip : '?'} mm, thumb on the nail ${G.hoff ? G.hoff.thumbOnNail : '?'} mm.` },
  { point: '7. Hand rules.', done: '60.2 s: a wide shot of both legs while the leg is turned out (no hand near the lens). Ankle clonus: the palm flat across the ball of the foot, fingers together across the sole, thumb on the inner side; the camera from his side at foot height, outside the sleeve. Knee clonus: the tips of the thumb and the index together (15 mm apart) on the top edge of the kneecap, the back of the hand up, the other fingers tucked. Hoffmann: his hand relaxed, fingers together and slightly curled; camera from his thumb side at hand height.' },
  { point: '8. Hammer.', done: hc ? `Measured every 0.1 s away from the strikes: closest approach of the hammer to his skin ${hc.closest.mm} mm (at ${hc.closest.t} s); ${hc.closerThan10mm.length} moments closer than 10 mm.` : 'Not measured yet.' },
];
fs.writeFileSync(path.join(ROOT, 'checks/round2.json'), JSON.stringify(out, null, 1));
console.log(out.map((x) => x.point + ' ' + x.done).join('\n'));
