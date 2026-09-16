import { Router } from "express";
import { subscriptionsController } from "./subscriptions.controller";
import { requireFirebaseAuth } from "../../middlewares/auth.middleware";

export const subscriptionsRouter = Router();

// GET /api/v1/subscriptions/plans — público, sin auth (para mostrar precios antes de login;
// el frontend usa el paddlePriceId de cada plan para abrir el checkout de Paddle.js)
subscriptionsRouter.get("/plans", subscriptionsController.listPlans);

// NOTA: la ruta del webhook de Paddle (POST /api/v1/subscriptions/webhook) se
// monta directamente en app.ts, ANTES de express.json() global, porque Paddle
// necesita el body RAW sin parsear para verificar la firma. Si se montara aquí,
// el body ya estaría parseado y la verificación de firma fallaría.
//
// No hay endpoint de checkout: Paddle Billing no ofrece una página de pago
// alojada a la que el backend pueda redirigir (a diferencia de Stripe) — el
// checkout se abre directamente en el navegador con Paddle.js, y este backend
// solo se entera del resultado vía el webhook.

subscriptionsRouter.use(requireFirebaseAuth);

subscriptionsRouter.get("/me", subscriptionsController.getMine);
