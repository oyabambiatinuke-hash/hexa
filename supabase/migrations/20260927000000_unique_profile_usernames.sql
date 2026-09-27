-- Enforce globally unique usernames regardless of capitalization or surrounding spaces.
-- Existing duplicate usernames must be resolved before this migration can succeed.
create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(btrim(username)))
  where username is not null and btrim(username) <> '';

create or replace function public.hexa_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_username ~ '^[a-z0-9_]{3,24}$'
    and not exists (
      select 1
      from public.profiles
      where lower(btrim(username)) = lower(btrim(p_username))
    );
$$;

revoke all on function public.hexa_username_available(text) from public;
grant execute on function public.hexa_username_available(text) to anon, authenticated;
