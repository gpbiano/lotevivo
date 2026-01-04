-- Add missing columns to locations
alter table if exists public.locations
  add column if not exists kind text;

alter table if exists public.locations
  add column if not exists notes text;

-- index útil por tenant
create index if not exists idx_locations_tenant on public.locations(tenant_id);

-- Force PostgREST schema reload
notify pgrst, 'reload schema';
