import { Response, NextFunction } from "express";
import { TenantRole } from "@prisma/client";
import { prisma } from "../db";
import { AuthRequest, getParam } from "../types/auth";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";

async function loadTenantUser(userId: string, tenantId: string) {
  return prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true },
  });
}

export function requireTenantMember(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  if (!req.userId) {
    return next(new UnauthorizedError("Authentication required"));
  }
  const tenantId = getParam(req.params.tenantId);
  loadTenantUser(req.userId, tenantId)
    .then((tu) => {
      if (!tu) {
        throw new ForbiddenError("Access denied to this tenant");
      }
      req.tenantRole = tu.role;
      next();
    })
    .catch(next);
}

export function requireTenantOwner(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  if (!req.userId) {
    return next(new UnauthorizedError("Authentication required"));
  }
  const tenantId = getParam(req.params.tenantId);
  loadTenantUser(req.userId, tenantId)
    .then((tu) => {
      if (!tu) {
        throw new ForbiddenError("Access denied to this tenant");
      }
      if (tu.role !== TenantRole.owner) {
        throw new ForbiddenError("Owner-only action");
      }
      req.tenantRole = tu.role;
      next();
    })
    .catch(next);
}
