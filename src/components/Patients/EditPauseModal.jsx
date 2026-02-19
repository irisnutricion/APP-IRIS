import { useState, useEffect } from 'react';
import { X, Calendar, Save } from 'lucide-react';
import { useData } from '../../context/DataContext';

const EditPauseModal = ({ isOpen, onClose, pause, patientName }) => {
    const { updatePatientPause } = useData();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        console.log('EditPauseModal EFFECT. pause:', pause, 'isOpen:', isOpen);
        if (pause) {
            setStartDate(pause.start_date.split('T')[0]);
            setEndDate(pause.end_date ? pause.end_date.split('T')[0] : '');
        }
    }, [pause, isOpen]);

    if (!isOpen) return null;

    // Fallback if pause is not yet loaded but modal is open
    if (!pause) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
                    <p>Cargando datos de la pausa...</p>
                    <button onClick={onClose} className="mt-4 btn btn-ghost btn-sm">Cerrar</button>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updates = {
                start_date: startDate,
                end_date: endDate || null
            };
            await updatePatientPause(pause.id, updates);
            onClose();
        } catch (error) {
            console.error("Error updating pause:", error);
            alert("Error al actualizar la pausa");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Editar Pausa
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Editando pausa de <strong>{patientName}</strong>.
                    </p>

                    <div>
                        <label className="form-label flex items-center gap-2">
                            <Calendar size={16} /> Fecha de Inicio
                        </label>
                        <input
                            type="date"
                            className="form-input"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="form-label flex items-center gap-2">
                            <Calendar size={16} /> Fecha de Fin
                        </label>
                        <input
                            type="date"
                            className="form-input"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            placeholder="En curso"
                        />
                        <p className="text-xs text-slate-500 mt-1">Dejar vacío si la pausa sigue activa.</p>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={onClose} className="btn btn-outline flex-1">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPauseModal;
