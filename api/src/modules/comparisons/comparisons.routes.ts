import { Router } from "express";
import { requireFirebaseAuth } from "../../middlewares/auth.middleware";
import { comparisonsController } from "./comparisons.controller";

export const referenceVideosRouter = Router();

referenceVideosRouter.use(requireFirebaseAuth);

// GET /api/v1/reference-videos?discipline=KITESURF
// Cualquier usuario autenticado puede LISTARLOS (para elegir con qué comparar);
// solo Admin/Entrenador puede CREARLOS (ver PATCH /videos/:id/reference).
referenceVideosRouter.get("/", comparisonsController.listReferenceVideos);
