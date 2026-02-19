-- Add payment_rate_id to link payments to specific rates (new system)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_rate_id UUID REFERENCES payment_rates(id) ON DELETE SET NULL;
