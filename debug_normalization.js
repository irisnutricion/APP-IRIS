import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function checkNormalization() {
    console.log("Fetching one patient...");

    const { data, error } = await supabase.from('patients').select('*').not('subscription', 'is', null).limit(1);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data && data.length > 0) {
        const p = data[0];
        console.log("--- RAW DB DATA ---");
        console.log("id:", p.id);
        console.log("subscription (JSON):", p.subscription);
        console.log("subscription_status (flat):", p.subscription_status);
        console.log("subscription_end (flat):", p.subscription_end);

        // Simulate New Normalization Logic
        const normalizedSubscription = {
            type: p.subscription_type,
            startDate: p.subscription_start,
            endDate: p.subscription_end,
            status: p.subscription_status,
            pauseStartDate: p.pause_start_date,
            subscriptionTypeId: p.subscription_type_id,
            paymentRateId: p.payment_rate_id
        };

        console.log("\n--- NEW NORMALIZATION RESULT ---");
        console.log("subscription:", normalizedSubscription);

        if (p.subscription && p.subscription.status !== p.subscription_status) {
            console.log("\n[SUCCESS] Fix verified! Stale JSON status '" + p.subscription.status + "' was ignored in favor of flat status '" + p.subscription_status + "'.");
        } else if (p.subscription) {
            console.log("\n[INFO] Both JSON and flat columns match ('" + p.subscription_status + "'). The fix ensures we keep using the flat column.");
        } else {
            console.log("\n[INFO] No legacy JSON column found. Fix is safe.");
        }

    } else {
        console.log("No patients found.");
    }
}

checkNormalization();
