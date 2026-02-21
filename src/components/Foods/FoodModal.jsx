import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const ALL_TAGS = [
    { id: 'vegano', label: 'Vegano' },
    { id: 'vegetariano', label: 'Vegetariano' },
    { id: 'sin_gluten', label: 'Sin gluten' },
    { id: 'sin_lacteos', label: 'Sin lácteos' },
    { id: 'sin_huevo', label: 'Sin huevo' },
    { id: 'sin_frutos_secos', label: 'Sin frutos secos' },
    { id: 'bajo_fodmap', label: 'Bajo en FODMAP' },
    { id: 'sin_legumbres', label: 'Sin legumbres' },
    { id: 'producto_comercial', label: 'Producto comercial' },
];

export { ALL_TAGS };

export default function FoodModal({ isOpen, onClose, onSave, initialData }) {
    const [form, setForm] = useState({
        name: '',
        kcal_per_100g: '',
        carbs_per_100g: '',
        protein_per_100g: '',
        fat_per_100g: '',
        tags: [],
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || '',
                kcal_per_100g: initialData.kcal_per_100g ?? '',
                carbs_per_100g: initialData.carbs_per_100g ?? '',
                protein_per_100g: initialData.protein_per_100g ?? '',
                fat_per_100g: initialData.fat_per_100g ?? '',
                tags: initialData.tags || [],
            });
        } else {
            setForm({ name: '', kcal_per_100g: '', carbs_per_100g: '', protein_per_100g: '', fat_per_100g: '', tags: [] });
        }
    }, [initialData, isOpen]);

    const toggleTag = (tagId) => {
        setForm(prev => ({
            ...prev,
            tags: prev.tags.includes(tagId) ? prev.tags.filter(t => t !== tagId) : [...prev.tags, tagId],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            await onSave({
                name: form.name.trim(),
                kcal_per_100g: parseFloat(form.kcal_per_100g) || 0,
                carbs_per_100g: parseFloat(form.carbs_per_100g) || 0,
                protein_per_100g: parseFloat(form.protein_per_100g) || 0,
                fat_per_100g: parseFloat(form.fat_per_100g) || 0,
                tags: form.tags,
            });
            onClose();
        } catch (err) {
            console.error('Error saving food:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                        {initialData ? 'Editar alimento' : 'Nuevo alimento'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                            placeholder="Ej: Pechuga de pollo"
                            autoFocus
                        />
                    </div>

                    {/* Macros */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Valores nutricionales (por 100g)</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { key: 'kcal_per_100g', label: 'Kcal', color: 'text-orange-600' },
                                { key: 'carbs_per_100g', label: 'HC (g)', color: 'text-amber-600' },
                                { key: 'protein_per_100g', label: 'Proteínas (g)', color: 'text-blue-600' },
                                { key: 'fat_per_100g', label: 'Grasas (g)', color: 'text-rose-600' },
                            ].map(({ key, label, color }) => (
                                <div key={key}>
                                    <label className={`block text-xs font-medium mb-1 ${color}`}>{label}</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={form[key]}
                                        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white text-sm"
                                        placeholder="0"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Etiquetas</label>
                        <div className="flex flex-wrap gap-2">
                            {ALL_TAGS.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.tags.includes(tag.id)
                                        ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-700'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600'
                                        }`}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving || !form.name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? 'Guardando...' : (initialData ? 'Guardar cambios' : 'Crear alimento')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
