"""Split the canvas into an n x n grid and fill each cell with a tangle."""

from __future__ import annotations

from zentangles.tangles.paradox import Polygon, paradox


def paradox_grid(
    n: int,
    canvas: float,
    margin: float = 20,
    steps: int = 30,
    ratio: float = 0.1,
    alternate: bool = True,
) -> list[Polygon]:
    """Fill an n x n grid with Paradox tangles.

    With ``alternate`` the spiral direction flips in a checkerboard pattern,
    which makes the edges between neighbouring cells read as continuous curves.
    """
    if n < 1:
        raise ValueError("n must be at least 1")
    cell = (canvas - 2 * margin) / n
    polygons: list[Polygon] = []
    for row in range(n):
        for col in range(n):
            clockwise = (row + col) % 2 == 0 if alternate else True
            polygons += paradox(
                margin + col * cell,
                margin + row * cell,
                cell,
                steps=steps,
                ratio=ratio,
                clockwise=clockwise,
            )
    return polygons
