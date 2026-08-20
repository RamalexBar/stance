import { Prisma, PoseAnalysisStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";

export const poseRepository = {
  findByVideoId(videoId: string) {
    return prisma.poseAnalysis.findUnique({ where: { videoId } });
  },

  upsertCompleted(params: {
    videoId: string;
    fps: number;
    frameCount: number;
    avgConfidence?: number;
    framesJson: Prisma.InputJsonValue;
    engine?: string;
  }) {
    return prisma.poseAnalysis.upsert({
      where: { videoId: params.videoId },
      update: {
        status: PoseAnalysisStatus.COMPLETED,
        fps: params.fps,
        frameCount: params.frameCount,
        avgConfidence: params.avgConfidence,
        framesJson: params.framesJson,
        engine: params.engine,
      },
      create: {
        videoId: params.videoId,
        status: PoseAnalysisStatus.COMPLETED,
        fps: params.fps,
        frameCount: params.frameCount,
        avgConfidence: params.avgConfidence,
        framesJson: params.framesJson,
        engine: params.engine,
      },
    });
  },
};
