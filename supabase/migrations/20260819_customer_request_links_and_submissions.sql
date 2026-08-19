create table if not exists public.customer_request_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'active' check (status in ('active','revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  request_link_id uuid references public.customer_request_links(id) on delete set null,
  customer_name text not null,
  email text,
  phone text,
  address text,
  service text,
  description text,
  timing text,
  measurements text,
  budget text,
  ai_estimate jsonb,
  ai_status text not null default 'pending' check (ai_status in ('pending','drafted','needs_input','failed')),
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_request_links enable row level security;
alter table public.customer_requests enable row level security;

grant select, insert, update, delete on public.customer_request_links to authenticated;
grant select, update on public.customer_requests to authenticated;

create policy "owners manage request links" on public.customer_request_links
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners read request submissions" on public.customer_requests
for select to authenticated
using (owner_id = auth.uid());

create policy "owners update request submissions" on public.customer_requests
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create index if not exists customer_request_links_owner_company_idx on public.customer_request_links(owner_id, company_id);
create index if not exists customer_requests_owner_import_idx on public.customer_requests(owner_id, imported_at, created_at desc);
