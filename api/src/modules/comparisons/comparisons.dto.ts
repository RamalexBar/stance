import { z } from "zod";

export const createComparisonSchema = z.object({
  mode: z.enum(["SELF_PREVIOUS", "TRAINER", "PROFESSIONAL"]),
  // Requerido para TRAINER/PROFESSIONAL. Para SELF_PREVIOUS se ignora: el
  // sistema busca automáticamente el video anterior más reciente del usuario
  // en la misma disciplina.
  referenceVideoId: z.string().uuid().optional(),
});

export const markReferenceSchema = z.object({
  isReference: z.boolean(),
  referenceLabel: z.string().max(120).optional(),
});

export type CreateComparisonInput = z.infer<typeof createComparisonSchema>;
export type MarkReferenceInput = z.infer<typeof markReferenceSchema>;
