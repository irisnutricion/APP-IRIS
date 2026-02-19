-- DROP view first to allow column structure changes
DROP VIEW IF EXISTS patient_status_view;

-- Create view to calculate days remaining AND include tariff info
-- This view is intended for use with n8n or other automation tools

CREATE OR REPLACE VIEW patient_status_view AS
SELECT
    p.id as patient_id,
    p.first_name,
    p.last_name,
    p.email,
    ps.id as subscription_id,
    ps.plan_name,
    ps.end_date as subscription_end_date,
    (ps.end_date - CURRENT_DATE) as days_remaining,
    ps.status as subscription_status,
    -- Rate Info
    pr.label as rate_label,
    pr.amount as rate_amount,
    pr.is_active as rate_is_active
FROM
    patients p
JOIN
    patient_subscriptions ps ON p.id = ps.patient_id
LEFT JOIN
    payment_rates pr ON ps.payment_rate_id = pr.id
WHERE
    ps.status = 'active';

-- Grant access to the authenticated role (standard for Supabase)
GRANT SELECT ON patient_status_view TO authenticated;
GRANT SELECT ON patient_status_view TO service_role;
