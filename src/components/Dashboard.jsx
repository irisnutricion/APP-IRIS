import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Users, Clock, AlertTriangle, Plus, ChevronDown, MoreVertical, Search, Filter, TrendingUp, TrendingDown, CheckSquare, Square, DollarSign, UserPlus, Utensils, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, isBefore, parseISO, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

const MetricItem = ({ title, value, change, isPositive, icon: Icon }) => (
    <div className="flex flex-col p-4 bg-slate-50 rounded-lg border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium dark:text-slate-400">{title}</span>
            {Icon && <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20"><Icon size={14} className="text-primary-600 dark:text-primary-400" /></div>}
        </div>
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

const QuickAction = ({ icon: Icon, label, to, color }) => (
    <Link to={to} className={`flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group bg-white dark:bg-slate-800`}>
        <div className={`p-2 rounded-lg ${color}`}>
            <Icon size={18} />
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{label}</span>
        <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-primary-500 transition-colors" />
    </Link>
);

const Dashboard = () => {
    const { patients, tasks, updateTask, reviews, payments = [] } = useData();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Memoized calculations
    const { activePatients, pendingRenewals, expiredPlans, todaysReviews } = useMemo(() => {
        const today = new Date();
        const active = patients.filter(p => p.subscription_status === 'active').length;
        const pending = patients.filter(p => p.subscription_status === 'warning').length;
        const expired = patients.filter(p => p.subscription_status === 'expired').length;
        const reviewsThisWeek = patients.filter(p => {
            if (p.subscription_status !== 'active' || !p.subscription_start || !p.review_day) return false;
            return true;
        }).map(p => {
            const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
            const diff = p.review_day - currentDayOfWeek;
            const reviewDate = addDays(today, diff);
            const reviewId = `review_${p.id}_${format(reviewDate, 'yyyy-MM-dd')}`;
            const isCompleted = reviews[reviewId]?.completed || false;
            return { patientId: p.id, patientName: p.name, reviewDate, dayOfWeek: p.review_day, completed: isCompleted };
        }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);

        return { activePatients: active, pendingRenewals: pending, expiredPlans: expired, todaysReviews: reviewsThisWeek };
    }, [patients, reviews]);

    // Charts data: last 6 months
    const { incomeData, newClientsData, totalIncome, prevMonthIncome } = useMemo(() => {
        const today = new Date();
        const months = [];
        const incomePerMonth = [];
        const clientsPerMonth = [];

        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(today, i);
            const monthStart = startOfMonth(monthDate);
            const monthEnd = endOfMonth(monthDate);
            months.push(format(monthDate, 'MMM yy', { locale: es }));

            // Income: sum of paid payments in this month
            const monthIncome = (payments || [])
                .filter(p => p.status === 'pagado' && p.date)
                .filter(p => {
                    try {
                        const d = parseISO(p.date);
                        return isWithinInterval(d, { start: monthStart, end: monthEnd });
                    } catch { return false; }
                })
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            incomePerMonth.push(monthIncome);

            // New clients: patients created in this month
            const newClients = patients.filter(p => {
                if (!p.created_at) return false;
                try {
                    const d = parseISO(p.created_at);
                    return isWithinInterval(d, { start: monthStart, end: monthEnd });
                } catch { return false; }
            }).length;
            clientsPerMonth.push(newClients);
        }

        return {
            incomeData: {
                labels: months,
                datasets: [{
                    label: 'Ingresos (€)',
                    data: incomePerMonth,
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(59, 130, 246, 0.3)',
                }],
            },
            newClientsData: {
                labels: months,
                datasets: [{
                    label: 'Nuevos clientes',
                    data: clientsPerMonth,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'rgb(16, 185, 129)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                }],
            },
            totalIncome: incomePerMonth[5] || 0,
            prevMonthIncome: incomePerMonth[4] || 0,
        };
    }, [payments, patients]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 } },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
            y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' }, beginAtZero: true },
        },
    };

    const incomeChange = prevMonthIncome > 0 ? Math.round(((totalIncome - prevMonthIncome) / prevMonthIncome) * 100) : null;

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Bienvenida, aquí tienes el resumen de tu consulta.</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title text-lg font-bold text-slate-800 dark:text-slate-100">
                        {isAdmin ? 'Rendimiento General' : 'Mi Rendimiento'}
                    </h2>
                    <p className="card-subtitle text-sm text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <MetricItem title="Clientes Activos" value={activePatients} icon={Users} />
                    <MetricItem title="Renovaciones (7d)" value={pendingRenewals}
                        change={pendingRenewals > 0 ? "Atención" : "Estable"} isPositive={pendingRenewals === 0} icon={Clock} />
                    <MetricItem title="Planes Vencidos" value={expiredPlans}
                        change={expiredPlans > 0 ? "Atención" : "Sin vencidos"} isPositive={expiredPlans === 0} icon={AlertTriangle} />
                    <MetricItem title="Ingresos este mes" value={`€${totalIncome.toFixed(0)}`}
                        change={incomeChange !== null ? `${incomeChange >= 0 ? '+' : ''}${incomeChange}%` : null} isPositive={incomeChange >= 0} icon={DollarSign} />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Accesos Rápidos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <QuickAction icon={UserPlus} label="Nuevo Cliente" to="/patients/new" color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" />
                    <QuickAction icon={Utensils} label="Planes Nutricionales" to="/patients" color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" />
                    <QuickAction icon={DollarSign} label="Gestión de Pagos" to="/payments" color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" />
                    <QuickAction icon={CheckSquare} label="Mis Tareas" to="/tasks" color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" />
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <div className="card-header mb-2">
                        <h3 className="card-title font-bold text-slate-800 dark:text-slate-100">Ingresos Mensuales</h3>
                    </div>
                    <div className="h-56">
                        <Bar data={incomeData} options={chartOptions} />
                    </div>
                </div>
                <div className="card">
                    <div className="card-header mb-2">
                        <h3 className="card-title font-bold text-slate-800 dark:text-slate-100">Nuevos Clientes</h3>
                    </div>
                    <div className="h-56">
                        <Line data={newClientsData} options={chartOptions} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Reviews Section */}
                <div className="card lg:col-span-2">
                    <div className="card-header border-b border-slate-100 dark:border-slate-700 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary-100 text-primary-600 rounded-lg dark:bg-primary-900/20 dark:text-primary-400">
                                <CheckSquare size={20} />
                            </div>
                            <div>
                                <h3 className="card-title font-bold text-slate-800 dark:text-slate-100">Revisiones de esta Semana</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Pacientes que requieren seguimiento</p>
                            </div>
                        </div>
                        <Link to="/tracking" className="btn btn-ghost btn-sm text-primary-600 font-medium dark:text-primary-400">Ver Seguimiento</Link>
                    </div>
                    <div className="space-y-3">
                        {todaysReviews.length > 0 ? (
                            todaysReviews.map((review, idx) => (
                                <div key={idx} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold border border-primary-100 dark:border-primary-800">
                                            {review.patientName.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100">{review.patientName}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{format(review.reviewDate, 'EEEE, d MMM', { locale: es })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {review.completed ? (
                                            <span className="badge badge-success flex items-center gap-1"><CheckSquare size={14} /> Completada</span>
                                        ) : (
                                            <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1"><Clock size={14} /> Pendiente</span>
                                        )}
                                        <button onClick={() => navigate(`/patients/${review.patientId}`)} className="btn btn-sm btn-outline">Ver Perfil</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                <CheckSquare size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                <p className="text-slate-500 dark:text-slate-400 font-medium">¡No hay revisiones programadas para esta semana!</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Disfruta de tu semana libre de seguimientos.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tasks Mini View */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title font-bold text-slate-800 dark:text-slate-100">Tareas Pendientes</h3>
                        <Link to="/tasks" className="btn btn-ghost btn-sm p-1 text-primary-600 dark:text-primary-400 font-bold text-xs uppercase hover:underline">Ver todas</Link>
                    </div>
                    <div className="space-y-3">
                        {tasks.filter(t => !t.completed).slice(0, 5).map(task => (
                            <div key={task.id} className="flex items-start gap-3 group">
                                <button onClick={() => updateTask(task.id, { completed: !task.completed })} className="mt-0.5 text-slate-300 hover:text-primary-500 transition-colors">
                                    <Square size={18} />
                                </button>
                                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-tight group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
                                    {task.title}
                                </span>
                            </div>
                        ))}
                        {tasks.filter(t => !t.completed).length === 0 && (
                            <div className="text-center py-6 text-slate-400 dark:text-slate-500">
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
