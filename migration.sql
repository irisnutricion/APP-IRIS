-- Add subscription_type_id to link rates to specific durations
ALTER TABLE payment_rates 
ADD COLUMN IF NOT EXISTS subscription_type_id UUID REFERENCES subscription_types(id) ON DELETE SET NULL;

-- Add is_active to allow archiving old rates
ALTER TABLE payment_rates 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing rates to be active by default if null
UPDATE payment_rates SET is_active = true WHERE is_active IS NULL;
