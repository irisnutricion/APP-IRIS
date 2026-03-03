import { useState, useRef } from 'react';
import { generateMeasurementsPDF } from '../../../utils/measurementsPdfGenerator';
import { safeFormat } from '../../../utils/dateUtils';
import PdfExportModal from '../../Tracking/PdfExportModal';
import EvolutionChart from '../../Tracking/EvolutionChart';
import { FileDown, Plus, Activity, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';

const TrackingTab = ({ patient, onAddMeasurement, onEditMeasurement, onDeleteMeasurement }) => {
    const hasHistory = patient.measurements && patient.measurements.length > 0;

    // Create refs for all charts
    const weightRef = useRef(null);
    const pechoRef = useRef(null);
    const caderaRef = useRef(null);
    const sobreOmbligoRef = useRef(null);
    const ombligoRef = useRef(null);
    const bajoOmbligoRef = useRef(null);
    const brazoIzqRef = useRef(null);
    const brazoDerRef = useRef(null);
    const musloIzqRef = useRef(null);
    const musloDerRef = useRef(null);

    const getChartsMap = () => ({
        weight: weightRef,
        pecho: pechoRef,
        cadera: caderaRef,
        sobre_ombligo: sobreOmbligoRef,
        ombligo: ombligoRef,
        bajo_ombligo: bajoOmbligoRef,
        brazo_izq: brazoIzqRef,
        brazo_der: brazoDerRef,
        muslo_izq: musloIzqRef,
        muslo_der: musloDerRef
    });

    // Handle PDF export
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

    const handleExportPDF = async (selectedCharts) => {
        try {
            await generateMeasurementsPDF(patient, getChartsMap(), selectedCharts);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Hubo un error al generar el PDF. Por favor, inténtalo de nuevo.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-3">
                {hasHistory && (
                    <button
                        onClick={() => setIsPdfModalOpen(true)}
                        className="btn btn-secondary flex items-center gap-2"
                        title="Exportar mediciones a PDF"
                    >
                        <FileDown size={18} /> Exportar PDF
                    </button>
                )}
                <button onClick={onAddMeasurement} className="btn btn-primary">
                    <Plus size={18} /> Nueva Medición
                </button>
            </div>

            {!hasHistory ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                    <Activity className="text-gray-300 mb-4 mx-auto" size={48} />
                    <p className="text-gray-500 font-medium">No hay registros de evolución aún.</p>
                    <p className="text-sm text-gray-400">Añade la primera medición para ver gráficas.</p>
                </div>
            ) : (
                <>
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card">
                            <div className="card-header"><h4 className="card-title text-primary dark:text-primary-400">Peso</h4></div>
                            <EvolutionChart
                                measurements={patient.measurements}
                                dataKey="weight"
                                label="Peso (kg)"
                                color="#28483a"
                                chartRef={weightRef}
                            />
                        </div>
                        <div className="card">
                            <div className="card-header"><h4 className="card-title text-blue-600">Pecho</h4></div>
                            <EvolutionChart
                                measurements={patient.measurements}
                                dataKey="pecho"
                                label="Pecho (cm)"
                                color="#2563EB"
                                chartRef={pechoRef}
                            />
                        </div>
                        <div className="card">
                            <div className="card-header"><h4 className="card-title text-purple-600">Cadera</h4></div>
                            <EvolutionChart
                                measurements={patient.measurements}
                                dataKey="cadera"
                                label="Cadera (cm)"
                                color="#9333EA"
                                chartRef={caderaRef}
                            />
                        </div>

                        {/* Abdomen */}
                        <div className="card">
                            <div className="card-header"><h4 className="card-title text-orange-600">Abdomen (Sobre)</h4></div>
                            <EvolutionChart
                                measurements={patient.measurements}
                                dataKey="sobre_ombligo"
                                label="Sobre Ombligo (cm)"
                                color="#EA580C"
                                chartRef={sobreOmbligoRef}
                            />
                        </div>
                        <div className="card">
                            <div className="card-header"><h4 className="card-title text-orange-600">Abdomen (Ombligo)</h4></div>
                            <EvolutionChart
                                measurements={patient.measurements}
                                dataKey="ombligo"
                                label="Ombligo (cm)"
                                color="#EA580C"
                                chartRef={ombligoRef}
                            />
                        </div>
                        <div className="card">
                            <div className="card-header"><h4 className="card-title text-orange-600">Abdomen (Bajo)</h4></div>
                            <EvolutionChart
                                measurements={patient.measurements}
                                dataKey="bajo_ombligo"
                                label="Bajo Ombligo (cm)"
                                color="#EA580C"
                                chartRef={bajoOmbligoRef}
                            />
                        </div>

                        {/* Extremidades */}
                        <div className="card">
                            <div className="card-header"><h4 className="card-title text-amber-700">Brazo Izquierdo</h4></div>
                            <EvolutionChart
                                measurements={patient.measurements}
                                dataKey="brazo_izq"
                                label="Brazo Izq (cm)"
                                color="#B45309"
                                chartRef={brazoIzqRef}
                            />
                        </div>
                        <div className="card">
                            <div className="card-header"><h4 className="card-title text-amber-700">Brazo Derecho</h4></div>
                            <EvolutionChart
                                measurements={patient.measurements}
                                dataKey="brazo_der"
                                label="Brazo Der (cm)"
                                color="#B45309"
                                chartRef={brazoDerRef}
                            />
                        </div>
                        <div className="card">
                            <div className="card-header"><h4 className="card-title text-cyan-600">Muslo Izquierdo</h4></div>
                            <EvolutionChart
                                measurements={patient.measurements}
                                dataKey="muslo_izq"
                                label="Muslo Izq (cm)"
                                color="#0891B2"
                                chartRef={musloIzqRef}
                            />
                        </div>
                        <div className="card">
                            <div className="card-header"><h4 className="card-title text-cyan-600">Muslo Derecho</h4></div>
                            <EvolutionChart
                                measurements={patient.measurements}
                                dataKey="muslo_der"
                                label="Muslo Der (cm)"
                                color="#0891B2"
                                chartRef={musloDerRef}
                            />
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Historial Completo</h3>
                        </div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Fecha</th>
                                        <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Peso</th>
                                        <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Pecho</th>
                                        <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Brazos (I | D)</th>
                                        <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Abdomen (S | O | I)</th>
                                        <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Cadera</th>
                                        <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Muslos (I | D)</th>
                                        <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Foto</th>
                                        <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {patient.measurements.sort((a, b) => new Date(b.date) - new Date(a.date)).map((m) => (
                                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs">
                                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{safeFormat(m.date)}</td>
                                            <td className="py-2 px-2 text-center font-bold text-slate-800 dark:text-white">{m.weight} kg</td>
                                            <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{m.pecho || '-'}</td>
                                            <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">
                                                <span className="text-slate-500">I:</span> {m.brazo_izq || '-'} <span className="text-slate-300 mx-1">|</span> <span className="text-slate-500">D:</span> {m.brazo_der || '-'}
                                            </td>
                                            <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">
                                                {m.sobre_ombligo || '-'} <span className="text-slate-300 mx-1">|</span> {m.ombligo || '-'} <span className="text-slate-300 mx-1">|</span> {m.bajo_ombligo || '-'}
                                            </td>
                                            <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{m.cadera || '-'}</td>
                                            <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">
                                                <span className="text-slate-500">I:</span> {m.muslo_izq || '-'} <span className="text-slate-300 mx-1">|</span> <span className="text-slate-500">D:</span> {m.muslo_der || '-'}
                                            </td>
                                            <td className="py-2 px-2 text-center">{m.photo ? <ImageIcon size={14} className="text-primary inline" /> : '-'}</td>
                                            <td className="py-2 px-3 flex justify-end gap-1">
                                                <button
                                                    onClick={() => onEditMeasurement(m)}
                                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 hover:text-primary"
                                                    title="Editar medición"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteMeasurement(m.id)}
                                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors text-slate-400 hover:text-red-500"
                                                    title="Eliminar medición"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <PdfExportModal
                isOpen={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                onExport={handleExportPDF}
            />
        </div>
    );
};

export default TrackingTab;
