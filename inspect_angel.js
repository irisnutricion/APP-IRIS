
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

async function inspect() {
    console.log('Fetching details for Angel...');

    const { data: history } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('patient_id', ANGEL_ID)
        .order('start_date', { ascending: false });

    const { data: extensions } = await supabase
        .from('subscription_extensions')
        .select('*')
        .eq('patient_id', ANGEL_ID)
        .order('created_at', { ascending: false });

    const result = {
        history,
        extensions
    };

    fs.writeFileSync('angel_details.json', JSON.stringify(result, null, 2));
    console.log('Details written to angel_details.json');
}

inspect();
