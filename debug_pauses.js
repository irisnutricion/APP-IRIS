import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function checkPauses() {
    console.log('Checking subscription pauses...');

    // 1. Fetch all pauses
    const { data: pauses, error: pauseError } = await supabase
        .from('subscription_pauses')
        .select('*');

    if (pauseError) {
        console.error('Error fetching pauses:', pauseError);
        return;
    }

    console.log(`Found ${pauses.length} pauses.`);

    // 2. Check for invalid dates
    pauses.forEach(p => {
        console.log(`Pause ID: ${p.id}, Patient: ${p.patient_id}, Start: ${p.start_date}, End: ${p.end_date}`);
        if (!p.start_date) console.error('  WARNING: Missing start_date');
        // Simple regex check for YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(p.start_date)) console.error('  WARNING: Invalid start_date format');
        if (p.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(p.end_date)) console.error('  WARNING: Invalid end_date format');
    });

    // 3. Check patient subscriptions for context
    const { data: subs, error: subError } = await supabase.from('patient_subscriptions').select('*').limit(5);
    if (!subError) {
        console.log('Sample subscriptions:', subs);
    }
}

checkPauses();
