# Feature: reels

## Objective
Three Instagram reels built with brand/posts/_tools/render.mjs and ffmpeg,
following the existing reel pattern (posts 02 and 05).

## Scope / constraints
- 1080×1920, 30 fps, silent, `reel.mp4` + `cover.png` (text inside the centre
  1080×1350 area) + `caption.txt` + `alt.txt`, in English, brand palette.
- render.mjs changes are additive; existing posts must render unchanged.
- Folders continue the numbering: 07, 08, 09.

## Tasks
- [x] T1 07 sun debut: Lines from the Center (#254) accumulating, counter 0 → ~1000 — route: delegated (writer: render.mjs + new post folder + README)
- [ ] T2 08 "The draughtsman": Wall Drawing drawn square by square via `limit`, then several seed jumps; hook "One instruction. Your browser holds the pencil."
- [ ] T3 09 "The tremor": same drawing with wobble, jitter, roughness rising 0 → max, values counting at the bottom

## Checks
- Reel renders, ffprobe shows 1080×1920/30 fps/no audio; frames spot-checked; `npm test` green.

## Progress
- Branch `feat/reels` from main 01310bc.
- T1 done: `07-sun-debut/` reel 11 s (9 s eased drawing 0 → 1,000 lines via `limit`, 2 s hold), cover, caption, alt; render.mjs gets a third renderer page (`rsvg`, `shootFrames`, `ONLY=07`). ffprobe 1080×1920, 30 fps, 11.0 s, video only; frames 60/135/329 and cover checked.
- Next: T2 08 "The draughtsman".
