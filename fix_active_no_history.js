
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gnziiexbwafppyardsbm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduemlpZXhid2FmcHB5YXJkc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzU3MzcsImV4cCI6MjA4NTcxMTczN30._OGW9i5TFngCEMT17RRrpHmTlDxA5j1DzF5ErIwAdYg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPatients() {
    console.log('Fetching patients...');
    const { data: patients, error } = await supabase.from('patients').select('id, first_name, last_name, subscription_status');
    const { data: history, error: historyError } = await supabase.from('patient_subscriptions').select('patient_id');

    if (error || historyError) {
        console.error('Error fetching data');
        return;
    }

    for (const p of patients) {
        const pHistory = history.filter(h => h.patient_id === p.id);
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();

        if (p.subscription_status === 'active' && pHistory.length === 0) {
            console.log(`Fixing patient ${name} (${p.id}): Active but no history. Setting to inactive.`);
            const { error: updateError } = await supabase.from('patients').update({ subscription_status: 'inactive' }).eq('id', p.id);
            if (updateError) console.error('Error updating:', updateError);
            else console.log('Fixed.');
        }
    }
    console.log('Done.');
}

fixPatients();
