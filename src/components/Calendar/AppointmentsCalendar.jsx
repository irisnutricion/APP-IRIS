import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';

import { CalendarClock, Plus, CalendarDays, Euro, Trash2, Edit2, MapPin, User, Loader2, Layers, Clock } from 'lucide-react';

const AppointmentsCalendar = () => {
    const { appointments, appointmentTypes, paymentCategories, patients, addAppointment, updateAppointment, deleteAppointment, addPayment, patientVouchers, voucherTypes, consumeVoucher, addPatientVoucher } = useData();
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [createPaymentRecord, setCreatePaymentRecord] = useState(false);

    // Filter by Center (optional)
    const [filterCategory, setFilterCategory] = useState('');

    const [form, setForm] = useState({
        category_id: '',
        patient_id: '',
        appointment_type_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00',
        status: 'scheduled',
        payment_status: 'unresolved',
        voucher_id: '',
        new_voucher_type_id: '',
        notes: ''
    });

    const activeVouchers = useMemo(() => {
        if (!form.patient_id) return [];
        return patientVouchers.filter(v => {
            const type = voucherTypes.find(t => t.id === v.voucher_type_id);
            if (!type) return false;
            return v.patient_id === form.patient_id && v.is_active && v.used_sessions < type.total_sessions;
        });
    }, [patientVouchers, voucherTypes, form.patient_id]);

    const getApptType = (id) => appointmentTypes.find(t => t.id === id);
    const getCategoryName = (catId) => paymentCategories.find(c => c.id === catId)?.label || '';
    const getPatientName = (id) => {
        const p = patients.find(p => p.id === id);
        return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.name : 'Desconocido';
    };

    const getEventStyles = (appt, type) => {
        const baseColor = type?.color_hex || '#28483a';
        let backgroundColor = baseColor;
        let borderColor = baseColor;
        let textColor = '#ffffff';

        if (appt.status === 'completed') {
            backgroundColor = `${baseColor}99`; // Add transparency (hex alpha)
            borderColor = baseColor;
        } else if (appt.status === 'cancelled' || appt.status === 'no_show') {
            backgroundColor = '#f1f5f9'; // Light gray background
            borderColor = '#cbd5e1'; // Gray border
            textColor = '#94a3b8'; // Muted text
        }

        return { backgroundColor, borderColor, textColor };
    };

    const calendarEvents = useMemo(() => {
        let filteredAppts = appointments;
        if (filterCategory) {
            filteredAppts = filteredAppts.filter(a => {
                const t = getApptType(a.appointment_type_id);
                return t && t.category_id === filterCategory;
            });
        }

        return filteredAppts.map(appt => {
            const type = getApptType(appt.appointment_type_id);
            const patientName = getPatientName(appt.patient_id);
            const styles = getEventStyles(appt, type);

            return {
                id: appt.id,
                title: `${patientName} - ${type?.name || 'Cita'}`,
                start: appt.start_time,
                end: appt.end_time,
                backgroundColor: styles.backgroundColor,
                borderColor: styles.borderColor,
                textColor: styles.textColor,
                extendedProps: { ...appt, typeName: type?.name, patientName, baseColor: type?.color_hex }
            };
        });
    }, [appointments, filterCategory, appointmentTypes, patients]);

    const handleOpenModal = (appt = null, initialDate = null) => {
        if (appt) {
            setEditingId(appt.id);
            const type = getApptType(appt.appointment_type_id);
            setForm({
                category_id: type?.category_id || '',
                patient_id: appt.patient_id,
                appointment_type_id: appt.appointment_type_id,
                date: format(parseISO(appt.start_time), 'yyyy-MM-dd'),
                time: format(parseISO(appt.start_time), 'HH:mm'),
                status: appt.status,
                payment_status: appt.payment_status,
                voucher_id: appt.voucher_id || '',
                new_voucher_type_id: '',
                notes: appt.notes || ''
            });
        } else {
            setEditingId(null);
            setForm({
                category_id: filterCategory || '',
                patient_id: '',
                appointment_type_id: '',
                date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                time: initialDate ? format(initialDate, 'HH:mm') : '10:00',
                status: 'scheduled',
                payment_status: 'unresolved',
                voucher_id: '',
                new_voucher_type_id: '',
                notes: ''
            });
        }
        setCreatePaymentRecord(false);
        setIsModalOpen(true);
    };

    const handleDateSelect = (selectInfo) => {
        handleOpenModal(null, selectInfo.start);
    };

    const handleEventClick = (clickInfo) => {
        const appt = clickInfo.event.extendedProps;
        handleOpenModal(appt);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.patient_id || !form.appointment_type_id) {
            showToast('Selecciona paciente y tipo de cita', 'error');
            return;
        }

        const type = getApptType(form.appointment_type_id);
        if (!type) {
            showToast('Tipo de cita inválido', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const startTimeString = `${form.date}T${form.time}:00`;
            const startDate = parseISO(startTimeString);
            const endDate = new Date(startDate.getTime() + type.duration_minutes * 60000);

            if (form.status === 'completed' && form.payment_status === 'unresolved') {
                showToast('Debes seleccionar cómo se ha cobrado la cita (Bono o Suelta) antes de marcarla como Completada.', 'error');
                setIsSaving(false);
                return;
            }

            // Inline Voucher Selling
            let finalVoucherId = form.voucher_id;
            if (form.payment_status === 'bono' && !finalVoucherId && form.new_voucher_type_id) {
                const newVoucher = await addPatientVoucher(form.patient_id, form.new_voucher_type_id);
                finalVoucherId = newVoucher.id;
            }

            const payload = {
                patient_id: form.patient_id,
                appointment_type_id: form.appointment_type_id,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                status: form.status,
                payment_status: form.payment_status,
                voucher_id: form.payment_status === 'bono' ? finalVoucherId : null,
                notes: form.notes
            };

            const isNewBonoConsumption = (form.payment_status === 'bono' && finalVoucherId);
            let prevVoucherId = null;

            if (editingId) {
                const existingAppt = appointments.find(a => a.id === editingId);
                if (existingAppt?.payment_status === 'bono' && existingAppt.voucher_id) {
                    if (existingAppt.voucher_id !== finalVoucherId || form.payment_status !== 'bono') {
                        prevVoucherId = existingAppt.voucher_id;
                    }
                }

                await updateAppointment(editingId, payload);
                showToast('Cita actualizada correctamente', 'success');
            } else {
                await addAppointment(payload);
                showToast('Cita agendada correctamente', 'success');
            }

            // Handle Bono transactions
            if (prevVoucherId) {
                await consumeVoucher(prevVoucherId, true); // revert 1 session
            }
            if (isNewBonoConsumption && finalVoucherId !== prevVoucherId) {
                await consumeVoucher(finalVoucherId, false); // consume 1 session
            }

            if (form.payment_status === 'paid' && createPaymentRecord) {
                try {
                    await addPayment({
                        patient_id: form.patient_id,
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
                const existingAppt = appointments.find(a => a.id === id);
                if (existingAppt?.payment_status === 'bono' && existingAppt.voucher_id) {
                    await consumeVoucher(existingAppt.voucher_id, true); // Refund session
                }
                await deleteAppointment(id);
                showToast('Cita eliminada', 'success');
                setIsModalOpen(false);
            } catch (err) {
                console.error(err);
                showToast('Error al eliminar cita', 'error');
            }
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header flex justify-between items-end mb-6">
                <div>
                    <h1 className="page-title flex items-center gap-2" style={{ color: '#28483a' }}><CalendarClock style={{ color: '#28483a' }} /> Calendario</h1>
                    <p className="page-subtitle">Gestiona todas tus citas presenciales y online en un solo lugar</p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        className="form-select bg-white dark:bg-slate-800 shadow-sm border-slate-200 py-2 h-[42px]"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="">Todas las Etiquetas / Centros</option>
                        {paymentCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                    </select>
                    <button onClick={() => handleOpenModal()} className="btn shadow-sm flex items-center gap-2 h-[42px] text-white" style={{ backgroundColor: '#28483a', borderColor: '#28483a' }}>
                        <Plus size={18} /> Nueva Cita
                    </button>
                </div>
            </div>

            <div className="card p-6 bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
                {/* Estilos para que FullCalendar parpadee menos y respete el dark mode de la app */}
                <style>{`
                    .fc-theme-standard td, .fc-theme-standard th, .fc-theme-standard .fc-scrollgrid {
                        border-color: var(--tw-prose-td-borders, #e2e8f0);
                    }
                    .dark .fc-theme-standard td, .dark .fc-theme-standard th, .dark .fc-theme-standard .fc-scrollgrid {
                        border-color: #334155;
                    }
                    .fc-day-today {
                        background-color: rgba(208, 154, 132, 0.15) !important; /* d09a84 muy flojito */
                    }
                    .fc-col-header-cell-cushion, .fc-daygrid-day-number {
                        color: #475569;
                        font-size: 0.8rem !important;
                    }
                    .dark .fc-col-header-cell-cushion, .dark .fc-daygrid-day-number {
                        color: #94a3b8;
                    }
                    .fc-timegrid-slot-label-cushion {
                        color: #64748b;
                        font-size: 0.7rem !important;
                    }
                    .dark .fc-timegrid-slot-label-cushion {
                        color: #cbd5e1;
                    }
                    .fc-button-primary {
                        background-color: #28483a !important;
                        border-color: #28483a !important;
                        color: white !important;
                        font-size: 0.85rem !important;
                        padding: 0.3rem 0.6rem !important;
                    }
                    .fc-button-primary:not(:disabled):active, .fc-button-primary:not(:disabled).fc-button-active {
                        background-color: #1a2f26 !important;
                        border-color: #1a2f26 !important;
                    }
                    .fc-toolbar-title {
                        font-size: 1rem !important;
                    }
                    .fc-event-title {
                        font-size: 0.65rem !important;
                        font-weight: normal !important;
                        line-height: 1.1;
                    }
                    .fc-event-time {
                        font-size: 0.6rem !important;
                        line-height: 1;
                    }
                `}</style>
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                    }}
                    initialView="timeGridWeek"
                    locale={esLocale}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    weekends={true}
                    slotMinTime="07:00:00"
                    slotMaxTime="22:00:00"
                    slotDuration="00:15:00"
                    slotLabelInterval="00:15:00"
                    expandRows={true}
                    height="75vh"
                    events={calendarEvents}
                    select={handleDateSelect}
                    eventClick={handleEventClick}
                    allDaySlot={false}
                    nowIndicator={true}
                />
            </div>

            {/* Modal de Agendar Cita */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <CalendarClock style={{ color: '#28483a' }} /> {editingId ? 'Editar Cita' : 'Agendar Cita'}
                            </h3>
                        </div>

                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
                            <div>
                                <label className="form-label">Centro / Etiqueta *</label>
                                <select
                                    required
                                    className="form-select"
                                    value={form.category_id}
                                    onChange={e => setForm({ ...form, category_id: e.target.value, patient_id: '', appointment_type_id: '' })}
                                >
                                    <option value="" disabled>Selecciona el centro...</option>
                                    {paymentCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Paciente *</label>
                                <select
                                    required
                                    className="form-select"
                                    value={form.patient_id}
                                    onChange={e => setForm({ ...form, patient_id: e.target.value })}
                                    disabled={!form.category_id}
                                >
                                    <option value="" disabled>Selecciona el paciente...</option>
                                    {patients.filter(p => !form.category_id || p.payment_category_id === form.category_id || p.id === form.patient_id).map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.first_name || ''} {p.last_name || ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Tipo de Servicio *</label>
                                <select
                                    required
                                    className="form-select"
                                    value={form.appointment_type_id}
                                    onChange={e => setForm({ ...form, appointment_type_id: e.target.value })}
                                    disabled={!form.category_id}
                                >
                                    <option value="" disabled>Selecciona el tipo de cita...</option>
                                    {appointmentTypes.filter(t => t.category_id === form.category_id && (t.is_active || t.id === form.appointment_type_id)).map(t => (
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

                            <div className="grid grid-cols-1 gap-4">
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
                            </div>

                            <div className="space-y-3 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                                <label className="form-label text-sm font-bold text-slate-800 dark:text-slate-200">Método de Cobro (Liquidación) *</label>

                                {form.status === 'completed' && form.payment_status === 'unresolved' && (
                                    <div className="bg-red-50 text-red-600 p-2 rounded text-sm border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                                        ⚠️ Si la cita está "Completada", debes decidir cómo se ha cobrado.
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div
                                        onClick={() => setForm({ ...form, payment_status: 'unresolved' })}
                                        className={`cursor-pointer rounded-xl border-2 p-3 transition-all flex flex-col items-center justify-center text-center gap-2 ${form.payment_status === 'unresolved' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-amber-300'}`}
                                    >
                                        <Clock size={20} className={form.payment_status === 'unresolved' ? 'text-amber-500' : 'text-slate-400'} />
                                        <div className="font-semibold text-sm">A Decidir / Pendiente</div>
                                    </div>

                                    <div
                                        onClick={() => setForm({ ...form, payment_status: (form.payment_status === 'pending' || form.payment_status === 'paid') ? form.payment_status : 'pending' })}
                                        className={`cursor-pointer rounded-xl border-2 p-3 transition-all flex flex-col items-center justify-center text-center gap-2 ${(form.payment_status === 'pending' || form.payment_status === 'paid') ? 'border-[#28483a] bg-[#28483a]/5 dark:bg-[#28483a]/20 text-[#28483a] dark:text-[#a3c4b5]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-[#28483a]/50'}`}
                                    >
                                        <Euro size={20} className={(form.payment_status === 'pending' || form.payment_status === 'paid') ? 'text-[#28483a] dark:text-[#a3c4b5]' : 'text-slate-400'} />
                                        <div className="font-semibold text-sm">Consulta Suelta</div>
                                    </div>

                                    <div
                                        onClick={() => {
                                            const vId = form.voucher_id || (activeVouchers?.length > 0 ? activeVouchers[0].id : '');
                                            setForm({ ...form, payment_status: 'bono', voucher_id: vId });
                                        }}
                                        className={`cursor-pointer rounded-xl border-2 p-3 transition-all flex flex-col items-center justify-center text-center gap-2 ${form.payment_status === 'bono' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-purple-300'}`}
                                    >
                                        <Layers size={20} className={form.payment_status === 'bono' ? 'text-purple-600' : 'text-slate-400'} />
                                        <div className="font-semibold text-sm">Usar Bono</div>
                                    </div>
                                </div>
                            </div>

                            {(form.payment_status === 'pending' || form.payment_status === 'paid') && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3 mt-2">
                                    <label className="form-label text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Euro size={16} /> Estado del pago de la consulta
                                    </label>
                                    <select
                                        className="form-select border-slate-300 dark:border-slate-600 focus:ring-[#28483a] focus:border-[#28483a]"
                                        value={form.payment_status}
                                        onChange={e => setForm({ ...form, payment_status: e.target.value })}
                                        required
                                    >
                                        <option value="pending">Pendiente de Pago</option>
                                        <option value="paid">Pagada / Cobrada</option>
                                    </select>
                                </div>
                            )}

                            {form.payment_status === 'bono' && form.patient_id && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 space-y-3">
                                    <label className="form-label text-purple-800 dark:text-purple-300 flex items-center gap-2">
                                        <Layers size={16} /> Selecciona de qué bono restar la sesión
                                    </label>
                                    {activeVouchers.length > 0 ? (
                                        <select
                                            required
                                            className="form-select border-purple-200 focus:ring-purple-500 focus:border-purple-500"
                                            value={form.voucher_id}
                                            onChange={e => setForm({ ...form, voucher_id: e.target.value, new_voucher_type_id: '' })}
                                        >
                                            <option value="" disabled>Elige el bono...</option>
                                            {activeVouchers.map(v => {
                                                const vType = voucherTypes.find(t => t.id === v.voucher_type_id);
                                                return (
                                                    <option key={v.id} value={v.id}>
                                                        {vType?.name} ({v.used_sessions}/{vType?.total_sessions} consumido)
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    ) : (
                                        <div className="bg-white/50 dark:bg-slate-900/30 p-3 rounded-lg space-y-3">
                                            <p className="text-sm text-purple-800 dark:text-purple-300">
                                                No hay bonos activos. Puedes venderle uno ahora:
                                            </p>
                                            <select
                                                required
                                                className="form-select border-purple-200 focus:ring-purple-500 focus:border-purple-500"
                                                value={form.new_voucher_type_id}
                                                onChange={e => setForm({ ...form, new_voucher_type_id: e.target.value })}
                                            >
                                                <option value="">-- Elige el bono a vender --</option>
                                                {voucherTypes.filter(t => t.is_active).map(t => (
                                                    <option key={t.id} value={t.id}>{t.name} ({t.price}€)</option>
                                                ))}
                                            </select>
                                            <div className="text-xs text-purple-600 dark:text-purple-400">
                                                Al Guardar Cita, se cobrará automáticamente el bono y gastará esta sesión.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {form.payment_status === 'paid' && !editingId && (
                                <div className="flex items-center gap-2 mt-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                    <input
                                        type="checkbox"
                                        id="createPaymentRecordCal"
                                        checked={createPaymentRecord}
                                        onChange={e => setCreatePaymentRecord(e.target.checked)}
                                        className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="createPaymentRecordCal" className="text-sm text-blue-800 dark:text-blue-300">
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

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between gap-3 flex-shrink-0">
                            {editingId ? (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(editingId)}
                                    className="btn border border-red-200 text-red-600 hover:bg-red-50 bg-white shadow-sm"
                                    disabled={isSaving}
                                ><Trash2 size={16} /> Eliminar</button>
                            ) : <div></div>}
                            <div className="flex gap-2">
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
                                    disabled={isSaving || !form.patient_id || !form.appointment_type_id}
                                    className="btn text-white disabled:opacity-50"
                                    style={{ backgroundColor: '#28483a', borderColor: '#28483a' }}
                                >
                                    {isSaving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : (editingId ? 'Actualizar Cita' : 'Agendar')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentsCalendar;
