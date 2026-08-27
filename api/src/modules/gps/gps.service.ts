import { videoRepository } from "../videos/video.repository";
import { gpsRepository } from "./gps.repository";
import { SubmitGpsTrackInput } from "./gps.dto";
import { ForbiddenError, NotFoundError } from "../../shared/errors";

async function assertOwnership(userId: string, videoId: string) {
  const video = await videoRepository.findById(videoId);
  if (!video) throw new NotFoundError("Video no encontrado");
  if (video.userId !== userId) throw new ForbiddenError();
  return video;
}

export const gpsService = {
  /**
   * El cliente (mobile) captura lat/lon mientras graba el video y lo sube
   * tal cual — no hay tracking en vivo en el backend, solo se persiste.
   * Velocidad/distancia se calculan al leer el dashboard, no aquí.
   */
  async submit(userId: string, videoId: string, input: SubmitGpsTrackInput) {
    await assertOwnership(userId, videoId);
    const track = await gpsRepository.upsert({ videoId, pointsJson: input.points });
    return { videoId, pointCount: (track.pointsJson as unknown[]).length };
  },

  async getByVideoId(userId: string, videoId: string) {
    await assertOwnership(userId, videoId);
    const track = await gpsRepository.findByVideoId(videoId);
    if (!track) throw new NotFoundError("Este video todavía no tiene track GPS");
    return track;
  },
};
