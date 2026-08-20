import { videoRepository } from "../videos/video.repository";
import { biomechanicsRepository } from "../biomechanics/biomechanics.repository";
import { movementRepository } from "../movement/movement.repository";
import { errorsRepository } from "../errors/errors.repository";
import { userRepository } from "../users/user.repository";
import { computeAggregates, scoreAggregate } from "../comparisons/comparisons.score";
import { coachRepository } from "./coach.repository";
import { buildCoachPrompt, CoachContext } from "./coach.prompt";
import { callCoachModel } from "./coach.client";
import { env } from "../../config/env";
import { subscriptionsService } from "../subscriptions/subscriptions.service";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors";
import { prisma } from "../../shared/prisma";

async function assertOwnership(userId: string, videoId: string) {
  const video = await videoRepository.findById(videoId);
  if (!video) throw new NotFoundError("Video no encontrado");
  if (video.userId !== userId) throw new ForbiddenError();
  return video;
}

export const coachService = {
  async generate(userId: string, videoId: string, userNotes?: string) {
    const video = await assertOwnership(userId, videoId);

    const biomechanics = await biomechanicsRepository.findByVideoId(videoId);
    const movement = await movementRepository.findByVideoId(videoId);
    const errors = await errorsRepository.findByVideoId(videoId);

    if (!biomechanics?.summaryJson || !movement?.segmentsJson || !errors?.findingsJson) {
      throw new AppError(
        "Este video necesita biomecánica, movimiento y errores calculados antes de generar el plan (Fases 4, 5 y 6).",
        409
      );
    }

    const user = await userRepository.findById(userId);

    const segments = movement.segmentsJson as any[];
    const movementSummary = {
      navegacion: segments.filter((s) => s.type === "NAVEGACION").length,
      saltos: segments.filter((s) => s.type === "SALTO").length,
      aterrizajes: segments.filter((s) => s.type === "ATERRIZAJE").length,
      cambiosDireccion: segments.filter((s) => s.type === "CAMBIO_DIRECCION").length,
    };

    let techniqueScore: number | null = null;
    if (biomechanics.seriesJson) {
      techniqueScore = scoreAggregate(computeAggregates(biomechanics.seriesJson as any[])).total;
    }

    const context: CoachContext = {
      discipline: video.discipline,
      userLevel: user?.level ?? null,
      userAge: user?.age ?? null,
      userDominance: user?.dominance ?? null,
      techniqueScore,
      biomechanicsSummary: biomechanics.summaryJson as any,
      errorFindings: (errors.findingsJson as any[]).map((f) => ({
        type: f.type,
        level: f.level,
        description: f.description,
      })),
      movementSummary,
      userNotes,
    };

    // El chequeo del límite mensual y la reserva del cupo (fila PENDING) se
    // hacen en una transacción Serializable ANTES de llamar a la IA: así dos
    // generaciones concurrentes para videos distintos del mismo usuario no
    // pueden pasar el chequeo a la vez y saltarse el límite del plan. No se
    // envuelve la llamada a Anthropic en la transacción para no mantener una
    // conexión/transacción de Postgres abierta durante una llamada de red.
    await prisma.$transaction(
      async (tx) => {
        await subscriptionsService.assertCanGenerateCoachPlan(userId, tx);
        await coachRepository.reservePending(videoId, tx);
      },
      { isolationLevel: "Serializable" }
    );

    const { system, user: userPrompt } = buildCoachPrompt(context);

    try {
      const plan = await callCoachModel(system, userPrompt);
      return await coachRepository.upsertCompleted(videoId, plan as object, userNotes, env.anthropic.model);
    } catch (err) {
      await coachRepository.markFailed(videoId);
      throw err;
    }
  },

  async getByVideoId(userId: string, videoId: string) {
    await assertOwnership(userId, videoId);
    const plan = await coachRepository.findByVideoId(videoId);
    if (!plan) throw new NotFoundError("Este video todavía no tiene un plan generado");
    return plan;
  },
};
