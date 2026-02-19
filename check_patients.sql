-- Refresh schema cache again to be absolutely sure
NOTIFY pgrst, 'reload config';

-- Check if the column is populated for ANY patient
SELECT id, first_name, payment_category_id FROM patients WHERE payment_category_id IS NOT NULL;

-- Check structure again
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'payment_category_id';
