
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gnziiexbwafppyardsbm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduemlpZXhid2FmcHB5YXJkc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzU3MzcsImV4cCI6MjA4NTcxMTczN30._OGW9i5TFngCEMT17RRrpHmTlDxA5j1DzF5ErIwAdYg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPatients() {
    console.log('Fetching patients...');
    const { data: patients, error } = await supabase.from('patients').select('id, first_name, last_name, subscription_status, subscription_start, subscription_end');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const { data: history, error: historyError } = await supabase.from('patient_subscriptions').select('patient_id');
    if (historyError) {
        console.error('History Error:', historyError);
        return;
    }

    console.log(`Found ${patients.length} patients.`);

    patients.forEach(p => {
        const pHistory = history.filter(h => h.patient_id === p.id);
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        const status = p.subscription_status;
        const historyCount = pHistory.length;

        console.log(`Patient: ${name} (ID: ${p.id})`);
        console.log(`  Status: ${status}`);
        console.log(`  History Count: ${historyCount}`);

        const showRenovar = (status === 'active' || historyCount > 0);
        console.log(`  Should show 'Renovar'? ${showRenovar}`);
        console.log(`  Should show 'Iniciar Plan'? ${!showRenovar}`);
        console.log('---');
    });
}

inspectPatients();
