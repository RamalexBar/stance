import { NextFunction, Request, Response } from "express";
import { reportsService } from "./reports.service";
import { userService } from "../users/user.service";
import { ok } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

export const reportsController = {
  async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const buffer = await reportsService.getPdfBuffer(userId, req.params.id);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="reporte-foilio.pdf"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  async downloadExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const buffer = await reportsService.getExcelBuffer(userId, req.params.id);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename="reporte-foilio.xlsx"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  async email(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await reportsService.emailReport(userId, req.params.id, req.body);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
