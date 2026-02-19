import { useState, useMemo } from 'react';
import { X, Calendar, Play } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { differenceInDays, addDays, parseISO, format } from 'date-fns';

const ResumeModal = ({ isOpen, onClose, patient }) => {
    const { togglePatientPause } = useData();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const calculation = useMemo(() => {
        if (!patient) return null;

        try {
            const openPause = patient.subscriptionPauses?.find(p => !p.end_date);
            const pauseStart = patient.pause_start_date || patient.subscription?.pauseStartDate ?
                parseISO(patient.pause_start_date || patient.subscription.pauseStartDate) : (openPause ? parseISO(openPause.start_date) : new Date());

            const resumeDateObj = new Date(date);
            if (isNaN(resumeDateObj.getTime())) return null;

            const daysPaused = Math.max(0, differenceInDays(resumeDateObj, pauseStart));

            const currentEndDate = patient.subscription_end || patient.subscription?.endDate ?
                parseISO(patient.subscription_end || patient.subscription.endDate) : new Date();

            const newEndDate = addDays(currentEndDate, daysPaused);

            if (isNaN(newEndDate.getTime())) return null;

            return {
                pauseStart,
                daysPaused,
                originalEndDate: currentEndDate,
                newEndDate
            };
        } catch (e) {
            console.error("Error calculating resume dates:", e);
            return null;
        }
    }, [patient, date]);

    if (!isOpen || !patient) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await togglePatientPause(patient.id, date);
            onClose();
        } catch (error) {
            console.error("Error resuming subscription:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Reanudar Suscripción
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                        <p>La fecha de fin se extenderá automáticamente según los días pausados.</p>
                    </div>

                    <div>
                        <label className="form-label flex items-center gap-2">
                            <Calendar size={16} /> Fecha de Reanudación
                        </label>
                        <input
                            type="date"
                            className="form-input"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                        />
                    </div>

                    {calculation && (
                        <div className="space-y-2 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Días pausados:</span>
                                <span className="font-medium text-slate-700 dark:text-slate-200">{calculation.daysPaused} días</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Fin anterior:</span>
                                <span className="font-medium text-slate-700 dark:text-slate-200">{format(calculation.originalEndDate, 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Nuevo fin:</span>
                                <span className="font-bold text-green-600 dark:text-green-400">{format(calculation.newEndDate, 'dd/MM/yyyy')}</span>
                            </div>
                        </div>
                    )}

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={onClose} className="btn btn-outline flex-1">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? 'Guardando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResumeModal;
