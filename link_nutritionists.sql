-- Add user_id column to nutritionists table to link with auth.users
alter table public.nutritionists
add column if not exists user_id uuid references auth.users(id);

-- Enable RLS on nutritionists if not already enabled (good practice)
alter table public.nutritionists enable row level security;

-- Policy: Admin can do everything
create policy "Admins can manage nutritionists"
  on public.nutritionists
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policy: Nutritionists can view all nutritionists (for team view)
create policy "Nutritionists can view team"
  on public.nutritionists
  for select
  to authenticated
  using (true);
