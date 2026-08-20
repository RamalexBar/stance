import { NextFunction, Request, Response, Router } from "express";
import { dashboardService } from "./dashboard.service";
import { userService } from "../users/user.service";
import { requireFirebaseAuth } from "../../middlewares/auth.middleware";
import { ok } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

export const dashboardRouter = Router();
dashboardRouter.use(requireFirebaseAuth);

dashboardRouter.get("/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.firebaseUser) throw new UnauthorizedError();
    const profile = await userService.getOrCreateProfile(req.firebaseUser);
    const result = await dashboardService.getSummary(profile.id);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});
