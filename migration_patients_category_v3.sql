-- Add payment_category_id to patients to store their Center/Channel if not exists
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS payment_category_id TEXT REFERENCES payment_categories(id) ON DELETE SET NULL;

-- Insert default Centers with Explicit IDs (using UUID as text)
-- Fixes "null value in column id" error
INSERT INTO payment_categories (id, label, color, is_active)
SELECT gen_random_uuid()::text, 'Online', 'bg-blue-100 text-blue-700 border-blue-200', true
WHERE NOT EXISTS (SELECT 1 FROM payment_categories WHERE label = 'Online');

INSERT INTO payment_categories (id, label, color, is_active)
SELECT gen_random_uuid()::text, 'Maroon Think', 'bg-red-100 text-red-700 border-red-200', true
WHERE NOT EXISTS (SELECT 1 FROM payment_categories WHERE label = 'Maroon Think');

INSERT INTO payment_categories (id, label, color, is_active)
SELECT gen_random_uuid()::text, 'Hawk Training Center', 'bg-slate-100 text-slate-700 border-slate-200', true
WHERE NOT EXISTS (SELECT 1 FROM payment_categories WHERE label = 'Hawk Training Center');

-- Refresh cache
NOTIFY pgrst, 'reload config';
