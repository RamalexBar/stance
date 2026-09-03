import { Router } from "express";
import { videoController } from "./video.controller";
import { poseController } from "../pose/pose.controller";
import { biomechanicsController } from "../biomechanics/biomechanics.controller";
import { movementController } from "../movement/movement.controller";
import { errorsController } from "../errors/errors.controller";
import { comparisonsController } from "../comparisons/comparisons.controller";
import { coachController } from "../coach/coach.controller";
import { reportsController } from "../reports/reports.controller";
import { emailReportSchema } from "../reports/reports.dto";
import { createComparisonSchema, markReferenceSchema } from "../comparisons/comparisons.dto";
import { requireRole } from "../../middlewares/role.middleware";
import { requireFirebaseAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { coachPlanRateLimiter, videoUploadRateLimiter } from "../../middlewares/rateLimit.middleware";
import { createVideoSchema, completeVideoSchema } from "./video.dto";
import { submitPoseAnalysisSchema } from "../pose/pose.dto";
import { gpsController } from "../gps/gps.controller";
import { submitGpsTrackSchema } from "../gps/gps.dto";

export const videoRouter = Router();

videoRouter.use(requireFirebaseAuth);

// POST /api/v1/videos — registra el video y devuelve la URL firmada de subida
videoRouter.post(
  "/",
  videoUploadRateLimiter,
  validateBody(createVideoSchema),
  videoController.requestUpload
);

// GET /api/v1/videos — historial del usuario autenticado
videoRouter.get("/", videoController.listMine);

// GET /api/v1/videos/:id — metadata + URL firmada de reproducción
videoRouter.get("/:id", videoController.getPlayable);

// DELETE /api/v1/videos/:id — borra el video (storage + BD en cascada) y
// libera cupo del límite mensual del plan.
videoRouter.delete("/:id", videoController.remove);

// PATCH /api/v1/videos/:id/complete — confirma que la subida a Storage terminó
videoRouter.patch(
  "/:id/complete",
  validateBody(completeVideoSchema),
  videoController.completeUpload
);

// PATCH /api/v1/videos/:id/fail — marca la subida como fallida
videoRouter.patch("/:id/fail", videoController.markFailed);

// ── Fase 3: análisis de pose (compartiendo el prefijo /videos/:id) ─────────

// POST /api/v1/videos/:id/pose-analysis — guarda el resultado de la detección
// de pose que ya se ejecutó en el cliente (web/mobile).
videoRouter.post(
  "/:id/pose-analysis",
  validateBody(submitPoseAnalysisSchema),
  poseController.submit
);

// GET /api/v1/videos/:id/pose-analysis — recupera los landmarks guardados
videoRouter.get("/:id/pose-analysis", poseController.get);

// ── Fase 4: biomecánica (compartiendo el prefijo /videos/:id) ──────────────

// POST /api/v1/videos/:id/biomechanics — calcula y guarda los ángulos/métricas
// a partir del análisis de pose ya guardado (Fase 3). Es solo matemática:
// corre en el backend, no necesita IA on-device.
videoRouter.post("/:id/biomechanics", biomechanicsController.compute);

// GET /api/v1/videos/:id/biomechanics — recupera la serie y el resumen guardados
videoRouter.get("/:id/biomechanics", biomechanicsController.get);

// ── Fase 5: análisis del movimiento (segmentación de maniobras) ────────────

videoRouter.post("/:id/movement", movementController.compute);
videoRouter.get("/:id/movement", movementController.get);

// ── Fase 6: errores automáticos ─────────────────────────────────────────────

videoRouter.post("/:id/errors", errorsController.compute);
videoRouter.get("/:id/errors", errorsController.get);

// ── Fase 7: comparación ─────────────────────────────────────────────────────

// POST /api/v1/videos/:id/compare — compara este video contra el anterior
// propio, contra el video de un entrenador, o contra un video de referencia.
videoRouter.post(
  "/:id/compare",
  validateBody(createComparisonSchema),
  comparisonsController.create
);

// GET /api/v1/videos/:id/compare — historial de comparaciones de este video
videoRouter.get("/:id/compare", comparisonsController.list);

// PATCH /api/v1/videos/:id/reference — Admin o Entrenador dueño marca el
// video como referencia, visible para comparación de otros deportistas.
videoRouter.patch(
  "/:id/reference",
  requireRole("ADMIN", "TRAINER"),
  validateBody(markReferenceSchema),
  comparisonsController.markReference
);

// ── Fase 9: entrenador IA ────────────────────────────────────────────────────

// POST /api/v1/videos/:id/coach-plan — genera (o regenera) el plan con Claude
videoRouter.post("/:id/coach-plan", coachPlanRateLimiter, coachController.generate);

// GET /api/v1/videos/:id/coach-plan — recupera el último plan generado
videoRouter.get("/:id/coach-plan", coachController.get);

// ── Fase 10: reportes ────────────────────────────────────────────────────────

videoRouter.get("/:id/report/pdf", reportsController.downloadPdf);
videoRouter.get("/:id/report/excel", reportsController.downloadExcel);
videoRouter.post(
  "/:id/report/email",
  validateBody(emailReportSchema),
  reportsController.email
);

// ── Fase 13: velocidad y distancia (GPS) ────────────────────────────────────

// POST /api/v1/videos/:id/gps-track — guarda el track GPS capturado por el
// cliente (mobile) mientras se grababa el video.
videoRouter.post(
  "/:id/gps-track",
  validateBody(submitGpsTrackSchema),
  gpsController.submit
);

// GET /api/v1/videos/:id/gps-track — recupera el track guardado
videoRouter.get("/:id/gps-track", gpsController.get);
