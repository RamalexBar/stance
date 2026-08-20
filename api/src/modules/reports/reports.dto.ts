import { z } from "zod";

export const emailReportSchema = z.object({
  format: z.enum(["pdf", "excel"]),
  toEmail: z.string().email().optional(), // si se omite, se envía al email del propio usuario
});

export type EmailReportInput = z.infer<typeof emailReportSchema>;
