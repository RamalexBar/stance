import { NextFunction, Request, Response } from "express";
import { coachService } from "./coach.service";
import { userService } from "../users/user.service";
import { ok, created } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

export const coachController = {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await coachService.generate(userId, req.params.id, req.body?.userNotes);
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await coachService.getByVideoId(userId, req.params.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
