import { angleAt, inclinationFromVertical, midpoint, distance, average, Landmark } from "./geometry";
import { LM } from "./landmarkIndex";

export interface PoseFrameInput {
  tSeconds: number;
  landmarks: Landmark[];
}

export interface FrameMetrics {
  tSeconds: number;
  kneeAngleLeft: number;
  kneeAngleRight: number;
  hipAngleLeft: number;
  hipAngleRight: number;
  ankleAngleLeft: number;
  ankleAngleRight: number;
  shoulderAngleLeft: number;
  shoulderAngleRight: number;
  elbowAngleLeft: number;
  elbowAngleRight: number;
  trunkInclinationDeg: number;
  /** Aproximado: usa la profundidad relativa (z) entre hombros; con una sola cámara
   *  lateral no hay una medición 3D real, se trata como estimación, no como dato exacto. */
  trunkRotationDegEstimated: number;
  /** Centro de masa aproximado (coordenadas normalizadas 0-1 de la imagen). */
  comX: number;
  comY: number;
  /** Desviación horizontal del centro de masa respecto al punto medio de los tobillos,
   *  normalizada por el ancho de cadera. Positivo/negativo indica hacia qué lado del
   *  cuadro se inclina el peso — con cámara lateral esto refleja adelante/atrás. */
  balanceOffset: number;
  /** Diferencia absoluta promedio entre ángulos izquierda/derecha en este frame.
   *  0 = perfectamente simétrico. Con cámara lateral, el lado lejano puede estar
   *  parcialmente ocluido, lo que puede inflar este número sin ser asimetría real. */
  symmetryDelta: number;
  /** Altura de las manos (proxy de la barra de kite o del agarre de la vela en
   *  Wing Foil) relativa
   *  al hombro, en unidades de largo de torso: 0 = altura de hombro, negativo = manos
   *  por encima del hombro ("barra alta"), ~1.0 = altura de cadera, >1.0 = por debajo
   *  de la cadera ("barra baja"). Es una APROXIMACIÓN a partir de la posición de las
   *  manos, no una detección real del objeto — la plataforma no detecta equipo todavía. */
  handHeightRelative: number;
}

export interface MetricSummary {
  min: number;
  max: number;
  mean: number;
}

export interface ChartInsight {
  explanation: string;
  recommendation: string;
}

export interface BiomechanicsResult {
  series: FrameMetrics[];
  summary: Record<string, MetricSummary>;
  estimatedKneeLoadIndexAvg: number | null;
  approxTrunkOscillationsPerMinute: number | null;
  notesForUser: string[];
  trunkInclinationInsight: ChartInsight | null;
  balanceInsight: ChartInsight | null;
}

function computeFrameMetrics(landmarks: Landmark[]): Omit<FrameMetrics, "tSeconds"> | null {
  const get = (i: number) => landmarks[i];

  const shoulderL = get(LM.LEFT_SHOULDER);
  const shoulderR = get(LM.RIGHT_SHOULDER);
  const elbowL = get(LM.LEFT_ELBOW);
  const elbowR = get(LM.RIGHT_ELBOW);
  const wristL = get(LM.LEFT_WRIST);
  const wristR = get(LM.RIGHT_WRIST);
  const hipL = get(LM.LEFT_HIP);
  const hipR = get(LM.RIGHT_HIP);
  const kneeL = get(LM.LEFT_KNEE);
  const kneeR = get(LM.RIGHT_KNEE);
  const ankleL = get(LM.LEFT_ANKLE);
  const ankleR = get(LM.RIGHT_ANKLE);
  const footL = get(LM.LEFT_FOOT_INDEX);
  const footR = get(LM.RIGHT_FOOT_INDEX);

  if (!shoulderL || !shoulderR || !hipL || !hipR || !kneeL || !kneeR || !ankleL || !ankleR) {
    return null;
  }

  const kneeAngleLeft = angleAt(hipL, kneeL, ankleL);
  const kneeAngleRight = angleAt(hipR, kneeR, ankleR);
  const hipAngleLeft = angleAt(shoulderL, hipL, kneeL);
  const hipAngleRight = angleAt(shoulderR, hipR, kneeR);
  const ankleAngleLeft = footL ? angleAt(kneeL, ankleL, footL) : NaN;
  const ankleAngleRight = footR ? angleAt(kneeR, ankleR, footR) : NaN;
  const shoulderAngleLeft = elbowL ? angleAt(elbowL, shoulderL, hipL) : NaN;
  const shoulderAngleRight = elbowR ? angleAt(elbowR, shoulderR, hipR) : NaN;
  const elbowAngleLeft = elbowL && wristL ? angleAt(shoulderL, elbowL, wristL) : NaN;
  const elbowAngleRight = elbowR && wristR ? angleAt(shoulderR, elbowR, wristR) : NaN;

  const shoulderMid = midpoint(shoulderL, shoulderR);
  const hipMid = midpoint(hipL, hipR);
  const trunkInclinationDeg = inclinationFromVertical(shoulderMid, hipMid);

  const zL = shoulderL.z ?? 0;
  const zR = shoulderR.z ?? 0;
  const trunkRotationDegEstimated =
    (Math.atan2(zR - zL, shoulderR.x - shoulderL.x) * 180) / Math.PI;

  // Centro de masa aproximado: promedio ponderado de segmentos corporales
  // (pesos aproximados de literatura de biomecánica, simplificados a 5 segmentos).
  const headPoint = shoulderMid; // aproximación: usamos hombros como proxy de cabeza/cuello
  const trunkPoint = midpoint(shoulderMid, hipMid);
  const thighPoint = midpoint(midpoint(hipL, hipR), midpoint(kneeL, kneeR));
  const shankPoint = midpoint(midpoint(kneeL, kneeR), midpoint(ankleL, ankleR));
  const armPoint = midpoint(shoulderMid, midpoint(wristL ?? shoulderL, wristR ?? shoulderR));

  const weights = { head: 0.08, trunk: 0.5, thigh: 0.2, shank: 0.12, arm: 0.1 };
  const comX =
    headPoint.x * weights.head +
    trunkPoint.x * weights.trunk +
    thighPoint.x * weights.thigh +
    shankPoint.x * weights.shank +
    armPoint.x * weights.arm;
  const comY =
    headPoint.y * weights.head +
    trunkPoint.y * weights.trunk +
    thighPoint.y * weights.thigh +
    shankPoint.y * weights.shank +
    armPoint.y * weights.arm;

  const ankleMid = midpoint(ankleL, ankleR);
  const hipWidth = distance(hipL, hipR) || 1;
  const balanceOffset = (comX - ankleMid.x) / hipWidth;

  const symmetryDelta = average([
    Math.abs(kneeAngleLeft - kneeAngleRight),
    Math.abs(hipAngleLeft - hipAngleRight),
    Math.abs(shoulderAngleLeft - shoulderAngleRight),
    Math.abs(elbowAngleLeft - elbowAngleRight),
  ]);

  const torsoLength = distance(shoulderMid, hipMid) || 1;
  let handHeightRelative = NaN;
  if (wristL || wristR) {
    const wristMid = wristL && wristR ? midpoint(wristL, wristR) : (wristL ?? wristR)!;
    // 0 = manos a la altura del hombro. Negativo = manos por ENCIMA del hombro.
    // 1.0 = manos a la altura de la cadera. >1.0 = manos por DEBAJO de la cadera.
    handHeightRelative = (wristMid.y - shoulderMid.y) / torsoLength;
  }

  return {
    kneeAngleLeft,
    kneeAngleRight,
    hipAngleLeft,
    hipAngleRight,
    ankleAngleLeft,
    ankleAngleRight,
    shoulderAngleLeft,
    shoulderAngleRight,
    elbowAngleLeft,
    elbowAngleRight,
    trunkInclinationDeg,
    trunkRotationDegEstimated,
    comX,
    comY,
    balanceOffset,
    symmetryDelta,
    handHeightRelative,
  };
}

function summarize(series: FrameMetrics[], key: keyof FrameMetrics): MetricSummary {
  const values = series.map((f) => f[key] as number).filter((v) => Number.isFinite(v));
  if (!values.length) return { min: NaN, max: NaN, mean: NaN };
  return { min: Math.min(...values), max: Math.max(...values), mean: average(values) };
}

/**
 * Cuenta cruces por cero de la señal de inclinación de tronco (ya centrada en su
 * media) para estimar una frecuencia de oscilación. Es una aproximación: la
 * maniobra de navegación en línea recta NO es intrínsecamente cíclica, así que
 * este número debe interpretarse como referencia, no como una cadencia real
 * (a diferencia de, por ejemplo, remar o pedalear).
 */
function estimateOscillationsPerMinute(series: FrameMetrics[]): number | null {
  if (series.length < 4) return null;
  const values = series.map((f) => f.trunkInclinationDeg).filter(Number.isFinite);
  if (values.length < 4) return null;

  const mean = average(values);
  let crossings = 0;
  for (let i = 1; i < values.length; i++) {
    if ((values[i - 1] - mean) * (values[i] - mean) < 0) crossings++;
  }

  const durationSeconds = series[series.length - 1].tSeconds - series[0].tSeconds;
  if (durationSeconds <= 0) return null;

  const cyclesPerSecond = crossings / 2 / durationSeconds;
  return cyclesPerSecond * 60;
}

/**
 * Umbrales heurísticos (no clínicos) para pasar de "número crudo" a un
 * comentario de técnica en español — calibrados a ojo sobre rangos
 * plausibles de inclinación/balance en kite y wing foil, no sacados de un
 * estudio. Sirven para orientar, no como diagnóstico.
 */
function trunkInclinationInsight(summary: MetricSummary): ChartInsight | null {
  if (!Number.isFinite(summary.mean)) return null;
  const range = summary.max - summary.min;
  const parts: string[] = [];

  if (summary.mean > 35) {
    parts.push(
      `Tu inclinación promedio fue de ${summary.mean.toFixed(0)}° respecto a la vertical — bastante pronunciada. Prueba flexionar más las piernas y llevar el tronco un poco más erguido: reduce la carga en la espalda baja y suele dar más control de la potencia.`
    );
  } else if (summary.mean < 10) {
    parts.push(
      `Tu inclinación promedio fue de solo ${summary.mean.toFixed(0)}° — muy vertical. Si sientes que te falta contrapeso contra la tracción del kite/vela, una inclinación algo mayor (apoyándote más hacia atrás) suele ayudar a generar más resistencia.`
    );
  } else {
    parts.push(
      `Tu inclinación promedio (${summary.mean.toFixed(0)}°) está en un rango razonable para mantener control sin forzar la espalda.`
    );
  }

  if (range > 25) {
    parts.push(
      `Además varió bastante durante la maniobra (de ${summary.min.toFixed(0)}° a ${summary.max.toFixed(
        0
      )}°) — trabajar la consistencia postural puede ayudarte a navegar más estable.`
    );
  }

  return {
    explanation:
      "Mide cuánto se inclina tu tronco respecto a la vertical, cuadro a cuadro. Una inclinación moderada y estable suele indicar buen control de la potencia del kite/vela; picos muy altos o muy variables pueden indicar pérdida de equilibrio o sobre-compensación.",
    recommendation: parts.join(" "),
  };
}

function balanceInsight(summary: MetricSummary): ChartInsight | null {
  if (!Number.isFinite(summary.mean)) return null;
  const range = summary.max - summary.min;
  const parts: string[] = [];

  if (Math.abs(summary.mean) > 0.4) {
    parts.push(
      `Tu peso estuvo consistentemente desplazado hacia un lado durante la maniobra (desviación promedio de ${summary.mean.toFixed(
        2
      )}, en unidades de ancho de cadera) — intenta centrar más el peso sobre la tabla, distribuido entre ambos pies, para mejor control y menos fatiga.`
    );
  } else {
    parts.push(`Tu peso se mantuvo relativamente centrado (desviación promedio de ${summary.mean.toFixed(2)}).`);
  }

  if (range > 0.6) {
    parts.push(
      "También varió bastante durante la maniobra — trabajar la estabilidad del core puede ayudarte a mantener una posición más constante."
    );
  }

  return {
    explanation:
      "Mide si tu peso está desplazado respecto al punto medio de tus pies, en unidades relativas al ancho de tu cadera (0 = centrado). Con cámara lateral, esto refleja principalmente adelante/atrás sobre la tabla — no se etiqueta la dirección exacta porque depende de hacia dónde mira la cámara en cada video.",
    recommendation: parts.join(" "),
  };
}

export const biomechanicsCompute = {
  /**
   * `weightKg` es opcional (viene del perfil del usuario). Sin él, se omite
   * el índice de carga estimado en vez de inventar un valor.
   */
  compute(frames: PoseFrameInput[], weightKg?: number | null): BiomechanicsResult {
    const series: FrameMetrics[] = [];

    for (const frame of frames) {
      const metrics = computeFrameMetrics(frame.landmarks);
      if (metrics) series.push({ tSeconds: frame.tSeconds, ...metrics });
    }

    const keys: (keyof FrameMetrics)[] = [
      "kneeAngleLeft", "kneeAngleRight", "hipAngleLeft", "hipAngleRight",
      "ankleAngleLeft", "ankleAngleRight", "shoulderAngleLeft", "shoulderAngleRight",
      "elbowAngleLeft", "elbowAngleRight", "trunkInclinationDeg",
      "trunkRotationDegEstimated", "balanceOffset", "symmetryDelta", "handHeightRelative",
    ];

    const summary: Record<string, MetricSummary> = {};
    for (const key of keys) {
      summary[key] = summarize(series, key);
    }

    // Índice de carga articular ESTIMADO, no una fuerza real en Newtons.
    // Fórmula simplificada: peso corporal × (1 - cos(desviación de rodilla desde
    // extensión completa)). Sirve para comparar relativamente entre videos del
    // MISMO usuario, no como valor clínico absoluto.
    let estimatedKneeLoadIndexAvg: number | null = null;
    if (weightKg) {
      const loads = series.map((f) => {
        const kneeAngle = average([f.kneeAngleLeft, f.kneeAngleRight]);
        const deviationRad = ((180 - kneeAngle) * Math.PI) / 180;
        return weightKg * (1 - Math.cos(deviationRad));
      });
      estimatedKneeLoadIndexAvg = average(loads);
    }

    const approxTrunkOscillationsPerMinute = estimateOscillationsPerMinute(series);

    // Las dos primeras y la última son límites estructurales de la
    // plataforma (2D de una cámara, sin detección de equipo, sin sensores) —
    // aplican siempre, a cualquier video. Las del medio solo se muestran
    // cuando el dato al que se refieren realmente está presente/es relevante
    // en ESTE video, con el número real en vez de una advertencia genérica.
    const notesForUser: string[] = [
      "Centro de masa, carga articular y rotación de tronco son ESTIMACIONES a partir de una sola cámara 2D, no mediciones exactas.",
      "La altura de la barra/agarre de vela se infiere de la posición de las manos, no de una detección real del equipo (todavía no hay detección de objetos en la plataforma).",
    ];
    if (summary.symmetryDelta && summary.symmetryDelta.mean > 8) {
      notesForUser.push(
        `Tu diferencia izquierda/derecha promedio fue de ${summary.symmetryDelta.mean.toFixed(
          1
        )}° — puede ser asimetría real, pero con cámara lateral también puede deberse a oclusión del lado más lejano a la cámara.`
      );
    }
    if (approxTrunkOscillationsPerMinute !== null) {
      notesForUser.push(
        `Esta maniobra (navegación en línea recta) no es cíclica por naturaleza: la cadencia mostrada (${approxTrunkOscillationsPerMinute.toFixed(
          0
        )}/min) es una referencia aproximada, no un conteo real de repeticiones.`
      );
    }
    notesForUser.push(
      "Tiempo de reacción, potencia estimada y fuerzas aplicadas no se calculan en esta fase: requieren un evento de inicio claro y/o datos de sensores que todavía no existen en la plataforma."
    );

    return {
      series,
      summary,
      estimatedKneeLoadIndexAvg,
      approxTrunkOscillationsPerMinute,
      notesForUser,
      trunkInclinationInsight: summary.trunkInclinationDeg ? trunkInclinationInsight(summary.trunkInclinationDeg) : null,
      balanceInsight: summary.balanceOffset ? balanceInsight(summary.balanceOffset) : null,
    };
  },
};
