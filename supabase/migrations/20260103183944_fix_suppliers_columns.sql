-- Ensure expected columns exist in public.suppliers
alter table if exists public.suppliers
  add column if not exists name text;

alter table if exists public.suppliers
  add column if not exists type public.supplier_type;

alter table if exists public.suppliers
  add column if not exists document text;

-- Make sure tenant_id exists (just in case)
alter table if exists public.suppliers
  add column if not exists tenant_id uuid references public.tenants(id);

-- Optional: indexes
create index if not exists idx_suppliers_tenant on public.suppliers(tenant_id);
create index if not exists idx_suppliers_document on public.suppliers(document);

-- Optional: avoid duplicates per tenant (safe if column exists)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'suppliers_tenant_document_uniq'
  ) then
    alter table public.suppliers
      add constraint suppliers_tenant_document_uniq unique (tenant_id, document);
  end if;
exception
  when duplicate_object then null;
end $$;

-- Force PostgREST schema reload (important for the "schema cache" error)
notify pgrst, 'reload schema';
