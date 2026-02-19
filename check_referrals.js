
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gnziiexbwafppyardsbm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduemlpZXhid2FmcHB5YXJkc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzU3MzcsImV4cCI6MjA4NTcxMTczN30._OGW9i5TFngCEMT17RRrpHmTlDxA5j1DzF5ErIwAdYg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReferrals() {
    console.log('Fetching referral_sources...');
    const { data: sources, error: sError } = await supabase.from('referral_sources').select('*');
    if (sError) console.error(sError);
    else console.log('Sources:', sources);

    console.log('\nFetching patients referral_source values...');
    const { data: patients, error: pError } = await supabase.from('patients').select('id, first_name, referral_source');
    if (pError) console.error(pError);
    else {
        patients.forEach(p => {
            console.log(`Patient ${p.first_name}: referral_source = ${p.referral_source}`);
        });
    }
}

checkReferrals();
