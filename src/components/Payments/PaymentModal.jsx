import { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { X } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';

const PaymentModal = ({ isOpen, onClose, initialData = null, defaultPatientId = null, subscriptionTerms = [] }) => {
    const { addPayment, updatePayment, patients, plans, paymentMethods, paymentCategories, paymentRates } = useData();
    const [formData, setFormData] = useState({
        patient_id: defaultPatientId || '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        plan_id: '',
        payment_method: 'efectivo',
        concept: '',
        status: 'pagado',
        category: '',
        billing_period: null
    });

    useEffect(() => {
        if (initialData) {
            // If initialData exists, use it. But if category is missing, try to augment it from patient default.
            let category = initialData.category || '';
            const targetPatientId = initialData.patient_id || defaultPatientId;

            if (!category && targetPatientId) {
                const pat = patients.find(p => p.id === targetPatientId);
                if (pat?.payment_category_id) {
                    category = pat.payment_category_id;
                }
            }

            setFormData({
                ...initialData,
                plan_id: initialData.payment_rate_id || initialData.plan_id || '',
                patient_id: targetPatientId || '', // Fix: ensure patient_id is set
                category: category,
                category: category,
                status: initialData.status || 'pagado',
                payment_method: initialData.payment_method || 'efectivo',
                billing_period: initialData.billing_period || null,
                subscription_id: initialData.subscription_id || ''
            });
        } else {
            // Find default patient to get their category if available
            let defaultCategory = '';
            if (defaultPatientId) {
                const defPatient = patients.find(p => p.id === defaultPatientId);
                if (defPatient?.payment_category_id) {
                    defaultCategory = defPatient.payment_category_id;
                }
            }

            setFormData({
                patient_id: defaultPatientId || '',
                date: new Date().toISOString().split('T')[0],
                amount: '',
                plan_id: '',
                payment_method: 'efectivo',
                concept: '',
                status: 'pagado',
                category: defaultCategory,
                billing_period: null,
                subscription_id: ''
            });
        }
    }, [initialData, defaultPatientId, isOpen, patients]);

    // Calculate billing periods for selected patient based on ACTUAL subscription history
    const billingPeriods = useMemo(() => {
        // If specific terms are provided (from PatientDetail payments tab), use those
        if (subscriptionTerms && subscriptionTerms.length > 0) {
            return subscriptionTerms.map((term, index) => ({
                id: term.id, // This is the subscription PK
                label: `${term.label} (${format(term.start, 'dd/MM/yyyy')} - ${format(term.end, 'dd/MM/yyyy')}) ${term.isPaid ? '✅' : '⏳'}`,
                value: term.id,
                start: term.start,
                isPaid: term.isPaid,
                payment_rate_id: term.payment_rate_id,
                amount: term.price
            }));
        }

        // Prioritize defaultPatientId if present (when opening from PatientDetail)
        // Otherwise use the selected patient from the dropdown
        const targetPatientId = defaultPatientId || formData.patient_id;

        if (!targetPatientId) return [];

        const patient = patients.find(p => p.id === targetPatientId);
        if (!patient?.subscriptionHistory?.length) return [];

        // Auto-select category if not set
        if (patient?.payment_category_id && !formData.category) {
            // We use a timeout or check if we are not in an infinite loop
            // Better to do this in a useEffect actually.
        }

        // Map history to selectable options
        return patient.subscriptionHistory.filter(sub => sub && sub.start_date).map(sub => {
            const start = parseISO(sub.start_date);
            const end = sub.end_date ? parseISO(sub.end_date) : addDays(start, 30);
            return {
                id: sub.id,
                label: `${sub.plan_name} (${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')})`,
                value: sub.id,
                start: start,
                payment_rate_id: sub.payment_rate_id,
                amount: sub.price || sub.amount
            };
        }).sort((a, b) => b.start - a.start); // Newest first

    }, [formData.patient_id, defaultPatientId, patients, subscriptionTerms]);

    // Check if patient has subscription but no periods generated (debugging/info)
    const selectedPatient = patients.find(p => p.id === (defaultPatientId || formData.patient_id));
    const hasSubscription = selectedPatient?.subscription?.startDate;

    // Auto-select Patient's Center (Category)


    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            amount: parseFloat(formData.amount),
            payment_rate_id: formData.plan_id || null, // Map plan_id (holding rate ID) to payment_rate_id
            category: formData.category || null,       // Ensure empty string is null (UUID error fix)
            subscription_id: formData.subscription_id || null // Ensure empty string is null (UUID error fix)
        };

        // Remove legacy and UI-only fields
        delete dataToSave.plan_id;
        delete dataToSave.billing_period;

        if (initialData?.id) {
            await updatePayment(initialData.id, dataToSave);
        } else {
            await addPayment(dataToSave);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {initialData ? 'Editar Pago' : 'Registrar Nuevo Pago'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Cliente */}
                    {!defaultPatientId && (
                        <div>
                            {initialData?.payer_email && (
                                <div className="mb-2 p-2 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200">
                                    Email de origen: <strong>{initialData.payer_email}</strong>
                                </div>
                            )}
                            <label className="form-label">Cliente</label>
                            <select
                                className="form-select"
                                value={formData.patient_id}
                                onChange={e => {
                                    const newPatientId = e.target.value;
                                    const selectedP = patients.find(p => p.id === newPatientId);
                                    setFormData({
                                        ...formData,
                                        patient_id: newPatientId,
                                        category: selectedP?.payment_category_id || '' // Auto-select category
                                    });
                                }}
                                required
                            >
                                <option value="">Seleccionar cliente...</option>
                                {patients.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {/* Fecha */}
                        <div>
                            <label className="form-label">Fecha</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        {/* Total */}
                        <div>
                            <label className="form-label">Total (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Tarifa / Plan */}
                    <div>
                        <label className="form-label">Tarifa / Plan</label>
                        <select
                            className="form-select"
                            value={formData.plan_id || ''}
                            onChange={e => {
                                const selectedId = e.target.value;
                                const rate = paymentRates.find(r => r.id === selectedId);
                                setFormData(prev => ({
                                    ...prev,
                                    plan_id: selectedId,
                                    amount: rate ? rate.amount : prev.amount
                                }));
                            }}
                        >
                            <option value="">Ninguno / Personalizado</option>
                            {(() => {
                                const active = paymentRates.filter(r => r.is_active !== false);
                                const archived = paymentRates.filter(r => r.is_active === false);

                                const renderOption = (r, isArchived = false) => {
                                    const isSelected = formData.plan_id === r.id;
                                    const currentAmount = parseFloat(formData.amount || 0);
                                    const rateAmount = parseFloat(r.amount || 0);
                                    // Check for mismatch (allow small float diff), only if selected
                                    const isMismatch = isSelected && Math.abs(currentAmount - rateAmount) > 0.01;

                                    const displayAmount = isMismatch ? currentAmount : rateAmount;

                                    let extraText = '';
                                    if (isMismatch) extraText = ' (Precio guardado)';
                                    else if (isArchived) extraText = ' (Archivada)';

                                    return (
                                        <option key={r.id} value={r.id} className={isArchived ? "text-gray-500" : ""}>
                                            {r.label} - {displayAmount}€{extraText}
                                        </option>
                                    );
                                };

                                return (
                                    <>
                                        {active.length > 0 && (
                                            <optgroup label="Tarifas Actuales">
                                                {active.map(r => renderOption(r, false))}
                                            </optgroup>
                                        )}
                                        {archived.length > 0 && (
                                            <optgroup label="Tarifas Antiguas">
                                                {archived.map(r => renderOption(r, true))}
                                            </optgroup>
                                        )}
                                    </>
                                );
                            })()}
                        </select>
                    </div>

                    {/* Periodo de Facturación / Suscripción */}
                    {billingPeriods.length > 0 && (
                        <div>
                            <label className="form-label">Periodo de Suscripción</label>
                            <select
                                className="form-select"
                                value={formData.subscription_id || ''}
                                onChange={e => {
                                    const val = e.target.value; // UUID string
                                    const period = billingPeriods.find(p => p.value === val);

                                    const updates = { subscription_id: val };
                                    if (period) {
                                        // Auto-link concept and date for better association
                                        // Auto-link concept if not already set
                                        if (!formData.concept) {
                                            updates.concept = `Pago: ${period.label.split('(')[0].trim()}`;
                                        }

                                        // Auto-select Rate and Price if linked
                                        if (period.payment_rate_id) {
                                            updates.plan_id = period.payment_rate_id;
                                        } else {
                                            // Fallback: Try to match by label + amount if ID is missing (legacy)
                                            const pAmount = parseFloat(period.amount || 0);
                                            const matchedRate = paymentRates.find(r =>
                                                (period.label.toLowerCase().includes(r.label.toLowerCase())) &&
                                                (Math.abs(parseFloat(r.amount) - pAmount) < 0.1)
                                            );

                                            if (matchedRate) {
                                                updates.plan_id = matchedRate.id;
                                            } else {
                                                // If no match, force "Custom" so we don't accidentally select the first rate in the list
                                                updates.plan_id = '';
                                            }
                                        }

                                        // Only auto-fill amount if the payment doesn't already have one
                                        // (e.g. new payment from period). Preserve existing amounts (e.g. Stripe payments).
                                        if (period.amount && !formData.amount) {
                                            updates.amount = parseFloat(period.amount);
                                        }
                                    }
                                    setFormData({ ...formData, ...updates });
                                }}
                            >
                                <option value="">General / Sin asignar</option>
                                {billingPeriods.map(period => (
                                    <option key={period.value} value={period.value}>
                                        {period.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Mensaje de ayuda si no hay periodos pero hay cliente seleccionado */}
                    {selectedPatient && !billingPeriods.length && (
                        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                            {!hasSubscription
                                ? "Este cliente no tiene fecha de inicio de suscripción configurada."
                                : "No hay periodos de facturación disponibles para las fechas actuales."}
                        </div>
                    )}
                    {/* Método y Estado */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Método</label>
                            <select
                                className="form-select"
                                value={formData.payment_method}
                                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                            >
                                {paymentMethods.filter(m => m.is_active !== false).map(m => (
                                    <option key={m.id} value={m.id}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Estado</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="pagado">Pagado</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>
                    </div>

                    {/* Concepto */}
                    <div>
                        <label className="form-label">Concepto (Opcional)</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Ej. Consulta primera vez"
                            value={formData.concept || ''}
                            onChange={e => setFormData({ ...formData, concept: e.target.value })}
                        />
                    </div>

                    {/* Categoría */}
                    <div>
                        <label className="form-label">Categoría</label>
                        <select
                            className="form-select"
                            value={formData.category || ''}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="">Sin categoría</option>
                            {paymentCategories.filter(c => c.is_active !== false).map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="btn btn-outline flex-1">
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary flex-1">
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentModal;
