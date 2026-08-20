import { NextFunction, Request, Response, Router } from "express";
import { schoolsService } from "./schools.service";
import { userService } from "../users/user.service";
import { requireFirebaseAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { createGroupSchema, assignUserSchema } from "./schools.dto";
import { ok, created, noContent } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

export const schoolsRouter = Router();
schoolsRouter.use(requireFirebaseAuth);

// POST /api/v1/groups — crea un grupo (solo rol Escuela)
schoolsRouter.post(
  "/",
  requireRole("SCHOOL"),
  validateBody(createGroupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await resolveUserId(req);
      const group = await schoolsService.createGroup(userId, req.body.name);
      created(res, group);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/groups — grupos donde participo (como escuela, entrenador o deportista)
schoolsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await resolveUserId(req);
    const groups = await schoolsService.listMyGroups(userId);
    ok(res, groups);
  } catch (err) {
    next(err);
  }
});

schoolsRouter.post(
  "/:id/trainers",
  validateBody(assignUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await resolveUserId(req);
      const result = await schoolsService.assignTrainer(userId, req.params.id, req.body.userId);
      created(res, result);
    } catch (err) {
      next(err);
    }
  }
);

schoolsRouter.delete("/:id/trainers/:userId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await resolveUserId(req);
    await schoolsService.removeTrainer(userId, req.params.id, req.params.userId);
    noContent(res);
  } catch (err) {
    next(err);
  }
});

schoolsRouter.post(
  "/:id/athletes",
  validateBody(assignUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await resolveUserId(req);
      const result = await schoolsService.assignAthlete(userId, req.params.id, req.body.userId);
      created(res, result);
    } catch (err) {
      next(err);
    }
  }
);

schoolsRouter.delete("/:id/athletes/:userId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await resolveUserId(req);
    await schoolsService.removeAthlete(userId, req.params.id, req.params.userId);
    noContent(res);
  } catch (err) {
    next(err);
  }
});

schoolsRouter.get("/:id/ranking", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await resolveUserId(req);
    const ranking = await schoolsService.getRanking(userId, req.params.id);
    ok(res, ranking);
  } catch (err) {
    next(err);
  }
});

schoolsRouter.get(
  "/:id/athletes/:userId/progress",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await resolveUserId(req);
      const progress = await schoolsService.getAthleteProgress(userId, req.params.id, req.params.userId);
      ok(res, progress);
    } catch (err) {
      next(err);
    }
  }
);
