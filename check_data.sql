-- Check columns in patients
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'payment_category_id';

-- Check content of payment_categories
SELECT * FROM payment_categories;

-- Check if any patient has a category assigned
SELECT id, first_name, payment_category_id FROM patients WHERE payment_category_id IS NOT NULL LIMIT 5;
