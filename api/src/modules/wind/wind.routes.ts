import { Router } from "express";
import { windController } from "./wind.controller";
import { requireFirebaseAuth } from "../../middlewares/auth.middleware";

export const windRouter = Router();
windRouter.use(requireFirebaseAuth);

// GET /api/v1/wind/spots?q=Tarifa — busca spots por nombre (Open-Meteo Geocoding)
windRouter.get("/spots", windController.searchSpots);

// GET /api/v1/wind/today?discipline=KITESURF — viento actual/hoy en el spot
// habitual del usuario + clasificación costera + recomendación de equipo
windRouter.get("/today", windController.today);
