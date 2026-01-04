-- Ensure expected columns exist for movements
alter table if exists public.movements
  add column if not exists tenant_id uuid references public.tenants(id);

alter table if exists public.movements
  add column if not exists lot_id uuid references public.lots(id);

alter table if exists public.movements
  add column if not exists animal_id uuid; -- reservado pro futuro (leite/individual)

alter table if exists public.movements
  add column if not exists movement_type text; -- IN/OUT/DEATH/BIRTH/TRANSFER

alter table if exists public.movements
  add column if not exists qty integer;

alter table if exists public.movements
  add column if not exists movement_date date;

alter table if exists public.movements
  add column if not exists from_location_id uuid references public.locations(id);

alter table if exists public.movements
  add column if not exists to_location_id uuid references public.locations(id);

alter table if exists public.movements
  add column if not exists notes text;

-- indexes
create index if not exists idx_movements_tenant_date on public.movements(tenant_id, movement_date desc);
create index if not exists idx_movements_lot on public.movements(lot_id);
create index if not exists idx_movements_animal on public.movements(animal_id);

-- Force PostgREST schema reload
notify pgrst, 'reload schema';
