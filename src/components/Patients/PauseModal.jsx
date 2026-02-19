import { useState } from 'react';
import { X, Calendar, Play } from 'lucide-react';
import { useData } from '../../context/DataContext';

const PauseModal = ({ isOpen, onClose, patient }) => {
    const { togglePatientPause } = useData();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    if (!isOpen || !patient) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await togglePatientPause(patient.id, date);
            onClose();
        } catch (error) {
            console.error("Error pausing subscription:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Pausar Suscripción
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Selecciona la fecha de inicio de la pausa para <strong>{patient.name}</strong>.
                    </p>

                    <div>
                        <label className="form-label flex items-center gap-2">
                            <Calendar size={16} /> Fecha de Inicio
                        </label>
                        <input
                            type="date"
                            className="form-input"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={onClose} className="btn btn-outline flex-1">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1 bg-amber-600 hover:bg-amber-700 border-amber-600 text-white">
                            {loading ? 'Guardando...' : 'Confirmar Pausa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PauseModal;
