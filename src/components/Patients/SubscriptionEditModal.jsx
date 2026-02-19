import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { X, AlertTriangle, Save } from 'lucide-react';
import { addDays, addMonths, format, parseISO, differenceInDays } from 'date-fns';

const SubscriptionEditModal = ({ isOpen, onClose, patient, subscriptionData, onSave }) => {
    const { updatePatient, plans, subscriptionTypes, paymentRates } = useData();
    const [formData, setFormData] = useState({
        subscriptionTypeId: '',
        paymentRateId: '',
        startDate: '',
        endDate: '',
        status: ''
    });

    useEffect(() => {
        const source = subscriptionData || (patient && patient.subscription);
        if (source) {
            // Attempt to match existing data to new IDs if possible, or fallback to defaults
            // Logic: match type label -> subscriptionType
            // Logic: match price/name -> paymentRate
            const sourceTypeName = source.plan_name || source.type; // "Mensual", etc.
            const matchedType = subscriptionTypes.find(t => t.label === sourceTypeName) || subscriptionTypes[0];

            // For rate, we might need to guess or pick one. If we have a stored ID uses it.
            // If migrating, we might not have IDs yet on the patient, but we populated the tables.
            // We can match by price if available, or just pick the first standard one.
            const sourcePrice = source.price || 0;
            const matchedRate = paymentRates.find(r => r.amount === sourcePrice) || paymentRates[0];

            const start = source.start_date || source.startDate;
            const end = source.end_date || source.endDate;
            const status = source.status || 'active';

            setFormData({
                subscriptionTypeId: source.subscription_type_id || matchedType?.id || '',
                paymentRateId: source.payment_rate_id || matchedRate?.id || '',
                startDate: start || '',
                endDate: end || '',
                status: status
            });
        } else if (isOpen) {
            // Defaults for new subscription
            if (subscriptionTypes.length > 0 && paymentRates.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    subscriptionTypeId: prev.subscriptionTypeId || subscriptionTypes[0].id,
                    paymentRateId: prev.paymentRateId || paymentRates[0].id
                }));
            }
        }
    }, [patient, subscriptionData, subscriptionTypes, paymentRates, isOpen]);

    // Auto-calculate end date when start date or type changes
    useEffect(() => {
        if (formData.startDate && formData.subscriptionTypeId) {
            const type = subscriptionTypes.find(t => t.id === formData.subscriptionTypeId);
            if (type && type.months) {
                const newEndDate = addMonths(parseISO(formData.startDate), type.months);
                setFormData(prev => ({
                    ...prev,
                    endDate: format(newEndDate, 'yyyy-MM-dd')
                }));
            }
        }
    }, [formData.startDate, formData.subscriptionTypeId, subscriptionTypes]);

    if (!isOpen || !patient) return null;

    const selectedType = subscriptionTypes.find(t => t.id === formData.subscriptionTypeId);
    const selectedRate = paymentRates.find(r => r.id === formData.paymentRateId);

    // Preview changes logic
    const oldStartDate = patient.subscription?.startDate;
    const itemsChanged = [];
    if (!subscriptionData && oldStartDate && formData.startDate !== oldStartDate) {
        itemsChanged.push("Las fechas de las mensualidades se recalcularán.");
    }
    // Simplification: just warn if core values change
    if (!subscriptionData && (patient.subscription?.type !== selectedType?.label || patient.subscription?.price !== selectedRate?.amount)) {
        itemsChanged.push("El tipo de suscripción o precio cambiarán.");
    }

    const handleSave = async (e) => {
        if (e) e.preventDefault();

        if (!selectedType || !selectedRate || !formData.startDate) return;

        // Common payload data
        const payload = {
            subscription_type_id: formData.subscriptionTypeId,
            payment_rate_id: formData.paymentRateId,
            plan_name: selectedType.label, // Legacy/Display
            type: selectedType.label,     // Legacy/Display
            price: selectedRate.amount,
            start_date: formData.startDate,
            end_date: formData.endDate,
            status: formData.status
        };

        if (onSave) {
            await onSave(payload);
        } else {
            // Prepare updated subscription object for normalized patient
            const updatedSubscription = {
                ...patient.subscription,
                type: selectedType.label,
                subscriptionTypeId: formData.subscriptionTypeId,
                paymentRateId: formData.paymentRateId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                status: formData.status,
                price: selectedRate.amount
            };

            await updatePatient(patient.id, {
                subscription: updatedSubscription,
                // Update new DB columns
                subscription_type_id: formData.subscriptionTypeId,
                payment_rate_id: formData.paymentRateId,
                // Legacy columns update
                subscription_type: selectedType.label,
                subscription_start: formData.startDate,
                subscription_end: formData.endDate,
                subscription_status: formData.status
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar Suscripción</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Modificar condiciones del contrato</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">

                    {itemsChanged.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200 flex gap-2 items-start">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold mb-1">Atención:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    {itemsChanged.map((msg, i) => <li key={i}>{msg}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">Tipo de Suscripción</label>
                                <select
                                    className="form-select"
                                    value={formData.subscriptionTypeId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, subscriptionTypeId: e.target.value }))}
                                    required
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {subscriptionTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.label} ({t.months} {t.months === 1 ? 'mes' : 'meses'})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tarifa Aplicable</label>
                                <select
                                    className="form-select"
                                    value={formData.paymentRateId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, paymentRateId: e.target.value }))}
                                    required
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {paymentRates.map(r => {
                                        // Show if:
                                        // 1. It is the currently selected one (even if inactive/wrong type)
                                        // 2. OR it is Active AND matches the type (or is generic)
                                        const isSelected = r.id === formData.paymentRateId;
                                        const isActive = r.is_active !== false;
                                        const isLinkedOrGeneric = !r.subscription_type_id || r.subscription_type_id === formData.subscriptionTypeId;

                                        if (isSelected || (isActive && isLinkedOrGeneric)) {
                                            return (
                                                <option key={r.id} value={r.id}>
                                                    {r.label} - {r.amount}€
                                                    {!isActive ? ' (Archivada)' : ''}
                                                    {r.subscription_type_id && r.subscription_type_id !== formData.subscriptionTypeId ? ' (Otro Plan)' : ''}
                                                </option>
                                            );
                                        }
                                        return null;
                                    })}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">Fecha Inicio</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label flex justify-between">
                                    Fecha Fin
                                    <span className="text-xs font-normal text-slate-400">Calculada automáticamente</span>
                                </label>
                                <input
                                    type="date"
                                    className="form-input bg-slate-50 text-slate-500"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Estado</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="active">Activo</option>
                                <option value="paused">Pausado</option>
                                <option value="finished">Finalizado</option>
                                <option value="archived">Archivado (Histórico)</option>
                            </select>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn btn-ghost text-slate-500 hover:text-slate-700">
                        Cancelar
                    </button>
                    <button onClick={() => handleSave()} className="btn btn-primary">
                        <Save size={18} /> Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionEditModal;
