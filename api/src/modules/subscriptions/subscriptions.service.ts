import { Prisma } from "@prisma/client";
import { subscriptionsRepository } from "./subscriptions.repository";
import { PLAN_CONFIG, PlanName, startOfCurrentMonth } from "./planLimits";
import { AppError } from "../../shared/errors";

type Db = Prisma.TransactionClient;

export const subscriptionsService = {
  async getCurrentPlan(userId: string): Promise<PlanName> {
    const sub = await subscriptionsRepository.findByUserId(userId);
    if (!sub || sub.status !== "ACTIVE") return "FREE";
    return sub.plan as PlanName;
  },

  async getStatus(userId: string) {
    const plan = await this.getCurrentPlan(userId);
    const sub = await subscriptionsRepository.findByUserId(userId);
    return { plan, config: PLAN_CONFIG[plan], subscription: sub };
  },

  /**
   * Verifica el límite del plan y reserva el cupo dentro de la misma
   * transacción Serializable que el llamador usa para crear el recurso
   * (video, plan de coach, etc). Sin esto, dos requests concurrentes podrían
   * pasar el chequeo antes de que cualquiera de las dos creara su registro
   * (TOCTOU) y ambas terminarían creándolo, superando el límite del plan.
   * Con Serializable, Postgres aborta una de las dos transacciones en conflicto.
   */
  async assertCanUploadVideo(userId: string, tx?: Db) {
    const plan = await this.getCurrentPlan(userId);
    const limit = PLAN_CONFIG[plan].maxVideosPerMonth;
    if (limit === Infinity) return;

    const count = await subscriptionsRepository.countVideosThisMonth(userId, startOfCurrentMonth(), tx);
    if (count >= limit) {
      throw new AppError(
        `Alcanzaste el límite de ${limit} videos este mes en el plan ${PLAN_CONFIG[plan].label}. Mejora tu plan para subir más.`,
        403
      );
    }
  },

  async assertCanGenerateCoachPlan(userId: string, tx?: Db) {
    const plan = await this.getCurrentPlan(userId);
    const limit = PLAN_CONFIG[plan].maxCoachPlansPerMonth;
    if (limit === Infinity) return;

    const count = await subscriptionsRepository.countCoachPlansThisMonth(userId, startOfCurrentMonth(), tx);
    if (count >= limit) {
      throw new AppError(
        `Alcanzaste el límite de ${limit} plan(es) del Entrenador IA este mes en el plan ${PLAN_CONFIG[plan].label}.`,
        403
      );
    }
  },

  async assertCanUseReferenceComparison(userId: string) {
    const plan = await this.getCurrentPlan(userId);
    if (!PLAN_CONFIG[plan].allowReferenceComparison) {
      throw new AppError(
        `Comparar con un video de referencia/profesional requiere el plan Premium o superior.`,
        403
      );
    }
  },

  async assertCanUseReports(userId: string) {
    const plan = await this.getCurrentPlan(userId);
    if (!PLAN_CONFIG[plan].allowReports) {
      throw new AppError(`Los reportes PDF/Excel requieren el plan Premium o superior.`, 403);
    }
  },

  async assertCanCreateGroup(schoolUserId: string, tx?: Db) {
    const plan = await this.getCurrentPlan(schoolUserId);
    const limit = PLAN_CONFIG[plan].maxGroups;
    if (limit === 0) {
      throw new AppError(`Tu plan (${PLAN_CONFIG[plan].label}) no incluye la creación de grupos.`, 403);
    }
    const count = await subscriptionsRepository.countGroupsForSchool(schoolUserId, tx);
    if (count >= limit) {
      throw new AppError(
        `Alcanzaste el máximo de ${limit} grupo(s) de tu plan ${PLAN_CONFIG[plan].label}.`,
        403
      );
    }
  },

  /**
   * Verifica DOS límites independientes antes de inscribir un deportista:
   * 1) el cupo total de deportistas del grupo, y
   * 2) el tope de INSCRIPCIONES NUEVAS de este mes (para todos los grupos de esta escuela/coach).
   */
  async assertCanEnrollAthlete(schoolUserId: string, groupId: string, tx?: Db) {
    const plan = await this.getCurrentPlan(schoolUserId);
    const config = PLAN_CONFIG[plan];

    const currentAthletes = await subscriptionsRepository.countAthletesInGroup(groupId, tx);
    if (currentAthletes >= config.maxAthletesPerGroup) {
      throw new AppError(
        `Este grupo ya tiene el máximo de ${config.maxAthletesPerGroup} deportistas de tu plan ${config.label}.`,
        403
      );
    }

    const enrollmentsThisMonth = await subscriptionsRepository.countNewEnrollmentsThisMonthForSchool(
      schoolUserId,
      startOfCurrentMonth(),
      tx
    );
    if (enrollmentsThisMonth >= config.maxNewEnrollmentsPerMonth) {
      throw new AppError(
        `Alcanzaste el límite de ${config.maxNewEnrollmentsPerMonth} inscripciones nuevas este mes en tu plan ${config.label}. Espera al próximo mes o mejora tu plan.`,
        403
      );
    }
  },
};
