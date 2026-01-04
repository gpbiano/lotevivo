-- 1) Profile 1:1 com tenant
create table if not exists public.tenant_profiles (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,

  person_type text not null check (person_type in ('PJ','PF')),

  -- Documento principal do tenant: CNPJ (PJ) ou CPF (PF)
  document text not null,

  -- PJ
  legal_name text,
  trade_name text,
  state_registration text,

  -- Responsável
  responsible_name text,
  responsible_document text,

  -- Contato
  email text,
  phone text,
  marketing_opt_in boolean not null default false,

  -- Logo (Storage)
  logo_path text,
  logo_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tenant_profiles_document_len check (length(document) >= 5),
  constraint tenant_profiles_email_format check (email is null or position('@' in email) > 1)
);

create index if not exists idx_tenant_profiles_tenant on public.tenant_profiles(tenant_id);

-- 2) Endereços (Fiscal / Produção)
create table if not exists public.tenant_addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,

  address_type text not null check (address_type in ('FISCAL','PRODUCTION')),

  zip_code text,
  street text,
  number text,
  district text,
  city text,
  state text,
  complement text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tenant_addresses_unique_type unique (tenant_id, address_type)
);

create index if not exists idx_tenant_addresses_tenant on public.tenant_addresses(tenant_id);

-- 3) updated_at trigger helper (se já existir, ok sobrescrever)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tenant_profiles_updated_at on public.tenant_profiles;
create trigger trg_tenant_profiles_updated_at
before update on public.tenant_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_tenant_addresses_updated_at on public.tenant_addresses;
create trigger trg_tenant_addresses_updated_at
before update on public.tenant_addresses
for each row execute function public.set_updated_at();

-- 4) Storage bucket para logos
-- (bucket público: facilita mostrar o logo no frontend via URL)
insert into storage.buckets (id, name, public)
values ('tenant-logos', 'tenant-logos', true)
on conflict (id) do update set public = excluded.public;

-- Force PostgREST schema reload
notify pgrst, 'reload schema';
