# CONTINUE: CNS part 7 (tendon reflexes, reinforcement, clonus, Hoffmann's sign)

Branch: `claude/sleepy-babbage-16xe65` (continues `claude/exciting-goldberg-6r9o3q`). Read this first in a new session.

## Where we are: BUILD done (round 3 storyboard approved), WAITING FOR THE USER (stop after the build)

The user approved round 3 and asked for the build with two small fixes. Done:
1. Supinator: slight curl (joint by joint, searched) so both TIPS rest on the skin (index 0.77, middle 0.62 mm), the
   two fingers side by side along the radial border 4.9 cm above the wrist (the line moved a little round the forearm,
   where it is flatter); hammer on the back of the fingers.
2. Triceps: the olecranon TIP is the elbow skin furthest along the upper arm; the strike point is placed so the hammer
   HEAD's centre lands 3.22 cm proximal to the tip (r_x_tri / r_x_triL mark tip, strike point and head centre).
Build pieces (same update(t), poses and cameras as the storyboard):
- Cuts: every cut on the 1/15 s grid (30.1 -> 452/15, 60.9 -> 914/15); checks/transitions/cuts.json + strips.
- Hands: each move of an examiner hand is planned once (tools/plan.mjs -> transitions.json): slide along the forearm
  (or up, or along the back of the hand) with fingers straight, a last 2.5 cm straight off the skin for grips, an arc
  over him; the hammer hand lifts straight up. Hands that hold his foot / calf / wrist are carried in the frame of his
  foot / shin / hand (relFoot / relShin / rel); during an elbow reflex the hand on his forearm and the hammer ride with
  it. Clonus R is set up at the 69.0 s cut (like the left side).
- Solve additions: biceps hand searched with the fingers round the OUTSIDE of the elbow (never into the backrest
  mattress), its forearm clear of his chest; every strike's swing checked every 0.05 rad and capped where it would
  touch him (swingUp: biceps 0.35 rad).
- Scan: tools/scan.mjs (3 parts, --merge) -> checks/report.json; remaining flags explained in it / below.
- render.mjs: frame count as an output option (the encode failed before), two-pass loudnorm -15 LUFS, s16 stereo,
  true-peak guard per MP4 (re-encodes audio only above -1.0 dBTP), check.json per file; preview default beats 4,8,
  --beats all, --frames for a quick test (tested here on 3 frames: OK).

### Round 3 notes (kept for reference)

Round 3:: ROUND 3 storyboard published (beats 2-5 re-rendered), WAITING FOR THE USER'S REVIEW (no build yet)

Storyboard: https://claude.ai/artifact/9opJSuaBL7tLuyZ52frfsx (version 2); director zip: cns7-part7-storyboard.zip.
Round 2 review: 7 of 10 approved and KEPT (ankle jerk, Jendrassik, contacts, knee-clonus grip, Hoffmann's, hammer never
on him, knee jerks, reflex angles). Round 3 fixed the user's four points (beats 2-5 only; `node tools/round3.mjs` ->
checks/round3.json, shown at the top of the page; round 2's list is folded below it):
1. Triceps: his upper arm rests on the mattress (abducted 34 deg, gap -0.02 mm), elbow 90.1 deg, forearm across his
   abdomen, hand palm down (hand on trunk 0.94 mm R, -0.34 mm L), examiner's left hand holds the wrist (0.03-0.79 mm).
   Built with abdArm(side, up, {z, s, R: 0.3}) searched for elbow 90 / abduction 35 and lowered onto the mattress.
   Strike point on the back/outer side 2.96 cm above the olecranon (SOL.lm.olecranonR), from above and outside; elbow
   extends +10 deg. Camera override at runtime (CAMS.triR/L): from his side, a little from the head end and above.
2. Biceps: thumbBiceps() now also searches the forearm direction D and scores fingers pointing round the outside of the
   elbow; each finger curls onto the skin, then any sinking finger un-curls: fingers 0.05-1.13, thumb 0.03, palm 0.06 mm.
3. Supinator: index + middle straight and together ALONG the radial border (turn and roll searched), ring/little curled,
   thumb alongside (settled): whole fingers 0.02 / 1.44 mm, thumb 0.77 mm; the straight index's TIP lifts 6.75 mm off the
   curved forearm (offered: a slight curl).
4. Reinforcement: 1 s face insert 35.6-36.6 s (CAMS.reinfFace, face 210 px chin-to-brow) and a tighter tap shot
   (CAMS.reinf, face 85 px, elbow, thumb, hammer in frame). Panels renumbered: the insert is p12 (36.1 s), later p13-p30.
New shared helper in SOLVE: strikeSearch() (swing plane searched so the raised hammer clears him and the mattress), used
for biceps, supinator, triceps. checks/hammer-clearance.json: nothing within 10 mm. Full `npm run solve` is current.
Open: his left hand on his trunk -0.34 mm in the triceps mirror (the trunk is not exactly symmetric).

### Round 2 notes (kept for reference)

Round 2:: round 2 storyboard rendered and published, WAITING FOR THE USER'S REVIEW (no build yet)

Storyboard artifact (round 2): https://claude.ai/artifact/9opJSuaBL7tLuyZ52frfsx (republish storyboard/storyboard.html
with root storyboard/ and the img/* files list). The round-1 artifact link in the old notes (AEhzvbqbyTRxTQ73pURdzX)
could not be opened from this account.
Checks at hand-off: full `npm run solve` current (solved.json inputs match); checks/hammer-clearance.json: never within
10 mm of his skin away from strikes; home-check.json identical (first = last = home reference).

Round 1 was NOT approved. The user's ten round-1 points and what was done (the storyboard's "Round 2: your ten points"
section is generated from the measured files by `node tools/round2.mjs` -> `checks/round2.json`):

1. Ankle jerk: the hammer strikes the Achilles tendon about 2 cm above the ankle bones, on its inner edge (straight
   behind, the head sank 15 mm into the other shin; the solve searches the face round the leg and the swing plane and
   keeps the one clear of both legs: `SOL.lm.achillesStrikeR`). Palm on the sole holds the foot 8 degrees up, leg turned
   out, knee bent. Camera from the side of the foot (his left for the right foot, toward his head, a little above).
2. Arm cameras: side cameras at arm level. To clear them the examiner's upper sleeves rise toward his shoulders
   (`st.sleeve`, `SLEEVE_UP`, new in `applyEx` / `mirEx` / `lerpEx`) and his forearms come from above. Biceps from his
   side a little footward and low; supinator from his side a little footward; triceps and reinforcement from his side a
   little from the head end (reinforcement: face in profile, jaw in frame). Left-side cameras: same direction, closer
   with a wider lens (the wall is near on his left, z ~ -10).
3. Jendrassik: unchanged from the previous session (one wide side shot; hooked fingers 0.05 mm, measured on every vertex).
4. Supinator: NEW pose `fingersOnRadius()`: the examiner's left index + middle fingers together on the radial border 5.0 cm
   above the wrist joint; the hammer lands on the back of the examiner's middle finger (`SOL.ex.supFingR/L`,
   `SOL.strikes.supR` on the finger). Keys: exL `supFingR` from 15.0, exR `supFingL` from 18.4.
5. Contacts: see the solve log; all 0-1.5 mm except where listed in the storyboard (red/amber cells).
6. Hands: 60.2 s the examiner's left hand holds the sole and turns the leg out (`relFoot:footRelR:R`, a hand state
   carried in the foot's landmark frame, `footFrame()`); `legsWide` camera now from his left, above. `palmOnBall`: the
   fingers lie across the sole (searched both ways across; penalties on anything pointing up or past the toes).
7. Knee clonus: same grip (thumb and index tips together on the top edge of the kneecap); low side camera.
8. Hoffmann: his hand limp (wrist flexed ~28 degrees, fingers loosely curled, middle finger a little straighter); the
   examiner's left palm under his palm with relaxed curled fingers; camera at hand height from his thumb side. Thumb
   fallback: if the pinch thumb sinks into the nail, the thumb is opened until it rests.
9. Hammer: never laid on him (checks/hammer-clearance.json: none closer than 10 mm). Two bugs fixed on the way: the
   solve now tests which way each strike's hammer rises (`swingSign`, applied in update) and searches the biceps swing
   plane so the raised hammer clears him; and the hammer stays in the striking hand on its lifted `up:S:` waypoint
   (`isStrike`; before, on his left it jumped to the examiner's right hand, which holds his foot).
10. Triceps: elbow 90 degrees (unchanged from the previous session).

Biceps hand: the examiner's hand is turned on the skin (searched, `psi`, and slid across the arm, `ac`) so his forearm
rises from the wrist with a natural wrist (bent at most 50 degrees) and nothing is in his arm or chest; chosen: turned
-1.6 rad (fingers across the front of the arm), 3 cm across. Runtime camera overrides (outside SOLVE, after CAMS):
biceps from his side a little above arm level; reinforcement aimed higher and further back (face and jaw below the
caption); legsWide from his left.

Known open (in the storyboard): knee clonus during the push, thumb 1.7 mm and index 2.6 mm off the moving skin (the
skin and the hand move 8 mm but not exactly together): lock the hand to the moving skin in the build.

## Next (after the user's round-3 review)
1. Apply the storyboard feedback.
2. The in-between travel of the hands (no in-between pose held, nothing upright or through him mid-travel), especially
   home -> foot at 58.6-59.4 s and the sleeves turning up / down at the cuts.
3. story_vs_anim.png (beats 2, 4, 6, 8, 11), the transitions scan (checks/transitions/), home-check.json.
4. Test `npm run preview` in software on 2-3 frames; write the PC folder zip (no node_modules, no frames).

## Dev tools
- `?only=a,b` re-solves just those sections on top of solved.json:
  `node tools/lab.mjs script.js --solve --only kneeClonus,hoff [--saveSolved]`; section keys: arms, biceps, biceps2,
  sup, tri, reinf, knee, ankle, clonus, kneeClonus, hoff. `--saveSolved` writes a DEV solved.json: always finish with a
  full `npm run solve` (~25-28 min here).
- Testing a camera without re-solving: `window.CAM_OVERRIDE = {pos, target, focus, aperture, fov}` then `window.seek(t, n)`.

## Decisions taken (see the storyboard's "Assumptions")
- Every left-side test is the exact mirror of the right one (z -> -z): the examiner's hands swap roles (the hammer in his
  LEFT hand on the patient's left). Knee jerks: both from the right, as asked.
- bicepsTendon / tricepsTendon are measured on the posed mesh (the kit's vertices follow the palm's roll).
- The hammer is put aside off camera after the ankle jerks.
- The attached spec prompt and soft-clay-REFERENCE-STYLE-SOURCE.txt were NOT present in this session (uploads empty).

## Commands
```
npm install
npm run solve          # once, here (software): writes solved.json (~25 min)
node tools/hammercheck.mjs && node tools/homecheck.mjs
node tools/storyboard.mjs --samples 16 --rsamples 6 && node tools/round2.mjs && node tools/storyboard-html.mjs
npm run preview        # on the PC (GPU)
npm start              # on the PC (GPU), final
```
