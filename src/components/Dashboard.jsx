import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Users, Clock, AlertTriangle, Plus, ChevronDown, MoreVertical, Search, Filter, TrendingUp, TrendingDown, CheckSquare, Square } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, isBefore, parseISO, isSameDay, format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

const MetricItem = ({ title, value, change, isPositive }) => (
    <div className="flex flex-col p-4 bg-slate-50 rounded-lg border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
        <span className="text-sm text-slate-500 font-medium mb-1 dark:text-slate-400">{title}</span>
        <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</span>
            {change && (
                <span className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${isPositive ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                    {isPositive ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                    {change}
                </span>
            )}
        </div>
    </div>
);



const Dashboard = () => {
    const { patients, tasks, updateTask, reviews } = useData();
    const navigate = useNavigate();
    const { isAdmin } = useAuth(); // Get role

    // Memoized calculations
    const { activePatients, pendingRenewals, expiredPlans, todaysReviews } = useMemo(() => {
        const today = new Date();
        const active = patients.filter(p => p.subscription_status === 'active').length;

        // Pending renewals (next 7 days)
        const pending = patients.filter(p => {
            if (p.subscription_status !== 'active' || !p.subscription_end) return false;
            const endDate = parseISO(p.subscription_end);
            return isBefore(endDate, addDays(today, 7)) && isBefore(today, endDate);
        }).length;

        // Expired plans
        const expired = patients.filter(p => {
            if (!p.subscription_end) return false; // Ignore if no end date
            return isBefore(parseISO(p.subscription_end), today) && p.subscription_status === 'active';
        }).length;

        // This Week's Reviews
        const reviewsThisWeek = patients.filter(p => {
            if (p.subscription_status !== 'active' || !p.subscription_start || !p.review_day) return false;
            return true;
        }).map(p => {
            // Calculate the specific date of this week's review (Monday = 1, Sunday = 7)
            const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
            const diff = p.review_day - currentDayOfWeek;
            const reviewDate = addDays(today, diff);

            // Check if review exists for that specific date
            const reviewId = `review_${p.id}_${format(reviewDate, 'yyyy-MM-dd')}`;
            const isCompleted = reviews[reviewId]?.completed || false;

            return {
                patientId: p.id,
                patientName: p.name,
                reviewDate: reviewDate,
                dayOfWeek: p.review_day,
                completed: isCompleted
            };
        }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);

        return {
            activePatients: active,
            pendingRenewals: pending,
            expiredPlans: expired,
            todaysReviews: reviewsThisWeek
        };
    }, [patients, reviews]);

    return (
        <div className="dashboard-container">
            {/* Header Section */}
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Bienvenida, aquí tienes el resumen de tu consulta.</p>
                </div>
            </div>

            {/* Main Performance Card */}
            <div className="card performance-card">
                <div className="card-header">
                    <div>
                        <h2 className="card-title text-lg font-bold text-slate-800 dark:text-slate-100">
                            {isAdmin ? 'Rendimiento General' : 'Mi Rendimiento'}
                        </h2>
                        <p className="card-subtitle text-sm text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}</p>
                    </div>
                    <div className="card-actions flex gap-2">
                        <button className="btn btn-outline btn-sm">
                            <Filter size={14} className="mr-1" /> Filtrar
                        </button>
                        <button className="btn btn-ghost btn-sm p-1"><MoreVertical size={16} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                    <MetricItem
                        title="Clientes Activos"
                        value={activePatients}
                        change="+12%"
                        isPositive={true}
                    />
                    <MetricItem
                        title="Renovaciones (7d)"
                        value={pendingRenewals}
                        change={pendingRenewals > 0 ? "Atención" : "Estable"}
                        isPositive={pendingRenewals === 0}
                    />

                    <MetricItem
                        title="Planes Vencidos"
                        value={expiredPlans}
                        change={expiredPlans > 0 ? "-2%" : "0%"}
                        isPositive={expiredPlans === 0}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Reviews Section - New */}
                <div className="card lg:col-span-2">
                    <div className="card-header border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                <CheckSquare size={20} />
                            </div>
                            <div>
                                <h3 className="card-title font-bold text-slate-800 dark:text-slate-100">Revisiones de esta Semana</h3>
                                <p className="text-xs text-slate-500">Pacientes que requieren seguimiento a lo largo de esta semana</p>
                            </div>
                        </div>
                        <Link to="/calendar" className="btn btn-ghost btn-sm text-primary-600 font-medium">Ver Calendario</Link>
                    </div>

                    <div className="space-y-3">
                        {todaysReviews.length > 0 ? (
                            todaysReviews.map((review, idx) => (
                                <div key={idx} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm hover:border-primary-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold border border-primary-100">
                                            {review.patientName.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100">{review.patientName}</h4>
                                            <p className="text-xs text-slate-500 capitalize">{format(review.reviewDate, 'EEEE, d MMM', { locale: es })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {review.completed ? (
                                            <span className="badge badge-success flex items-center gap-1">
                                                <CheckSquare size={14} /> Completada
                                            </span>
                                        ) : (
                                            <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1">
                                                <Clock size={14} /> Pendiente
                                            </span>
                                        )}
                                        <button
                                            onClick={() => navigate(`/patients/${review.patientId}`)}
                                            className="btn btn-sm btn-outline"
                                        >
                                            Ver Perfil
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                <CheckSquare size={32} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-slate-500 font-medium">¡No hay revisiones programadas para esta semana!</p>
                                <p className="text-xs text-slate-400 mt-1">Disfruta de tu semana libre de seguimientos.</p>
                            </div>
                        )}
                    </div>
                </div>



                {/* Renewals Mini View */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title font-bold text-slate-800 dark:text-slate-100">Renovaciones</h3>
                        <div className="card-actions">
                            <button className="btn-ghost btn-sm p-1"><ChevronDown size={16} /></button>
                        </div>
                    </div>
                    <div className="flex justify-between mb-6">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                            <div key={i} className={`flex flex-col items-center p-1 rounded-md ${i === 3 ? 'bg-primary-50 text-primary-700' : 'text-slate-400'}`}>
                                <span className="text-xs font-bold">{d}</span>
                                <span className="text-sm font-medium">{15 + i}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 dark:bg-amber-900/10 dark:border-amber-900/30">
                        <h4 className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-1 dark:text-amber-500">
                            <AlertTriangle size={14} /> Revisión de Planes
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-400">Revisar los {pendingRenewals} planes próximos a vencer.</p>
                    </div>
                </div>


                {/* Tasks Mini View */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title font-bold text-slate-800 dark:text-slate-100">Tareas Pendientes</h3>
                        <div className="card-actions">
                            <Link to="/tasks" className="btn btn-ghost btn-sm p-1 text-primary-600 font-bold text-xs uppercase hover:underline">Ver todas</Link>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {tasks.filter(t => !t.completed).slice(0, 5).map(task => (
                            <div key={task.id} className="flex items-start gap-3 group">
                                <button
                                    onClick={() => updateTask(task.id, { completed: !task.completed })}
                                    className="mt-0.5 text-slate-300 hover:text-primary-500 transition-colors"
                                >
                                    <Square size={18} />
                                </button>
                                <span className="text-sm text-slate-700 font-medium leading-tight group-hover:text-primary-700 transition-colors dark:text-slate-300 dark:group-hover:text-primary-400">
                                    {task.title}
                                </span>
                            </div>
                        ))}

                        {tasks.filter(t => !t.completed).length === 0 && (
                            <div className="text-center py-6 text-slate-400">
                                <CheckSquare size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-xs">¡Todo al día!</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800">
                        <Link to="/tasks" className="btn btn-outline btn-sm w-full gap-2 text-slate-500 dark:text-slate-400">
                            <Plus size={14} /> Añadir Tarea
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
