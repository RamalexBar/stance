import { ERROR_CATALOG, ERROR_NOT_DETECTED_YET, ErrorType, ErrorLevel } from "./errorCatalog";
import { HEALTHY_ZONES } from "../biomechanics/healthyZones";

interface FrameLike {
  tSeconds: number;
  kneeAngleLeft: number;
  kneeAngleRight: number;
  hipAngleLeft: number;
  hipAngleRight: number;
  shoulderAngleLeft: number;
  shoulderAngleRight: number;
  balanceOffset: number;
  trunkRotationDegEstimated: number;
  handHeightRelative: number;
}

interface SegmentLike {
  type: string;
  startSeconds: number;
  endSeconds: number;
}

export interface Finding {
  type: ErrorType;
  level: ErrorLevel;
  measuredValue: number;
  description: string;
  impact: string;
  howToFix: string;
  exercises: string[];
}

function avg(values: number[]): number {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return NaN;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function framesInSegments(frames: FrameLike[], segments: SegmentLike[], type: string): FrameLike[] {
  const ranges = segments.filter((s) => s.type === type);
  if (!ranges.length) return [];
  return frames.filter((f) => ranges.some((r) => f.tSeconds >= r.startSeconds && f.tSeconds <= r.endSeconds));
}

function levelFromExcess(excess: number, moderateAt: number, highAt: number): ErrorLevel {
  if (excess >= highAt) return "ALTO";
  if (excess >= moderateAt) return "MODERADO";
  return "LEVE";
}

function buildFinding(type: ErrorType, level: ErrorLevel, measuredValue: number): Finding {
  const entry = ERROR_CATALOG[type];
  return { type, level, measuredValue, ...entry };
}

export function detectErrors(frames: FrameLike[], segments: SegmentLike[]) {
  const findings: Finding[] = [];
  if (frames.length < 5) return { findings, notDetectedYet: ERROR_NOT_DETECTED_YET };

  const navFrames = framesInSegments(frames, segments, "NAVEGACION");
  const baseFrames = navFrames.length ? navFrames : frames;
  const landingSegments = segments.filter((s) => s.type === "ATERRIZAJE");
  const changeFrames = framesInSegments(frames, segments, "CAMBIO_DIRECCION");

  // 1. Rodillas rígidas (umbral: >165° en promedio durante navegación)
  const meanKnee = avg(baseFrames.map((f) => avg([f.kneeAngleLeft, f.kneeAngleRight])));
  let malaRecepcionTriggered = false;
  let rodillasRigidasTriggered = false;
  if (meanKnee > HEALTHY_ZONES.kneeAngleMaxDeg) {
    rodillasRigidasTriggered = true;
    findings.push(buildFinding("RODILLAS_RIGIDAS", levelFromExcess(meanKnee - HEALTHY_ZONES.kneeAngleMaxDeg, 5, 10), meanKnee));
  }

  // 2. Centro de gravedad adelantado/retrasado (umbral: |balanceOffset| > 0.35)
  const meanBalance = avg(baseFrames.map((f) => f.balanceOffset));
  if (meanBalance > HEALTHY_ZONES.balanceOffsetAbsMax) {
    findings.push(buildFinding("CENTRO_GRAVEDAD_ADELANTADO", levelFromExcess(meanBalance - HEALTHY_ZONES.balanceOffsetAbsMax, 0.15, 0.3), meanBalance));
  } else if (meanBalance < -HEALTHY_ZONES.balanceOffsetAbsMax) {
    findings.push(buildFinding("CENTRO_GRAVEDAD_RETRASADO", levelFromExcess(Math.abs(meanBalance) - HEALTHY_ZONES.balanceOffsetAbsMax, 0.15, 0.3), meanBalance));
  }

  // 3. Hombros desalineados (umbral: diferencia media >20° entre ángulos de hombro)
  const meanShoulderDiff = avg(frames.map((f) => Math.abs(f.shoulderAngleLeft - f.shoulderAngleRight)));
  if (meanShoulderDiff > HEALTHY_ZONES.shoulderDiffMaxDeg) {
    findings.push(buildFinding("HOMBROS_DESALINEADOS", levelFromExcess(meanShoulderDiff - HEALTHY_ZONES.shoulderDiffMaxDeg, 10, 20), meanShoulderDiff));
  }

  // 4. Exceso de rotación durante cambios de dirección (umbral: |rotación| media >25°, estimado)
  const rotationFrames = changeFrames.length ? changeFrames : [];
  if (rotationFrames.length) {
    const meanRotation = avg(rotationFrames.map((f) => Math.abs(f.trunkRotationDegEstimated)));
    if (meanRotation > 25) {
      findings.push(buildFinding("EXCESO_ROTACION", levelFromExcess(meanRotation - 25, 10, 20), meanRotation));
    }
  }

  // 5. Mala recepción: al final de cada segmento de ATERRIZAJE, la rodilla debería
  // flexionarse (bajar de ~160°). Si se mantiene rígida, se marca.
  for (const landing of landingSegments) {
    const landingFrames = frames.filter((f) => f.tSeconds >= landing.startSeconds && f.tSeconds <= landing.endSeconds);
    if (!landingFrames.length) continue;
    const lastFrames = landingFrames.slice(-3);
    const kneeAtLanding = avg(lastFrames.map((f) => avg([f.kneeAngleLeft, f.kneeAngleRight])));
    if (kneeAtLanding > 160) {
      malaRecepcionTriggered = true;
      findings.push(buildFinding("MALA_RECEPCION", levelFromExcess(kneeAtLanding - 160, 5, 10), kneeAtLanding));
    }
  }

  // 6. Riesgo de lesión: combinación de rodillas rígidas + mala recepción
  if (rodillasRigidasTriggered && malaRecepcionTriggered) {
    findings.push(buildFinding("RIESGO_LESION", "ALTO", meanKnee));
  }

  // 7. Espalda curvada (proxy: ángulo cadera-tronco muy flexionado, <95°)
  const meanHip = avg(baseFrames.map((f) => avg([f.hipAngleLeft, f.hipAngleRight])));
  if (meanHip < HEALTHY_ZONES.hipAngleMinDeg) {
    findings.push(buildFinding("ESPALDA_CURVADA", levelFromExcess(HEALTHY_ZONES.hipAngleMinDeg - meanHip, 10, 20), meanHip));
  }

  // 8. Barra muy alta / muy baja (proxy: altura de manos relativa a hombro-cadera)
  const meanHandHeight = avg(baseFrames.map((f) => f.handHeightRelative));
  if (Number.isFinite(meanHandHeight)) {
    if (meanHandHeight < HEALTHY_ZONES.handHeightMinRelative) {
      findings.push(buildFinding("BARRA_MUY_ALTA", levelFromExcess(HEALTHY_ZONES.handHeightMinRelative - meanHandHeight, 0.15, 0.3), meanHandHeight));
    } else if (meanHandHeight > HEALTHY_ZONES.handHeightMaxRelative) {
      findings.push(buildFinding("BARRA_MUY_BAJA", levelFromExcess(meanHandHeight - HEALTHY_ZONES.handHeightMaxRelative, 0.2, 0.4), meanHandHeight));
    }
  }

  // 9. Postura incorrecta: indicador compuesto si hay 2+ errores específicos ya detectados
  const specificFindingsCount = findings.length;
  if (specificFindingsCount >= 2) {
    findings.push(buildFinding("POSTURA_INCORRECTA", "MODERADO", specificFindingsCount));
  }

  return { findings, notDetectedYet: ERROR_NOT_DETECTED_YET };
}
