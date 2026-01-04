-- Enable extensions
create extension if not exists "pgcrypto";

-- =========================
-- ENUMS
-- =========================
do $$ begin
  create type public.user_role as enum ('ADMIN','OPERATOR','CONSULTANT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tenant_status as enum ('active','inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.supplier_type as enum ('PJ','PF');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.location_type as enum (
    'GALPAO','PASTO','ESTABULO','PIQUETE','INCUBADORA','MATERNIDADE','OUTRO'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.species as enum ('CHICKEN','BOVINE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.origin_type as enum ('SUPPLIER','INTERNAL','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lot_status as enum ('ACTIVE','COMPLETED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lot_type as enum (
    -- chicken
    'MATRIZES','INCUBACAO','VIVO',
    -- bovine
    'REBANHO_CORTE','REBANHO_LEITE','REBANHO_MISTO'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.movement_type as enum (
    'ENTRY_PURCHASE','SALE','DEATH','TRANSFER_IN','TRANSFER_OUT','BIRTH','CULL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.egg_production_mode as enum ('BY_LOT','BY_LOCATION');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incubation_method as enum ('INCUBATOR','HEN_BROOD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incubation_status as enum ('ACTIVE','COMPLETED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incubation_event_type as enum (
    'OVOSCOPY_1','OVOSCOPY_2','TRANSFER_TO_HATCHER','HATCH'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.animal_sex as enum ('F','M');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.animal_status as enum ('ACTIVE','SOLD','DEAD','CULLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.milk_period as enum ('TOTAL','MORNING','AFTERNOON');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lot_link_type as enum ('INCUBATION_TO_LIVE','DERIVED_FROM');
exception when duplicate_object then null; end $$;


-- =========================
-- CORE: TENANTS + USERS LINK
-- =========================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.tenant_status not null default 'active',
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Supabase Auth users live in auth.users.
-- We'll reference them via user_id uuid = auth.users.id.

create table if not exists public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null, -- references auth.users(id) (can't FK across schemas in some setups; we enforce at app level)
  role public.user_role not null default 'OPERATOR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);


-- =========================
-- SUPPLIERS
-- =========================
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type public.supplier_type not null,
  legal_name text not null,
  trade_name text,
  document text not null, -- CNPJ/CPF
  state_registration text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_tenant on public.suppliers(tenant_id);
create index if not exists idx_suppliers_document on public.suppliers(tenant_id, document);

create table if not exists public.supplier_addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  zip_code text,
  street text,
  number text,
  district text,
  city text,
  state text,
  complement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================
-- LOCATIONS
-- =========================
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type public.location_type not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, type, name)
);

create index if not exists idx_locations_tenant on public.locations(tenant_id);


-- =========================
-- LOTS
-- =========================
create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  species public.species not null,
  lot_type public.lot_type not null,
  breed text,
  origin_type public.origin_type not null default 'OTHER',
  supplier_id uuid references public.suppliers(id),
  origin_reference text,
  start_date date not null,
  status public.lot_status not null default 'ACTIVE',
  location_id uuid references public.locations(id),
  initial_qty integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index if not exists idx_lots_tenant on public.lots(tenant_id);
create index if not exists idx_lots_species on public.lots(tenant_id, species, lot_type, status);


-- =========================
-- ANIMALS (BOVINE in MVP)
-- =========================
create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  species public.species not null default 'BOVINE',
  tag_id text not null, -- brinco
  name text,
  sex public.animal_sex not null,
  breed text,
  birth_date date,
  origin_type public.origin_type not null default 'OTHER',
  supplier_id uuid references public.suppliers(id),
  status public.animal_status not null default 'ACTIVE',
  current_lot_id uuid references public.lots(id),
  current_location_id uuid references public.locations(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, tag_id)
);

create index if not exists idx_animals_tenant on public.animals(tenant_id);
create index if not exists idx_animals_lot on public.animals(tenant_id, current_lot_id, status);


-- =========================
-- MOVEMENTS
-- =========================
create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  movement_date timestamptz not null,
  species public.species not null,
  movement_type public.movement_type not null,
  lot_id uuid references public.lots(id),
  animal_id uuid references public.animals(id),
  from_location_id uuid references public.locations(id),
  to_location_id uuid references public.locations(id),
  qty integer,
  unit_price numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- basic sanity: must have lot or animal
  constraint chk_movement_target check (lot_id is not null or animal_id is not null)
);

create index if not exists idx_movements_tenant_date on public.movements(tenant_id, movement_date);
create index if not exists idx_movements_lot on public.movements(tenant_id, lot_id);
create index if not exists idx_movements_animal on public.movements(tenant_id, animal_id);


-- =========================
-- EGG PRODUCTION
-- =========================
create table if not exists public.egg_production (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  production_date date not null,
  mode public.egg_production_mode not null,
  lot_id uuid references public.lots(id),
  location_id uuid references public.locations(id),
  qty_eggs integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_eggs_mode_target check (
    (mode = 'BY_LOT' and lot_id is not null and location_id is null)
    or
    (mode = 'BY_LOCATION' and location_id is not null and lot_id is null)
  )
);

create index if not exists idx_egg_prod_tenant_date on public.egg_production(tenant_id, production_date);


-- =========================
-- INCUBATION
-- =========================
create table if not exists public.incubation_cycles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  incubation_lot_id uuid not null references public.lots(id) on delete cascade,
  source_type public.origin_type not null default 'OTHER',
  supplier_id uuid references public.suppliers(id),
  source_lot_id uuid references public.lots(id),
  method public.incubation_method not null,
  start_date date not null,
  eggs_set_qty integer not null,
  expected_hatch_date date not null,
  status public.incubation_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_incub_cycles_tenant_date on public.incubation_cycles(tenant_id, expected_hatch_date, status);

create table if not exists public.incubation_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cycle_id uuid not null references public.incubation_cycles(id) on delete cascade,
  event_type public.incubation_event_type not null,
  event_date date not null,
  fertile_qty integer,
  infertile_qty integer,
  transferred_qty integer,
  hatched_qty integer,
  culled_qty integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_incub_events_cycle on public.incubation_events(tenant_id, cycle_id, event_date);

create table if not exists public.lot_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  from_lot_id uuid not null references public.lots(id) on delete cascade,
  to_lot_id uuid not null references public.lots(id) on delete cascade,
  link_type public.lot_link_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, from_lot_id, to_lot_id, link_type)
);


-- =========================
-- MILK PRODUCTION
-- =========================
create table if not exists public.milk_production (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  production_date date not null,
  animal_id uuid not null references public.animals(id) on delete cascade,
  lot_id uuid references public.lots(id),
  liters numeric(10,2) not null,
  period public.milk_period not null default 'TOTAL',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_milk_prod_tenant_date on public.milk_production(tenant_id, production_date);
create index if not exists idx_milk_prod_animal_date on public.milk_production(tenant_id, animal_id, production_date);
