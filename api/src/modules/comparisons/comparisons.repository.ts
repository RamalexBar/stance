import { Prisma, ComparisonMode, Discipline } from "@prisma/client";
import { prisma } from "../../shared/prisma";

export const comparisonsRepository = {
  create(params: {
    userId: string;
    mode: ComparisonMode;
    primaryVideoId: string;
    referenceVideoId: string;
    primaryScore: number;
    referenceScore: number;
    metricsJson: Prisma.InputJsonValue;
  }) {
    return prisma.videoComparison.create({ data: params });
  },

  findManyByVideo(primaryVideoId: string) {
    return prisma.videoComparison.findMany({
      where: { primaryVideoId },
      orderBy: { createdAt: "desc" },
    });
  },

  /** El video anterior más reciente del mismo usuario y disciplina, ya subido. */
  findPreviousVideo(userId: string, discipline: Discipline, beforeVideoId: string, beforeDate: Date) {
    return prisma.videoSession.findFirst({
      where: {
        userId,
        discipline,
        status: "UPLOADED",
        id: { not: beforeVideoId },
        createdAt: { lt: beforeDate },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  markReference(videoId: string, isReference: boolean, referenceLabel?: string) {
    return prisma.videoSession.update({
      where: { id: videoId },
      data: { isReference, referenceLabel },
    });
  },

  findReferenceVideos(discipline?: Discipline) {
    return prisma.videoSession.findMany({
      where: { isReference: true, status: "UPLOADED", ...(discipline ? { discipline } : {}) },
      orderBy: { createdAt: "desc" },
    });
  },
};
