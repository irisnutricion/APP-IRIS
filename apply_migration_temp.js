import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Create subscription_pauses table
CREATE TABLE IF NOT EXISTS public.subscription_pauses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL means currently paused
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (if not already enabled)
ALTER TABLE public.subscription_pauses ENABLE ROW LEVEL SECURITY;

-- Create policies (safe idempotency)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_pauses' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON public.subscription_pauses FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_pauses' AND policyname = 'Enable insert access for all users') THEN
        CREATE POLICY "Enable insert access for all users" ON public.subscription_pauses FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_pauses' AND policyname = 'Enable update access for all users') THEN
        CREATE POLICY "Enable update access for all users" ON public.subscription_pauses FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_pauses' AND policyname = 'Enable delete access for all users') THEN
        CREATE POLICY "Enable delete access for all users" ON public.subscription_pauses FOR DELETE USING (true);
    END IF;
END
$$;
`;

async function runMigration() {
    console.log('Running migration...');
    // We can't execute raw SQL with supabase-js unless we have a specific function for it or use the REST API which doesn't support raw SQL directly usually for security.
    // However, the previous conversations showed usage of .sql files.
    // If we can't run raw SQL, we might need the user to do it.
    // But wait, the previous logs showed successful SQL execution via MCP? No, it failed.
    // Actually, I can try to use a Postgres client if I had the connection string, but I only have the URL/Anon key usually.
    // Let's check .env.local for connection string.
}

// Check .env.local content first
console.log('Checking .env.local...');
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    console.log('.env.local found.');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    console.log('Keys present:', Object.keys(envConfig));
} else {
    console.log('.env.local NOT found.');
}
