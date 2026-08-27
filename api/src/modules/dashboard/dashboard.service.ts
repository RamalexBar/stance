import { prisma } from "../../shared/prisma";
import { computeAggregates, scoreAggregate } from "../comparisons/comparisons.score";
import { injuriesRepository } from "../injuries/injuries.repository";
import { LM } from "../biomechanics/landmarkIndex";

export interface SessionSummary {
  videoId: string;
  discipline: string;
  createdAt: Date;
  durationSeconds: number | null;
  techniqueScore: number | null;
  errorCount: number | null;
  maxJumpExcursionRelative: number | null;
  bestHangtimeSeconds: number | null;
  maxJumpHeightMeters: number | null;
  avgSpeedKmh: number | null;
  maxSpeedKmh: number | null;
  distanceMeters: number | null;
}

interface GpsPointLike {
  tSeconds: number;
  lat: number;
  lon: number;
}

function haversineMeters(a: GpsPointLike, b: GpsPointLike): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * A diferencia de la altura del salto, velocidad y distancia se calculan
 * directo del track GPS — sin ambigüedad de escala de cámara. Se descartan
 * segmentos con dt < 1s para el cálculo de velocidad máxima: el ruido típico
 * del GPS de teléfono entre fixes muy seguidos puede inflarla artificialmente.
 */
function computeGpsMetrics(
  points: GpsPointLike[]
): { avgSpeedKmh: number; maxSpeedKmh: number; distanceMeters: number } | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.tSeconds - b.tSeconds);

  let distanceMeters = 0;
  let maxSpeedKmh = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dt = sorted[i].tSeconds - sorted[i - 1].tSeconds;
    if (dt <= 0) continue;
    const segmentMeters = haversineMeters(sorted[i - 1], sorted[i]);
    distanceMeters += segmentMeters;
    if (dt >= 1) {
      const speedKmh = (segmentMeters / dt) * 3.6;
      if (speedKmh > maxSpeedKmh) maxSpeedKmh = speedKmh;
    }
  }

  const totalDurationSeconds = sorted[sorted.length - 1].tSeconds - sorted[0].tSeconds;
  const avgSpeedKmh = totalDurationSeconds > 0 ? (distanceMeters / totalDurationSeconds) * 3.6 : 0;

  return { avgSpeedKmh, maxSpeedKmh, distanceMeters };
}

interface PoseFrameLike {
  tSeconds: number;
  landmarks: { x: number; y: number; z?: number; visibility?: number }[];
}

/**
 * Convierte la excursión vertical del salto (unidades normalizadas 0-1 de la
 * imagen) a metros reales, calibrando con la estatura conocida del usuario:
 * mide su altura en esas mismas unidades normalizadas (nariz a tobillos) en
 * el frame justo antes de despegar, y usa esa razón px↔metro para el resto.
 * Solo es válido si el atleta está a una distancia similar de la cámara al
 * despegar y en el punto más alto — cierto en saltos cortos (1-2s), no sirve
 * para desplazamientos largos donde la profundidad respecto a la cámara cambia.
 */
function estimateJumpHeightMeters(
  poseFrames: PoseFrameLike[],
  jumpStartSeconds: number,
  verticalExcursionNormalized: number,
  heightMeters: number | null
): number | null {
  if (!heightMeters || !poseFrames.length) return null;

  const referenceFrame =
    [...poseFrames].filter((f) => f.tSeconds <= jumpStartSeconds).sort((a, b) => b.tSeconds - a.tSeconds)[0] ??
    poseFrames[0];

  const nose = referenceFrame.landmarks[LM.NOSE];
  const ankleL = referenceFrame.landmarks[LM.LEFT_ANKLE];
  const ankleR = referenceFrame.landmarks[LM.RIGHT_ANKLE];
  if (!nose || !ankleL || !ankleR) return null;

  const standingHeightNormalized = (ankleL.y + ankleR.y) / 2 - nose.y;
  if (standingHeightNormalized <= 0) return null;

  return verticalExcursionNormalized * (heightMeters / standingHeightNormalized);
}

// Cruce heurístico entre la zona de lesión que el usuario reporta y los
// errores técnicos que el sistema detecta ahí — no es un diagnóstico, es una
// señal para que el usuario y su entrenador lo revisen con más atención.
const BODY_PART_ERROR_MAP: { keywords: string[]; errorTypes: string[] }[] = [
  { keywords: ["rodilla", "knee"], errorTypes: ["RODILLAS_RIGIDAS", "MALA_RECEPCION", "RIESGO_LESION"] },
  { keywords: ["hombro", "shoulder"], errorTypes: ["HOMBROS_DESALINEADOS", "BARRA_MUY_ALTA"] },
  { keywords: ["espalda", "lumbar", "back"], errorTypes: ["ESPALDA_CURVADA", "BARRA_MUY_BAJA"] },
  { keywords: ["tobillo", "ankle"], errorTypes: ["MALA_RECEPCION", "RIESGO_LESION"] },
  { keywords: ["cadera", "hip"], errorTypes: ["CENTRO_GRAVEDAD_ADELANTADO", "CENTRO_GRAVEDAD_RETRASADO", "ESPALDA_CURVADA"] },
  { keywords: ["muñeca", "wrist", "brazo", "arm", "codo", "elbow"], errorTypes: ["BARRA_MUY_ALTA", "BARRA_MUY_BAJA"] },
];

export interface InjuryErrorCorrelation {
  bodyPart: string;
  errorType: string;
  errorCount: number;
}

function correlateInjuriesWithErrors(
  injuries: { bodyPart: string }[],
  errorFrequency: Record<string, number>
): InjuryErrorCorrelation[] {
  const seen = new Set<string>();
  const correlations: InjuryErrorCorrelation[] = [];

  for (const injury of injuries) {
    const bodyPartLower = injury.bodyPart.toLowerCase();
    for (const mapping of BODY_PART_ERROR_MAP) {
      if (!mapping.keywords.some((kw) => bodyPartLower.includes(kw))) continue;
      for (const errorType of mapping.errorTypes) {
        const errorCount = errorFrequency[errorType];
        if (!errorCount) continue;
        const key = `${injury.bodyPart}::${errorType}`;
        if (seen.has(key)) continue;
        seen.add(key);
        correlations.push({ bodyPart: injury.bodyPart, errorType, errorCount });
      }
    }
  }
  return correlations;
}

function weekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export const dashboardService = {
  async getSummary(userId: string) {
    const [videos, user] = await Promise.all([
      prisma.videoSession.findMany({
        where: { userId, status: "UPLOADED" },
        orderBy: { createdAt: "asc" },
        include: { biomechanics: true, errors: true, movement: true, poseAnalysis: true, gpsTrack: true },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { heightCm: true } }),
    ]);
    const heightMeters = user?.heightCm ? user.heightCm / 100 : null;

    const sessions: SessionSummary[] = videos.map((video) => {
      let techniqueScore: number | null = null;
      if (video.biomechanics?.seriesJson) {
        const frames = video.biomechanics.seriesJson as any[];
        techniqueScore = scoreAggregate(computeAggregates(frames)).total;
      }

      let errorCount: number | null = null;
      if (video.errors?.findingsJson) {
        errorCount = (video.errors.findingsJson as any[]).length;
      }

      let maxJumpExcursionRelative: number | null = null;
      let maxJumpHeightMeters: number | null = null;
      if (video.movement?.segmentsJson && video.biomechanics?.seriesJson) {
        const segments = video.movement.segmentsJson as any[];
        const frames = video.biomechanics.seriesJson as any[];
        const poseFrames = (video.poseAnalysis?.framesJson as PoseFrameLike[] | undefined) ?? [];
        const jumpSegments = segments.filter((s) => s.type === "SALTO");
        const jumps = jumpSegments.map((seg) => {
          const inRange = frames.filter(
            (f) => f.tSeconds >= seg.startSeconds && f.tSeconds <= seg.endSeconds
          );
          if (!inRange.length) return { excursion: 0, heightMeters: null as number | null };
          const comYValues = inRange.map((f) => f.comY);
          const excursion = Math.max(...comYValues) - Math.min(...comYValues);
          const heightMetersEst = estimateJumpHeightMeters(poseFrames, seg.startSeconds, excursion, heightMeters);
          return { excursion, heightMeters: heightMetersEst };
        });
        maxJumpExcursionRelative = jumps.length ? Math.max(...jumps.map((j) => j.excursion)) : null;
        const heightsEstimated = jumps.map((j) => j.heightMeters).filter((h): h is number => h !== null);
        maxJumpHeightMeters = heightsEstimated.length ? Math.max(...heightsEstimated) : null;
      }

      let avgSpeedKmh: number | null = null;
      let maxSpeedKmh: number | null = null;
      let distanceMeters: number | null = null;
      if (video.gpsTrack?.pointsJson) {
        const gpsMetrics = computeGpsMetrics(video.gpsTrack.pointsJson as unknown as GpsPointLike[]);
        if (gpsMetrics) {
          avgSpeedKmh = gpsMetrics.avgSpeedKmh;
          maxSpeedKmh = gpsMetrics.maxSpeedKmh;
          distanceMeters = gpsMetrics.distanceMeters;
        }
      }

      let bestHangtimeSeconds: number | null = null;
      if (video.movement?.segmentsJson) {
        const segments = video.movement.segmentsJson as any[];
        const hangtimes = segments
          .filter((s) => s.type === "SALTO")
          .map((s) => s.endSeconds - s.startSeconds)
          .filter((seconds) => seconds > 0);
        bestHangtimeSeconds = hangtimes.length ? Math.max(...hangtimes) : null;
      }

      return {
        videoId: video.id,
        discipline: video.discipline,
        createdAt: video.createdAt,
        durationSeconds: video.durationSeconds,
        techniqueScore,
        errorCount,
        maxJumpExcursionRelative,
        bestHangtimeSeconds,
        maxJumpHeightMeters,
        avgSpeedKmh,
        maxSpeedKmh,
        distanceMeters,
      };
    });

    const totalSecondsAnalyzed = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

    const disciplineBreakdown: Record<string, number> = {};
    for (const s of sessions) {
      disciplineBreakdown[s.discipline] = (disciplineBreakdown[s.discipline] ?? 0) + 1;
    }

    const errorFrequency: Record<string, number> = {};
    for (const video of videos) {
      if (!video.errors?.findingsJson) continue;
      for (const finding of video.errors.findingsJson as any[]) {
        errorFrequency[finding.type] = (errorFrequency[finding.type] ?? 0) + 1;
      }
    }

    const weeklyMap = new Map<string, number>();
    for (const s of sessions) {
      const key = weekKey(s.createdAt);
      weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + 1);
    }
    const trainingFrequency = Array.from(weeklyMap.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => (a.week < b.week ? -1 : 1));

    // Racha en SEMANAS (no días): el viento no depende del deportista, así
    // que exigir una sesión analizada por día sería un criterio irreal para
    // este deporte. Cuenta semanas consecutivas con al menos una sesión,
    // y se considera "viva" solo si la más reciente es esta semana o la
    // pasada (si no, la racha se rompió y vuelve a 0).
    let weeklyStreak = 0;
    if (trainingFrequency.length) {
      weeklyStreak = 1;
      for (let i = trainingFrequency.length - 1; i > 0; i--) {
        const curr = new Date(trainingFrequency[i].week).getTime();
        const prev = new Date(trainingFrequency[i - 1].week).getTime();
        if (curr - prev === 7 * 86400000) weeklyStreak++;
        else break;
      }
      const mostRecentWeek = new Date(trainingFrequency[trainingFrequency.length - 1].week).getTime();
      const thisWeek = new Date(weekKey(new Date())).getTime();
      const weeksSinceLast = Math.round((thisWeek - mostRecentWeek) / (7 * 86400000));
      if (weeksSinceLast > 1) weeklyStreak = 0;
    }

    const scored = sessions.filter((s) => s.techniqueScore !== null);
    let improvementTrend: "MEJORANDO" | "ESTABLE" | "RETROCEDIENDO" | "SIN_DATOS" = "SIN_DATOS";
    // Antes/después con números concretos, no solo la etiqueta de tendencia —
    // "+14 puntos desde tu primera sesión" motiva más que "Mejorando".
    let scoreProgress: { firstVideoId: string; lastVideoId: string; first: number; last: number; delta: number } | null = null;
    if (scored.length >= 2) {
      const first = scored[0].techniqueScore!;
      const last = scored[scored.length - 1].techniqueScore!;
      if (last - first > 5) improvementTrend = "MEJORANDO";
      else if (first - last > 5) improvementTrend = "RETROCEDIENDO";
      else improvementTrend = "ESTABLE";
      scoreProgress = {
        firstVideoId: scored[0].videoId,
        lastVideoId: scored[scored.length - 1].videoId,
        first,
        last,
        delta: last - first,
      };
    }

    const maxRelativeJumpExcursion = sessions.reduce(
      (max, s) => (s.maxJumpExcursionRelative && s.maxJumpExcursionRelative > max ? s.maxJumpExcursionRelative : max),
      0
    );

    // Récord personal de hangtime a lo largo de TODAS las sesiones — este es
    // el número que un deportista quiere ver crecer sesión a sesión, no solo
    // dentro de un video individual.
    const maxHangtimeSeconds = sessions.reduce(
      (max, s) => (s.bestHangtimeSeconds && s.bestHangtimeSeconds > max ? s.bestHangtimeSeconds : max),
      0
    );

    // Récord de altura de salto en metros, estimado por calibración con la
    // estatura del usuario (ver estimateJumpHeightMeters). 0 si el usuario no
    // tiene estatura cargada en su perfil o no hay saltos con pose detectada.
    const bestJumpHeightMeters = sessions.reduce(
      (max, s) => (s.maxJumpHeightMeters && s.maxJumpHeightMeters > max ? s.maxJumpHeightMeters : max),
      0
    );

    // Récord de velocidad punta y distancia total navegada — solo cuenta con
    // datos de las sesiones que tienen track GPS (todavía no todas, depende
    // de que el cliente mobile lo capture y lo suba).
    const recordSpeedKmh = sessions.reduce(
      (max, s) => (s.maxSpeedKmh && s.maxSpeedKmh > max ? s.maxSpeedKmh : max),
      0
    );
    const totalDistanceMeters = sessions.reduce((sum, s) => sum + (s.distanceMeters ?? 0), 0);
    const hasGpsData = sessions.some((s) => s.distanceMeters !== null);

    const injuries = await injuriesRepository.findManyByUser(userId);
    const injuryErrorCorrelations = correlateInjuriesWithErrors(injuries, errorFrequency);

    return {
      sessions,
      totalSessions: sessions.length,
      totalSecondsAnalyzed,
      disciplineBreakdown,
      errorFrequency,
      trainingFrequency,
      weeklyStreak,
      improvementTrend,
      scoreProgress,
      injuries,
      injuryErrorCorrelations,
      notAvailable: hasGpsData
        ? []
        : [
            {
              metric: "Velocidad promedio y distancia recorrida",
              reason: "El backend ya soporta subir un track GPS por video (POST /videos/:id/gps-track), pero todavía ningún cliente (mobile) lo captura y lo envía durante la grabación.",
            },
          ],
      maxRelativeJumpExcursion,
      maxHangtimeSeconds,
      bestJumpHeightMeters,
      jumpHeightCalibrated: heightMeters !== null,
      recordSpeedKmh,
      totalDistanceMeters,
    };
  },
};
