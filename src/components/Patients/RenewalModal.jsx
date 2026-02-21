
import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { X, RefreshCw, CreditCard, Clock } from 'lucide-react';
import { addMonths, format, parseISO, addDays } from 'date-fns';

const RenewalModal = ({ isOpen, onClose, patient, suggestedStartDate }) => {
    const { updatePatient, subscriptionTypes, paymentRates, addSubscriptionHistory } = useData();
    const [formData, setFormData] = useState({
        subscriptionTypeId: '',
        paymentRateId: '',
        renewal_date: '',
        price: '',
        reviewDay: ''
    });

    useEffect(() => {
        if (patient && isOpen) {
            // Default renewal date calculation
            let defaultDate = new Date().toISOString().split('T')[0];

            if (suggestedStartDate) {
                defaultDate = suggestedStartDate;
            } else if (patient.subscription?.endDate) {
                const endDate = parseISO(patient.subscription.endDate);
                // Default to SAME DAY as current subscription ends (to avoid drift)
                defaultDate = format(endDate, 'yyyy-MM-dd');
            }

            // Defaults for type/rate
            const currentTypeId = patient.subscription?.subscriptionTypeId || (subscriptionTypes.length > 0 ? subscriptionTypes[0].id : '');
            const currentRateId = patient.subscription?.paymentRateId || (paymentRates.length > 0 ? paymentRates[0].id : '');

            // Default price: either from current sub or from the defaulted rate
            let currentPrice = '';
            if (patient.subscription?.price) {
                currentPrice = patient.subscription.price;
            } else if (currentRateId) {
                const rate = paymentRates.find(r => r.id === currentRateId);
                if (rate) currentPrice = rate.amount;
            }

            setFormData({
                subscriptionTypeId: currentTypeId,
                paymentRateId: currentRateId,
                renewal_date: defaultDate,
                price: currentPrice,
                reviewDay: patient.review_day || ''
            });
        }
    }, [patient, isOpen, subscriptionTypes, paymentRates]);

    // Update price when rate changes manually
    const handleRateChange = (e) => {
        const newRateId = e.target.value;
        const rate = paymentRates.find(r => r.id === newRateId);
        setFormData(prev => ({
            ...prev,
            paymentRateId: newRateId,
            price: rate ? rate.amount : prev.price
        }));
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        const selectedType = subscriptionTypes.find(t => t.id === formData.subscriptionTypeId);
        if (!selectedType) return;

        const startDate = parseISO(formData.renewal_date);
        const endDate = addMonths(startDate, selectedType.months);

        // 1. Create NEW subscription record in history/subscriptions table
        const newSubscription = {
            patient_id: patient.id,
            plan_name: selectedType.label,
            subscription_type_id: selectedType.id,
            payment_rate_id: formData.paymentRateId,
            start_date: formData.renewal_date,
            end_date: format(endDate, 'yyyy-MM-dd'),
            price: parseFloat(formData.price),
            status: 'active'
        };

        await addSubscriptionHistory(newSubscription);

        // 2. Update Patient 'current' subscription cache
        const updatedSubscriptionCache = {
            type: selectedType.label,
            subscriptionTypeId: selectedType.id,
            paymentRateId: formData.paymentRateId,
            price: parseFloat(formData.price),
            startDate: formData.renewal_date,
            endDate: format(endDate, 'yyyy-MM-dd'),
            status: 'active',
            paymentStatus: 'pending',
            reviewDay: formData.reviewDay || patient.review_day // Keep existing if not changed (form doesn't have selector yet, so keep patient's)
        };

        await updatePatient(patient.id, { subscription: updatedSubscriptionCache });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-primary/5">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                        <RefreshCw size={20} /> Renovar Suscripción
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4 border border-blue-100">
                        Al renovar, se reiniciará el ciclo de facturación desde la fecha seleccionada.
                    </div>

                    {/* Type and Rate Selection */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="form-label flex items-center gap-2">
                                <Clock size={16} /> Tipo de Renovación
                            </label>
                            <select
                                className="form-select"
                                value={formData.subscriptionTypeId}
                                onChange={e => {
                                    const newTypeId = e.target.value;
                                    // Find valid rates for this new type
                                    const validRates = paymentRates.filter(r => !r.subscription_type_id || r.subscription_type_id === newTypeId);
                                    const activeRates = validRates.filter(r => r.is_active !== false);

                                    const newRate = activeRates.length > 0 ? activeRates[0] : (validRates.length > 0 ? validRates[0] : null);

                                    setFormData({
                                        ...formData,
                                        subscriptionTypeId: newTypeId,
                                        paymentRateId: newRate ? newRate.id : '',
                                        price: newRate ? newRate.amount : ''
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
                                onChange={handleRateChange}
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Fecha Renovación */}
                        <div>
                            <label className="form-label">Fecha Inicio Renovación</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.renewal_date}
                                onChange={e => setFormData({ ...formData, renewal_date: e.target.value })}
                                required
                            />
                        </div>

                        {/* Precio */}
                        <div>
                            <label className="form-label">Precio (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Confirmar Renovación
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RenewalModal;
