import { Router } from "express";
import { userController } from "./user.controller";
import { requireFirebaseAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { updateProfileSchema } from "./user.dto";

export const userRouter = Router();

// GET /api/v1/users/me
// Devuelve (y crea si no existe) el perfil del usuario autenticado.
userRouter.get("/me", requireFirebaseAuth, userController.getMe);

// PUT /api/v1/users/me
// Actualiza edad, peso, altura, nivel, dominancia y disciplinas.
userRouter.put(
  "/me",
  requireFirebaseAuth,
  validateBody(updateProfileSchema),
  userController.updateMe
);
