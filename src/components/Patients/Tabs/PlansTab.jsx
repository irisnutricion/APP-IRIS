import { useState, useMemo } from 'react';
import { Plus, UtensilsCrossed, Archive, Trash2, Copy, FileText, Pencil } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import ClosedPlanEditor from '../../Plans/ClosedPlanEditor';
import OpenPlanEditor from '../../Plans/OpenPlanEditor';

export default function PlansTab({ patient }) {
    const { mealPlans = [], mealPlanItems = [], addMealPlan, updateMealPlan, deleteMealPlan, saveMealPlanItems, cloneMealPlan } = useData();
    const [editingPlan, setEditingPlan] = useState(null);
    const [showNewPlanMenu, setShowNewPlanMenu] = useState(false);

    const patientPlans = useMemo(() => {
        return mealPlans.filter(p => p.patient_id === patient.id && !p.is_template);
    }, [mealPlans, patient.id]);

    const templates = useMemo(() => {
        return mealPlans.filter(p => p.is_template);
    }, [mealPlans]);

    const handleNewPlan = async (type) => {
        const plan = await addMealPlan({
            patient_id: patient.id,
            name: type === 'closed' ? 'Plan semanal' : 'Plan abierto',
            type,
            status: 'active',
            meals_per_day: 5,
            meal_names: ['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena'],
        });
        if (plan) setEditingPlan(plan);
        setShowNewPlanMenu(false);
    };

    const handleFromTemplate = async (templateId) => {
        const newPlan = await cloneMealPlan(templateId, { patient_id: patient.id });
        if (newPlan) setEditingPlan(newPlan);
        setShowNewPlanMenu(false);
    };

    const handleSaveAsTemplate = async (planId) => {
        const plan = mealPlans.find(p => p.id === planId);
        if (!plan) return;
        const name = prompt('Nombre de la plantilla:', plan.name + ' (plantilla)');
        if (!name) return;
        await cloneMealPlan(planId, { is_template: true, patient_id: null, name, template_note: `Creada desde plan de ${patient.name}` });
    };

    const handleDelete = (plan) => {
        if (window.confirm(`¿Eliminar el plan "${plan.name}"?`)) {
            deleteMealPlan(plan.id);
            if (editingPlan?.id === plan.id) setEditingPlan(null);
        }
    };

    const handleArchive = async (plan) => {
        await updateMealPlan(plan.id, { status: plan.status === 'active' ? 'archived' : 'active' });
    };

    // If editing a plan, show the editor
    if (editingPlan) {
        const planItems = mealPlanItems.filter(i => i.plan_id === editingPlan.id);
        const currentPlan = mealPlans.find(p => p.id === editingPlan.id) || editingPlan;

        if (currentPlan.type === 'open') {
            return (
                <OpenPlanEditor
                    plan={currentPlan}
                    items={planItems}
                    initialViewMode={editingPlan.viewMode || 'meals'}
                    onBack={() => setEditingPlan(null)}
                    onSaveItems={(items) => saveMealPlanItems(currentPlan.id, items)}
                    onUpdatePlan={(updates) => updateMealPlan(currentPlan.id, updates)}
                    onSaveAsTemplate={() => handleSaveAsTemplate(currentPlan.id)}
                />
            );
        }

        return (
            <ClosedPlanEditor
                plan={currentPlan}
                items={planItems}
                initialViewMode={editingPlan.viewMode || 'grid'}
                onBack={() => setEditingPlan(null)}
                onSaveItems={(items) => saveMealPlanItems(currentPlan.id, items)}
                onUpdatePlan={(updates) => updateMealPlan(currentPlan.id, updates)}
                onSaveAsTemplate={() => handleSaveAsTemplate(currentPlan.id)}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Planes nutricionales</h2>
                    <span className="text-sm text-slate-400">({patientPlans.length})</span>
                </div>
                <div className="relative">
                    <button onClick={() => setShowNewPlanMenu(!showNewPlanMenu)} className="btn btn-primary text-sm py-2">
                        <Plus size={16} /> Crear plan
                    </button>
                    {showNewPlanMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden">
                            <button onClick={() => handleNewPlan('closed')} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">
                                <div className="font-medium">Plan cerrado</div>
                                <div className="text-xs text-slate-400 mt-0.5">Menú semanal fijo</div>
                            </button>
                            <button onClick={() => handleNewPlan('open')} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">
                                <div className="font-medium">Plan abierto</div>
                                <div className="text-xs text-slate-400 mt-0.5">Opciones por tipo de comida</div>
                            </button>
                            {templates.length > 0 && (
                                <>
                                    <div className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800">
                                        Desde plantilla
                                    </div>
                                    {templates.map(t => (
                                        <button key={t.id} onClick={() => handleFromTemplate(t.id)} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300">
                                            <div className="font-medium">{t.name}</div>
                                            {t.template_note && <div className="text-xs text-slate-400 mt-0.5">{t.template_note}</div>}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Plan list */}
            {patientPlans.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-3 dark:text-slate-600" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Sin planes nutricionales</p>
                    <p className="text-sm text-slate-400 mt-1">Crea el primer plan para este cliente</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {patientPlans.map(plan => {
                        const itemCount = mealPlanItems.filter(i => i.plan_id === plan.id).length;
                        return (
                            <div key={plan.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => setEditingPlan(plan)}>
                                        <div className={`p-2 rounded-lg ${plan.type === 'closed' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                                            <FileText className={`w-4 h-4 ${plan.type === 'closed' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-slate-800 dark:text-white truncate">{plan.name}</h3>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                                <span className={`px-2 py-0.5 rounded-full font-medium ${plan.type === 'closed' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                                                    {plan.type === 'closed' ? 'Cerrado' : 'Abierto'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full font-medium ${plan.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    {plan.status === 'active' ? 'Activo' : 'Archivado'}
                                                </span>
                                                <span>{itemCount} items</span>
                                                <span>{new Date(plan.created_at).toLocaleDateString('es-ES')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingPlan(plan)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg dark:hover:bg-primary-900/20" title="Editar Menú">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => setEditingPlan({ ...plan, viewMode: 'indications' })} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/20" title="Ver Recomendaciones/Indicaciones">
                                            <FileText size={14} />
                                        </button>
                                        <button onClick={() => handleSaveAsTemplate(plan.id)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg dark:hover:bg-purple-900/20" title="Guardar como plantilla">
                                            <Copy size={14} />
                                        </button>
                                        <button onClick={() => handleArchive(plan)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg dark:hover:bg-amber-900/20" title={plan.status === 'active' ? 'Archivar' : 'Activar'}>
                                            <Archive size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(plan)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20" title="Eliminar">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
