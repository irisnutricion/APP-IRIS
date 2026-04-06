import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, CreditCard, UtensilsCrossed, Gift, CheckCircle2 } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';

const ALERT_TYPES = {
    subscription_expiring: { icon: Clock, color: 'rose', label: 'Suscripción expira pronto' },
    no_review: { icon: AlertTriangle, color: 'amber', label: 'Sin revisión en +30 días' },
    pending_payment: { icon: CreditCard, color: 'orange', label: 'Pago pendiente +15 días' },
    no_plan: { icon: UtensilsCrossed, color: 'blue', label: 'Sin plan publicado' },
    voucher_exhausted: { icon: Gift, color: 'purple', label: 'Bono agotado' },
};

const colorMap = {
    rose: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300',
    amber: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
    orange: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300',
    blue: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    purple: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300',
};

const iconBg = {
    rose: 'bg-rose-100 dark:bg-rose-900/40',
    amber: 'bg-amber-100 dark:bg-amber-900/40',
    orange: 'bg-orange-100 dark:bg-orange-900/40',
    blue: 'bg-blue-100 dark:bg-blue-900/40',
    purple: 'bg-purple-100 dark:bg-purple-900/40',
};

export default function AlertsWidget() {
    const { patients = [], payments = [], patientVouchers = [] } = useData();
    const navigate = useNavigate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alerts = useMemo(() => {
        const result = [];

        patients.forEach(p => {
            const name = `${p.first_name} ${p.last_name}`;
            const isActive = p.subscription_status === 'active' || p.subscription_status === 'warning';

            // 1. Subscription expiring in ≤7 days
            if (p.subscription_end && (p.subscription_status === 'active' || p.subscription_status === 'warning')) {
                try {
                    const daysLeft = differenceInDays(parseISO(p.subscription_end), today);
                    if (daysLeft >= 0 && daysLeft <= 7) {
                        result.push({
                            type: 'subscription_expiring',
                            patientId: p.id,
                            patientName: name,
                            detail: `Vence en ${daysLeft === 0 ? 'hoy' : `${daysLeft} días`}`,
                            priority: 1,
                        });
                    }
                } catch { /* ignore */ }
            }

            if (!isActive) return;

            // 2. No review in last 30 days
            if (p.subscriptionHistory && p.subscriptionHistory.length > 0) {
                const lastReview = p.measurements?.slice().sort((a, b) =>
                    new Date(b.date) - new Date(a.date))?.[0];
                if (lastReview) {
                    try {
                        const daysSince = differenceInDays(today, parseISO(lastReview.date));
                        if (daysSince > 30) {
                            result.push({
                                type: 'no_review',
                                patientId: p.id,
                                patientName: name,
                                detail: `Última revisión hace ${daysSince} días`,
                                priority: 3,
                            });
                        }
                    } catch { /* ignore */ }
                }
            }

            // 3. No active published plan
            const hasPublishedPlan = p.mealPlans?.some(mp => mp.status === 'active' && mp.published_data);
            if (!hasPublishedPlan && isActive) {
                result.push({
                    type: 'no_plan',
                    patientId: p.id,
                    patientName: name,
                    detail: 'Cliente activo sin plan publicado',
                    priority: 4,
                });
            }

            // 4. Exhausted voucher
            const exhaustedVoucher = patientVouchers.find(v =>
                v.patient_id === p.id &&
                v.used_sessions >= v.total_sessions &&
                v.total_sessions > 0
            );
            if (exhaustedVoucher) {
                result.push({
                    type: 'voucher_exhausted',
                    patientId: p.id,
                    patientName: name,
                    detail: `Bono ${exhaustedVoucher.voucher_name || ''} agotado`,
                    priority: 5,
                });
            }
        });

        // 5. Pending payments older than 15 days
        payments
            .filter(pay => pay.status !== 'pagado' && pay.date)
            .forEach(pay => {
                try {
                    const daysOld = differenceInDays(today, parseISO(pay.date));
                    if (daysOld > 15) {
                        const patient = patients.find(p => p.id === pay.patient_id);
                        result.push({
                            type: 'pending_payment',
                            patientId: pay.patient_id,
                            patientName: patient ? `${patient.first_name} ${patient.last_name}` : (pay.payer_email || 'Desconocido'),
                            detail: `€${parseFloat(pay.amount || 0).toFixed(0)} pendiente hace ${daysOld} días`,
                            priority: 2,
                        });
                    }
                } catch { /* ignore */ }
            });

        return result.sort((a, b) => a.priority - b.priority);
    }, [patients, payments, patientVouchers]);

    if (alerts.length === 0) {
        return (
            <div className="card">
                <div className="card-header mb-3">
                    <h3 className="card-title font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" />
                        Centro de Alertas
                    </h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                    <CheckCircle2 size={36} className="text-emerald-400 opacity-60" />
                    <p className="text-sm font-medium">¡Todo en orden! Sin alertas pendientes.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header border-b border-slate-100 dark:border-slate-700 pb-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="card-title font-bold text-slate-800 dark:text-slate-100">Centro de Alertas</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Clientes que requieren atención</p>
                    </div>
                </div>
                <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
                </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {alerts.map((alert, idx) => {
                    const cfg = ALERT_TYPES[alert.type];
                    const Icon = cfg.icon;
                    return (
                        <div
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity ${colorMap[cfg.color]}`}
                            onClick={() => alert.patientId && navigate(`/patients/${alert.patientId}`)}
                        >
                            <div className={`p-1.5 rounded-lg shrink-0 ${iconBg[cfg.color]}`}>
                                <Icon size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold truncate">{alert.patientName}</p>
                                <p className="text-xs opacity-75 truncate">{alert.detail}</p>
                            </div>
                            <span className="text-[10px] font-semibold shrink-0 opacity-60">{cfg.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
