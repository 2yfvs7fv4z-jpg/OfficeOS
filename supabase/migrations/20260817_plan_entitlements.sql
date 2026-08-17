-- OfficeOS 1.0 plan entitlement foundation.
-- Do not apply to production until subscription/webhook flow is ready.

create table if not exists public.officeos_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'solo' check (plan in ('solo','pro','business','scale')),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','canceled','paused','development-preview')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists officeos_subscriptions_owner_idx on public.officeos_subscriptions(owner_user_id);
create index if not exists officeos_subscriptions_stripe_subscription_idx on public.officeos_subscriptions(stripe_subscription_id);

alter table public.officeos_subscriptions enable row level security;

-- Owners can read their own company subscription state. Writes should come from
-- privileged server code/webhooks, never from browser-controlled plan selectors.
drop policy if exists "owners read own OfficeOS subscriptions" on public.officeos_subscriptions;
create policy "owners read own OfficeOS subscriptions"
on public.officeos_subscriptions
for select
to authenticated
using (owner_user_id = auth.uid());

revoke insert, update, delete on public.officeos_subscriptions from anon, authenticated;
grant select on public.officeos_subscriptions to authenticated;

create or replace function public.officeos_plan_rank(plan_name text)
returns integer
language sql
immutable
as $$
  select case plan_name
    when 'solo' then 1
    when 'pro' then 2
    when 'business' then 3
    when 'scale' then 4
    else 0
  end;
$$;

-- Feature checks can be called from server-side/RLS policy helpers as more
-- normalized OfficeOS tables move out of the legacy JSON document.
create or replace function public.officeos_plan_has_feature(plan_name text, feature_name text)
returns boolean
language sql
immutable
as $$
  select case feature_name
    when 'crm' then public.officeos_plan_rank(plan_name) >= 1
    when 'jobs' then public.officeos_plan_rank(plan_name) >= 1
    when 'calendar' then public.officeos_plan_rank(plan_name) >= 1
    when 'estimates' then public.officeos_plan_rank(plan_name) >= 1
    when 'invoices' then public.officeos_plan_rank(plan_name) >= 1
    when 'payments' then public.officeos_plan_rank(plan_name) >= 1
    when 'job_files' then public.officeos_plan_rank(plan_name) >= 1
    when 'basic_ai' then public.officeos_plan_rank(plan_name) >= 1
    when 'basic_templates' then public.officeos_plan_rank(plan_name) >= 1
    when 'my_day' then public.officeos_plan_rank(plan_name) >= 2
    when 'customer_portal' then public.officeos_plan_rank(plan_name) >= 2
    when 'automations' then public.officeos_plan_rank(plan_name) >= 2
    when 'advanced_ai' then public.officeos_plan_rank(plan_name) >= 2
    when 'job_templates' then public.officeos_plan_rank(plan_name) >= 2
    when 'team_accounts' then public.officeos_plan_rank(plan_name) >= 2
    when 'expenses' then public.officeos_plan_rank(plan_name) >= 3
    when 'job_costing' then public.officeos_plan_rank(plan_name) >= 3
    when 'advanced_reports' then public.officeos_plan_rank(plan_name) >= 3
    when 'custom_permissions' then public.officeos_plan_rank(plan_name) >= 3
    when 'multi_company' then public.officeos_plan_rank(plan_name) >= 3
    when 'priority_support' then public.officeos_plan_rank(plan_name) >= 3
    when 'high_ai_limits' then public.officeos_plan_rank(plan_name) >= 4
    when 'multi_location' then public.officeos_plan_rank(plan_name) >= 4
    when 'advanced_security' then public.officeos_plan_rank(plan_name) >= 4
    else false
  end;
$$;
