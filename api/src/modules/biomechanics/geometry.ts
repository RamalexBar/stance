export interface Point2D {
  x: number;
  y: number;
}

export interface Landmark extends Point2D {
  z?: number;
  visibility?: number;
}

/**
 * Ángulo (en grados, 0-180) formado en el vértice `b` por los segmentos b→a y b→c.
 * Ej: angleAt(hip, knee, ankle) = ángulo de rodilla.
 */
export function angleAt(a: Point2D, b: Point2D, c: Point2D): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);

  if (mag1 === 0 || mag2 === 0) return NaN;

  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Ángulo del vector b→a respecto a la vertical de la imagen (0° = perfectamente vertical). */
export function inclinationFromVertical(top: Point2D, bottom: Point2D): number {
  const v = { x: top.x - bottom.x, y: top.y - bottom.y };
  const vertical = { x: 0, y: -1 };
  const dot = v.x * vertical.x + v.y * vertical.y;
  const mag = Math.hypot(v.x, v.y);
  if (mag === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function average(values: number[]): number {
  const valid = values.filter((v) => Number.isFinite(v));
  if (!valid.length) return NaN;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}
