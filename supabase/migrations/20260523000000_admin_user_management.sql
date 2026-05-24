-- Admin allowlist and user profile index for cross-user schedule management.

create table if not exists escala_admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

insert into escala_admins (email)
values ('jpbetanza@gmail.com')
on conflict (email) do nothing;

create table if not exists escala_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create or replace function is_escala_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from escala_admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function sync_escala_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into escala_user_profiles (user_id, email, avatar_url, updated_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    now()
  )
  on conflict (user_id) do update
    set email = excluded.email,
        avatar_url = excluded.avatar_url,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_escala_user_profile_on_auth_user on auth.users;
create trigger sync_escala_user_profile_on_auth_user
  after insert or update of email, raw_user_meta_data on auth.users
  for each row
  execute function sync_escala_user_profile();

insert into escala_user_profiles (user_id, email, avatar_url, updated_at)
select
  id,
  email,
  raw_user_meta_data ->> 'avatar_url',
  now()
from auth.users
on conflict (user_id) do update
  set email = excluded.email,
      avatar_url = excluded.avatar_url,
      updated_at = now();

alter table escala_admins enable row level security;
alter table escala_user_profiles enable row level security;

drop policy if exists "Admins view admin list" on escala_admins;
create policy "Admins view admin list" on escala_admins
  for select using (is_escala_admin());

drop policy if exists "Users view own profile" on escala_user_profiles;
create policy "Users view own profile" on escala_user_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "Admins view all profiles" on escala_user_profiles;
create policy "Admins view all profiles" on escala_user_profiles
  for select using (is_escala_admin());

drop policy if exists "Admins manage all vendors" on escala_vendors;
create policy "Admins manage all vendors" on escala_vendors
  for all using (is_escala_admin()) with check (is_escala_admin());

drop policy if exists "Admins manage all holidays" on escala_holidays;
create policy "Admins manage all holidays" on escala_holidays
  for all using (is_escala_admin()) with check (is_escala_admin());

drop policy if exists "Admins manage all schedules" on escala_schedules;
create policy "Admins manage all schedules" on escala_schedules
  for all using (is_escala_admin()) with check (is_escala_admin());

drop policy if exists "Admins manage all entries" on escala_entries;
create policy "Admins manage all entries" on escala_entries
  for all using (is_escala_admin()) with check (is_escala_admin());

grant select on escala_admins to authenticated;
grant select on escala_user_profiles to authenticated;
grant execute on function is_escala_admin() to authenticated;
