// Plotter export: turns a painting into an SVG a pen plotter (AxiDraw and friends) can draw.
// Everything becomes polylines: curves are flattened, clip regions are applied for real,
// fills are hatched, there is one Inkscape layer per color, and the stroke order is optimized
// so the pen travels as little as possible while lifted.
(function () {
  const SIZE_MM = 190; // fits A4 and US Letter with margins
  const CANVAS = 800;
  const HATCH_SPACING = 3; // px, about 0.7 mm at 190 mm per 800 px: a fine-liner's line width
  const HATCH_ANGLE = Math.PI / 4;
  const JOIN_DISTANCE = 0.5; // px: strokes this close are drawn without lifting the pen
  const CURVE_STEP = 6; // px between points when flattening curves

  const distance = ([ax, ay], [bx, by]) => Math.hypot(bx - ax, by - ay);
  const first = (points) => points[0];
  const last = (points) => points[points.length - 1];

  // ---------- Paths to points ----------

  // Endpoint-to-center conversion from the SVG spec (implementation notes, F.6.5).
  function arcPoints(x1, y1, rx, ry, rotation, largeArc, sweep, x2, y2) {
    if (rx === 0 || ry === 0) return [[x2, y2]];
    const phi = (rotation * Math.PI) / 180;
    const [cos, sin] = [Math.cos(phi), Math.sin(phi)];
    const dx = (x1 - x2) / 2;
    const dy = (y1 - y2) / 2;
    const x1p = cos * dx + sin * dy;
    const y1p = -sin * dx + cos * dy;
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) {
      rx *= Math.sqrt(lambda);
      ry *= Math.sqrt(lambda);
    }
    const numerator = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const denominator = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    let k = Math.sqrt(Math.max(0, numerator / denominator));
    if (largeArc === sweep) k = -k;
    const cxp = (k * rx * y1p) / ry;
    const cyp = (-k * ry * x1p) / rx;
    const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
    const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
    const angle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const start = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let delta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && delta > 0) delta -= 2 * Math.PI;
    else if (sweep && delta < 0) delta += 2 * Math.PI;
    const steps = Math.max(4, Math.ceil((Math.abs(delta) * Math.max(rx, ry)) / CURVE_STEP));
    const points = [];
    for (let s = 1; s < steps; s++) {
      const t = start + (delta * s) / steps;
      const [ex, ey] = [rx * Math.cos(t), ry * Math.sin(t)];
      points.push([cx + ex * cos - ey * sin, cy + ex * sin + ey * cos]);
    }
    points.push([x2, y2]); // exact end, no rounding drift
    return points;
  }

  function bezierPoints(controls, steps = 12) {
    const points = [];
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      let level = controls;
      while (level.length > 1) {
        level = level.slice(1).map(([x, y], i) => [level[i][0] + (x - level[i][0]) * t, level[i][1] + (y - level[i][1]) * t]);
      }
      points.push(level[0]);
    }
    return points;
  }

  // SVG path data -> subpaths of points. Supports M L H V Q C A Z, absolute and relative.
  function flattenPath(d) {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
    const subpaths = [];
    let current = null;
    let [x, y, startX, startY] = [0, 0, 0, 0];
    let command = null;
    let i = 0;
    const next = () => Number(tokens[i++]);
    const ensure = () => {
      if (!current) {
        current = { points: [[x, y]], closed: false };
        subpaths.push(current);
      }
    };

    while (i < tokens.length) {
      if (/^[a-zA-Z]$/.test(tokens[i])) command = tokens[i++];
      const relative = command === command.toLowerCase();
      const C = command.toUpperCase();
      const [ox, oy] = relative ? [x, y] : [0, 0];
      if (C === "Z") {
        if (current) current.closed = true;
        current = null;
        [x, y] = [startX, startY];
        continue;
      }
      if (C === "M") {
        [x, y] = [ox + next(), oy + next()];
        [startX, startY] = [x, y];
        current = { points: [[x, y]], closed: false };
        subpaths.push(current);
        command = relative ? "l" : "L"; // extra pairs after M are line-tos
        continue;
      }
      ensure();
      if (C === "L") {
        [x, y] = [ox + next(), oy + next()];
        current.points.push([x, y]);
      } else if (C === "H") {
        x = ox + next();
        current.points.push([x, y]);
      } else if (C === "V") {
        y = oy + next();
        current.points.push([x, y]);
      } else if (C === "Q") {
        const control = [ox + next(), oy + next()];
        const end = [ox + next(), oy + next()];
        current.points.push(...bezierPoints([[x, y], control, end]));
        [x, y] = end;
      } else if (C === "C") {
        const c1 = [ox + next(), oy + next()];
        const c2 = [ox + next(), oy + next()];
        const end = [ox + next(), oy + next()];
        current.points.push(...bezierPoints([[x, y], c1, c2, end], 16));
        [x, y] = end;
      } else if (C === "A") {
        const [rx, ry, rotation, largeArc, sweep] = [next(), next(), next(), next(), next()];
        const end = [ox + next(), oy + next()];
        current.points.push(...arcPoints(x, y, rx, ry, rotation, largeArc, sweep, end[0], end[1]));
        [x, y] = end;
      } else {
        throw new Error(`Plotter export does not support the path command "${command}"`);
      }
    }
    return subpaths;
  }

  // ---------- Regions ----------

  // Even-odd point in polygon over several rings (holes and multiple shapes work).
  function inside(rings, [px, py]) {
    let result = false;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) result = !result;
      }
    }
    return result;
  }

  // Parameters t in (0, 1) where segment a-b crosses any ring edge.
  function crossings([ax, ay], [bx, by], rings) {
    const ts = [];
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const [cx, cy] = ring[i];
        const [dx, dy] = ring[(i + 1) % ring.length];
        const denominator = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
        if (denominator === 0) continue;
        const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denominator;
        const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denominator;
        if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
      }
    }
    return ts.sort((a, b) => a - b);
  }

  // Splits a polyline at the region boundary and keeps the pieces inside it.
  function clipPolyline(points, rings) {
    const pieces = [];
    let piece = [];
    const at = ([ax, ay], [bx, by], t) => [ax + (bx - ax) * t, ay + (by - ay) * t];
    for (let i = 0; i + 1 < points.length; i++) {
      const [a, b] = [points[i], points[i + 1]];
      const ts = [0, ...crossings(a, b, rings), 1];
      for (let k = 0; k + 1 < ts.length; k++) {
        const [p, q] = [at(a, b, ts[k]), at(a, b, ts[k + 1])];
        if (inside(rings, at(a, b, (ts[k] + ts[k + 1]) / 2))) {
          if (!piece.length) piece.push(p);
          piece.push(q);
        } else if (piece.length) {
          pieces.push(piece);
          piece = [];
        }
      }
    }
    if (piece.length > 1) pieces.push(piece);
    return pieces;
  }

  // Scanline hatching over several rings (even-odd): rotate so hatch lines are horizontal,
  // intersect each scanline with every edge, pair the crossings, rotate back.
  function hatchRings(rings, spacing, angle) {
    const rotate = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const turned = rings.map((ring) => ring.map((p) => rotate(p, -angle)));
    let minY = Infinity;
    let maxY = -Infinity;
    for (const ring of turned) {
      for (const [, y] of ring) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    const segments = [];
    for (let y = minY + spacing / 2; y < maxY; y += spacing) {
      const xs = [];
      for (const ring of turned) {
        for (let i = 0; i < ring.length; i++) {
          const [ax, ay] = ring[i];
          const [bx, by] = ring[(i + 1) % ring.length];
          if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        segments.push([rotate([xs[k], y], angle), rotate([xs[k + 1], y], angle)]);
      }
    }
    return segments;
  }

  const hatch = (polygon, spacing, angle) => hatchRings([polygon], spacing, angle);

  // ---------- Layers ----------

  // Groups traced shapes into color layers. Outlines use the stroke color; fills other than
  // the paper color are hatched in the fill color (paper fills only hide things on screen,
  // and a plotter cannot hide anything). Clip regions are applied to every stroke inside them.
  function build(shapes, values) {
    const layers = new Map();
    const clips = [];
    const add = (color, points) => {
      let pieces = [points];
      for (const rings of clips) pieces = pieces.flatMap((piece) => clipPolyline(piece, rings));
      if (!layers.has(color)) layers.set(color, []);
      for (const piece of pieces) if (piece.length > 1) layers.get(color).push({ points: piece });
    };

    for (const shape of shapes) {
      if (shape.kind === "clip") clips.push(flattenPath(shape.d).map((s) => s.points));
      if (shape.kind === "unclip") clips.pop();
      if (shape.kind !== "poly" && shape.kind !== "path") continue;
      const style = shape.style || {};
      const fill = style.fill && style.fill !== "none" && style.fill !== values.paper ? style.fill : null;
      const stroke = style.stroke === "none" ? null : style.stroke || values.ink;
      const outlines =
        shape.kind === "poly"
          ? [{ points: shape.points, closed: shape.closed }]
          : flattenPath(shape.d);
      if (fill) {
        const rings = outlines.map((o) => o.points).filter((ring) => ring.length >= 3);
        for (const segment of hatchRings(rings, HATCH_SPACING, HATCH_ANGLE)) add(fill, segment);
      }
      if (stroke) {
        for (const { points, closed } of outlines) add(stroke, closed ? [...points, points[0]] : points);
      }
    }
    return { layers: [...layers].map(([color, strokes]) => ({ color, strokes })).filter((l) => l.strokes.length) };
  }

  // ---------- Ordering ----------

  // Greedy nearest neighbour: always continue with the closest unused stroke end, reversing
  // the stroke when its far end is closer. A coarse grid keeps the search local.
  function order(strokes) {
    const CELL = 25;
    const RINGS = 6;
    const grid = new Map();
    const cellOf = ([x, y]) => [Math.floor(x / CELL), Math.floor(y / CELL)];
    const put = (point, entry) => {
      const key = cellOf(point).join();
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(entry);
    };
    strokes.forEach((stroke, i) => {
      put(first(stroke.points), { i, reverse: false });
      put(last(stroke.points), { i, reverse: true });
    });

    const used = new Uint8Array(strokes.length);
    const entryPoint = ({ i, reverse }) => (reverse ? last(strokes[i].points) : first(strokes[i].points));
    const out = [];
    let here = [0, 0];
    for (let remaining = strokes.length; remaining > 0; remaining--) {
      let best = null;
      let bestDistance = Infinity;
      const consider = (entry) => {
        if (used[entry.i]) return;
        const d = distance(here, entryPoint(entry));
        if (d < bestDistance) {
          bestDistance = d;
          best = entry;
        }
      };
      const [cx, cy] = cellOf(here);
      // Walk only the border of each ring of cells; anything beyond ring r is >= r * CELL away.
      for (let r = 0; r <= RINGS && !(best && bestDistance <= r * CELL); r++) {
        for (let gx = cx - r; gx <= cx + r; gx++) {
          const rows = gx === cx - r || gx === cx + r ? null : [cy - r, cy + r];
          if (rows) {
            for (const gy of rows) (grid.get(`${gx},${gy}`) || []).forEach(consider);
          } else {
            for (let gy = cy - r; gy <= cy + r; gy++) (grid.get(`${gx},${gy}`) || []).forEach(consider);
          }
        }
      }
      if (!best || bestDistance > RINGS * CELL) {
        // Nothing close: scan everything once.
        strokes.forEach((stroke, i) => {
          consider({ i, reverse: false });
          consider({ i, reverse: true });
        });
      }
      used[best.i] = 1;
      const stroke = strokes[best.i];
      const placed = best.reverse ? { points: [...stroke.points].reverse() } : stroke;
      out.push(placed);
      here = last(placed.points);
    }
    return out;
  }

  // Merges consecutive strokes whose ends touch, so the pen stays down between them.
  function join(strokes) {
    const out = [];
    for (const stroke of strokes) {
      const previous = out[out.length - 1];
      if (previous && distance(last(previous.points), first(stroke.points)) <= JOIN_DISTANCE) {
        previous.points = previous.points.concat(stroke.points.slice(1));
      } else {
        out.push({ points: [...stroke.points] });
      }
    }
    return out;
  }

  // Pen-up distance: from the home corner to the first stroke, then between strokes.
  function travel(strokes) {
    let total = 0;
    let here = [0, 0];
    for (const stroke of strokes) {
      total += distance(here, first(stroke.points));
      here = last(stroke.points);
    }
    return total;
  }

  // ---------- Output ----------

  const fmt = (n) => Math.round(n * 100) / 100;
  const pointList = (list) => list.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" ");

  function toSvg(layers, values) {
    const groups = layers.map(({ color, strokes }, i) => {
      const body = strokes.map((s) => `<polyline points="${pointList(s.points)}"/>`).join("\n    ");
      return (
        `  <g inkscape:groupmode="layer" id="layer${i + 1}" inkscape:label="${i + 1} ${color}" ` +
        `fill="none" stroke="${color}" stroke-width="${values.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">\n` +
        `    ${body}\n  </g>`
      );
    });
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
      `width="${SIZE_MM}mm" height="${SIZE_MM}mm" viewBox="0 0 ${CANVAS} ${CANVAS}">\n${groups.join("\n")}\n</svg>\n`
    );
  }

  // The whole pipeline: trace, layer, order, join, write. Distances in stats are in mm.
  function exportSvg(draw, values) {
    const { layers } = build(window.Gallery.trace(draw, values), values);
    const mm = SIZE_MM / CANVAS;
    let travelBefore = 0;
    let travelAfter = 0;
    let penDown = 0;
    let strokes = 0;
    const optimized = layers.map((layer) => {
      travelBefore += travel(layer.strokes);
      const ordered = join(order(layer.strokes));
      travelAfter += travel(ordered);
      strokes += ordered.length;
      for (const { points } of ordered) for (let i = 1; i < points.length; i++) penDown += distance(points[i - 1], points[i]);
      return { color: layer.color, strokes: ordered };
    });
    return {
      svg: toSvg(optimized, values),
      stats: {
        layers: optimized.length,
        strokes,
        penDown: penDown * mm,
        travelBefore: travelBefore * mm,
        travelAfter: travelAfter * mm,
      },
    };
  }

  window.Plotter = { flattenPath, clipPolyline, hatch, build, order, join, travel, toSvg, exportSvg };
})();
