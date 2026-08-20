import { Prisma, MovementStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";

export const movementRepository = {
  findByVideoId(videoId: string) {
    return prisma.movementAnalysis.findUnique({ where: { videoId } });
  },

  upsertCompleted(params: {
    videoId: string;
    segmentsJson: Prisma.InputJsonValue;
    notDetectedYet: Prisma.InputJsonValue;
  }) {
    return prisma.movementAnalysis.upsert({
      where: { videoId: params.videoId },
      update: {
        status: MovementStatus.COMPLETED,
        segmentsJson: params.segmentsJson,
        notDetectedYet: params.notDetectedYet,
      },
      create: {
        videoId: params.videoId,
        status: MovementStatus.COMPLETED,
        segmentsJson: params.segmentsJson,
        notDetectedYet: params.notDetectedYet,
      },
    });
  },
};
