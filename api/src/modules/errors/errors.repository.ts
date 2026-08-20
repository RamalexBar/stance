import { Prisma, ErrorAnalysisStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";

export const errorsRepository = {
  findByVideoId(videoId: string) {
    return prisma.errorAnalysis.findUnique({ where: { videoId } });
  },

  upsertCompleted(videoId: string, findingsJson: Prisma.InputJsonValue) {
    return prisma.errorAnalysis.upsert({
      where: { videoId },
      update: { status: ErrorAnalysisStatus.COMPLETED, findingsJson },
      create: { videoId, status: ErrorAnalysisStatus.COMPLETED, findingsJson },
    });
  },
};
