
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

async function checkHistory() {
    const { data: subs, error } = await supabase
        .from('patient_subscriptions')
        .select('*')
        .eq('patient_id', ANGEL_ID)
        .order('start_date', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    const simplifiedSubs = subs ? subs.map(s => ({
        id: s.id,
        start_date: s.start_date,
        end_date: s.end_date
    })) : [];

    console.log('--- SUBSCRIPTIONS ---');
    simplifiedSubs.forEach(s => console.log(JSON.stringify(s)));

    const { data: extensions } = await supabase
        .from('subscription_extensions')
        .select('*')
        .eq('patient_id', ANGEL_ID);

    const simplifiedExtensions = extensions ? extensions.map(e => ({
        id: e.id,
        days: e.days_added,
        prev: e.previous_end_date,
        new: e.new_end_date,
        created: e.created_at
    })) : [];

    console.log('--- EXTENSIONS ---');
    simplifiedExtensions.forEach(e => console.log(JSON.stringify(e)));

    const output = {
        subscriptions: simplifiedSubs,
        extensions: simplifiedExtensions
    };

    fs.writeFileSync('angel_details.json', JSON.stringify(output, null, 2));
    console.log('Data written to angel_details.json');
}

checkHistory();
