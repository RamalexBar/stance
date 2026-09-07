import { videoRepository } from "../videos/video.repository";
import { biomechanicsRepository } from "../biomechanics/biomechanics.repository";
import { movementRepository } from "./movement.repository";
import { detectSegments, NOT_DETECTED_YET } from "./movement.detect";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors";
import { withDbRetry } from "../../shared/dbRetry";

async function assertOwnership(userId: string, videoId: string) {
  const video = await withDbRetry(() => videoRepository.findById(videoId));
  if (!video) throw new NotFoundError("Video no encontrado");
  if (video.userId !== userId) throw new ForbiddenError();
  return video;
}

export const movementService = {
  async computeAndSave(userId: string, videoId: string) {
    await assertOwnership(userId, videoId);

    const biomechanics = await withDbRetry(() => biomechanicsRepository.findByVideoId(videoId));
    if (!biomechanics || !biomechanics.seriesJson) {
      throw new AppError(
        "Este video todavía no tiene biomecánica calculada. Calcúlala primero (Fase 4).",
        409
      );
    }

    const frames = biomechanics.seriesJson as any[];
    const segments = detectSegments(frames);

    const saved = await withDbRetry(() =>
      movementRepository.upsertCompleted({
        videoId,
        segmentsJson: segments as unknown as object,
        notDetectedYet: NOT_DETECTED_YET as unknown as object,
      })
    );

    return { videoId, status: saved.status, segments, notDetectedYet: NOT_DETECTED_YET };
  },

  async getByVideoId(userId: string, videoId: string) {
    await assertOwnership(userId, videoId);
    const analysis = await withDbRetry(() => movementRepository.findByVideoId(videoId));
    if (!analysis) throw new NotFoundError("Este video todavía no tiene análisis de movimiento");
    return analysis;
  },
};
