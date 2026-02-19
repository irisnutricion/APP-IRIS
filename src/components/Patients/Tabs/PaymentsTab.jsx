import { useData } from '../../../context/DataContext';
import { safeFormat } from '../../../utils/dateUtils';
import { Wallet, Plus, CheckCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import { parseISO, format } from 'date-fns';

const PaymentsTab = ({ patientId, onAddPayment, onEditPayment, onDeletePayment, onEditSubscription, subscriptionTerms = [], onEditExtension }) => {
    const { payments = [], paymentMethods = [], patients = [], paymentRates = [], deleteSubscription, subscriptionExtensions = [], deleteSubscriptionExtension } = useData() || {};

    // Sort payments
    const patientPayments = (payments || []).filter(p => p && p.patient_id === patientId)
        .sort((a, b) => {
            if (!a?.date || !b?.date) return 0;
            return new Date(b.date) - new Date(a.date);
        });

    const totalPaid = (patientPayments || []).filter(p => p.status === 'pagado').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    // Calculate pending from existing payments
    const pendingPaymentsAmount = (patientPayments || []).filter(p => p.status === 'pendiente').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    // Calculate pending from unpaid subscriptions (that don't have a pending payment record yet)
    const unpaidSubscriptionsAmount = subscriptionTerms
        .filter(term => !term.isPaid && term.status !== 'archived' && term.status !== 'cancelled')
        .reduce((sum, term) => {
            // Check if this term already has a payment record (even if pending) to avoid double counting
            const hasPaymentRecord = (patientPayments || []).some(p => p.subscription_id === term.id);
            if (!hasPaymentRecord) {
                return sum + (parseFloat(term.price) || parseFloat(term.amount) || 0);
            }
            return sum;
        }, 0);

    const totalPending = pendingPaymentsAmount + unpaidSubscriptionsAmount;

    if ((patientPayments || []).length === 0 && subscriptionTerms.length === 0) {
        return (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                <Wallet className="text-gray-300 dark:text-slate-600 mb-4 mx-auto" size={48} />
                <p className="text-gray-500 dark:text-slate-400 font-medium">No hay pagos ni suscripción activa.</p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mb-4">Los pagos de este cliente aparecerán aquí.</p>
                <button onClick={() => onAddPayment()} className="btn btn-primary">
                    <Plus size={18} /> Registrar Primer Pago
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Pagado</p>
                        <h3 className="text-xl font-bold text-green-600 dark:text-green-400">€{totalPaid.toFixed(2)}</h3>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400">
                        <CheckCircle size={20} />
                    </div>
                </div>
                <div className="card flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Pendiente</p>
                        <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400">€{totalPending.toFixed(2)}</h3>
                    </div>
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full text-amber-600 dark:text-amber-400">
                        <Clock size={20} />
                    </div>
                </div>
                <div className="card flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Transacciones</p>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{(patientPayments || []).length}</h3>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-600 dark:text-slate-400">
                        <Wallet size={20} />
                    </div>
                </div>
            </div>

            {/* Billing Periods (Renovations) Table */}
            {subscriptionTerms.length > 0 ? (
                <div className="card overflow-hidden p-0 mb-6">
                    <div className="card-header border-b border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                        <h3 className="card-title text-sm font-bold text-slate-700 dark:text-slate-300">Renovaciones y Periodos</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="py-3 px-4 font-medium">Renovación / Plan</th>
                                    <th className="py-3 px-4 font-medium">Días Extra</th>
                                    <th className="py-3 px-4 font-medium">Estado</th>
                                    <th className="py-3 px-4 font-medium">Tarifa</th>
                                    <th className="py-3 px-4 font-medium text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {subscriptionTerms.map(term => {
                                    const isCurrent = term.type === 'current';

                                    return (
                                        <tr key={term.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isCurrent ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''} ${term.status === 'archived' ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}`}>
                                            <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="font-bold flex flex-wrap items-center gap-2">
                                                        <span>{term.label}</span>
                                                        {term.status === 'archived' && <span className="text-[10px] uppercase bg-slate-200 text-slate-500 rounded px-1.5 py-0.5 whitespace-nowrap">Archivado</span>}
                                                        {isCurrent && <span className="text-[10px] uppercase bg-primary-100 text-primary-700 rounded px-1.5 py-0.5 whitespace-nowrap">Actual</span>}
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-normal">
                                                        {safeFormat(term.start, 'dd/MM/yyyy')} - {safeFormat(term.end, 'dd/MM/yyyy')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                {(() => {
                                                    const extraDays = subscriptionExtensions
                                                        .filter(e => e.patient_id === patientId)
                                                        .filter(e => {
                                                            if (!e.previous_end_date || !e.new_end_date) return false;

                                                            const extPrev = parseISO(e.previous_end_date);
                                                            const extNew = parseISO(e.new_end_date);
                                                            const termStart = term.start instanceof Date ? term.start : parseISO(term.start); // Ensure Date
                                                            const termEnd = term.end instanceof Date ? term.end : parseISO(term.end); // Ensure Date

                                                            const isPrevInTerm = extPrev > termStart && extPrev <= termEnd;
                                                            const isNewInTerm = extNew > termStart && extNew <= termEnd;

                                                            return isPrevInTerm || isNewInTerm;
                                                        })
                                                        .reduce((sum, e) => sum + (parseInt(e.days_added) || 0), 0);

                                                    if (extraDays > 0) {
                                                        return <span className="font-bold text-amber-600">+{extraDays}</span>;
                                                    } else if (extraDays < 0) {
                                                        return <span className="font-bold text-red-500">{extraDays}</span>;
                                                    }
                                                    return <span className="text-slate-300">-</span>;
                                                })()}
                                            </td>
                                            <td className="py-3 px-4">
                                                {term.isPaid ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                                                        <CheckCircle size={12} /> Pagado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                        <Clock size={12} /> Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                                {(() => {
                                                    const rate = term.payment_rate_id ? paymentRates.find(r => r.id === term.payment_rate_id) : null;
                                                    return rate ? (
                                                        <span>{rate.label} - {rate.amount}€</span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="py-3 px-4 text-right flex justify-end gap-2 items-center">
                                                {(!term.isPaid && term.status !== 'archived') && (
                                                    <button
                                                        onClick={() => {
                                                            const safeDate = term.start instanceof Date && !isNaN(term.start)
                                                                ? format(term.start, 'yyyy-MM-dd')
                                                                : new Date().toISOString().split('T')[0];

                                                            const safeAmount = term.price || term.amount || 0;

                                                            onAddPayment({
                                                                subscription_id: term.id,
                                                                plan_id: term.payment_rate_id,
                                                                concept: `Renovación: ${term.label}`,
                                                                amount: safeAmount,
                                                                date: safeDate
                                                            });
                                                        }}
                                                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-primary-600 text-white border-transparent hover:bg-primary-700 shadow-sm"
                                                    >
                                                        Registrar Pago
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onEditSubscription(term.originalData, term.type === 'history')}
                                                    className="p-1.5 rounded-md text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                    title="Editar suscripción"
                                                >
                                                    <Edit2 size={16} />
                                                </button>

                                                {(!term.isPaid) && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('¿Estás seguro de que deseas eliminar esta suscripción? Esta acción no se puede deshacer.')) {
                                                                try {
                                                                    const result = await deleteSubscription(term.id);
                                                                    if (result?.success) {
                                                                        alert('Suscripción eliminada correctamente.');
                                                                    } else {
                                                                        if (result?.error?.code === '23503') {
                                                                            alert('No se puede eliminar esta suscripción porque tiene pagos asociados. Por favor, elimina primero los pagos correspondientes.');
                                                                        } else {
                                                                            alert('Error al eliminar la suscripción: ' + (result?.error?.message || 'Error desconocido'));
                                                                        }
                                                                    }
                                                                } catch (err) {
                                                                    alert('Excepción al eliminar: ' + err.message);
                                                                }
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-md text-xs font-medium transition-colors border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        title="Eliminar suscripción"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card mb-6 p-6 bg-slate-50 dark:bg-slate-800/50 border-dashed border-2 border-slate-200 dark:border-slate-700 rounded-lg text-center">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No hay renovaciones registradas</p>
                </div>
            )}

            <div className="flex justify-end mb-4">
                <button onClick={() => onAddPayment()} className="btn btn-primary">
                    <Plus size={18} /> Registrar Pago
                </button>
            </div>

            {/* Extension History Table */}
            {subscriptionExtensions && subscriptionExtensions.filter(e => e.patient_id === patientId).length > 0 && (
                <div className="card overflow-hidden p-0 mb-6 mt-6">
                    <div className="card-header border-b border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                        <h3 className="card-title text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Clock size={16} className="text-amber-500" />
                            Historial de Compensaciones / Extensiones
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="py-3 px-4 font-medium">Fecha Registro</th>
                                    <th className="py-3 px-4 font-medium">Días Añadidos</th>
                                    <th className="py-3 px-4 font-medium">Cambio de Fecha</th>
                                    <th className="py-3 px-4 font-medium text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {subscriptionExtensions
                                    .filter(e => e.patient_id === patientId)
                                    .map(ext => (
                                        <tr key={ext.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                                {format(parseISO(ext.created_at), 'dd/MM/yyyy HH:mm')}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                                                +{ext.days_added} días
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500">
                                                <span className="font-mono">{format(parseISO(ext.previous_end_date), 'dd/MM/yyyy')}</span>
                                                <span className="mx-2 text-slate-300">→</span>
                                                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{format(parseISO(ext.new_end_date), 'dd/MM/yyyy')}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        onEditExtension(ext);
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Editar extensión"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('¿Seguro que quieres eliminar esta extensión? Se restarán los días añadidos a la fecha de fin actual.')) {
                                                            const success = await deleteSubscriptionExtension(ext.id);
                                                            if (!success) {
                                                                alert('Error al eliminar extensión');
                                                            }
                                                        }
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                    title="Eliminar extensión"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Payments Table */}
            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Fecha</th>
                                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Periodo / Concepto</th>
                                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Método</th>
                                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Total</th>
                                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Estado</th>
                                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {patientPayments.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 py-3 px-4">
                                        {safeFormat(p.date)}
                                    </td>
                                    <td className="text-sm text-slate-600 dark:text-slate-300 py-3 px-4">
                                        <div className="flex flex-col">
                                            <span>{p.concept || '-'}</span>
                                            {p.billing_period && <span className="text-xs text-slate-400">Periodo {p.billing_period}</span>}
                                            {!p.subscription_id && (
                                                <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                                    <Clock size={10} /> Sin asignar a periodo
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="capitalize text-slate-600 dark:text-slate-300 py-3 px-4">
                                        {paymentMethods.find(m => m.id === p.payment_method)?.label || p.payment_method}
                                    </td>
                                    <td className="font-semibold text-slate-900 dark:text-white py-3 px-4">
                                        €{parseFloat(p.amount).toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4">
                                        {p.status === 'pagado' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                Pagado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button
                                            onClick={() => onEditPayment(p)}
                                            className="p-1 text-slate-400 hover:text-primary-600 transition-colors"
                                            title="Editar pago"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDeletePayment(p.id)}
                                            className="p-1 text-slate-400 hover:text-red-600 transition-colors ml-1"
                                            title="Eliminar pago"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentsTab;
