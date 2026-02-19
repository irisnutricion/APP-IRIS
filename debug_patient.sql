-- 1. Find the ID of 'iirss hfehew'
SELECT * FROM patients WHERE first_name ILIKE '%iirss%' OR last_name ILIKE '%fehew%';

-- 2. Try to update ONLY this patient manually to see if it explodes
DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM patients WHERE first_name ILIKE '%iirss%' OR last_name ILIKE '%fehew%' LIMIT 1;
    
    IF v_id IS NOT NULL THEN
        RAISE NOTICE 'Found patient ID: %', v_id;
        UPDATE patients SET payment_category_id = 'online' WHERE id = v_id;
        RAISE NOTICE 'Update SUCCESS via SQL';
    ELSE
        RAISE NOTICE 'Patient not found via SQL';
    END IF;
END $$;
