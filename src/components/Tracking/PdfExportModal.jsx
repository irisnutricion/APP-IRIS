import { useState } from 'react';
import { X, FileDown, Check, BarChart3 } from 'lucide-react';

const ALL_CHARTS = [
    { key: 'weight', label: 'Peso (kg)' },
    { key: 'pecho', label: 'Pecho (cm)' },
    { key: 'cadera', label: 'Cadera (cm)' },
    { key: 'sobre_ombligo', label: 'Abd. Sobre Ombligo (cm)' },
    { key: 'ombligo', label: 'Abd. Ombligo (cm)' },
    { key: 'bajo_ombligo', label: 'Abd. Bajo Ombligo (cm)' },
    { key: 'brazo_izq', label: 'Brazo Izquierdo (cm)' },
    { key: 'brazo_der', label: 'Brazo Derecho (cm)' },
    { key: 'muslo_izq', label: 'Muslo Izquierdo (cm)' },
    { key: 'muslo_der', label: 'Muslo Derecho (cm)' }
];

const PdfExportModal = ({ isOpen, onClose, onExport }) => {
    const [selectedCharts, setSelectedCharts] = useState(
        ALL_CHARTS.map(c => c.key)
    );

    if (!isOpen) return null;

    const allSelected = selectedCharts.length === ALL_CHARTS.length;

    const toggleChart = (key) => {
        setSelectedCharts(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const toggleAll = () => {
        setSelectedCharts(allSelected ? [] : ALL_CHARTS.map(c => c.key));
    };

    const handleExport = () => {
        onExport(selectedCharts);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                            <FileDown size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Exportar PDF</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Selecciona los gráficos a incluir</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Select All Toggle */}
                    <button
                        onClick={toggleAll}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                        </span>
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${allSelected ? 'bg-primary-600 text-white' : 'border-2 border-slate-300 dark:border-slate-500'
                            }`}>
                            {allSelected && <Check size={14} />}
                        </div>
                    </button>

                    {/* Chart Checkboxes */}
                    <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto">
                        {ALL_CHARTS.map(chart => {
                            const isSelected = selectedCharts.includes(chart.key);
                            return (
                                <button
                                    key={chart.key}
                                    onClick={() => toggleChart(chart.key)}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left ${isSelected
                                            ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <BarChart3 size={16} className={isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'} />
                                        <span className={`text-sm font-medium ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-slate-600 dark:text-slate-400'
                                            }`}>
                                            {chart.label}
                                        </span>
                                    </div>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-600 text-white' : 'border-2 border-slate-300 dark:border-slate-500'
                                        }`}>
                                        {isSelected && <Check size={14} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-xs text-slate-400 text-center">
                        {selectedCharts.length} de {ALL_CHARTS.length} gráficos seleccionados.
                        El resumen de evolución (primera vs última medición) se incluye siempre.
                    </p>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                    <button onClick={onClose} className="btn btn-outline flex-1">
                        Cancelar
                    </button>
                    <button onClick={handleExport} className="btn btn-primary flex-1">
                        <FileDown size={18} /> Generar PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PdfExportModal;
