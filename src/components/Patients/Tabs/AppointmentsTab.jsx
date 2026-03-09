import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { CalendarClock, Plus, CalendarDays, Euro, Trash2, Edit2, MapPin, CheckCircle2, Clock } from 'lucide-react';

const AppointmentsTab = ({ patient }) => {
    const { appointments, appointmentTypes, paymentCategories, addAppointment, updateAppointment, deleteAppointment, addPayment } = useData();
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [createPaymentRecord, setCreatePaymentRecord] = useState(false);

    const [form, setForm] = useState({
        appointment_type_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00',
        status: 'scheduled',
        payment_status: 'pending',
        notes: ''
    });

    const patientAppointments = appointments
        .filter(a => a.patient_id === patient.id)
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    const getApptType = (id) => appointmentTypes.find(t => t.id === id);
    const getCategoryName = (catId) => paymentCategories.find(c => c.id === catId)?.label || '';

    const handleOpenModal = (appt = null) => {
        if (appt) {
            setEditingId(appt.id);
            setForm({
                appointment_type_id: appt.appointment_type_id,
                date: format(parseISO(appt.start_time), 'yyyy-MM-dd'),
                time: format(parseISO(appt.start_time), 'HH:mm'),
                status: appt.status,
                payment_status: appt.payment_status,
                notes: appt.notes || ''
            });
        } else {
            setEditingId(null);
            setForm({
                appointment_type_id: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                time: '10:00',
                status: 'scheduled',
                payment_status: 'pending',
                notes: ''
            });
        }
        setCreatePaymentRecord(false);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.appointment_type_id) {
            showToast('Selecciona el tipo de cita', 'error');
            return;
        }

        const type = getApptType(form.appointment_type_id);
        if (!type) {
            showToast('Tipo de cita inválido', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // Calculate start and end times in ISO format
            const startTimeString = `${form.date}T${form.time}:00`;
            const startDate = parseISO(startTimeString);
            const endDate = new Date(startDate.getTime() + type.duration_minutes * 60000);

            const payload = {
                patient_id: patient.id,
                appointment_type_id: form.appointment_type_id,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                status: form.status,
                payment_status: form.payment_status,
                notes: form.notes
            };

            if (isEditingId) {
                await updateAppointment(isEditingId, payload);
                showToast('Cita actualizada correctamente', 'success');
            } else {
                await addAppointment(payload);
                showToast('Cita agendada correctamente', 'success');
            }

            if (form.payment_status === 'paid' && createPaymentRecord) {
                try {
                    await addPayment({
                        patient_id: patient.id,
                        amount: type.price,
                        date: form.date,
                        payment_method_id: 'efectivo',
                        payment_category_id: type.category_id || null,
                        notes: `Cita: ${type.name}`
                    });
                    showToast('Pago registrado en contabilidad', 'success');
                } catch (e) { console.error('Error addPayment', e) }
            }

            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            showToast('Error al guardar cita', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('¿Seguro que deseas eliminar esta cita?')) {
            try {
                await deleteAppointment(id);
                showToast('Cita eliminada', 'success');
            } catch (err) {
                console.error(err);
                showToast('Error al eliminar cita', 'error');
            }
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'scheduled': return <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Programada</span>;
            case 'completed': return <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Completada</span>;
            case 'cancelled': return <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">Cancelada</span>;
            case 'no_show': return <span className="badge bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">Falta / No Show</span>;
            default: return null;
        }
    };

    const getPaymentBadge = (status) => {
        switch (status) {
            case 'pending': return <span className="badge bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Ptde. Pago</span>;
            case 'paid': return <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Pagado</span>;
            case 'bono': return <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Bono Consumido</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <CalendarClock className="text-primary" /> Citas Presenciales
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Historial de citas y reservas en centros o en consultas propias.
                    </p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-primary shadow-sm flex items-center gap-2">
                    <Plus size={18} /> Agendar Cita
                </button>
            </div>

            <div className="space-y-4">
                {patientAppointments.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <CalendarDays size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300">Ninguna cita agendada</h4>
                        <p className="text-gray-500 max-w-sm mx-auto mt-2 text-sm">Agendando citas aquí, aparecerán vinculadas automáticamente al Historial del paciente y al Calendario global.</p>
                        <button onClick={() => handleOpenModal()} className="btn btn-outline border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 mt-6 mt-4">
                            Agendar la Primera Cita
                        </button>
                    </div>
                ) : (
                    patientAppointments.map(appt => {
                        const type = getApptType(appt.appointment_type_id);
                        const dateObj = parseISO(appt.start_time);
                        const endObj = parseISO(appt.end_time);
                        return (
                            <div key={appt.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 justify-between group">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex flex-col items-center justify-center text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800">
                                        <span className="text-xs font-bold uppercase">{format(dateObj, 'MMM', { locale: es })}</span>
                                        <span className="text-xl font-black leading-none">{format(dateObj, 'dd')}</span>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-lg">{type?.name || 'Servicio Eliminado'}</h4>
                                            {getStatusBadge(appt.status)}
                                            {getPaymentBadge(appt.payment_status)}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1"><Clock size={14} /> {format(dateObj, 'HH:mm')} - {format(endObj, 'HH:mm')}</span>
                                            {type?.category_id && (
                                                <span className="flex items-center gap-1"><MapPin size={14} /> {getCategoryName(type.category_id)}</span>
                                            )}
                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium"><Euro size={14} /> {type?.price || 0}</span>
                                        </div>
                                        {appt.notes && (
                                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <strong className="text-xs uppercase text-slate-400 block mb-0.5">Notas</strong>
                                                {appt.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-start md:justify-end gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-700 opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(appt)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(appt.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal de Agendar Cita */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <CalendarClock className="text-primary-500" /> {editingId ? 'Editar Cita' : 'Agendar Cita'}
                            </h3>
                        </div>

                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
                            <div>
                                <label className="form-label">Tipo de Servicio *</label>
                                <select
                                    required
                                    className="form-select"
                                    value={form.appointment_type_id}
                                    onChange={e => setForm({ ...form, appointment_type_id: e.target.value })}
                                >
                                    <option value="" disabled>Selecciona el tipo de cita...</option>
                                    {appointmentTypes.filter(t => t.is_active || t.id === form.appointment_type_id).map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.duration_minutes} min) - {t.price}€ {t.category_id ? `[${getCategoryName(t.category_id)}]` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Día *</label>
                                    <input
                                        type="date"
                                        required
                                        className="form-input"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Hora inicio *</label>
                                    <input
                                        type="time"
                                        required
                                        className="form-input"
                                        value={form.time}
                                        onChange={e => setForm({ ...form, time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Estado de Cita</label>
                                    <select
                                        className="form-select"
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value })}
                                    >
                                        <option value="scheduled">Programada</option>
                                        <option value="completed">Completada</option>
                                        <option value="cancelled">Cancelada</option>
                                        <option value="no_show">No Show</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Estado de Pago</label>
                                    <select
                                        className="form-select"
                                        value={form.payment_status}
                                        onChange={e => setForm({ ...form, payment_status: e.target.value })}
                                    >
                                        <option value="pending">Ptde. Pago</option>
                                        <option value="paid">Pagado</option>
                                        <option value="bono">Bono Consumido</option>
                                    </select>
                                </div>
                            </div>

                            {form.payment_status === 'paid' && !isEditingId && (
                                <div className="flex items-center gap-2 mt-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                    <input
                                        type="checkbox"
                                        id="createPaymentRecord"
                                        checked={createPaymentRecord}
                                        onChange={e => setCreatePaymentRecord(e.target.checked)}
                                        className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="createPaymentRecord" className="text-sm text-blue-800 dark:text-blue-300">
                                        Generar registro automático de {getApptType(form.appointment_type_id)?.price || 0}€ en pestaña de Pagos
                                    </label>
                                </div>
                            )}

                            <div>
                                <label className="form-label">Notas operativas (Opcional)</label>
                                <textarea
                                    className="form-textarea"
                                    rows="2"
                                    placeholder="Ej. Lleva efectivo, Ojo con alergias..."
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                ></textarea>
                            </div>
                        </form>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="btn btn-ghost"
                                disabled={isSaving}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !form.appointment_type_id}
                                className="btn btn-primary"
                            >
                                {isSaving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : (isEditingId ? 'Actualizar Cita' : 'Agendar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentsTab;
