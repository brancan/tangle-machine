# zentangles

Drawings made with code. Pure Python (stdlib only), output as SVG.

## Paradox grid

The canvas is split into an `n x n` grid and every cell gets a **Paradox**
tangle: starting from the square, each new line begins where the previous one
ended and lands a small fraction (`--ratio`) along the next side. The nested,
rotating squares create the illusion of curves. Neighbouring cells spin in
opposite directions (checkerboard) so the curves flow across cells.

![Paradox grid](examples/paradox-4x4.svg)

```bash
python -m zentangles --n 4 -o output/paradox.svg
python -m zentangles --n 6 --steps 40 --ratio 0.08
python -m zentangles --n 3 --no-alternate
```

| Option | Default | Meaning |
| --- | --- | --- |
| `--n` | 4 | Grid size |
| `--canvas` | 800 | Canvas size (px) |
| `--margin` | 20 | Outer margin (px) |
| `--steps` | 30 | Nested lines per cell |
| `--ratio` | 0.1 | How far along each side the next line lands |
| `--no-alternate` | off | Spin every cell the same way |
| `--stroke-width` | 1.0 | Line width |
| `-o` | `output/paradox.svg` | Output file |

## Tests

```bash
python -m unittest
```
