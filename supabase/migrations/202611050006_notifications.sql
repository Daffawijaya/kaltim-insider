create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid references public.articles(id) on delete cascade,
  title text not null,
  message text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "users read notifications" on public.notifications for select using (user_id = auth.uid());
create policy "users update notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, update on public.notifications to authenticated;
create or replace function public.notify_article_review() returns trigger language plpgsql security definer set search_path = public as $$ declare owner_id uuid; article_title text; begin select author_id, title into owner_id, article_title from articles where id = new.article_id; insert into notifications(user_id, article_id, title, message) values(owner_id, new.article_id, 'Status tulisan: ' || replace(new.decision::text, '_', ' '), coalesce(new.note, article_title)); return new; end; $$;
create trigger article_review_notification after insert on public.article_reviews for each row execute procedure public.notify_article_review();
