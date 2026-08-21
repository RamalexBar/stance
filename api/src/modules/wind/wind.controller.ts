import { Discipline } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { windService } from "./wind.service";
import { userService } from "../users/user.service";
import { ok } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

export const windController = {
  async searchSpots(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await windService.searchSpots(String(req.query.q ?? ""));
      ok(res, results);
    } catch (err) {
      next(err);
    }
  },

  async today(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const discipline = req.query.discipline as Discipline | undefined;
      const result = await windService.getToday(userId, discipline);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
