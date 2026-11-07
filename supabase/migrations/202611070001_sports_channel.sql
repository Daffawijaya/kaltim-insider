begin;

insert into public.categories (name, slug) values ('Olahraga', 'olahraga')
on conflict (slug) do update set name = excluded.name;

update public.articles set category_id = (select id from public.categories where slug = 'gaya-hidup')
where category_id = (select id from public.categories where slug = 'komunitas');

delete from public.categories where slug = 'komunitas';

commit;
