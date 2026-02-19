-- Backfill profiles for existing users
insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', email), -- Fallback to email if no name
  'nutritionist' -- Default role
from auth.users
on conflict (id) do nothing;

-- Optional: If you want to make a specific email an admin immediately, uncomment and edit:
-- update public.profiles set role = 'admin' where email = 'tu_email@ejemplo.com';
