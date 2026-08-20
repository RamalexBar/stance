import { HEALTHY_ZONES } from "../biomechanics/healthyZones";

interface FrameLike {
  kneeAngleLeft: number;
  kneeAngleRight: number;
  hipAngleLeft: number;
  hipAngleRight: number;
  shoulderAngleLeft: number;
  shoulderAngleRight: number;
  balanceOffset: number;
  handHeightRelative: number;
}

function avg(values: number[]): number {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return NaN;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** 100 si value <= bound; decrece linealmente hasta 0 en bound + falloff. */
function scoreUpperBound(value: number, bound: number, falloff: number): number {
  if (!Number.isFinite(value)) return 50;
  if (value <= bound) return 100;
  return Math.max(0, 100 - ((value - bound) / falloff) * 100);
}

/** 100 si value >= bound; decrece linealmente hasta 0 en bound - falloff. */
function scoreLowerBound(value: number, bound: number, falloff: number): number {
  if (!Number.isFinite(value)) return 50;
  if (value >= bound) return 100;
  return Math.max(0, 100 - ((bound - value) / falloff) * 100);
}

/** 100 si value está dentro de [min, max]; decrece linealmente fuera del rango. */
function scoreRange(value: number, min: number, max: number, falloff: number): number {
  if (!Number.isFinite(value)) return 50;
  if (value >= min && value <= max) return 100;
  const distance = value < min ? min - value : value - max;
  return Math.max(0, 100 - (distance / falloff) * 100);
}

export interface AggregateMetrics {
  kneeAngleMean: number;
  balanceOffsetMean: number;
  shoulderDiffMean: number;
  hipAngleMean: number;
  handHeightMean: number;
}

export function computeAggregates(frames: FrameLike[]): AggregateMetrics {
  return {
    kneeAngleMean: avg(frames.map((f) => avg([f.kneeAngleLeft, f.kneeAngleRight]))),
    balanceOffsetMean: avg(frames.map((f) => f.balanceOffset)),
    shoulderDiffMean: avg(frames.map((f) => Math.abs(f.shoulderAngleLeft - f.shoulderAngleRight))),
    hipAngleMean: avg(frames.map((f) => avg([f.hipAngleLeft, f.hipAngleRight]))),
    handHeightMean: avg(frames.map((f) => f.handHeightRelative)),
  };
}

/**
 * Puntuación 0-100 de qué tan cerca está ESTE video de las zonas saludables
 * (Fase 6) — no de otra persona. Esto es intencional: comparar el ángulo
 * exacto de dos cuerpos distintos no es válido biomecánicamente (difieren en
 * flexibilidad, altura, proporciones). Comparar a ambos contra el mismo
 * criterio objetivo sí lo es.
 */
export function scoreAggregate(a: AggregateMetrics): { total: number; breakdown: Record<string, number> } {
  const breakdown = {
    rodillas: scoreUpperBound(a.kneeAngleMean, HEALTHY_ZONES.kneeAngleMaxDeg, 15),
    balance: scoreRange(a.balanceOffsetMean, -HEALTHY_ZONES.balanceOffsetAbsMax, HEALTHY_ZONES.balanceOffsetAbsMax, 0.35),
    hombros: scoreUpperBound(a.shoulderDiffMean, HEALTHY_ZONES.shoulderDiffMaxDeg, 20),
    tronco: scoreLowerBound(a.hipAngleMean, HEALTHY_ZONES.hipAngleMinDeg, 20),
    barra: scoreRange(a.handHeightMean, HEALTHY_ZONES.handHeightMinRelative, HEALTHY_ZONES.handHeightMaxRelative, 0.3),
  };

  const values = Object.values(breakdown).filter(Number.isFinite);
  const total = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

  return { total, breakdown };
}

export function buildDifferences(primary: AggregateMetrics, reference: AggregateMetrics) {
  const rows = [
    { key: "kneeAngleMean", label: "Ángulo de rodilla (promedio)", unit: "°" },
    { key: "balanceOffsetMean", label: "Balance (adelante/atrás)", unit: "" },
    { key: "shoulderDiffMean", label: "Diferencia entre hombros", unit: "°" },
    { key: "hipAngleMean", label: "Ángulo cadera-tronco", unit: "°" },
    { key: "handHeightMean", label: "Altura de manos (proxy de barra)", unit: "" },
  ] as const;

  return rows.map((row) => ({
    metric: row.label,
    primaryValue: (primary as any)[row.key],
    referenceValue: (reference as any)[row.key],
    delta: (primary as any)[row.key] - (reference as any)[row.key],
    unit: row.unit,
  }));
}
