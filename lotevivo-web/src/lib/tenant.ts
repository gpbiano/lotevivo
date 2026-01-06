import { supabase } from "@/lib/supabase";

export type ActiveTenant = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
};

export async function getActiveTenant(): Promise<ActiveTenant | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return null;

  const { data: profile, error: profErr } = await supabase
    .from("user_profiles")
    .select("active_tenant_id")
    .eq("user_id", user.id)
    .single();

  if (profErr) throw profErr;
  if (!profile?.active_tenant_id) return null;

  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("id,name,slug,status")
    .eq("id", profile.active_tenant_id)
    .single();

  if (tErr) throw tErr;
  return tenant as ActiveTenant;
}

export async function setActiveTenant(tenantId: string | null) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const { error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: user.id, active_tenant_id: tenantId });

  if (error) throw error;
}

export async function listMyTenants() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return [];

  // pega tenants onde o user está vinculado (tenant_users)
  const { data, error } = await supabase
    .from("tenant_users")
    .select("tenant_id, tenants(id,name,slug,status)")
    .eq("user_id", user.id);

  if (error) throw error;

  return (data || [])
    .map((row: any) => row.tenants)
    .filter(Boolean) as ActiveTenant[];
}
