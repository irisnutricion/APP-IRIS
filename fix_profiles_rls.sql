-- Allow all authenticated users to view profiles (needed for Team view and getting names)
create policy "Authenticated users can view all profiles"
on public.profiles
for select
to authenticated
using ( true );
