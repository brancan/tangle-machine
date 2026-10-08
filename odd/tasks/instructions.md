# Feature: instructions

## Objective
Dossier phase 2: every painting gets a LeWitt-style instruction in plain
language, shown numbered in the studio, with blanks filled live by its variables.

## Tasks
- [x] T1 Template helper `web/js/instruction.js` (`{n}`, `{ratio%}`, `{flag?a:b}`), test-first — route: inline
- [x] T2 Instructions for all 29 paintings, checked against each draw function — route: inline
- [x] T3 Studio UI (Instruction #N, live blanks), README/dossier/About — route: inline

## Checks
- `npm test`: 24 pass; RED observed before helper (7 failing) and before instructions.
- Chrome (CDP): slider, checkbox, Randomize and Reset keep the instruction in sync.

## Progress
- Branch `feat/instructions`. Coordinated with zentangles-7c and zentangles-dd (both will add `instruction` to any new painting).
