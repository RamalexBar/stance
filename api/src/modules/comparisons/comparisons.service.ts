import { ComparisonMode } from "@prisma/client";
import { videoRepository } from "../videos/video.repository";
import { biomechanicsRepository } from "../biomechanics/biomechanics.repository";
import { comparisonsRepository } from "./comparisons.repository";
import { computeAggregates, scoreAggregate, buildDifferences } from "./comparisons.score";
import { prisma } from "../../shared/prisma";
import { CreateComparisonInput } from "./comparisons.dto";
import { subscriptionsService } from "../subscriptions/subscriptions.service";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors";

async function getVideoOrThrow(videoId: string) {
  const video = await videoRepository.findById(videoId);
  if (!video) throw new NotFoundError("Video no encontrado");
  return video;
}

async function getFramesOrThrow(videoId: string, label: string) {
  const analysis = await biomechanicsRepository.findByVideoId(videoId);
  if (!analysis?.seriesJson) {
    throw new AppError(`${label} todavía no tiene biomecánica calculada (Fase 4).`, 409);
  }
  return analysis.seriesJson as any[];
}

export const comparisonsService = {
  async create(userId: string, primaryVideoId: string, input: CreateComparisonInput) {
    const primaryVideo = await getVideoOrThrow(primaryVideoId);
    if (primaryVideo.userId !== userId) throw new ForbiddenError();

    let referenceVideoId: string;

    if (input.mode === "SELF_PREVIOUS") {
      const previous = await comparisonsRepository.findPreviousVideo(
        userId,
        primaryVideo.discipline,
        primaryVideoId,
        primaryVideo.createdAt
      );
      if (!previous) {
        throw new AppError(
          "No hay un video anterior tuyo en esta disciplina para comparar.",
          404
        );
      }
      referenceVideoId = previous.id;
    } else {
      if (!input.referenceVideoId) {
        throw new AppError("Falta referenceVideoId para este modo de comparación.", 400);
      }
      if (input.referenceVideoId === primaryVideoId) {
        throw new AppError("No puedes comparar un video contra sí mismo.", 400);
      }

      const referenceVideo = await getVideoOrThrow(input.referenceVideoId);

      if (input.mode === "PROFESSIONAL") {
        await subscriptionsService.assertCanUseReferenceComparison(userId);
        if (!referenceVideo.isReference) {
          throw new AppError(
            "Ese video no está marcado como video de referencia/profesional.",
            400
          );
        }
      }

      if (input.mode === "TRAINER") {
        if (!referenceVideo.isReference) {
          throw new AppError(
            "Ese video no está marcado como video de referencia por su entrenador.",
            400
          );
        }
        const ownerRoles = await prisma.userRole.findMany({
          where: { userId: referenceVideo.userId },
          include: { role: true },
        });
        const isTrainerOrAdmin = ownerRoles.some((r) =>
          ["TRAINER", "ADMIN"].includes(r.role.name)
        );
        if (!isTrainerOrAdmin) {
          throw new AppError(
            "El video de referencia debe pertenecer a un usuario con rol Entrenador.",
            403
          );
        }
      }

      referenceVideoId = referenceVideo.id;
    }

    const primaryFrames = await getFramesOrThrow(primaryVideoId, "Tu video");
    const referenceFrames = await getFramesOrThrow(referenceVideoId, "El video de referencia");

    const primaryAgg = computeAggregates(primaryFrames);
    const referenceAgg = computeAggregates(referenceFrames);

    const primaryScoreResult = scoreAggregate(primaryAgg);
    const referenceScoreResult = scoreAggregate(referenceAgg);
    const differences = buildDifferences(primaryAgg, referenceAgg);

    const saved = await comparisonsRepository.create({
      userId,
      mode: input.mode as ComparisonMode,
      primaryVideoId,
      referenceVideoId,
      primaryScore: primaryScoreResult.total,
      referenceScore: referenceScoreResult.total,
      metricsJson: {
        primaryBreakdown: primaryScoreResult.breakdown,
        referenceBreakdown: referenceScoreResult.breakdown,
        differences,
      } as unknown as object,
    });

    return saved;
  },

  async listForVideo(userId: string, videoId: string) {
    const video = await getVideoOrThrow(videoId);
    if (video.userId !== userId) throw new ForbiddenError();
    return comparisonsRepository.findManyByVideo(videoId);
  },

  /** Solo Admin, o el Entrenador dueño del video, puede marcarlo como referencia. */
  async markReference(
    requesterId: string,
    requesterRoles: string[],
    videoId: string,
    isReference: boolean,
    referenceLabel?: string
  ) {
    const video = await getVideoOrThrow(videoId);

    const isAdmin = requesterRoles.includes("ADMIN");
    const isOwnerTrainer = requesterRoles.includes("TRAINER") && video.userId === requesterId;

    if (!isAdmin && !isOwnerTrainer) {
      throw new ForbiddenError(
        "Solo un Admin, o el Entrenador dueño del video, puede marcarlo como referencia."
      );
    }

    return comparisonsRepository.markReference(videoId, isReference, referenceLabel);
  },

  async listReferenceVideos(discipline?: "KITESURF" | "WINGFOIL") {
    return comparisonsRepository.findReferenceVideos(discipline as any);
  },
};
