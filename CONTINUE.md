# CONTINUE: CNS part 7 (tendon reflexes, reinforcement, clonus, Hoffmann's sign)

Branch: `claude/exciting-goldberg-6r9o3q`. Read this first in a new session.

## Where we are (round 2: storyboard re-rendered, waiting for the user's review)

Round 1 was reviewed: knee jerks, reflex sizes, left-side mirroring, captions, home check, shared/ and lib/ approved.
Round 2 fixed the user's eight points (see the storyboard's "Round 2: your eight points", read from
`checks/round2.json`, which `node tools/round2.mjs` writes from the measured files):

1. Ankle jerk: the hammer's contact point on NEURO.points achillesTendon (measured, both sides, in review.json);
   the outer ankle rests on the other shin (0.06 mm); the palm flat on the ball of the foot (0.03 mm), fingers
   together across the sole; camera low at the foot end, a little behind the heel.
2. Arm cameras: fixed, tested directions (biceps from his side just above elbow height; triceps from his side a little
   from the head end; reinforcement from the head end at his right, above: jaw, elbow, thumb, hammer).
3. Supinator: hammer on brachioradialisTendon, 6.0 cm above the wrist joint, thumb side (distance printed).
4. Triceps: elbow 90 degrees, forearm across the chest.
5. Jendrassik: one wide side shot; the hooked fingers 0.05 mm at their closest, measured on every vertex.
6. Contacts (mm): biceps thumb pad 0.36 (hand lowest 0.03), ankle-clonus palm 0.03, knee-clonus index 0.97 /
   thumb 0.02, Hoffmann palm on palm 0.03, index under the fingertip 0.06, thumb on the nail 0.26.
7. Hand rules: 60.2 s is a wide legs shot (the left hand waits at his side until the leg is turned out); the palm on
   the foot is turned on the sole so neither thumb nor fingers stand up; knee clonus = index and thumb tips side by
   side (15 mm) on the top edge of the kneecap, back of the hand up; Hoffmann's: his fingers together, slightly
   curled, camera from his thumb side at hand height.
8. Hammer: `checks/hammer-clearance.json` (every 0.1 s away from strikes).

Main fixes in code this round (src/cns7-style.js, SOLVE section):
- `pickCam`: points on a hand are owned by the HAND (a ray hitting the sleeve no longer counts as seeing the hand);
  no camera within 7 cm of the examiner's arms; best partial view as the fallback. The close shots that kept
  failing are now explicit `cam(...)` directions (tested in the lab, see below).
- Knee clonus: a pose search (index and thumb tips 15 mm apart), roll + tilt search so both tips rest on the curved edge.
- Hoffmann: support palm searched (turn, slide) and lifted clear of his hand AND arm on every vertex; pinch pose with
  the pads 24.7 mm apart (the clay fingertip is ~2.4 cm thick), aligned to the fingertip, index pushed out along the
  skin normal, the thumb settled on the nail only if nothing sinks.
- Palm on the ball of the foot: searched turn on the sole, offset toward the edge, thumb pose; scored on palm contact,
  fingers on the sole, nothing pointing up.
- Reinforcement uses its own states (`thumbRreinf`, `S:reinfR@reinfR`) whose sleeves go toward his feet.
- Wide legs shot `legsWide` 59.0-60.9 s.

Dev tools added: `?only=a,b` (window.SOLVE_ONLY) re-solves just those sections on top of solved.json
(`node tools/lab.mjs script.js --solve --only kneeClonus,hoff [--saveSolved]`); section keys: arms, biceps,
biceps2, sup, tri, reinf, knee, ankle, clonus, kneeClonus, hoff. `--saveSolved` writes a DEV solved.json: always
finish with a full `npm run solve`. Testing a camera without re-solving: overwrite `W.SOL.cams.<name>.pos/target`
in place in a lab script and seek (CAMS shares those objects).

## Left (after the user's round-2 review)
1. Apply the storyboard feedback.
2. The in-between travel of the hands (no in-between pose held, nothing upright mid-travel).
3. story_vs_anim.png (beats 2, 4, 6, 8, 11), the transitions scan (checks/transitions/), home-check.json.
4. Test `npm run preview` in software on 2-3 frames; write the PC folder zip (no node_modules, no frames).

## Decisions taken (see the storyboard's "Assumptions")
- Every left-side test is the exact mirror of the right one (z -> -z): the examiner's hands swap roles (the hammer
  in his LEFT hand on the patient's left). Knee jerks: both from the right, as asked.
- bicepsTendon / tricepsTendon are measured on the posed mesh (the kit's vertices follow the palm's roll).
- The hammer is put aside off camera after the ankle jerks.

## Commands
```
npm install
npm run solve          # once, here (software): writes solved.json (~13 min)
node tools/hammercheck.mjs && node tools/homecheck.mjs
node tools/storyboard.mjs --samples 16 --rsamples 6 && node tools/round2.mjs && node tools/storyboard-html.mjs
npm run preview        # on the PC (GPU)
npm start              # on the PC (GPU), final
```
