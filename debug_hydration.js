import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function testHydration() {
    console.log("Fetching data with allSettled...");

    try {
        // Parallel fetching with allSettled
        const results = await Promise.allSettled([
            supabase.from('patients').select('*, payment_category_id, measurements(*), days_remaining'),
            supabase.from('marketing_posts').select('*'),
            supabase.from('plans').select('*'),
            supabase.from('tasks').select('*'),
            supabase.from('task_categories').select('*'),
            supabase.from('task_types').select('*'),
            supabase.from('user_profile').select('*').limit(1).single(),
            supabase.from('reviews').select('*'),
            supabase.from('payments').select('*'),
            supabase.from('payment_methods').select('*'),
            supabase.from('payment_categories').select('*'),
            supabase.from('referral_sources').select('*'),
            supabase.from('clinical_options').select('*'),
            supabase.from('clinical_categories').select('*'),
            supabase.from('patient_subscriptions').select('*'),
            supabase.from('subscription_types').select('*').order('months', { ascending: true }),
            supabase.from('payment_rates').select('*').order('amount', { ascending: true }),
        ]);

        const patientsResult = results[0];
        const subscriptionsHistoryResult = results[14];

        if (patientsResult.status === 'fulfilled' && patientsResult.value.data) {
            console.log("Patients fetched successfully:", patientsResult.value.data.length);
            const patientsData = patientsResult.value.data;
            const subscriptionsHistoryData = subscriptionsHistoryResult.status === 'fulfilled' ? subscriptionsHistoryResult.value.data : [];

            const hydrated = patientsData.map(p => ({
                ...p,
                name: (p.first_name || p.last_name) ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : (p.name || 'Cliente'),
                subscriptionHistory: subscriptionsHistoryData ?
                    subscriptionsHistoryData.filter(h => h.patient_id === p.id).sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                    : [],
                subscriptionPauses: [],
                subscription: {
                    type: p.subscription_type,
                    startDate: p.subscription_start,
                    endDate: p.subscription_end,
                    status: p.subscription_status,
                    pauseStartDate: p.pause_start_date,
                    subscriptionTypeId: p.subscription_type_id,
                    paymentRateId: p.payment_rate_id
                }
            }));

            if (hydrated.length > 0) {
                console.log("Hydration successful. Sample patient:", hydrated[0].name);
                console.log("Sample subscription normalized:", hydrated[0].subscription);
            } else {
                console.log("Hydration successful but no patients found.");
            }

        } else {
            console.error("Failed to fetch patients:", patientsResult.reason);
        }

    } catch (error) {
        console.error("Hydration Logic Error:", error);
    } finally {
        console.log("Hydration check complete.");
    }
}

testHydration();
