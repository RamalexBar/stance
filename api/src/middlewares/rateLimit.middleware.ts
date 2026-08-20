import rateLimit from "express-rate-limit";
import { Request } from "express";

function keyByUserOrIp(req: Request): string {
  return req.firebaseUser?.uid ?? req.ip ?? "anonymous";
}

// El plan de entrenador IA llama a la API de Anthropic (costo por token) en
// cada request; sin límite, una sola cuenta comprometida puede generar un
// costo ilimitado. 10 generaciones por hora por usuario es holgado para uso
// normal pero corta el abuso.
export const coachPlanRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { success: false, message: "Demasiadas solicitudes al entrenador IA. Intenta de nuevo en un rato." },
});

// Cada solicitud de subida de video genera una URL firmada de Supabase
// Storage y un registro en BD; 30 por hora por usuario cubre el uso normal.
export const videoUploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { success: false, message: "Demasiadas solicitudes de subida. Intenta de nuevo en un rato." },
});
