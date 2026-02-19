-- Forcefully add the column. 
-- Even if it fails saying "already exists", that's fine, we just want to be SURE.

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_rate_id UUID REFERENCES payment_rates(id) ON DELETE SET NULL;

-- Verify immediately
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments';
