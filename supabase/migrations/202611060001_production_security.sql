begin;

alter table public.articles add column is_advertorial boolean not null default false;
-- Preserve existing work while retiring the two inactive workflow states.
update public.articles set status = 'submitted' where status = 'in_review';
update public.articles set status = 'approved' where status = 'scheduled';

create table public.site_configuration (
  singleton boolean primary key default true check (singleton),
  storage_origin text not null check (storage_origin ~ '^https?://[^/]+$')
);
alter table public.site_configuration enable row level security;
revoke all on public.site_configuration from public, anon, authenticated;
-- Configure the trusted Storage origin through the SQL editor before accepting uploads.

drop policy "authors create articles" on public.articles;
drop policy "authors edit drafts" on public.articles;
drop policy "editors manage articles" on public.articles;
create policy "authors create articles" on public.articles for insert to authenticated
with check (author_id = auth.uid() and status in ('draft','submitted')
  and not is_featured and not is_advertorial and editor_id is null
  and slug is null and published_at is null and view_count = 0);
create policy "authors edit drafts" on public.articles for update to authenticated
using (author_id = auth.uid() and status in ('draft','revision'))
with check (author_id = auth.uid() and status in ('draft','submitted'));
create policy "editors manage articles" on public.articles for all to authenticated
using (exists(select 1 from public.profiles where id = auth.uid() and role in ('editor','admin')))
with check (exists(select 1 from public.profiles where id = auth.uid() and role in ('editor','admin')));

-- REST writes get only author-editable fields. Editorial fields are written by the RPC.
revoke all on public.articles from public, anon, authenticated;
grant select on public.articles to anon, authenticated;
grant insert (author_id,title,excerpt,body,location,cover_url,category_id,status,submitted_at)
  on public.articles to authenticated;
grant update (title,excerpt,body,location,cover_url,category_id,status,submitted_at)
  on public.articles to authenticated;

create function public.validate_article_image() returns trigger
language plpgsql security definer set search_path = '' as $$
declare origin text; object_path text; prefix text;
begin
  if new.cover_url is null or (tg_op = 'UPDATE' and new.cover_url is not distinct from old.cover_url) then return new; end if;
  select storage_origin into origin from public.site_configuration where singleton;
  prefix := origin || '/storage/v1/object/public/article-images/';
  if origin is null or left(new.cover_url, length(prefix)) <> prefix then
    raise exception 'invalid article image';
  end if;
  object_path := substring(new.cover_url from length(prefix) + 1);
  if object_path !~ ('^' || new.author_id::text || '/[a-zA-Z0-9-]+\.webp$')
    or not exists (select 1 from storage.objects where bucket_id = 'article-images'
      and name = object_path and owner_id = new.author_id::text) then
    raise exception 'invalid article image owner';
  end if;
  return new;
end; $$;
create trigger articles_validate_image before insert or update on public.articles
for each row execute function public.validate_article_image();

-- Active images cannot be deleted or overwritten through Storage REST, even by their owner.
create function public.article_image_in_use(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.articles where cover_url like '%/article-images/' || object_name);
$$;
revoke all on function public.article_image_in_use(text) from public;
grant execute on function public.article_image_in_use(text) to authenticated;
drop policy "owners update article images" on storage.objects;
drop policy "owners delete article images" on storage.objects;
create policy "owners delete unused article images" on storage.objects for delete to authenticated
using (bucket_id = 'article-images' and owner_id = auth.uid()::text
  and not public.article_image_in_use(name));

drop function public.review_article(uuid, public.article_status, text);
create function public.review_article(
  target_id uuid, next_status public.article_status, expected_status public.article_status,
  review_note text default null, advertorial boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
declare current_status public.article_status; article_title text;
begin
  if not exists(select 1 from public.profiles where id = auth.uid() and role in ('editor','admin')) then
    raise exception 'editor access required';
  end if;
  select status, title into current_status, article_title from public.articles where id = target_id for update;
  if not found then raise exception 'article not found'; end if;
  if expected_status is null or current_status <> expected_status then
    raise exception using errcode = '40001', message = 'editorial conflict';
  end if;
  if not ((current_status = 'submitted' and next_status in ('revision','approved','published','rejected'))
    or (current_status = 'approved' and next_status in ('revision','published','rejected'))
    or (current_status = 'published' and next_status = 'archived')) then
    raise exception 'invalid editorial transition';
  end if;
  if next_status in ('revision','rejected') and length(trim(coalesce(review_note,''))) < 10 then
    raise exception 'review note is required';
  end if;
  update public.articles set status = next_status, editor_id = auth.uid(), is_advertorial = advertorial,
    published_at = case when next_status = 'published' then coalesce(published_at, now()) else published_at end,
    slug = case when next_status = 'published' then coalesce(slug, trim(both '-' from regexp_replace(lower(article_title), '[^a-z0-9]+', '-', 'g')) || '-' || target_id::text) else slug end
  where id = target_id;
  insert into public.article_reviews(article_id, reviewer_id, decision, note)
  values(target_id, auth.uid(), next_status, nullif(trim(review_note),''));
end; $$;
revoke all on function public.review_article(uuid,public.article_status,public.article_status,text,boolean) from public;
grant execute on function public.review_article(uuid,public.article_status,public.article_status,text,boolean) to authenticated;

create or replace function public.set_profile_role(target_id uuid, new_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize role changes before checking both caller authority and the final admin count.
  perform pg_advisory_xact_lock(60461106);
  if not exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'admin access required';
  end if;
  if new_role is null then raise exception 'invalid role'; end if;
  if new_role <> 'admin' and exists(select 1 from public.profiles where id = target_id and role = 'admin')
    and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception using errcode = 'P0001', message = 'last admin';
  end if;
  update public.profiles set role = new_role where id = target_id;
  if not found then raise exception 'profile not found'; end if;
end; $$;

revoke all on function public.increment_article_view(text) from public, anon, authenticated;
-- Notification content is generated by the database, never editable through REST.
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke all on public.article_reviews from public, anon, authenticated;
grant select on public.article_reviews to authenticated;
commit;
