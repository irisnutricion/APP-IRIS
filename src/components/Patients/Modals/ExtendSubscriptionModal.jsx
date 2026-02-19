import { useState } from 'react';
import { Clock } from 'lucide-react';

const ExtendSubscriptionModal = ({ isOpen, onClose, onConfirm, onViewHistory }) => {
    const [days, setDays] = useState(7);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Extender Suscripción</h3>
                    <button onClick={onViewHistory} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium bg-primary-50 px-2 py-1 rounded-lg">
                        <Clock size={12} /> Ver Historial
                    </button>
                </div>

                <p className="text-slate-600 dark:text-slate-300 mb-6">
                    Añade días extra a la suscripción actual para compensar vacaciones o pausas.
                    La fecha de fin se moverá hacia adelante.
                </p>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Días a añadir
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(days)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-600/20 transition-all font-medium"
                    >
                        Añadir Días
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExtendSubscriptionModal;
