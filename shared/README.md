# shared/ — the internal-medicine examination series kit (v5)

**v5: neuro mode.** v5 adds an optional NEURO mode for the neurological (CNS) examination: moving legs, a fuller face,
head and neck, shrug, the runtime backrest, landmarks (`NEURO.points`) and the neurological instruments. The 45-degree
mode and the flat mode are still the defaults and render pixel-identical to v4b: a part built on v4b switches to v5
without changing a line (proof: `node tools/pixeldiff.mjs`, 0 differing pixels for `SET.HOME` and `SET.HOME_FLAT`). See
"v5: neuro mode" at the end of this file.

**v4: flat mode.** v4 adds an optional FLAT (supine) mode for the abdominal (GIT) examination. The 45-degree mode is
still the default and renders pixel-identical to v3: a part built on v3 switches to v4 without changing a line (proof:
`node check/pixeldiff.mjs`, 0 differing pixels). See "v4: flat mode" at the end of this file.

Everything the three parts reuse, so the patient, the set and the home shot match exactly when the three MP4s are
joined. Give this folder, together with `ref/patient_full.png` and `ref/patient_face.png`, to the sessions that build
parts 2 and 3.

All files are classic scripts (no modules). They need a global `THREE` (three.js **0.187.0**, core only) and the
STAGE kit (`lib/stage.js`, global `K`). Load them in this order, after `lib/stage.js`:

```html
<script src="lib/stage.js"></script>
<script src="shared/clay.js"></script>     <!-- CLAY: clay material + shape helpers (needed by all below) -->
<script src="shared/set.js"></script>      <!-- SET: backdrop, lighting, HOME shot constants, render settings -->
<script src="shared/bed.js"></script>      <!-- BED: hospital bed, pillow, bedside table with the glass -->
<script src="shared/props.js"></script>    <!-- PROPS: small clay clock (racing hand, no text) -->
<script src="shared/hands.js"></script>    <!-- HANDS: hands (patient + gloved examiner), examiner forearms/sleeves -->
<script src="shared/patient.js"></script>  <!-- PATIENT: the recurring patient (needs HANDS, BED) -->
<script src="shared/sheet.js"></script>    <!-- SHEET: the white sheet draped over him (needs PATIENT) -->
<script src="shared/caption.js"></script>  <!-- CAPTION: the cream caption plaque (2D overlay) -->
<script src="shared/abdo.js"></script>     <!-- v4 ABDO: abdominal landmarks as world points (needs PATIENT) -->
<script src="shared/home.js"></script>     <!-- v4 HOME: home poses of his arms and the examiner's hands, both modes -->
<!-- v5 (optional, the neuro mode): -->
<script src="shared/patient-neuro.js"></script>  <!-- PATIENT.neuro (used by PATIENT.build(S, { neuro: true })); may load anywhere after patient.js -->
<script src="shared/neuro.js"></script>          <!-- NEURO: landmarks and CNS poses (after home.js) -->
<script src="shared/neuro-props.js"></script>    <!-- the neurological instruments (adds to PROPS; after props.js) -->
```

## Units and layout (identical in every part)

- 1 world unit = 10 cm. Floor at y = 0. The bed's long axis runs along X.
- Patient's head toward **-X (screen left)**, feet toward **+X (screen right)**.
- His **RIGHT** side faces **+Z** (toward the camera). The examiner stands there in every beat.
- The bedside table is on his **LEFT** (-Z, far side), near his head.

## Files

| File | What it is | Main entry points |
|---|---|---|
| `clay.js` | The Soft Clay kit from the reference style source, unchanged in behaviour: `claySurface()` (tiling height map of fingerprints, knife drags, joins, pits, fine tooth), `clay()` (triplanar plasticine material, soft dents, streaked second colour, waxy sheen) and `lumpy()` (shapes a geometry by hand). Series additions: a `'skin'` surface (fine tooth only, for the patient's skin and hair) and a `'flat'` one (nails), a palm/side tint (`palm`, with `palmX` to fade it in along the object), `roughVar` (how much the broad noise varies the roughness; skin defaults to almost none, so the skin is one even colour with no sheen patches), and `CLAY.mat(a, b, opts)` with `scale` for big set pieces (marks scaled with the set). Also the `loft` shape helper. | `CLAY.surface(kind)`, `CLAY.clay(colour, opts)`, `CLAY.lumpy(geo, opts)`, `CLAY.mat(a, b, opts)`, `CLAY.loft`, `CLAY.ellipsoid`, `CLAY.mesh`, `CLAY.anchor` |
| `set.js` | The reference set, scaled by `SET.SC` = 2.7 (the bed set is 2.7x the reference tabletop): the seamless teal paper sweep with its tooth, the big soft key from the upper left, the sky light with real occlusion, the reference environment, plus a raking lamp and a fill light (off unless a shot asks). **`SET.HOME`** is the home shot (camera, 28 degree lens, focus). **`SET.RENDER`** is the reference grade. `SET.poseTime(t)` is stop-motion time on twos; `SET.flicker(t)` the 1.2% key flicker. | `SET.build(S)` -> lights `L` with `L.set(t, opts)`; `SET.shoot(S, shot)`; `SET.HOME`, `SET.LAMP`, `SET.SKY`, `SET.ENV`, `SET.RENDER`, `SET.SC` |
| `bed.js` | Pale grey bed frame, pale sage mattress with the backrest at 45 degrees, one white pillow, and the bedside table (warm wood) with a clear glass of water. `BED.DIM` holds the measurements the patient uses. | `BED.build(S)` → `{ placePillow(headBack, s) }`, `BED.table(S)`, `BED.DIM`, `BED.onBack(s, off)` |
| `props.js` | The small clay clock (12 nubs, one racing hand, no text). | `PROPS.clock(S)` → `{ group, set(seconds, scale) }` |
| `hands.js` | One hand builder for the patient (skin, nails with a nail fold at the normal 160° nail-bed angle, thenar/hypothenar eminences, finger pulps, dorsal tendons; optional `skinWrist` material for the palm and thumb base) and the examiner (blue nitrile-glove clay). Left hands are mirrored right hands, so thumbs are always on the correct side. Named contact points (`indexPad`, `thumbPad`, `middleMidBack`, `dorsum`, `palm`, `indexFold`, ...) and a solver that puts a contact exactly on a world point. The examiner's forearm and teal scrub sleeve leave the frame toward the camera. | `HANDS.make(opts)`, `HANDS.quat(fingerDir, dorsalDir)`, `HANDS.place(hand, contact, point, quat)`, `HANDS.examinerArm(S, mats, 'R'|'L')` → `{ hand, follow(backDir) }` |
| `patient.js` | **The recurring patient.** A clay man of about 55: medium-brown skin (#9b6b4b, even), short dark-brown hair (#2a221d) greying at the sides (#8d8882), a neat moustache, **no beard**, a **slim neck (do not widen it)**, average build, bare-chested, light blue pyjama trousers. Reclined at 45 degrees on the bed. Skin: one even colour (fine tooth and waxy sheen only, no streaks or dents). Each arm is one continuous surface from the shoulder through the elbow and wrist into the palm, bent by the upper-arm, forearm and hand frames (no ring at the elbow, no seam at the wrist). Face: eyes with lids (the lower lid can be drawn down to show the pink conjunctiva), iris with a clean rim, mouth (stop-motion replacement piece) with rows of separate teeth and one smooth pink tongue that slides out past the lower lip (soft midline groove), lips. Legs: the lower leg, heel and foot are ONE smooth sweep (no join), heel resting on the mattress, the foot standing up (toes to the ceiling, turned slightly outward, the same on both sides); both ankles mildly puffy (bilateral oedema); low, rounded medial malleolus on the inner side and the lateral malleolus; press points on the inner face of the tibia 2 cm above each medial malleolus; a thumb-pad-shaped pit. | `PATIENT.build(S)` → `P` with `P.setArm(side, wrist, quat, handPose, pole)`, `P.setFace({ jaw, tongue, gazeUp, pullR, blink })` (tongue 0..1 = in..out), `P.setPit(side, depth)`, `P.setRoll(u)`, `P.breathe(t)`, `P.anchor(name)`, `P.shoulder(side)`, `P.headBack()`, `P.legSDF(side, point)` (approximate signed distance to the lower leg and foot) |
| `sheet.js` | The white sheet (#f3efe7 / #ddd5c6) over him from the waist down, draped over his legs, with a turned-down hem. It folds up off the lower legs in layers and back. | `SHEET.build(S, P)` → `{ setFold(u), heightAt(x, z) }` |
| `caption.js` | The series caption: a cream rounded plaque (#f8eedb) with dark navy text (#26336b) in Fredoka, a soft shadow, 0.25 s fades, placed top, bottom or in a corner. | `CAPTION.at(ctx, t, list, W, H)`, `CAPTION.draw(...)`, `CAPTION.FONT_SPEC` |

## The home shot (start and end of every part)

```js
const L = SET.build(S); const bed = BED.build(S); BED.table(S);
const P = PATIENT.build(S); const SH = SHEET.build(S, P); bed.placePillow(P.headBack(), 7.15);
SET.shoot(S, SET.HOME);            // camera, lens and focus
L.set(0, {});                      // lamp, sky, no rake, no fill
// patient: arms resting at his sides on the sheet, face neutral, no breathing offset (P.breathe(0)),
// sheet unfolded (SH.setFold(0)), trousers down (P.setRoll(0)), no pits, clock hidden.
// examiner: both gloved hands resting on the mattress edge at his right side.
```

The exact home poses (patient arms, examiner hands) are built in `cvs1-style.js` (`ST.arm.rest`, `ST.ex.rest`); copy
those two functions (`restArm`, `exRest`) into parts 2 and 3 unchanged. Lamp flicker and breathing are switched off
during the first and last second so the joined frames are identical. Fade the ambience bed in over the first 0.5 s and
out over the last 0.5 s.

## Render settings

Use `SET.RENDER` as the style's `render` block (the reference grade: neutral tone, bloom 0.06, threshold 1.1,
vignette 0.26, grain 0.014, fov 28, shutter 0 = no motion blur, 64 samples), fonts `['600 56px "Fredoka"']`, poses on twos via `SET.poseTime(t)`.

## v4: flat mode

Everything below is OPTIONAL. Without it the kit is exactly v3 (same code path, same random seeds, same pixels).

### What v4 adds

| Where | New | Default | What it does |
|---|---|---|---|
| `bed.js` | `BED.configure({ backrestDeg })` | `45` | Call **before** `BED.build` and `PATIENT.build`. `0` = flat: the backrest lies down in line with the mattress (the mattress is then 2.1 m long), the head board moves to the new head end (x = -10.85), and `BED.build` makes **two stacked white pillows** (the same pillow twice). `BED.DIM.angle`, `BED.slope`, `BED.normal`, `BED.onBack`, the backrest mattress and plate and the strut all follow the angle. `BED.flat` is true at 0; `BED.config` holds the setting. |
| `bed.js` | `bed.pillows` | `[pillow]` | `[lower, upper]` on the flat bed. |
| `bed.js` | `bed.placePillow(headBack, s)` | as v3 | Flat bed: the two pillows share the gap under the back of his head (each squashed to half of it); the lower one reaches under his shoulders. `s` is optional there (default: centred on the back of his head). At 45 degrees it is the v3 function. |
| `patient.js` | `PATIENT.build(S, { pose: 'flat' })` | `'reclined45'` | Lying flat on his back (needs the flat bed; it throws otherwise). Head and shoulders raised about **12 degrees** on the pillows (the upper chest bends smoothly, `PATIENT.FLAT.bend`; the abdomen stays flat and relaxed), face looking up, arms free to rest by his sides, legs straight under the sheet, feet standing up as before. The same man: same face, skin, hair, slim neck, hands, legs and proportions. |
| `patient.js` | the modelled abdomen (flat pose) | | On his real surface, finely meshed (384 x 460): an **inverted umbilicus** (about 1.5 cm across, 7 mm deep, soft rim, a little hood) at s = 1.35; a flat, normal abdomen with the **rectus edges** just suggested and a faint linea alba above the umbilicus; both **costal margins** and the **xiphisternum** as soft ridges; the **ASIS**; the iliac crests; the **inguinal ligaments** (faint oblique ridges) with the **groin creases** just below them; the **pubic tubercles** and the **upper edge of the pubic bone**, just above the folded waistband. Skin: the same even colour, no marks. |
| `patient.js` | `P.pose` | `'reclined45'` | The pose he was built in. |
| `patient.js` | `P.setWaist(u)` | `0` | The trousers: `0` = waistband at the waist (as before), `1` = folded down to the groin creases: the rolled waistband lies just above the pubic hair line in the middle and under both groin creases, so both groins and inguinal ligaments are visible and nothing lower shows. Modest: no genitals, no pubic hair, ever. (Built with the flat pose. On the reclined torso it is only built the first time it is asked for, and is approximate there: that torso has no groins.) |
| `patient.js` | `P.breathe(t)` | as v3 | Flat pose: the abdominal wall moves **out on inspiration** (about 4.5 mm each way at the umbilicus, 9 mm from full out to full in), the chest a little. The phase is the v3 phase (period 4.6 s). Reclined: the v3 chest breathing, unchanged. |
| `patient.js` | `P.breath()` | | The current phase, -1 (out) .. 1 (in). |
| `patient.js` | `P.surfacePoint(x, s, dir)` | `dir = 'front'` | `{ point, normal }` in world space of the trunk surface at torso-local `[x, s]` (see `PATIENT.LM`), with the current breathing. `dir`: `'front'`, `'back'`, `'left'`, `'right'` or `[dx, dz]` (the side the skin is found from). |
| `patient.js` | `PATIENT.LM` | | The trunk landmarks in torso-local `[x, s]` (x toward his LEFT, s up the body, 1 = 10 cm). The flat torso is sculpted from these numbers and `abdo.js` maps them, so the model and the points always agree. |
| `patient.js` | `PATIENT.FLAT` | | The flat pose's constants (torso origin, neck flexion, the bend of the upper chest, where the thighs start). |
| `sheet.js` | `SHEET.build(S, P, { from: 'groin' })` | `'waist'` | The sheet's top edge lies just below the folded waistband (`PATIENT.LM.sheetGroinS`), with a flatter, thinner hem (his forearms lie across it). `SH.hemTop(z)` gives the top of the hem. |
| `set.js` | `SET.HOME_FLAT` | | The flat HOME SHOT: the same lens (28 degrees), height, distance and lighting as `SET.HOME`, re-centred on the longer flat bed: his whole body and the bedside table in frame. `SET.HOME` is unchanged. |
| `abdo.js` (new) | `ABDO.points(P)` | | Every abdominal landmark as a world point on his skin, recomputed on each call (so it follows the breathing; call it after `P.breathe(t)`). `ABDO.list(P)` gives the same as a flat list `{ name, point, normal }`. The first call finds the points on the surface (about 5 s in software rendering); later calls take about 25 ms. |
| `home.js` (new) | `HOME.restArm(side, mode, SH)`, `HOME.exRest(side, mode, SH)` | `mode = 'reclined45'` | The home poses. `'reclined45'` returns **exactly** what `restArm` / `exRest` in `cvs1-style.js` return (copied; checked equal by `check/pixeldiff.mjs`). `'flat'`: his arms by his sides, palms down, the hands resting on the sheet beside his thighs; the examiner's gloved hands at his right side on the sheet near the mattress edge, palms down, fingers together and flat (never upright). In flat mode his resting hands also lie ON the sheet, following its slope over his thighs (`HOME.restArm(side, 'flat', SH, P)`, used by `HOME.apply`), and `HOME.solveEx` settles each glove ON the sheet: the palm, each finger and the thumb rest 0.05 mm above it, nothing sinks in (`HOME.handGaps(hand, surface)` measures it; see `check/stills/v4_08c..d`). `HOME.FLAT` holds the numbers. Helpers: `HOME.solveEx(EX, side, st)`, `HOME.applyArm(P, side, st)`, `HOME.applyEx(EX, side, st)`, `HOME.apply(P, EX, SH, mode)`. |

Every v3 `P.*` function works in both poses: `setArm`, `setFace`, `setPit`, `setRoll`, `breathe`, `anchor`,
`anchorNormal`, `shoulder`, `headBack`, `legSDF`.

### The flat home shot

```js
BED.configure({ backrestDeg: 0 });                       // FIRST: the flat bed
const L = SET.build(S); const bed = BED.build(S); BED.table(S);
const P = PATIENT.build(S, { pose: 'flat' });
P.setWaist(1);                                           // trousers folded down to the groin creases (0 = at the waist)
const SH = SHEET.build(S, P, { from: 'groin' });         // the sheet from just below the waistband over his legs
bed.placePillow(P.headBack());                           // two pillows under his head and shoulders
const EX = { R: HANDS.examinerArm(S, exM, 'R'), L: HANDS.examinerArm(S, exM, 'L') };   // exM as in cvs1-style.js
HOME.apply(P, EX, SH, 'flat');                           // his arms by his sides, the examiner's hands at rest
P.setFace({}); P.breathe(0); P.setRoll(0); SH.setFold(0);
SET.shoot(S, SET.HOME_FLAT);
L.set(0, {}); L.lamp.intensity = SET.LAMP.power;         // no flicker on the home shot
```

Build the sheet AFTER `P.setWaist(...)` (it drapes over what is there). The flat patient is about 1.7 m long, head
toward -X (x = -9.1 at the crown), xiphisternum at about x = -4.6, umbilicus at x = -2.65, the folded waistband at
x = -1.04 (midline), the sheet's top edge at x = -0.78, knees x = 2.45, heels about x = 7.9.

### Abdominal landmarks: `ABDO.points(P)`

R = the patient's RIGHT (+Z, the examiner's side), L = his LEFT. Single points are `THREE.Vector3` (their outward
normals in `A.normals[name]`); lines are arrays of `Vector3`.

| Name | What |
|---|---|
| `xiphisternum`, `umbilicus`, `pubicSymphysis` | |
| `costalMarginR`, `costalMarginL` | lines from the xiphisternum to the 10th costal cartilage |
| `mclR`, `mclL` | mid-clavicular lines, from the clavicle down to the mid-inguinal point |
| `asisR`, `asisL` | anterior superior iliac spines |
| `inguinalLigamentR`, `inguinalLigamentL` | lines from the ASIS to the pubic tubercle |
| `midInguinalR`, `midInguinalL` | on the ligament under the midpoint of ASIS and symphysis (the femoral pulse) |
| `midLigamentR`, `midLigamentL` | the midpoint of the ligament (the deep inguinal ring) |
| `pubicTubercleR`, `pubicTubercleL`, `groinCreaseR`, `groinCreaseL` (lines) | |
| `regions.{RH, epigastric, LH, Rlumbar, umbilical, Llumbar, RIF, suprapubic, LIF}` | the centres of the 9 regions |
| `lines.{mclR, mclL, subcostal, intertubercular}` | the two vertical and two horizontal dividing lines |
| `rightIliacFossa`, `leftHypochondrium`, `epigastrium`, `suprapubic` | the same centres by name |
| `liver.upperBorder`, `liver.lowerEdge`, `liver.edge` (line), `liver.spanCm` | upper border at the right 5th intercostal space in the MCL; lower edge at the right costal margin (not palpable); span about 10 cm |
| `gallbladder` | right costal margin at the MCL (tip of the 9th costal cartilage) |
| `spleen.centre`, `spleen.ribs` (9th, 10th, 11th), `spleen.path` (line) | under the left 9th-11th ribs behind the mid-axillary line (not palpable); `path` runs from the left costal margin toward the right iliac fossa (the way an enlarged spleen grows, for palpation) |
| `kidneyR.front`, `kidneyR.back`, `kidneyL.front`, `kidneyL.back` | in front: below the costal margin, lateral to the rectus; behind: the renal angle (on his back, under him) |
| `bladder` | suprapubic (not palpable) |
| `ics.{R3, R4, R5, L3, L4, L5}` | the 3rd, 4th and 5th intercostal spaces in the mid-clavicular lines |
| `ausc.{bowel, aorta, renalR, renalL, liver}` | just right of the umbilicus; just above it; 2-3 cm above and lateral to it on each side; over the liver |
| `hernia.{groinR, groinL, superficialR, superficialL, umbilical}` | the groins at the inguinal ligaments (deep rings; superficial rings above and lateral to the pubic tubercles) and the umbilicus |
| `mcBurney` | (bonus) two thirds of the way from the umbilicus to the right ASIS |

Their torso-local definitions are in `PATIENT.LM` (patient.js) and in `abdo.js`. Labelled stills: `check/stills/`.

### Checks

`check/` holds the check page (`check/render.html`), the flat check scene (`check/flat-check.js`), the pixel-difference
proof (`node check/pixeldiff.mjs [samples] [w] [h] [t]`) and the stills. Reference images of the flat pose:
`ref/patient_flat_full.png`, `ref/patient_flat_abdomen.png`.

## v5: neuro mode

Everything below is OPTIONAL. Without it the kit is exactly v4b (same code path, same random seeds, same pixels: the new
materials take their own seeds, `CLAY.mat(..., { fixedSeed })`, so they never shift the seeds of the materials made after
them). Standing and walking are not in v5.

### Proof that the defaults are unchanged

`node tools/pixeldiff.mjs [w h samples]` renders `check/scenes/home45.js` (SET.HOME, reclined45, the v3 home poses) and
`check/scenes/homeflat.js` (SET.HOME_FLAT, flat, `HOME.apply 'flat'`) with `shared-v4b/` and with `shared/` (v5, all v5 files
loaded) at the same settings: **0 differing pixels** in both (`check/stills/pixeldiff/result.txt`).

### What v5 adds (every new function and option, with its default)

| Where | New | Default | What it does |
|---|---|---|---|
| `patient.js` | `PATIENT.build(S, { neuro: true })` | off | Builds the neuro patient (needs `patient-neuro.js`). Works with pose `'reclined45'` and `'flat'`. The v4 leg pieces are hidden and replaced by the new legs; the rest of him is the same model. |
| `patient-neuro.js` | `P.setLeg(side, { hipFlex, hipAbd, hipRot, knee, ankle, ankleInv, bigToe, toes, fan })` | all 0 = today's straight leg | Degrees. hipFlex 0..110 (up off the bed), hipAbd -30..40 (+ out to his side), hipRot ±40 (+ external: knee and foot turn out), knee 0..130, ankle -40..+20 (+ dorsiflexion, 0 = the resting foot), ankleInv ±20 (+ inversion), bigToe ±40 (+ extension), toes 0..40 (the others curl), fan 0..1 (the others spread). Each leg is ONE continuous surface from the hip through the knee and ankle into the foot (the toes are separate, like fingers): quadriceps with the vastus medialis, hamstrings and the popliteal hollow, patella, patellar tendon, tibial tuberosity, shin crest, calf heads, tibialis anterior, Achilles tendon, both malleoli, heel and sole with its lateral border, the big toe with a nail. The joints turn each ring by its share of the bend (no ring, band or seam at the knee or ankle). |
| | `P.leg(side)`, `P.legPoint(side, name)`, `P.legNormal(side, name)`, `P.toePoint(side, 'medial'\|'lateral'\|'tip'\|'nail'\|'pad')`, `P.legSolePath(side)` | | World points on the posed leg: `hip`, `knee`, `ankle` (joint centres), `heel`, `heelBack`, `sole`, `ball`, `dorsum`, `patella`, `patellarTendon`, `tibialTuberosity`, `shinMid`, `calf`, `quadriceps`, `hamstrings`, `tibialisAnterior`, `medialMalleolus`, `lateralMalleolus`, `achilles`, `toeTip`, `L2`, `L3`, `L4`, `L4mm`, `L5`, `S1`, `S1heel`. |
| | `P.legFit(side, [{ point, at, w, axis }], { free, start, reg, iters })` | free `['hipFlex', 'knee']` | Solves the free angles so leg points reach world targets (`axis: 'y'` matches only the height); applies and returns the state with `.error` (world units). |
| | `P.legSDF(side, point)` | | Now follows the pose: thigh, knee, lower leg and foot (approximate, negative inside). `P._legSDFv4` is the v4 one. |
| | `P.setTrouserRoll(u)` | `0` (as now) | `1` = both trouser legs rolled up to about 5 cm above the top of the knees, a neat rolled cuff; nothing higher. `P.setRoll(u)` (v4, mid-calf) still works. On the reclined torso the neuro mode adds the pyjama pants over his pelvis (the flat torso already has its trouser shell). |
| | `P.setOedema(u)` | `1` (as now) | `0` = normal ankles: the malleoli and the Achilles tendons crisp. `P.setPit(side, d)` works on the new legs; `P.anchor('Rpress'|'Rmm'...)` follows the pose. |
| | `P.setHead({ turn, flex, tilt })` | `{}` = as now | Degrees. turn + = face to his RIGHT (about ±60), flex + = chin to the chest (to about 50, - = extension), tilt + = right ear to the right shoulder. The slim neck follows (never widened); the sternocleidomastoid of the side opposite the turn stands out. `P.headPose()`. |
| | `P.setShrug(u)` | `0` | Both shoulders up 3 cm (joints, shoulder tops, clavicles, the skin over the trapezius). Call it before `P.setArm` in a frame (the shoulder joints move). |
| | `P.setFace({...})` | every v4 key unchanged | New keys (default 0 / as now): `gazeX` (deg, + = to his right, ±35), `gazeY` (deg, + = up, ±25), `converge` (deg each eye turns in), `pupilR` / `pupilL` (mm across; default **4.8 = as now**; 2 = constricted, 3.5 = normal, 6 = dilated; in the neuro mode the iris is a lighter warm mid-brown with a darker rim so the black pupil reads at every size: the default patient keeps the v4 iris), `closed` (eyes gently closed), `squeeze` (screwed tightly shut: crow's feet, cheeks lifted, brows down), `brows` (eyebrows raised, forehead wrinkles), `smile` (upper teeth showing, nasolabial folds deepen equally), `puff` (cheeks blown out), `ah` (mouth wide open: any `ah` > 0 opens the jaw wide and a real mouth opens in the face, the hard and soft palate, a central uvula that rises with `ah` 0..1, the pillars, the tongue on the floor), `cheekR` / `cheekL` (tongue pushed into that cheek), `tongueX` (with `tongue: 1`: ±1, + = to his right), `clench` (masseter and temporalis bulge), `swallow` (0..1: the larynx rises and falls back), `cough` (0..1: a small jolt), `round` / `wide` (lip shapes) and `viseme` (`'rest'`, `'A'`, `'E'`, `'O'`, `'U'`, `'M'`, `'F'`: silent speech). `jaw` may now go to 3 (1.6 = mouth wide open; opening against a hand ~1.2; relaxed for the jaw jerk ~0.35). In the neuro mode an open mouth (`jaw`, `tongue`, `ah`) turns the **mandible about the jaw joints** in front of the ears: everything below a line from the mouth corners up to the joints moves rigidly (the chin keeps its rounded shape and width), the cheeks stretch, the neck is untouched. With the mouth closed and all new keys at default the face takes the v4 code path (exactly as now). `P.FACE_KEYS`, `PATIENT.NEURO.VISEMES`. |
| | `P.setRecline(deg)` | `45` | Runtime: his trunk (head, shoulders, pants) turns with the backrest about his hips (reclined45 build only). |
| | `P.setArm(...)` (neuro mode) | as v4 | Same call; in the neuro mode the upper arm keeps its round cross-section in every position (v4 flattened it when the forearm was square to the upper arm), the elbow turns ring by ring about the joint (no flat end at full flexion) and, with the arm raised, the root of the arm is drawn into the shoulder. With the arms resting by his sides the arms look as before. |
| | `PATIENT.NEURO` | | `LEG_DEFAULT`, `LEG_RANGE`, `ROLL_TO` (the hem's leg coordinate when rolled), `VISEMES`. |
| `bed.js` | `bed.setBackrest(deg)`, `bed.backrest()`, `bed.setPillow(on)` | built angle, pillow on | RUNTIME backrest (0..80): the backrest mattress and plate turn about the hinge, the strut folds, the head board, rails and head-end legs move exactly as `BED.configure` would build them; `BED.DIM.angle`, `BED.slope`, `BED.normal`, `BED.onBack` follow, so `placePillow` works at any angle. Back at the built angle the bed is restored exactly. |
| `home.js` | `HOME.recline(P, bed, SH, deg, { pillow, arms, headFlex })` | pillow on | Lowers / raises everything together: bed, trunk, pillow (off: his head extends until the back of it rests on the mattress), his resting arms (`HOME.restArmAt`). `HOME.recline(P, bed, SH, 45, { pillow: true })` gives the exact home back. Returns `{ headFlex, arms }`. Helpers `HOME.restArmAt(P, side, SH)`, `HOME.pillowS(P)`. |
| `home.js` | `HOME.apply(P, EX, SH, 'cns')`, `HOME.exRest(side, 'cns', SH)`, `HOME.cnsPatient(P)`, `HOME.CNS` | | The CNS home: reclined at 45 degrees exactly as the cardiovascular home shot, trousers rolled above the knees, oedema 0, legs and head straight, no shrug; his arms rest as in the 45-degree home (on the mattress beside his thighs); the examiner's gloved hands rest palms down, fingers together, flat on the mattress at his right side (settled like the flat-mode hands, never upright). |
| `set.js` | `SET.HOME_CNS` | = `SET.HOME` | The CNS home shot. `SET.HOME` already frames everything (head, both arms, the bare knees, lower legs and feet, the folded sheet, the table), so it is the same camera. |
| `sheet.js` | `SHEET.build(S, P, { from: 'foot' })`, `SHEET.foot`, `SHEET.FOOT` | `'waist'` | The sheet folded in a neat bundle across the foot of the bed, below his feet (from x = 8.75 to the end, the last layer over the edge); both legs fully visible. `heightAt(x, z)` = the top of the bundle or the bare mattress (dropped rays), `setFold()` does nothing. |
| `clay.js` | `CLAY.mat/clay(..., { fixedSeed })`, `CLAY.restVariant(mat)` | | Own random seed (leaves the shared counter alone); a material textured by the rest shape (`restPos`/`restNrm`) of a deformed mesh. |
| `neuro.js` (new) | `NEURO.points(P)`, `NEURO.list(P)`, `NEURO.NAMES` | | The neuro landmarks as world points on his skin, recomputed on every call: they follow every pose and the breathing (normals in `.normals[name]`; lines are arrays). See the table below. |
| `neuro.js` | `NEURO.HAND` | | His hand poses (`hand.pose` / `P.setArm`): `relaxed`, `open`, `together` (flat, fingers together), `fist`, `grip` (round two of the examiner's fingers), `point` (index out, others curled, thumb tucked), `hook` (Jendrassik), `thumbFlex` (Hoffmann's sign), `spread` (finger abduction), `cup` (a coin or key in the palm), `pat`. |
| `neuro.js` | `NEURO.arm(P, side, name, opts)` | | Arm states for `P.setArm` / `HOME.applyArm`: `rest`, `outstretched` (straight out in front, horizontal at shoulder height, parallel, palms up, fingers together; `drift` 0..1 turns the palm in and lets it sink), `acrossAbdomen` (biceps and supinator jerks), `acrossChest` (elbow out and bent 90, forearm across the chest: triceps jerk), `fingerNose`, `fingerTo` (`at`), `abduct90` (shoulder out 90, elbow bent), `wrist` (`flex` ± deg), `jendrassik` (`pull`), `pat` (`flip`, `lift`), `palmUp` (`pose`). Pass `{ SH }` for `rest` / `palmUp`. `NEURO.place(P, side, contact, at, quat, pose, pole)`, `NEURO.palmPoint(P, side)`. |
| `neuro.js` | `NEURO.leg(P, side, name, opts)` | | Leg presets (applied, returned): `rest`, `kneeLift` (`knee`, the heel slides on the mattress: tone), `9090` (power), `kernig` (`knee`), `footFlat` (`knee`), `heelShin` (`u` 0..1 down the other shin), `kneeJerk` (`knee`, default 30; use on both legs), `ankleJerk` (turned out, knee bent, the outer ankle across the other shin), `plantar` (`response: 'flexor' \| 'extensor'`). `NEURO.kneeSupport(P)`: where the examiner's forearm goes under both knees. |
| `neuro-props.js` (new) | `PROPS.tendonHammer`, `tuningFork({ hz: 128 \| 512 })` (round foot, stem, U yoke, two prongs side by side; 128 Hz: 20 cm with small weights on the prong ends; 512 Hz: 15 cm), `cottonWisp`, `neuroPin`, `coldMetal`, `penTorch` (`setOn`, a soft spot light), `key` (round bow with a hole, shoulder, toothed blade), `tongueDepressor`, `smellBottles`, `snellen`, `ishihara({ number })` (small dots, the number in orange-red on green, readable; default 12), `pen`, `wristwatch`, `coin`, `cupOfWater`; `PROPS.place`, `PROPS.inHand` | | The instruments in clay at real size; each `(S) -> { group, pts }` with its own frame (+X along it, origin where it is held); hammer `setSwing(rad)` / `strikeWorld()`, fork `setVibrate(u)`. |

### The CNS home shot (start and end of every CNS part)

```js
const L = SET.build(S); const bed = BED.build(S); BED.table(S);
const P = PATIENT.build(S, { neuro: true });
const SH = SHEET.build(S, P, { from: 'foot' });          // the sheet folded at the foot of the bed
bed.placePillow(P.headBack(), 7.15);
const EX = { R: HANDS.examinerArm(S, exM, 'R'), L: HANDS.examinerArm(S, exM, 'L') };   // exM as in cvs1-style.js
HOME.apply(P, EX, SH, 'cns');                           // trousers rolled, oedema 0, legs/head straight, arms and hands at rest
P.setFace({}); P.breathe(0);
SET.shoot(S, SET.HOME_CNS);
L.set(0, {}); L.lamp.intensity = SET.LAMP.power;        // no flicker on the home shot
```

Every frame of a part: pose the backrest first (`HOME.recline`), then `P.setShrug`, `P.setHead`, `P.setLeg`, then the arms
(`P.setArm`), then `P.setFace` and `P.breathe`, then read `NEURO.points(P)`. For the normal pupils of the CNS video pass
`pupilR: 3.5, pupilL: 3.5` (the default stays 4.8 mm, as in v4b).

### Neuro landmarks: `NEURO.points(P)`

R = the patient's RIGHT (+Z, the examiner's side), L = his LEFT. Every name below exists as `name_R` and `name_L` unless
it is a single midline point.

| Group | Names |
|---|---|
| face | `V1` (forehead), `V2` (cheek), `V3` (lower jaw), `jawAngle` (C2/3, not trigeminal), `cornea` (lateral edge of the cornea), `masseter`, `temporalis`, `nostril`; single: `chin` (jaw jerk), `noseTip`, `forehead` |
| arm | `bicepsTendon` (front of the elbow), `brachioradialisTendon` (radial forearm ~5 cm above the wrist), `tricepsTendon` (just above the olecranon); sensory `C5` (lateral upper arm), `C6` (thumb), `C7` (middle finger), `C8` (little finger), `T1` (inner forearm); muscle bellies `deltoid`, `biceps`, `triceps`, `wristExtensors`, `fingerFlexors` |
| leg | `patellarTendon`, `achillesTendon`, `solePath` (line, the plantar stroke: up the LATERAL border of the sole from the heel to the ball of the foot, then curving medially across the metatarsal heads toward the base of the big toe, stopping before it), `bigToeMedial`, `bigToeLateral` (the sides of the distal phalanx), `medialMalleolus`; sensory `L2` (front of the upper thigh), `L3` (the MEDIAL side of the knee, both legs), `L4` (inner shin), `L4malleolus` (medial malleolus), `L5` (top of the foot), `S1` (outer foot), `S1heel` (heel/sole); muscle bellies `quadriceps`, `hamstrings`, `tibialisAnterior`, `calf` |
| trunk | single: `sternum`, `upperChest` (midline sensory point); lines toward the umbilicus: `abdRUQ`, `abdLUQ`, `abdRLQ`, `abdLLQ` (the four abdominal reflex strokes) |

### Checks and references

`check/` holds the check page (`check/page.html?kit=shared|shared-v4b&scene=...`), the scenes (`check/scenes/`), the
still jobs (`check/jobs/`, run all with `sh tools/stills.sh`; the round 2 review stills: `check/jobs/round2.mjs` and
`round2props.mjs` into `check/stills/round2/`) and the stills (`check/stills/`, JPEG; the pixel proof in `check/stills/pixeldiff/` is lossless PNG; contact sheets in
`check/stills/sheets/`). Reference images of the
neuro mode: `ref/patient_cns_full.png`, `ref/patient_cns_face.png`.

### Known limits (v5)

- Standing and walking: not in v5 (v6).
- `P.setRecline` / `HOME.recline` need the reclined45 build (the flat build has a different torso); the legs stay on the
  flat part of the mattress. `SHEET.build(..., { from: 'foot' })` samples the mattress height when it is built.
- With the arm raised high (finger-nose, Jendrassik, shoulder abducted) the top of the shoulder reads as a rounded clay
  joint (the v4 shoulder ball), not a modelled deltoid.
- `NEURO.leg` presets are solved numerically: heel-shin within about 2 cm, ankle jerk within about 4 cm of the target;
  fine-tune with `P.setLeg` / `P.legFit` per shot.
- The face's resting nasolabial folds are the v4 ones (kept so the default face is unchanged); `smile` deepens them.
- `swallow`: the larynx is a bump on the front of the neck (7 mm) that shows, rises 3 cm and falls back; it reads in
  profile from his side at neck height (`check/stills/round2/04b`), not from in front (his chin covers the neck).
- The grip on the examiner's fingers (`NEURO.HAND.grip`) is a hand pose only; placing the examiner's fingers inside it
  is left to each part (see `check/jobs/arms.mjs`, job 30, for a starting point).
