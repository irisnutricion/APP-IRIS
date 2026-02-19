-- Create a function to register payments from Stripe via n8n
-- This function finds the patient by email and inserts the payment

CREATE OR REPLACE FUNCTION register_payment_by_email(
    p_email TEXT,
    p_amount NUMERIC,
    p_date DATE,
    p_concept TEXT DEFAULT 'Mensualidad Stripe'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_patient_id UUID;
    v_patient_name TEXT;
    v_payment_id UUID;
BEGIN
    -- 1. Find Patient (Case Insensitive)
    SELECT id, first_name || ' ' || last_name
    INTO v_patient_id, v_patient_name
    FROM patients
    WHERE email ILIKE p_email
    LIMIT 1;

    -- 2. Handle Not Found
    IF v_patient_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No patient found with email: ' || p_email
        );
    END IF;

    -- 3. Insert Payment
    INSERT INTO payments (
        patient_id,
        date,
        amount,
        payment_method,
        concept,
        status,
        created_at
    ) VALUES (
        v_patient_id,
        p_date,
        p_amount,
        'Stripe',
        p_concept,
        'pagado',
        NOW()
    ) RETURNING id INTO v_payment_id;

    -- 4. Return Success
    RETURN json_build_object(
        'success', true,
        'message', 'Payment registered successfully',
        'patient_name', v_patient_name,
        'payment_id', v_payment_id
    );
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION register_payment_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION register_payment_by_email TO service_role;
