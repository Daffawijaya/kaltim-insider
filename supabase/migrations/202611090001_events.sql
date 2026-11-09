begin;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 120),
  organizer text not null check (char_length(trim(organizer)) between 2 and 120),
  description text not null check (char_length(trim(description)) between 10 and 2000),
  requirements text not null check (char_length(trim(requirements)) between 10 and 4000),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.articles add column event_id uuid references public.events(id) on delete set null;
create index events_period_idx on public.events (starts_on, ends_on);
create index event_participants_user_idx on public.event_participants (user_id, event_id);
create index articles_event_idx on public.articles (event_id) where event_id is not null;

alter table public.events enable row level security;
alter table public.event_participants enable row level security;

create policy "authenticated read events" on public.events for select to authenticated using (true);
create policy "admins create events" on public.events for insert to authenticated
with check (created_by = auth.uid() and exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "admins update events" on public.events for update to authenticated
using (exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "admins delete events" on public.events for delete to authenticated
using (exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "members read own participation" on public.event_participants for select to authenticated
using (user_id = auth.uid() or exists(select 1 from public.profiles where id = auth.uid() and role in ('editor','admin')));
create policy "members join active events" on public.event_participants for insert to authenticated
with check (user_id = auth.uid() and exists(
  select 1 from public.events where id = event_id and current_date between starts_on and ends_on
));
create policy "members leave events" on public.event_participants for delete to authenticated using (user_id = auth.uid());

grant select on public.events to authenticated;
grant insert, update, delete on public.events to authenticated;
grant select, insert, delete on public.event_participants to authenticated;
grant insert (event_id) on public.articles to authenticated;
grant update (event_id) on public.articles to authenticated;

create function public.validate_article_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.event_id is null then return new; end if;
  if not exists (
    select 1 from public.events e
    join public.event_participants p on p.event_id = e.id and p.user_id = new.author_id
    where e.id = new.event_id and current_date between e.starts_on and e.ends_on
  ) then
    raise exception 'active joined event required';
  end if;
  return new;
end; $$;

create trigger articles_validate_event before insert or update of event_id on public.articles
for each row execute function public.validate_article_event();

commit;
