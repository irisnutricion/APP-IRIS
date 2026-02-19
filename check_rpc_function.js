import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gnziiexbwafppyardsbm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduemlpZXhid2FmcHB5YXJkc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzU3MzcsImV4cCI6MjA4NTcxMTczN30._OGW9i5TFngCEMT17RRrpHmTlDxA5j1DzF5ErIwAdYg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunction() {
    console.log('Checking function...');
    const { data, error } = await supabase.rpc('register_payment_by_email', {
        p_email: 'test@example.com',
        p_amount: 10,
        p_date: '2023-01-01'
    });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', data);
    }
}

checkFunction();
