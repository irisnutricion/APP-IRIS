import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Save, Copy, Search, X, Plus, Trash2, List, Grid3X3, Table2, Pencil } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { calcRecipeMacros } from '../Recipes/Recipes';
import InlineRecipeEditor from './InlineRecipeEditor';

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

export { calcSnapshotMacros, recipeToSnapshot };

export default function ClosedPlanEditor({ plan, items, onBack, onSaveItems, onUpdatePlan, onSaveAsTemplate }) {
    const { recipes = [], addRecipe } = useData();
    const [planName, setPlanName] = useState(plan.name);
    const [mealNames, setMealNames] = useState(plan.meal_names || ['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena']);
    const [grid, setGrid] = useState({});
    const [viewMode, setViewMode] = useState('grid');
    const [saving, setSaving] = useState(false);
    const [recipeSearch, setRecipeSearch] = useState('');
    const [activeCell, setActiveCell] = useState(null);
    const [editingCell, setEditingCell] = useState(null); // key of cell being inline-edited

    // Initialize grid from items
    useEffect(() => {
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
    const openInlineEditor = (cellKey) => {
        const cell = grid[cellKey];
        if (!cell) return;
        setEditingCell(cellKey);
    };

    const handleInlineAccept = (snapshot) => {
        setGrid(prev => ({
            ...prev,
            [editingCell]: {
                ...prev[editingCell],
                custom_recipe_data: snapshot,
            },
        }));
        setEditingCell(null);
    };

    const handleInlineSaveAsRecipe = async (snapshot) => {
        const newRecipe = await addRecipe({
            name: snapshot.name,
            is_active: true,
            tags: [],
        }, snapshot.ingredients.map(ing => ({
            food_id: ing.food_id,
            quantity_grams: ing.quantity_grams,
        })));
        // Also accept the snapshot into the plan
        handleInlineAccept(snapshot);
    };

    // Create new recipe inline (no base recipe)
    const createInlineRecipe = (dayIdx, mealName) => {
        const key = `${dayIdx}_${mealName}`;
        // Set an empty cell with custom data
        setGrid(prev => ({
            ...prev,
            [key]: { recipe_id: null, free_text: null, recipes: null, custom_recipe_data: { name: '', source_recipe_id: null, ingredients: [] } },
        }));
        setEditingCell(key);
        setActiveCell(null);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (planName !== plan.name || JSON.stringify(mealNames) !== JSON.stringify(plan.meal_names)) {
                await onUpdatePlan({ name: planName, meal_names: mealNames, meals_per_day: mealNames.length });
            }
            const newItems = [];
            for (let dayIdx = 1; dayIdx <= 7; dayIdx++) {
                mealNames.forEach(meal => {
                    const key = `${dayIdx}_${meal}`;
                    const cell = grid[key];
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
        } finally {
            setSaving(false);
        }
    };

    // Get the snapshot for the editing cell
    const editingSnapshot = editingCell ? (grid[editingCell]?.custom_recipe_data || null) : null;

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
                    <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        {[
                            { mode: 'grid', icon: Grid3X3, label: 'Grid' },
                            { mode: 'detail', icon: Table2, label: 'Detalle' },
                            { mode: 'list', icon: List, label: 'Lista' },
                        ].map(({ mode, icon: Icon, label }) => (
                            <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${viewMode === mode ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                                <Icon size={14} /> {label}
                            </button>
                        ))}
                    </div>
                    <button onClick={onSaveAsTemplate} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg dark:hover:bg-purple-900/20" title="Guardar como plantilla">
                        <Copy size={18} />
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm py-2">
                        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
                    </button>
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
                                                    <div className="relative p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs min-h-[48px] flex items-center cursor-pointer" onClick={() => openInlineEditor(key)}>
                                                        <span className="text-slate-700 dark:text-slate-300 line-clamp-2 pr-8">{getCellName(cell)}</span>
                                                        <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                            <button onClick={(e) => { e.stopPropagation(); openInlineEditor(key); }} className="p-0.5 text-slate-300 hover:text-primary-500">
                                                                <Pencil size={11} />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); clearCell(dayIdx + 1, meal); }} className="p-0.5 text-slate-300 hover:text-red-500">
                                                                <X size={11} />
                                                            </button>
                                                        </div>
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
                    {DAYS.map((day, dayIdx) => {
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
                                        const ingredients = cell?.custom_recipe_data?.ingredients || [];
                                        return (
                                            <div key={meal} className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => cell && openInlineEditor(key)}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-semibold text-slate-400 w-24 dark:text-slate-500">{meal}</span>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{getCellName(cell)}</span>
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
                                            return (
                                                <div key={meal} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="font-medium text-slate-400 w-20">{meal}:</span>
                                                    <span className="text-slate-600 dark:text-slate-300">{getCellName(cell)}</span>
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

            {/* Inline Recipe Editor Modal */}
            {editingCell && (
                <InlineRecipeEditor
                    snapshot={editingSnapshot}
                    onAccept={handleInlineAccept}
                    onSaveAsRecipe={handleInlineSaveAsRecipe}
                    onClose={() => setEditingCell(null)}
                />
            )}
        </div>
    );
}
