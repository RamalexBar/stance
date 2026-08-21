import { z } from "zod";
import { Discipline, Dominance, Gender, SkillLevel } from "@prisma/client";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  age: z.number().int().min(5).max(100).optional(),
  weightKg: z.number().min(20).max(200).optional(),
  heightCm: z.number().min(80).max(230).optional(),
  gender: z.nativeEnum(Gender).optional(),
  level: z.nativeEnum(SkillLevel).optional(),
  dominance: z.nativeEnum(Dominance).optional(),
  disciplines: z.array(z.nativeEnum(Discipline)).min(1).max(3).optional(),
  // Spot habitual: de acá se saca el viento. seaDirectionDeg es el rumbo
  // (0-360, 0=Norte) mirando desde la playa hacia mar abierto — sin esto no
  // se puede clasificar el viento como costero-adentro/costero-afuera.
  homeSpotName: z.string().min(1).max(120).optional(),
  homeSpotLat: z.number().min(-90).max(90).optional(),
  homeSpotLon: z.number().min(-180).max(180).optional(),
  homeSpotSeaDirectionDeg: z.number().min(0).max(360).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
