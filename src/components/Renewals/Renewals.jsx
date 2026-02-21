import { useData } from '../../context/DataContext';
import { calculateSubscriptionTerms } from '../../utils/subscriptionUtils';
import { addDays, format, isBefore, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, AlertTriangle, Clock, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const Renewals = () => {
    const { patients, payments } = useData();
    const [currentMonth] = useState(new Date());

    // Filter patients with active subscriptions and valid end date (exclude finalizado/cancelled)
    const activeSubs = patients.filter(p =>
        p.subscription &&
        p.subscription.endDate &&
        p.subscription_status !== 'finalizado' &&
        p.subscription_status !== 'cancelled'
    );

    // Logic for status
    const getStatus = (endDate) => {
        const end = parseISO(endDate);
        const today = new Date();
        const warningDate = addDays(today, 7);

        if (isBefore(end, today)) return 'expired';
        if (isBefore(end, warningDate)) return 'warning';
        return 'active';
    };

    const upcomingRenewals = activeSubs.filter(p => {
        const status = getStatus(p.subscription.endDate);
        return status === 'warning';
    });

    const expiredRenewals = activeSubs.filter(p => {
        const status = getStatus(p.subscription.endDate);
        return status === 'expired';
    });

    const unpaidRenewals = patients.filter(p => {
        if (p.subscription_status === 'finalizado' || p.subscription_status === 'cancelled') return false;
        const terms = calculateSubscriptionTerms(p, payments);
        return terms.some(t => t.status === 'active' && !t.isPaid);
    });

    // Calendar Logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Renovaciones</h1>
                    <p className="page-subtitle">Control de vencimientos y calendario</p>
                </div>
            </div>

            {/* Alerts Section */}
            <div className="form-grid mb-8">
                <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2 text-amber-600">
                            <CreditCard size={20} className="text-amber-600" /> Pendiente de Pago
                        </h3>
                    </div>
                    {unpaidRenewals.length === 0 ? (
                        <p className="text-muted text-sm">Todo al día.</p>
                    ) : (
                        <ul className="space-y-2">
                            {unpaidRenewals.map(p => (
                                <Link to={`/patients/${p.id}?tab=payments`} key={p.id} className="flex justify-between items-center bg-amber-50 p-3 rounded-md hover:bg-amber-100 transition-colors">
                                    <span className="font-medium text-sm text-amber-900">{p.name}</span>
                                    <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded-full">Ver Ficha</span>
                                </Link>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2 text-warning">
                            <Clock size={20} className="text-warning" /> Próximos a Vencer (7 días)
                        </h3>
                    </div>
                    {upcomingRenewals.length === 0 ? (
                        <p className="text-muted text-sm">No hay renovaciones próximas.</p>
                    ) : (
                        <ul className="space-y-2">
                            {upcomingRenewals.map(p => (
                                <li key={p.id} className="flex justify-between items-center bg-yellow-50 p-3 rounded-md">
                                    <span className="font-medium text-sm">{p.name}</span>
                                    <span className="badge badge-warning">{format(parseISO(p.subscription.endDate), 'dd/MM')}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2 text-danger">
                            <AlertTriangle size={20} className="text-danger" /> Planes Vencidos
                        </h3>
                    </div>
                    {expiredRenewals.length === 0 ? (
                        <p className="text-muted text-sm">No hay planes vencidos.</p>
                    ) : (
                        <ul className="space-y-2">
                            {expiredRenewals.map(p => (
                                <Link to={`/patients/${p.id}`} key={p.id} className="flex justify-between items-center bg-red-50 p-3 rounded-md hover:bg-red-100 transition-colors">
                                    <span className="font-medium text-sm">{p.name}</span>
                                    <span className="badge badge-expired">{format(parseISO(p.subscription.endDate), 'dd/MM')}</span>
                                </Link>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Calendar View */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title flex items-center gap-2">
                        <Calendar size={20} /> Calendario - {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </h3>
                    <div className="flex gap-2">
                        {/* Mock navigation for now */}
                        <button className="btn btn-ghost btn-icon"><ChevronLeft size={18} /></button>
                        <button className="btn btn-ghost btn-icon"><ChevronRight size={18} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                        <div key={d} className="bg-gray-50 p-2 text-center text-xs font-semibold text-muted uppercase tracking-wider">
                            {d}
                        </div>
                    ))}

                    {/* Pad start */}
                    {Array(calendarDays[0].getDay()).fill(null).map((_, i) => (
                        <div key={`pad-${i}`} className="bg-white min-h-[100px]"></div>
                    ))}

                    {calendarDays.map(day => {
                        const dayRenewals = activeSubs.filter(p => isSameDay(parseISO(p.subscription.endDate), day));
                        const isToday = isSameDay(day, new Date());
                        return (
                            <div key={day.toString()} className={`bg-white min-h-[100px] p-2 hover:bg-gray-50 transition-colors ${isToday ? 'bg-green-50' : ''}`}>
                                <div className={`text-right text-xs font-bold mb-1 ${isToday ? 'text-primary' : 'text-gray-400'}`}>
                                    {format(day, 'd')}
                                </div>
                                <div className="space-y-1">
                                    {dayRenewals.map(p => (
                                        <div key={p.id} className="text-[10px] bg-red-100 text-red-800 rounded px-1 py-0.5 truncate border border-red-200" title={`Vence: ${p.name}`}>
                                            {p.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Renewals;
