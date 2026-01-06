// src/shared/types.ts

// Role dentro do TENANT (tabela tenant_users.role)
export type TenantRole = "ADMIN" | "OPERATOR" | "CONSULTANT";

// Role FINAL que o backend usa no req.auth
// (pode ser super_admin via user_profiles.global_role)
export type UserRole = TenantRole | "super_admin";

export interface AuthContext {
  userId: string;
  activeTenantId: string;
  role: UserRole;
  isSuperAdmin: boolean;
  email?: string;
}
