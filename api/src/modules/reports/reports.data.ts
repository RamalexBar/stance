import { videoRepository } from "../videos/video.repository";
import { biomechanicsRepository } from "../biomechanics/biomechanics.repository";
import { movementRepository } from "../movement/movement.repository";
import { errorsRepository } from "../errors/errors.repository";
import { coachRepository } from "../coach/coach.repository";
import { userRepository } from "../users/user.repository";
import { computeAggregates, scoreAggregate } from "../comparisons/comparisons.score";
import { ForbiddenError, NotFoundError } from "../../shared/errors";

export async function gatherReportData(userId: string, videoId: string) {
  const video = await videoRepository.findById(videoId);
  if (!video) throw new NotFoundError("Video no encontrado");
  if (video.userId !== userId) throw new ForbiddenError();

  const [biomechanics, movement, errors, coachPlan, user] = await Promise.all([
    biomechanicsRepository.findByVideoId(videoId),
    movementRepository.findByVideoId(videoId),
    errorsRepository.findByVideoId(videoId),
    coachRepository.findByVideoId(videoId),
    userRepository.findById(userId),
  ]);

  let techniqueScore: number | null = null;
  if (biomechanics?.seriesJson) {
    techniqueScore = scoreAggregate(computeAggregates(biomechanics.seriesJson as any[])).total;
  }

  return {
    video,
    user,
    biomechanics,
    movement,
    errors,
    coachPlan,
    techniqueScore,
    findings: (errors?.findingsJson as any[]) ?? [],
    segments: (movement?.segmentsJson as any[]) ?? [],
    series: (biomechanics?.seriesJson as any[]) ?? [],
    summary: (biomechanics?.summaryJson as any) ?? null,
  };
}

export type ReportData = Awaited<ReturnType<typeof gatherReportData>>;
