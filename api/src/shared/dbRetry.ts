import { Prisma } from "@prisma/client";

// Códigos de error de Prisma que indican un problema TRANSITORIO de conexión
// contra la base de datos remota (se cae/corta a mitad de una consulta) — no
// un error de datos o de lógica. Reintentar con una conexión nueva casi
// siempre lo resuelve solo. P1000 (auth) y errores de validación NO están
// acá a propósito: esos van a fallar siempre, reintentarlos solo demora el
// error real.
const RETRYABLE_PRISMA_CODES = new Set([
  "P1001", // no se pudo alcanzar el servidor
  "P1002", // el servidor tardó demasiado en responder
  "P1008", // se agotó el tiempo de la operación
  "P1017", // el servidor cerró la conexión
  "P2024", // se agotó el tiempo esperando una conexión del pool
]);

function isRetryable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_PRISMA_CODES.has(err.code);
  }
  // Fallos al abrir la conexión en sí (antes de tener un código de Prisma)
  // también son transitorios por naturaleza.
  return err instanceof Prisma.PrismaClientInitializationError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reintenta una operación de base de datos si falla por un corte de conexión
 * transitorio — frecuente contra un Postgres remoto cuando la respuesta es
 * grande (landmarks de pose, resumen biomecánico completo de un video).
 * Backoff creciente entre intentos; no reintenta errores de datos/lógica.
 */
export async function withDbRetry<T>(operation: () => Promise<T>, attempts = 3, baseDelayMs = 800): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === attempts) throw err;
      console.warn(
        `[dbRetry] intento ${attempt}/${attempts} falló por conexión transitoria, reintentando…`,
        err instanceof Error ? err.message : err
      );
      await sleep(baseDelayMs * attempt);
    }
  }
  throw lastError;
}
