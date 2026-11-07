insert into public.categories (name, slug) values
  ('Kota', 'kota'),
  ('Ekonomi', 'ekonomi'),
  ('Pendidikan', 'pendidikan'),
  ('Budaya', 'budaya'),
  ('Wisata', 'wisata'),
  ('Gaya Hidup', 'gaya-hidup'),
  ('Opini', 'opini')
on conflict (slug) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    null
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-images', 'article-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "article images public read"
on storage.objects for select
using (bucket_id = 'article-images');

create policy "authenticated article image upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'article-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owners update article images"
on storage.objects for update to authenticated
using (bucket_id = 'article-images' and owner_id = auth.uid()::text);

create policy "owners delete article images"
on storage.objects for delete to authenticated
using (bucket_id = 'article-images' and owner_id = auth.uid()::text);
