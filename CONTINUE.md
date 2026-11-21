# CONTINUE: CNS part 7 (tendon reflexes, reinforcement, clonus, Hoffmann's sign)

Branch: `claude/sleepy-babbage-16xe65` (continues `claude/exciting-goldberg-6r9o3q`). Read this first in a new session.

## Where we are: round 2 storyboard rendered and published, WAITING FOR THE USER'S REVIEW (no build yet)

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
9. Hammer: never laid on him (checks/hammer-clearance.json).
10. Triceps: elbow 90 degrees (unchanged from the previous session).

Biceps hand: the examiner's hand is turned on the skin (searched, `psi`) so his forearm rises from the wrist with a
natural wrist (bent at most 50 degrees); the chosen turn has the fingers across the front of the arm.

## Next (after the user's round-2 review)
1. Apply the storyboard feedback.
2. The in-between travel of the hands (no in-between pose held, nothing upright or through him mid-travel), especially
   home -> foot at 58.6-59.4 s and the sleeves turning up / down at the cuts.
3. story_vs_anim.png (beats 2, 4, 6, 8, 11), the transitions scan (checks/transitions/), home-check.json.
4. Test `npm run preview` in software on 2-3 frames; write the PC folder zip (no node_modules, no frames).

## Dev tools
- `?only=a,b` re-solves just those sections on top of solved.json:
  `node tools/lab.mjs script.js --solve --only kneeClonus,hoff [--saveSolved]`; section keys: arms, biceps, biceps2,
  sup, tri, reinf, knee, ankle, clonus, kneeClonus, hoff. `--saveSolved` writes a DEV solved.json: always finish with a
  full `npm run solve` (~15 min here).
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
npm run solve          # once, here (software): writes solved.json (~15 min)
node tools/hammercheck.mjs && node tools/homecheck.mjs
node tools/storyboard.mjs --samples 16 --rsamples 6 && node tools/round2.mjs && node tools/storyboard-html.mjs
npm run preview        # on the PC (GPU)
npm start              # on the PC (GPU), final
```
