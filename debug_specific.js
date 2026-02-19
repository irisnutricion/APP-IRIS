import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function checkSpecific() {
    console.log('Checking suspicious tables...');

    const checks = [
        { name: 'patient_subscriptions', query: supabase.from('patient_subscriptions').select('*').limit(1) },
        { name: 'subscription_pauses', query: supabase.from('subscription_pauses').select('*').limit(1) },
        { name: 'clinical_categories', query: supabase.from('clinical_categories').select('*').limit(1) }
    ];

    for (const item of checks) {
        try {
            const { data, error } = await item.query;
            if (error) {
                console.error(`[FAIL] ${item.name}:`, error.message);
                console.error('Full Error:', JSON.stringify(error, null, 2));
            } else {
                console.log(`[PASS] ${item.name}`);
            }
        } catch (e) {
            console.error(`[CRASH] ${item.name}:`, e.message);
        }
    }
}

checkSpecific();
