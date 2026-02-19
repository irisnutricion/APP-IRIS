import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function checkSchema() {
    console.log("Fetching one patient...");

    const { data, error } = await supabase.from('patients').select('*').limit(1);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data && data.length > 0) {
        const p = data[0];
        console.log("Patient Keys:", Object.keys(p));
        console.log("Has 'subscription' column?", 'subscription' in p);
        console.log("Value of 'subscription':", p.subscription);
        console.log("Value of 'subscription_start':", p.subscription_start);
    } else {
        console.log("No patients found.");
    }
}

checkSchema();
