import { useState, useMemo } from 'react';
import { Plus, Search, FileText, Pencil, Trash2, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export default function Recommendations() {
    const { indicationTemplates = [], addIndicationTemplate, updateIndicationTemplate, deleteIndicationTemplate, nutritionists = [] } = useData();
    const { isAdmin, nutritionistId } = useAuth();

    const [search, setSearch] = useState('');
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Form states
    const [formData, setFormData] = useState({ name: '', content: '' });

    const filteredTemplates = useMemo(() => {
        return indicationTemplates.filter(template => {
            if (!search) return true;
            return template.name.toLowerCase().includes(search.toLowerCase()) ||
                template.content.toLowerCase().includes(search.toLowerCase());
        });
    }, [indicationTemplates, search]);

    const handleEdit = (template) => {
        setEditingTemplate(template);
        setFormData({ name: template.name, content: template.content });
        setIsEditorOpen(true);
    };

    const handleNew = () => {
        setEditingTemplate(null);
        setFormData({ name: '', content: '' });
        setIsEditorOpen(true);
    };

    const handleDelete = async (template) => {
        if (window.confirm(`¿Eliminar la recomendación "${template.name}"?`)) {
            await deleteIndicationTemplate(template.id);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (editingTemplate) {
            await updateIndicationTemplate(editingTemplate.id, formData);
        } else {
            await addIndicationTemplate(formData);
        }
        setIsEditorOpen(false);
    };

    // Helper to check if a user can edit/delete a template
    const canModify = (template) => {
        if (isAdmin) return true;
        return template.nutritionist_id === nutritionistId;
    };

    // Helper to get creator name
    const getCreatorName = (nutriId) => {
        if (!nutriId) return 'Desconocido';
        const nutri = nutritionists.find(n => n.id === nutriId);
        return nutri?.profiles?.full_name || nutriId;
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header flex justify-between items-center mb-6">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <FileText className="text-primary-600" /> Plantillas de Recomendaciones
                    </h1>
                    <p className="page-subtitle">Gestiona plantillas aplicables a tus clientes</p>
                </div>
                <button onClick={handleNew} className="btn btn-primary">
                    <Plus size={18} className="mr-2" /> Nueva Plantilla
                </button>
            </div>

            <div className="card mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar plantillas por título o contenido..."
                        className="input pl-10 w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {filteredTemplates.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No se encontraron plantillas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map(template => {
                        const hasPermission = canModify(template);
                        return (
                            <div key={template.id} className="card flex flex-col hover:border-primary-300 transition-colors">
                                <div className="card-header border-b pb-3 mb-3">
                                    <h3 className="font-bold text-lg text-slate-800 line-clamp-1" title={template.name}>{template.name}</h3>
                                    <p className="text-xs text-slate-500 mt-1">Creado por: {getCreatorName(template.nutritionist_id)}</p>
                                </div>
                                <div className="flex-1 text-sm text-slate-600 whitespace-pre-wrap line-clamp-4">
                                    {template.content}
                                </div>
                                <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className={`btn btn-sm btn-ghost ${!hasPermission && 'opacity-50 cursor-not-allowed'}`}
                                        disabled={!hasPermission}
                                        title={!hasPermission ? "No tienes permiso para editar esta plantilla" : "Editar"}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template)}
                                        className={`btn btn-sm btn-ghost text-red-600 hover:bg-red-50 ${!hasPermission && 'opacity-50 cursor-not-allowed'}`}
                                        disabled={!hasPermission}
                                        title={!hasPermission ? "No tienes permiso para borrar esta plantilla" : "Eliminar"}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Editor Modal */}
            {isEditorOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b dark:border-slate-800">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                                <FileText className="text-primary-600" />
                                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                            </h2>
                            <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="template-form" onSubmit={handleSave} className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Afección / Título <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="input"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ej: Dieta Blanda, Colon Irritable..."
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Recomendaciones <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="input min-h-[250px] resize-y"
                                        required
                                        value={formData.content}
                                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="Escribe las pautas y recomendaciones..."
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsEditorOpen(false)} className="btn btn-ghost">
                                Cancelar
                            </button>
                            <button type="submit" form="template-form" className="btn btn-primary">
                                Guardar Plantilla
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
