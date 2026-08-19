create table if not exists public.customer_estimate_approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  portal_link_id uuid not null references public.customer_portal_links(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  estimate_ref text not null,
  estimate_number text,
  customer_name text not null,
  decision text not null check (decision in ('approved','declined')),
  signer_name text,
  signed_at timestamptz not null default now(),
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists customer_estimate_approvals_company_idx on public.customer_estimate_approvals(company_id, signed_at desc);
create index if not exists customer_estimate_approvals_estimate_idx on public.customer_estimate_approvals(owner_id, estimate_ref, signed_at desc);
alter table public.customer_estimate_approvals enable row level security;
grant select on public.customer_estimate_approvals to authenticated;
create policy "owners can view customer approvals" on public.customer_estimate_approvals for select to authenticated using (owner_id = auth.uid());