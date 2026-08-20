import { z } from "zod";

export const createInjurySchema = z.object({
  date: z.coerce.date(),
  bodyPart: z.string().min(1).max(80),
  severity: z.enum(["LEVE", "MODERADO", "ALTO"]),
  description: z.string().max(500).optional(),
  relatedVideoId: z.string().uuid().optional(),
});

export type CreateInjuryInput = z.infer<typeof createInjurySchema>;
