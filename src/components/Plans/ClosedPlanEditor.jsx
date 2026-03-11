import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import useUndo from '../../hooks/useUndo';
import { ArrowLeft, Save, Copy, Search, X, Plus, Trash2, List, Grid3X3, Table2, Pencil, FileText, ChevronDown, ChevronUp, Download, PieChart, ClipboardCopy, Loader2, CheckCircle2, CalendarDays } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { calcRecipeMacros } from '../Recipes/Recipes';
import InlineRecipeEditor from './InlineRecipeEditor';
import { generatePlanPdf } from '../../utils/planPdfGenerator';
import { generateSchemaPdf } from '../../utils/schemaPdfGenerator';
import { supabase } from '../../supabaseClient';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Calculate macros from a custom snapshot
function calcSnapshotMacros(snapshot) {
    if (!snapshot?.ingredients) return { kcal: 0, carbs: 0, protein: 0, fat: 0 };
    return snapshot.ingredients.reduce((acc, ing) => {
        const factor = (ing.quantity_grams || 0) / 100;
        return {
            kcal: acc.kcal + (ing.kcal_per_100g || 0) * factor,
            carbs: acc.carbs + (ing.carbs || 0) * factor,
            protein: acc.protein + (ing.protein || 0) * factor,
            fat: acc.fat + (ing.fat || 0) * factor,
        };
    }, { kcal: 0, carbs: 0, protein: 0, fat: 0 });
}

// Build a snapshot from a recipe object (for initial clone)
function recipeToSnapshot(recipe) {
    const ings = recipe.recipe_ingredients || [];
    return {
        name: recipe.name,
        description: recipe.description || '',
        source_recipe_id: recipe.id,
        ingredients: ings.map(ri => {
            const food = ri.foods || ri.food;
            return {
                food_id: ri.food_id,
                food_name: food?.name || 'Alimento',
                quantity_grams: ri.quantity_grams || 100,
                kcal_per_100g: food?.kcal_per_100g || 0,
                carbs: food?.carbs_per_100g || 0,
                protein: food?.protein_per_100g || 0,
                fat: food?.fat_per_100g || 0,
            };
        }),
    };
}

function checkRecipeIsSaved(cellOrOpt, allRecipes) {
    if (!cellOrOpt.custom_recipe_data && cellOrOpt.recipes) return true;
    if (!cellOrOpt.custom_recipe_data && !cellOrOpt.recipes) return null; // free text

    const snapName = (cellOrOpt.custom_recipe_data.name || '').trim().toLowerCase();
    const snapDescription = (cellOrOpt.custom_recipe_data.description || '').trim().toLowerCase();
    const snapIngredients = cellOrOpt.custom_recipe_data.ingredients || [];

    // Map food_id to its quantity for safe comparison
    const snapMap = new Map();
    snapIngredients.forEach(i => snapMap.set(i.food_id, parseFloat(i.quantity_grams || 0)));

    const activeRecipes = allRecipes.filter(r => r.is_active);
    for (const r of activeRecipes) {
        if ((r.name || '').trim().toLowerCase() !== snapName) continue;
        if ((r.description || '').trim().toLowerCase() !== snapDescription) continue;

        const rMap = new Map();
        (r.recipe_ingredients || []).forEach(ri => rMap.set(ri.food_id, parseFloat(ri.quantity_grams || 0)));

        if (snapMap.size !== rMap.size) continue;

        let diff = false;
        for (const [fid, qty] of snapMap.entries()) {
            if (!rMap.has(fid) || rMap.get(fid) !== qty) {
                diff = true;
                break;
            }
        }
        if (!diff) return true; // Found an exact match!
    }
    return false; // Modified or custom
}

export { calcSnapshotMacros, recipeToSnapshot, checkRecipeIsSaved };

export default function ClosedPlanEditor({ plan, items, onBack, onSaveItems, onUpdatePlan, onSaveAsTemplate, initialViewMode = 'grid' }) {
    // Form state
    const { recipes = [], addRecipe, updateRecipe, indicationTemplates = [], addIndicationTemplate, patients = [], userProfile = null, nutritionists = [], updatePatient } = useData();
    const { showToast } = useToast();
    const [planName, setPlanName] = useState(plan.name);
    const [planIndications, setPlanIndications] = useState(plan.indications || '');
    const [mealNames, setMealNames] = useState(plan.meal_names || ['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena']);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);
    const [viewMode, setViewMode] = useState(initialViewMode);
    const [recipeSearch, setRecipeSearch] = useState('');
    const [activeCell, setActiveCell] = useState(null);
    const [expandedCells, setExpandedCells] = useState(new Set()); // key of grid cells inline-edited
    const [collapsedCells, setCollapsedCells] = useState(new Set()); // key of day cells manually collapsed
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [activeDetailDay, setActiveDetailDay] = useState('all');
    const [expandedDays, setExpandedDays] = useState(new Set([1])); // default to day 1 open

    const scrollPositions = useRef({});
    const handleDetailDayClick = (tab) => {
        // Use a composite key because Days and Summary views might have different scroll heights
        const key = `${viewMode}_${activeDetailDay}`;
        scrollPositions.current[key] = window.scrollY;
        setActiveDetailDay(tab);
        setTimeout(() => {
            const nextKey = `${viewMode}_${tab}`;
            window.scrollTo({ top: scrollPositions.current[nextKey] || 0, behavior: 'instant' });
        }, 0);
    };
    const [copyModalInfo, setCopyModalInfo] = useState(null); // { cell }
    const [grid, setGrid] = useState({}); // Stores cell data as { "day_meal": { recipe_id, free_text, ... } }

    // Auto-save debounce refs
    const debounceTimer = useRef(null);
    const isInitialLoad = useRef(true);
    const gridRef = useRef(grid);
    gridRef.current = grid;

    // Initialize grid from items
    useEffect(() => {
        if (!isInitialLoad.current) return;
        const g = {};
        items.forEach(item => {
            const key = `${item.day_of_week}_${item.meal_name}`;
            g[key] = {
                recipe_id: item.recipe_id,
                free_text: item.free_text,
                recipes: item.recipes,
                custom_recipe_data: item.custom_recipe_data || null,
            };
        });
        setGrid(g);
        // Mark initial load as done after first render
        setTimeout(() => { isInitialLoad.current = false; }, 500);
    }, [items]);

    const recipeResults = useMemo(() => {
        if (!recipeSearch.trim()) return recipes.filter(r => r.is_active).slice(0, 10);
        const q = recipeSearch.toLowerCase();
        return recipes.filter(r => r.is_active && r.name.toLowerCase().includes(q)).slice(0, 10);
    }, [recipeSearch, recipes]);

    // Select a recipe → clone as snapshot
    const setCellRecipe = (dayIdx, mealName, recipe) => {
        const key = `${dayIdx}_${mealName}`;
        const snapshot = recipeToSnapshot(recipe);
        setGrid(prev => ({ ...prev, [key]: { recipe_id: recipe.id, free_text: null, recipes: recipe, custom_recipe_data: snapshot } }));
        setActiveCell(null);
        setRecipeSearch('');
    };

    // Unified advanced copy function
    const handleAdvancedCopy = () => {
        if (!copyModalInfo) return;
        const { cell, targetDay, targetMeal } = copyModalInfo;
        
        if (!targetDay || !targetMeal) {
            showToast('Por favor, selecciona un día y una comida de destino', 'warning');
            return;
        }

        const daysToApply = targetDay === 'all' ? DAYS.map((_, i) => i + 1) : [parseInt(targetDay)];
        const mealsToApply = targetMeal === 'all' ? mealNames : [targetMeal];

        setGrid(prev => {
            const next = { ...prev };
            daysToApply.forEach(d => {
                mealsToApply.forEach(m => {
                    const key = `${d}_${m}`;
                    const clonedData = cell.custom_recipe_data ? JSON.parse(JSON.stringify(cell.custom_recipe_data)) : null;
                    next[key] = {
                        recipe_id: cell.recipe_id,
                        free_text: cell.free_text,
                        recipes: cell.recipes,
                        custom_recipe_data: clonedData
                    };
                });
            });
            return next;
        });

        setCopyModalInfo(null);
        showToast('Receta copiada correctamente', 'success');
    };

    const setCellText = (dayIdx, mealName, text) => {
        const key = `${dayIdx}_${mealName}`;
        setGrid(prev => ({ ...prev, [key]: { recipe_id: null, free_text: text, recipes: null, custom_recipe_data: null } }));
    };

    const clearCell = (dayIdx, mealName) => {
        const key = `${dayIdx}_${mealName}`;
        setGrid(prev => { const next = { ...prev }; delete next[key]; return next; });
    };

    // Get display name for a cell
    const getCellName = (cell) => {
        if (cell?.custom_recipe_data?.name) return cell.custom_recipe_data.name;
        if (cell?.recipes?.name) return cell.recipes.name;
        return cell?.free_text || '—';
    };

    // Get macros for a cell (snapshot first, then recipe)
    const getCellMacros = (cell) => {
        if (cell?.custom_recipe_data) return calcSnapshotMacros(cell.custom_recipe_data);
        if (cell?.recipes) return calcRecipeMacros(cell.recipes);
        return null;
    };

    const getDayMacros = (dayIdx) => {
        return mealNames.reduce((acc, meal) => {
            const key = `${dayIdx}_${meal}`;
            const cell = grid[key];
            const macros = getCellMacros(cell);
            if (macros) {
                acc.kcal += macros.kcal;
                acc.carbs += macros.carbs;
                acc.protein += macros.protein;
                acc.fat += macros.fat;
            }
            return acc;
        }, { kcal: 0, carbs: 0, protein: 0, fat: 0 });
    };

    // Inline editor handlers
    const toggleGridEditor = (cellKey) => {
        setExpandedCells(prev => {
            const next = new Set(prev);
            if (next.has(cellKey)) next.delete(cellKey);
            else next.add(cellKey);
            return next;
        });
    };

    const toggleDayEditor = (cellKey) => {
        setCollapsedCells(prev => {
            const next = new Set(prev);
            if (next.has(cellKey)) next.delete(cellKey);
            else next.add(cellKey);
            return next;
        });
    };

    const toggleDay = (dayIdx) => {
        setExpandedDays(prev => {
            const next = new Set(prev);
            if (next.has(dayIdx)) next.delete(dayIdx);
            else next.add(dayIdx);
            return next;
        });
    };

    const handleInlineAccept = (cellKey, snapshot) => {
        setGrid(prev => ({
            ...prev,
            [cellKey]: {
                ...prev[cellKey],
                custom_recipe_data: snapshot,
            },
        }));
    };

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

    const handleInlineSaveAsRecipe = async (cellKey, snapshot) => {
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
        handleInlineAccept(cellKey, snapshot);
    };

    const handleInlineUpdateRecipe = async (cellKey, snapshot) => {
        if (!snapshot.source_recipe_id) return;
        await updateRecipe(snapshot.source_recipe_id, {
            name: snapshot.name,
            description: snapshot.description,
            tags: [],
        }, snapshot.ingredients.map(ing => ({
            food_id: ing.food_id,
            quantity_grams: ing.quantity_grams,
        })));
        handleInlineAccept(cellKey, snapshot);
    };

    // Create new recipe inline (no base recipe)
    const createInlineRecipe = (dayIdx, mealName) => {
        const key = `${dayIdx}_${mealName}`;
        // Set an empty cell with custom data
        setGrid(prev => ({
            ...prev,
            [key]: { recipe_id: null, free_text: null, recipes: null, custom_recipe_data: { name: '', source_recipe_id: null, ingredients: [] } },
        }));
        setExpandedCells(prev => new Set(prev).add(key));
        setActiveCell(null);
    };

    const performSave = async (currentGrid) => {
        setSaving(true);
        try {
            if (planName !== plan.name || JSON.stringify(mealNames) !== JSON.stringify(plan.meal_names) || planIndications !== (plan.indications || '')) {
                await onUpdatePlan({ name: planName, meal_names: mealNames, meals_per_day: mealNames.length, indications: planIndications });
            }
            const newItems = [];
            for (let dayIdx = 1; dayIdx <= 7; dayIdx++) {
                mealNames.forEach(meal => {
                    const key = `${dayIdx}_${meal}`;
                    const cell = currentGrid[key];
                    if (cell && (cell.recipe_id || cell.free_text || cell.custom_recipe_data)) {
                        newItems.push({
                            meal_name: meal,
                            day_of_week: dayIdx,
                            recipe_id: cell.recipe_id || null,
                            free_text: cell.free_text || null,
                            custom_recipe_data: cell.custom_recipe_data || null,
                        });
                    }
                });
            }
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
            performSave(gridRef.current);
            debounceTimer.current = null;
        }, 1500);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [grid, planName, mealNames, planIndications]);

    const flushSaveRef = useRef();
    flushSaveRef.current = () => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            performSave(gridRef.current);
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
            if (activeCell && !e.target.closest('.search-popup-container') && !e.target.closest('.add-button-container')) {
                setActiveCell(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeCell]);

    return (
        <div
            className="space-y-4 focus:outline-none"
            tabIndex={-1}
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
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        {[
                            { mode: 'grid', icon: Grid3X3, label: 'Cuadrícula' },
                            { mode: 'days', icon: List, label: 'Días' },
                            { mode: 'summary', icon: PieChart, label: 'Resumen' },
                            { mode: 'indications', icon: FileText, label: 'Indicaciones' },
                        ].map(({ mode, icon: Icon, label }) => (
                            <button key={mode} onClick={() => { window.scrollTo(0,0); setViewMode(mode); }} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${viewMode === mode ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                                <Icon size={14} /> {label}
                            </button>
                        ))}
                    </div>
                    <button onClick={onSaveAsTemplate} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg dark:hover:bg-purple-900/20" title="Guardar como plantilla de plan">
                        <Copy size={18} />
                    </button>
                    <button
                        onClick={async () => {
                            const patient = patients.find(p => p.id === plan.patient_id);
                            setIsGeneratingPdf(true);
                            try {
                                await generatePlanPdf(plan, items, userProfile, patient);
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
                    <button onClick={() => performSave(gridRef.current)} disabled={saving} className="p-2 text-white bg-primary-600 hover:bg-primary-700 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 shadow-sm" title="Guardar cambios">
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
                {(viewMode === 'days' || viewMode === 'summary') && (
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-3 px-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-sm">
                        <button
                            onClick={() => handleDetailDayClick('all')}
                            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeDetailDay === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                        >
                            Ver todos
                        </button>
                        {DAYS.map((day, idx) => (
                            <button
                                key={day}
                                onClick={() => handleDetailDayClick(idx + 1)}
                                className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeDetailDay === idx + 1 ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
                <>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-2 text-xs font-semibold text-slate-500 text-left w-28 dark:text-slate-400">Comida</th>
                                    {DAYS.map(day => <th key={day} className="p-2 text-xs font-semibold text-slate-600 text-center dark:text-slate-300">{day}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {mealNames.map(meal => (
                                    <tr key={meal} className="border-b border-slate-100 dark:border-slate-800">
                                        <td className="p-2 text-xs font-semibold text-slate-600 whitespace-nowrap dark:text-slate-300">{meal}</td>
                                        {DAYS.map((_, dayIdx) => {
                                            const key = `${dayIdx + 1}_${meal}`;
                                            const cell = grid[key];
                                            const isActive = activeCell === key;
                                            return (
                                                <td key={dayIdx} className="p-1 relative group/cell" style={{ minWidth: '110px' }}>
                                                    {!cell ? (
                                                        <button onClick={() => { setActiveCell(key); setRecipeSearch(''); }} className="w-full h-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-300 hover:border-primary-300 hover:text-primary-400 flex items-center justify-center transition-all text-xs add-button-container">
                                                            <Plus size={14} />
                                                        </button>
                                                    ) : (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="relative p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs min-h-[48px] flex items-center cursor-pointer" onClick={() => toggleGridEditor(key)}>
                                                                <div className="flex items-center gap-1.5 line-clamp-2 pr-8">
                                                                    {(() => {
                                                                        const isSaved = checkRecipeIsSaved(cell, recipes);
                                                                        if (isSaved === true) return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Guardada en base de datos" />;
                                                                        if (isSaved === false) return <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Personalizada / No guardada" />;
                                                                        return null;
                                                                    })()}
                                                                    <span className="text-slate-700 dark:text-slate-300">{getCellName(cell)}</span>
                                                                </div>
                                                                <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                                    <button onClick={(e) => { e.stopPropagation(); setCopyModalInfo({ cell, targetDay: (dayIdx + 1).toString(), targetMeal: '' }); }} className="p-0.5 text-slate-300 hover:text-emerald-500" title="Copiar a otra parte">
                                                                        <ClipboardCopy size={11} />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); toggleGridEditor(key); }} className="p-0.5 text-slate-300 hover:text-primary-500">
                                                                        <Pencil size={11} />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); clearCell(dayIdx + 1, meal); }} className="p-0.5 text-slate-300 hover:text-red-500">
                                                                        <X size={11} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {expandedCells.has(key) && (
                                                                <div className="w-[500px] z-20">
                                                                    <InlineRecipeEditor
                                                                        snapshot={cell.custom_recipe_data || recipeToSnapshot(cell.recipes) || null}
                                                                        onChange={s => handleInlineAccept(key, s)}
                                                                        onSaveAsRecipe={s => handleInlineSaveAsRecipe(key, s)}
                                                                        onClose={() => toggleGridEditor(key)}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* Recipe search popup */}
                                                    {isActive && (
                                                        <div className="absolute z-30 top-full left-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl search-popup-container">
                                                            <div className="p-2">
                                                                <div className="relative">
                                                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                                    <input type="text" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} placeholder="Buscar receta..." className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" autoFocus />
                                                                </div>
                                                            </div>
                                                            <div className="max-h-40 overflow-y-auto">
                                                                {recipeResults.map(r => (
                                                                    <button key={r.id} onClick={() => setCellRecipe(dayIdx + 1, meal, r)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300">
                                                                        {r.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="border-t border-slate-200 dark:border-slate-700 p-2">
                                                                <input type="text" placeholder="O escribe texto libre..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { setCellText(dayIdx + 1, meal, e.target.value.trim()); setActiveCell(null); } }} />
                                                            </div>
                                                            <div className="border-t border-slate-200 dark:border-slate-700 p-1 flex">
                                                                <button onClick={() => createInlineRecipe(dayIdx + 1, meal)} className="flex-1 text-center py-1 text-xs text-primary-500 hover:text-primary-700 font-medium">
                                                                    + Crear receta nueva
                                                                </button>
                                                                <button onClick={() => setActiveCell(null)} className="flex-1 text-center py-1 text-xs text-slate-400 hover:text-slate-600">
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {/* Daily macros footer */}
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <td className="p-2 text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">Totales</td>
                                    {DAYS.map((_, dayIdx) => {
                                        const macros = getDayMacros(dayIdx + 1);
                                        return (
                                            <td key={dayIdx} className="p-2">
                                                <div className="grid grid-cols-2 gap-0.5 text-[9px] font-semibold">
                                                    <span className="text-orange-600">{Math.round(macros.kcal)} kcal</span>
                                                    <span className="text-amber-600">{macros.carbs.toFixed(0)}g HC</span>
                                                    <span className="text-blue-600">{macros.protein.toFixed(0)}g P</span>
                                                    <span className="text-rose-600">{macros.fat.toFixed(0)}g G</span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Days View (Editor Semanal) */}
            {viewMode === 'days' && (
                <div className="space-y-4 pt-2">

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Editor Semanal por Días</h3>
                            <span className="text-xs text-slate-500">Haz clic en un día para desplegar sus comidas</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {DAYS.map((day, idx) => {
                                const isVisible = activeDetailDay === 'all' || activeDetailDay === idx + 1;
                                const dayIdx = idx;
                                const macros = getDayMacros(dayIdx + 1);
                                const isExpanded = expandedDays.has(dayIdx + 1);
                                return (
                                    <div key={day} className={`flex flex-col ${!isVisible ? 'hidden' : ''}`}>
                                        <div
                                            className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                                            onClick={() => toggleDay(dayIdx + 1)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-base font-bold text-slate-700 dark:text-slate-200">{day}</span>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                <span className="text-sm font-semibold text-orange-600">{Math.round(macros.kcal)} kcal</span>
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                                {mealNames.map(meal => {
                                                    const key = `${dayIdx + 1}_${meal}`;
                                                    const cell = grid[key];
                                                    const isActive = activeCell === key;
                                                    const isSaved = cell ? checkRecipeIsSaved(cell, recipes) : null;
                                                    const cellMacros = getCellMacros(cell);

                                                    return (
                                                        <div key={meal} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-600">
                                                            <div className="flex flex-col gap-3">
                                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                                                                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase w-20 shrink-0">{meal}</span>
                                                                        {cell ? (
                                                                            <div className="flex items-center gap-2">
                                                                                {isSaved === true && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Guardada" />}
                                                                                {isSaved === false && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Personalizada" />}
                                                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{getCellName(cell)}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-sm text-slate-400 italic">Vacío</span>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center gap-4">
                                                                        {cellMacros && (
                                                                            <div className="flex gap-3 text-xs text-slate-500 font-medium">
                                                                                <span className="text-orange-500">{Math.round(cellMacros.kcal)} kcal</span>
                                                                                <span className="text-amber-500">{cellMacros.carbs.toFixed(1)}g HC</span>
                                                                                <span className="text-blue-500">{cellMacros.protein.toFixed(1)}g P</span>
                                                                                <span className="text-rose-500">{cellMacros.fat.toFixed(1)}g G</span>
                                                                            </div>
                                                                        )}

                                                                        <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-4">
                                                                            {!cell ? (
                                                                                <button onClick={() => { setActiveCell(key); setRecipeSearch(''); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 rounded-lg transition-colors border border-primary-100 dark:border-primary-900/30 add-button-container">
                                                                                    <Plus size={14} /> Añadir
                                                                                </button>
                                                                            ) : (
                                                                                <>
                                                                                    <button onClick={() => toggleDayEditor(key)} className={`p-2 rounded-lg transition-colors ${!collapsedCells.has(key) ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400' : 'text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-slate-700'}`} title={!collapsedCells.has(key) ? "Ocultar editor" : "Editar opción"}>
                                                                                        <Pencil size={16} />
                                                                                    </button>
                                                                                    <button onClick={() => setCopyModalInfo({ cell, targetDay: (dayIdx + 1).toString(), targetMeal: '' })} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Copiar receta a otra comida o día">
                                                                                        <ClipboardCopy size={16} />
                                                                                    </button>
                                                                                    <button onClick={() => clearCell(dayIdx + 1, meal)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Eliminar opción">
                                                                                        <Trash2 size={16} />
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Empty state search block */}
                                                                {isActive && !cell && (
                                                                    <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 shadow-inner search-popup-container">
                                                                        <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 relative">
                                                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                                            <input type="text" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} placeholder="Buscar receta por nombre..." className="w-full pl-10 pr-3 py-2 text-sm bg-transparent outline-none dark:text-white" autoFocus />
                                                                        </div>
                                                                        <div className="max-h-48 overflow-y-auto bg-white dark:bg-slate-900">
                                                                            {recipeResults.length === 0 ? (
                                                                                <div className="p-6 text-center text-sm text-slate-400">No hay recetas que coincidan</div>
                                                                            ) : (
                                                                                recipeResults.map(r => (
                                                                                    <button key={r.id} onClick={() => setCellRecipe(dayIdx + 1, meal, r)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800/50 last:border-0 transition-colors flex items-center justify-between group">
                                                                                        <span>{r.name}</span>
                                                                                        <Plus size={14} className="text-slate-300 group-hover:text-primary-500" />
                                                                                    </button>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                        <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex">
                                                                            <button onClick={() => createInlineRecipe(dayIdx + 1, meal)} className="flex-1 py-2.5 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 border-r border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5">
                                                                                <Plus size={14} /> Nueva receta en blanco
                                                                            </button>
                                                                            <button onClick={() => setActiveCell(null)} className="flex-1 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                                                Cancelar
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Inline Editor block */}
                                                                {!collapsedCells.has(key) && cell && (
                                                                    <div className="mt-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                                        <InlineRecipeEditor
                                                                            snapshot={cell.custom_recipe_data || recipeToSnapshot(cell.recipes) || null}
                                                                            onChange={s => handleInlineAccept(key, s)}
                                                                            onSaveAsRecipe={s => handleInlineSaveAsRecipe(key, s)}
                                                                            onUpdateRecipe={s => handleInlineUpdateRecipe(key, s)}
                                                                            onClose={() => toggleDayEditor(key)}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary View */}
            {viewMode === 'summary' && (
                <div className="space-y-6">
                    {/* Resumen General */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <PieChart className="text-primary-500" />
                                Resumen del Plan
                            </h3>
                            {(() => {
                                let totalKcal = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;
                                for (let i = 1; i <= 7; i++) {
                                    const m = getDayMacros(i);
                                    totalKcal += m.kcal;
                                    totalCarbs += m.carbs;
                                    totalProtein += m.protein;
                                    totalFat += m.fat;
                                }
                                return (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between md:justify-end gap-4">
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Media Diaria</span>
                                            <div className="flex gap-4 text-base font-bold bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-100 dark:border-slate-700 min-w-[280px] justify-between">
                                                <span className="text-orange-600">{Math.round(totalKcal / 7)} kcal</span>
                                                <span className="text-amber-600">{(totalCarbs / 7).toFixed(1)}g HC</span>
                                                <span className="text-blue-600">{(totalProtein / 7).toFixed(1)}g P</span>
                                                <span className="text-rose-600">{(totalFat / 7).toFixed(1)}g G</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>


                    {/* Resumen Diario */}
                    <div className="space-y-4">
                        {DAYS.map((day, idx) => {
                            const isVisible = activeDetailDay === 'all' || activeDetailDay === idx + 1;
                            const dayIdx = idx;
                            const macros = getDayMacros(dayIdx + 1);

                            const hasMeals = mealNames.some(meal => grid[`${dayIdx + 1}_${meal}`]);
                            if (!hasMeals && activeDetailDay === 'all') return null;

                            return (
                                <div key={day} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm ${!isVisible ? 'hidden' : ''}`}>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">{day}</h3>
                                        <div className="flex gap-4 text-base font-semibold">
                                            <span className="text-orange-600">{Math.round(macros.kcal)} kcal</span>
                                            <span className="text-amber-600">{macros.carbs.toFixed(1)}g HC</span>
                                            <span className="text-blue-600">{macros.protein.toFixed(1)}g P</span>
                                            <span className="text-rose-600">{macros.fat.toFixed(1)}g G</span>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {mealNames.map(meal => {
                                            const key = `${dayIdx + 1}_${meal}`;
                                            const cell = grid[key];
                                            if (!cell) return null;

                                            const cellMacros = getCellMacros(cell);

                                            return (
                                                <div key={meal} className="p-4 bg-white dark:bg-slate-800 transition-colors">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase w-20 shrink-0">{meal}</span>
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{getCellName(cell)}</span>
                                                        </div>
                                                        {cellMacros && (
                                                            <div className="flex gap-4 text-sm font-medium bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                <span className="text-orange-500">{Math.round(cellMacros.kcal)} kcal</span>
                                                                <span className="text-amber-500">{cellMacros.carbs.toFixed(1)}g HC</span>
                                                                <span className="text-blue-500">{cellMacros.protein.toFixed(1)}g P</span>
                                                                <span className="text-rose-500">{cellMacros.fat.toFixed(1)}g G</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {!hasMeals && (
                                            <div className="p-8 text-center text-slate-400 italic">No hay comidas programadas para este día</div>
                                        )}
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
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Origen:</span> {getCellName(copyModalInfo.cell)}
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Día de destino</label>
                                    <select
                                        className="w-full mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        onChange={(e) => setCopyModalInfo(prev => ({ ...prev, targetDay: e.target.value }))}
                                        value={copyModalInfo.targetDay}
                                    >
                                        <option value="" disabled>-- Selecciona un día --</option>
                                        <option value="all">Todos los días</option>
                                        {DAYS.map((day, idx) => <option key={day} value={idx + 1}>{day}</option>)}
                                    </select>
                                </div>
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
        </div>
    );
}
