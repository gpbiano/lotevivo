-- Ensure expected columns exist for lots
alter table if exists public.lots
  add column if not exists tenant_id uuid references public.tenants(id);

alter table if exists public.lots
  add column if not exists name text;

alter table if exists public.lots
  add column if not exists species text; -- "CHICKEN" | "CATTLE" (por enquanto)
  
alter table if exists public.lots
  add column if not exists purpose text; -- "POSTURA" | "MATRIZES" | "LEITE" | "CORTE" etc

alter table if exists public.lots
  add column if not exists breed text;

alter table if exists public.lots
  add column if not exists start_date date;

alter table if exists public.lots
  add column if not exists status text; -- "ACTIVE" | "INACTIVE"

alter table if exists public.lots
  add column if not exists supplier_id uuid references public.suppliers(id);

alter table if exists public.lots
  add column if not exists location_id uuid references public.locations(id);

alter table if exists public.lots
  add column if not exists notes text;

-- indexes
create index if not exists idx_lots_tenant on public.lots(tenant_id);
create index if not exists idx_lots_species on public.lots(species);
create index if not exists idx_lots_supplier on public.lots(supplier_id);
create index if not exists idx_lots_location on public.lots(location_id);

-- optional: idempotence by (tenant_id, name)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lots_tenant_name_uniq'
  ) then
    alter table public.lots
      add constraint lots_tenant_name_uniq unique (tenant_id, name);
  end if;
exception
  when duplicate_object then null;
end $$;

-- Force PostgREST schema reload
notify pgrst, 'reload schema';
