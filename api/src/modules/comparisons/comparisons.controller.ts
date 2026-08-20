import { NextFunction, Request, Response } from "express";
import { comparisonsService } from "./comparisons.service";
import { userService } from "../users/user.service";
import { userRepository } from "../users/user.repository";
import { ok, created } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

export const comparisonsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await comparisonsService.create(userId, req.params.id, req.body);
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await comparisonsService.listForVideo(userId, req.params.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async markReference(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const user = await userRepository.findById(userId);
      const roles = user?.roles.map((r) => r.role.name) ?? [];

      const result = await comparisonsService.markReference(
        userId,
        roles,
        req.params.id,
        req.body.isReference,
        req.body.referenceLabel
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async listReferenceVideos(req: Request, res: Response, next: NextFunction) {
    try {
      const discipline = req.query.discipline as any;
      const result = await comparisonsService.listReferenceVideos(discipline);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
