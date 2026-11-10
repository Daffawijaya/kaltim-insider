begin;

create table public.editor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  ukw_number text not null check (char_length(trim(ukw_number)) between 4 and 80),
  ukw_level text not null check (ukw_level in ('madya','utama')),
  ukw_issuer text not null check (char_length(trim(ukw_issuer)) between 2 and 120),
  ukw_year integer not null check (ukw_year between 2000 and extract(year from current_date)::integer),
  media_name text not null check (char_length(trim(media_name)) between 2 and 120),
  experience text not null check (char_length(trim(experience)) between 20 and 2000),
  portfolio text not null check (char_length(trim(portfolio)) between 10 and 2000),
  motivation text not null check (char_length(trim(motivation)) between 20 and 2000),
  certificate_path text not null,
  identity_path text,
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index editor_applications_one_pending
on public.editor_applications(user_id) where status = 'submitted';
create index editor_applications_status_created on public.editor_applications(status, created_at desc);

alter table public.editor_applications enable row level security;
create policy "members read own editor applications" on public.editor_applications for select to authenticated
using (user_id = auth.uid() or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "contributors submit editor applications" on public.editor_applications for insert to authenticated
with check (
  user_id = auth.uid() and status = 'submitted' and reviewed_by is null and reviewed_at is null and admin_note is null
  and certificate_path like auth.uid()::text || '/%' and identity_path like auth.uid()::text || '/%'
  and exists(select 1 from public.profiles where id = auth.uid() and role = 'contributor' and created_at <= now() - interval '30 days')
  and (select count(*) from public.articles where author_id = auth.uid() and status = 'published') >= 5
);
grant select, insert on public.editor_applications to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('editor-applications', 'editor-applications', false, 2621440, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "applicants upload editor documents" on storage.objects for insert to authenticated
with check (bucket_id = 'editor-applications' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "applicants and admins read editor documents" on storage.objects for select to authenticated
using (bucket_id = 'editor-applications' and ((storage.foldername(name))[1] = auth.uid()::text or exists(select 1 from public.profiles where id=auth.uid() and role='admin')));
create policy "applicants and admins delete editor documents" on storage.objects for delete to authenticated
using (bucket_id = 'editor-applications' and (
  exists(select 1 from public.profiles where id=auth.uid() and role='admin')
  or ((storage.foldername(name))[1] = auth.uid()::text and not exists(
    select 1 from public.editor_applications where certificate_path=name or identity_path=name
  ))
));

create function public.review_editor_application(application_id uuid, decision text, note text)
returns void language plpgsql security definer set search_path = public as $$
declare applicant uuid;
begin
  if not exists(select 1 from profiles where id=auth.uid() and role='admin') then raise exception 'admin access required'; end if;
  if decision not in ('approved','rejected') then raise exception 'invalid decision'; end if;
  if decision='rejected' and char_length(trim(coalesce(note,''))) < 10 then raise exception 'rejection note required'; end if;
  select user_id into applicant from editor_applications where id=application_id and status='submitted' for update;
  if applicant is null then raise exception 'application unavailable'; end if;
  update editor_applications set status=decision,admin_note=nullif(trim(note),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now(),identity_path=null where id=application_id;
  if decision='approved' then update profiles set role='editor' where id=applicant and role='contributor'; end if;
  insert into notifications(user_id,title,message) values(applicant,case when decision='approved' then 'Pengajuan redaktur diterima' else 'Pengajuan redaktur ditolak' end,case when decision='approved' then 'Selamat, akses redakturmu telah aktif.' else coalesce(nullif(trim(note),''),'Pengajuanmu belum dapat diterima.') end);
end; $$;
revoke all on function public.review_editor_application(uuid,text,text) from public;
grant execute on function public.review_editor_application(uuid,text,text) to authenticated;

commit;
