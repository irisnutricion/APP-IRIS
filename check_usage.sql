-- Check clinical categories
SELECT * FROM clinical_categories;

-- Check if plan_id is being used in recent payments
SELECT id, date, plan_id, payment_rate_id FROM payments ORDER BY date DESC LIMIT 10;
