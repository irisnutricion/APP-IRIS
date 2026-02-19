-- List all patients to see who has a category assigned
SELECT id, first_name, last_name, payment_category_id 
FROM patients 
ORDER BY created_at DESC;
