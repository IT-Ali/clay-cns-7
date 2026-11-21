# CONTINUE: CNS part 7 (tendon reflexes, reinforcement, clonus, Hoffmann's sign)

Branch: `claude/exciting-goldberg-6r9o3q`. Read this first in a new session.

## Where we are (round 1: storyboard, waiting for the user's review)

Done
- STEP 0 checked: `shared/` (v5, "v5: neuro mode" in the README), `ref/`, `series/cvs1-style.js` copied unchanged
  (`checks/shared.sha256` holds their checksums). `lib/` = the STAGE, SOUND and TEXT3D kits from the prompt, unchanged.
- `index.html`: the player (three 0.187.0 from the CDN via an import map; the tools serve it locally).
- `src/contact.js`: measuring and placing contacts on the real meshes (skin distance field, gaps, thumb IK, finger
  settling, the hammer strike frame, capsules for deep checks).
- `src/cns7-style.js`: the style. CONTENT (beats, captions, the STRIKES schedule, the timeline KEYS) -> SOLVE section
  (runs once, saved to `solved.json`) -> timeline `update(t)` (reads only solved.json + KEYS) -> overlay -> sound.
- `tools/solve.mjs` (npm run solve), `tools/storyboard.mjs` + `tools/storyboard-data.mjs` (stills are frames of the
  animation itself), `tools/render.mjs` (npm run preview / npm start, for the user's PC), `tools/lab.mjs` (dev).
- `storyboard/storyboard.html`: the storyboard (+ review panels a-g, measured gaps).

Left (after the user approves / comments on the storyboard)
1. Apply the storyboard feedback (poses, cameras).
2. Refine compositions (several close shots are steep), the in-between travel of the hands (no in-between pose held).
3. story_vs_anim.png (beats 2, 4, 6, 8, 11), the transitions scan (checks/transitions/, a strip every 1/8 s at every
   camera change), home-check.json (first and last frames vs the CNS home shot, software, low samples).
4. Test `npm run preview` in software on 2-3 frames; write the PC folder zip (no node_modules, no frames).

## Decisions taken (see the storyboard's "Assumptions")
- Every left-side test is the exact mirror of the right one (positions z -> -z): the examiner's hands swap roles
  (the hammer in his LEFT hand on the patient's left). The knee jerks: both from the right, as asked.
- The kit's `bicepsTendon` / `tricepsTendon` vertices follow the palm's roll into the elbow, so with the forearm
  pronated across the abdomen they are not on the front / back of the elbow (measured 81 deg / 24 deg off). Those two
  points are measured on the posed mesh instead (the vertex facing the inside / outside of the bend just above it).
  Every other landmark is NEURO.points / P.legPoint.
- The hammer is put aside after the ankle jerks (both hands are needed for clonus and Hoffmann's), off camera.

## Commands
```
npm install
npm run solve          # once, here (software): writes solved.json (~7 min)
node tools/storyboard.mjs --samples 16
npm run preview        # on the PC (GPU)
npm start              # on the PC (GPU), final
```
