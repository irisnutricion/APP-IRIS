
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

async function test() {
    console.log('Testing connection...');
    const { count, error } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Total patients:', count);
    }

    const { data, error: dataError } = await supabase
        .from('patients')
        .select('id, first_name, last_name, subscription_end');

    if (dataError) {
        console.error('Search Error:', dataError.message);
    } else {
        fs.writeFileSync('patients_dump.json', JSON.stringify(data, null, 2));
        console.log('Data written to patients_dump.json');
    }
}

test();
