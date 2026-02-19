import { useState, useEffect } from 'react';
import { X, Upload, Info } from 'lucide-react';

const MeasurementModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        // Campos según la imagen de referencia
        pecho: '',           // 1 - Pecho
        brazo_izq: '',       // 2 - Brazo izquierdo
        brazo_der: '',       // 3 - Brazo derecho
        sobre_ombligo: '',   // 4 - 3cm sobre ombligo
        ombligo: '',         // 5 - Ombligo
        bajo_ombligo: '',    // 6 - 3cm bajo ombligo
        cadera: '',          // 7 - Cadera
        muslo_izq: '',       // 8 - Muslo izquierdo
        muslo_der: '',       // 9 - Muslo derecho
        photo: null
    });

    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    date: initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0],
                    weight: initialData.weight || '',
                    pecho: initialData.pecho || '',
                    brazo_izq: initialData.brazo_izq || '',
                    brazo_der: initialData.brazo_der || '',
                    sobre_ombligo: initialData.sobre_ombligo || '',
                    ombligo: initialData.ombligo || '',
                    bajo_ombligo: initialData.bajo_ombligo || '',
                    cadera: initialData.cadera || '',
                    muslo_izq: initialData.muslo_izq || '',
                    muslo_der: initialData.muslo_der || '',
                    photo: initialData.photo || null
                });
            } else {
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    weight: '',
                    pecho: '',
                    brazo_izq: '',
                    brazo_der: '',
                    sobre_ombligo: '',
                    ombligo: '',
                    bajo_ombligo: '',
                    cadera: '',
                    muslo_izq: '',
                    muslo_der: '',
                    photo: null
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
        setFormData({
            date: new Date().toISOString().split('T')[0],
            weight: '',
            pecho: '',
            brazo_izq: '',
            brazo_der: '',
            sobre_ombligo: '',
            ombligo: '',
            bajo_ombligo: '',
            cadera: '',
            muslo_izq: '',
            muslo_der: '',
            photo: null
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-[var(--color-primary)] dark:text-primary-400">{initialData ? 'Editar Medición' : 'Nueva Medición'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Fecha y Peso */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Fecha</label>
                            <input
                                type="date"
                                required
                                className="form-input"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Peso (kg)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="form-input"
                                value={formData.weight}
                                onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Sección de Medidas con Guía Visual */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-[var(--color-secondary)] uppercase flex items-center gap-2">
                                📏 Medidas Corporales (cm)
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowGuide(!showGuide)}
                                className="btn btn-sm btn-ghost text-primary-600 flex items-center gap-1"
                            >
                                <Info size={16} />
                                {showGuide ? 'Ocultar guía' : 'Ver guía'}
                            </button>
                        </div>

                        {/* Imagen de Guía */}
                        {showGuide && (
                            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                <img
                                    src="/medidas.png"
                                    alt="Guía de medidas corporales"
                                    className="max-w-full h-auto mx-auto rounded-lg shadow-sm"
                                    style={{ maxHeight: '300px' }}
                                />
                                <p className="text-center text-xs text-slate-500 mt-2">
                                    Usa esta imagen como referencia para tomar las medidas correctamente
                                </p>
                            </div>
                        )}

                        {/* Campos de Medidas */}
                        <div className="p-4 space-y-4">
                            {/* Fila 1: Pecho */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold mr-2">1</span>
                                    Pecho
                                </label>
                                <input
                                    type="number"
                                    step="0.5"
                                    className="form-input"
                                    placeholder="cm"
                                    value={formData.pecho}
                                    onChange={e => setFormData({ ...formData, pecho: e.target.value })}
                                />
                            </div>

                            {/* Fila 2: Brazos */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold mr-2">2</span>
                                        Brazo Izquierdo
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="form-input"
                                        placeholder="cm"
                                        value={formData.brazo_izq}
                                        onChange={e => setFormData({ ...formData, brazo_izq: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold mr-2">3</span>
                                        Brazo Derecho
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="form-input"
                                        placeholder="cm"
                                        value={formData.brazo_der}
                                        onChange={e => setFormData({ ...formData, brazo_der: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Fila 3: Zona Abdominal */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold mr-2">4</span>
                                        3cm Sobre Ombligo
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="form-input"
                                        placeholder="cm"
                                        value={formData.sobre_ombligo}
                                        onChange={e => setFormData({ ...formData, sobre_ombligo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold mr-2">5</span>
                                        Ombligo
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="form-input"
                                        placeholder="cm"
                                        value={formData.ombligo}
                                        onChange={e => setFormData({ ...formData, ombligo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold mr-2">6</span>
                                        3cm Bajo Ombligo
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="form-input"
                                        placeholder="cm"
                                        value={formData.bajo_ombligo}
                                        onChange={e => setFormData({ ...formData, bajo_ombligo: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Fila 4: Cadera */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold mr-2">7</span>
                                    Cadera
                                </label>
                                <input
                                    type="number"
                                    step="0.5"
                                    className="form-input"
                                    placeholder="cm"
                                    value={formData.cadera}
                                    onChange={e => setFormData({ ...formData, cadera: e.target.value })}
                                />
                            </div>

                            {/* Fila 5: Muslos */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold mr-2">8</span>
                                        Muslo Izquierdo
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="form-input"
                                        placeholder="cm"
                                        value={formData.muslo_izq}
                                        onChange={e => setFormData({ ...formData, muslo_izq: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold mr-2">9</span>
                                        Muslo Derecho
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="form-input"
                                        placeholder="cm"
                                        value={formData.muslo_der}
                                        onChange={e => setFormData({ ...formData, muslo_der: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Foto de Progreso */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Foto de Progreso (Opcional)</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {formData.photo ? (
                                <div className="text-green-600 font-medium">¡Foto seleccionada!</div>
                            ) : (
                                <div className="flex flex-col items-center text-gray-400">
                                    <Upload size={24} className="mb-2" />
                                    <span className="text-sm">Click para subir foto</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
                        <button type="submit" className="btn btn-primary">{initialData ? 'Guardar Cambios' : 'Guardar Registro'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MeasurementModal;
