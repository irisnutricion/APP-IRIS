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

import { CalendarClock, Plus, CalendarDays, Euro, Trash2, Edit2, MapPin, User, Loader2 } from 'lucide-react';

const AppointmentsCalendar = () => {
    const { appointments, appointmentTypes, paymentCategories, patients, addAppointment, updateAppointment, deleteAppointment, addPayment } = useData();
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [createPaymentRecord, setCreatePaymentRecord] = useState(false);

    // Filter by Center (optional)
    const [filterCategory, setFilterCategory] = useState('');

    const [form, setForm] = useState({
        patient_id: '',
        appointment_type_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00',
        status: 'scheduled',
        payment_status: 'pending',
        notes: ''
    });

    const getApptType = (id) => appointmentTypes.find(t => t.id === id);
    const getCategoryName = (catId) => paymentCategories.find(c => c.id === catId)?.label || '';
    const getPatientName = (id) => {
        const p = patients.find(p => p.id === id);
        return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.name : 'Desconocido';
    };

    const getEventColor = (appt) => {
        if (appt.status === 'completed') return '#10b981'; // green
        if (appt.status === 'cancelled') return '#ef4444'; // red
        if (appt.status === 'no_show') return '#f97316'; // orange

        // Use category color if available, otherwise primary
        const type = getApptType(appt.appointment_type_id);
        if (type && type.category_id) {
            const cat = paymentCategories.find(c => c.id === type.category_id);
            // Basic naive mapping from standard tailwind string if exists, for now fallback to primary blue
            if (cat?.label?.toLowerCase().includes('online')) return '#8b5cf6'; // purple
            return '#3b82f6'; // blue
        }
        return '#3b82f6'; // default scheduled
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
            return {
                id: appt.id,
                title: `${patientName} - ${type?.name || 'Cita'}`,
                start: appt.start_time,
                end: appt.end_time,
                backgroundColor: getEventColor(appt),
                borderColor: getEventColor(appt),
                extendedProps: { ...appt, typeName: type?.name, patientName }
            };
        });
    }, [appointments, filterCategory, appointmentTypes, patients]);

    const handleOpenModal = (appt = null, initialDate = null) => {
        if (appt) {
            setEditingId(appt.id);
            setForm({
                patient_id: appt.patient_id,
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
                patient_id: '',
                appointment_type_id: '',
                date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                time: initialDate ? format(initialDate, 'HH:mm') : '10:00',
                status: 'scheduled',
                payment_status: 'pending',
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

            const payload = {
                patient_id: form.patient_id,
                appointment_type_id: form.appointment_type_id,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                status: form.status,
                payment_status: form.payment_status,
                notes: form.notes
            };

            if (editingId) {
                await updateAppointment(editingId, payload);
                showToast('Cita actualizada correctamente', 'success');
            } else {
                await addAppointment(payload);
                showToast('Cita agendada correctamente', 'success');
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
                    <h1 className="page-title flex items-center gap-2"><CalendarClock className="text-primary-500" /> Calendario</h1>
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
                    <button onClick={() => handleOpenModal()} className="btn btn-primary shadow-sm flex items-center gap-2 h-[42px]">
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
                    .fc-col-header-cell-cushion, .fc-daygrid-day-number {
                        color: #475569;
                    }
                    .dark .fc-col-header-cell-cushion, .dark .fc-daygrid-day-number {
                        color: #94a3b8;
                    }
                    .fc-timegrid-slot-label-cushion {
                        color: #64748b;
                        font-size: 0.8rem;
                    }
                    .dark .fc-timegrid-slot-label-cushion {
                        color: #cbd5e1;
                    }
                    .fc-button-primary {
                        background-color: var(--tw-prose-links, #db2777) !important;
                        border-color: var(--tw-prose-links, #be185d) !important;
                    }
                    .fc-button-primary:not(:disabled):active, .fc-button-primary:not(:disabled).fc-button-active {
                        background-color: #9d174d !important;
                        border-color: #831843 !important;
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
                                <CalendarClock className="text-primary-500" /> {editingId ? 'Editar Cita' : 'Agendar Cita'}
                            </h3>
                        </div>

                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
                            <div>
                                <label className="form-label">Paciente *</label>
                                <select
                                    required
                                    className="form-select"
                                    value={form.patient_id}
                                    onChange={e => setForm({ ...form, patient_id: e.target.value })}
                                >
                                    <option value="" disabled>Selecciona el paciente...</option>
                                    {patients.map(p => (
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
                                    className="btn btn-primary"
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
