import { Router } from "express";
import { subscriptionsController } from "./subscriptions.controller";
import { requireFirebaseAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { z } from "zod";

export const subscriptionsRouter = Router();

// GET /api/v1/subscriptions/plans — público, sin auth (para mostrar precios antes de login)
subscriptionsRouter.get("/plans", subscriptionsController.listPlans);

// NOTA: la ruta del webhook de Stripe (POST /api/v1/subscriptions/webhook) se
// monta directamente en app.ts, ANTES de express.json() global, porque Stripe
// necesita el body RAW sin parsear para verificar la firma. Si se montara aquí,
// el body ya estaría parseado y la verificación de firma fallaría.

subscriptionsRouter.use(requireFirebaseAuth);

subscriptionsRouter.get("/me", subscriptionsController.getMine);

subscriptionsRouter.post(
  "/checkout",
  validateBody(z.object({ plan: z.enum(["PREMIUM", "COACH", "ACADEMIA"]) })),
  subscriptionsController.createCheckout
);
