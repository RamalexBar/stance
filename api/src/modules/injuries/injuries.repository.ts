import { prisma } from "../../shared/prisma";
import { CreateInjuryInput } from "./injuries.dto";

export const injuriesRepository = {
  create(userId: string, input: CreateInjuryInput) {
    return prisma.injuryLog.create({ data: { userId, ...input } });
  },

  findManyByUser(userId: string) {
    return prisma.injuryLog.findMany({ where: { userId }, orderBy: { date: "desc" } });
  },

  findById(id: string) {
    return prisma.injuryLog.findUnique({ where: { id } });
  },

  delete(id: string) {
    return prisma.injuryLog.delete({ where: { id } });
  },
};
