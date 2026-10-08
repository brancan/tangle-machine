"""Minimal SVG writer."""

from __future__ import annotations

from collections.abc import Iterable

from zentangles.tangles.paradox import Polygon


def polygon_element(polygon: Polygon) -> str:
    points = " ".join(f"{x:.2f},{y:.2f}" for x, y in polygon)
    return f'<polygon points="{points}"/>'


def document(
    width: float,
    height: float,
    polygons: Iterable[Polygon],
    stroke: str = "#111",
    stroke_width: float = 1.0,
    background: str = "#fdfbf5",
) -> str:
    body = "\n    ".join(polygon_element(p) for p in polygons)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">\n'
        f'  <rect width="100%" height="100%" fill="{background}"/>\n'
        f'  <g fill="none" stroke="{stroke}" stroke-width="{stroke_width}" '
        f'stroke-linejoin="round">\n'
        f"    {body}\n"
        f"  </g>\n"
        f"</svg>\n"
    )
