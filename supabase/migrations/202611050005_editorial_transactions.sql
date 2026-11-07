create or replace function public.review_article(
  target_id uuid,
  next_status public.article_status,
  review_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.article_status;
  article_title text;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('editor','admin')) then
    raise exception 'editor access required';
  end if;
  if next_status not in ('revision','approved','published','rejected','archived') then
    raise exception 'invalid decision';
  end if;
  if next_status in ('revision','rejected') and length(trim(coalesce(review_note,''))) < 10 then
    raise exception 'review note is required';
  end if;

  select status, title into current_status, article_title from articles where id = target_id for update;
  if not found or current_status not in ('submitted','in_review','revision','approved','published') then
    raise exception 'article cannot move from this status';
  end if;

  update articles set
    status = next_status,
    editor_id = auth.uid(),
    published_at = case when next_status = 'published' then coalesce(published_at, now()) else published_at end,
    slug = case when next_status = 'published' then coalesce(slug, regexp_replace(lower(article_title), '[^a-z0-9]+', '-', 'g') || '-' || left(target_id::text, 6)) else slug end
  where id = target_id;

  insert into article_reviews(article_id, reviewer_id, decision, note)
  values(target_id, auth.uid(), next_status, nullif(trim(review_note),''));
end;
$$;

revoke all on function public.review_article(uuid, public.article_status, text) from public;
grant execute on function public.review_article(uuid, public.article_status, text) to authenticated;

create or replace function public.increment_article_view(article_slug text)
returns void language sql security definer set search_path = public
as $$ update articles set view_count = view_count + 1 where slug = article_slug and status = 'published'; $$;
grant execute on function public.increment_article_view(text) to anon, authenticated;
