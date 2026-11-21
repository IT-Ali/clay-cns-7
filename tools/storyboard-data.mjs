// tools/storyboard-data.mjs: which moments of the animation are storyboard panels, and the review panels (a-g).
// Every time below is a time on the real timeline (src/cns7-style.js): the stills ARE frames of the animation.
export const PANELS = [
  { beat: 1, t: 0.0, what: 'The CNS home shot (identical first frame of every part), held still 1 s.' },
  { beat: 1, t: 3.9, what: 'Slow push-in to his upper body. The examiner picks up the tendon hammer off camera (his right hand stays out of frame until 7.6 s, so the hold below is clear).' },
  { beat: 2, t: 5.8, what: 'HOLD 5.0-6.5 s, no caption (the examiner asks him to rest his arms on his tummy).' },
  { beat: 2, t: 9.2, what: 'Biceps R: his forearms across his abdomen; the pad of the examiner\'s left thumb on the right biceps tendon; the hammer lands on the thumbnail.' },
  { beat: 2, t: 12.2, what: 'HARD CUT to his left (examiner on his left): the same, mirrored.' },
  { beat: 3, t: 16.8, what: 'HARD CUT back to his right. Supinator R: the examiner\'s left index and middle fingers on the radius 5 cm above the wrist; the hammer lands on them.' },
  { beat: 3, t: 19.8, what: 'HARD CUT to his left: the same.' },
  { beat: 4, t: 25.7, what: 'HARD CUT back to his right: the examiner\'s left hand holds his right wrist and lays his forearm across his chest, the upper arm resting on the mattress.' },
  { beat: 4, t: 27.6, what: 'Triceps R: his upper arm resting on the mattress, elbow 90°, forearm across his chest held at the wrist; the hammer from above and outside onto the triceps tendon 2-3 cm above the olecranon.' },
  { beat: 4, t: 30.8, what: 'HARD CUT to his left: the same.' },
  { beat: 5, t: 34.8, what: 'HOLD 34.0-35.5 s, no caption (asks him to clench his teeth).' },
  { beat: 5, t: 36.1, what: 'HARD CUT to a 1 s close insert (35.6-36.6 s): his face from his right front, teeth clenched, the masseter bulging; hard cut back for the tap.' },
  { beat: 5, t: 37.4, what: 'Teeth clenched (masseters bulge, jaw in frame); the biceps jerk again on his right: present.' },
  { beat: 6, t: 41.8, what: 'HOLD 41.0-42.5 s, no caption.' },
  { beat: 6, t: 45.8, what: 'The examiner\'s left forearm under both knees (~30 degrees), heels on the bed; the hammer on the right patellar tendon.' },
  { beat: 6, t: 47.8, what: 'Then the left patellar tendon, from his right side, the hammer over his right shin.' },
  { beat: 7, t: 51.8, what: 'HOLD 51.0-52.5 s, no caption (hook your fingers together... pull).' },
  { beat: 7, t: 54.6, what: 'Fingers hooked in front of his chest, pulling apart; just after the pull the hammer strikes the right patellar tendon.' },
  { beat: 8, t: 60.2, what: 'The examiner\'s left hand on the sole of his right foot turns the leg out, knee bent, the outer ankle onto the other shin.' },
  { beat: 8, t: 61.8, what: 'Ankle R, from the side of the foot: the left palm on the sole holds the foot slightly up; the hammer on the Achilles tendon just above the heel.' },
  { beat: 8, t: 64.8, what: 'HARD CUT to his left: the same.' },
  { beat: 9, t: 72.2, what: 'Ankle clonus R: calf on the examiner\'s left palm, right palm pushes the foot sharply up and HOLDS it: no beats.' },
  { beat: 9, t: 75.8, what: 'HARD CUT to his left: the same.' },
  { beat: 10, t: 79.8, what: 'Knee clonus R: leg straight, thumb and index on the top edge of the kneecap, pushed toward the foot and held: none.' },
  { beat: 10, t: 83.2, what: 'HARD CUT to his left: the same.' },
  { beat: 11, t: 87.4, what: 'Hoffmann R: his hand limp, wrist slightly flexed, his wrist on the examiner\'s left palm; the examiner\'s right thumb and index hold the tip of his middle finger.' },
  { beat: 11, t: 87.67, what: 'The flick of the nail: the fingertip dips and springs back; his thumb and index do not move (negative).' },
  { beat: 11, t: 90.87, what: 'HARD CUT to his left: the same.' },
  { beat: 12, t: 95.0, what: 'HARD CUT back to his right; hands back to rest, limbs home, the camera pulls back.' },
  { beat: 12, t: 97.0, what: 'The CNS home shot, held still 1 s (pixel-identical to the first frame).' },
];
const S = { bicR: 9.2, bicL: 12.2, supR: 16.8, supL: 19.8, triR: 27.6, triL: 30.8, reinfR: 37.4, kneeR: 45.8, kneeL: 47.8, jendR: 54.6, ankR: 61.8, ankL: 64.8 };
const FIELD = { bicR: 'thumbNailL', bicL: 'thumbNailR', reinfR: 'thumbNailL', supR: 'exFingL', supL: 'exFingR', triR: 'armR', triL: 'armL', kneeR: 'legR', kneeL: 'legL', jendR: 'legR', ankR: 'legR', ankL: 'legL' };
const LMK = { kneeR: 'patellarTendon_R', kneeL: 'patellarTendon_L', jendR: 'patellarTendon_R', ankR: 'achillesStrike_R', ankL: 'achillesStrike_L' };
const PEAK = 0.14;                  // the reflex peak lands on the pose (twos) just after strike + 0.05 + 0.08 s
// every digit and the palm of a working hand, measured to his skin (all of him)
const DIG = [['palm', 'palm'], ['thumbTip', 'thumb'], ['indexTip', 'index'], ['middleTip', 'middle'], ['ringTip', 'ring'], ['littleTip', 'little']];
const digits = (hand, who, field = 'patient') => DIG.map(([part, name], i) => ({ hand, part, field, label: `${who} ${name}`, off: [14, -46 + i * 17] }));
// the supinator's two straight fingers: measured along the whole finger and at the tip
const supFingers = (hand, who, field) => [['index', 'index (whole finger)', 'index'], ['indexTip', 'index tip', 'index'], ['middle', 'middle (whole finger)', 'middle'], ['middleTip', 'middle tip', 'middle'], ['thumb', 'thumb', 'thumb'], ['palm', 'palm', 'palm']].map(([part, name], i) => ({ hand, part, field, label: `${who} ${name}`, off: [14, -46 + i * 17] }));
const strikes = [];
for (const [id, t] of Object.entries(S)) {
  const hand = /L$/.test(id) ? 'L' : 'R', other = hand === 'R' ? 'L' : 'R', contacts = [{ hand, part: 'hammer', field: FIELD[id], label: 'hammer head' }];
  if (/^bic|^reinf/.test(id)) contacts.push(...digits(other, 'ex ' + other));
  if (/^sup/.test(id)) contacts.push(...supFingers(other, 'ex ' + other, 'arm' + hand));   // the two fingers on his forearm (his arm and hand)
  if (/^ank/.test(id)) contacts.push(...digits(other, 'ex ' + other), { hand, part: 'leg' + (id === 'ankR' ? 'R' : 'L'), field: id === 'ankR' ? 'legL' : 'legR', near: 'leg:' + (id === 'ankR' ? 'R' : 'L') + ':lateralMalleolus', r: 0.6, label: 'his outer ankle on the other shin' });
  const extra = /^knee|^jend/.test(id) ? { heels: ['R', 'L'] } : {};
  strikes.push({ id: 'b_' + id + '_top', group: 'b', t: +(t - 0.4).toFixed(3), close: 9, title: id + ': top of the swing' });
  strikes.push(Object.assign({ id: 'b_' + id + '_hit', group: 'b', t, close: 6.5, contacts, landmark: LMK[id], title: id + ': the strike' }, extra));
}
const angles = [];
for (const [id, joint, side, t] of [['bicR', 'elbow', 'R', S.bicR], ['bicL', 'elbow', 'L', S.bicL], ['supR', 'elbow', 'R', S.supR], ['supL', 'elbow', 'L', S.supL], ['triR', 'elbow', 'R', S.triR], ['triL', 'elbow', 'L', S.triL], ['kneeR', 'knee', 'R', S.kneeR], ['kneeL', 'knee', 'L', S.kneeL], ['ankR', 'ankle', 'R', S.ankR], ['ankL', 'ankle', 'L', S.ankL]]) {
  angles.push({ id: 'c_' + id + '_before', group: 'c', t: +(t - 0.02).toFixed(3), n: 1, angles: [{ joint, side, label: joint }], title: id + ' before' });
  angles.push({ id: 'c_' + id + '_peak', group: 'c', t: +(t + PEAK).toFixed(3), angles: [{ joint, side, label: joint }], title: id + ' at its peak' });
}
export const REVIEW = [
  { id: 'a_plan', group: 'a', t: 45.8, title: 'Plan: his right and left', cam: { pos: [1.2, 30, 7.5], target: [1.2, 6, 0.6], focus: [1.2, 6, 0], aperture: 0, fov: 30 },
    labels: [{ at: [0.5, 6.4, 3.9], text: 'his RIGHT side (+Z, nearest the camera)', color: '#ffe14d' }, { at: [0.5, 6.4, -3.9], text: 'his LEFT side (far side)', color: '#7cf0ff' },
      { at: [4.5, 6.2, 6.4], text: 'examiner: right-side tests + BOTH knee jerks', color: '#ffe14d', off: [-330, -16] }, { at: [4.5, 6.2, -6.6], text: 'examiner walks round here (left-side tests)', color: '#7cf0ff', off: [-330, 18] },
      { at: [-6.8, 13, 0], text: 'head (screen left)', color: '#ffffff' }, { at: [8.5, 7, 0], text: 'feet (screen right)', color: '#ffffff' }, { at: [-4, 9.5, -7.4], text: 'bedside table (his left)', color: '#ffffff' }] },
  ...strikes,
  ...angles,
  { id: 'd_hooked', group: 'd', t: 54.4, close: 3.2, contacts: DIG.map(([part, name], i) => ({ hand: 'R', part: 'p:R:' + part, field: 'handL', label: 'his right ' + name + ' on his left hand', off: [14, -46 + i * 17] })), title: 'Jendrassik: hooked hands, pulling' },
  { id: 'd_face', group: 'd', t: 36.1, close: 0, facePx: true, title: 'Clench insert: his face close, masseter bulging' },
  { id: 'd_jaw', group: 'd', t: 37.0, close: 0, facePx: true, title: 'The tap shot: his face (clenched jaw), elbow, thumb and hammer' },
  { id: 'e_support', group: 'e', t: 45.2, close: 7.5, heels: ['R', 'L'], contacts: [{ hand: 'L', part: 'fore', field: 'legR', label: 'forearm-right knee' }, { hand: 'L', part: 'fore', field: 'legL', label: 'forearm-left knee', off: [14, 28] }, ...digits('L', 'ex L').map((c) => Object.assign(c, { off: [14, 50 + c.off[1]] }))], title: 'The knee support' },
  { id: 'f_ankle', group: 'f', t: 72.2, close: 6.0, contacts: [...digits('R', 'ex R'), ...digits('L', 'ex L').map((c) => Object.assign(c, { off: [-260, c.off[1]] }))], title: 'Ankle clonus: palm across the ball of the foot; the calf on the other palm' },
  { id: 'f_knee', group: 'f', t: 79.8, close: 3.4, contacts: digits('L', 'ex L'), title: 'Knee clonus: thumb and index together on the top edge of the kneecap' },
  { id: 'g_before', group: 'g', t: 87.4, close: 3.2, contacts: [...digits('L', 'ex L (support)'), ...digits('R', 'ex R (pinch)').map((c) => Object.assign(c, { off: [-300, c.off[1]] }))], points: [{ patient: 'R', name: 'thumbTip', label: 'his thumb tip' }], title: "Hoffmann's: before the flick" },
  { id: 'g_after', group: 'g', t: 87.67, close: 3.2, points: [{ patient: 'R', name: 'thumbTip', label: 'his thumb tip' }, { patient: 'R', name: 'middleTip', label: 'middle fingertip' }], title: "Hoffmann's: the flick (his thumb still)" },
  { id: 'x_biceps_thumb', group: 'x', t: 8.9, close: 3.4, contacts: digits('L', 'ex L'), title: 'Biceps: the thumb on the tendon' },
  { id: 'x_sup', group: 'x', t: 16.4, close: 3.4, contacts: supFingers('L', 'ex L', 'armR'), landmark: 'supPoint_R', lmOnly: true, title: 'Supinator: two fingers on the radius 5 cm above the wrist' },
  { id: 'x_tri', group: 'x', t: 27.6, close: 6.0, tri: 'R', contacts: [{ hand: 'R', part: 'phandR', field: 'torso', label: 'his hand on his chest', off: [14, -30] }], angles: [{ joint: 'elbow', side: 'R', label: 'elbow' }], title: 'Triceps R: upper arm on the mattress, hand on the chest, strike above the olecranon' },
  { id: 'x_triL', group: 'x', t: 30.8, close: 6.0, tri: 'L', contacts: [{ hand: 'L', part: 'phandL', field: 'torso', label: 'his hand on his chest', off: [14, -30] }], angles: [{ joint: 'elbow', side: 'L', label: 'elbow' }], title: 'Triceps L (mirror)' },
  { id: 'x_supfing', group: 'x', t: 16.4, close: 2.6, contacts: supFingers('L', 'ex L', 'armR'), points: [{ hand: 'L', name: 'indexMidBack', label: 'index' }, { hand: 'L', name: 'middleMidBack', label: 'middle' }], title: 'Supinator: index and middle straight and together along the radius' },
  { id: 'x_wrist', group: 'x', t: 27.2, close: 3.4, contacts: digits('L', 'ex L'), title: 'Triceps: the wrist hold' },
  { id: 'x_foot', group: 'x', t: 61.6, close: 5.0, contacts: [...digits('L', 'ex L'), { hand: 'R', part: 'legR', field: 'legL', near: 'leg:R:lateralMalleolus', r: 0.6, label: 'his outer ankle on the other shin', off: [14, 60] }], title: 'Ankle jerk: palm across the ball of the foot; ankle across the shin' },
  { id: 'x_hoffL', group: 'x', t: 90.6, close: 3.2, contacts: [...digits('R', 'ex R (support)'), ...digits('L', 'ex L (pinch)').map((c) => Object.assign(c, { off: [-300, c.off[1]] }))], title: "Hoffmann's left (mirror)" },
];
