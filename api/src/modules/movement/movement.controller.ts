import { NextFunction, Request, Response } from "express";
import { movementService } from "./movement.service";
import { userService } from "../users/user.service";
import { ok, created } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

export const movementController = {
  async compute(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await movementService.computeAndSave(userId, req.params.id);
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await movementService.getByVideoId(userId, req.params.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
