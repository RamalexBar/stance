import { videoRepository } from "../videos/video.repository";
import { poseRepository } from "./pose.repository";
import { SubmitPoseAnalysisInput } from "./pose.dto";
import { ForbiddenError, NotFoundError } from "../../shared/errors";
import { withDbRetry } from "../../shared/dbRetry";

async function assertOwnership(userId: string, videoId: string) {
  const video = await withDbRetry(() => videoRepository.findById(videoId));
  if (!video) throw new NotFoundError("Video no encontrado");
  if (video.userId !== userId) throw new ForbiddenError();
  return video;
}

export const poseService = {
  /**
   * El cliente (web con MediaPipe WASM, o mobile vía WebView) ya corrió la
   * detección de pose localmente. Aquí solo se persiste el resultado.
   */
  async submit(userId: string, videoId: string, input: SubmitPoseAnalysisInput) {
    await assertOwnership(userId, videoId);

    const confidences = input.frames
      .flatMap((f) => f.landmarks.map((l) => l.visibility ?? 1))
      .filter((v) => typeof v === "number");

    const avgConfidence =
      input.avgConfidence ??
      (confidences.length
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : undefined);

    const analysis = await withDbRetry(() =>
      poseRepository.upsertCompleted({
        videoId,
        fps: input.fps,
        frameCount: input.frames.length,
        avgConfidence,
        framesJson: input.frames,
        engine: input.engine,
      })
    );

    return {
      videoId,
      status: analysis.status,
      frameCount: analysis.frameCount,
      avgConfidence: analysis.avgConfidence,
    };
  },

  async getByVideoId(userId: string, videoId: string) {
    await assertOwnership(userId, videoId);
    const analysis = await withDbRetry(() => poseRepository.findByVideoId(videoId));
    if (!analysis) throw new NotFoundError("Este video todavía no tiene análisis de pose");
    return analysis;
  },
};
