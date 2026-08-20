import { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { injuriesService } from "./injuries.service";
import { userService } from "../users/user.service";
import { requireFirebaseAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { createInjurySchema } from "./injuries.dto";
import { ok, created, noContent } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

export const injuriesRouter = Router();
injuriesRouter.use(requireFirebaseAuth);

injuriesRouter.post("/", validateBody(createInjurySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await resolveUserId(req);
    const result = await injuriesService.create(userId, req.body);
    created(res, result);
  } catch (err) {
    next(err);
  }
});

injuriesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await resolveUserId(req);
    const result = await injuriesService.list(userId);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

injuriesRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await resolveUserId(req);
    await injuriesService.delete(userId, req.params.id);
    noContent(res);
  } catch (err) {
    next(err);
  }
});
