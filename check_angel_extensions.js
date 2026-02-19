
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

async function checkAngelExtensions() {
    console.log('Checking extensions for Angel...');

    const { data: extensions, error } = await supabase
        .from('subscription_extensions')
        .select('*')
        .eq('patient_id', ANGEL_ID);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Extensions found:', JSON.stringify(extensions, null, 2));

    let totalDaysAdded = 0;
    if (extensions) {
        totalDaysAdded = extensions.reduce((acc, curr) => acc + (curr.days_added || 0), 0);
    }
    console.log('Total days added:', totalDaysAdded);
}

checkAngelExtensions();
