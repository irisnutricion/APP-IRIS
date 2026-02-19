import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, LayoutGrid, CheckSquare, Square, PenLine } from 'lucide-react';

const TrackingCalendar = () => {
    const { patients, reviews, saveReview } = useData();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week'); // Default to 'week'
    const [onlyReviews, setOnlyReviews] = useState(false); // Filter to show only reviews

    // Event type styles
    const eventStyles = {
        inicio: { label: '🚀 Inicio', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
        semana: { label: '📅 7 días', bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
        alerta5: { label: '⚠️ 5 días', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
        alerta1: { label: '🔔 Último día', bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
        revision: { label: 'Revisión', bg: 'bg-primary-50 dark:bg-primary-900/30', text: 'text-primary-700 dark:text-primary-300', border: 'border-primary-100 dark:border-primary-800' }
    };

    // Generate Review Events AND Milestone Alerts
    const events = patients.flatMap(patient => {
        if (!patient.subscription?.startDate) return [];
        if (patient.subscription?.status === 'paused') return [];

        const start = parseISO(patient.subscription.startDate);
        const end = patient.subscription.endDate ? parseISO(patient.subscription.endDate) : addDays(start, 30);
        const patientEvents = [];

        // === MILESTONE ALERTS ===

        // 1. Start day alert
        // Only show start alert if it's the very first subscription (no previous history)
        const isFirstSubscription = !patient.subscriptionHistory?.some(sub =>
            sub.start_date && parseISO(sub.start_date) < start
        );

        if (isFirstSubscription) {
            patientEvents.push({
                sysId: `alert_inicio_${patient.id}`,
                date: start,
                patientName: patient.name,
                patientId: patient.id,
                type: 'inicio',
                isAlert: true
            });
        }

        // 2. 7 days milestone
        const day7 = addDays(start, 7);
        if (day7 <= end) {
            patientEvents.push({
                sysId: `alert_7dias_${patient.id}`,
                date: day7,
                patientName: patient.name,
                patientId: patient.id,
                type: 'semana',
                isAlert: true
            });
        }

        // 3. 5 days remaining alert
        const fiveDaysLeft = addDays(end, -5);
        if (fiveDaysLeft > start) {
            patientEvents.push({
                sysId: `alert_5dias_${patient.id}`,
                date: fiveDaysLeft,
                patientName: patient.name,
                patientId: patient.id,
                type: 'alerta5',
                isAlert: true
            });
        }

        // 4. 1 day remaining alert
        const oneDayLeft = addDays(end, -1);
        if (oneDayLeft > start && !isSameDay(oneDayLeft, fiveDaysLeft)) {
            patientEvents.push({
                sysId: `alert_1dia_${patient.id}`,
                date: oneDayLeft,
                patientName: patient.name,
                patientId: patient.id,
                type: 'alerta1',
                isAlert: true
            });
        }

        // === WEEKLY REVIEWS (existing logic) ===
        let reviewDate = addDays(start, 7);
        while (reviewDate <= end) {
            const reviewId = `review_${patient.id}_${format(reviewDate, 'yyyy-MM-dd')}`;
            const savedData = reviews?.[reviewId] || {};

            patientEvents.push({
                sysId: reviewId,
                date: reviewDate,
                patientName: patient.name,
                patientId: patient.id,
                type: 'revision',
                completed: savedData.completed || false,
                notes: savedData.notes || '',
                isAlert: false
            });
            reviewDate = addDays(reviewDate, 7);
        }
        return patientEvents;
    });

    // Toggle Complete
    const handleToggleComplete = (evt) => {
        saveReview(evt.sysId, { completed: !evt.completed });
    };

    // Save Notes
    const handleNotesChange = (sysId, note) => {
        saveReview(sysId, { notes: note });
    };

    // Calendar Navigation
    const nextPeriod = () => {
        if (viewMode === 'week' || viewMode === 'list') {
            setCurrentDate(addDays(currentDate, 7));
        } else {
            const next = new Date(currentDate);
            next.setMonth(currentDate.getMonth() + 1);
            setCurrentDate(next);
        }
    };

    const prevPeriod = () => {
        if (viewMode === 'week' || viewMode === 'list') {
            setCurrentDate(addDays(currentDate, -7));
        } else {
            const prev = new Date(currentDate);
            prev.setMonth(currentDate.getMonth() - 1);
            setCurrentDate(prev);
        }
    };

    // View Logic Dates
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const monthStartDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const monthEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

    // Determine days to render based on viewMode
    const calendarDays = viewMode === 'week'
        ? eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) })
        : eachDayOfInterval({ start: monthStartDate, end: monthEndDate });

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // List View Grouping
    const sortedEvents = [...events].sort((a, b) => a.date - b.date);

    // Filter events for List View: Only show REVIEWS for the CURRENT selected week (no alerts)
    const validListEvents = sortedEvents.filter(evt => {
        return !evt.isAlert && evt.date >= weekStart && evt.date <= endOfWeek(currentDate, { weekStartsOn: 1 });
    });

    const eventsByWeek = validListEvents.reduce((acc, event) => {
        const weekKey = `${format(startOfWeek(event.date, { weekStartsOn: 1 }), 'yyyy-MM-dd')}`;
        if (!acc[weekKey]) acc[weekKey] = [];
        acc[weekKey].push(event);
        return acc;
    }, {});

    const headerTitle = (viewMode === 'week' || viewMode === 'list')
        ? `Semana del ${format(weekStart, 'd MMM', { locale: es })} al ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`
        : format(currentDate, 'MMMM yyyy', { locale: es });

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title dark:text-white">Calendario de Seguimiento</h1>
                    <p className="page-subtitle dark:text-slate-400">Revisiones programadas de clientes</p>
                </div>
                <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-colors flex gap-2 items-center text-sm font-medium ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        <List size={18} /> Listado
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`p-2 rounded-md transition-colors flex gap-2 items-center text-sm font-medium ${viewMode === 'week' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        <LayoutGrid size={18} /> Semanal
                    </button>
                    <button
                        onClick={() => setViewMode('month')}
                        className={`p-2 rounded-md transition-colors flex gap-2 items-center text-sm font-medium ${viewMode === 'month' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        <CalendarIcon size={18} /> Mensual
                    </button>
                </div>
            </div>

            {viewMode !== 'list' ? (
                <div className="card">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                                {headerTitle}
                            </h2>
                            <div className="flex gap-1">
                                <button onClick={prevPeriod} className="btn btn-sm btn-outline px-2 border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    <ChevronLeft size={16} />
                                </button>
                                <button onClick={() => setCurrentDate(new Date())} className="btn btn-sm btn-outline border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    Hoy
                                </button>
                                <button onClick={nextPeriod} className="btn btn-sm btn-outline px-2 border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={onlyReviews}
                                onChange={(e) => setOnlyReviews(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-400">Solo revisiones</span>
                        </label>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-2">
                                {day.substring(0, 3)}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        {calendarDays.map((day) => {
                            const dayEvents = events
                                .filter(e => isSameDay(e.date, day))
                                .filter(e => !onlyReviews || !e.isAlert);
                            const isCurrentMonth = isSameMonth(day, monthStart); // Only relevant for month view styling
                            const isToday = isSameDay(day, new Date());

                            // Adjust styling for week view vs month view
                            const opacityClass = (viewMode === 'month' && !isCurrentMonth) ? 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600' : 'bg-white dark:bg-slate-800';
                            const minHeightClass = viewMode === 'week' ? 'min-h-[500px]' : 'min-h-[160px]';

                            return (
                                <div
                                    key={day.toString()}
                                    className={`${minHeightClass} ${opacityClass} p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 relative group`}
                                >
                                    <div className={`text-right text-sm font-medium mb-1 ${isToday ? 'bg-primary-600 text-white w-7 h-7 rounded-full flex items-center justify-center ml-auto shadow-sm' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {format(day, 'd')}
                                    </div>

                                    <div className="space-y-1.5 overflow-y-auto max-h-[450px] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                        {dayEvents.map((evt, i) => {
                                            const style = eventStyles[evt.type] || eventStyles.revision;
                                            const isCompleted = evt.completed && !evt.isAlert;

                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => navigate(`/patients/${evt.patientId}`)}
                                                    className={`text-xs p-2 rounded border shadow-sm transition-all cursor-pointer
                                                        ${isCompleted
                                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 opacity-75'
                                                            : `${style.bg} ${style.text} ${style.border} hover:opacity-80`
                                                        }
                                                    `}
                                                    title={`Ver detalle de ${evt.patientName}`}
                                                >
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        {evt.isAlert ? (
                                                            <span className="font-semibold whitespace-nowrap">{style.label}</span>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleToggleComplete(evt); }}
                                                                className="flex-shrink-0 text-current hover:scale-110 transition-transform"
                                                                title={evt.completed ? "Marcar como pendiente" : "Marcar como hecho"}
                                                            >
                                                                {evt.completed ? <CheckSquare size={12} /> : <Square size={12} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className={`font-medium leading-tight break-words ${isCompleted ? 'line-through' : ''}`}>
                                                        {evt.patientName}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* List View grouped by Week */
                <div className="space-y-8">
                    {/* List View Navigation Header - Copied from Calendar View logic */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                                {headerTitle}
                            </h2>
                            <div className="flex gap-1">
                                <button onClick={prevPeriod} className="btn btn-sm btn-outline px-2 border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    <ChevronLeft size={16} />
                                </button>
                                <button onClick={() => setCurrentDate(new Date())} className="btn btn-sm btn-outline border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    Hoy
                                </button>
                                <button onClick={nextPeriod} className="btn btn-sm btn-outline px-2 border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {Object.keys(eventsByWeek).length === 0 ? (
                        <div className="card text-center py-10 text-slate-500 dark:text-slate-400">No hay revisiones programadas para esta semana.</div>
                    ) : Object.keys(eventsByWeek).sort().map(weekKey => {
                        const weekEvents = eventsByWeek[weekKey];

                        return (
                            <div key={weekKey} className="card">
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th className="w-12 text-center text-slate-500 dark:text-slate-400">Estado</th>
                                                <th className="w-32 text-slate-500 dark:text-slate-400">Fecha</th>
                                                <th className="w-48 text-slate-500 dark:text-slate-400">Cliente</th>
                                                <th className="text-slate-500 dark:text-slate-400">Cambios a Realizar / Notas</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {weekEvents.map(evt => (
                                                <tr key={evt.sysId} className={evt.completed ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-primary-50 dark:hover:bg-primary-900/10'}>
                                                    <td className="text-center py-3">
                                                        <button
                                                            onClick={() => handleToggleComplete(evt)}
                                                            className={`p-1 rounded transition-colors ${evt.completed ? 'text-green-600 hover:text-green-700 dark:text-green-500' : 'text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400'}`}
                                                            title={evt.completed ? "Marcar como pendiente" : "Marcar como hecho"}
                                                        >
                                                            {evt.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                                                        </button>
                                                    </td>
                                                    <td className={`font-medium text-sm py-3 ${evt.completed ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-600 dark:text-slate-300'}`}>
                                                        {format(evt.date, 'dd/MM/yyyy')}
                                                    </td>
                                                    <td className="py-3">
                                                        <span
                                                            onClick={() => navigate(`/patients/${evt.patientId}`)}
                                                            className={`font-semibold cursor-pointer hover:text-primary transition-colors ${evt.completed ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-700 dark:text-slate-200'}`}
                                                        >
                                                            {evt.patientName}
                                                        </span>
                                                    </td>
                                                    <td className="py-3">
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
                                                                placeholder="Escribe cambios o notas..."
                                                            />
                                                            <PenLine size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TrackingCalendar;
