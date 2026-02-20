import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Apple, Upload } from 'lucide-react';
import { useData } from '../../context/DataContext';
import FoodModal, { ALL_TAGS } from './FoodModal';
import CsvImportModal from '../CsvImportModal';

export default function Foods() {
    const { foods = [], addFood, updateFood, deleteFood } = useData();
    const [search, setSearch] = useState('');
    const [activeTagFilters, setActiveTagFilters] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFood, setEditingFood] = useState(null);
    const [isCsvOpen, setIsCsvOpen] = useState(false);

    const toggleTagFilter = (tagId) => {
        setActiveTagFilters(prev =>
            prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
        );
    };

    const filteredFoods = useMemo(() => {
        return foods.filter(food => {
            if (!food.is_active) return false;
            const matchesSearch = !search || food.name.toLowerCase().includes(search.toLowerCase());
            const matchesTags = activeTagFilters.length === 0 || activeTagFilters.every(tag => food.tags?.includes(tag));
            return matchesSearch && matchesTags;
        });
    }, [foods, search, activeTagFilters]);

    const handleSave = async (data) => {
        if (editingFood) {
            await updateFood(editingFood.id, data);
        } else {
            await addFood(data);
        }
    };

    const handleDelete = (food) => {
        if (window.confirm(`¿Eliminar "${food.name}"?`)) {
            deleteFood(food.id);
        }
    };

    const handleEdit = (food) => {
        setEditingFood(food);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingFood(null);
        setIsModalOpen(true);
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2.5 rounded-xl dark:bg-green-900/30">
                            <Apple className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Alimentos</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{filteredFoods.length} alimentos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsCsvOpen(true)} className="btn bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/40">
                            <Upload size={18} /> Importar CSV
                        </button>
                        <button onClick={handleNew} className="btn btn-primary">
                            <Plus size={18} /> Añadir alimento
                        </button>
                    </div>
                </div>
            </div>

            {/* Search + Tag Filters */}
            <div className="space-y-3 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar alimento..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    />
                </div>
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

            {/* Foods Table */}
            {filteredFoods.length === 0 ? (
                <div className="text-center py-16">
                    <Apple className="w-12 h-12 text-slate-300 mx-auto mb-3 dark:text-slate-600" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No hay alimentos</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Añade tu primer alimento para empezar</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Alimento</th>
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-orange-500 uppercase tracking-wider">Kcal</th>
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-amber-500 uppercase tracking-wider">HC</th>
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-blue-500 uppercase tracking-wider">Prot</th>
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-rose-500 uppercase tracking-wider">Grasas</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Etiquetas</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFoods.map(food => (
                                    <tr key={food.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{food.name}</td>
                                        <td className="py-3 px-3 text-right text-sm font-semibold text-orange-600">{food.kcal_per_100g}</td>
                                        <td className="py-3 px-3 text-right text-sm text-amber-600">{food.carbs_per_100g}g</td>
                                        <td className="py-3 px-3 text-right text-sm text-blue-600">{food.protein_per_100g}g</td>
                                        <td className="py-3 px-3 text-right text-sm text-rose-600">{food.fat_per_100g}g</td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(food.tags || []).map(tagId => {
                                                    const tag = ALL_TAGS.find(t => t.id === tagId);
                                                    return tag ? (
                                                        <span key={tagId} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                            {tag.label}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleEdit(food)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors dark:hover:bg-primary-900/20">
                                                    <Pencil size={15} />
                                                </button>
                                                <button onClick={() => handleDelete(food)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-red-900/20">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredFoods.map(food => (
                            <div key={food.id} className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-medium text-slate-800 dark:text-slate-200">{food.name}</h3>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(food)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(food)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center mb-2">
                                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg px-2 py-1.5">
                                        <div className="text-xs text-orange-500 font-medium">Kcal</div>
                                        <div className="text-sm font-bold text-orange-600">{food.kcal_per_100g}</div>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1.5">
                                        <div className="text-xs text-amber-500 font-medium">HC</div>
                                        <div className="text-sm font-bold text-amber-600">{food.carbs_per_100g}g</div>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-1.5">
                                        <div className="text-xs text-blue-500 font-medium">Prot</div>
                                        <div className="text-sm font-bold text-blue-600">{food.protein_per_100g}g</div>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg px-2 py-1.5">
                                        <div className="text-xs text-rose-500 font-medium">Grasas</div>
                                        <div className="text-sm font-bold text-rose-600">{food.fat_per_100g}g</div>
                                    </div>
                                </div>
                                {food.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {food.tags.map(tagId => {
                                            const tag = ALL_TAGS.find(t => t.id === tagId);
                                            return tag ? (
                                                <span key={tagId} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                    {tag.label}
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <FoodModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingFood(null); }}
                onSave={handleSave}
                initialData={editingFood}
            />

            {isCsvOpen && (
                <CsvImportModal
                    type="foods"
                    onImport={async (rows) => {
                        let count = 0;
                        for (const row of rows) {
                            await addFood(row);
                            count++;
                        }
                        return count;
                    }}
                    onClose={() => setIsCsvOpen(false)}
                />
            )}
        </div>
    );
}
