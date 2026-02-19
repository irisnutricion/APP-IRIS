
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gnziiexbwafppyardsbm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduemlpZXhid2FmcHB5YXJkc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzU3MzcsImV4cCI6MjA4NTcxMTczN30._OGW9i5TFngCEMT17RRrpHmTlDxA5j1DzF5ErIwAdYg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log('Checking patients table schema...');
    const { data, error } = await supabase.from('patients').select('*').limit(1);

    if (error) {
        console.error('Error fetching patients:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found in patients table:');
        console.log(Object.keys(data[0]).join('\n'));

        // Check for clinical_data column specifically
        if (Object.keys(data[0]).includes('clinical_data')) {
            console.log('\nSUCCESS: clinical_data column EXISTS.');
        } else {
            console.log('\nWARNING: clinical_data column DOES NOT EXIST.');
        }
    } else {
        console.log('No patients found to infer schema.');
        // Try to insert a dummy to see error if columns missing? No, safer to just rely on this.
        // Or ask for table info via rpc if available.
    }
}

checkSchema();
