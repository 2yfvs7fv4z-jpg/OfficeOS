-- OfficeOS secure team workspace alignment.
-- Mirrors the production-safe changes applied through the Supabase project.

-- Correct member company visibility.
drop policy if exists "Members can view their companies" on public.companies;
create policy "Members can view their companies"
on public.companies
for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.company_memberships m
    where m.company_id = companies.id
      and m.user_id = auth.uid()
      and m.active = true
  )
);

grant select on public.companies to authenticated;
grant select on public.company_memberships to authenticated;
grant update(active) on public.company_memberships to authenticated;
grant select on public.company_invites to authenticated;
grant select on public.field_jobs to authenticated;
grant select on public.field_job_assignments to authenticated;

-- Completion evidence stored separately from the owner's legacy JSON document.
create table if not exists public.field_job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.field_jobs(id) on delete cascade,
  membership_id uuid not null references public.company_memberships(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default 'image/jpeg',
  category text not null default 'after' check (category in ('before','during','after','completed')),
  caption text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists field_job_photos_job_idx on public.field_job_photos(job_id,created_at desc);
alter table public.field_job_photos enable row level security;

drop policy if exists "Field job photos readable by relevant team" on public.field_job_photos;
create policy "Field job photos readable by relevant team"
on public.field_job_photos for select to authenticated
using (
  exists (
    select 1 from public.field_jobs j
    join public.companies c on c.id=j.company_id
    where j.id=field_job_photos.job_id and c.owner_id=auth.uid()
  )
  or exists (
    select 1 from public.field_jobs j
    join public.company_memberships m on m.company_id=j.company_id
    where j.id=field_job_photos.job_id and m.user_id=auth.uid() and m.active=true and m.role='office_manager'
  )
  or exists (
    select 1 from public.field_job_assignments a
    join public.company_memberships m on m.id=a.membership_id
    where a.job_id=field_job_photos.job_id and m.user_id=auth.uid() and m.active=true
  )
);

drop policy if exists "Assigned team can add field job photos" on public.field_job_photos;
create policy "Assigned team can add field job photos"
on public.field_job_photos for insert to authenticated
with check (
  exists (
    select 1 from public.field_job_assignments a
    join public.company_memberships m on m.id=a.membership_id
    where a.job_id=field_job_photos.job_id
      and m.id=field_job_photos.membership_id
      and m.user_id=auth.uid() and m.active=true
  )
  or exists (
    select 1 from public.field_jobs j
    join public.companies c on c.id=j.company_id
    where j.id=field_job_photos.job_id and c.owner_id=auth.uid()
  )
);

drop policy if exists "Admins can delete field job photos" on public.field_job_photos;
create policy "Admins can delete field job photos"
on public.field_job_photos for delete to authenticated
using (
  exists (
    select 1 from public.field_jobs j
    join public.companies c on c.id=j.company_id
    where j.id=field_job_photos.job_id and c.owner_id=auth.uid()
  )
  or exists (
    select 1 from public.field_jobs j
    join public.company_memberships m on m.company_id=j.company_id
    where j.id=field_job_photos.job_id and m.user_id=auth.uid() and m.active=true and m.role='office_manager'
  )
);

grant select,insert,delete on public.field_job_photos to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('field-job-photos','field-job-photos',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Storage path: <field_job_uuid>/<auth_user_uuid>/<filename>
drop policy if exists "Field job evidence read" on storage.objects;
create policy "Field job evidence read" on storage.objects for select to authenticated
using (
  bucket_id='field-job-photos'
  and array_length(storage.foldername(name),1)>=2
  and (
    exists (
      select 1 from public.field_jobs j
      join public.companies c on c.id=j.company_id
      where j.id=((storage.foldername(name))[1])::uuid and c.owner_id=auth.uid()
    )
    or exists (
      select 1 from public.field_jobs j
      join public.company_memberships m on m.company_id=j.company_id
      where j.id=((storage.foldername(name))[1])::uuid and m.user_id=auth.uid() and m.active=true and m.role='office_manager'
    )
    or exists (
      select 1 from public.field_job_assignments a
      join public.company_memberships m on m.id=a.membership_id
      where a.job_id=((storage.foldername(name))[1])::uuid and m.user_id=auth.uid() and m.active=true
    )
  )
);

drop policy if exists "Field job evidence upload" on storage.objects;
create policy "Field job evidence upload" on storage.objects for insert to authenticated
with check (
  bucket_id='field-job-photos'
  and array_length(storage.foldername(name),1)>=2
  and (storage.foldername(name))[2]=auth.uid()::text
  and exists (
    select 1 from public.field_job_assignments a
    join public.company_memberships m on m.id=a.membership_id
    where a.job_id=((storage.foldername(name))[1])::uuid and m.user_id=auth.uid() and m.active=true
  )
);

drop policy if exists "Field job evidence delete own upload" on storage.objects;
create policy "Field job evidence delete own upload" on storage.objects for delete to authenticated
using (
  bucket_id='field-job-photos'
  and array_length(storage.foldername(name),1)>=2
  and (storage.foldername(name))[2]=auth.uid()::text
);

-- Narrow field-worker mutations to safe RPCs instead of broad UPDATE grants.
create or replace function public.officeos_toggle_field_checklist(p_job_id uuid,p_item_id text)
returns public.field_jobs
language plpgsql
security definer
set search_path=public
as $$
declare
  v_job public.field_jobs;
  v_packet jsonb;
  v_list jsonb;
  v_allowed boolean;
begin
  select j.* into v_job from public.field_jobs j where j.id=p_job_id;
  if not found then raise exception 'Job not found.'; end if;
  select exists(
    select 1 from public.companies c where c.id=v_job.company_id and c.owner_id=auth.uid()
  ) or exists(
    select 1 from public.field_job_assignments a join public.company_memberships m on m.id=a.membership_id
    where a.job_id=v_job.id and m.user_id=auth.uid() and m.active=true
  ) into v_allowed;
  if not v_allowed then raise exception 'This job is not assigned to you.'; end if;
  v_packet=coalesce(v_job.job_packet,'{}'::jsonb);
  if jsonb_typeof(v_packet->'checklist') <> 'array' then raise exception 'This job has no checklist.'; end if;
  select jsonb_agg(case when coalesce(item->>'id','')=p_item_id then jsonb_set(item,'{done}',to_jsonb(not coalesce((item->>'done')::boolean,false)),true) else item end)
    into v_list from jsonb_array_elements(v_packet->'checklist') item;
  v_packet=jsonb_set(v_packet,'{checklist}',coalesce(v_list,'[]'::jsonb),true);
  update public.field_jobs set job_packet=v_packet,updated_at=now() where id=v_job.id returning * into v_job;
  return v_job;
end;
$$;
revoke all on function public.officeos_toggle_field_checklist(uuid,text) from public,anon;
grant execute on function public.officeos_toggle_field_checklist(uuid,text) to authenticated;

create or replace function public.officeos_set_field_job_status(p_job_id uuid, p_status text)
returns public.field_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.field_jobs;
  v_role text;
  v_require_photo boolean;
  v_require_checklist boolean;
  v_missing integer;
begin
  if p_status not in ('Scheduled','On My Way','Arrived','In Progress','Waiting','Complete') then raise exception 'That job status is not allowed.'; end if;
  select j.* into v_job from public.field_jobs j where j.id=p_job_id;
  if not found then raise exception 'Job not found.'; end if;
  select case when exists(select 1 from public.companies c where c.id=v_job.company_id and c.owner_id=auth.uid()) then 'owner' else coalesce((select m.role from public.company_memberships m where m.company_id=v_job.company_id and m.user_id=auth.uid() and m.active=true limit 1),'') end into v_role;
  if v_role in ('owner','office_manager') then null;
  elsif v_role in ('field','sales') then
    if not exists(select 1 from public.field_job_assignments a join public.company_memberships m on m.id=a.membership_id where a.job_id=v_job.id and m.user_id=auth.uid() and m.active=true) then raise exception 'This job is not assigned to you.'; end if;
    if p_status='Complete' then
      v_require_photo=coalesce((v_job.job_packet->'completionRequirements'->>'requirePhoto')::boolean,false);
      v_require_checklist=coalesce((v_job.job_packet->'completionRequirements'->>'requireChecklist')::boolean,false);
      if v_require_photo and not exists(select 1 from public.field_job_photos p where p.job_id=v_job.id and p.category in ('after','completed')) then raise exception 'A completed-work photo is required before closing this job.'; end if;
      if v_require_checklist and jsonb_typeof(v_job.job_packet->'checklist')='array' then
        select count(*) into v_missing from jsonb_array_elements(v_job.job_packet->'checklist') item where coalesce((item->>'required')::boolean,true)=true and coalesce((item->>'done')::boolean,false)=false;
        if v_missing>0 then raise exception '% required checklist item(s) still need completed.',v_missing; end if;
      end if;
    end if;
  else raise exception 'You do not have access to this job.'; end if;
  update public.field_jobs set status=p_status,updated_at=now() where id=v_job.id returning * into v_job;
  return v_job;
end;
$$;
revoke all on function public.officeos_set_field_job_status(uuid,text) from public,anon;
grant execute on function public.officeos_set_field_job_status(uuid,text) to authenticated;

-- Normalize every legacy JSON company into the secure registry.
insert into public.companies(owner_id,name,external_ref)
select d.user_id,
       left(coalesce(nullif(trim(c->>'name'),''),'OfficeOS Business'),200),
       c->>'id'
from public.officeos_data d
cross join lateral jsonb_array_elements(coalesce(d.data->'companies','[]'::jsonb)) c
where nullif(trim(c->>'id'),'') is not null
on conflict (owner_id,external_ref) where external_ref is not null
do update set name=excluded.name;

insert into public.company_memberships(company_id,user_id,role,active,permissions)
select c.id,c.owner_id,'owner',true,'["*"]'::jsonb
from public.companies c
on conflict(company_id,user_id)
do update set role='owner',active=true,permissions='["*"]'::jsonb,updated_at=now();
