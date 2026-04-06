import { useState, useMemo, useEffect, useRef } from 'react';
import useUndo from '../../hooks/useUndo';
import { ArrowLeft, Save, Copy, Search, X, Plus, Trash2, Pencil, FileText, ChevronDown, List, Download, PieChart, GripVertical, Loader2, CheckCircle2, CalendarDays, ClipboardCopy, Calculator, Pin } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { calcSnapshotMacros, recipeToSnapshot, checkRecipeIsSaved } from './ClosedPlanEditor';
import InlineRecipeEditor from './InlineRecipeEditor';
import { generatePlanPdf } from '../../utils/planPdfGenerator';
import { generateSchemaPdf } from '../../utils/schemaPdfGenerator';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../supabaseClient';
import CalorieCalculator from './CalorieCalculator';

function SortableOption({ id, children }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-grab active:cursor-grabbing group transition-colors">
            {children}
        </div>
    );
}

function DroppableContainer({ id, children, className }) {
    const { setNodeRef } = useDroppable({ id });
    return <div ref={setNodeRef} className={className}>{children}</div>;
}

export default function OpenPlanEditor({ plan, items, onBack, onSaveItems, onUpdatePlan, onSaveAsTemplate, initialViewMode = 'meals' }) {
    const { recipes = [], addRecipe, updateRecipe, indicationTemplates = [], addIndicationTemplate, patients = [], userProfile = null, nutritionists = [], updatePatient } = useData();
    const { showToast } = useToast();
    const [planName, setPlanName] = useState(plan.name);
    const [planIndications, setPlanIndications] = useState(plan.indications || '');
    const [mealNames, setMealNames] = useState(plan.meal_names || ['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena']);
    const [sections, setSections, undoSections, redoSections, canUndoSections, canRedoSections] = useUndo({});
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);
    const [activeSearch, setActiveSearch] = useState(null);
    const [recipeSearch, setRecipeSearch] = useState('');
    const [collapsedOptions, setCollapsedOptions] = useState(new Set()); // Set of `${mealName}_${idx}`
    const [viewMode, setViewMode] = useState(initialViewMode);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [activeMealTab, setActiveMealTab] = useState('all'); // 'all' or specific meal name
    const [calculatorData, setCalculatorData] = useState(() => plan?.calculator_data || null);

    const scrollPositions = useRef({});
    const handleMealTabClick = (tab) => {
        scrollPositions.current[activeMealTab] = window.scrollY;
        setActiveMealTab(tab);
        setTimeout(() => {
            window.scrollTo({ top: scrollPositions.current[tab] || 0, behavior: 'instant' });
        }, 0);
    };

    // Auto-save debounce refs
    const debounceTimer = useRef(null);
    const isInitialLoad = useRef(true);
    const sectionsRef = useRef(sections);
    sectionsRef.current = sections;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const findContainer = (id) => {
        if (mealNames.includes(id)) return id;
        for (const meal of mealNames) {
            if ((sections[meal] || []).some(opt => opt.local_id === id)) return meal;
        }
        return null;
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;
        
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over.id);
        
        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }
        
        setSections((prev) => {
            const activeItems = prev[activeContainer] || [];
            const overItems = prev[overContainer] || [];
            const activeIndex = activeItems.findIndex(i => i.local_id === active.id);
            const overIndex = mealNames.includes(over.id) ? overItems.length : overItems.findIndex(i => i.local_id === over.id);
            
            let newIndex;
            if (mealNames.includes(over.id)) {
                newIndex = overItems.length;
            } else {
                const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
            }
            
            return {
                ...prev,
                [activeContainer]: prev[activeContainer].filter(item => item.local_id !== active.id),
                [overContainer]: [
                    ...prev[overContainer].slice(0, newIndex),
                    activeItems[activeIndex],
                    ...prev[overContainer].slice(newIndex)
                ]
            };
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;
        
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over.id);
        
        if (!activeContainer || !overContainer || activeContainer !== overContainer) {
            return;
        }
        
        const activeIndex = (sections[activeContainer] || []).findIndex(i => i.local_id === active.id);
        const overIndex = (sections[overContainer] || []).findIndex(i => i.local_id === over.id);
        
        if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
            setSections((prev) => ({
                ...prev,
                [overContainer]: arrayMove(prev[overContainer], activeIndex, overIndex)
            }));
        }
    };

    useEffect(() => {
        if (!isInitialLoad.current) return;
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
        // Mark initial load as done after first render
        setTimeout(() => { isInitialLoad.current = false; }, 500);
    }, [items, mealNames]);

    const recipeResults = useMemo(() => {
        if (!recipeSearch.trim()) return recipes.filter(r => r.is_active);
        const q = recipeSearch.toLowerCase();
        return recipes.filter(r => r.is_active && r.name.toLowerCase().includes(q));
    }, [recipeSearch, recipes]);

    const [pinnedMacros, setPinnedMacros] = useState({});
    const togglePin = (id, macros) => {
        if (!macros && !pinnedMacros[id]) return;
        setPinnedMacros(prev => {
            const next = { ...prev };
            if (next[id]) delete next[id];
            else if (macros) next[id] = macros;
            return next;
        });
    };

    const [copyModalInfo, setCopyModalInfo] = useState(null); // { opt, targetMeal: 'all' }

    // Unified advanced copy function for OpenPlanEditor
    const handleAdvancedCopy = () => {
        if (!copyModalInfo) return;
        const { opt, targetMeal } = copyModalInfo;
        if (!targetMeal) { showToast('Por favor, selecciona una comida de destino', 'warning'); return; }

        const mealsToApply = targetMeal === 'all' ? mealNames : [targetMeal];

        setSections(prev => {
            const next = { ...prev };
            mealsToApply.forEach(mName => {
                const newOpt = { ...opt, local_id: crypto.randomUUID() };
                if (opt.custom_recipe_data) {
                    newOpt.custom_recipe_data = JSON.parse(JSON.stringify(opt.custom_recipe_data));
                }
                next[mName] = [...(next[mName] || []), newOpt];
            });
            return next;
        });

        setCopyModalInfo(null);
        showToast('Receta copiada correctamente');
    };

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
    const handleInlineAccept = (mealName, idx, snapshot) => {
        setSections(prev => ({
            ...prev,
            [mealName]: prev[mealName].map((opt, i) => i === idx ? { ...opt, custom_recipe_data: snapshot } : opt),
        }));
    };

    const handleInlineSaveAsRecipe = async (mealName, idx, snapshot) => {
        const newRec = await addRecipe({
            name: snapshot.name,
            description: snapshot.description,
            is_active: true,
            tags: [],
        }, snapshot.ingredients.map(ing => ({
            food_id: ing.food_id,
            quantity_grams: ing.quantity_grams,
        })));
        if (newRec) {
            snapshot.source_recipe_id = newRec.id;
        }
        handleInlineAccept(mealName, idx, snapshot);
    };

    const handleInlineUpdateRecipe = async (mealName, idx, snapshot) => {
        if (!snapshot.source_recipe_id) return;
        await updateRecipe(snapshot.source_recipe_id, {
            name: snapshot.name,
            description: snapshot.description,
            tags: [],
        }, snapshot.ingredients.map(ing => ({
            food_id: ing.food_id,
            quantity_grams: ing.quantity_grams,
        })));
        handleInlineAccept(mealName, idx, snapshot);
    };

    const performSave = async (currentSections) => {
        setSaving(true);
        try {
            const planUpdate = {};
            if (planName !== plan.name || JSON.stringify(mealNames) !== JSON.stringify(plan.meal_names) || planIndications !== (plan.indications || '')) {
                planUpdate.name = planName;
                planUpdate.meal_names = mealNames;
                planUpdate.meals_per_day = mealNames.length;
                planUpdate.indications = planIndications;
            }
            planUpdate.calculator_data = calculatorData;
            
            if (Object.keys(planUpdate).length > 0) {
                await onUpdatePlan(planUpdate);
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
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } finally {
            setSaving(false);
        }
    };

    // Auto-save with debounce
    useEffect(() => {
        if (isInitialLoad.current) return;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            performSave(sectionsRef.current);
            debounceTimer.current = null;
        }, 1500);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [sections, planName, mealNames, planIndications, calculatorData]);

    const flushSaveRef = useRef();
    flushSaveRef.current = () => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            performSave(sectionsRef.current);
            debounceTimer.current = null;
        }
    };

    // Auto-save on unmount or when user switches browser tab
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden && flushSaveRef.current) flushSaveRef.current();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            if (flushSaveRef.current) flushSaveRef.current();
        };
    }, []);

    // Force save on exit if there are unsaved changes pending
    const handleClose = async () => {
        flushSaveRef.current();
        onBack();
    };

    // Click outside listener for search popups
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (activeSearch && !e.target.closest('.search-popup-container') && !e.target.closest('.add-button-container')) {
                setActiveSearch(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeSearch]);

    const handleSharePortal = async () => {
        const patient = patients.find(p => p.id === plan.patient_id);
        if (!patient) {
            showToast('Paciente no encontrado', 'error');
            return;
        }
        try {
            let currentToken = patient.share_token;
            if (!currentToken || /^[a-f0-9]{20}$/i.test(currentToken) || /-[a-f0-9]{4}$/i.test(currentToken)) {
                const base = `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-');

                let newToken = base || 'paciente';
                const { error } = await supabase.from('patients').update({ share_token: newToken }).eq('id', patient.id);

                if (error) {
                    const shortId = crypto.randomUUID().split('-')[0].slice(0, 4);
                    newToken = newToken === 'paciente' ? `paciente-${shortId}` : `${base}-${shortId}`;
                    await supabase.from('patients').update({ share_token: newToken }).eq('id', patient.id);
                }

                if (updatePatient) {
                    await updatePatient(patient.id, { share_token: newToken });
                }
                currentToken = newToken;
            }
            const url = `${window.location.origin}/portal/${currentToken}`;
            await navigator.clipboard.writeText(url);
            showToast('Enlace del portal copiado al portapapeles', 'success');
        } catch (err) {
            console.error('Error sharing:', err);
            showToast('Error al generar el enlace', 'error');
        }
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            const tag = e.target.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;
            e.preventDefault();
            if (e.shiftKey) {
                if (canRedoSections) redoSections();
            } else {
                if (canUndoSections) undoSections();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            const tag = e.target.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;
            e.preventDefault();
            if (canRedoSections) redoSections();
        }
    };

    return (
        <div
            className="space-y-4 focus:outline-none"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            onClick={(e) => {
                if (e.target === e.currentTarget || !e.currentTarget.contains(document.activeElement)) {
                    e.currentTarget.focus();
                }
            }}
        >
            {/* Unified Sticky Header */}
            <div className="sticky top-0 z-30 flex flex-col -mx-2">
                <div className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md py-2 px-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl dark:hover:bg-slate-800">
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
                            { mode: 'calculator', icon: Calculator, label: 'Calculadora' },
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
                        onClick={async () => {
                            const patient = patients.find(p => p.id === plan.patient_id);
                            setIsGeneratingPdf(true);
                            try {
                                const result = await generatePlanPdf(plan, items, userProfile, patient);
                                if (result?.driveUploaded) {
                                    showToast('Plan descargado y guardado en Drive ✅', 'success');
                                } else if (patient?.drive_folder_id && !result?.driveUploaded) {
                                    showToast('PDF descargado. Error al subir a Drive.', 'warning');
                                }
                            } catch (err) {
                                console.error('Error generating PDF:', err);
                            } finally {
                                setIsGeneratingPdf(false);
                            }
                        }}
                        disabled={isGeneratingPdf}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20 disabled:opacity-50"
                        title="Exportar PDF"
                    >
                        {isGeneratingPdf ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    </button>
                    <button
                        onClick={async () => {
                            const nutri = nutritionists.find(n => n.is_active !== false) || nutritionists[0] || {};
                            const patient = patients.find(p => p.id === plan.patient_id);
                            setIsGeneratingSchema(true);
                            try {
                                await generateSchemaPdf(nutri, patient);
                            } catch (err) {
                                console.error('Error generating schema PDF:', err);
                            } finally {
                                setIsGeneratingSchema(false);
                            }
                        }}
                        disabled={isGeneratingSchema}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg dark:hover:bg-green-900/20 disabled:opacity-50"
                        title="Descargar Esquema Base"
                    >
                        {isGeneratingSchema ? <Loader2 className="animate-spin" size={18} /> : <CalendarDays size={18} />}
                    </button>
                    <button onClick={handleSharePortal} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg dark:hover:bg-purple-900/20" title="Copiar enlace del portal">
                        <ClipboardCopy size={18} />
                    </button>
                    {/* Guardar manual */}
                    <button onClick={() => performSave(sectionsRef.current)} disabled={saving} className="p-2 text-white bg-primary-600 hover:bg-primary-700 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 shadow-sm" title="Guardar cambios">
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} <span className="hidden sm:inline">Guardar Plan</span>
                    </button>
                    {/* Auto-save status indicator */}
                    <div className="flex justify-end min-w-[100px] text-xs font-semibold">
                        {saving ? (
                            <span className="text-slate-400 flex items-center gap-1.5"><Loader2 className="animate-spin" size={14} /> Guardando...</span>
                        ) : saveSuccess ? (
                            <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} /> ¡Guardado!</span>
                        ) : null}
                    </div>
                </div>
                </div>
                {/* Conditionally rendered Sticky Tabs Navigation inside the unified header */}
                {viewMode === 'meals' && (
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-3 px-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-sm">
                        <button
                            onClick={() => handleMealTabClick('all')}
                            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeMealTab === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                        >
                            Ver todas
                        </button>
                        {mealNames.map(meal => (
                            <button
                                key={meal}
                                onClick={() => handleMealTabClick(meal)}
                                className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeMealTab === meal ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                            >
                                {meal}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Meal sections */}
            {viewMode === 'meals' && (
                <div className="space-y-6 pt-2">

                    <div className="space-y-4">
                        {mealNames.map(meal => {
                            if (!mealNames.includes(meal)) return null; // Safety check
                            const isVisible = activeMealTab === 'all' || activeMealTab === meal;
                            const opts = sections[meal] || [];
                            const avgMacros = getMealAvgMacros(meal);
                            return (
                                <div key={meal} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ${!isVisible ? 'hidden' : ''}`}>
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

                                        <div className="space-y-3">
                                            {opts.map((opt, idx) => {
                                                const macros = getOptMacros(opt);
                                                const isExpanded = !collapsedOptions.has(`${meal}_${idx}`);
                                                const isSaved = checkRecipeIsSaved(opt, recipes);
                                                const itemId = opt.local_id || `${meal}_${idx}`;
                                                return (
                                                    <div key={itemId} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group transition-all hover:border-slate-300 dark:hover:border-slate-600">
                                                        {pinnedMacros[itemId] && (
                                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 border-b border-indigo-100 dark:border-indigo-800/50 flex flex-wrap items-center justify-between text-xs font-semibold shadow-sm transition-colors cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800/40" onClick={(e) => { e.stopPropagation(); togglePin(itemId, null); }} title="Haz clic para quitar referencia">
                                                                <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400"><Pin size={12} className="fill-indigo-700 dark:fill-indigo-400" /> Referencia fijada</span>
                                                                <div className="text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                                                                    <span>{Math.round(pinnedMacros[itemId].kcal)} kcal</span>
                                                                    <span>{pinnedMacros[itemId].carbs.toFixed(1)}g HC</span>
                                                                    <span>{pinnedMacros[itemId].protein.toFixed(1)}g P</span>
                                                                    <span>{pinnedMacros[itemId].fat.toFixed(1)}g G</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => (opt.custom_recipe_data || opt.recipes) && toggleEditor(meal, idx)}>
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-6">{idx + 1}</span>
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    {isSaved === true && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Guardada en base de datos" />}
                                                                    {isSaved === false && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Personalizada / No guardada" />}
                                                                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{getOptName(opt)}</span>
                                                                </div>
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
                                                                <button onClick={(e) => { e.stopPropagation(); togglePin(itemId, getOptMacros(opt)); }} className={`p-1 transition-opacity ${pinnedMacros[itemId] ? 'text-indigo-500 opacity-100' : 'text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100'}`} title={pinnedMacros[itemId] ? "Quitar referencia superior" : "Fijar macros actuales arriba del plato como referencia"}>
                                                                    <Pin size={14} className={pinnedMacros[itemId] ? "fill-indigo-500" : ""} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); (opt.custom_recipe_data || opt.recipes) && toggleEditor(meal, idx); }} className="p-1 text-slate-300 hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); setCopyModalInfo({ opt, targetMeal: '' }); }} className="p-1 text-slate-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Copiar receta a otra comida">
                                                                    <ClipboardCopy size={14} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); duplicateOption(meal, opt, idx); }} className="p-1 text-slate-300 hover:text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Duplicar en esta misma comida">
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
                                                                    onChange={(snapshot) => handleInlineAccept(meal, idx, snapshot)}
                                                                    onSaveAsRecipe={(snapshot) => handleInlineSaveAsRecipe(meal, idx, snapshot)}
                                                                    onUpdateRecipe={(snapshot) => handleInlineUpdateRecipe(meal, idx, snapshot)}
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
                                            <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden search-popup-container">
                                                <div className="p-2">
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                        <input type="text" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} placeholder="Buscar receta..." className="w-full pl-7 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" autoFocus />
                                                        <button onClick={() => { setActiveSearch(null); setRecipeSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
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
                                            <button onClick={() => { setActiveSearch(meal); setRecipeSearch(''); }} className="mt-3 w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-400 hover:border-primary-300 hover:text-primary-500 transition-all flex items-center justify-center gap-1 add-button-container">
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
                                    <div className="flex gap-4 text-base font-bold bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="text-orange-600">{Math.round(dailyAvgMacros.kcal)} kcal</span>
                                        <span className="text-amber-600">{dailyAvgMacros.carbs.toFixed(1)}g HC</span>
                                        <span className="text-blue-600">{dailyAvgMacros.protein.toFixed(1)}g P</span>
                                        <span className="text-rose-600">{dailyAvgMacros.fat.toFixed(1)}g G</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Nutritional Analyzer Panel ── */}
                        {dailyAvgMacros && calculatorData && (() => {
                            const target = calculatorData;
                            const targetKcal = parseFloat(target.targetKcal || target.target_kcal || 0);
                            const targetProtein = parseFloat(target.protein_g || (targetKcal * (target.proteinPct || target.protein_pct || 30) / 100 / 4) || 0);
                            const targetCarbs = parseFloat(target.carbs_g || (targetKcal * (target.carbsPct || target.carbs_pct || 40) / 100 / 4) || 0);
                            const targetFat = parseFloat(target.fat_g || (targetKcal * (target.fatPct || target.fat_pct || 30) / 100 / 9) || 0);

                            const macroRows = [
                                { label: 'Calorías', current: Math.round(dailyAvgMacros.kcal), target: Math.round(targetKcal), unit: 'kcal', color: 'orange' },
                                { label: 'Proteínas', current: Math.round(dailyAvgMacros.protein), target: Math.round(targetProtein), unit: 'g', color: 'blue' },
                                { label: 'H. de Carbono', current: Math.round(dailyAvgMacros.carbs), target: Math.round(targetCarbs), unit: 'g', color: 'amber' },
                                { label: 'Grasas', current: Math.round(dailyAvgMacros.fat), target: Math.round(targetFat), unit: 'g', color: 'rose' },
                            ].filter(r => r.target > 0);

                            const barColors = { orange: 'bg-orange-500', blue: 'bg-blue-500', amber: 'bg-amber-500', rose: 'bg-rose-500' };
                            const trackColors = { orange: 'bg-orange-100 dark:bg-orange-900/20', blue: 'bg-blue-100 dark:bg-blue-900/20', amber: 'bg-amber-100 dark:bg-amber-900/20', rose: 'bg-rose-100 dark:bg-rose-900/20' };

                            if (macroRows.length === 0) return null;

                            return (
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Análisis Nutricional vs. Objetivo</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {macroRows.map(row => {
                                            const pct = row.target > 0 ? Math.min((row.current / row.target) * 100, 130) : 0;
                                            const diff = row.current - row.target;
                                            const isOk = Math.abs(diff) <= row.target * 0.1;
                                            const isOver = diff > row.target * 0.1;
                                            return (
                                                <div key={row.label} className="bg-white dark:bg-slate-800/60 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50">
                                                    <div className="flex justify-between items-baseline mb-2">
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{row.label}</span>
                                                        <div className="text-right">
                                                            <span className={`text-sm font-bold ${isOk ? 'text-emerald-600' : isOver ? 'text-rose-500' : 'text-amber-500'}`}>
                                                                {row.current} {row.unit}
                                                            </span>
                                                            <span className="text-xs text-slate-400 ml-1">/ {row.target}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`w-full h-2 rounded-full ${trackColors[row.color]}`}>
                                                        <div
                                                            className={`h-2 rounded-full transition-all ${isOk ? 'bg-emerald-500' : isOver ? 'bg-rose-400' : barColors[row.color]}`}
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                    <p className={`text-[10px] mt-1 font-medium ${isOk ? 'text-emerald-600 dark:text-emerald-400' : isOver ? 'text-rose-500' : 'text-amber-500'}`}>
                                                        {isOk ? '✓ En objetivo' : isOver ? `+${diff} ${row.unit} sobre el objetivo` : `${Math.abs(diff)} ${row.unit} por debajo del objetivo`}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {macroRows.length < 4 && (
                                        <p className="text-xs text-emerald-700/60 dark:text-emerald-400/60 mt-2 text-center">
                                            💡 Configura la distribución de macros en la Calculadora para ver el análisis completo
                                        </p>
                                    )}
                                </div>
                            );
                        })()}
                        {dailyAvgMacros && !calculatorData && (
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center text-sm text-slate-400 dark:text-slate-500">
                                💡 Activa la <strong>Calculadora</strong> para comparar los macros del plan con los objetivos del paciente
                            </div>
                        )}

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                            {mealNames.map(meal => {
                                const opts = sections[meal] || [];
                                const avgMacros = getMealAvgMacros(meal);
                                return (
                                    <div key={meal} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mt-4">
                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{meal}</span>
                                            {avgMacros && (
                                                <div className="flex gap-4 text-sm font-bold">
                                                    <span className="text-orange-600">Media: {Math.round(avgMacros.kcal)} kcal</span>
                                                    <span className="text-amber-600">{avgMacros.carbs.toFixed(1)}g HC</span>
                                                    <span className="text-blue-600">{avgMacros.protein.toFixed(1)}g P</span>
                                                    <span className="text-rose-600">{avgMacros.fat.toFixed(1)}g G</span>
                                                </div>
                                            )}
                                        </div>
                                        <DroppableContainer id={meal} className="divide-y divide-slate-100 dark:divide-slate-800 min-h-[40px]">
                                            <SortableContext items={opts.map(o => o.local_id)} strategy={verticalListSortingStrategy}>
                                                {opts.map((opt, idx) => {
                                                    const macros = getOptMacros(opt);
                                                    const isSaved = checkRecipeIsSaved(opt, recipes);
                                                    return (
                                                        <SortableOption key={opt.local_id} id={opt.local_id}>
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-slate-300 group-hover:text-primary-400 transition-colors">
                                                                    <GripVertical size={16} />
                                                                </div>
                                                                <div className="flex items-center gap-1.5 select-none text-sm font-medium text-slate-600 dark:text-slate-400">
                                                                    <span className="mr-1">{idx + 1}.</span>
                                                                    {isSaved === true && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Guardada en base de datos" />}
                                                                    {isSaved === false && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Personalizada / No guardada" />}
                                                                    <span>{getOptName(opt)}</span>
                                                                </div>
                                                            </div>
                                                            {macros && (
                                                                <div className="flex gap-2 text-[10px] text-slate-500">
                                                                    <span>{Math.round(macros.kcal)} kcal</span>
                                                                    <span>| {macros.carbs.toFixed(1)}g HC</span>
                                                                    <span>| {macros.protein.toFixed(1)}g P</span>
                                                                    <span>| {macros.fat.toFixed(1)}g G</span>
                                                                </div>
                                                            )}
                                                        </SortableOption>
                                                    );
                                                })}
                                            </SortableContext>
                                        </DroppableContainer>
                                    </div>
                                );
                            })}
                        </DndContext>
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
                                    if (!planIndications.trim()) return showToast('Las indicaciones están vacías.', 'warning');
                                    const name = prompt('Nombre para esta plantilla de indicaciones:');
                                    if (name) {
                                        await addIndicationTemplate({ name, content: planIndications });
                                        showToast('Plantilla guardada correctamente.', 'success');
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
            {/* Modal for Copying Recipes */}
            {copyModalInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Copy size={18} className="text-primary-500" />
                                Copiar Receta
                            </h3>
                            <button onClick={() => setCopyModalInfo(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-sm border border-slate-100 dark:border-slate-700">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Origen:</span> {getOptName(copyModalInfo.opt)}
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Comida de destino</label>
                                    <select
                                        className="w-full mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        onChange={(e) => setCopyModalInfo(prev => ({ ...prev, targetMeal: e.target.value }))}
                                        value={copyModalInfo.targetMeal}
                                    >
                                        <option value="" disabled>-- Selecciona una comida --</option>
                                        <option value="all">Todas las comidas</option>
                                        {mealNames.map(meal => <option key={meal} value={meal}>{meal}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                            <button onClick={() => setCopyModalInfo(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                            <button
                                onClick={handleAdvancedCopy}
                                className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition-colors"
                            >
                                Pegar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Calculator View */}
            {viewMode === 'calculator' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <CalorieCalculator
                        patient={patients.find(p => p.id === plan.patient_id)}
                        mealNames={mealNames}
                        initialData={calculatorData}
                        onChange={setCalculatorData}
                    />
                </div>
            )}
        </div>
    );
}
