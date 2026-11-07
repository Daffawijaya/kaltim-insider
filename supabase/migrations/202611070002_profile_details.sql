begin;

alter table public.profiles
  add column if not exists gender text check (gender in ('Laki-laki', 'Perempuan', 'Lainnya')),
  add column if not exists birth_date date,
  add column if not exists country text not null default 'Indonesia',
  add column if not exists province text not null default 'Kalimantan Timur';

grant update (gender, birth_date, country, province) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 2097152, array['image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "profile avatars public read" on storage.objects for select using (bucket_id = 'profile-avatars');
create policy "owners upload profile avatars" on storage.objects for insert to authenticated
with check (bucket_id = 'profile-avatars' and name = auth.uid()::text || '/avatar.webp');
create policy "owners update profile avatars" on storage.objects for update to authenticated
using (bucket_id = 'profile-avatars' and owner_id = auth.uid()::text)
with check (bucket_id = 'profile-avatars' and name = auth.uid()::text || '/avatar.webp');

commit;
