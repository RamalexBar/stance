import { z } from "zod";

export const gpsPointSchema = z.object({
  tSeconds: z.number().min(0),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).optional(),
});

export const submitGpsTrackSchema = z.object({
  points: z.array(gpsPointSchema).min(2).max(20000),
});

export type SubmitGpsTrackInput = z.infer<typeof submitGpsTrackSchema>;
