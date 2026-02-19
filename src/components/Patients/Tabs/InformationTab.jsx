import { Edit2, PenLine } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { safeFormat, calculateAge } from '../../../utils/dateUtils';
import { differenceInDays, parseISO } from 'date-fns';

const InformationTab = ({ patient, onEditSubscription }) => {
    const { clinicalCategories, updatePatient, referralSources, nutritionists } = useData();

    const getStatusInfo = (patient) => {
        const today = new Date().toISOString().split('T')[0];
        const { startDate, endDate, status } = patient.subscription || {};

        if (startDate && startDate > today) {
            // Check for any currently active subscription in history
            const activeSub = patient.subscriptionHistory?.find(sub =>
                sub.status === 'active' &&
                sub.start_date <= today &&
                (!sub.end_date || sub.end_date >= today)
            );

            if (activeSub) {
                return {
                    label: 'Activo',
                    badgeClass: 'badge badge-success'
                };
            }

            return {
                label: 'Esperando inicio',
                badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            };
        }

        const isExpired = endDate && endDate < today && status === 'active';
        const displayStatus = isExpired ? 'expired' : (status || 'inactive');

        const classes = {
            'active': 'success',
            'paused': 'warning',
            'cancelled': 'danger',
            'expired': 'secondary',
            'inactive': 'secondary'
        }[displayStatus] || 'secondary';

        const labels = {
            'active': 'Activo',
            'paused': 'Pausado',
            'cancelled': 'Cancelado',
            'expired': 'Caducado',
            'inactive': 'A la espera'
        }[displayStatus] || displayStatus;

        return {
            label: labels,
            badgeClass: `badge badge-${classes} ${displayStatus === 'expired' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : ''}`
        };
    };

    const statusInfo = getStatusInfo(patient);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="card">
                <div className="card-header border-b border-gray-100 dark:border-gray-700">
                    <h3 className="card-title text-primary dark:text-primary-400 font-bold">Información Personal</h3>
                </div>
                <dl className="space-y-4 p-6">
                    <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                        <dt className="text-slate-500 dark:text-slate-400 text-sm">Fecha de Nacimiento</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">
                            {patient.birth_date ? (
                                <>
                                    {safeFormat(patient.birth_date)}
                                    <span className="text-slate-500 dark:text-slate-400 ml-2">({calculateAge(patient.birth_date)} años)</span>
                                </>
                            ) : '-'}
                        </dd>
                    </div>
                    {/* ... (rest of personal info content identical to original, just ensuring correct imports) ... */}
                    <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                        <dt className="text-slate-500 dark:text-slate-400 text-sm">Teléfono</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">{patient.phone}</dd>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                        <dt className="text-slate-500 dark:text-slate-400 text-sm">Email</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">{patient.email}</dd>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                        <dt className="text-slate-500 dark:text-slate-400 text-sm">Ciudad</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">{patient.city || '-'}</dd>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                        <dt className="text-slate-500 dark:text-slate-400 text-sm">Cómo nos conoció</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">
                            {referralSources?.find(r => r.id === patient.referral_source)?.label || patient.referral_source || '-'}
                        </dd>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                        <dt className="text-slate-500 dark:text-slate-400 text-sm">Nutricionista</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">
                            {nutritionists?.find(n => n.id === patient.nutritionist_id)?.label || '-'}
                        </dd>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                        <dt className="text-slate-500 dark:text-slate-400 text-sm">Día de Revisión</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">
                            {patient.review_day ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'][parseInt(patient.review_day) - 1] || 'Sin definir' : '-'}
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="card relative group">
                <div className="card-header border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="card-title text-primary dark:text-primary-400 font-bold">Suscripción</h3>
                    <button
                        onClick={() => onEditSubscription()}
                        className="p-1 text-slate-400 hover:text-primary-600 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Editar suscripción"
                    >
                        <Edit2 size={16} />
                    </button>
                </div>
                <dl className="space-y-4 p-6">
                    <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                        <dt className="text-slate-500 dark:text-slate-400 text-sm">Plan</dt>
                        <dd className="font-medium capitalize text-slate-800 dark:text-slate-200">{patient.subscription?.type}</dd>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                        <dt className="text-slate-500 dark:text-slate-400 text-sm">Inicio</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">
                            {safeFormat(patient.subscription?.startDate, 'dd/MM/yyyy')}
                        </dd>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                        <dt className="text-slate-500 dark:text-slate-400 text-sm">Fin</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">
                            {safeFormat(patient.subscription?.endDate, 'dd/MM/yyyy')}
                        </dd>
                    </div>
                    {patient.days_remaining !== undefined && patient.days_remaining !== null && (
                        <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                            <dt className="text-slate-500 dark:text-slate-400 text-sm">Días Restantes</dt>
                            <dd className={`font-bold ${patient.days_remaining < 0 ? 'text-red-500' : patient.days_remaining <= 5 ? 'text-amber-500' : 'text-green-600'}`}>
                                {patient.days_remaining < 0 ? `Vencido hace ${Math.abs(patient.days_remaining)} días` : `${patient.days_remaining} días`}
                            </dd>
                        </div>
                    )}
                    <div className="flex justify-between pt-2">
                        <dt className="text-muted text-sm">Estado</dt>
                        <dd>
                            <span className={statusInfo.badgeClass}>
                                {statusInfo.label}
                            </span>
                        </dd>
                    </div>
                </dl>
            </div>

            {/* Notas / Anotaciones */}
            <div className="card md:col-span-2">
                <div className="card-header border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-amber-50/50 dark:bg-amber-900/10">
                    <h3 className="card-title text-amber-700 dark:text-amber-500 font-bold flex items-center gap-2">
                        <PenLine size={18} /> Anotaciones
                    </h3>
                    <span className="text-xs text-amber-600/60 dark:text-amber-500/60 font-medium">Se guarda automáticamente</span>
                </div>
                <div className="p-0">
                    <textarea
                        className="w-full min-h-[120px] p-6 text-sm text-slate-700 dark:text-slate-300 bg-transparent border-none focus:ring-0 focus:bg-amber-50/30 dark:focus:bg-amber-900/20 transition-colors resize-y outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        placeholder="Escribe aquí notas privadas sobre el seguimiento, detalles importantes o recordatorios..."
                        defaultValue={patient.notes || ''}
                        onBlur={(e) => {
                            if (e.target.value !== (patient.notes || '')) {
                                updatePatient(patient.id, { notes: e.target.value });
                            }
                        }}
                    />
                </div>
            </div>

            <div className="card md:col-span-2">
                <div className="card-header border-b border-gray-100 dark:border-gray-700">
                    <h3 className="card-title text-primary dark:text-primary-400 font-bold">Objetivos y Salud</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Objetivo Nutricional</h4>
                        <p className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-lg text-sm leading-relaxed text-slate-700 dark:text-slate-300">{patient.goals || 'No especificado'}</p>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-red-500 uppercase mb-2">Alergias / Intolerancias</h4>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-sm text-red-800 dark:text-red-300 border border-red-100 dark:border-red-800/30">
                            {patient.allergies || 'Ninguna conocida'}
                        </div>
                    </div>
                    {clinicalCategories?.map(category => {
                        let fieldName = category.id;
                        if (category.id === 'pathology') fieldName = 'pathologies';
                        if (category.id === 'dislike') fieldName = 'disliked_foods';

                        const value = patient[fieldName] || patient[category.id] || patient.clinical_data?.[category.id];

                        if (!category.is_active && !value) return null;

                        return (
                            <div key={category.id}>
                                <h4 className={`text-xs font-bold uppercase mb-2 ${category.color ? category.color.replace('bg-', 'text-').replace('100', '500') : 'text-slate-500 dark:text-slate-400'}`}>
                                    {category.label}
                                </h4>
                                <div className={`p-4 rounded-lg text-sm border ${category.color ? category.color.replace('text-', 'text-opacity-80 text-') : 'bg-slate-50 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700'}`}>
                                    {value || 'No especificado'}
                                </div>
                            </div>
                        );
                    })}

                </div>
            </div>
        </div>
    );
};

export default InformationTab;
