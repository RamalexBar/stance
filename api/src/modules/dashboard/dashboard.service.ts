import { prisma } from "../../shared/prisma";
import { computeAggregates, scoreAggregate } from "../comparisons/comparisons.score";
import { injuriesRepository } from "../injuries/injuries.repository";

export interface SessionSummary {
  videoId: string;
  discipline: string;
  createdAt: Date;
  durationSeconds: number | null;
  techniqueScore: number | null;
  errorCount: number | null;
  maxJumpExcursionRelative: number | null;
}

function weekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export const dashboardService = {
  async getSummary(userId: string) {
    const videos = await prisma.videoSession.findMany({
      where: { userId, status: "UPLOADED" },
      orderBy: { createdAt: "asc" },
      include: { biomechanics: true, errors: true, movement: true },
    });

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
      if (video.movement?.segmentsJson && video.biomechanics?.seriesJson) {
        const segments = video.movement.segmentsJson as any[];
        const frames = video.biomechanics.seriesJson as any[];
        const jumpSegments = segments.filter((s) => s.type === "SALTO");
        const excursions = jumpSegments.map((seg) => {
          const inRange = frames.filter(
            (f) => f.tSeconds >= seg.startSeconds && f.tSeconds <= seg.endSeconds
          );
          if (!inRange.length) return 0;
          const comYValues = inRange.map((f) => f.comY);
          return Math.max(...comYValues) - Math.min(...comYValues);
        });
        maxJumpExcursionRelative = excursions.length ? Math.max(...excursions) : null;
      }

      return {
        videoId: video.id,
        discipline: video.discipline,
        createdAt: video.createdAt,
        durationSeconds: video.durationSeconds,
        techniqueScore,
        errorCount,
        maxJumpExcursionRelative,
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

    const scored = sessions.filter((s) => s.techniqueScore !== null);
    let improvementTrend: "MEJORANDO" | "ESTABLE" | "RETROCEDIENDO" | "SIN_DATOS" = "SIN_DATOS";
    if (scored.length >= 2) {
      const first = scored[0].techniqueScore!;
      const last = scored[scored.length - 1].techniqueScore!;
      if (last - first > 5) improvementTrend = "MEJORANDO";
      else if (first - last > 5) improvementTrend = "RETROCEDIENDO";
      else improvementTrend = "ESTABLE";
    }

    const maxRelativeJumpExcursion = sessions.reduce(
      (max, s) => (s.maxJumpExcursionRelative && s.maxJumpExcursionRelative > max ? s.maxJumpExcursionRelative : max),
      0
    );

    const injuries = await injuriesRepository.findManyByUser(userId);

    return {
      sessions,
      totalSessions: sessions.length,
      totalSecondsAnalyzed,
      disciplineBreakdown,
      errorFrequency,
      trainingFrequency,
      improvementTrend,
      injuries,
      notAvailable: [
        {
          metric: "Velocidad promedio",
          reason: "Requiere datos de GPS o velocímetro; la plataforma no tiene esa fuente de datos todavía.",
        },
        {
          metric: "Distancia recorrida",
          reason: "Misma razón: requiere GPS. Se agrega cuando exista esa integración (Google Maps está en el stack, pero aún no conectado a un tracking en vivo).",
        },
        {
          metric: "Altura máxima (en metros)",
          reason: "Se muestra 'excursión vertical relativa' en su lugar: sin calibrar la distancia/zoom de la cámara no se puede convertir a metros reales.",
        },
      ],
      maxRelativeJumpExcursion,
    };
  },
};
