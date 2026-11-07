-- Contributors may edit their public profile fields, never their own role.
revoke update on public.profiles from authenticated;
grant update (full_name, username, city, avatar_url, bio) on public.profiles to authenticated;

create or replace function public.set_profile_role(target_id uuid, new_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'admin access required';
  end if;
  update public.profiles set role = new_role where id = target_id;
end;
$$;

revoke all on function public.set_profile_role(uuid, public.user_role) from public;
grant execute on function public.set_profile_role(uuid, public.user_role) to authenticated;

-- Storage itself enforces the application's WebP-only image contract.
update storage.buckets
set allowed_mime_types = array['image/webp']
where id = 'article-images';
