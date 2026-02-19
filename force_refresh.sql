-- 1. Reload the schema cache for PostgREST (API)
NOTIFY pgrst, 'reload config';

-- 2. Explicitly grant permissions (just in case)
GRANT ALL ON TABLE patients TO authenticated;
GRANT ALL ON TABLE patients TO service_role;

-- 3. Verify column is visible to the system
SELECT column_name, data_type, is_updatable
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'payment_category_id';
