-- Enable RLS on key tables
alter table public.patients enable row level security;
alter table public.measurements enable row level security;
alter table public.diets enable row level security;
alter table public.tasks enable row level security;

-- HELPER: Check if user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- HELPER: Get current user's nutritionist ID
create or replace function public.get_my_nutritionist_id()
returns text as $$
  select id from public.nutritionists where user_id = auth.uid();
$$ language sql security definer;


-- POLICIES FOR 'patients'
-- 1. Admins see all
create policy "Admins see all patients"
on public.patients for all
to authenticated
using ( is_admin() );

-- 2. Nutritionists see linked patients
create policy "Nutritionists see assigned patients"
on public.patients for select
to authenticated
using (
  nutritionist_id = get_my_nutritionist_id()
);

-- 3. Nutritionists can update assigned patients
create policy "Nutritionists update assigned patients"
on public.patients for update
to authenticated
using ( nutritionist_id = get_my_nutritionist_id() );

-- POLICIES FOR 'measurements', 'diets', etc.
-- (Assuming they have a patient_id column)

-- Measurements
create policy "Access measurements via patient"
on public.measurements for all
to authenticated
using (
  exists (
    select 1 from public.patients p
    where p.id = measurements.patient_id
    and (
      is_admin() 
      or 
      p.nutritionist_id = get_my_nutritionist_id()
    )
  )
);

-- Diets
create policy "Access diets via patient"
on public.diets for all
to authenticated
using (
  exists (
    select 1 from public.patients p
    where p.id = diets.patient_id
    and (
      is_admin() 
      or 
      p.nutritionist_id = get_my_nutritionist_id()
    )
  )
);

-- Tasks (System-wide or per patient? If per patient, follow above. If per user, simpler)
-- Assuming tasks are linked to patients OR to the nutritionist directly.
-- If tasks have 'assigned_to' (user_id), use that.
-- Let's check task structure later, for now protect via patient link if exists.
