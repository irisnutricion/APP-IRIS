
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gnziiexbwafppyardsbm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduemlpZXhid2FmcHB5YXJkc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzU3MzcsImV4cCI6MjA4NTcxMTczN30._OGW9i5TFngCEMT17RRrpHmTlDxA5j1DzF5ErIwAdYg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
    console.log('Checking payment_categories table...');
    const { data, error } = await supabase.from('payment_categories').select('*');

    if (error) {
        console.error('Error fetching payment_categories:', error);
    } else {
        console.log('Success. Found', data.length, 'categories:');
        console.log(data);
    }

    console.log('\nChecking patients column...');
    const { data: patients, error: pError } = await supabase.from('patients').select('payment_category_id').limit(1);

    if (pError) {
        console.error('Error checking patients column:', pError);
    } else {
        console.log('Success. patients table has payment_category_id column.');
    }
}

checkCategories();
