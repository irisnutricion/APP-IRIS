-- 1. Force Supabase/PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload config';

-- 2. Check if the column actually exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name = 'payment_rate_id';
