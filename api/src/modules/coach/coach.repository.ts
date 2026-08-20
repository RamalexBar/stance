import { Prisma, CoachPlanStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";

export const coachRepository = {
  findByVideoId(videoId: string) {
    return prisma.coachPlan.findUnique({ where: { videoId } });
  },

  /** Reserva el cupo mensual antes de llamar a la IA (ver assertCanGenerateCoachPlan). */
  reservePending(videoId: string, client: Prisma.TransactionClient) {
    return client.coachPlan.upsert({
      where: { videoId },
      update: { status: CoachPlanStatus.PENDING },
      create: { videoId, status: CoachPlanStatus.PENDING },
    });
  },

  markFailed(videoId: string) {
    return prisma.coachPlan.update({ where: { videoId }, data: { status: CoachPlanStatus.FAILED } });
  },

  upsertCompleted(videoId: string, planJson: Prisma.InputJsonValue, userNotes: string | undefined, model: string) {
    return prisma.coachPlan.upsert({
      where: { videoId },
      update: { status: CoachPlanStatus.COMPLETED, planJson, userNotes, model },
      create: { videoId, status: CoachPlanStatus.COMPLETED, planJson, userNotes, model },
    });
  },
};
