alter table public.articles
  add column if not exists is_featured boolean not null default false,
  add column if not exists view_count bigint not null default 0,
  add column if not exists scheduled_at timestamptz,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

create index if not exists articles_public_feed_idx
  on public.articles (published_at desc)
  where status = 'published';
create index if not exists articles_author_status_idx
  on public.articles (author_id, status, updated_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
before update on public.articles
for each row execute procedure public.set_updated_at();

create policy "editors create reviews"
on public.article_reviews for insert to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('editor', 'admin')
  )
);

create policy "editors update profiles"
on public.profiles for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

grant usage on schema public to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select, insert, update on public.articles to authenticated;
grant select on public.articles to anon;
grant select, insert on public.article_reviews to authenticated;

create policy "authors read article reviews"
on public.article_reviews for select
using (exists (
  select 1 from public.articles a
  where a.id = article_id and a.author_id = auth.uid()
));

create policy "editors read article reviews"
on public.article_reviews for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('editor', 'admin')
));
