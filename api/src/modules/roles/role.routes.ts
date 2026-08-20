import { Router } from "express";
import { requireFirebaseAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { prisma } from "../../shared/prisma";
import { ok } from "../../shared/apiResponse";
import { z } from "zod";
import { validateBody } from "../../middlewares/validate.middleware";
import { RoleName } from "@prisma/client";
import { NotFoundError } from "../../shared/errors";

export const roleRouter = Router();

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(RoleName),
});

// GET /api/v1/roles — lista los roles disponibles en el sistema
roleRouter.get(
  "/",
  requireFirebaseAuth,
  requireRole("ADMIN"),
  async (_req, res, next) => {
    try {
      const roles = await prisma.role.findMany();
      ok(res, roles);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/roles/assign — asigna un rol a un usuario (solo Admin)
roleRouter.post(
  "/assign",
  requireFirebaseAuth,
  requireRole("ADMIN"),
  validateBody(assignRoleSchema),
  async (req, res, next) => {
    try {
      const { userId, role } = req.body as { userId: string; role: RoleName };

      const roleRecord = await prisma.role.findUnique({ where: { name: role } });
      if (!roleRecord) throw new NotFoundError("Rol no encontrado");

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: roleRecord.id } },
        update: {},
        create: { userId, roleId: roleRecord.id },
      });

      ok(res, { userId, role });
    } catch (err) {
      next(err);
    }
  }
);
