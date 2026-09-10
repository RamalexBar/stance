// Espejo de web/lib/postureEvaluator.ts y api/src/modules/biomechanics/healthyZones.ts
// — mismos umbrales, para que el color mostrado aquí coincida con el de la
// web y con lo que reporta la pantalla de Errores. No se inventan números
// nuevos, se reusa la única fuente de verdad.

export type SegmentLevel = "OK" | "LEVE" | "MODERADO" | "ALTO";

export interface SegmentEvaluation {
  knees: SegmentLevel;
  hips: SegmentLevel;
  shoulders: SegmentLevel;
  balance: SegmentLevel;
  hands: SegmentLevel;
}

export interface FrameMetricsLike {
  kneeAngleLeft?: number;
  kneeAngleRight?: number;
  hipAngleLeft?: number;
  hipAngleRight?: number;
  shoulderAngleLeft?: number;
  shoulderAngleRight?: number;
  balanceOffset?: number;
  handHeightRelative?: number;
  [key: string]: number | undefined;
}

const HEALTHY_ZONES = {
  kneeAngleMaxDeg: 165,
  balanceOffsetAbsMax: 0.35,
  shoulderDiffMaxDeg: 20,
  hipAngleMinDeg: 95,
  handHeightMinRelative: -0.2,
  handHeightMaxRelative: 1.3,
};

export const SEGMENT_COLORS: Record<SegmentLevel, string> = {
  OK: "#2ED67A",
  LEVE: "#FFB020",
  MODERADO: "#FF8A3D",
  ALTO: "#FF6B6B",
};

export const SEGMENT_LABELS: Record<keyof SegmentEvaluation, string> = {
  knees: "Rodillas",
  hips: "Espalda / cadera",
  shoulders: "Hombros",
  balance: "Balance (adelante/atrás)",
  hands: "Altura de manos",
};

function avg(values: (number | undefined)[]): number {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!valid.length) return NaN;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function excessLevel(excess: number, moderateAt: number, highAt: number): SegmentLevel {
  if (excess <= 0) return "OK";
  if (excess >= highAt) return "ALTO";
  if (excess >= moderateAt) return "MODERADO";
  return "LEVE";
}

export function evaluateFrame(m: FrameMetricsLike): SegmentEvaluation {
  const kneeMean = avg([m.kneeAngleLeft, m.kneeAngleRight]);
  const knees = Number.isFinite(kneeMean)
    ? excessLevel(kneeMean - HEALTHY_ZONES.kneeAngleMaxDeg, 5, 10)
    : "OK";

  const hipMean = avg([m.hipAngleLeft, m.hipAngleRight]);
  const hips = Number.isFinite(hipMean)
    ? excessLevel(HEALTHY_ZONES.hipAngleMinDeg - hipMean, 10, 20)
    : "OK";

  const shoulderDiff =
    typeof m.shoulderAngleLeft === "number" && typeof m.shoulderAngleRight === "number"
      ? Math.abs(m.shoulderAngleLeft - m.shoulderAngleRight)
      : NaN;
  const shoulders = Number.isFinite(shoulderDiff)
    ? excessLevel(shoulderDiff - HEALTHY_ZONES.shoulderDiffMaxDeg, 10, 20)
    : "OK";

  let balance: SegmentLevel = "OK";
  if (typeof m.balanceOffset === "number" && Number.isFinite(m.balanceOffset)) {
    const bo = m.balanceOffset;
    if (bo > HEALTHY_ZONES.balanceOffsetAbsMax) {
      balance = excessLevel(bo - HEALTHY_ZONES.balanceOffsetAbsMax, 0.15, 0.3);
    } else if (bo < -HEALTHY_ZONES.balanceOffsetAbsMax) {
      balance = excessLevel(-bo - HEALTHY_ZONES.balanceOffsetAbsMax, 0.15, 0.3);
    }
  }

  let hands: SegmentLevel = "OK";
  if (typeof m.handHeightRelative === "number" && Number.isFinite(m.handHeightRelative)) {
    const v = m.handHeightRelative;
    if (v < HEALTHY_ZONES.handHeightMinRelative) {
      hands = excessLevel(HEALTHY_ZONES.handHeightMinRelative - v, 0.15, 0.3);
    } else if (v > HEALTHY_ZONES.handHeightMaxRelative) {
      hands = excessLevel(v - HEALTHY_ZONES.handHeightMaxRelative, 0.2, 0.4);
    }
  }

  return { knees, hips, shoulders, balance, hands };
}
