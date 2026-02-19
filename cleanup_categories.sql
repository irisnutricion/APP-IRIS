-- 1. DELETE duplicates / incorrect entries
DELETE FROM payment_categories 
WHERE label NOT IN ('Online', 'Maroon Think', 'Hawk Training Center');

-- 2. Ensure the correct 3 exist (with correct UUID-like IDs or whatever we settled on)
-- We'll just select them to see what remains.
SELECT * FROM payment_categories;
