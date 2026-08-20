import { z } from "zod";
import { Discipline, VideoSource } from "@prisma/client";

export const createVideoSchema = z.object({
  discipline: z.nativeEnum(Discipline),
  source: z.nativeEnum(VideoSource),
  // Nombre del archivo original (ej. "GOPR1234.MP4"), usado solo para
  // inferir la extensión y para mostrarlo en el historial.
  originalName: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().positive().max(2 * 1024 * 1024 * 1024).optional(), // límite 2GB
});

export const completeVideoSchema = z.object({
  durationSeconds: z.number().positive().max(60 * 30).optional(), // hasta 30 min
});

export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type CompleteVideoInput = z.infer<typeof completeVideoSchema>;
