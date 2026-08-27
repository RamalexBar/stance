import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";

export const gpsRepository = {
  findByVideoId(videoId: string) {
    return prisma.gpsTrack.findUnique({ where: { videoId } });
  },

  upsert(params: { videoId: string; pointsJson: Prisma.InputJsonValue }) {
    return prisma.gpsTrack.upsert({
      where: { videoId: params.videoId },
      update: { pointsJson: params.pointsJson },
      create: { videoId: params.videoId, pointsJson: params.pointsJson },
    });
  },
};
