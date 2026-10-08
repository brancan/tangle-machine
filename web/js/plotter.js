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

  // A clip or occlusion region: its rings plus a fine grid of edges, so crossing and
  // inside tests only look at the edges near the query instead of all of them.
  const EDGE_CELL = 12;

  function region(rings) {
    const edges = [];
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const [x1, y1] = ring[i];
        const [x2, y2] = ring[(i + 1) % ring.length];
        edges.push([x1, y1, x2, y2]);
        box[0] = Math.min(box[0], x1);
        box[1] = Math.min(box[1], y1);
        box[2] = Math.max(box[2], x1);
        box[3] = Math.max(box[3], y1);
      }
    }
    const grid = new Map();
    edges.forEach(([x1, y1, x2, y2], id) => {
      for (let gx = Math.floor(Math.min(x1, x2) / EDGE_CELL); gx <= Math.floor(Math.max(x1, x2) / EDGE_CELL); gx++) {
        for (let gy = Math.floor(Math.min(y1, y2) / EDGE_CELL); gy <= Math.floor(Math.max(y1, y2) / EDGE_CELL); gy++) {
          const key = gx * 100003 + gy;
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(id);
        }
      }
    });
    return { rings, edges, box, grid, seen: new Uint32Array(edges.length), stamp: 0 };
  }

  // Calls visit once per edge stored in the cells covering [x0, x1] x [y0, y1].
  function edgesIn(r, x0, y0, x1, y1, visit) {
    r.stamp++;
    for (let gx = Math.floor(x0 / EDGE_CELL); gx <= Math.floor(x1 / EDGE_CELL); gx++) {
      for (let gy = Math.floor(y0 / EDGE_CELL); gy <= Math.floor(y1 / EDGE_CELL); gy++) {
        for (const id of r.grid.get(gx * 100003 + gy) || []) {
          if (r.seen[id] === r.stamp) continue;
          r.seen[id] = r.stamp;
          visit(r.edges[id]);
        }
      }
    }
  }

  // Calls visit once per edge stored in the cells the segment a-b passes through
  // (grid traversal after Amanatides & Woo), instead of every cell of its bounding box.
  function edgesAlong(r, [ax, ay], [bx, by], visit) {
    r.stamp++;
    const C = EDGE_CELL;
    let gx = Math.floor(ax / C);
    let gy = Math.floor(ay / C);
    const [endX, endY] = [Math.floor(bx / C), Math.floor(by / C)];
    const [dx, dy] = [bx - ax, by - ay];
    const [stepX, stepY] = [dx > 0 ? 1 : -1, dy > 0 ? 1 : -1];
    const tDeltaX = dx ? Math.abs(C / dx) : Infinity;
    const tDeltaY = dy ? Math.abs(C / dy) : Infinity;
    let tMaxX = dx ? (dx > 0 ? (gx + 1) * C - ax : ax - gx * C) / Math.abs(dx) : Infinity;
    let tMaxY = dy ? (dy > 0 ? (gy + 1) * C - ay : ay - gy * C) / Math.abs(dy) : Infinity;
    const visitCell = () => {
      for (const id of r.grid.get(gx * 100003 + gy) || []) {
        if (r.seen[id] === r.stamp) continue;
        r.seen[id] = r.stamp;
        visit(r.edges[id]);
      }
    };
    visitCell();
    // A segment crosses at most this many cells; the cap also stops a loop on bad input.
    let budget = Math.abs(endX - gx) + Math.abs(endY - gy);
    if (!Number.isFinite(budget)) return;
    while ((gx !== endX || gy !== endY) && budget-- > 0) {
      if (tMaxX < tMaxY) {
        tMaxX += tDeltaX;
        gx += stepX;
      } else {
        tMaxY += tDeltaY;
        gy += stepY;
      }
      visitCell();
    }
  }

  // Even-odd point in region: cast a ray to the right and count edge crossings.
  function inside(r, [px, py]) {
    if (px < r.box[0] || px > r.box[2] || py < r.box[1] || py > r.box[3]) return false;
    let result = false;
    edgesIn(r, px, py, r.box[2], py, ([xi, yi, xj, yj]) => {
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) result = !result;
    });
    return result;
  }

  // Parameters t in (0, 1) where segment a-b crosses a region edge.
  function crossings([ax, ay], [bx, by], r) {
    const ts = [];
    edgesAlong(r, [ax, ay], [bx, by], ([cx, cy, dx, dy]) => {
      const denominator = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (denominator === 0) return;
      const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denominator;
      const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denominator;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
    });
    return ts.sort((a, b) => a - b);
  }

  // Splits a polyline at the region boundary and keeps the pieces inside it
  // (or outside it, to erase what a shape on top hides). Accepts rings or a region.
  function clipPolyline(points, rings, keepInside = true) {
    const r = Array.isArray(rings) ? region(rings) : rings;
    const pieces = [];
    let piece = [];
    const at = ([ax, ay], [bx, by], t) => [ax + (bx - ax) * t, ay + (by - ay) * t];
    for (let i = 0; i + 1 < points.length; i++) {
      const [a, b] = [points[i], points[i + 1]];
      const ts = [0, ...crossings(a, b, r), 1];
      for (let k = 0; k + 1 < ts.length; k++) {
        const [p, q] = [at(a, b, ts[k]), at(a, b, ts[k + 1])];
        if (inside(r, at(a, b, (ts[k] + ts[k + 1]) / 2)) === keepInside) {
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

  // For scanlines y = y0 + k * step (k = 0..count-1), the sorted x of every ring crossing.
  // Each edge only visits the scanlines it spans, so long flattened curves stay cheap.
  function scanlineCrossings(rings, y0, step, count) {
    const rows = Array.from({ length: Math.max(0, count) }, () => []);
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const [ax, ay] = ring[i];
        const [bx, by] = ring[(i + 1) % ring.length];
        if (ay === by) continue;
        const [lo, hi] = ay < by ? [ay, by] : [by, ay];
        // Half-open rule [lo, hi) so a vertex shared by two edges is counted once.
        const kFrom = Math.max(0, Math.ceil((lo - y0) / step));
        const kTo = Math.min(count - 1, Math.ceil((hi - y0) / step) - 1);
        for (let k = kFrom; k <= kTo; k++) {
          const y = y0 + k * step;
          if (y >= lo && y < hi) rows[k].push(ax + ((y - ay) * (bx - ax)) / (by - ay));
        }
      }
    }
    for (const row of rows) row.sort((a, b) => a - b);
    return rows;
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
    const y0 = minY + spacing / 2;
    const rows = scanlineCrossings(turned, y0, spacing, Math.ceil((maxY - y0) / spacing));
    rows.forEach((xs, k) => {
      const y = y0 + k * spacing;
      for (let j = 0; j + 1 < xs.length; j += 2) {
        segments.push([rotate([xs[j], y], angle), rotate([xs[j + 1], y], angle)]);
      }
    });
    return segments;
  }

  const hatch = (polygon, spacing, angle) => hatchRings([polygon], spacing, angle);

  // ---------- Layers ----------

  // Even-odd scanline spans of a set of rings on the pixel grid: calls fill(y, x0, x1).
  function spans(rings, width, height, fill) {
    // Pixel row y is sampled at its center, y + 0.5.
    scanlineCrossings(rings, 0.5, 1, height).forEach((xs, y) => {
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.max(0, Math.ceil(xs[k] - 0.5));
        const x1 = Math.min(width - 1, Math.floor(xs[k + 1] - 0.5));
        if (x0 <= x1) fill(y, x0, x1);
      }
    });
  }

  // Groups traced shapes into color layers. Outlines use the stroke color; fills other than
  // the paper color are hatched in the fill color. Clip regions are applied exactly. Hidden
  // lines are removed with a visibility buffer: every filled shape paints its draw-order
  // number into a pixel grid, and a stroke stays only where no later shape covers it. On
  // screen a filled shape hides what was drawn before it; a plotter cannot hide anything.
  function build(shapes, values) {
    const W = CANVAS;
    const H = CANVAS;
    const clips = [];
    const items = [];
    for (const shape of shapes) {
      if (shape.kind === "clip") clips.push(region(flattenPath(shape.d).map((s) => s.points)));
      if (shape.kind === "unclip") clips.pop();
      if (shape.kind !== "poly" && shape.kind !== "path") continue;
      const outlines = shape.kind === "poly" ? [{ points: shape.points, closed: shape.closed }] : flattenPath(shape.d);
      items.push({ shape, clips: [...clips], outlines, rings: outlines.map((o) => o.points).filter((r) => r.length >= 3) });
    }

    // Pixel masks of clip regions, so clipped fills only cover what they show on screen.
    const masks = new Map();
    const maskOf = (r) => {
      if (!masks.has(r)) {
        const mask = new Uint8Array(W * H);
        spans(r.rings, W, H, (y, x0, x1) => mask.fill(1, y * W + x0, y * W + x1 + 1));
        masks.set(r, mask);
      }
      return masks.get(r);
    };
    const cover = new Int32Array(W * H).fill(-1);
    items.forEach(({ shape, clips: regions, rings }, n) => {
      if (!(shape.style && shape.style.fill && shape.style.fill !== "none") || !rings.length) return;
      const clipMasks = regions.map(maskOf);
      spans(rings, W, H, (y, x0, x1) => {
        for (let x = x0; x <= x1; x++) {
          const i = y * W + x;
          if (clipMasks.every((m) => m[i])) cover[i] = n;
        }
      });
    });

    // Walks a polyline in ~1px steps and keeps the runs not covered by a later shape
    // (pixels off the canvas count as hidden: the plot stays on the paper).
    const visibleRuns = (points, n) => {
      const visible = ([x, y]) => {
        const px = Math.floor(x);
        const py = Math.floor(y);
        return px >= 0 && py >= 0 && px < W && py < H && cover[py * W + px] <= n;
      };
      // A run keeps the polyline's own vertices; between them only its moving end advances.
      const runs = [];
      let run = [];
      let movingEnd = false;
      const extend = (p, fixed) => {
        if (movingEnd) run[run.length - 1] = p;
        else run.push(p);
        movingEnd = !fixed;
      };
      for (let i = 0; i + 1 < points.length; i++) {
        const [a, b] = [points[i], points[i + 1]];
        const steps = Math.max(1, Math.ceil(distance(a, b)));
        for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
          const t = s / steps;
          const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          if (visible(p)) {
            extend(p, s === steps || s === 0 || run.length === 0);
          } else if (run.length) {
            if (run.length > 1) runs.push(run);
            run = [];
            movingEnd = false;
          }
        }
      }
      if (run.length > 1) runs.push(run);
      return runs;
    };

    const layers = new Map();
    items.forEach(({ shape, clips: regions, outlines, rings }, n) => {
      const style = shape.style || {};
      const fill = style.fill && style.fill !== "none" ? style.fill : null;
      const stroke = style.stroke === "none" ? null : style.stroke || values.ink;
      const add = (color, points) => {
        let pieces = [points];
        for (const r of regions) pieces = pieces.flatMap((piece) => clipPolyline(piece, r));
        pieces = pieces.flatMap((piece) => visibleRuns(piece, n));
        if (!layers.has(color)) layers.set(color, []);
        for (const piece of pieces) layers.get(color).push({ points: piece });
      };
      // Paper fills only hide; any other fill is drawn as hatching in its color.
      if (fill && fill !== values.paper) {
        for (const segment of hatchRings(rings, HATCH_SPACING, HATCH_ANGLE)) add(fill, segment);
      }
      if (stroke) {
        for (const { points, closed } of outlines) add(stroke, closed ? [...points, points[0]] : points);
      }
    });
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
