-- Add payment_category_id to patients to store their Center/Channel
-- Using TEXT because payment_categories.id is TEXT, not UUID
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS payment_category_id TEXT REFERENCES payment_categories(id) ON DELETE SET NULL;

-- Insert default Centers if they don't exist
-- We create a temporary function to handle conditional inserts more cleanly or just use standard INSERT WHERE NOT EXISTS
INSERT INTO payment_categories (label, color, is_active)
SELECT 'Online', 'bg-blue-100 text-blue-700 border-blue-200', true
WHERE NOT EXISTS (SELECT 1 FROM payment_categories WHERE label = 'Online');

INSERT INTO payment_categories (label, color, is_active)
SELECT 'Maroon Think', 'bg-red-100 text-red-700 border-red-200', true
WHERE NOT EXISTS (SELECT 1 FROM payment_categories WHERE label = 'Maroon Think');

INSERT INTO payment_categories (label, color, is_active)
SELECT 'Hawk Training Center', 'bg-slate-100 text-slate-700 border-slate-200', true
WHERE NOT EXISTS (SELECT 1 FROM payment_categories WHERE label = 'Hawk Training Center');
