-- Create a table for public profiles if it doesn''t exist
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  email text,
  full_name text,
  role text check (role in ('admin', 'nutritionist', 'user')) default 'nutritionist',
  is_active boolean default true
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies

-- 1. Users can view their own profile
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

-- 2. Admins can view all profiles
create policy "Admins can view all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 3. Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- 4. Admins can update any profile (to disable users etc)
create policy "Admins can update any profile"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Function to handle new user signup (auto-create profile)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    -- Default to user/nutritionist, unless 'role' is explicitly passed in metadata (which we will control via Edge Function)
    coalesce(new.raw_user_meta_data->>'role', 'nutritionist') 
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
