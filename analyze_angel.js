
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env vars manually
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeAngel() {
    console.log('Searching for Angel...');
    const { data: patients, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, subscription_end')
        .limit(10);

    if (error) {
        console.error('Error fetching patients:', error);
        return;
    }

    if (!patients || patients.length === 0) {
        console.log('No patients found.');
        return;
    }

    console.log('Patients found:', JSON.stringify(patients, null, 2));

    for (const p of patients) {
        console.log(`\n--- Patient: ${p.first_name} ${p.last_name} (ID: ${p.id}) ---`);
        console.log('Current Subscription End:', p.subscription_end);

        const { data: history, error: hError } = await supabase
            .from('subscription_history')
            .select('*')
            .eq('patient_id', p.id)
            .order('start_date', { ascending: false });

        if (hError) console.error('History Error:', hError);
        console.log('Subscription History:', JSON.stringify(history, null, 2));

        const { data: extensions, error: eError } = await supabase
            .from('subscription_extensions')
            .select('*')
            .eq('patient_id', p.id)
            .order('created_at', { ascending: false });

        if (eError) console.error('Extensions Error:', eError);
        console.log('Extensions:', JSON.stringify(extensions, null, 2));
    }
}

analyzeAngel();
