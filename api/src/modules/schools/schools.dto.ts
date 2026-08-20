import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1).max(120),
});

export const assignUserSchema = z.object({
  userId: z.string().uuid(),
});
