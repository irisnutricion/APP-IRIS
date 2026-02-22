import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Save, Copy, Search, X, Plus, Trash2, Pencil, FileText, ChevronDown, List, Download, PieChart } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { calcSnapshotMacros, recipeToSnapshot } from './ClosedPlanEditor';
import InlineRecipeEditor from './InlineRecipeEditor';
import { generatePlanPdf } from '../../utils/planPdfGenerator';

export default function OpenPlanEditor({ plan, items, onBack, onSaveItems, onUpdatePlan, onSaveAsTemplate, initialViewMode = 'meals' }) {
    const { recipes = [], addRecipe, indicationTemplates = [], addIndicationTemplate, patients = [], userProfile = null } = useData();
    const [planName, setPlanName] = useState(plan.name);
    const [planIndications, setPlanIndications] = useState(plan.indications || '');
    const [mealNames, setMealNames] = useState(plan.meal_names || ['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena']);
    const [sections, setSections] = useState({});
    const [saving, setSaving] = useState(false);
    const [activeSearch, setActiveSearch] = useState(null);
    const [recipeSearch, setRecipeSearch] = useState('');
    const [collapsedOptions, setCollapsedOptions] = useState(new Set()); // Set of `${mealName}_${idx}`
    const [viewMode, setViewMode] = useState(initialViewMode);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [activeMealTab, setActiveMealTab] = useState('all'); // 'all' or specific meal name

    useEffect(() => {
        const s = {};
        mealNames.forEach(meal => { s[meal] = []; });
        items.forEach(item => {
            if (!s[item.meal_name]) s[item.meal_name] = [];
            s[item.meal_name].push({
                local_id: crypto.randomUUID(),
                recipe_id: item.recipe_id,
                free_text: item.free_text,
                recipes: item.recipes,
                custom_recipe_data: item.custom_recipe_data || null,
            });
        });
        setSections(s);
    }, [items, mealNames]);

    const recipeResults = useMemo(() => {
        if (!recipeSearch.trim()) return recipes.filter(r => r.is_active).slice(0, 10);
        const q = recipeSearch.toLowerCase();
        return recipes.filter(r => r.is_active && r.name.toLowerCase().includes(q)).slice(0, 10);
    }, [recipeSearch, recipes]);

    const addOption = (mealName, recipe) => {
        const snapshot = recipeToSnapshot(recipe);
        setSections(prev => ({
            ...prev,
            [mealName]: [...(prev[mealName] || []), { local_id: crypto.randomUUID(), recipe_id: recipe.id, free_text: null, recipes: recipe, custom_recipe_data: snapshot }],
        }));
        setActiveSearch(null);
        setRecipeSearch('');
    };

    const addTextOption = (mealName, text) => {
        if (!text.trim()) return;
        setSections(prev => ({
            ...prev,
            [mealName]: [...(prev[mealName] || []), { local_id: crypto.randomUUID(), recipe_id: null, free_text: text.trim(), recipes: null, custom_recipe_data: null }],
        }));
        setActiveSearch(null);
        setRecipeSearch('');
    };

    const createInlineOption = (mealName) => {
        const newIdx = (sections[mealName] || []).length;
        setSections(prev => ({
            ...prev,
            [mealName]: [...(prev[mealName] || []), { local_id: crypto.randomUUID(), recipe_id: null, free_text: null, recipes: null, custom_recipe_data: { name: '', source_recipe_id: null, ingredients: [] } }],
        }));
        // Note: New items aren't added to collapsedOptions, so they render automatically expanded.
        setActiveSearch(null);
    };

    const toggleEditor = (mealName, idx) => {
        setCollapsedOptions(prev => {
            const next = new Set(prev);
            const key = `${mealName}_${idx}`;
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const removeOption = (mealName, idx) => {
        setSections(prev => ({ ...prev, [mealName]: prev[mealName].filter((_, i) => i !== idx) }));
    };

    const duplicateOption = (mealName, opt, idx) => {
        const newOpt = { ...opt, local_id: crypto.randomUUID() };
        if (opt.custom_recipe_data) {
            newOpt.custom_recipe_data = JSON.parse(JSON.stringify(opt.custom_recipe_data));
        }
        setSections(prev => {
            const list = prev[mealName] || [];
            const newList = [...list];
            newList.splice(idx + 1, 0, newOpt);
            return {
                ...prev,
                [mealName]: newList,
            };
        });
    };

    // Get display name
    const getOptName = (opt) => {
        if (opt?.custom_recipe_data?.name) return opt.custom_recipe_data.name;
        if (opt?.recipes?.name) return opt.recipes.name;
        return opt?.free_text || '—';
    };

    // Get macros
    const getOptMacros = (opt) => {
        if (opt?.custom_recipe_data) return calcSnapshotMacros(opt.custom_recipe_data);
        return null;
    };

    // Average macros for a meal section
    const getMealAvgMacros = (mealName) => {
        const opts = (sections[mealName] || []).filter(o => o.custom_recipe_data || o.recipes);
        if (opts.length === 0) return null;
        const totals = opts.reduce((acc, o) => {
            const m = getOptMacros(o) || { kcal: 0, carbs: 0, protein: 0, fat: 0 };
            return { kcal: acc.kcal + m.kcal, carbs: acc.carbs + m.carbs, protein: acc.protein + m.protein, fat: acc.fat + m.fat };
        }, { kcal: 0, carbs: 0, protein: 0, fat: 0 });
        const n = opts.length;
        return { kcal: totals.kcal / n, carbs: totals.carbs / n, protein: totals.protein / n, fat: totals.fat / n };
    };

    // Calculate total daily average (sum of averages of each meal)
    const dailyAvgMacros = useMemo(() => {
        const totals = { kcal: 0, carbs: 0, protein: 0, fat: 0 };
        let hasData = false;
        mealNames.forEach(meal => {
            const avg = getMealAvgMacros(meal);
            if (avg) {
                hasData = true;
                totals.kcal += avg.kcal;
                totals.carbs += avg.carbs;
                totals.protein += avg.protein;
                totals.fat += avg.fat;
            }
        });
        return hasData ? totals : null;
    }, [sections, mealNames]);

    // Inline editor handlers
    const handleInlineAccept = async (mealName, idx, snapshot) => {
        const newSections = {
            ...sections,
            [mealName]: sections[mealName].map((opt, i) => i === idx ? { ...opt, custom_recipe_data: snapshot } : opt),
        };
        setSections(newSections);
        await performSave(newSections);
    };

    const handleInlineSaveAsRecipe = async (mealName, idx, snapshot) => {
        await addRecipe({
            name: snapshot.name,
            is_active: true,
            tags: [],
        }, snapshot.ingredients.map(ing => ({
            food_id: ing.food_id,
            quantity_grams: ing.quantity_grams,
        })));
        await handleInlineAccept(mealName, idx, snapshot);
    };

    const performSave = async (currentSections) => {
        setSaving(true);
        try {
            if (planName !== plan.name || JSON.stringify(mealNames) !== JSON.stringify(plan.meal_names) || planIndications !== (plan.indications || '')) {
                await onUpdatePlan({ name: planName, meal_names: mealNames, meals_per_day: mealNames.length, indications: planIndications });
            }
            const newItems = [];
            mealNames.forEach(meal => {
                (currentSections[meal] || []).forEach(opt => {
                    newItems.push({
                        meal_name: meal,
                        day_of_week: null,
                        recipe_id: opt.recipe_id || null,
                        free_text: opt.free_text || null,
                        custom_recipe_data: opt.custom_recipe_data || null,
                    });
                });
            });
            await onSaveItems(newItems);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => performSave(sections);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl dark:hover:bg-slate-800">
                        <ArrowLeft size={20} />
                    </button>
                    <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} className="text-xl font-bold text-slate-800 dark:text-white bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-primary-500 outline-none px-1" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hidden sm:flex">
                        {[
                            { mode: 'meals', icon: List, label: 'Comidas' },
                            { mode: 'summary', icon: PieChart, label: 'Resumen' },
                            { mode: 'indications', icon: FileText, label: 'Indicaciones' },
                        ].map(({ mode, icon: Icon, label }) => (
                            <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${viewMode === mode ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                                <Icon size={14} /> {label}
                            </button>
                        ))}
                    </div>
                    <button onClick={onSaveAsTemplate} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg dark:hover:bg-purple-900/20" title="Guardar como plantilla">
                        <Copy size={18} />
                    </button>
                    <button
                        onClick={() => {
                            const patient = patients.find(p => p.id === plan.patient_id);
                            generatePlanPdf(plan, items, userProfile, patient);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20"
                        title="Exportar PDF"
                    >
                        <Download size={18} />
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm py-2">
                        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>

            {/* Meal sections */}
            {viewMode === 'meals' && (
                <div className="space-y-6">
                    {/* Sticky Tabs Navigation */}
                    <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-3 -mx-2 px-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveMealTab('all')}
                            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeMealTab === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                        >
                            Ver todas
                        </button>
                        {mealNames.map(meal => (
                            <button
                                key={meal}
                                onClick={() => setActiveMealTab(meal)}
                                className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeMealTab === meal ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                            >
                                {meal}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {(activeMealTab === 'all' ? mealNames : [activeMealTab]).map(meal => {
                            if (!mealNames.includes(meal)) return null; // Safety check
                            const opts = sections[meal] || [];
                            const avgMacros = getMealAvgMacros(meal);
                            return (
                                <div key={meal} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200">{meal}</h3>
                                        <div className="flex items-center gap-4">
                                            {avgMacros && (
                                                <div className="flex gap-3 text-xs font-semibold">
                                                    <span className="text-orange-600">∅ {Math.round(avgMacros.kcal)} kcal</span>
                                                    <span className="text-amber-600">{avgMacros.carbs.toFixed(1)}g HC</span>
                                                    <span className="text-blue-600">{avgMacros.protein.toFixed(1)}g P</span>
                                                    <span className="text-rose-600">{avgMacros.fat.toFixed(1)}g G</span>
                                                </div>
                                            )}
                                            <span className="text-xs text-slate-400">{opts.length} opciones</span>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        {opts.length === 0 && activeSearch !== meal && (
                                            <p className="text-sm text-slate-400 text-center py-4">Sin opciones. Añade recetas o texto libre.</p>
                                        )}

                                        <div className="space-y-2">
                                            {opts.map((opt, idx) => {
                                                const macros = getOptMacros(opt);
                                                const isExpanded = !collapsedOptions.has(`${meal}_${idx}`);
                                                return (
                                                    <div key={opt.local_id || idx} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg group transition-colors">
                                                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => (opt.custom_recipe_data || opt.recipes) && toggleEditor(meal, idx)}>
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-6">{idx + 1}</span>
                                                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{getOptName(opt)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {macros && (
                                                                    <div className="hidden md:flex gap-2 text-xs font-medium">
                                                                        <span className="text-orange-500">{Math.round(macros.kcal)}</span>
                                                                        <span className="text-amber-500">{macros.carbs.toFixed(1)}g</span>
                                                                        <span className="text-blue-500">{macros.protein.toFixed(1)}g</span>
                                                                        <span className="text-rose-500">{macros.fat.toFixed(1)}g</span>
                                                                    </div>
                                                                )}
                                                                <button onClick={(e) => { e.stopPropagation(); (opt.custom_recipe_data || opt.recipes) && toggleEditor(meal, idx); }} className="p-1 text-slate-300 hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); duplicateOption(meal, opt, idx); }} className="p-1 text-slate-300 hover:text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Duplicar opción">
                                                                    <Copy size={14} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); removeOption(meal, idx); }} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar opción">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {isExpanded && (opt.custom_recipe_data || opt.recipes) && (
                                                            <div className="px-3 pb-3">
                                                                <InlineRecipeEditor
                                                                    snapshot={opt.custom_recipe_data || recipeToSnapshot(opt.recipes) || null}
                                                                    onAccept={(snapshot) => handleInlineAccept(meal, idx, snapshot)}
                                                                    onSaveAsRecipe={(snapshot) => handleInlineSaveAsRecipe(meal, idx, snapshot)}
                                                                    onClose={() => toggleEditor(meal, idx)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Add option */}
                                        {activeSearch === meal ? (
                                            <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                <div className="p-2">
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                        <input type="text" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} placeholder="Buscar receta..." className="w-full pl-7 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" autoFocus />
                                                        <button onClick={() => { setActiveSearch(null); setRecipeSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                                    {recipeResults.map(r => (
                                                        <button key={r.id} onClick={() => addOption(meal, r)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300">
                                                            {r.name}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="border-t border-slate-200 dark:border-slate-700 p-2">
                                                    <input type="text" placeholder="O escribe texto libre..." className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" onKeyDown={e => { if (e.key === 'Enter') { addTextOption(meal, e.target.value); e.target.value = ''; } }} />
                                                </div>
                                                <div className="border-t border-slate-200 dark:border-slate-700 p-1 flex">
                                                    <button onClick={() => createInlineOption(meal)} className="flex-1 text-center py-1 text-xs text-primary-500 hover:text-primary-700 font-medium">
                                                        + Crear receta nueva
                                                    </button>
                                                    <button onClick={() => { setActiveSearch(null); setRecipeSearch(''); }} className="flex-1 text-center py-1 text-xs text-slate-400 hover:text-slate-600">
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setActiveSearch(meal); setRecipeSearch(''); }} className="mt-3 w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-400 hover:border-primary-300 hover:text-primary-500 transition-all flex items-center justify-center gap-1">
                                                <Plus size={14} /> Añadir opción
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Summary View */}
            {viewMode === 'summary' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <PieChart className="text-primary-500" />
                                Resumen de Opciones y Macros
                            </h3>
                            {dailyAvgMacros && (
                                <div className="text-right">
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 uppercase">Media Diaria Estimada</span>
                                    <div className="flex gap-3 text-sm font-bold bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="text-orange-600">{Math.round(dailyAvgMacros.kcal)} kcal</span>
                                        <span className="text-amber-600">{dailyAvgMacros.carbs.toFixed(1)}g HC</span>
                                        <span className="text-blue-600">{dailyAvgMacros.protein.toFixed(1)}g P</span>
                                        <span className="text-rose-600">{dailyAvgMacros.fat.toFixed(1)}g G</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {mealNames.map(meal => {
                            const opts = sections[meal] || [];
                            const avgMacros = getMealAvgMacros(meal);
                            if (opts.length === 0) return null;
                            return (
                                <div key={meal} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mt-4">
                                    <div className="bg-slate-50/50 dark:bg-slate-800/30 p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{meal}</span>
                                        {avgMacros && (
                                            <div className="flex gap-3 text-xs font-bold">
                                                <span className="text-orange-600">Media: {Math.round(avgMacros.kcal)} kcal</span>
                                                <span className="text-amber-600">{avgMacros.carbs.toFixed(1)}g HC</span>
                                                <span className="text-blue-600">{avgMacros.protein.toFixed(1)}g P</span>
                                                <span className="text-rose-600">{avgMacros.fat.toFixed(1)}g G</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {opts.map((opt, idx) => {
                                            const macros = getOptMacros(opt);
                                            return (
                                                <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                        {idx + 1}. {getOptName(opt)}
                                                    </span>
                                                    {macros && (
                                                        <div className="flex gap-2 text-[10px] text-slate-500">
                                                            <span>{Math.round(macros.kcal)} kcal</span>
                                                            <span>| {macros.carbs.toFixed(1)}g HC</span>
                                                            <span>| {macros.protein.toFixed(1)}g P</span>
                                                            <span>| {macros.fat.toFixed(1)}g G</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Indications View */}
            {viewMode === 'indications' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <FileText className="text-primary-500" />
                            Indicaciones del Plan
                        </h3>
                        <div className="flex items-center gap-2 relative">
                            {indicationTemplates.length > 0 && (
                                <div className="relative">
                                    <button onClick={() => setShowTemplateMenu(!showTemplateMenu)} className="btn btn-outline py-1.5 px-3 text-sm flex items-center gap-2">
                                        Cargar plantilla <ChevronDown size={14} />
                                    </button>
                                    {showTemplateMenu && (
                                        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden max-h-60 overflow-y-auto">
                                            {indicationTemplates.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        if (!planIndications || window.confirm('¿Sobrescribir las indicaciones actuales con la plantilla?')) {
                                                            setPlanIndications(t.content);
                                                        }
                                                        setShowTemplateMenu(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300"
                                                >
                                                    {t.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={async () => {
                                    if (!planIndications.trim()) return alert('Las indicaciones están vacías.');
                                    const name = prompt('Nombre para esta plantilla de indicaciones:');
                                    if (name) {
                                        await addIndicationTemplate({ name, content: planIndications });
                                        alert('Plantilla guardada correctamente.');
                                    }
                                }}
                                className="btn btn-outline py-1.5 px-3 text-sm flex items-center gap-2"
                            >
                                <Save size={14} /> Guardar como plantilla
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={planIndications}
                        onChange={e => setPlanIndications(e.target.value)}
                        placeholder="Escribe aquí las pautas, preparación, reemplazos o cualquier indicación adicional para este plan..."
                        className="w-full h-96 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-y text-sm text-slate-700 dark:text-slate-300"
                    />
                </div>
            )}
        </div>
    );
}
