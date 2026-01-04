create table if not exists public.user_profiles (
  user_id uuid primary key,
  active_tenant_id uuid references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_active_tenant
  on public.user_profiles(active_tenant_id);
