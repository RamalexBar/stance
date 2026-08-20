import { NextFunction, Request, Response } from "express";
import { poseService } from "./pose.service";
import { userService } from "../users/user.service";
import { ok, created } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

export const poseController = {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await poseService.submit(userId, req.params.id, req.body);
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await poseService.getByVideoId(userId, req.params.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
