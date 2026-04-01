import { addDays, parseISO, differenceInDays, format } from 'date-fns';

export const getProjectedEndDateStr = (patient) => {
    if (!patient?.subscription?.endDate && !patient?.subscription_end) return null;
    
    const isPaused = patient.subscription_status === 'paused' || patient.subscription?.status === 'paused';
    const originalEndDateStr = patient.subscription?.endDate || patient.subscription_end;
    const originalEnd = parseISO(originalEndDateStr);
    
    if (!isPaused) {
        return originalEndDateStr;
    }

    const pauseStartDateStr = patient.pause_start_date || patient.subscription?.pauseStartDate;
    if (!pauseStartDateStr) return originalEndDateStr;

    const pauseStart = parseISO(pauseStartDateStr);
    const today = new Date();
    const daysPaused = differenceInDays(today, pauseStart);
    
    const projectedEnd = addDays(originalEnd, Math.max(0, daysPaused));
    return format(projectedEnd, 'yyyy-MM-dd');
};

export const getProjectedDaysRemaining = (patient) => {
    const projectedEndStr = getProjectedEndDateStr(patient);
    if (!projectedEndStr) return null;
    const projectedEnd = parseISO(projectedEndStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // reset time for accurate diff
    return differenceInDays(projectedEnd, today);
};

export const calculateSubscriptionTerms = (patient, payments = []) => {
    try {
        if (!patient || !patient.subscriptionHistory || !Array.isArray(patient.subscriptionHistory)) return [];

        const terms = patient.subscriptionHistory.map(sub => {
            // Safe parse
            if (!sub || !sub.start_date) return null;
            const start = parseISO(sub.start_date);
            if (isNaN(start.getTime())) return null;

            const end = sub.end_date ? parseISO(sub.end_date) : addDays(start, 30);
            const validEnd = isNaN(end.getTime()) ? addDays(start, 30) : end;

            // Find matching payment - only by explicit link (subscription_id)
            const payment = payments.find(p => p.subscription_id === sub.id);

            const today = new Date().toISOString().split('T')[0];
            const isCurrentTime = sub.start_date <= today && sub.end_date >= today;
            const isFuture = sub.start_date > today;

            let derivedStatus = 'archived';
            if (isFuture) derivedStatus = 'future';
            else if (isCurrentTime) derivedStatus = 'active';
            else derivedStatus = 'expired';

            if (sub.status === 'cancelled') derivedStatus = 'cancelled';
            if (sub.status === 'paused') derivedStatus = 'paused';

            return {
                id: sub.id,
                type: isCurrentTime ? 'current' : 'history',
                label: sub.plan_name || 'Suscripción',
                start: start,
                end: validEnd,
                status: derivedStatus,
                payment: payment, // Keep original payment object
                isPaid: !!payment, // Keep original isPaid
                originalData: sub, // Keep originalData
                payment_rate_id: sub.payment_rate_id, // Keep original payment_rate_id
                price: sub.price || sub.amount // Keep original price
            };
        }).filter(Boolean);

        // Sort by start date descending
        return terms.sort((a, b) => b.start - a.start);
    } catch (e) {
        console.error("Error calculating subscription terms:", e);
        return [];
    }
};
