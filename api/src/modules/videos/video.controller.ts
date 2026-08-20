import { NextFunction, Request, Response } from "express";
import { videoService } from "./video.service";
import { userService } from "../users/user.service";
import { ok, created } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

export const videoController = {
  async requestUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await videoService.requestUpload(userId, req.body);
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async completeUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await videoService.completeUpload(userId, req.params.id, req.body);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async markFailed(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await videoService.markFailed(userId, req.params.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await videoService.listMine(userId);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getPlayable(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await videoService.getPlayable(userId, req.params.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
