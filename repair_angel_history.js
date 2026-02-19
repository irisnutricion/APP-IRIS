
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addDays, parseISO, format, addMonths } from 'date-fns';

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

async function repairAngel() {
    console.log('Fetching Angel subscriptions...');

    const { data: subs, error } = await supabase
        .from('patient_subscriptions')
        .select('*')
        .eq('patient_id', ANGEL_ID)
        .order('start_date', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Assume the first one is the active one (Dec 14 - Jan 28)
    const activeSub = subs[0];
    console.log(`Active sub: ${activeSub.start_date} -> ${activeSub.end_date} (Status: ${activeSub.status})`);

    // The rest are past subscriptions. Fix them.
    const pastSubs = subs.slice(1);

    for (const sub of pastSubs) {
        const startDate = parseISO(sub.start_date);
        // Calculate expected end date (1 month duration)
        // Using addMonths to be cleaner, or just fix to the start of the next one?
        // In the list, the "previous" one in iteration is actually the "next" one in time (since sorted desc).
        // But here we are iterating descending.
        // So 'sub' is OLDER than 'activeSub'.

        // Let's just set it to start_date + 30 days for simplicity, or 1 month.
        const expectedEnd = addMonths(startDate, 1);
        const expectedEndStr = format(expectedEnd, 'yyyy-MM-dd');

        if (sub.end_date !== expectedEndStr) {
            console.log(`Fixing sub ${sub.id} (${sub.start_date}): ${sub.end_date} -> ${expectedEndStr}`);

            const { error: updateError } = await supabase
                .from('patient_subscriptions')
                .update({
                    end_date: expectedEndStr,
                    status: 'expired' // Ensure it's expired
                })
                .eq('id', sub.id);

            if (updateError) console.error('Update error:', updateError);
        }
    }
    console.log('Repair complete.');
}

repairAngel();
