import { prisma } from "../../shared/prisma";
import { schoolsRepository } from "./schools.repository";
import { videoRepository } from "../videos/video.repository";
import { biomechanicsRepository } from "../biomechanics/biomechanics.repository";
import { computeAggregates, scoreAggregate } from "../comparisons/comparisons.score";
import { dashboardService } from "../dashboard/dashboard.service";
import { subscriptionsService } from "../subscriptions/subscriptions.service";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors";

async function getGroupOrThrow(groupId: string) {
  const group = await schoolsRepository.findGroupById(groupId);
  if (!group) throw new NotFoundError("Grupo no encontrado");
  return group;
}

function isSchoolOwner(group: any, userId: string) {
  return group.schoolId === userId;
}

function isTrainerOfGroup(group: any, userId: string) {
  return group.trainers.some((t: any) => t.userId === userId);
}

function isAthleteOfGroup(group: any, userId: string) {
  return group.athletes.some((a: any) => a.userId === userId);
}

async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const roles = await schoolsRepository.findUserRoleNames(userId);
  return roles.some((r) => r.role.name === roleName);
}

export const schoolsService = {
  async createGroup(schoolId: string, name: string) {
    return prisma.$transaction(
      async (tx) => {
        await subscriptionsService.assertCanCreateGroup(schoolId, tx);
        return schoolsRepository.createGroup(schoolId, name, tx);
      },
      { isolationLevel: "Serializable" }
    );
  },

  async listMyGroups(userId: string) {
    return schoolsRepository.findGroupsForUser(userId);
  },

  async assignTrainer(requesterId: string, groupId: string, trainerUserId: string) {
    const group = await getGroupOrThrow(groupId);
    const isAdmin = await hasRole(requesterId, "ADMIN");

    if (!isAdmin && !isSchoolOwner(group, requesterId)) {
      throw new ForbiddenError("Solo la escuela dueña del grupo (o un Admin) puede asignar entrenadores.");
    }

    const targetIsTrainer = await hasRole(trainerUserId, "TRAINER");
    if (!targetIsTrainer) {
      throw new AppError("El usuario a asignar debe tener el rol Entrenador.", 400);
    }

    return schoolsRepository.addTrainer(groupId, trainerUserId);
  },

  async removeTrainer(requesterId: string, groupId: string, trainerUserId: string) {
    const group = await getGroupOrThrow(groupId);
    const isAdmin = await hasRole(requesterId, "ADMIN");
    if (!isAdmin && !isSchoolOwner(group, requesterId)) {
      throw new ForbiddenError();
    }
    await schoolsRepository.removeTrainer(groupId, trainerUserId);
  },

  async assignAthlete(requesterId: string, groupId: string, athleteUserId: string) {
    const group = await getGroupOrThrow(groupId);
    const isAdmin = await hasRole(requesterId, "ADMIN");

    if (!isAdmin && !isSchoolOwner(group, requesterId) && !isTrainerOfGroup(group, requesterId)) {
      throw new ForbiddenError(
        "Solo la escuela dueña, un entrenador del grupo, o un Admin puede asignar deportistas."
      );
    }

    // El límite de cupo y de inscripciones/mes aplica sobre la cuenta de la
    // ESCUELA dueña del grupo, sin importar si quien inscribe es un entrenador.
    // Chequeo + inserción van en la misma transacción Serializable para
    // evitar que dos inscripciones concurrentes superen el límite del plan.
    return prisma.$transaction(
      async (tx) => {
        await subscriptionsService.assertCanEnrollAthlete(group.schoolId, groupId, tx);
        return schoolsRepository.addAthlete(groupId, athleteUserId, tx);
      },
      { isolationLevel: "Serializable" }
    );
  },

  async removeAthlete(requesterId: string, groupId: string, athleteUserId: string) {
    const group = await getGroupOrThrow(groupId);
    const isAdmin = await hasRole(requesterId, "ADMIN");
    if (!isAdmin && !isSchoolOwner(group, requesterId) && !isTrainerOfGroup(group, requesterId)) {
      throw new ForbiddenError();
    }
    await schoolsRepository.removeAthlete(groupId, athleteUserId);
  },

  /**
   * Cualquier miembro del grupo (escuela, entrenador, o los propios deportistas)
   * puede ver el ranking — es información pensada para ser compartida y motivar.
   */
  async getRanking(requesterId: string, groupId: string) {
    const group = await getGroupOrThrow(groupId);
    const isAdmin = await hasRole(requesterId, "ADMIN");
    const isMember =
      isSchoolOwner(group, requesterId) || isTrainerOfGroup(group, requesterId) || isAthleteOfGroup(group, requesterId);

    if (!isAdmin && !isMember) throw new ForbiddenError();

    const ranking = await Promise.all(
      group.athletes.map(async (membership: any) => {
        const videos = await prisma.videoSession.findMany({
          where: { userId: membership.userId, status: "UPLOADED" },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        const analyses = await biomechanicsRepository.findByVideoIds(videos.map((v) => v.id));
        const scores = analyses
          .filter((a) => a.seriesJson)
          .map((a) => scoreAggregate(computeAggregates(a.seriesJson as any[])).total);

        const averageScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

        return {
          userId: membership.userId,
          name: [membership.user.firstName, membership.user.lastName].filter(Boolean).join(" ") || membership.user.email,
          averageScore,
          videosConsidered: scores.length,
        };
      })
    );

    ranking.sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1));
    return ranking;
  },

  /**
   * El progreso detallado (dashboard completo, incluyendo lesiones) SÍ es
   * información privada: solo la escuela dueña, un entrenador del grupo, o
   * un Admin puede verlo — no otros deportistas del mismo grupo.
   */
  async getAthleteProgress(requesterId: string, groupId: string, athleteUserId: string) {
    const group = await getGroupOrThrow(groupId);
    const isAdmin = await hasRole(requesterId, "ADMIN");

    if (!isAdmin && !isSchoolOwner(group, requesterId) && !isTrainerOfGroup(group, requesterId)) {
      throw new ForbiddenError(
        "El progreso detallado solo lo puede ver la escuela, un entrenador del grupo, o un Admin."
      );
    }

    if (!isAthleteOfGroup(group, athleteUserId)) {
      throw new NotFoundError("Ese deportista no pertenece a este grupo.");
    }

    return dashboardService.getSummary(athleteUserId);
  },
};
