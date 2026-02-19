import { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { safeFormat } from '../../../utils/dateUtils';
import { addDays, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, CheckSquare, Square, PenLine, Calendar as CalendarIcon } from 'lucide-react';

const ReviewsTab = ({ patient }) => {
    const { reviews, saveReview } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());

    // Helper to find next specific day of week (0=Sun, 1=Mon...)
    const getNextDayOfWeek = (date, dayOfWeek) => {
        const resultDate = new Date(date.getTime());
        resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
        if (resultDate <= date) {
            resultDate.setDate(resultDate.getDate() + 7);
        }
        return resultDate;
    };

    if (!patient.subscription?.startDate) {
        return (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                <CalendarIcon className="text-gray-300 mb-4 mx-auto" size={48} />
                <p className="text-gray-500 font-medium">No hay suscripción activa.</p>
                <p className="text-sm text-gray-400">Configura una fecha de inicio para ver las revisiones.</p>
            </div>
        );
    }

    // 1. Get ALL reviews from history (saved in DB)
    const historyReviews = Object.values(reviews || {}).filter(r =>
        r.id.startsWith(`review_${patient.id}_`)
    ).map(r => ({
        sysId: r.id,
        date: parseISO(r.date), // Ensure date is parsed
        type: 'Revisión',
        completed: r.completed || false,
        notes: r.notes || ''
    }));

    // 2. Generate scheduled reviews from CURRENT subscription
    const scheduledReviews = [];
    const start = parseISO(patient.subscription.startDate);
    const end = patient.subscription.endDate ? parseISO(patient.subscription.endDate) : addDays(start, 30);


    let reviewDate;
    if (patient.review_day) {
        // Find first review day AFTER start date
        // review_day is 1-5 (Mon-Fri).
        reviewDate = getNextDayOfWeek(start, parseInt(patient.review_day));
    } else {
        // Default to start date + 7 days if no review day is set
        reviewDate = addDays(start, 7);
    }

    while (reviewDate <= end) {
        const reviewId = `review_${patient.id}_${format(reviewDate, 'yyyy-MM-dd')}`;
        // Only add if NOT already in history (prefer history data)
        const inHistory = historyReviews.some(h => h.sysId === reviewId);

        if (!inHistory) {
            const savedData = reviews?.[reviewId] || {}; // Redundant check but safe
            scheduledReviews.push({
                sysId: reviewId,
                date: reviewDate,
                type: 'Revisión',
                completed: savedData.completed || false,
                notes: savedData.notes || ''
            });
        }
        reviewDate = addDays(reviewDate, 7);
    }

    // 3. Merge and Filter by Month
    const allEvents = [...historyReviews, ...scheduledReviews].sort((a, b) => a.date - b.date);

    // Filter for current view month
    const startOfMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const visibleEvents = allEvents.filter(evt =>
        evt.date >= startOfMonthDate && evt.date <= endOfMonthDate
    );

    const handleToggleComplete = (sysId, currentStatus) => {
        saveReview(sysId, { completed: !currentStatus });
    };

    const handleNotesChange = (sysId, note) => {
        saveReview(sysId, { notes: note });
    };

    const changeMonth = (increment) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + increment);
            return newDate;
        });
    };

    return (
        <div className="card h-full flex flex-col">
            <div className="card-header flex justify-between items-center">
                <h3 className="card-title text-primary dark:text-primary-400">Revisiones Semanales</h3>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 rounded-lg p-1">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all text-slate-500">
                        <ArrowLeft size={18} />
                    </button>
                    <span className="text-sm font-semibold w-32 text-center capitalize text-slate-700 dark:text-slate-300">
                        {safeFormat(currentDate, 'MMMM yyyy', { locale: es })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all text-slate-500">
                        <ArrowLeft size={18} className="rotate-180" />
                    </button>
                </div>
            </div>

            {visibleEvents.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-400 italic">No hay revisiones en este mes.</p>
                </div>
            ) : (
                <div className="table-responsive flex-1">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-12 text-center">Estado</th>
                                <th className="w-40">Fecha</th>
                                <th>Notas de Revisión</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleEvents.map((evt) => (
                                <tr key={evt.sysId} className={`${evt.completed ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-primary-50 dark:hover:bg-primary-900/10'} border-b border-slate-100 dark:border-slate-800 last:border-0`}>
                                    <td className="text-center">
                                        <button
                                            onClick={() => handleToggleComplete(evt.sysId, evt.completed)}
                                            className={`p-1 rounded transition-colors ${evt.completed ? 'text-green-600 hover:text-green-700' : 'text-slate-300 hover:text-slate-500'}`}
                                            title={evt.completed ? "Marcar como pendiente" : "Marcar como hecho"}
                                        >
                                            {evt.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </button>
                                    </td>
                                    <td className={`font-medium ${evt.completed ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {safeFormat(evt.date, 'dd/MM/yyyy')}
                                    </td>
                                    <td>
                                        <div className="relative group w-full">
                                            <input
                                                type="text"
                                                defaultValue={evt.notes}
                                                onBlur={(e) => handleNotesChange(evt.sysId, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                                className={`w-full bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-600 focus:border-primary-400 outline-none py-1.5 px-2 text-sm transition-all ${evt.completed ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200'}`}
                                                placeholder="Escribe notas..."
                                            />
                                            <PenLine size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ReviewsTab;
