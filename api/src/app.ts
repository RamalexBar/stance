import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { userRouter } from "./modules/users/user.routes";
import { roleRouter } from "./modules/roles/role.routes";
import { videoRouter } from "./modules/videos/video.routes";
import { referenceVideosRouter } from "./modules/comparisons/comparisons.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { injuriesRouter } from "./modules/injuries/injuries.routes";
import { schoolsRouter } from "./modules/schools/schools.routes";
import { subscriptionsRouter } from "./modules/subscriptions/subscriptions.routes";
import { subscriptionsController } from "./modules/subscriptions/subscriptions.controller";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    })
  );

  // IMPORTANTE: el webhook de Stripe necesita el body RAW para verificar la
  // firma. Se registra ANTES de express.json() global; si fuera después, el
  // body ya vendría parseado como objeto y la verificación de firma fallaría.
  app.post(
    "/api/v1/subscriptions/webhook",
    express.raw({ type: "application/json" }),
    subscriptionsController.webhook
  );

  app.use(express.json());
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "foilio-api" });
  });

  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/roles", roleRouter);
  app.use("/api/v1/videos", videoRouter);
  app.use("/api/v1/reference-videos", referenceVideosRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/injuries", injuriesRouter);
  app.use("/api/v1/groups", schoolsRouter);
  app.use("/api/v1/subscriptions", subscriptionsRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
