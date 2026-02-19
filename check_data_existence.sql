-- Count how many patients have data in these "unused" columns
SELECT 
    COUNT(CASE WHEN favorite_foods IS NOT NULL AND favorite_foods != '' THEN 1 END) as favorite_foods_count,
    COUNT(CASE WHEN platos_que_no_pueden_faltar IS NOT NULL AND platos_que_no_pueden_faltar != '' THEN 1 END) as platos_count,
    COUNT(CASE WHEN allergies IS NOT NULL AND allergies != '' THEN 1 END) as allergies_count -- Just for comparison
FROM patients;

-- Show sample data if exists
SELECT id, first_name, favorite_foods, platos_que_no_pueden_faltar 
FROM patients 
WHERE 
    (favorite_foods IS NOT NULL AND favorite_foods != '') OR 
    (platos_que_no_pueden_faltar IS NOT NULL AND platos_que_no_pueden_faltar != '')
LIMIT 5;
