# Feature: plotter-export

## Objective
Dossier phase 4: export any painting as an SVG a pen plotter can draw.

## Tasks
- [x] T1 Shape recorder in the pen + `Gallery.trace` (render output unchanged, snapshots prove it) — route: inline
- [x] T2 `web/js/plotter.js`: path flattening (M L H V Q C A Z), exact clip regions, hatching, layers, ordering, joining, SVG in mm — test-first — route: inline
- [x] T3 Hidden-line removal via a visibility buffer; canvas clipping — route: inline
- [x] T4 Studio "Plotter" button with stats; README and dossier — route: inline

## Checks
- `npm test` 76 pass; RED observed before plotter.js (7 failing) and before hidden-line removal (1 failing).
- Every painting exports in < 3 s without NaN (worst: rainbow-petals ~1.5 s, down from 32 s with the vector occlusion attempt).
- Visual check of plotter output for woven-circle, scales, hollibaugh, radial-sampler, rainbow-petals, tumbling-blocks, bubbles, spider-web.
- Chrome: button exports, status shows layers/strokes/pen travel, no JS errors.

## Decisions
- Vector occlusion (polygon subtraction) was correct but O(strokes × occluders): replaced by a pixel visibility buffer (1 px ≈ 0.24 mm, below a pen's width).
