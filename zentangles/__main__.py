"""Command line entry point: python -m zentangles --n 4 -o out.svg"""

from __future__ import annotations

import argparse
from pathlib import Path

from zentangles import svg
from zentangles.grid import paradox_grid


def main() -> None:
    parser = argparse.ArgumentParser(description="Draw an n x n grid of Paradox tangles as SVG.")
    parser.add_argument("--n", type=int, default=4, help="grid size (n x n cells)")
    parser.add_argument("--canvas", type=float, default=800, help="canvas size in px")
    parser.add_argument("--margin", type=float, default=20, help="outer margin in px")
    parser.add_argument("--steps", type=int, default=30, help="nested lines per cell")
    parser.add_argument("--ratio", type=float, default=0.1, help="how far along each side the next line lands (0-1)")
    parser.add_argument("--no-alternate", action="store_true", help="spin every cell the same way")
    parser.add_argument("--stroke-width", type=float, default=1.0)
    parser.add_argument("-o", "--output", type=Path, default=Path("output/paradox.svg"))
    args = parser.parse_args()

    polygons = paradox_grid(
        args.n,
        args.canvas,
        margin=args.margin,
        steps=args.steps,
        ratio=args.ratio,
        alternate=not args.no_alternate,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        svg.document(args.canvas, args.canvas, polygons, stroke_width=args.stroke_width)
    )
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
