# Instagram launch posts

The first six posts (two weeks) for Tangle Machine (brancan.github.io/tangle-machine). Every drawing is a real render from the site's own renderer (`web/js/gallery.js`); nothing is redrawn by hand.

## Posting order

| # | Folder | Format | Suggested day |
|---|--------|--------|---------------|
| 1 | `01-idea-machine/` | Carousel, 5 slides, 1080×1350 (`slide-1.png` … `slide-5.png`) | Day 1 |
| 2 | `02-one-percent-disorder/` | Reel, `reel.mp4` 1080×1920, 10 s, 30 fps, no audio; cover `cover.png` | Day 3 |
| 3 | `03-first-piece/` | Single image, `first-piece.png` 1080×1350 | Day 5 |
| 4 | `04-same-rule/` | Carousel, 5 slides, 1080×1350: Harmonograph at five settings | Day 8 |
| 5 | `05-moire/` | Reel, `reel.mp4` 1080×1920, 10 s loop, 30 fps, no audio; cover `cover.png` | Day 10 |
| 6 | `06-movement-in-squares/` | Single image, `movement-in-squares.png` 1080×1350 | Day 12 |

Each folder has `caption.txt` (paste as is) and `alt.txt` (paste per slide under Advanced settings → Accessibility → Write alt text).

## Notes

- Put the site link in the bio before post 1; every caption ends with "link in bio".
- Reel: add a trending track inside Instagram when publishing (the file is silent on purpose). Choose `cover.png` as the cover; its text sits inside the centre 1080×1350 area, so it reads in the 4:5 profile grid.
- Carousel: slides 2–5 explain the system; slide 2's instruction is the piece's own text, written after LeWitt and labelled as not his.
- Post 5 loops: the turn goes 0.5° → 6° → 0.5°, so the last frame meets the first.
- The posts never imply affiliation with Zentangle®; avoid #Zentangle tags.

## Regenerating

`_tools/render.mjs` loads `web/js/gallery.js` and the paintings from a local static server and screenshots each layout with Playwright:

```sh
python3 -m http.server 8765 --directory web &
PLAYWRIGHT_PATH=<path to playwright> CHROME_PATH=/usr/bin/google-chrome \
  node brand/posts/_tools/render.mjs http://localhost:8765 /tmp/reel-frames
ffmpeg -framerate 30 -i /tmp/reel-frames/f%04d.png -c:v libx264 -pix_fmt yuv420p \
  -crf 18 -movflags +faststart -an brand/posts/02-one-percent-disorder/reel.mp4
```

Posts 4–6 load their paintings on a second renderer page. Post 5 writes its frames to `<framesDir>/05`:

```sh
ffmpeg -framerate 30 -i /tmp/reel-frames/05/f%04d.png -c:v libx264 -pix_fmt yuv420p \
  -crf 18 -movflags +faststart -an brand/posts/05-moire/reel.mp4
```

`ONLY=1|2|3|4|5|6` renders a single post.
