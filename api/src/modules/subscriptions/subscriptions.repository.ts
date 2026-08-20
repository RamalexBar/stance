import { PlanType, Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";

type Db = Prisma.TransactionClient;

export const subscriptionsRepository = {
  findByUserId(userId: string) {
    return prisma.subscription.findUnique({ where: { userId } });
  },

  findByStripeCustomerId(stripeCustomerId: string) {
    return prisma.subscription.findUnique({ where: { stripeCustomerId } });
  },

  upsert(params: {
    userId: string;
    plan: PlanType;
    status: SubscriptionStatus;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Date;
  }) {
    return prisma.subscription.upsert({
      where: { userId: params.userId },
      update: {
        plan: params.plan,
        status: params.status,
        stripeCustomerId: params.stripeCustomerId,
        stripeSubscriptionId: params.stripeSubscriptionId,
        currentPeriodEnd: params.currentPeriodEnd,
      },
      create: {
        userId: params.userId,
        plan: params.plan,
        status: params.status,
        stripeCustomerId: params.stripeCustomerId,
        stripeSubscriptionId: params.stripeSubscriptionId,
        currentPeriodEnd: params.currentPeriodEnd,
      },
    });
  },

  countVideosThisMonth(userId: string, since: Date, client: Db = prisma) {
    return client.videoSession.count({ where: { userId, createdAt: { gte: since } } });
  },

  countCoachPlansThisMonth(userId: string, since: Date, client: Db = prisma) {
    return client.coachPlan.count({
      where: { createdAt: { gte: since }, video: { userId } },
    });
  },

  countGroupsForSchool(schoolId: string, client: Db = prisma) {
    return client.group.count({ where: { schoolId } });
  },

  countAthletesInGroup(groupId: string, client: Db = prisma) {
    return client.groupAthlete.count({ where: { groupId } });
  },

  /** Cuenta inscripciones nuevas este mes, sumando TODOS los grupos de esta escuela/coach. */
  countNewEnrollmentsThisMonthForSchool(schoolId: string, since: Date, client: Db = prisma) {
    return client.groupAthlete.count({
      where: { joinedAt: { gte: since }, group: { schoolId } },
    });
  },
};
