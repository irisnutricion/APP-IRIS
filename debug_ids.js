import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

const queries = [
    { name: 'patients', query: supabase.from('patients').select('*, payment_category_id, measurements(*), days_remaining').limit(1) },
    { name: 'marketing_posts', query: supabase.from('marketing_posts').select('*').limit(1) },
    { name: 'plans', query: supabase.from('plans').select('*').limit(1) },
    { name: 'tasks', query: supabase.from('tasks').select('*').limit(1) },
    { name: 'task_categories', query: supabase.from('task_categories').select('*').limit(1) },
    { name: 'task_types', query: supabase.from('task_types').select('*').limit(1) },
    { name: 'user_profile', query: supabase.from('user_profile').select('*').limit(1).single() },
    { name: 'reviews', query: supabase.from('reviews').select('*').limit(1) },
    { name: 'payments', query: supabase.from('payments').select('*').limit(1) },
    { name: 'payment_methods', query: supabase.from('payment_methods').select('*').limit(1) },
    { name: 'payment_categories', query: supabase.from('payment_categories').select('*').limit(1) },
    { name: 'referral_sources', query: supabase.from('referral_sources').select('*').limit(1) },
    { name: 'clinical_options', query: supabase.from('clinical_options').select('*').limit(1) },
    { name: 'clinical_categories', query: supabase.from('clinical_categories').select('*').limit(1) },
    { name: 'patient_subscriptions', query: supabase.from('patient_subscriptions').select('*').limit(1) },
    { name: 'subscription_types', query: supabase.from('subscription_types').select('*').order('months', { ascending: true }).limit(1) },
    { name: 'payment_rates', query: supabase.from('payment_rates').select('*').order('amount', { ascending: true }).limit(1) },
    { name: 'subscription_pauses', query: supabase.from('subscription_pauses').select('*').order('start_date', { ascending: false }).limit(1) }
];

async function checkAll() {
    console.log('Checking all queries...');
    for (const item of queries) {
        try {
            const { data, error } = await item.query;
            if (error) {
                console.error(`[FAIL] ${item.name}:`, error.message);
            } else {
                console.log(`[PASS] ${item.name}`);
            }
        } catch (e) {
            console.error(`[CRASH] ${item.name}:`, e.message);
        }
    }
}

checkAll();
