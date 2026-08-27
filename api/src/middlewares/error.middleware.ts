import { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/errors";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  // Errores de infraestructura conocidos que si no se traducen aquí llegan
  // al usuario como "Error interno del servidor" sin ninguna pista de qué
  // pasó ni de que reintentar la misma acción va a fallar igual.
  const errorType = (err as { type?: string })?.type;
  const errorCode = (err as { code?: string })?.code;

  if (errorType === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "El video o análisis es demasiado grande para procesarlo. Prueba con un clip más corto.",
    });
  }
  if (errorType === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "No se pudo leer la solicitud. Intenta de nuevo.",
    });
  }
  if (errorCode === "P2028") {
    return res.status(503).json({
      success: false,
      message: "El servidor tardó demasiado en guardar los cambios. Intenta de nuevo en unos segundos.",
    });
  }

  console.error("Error no controlado:", err);
  return res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
}

export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}
