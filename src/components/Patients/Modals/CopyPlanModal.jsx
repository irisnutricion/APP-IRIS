import { useState, useMemo } from 'react';
import { Search, X, Copy, Users } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';

export default function CopyPlanModal({ plan, isOpen, onClose }) {
    const { patients = [], mealPlanItems = [], cloneMealPlan } = useData();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [copying, setCopying] = useState(false);

    const filteredPatients = useMemo(() => {
        if (!plan) return [];
        const q = search.toLowerCase().trim();
        return patients
            .filter(p => p.id !== plan.patient_id) // exclude the source patient
            .filter(p => !q || p.name?.toLowerCase().includes(q))
            .slice(0, 10);
    }, [patients, plan, search]);

    const handleCopy = async () => {
        if (!selectedPatientId || !plan) return;
        setCopying(true);
        try {
            await cloneMealPlan(plan.id, selectedPatientId);
            showToast('Plan duplicado correctamente', 'success');
            onClose();
        } catch (err) {
            console.error('Error copying plan:', err);
            showToast('Error al duplicar el plan', 'error');
        } finally {
            setCopying(false);
        }
    };

    if (!isOpen || !plan) return null;

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Copy size={18} className="text-primary-500" />
                        <h3 className="font-bold text-slate-800 dark:text-white">Duplicar Plan</h3>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X size={18} />
                    </button>
                </div>

                {/* Plan info */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Plan a duplicar:</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{plan.name}</p>
                </div>

                {/* Patient search */}
                <div className="p-4 space-y-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Selecciona el paciente destino:</p>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar paciente..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredPatients.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-400">No se encontraron pacientes</div>
                        ) : (
                            filteredPatients.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPatientId(p.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${selectedPatientId === p.id
                                        ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-primary-500'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-400">
                                        {p.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.name}</p>
                                        <p className="text-xs text-slate-400 capitalize">{p.subscription_status || 'Sin estado'}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedPatient ? (
                            <span>Destino: <strong className="text-slate-700 dark:text-slate-200">{selectedPatient.name}</strong></span>
                        ) : 'Selecciona un paciente'}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="btn btn-outline text-sm py-2 px-4">Cancelar</button>
                        <button
                            onClick={handleCopy}
                            disabled={!selectedPatientId || copying}
                            className="btn btn-primary text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Copy size={14} />
                            {copying ? 'Copiando...' : 'Duplicar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
