-- DMG Service Kundenportal - Initial Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================
-- PROFILES TABLE
-- ============================================
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for profiles
alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = user_id);

-- ============================================
-- OBJECTS TABLE
-- ============================================
create table if not exists objects (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  street text,
  postal_code text,
  city text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table objects enable row level security;

create policy "Users can view their own objects"
  on objects for select
  using (profile_id in (select id from profiles where user_id = auth.uid()));

create policy "Users can insert objects for their profile"
  on objects for insert
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

create policy "Users can update their own objects"
  on objects for update
  using (profile_id in (select id from profiles where user_id = auth.uid()));

create policy "Users can delete their own objects"
  on objects for delete
  using (profile_id in (select id from profiles where user_id = auth.uid()));

-- ============================================
-- ASSETS TABLE
-- ============================================
create table if not exists assets (
  id uuid primary key default uuid_generate_v4(),
  object_id uuid references objects(id) on delete cascade not null,
  name text not null,
  category text not null, -- Balkonkraftwerk, Wärmepumpe, Entsalzungsanlage, etc.
  manufacturer text,
  model text,
  serial_number text,
  year_built integer,
  capacity text,
  filter_type text,
  last_maintenance date,
  maintenance_interval_months integer default 12,
  next_maintenance_due date, -- can be computed via trigger or app
  image_url text,
  ai_analysis jsonb,
  ai_suggested_fields jsonb,
  ai_confidence numeric(3,2),
  user_confirmed boolean default false,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table assets enable row level security;

create policy "Users can view assets of their objects"
  on assets for select
  using (object_id in (
    select o.id from objects o
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

create policy "Users can insert assets for their objects"
  on assets for insert
  with check (object_id in (
    select o.id from objects o
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

create policy "Users can update assets of their objects"
  on assets for update
  using (object_id in (
    select o.id from objects o
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

create policy "Users can delete assets of their objects"
  on assets for delete
  using (object_id in (
    select o.id from objects o
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  object_id uuid references objects(id) on delete cascade not null,
  service_type text not null, -- Wartung, Filterwechsel, Reparatur, Montage, Smart-Home, Sonstiges
  preferred_date date not null,
  time_window text, -- e.g. "Vormittag", "14:00-16:00"
  urgency text default 'normal' check (urgency in ('normal', 'high', 'emergency')),
  description text,
  status text default 'requested' check (status in ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  customer_notes text,
  internal_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table appointments enable row level security;

create policy "Users can view appointments for their objects"
  on appointments for select
  using (object_id in (
    select o.id from objects o
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

create policy "Users can insert appointments for their objects"
  on appointments for insert
  with check (object_id in (
    select o.id from objects o
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

create policy "Users can update their appointments"
  on appointments for update
  using (object_id in (
    select o.id from objects o
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  object_id uuid references objects(id) on delete cascade not null,
  type text not null check (type in ('offer', 'invoice', 'report')),
  title text not null,
  file_url text not null,
  file_name text,
  file_size integer,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table documents enable row level security;

create policy "Users can view documents for their objects"
  on documents for select
  using (object_id in (
    select o.id from objects o
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

create policy "Users can insert documents for their objects"
  on documents for insert
  with check (object_id in (
    select o.id from objects o
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

-- ============================================
-- UPDATED_AT TRIGGERS (optional but recommended)
-- ============================================
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_profiles before update on profiles for each row execute procedure handle_updated_at();
create trigger set_updated_at_objects before update on objects for each row execute procedure handle_updated_at();
create trigger set_updated_at_assets before update on assets for each row execute procedure handle_updated_at();
create trigger set_updated_at_appointments before update on appointments for each row execute procedure handle_updated_at();

-- ============================================
-- HELPER: Auto-create profile on signup (optional, using trigger)
-- ============================================
-- If you prefer trigger instead of API, uncomment:
/*
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
*/

COMMENT ON TABLE profiles IS 'User profiles for DMG Service customers';
COMMENT ON TABLE objects IS 'Properties/objects managed by the customer (e.g. house, apartment)';
COMMENT ON TABLE assets IS 'Technical assets/installations on the objects (Balkonkraftwerk, etc.) with AI analysis support';
COMMENT ON TABLE appointments IS 'Service appointments/requests';
COMMENT ON TABLE documents IS 'Offers, invoices and service reports';

-- ============================================
-- MAINTENANCE_HISTORY TABLE
-- ============================================
create table if not exists maintenance_history (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references assets(id) on delete cascade not null,
  maintenance_date date not null,
  description text,
  performed_by text,
  notes text,
  created_at timestamptz default now()
);

alter table maintenance_history enable row level security;

create policy "Users can view maintenance history for their assets"
  on maintenance_history for select
  using (asset_id in (
    select a.id from assets a
    join objects o on a.object_id = o.id
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

create policy "Users can insert maintenance history for their assets"
  on maintenance_history for insert
  with check (asset_id in (
    select a.id from assets a
    join objects o on a.object_id = o.id
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

create policy "Users can update their maintenance history"
  on maintenance_history for update
  using (asset_id in (
    select a.id from assets a
    join objects o on a.object_id = o.id
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

create policy "Users can delete their maintenance history"
  on maintenance_history for delete
  using (asset_id in (
    select a.id from assets a
    join objects o on a.object_id = o.id
    join profiles p on o.profile_id = p.id
    where p.user_id = auth.uid()
  ));

COMMENT ON TABLE maintenance_history IS 'History of maintenance performed on assets';
