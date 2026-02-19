-- Función Actualizada: Registrar pagos incluso si no existe el paciente
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
    v_message TEXT;
BEGIN
    -- 1. Buscar Paciente
    SELECT id, first_name || ' ' || last_name
    INTO v_patient_id, v_patient_name
    FROM patients
    WHERE email ILIKE p_email
    LIMIT 1;

    -- 2. Definir estado
    IF v_patient_id IS NULL THEN
        v_message := 'Pago registrado sin asignar (email no encontrado: ' || p_email || ')';
        v_patient_name := 'Cliente Desconocido';
    ELSE
        v_message := 'Pago registrado correctamente';
    END IF;

    -- 3. Insertar Pago (patient_id será NULL si no se encontró)
    INSERT INTO payments (
        patient_id, date, amount, payment_method, concept, status, created_at
    ) VALUES (
        v_patient_id, p_date, p_amount, 'Stripe', p_concept, 'pagado', NOW()
    ) RETURNING id INTO v_payment_id;

    -- 4. Devolver Éxito (siempre true, para que n8n no falle)
    RETURN json_build_object(
        'success', true,
        'patient_found', (v_patient_id IS NOT NULL),
        'patient_name', v_patient_name,
        'payment_id', v_payment_id,
        'message', v_message
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;
