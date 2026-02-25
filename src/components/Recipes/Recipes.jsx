import { useState, useMemo } from 'react';
import { Plus, Search, ChefHat, Pencil, Trash2, X, ArrowLeft, Copy } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ALL_TAGS } from '../Foods/FoodModal';
import RecipeEditor from './RecipeEditor';

// Utility: calculate total macros for a recipe from its ingredients
export function calcRecipeMacros(recipe) {
    const ingredients = recipe?.recipe_ingredients || [];
    return ingredients.reduce((acc, ri) => {
        const food = ri.foods || ri.food;
        if (!food) return acc;
        const factor = (ri.quantity_grams || 0) / 100;
        return {
            kcal: acc.kcal + (food.kcal_per_100g || 0) * factor,
            carbs: acc.carbs + (food.carbs_per_100g || 0) * factor,
            protein: acc.protein + (food.protein_per_100g || 0) * factor,
            fat: acc.fat + (food.fat_per_100g || 0) * factor,
        };
    }, { kcal: 0, carbs: 0, protein: 0, fat: 0 });
}

// Utility: calculate automatic tags for a recipe based on its ingredients
export function calcRecipeTags(recipe) {
    const baseTags = recipe.tags || [];
    const ingredients = recipe?.recipe_ingredients || [];

    if (ingredients.length === 0) return baseTags;

    const tagsToAutomate = ['sin_gluten', 'sin_lacteos', 'sin_huevo', 'sin_frutos_secos', 'bajo_fodmap', 'sin_legumbres', 'vegano', 'vegetariano'];
    let commonTags = [...tagsToAutomate];

    ingredients.forEach(ri => {
        const food = ri.foods || ri.food;
        const foodTags = food?.tags || [];
        commonTags = commonTags.filter(tag => foodTags.includes(tag));
    });

    // Combine base tags with the automatic ones (avoiding duplicates)
    const finalTags = new Set([...baseTags, ...commonTags]);
    return Array.from(finalTags);
}

export default function Recipes() {
    const { recipes = [], recipeCategories = [], foods = [], addRecipe, updateRecipe, deleteRecipe, nutritionists = [] } = useData();
    const { isAdmin, nutritionistId } = useAuth();
    const [search, setSearch] = useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState(null);
    const [activeTagFilters, setActiveTagFilters] = useState([]);
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const toggleTagFilter = (tagId) => {
        setActiveTagFilters(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
    };

    const filteredRecipes = useMemo(() => {
        return recipes.filter(recipe => {
            if (!recipe.is_active) return false;
            const matchesSearch = !search || recipe.name.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = !activeCategoryFilter || (recipe.recipe_category_links || []).some(l => l.category_id === activeCategoryFilter);
            const computedTags = calcRecipeTags(recipe);
            const matchesTags = activeTagFilters.length === 0 || activeTagFilters.every(tag => computedTags.includes(tag));
            return matchesSearch && matchesCategory && matchesTags;
        });
    }, [recipes, search, activeCategoryFilter, activeTagFilters]);

    const handleSave = async (recipeData, ingredients, categoryIds) => {
        if (editingRecipe && editingRecipe.id) {
            await updateRecipe(editingRecipe.id, recipeData, ingredients, categoryIds);
        } else {
            await addRecipe(recipeData, ingredients, categoryIds);
        }
        setIsEditorOpen(false);
        setEditingRecipe(null);
    };

    const handleDelete = (recipe) => {
        if (window.confirm(`¿Eliminar la receta "${recipe.name}"?`)) {
            deleteRecipe(recipe.id);
        }
    };

    const handleEdit = (recipe) => {
        setEditingRecipe(recipe);
        setIsEditorOpen(true);
    };

    const handleNew = () => {
        setEditingRecipe(null);
        setIsEditorOpen(true);
    };

    const handleDuplicate = (recipe) => {
        // Pass a copy without the id so the editor treats it as a new item
        setEditingRecipe({ ...recipe, id: null, name: `${recipe.name} (Copia)` });
        setIsEditorOpen(true);
    };

    const canModify = (recipe) => {
        if (isAdmin) return true;
        return recipe.nutritionist_id === nutritionistId;
    };

    // Helper to get creator name
    const getCreatorName = (nutriId) => {
        if (!nutriId) return 'Desconocido';
        const nutri = nutritionists.find(n => n.id === nutriId);
        return nutri?.profiles?.full_name || nutri?.label || nutriId;
    };

    // If editor is open, show it
    if (isEditorOpen) {
        return (
            <RecipeEditor
                recipe={editingRecipe}
                onSave={handleSave}
                onCancel={() => { setIsEditorOpen(false); setEditingRecipe(null); }}
            />
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2.5 rounded-xl dark:bg-purple-900/30">
                            <ChefHat className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Recetas</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{filteredRecipes.length} recetas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleNew} className="btn btn-primary">
                            <Plus size={18} /> Nueva receta
                        </button>
                    </div>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="space-y-3 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar receta..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    />
                </div>
                {/* Category chips */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveCategoryFilter(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!activeCategoryFilter
                            ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                    >
                        Todas
                    </button>
                    {recipeCategories.filter(c => c.is_active).map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategoryFilter(activeCategoryFilter === cat.id ? null : cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${activeCategoryFilter === cat.id
                                ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
                {/* Tag chips */}
                <div className="flex flex-wrap gap-2">
                    {ALL_TAGS.map(tag => (
                        <button
                            key={tag.id}
                            onClick={() => toggleTagFilter(tag.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${activeTagFilters.includes(tag.id)
                                ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-700'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}
                        >
                            {tag.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recipe Cards */}
            {filteredRecipes.length === 0 ? (
                <div className="text-center py-16">
                    <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3 dark:text-slate-600" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No hay recetas</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Añade tu primera receta para empezar</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRecipes.map(recipe => {
                        const macros = calcRecipeMacros(recipe);
                        const categories = (recipe.recipe_category_links || []).map(l => recipeCategories.find(c => c.id === l.category_id)).filter(Boolean);
                        return (
                            <div key={recipe.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-all group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 dark:text-white" title={recipe.name}>{recipe.name}</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Creador: {getCreatorName(recipe.nutritionist_id)}</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                        <button
                                            onClick={() => handleDuplicate(recipe)}
                                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg dark:hover:bg-emerald-900/20"
                                            title="Usar como plantilla (Duplicar)"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(recipe)}
                                            className={`p-1.5 text-slate-400 rounded-lg ${!canModify(recipe) ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}
                                            disabled={!canModify(recipe)}
                                            title={!canModify(recipe) ? "No tienes permiso para editar" : "Editar"}
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(recipe)}
                                            className={`p-1.5 text-slate-400 rounded-lg ${!canModify(recipe) ? 'opacity-30 cursor-not-allowed' : 'hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                            disabled={!canModify(recipe)}
                                            title={!canModify(recipe) ? "No tienes permiso para eliminar" : "Eliminar"}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Categories */}
                                {categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {categories.map(cat => (
                                            <span key={cat.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                                                {cat.label}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Macros */}
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg px-2 py-1.5">
                                        <div className="text-[10px] text-orange-500 font-medium">Kcal</div>
                                        <div className="text-sm font-bold text-orange-600">{Math.round(macros.kcal)}</div>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1.5">
                                        <div className="text-[10px] text-amber-500 font-medium">HC</div>
                                        <div className="text-sm font-bold text-amber-600">{macros.carbs.toFixed(1)}g</div>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-1.5">
                                        <div className="text-[10px] text-blue-500 font-medium">Prot</div>
                                        <div className="text-sm font-bold text-blue-600">{macros.protein.toFixed(1)}g</div>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg px-2 py-1.5">
                                        <div className="text-[10px] text-rose-500 font-medium">Grasas</div>
                                        <div className="text-sm font-bold text-rose-600">{macros.fat.toFixed(1)}g</div>
                                    </div>
                                </div>

                                {/* Tags */}
                                {(() => {
                                    const computedTags = calcRecipeTags(recipe);
                                    if (computedTags.length === 0) return null;
                                    return (
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {computedTags.map(tagId => {
                                                const tag = ALL_TAGS.find(t => t.id === tagId);
                                                return tag ? (
                                                    <span key={tagId} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                        {tag.label}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    );
                                })()}

                                {/* Ingredients count */}
                                <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                                    {(recipe.recipe_ingredients || []).length} ingredientes
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
