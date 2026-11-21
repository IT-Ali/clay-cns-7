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

## Rendering on the PC (Windows, Node 20+, Chrome, GPU)

Open a terminal (PowerShell) in this folder and run, one after another:

```bash
npm install
```

```bash
npm approve-scripts ffmpeg-static
```

```bash
npm rebuild ffmpeg-static
```

(the last two let ffmpeg-static download its ffmpeg; if `approve-scripts` is not known to your npm, skip it: `npm rebuild ffmpeg-static` alone does the same. If ffmpeg is installed on the PC already, set `FFMPEG=C:\path\to\ffmpeg.exe` instead.)

```bash
npm run preview
```

960x540, 30 fps, 8 samples, captions on, beats 4 and 8 by default, as `out\preview\preview.mp4` (each beat also as
`beatNN.mp4`), with `out\preview\check.json` (first vs last frame, true peak and loudness of every file, duration) and
`out\preview\sheet.jpg` (a frame every 2 s). Frames are kept in `out\preview\frames*`: run it again after a stop and it
carries on. Other beats, or all of them:

```bash
npm run preview -- --beats 2,6
```

```bash
npm run preview -- --beats all
```

The final: 1920x1080, 30 fps, 64 samples, the full part and every beat, `_captions` and `_clean`, with sound, in
`out\final\` (resumable the same way):

```bash
npm start
```

Sound: the style's score rendered offline, normalised to about -15 LUFS (loudnorm), written as 16-bit stereo; every
encoded MP4 is measured (ebur128, true peak) and, if it peaks above -1.0 dBTP, its audio alone is re-encoded with the gain
lowered. The numbers for every file are in check.json.

Both commands stop with a clear message if `solved.json` is missing or out of date; they never re-solve (the poses are
solved once, here, with `npm run solve`, and only loaded on the PC).

## Checks made here (software)

| File | What |
|---|---|
| `checks/report.json` | per-frame scan of the whole part (penetrations, lens distance, examiner share, hammer clearance, jump list) |
| `checks/transitions/cuts.json` | every hard cut on the 1/15 s pose grid, camera / patient / examiner on the same frame (strips beside it) |
| `story_vs_anim.png` | the animation frame next to its storyboard panel, beats 2, 3, 4, 5, 8, 10, 11 |
| `home-check.json` | first frame = last frame = the CNS home shot built as shared/README.md describes |
| `checks/hammer-clearance.json` | the hammer against his skin every 0.1 s away from the strikes |
