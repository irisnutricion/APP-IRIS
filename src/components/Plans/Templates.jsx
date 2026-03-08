import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, FileText, Pencil, Copy, Search, X, Filter, Archive, UtensilsCrossed } from 'lucide-react';
import ClosedPlanEditor from './ClosedPlanEditor';
import OpenPlanEditor from './OpenPlanEditor';

export default function Templates() {
    const { mealPlans = [], mealPlanItems = [], addMealPlan, updateMealPlan, deleteMealPlan, saveMealPlanItems, cloneMealPlan } = useData();
    const { showToast } = useToast();

    const [editingPlan, setEditingPlan] = useState(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // all | closed | open
    const [editingName, setEditingName] = useState(null);
    const [editNameValue, setEditNameValue] = useState('');

    const templates = useMemo(() => {
        let t = mealPlans.filter(p => p.is_template);
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            t = t.filter(p => p.name?.toLowerCase().includes(q));
        }
        if (typeFilter !== 'all') t = t.filter(p => p.type === typeFilter);
        return t.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [mealPlans, search, typeFilter]);

    const handleCreateTemplate = async (type) => {
        const plan = await addMealPlan({
            name: type === 'closed' ? 'Plantilla semanal' : 'Plantilla abierta',
            type,
            status: 'active',
            is_template: true,
            meals_per_day: 5,
            meal_names: ['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena'],
        });
        if (plan) {
            setEditingPlan(plan);
            showToast('Plantilla creada', 'success');
        }
    };

    const handleDuplicate = async (plan) => {
        const newPlan = await cloneMealPlan(plan.id, { is_template: true, name: `${plan.name} (copia)` });
        if (newPlan) showToast('Plantilla duplicada', 'success');
    };

    const handleDelete = async (plan) => {
        if (!window.confirm(`¿Eliminar la plantilla "${plan.name}"?`)) return;
        await deleteMealPlan(plan.id);
        showToast('Plantilla eliminada', 'success');
    };

    const handleSaveName = async (planId) => {
        if (editNameValue.trim()) {
            await updateMealPlan(planId, { name: editNameValue.trim() });
            showToast('Nombre actualizado', 'success');
        }
        setEditingName(null);
    };

    // If editing, show the plan editor
    if (editingPlan) {
        const planItems = mealPlanItems.filter(i => i.plan_id === editingPlan.id);
        const currentPlan = mealPlans.find(p => p.id === editingPlan.id) || editingPlan;

        const EditorComponent = currentPlan.type === 'open' ? OpenPlanEditor : ClosedPlanEditor;
        return (
            <EditorComponent
                key={currentPlan.id}
                plan={currentPlan}
                items={planItems}
                initialViewMode={currentPlan.type === 'open' ? 'meals' : 'grid'}
                onBack={() => setEditingPlan(null)}
                onSaveItems={(items) => saveMealPlanItems(currentPlan.id, items)}
                onUpdatePlan={(updates) => updateMealPlan(currentPlan.id, updates)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Plantillas de Planes</h1>
                    <p className="page-subtitle">Gestiona tus plantillas para crear planes rápidamente</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleCreateTemplate('closed')} className="btn btn-primary text-sm py-2">
                        <Plus size={16} /> Plan Cerrado
                    </button>
                    <button onClick={() => handleCreateTemplate('open')} className="btn btn-outline text-sm py-2">
                        <Plus size={16} /> Plan Abierto
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar plantillas..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    {[{ key: 'all', label: 'Todos' }, { key: 'closed', label: 'Cerrados' }, { key: 'open', label: 'Abiertos' }].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setTypeFilter(f.key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === f.key
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Templates Grid */}
            {templates.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <UtensilsCrossed className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">No hay plantillas aún</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Crea tu primera plantilla para empezar</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(plan => {
                        const itemCount = mealPlanItems.filter(i => i.plan_id === plan.id).length;
                        const isEditing = editingName === plan.id;
                        return (
                            <div key={plan.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-all group flex flex-col">
                                {/* Header */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`p-2.5 rounded-xl ${plan.type === 'closed' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                                        <FileText className={`w-5 h-5 ${plan.type === 'closed' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                            <div className="flex gap-1">
                                                <input
                                                    autoFocus
                                                    value={editNameValue}
                                                    onChange={e => setEditNameValue(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveName(plan.id)}
                                                    className="flex-1 text-sm font-semibold px-2 py-1 border border-primary-300 rounded-lg bg-transparent dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                                                />
                                                <button onClick={() => handleSaveName(plan.id)} className="p-1 text-green-500 hover:text-green-600">✓</button>
                                                <button onClick={() => setEditingName(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                                            </div>
                                        ) : (
                                            <h3 className="font-semibold text-slate-800 dark:text-white truncate">{plan.name}</h3>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${plan.type === 'closed' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                                                {plan.type === 'closed' ? 'Cerrado' : 'Abierto'}
                                            </span>
                                            <span className="text-xs text-slate-400">{itemCount} items</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Template note */}
                                {plan.template_note && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{plan.template_note}</p>
                                )}

                                <div className="text-xs text-slate-400 mb-3">
                                    Creada: {new Date(plan.created_at).toLocaleDateString('es-ES')}
                                </div>

                                {/* Actions */}
                                <div className="mt-auto flex items-center gap-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={() => setEditingPlan(plan)} className="flex-1 btn btn-outline text-xs py-1.5 gap-1">
                                        <Pencil size={12} /> Editar
                                    </button>
                                    <button onClick={() => { setEditingName(plan.id); setEditNameValue(plan.name || ''); }} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg dark:hover:bg-amber-900/20" title="Renombrar">
                                        <Pencil size={14} />
                                    </button>
                                    <button onClick={() => handleDuplicate(plan)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg dark:hover:bg-teal-900/20" title="Duplicar">
                                        <Copy size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(plan)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20" title="Eliminar">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
