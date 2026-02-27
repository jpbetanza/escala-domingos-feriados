-- Vendors
create table if not exists escala_vendors (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (id, user_id)
);
alter table escala_vendors enable row level security;
create policy "Users own their vendors" on escala_vendors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Holidays
create table if not exists escala_holidays (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  date text not null,
  name text not null,
  primary key (id, user_id)
);
alter table escala_holidays enable row level security;
create policy "Users own their holidays" on escala_holidays
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Schedules (metadata per year)
create table if not exists escala_schedules (
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  vendors_per_day integer not null check (vendors_per_day in (2,3)),
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);
alter table escala_schedules enable row level security;
create policy "Users own their schedules" on escala_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Entries (one row per schedule date)
create table if not exists escala_entries (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  date text not null,
  type text not null check (type in ('sunday','holiday')),
  vendor_ids text[] not null default '{}',
  closed boolean not null default false,
  locked boolean not null default false,
  note text,
  primary key (id, user_id),
  unique (user_id, year, date)
);
alter table escala_entries enable row level security;
create policy "Users own their entries" on escala_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
