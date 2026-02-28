import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import useUndo from '../../hooks/useUndo';
import { ArrowLeft, Save, Copy, Search, X, Plus, Trash2, List, Grid3X3, Table2, Pencil, FileText, ChevronDown, Download, PieChart, ClipboardCopy, Loader2, CheckCircle2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { calcRecipeMacros } from '../Recipes/Recipes';
import InlineRecipeEditor from './InlineRecipeEditor';
import { generatePlanPdf } from '../../utils/planPdfGenerator';

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
    const { recipes = [], addRecipe, updateRecipe, indicationTemplates = [], addIndicationTemplate, patients = [], userProfile = null } = useData();
    const [planName, setPlanName] = useState(plan.name);
    const [planIndications, setPlanIndications] = useState(plan.indications || '');
    const [mealNames, setMealNames] = useState(plan.meal_names || ['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena']);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [viewMode, setViewMode] = useState(initialViewMode);
    const [recipeSearch, setRecipeSearch] = useState('');
    const [activeCell, setActiveCell] = useState(null);
    const [expandedCells, setExpandedCells] = useState(new Set()); // key of cells being inline-edited
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [activeDetailDay, setActiveDetailDay] = useState(1); // Default to Day 1
    const [copyMenuCell, setCopyMenuCell] = useState(null); // key of cell showing copy-to menu

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

    // Copy a cell's recipe to another meal in the same day
    const copyCellToMeal = (dayIdx, fromMeal, toMeal) => {
        const fromKey = `${dayIdx}_${fromMeal}`;
        const cell = grid[fromKey];
        if (!cell) return;
        const toKey = `${dayIdx}_${toMeal}`;
        const clonedData = cell.custom_recipe_data ? JSON.parse(JSON.stringify(cell.custom_recipe_data)) : null;
        setGrid(prev => ({
            ...prev,
            [toKey]: {
                recipe_id: cell.recipe_id,
                free_text: cell.free_text,
                recipes: cell.recipes,
                custom_recipe_data: clonedData,
            }
        }));
        setCopyMenuCell(null);
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
    const toggleEditor = (cellKey) => {
        setExpandedCells(prev => {
            const next = new Set(prev);
            if (next.has(cellKey)) next.delete(cellKey);
            else next.add(cellKey);
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

    const handleInlineSaveAsRecipe = async (cellKey, snapshot) => {
        await addRecipe({
            name: snapshot.name,
            is_active: true,
            tags: [],
        }, snapshot.ingredients.map(ing => ({
            food_id: ing.food_id,
            quantity_grams: ing.quantity_grams,
        })));
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
        }, 1500);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [grid, planName, mealNames, planIndications]);

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            const tag = e.target.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;
            e.preventDefault();
            if (e.shiftKey) {
                if (canRedoGrid) redoGrid();
            } else {
                if (canUndoGrid) undoGrid();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            const tag = e.target.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;
            e.preventDefault();
            if (canRedoGrid) redoGrid();
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
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl dark:hover:bg-slate-800">
                        <ArrowLeft size={20} />
                    </button>
                    <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} className="text-xl font-bold text-slate-800 dark:text-white bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-primary-500 outline-none px-1" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        {[
                            { mode: 'grid', icon: Grid3X3, label: 'Grid' },
                            { mode: 'detail', icon: Table2, label: 'Detalle' },
                            { mode: 'list', icon: List, label: 'Lista' },
                            { mode: 'summary', icon: PieChart, label: 'Resumen' },
                            { mode: 'indications', icon: FileText, label: 'Indicaciones' },
                        ].map(({ mode, icon: Icon, label }) => (
                            <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${viewMode === mode ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
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

            {/* Grid View */}
            {viewMode === 'grid' && (
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
                                                    <button onClick={() => { setActiveCell(key); setRecipeSearch(''); }} className="w-full h-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-300 hover:border-primary-300 hover:text-primary-400 flex items-center justify-center transition-all text-xs">
                                                        <Plus size={14} />
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="relative p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs min-h-[48px] flex items-center cursor-pointer" onClick={() => toggleEditor(key)}>
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
                                                                <button onClick={(e) => { e.stopPropagation(); setCopyMenuCell(copyMenuCell === key ? null : key); }} className="p-0.5 text-slate-300 hover:text-emerald-500" title="Copiar a otra comida">
                                                                    <ClipboardCopy size={11} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); toggleEditor(key); }} className="p-0.5 text-slate-300 hover:text-primary-500">
                                                                    <Pencil size={11} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); clearCell(dayIdx + 1, meal); }} className="p-0.5 text-slate-300 hover:text-red-500">
                                                                    <X size={11} />
                                                                </button>
                                                            </div>
                                                            {copyMenuCell === key && (
                                                                <div className="absolute z-30 top-full right-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1">
                                                                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase">Copiar a...</div>
                                                                    {mealNames.filter(m => m !== meal).map(targetMeal => (
                                                                        <button
                                                                            key={targetMeal}
                                                                            onClick={(e) => { e.stopPropagation(); copyCellToMeal(dayIdx + 1, meal, targetMeal); }}
                                                                            className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                                                        >
                                                                            {targetMeal}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {expandedCells.has(key) && (
                                                            <div className="w-[500px] z-20">
                                                                <InlineRecipeEditor
                                                                    snapshot={cell.custom_recipe_data || recipeToSnapshot(cell.recipes) || null}
                                                                    onChange={s => handleInlineAccept(key, s)}
                                                                    onSaveAsRecipe={s => handleInlineSaveAsRecipe(key, s)}
                                                                    onClose={() => toggleEditor(key)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Recipe search popup */}
                                                {isActive && (
                                                    <div className="absolute z-30 top-full left-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl">
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
            )}

            {/* Detail View */}
            {viewMode === 'detail' && (
                <div className="space-y-4">
                    {/* Sticky Tabs Navigation for Days */}
                    <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-3 -mx-2 px-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveDetailDay('all')}
                            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeDetailDay === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                        >
                            Ver todos
                        </button>
                        {DAYS.map((day, idx) => (
                            <button
                                key={day}
                                onClick={() => setActiveDetailDay(idx + 1)}
                                className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeDetailDay === idx + 1 ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    {(activeDetailDay === 'all' ? DAYS : [DAYS[activeDetailDay - 1]]).map((day, mapIdx) => {
                        const dayIdx = activeDetailDay === 'all' ? mapIdx : (activeDetailDay - 1);
                        const macros = getDayMacros(dayIdx + 1);
                        return (
                            <div key={day} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200">{day}</h3>
                                    <div className="flex gap-3 text-xs font-semibold">
                                        <span className="text-orange-600">{Math.round(macros.kcal)} kcal</span>
                                        <span className="text-amber-600">{macros.carbs.toFixed(1)}g HC</span>
                                        <span className="text-blue-600">{macros.protein.toFixed(1)}g Prot</span>
                                        <span className="text-rose-600">{macros.fat.toFixed(1)}g Grasas</span>
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {mealNames.map(meal => {
                                        const key = `${dayIdx + 1}_${meal}`;
                                        const cell = grid[key];
                                        const cellMacros = getCellMacros(cell);
                                        const ingredients = cell?.custom_recipe_data?.ingredients || (cell?.recipes?.recipe_ingredients || []).map(ri => ({
                                            food_name: (ri.foods || ri.food)?.name || 'Alimento',
                                            quantity_grams: ri.quantity_grams || 0
                                        }));
                                        const isSaved = cell ? checkRecipeIsSaved(cell, recipes) : null;
                                        return (
                                            <div key={meal} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group transition-all hover:border-slate-300 dark:hover:border-slate-600 mb-3">
                                                <div className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => cell && toggleEditor(key)}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-semibold text-slate-400 w-24 dark:text-slate-500">{meal}</span>
                                                            <div className="flex items-center gap-1.5">
                                                                {isSaved === true && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Guardada en base de datos" />}
                                                                {isSaved === false && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Personalizada / No guardada" />}
                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{getCellName(cell)}</span>
                                                            </div>
                                                        </div>
                                                        {cellMacros && (
                                                            <div className="flex gap-3 text-xs">
                                                                <span className="text-orange-500">{Math.round(cellMacros.kcal)}</span>
                                                                <span className="text-amber-500">{cellMacros.carbs.toFixed(1)}g</span>
                                                                <span className="text-blue-500">{cellMacros.protein.toFixed(1)}g</span>
                                                                <span className="text-rose-500">{cellMacros.fat.toFixed(1)}g</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {ingredients.length > 0 && (
                                                        <div className="ml-28 mt-1.5 space-y-0.5">
                                                            {ingredients.map((ing, i) => (
                                                                <div key={i} className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                                                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0"></span>
                                                                    <span className="text-slate-500 dark:text-slate-400">{ing.food_name}</span>
                                                                    <span className="text-slate-400 dark:text-slate-500">— {ing.quantity_grams}g</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {expandedCells.has(key) && cell && (
                                                    <div className="px-3 pb-3">
                                                        <InlineRecipeEditor
                                                            snapshot={cell.custom_recipe_data || recipeToSnapshot(cell.recipes) || null}
                                                            onAccept={s => { handleInlineAccept(key, s); toggleEditor(key); }}
                                                            onSaveAsRecipe={s => handleInlineSaveAsRecipe(key, s)}
                                                            onUpdateRecipe={s => handleInlineUpdateRecipe(key, s)}
                                                            onClose={() => toggleEditor(key)}
                                                        />
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
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {DAYS.map((day, dayIdx) => {
                            const macros = getDayMacros(dayIdx + 1);
                            return (
                                <div key={day} className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{day}</span>
                                        <span className="text-xs font-semibold text-orange-600">{Math.round(macros.kcal)} kcal</span>
                                    </div>
                                    <div className="space-y-0.5 ml-3">
                                        {mealNames.map(meal => {
                                            const key = `${dayIdx + 1}_${meal}`;
                                            const cell = grid[key];
                                            const isSaved = cell ? checkRecipeIsSaved(cell, recipes) : null;
                                            return (
                                                <div key={meal} className="flex flex-col gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-2 mb-2 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => cell && toggleEditor(key)}>
                                                        <span className="font-medium text-slate-400 w-20">{meal}:</span>
                                                        <div className="flex items-center gap-1.5">
                                                            {isSaved === true && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Guardada en base de datos" />}
                                                            {isSaved === false && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Personalizada / No guardada" />}
                                                            <span className="text-slate-600 dark:text-slate-300">{getCellName(cell)}</span>
                                                        </div>
                                                    </div>
                                                    {expandedCells.has(key) && cell && (
                                                        <div className="ml-20">
                                                            <InlineRecipeEditor
                                                                snapshot={cell.custom_recipe_data || recipeToSnapshot(cell.recipes) || null}
                                                                onAccept={s => { handleInlineAccept(key, s); toggleEditor(key); }}
                                                                onSaveAsRecipe={s => handleInlineSaveAsRecipe(key, s)}
                                                                onUpdateRecipe={s => handleInlineUpdateRecipe(key, s)}
                                                                onClose={() => toggleEditor(key)}
                                                            />
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

            {/* Summary View */}
            {viewMode === 'summary' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <PieChart className="text-primary-500" />
                                Resumen Semanal
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
                                            <div className="flex gap-3 text-sm font-bold bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 min-w-[280px] justify-between">
                                                <span className="text-orange-600">{Math.round(totalKcal / 7)} kcal</span>
                                                <span className="text-amber-600">{(totalCarbs / 7).toFixed(1)}g HC</span>
                                                <span className="text-blue-600">{(totalProtein / 7).toFixed(1)}g P</span>
                                                <span className="text-rose-600">{(totalFat / 7).toFixed(1)}g G</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-4">
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Total Semanal</span>
                                            <div className="flex gap-3 text-xs font-bold bg-slate-50/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 min-w-[280px] justify-between opacity-80">
                                                <span className="text-orange-500">{Math.round(totalKcal)} kcal</span>
                                                <span className="text-amber-500">{totalCarbs.toFixed(1)}g HC</span>
                                                <span className="text-blue-500">{totalProtein.toFixed(1)}g P</span>
                                                <span className="text-rose-500">{totalFat.toFixed(1)}g G</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                            {DAYS.map((day, idx) => {
                                const macros = getDayMacros(idx + 1);
                                return (
                                    <div key={day} className="bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 p-4 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80">
                                        <h4 className="font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">{day}</h4>
                                        <div className="flex flex-col gap-2 text-sm font-medium">
                                            <div className="flex justify-between items-center text-orange-600">
                                                <span>Calorías</span>
                                                <span>{Math.round(macros.kcal)} kcal</span>
                                            </div>
                                            <div className="flex justify-between items-center text-amber-600">
                                                <span>Carbohidratos</span>
                                                <span>{macros.carbs.toFixed(1)}g</span>
                                            </div>
                                            <div className="flex justify-between items-center text-blue-600">
                                                <span>Proteínas</span>
                                                <span>{macros.protein.toFixed(1)}g</span>
                                            </div>
                                            <div className="flex justify-between items-center text-rose-600">
                                                <span>Grasas</span>
                                                <span>{macros.fat.toFixed(1)}g</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
