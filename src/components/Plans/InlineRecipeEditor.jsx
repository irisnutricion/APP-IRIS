import { useState, useMemo, useId } from 'react';
import { Search, X, Trash2, GripVertical, Plus, BookmarkPlus, Save } from 'lucide-react';
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
 *   onAccept(snapshot) — devuelve el snapshot editado al plan
 *   onSaveAsRecipe(snapshot) — guarda como nueva receta en DB
 *   onClose() — cierra sin cambios
 */
export default function InlineRecipeEditor({ snapshot, onAccept, onSaveAsRecipe, onClose }) {
    const { foods = [] } = useData();

    const initial = snapshot || { name: '', description: '', source_recipe_id: null, ingredients: [] };
    const [name, setName] = useState(snapshot?.name || '');
    const [description, setDescription] = useState(snapshot?.description || '');
    const [ingredients, setIngredients] = useState(() => {
        const initialIngs = snapshot?.ingredients || [];
        return initialIngs.map(ing => ({ ...ing, unique_id: ing.unique_id || crypto.randomUUID() }));
    });
    const [foodSearch, setFoodSearch] = useState('');
    const [showFoodSearch, setShowFoodSearch] = useState(false);
    const [editingIngredientIdx, setEditingIngredientIdx] = useState(null);
    const dndId = useId();

    const foodResults = useMemo(() => {
        if (!foodSearch.trim()) return foods.slice(0, 12);
        const q = foodSearch.toLowerCase();
        return foods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 12);
    }, [foodSearch, foods]);

    const addIngredient = (food) => {
        // Don't add if already in list
        if (ingredients.some(i => i.food_id === food.id)) return;
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
        setFoodSearch('');
        setShowFoodSearch(false);
    };

    const updateQty = (id, qty) => {
        setIngredients(prev => prev.map(ing => ing.unique_id === id ? { ...ing, quantity_grams: qty } : ing));
    };

    const replaceIngredientFood = (id, newFood) => {
        setIngredients(prev => prev.map(ing => ing.unique_id === id ? {
            ...ing,
            food_id: newFood.id,
            food_name: newFood.name,
            kcal_per_100g: newFood.kcal_per_100g,
            carbs: newFood.carbs_per_100g,
            protein: newFood.protein_per_100g,
            fat: newFood.fat_per_100g
        } : ing));
        setEditingIngredientIdx(null);
        setFoodSearch('');
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

    const buildSnapshot = () => ({
        name: name.trim() || 'Sin nombre',
        description: description.trim(),
        source_recipe_id: initial.source_recipe_id || null,
        ingredients,
    });

    const handleAccept = () => {
        onAccept(buildSnapshot());
    };

    const handleSaveAsRecipe = () => {
        onSaveAsRecipe(buildSnapshot());
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 w-full mt-2 mb-4 overflow-hidden shadow-sm relative group/editor">
            {/* Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nombre de la receta..."
                    className="text-base font-bold text-slate-800 dark:text-white bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-primary-500 outline-none flex-1 mr-3"
                />
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
                                                                    {foodResults.map(f => (
                                                                        <button
                                                                            key={f.id}
                                                                            type="button"
                                                                            onClick={() => replaceIngredientFood(ing.unique_id, f)}
                                                                            className="w-full text-left px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 block truncate"
                                                                        >
                                                                            {f.name}
                                                                        </button>
                                                                    ))}
                                                                    {foodResults.length === 0 && (
                                                                        <div className="px-2 py-1.5 text-xs text-slate-500">Sin resultados</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate block cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                                            onClick={() => {
                                                                setEditingIngredientIdx(idx);
                                                                setFoodSearch('');
                                                            }}
                                                            title="Haz clic para cambiar este alimento"
                                                        >
                                                            {ing.food_name}
                                                        </span>
                                                    )}
                                                    <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                                                        <span className="text-orange-500">{Math.round(m.kcal)} kcal</span>
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
                                                        className="w-14 text-center text-sm border border-slate-200 rounded-lg py-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
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
                                            type="text"
                                            value={foodSearch}
                                            onChange={e => setFoodSearch(e.target.value)}
                                            placeholder="Buscar alimento..."
                                            className="w-full pl-7 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            autoFocus
                                        />
                                        <button onClick={() => { setShowFoodSearch(false); setFoodSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                    {foodResults.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => addIngredient(f)}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 flex items-center justify-between"
                                        >
                                            <span>{f.name}</span>
                                            <span className="text-[10px] text-orange-400">{f.kcal_per_100g} kcal/100g</span>
                                        </button>
                                    ))}
                                    {foodResults.length === 0 && (
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
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">Descripción / Preparación</h4>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Instrucciones de preparación o notas para esta receta..."
                        className="w-full flex-1 min-h-[100px] p-2 text-sm border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
                <button
                    onClick={handleSaveAsRecipe}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors dark:text-purple-400 dark:hover:bg-purple-900/20"
                    title="Guardar en la base de datos como nueva receta"
                >
                    <BookmarkPlus size={14} /> Guardar como receta maestra
                </button>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800 font-medium">
                        Cerrar panel
                    </button>
                    <button onClick={handleAccept} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                        <Save size={14} /> Guardar cambios del plan
                    </button>
                </div>
            </div>
        </div>
    );
}
