create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invoice_ref text not null,
  invoice_number text,
  customer_name text,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'usd',
  status text not null default 'succeeded' check (status in ('pending','succeeded','failed','refunded','partially_refunded')),
  method text,
  source text not null default 'manual',
  provider text,
  provider_payment_id text,
  paid_at timestamptz not null default now(),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists invoice_payments_provider_unique on public.invoice_payments(provider,provider_payment_id) where provider_payment_id is not null;
create index if not exists invoice_payments_invoice_idx on public.invoice_payments(owner_id,invoice_ref,paid_at desc);
create index if not exists invoice_payments_company_idx on public.invoice_payments(company_id,paid_at desc);
alter table public.invoice_payments enable row level security;
grant select,insert,update on public.invoice_payments to authenticated;
create policy "owners can read invoice payments" on public.invoice_payments for select to authenticated using (owner_id=auth.uid());
create policy "owners can record invoice payments" on public.invoice_payments for insert to authenticated with check (owner_id=auth.uid() and exists(select 1 from public.companies c where c.id=company_id and c.owner_id=auth.uid()));
create policy "owners can update invoice payments" on public.invoice_payments for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());