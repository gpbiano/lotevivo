import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 3000),
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  jwtIssuer: process.env.SUPABASE_JWT_ISSUER!,
  jwtAudience: process.env.SUPABASE_JWT_AUDIENCE!,
};
