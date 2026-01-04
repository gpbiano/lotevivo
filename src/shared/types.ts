export type UserRole = "ADMIN" | "OPERATOR" | "CONSULTANT";

export interface AuthContext {
  userId: string;
  activeTenantId: string;
  role: UserRole;
  email?: string;
}
