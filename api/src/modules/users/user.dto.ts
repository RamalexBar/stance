import { z } from "zod";
import { Discipline, Dominance, SkillLevel } from "@prisma/client";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  age: z.number().int().min(5).max(100).optional(),
  weightKg: z.number().min(20).max(200).optional(),
  heightCm: z.number().min(80).max(230).optional(),
  level: z.nativeEnum(SkillLevel).optional(),
  dominance: z.nativeEnum(Dominance).optional(),
  disciplines: z.array(z.nativeEnum(Discipline)).min(1).max(3).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
