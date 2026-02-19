import { Clock, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ExtensionHistoryModal = ({ isOpen, onClose, extensions }) => {
    if (!isOpen) return null;

    // Use es locale for displaying dates but ensure default formatter works if es is null? 
    // Usually pass locale prop to format.

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock size={20} className="text-primary-500" />
                        Historial de Extensiones
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <XCircle size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {extensions && extensions.length > 0 ? (
                        <div className="space-y-3">
                            {extensions.map((ext) => (
                                <div key={ext.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold text-primary-600">+{ext.days_added}</span>
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">días añadidos</span>
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {format(parseISO(ext.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <div>
                                            <span className="block mb-0.5 text-[10px] uppercase tracking-wider text-slate-400">Fin Anterior</span>
                                            <span className="font-mono">{format(parseISO(ext.previous_end_date), 'dd/MM/yyyy')}</span>
                                        </div>
                                        <div className="text-slate-300">→</div>
                                        <div>
                                            <span className="block mb-0.5 text-[10px] uppercase tracking-wider text-primary-500">Nuevo Fin</span>
                                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{format(parseISO(ext.new_end_date), 'dd/MM/yyyy')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            No hay extensiones registradas.
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors font-medium"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExtensionHistoryModal;
