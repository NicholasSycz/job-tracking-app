import { Request } from "express";
import { TenantRole } from "@prisma/client";

// Extend Express Request globally
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      requestId?: string;
      tenantRole?: TenantRole;
    }
  }
}

// Base request type - userId may or may not be set
export interface AuthRequest extends Request {
  userId?: string;
}

// Type alias for routes that require authentication
// userId is guaranteed to be set by requireAuth middleware
// We use a type assertion helper instead of a separate interface
export type AuthenticatedRequest = Request & { userId: string; tenantRole?: TenantRole };

// Set after a tenant-membership middleware (requireTenantMember/requireTenantOwner) runs.
export type TenantAuthenticatedRequest = AuthenticatedRequest & { tenantRole: TenantRole };

// Helper to safely extract a string param from Express 5 params
// Express 5 params can be string | string[] | undefined
export function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) {
    return param[0] || "";
  }
  return param || "";
}
