import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { addDays, differenceInDays, parseISO, format } from 'date-fns';
import { supabase } from '../supabaseClient';

const DataContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState([]);

    const [plans, setPlans] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [taskCategories, setTaskCategories] = useState([]);
    const [taskTypes, setTaskTypes] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [reviews, setReviews] = useState({});
    const [payments, setPayments] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [paymentCategories, setPaymentCategories] = useState([]);
    const [referralSources, setReferralSources] = useState([]);
    const [clinicalOptions, setClinicalOptions] = useState([]);
    const [clinicalCategories, setClinicalCategories] = useState([]);
    const [subscriptionTypes, setSubscriptionTypes] = useState([]);
    const [paymentRates, setPaymentRates] = useState([]);
    const [subscriptionExtensions, setSubscriptionExtensions] = useState([]);
    const [nutritionists, setNutritionists] = useState([]);
    const [foods, setFoods] = useState([]);
    const [recipeCategories, setRecipeCategories] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [mealPlans, setMealPlans] = useState([]);
    const [mealPlanItems, setMealPlanItems] = useState([]);
    const [indicationTemplates, setIndicationTemplates] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Parallel fetching with allSettled to prevent one failure from blocking everything
            const results = await Promise.allSettled([
                supabase.from('patients').select('*, payment_category_id, measurements(*), days_remaining'),

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
                supabase.from('subscription_extensions').select('*').order('created_at', { ascending: false }),
                supabase.from('nutritionists').select('*').order('label', { ascending: true }),
                supabase.from('foods').select('*').order('name', { ascending: true }),
                supabase.from('recipe_categories').select('*').order('label', { ascending: true }),
                supabase.from('recipes').select('*, recipe_category_links(category_id), recipe_ingredients(*, foods(*)))').order('name', { ascending: true }),
                supabase.from('meal_plans').select('*').order('created_at', { ascending: false }),
                supabase.from('meal_plan_items').select('*, recipes(*, recipe_ingredients(*, foods(*)))').order('sort_order', { ascending: true }),
                supabase.from('indication_templates').select('*')
            ]);

            const [
                patientsResult,

                plansResult,
                tasksResult,
                catsResult,
                typesResult,
                profileResult,
                reviewsResult,
                paymentsResult,
                paymentMethodsResult,
                paymentCategoriesResult,
                referralSourcesResult,
                clinicalOptionsResult,
                clinicalCategoriesResult,
                subscriptionsHistoryResult,
                subTypesResult,
                paymentRatesResult,
                subscriptionExtensionsResult,
                nutritionistsResult,
                foodsResult,
                recipeCategoriesResult,
                recipesResult,
                mealPlansResult,
                mealPlanItemsResult,
                indicationTemplatesResult
            ] = results;

            // Log errors for debugging
            results.forEach((res, index) => {
                if (res.status === 'rejected') {
                    console.error(`Error fetching data at index ${index}:`, res.reason);
                }
            });

            // Process Patients (Critical)
            if (patientsResult.status === 'fulfilled' && patientsResult.value.data) {
                const patientsData = patientsResult.value.data;
                const subscriptionsHistoryData = subscriptionsHistoryResult.status === 'fulfilled' ? subscriptionsHistoryResult.value.data : [];

                const hydratedPatients = patientsData.map(p => ({
                    ...p,
                    name: (p.first_name || p.last_name) ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : (p.name || 'Cliente'),
                    subscriptionHistory: subscriptionsHistoryData ?
                        subscriptionsHistoryData.filter(h => h.patient_id === p.id).sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                        : [],
                    subscriptionPauses: [],
                    measurements: p.measurements || [],
                    status: p.subscription_status, // Map to top-level status for PatientList compatibility
                    review_day: p.review_day, // Explicitly map to ensure it's available
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
                setPatients(hydratedPatients);
            } else {
                console.error('Critical: Failed to fetch patients', patientsResult.reason);
            }

            // Process other data safely

            if (plansResult.status === 'fulfilled') setPlans(plansResult.value.data || []);
            if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value.data || []);
            if (catsResult.status === 'fulfilled') setTaskCategories(catsResult.value.data || []);
            if (typesResult.status === 'fulfilled') setTaskTypes(typesResult.value.data || []);
            if (profileResult.status === 'fulfilled') setUserProfile(profileResult.value.data || null);
            if (paymentsResult.status === 'fulfilled') setPayments(paymentsResult.value.data || []);
            if (paymentMethodsResult.status === 'fulfilled') setPaymentMethods(paymentMethodsResult.value.data || []);
            if (paymentCategoriesResult.status === 'fulfilled') setPaymentCategories(paymentCategoriesResult.value.data || []);
            if (referralSourcesResult.status === 'fulfilled') setReferralSources(referralSourcesResult.value.data || []);
            if (clinicalOptionsResult.status === 'fulfilled') setClinicalOptions(clinicalOptionsResult.value.data || []);
            if (clinicalCategoriesResult.status === 'fulfilled') setClinicalCategories(clinicalCategoriesResult.value.data || []);
            if (subTypesResult.status === 'fulfilled') setSubscriptionTypes(subTypesResult.value.data || []);
            if (subTypesResult.status === 'fulfilled') setSubscriptionTypes(subTypesResult.value.data || []);
            if (paymentRatesResult.status === 'fulfilled') setPaymentRates(paymentRatesResult.value.data || []);
            if (subscriptionExtensionsResult.status === 'fulfilled') setSubscriptionExtensions(subscriptionExtensionsResult.value.data || []);
            if (nutritionistsResult.status === 'fulfilled') setNutritionists(nutritionistsResult.value.data || []);
            if (foodsResult.status === 'fulfilled') setFoods(foodsResult.value.data || []);
            if (recipeCategoriesResult.status === 'fulfilled') setRecipeCategories(recipeCategoriesResult.value.data || []);
            if (recipesResult.status === 'fulfilled') setRecipes(recipesResult.value.data || []);
            if (mealPlansResult.status === 'fulfilled') setMealPlans(mealPlansResult.value.data || []);
            if (mealPlanItemsResult.status === 'fulfilled') setMealPlanItems(mealPlanItemsResult.value.data || []);
            if (indicationTemplatesResult.status === 'fulfilled') setIndicationTemplates(indicationTemplatesResult.value.data || []);

            if (reviewsResult.status === 'fulfilled' && reviewsResult.value.data) {
                const reviewsObj = reviewsResult.value.data.reduce((acc, r) => {
                    acc[r.id] = r;
                    return acc;
                }, {});
                setReviews(reviewsObj);
            }

        } catch (error) {
            console.error('Unexpected error in fetchData:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Actions ---

    // PATIENTS
    const addPatient = async (patient) => {
        // Prepare DB object (remove measurements/photos from root if any)
        const dbPatient = {
            first_name: patient.firstName,
            last_name: patient.lastName,
            // name: legacy column not written anymore
            birth_date: patient.birthDate || null,
            email: patient.email,
            phone: patient.phone,
            sex: patient.sex,
            city: patient.city,
            height: parseFloat(patient.height) || 0,
            weight: parseFloat(patient.weight) || 0,
            goals: patient.goals,
            allergies: patient.allergies,
            pathologies: patient.pathologies,
            disliked_foods: patient.dislikedFoods,
            platos_que_no_pueden_faltar: patient.platos_que_no_pueden_faltar || null,
            notes: patient.notes || null,

            referral_source: patient.referralSource || null, // Ensure empty string becomes null for UUID
            nutritionist_id: patient.nutritionistId || null,
            payment_category_id: patient.paymentCategoryId || null, // Center / Channel
            subscription_type: patient.subscription?.type,
            subscription_type_id: patient.subscription?.subscriptionTypeId || null,
            payment_rate_id: patient.subscription?.paymentRateId || null,
            subscription_start: patient.subscription?.startDate || null,
            subscription_end: patient.subscription?.endDate || null,
            subscription_status: patient.subscription?.status || 'inactive'
        };

        const { data, error } = await supabase.from('patients').insert([dbPatient]).select().single();
        if (error) {
            console.error(error);
            return null;
        }

        // Create initial subscription record in patient_subscriptions
        if (patient.subscription?.startDate) {
            const initialSub = {
                patient_id: data.id,
                plan_name: patient.subscription.type,
                subscription_type_id: patient.subscription.subscriptionTypeId || null,
                payment_rate_id: patient.subscription.paymentRateId || null,
                start_date: patient.subscription.startDate,
                end_date: patient.subscription.endDate,
                price: plans.find(p => p.name === patient.subscription.type)?.price || 0,
                status: patient.subscription.status || 'active'
            };
            const { data: subData, error: subError } = await supabase.from('patient_subscriptions').insert([initialSub]).select().single();

            if (!subError && subData) {
                // We will attach this to the local state below
                data.subscriptionHistory = [subData];
            }
        }

        // Add empty measurements array for UI compatibility
        const newPatient = {
            ...data,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.name,
            measurements: [],
            subscriptionHistory: data.subscriptionHistory || []
        };
        setPatients(prev => [...prev, newPatient]);
        return data.id;
    };



    const addSubscriptionHistory = async (sub) => {
        const { data, error } = await supabase.from('patient_subscriptions').insert([sub]).select().single();
        if (error) {
            console.error('Error adding subscription history:', error);
            return null;
        }

        // Update local state
        setPatients(prev => prev.map(p => {
            if (p.id === sub.patient_id) {
                // Calculate days remaining if the new subscription is active
                let newDaysRemaining = p.days_remaining;
                let newSubscriptionEnd = p.subscription_end;

                if (sub.status === 'active') {
                    const endDate = parseISO(sub.end_date);
                    const today = new Date();
                    newDaysRemaining = differenceInDays(endDate, today);
                    newSubscriptionEnd = sub.end_date;
                }

                return {
                    ...p,
                    subscription_end: newSubscriptionEnd,
                    days_remaining: newDaysRemaining,
                    subscriptionHistory: [data, ...(p.subscriptionHistory || [])],
                    subscription: { // Update nested object too
                        ...p.subscription,
                        type: sub.plan_name,
                        subscriptionTypeId: sub.subscription_type_id,
                        paymentRateId: sub.payment_rate_id,
                        price: sub.price,
                        startDate: sub.start_date,
                        endDate: newSubscriptionEnd,
                        status: sub.status
                    }
                };
            }
            return p;
        }));
        return data;

    };

    const updateSubscriptionHistory = async (id, updates) => {
        const { data, error } = await supabase.from('patient_subscriptions').update(updates).eq('id', id).select().single();
        if (!error && data) {
            setPatients(prev => prev.map(p => {
                if (p.id !== data.patient_id) return p;
                // Merge the updated subscription into history
                const updatedHistory = p.subscriptionHistory?.map(h => h.id === id ? data : h) || [];
                return {
                    ...p,
                    subscriptionHistory: updatedHistory,
                };
            }));
        }
    };

    const deleteSubscription = async (id) => {
        console.log('Attempting to delete subscription:', id);
        try {
            const { data, error } = await supabase
                .from('patient_subscriptions')
                .delete()
                .eq('id', id)
                .select();

            if (error) {
                console.error('Error deleting subscription:', error);
                return { success: false, error };
            }

            console.log('Subscription deleted successfully. Data:', data);

            if (!data || data.length === 0) {
                console.warn('No rows deleted. Check if ID exists:', id);
                return { success: false, error: { message: 'No se encontró la suscripción para eliminar.' } };
            }

            // Recalculate subscriber state based on remaining history
            const patientId = data[0].patient_id;

            // Fetch updated history to determine new state
            // We use a fresh fetch to ensure we have the latest truth from the DB
            const { data: remainingHistory } = await supabase
                .from('patient_subscriptions')
                .select('*')
                .eq('patient_id', patientId)
                .order('end_date', { ascending: false }); // Latest end date first

            let patientUpdates = {};
            const cleanHistory = remainingHistory || [];

            if (cleanHistory.length === 0) {
                // No subscriptions left -> Force reset to inactive
                console.log('No subscriptions remaining. Resetting patient to inactive.');

                // Also delete any lingering extensions for this patient to prevent zombie status
                // Since extensions are only linked to patient_id, we can only safely mass-delete them
                // when the patient has NO other subscriptions.
                const { error: delExtError } = await supabase
                    .from('subscription_extensions')
                    .delete()
                    .eq('patient_id', patientId);

                if (delExtError) {
                    console.error('Error cleaning up extensions:', delExtError);
                }

                patientUpdates = {
                    subscription_status: 'inactive',
                    subscription_type: null,
                    subscription_start: null,
                    subscription_end: null,
                    days_remaining: null,
                    payment_rate_id: null,
                    subscription_type_id: null
                };
            } else {
                // Determine active/latest subscription from remaining history
                // Logic: Access the one with the furthest end date or latest start date
                // For simplicity, we take the top one from the order('end_date', { ascending: false })
                const latest = cleanHistory[0];
                const today = new Date().toISOString().split('T')[0];

                // Determine status based on dates
                // If the latest one is in the past, it's expired/inactive.
                let newStatus = latest.status;
                if (latest.end_date < today) {
                    newStatus = 'inactive';
                } else if (latest.start_date > today) {
                    newStatus = 'future'; // or whatever status logic uses
                }

                patientUpdates = {
                    subscription_status: newStatus,
                    subscription_type: latest.plan_name,
                    subscription_type_id: latest.subscription_type_id,
                    payment_rate_id: latest.payment_rate_id,
                    subscription_start: latest.start_date,
                    subscription_end: latest.end_date,
                    days_remaining: differenceInDays(parseISO(latest.end_date), new Date())
                };
            }

            // Update patient record in DB with the new calculated state
            // We ALWAYS update to sync the cached fields
            const { error: updateError } = await supabase.from('patients').update(patientUpdates).eq('id', patientId);

            if (updateError) {
                console.error('Error updating patient status after deletion:', updateError);
            }

            // Update local state
            setPatients(prev => prev.map(p => {
                if (p.id !== patientId) return p;

                // Re-construct the local 'subscription' object
                const newSubscription = {
                    type: patientUpdates.subscription_type,
                    startDate: patientUpdates.subscription_start,
                    endDate: patientUpdates.subscription_end,
                    status: patientUpdates.subscription_status,
                    subscriptionTypeId: patientUpdates.subscription_type_id,
                    paymentRateId: patientUpdates.payment_rate_id,
                    pauseStartDate: p.subscription?.pauseStartDate // Keep pause if relevant, though logic might need check
                };

                return {
                    ...p,
                    ...patientUpdates, // Spread flat updates to root
                    subscriptionHistory: cleanHistory,
                    subscription: newSubscription
                };
            }));

            return { success: true };
        } catch (err) {
            console.error('Unexpected error deleting subscription:', err);
            return { success: false, error: err };
        }
    };

    const updatePatient = async (id, updates) => {
        // Map UI updates to DB columns if keys differ
        const dbUpdates = {};
        if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
        if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;

        // Update legacy name if we have both or either parts
        if (updates.firstName !== undefined || updates.lastName !== undefined) {
            // Legacy 'name' column is no longer updated to avoid data inconsistency.
            // We rely on first_name and last_name.
        }
        // ... simplistic mapping, assuming keys match mostly.
        // CAUTION: The UI passes "subscription" object, DB has flat columns.
        if (updates.subscription) {
            dbUpdates.subscription_type = updates.subscription.type;
            dbUpdates.subscription_start = updates.subscription.startDate || null;
            if (updates.subscription.reviewDay !== undefined) {
                dbUpdates.review_day = updates.subscription.reviewDay ? parseInt(updates.subscription.reviewDay) : null;
            }
            dbUpdates.subscription_end = updates.subscription.endDate || null;
            dbUpdates.subscription_status = updates.subscription.status;
            if (updates.subscription.subscriptionTypeId) dbUpdates.subscription_type_id = updates.subscription.subscriptionTypeId || null;
            if (updates.subscription.paymentRateId) dbUpdates.payment_rate_id = updates.subscription.paymentRateId || null;

            if (updates.subscription.pauseStartDate !== undefined) dbUpdates.pause_start_date = updates.subscription.pauseStartDate || null;
        }

        // Handle direct status update (e.g. from Kanban drag & drop)
        if (updates.status !== undefined) {
            dbUpdates.subscription_status = updates.status;
        }

        if (updates.subscription_type_id) dbUpdates.subscription_type_id = updates.subscription_type_id;
        if (updates.payment_rate_id) dbUpdates.payment_rate_id = updates.payment_rate_id;
        // Spread other safe keys
        ['email', 'phone', 'sex', 'city', 'height', 'weight', 'goals', 'allergies', 'pathologies', 'platos_que_no_pueden_faltar', 'notes'].forEach(k => {
            if (updates[k] !== undefined) dbUpdates[k] = updates[k];
        });
        // Handle birthDate -> birth_date mapping
        if (updates.birthDate !== undefined) {
            // Ensure empty string becomes null to avoid invalid input syntax for type date
            dbUpdates.birth_date = updates.birthDate || null;
        }
        // Handle referralSource -> referral_source mapping
        if (updates.referralSource !== undefined) dbUpdates.referral_source = updates.referralSource || null;
        // Handle nutritionistId -> nutritionist_id mapping
        if (updates.nutritionistId !== undefined) dbUpdates.nutritionist_id = updates.nutritionistId || null;
        // Handle dislikedFoods -> disliked_foods mapping
        if (updates.dislikedFoods !== undefined) dbUpdates.disliked_foods = updates.dislikedFoods;

        // Handle reviewRequest from PatientForm (top level)
        if (updates.reviewDay !== undefined) {
            dbUpdates.review_day = updates.reviewDay ? parseInt(updates.reviewDay) : null;
        }
        // Handle paymentCategoryId -> payment_category_id mapping (Center)
        // CORRECCIÓN FORZADA: Asegurar que payment_category_id se incluye si está presente
        if (updates.paymentCategoryId !== undefined) {
            dbUpdates.payment_category_id = updates.paymentCategoryId || null;
            console.log("Forzando actualización de categoría:", dbUpdates.payment_category_id);
        }

        console.log("Payload final a Supabase:", dbUpdates);


        const { data, error } = await supabase.from('patients').update(dbUpdates).eq('id', id).select('*').single();
        if (error) {
            console.error(error);
            alert('Error al guardar: ' + error.message);
            return;
        }

        setPatients(prev => prev.map(p => p.id === id ? {
            ...p,
            ...data,
            // Explicitly ensure the new field is merged into local state (Supabase returns it in 'data' but just to be sure)
            payment_category_id: data.payment_category_id,
            review_day: data.review_day,
            status: data.subscription_status, // Ensure top-level status is updated
            subscription: {
                // ... (keep existing)
                type: data.subscription_type,
                startDate: data.subscription_start,
                endDate: data.subscription_end,
                status: data.subscription_status,
                pauseStartDate: data.pause_start_date,
                // Add missing IDs for local state
                subscriptionTypeId: data.subscription_type_id,
                paymentRateId: data.payment_rate_id,
            },
            // Ensure name is updated in local state too
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.name
        } : p));
    };

    const deletePatient = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
        const { error } = await supabase.from('patients').delete().eq('id', id);
        if (!error) {
            setPatients(prev => prev.filter(p => p.id !== id));
        }
    };

    const togglePatientPause = async (id, pauseDate = null) => {
        // Need current patient state
        const patient = patients.find(p => p.id === id);
        if (!patient) return;

        const isPaused = patient.subscription_status === 'paused' || patient.subscription?.status === 'paused';
        let dbUpdates = {};

        if (!isPaused) {
            // Pause
            const dateToUse = pauseDate ? new Date(pauseDate) : new Date();
            dbUpdates = {
                subscription_status: 'paused',
                pause_start_date: dateToUse.toISOString()
            };

            // Create pause record
            const { error: pauseError } = await supabase.from('subscription_pauses').insert([{
                patient_id: id,
                start_date: dateToUse.toISOString().split('T')[0],
                notes: 'Pausa manual'
            }]);

            if (pauseError) console.error('Error creating pause record:', pauseError);

        } else {
            // Resume
            // Find open pause record
            const openPause = patient.subscriptionPauses?.find(p => !p.end_date);
            const pauseStart = patient.pause_start_date || patient.subscription?.pauseStartDate ?
                parseISO(patient.pause_start_date || patient.subscription.pauseStartDate) : (openPause ? parseISO(openPause.start_date) : new Date());

            const resumeDate = pauseDate ? new Date(pauseDate) : new Date();
            const daysPaused = differenceInDays(resumeDate, pauseStart);

            const currentEndDate = parseISO(patient.subscription_end || patient.subscription.endDate);
            // Ensure we don't reduce end date if something is weird
            const newEndDate = addDays(currentEndDate, Math.max(0, daysPaused));

            dbUpdates = {
                subscription_status: 'active',
                subscription_end: newEndDate.toISOString().split('T')[0],
                pause_start_date: null
            };

            // Close pause record
            if (openPause) {
                const { error: closeError } = await supabase.from('subscription_pauses').update({
                    end_date: resumeDate.toISOString().split('T')[0]
                }).eq('id', openPause.id);

                if (closeError) console.error('Error closing pause record:', closeError);
            }
        }

        const { data, error } = await supabase.from('patients').update(dbUpdates).eq('id', id).select().single();
        if (!error && data) {
            // Refetch pauses to get the updated ID or closed status
            const { data: updatedPauses } = await supabase.from('subscription_pauses').select('*').eq('patient_id', id).order('start_date', { ascending: false });

            setPatients(prev => prev.map(p => p.id === id ? {
                ...p, ...data,
                subscriptionPauses: updatedPauses || [],
                subscription: {
                    type: data.subscription_type,
                    startDate: data.subscription_start,
                    endDate: data.subscription_end,
                    status: data.subscription_status,
                    pauseStartDate: data.pause_start_date
                }
            } : p));
        }
    };

    const updatePatientPause = async (pauseId, updates) => {
        const { error } = await supabase.from('subscription_pauses').update(updates).eq('id', pauseId);

        if (error) {
            console.error('Error updating pause:', error);
            throw error;
        }

        // Ideally we should know the patientId to optimize, but for now we can find it from the pause or just refresh everything.
        // Better: return the updated pause from DB to get patient_id
        const { data: updatedPause } = await supabase.from('subscription_pauses').select('patient_id').eq('id', pauseId).single();

        if (updatedPause) {
            const patientId = updatedPause.patient_id;
            // Refetch pauses for this patient
            const { data: updatedPauses } = await supabase.from('subscription_pauses').select('*').eq('patient_id', patientId).order('start_date', { ascending: false });

            setPatients(prev => prev.map(p => p.id === patientId ? {
                ...p,
                subscriptionPauses: updatedPauses || []
            } : p));
        }
    };

    const deleteSubscriptionPause = async (pauseId) => {
        console.log('deleteSubscriptionPause called with id:', pauseId);
        // Get pause to know patient_id and if it's active
        const { data: pauseToDelete } = await supabase.from('subscription_pauses').select('*').eq('id', pauseId).single();

        if (!pauseToDelete) return;

        const { error } = await supabase.from('subscription_pauses').delete().eq('id', pauseId);

        if (error) {
            console.error('Error deleting pause:', error);
            throw error;
        }

        const patientId = pauseToDelete.patient_id;
        let dbUpdates = {};

        // If we deleted an active pause (no end date), we might need to reset the patient status
        // Check if patient is currently paused
        const { data: currentPatient } = await supabase.from('patients').select('subscription_status').eq('id', patientId).single();

        if (currentPatient && currentPatient.subscription_status === 'paused' && !pauseToDelete.end_date) {
            dbUpdates = {
                subscription_status: 'active',
                pause_start_date: null
            };
            await supabase.from('patients').update(dbUpdates).eq('id', patientId);
        }

        // Refetch pauses
        const { data: updatedPauses } = await supabase.from('subscription_pauses').select('*').eq('patient_id', patientId).order('start_date', { ascending: false });

        // Update local state
        setPatients(prev => prev.map(p => p.id === patientId ? {
            ...p,
            ...dbUpdates, // Apply status updates if any
            subscriptionPauses: updatedPauses || [],
            subscription: {
                ...p.subscription,
                status: dbUpdates.subscription_status || p.subscription?.status,
                pauseStartDate: dbUpdates.pause_start_date !== undefined ? dbUpdates.pause_start_date : p.subscription?.pauseStartDate
            }
        } : p));
    };

    const addMeasurement = async (patientId, measurement) => {
        const dbMeasurement = {
            patient_id: patientId,
            date: measurement.date || new Date().toISOString(),
            weight: parseFloat(measurement.weight) || null,
            // New body measurements
            pecho: parseFloat(measurement.pecho) || null,
            brazo_izq: parseFloat(measurement.brazo_izq) || null,
            brazo_der: parseFloat(measurement.brazo_der) || null,
            sobre_ombligo: parseFloat(measurement.sobre_ombligo) || null,
            ombligo: parseFloat(measurement.ombligo) || null,
            bajo_ombligo: parseFloat(measurement.bajo_ombligo) || null,
            cadera: parseFloat(measurement.cadera) || null,
            muslo_izq: parseFloat(measurement.muslo_izq) || null,
            muslo_der: parseFloat(measurement.muslo_der) || null,
            photo: measurement.photo || null
        };
        const { data, error } = await supabase.from('measurements').insert([dbMeasurement]).select().single();
        if (!error && data) {
            setPatients(prev => prev.map(p => {
                if (p.id !== patientId) return p;
                return { ...p, measurements: [...(p.measurements || []), data] };
            }));
        }
    };

    const updateMeasurement = async (measurementId, patientId, updates) => {
        const dbUpdates = {
            date: updates.date || undefined,
            weight: updates.weight ? parseFloat(updates.weight) : null,
            pecho: updates.pecho ? parseFloat(updates.pecho) : null,
            brazo_izq: updates.brazo_izq ? parseFloat(updates.brazo_izq) : null,
            brazo_der: updates.brazo_der ? parseFloat(updates.brazo_der) : null,
            sobre_ombligo: updates.sobre_ombligo ? parseFloat(updates.sobre_ombligo) : null,
            ombligo: updates.ombligo ? parseFloat(updates.ombligo) : null,
            bajo_ombligo: updates.bajo_ombligo ? parseFloat(updates.bajo_ombligo) : null,
            cadera: updates.cadera ? parseFloat(updates.cadera) : null,
            muslo_izq: updates.muslo_izq ? parseFloat(updates.muslo_izq) : null,
            muslo_der: updates.muslo_der ? parseFloat(updates.muslo_der) : null,
            photo: updates.photo !== undefined ? updates.photo : undefined
        };
        // Remove undefined values
        Object.keys(dbUpdates).forEach(k => dbUpdates[k] === undefined && delete dbUpdates[k]);

        const { data, error } = await supabase.from('measurements').update(dbUpdates).eq('id', measurementId).select().single();
        if (!error && data) {
            setPatients(prev => prev.map(p => {
                if (p.id !== patientId) return p;
                return {
                    ...p,
                    measurements: (p.measurements || []).map(m => m.id === measurementId ? data : m)
                };
            }));
        }
    };

    const deleteMeasurement = async (measurementId, patientId) => {
        if (!confirm('¿Eliminar esta medición?')) return;
        const { error } = await supabase.from('measurements').delete().eq('id', measurementId);
        if (!error) {
            setPatients(prev => prev.map(p => {
                if (p.id !== patientId) return p;
                return {
                    ...p,
                    measurements: (p.measurements || []).filter(m => m.id !== measurementId)
                };
            }));
        }
    };



    // PLANS
    const addPlan = async (plan) => {
        const { data, error } = await supabase.from('plans').insert([{ ...plan, id: plan.name.toLowerCase().replace(/\s+/g, '_') }]).select().single();
        if (!error) setPlans(prev => [...prev, data]);
    };
    const updatePlan = async (id, updates) => {
        const { data, error } = await supabase.from('plans').update(updates).eq('id', id).select().single();
        if (!error) setPlans(prev => prev.map(p => p.id === id ? data : p));
    };
    const deletePlan = async (id) => {
        const { error } = await supabase.from('plans').delete().eq('id', id);
        if (!error) setPlans(prev => prev.filter(p => p.id !== id));
    };

    // TASKS
    const addTask = async (task) => {
        // UI uses 'tag', DB uses 'tag_id'.
        const dbTask = {
            title: task.title,
            tag_id: task.tag,
            type_id: task.type,
            due_date: task.dueDate || null,
            completed: false
        };
        const { data, error } = await supabase.from('tasks').insert([dbTask]).select().single();
        if (!error) setTasks(prev => [...prev, { ...data, tag: data.tag_id, type: data.type_id }]);
    };
    const updateTask = async (id, updates) => {
        const dbUpdates = {};
        if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        const { data, error } = await supabase.from('tasks').update(dbUpdates).eq('id', id).select().single();
        if (!error) setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data, tag: data.tag_id, type: data.type_id } : t));
    };
    const deleteTask = async (id) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (!error) setTasks(prev => prev.filter(t => t.id !== id));
    };

    // REVIEWS
    const saveReview = async (reviewId, data) => {
        // reviewId format: review_{patientId}_{date}
        // Need to extract patientId and date, OR just store reviewId as is?
        // My table schema has: id (text PK).
        const dbEntry = {
            id: reviewId,
            patient_id: reviewId.split('_')[1],
            date: reviewId.split('_')[2], // Assuming YYYY-MM-DD
            ...data
        };
        const { data: res, error } = await supabase.from('reviews').upsert(dbEntry).select().single();
        if (!error) {
            setReviews(prev => ({ ...prev, [reviewId]: res }));
        }
    };

    // CATEGORIES & TYPES
    const addTaskCategory = async (cat) => {
        const { data, error } = await supabase.from('task_categories').insert([cat]).select().single();
        if (!error) setTaskCategories(prev => [...prev, data]);
    };
    const updateTaskCategory = async (id, updates) => {
        const { data, error } = await supabase.from('task_categories').update(updates).eq('id', id).select().single();
        if (!error) setTaskCategories(prev => prev.map(c => c.id === id ? data : c));
    };
    const deleteTaskCategory = async (id) => {
        const { error } = await supabase.from('task_categories').delete().eq('id', id);
        if (!error) setTaskCategories(prev => prev.filter(c => c.id !== id));
    };



    // TYPE ACTIONS
    const addTaskType = async (type) => {
        const { data, error } = await supabase.from('task_types').insert([type]).select().single();
        if (!error) setTaskTypes(prev => [...prev, data]);
    };
    const updateTaskType = async (id, updates) => {
        const { data, error } = await supabase.from('task_types').update(updates).eq('id', id).select().single();
        if (!error) setTaskTypes(prev => prev.map(t => t.id === id ? data : t));
    };
    const deleteTaskType = async (id) => {
        const { error } = await supabase.from('task_types').delete().eq('id', id);
        if (!error) setTaskTypes(prev => prev.filter(t => t.id !== id));
    };

    // PAYMENTS
    const addPayment = async (payment) => {
        // Ensure subscription_id is passed if available
        const dbPayment = {
            ...payment,
            subscription_id: payment.subscription_id || null
        };
        const { data, error } = await supabase.from('payments').insert([dbPayment]).select().single();
        if (error) {
            console.error("Error adding payment:", error);
        } else {
            setPayments(prev => [...prev, data]);
        }
    };
    const updatePayment = async (id, updates) => {
        const { data, error } = await supabase.from('payments').update(updates).eq('id', id).select().single();
        if (error) {
            console.error("Error updating payment:", error);
        } else {
            setPayments(prev => prev.map(p => p.id === id ? data : p));
        }
    };
    const deletePayment = async (id) => {
        const { error } = await supabase.from('payments').delete().eq('id', id);
        if (!error) setPayments(prev => prev.filter(p => p.id !== id));
    };

    // PAYMENT METHODS
    const addPaymentMethod = async (method) => {
        const { data, error } = await supabase.from('payment_methods').insert([method]).select().single();
        if (!error) setPaymentMethods(prev => [...prev, data]);
    };
    const updatePaymentMethod = async (id, updates) => {
        const { data, error } = await supabase.from('payment_methods').update(updates).eq('id', id).select().single();
        if (!error) setPaymentMethods(prev => prev.map(m => m.id === id ? data : m));
    };
    const deletePaymentMethod = async (id) => {
        const { error } = await supabase.from('payment_methods').delete().eq('id', id);
        if (!error) setPaymentMethods(prev => prev.filter(m => m.id !== id));
    };

    // PAYMENT CATEGORIES
    const addPaymentCategory = async (cat) => {
        const { data, error } = await supabase.from('payment_categories').insert([cat]).select().single();
        if (!error) setPaymentCategories(prev => [...prev, data]);
    };
    const updatePaymentCategory = async (id, updates) => {
        const { data, error } = await supabase.from('payment_categories').update(updates).eq('id', id).select().single();
        if (!error) setPaymentCategories(prev => prev.map(c => c.id === id ? data : c));
    };
    const deletePaymentCategory = async (id) => {
        const { error } = await supabase.from('payment_categories').delete().eq('id', id);
        if (!error) setPaymentCategories(prev => prev.filter(c => c.id !== id));
    };

    // REFERRAL SOURCES
    const addReferralSource = async (source) => {
        const { data, error } = await supabase.from('referral_sources').insert([source]).select().single();
        if (!error) setReferralSources(prev => [...prev, data]);
    };
    const updateReferralSource = async (id, updates) => {
        const { data, error } = await supabase.from('referral_sources').update(updates).eq('id', id).select().single();
        if (!error) setReferralSources(prev => prev.map(s => s.id === id ? data : s));
    };
    const deleteReferralSource = async (id) => {
        const { error } = await supabase.from('referral_sources').delete().eq('id', id);
        if (!error) setReferralSources(prev => prev.filter(s => s.id !== id));
    };

    // NUTRITIONISTS
    const addNutritionist = async (nutri) => {
        const { data, error } = await supabase.from('nutritionists').insert([nutri]).select().single();
        if (!error) setNutritionists(prev => [...prev, data]);
        return data; // Return the created record so callers can get the ID
    };
    const updateNutritionist = async (id, updates) => {
        const { data, error } = await supabase.from('nutritionists').update(updates).eq('id', id).select().single();
        if (!error) {
            setNutritionists(prev => prev.map(n => n.id === id ? data : n));
            // Keep profile name in sync when label (name) changes
            if (updates.label && data?.user_id) {
                await supabase.from('profiles').update({ full_name: updates.label }).eq('id', data.user_id);
            }
        }
    };
    const deleteNutritionist = async (id) => {
        const { error } = await supabase.from('nutritionists').delete().eq('id', id);
        if (!error) setNutritionists(prev => prev.filter(n => n.id !== id));
    };

    // FOODS
    const addFood = async (food) => {
        const { data, error } = await supabase.from('foods').insert([food]).select().single();
        if (!error) setFoods(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        return data;
    };
    const updateFood = async (id, updates) => {
        const { data, error } = await supabase.from('foods').update(updates).eq('id', id).select().single();
        if (!error) setFoods(prev => prev.map(f => f.id === id ? data : f));
    };
    const deleteFood = async (id) => {
        const { error } = await supabase.from('foods').delete().eq('id', id);
        if (!error) setFoods(prev => prev.filter(f => f.id !== id));
    };

    // RECIPES
    const addRecipe = async (recipe, ingredients = [], categoryIds = []) => {
        const { data, error } = await supabase.from('recipes').insert([{ name: recipe.name, description: recipe.description, tags: recipe.tags || [] }]).select().single();
        if (error) return null;
        // Link categories
        if (categoryIds.length > 0) {
            await supabase.from('recipe_category_links').insert(categoryIds.map(cid => ({ recipe_id: data.id, category_id: cid })));
        }
        // Add ingredients
        if (ingredients.length > 0) {
            await supabase.from('recipe_ingredients').insert(ingredients.map(ing => ({ recipe_id: data.id, food_id: ing.food_id, quantity_grams: ing.quantity_grams })));
        }
        await fetchData(); // Refetch to get joined data
        return data;
    };
    const updateRecipe = async (id, recipe, ingredients = [], categoryIds = []) => {
        await supabase.from('recipes').update({ name: recipe.name, description: recipe.description, tags: recipe.tags || [] }).eq('id', id);
        // Replace categories
        await supabase.from('recipe_category_links').delete().eq('recipe_id', id);
        if (categoryIds.length > 0) {
            await supabase.from('recipe_category_links').insert(categoryIds.map(cid => ({ recipe_id: id, category_id: cid })));
        }
        // Replace ingredients
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
        if (ingredients.length > 0) {
            await supabase.from('recipe_ingredients').insert(ingredients.map(ing => ({ recipe_id: id, food_id: ing.food_id, quantity_grams: ing.quantity_grams })));
        }
        await fetchData();
    };
    const deleteRecipe = async (id) => {
        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (!error) setRecipes(prev => prev.filter(r => r.id !== id));
    };

    // RECIPE CATEGORIES
    const addRecipeCategory = async (cat) => {
        const { data, error } = await supabase.from('recipe_categories').insert([cat]).select().single();
        if (!error) setRecipeCategories(prev => [...prev, data]);
        return data;
    };
    const updateRecipeCategory = async (id, updates) => {
        const { data, error } = await supabase.from('recipe_categories').update(updates).eq('id', id).select().single();
        if (!error) setRecipeCategories(prev => prev.map(c => c.id === id ? data : c));
    };
    const deleteRecipeCategory = async (id) => {
        const { error } = await supabase.from('recipe_categories').delete().eq('id', id);
        if (!error) setRecipeCategories(prev => prev.filter(c => c.id !== id));
    };

    // MEAL PLANS
    const addMealPlan = async (plan) => {
        const { data, error } = await supabase.from('meal_plans').insert([plan]).select().single();
        if (!error) setMealPlans(prev => [data, ...prev]);
        return data;
    };
    const updateMealPlan = async (id, updates) => {
        const { data, error } = await supabase.from('meal_plans').update(updates).eq('id', id).select().single();
        if (!error) setMealPlans(prev => prev.map(p => p.id === id ? data : p));
    };
    const deleteMealPlan = async (id) => {
        try {
            const { error } = await supabase.from('meal_plans').delete().eq('id', id);
            if (error) throw error;
            setMealPlans(prev => prev.filter(p => p.id !== id));
            setMealPlanItems(prev => prev.filter(i => i.plan_id !== id));
            return true;
        } catch (error) {
            console.error('Error deleting meal plan:', error);
            return false;
        }
    };

    // Indication Templates
    const addIndicationTemplate = async (template) => {
        try {
            const { data, error } = await supabase.from('indication_templates').insert([template]).select().single();
            if (error) throw error;
            setIndicationTemplates(prev => [...prev, data]);
            return data;
        } catch (error) {
            console.error('Error adding indication template:', error);
            throw error;
        }
    };

    const updateIndicationTemplate = async (id, updates) => {
        try {
            const { data, error } = await supabase.from('indication_templates').update(updates).eq('id', id).select().single();
            if (error) throw error;
            setIndicationTemplates(prev => prev.map(t => t.id === id ? data : t));
            return data;
        } catch (error) {
            console.error('Error updating indication template:', error);
            throw error;
        }
    };

    const deleteIndicationTemplate = async (id) => {
        try {
            const { error } = await supabase.from('indication_templates').delete().eq('id', id);
            if (error) throw error;
            setIndicationTemplates(prev => prev.filter(t => t.id !== id));
            return true;
        } catch (error) {
            console.error('Error deleting indication template:', error);
            return false;
        }
    };

    // MEAL PLAN ITEMS
    const saveMealPlanItems = async (planId, items) => {
        // Replace all items for a plan
        await supabase.from('meal_plan_items').delete().eq('plan_id', planId);
        if (items.length > 0) {
            const toInsert = items.map((item, idx) => ({
                plan_id: planId,
                meal_name: item.meal_name,
                day_of_week: item.day_of_week || null,
                sort_order: idx,
                recipe_id: item.recipe_id || null,
                free_text: item.free_text || null,
                custom_recipe_data: item.custom_recipe_data || null,
            }));
            await supabase.from('meal_plan_items').insert(toInsert);
        }
        // Refetch items to get joined recipe data
        const { data } = await supabase.from('meal_plan_items').select('*, recipes(*, recipe_ingredients(*, foods(*)))').eq('plan_id', planId).order('sort_order', { ascending: true });
        if (data) {
            setMealPlanItems(prev => [...prev.filter(i => i.plan_id !== planId), ...data]);
        }
    };

    // Clone a plan (for templates)
    const cloneMealPlan = async (sourcePlanId, overrides = {}) => {
        const sourcePlan = mealPlans.find(p => p.id === sourcePlanId);
        if (!sourcePlan) return null;
        const { id, created_at, ...planData } = sourcePlan;
        const newPlan = await addMealPlan({ ...planData, ...overrides, is_template: false });
        if (!newPlan) return null;
        const sourceItems = mealPlanItems.filter(i => i.plan_id === sourcePlanId);
        const newItems = sourceItems.map(item => ({
            meal_name: item.meal_name,
            day_of_week: item.day_of_week,
            sort_order: item.sort_order,
            recipe_id: item.recipe_id,
            free_text: item.free_text,
        }));
        await saveMealPlanItems(newPlan.id, newItems);
        return newPlan;
    };

    // PROFILE
    const updateUserProfile = async (updates) => {
        // User profile is a singleton row usually. ID=1 (from SQL sequence) or any.
        // Or we key by user email. For now, assume there's one row.
        // We'll update row where id=1 (or whatever we loaded).
        const id = userProfile.id;
        const { data, error } = await supabase.from('user_profile').update(updates).eq('id', id).select().single();
        if (!error) setUserProfile(data);
    };

    // Memoized computed values
    const normalizedPatients = useMemo(() => patients.map(p => ({
        ...p,
        subscription: {
            type: p.subscription_type,
            startDate: p.subscription_start,
            endDate: p.subscription_end,
            status: p.subscription_status,
            pauseStartDate: p.pause_start_date,
            subscriptionTypeId: p.subscription_type_id,
            paymentRateId: p.payment_rate_id
        }
    })), [patients]);

    // CLINICAL OPTIONS
    const addClinicalOption = async (option) => {
        const { data, error } = await supabase.from('clinical_options').insert([option]).select().single();
        if (error) {
            console.error(error);
            return;
        }
        setClinicalOptions(prev => [...prev, data]);
    };

    const updateClinicalOption = async (id, updates) => {
        const { data, error } = await supabase.from('clinical_options').update(updates).eq('id', id).select().single();
        if (error) {
            console.error(error);
            return;
        }
        setClinicalOptions(prev => prev.map(c => c.id === id ? data : c));
    };

    const deleteClinicalOption = async (id) => {
        const { error } = await supabase.from('clinical_options').delete().eq('id', id);
        if (error) {
            console.error(error);
            return;
        }
        setClinicalOptions(prev => prev.filter(c => c.id !== id));
    };

    // CLINICAL CATEGORIES
    const addClinicalCategory = async (cat) => {
        const { data, error } = await supabase.from('clinical_categories').insert([cat]).select().single();
        if (!error) setClinicalCategories(prev => [...prev, data]);
    };
    const updateClinicalCategory = async (id, updates) => {
        const { data, error } = await supabase.from('clinical_categories').update(updates).eq('id', id).select().single();
        if (error) {
            console.error('Error updating clinical category:', error);
            return;
        }
        // Handle case where local state might be empty (using fallback) - add if doesn't exist
        setClinicalCategories(prev => {
            const exists = prev.some(c => c.id === id);
            if (exists) {
                return prev.map(c => c.id === id ? data : c);
            } else {
                return [...prev, data];
            }
        });
    };
    const deleteClinicalCategory = async (id) => {
        const { error } = await supabase.from('clinical_categories').delete().eq('id', id);
        if (!error) setClinicalCategories(prev => prev.filter(c => c.id !== id));
    };

    // SUBSCRIPTION TYPES
    const addSubscriptionType = async (type) => {
        const { data, error } = await supabase.from('subscription_types').insert([type]).select().single();
        if (!error) setSubscriptionTypes(prev => [...prev, data].sort((a, b) => a.months - b.months));
    };
    const updateSubscriptionType = async (id, updates) => {
        const { data, error } = await supabase.from('subscription_types').update(updates).eq('id', id).select().single();
        if (!error) setSubscriptionTypes(prev => prev.map(t => t.id === id ? data : t).sort((a, b) => a.months - b.months));
    };
    const deleteSubscriptionType = async (id) => {
        const { error } = await supabase.from('subscription_types').delete().eq('id', id);
        if (!error) setSubscriptionTypes(prev => prev.filter(t => t.id !== id));
    };

    // PAYMENT RATES
    const addPaymentRate = async (rate) => {
        const { data, error } = await supabase.from('payment_rates').insert([rate]).select().single();
        if (!error) setPaymentRates(prev => [...prev, data].sort((a, b) => a.amount - b.amount));
    };
    const updatePaymentRate = async (id, updates) => {
        const { data, error } = await supabase.from('payment_rates').update(updates).eq('id', id).select().single();
        if (!error) setPaymentRates(prev => prev.map(r => r.id === id ? data : r).sort((a, b) => a.amount - b.amount));
    };
    const deletePaymentRate = async (id) => {
        const { error } = await supabase.from('payment_rates').delete().eq('id', id);
        if (!error) setPaymentRates(prev => prev.filter(r => r.id !== id));
    };

    const extendSubscription = async (patientId, daysToAdd) => {
        try {
            const patient = patients.find(p => p.id === patientId);
            if (!patient || !patient.subscription_end) return false;

            const currentEnd = parseISO(patient.subscription_end);
            const newEnd = addDays(currentEnd, parseInt(daysToAdd));
            const newEndDateStr = format(newEnd, 'yyyy-MM-dd');

            // 1. Update patient subscription_end
            const { error: patientError } = await supabase
                .from('patients')
                .update({ subscription_end: newEndDateStr })
                .eq('id', patientId);

            if (patientError) throw patientError;

            // 2. Update the active subscription history record if it exists
            // Find the active subscription to get its ID
            const { data: activeSubs } = await supabase
                .from('patient_subscriptions')
                .select('id')
                .eq('patient_id', patientId)
                .eq('status', 'active')
                .order('start_date', { ascending: false })
                .limit(1);

            if (activeSubs && activeSubs.length > 0) {
                await supabase
                    .from('patient_subscriptions')
                    .update({ end_date: newEndDateStr })
                    .eq('id', activeSubs[0].id);
            }

            // 3. Update local state
            setPatients(prev => prev.map(p => {
                if (p.id === patientId) {
                    const updatedHistory = p.subscriptionHistory ? p.subscriptionHistory.map(sub => {
                        if (activeSubs && activeSubs.length > 0 && sub.id === activeSubs[0].id) {
                            return { ...sub, end_date: newEndDateStr };
                        }
                        return sub;
                    }) : p.subscriptionHistory;

                    return {
                        ...p,
                        subscription_end: newEndDateStr,
                        days_remaining: differenceInDays(newEnd, new Date()), // Update days_remaining
                        subscriptionHistory: updatedHistory,
                        // Also update nested subscription object for immediate UI reflection
                        subscription: {
                            ...p.subscription,
                            endDate: newEndDateStr
                        }
                    };
                }
                return p;
            }));

            // 4. Log the extension
            const { data: logData, error: logError } = await supabase
                .from('subscription_extensions')
                .insert([{
                    patient_id: patientId,
                    days_added: parseInt(daysToAdd),
                    previous_end_date: patient.subscription_end,
                    new_end_date: newEndDateStr
                }])
                .select()
                .single();

            if (!logError && logData) {
                setSubscriptionExtensions(prev => [logData, ...prev]);
            }

            return true;
        } catch (error) {
            console.error('Error extending subscription:', error);
            return false;
        }
    };

    const updateSubscriptionExtension = async (id, daysAdded) => {
        try {
            const extension = subscriptionExtensions.find(e => e.id === id);
            if (!extension) return false;

            const diff = parseInt(daysAdded) - extension.days_added;
            if (diff === 0) return true;

            // 1. Update the extension record
            const { data: updatedExt, error: extError } = await supabase
                .from('subscription_extensions')
                .update({ days_added: parseInt(daysAdded) })
                .eq('id', id)
                .select()
                .single();

            if (extError) throw extError;

            // 2. Adjust patient subscription end date
            const patient = patients.find(p => p.id === extension.patient_id);
            if (patient && patient.subscription_end) {
                // Determine which date to adjust.
                // Creating a new end date based on current end date + difference
                const currentEnd = parseISO(patient.subscription_end);
                const newEnd = addDays(currentEnd, diff);
                const newEndDateStr = format(newEnd, 'yyyy-MM-dd');

                await supabase.from('patients').update({ subscription_end: newEndDateStr }).eq('id', patient.id);

                // Also update active history if matches
                const { data: activeSubs } = await supabase
                    .from('patient_subscriptions')
                    .select('id')
                    .eq('patient_id', patient.id)
                    .eq('status', 'active')
                    .order('start_date', { ascending: false })
                    .limit(1);

                if (activeSubs && activeSubs.length > 0) {
                    await supabase
                        .from('patient_subscriptions')
                        .update({ end_date: newEndDateStr })
                        .eq('id', activeSubs[0].id);
                }

                // Update local state
                setPatients(prev => prev.map(p => {
                    if (p.id === patient.id) {
                        const newDaysRemaining = differenceInDays(newEnd, new Date());
                        const oldEndDate = patient.subscription_end;

                        const updatedHistory = p.subscriptionHistory ? p.subscriptionHistory.map(sub => {
                            const isMatch = (activeSubs && activeSubs.length > 0 && sub.id === activeSubs[0].id) ||
                                (sub.end_date === oldEndDate);
                            if (isMatch) {
                                return { ...sub, end_date: newEndDateStr };
                            }
                            return sub;
                        }) : p.subscriptionHistory;

                        return {
                            ...p,
                            subscription_end: newEndDateStr,
                            days_remaining: newDaysRemaining,
                            subscriptionHistory: updatedHistory,
                            subscription: {
                                ...p.subscription,
                                endDate: newEndDateStr
                            }
                        };
                    }
                    return p;
                }));
            }

            // Update local extension state
            setSubscriptionExtensions(prev => prev.map(e => e.id === id ? updatedExt : e));

            return true;
        } catch (error) {
            console.error('Error updating extension:', error);
            return false;
        }
    };

    const deleteSubscriptionExtension = async (id) => {
        try {
            const extension = subscriptionExtensions.find(e => e.id === id);
            if (!extension) return false;

            // 1. Delete extension
            const { error } = await supabase.from('subscription_extensions').delete().eq('id', id);
            if (error) throw error;

            // 2. Revert dates (subtract days_added)
            const patient = patients.find(p => p.id === extension.patient_id);
            if (patient && patient.subscription_end) {
                const currentEnd = parseISO(patient.subscription_end);
                const newEnd = addDays(currentEnd, -extension.days_added);
                const newEndDateStr = format(newEnd, 'yyyy-MM-dd');

                await supabase.from('patients').update({ subscription_end: newEndDateStr }).eq('id', patient.id);

                // Also update active history if matches
                const { data: activeSubs } = await supabase
                    .from('patient_subscriptions')
                    .select('id')
                    .eq('patient_id', patient.id)
                    .eq('status', 'active')
                    .order('start_date', { ascending: false })
                    .limit(1);

                if (activeSubs && activeSubs.length > 0) {
                    await supabase
                        .from('patient_subscriptions')
                        .update({ end_date: newEndDateStr })
                        .eq('id', activeSubs[0].id);
                }

                // Update local state
                setPatients(prev => prev.map(p => {
                    if (p.id === patient.id) {
                        const newDaysRemaining = differenceInDays(newEnd, new Date());
                        const oldEndDate = patient.subscription_end;

                        const updatedHistory = p.subscriptionHistory ? p.subscriptionHistory.map(sub => {
                            const isMatch = (activeSubs && activeSubs.length > 0 && sub.id === activeSubs[0].id) ||
                                (sub.end_date === oldEndDate);
                            if (isMatch) {
                                return { ...sub, end_date: newEndDateStr };
                            }
                            return sub;
                        }) : p.subscriptionHistory;

                        return {
                            ...p,
                            subscription_end: newEndDateStr,
                            days_remaining: newDaysRemaining,
                            subscriptionHistory: updatedHistory,
                            subscription: {
                                ...p.subscription,
                                endDate: newEndDateStr
                            }
                        };
                    }
                    return p;
                }));
            }

            setSubscriptionExtensions(prev => prev.filter(e => e.id !== id));
            return true;
        } catch (error) {
            console.error('Error deleting extension:', error);
            return false;
        }
    };

    const normalizedTasks = useMemo(() =>
        tasks.map(t => ({ ...t, tag: t.tag_id, type: t.type_id })),
        [tasks]);

    return (
        <DataContext.Provider value={{
            loading,
            patients: normalizedPatients,
            addPatient,
            updatePatient,
            deletePatient,
            addMeasurement,
            updateMeasurement,
            deleteMeasurement,



            plans,
            addPlan,
            updatePlan,
            deletePlan,

            tasks: normalizedTasks,
            addTask,
            updateTask,
            deleteTask,
            addSubscriptionHistory,
            updateSubscriptionHistory,
            deleteSubscription,

            taskCategories,
            addTaskCategory,
            updateTaskCategory,
            deleteTaskCategory,

            taskTypes,
            addTaskType,
            updateTaskType,
            deleteTaskType,

            payments,
            addPayment,
            updatePayment,
            deletePayment,

            paymentMethods,
            addPaymentMethod,
            updatePaymentMethod,
            deletePaymentMethod,

            paymentCategories,
            addPaymentCategory,
            updatePaymentCategory,
            deletePaymentCategory,

            referralSources,
            addReferralSource,
            updateReferralSource,
            deleteReferralSource,

            nutritionists,
            addNutritionist,
            updateNutritionist,
            deleteNutritionist,

            clinicalOptions,
            addClinicalOption,
            updateClinicalOption,
            deleteClinicalOption,

            clinicalCategories,
            addClinicalCategory,
            updateClinicalCategory,
            deleteClinicalCategory,

            subscriptionTypes,
            addSubscriptionType,
            updateSubscriptionType,
            deleteSubscriptionType,

            paymentRates,
            addPaymentRate,
            updatePaymentRate,
            deletePaymentRate,
            extendSubscription,
            updateSubscriptionExtension,
            deleteSubscriptionExtension,
            subscriptionExtensions,

            userProfile,
            updateUserProfile,

            reviews,
            saveReview,
            refreshData: fetchData,

            foods,
            addFood,
            updateFood,
            deleteFood,

            recipes,
            addRecipe,
            updateRecipe,
            deleteRecipe,

            recipeCategories,
            addRecipeCategory,
            updateRecipeCategory,
            deleteRecipeCategory,

            mealPlans,
            mealPlanItems,
            addMealPlan,
            updateMealPlan,
            deleteMealPlan,
            saveMealPlanItems,
            cloneMealPlan,

            indicationTemplates,
            addIndicationTemplate,
            updateIndicationTemplate,
            deleteIndicationTemplate
        }}>
            {children}
        </DataContext.Provider>
    );
};
