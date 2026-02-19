-- 1. Pick a patient (any one)
DO $$
DECLARE
    v_patient_id uuid;
BEGIN
    SELECT id INTO v_patient_id FROM patients LIMIT 1;
    
    RAISE NOTICE 'Testing update on patient %', v_patient_id;

    -- 2. Try to update
    UPDATE patients 
    SET payment_category_id = 'online' 
    WHERE id = v_patient_id;

    -- 3. Verify
    IF EXISTS (SELECT 1 FROM patients WHERE id = v_patient_id AND payment_category_id = 'online') THEN
        RAISE NOTICE 'SUCCESS: Update worked via SQL.';
    ELSE
        RAISE NOTICE 'FAILURE: Update did NOT work via SQL.';
    END IF;
END $$;
