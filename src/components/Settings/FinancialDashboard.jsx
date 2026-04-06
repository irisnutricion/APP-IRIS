import { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { TrendingUp, TrendingDown, Euro, AlertCircle, Users, BarChart3, CreditCard, Clock } from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import {
    format, subMonths, startOfMonth, endOfMonth, isWithinInterval,
    parseISO, differenceInDays
} from 'date-fns';
import { es } from 'date-fns/locale';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement,
    Title, Tooltip, Legend, ArcElement, Filler);

const KpiCard = ({ title, value, sub, trend, icon: Icon, color = 'primary' }) => {
    const colors = {
        primary: 'from-emerald-500 to-teal-600',
        amber: 'from-amber-400 to-orange-500',
        rose: 'from-rose-400 to-pink-600',
        blue: 'from-blue-400 to-indigo-600',
    };
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</span>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${colors[color]} bg-opacity-10`}>
                    <Icon size={16} className="text-white" />
                </div>
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
            </div>
            {trend !== undefined && (
                <div className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {trend >= 0 ? '+' : ''}{trend}% vs mes anterior
                </div>
            )}
        </div>
    );
};

const FinancialDashboard = () => {
    const { patients = [], payments = [], patientVouchers = [] } = useData();

    const today = new Date();

    // ── Last 12 months labels ──────────────────────────────────────
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
        const d = subMonths(today, 11 - i);
        return { label: format(d, 'MMM yy', { locale: es }), start: startOfMonth(d), end: endOfMonth(d) };
    }), []);

    // ── Per-month income (paid) and pending ───────────────────────
    const { monthlyIncome, monthlyPending } = useMemo(() => {
        const income = months.map(({ start, end }) =>
            payments
                .filter(p => p.status === 'pagado' && p.date)
                .filter(p => { try { return isWithinInterval(parseISO(p.date), { start, end }); } catch { return false; } })
                .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
        );
        const pending = months.map(({ start, end }) =>
            payments
                .filter(p => p.status !== 'pagado' && p.date)
                .filter(p => { try { return isWithinInterval(parseISO(p.date), { start, end }); } catch { return false; } })
                .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
        );
        return { monthlyIncome: income, monthlyPending: pending };
    }, [payments, months]);

    // ── KPIs ──────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const thisMonth = monthlyIncome[11] || 0;
        const lastMonth = monthlyIncome[10] || 0;
        const trend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

        const activePatients = patients.filter(p => p.subscription_status === 'active').length;
        const expiringThisMonth = patients.filter(p => {
            if (!p.subscription_end) return false;
            try {
                const end = parseISO(p.subscription_end);
                return isWithinInterval(end, { start: startOfMonth(today), end: endOfMonth(today) });
            } catch { return false; }
        });
        const revenueAtRisk = expiringThisMonth.reduce((sum, p) => {
            // try to get last subscription amount
            return sum; // simplified — would need payment_rates join
        }, 0);

        const totalPending = payments
            .filter(p => p.status !== 'pagado')
            .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

        const totalPendingCount = payments.filter(p => p.status !== 'pagado').length;

        // Average ticket (mean of paid payments this month)
        const paidThisMonth = payments.filter(p => p.status === 'pagado' && p.date).filter(p => {
            try { return isWithinInterval(parseISO(p.date), { start: startOfMonth(today), end: endOfMonth(today) }); } catch { return false; }
        });
        const avgTicket = paidThisMonth.length > 0
            ? paidThisMonth.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) / paidThisMonth.length
            : 0;

        return { thisMonth, lastMonth, trend, activePatients, expiringThisMonth, totalPending, totalPendingCount, avgTicket };
    }, [monthlyIncome, patients, payments]);

    // ── Payment method distribution ───────────────────────────────
    const methodData = useMemo(() => {
        const counts = {};
        payments.filter(p => p.status === 'pagado').forEach(p => {
            const m = p.payment_method || 'Otro';
            counts[m] = (counts[m] || 0) + (parseFloat(p.amount) || 0);
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return {
            labels: sorted.map(([k]) => k),
            datasets: [{
                data: sorted.map(([, v]) => Math.round(v)),
                backgroundColor: ['#28483a', '#d09a84', '#60a5fa', '#a78bfa', '#fb923c'],
                borderWidth: 0,
            }]
        };
    }, [payments]);

    // ── New clients per month ─────────────────────────────────────
    const newClientsData = useMemo(() => months.map(({ start, end }) =>
        patients.filter(p => {
            if (!p.created_at) return false;
            try { return isWithinInterval(parseISO(p.created_at), { start, end }); } catch { return false; }
        }).length
    ), [patients, months]);

    // ── Pending payments list ──────────────────────────────────────
    const openPayments = useMemo(() =>
        payments
            .filter(p => p.status !== 'pagado')
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 8)
            .map(p => {
                const patient = patients.find(pt => pt.id === p.patient_id);
                const daysOld = p.date ? differenceInDays(today, parseISO(p.date)) : 0;
                return { ...p, patientName: patient ? `${patient.first_name} ${patient.last_name}` : (p.payer_email || 'Desconocido'), daysOld };
            })
    , [payments, patients]);

    const barOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 8 } },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
            y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 10 } }, beginAtZero: true },
        },
    };

    const combinedBarData = {
        labels: months.map(m => m.label),
        datasets: [
            {
                label: 'Cobrado (€)',
                data: monthlyIncome,
                backgroundColor: 'rgba(40,72,58,0.85)',
                borderRadius: 6,
            },
            {
                label: 'Pendiente (€)',
                data: monthlyPending,
                backgroundColor: 'rgba(208,154,132,0.7)',
                borderRadius: 6,
            }
        ]
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Dashboard Financiero</h1>
                    <p className="page-subtitle">Análisis de ingresos, cobros y evolución económica</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard
                    title="Ingresos este mes"
                    value={`€${kpis.thisMonth.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
                    sub={`vs. €${kpis.lastMonth.toLocaleString('es-ES', { maximumFractionDigits: 0 })} mes anterior`}
                    trend={kpis.trend}
                    icon={Euro}
                    color="primary"
                />
                <KpiCard
                    title="Clientes activos"
                    value={kpis.activePatients}
                    sub={`${kpis.expiringThisMonth.length} vencen este mes`}
                    icon={Users}
                    color="blue"
                />
                <KpiCard
                    title="Ticket medio (mes)"
                    value={`€${kpis.avgTicket.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
                    icon={BarChart3}
                    color="primary"
                />
                <KpiCard
                    title="Pagos pendientes"
                    value={`€${kpis.totalPending.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
                    sub={`${kpis.totalPendingCount} cobros sin confirmar`}
                    icon={Clock}
                    color="rose"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Combined income bar */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 lg:col-span-2">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-1 text-sm uppercase tracking-wide">Ingresos cobrados vs. pendientes (12 meses)</h3>
                    <div className="h-56">
                        <Bar data={combinedBarData} options={{ ...barOptions, plugins: { ...barOptions.plugins, legend: { display: true, position: 'top', labels: { font: { size: 11 }, color: '#94a3b8', boxWidth: 12 } } } }} />
                    </div>
                </div>

                {/* Payment method doughnut */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-1 text-sm uppercase tracking-wide">Por método de pago</h3>
                    <div className="h-56 flex items-center justify-center">
                        {methodData.labels.length > 0 ? (
                            <Doughnut data={methodData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, color: '#94a3b8', boxWidth: 10 } } } }} />
                        ) : (
                            <p className="text-slate-400 text-sm">Sin datos</p>
                        )}
                    </div>
                </div>
            </div>

            {/* New clients line + pending payments list */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-1 text-sm uppercase tracking-wide">Nuevos clientes / mes</h3>
                    <div className="h-48">
                        <Line
                            data={{
                                labels: months.map(m => m.label),
                                datasets: [{
                                    label: 'Nuevos clientes',
                                    data: newClientsData,
                                    borderColor: '#28483a',
                                    backgroundColor: 'rgba(40,72,58,0.08)',
                                    tension: 0.4,
                                    fill: true,
                                    pointBackgroundColor: '#28483a',
                                    pointBorderColor: '#fff',
                                    pointBorderWidth: 2,
                                    pointRadius: 4,
                                }]
                            }}
                            options={barOptions}
                        />
                    </div>
                </div>

                {/* Open / pending payments */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">Cobros pendientes</h3>
                        {openPayments.length > 0 && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                                {openPayments.length}
                            </span>
                        )}
                    </div>
                    {openPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
                            <CreditCard size={28} className="opacity-30" />
                            <p className="text-sm">¡Todo al día!</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {openPayments.map(p => (
                                <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{p.patientName}</p>
                                        <p className="text-xs text-slate-400">{p.concept || 'Sin concepto'} · hace {p.daysOld}d</p>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <p className="text-sm font-bold text-rose-500">€{parseFloat(p.amount || 0).toFixed(0)}</p>
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${p.daysOld > 15 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {p.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinancialDashboard;
