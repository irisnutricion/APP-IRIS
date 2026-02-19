
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const ANGEL_ID = "ecdaeee4-4f23-479a-a9af-59346c40966e";
const NEW_DATE = "2026-01-28";

async function fixAngel() {
    console.log(`Updating Angel (${ANGEL_ID}) to ${NEW_DATE}...`);

    // 1. Update patient record
    const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .update({ subscription_end: NEW_DATE })
        .eq('id', ANGEL_ID)
        .select();

    if (patientError) {
        console.error('Error updating patient:', patientError);
    } else {
        console.log('Patient updated:', JSON.stringify(patientData, null, 2));
    }

    // 2. Update active subscription history (blindly)
    const { data: historyData, error: historyError } = await supabase
        .from('patient_subscriptions')
        .update({ end_date: NEW_DATE })
        .eq('patient_id', ANGEL_ID)
        .eq('status', 'active')
        .select();

    if (historyError) {
        console.error('Error updating history:', historyError);
    } else {
        console.log('History updated:', JSON.stringify(historyData, null, 2));
    }
}

fixAngel();
