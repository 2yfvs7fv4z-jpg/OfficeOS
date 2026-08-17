-- OfficeOS 1.0 team / field operations foundation.
-- Development migration only until the 1.0 branch is validated.

create table if not exists public.officeos_team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text not null,
  role text not null default 'field' check (role in ('owner','office_manager','sales','field')),
  permissions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  invite_status text not null default 'pending' check (invite_status in ('pending','invited','accepted','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists officeos_team_members_company_email_uq on public.officeos_team_members(company_id, lower(email));
create index if not exists officeos_team_members_user_idx on public.officeos_team_members(user_id) where user_id is not null;
create index if not exists officeos_team_members_company_idx on public.officeos_team_members(company_id, active);

create table if not exists public.officeos_job_assignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  job_external_id text not null,
  team_member_id uuid not null references public.officeos_team_members(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(company_id, job_external_id, team_member_id)
);
create index if not exists officeos_job_assignments_member_idx on public.officeos_job_assignments(team_member_id, job_external_id);
create index if not exists officeos_job_assignments_job_idx on public.officeos_job_assignments(company_id, job_external_id);

create table if not exists public.officeos_job_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  service text not null default '',
  packet jsonb not null default '{"sections":[],"checklist":[]}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists officeos_job_templates_company_idx on public.officeos_job_templates(company_id, active);

create table if not exists public.officeos_job_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  job_external_id text not null,
  team_member_id uuid references public.officeos_team_members(id) on delete set null,
  uploader_user_id uuid references auth.users(id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default '',
  category text not null default 'during' check (category in ('before','during','after','completed','reference')),
  caption text not null default '',
  customer_visible boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists officeos_job_files_job_idx on public.officeos_job_files(company_id, job_external_id, created_at desc);

create table if not exists public.officeos_field_audit (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  job_external_id text,
  team_member_id uuid references public.officeos_team_members(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists officeos_field_audit_company_idx on public.officeos_field_audit(company_id, created_at desc);
create index if not exists officeos_field_audit_job_idx on public.officeos_field_audit(job_external_id, created_at desc) where job_external_id is not null;

create or replace function public.officeos_is_company_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.companies c
    where c.id = p_company_id and c.owner_id = auth.uid()
  );
$$;

create or replace function public.officeos_company_role(p_company_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists(select 1 from public.companies c where c.id=p_company_id and c.owner_id=auth.uid()) then 'owner'
    else coalesce((select tm.role from public.officeos_team_members tm where tm.company_id=p_company_id and tm.user_id=auth.uid() and tm.active=true limit 1),'')
  end;
$$;

create or replace function public.officeos_is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.officeos_company_role(p_company_id) <> '';
$$;

create or replace function public.officeos_can_manage_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.officeos_company_role(p_company_id) in ('owner','office_manager');
$$;

alter table public.officeos_team_members enable row level security;
alter table public.officeos_job_assignments enable row level security;
alter table public.officeos_job_templates enable row level security;
alter table public.officeos_job_files enable row level security;
alter table public.officeos_field_audit enable row level security;

drop policy if exists "team members readable by company" on public.officeos_team_members;
create policy "team members readable by company" on public.officeos_team_members for select to authenticated using (
  public.officeos_can_manage_company(company_id) or user_id = auth.uid()
);
drop policy if exists "team members manageable by company admins" on public.officeos_team_members;
create policy "team members manageable by company admins" on public.officeos_team_members for all to authenticated using (
  public.officeos_can_manage_company(company_id)
) with check (
  public.officeos_can_manage_company(company_id)
);

drop policy if exists "job assignments readable by assigned users" on public.officeos_job_assignments;
create policy "job assignments readable by assigned users" on public.officeos_job_assignments for select to authenticated using (
  public.officeos_can_manage_company(company_id)
  or exists(select 1 from public.officeos_team_members tm where tm.id=team_member_id and tm.user_id=auth.uid() and tm.active=true)
);
drop policy if exists "job assignments manageable by company admins" on public.officeos_job_assignments;
create policy "job assignments manageable by company admins" on public.officeos_job_assignments for all to authenticated using (
  public.officeos_can_manage_company(company_id)
) with check (
  public.officeos_can_manage_company(company_id)
);

drop policy if exists "job templates readable by members" on public.officeos_job_templates;
create policy "job templates readable by members" on public.officeos_job_templates for select to authenticated using (
  public.officeos_is_company_member(company_id)
);
drop policy if exists "job templates manageable by company admins" on public.officeos_job_templates;
create policy "job templates manageable by company admins" on public.officeos_job_templates for all to authenticated using (
  public.officeos_can_manage_company(company_id)
) with check (
  public.officeos_can_manage_company(company_id)
);

drop policy if exists "job files readable by assigned users" on public.officeos_job_files;
create policy "job files readable by assigned users" on public.officeos_job_files for select to authenticated using (
  public.officeos_can_manage_company(company_id)
  or exists(
    select 1 from public.officeos_job_assignments ja
    join public.officeos_team_members tm on tm.id=ja.team_member_id
    where ja.company_id=officeos_job_files.company_id
      and ja.job_external_id=officeos_job_files.job_external_id
      and tm.user_id=auth.uid() and tm.active=true
  )
);
drop policy if exists "job files insertable by assigned users" on public.officeos_job_files;
create policy "job files insertable by assigned users" on public.officeos_job_files for insert to authenticated with check (
  public.officeos_can_manage_company(company_id)
  or exists(
    select 1 from public.officeos_job_assignments ja
    join public.officeos_team_members tm on tm.id=ja.team_member_id
    where ja.company_id=officeos_job_files.company_id
      and ja.job_external_id=officeos_job_files.job_external_id
      and tm.user_id=auth.uid() and tm.active=true
  )
);
drop policy if exists "job files manageable by admins or uploader" on public.officeos_job_files;
create policy "job files manageable by admins or uploader" on public.officeos_job_files for update to authenticated using (
  public.officeos_can_manage_company(company_id) or uploader_user_id=auth.uid()
) with check (
  public.officeos_can_manage_company(company_id) or uploader_user_id=auth.uid()
);
drop policy if exists "job files deletable by company admins" on public.officeos_job_files;
create policy "job files deletable by company admins" on public.officeos_job_files for delete to authenticated using (
  public.officeos_can_manage_company(company_id)
);

drop policy if exists "field audit insertable by members" on public.officeos_field_audit;
create policy "field audit insertable by members" on public.officeos_field_audit for insert to authenticated with check (
  user_id=auth.uid() and public.officeos_is_company_member(company_id)
);
drop policy if exists "field audit readable by company admins" on public.officeos_field_audit;
create policy "field audit readable by company admins" on public.officeos_field_audit for select to authenticated using (
  public.officeos_can_manage_company(company_id)
);

grant select,insert,update,delete on public.officeos_team_members to authenticated;
grant select,insert,update,delete on public.officeos_job_assignments to authenticated;
grant select,insert,update,delete on public.officeos_job_templates to authenticated;
grant select,insert,update,delete on public.officeos_job_files to authenticated;
grant select,insert on public.officeos_field_audit to authenticated;
grant usage,select on sequence public.officeos_field_audit_id_seq to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('officeos-job-files','officeos-job-files',false,15728640,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Storage paths use: <company_uuid>/<job_external_id>/<generated_filename>
drop policy if exists "officeos job files read" on storage.objects;
create policy "officeos job files read" on storage.objects for select to authenticated using (
  bucket_id='officeos-job-files'
  and array_length(storage.foldername(name),1)>=2
  and public.officeos_is_company_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "officeos job files upload" on storage.objects;
create policy "officeos job files upload" on storage.objects for insert to authenticated with check (
  bucket_id='officeos-job-files'
  and array_length(storage.foldername(name),1)>=2
  and (
    public.officeos_can_manage_company(((storage.foldername(name))[1])::uuid)
    or exists(
      select 1 from public.officeos_job_assignments ja
      join public.officeos_team_members tm on tm.id=ja.team_member_id
      where ja.company_id=((storage.foldername(name))[1])::uuid
        and ja.job_external_id=(storage.foldername(name))[2]
        and tm.user_id=auth.uid() and tm.active=true
    )
  )
);

drop policy if exists "officeos job files delete" on storage.objects;
create policy "officeos job files delete" on storage.objects for delete to authenticated using (
  bucket_id='officeos-job-files'
  and array_length(storage.foldername(name),1)>=2
  and public.officeos_can_manage_company(((storage.foldername(name))[1])::uuid)
);
