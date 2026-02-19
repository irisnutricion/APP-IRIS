-- Fix permissions for subscription_pauses

-- Ensure RLS is enabled
ALTER TABLE public.subscription_pauses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.subscription_pauses;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.subscription_pauses;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.subscription_pauses;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.subscription_pauses;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.subscription_pauses;

-- Create permissive policies (adjust if you have specific auth requirements)
CREATE POLICY "Enable read access for all users" ON public.subscription_pauses FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.subscription_pauses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.subscription_pauses FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.subscription_pauses FOR DELETE USING (true);

-- Notify schema reload
NOTIFY pgrst, 'reload config';
