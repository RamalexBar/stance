import { Prisma, BiomechanicsStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";

export const biomechanicsRepository = {
  findByVideoId(videoId: string) {
    return prisma.biomechanicsAnalysis.findUnique({ where: { videoId } });
  },

  findByVideoIds(videoIds: string[]) {
    return prisma.biomechanicsAnalysis.findMany({ where: { videoId: { in: videoIds } } });
  },

  upsertCompleted(params: {
    videoId: string;
    seriesJson: Prisma.InputJsonValue;
    summaryJson: Prisma.InputJsonValue;
  }) {
    return prisma.biomechanicsAnalysis.upsert({
      where: { videoId: params.videoId },
      update: {
        status: BiomechanicsStatus.COMPLETED,
        seriesJson: params.seriesJson,
        summaryJson: params.summaryJson,
      },
      create: {
        videoId: params.videoId,
        status: BiomechanicsStatus.COMPLETED,
        seriesJson: params.seriesJson,
        summaryJson: params.summaryJson,
      },
    });
  },
};
