import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";

const groupWithMembers = {
  trainers: { include: { user: true } },
  athletes: { include: { user: true } },
} as const;

export const schoolsRepository = {
  createGroup(schoolId: string, name: string, client: Prisma.TransactionClient = prisma) {
    return client.group.create({ data: { schoolId, name } });
  },

  findGroupById(groupId: string) {
    return prisma.group.findUnique({ where: { id: groupId }, include: groupWithMembers });
  },

  /** Grupos donde el usuario participa como escuela dueña, entrenador o deportista. */
  findGroupsForUser(userId: string) {
    return prisma.group.findMany({
      where: {
        OR: [
          { schoolId: userId },
          { trainers: { some: { userId } } },
          { athletes: { some: { userId } } },
        ],
      },
      include: groupWithMembers,
      orderBy: { createdAt: "desc" },
    });
  },

  addTrainer(groupId: string, userId: string) {
    return prisma.groupTrainer.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { groupId, userId },
    });
  },

  removeTrainer(groupId: string, userId: string) {
    return prisma.groupTrainer.delete({ where: { groupId_userId: { groupId, userId } } });
  },

  addAthlete(groupId: string, userId: string, client: Prisma.TransactionClient = prisma) {
    return client.groupAthlete.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { groupId, userId },
    });
  },

  removeAthlete(groupId: string, userId: string) {
    return prisma.groupAthlete.delete({ where: { groupId_userId: { groupId, userId } } });
  },

  findUserRoleNames(userId: string) {
    return prisma.userRole.findMany({ where: { userId }, include: { role: true } });
  },
};
