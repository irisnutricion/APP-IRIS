-- FIX INFINITE RECURSION IN RLS

-- 1. Ensure is_admin is security definer (bypasses RLS internally)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2. Drop the recursive policies on profiles
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;

-- 3. Re-create them using the safe SECURITY DEFINER function
create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using ( 
    -- Only allow if user is admin (checked securely)
    is_admin() 
    -- OR if user is viewing own profile (already covered by "Users can view own profile")
    -- We add explicit OR just in case, but "Users can view own profile" usually handles it.
    -- However, RLS policies are additive (OR), so we just need one to pass.
    -- We assume "Users can view own profile" is active from create_profiles_table.sql
  );

create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using ( is_admin() );
