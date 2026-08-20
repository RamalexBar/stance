// Segmenta el video en maniobras usando reglas sobre las métricas ya
// calculadas en la Fase 4 (biomecánica). Nada de IA aquí: son umbrales
// estadísticos sobre velocidad vertical del centro de masa y rotación de
// tronco. Es deliberadamente simple — el prompt maestro pide "reglas antes
// de ML" para este módulo, y solo con una cámara lateral y sin datos de
// viento/rumbo, maniobras como ceñida/trasluchada/virada NO son detectables
// de forma confiable todavía (ver NOT_DETECTED_YET más abajo).

interface FrameLike {
  tSeconds: number;
  comY: number;
  comX: number;
  trunkRotationDegEstimated: number;
  kneeAngleLeft: number;
  kneeAngleRight: number;
}

export type ManeuverType = "NAVEGACION" | "SALTO" | "ATERRIZAJE" | "RECEPCION" | "CAMBIO_DIRECCION";

export interface Segment {
  type: ManeuverType;
  startSeconds: number;
  endSeconds: number;
  confidence: number;
  notes?: string;
}

export const NOT_DETECTED_YET = [
  { maneuver: "SALIDA", reason: "Requiere contexto de inicio de sesión, no solo pose corporal." },
  { maneuver: "CEÑIDA", reason: "Requiere dirección del viento/rumbo, no disponible con solo la cámara." },
  { maneuver: "TRASLUCHADA", reason: "Requiere rumbo respecto al viento." },
  { maneuver: "VIRADA", reason: "Requiere rumbo respecto al viento." },
  { maneuver: "GIROS", reason: "Requiere seguimiento de orientación corporal completa (yaw), no solo landmarks 2D." },
  { maneuver: "LOOPS", reason: "Maniobra aérea compleja; se aborda junto con un dataset propio de saltos avanzados." },
  { maneuver: "TRANSICIONES", reason: "Depende de detectar cambio de disciplina/postura de pie, pendiente de más ejemplos." },
];

function smooth(values: number[], window = 5): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    const slice = values.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function centralDiff(values: number[], t: number[]): number[] {
  return values.map((_, i) => {
    if (i === 0 || i === values.length - 1) return 0;
    const dt = t[i + 1] - t[i - 1];
    if (dt <= 0) return 0;
    return (values[i + 1] - values[i - 1]) / dt;
  });
}

function meanStd(values: number[]): { mean: number; std: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

function mergeAdjacent(segments: Segment[], gapToleranceSeconds = 0.15): Segment[] {
  if (!segments.length) return [];
  const sorted = [...segments].sort((a, b) => a.startSeconds - b.startSeconds);
  const merged: Segment[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.type === last.type && curr.startSeconds - last.endSeconds <= gapToleranceSeconds) {
      last.endSeconds = curr.endSeconds;
      last.confidence = Math.max(last.confidence, curr.confidence);
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

export function detectSegments(frames: FrameLike[]): Segment[] {
  if (frames.length < 8) return [];

  const t = frames.map((f) => f.tSeconds);
  const comY = smooth(frames.map((f) => f.comY));
  const rotation = smooth(frames.map((f) => f.trunkRotationDegEstimated));

  const vY = centralDiff(comY, t); // negativo = subiendo (y de imagen crece hacia abajo)
  const vRotation = centralDiff(rotation, t);

  const { std: stdVY } = meanStd(vY);
  const { std: stdRotation } = meanStd(vRotation);

  const jumpThreshold = Math.max(stdVY * 2.2, 0.08);
  const directionThreshold = Math.max(stdRotation * 2.2, 12); // grados/seg

  const special: Segment[] = [];

  // Saltos: cluster de frames subiendo rápido seguido de bajada rápida
  let i = 0;
  while (i < vY.length) {
    if (vY[i] < -jumpThreshold) {
      const ascentStart = i;
      while (i < vY.length && vY[i] < -jumpThreshold * 0.4) i++;
      const peak = i;

      // Busca la bajada (aterrizaje) en los siguientes ~1.5s
      let descentEnd = peak;
      const searchLimit = t[peak] + 1.5;
      let foundDescent = false;
      while (descentEnd < vY.length && t[descentEnd] <= searchLimit) {
        if (vY[descentEnd] > jumpThreshold) {
          foundDescent = true;
          while (descentEnd < vY.length && vY[descentEnd] > jumpThreshold * 0.4) descentEnd++;
          break;
        }
        descentEnd++;
      }

      if (foundDescent) {
        const magnitude = Math.abs(vY[ascentStart]) + Math.abs(vY[Math.min(descentEnd, vY.length - 1)]);
        const confidence = Math.min(1, magnitude / (jumpThreshold * 3));

        special.push({
          type: "SALTO",
          startSeconds: t[ascentStart],
          endSeconds: t[Math.min(descentEnd, t.length - 1)],
          confidence,
        });

        const landingStart = Math.max(0, descentEnd - 3);
        const landingEndIndex = Math.min(descentEnd, t.length - 1);
        special.push({
          type: "ATERRIZAJE",
          startSeconds: t[landingStart],
          endSeconds: t[landingEndIndex],
          confidence,
          notes: "Ventana corta inmediatamente después del salto detectado.",
        });

        // Recepción: ventana posterior al aterrizaje hasta que la rodilla vuelve
        // cerca de su línea base previa al salto (absorción del impacto), con un
        // tope de 1.5s para no confundir con la navegación siguiente.
        const preJumpBaseline =
          ascentStart > 3
            ? frames.slice(Math.max(0, ascentStart - 5), ascentStart).reduce(
                (sum, f) => sum + (f.kneeAngleLeft + f.kneeAngleRight) / 2,
                0
              ) / Math.max(1, Math.min(5, ascentStart))
            : 170;

        let recepcionEnd = landingEndIndex;
        const recepcionLimit = t[landingEndIndex] + 1.5;
        while (
          recepcionEnd < frames.length - 1 &&
          t[recepcionEnd] <= recepcionLimit &&
          Math.abs((frames[recepcionEnd].kneeAngleLeft + frames[recepcionEnd].kneeAngleRight) / 2 - preJumpBaseline) > 10
        ) {
          recepcionEnd++;
        }

        if (recepcionEnd > landingEndIndex) {
          special.push({
            type: "RECEPCION",
            startSeconds: t[landingEndIndex],
            endSeconds: t[Math.min(recepcionEnd, t.length - 1)],
            confidence: confidence * 0.8,
            notes: "Ventana de estabilización posterior al aterrizaje, hasta que la rodilla vuelve cerca de su ángulo previo al salto.",
          });
        }

        i = Math.max(descentEnd, recepcionEnd) + 1;
        continue;
      }
    }
    i++;
  }

  // Cambios de dirección: derivada de rotación de tronco por encima del umbral,
  // fuera de las ventanas ya marcadas como salto/aterrizaje.
  const occupied = (time: number) =>
    special.some((s) => time >= s.startSeconds && time <= s.endSeconds);

  let j = 0;
  while (j < vRotation.length) {
    if (Math.abs(vRotation[j]) > directionThreshold && !occupied(t[j])) {
      const start = j;
      while (
        j < vRotation.length &&
        Math.abs(vRotation[j]) > directionThreshold * 0.4 &&
        !occupied(t[j])
      ) {
        j++;
      }
      const confidence = Math.min(1, Math.abs(vRotation[start]) / (directionThreshold * 2));
      special.push({
        type: "CAMBIO_DIRECCION",
        startSeconds: t[start],
        endSeconds: t[Math.min(j, t.length - 1)],
        confidence,
      });
    }
    j++;
  }

  const sortedSpecial = mergeAdjacent(special).sort((a, b) => a.startSeconds - b.startSeconds);

  // Rellena los huecos con NAVEGACION (línea base)
  const result: Segment[] = [];
  let cursor = t[0];
  for (const seg of sortedSpecial) {
    if (seg.startSeconds - cursor > 0.2) {
      result.push({
        type: "NAVEGACION",
        startSeconds: cursor,
        endSeconds: seg.startSeconds,
        confidence: 1,
      });
    }
    result.push(seg);
    cursor = Math.max(cursor, seg.endSeconds);
  }
  if (t[t.length - 1] - cursor > 0.2) {
    result.push({ type: "NAVEGACION", startSeconds: cursor, endSeconds: t[t.length - 1], confidence: 1 });
  }

  return result;
}
