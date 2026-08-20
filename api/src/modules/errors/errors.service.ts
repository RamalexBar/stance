import { videoRepository } from "../videos/video.repository";
import { biomechanicsRepository } from "../biomechanics/biomechanics.repository";
import { movementRepository } from "../movement/movement.repository";
import { errorsRepository } from "./errors.repository";
import { detectErrors } from "./errors.detect";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors";

async function assertOwnership(userId: string, videoId: string) {
  const video = await videoRepository.findById(videoId);
  if (!video) throw new NotFoundError("Video no encontrado");
  if (video.userId !== userId) throw new ForbiddenError();
  return video;
}

export const errorsService = {
  async computeAndSave(userId: string, videoId: string) {
    await assertOwnership(userId, videoId);

    const biomechanics = await biomechanicsRepository.findByVideoId(videoId);
    if (!biomechanics?.seriesJson) {
      throw new AppError("Este video todavía no tiene biomecánica calculada (Fase 4).", 409);
    }

    const movement = await movementRepository.findByVideoId(videoId);
    if (!movement?.segmentsJson) {
      throw new AppError("Este video todavía no tiene análisis de movimiento (Fase 5).", 409);
    }

    const frames = biomechanics.seriesJson as any[];
    const segments = movement.segmentsJson as any[];

    const { findings, notDetectedYet } = detectErrors(frames, segments);

    const saved = await errorsRepository.upsertCompleted(videoId, findings as unknown as object);

    return { videoId, status: saved.status, findings, notDetectedYet };
  },

  async getByVideoId(userId: string, videoId: string) {
    await assertOwnership(userId, videoId);
    const analysis = await errorsRepository.findByVideoId(videoId);
    if (!analysis) throw new NotFoundError("Este video todavía no tiene análisis de errores");
    return analysis;
  },
};
