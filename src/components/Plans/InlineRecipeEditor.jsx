import { useState, useMemo, useId, useRef, useEffect, useCallback } from 'react';
import useUndo from '../../hooks/useUndo';
import { Search, X, Trash2, GripVertical, Plus, BookmarkPlus, Save, CheckCircle2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableIngredient({ id, children }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg group relative hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <div {...attributes} {...listeners} className="text-slate-300 group-hover:text-primary-400 transition-colors cursor-grab active:cursor-grabbing p-1">
                <GripVertical size={14} />
            </div>
            {children}
        </div>
    );
}

/**
 * InlineRecipeEditor — edita un snapshot de receta sin tocar la original.
 * Props:
 *   snapshot: { name, source_recipe_id?, ingredients: [{ food_id, food_name, quantity_grams, kcal_per_100g, carbs, protein, fat }] } | null
 *   onChange(snapshot) — triggers every time an edit is made (debounced)
 *   onSaveAsRecipe(snapshot) — guarda como nueva receta en DB
 *   onUpdateRecipe(snapshot) — actualiza la receta maestra
 *   onClose() — cierra el panel
 */
export default function InlineRecipeEditor({ snapshot, onChange, onSaveAsRecipe, onUpdateRecipe, onClose }) {
    const { foods = [], recipePhrases = [], recipes = [] } = useData();
    const [phraseSearch, setPhraseSearch] = useState('');
    const [showPhraseSearch, setShowPhraseSearch] = useState(false);

    const initial = snapshot || { name: '', description: '', source_recipe_id: null, ingredients: [] };
    const [name, setName] = useState(snapshot?.name || '');
    const [description, setDescription] = useState(snapshot?.description || '');
    const [currentSourceRecipeId, setCurrentSourceRecipeId] = useState(snapshot?.source_recipe_id || null);
    const [showRecipeDropdown, setShowRecipeDropdown] = useState(false);
    
    // Derived recipes for autocomplete
    const activeRecipeResults = useMemo(() => {
        if (!name.trim()) return [];
        const q = name.toLowerCase();
        return recipes.filter(r => r.is_active && r.name.toLowerCase().includes(q));
    }, [name, recipes]);

    const handleSelectRecipe = (r) => {
        setName(r.name);
        setDescription(r.description || '');
        const ings = r.recipe_ingredients || [];
        const newIngredients = ings.map(ri => {
            const food = ri.foods || ri.food;
            return {
                unique_id: crypto.randomUUID(),
                food_id: ri.food_id,
                food_name: food?.name || 'Alimento',
                quantity_grams: ri.quantity_grams || '',
                kcal_per_100g: food?.kcal_per_100g || 0,
                carbs: food?.carbs_per_100g || 0,
                protein: food?.protein_per_100g || 0,
                fat: food?.fat_per_100g || 0,
            };
        });
        setIngredients(newIngredients);
        setCurrentSourceRecipeId(r.id);
        setShowRecipeDropdown(false);
    };
    const [ingredients, setIngredients, undoIngredients, redoIngredients, canUndoIngredients, canRedoIngredients] = useUndo(() => {
        const initialIngs = snapshot?.ingredients || [];
        return initialIngs.map(ing => ({ ...ing, unique_id: ing.unique_id || crypto.randomUUID() }));
    });
    const [foodSearch, setFoodSearch] = useState('');
    const [showFoodSearch, setShowFoodSearch] = useState(false);
    const [editingIngredientIdx, setEditingIngredientIdx] = useState(null);
    const dndId = useId();
    const [statusMsg, setStatusMsg] = useState('');
    const [foodNavIndex, setFoodNavIndex] = useState(-1);

    useEffect(() => {
        setFoodNavIndex(-1);
    }, [foodSearch, showFoodSearch, editingIngredientIdx]);

    const showSuccessMessage = (msg) => {
        setStatusMsg(msg);
        setTimeout(() => setStatusMsg(''), 2500);
    };

    const foodResults = useMemo(() => {
        if (!foodSearch.trim()) return foods.slice(0, 12);
        const q = foodSearch.toLowerCase();
        return foods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 12);
    }, [foodSearch, foods]);

    const handleFoodSearchKeyDown = (e, isReplace = false, ingId = null, currentIdx = -1) => {
        if (!foodResults.length && !foodSearch.trim() && e.key !== 'Escape') return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!foodResults.length) return;
            setFoodNavIndex(prev => {
                const next = prev < foodResults.length - 1 ? prev + 1 : prev;
                setTimeout(() => document.getElementById('food-search-item-' + next)?.scrollIntoView({ block: 'nearest' }), 0);
                return next;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!foodResults.length) return;
            setFoodNavIndex(prev => {
                const next = prev > 0 ? prev - 1 : 0;
                setTimeout(() => document.getElementById('food-search-item-' + next)?.scrollIntoView({ block: 'nearest' }), 0);
                return next;
            });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedFood = foodNavIndex >= 0 && foodNavIndex < foodResults.length ? foodResults[foodNavIndex] : (foodResults.length > 0 ? foodResults[0] : null);
            
            const handleNext = () => {
                if (isReplace) {
                    if (currentIdx !== -1 && currentIdx < ingredients.length - 1) {
                        setEditingIngredientIdx(currentIdx + 1);
                        setFoodSearch('');
                    } else {
                        setEditingIngredientIdx(null);
                        setFoodSearch('');
                        setShowFoodSearch(true);
                        setTimeout(() => document.getElementById('new-ingredient-search')?.focus(), 50);
                    }
                } else {
                    setFoodSearch('');
                    setShowFoodSearch(true);
                    setTimeout(() => document.getElementById('new-ingredient-search')?.focus(), 50);
                }
            };

            if (selectedFood) {
                if (isReplace) {
                    replaceIngredientFood(ingId, selectedFood, false);
                } else {
                    addIngredient(selectedFood, false);
                }
                handleNext();
            } else if (foodSearch.trim()) {
                const customFood = {
                    id: `custom_${crypto.randomUUID()}`,
                    name: foodSearch.trim(),
                    kcal_per_100g: 0,
                    carbs_per_100g: 0,
                    protein_per_100g: 0,
                    fat_per_100g: 0,
                };
                if (isReplace) {
                    replaceIngredientFood(ingId, customFood, false);
                } else {
                    addIngredient(customFood, false);
                }
                handleNext();
            }
        } else if (e.key === 'Escape') {
            if (isReplace) {
                setEditingIngredientIdx(null);
                setFoodSearch('');
            } else {
                setShowFoodSearch(false);
                setFoodSearch('');
            }
        }
    };

    const addIngredient = (food, closeUI = true) => {
        setIngredients(prev => [...prev, {
            unique_id: crypto.randomUUID(),
            food_id: food.id,
            food_name: food.name,
            quantity_grams: '',
            kcal_per_100g: food.kcal_per_100g || 0,
            carbs: food.carbs_per_100g || 0,
            protein: food.protein_per_100g || 0,
            fat: food.fat_per_100g || 0,
        }]);
        if (closeUI) {
            setFoodSearch('');
            setShowFoodSearch(false);
        }
    };

    // Phrase search results
    const phraseResults = useMemo(() => {
        if (!phraseSearch.trim()) return recipePhrases || [];
        const q = phraseSearch.toLowerCase();
        return (recipePhrases || []).filter(p => p.name.toLowerCase().includes(q));
    }, [phraseSearch, recipePhrases]);

    const updateQty = (id, qty) => {
        setIngredients(prev => prev.map(ing => ing.unique_id === id ? { ...ing, quantity_grams: qty === '' ? '' : (parseFloat(qty) || 0) } : ing));
    };

    const replaceIngredientFood = (id, newFood, closeUI = true) => {
        setIngredients(prev => prev.map(ing => ing.unique_id === id ? {
            ...ing,
            food_id: newFood.id,
            food_name: newFood.name,
            kcal_per_100g: newFood.kcal_per_100g,
            carbs: newFood.carbs_per_100g,
            protein: newFood.protein_per_100g,
            fat: newFood.fat_per_100g
        } : ing));
        if (closeUI) {
            setEditingIngredientIdx(null);
            setFoodSearch('');
        }
    };

    const removeIngredient = (id) => {
        setIngredients(prev => prev.filter(ing => ing.unique_id !== id));
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setIngredients((items) => {
                const oldIndex = items.findIndex(i => i.unique_id === active.id);
                const newIndex = items.findIndex(i => i.unique_id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Calculate macros per ingredient
    const calcIngMacros = (ing) => {
        const factor = (parseFloat(ing.quantity_grams) || 0) / 100;
        return {
            kcal: (ing.kcal_per_100g || 0) * factor,
            carbs: (ing.carbs || 0) * factor,
            protein: (ing.protein || 0) * factor,
            fat: (ing.fat || 0) * factor,
        };
    };

    // Total macros
    const totalMacros = useMemo(() => {
        return ingredients.reduce((acc, ing) => {
            const m = calcIngMacros(ing);
            return { kcal: acc.kcal + m.kcal, carbs: acc.carbs + m.carbs, protein: acc.protein + m.protein, fat: acc.fat + m.fat };
        }, { kcal: 0, carbs: 0, protein: 0, fat: 0 });
    }, [ingredients]);

    const buildSnapshot = useCallback(() => ({
        name: name.trim() || 'Sin nombre',
        description: description.trim(),
        source_recipe_id: currentSourceRecipeId,
        ingredients,
    }), [name, description, ingredients, currentSourceRecipeId]);

    // Keep a ref to the latest snapshot builder + onChange so we can flush on unmount
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const buildSnapshotRef = useRef(buildSnapshot);
    buildSnapshotRef.current = buildSnapshot;
    const hasPendingChange = useRef(false);

    // Auto-sync with parent (debounced)
    useEffect(() => {
        if (!onChange) return;
        hasPendingChange.current = true;
        const timer = setTimeout(() => {
            onChange(buildSnapshot());
            hasPendingChange.current = false;
        }, 500);
        return () => clearTimeout(timer);
    }, [name, description, ingredients, onChange, buildSnapshot]);

    // Flush pending changes on unmount OR when user switches browser tab
    useEffect(() => {
        const flushIfPending = () => {
            if (hasPendingChange.current && onChangeRef.current) {
                onChangeRef.current(buildSnapshotRef.current());
                hasPendingChange.current = false;
            }
        };
        const handleVisibility = () => {
            if (document.hidden) flushIfPending();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            flushIfPending();
        };
    }, []);

    const handleSaveAsRecipe = () => {
        onSaveAsRecipe(buildSnapshot());
        showSuccessMessage('copied');
    };

    const handleUpdateRecipe = () => {
        if (onUpdateRecipe && currentSourceRecipeId) {
            onUpdateRecipe(buildSnapshot());
            showSuccessMessage('updated');
        }
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            const tag = e.target.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;
            e.preventDefault();
            e.stopPropagation();
            if (e.shiftKey) {
                if (canRedoIngredients) redoIngredients();
            } else {
                if (canUndoIngredients) undoIngredients();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            const tag = e.target.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;
            e.preventDefault();
            e.stopPropagation();
            if (canRedoIngredients) redoIngredients();
        }
    };

    return (
        <div
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 w-full mt-2 mb-4 overflow-hidden shadow-sm relative group/editor focus:outline-none focus:ring-1 focus:ring-primary-500/50"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            onClick={(e) => {
                if (e.target === e.currentTarget || !e.currentTarget.contains(document.activeElement)) {
                    e.currentTarget.focus();
                }
            }}
        >
            {/* Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 relative z-20">
                <div className="flex items-center justify-between">
                    <input
                        type="text"
                        value={name}
                        onChange={e => {
                            setName(e.target.value);
                            setShowRecipeDropdown(true);
                        }}
                        onFocus={() => setShowRecipeDropdown(true)}
                        onBlur={() => setTimeout(() => setShowRecipeDropdown(false), 200)}
                        placeholder="Nombre de la receta (escribe para buscar)..."
                        className="text-base font-bold text-slate-800 dark:text-white bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-primary-500 outline-none flex-1 mr-3"
                    />
                </div>
                {showRecipeDropdown && activeRecipeResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto w-full">
                        <div className="p-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0">
                            Recetas guardadas:
                        </div>
                        {activeRecipeResults.map(r => (
                            <button
                                key={r.id}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // prevent blur from firing before onClick/onMouseDown
                                    handleSelectRecipe(r);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                            >
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{r.name}</div>
                                {r.description && <div className="text-xs text-slate-500 truncate">{r.description}</div>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Totals bar */}
            <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">MACROS TOTALES</span>
                <div className="flex gap-4 text-xs font-bold">
                    <span className="text-orange-600">{Math.round(totalMacros.kcal)} kcal</span>
                    <span className="text-amber-600">{totalMacros.carbs.toFixed(1)}g HC</span>
                    <span className="text-blue-600">{totalMacros.protein.toFixed(1)}g Prot</span>
                    <span className="text-rose-600">{totalMacros.fat.toFixed(1)}g G</span>
                </div>
            </div>

            {/* 2-Column Layout */}
            <div className="flex flex-col md:flex-row">

                {/* Left Col: Ingredients */}
                <div className="flex-1 p-3 border-r border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">Ingredientes</h4>
                    <div className="space-y-2">
                        {ingredients.length === 0 && !showFoodSearch && (
                            <p className="text-sm text-slate-400 text-center py-4">Añade ingredientes a esta receta</p>
                        )}

                        {ingredients.length > 0 && (
                            <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={ingredients.map(i => i.unique_id)} strategy={verticalListSortingStrategy}>
                                    {ingredients.map((ing, idx) => {
                                        const m = calcIngMacros(ing);
                                        return (
                                            <SortableIngredient key={ing.unique_id} id={ing.unique_id}>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    {editingIngredientIdx === idx ? (
                                                        <div className="relative">
                                                            <div className="flex items-center">
                                                                <Search className="absolute left-2 text-slate-400" size={12} />
                                                                <input
                                                                    type="text"
                                                                    value={foodSearch}
                                                                    onChange={e => setFoodSearch(e.target.value)}
                                                                    onKeyDown={e => handleFoodSearchKeyDown(e, true, ing.unique_id, idx)}
                                                                    placeholder="Buscar nuevo alimento..."
                                                                    className="w-full pl-6 pr-6 py-1 text-xs border border-primary-300 rounded-md dark:bg-slate-700 dark:border-primary-600 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => { setEditingIngredientIdx(null); setFoodSearch(''); }} className="absolute right-2 text-slate-400 hover:text-slate-600">
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                            {foodSearch.trim() && (
                                                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                                    {foodResults.map((f, i) => (
                                                                        <button
                                                                            key={f.id}
                                                                            id={`food-search-item-${i}`}
                                                                            type="button"
                                                                            onClick={() => replaceIngredientFood(ing.unique_id, f)}
                                                                            className={`w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 block truncate ${foodNavIndex === i ? 'bg-slate-100 dark:bg-slate-600' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                                        >
                                                                            {f.name}
                                                                        </button>
                                                                    ))}
                                                                    {foodResults.length === 0 && foodSearch.trim() && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const customFood = { id: `custom_${crypto.randomUUID()}`, name: foodSearch.trim(), kcal_per_100g: 0, carbs_per_100g: 0, protein_per_100g: 0, fat_per_100g: 0 };
                                                                                replaceIngredientFood(ing.unique_id, customFood);
                                                                            }}
                                                                            className="w-full text-left px-2 py-1.5 text-xs text-primary-600 dark:text-primary-400 block truncate hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                                                                        >
                                                                            + Usar "{foodSearch}" como nuevo
                                                                        </button>
                                                                    )}
                                                                    {foodResults.length === 0 && !foodSearch.trim() && (
                                                                        <div className="px-2 py-1.5 text-xs text-slate-500">Sin resultados</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span
                                                            tabIndex={0}
                                                            className={`text-sm font-medium truncate block cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors focus:outline-none focus:text-primary-600 ${ing.kcal_per_100g === 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}
                                                            onClick={() => {
                                                                setEditingIngredientIdx(idx);
                                                                setFoodSearch('');
                                                            }}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    setEditingIngredientIdx(idx);
                                                                    setFoodSearch('');
                                                                }
                                                            }}
                                                            title="Haz clic para cambiar este alimento"
                                                        >
                                                            {ing.food_name}
                                                        </span>
                                                    )}
                                                    <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                                                        <span className={ing.kcal_per_100g === 0 ? "text-red-500 font-bold" : "text-orange-500"}>{Math.round(m.kcal)} kcal</span>
                                                        <span className="text-amber-500">{m.carbs.toFixed(1)}g HC</span>
                                                        <span className="text-blue-500">{m.protein.toFixed(1)}g P</span>
                                                        <span className="text-rose-500">{m.fat.toFixed(1)}g G</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={ing.quantity_grams}
                                                        onChange={e => updateQty(ing.unique_id, e.target.value)}
                                                        onWheel={(e) => e.target.blur()}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const inputs = Array.from(document.querySelectorAll('.ingredient-qty-input'));
                                                                const currentIndex = inputs.indexOf(e.target);
                                                                if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                                                    inputs[currentIndex + 1].focus();
                                                                } else {
                                                                    setShowFoodSearch(true);
                                                                    setTimeout(() => document.getElementById('new-ingredient-search')?.focus(), 50);
                                                                }
                                                            }
                                                        }}
                                                        className="ingredient-qty-input w-14 text-center text-sm border border-slate-200 rounded-lg py-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none focus:border-primary-500"
                                                        min="0"
                                                        step="0.1"
                                                    />
                                                    <span className="text-xs text-slate-400">g</span>
                                                    <button type="button" onClick={() => removeIngredient(ing.unique_id)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </SortableIngredient>
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>
                        )}

                        {/* Add ingredient form inside Column */}
                        {showFoodSearch ? (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-2">
                                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            id="new-ingredient-search"
                                            type="text"
                                            value={foodSearch}
                                            onChange={e => setFoodSearch(e.target.value)}
                                            onKeyDown={e => handleFoodSearchKeyDown(e, false, null, -1)}
                                            placeholder="Buscar alimento..."
                                            className="w-full pl-7 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:border-primary-500"
                                            autoFocus
                                        />
                                        <button onClick={() => { setShowFoodSearch(false); setFoodSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                    {foodResults.map((f, i) => (
                                        <button
                                            key={f.id}
                                            id={`food-search-item-${i}`}
                                            onClick={() => addIngredient(f)}
                                            className={`w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 flex items-center justify-between ${foodNavIndex === i ? 'bg-slate-100 dark:bg-slate-600' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                        >
                                            <span>{f.name}</span>
                                            <span className="text-[10px] text-orange-400">{f.kcal_per_100g} kcal/100g</span>
                                        </button>
                                    ))}
                                    {foodResults.length === 0 && foodSearch.trim() && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const customFood = { id: `custom_${crypto.randomUUID()}`, name: foodSearch.trim(), kcal_per_100g: 0, carbs_per_100g: 0, protein_per_100g: 0, fat_per_100g: 0 };
                                                addIngredient(customFood);
                                            }}
                                            className="w-full text-left px-3 py-3 text-sm text-primary-600 dark:text-primary-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            + Añadir "{foodSearch}" como nuevo
                                        </button>
                                    )}
                                    {foodResults.length === 0 && !foodSearch.trim() && (
                                        <div className="px-3 py-4 text-center text-sm text-slate-400">Sin resultados</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowFoodSearch(true)}
                                className="w-full py-1.5 mt-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-400 hover:border-primary-300 hover:text-primary-500 transition-all flex items-center justify-center gap-1"
                            >
                                <Plus size={14} /> Añadir ingrediente
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Col: Description */}
                <div className="w-full md:w-1/3 p-3 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Descripción / Preparación</h4>
                        {recipePhrases?.length > 0 && (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={phraseSearch}
                                    onChange={e => { setPhraseSearch(e.target.value); setShowPhraseSearch(true); }}
                                    onFocus={() => setShowPhraseSearch(true)}
                                    placeholder="Buscar frase..."
                                    className="text-xs py-0.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-36 focus:ring-1 focus:ring-primary-500 dark:text-white"
                                />
                                {showPhraseSearch && phraseResults.length > 0 && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowPhraseSearch(false)} />
                                        <div className="absolute right-0 z-20 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                            {phraseResults.map(phrase => (
                                            <button
                                                key={phrase.id}
                                                type="button"
                                                onClick={() => {
                                                    setDescription(prev => prev ? `${prev}\n\n${phrase.content}` : phrase.content);
                                                    setPhraseSearch('');
                                                    setShowPhraseSearch(false);
                                                }}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 truncate"
                                            >
                                                {phrase.name}
                                            </button>
                                        ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Instrucciones de preparación o notas para esta receta..."
                        className="w-full flex-1 min-h-[100px] p-2 text-sm border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
                <div className="flex flex-wrap gap-2 relative">
                    {currentSourceRecipeId && onUpdateRecipe ? (
                        <button
                            onClick={handleUpdateRecipe}
                            disabled={statusMsg !== ''}
                            className={`flex items-center justify-center min-w-[190px] gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${statusMsg === 'updated' ? 'bg-emerald-500 border-emerald-500 text-white dark:bg-emerald-600 dark:border-emerald-600' : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/40'}`}
                            title="Sobrescribir la receta original en la base de datos"
                        >
                            {statusMsg === 'updated' ? <><CheckCircle2 size={14} /> ¡Actualizada!</> : <><Save size={14} /> Actualizar receta maestra</>}
                        </button>
                    ) : null}

                    <button
                        onClick={handleSaveAsRecipe}
                        disabled={statusMsg !== ''}
                        className={`flex items-center justify-center min-w-[200px] gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-lg border ${statusMsg === 'copied' ? 'bg-purple-500 border-purple-500 text-white dark:bg-purple-600 dark:border-purple-600' : 'text-purple-600 border-transparent hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20'}`}
                        title="Guardar en la base de datos como nueva receta independiente"
                    >
                        {statusMsg === 'copied' ? <><CheckCircle2 size={14} /> ¡Guardado como copia!</> : <><BookmarkPlus size={14} /> Guardar como copia nueva</>}
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-5 py-1.5 text-xs text-white bg-slate-800 hover:bg-slate-900 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 font-medium transition-colors">
                        Cerrar panel
                    </button>
                </div>
            </div>
        </div>
    );
}
