
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'notes') THEN 
        ALTER TABLE patients ADD COLUMN notes TEXT; 
    END IF; 
END $$;
