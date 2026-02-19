import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { addDays, format, parseISO, differenceInYears } from 'date-fns';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function testPatientDetailLogic() {
    console.log("Fetching data for logic test...");

    // 1. Fetch Data (Simulation of useData hooks)
    const { data: patients, error: pError } = await supabase.from('patients').select('*, payment_category_id, measurements(*), days_remaining');
    const { data: history, error: hError } = await supabase.from('patient_subscriptions').select('*');
    const { data: payments, error: payError } = await supabase.from('payments').select('*');

    if (pError || hError || payError) {
        console.error("Fetch Error:", pError, hError, payError);
        return;
    }

    // 2. Hydrate (Simulation of DataContext)
    const hydratedPatients = patients.map(p => ({
        ...p,
        subscriptionHistory: history.filter(h => h.patient_id === p.id),
        subscriptionPauses: [], // As fixed in DataContext
    }));

    console.log(`Testing logic for ${hydratedPatients.length} patients...`);

    // 3. Test PatientDetail Logic for EACH patient
    for (const patient of hydratedPatients) {
        try {
            // Logic from PatientDetail.jsx: subscriptionTerms
            if (!patient.subscriptionHistory) continue;

            const terms = patient.subscriptionHistory.map(sub => {
                if (!sub || !sub.start_date) return null;

                // Potential Crash Point: parseISO
                const start = parseISO(sub.start_date);
                if (isNaN(start.getTime())) return null;

                const end = sub.end_date ? parseISO(sub.end_date) : addDays(start, 30);
                const validEnd = isNaN(end.getTime()) ? addDays(start, 30) : end;

                let payment = (payments || []).find(p => p.subscription_id === sub.id);
                // Fallback logic
                if (!payment) {
                    payment = (payments || []).find(p => {
                        if (!p || !p.date || p.patient_id !== patient.id || p.subscription_id) return false;
                        const pDate = parseISO(p.date);
                        // Potential Crash Point: Date math on invalid dates?
                        return pDate >= addDays(start, -10) && pDate <= addDays(validEnd, 45);
                    });
                }

                return {
                    id: sub.id,
                    label: sub.plan_name
                };
            }).filter(Boolean);

            // Logic from suggestedStartDate
            const sortedHistory = [...patient.subscriptionHistory].sort((a, b) => {
                const dateA = new Date(a.end_date || a.start_date);
                const dateB = new Date(b.end_date || b.start_date);
                return dateB - dateA;
            });

        } catch (err) {
            console.error(`CRASH detected for patient ${patient.id} (${patient.first_name}):`, err);
            // This is likely the cause!
            process.exit(1);
        }
    }
    console.log("All patients processed cleanly.");
}

testPatientDetailLogic();
