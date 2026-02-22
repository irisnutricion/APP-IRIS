import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, Copy, Search, X, Plus, Trash2, GripVertical } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableIngredient({ id, children }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm group relative">
            <div {...attributes} {...listeners} className="absolute -left-6 top-1/2 -translate-y-1/2 p-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={14} />
            </div>
            {children}
        </div>
    );
}
import { ALL_TAGS } from '../Foods/FoodModal';

export default function RecipeEditor({ recipe, onSave, onCancel }) {
    const { foods = [], recipeCategories = [] } = useData();

    const [form, setForm] = useState({
        name: '',
        description: '',
        tags: [],
    });
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [foodSearch, setFoodSearch] = useState('');
    const [editingIngredientId, setEditingIngredientId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setIngredients((items) => {
                const oldIndex = items.findIndex(i => i.food_id === active.id);
                const newIndex = items.findIndex(i => i.food_id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const [showFoodSearch, setShowFoodSearch] = useState(false);
    const [saving, setSaving] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (recipe) {
            setForm({
                name: recipe.name || '',
                description: recipe.description || '',
                tags: recipe.tags || [],
            });
            setSelectedCategories((recipe.recipe_category_links || []).map(l => l.category_id));
            setIngredients((recipe.recipe_ingredients || []).map(ri => ({
                food_id: ri.food_id,
                food: ri.foods || ri.food,
                quantity_grams: ri.quantity_grams || 100,
            })));
        }
    }, [recipe]);

    // Food search results
    const foodResults = useMemo(() => {
        if (!foodSearch.trim()) return [];
        const q = foodSearch.toLowerCase();
        return foods
            .filter(f => f.is_active && f.name.toLowerCase().includes(q))
            .filter(f => !ingredients.some(i => i.food_id === f.id))
            .slice(0, 8);
    }, [foodSearch, foods, ingredients]);

    // Calculate total macros
    const totalMacros = useMemo(() => {
        return ingredients.reduce((acc, ing) => {
            const food = ing.food;
            if (!food) return acc;
            const factor = (ing.quantity_grams || 0) / 100;
            return {
                kcal: acc.kcal + (food.kcal_per_100g || 0) * factor,
                carbs: acc.carbs + (food.carbs_per_100g || 0) * factor,
                protein: acc.protein + (food.protein_per_100g || 0) * factor,
                fat: acc.fat + (food.fat_per_100g || 0) * factor,
            };
        }, { kcal: 0, carbs: 0, protein: 0, fat: 0 });
    }, [ingredients]);

    // Auto-calculate tags based on ingredients
    useEffect(() => {
        if (ingredients.length === 0) return;

        const tagsToAutomate = ['sin_gluten', 'sin_lacteos', 'sin_huevo', 'sin_frutos_secos', 'bajo_fodmap', 'sin_legumbres', 'vegano', 'vegetariano'];
        let commonTags = [...tagsToAutomate];

        ingredients.forEach(ing => {
            const foodTags = ing.food?.tags || [];
            commonTags = commonTags.filter(tag => foodTags.includes(tag));
        });

        setForm(prev => {
            const newTags = new Set(prev.tags || []);
            let changed = false;

            tagsToAutomate.forEach(tag => {
                const hasTag = newTags.has(tag);
                const shouldHaveTag = commonTags.includes(tag);

                if (shouldHaveTag && !hasTag) {
                    newTags.add(tag);
                    changed = true;
                } else if (!shouldHaveTag && hasTag) {
                    newTags.delete(tag);
                    changed = true;
                }
            });

            if (changed) {
                return { ...prev, tags: Array.from(newTags) };
            }
            return prev;
        });
    }, [ingredients]);

    const toggleCategory = (catId) => {
        setSelectedCategories(prev =>
            prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        );
    };

    const toggleTag = (tagId) => {
        setForm(prev => ({
            ...prev,
            tags: prev.tags.includes(tagId) ? prev.tags.filter(t => t !== tagId) : [...prev.tags, tagId],
        }));
    };

    const addIngredient = (food) => {
        setIngredients(prev => [...prev, { food_id: food.id, food, quantity_grams: '' }]);
        setFoodSearch('');
        setShowFoodSearch(false);
    };

    const updateIngredientQty = (foodId, qty) => {
        setIngredients(prev => prev.map(i => i.food_id === foodId ? { ...i, quantity_grams: qty === '' ? '' : (parseFloat(qty) || 0) } : i));
    };

    const replaceIngredientFood = (oldFoodId, newFood) => {
        setIngredients(prev => prev.map(i => i.food_id === oldFoodId ? {
            ...i,
            food_id: newFood.id,
            food: newFood,
        } : i));
        setEditingIngredientId(null);
        setFoodSearch('');
    };

    const removeIngredient = (foodId) => {
        setIngredients(prev => prev.filter(i => i.food_id !== foodId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            await onSave(
                form,
                ingredients.map(i => ({ food_id: i.food_id, quantity_grams: i.quantity_grams })),
                selectedCategories
            );
        } catch (err) {
            console.error('Error saving recipe:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl dark:hover:bg-slate-800 dark:hover:text-slate-300">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {recipe ? 'Editar receta' : 'Nueva receta'}
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
                {/* Basic Info */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Información básica</h2>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                            placeholder="Ej: Pollo con verduras al horno"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                            placeholder="Descripción breve de la receta..."
                            rows={2}
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 dark:text-slate-400">Categorías</h2>
                    <div className="flex flex-wrap gap-2">
                        {recipeCategories.filter(c => c.is_active).map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedCategories.includes(cat.id)
                                    ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tags */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 dark:text-slate-400">Etiquetas</h2>
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

                {/* Ingredients */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                            Ingredientes ({ingredients.length})
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowFoodSearch(!showFoodSearch)}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                            <Plus size={14} /> Añadir ingrediente
                        </button>
                    </div>

                    {/* Food search */}
                    {showFoodSearch && (
                        <div className="mb-4 relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={foodSearch}
                                    onChange={e => setFoodSearch(e.target.value)}
                                    placeholder="Buscar alimento..."
                                    className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                                    autoFocus
                                />
                                <button type="button" onClick={() => { setShowFoodSearch(false); setFoodSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={16} />
                                </button>
                            </div>
                            {foodResults.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {foodResults.map(food => (
                                        <button
                                            key={food.id}
                                            type="button"
                                            onClick={() => addIngredient(food)}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-sm"
                                        >
                                            <span className="text-slate-800 dark:text-slate-200">{food.name}</span>
                                            <span className="text-xs text-slate-400">
                                                {food.kcal_per_100g} kcal/100g
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ingredient list */}
                    {ingredients.length === 0 ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
                            Aún no hay ingredientes. Usa el botón "Añadir ingrediente".
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {/* Header row */}
                            <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                                <div className="col-span-4">Alimento</div>
                                <div className="col-span-2 text-center">Cantidad</div>
                                <div className="col-span-1 text-right text-orange-500">Kcal</div>
                                <div className="col-span-1 text-right text-amber-500">HC</div>
                                <div className="col-span-1 text-right text-blue-500">Prot</div>
                                <div className="col-span-1 text-right text-rose-500">Grasas</div>
                                <div className="col-span-2"></div>
                            </div>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={ingredients.map(i => i.food_id)} strategy={verticalListSortingStrategy}>
                                    {ingredients.map(ing => {
                                        const food = ing.food;
                                        const factor = (ing.quantity_grams || 0) / 100;
                                        return (
                                            <SortableIngredient key={ing.food_id} id={ing.food_id}>
                                                <div className="col-span-4 font-medium text-slate-700 dark:text-slate-300 truncate">
                                                    {editingIngredientId === ing.food_id ? (
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
                                                                <button onClick={() => { setEditingIngredientId(null); setFoodSearch(''); }} className="absolute right-2 text-slate-400 hover:text-slate-600">
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                            {foodSearch.trim() && (
                                                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                                    {availableFoods.map(f => (
                                                                        <button
                                                                            key={f.id}
                                                                            onClick={() => replaceIngredientFood(ing.food_id, f)}
                                                                            className="w-full text-left px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 block truncate"
                                                                        >
                                                                            {f.name}
                                                                        </button>
                                                                    ))}
                                                                    {availableFoods.length === 0 && (
                                                                        <div className="px-2 py-1.5 text-xs text-slate-500">Sin resultados</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className="cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 block truncate transition-colors"
                                                            onClick={() => {
                                                                setEditingIngredientId(ing.food_id);
                                                                setFoodSearch('');
                                                            }}
                                                            title="Haz clic para cambiar este alimento"
                                                        >
                                                            {food?.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="col-span-2 flex items-center justify-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={ing.quantity_grams}
                                                        onChange={e => updateIngredientQty(ing.food_id, e.target.value)}
                                                        min="0"
                                                        step="5"
                                                        className="w-16 px-1.5 py-1 border border-slate-300 rounded text-center text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                                    />
                                                    <span className="text-xs text-slate-400">g</span>
                                                </div>
                                                <div className="col-span-1 text-right text-xs font-semibold text-orange-600">
                                                    {Math.round((food?.kcal_per_100g || 0) * factor)}
                                                </div>
                                                <div className="col-span-1 text-right text-xs text-amber-600">
                                                    {((food?.carbs_per_100g || 0) * factor).toFixed(1)}
                                                </div>
                                                <div className="col-span-1 text-right text-xs text-blue-600">
                                                    {((food?.protein_per_100g || 0) * factor).toFixed(1)}
                                                </div>
                                                <div className="col-span-1 text-right text-xs text-rose-600">
                                                    {((food?.fat_per_100g || 0) * factor).toFixed(1)}
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    <button type="button" onClick={() => removeIngredient(ing.food_id)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </SortableIngredient>
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>

                            {/* Total */}
                            <div className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-sm border-t-2 border-slate-200 dark:border-slate-700">
                                <div className="col-span-4 text-slate-600 dark:text-slate-300">TOTAL</div>
                                <div className="col-span-2"></div>
                                <div className="col-span-1 text-right text-orange-600">{Math.round(totalMacros.kcal)}</div>
                                <div className="col-span-1 text-right text-amber-600">{totalMacros.carbs.toFixed(1)}</div>
                                <div className="col-span-1 text-right text-blue-600">{totalMacros.protein.toFixed(1)}</div>
                                <div className="col-span-1 text-right text-rose-600">{totalMacros.fat.toFixed(1)}</div>
                                <div className="col-span-2"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                        Cancelar
                    </button>
                    <button type="submit" disabled={saving || !form.name.trim()} className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {saving ? 'Guardando...' : (recipe ? 'Guardar cambios' : 'Crear receta')}
                    </button>
                </div>
            </form>
        </div>
    );
}
