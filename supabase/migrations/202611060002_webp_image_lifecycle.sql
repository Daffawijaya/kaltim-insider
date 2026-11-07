begin;

update storage.buckets
set allowed_mime_types = array['image/webp']
where id = 'article-images';

drop policy "authenticated article image upload" on storage.objects;
create policy "authenticated WebP article image upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'article-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) = 'webp'
  and name ~ ('^' || auth.uid()::text || '/[a-zA-Z0-9-]+\.webp$')
);

commit;
