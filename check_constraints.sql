SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients'
ORDER BY is_nullable ASC; -- Show NO (not null) first
