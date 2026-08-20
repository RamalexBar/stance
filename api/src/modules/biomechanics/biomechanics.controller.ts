import { NextFunction, Request, Response } from "express";
import { biomechanicsService } from "./biomechanics.service";
import { userService } from "../users/user.service";
import { ok, created } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

export const biomechanicsController = {
  async compute(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await biomechanicsService.computeAndSave(userId, req.params.id);
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await biomechanicsService.getByVideoId(userId, req.params.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
