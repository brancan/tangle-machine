"""Paradox tangle.

Starting from a square, each new line begins where the previous one ended and
lands a small fraction along the next side. Repeating this produces a stack of
ever-smaller, rotated squares whose straight edges suggest curves.
"""

from __future__ import annotations

Point = tuple[float, float]
Polygon = list[Point]


def _step(polygon: Polygon, ratio: float, clockwise: bool) -> Polygon:
    n = len(polygon)
    offset = 1 if clockwise else -1
    result = []
    for i, (x, y) in enumerate(polygon):
        nx, ny = polygon[(i + offset) % n]
        result.append((x + ratio * (nx - x), y + ratio * (ny - y)))
    return result


def paradox(
    x: float,
    y: float,
    size: float,
    steps: int = 30,
    ratio: float = 0.1,
    clockwise: bool = True,
) -> list[Polygon]:
    """Return the nested polygons of a Paradox tangle inside a square cell."""
    if not 0 < ratio < 1:
        raise ValueError("ratio must be between 0 and 1")
    current: Polygon = [(x, y), (x + size, y), (x + size, y + size), (x, y + size)]
    polygons = [current]
    for _ in range(steps):
        current = _step(current, ratio, clockwise)
        polygons.append(current)
    return polygons
