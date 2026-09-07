import { videoRepository } from "../videos/video.repository";
import { poseRepository } from "../pose/pose.repository";
import { biomechanicsRepository } from "./biomechanics.repository";
import { biomechanicsCompute, PoseFrameInput } from "./biomechanics.compute";
import { userRepository } from "../users/user.repository";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors";
import { withDbRetry } from "../../shared/dbRetry";

async function assertOwnership(userId: string, videoId: string) {
  const video = await withDbRetry(() => videoRepository.findById(videoId));
  if (!video) throw new NotFoundError("Video no encontrado");
  if (video.userId !== userId) throw new ForbiddenError();
  return video;
}

export const biomechanicsService = {
  async computeAndSave(userId: string, videoId: string) {
    await assertOwnership(userId, videoId);

    // Este video puede traer varios MB de landmarks — contra la base de
    // datos remota, una consulta así de grande ocasionalmente se corta a
    // mitad de camino (ver withDbRetry). Reintentar la consulta puntual es
    // más rápido que reintentar todo el cómputo desde el frontend.
    const poseAnalysis = await withDbRetry(() => poseRepository.findByVideoId(videoId));
    if (!poseAnalysis || !poseAnalysis.framesJson) {
      throw new AppError(
        "Este video todavía no tiene un análisis de pose. Analiza la pose primero (Fase 3).",
        409
      );
    }

    const user = await withDbRetry(() => userRepository.findById(userId));
    const frames = poseAnalysis.framesJson as unknown as PoseFrameInput[];

    const result = biomechanicsCompute.compute(frames, user?.weightKg ?? null);

    const saved = await withDbRetry(() =>
      biomechanicsRepository.upsertCompleted({
        videoId,
        seriesJson: result.series as unknown as object,
        summaryJson: {
          ...result.summary,
          estimatedKneeLoadIndexAvg: result.estimatedKneeLoadIndexAvg,
          approxTrunkOscillationsPerMinute: result.approxTrunkOscillationsPerMinute,
          notesForUser: result.notesForUser,
          trunkInclinationInsight: result.trunkInclinationInsight,
          balanceInsight: result.balanceInsight,
        } as unknown as object,
      })
    );

    return {
      videoId,
      status: saved.status,
      summary: saved.summaryJson,
      frameCount: result.series.length,
    };
  },

  async getByVideoId(userId: string, videoId: string) {
    await assertOwnership(userId, videoId);
    const analysis = await withDbRetry(() => biomechanicsRepository.findByVideoId(videoId));
    if (!analysis) {
      throw new NotFoundError("Este video todavía no tiene análisis biomecánico");
    }
    return analysis;
  },
};
