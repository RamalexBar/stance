import { NextFunction, Request, Response } from "express";
import { RoleName } from "@prisma/client";
import { prisma } from "../shared/prisma";
import { ForbiddenError, UnauthorizedError } from "../shared/errors";

/**
 * Debe usarse DESPUÉS de requireFirebaseAuth.
 * Carga los roles del usuario desde Postgres y verifica que tenga al menos uno
 * de los roles permitidos.
 */
export function requireRole(...allowedRoles: RoleName[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.firebaseUser) {
        throw new UnauthorizedError();
      }

      const user = await prisma.user.findUnique({
        where: { firebaseUid: req.firebaseUser.uid },
        include: { roles: { include: { role: true } } },
      });

      if (!user) {
        throw new ForbiddenError("Perfil no encontrado. Completa tu registro primero.");
      }

      const userRoleNames = user.roles.map((r) => r.role.name);
      const hasPermission = allowedRoles.some((role) => userRoleNames.includes(role));

      if (!hasPermission) {
        throw new ForbiddenError();
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
