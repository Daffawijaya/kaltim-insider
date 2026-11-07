begin;

insert into public.categories (name, slug) values
  ('Daerah', 'daerah'),
  ('Ekonomi', 'ekonomi'),
  ('Pendidikan', 'pendidikan'),
  ('Kesehatan', 'kesehatan'),
  ('Teknologi', 'teknologi'),
  ('Lingkungan', 'lingkungan'),
  ('Wisata & Budaya', 'wisata-budaya'),
  ('Gaya Hidup', 'gaya-hidup'),
  ('Komunitas', 'komunitas'),
  ('Opini', 'opini')
on conflict (slug) do update set name = excluded.name;

update public.articles set category_id = (select id from public.categories where slug = 'daerah')
where category_id in (select id from public.categories where slug in ('kota', 'pemerintahan', 'infrastruktur'));
update public.articles set category_id = (select id from public.categories where slug = 'wisata-budaya')
where category_id in (select id from public.categories where slug in ('budaya', 'wisata'));
update public.articles set category_id = (select id from public.categories where slug = 'gaya-hidup')
where category_id = (select id from public.categories where slug = 'pemuda');

delete from public.categories where slug in ('kota', 'pemerintahan', 'infrastruktur', 'budaya', 'wisata', 'pemuda');

commit;
