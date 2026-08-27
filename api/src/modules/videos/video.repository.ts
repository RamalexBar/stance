import { Discipline, Prisma, VideoSource, VideoStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";

export const videoRepository = {
  create(
    params: {
      userId: string;
      discipline: Discipline;
      source: VideoSource;
      storagePath: string;
      originalName: string;
      fileSizeBytes?: number;
    },
    client: Prisma.TransactionClient = prisma
  ) {
    return client.videoSession.create({
      data: {
        userId: params.userId,
        discipline: params.discipline,
        source: params.source,
        storagePath: params.storagePath,
        originalName: params.originalName,
        fileSizeBytes: params.fileSizeBytes,
        status: VideoStatus.PENDING,
      },
    });
  },

  findById(id: string) {
    return prisma.videoSession.findUnique({ where: { id } });
  },

  findManyByUser(userId: string, limit = 20, cursor?: string) {
    return prisma.videoSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        poseAnalysis: { select: { id: true } },
        biomechanics: { select: { id: true } },
        movement: { select: { id: true } },
        errors: { select: { id: true } },
      },
    });
  },

  markUploaded(id: string, durationSeconds?: number) {
    return prisma.videoSession.update({
      where: { id },
      data: { status: VideoStatus.UPLOADED, durationSeconds },
    });
  },

  markFailed(id: string) {
    return prisma.videoSession.update({
      where: { id },
      data: { status: VideoStatus.FAILED },
    });
  },
};
