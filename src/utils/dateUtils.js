import { format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale'; // Default to spanish if needed, though safeFormat didn't use it directly in the helper logic, but good practice.

// Helper to calculate age from birth date
export const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), parseISO(birthDate));
};

export const safeFormat = (dateStr, fmt = 'dd/MM/yyyy', options = {}) => {
    if (!dateStr) return '-';
    // Handle if dateStr is already a Date object
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (date instanceof Date && isNaN(date.getTime())) return '-';
    try {
        return format(date, fmt, options);
    } catch (e) {
        return '-';
    }
};
