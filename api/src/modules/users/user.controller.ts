import { NextFunction, Request, Response } from "express";
import { userService } from "./user.service";
import { ok } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

export const userController = {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.firebaseUser) throw new UnauthorizedError();
      const profile = await userService.getOrCreateProfile(req.firebaseUser);
      ok(res, profile);
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.firebaseUser) throw new UnauthorizedError();
      const profile = await userService.updateProfile(req.firebaseUser.uid, req.body);
      ok(res, profile);
    } catch (err) {
      next(err);
    }
  },
};
