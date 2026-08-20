import { z } from "zod";

// MediaPipe Pose Landmarker devuelve 33 puntos por frame.
export const landmarkSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  visibility: z.number().min(0).max(1).optional(),
});

export const poseFrameSchema = z.object({
  tSeconds: z.number().min(0),
  landmarks: z.array(landmarkSchema).length(33),
});

export const submitPoseAnalysisSchema = z.object({
  fps: z.number().positive().max(240),
  frames: z.array(poseFrameSchema).min(1).max(20000),
  avgConfidence: z.number().min(0).max(1).optional(),
  engine: z.string().max(80).optional(),
});

export type SubmitPoseAnalysisInput = z.infer<typeof submitPoseAnalysisSchema>;
