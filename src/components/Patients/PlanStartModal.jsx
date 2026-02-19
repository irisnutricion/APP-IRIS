import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { X, Calendar, CreditCard, Clock, Users } from 'lucide-react';
import { addDays, addMonths, format } from 'date-fns';

const PlanStartModal = ({ isOpen, onClose, patientId, suggestedStartDate }) => {
    const { patients, updatePatient, subscriptionTypes, paymentRates, addSubscriptionHistory, nutritionists } = useData();
    const [formData, setFormData] = useState({
        subscriptionTypeId: '',
        paymentRateId: '',
        nutritionistId: '',
        startDate: suggestedStartDate || new Date().toISOString().split('T')[0],
        reviewDay: ''
    });

    const patient = patients.find(p => p.id === patientId);

    // Set defaults
    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                startDate: suggestedStartDate || prev.startDate || new Date().toISOString().split('T')[0],
                subscriptionTypeId: prev.subscriptionTypeId || (subscriptionTypes[0]?.id || ''),
                paymentRateId: prev.paymentRateId || (paymentRates[0]?.id || ''),
                nutritionistId: prev.nutritionistId || patient?.nutritionist_id || '',
                reviewDay: ''
            }));
        }
    }, [isOpen, subscriptionTypes, paymentRates, suggestedStartDate]);

    if (!isOpen || !patient) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        const selectedType = subscriptionTypes.find(t => t.id === formData.subscriptionTypeId);
        const selectedRate = paymentRates.find(r => r.id === formData.paymentRateId);

        if (!selectedType || !selectedRate) return;

        const durationMonths = selectedType.months;
        const endDate = addMonths(new Date(formData.startDate), durationMonths).toISOString().split('T')[0];

        // 1. Create History Record (Initial Subscription)
        const newHistoryItem = {
            patient_id: patient.id,
            plan_name: selectedType.label, // Legacy/Display
            subscription_type_id: selectedType.id,
            payment_rate_id: selectedRate.id,
            start_date: formData.startDate,
            end_date: endDate,
            price: selectedRate.amount,
            status: 'active'
        };

        await addSubscriptionHistory(newHistoryItem);

        // 2. Update Patient Current State (subscription + nutritionist)
        const subscriptionUpdates = {
            subscription: {
                type: selectedType.label,
                subscriptionTypeId: selectedType.id,
                paymentRateId: selectedRate.id,
                startDate: formData.startDate,
                reviewDay: formData.reviewDay || null,
                endDate: endDate,
                status: 'active',
                price: selectedRate.amount
            },
            nutritionistId: formData.nutritionistId || null
        };

        await updatePatient(patient.id, subscriptionUpdates);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Seleccionar Plan: <span className="text-primary-600">{patient.name}</span>
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="form-label flex items-center gap-2">
                                <Clock size={16} /> Tipo de Suscripción
                            </label>
                            <select
                                className="form-select"
                                value={formData.subscriptionTypeId}
                                onChange={e => {
                                    const newTypeId = e.target.value;
                                    // Find valid rates for this new type
                                    const validRates = paymentRates.filter(r => !r.subscription_type_id || r.subscription_type_id === newTypeId);
                                    const activeRates = validRates.filter(r => r.is_active !== false);

                                    setFormData({
                                        ...formData,
                                        subscriptionTypeId: newTypeId,
                                        // Auto-select the first valid rate for this type to avoid mismatch
                                        paymentRateId: activeRates.length > 0 ? activeRates[0].id : (validRates.length > 0 ? validRates[0].id : '')
                                    });
                                }}
                                required
                            >
                                <option value="" disabled>Seleccionar...</option>
                                {subscriptionTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.label} ({t.months} meses)</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label flex items-center gap-2">
                                <CreditCard size={16} /> Tarifa Aplicable
                            </label>
                            <select
                                className="form-select"
                                value={formData.paymentRateId}
                                onChange={e => setFormData({ ...formData, paymentRateId: e.target.value })}
                                required
                            >
                                <option value="" disabled>Seleccionar...</option>
                                {(() => {
                                    const filtered = paymentRates.filter(r => !r.subscription_type_id || r.subscription_type_id === formData.subscriptionTypeId);
                                    const active = filtered.filter(r => r.is_active !== false);
                                    const archived = filtered.filter(r => r.is_active === false);

                                    return (
                                        <>
                                            <optgroup label="Actuales">
                                                {active.length > 0 ? (
                                                    active.map(r => (
                                                        <option key={r.id} value={r.id}>
                                                            {r.label} - {r.amount}€
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option disabled>Sin tarifas actuales</option>
                                                )}
                                            </optgroup>
                                            {archived.length > 0 && (
                                                <optgroup label="Archivadas">
                                                    {archived.map(r => (
                                                        <option key={r.id} value={r.id} className="text-gray-500">
                                                            {r.label} - {r.amount}€ (Archivada)
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </>
                                    );
                                })()}
                            </select>
                        </div>
                        <div>
                            <label className="form-label flex items-center gap-2">
                                <Users size={16} /> Nutricionista Asignado
                            </label>
                            <select
                                className="form-select"
                                value={formData.nutritionistId}
                                onChange={e => setFormData({ ...formData, nutritionistId: e.target.value })}
                            >
                                <option value="">-- Sin asignar --</option>
                                {nutritionists.filter(n => n.is_active !== false).map(n => (
                                    <option key={n.id} value={n.id}>{n.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="form-label flex items-center gap-2">
                            <Calendar size={16} /> Fecha de Inicio
                        </label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.startDate}
                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="form-label flex items-center gap-2">
                            <Calendar size={16} /> Día de Revisión (Opcional)
                        </label>
                        <select
                            className="form-select"
                            value={formData.reviewDay}
                            onChange={e => setFormData({ ...formData, reviewDay: e.target.value })}
                        >
                            <option value="">Automático (Mismo día que inicio)</option>
                            <option value="1">Lunes</option>
                            <option value="2">Martes</option>
                            <option value="3">Miércoles</option>
                            <option value="4">Jueves</option>
                            <option value="5">Viernes</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Si seleccionas un día, todas las revisiones se moverán a ese día de la semana.</p>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={onClose} className="btn btn-outline flex-1">
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary flex-1">
                            Guardar e Iniciar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PlanStartModal;
