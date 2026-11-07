begin;

update public.categories set name = 'Daerah', slug = 'daerah' where slug = 'kota';
update public.categories set name = 'Wisata & Budaya', slug = 'wisata-budaya' where slug = 'budaya';
update public.articles
set category_id = (select id from public.categories where slug = 'wisata-budaya')
where category_id = (select id from public.categories where slug = 'wisata');
delete from public.categories where slug = 'wisata';
update public.categories set name = 'Pemuda', slug = 'pemuda' where slug = 'gaya-hidup';

insert into public.categories (name, slug) values
  ('Pemerintahan', 'pemerintahan'),
  ('Kesehatan', 'kesehatan'),
  ('Infrastruktur', 'infrastruktur'),
  ('Lingkungan', 'lingkungan')
on conflict (slug) do update set name = excluded.name;

commit;
