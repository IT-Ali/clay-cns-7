# CNS part 7 of 11: tendon reflexes (Soft Clay)

The neurological examination, part 7: the deep tendon reflexes (biceps C5, supinator C6, triceps C7, knee L3/L4, ankle
S1), reinforcement (teeth clenched; Jendrassik), ankle and knee clonus, and Hoffmann's sign. 97 s, 12 beats, starting and
ending on the CNS home shot so it joins parts 6 and 8 end to end. Built with three.js 0.187.0 and the series kit.

## Folder

| Path | What |
|---|---|
| `index.html` | the player (play / pause, scrub, time, sound, captions, loop). Open it through a local server. |
| `lib/` | STAGE, SOUND and TEXT3D kits (unchanged) |
| `shared/`, `ref/`, `series/` | the series kit v5 (unchanged; `checks/shared.sha256`) |
| `src/contact.js` | contacts measured on the real meshes (gaps, thumb and finger settling, the hammer strike) |
| `src/cns7-style.js` | the style: content, the SOLVE section, the timeline `update(t)`, captions, sound |
| `solved.json` | every contact pose and camera, solved ONCE (`npm run solve`); the renders only load it |
| `storyboard/` | the storyboard (stills are frames of the animation itself) and the review panels |
| `tools/` | `solve.mjs`, `render.mjs` (preview / final), `storyboard*.mjs`, `lab.mjs` |

## Captions switch

`?captions=0` on the page, or `window.CAPTIONS = false`, gives the clean version. The render tools write both versions
from one pass (the caption is drawn over the clean frame).

## Rendering on the PC (Windows, Node, Chrome, GPU)

```bash
npm install
```

```bash
npm run preview
```

960x540, 30 fps, 8 samples, captions on, the whole part as `out\preview\preview.mp4`, with `out\preview\check.json`
(first vs last frame difference, loudness, duration) and `out\preview\sheet.jpg` (a frame every 2 s). Only some beats:

```bash
npm run preview -- --beats 2,6
```

The final: 1920x1080, 30 fps, 64 samples, the full part and every beat, `_captions` and `_clean`, with sound, in
`out\final\`:

```bash
npm start
```

Both commands keep their frames (`out\<mode>\frames*`): run the same command again after a stop and it carries on.
Both stop with a clear message if `solved.json` is missing or out of date; they never re-solve.
