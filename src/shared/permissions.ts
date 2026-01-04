import type { UserRole } from "./types";
import { forbid } from "./errors";

export function requireRole(roles: UserRole[]) {
  return function (req: any) {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw forbid();
    }
  };
}
