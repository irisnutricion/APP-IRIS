import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { CheckSquare, Square, Trash2, Plus, Tag, Filter, Calendar as CalendarIcon, List } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const Tasks = () => {
    const { tasks, addTask, updateTask, deleteTask, taskCategories, taskTypes, addTaskType } = useData();
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTag, setSelectedTag] = useState('hawk');
    const [selectedType, setSelectedType] = useState('general');
    const [dueDate, setDueDate] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [filter, setFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [tagFilter, setTagFilter] = useState('all');
    const [isAddingType, setIsAddingType] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');

    const handleAddTask = (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        addTask({
            title: newTaskTitle,
            tag: selectedTag,
            type: selectedType,
            dueDate: dueDate || null
        });
        setNewTaskTitle('');
        setDueDate('');
    };

    const handleAddNewType = async () => {
        if (!newTypeName.trim()) return;
        const id = newTypeName.toLowerCase().trim().replace(/\s+/g, '_');

        const existing = taskTypes.find(t => t.id === id);
        if (existing) {
            setSelectedType(id);
            setNewTypeName('');
            setIsAddingType(false);
            return;
        }

        await addTaskType({ id, label: newTypeName.trim() });
        setNewTypeName('');
        setIsAddingType(false);
        setSelectedType(id);
    };

    const handleToggle = (task) => {
        updateTask(task.id, { completed: !task.completed });
    };

    const filteredTasks = tasks.filter(task => {
        // Status Filter
        if (filter === 'pending' && task.completed) return false;
        if (filter === 'completed' && !task.completed) return false;

        // Type Filter
        const typeId = task.type_id || task.type;
        if (typeFilter !== 'all' && typeId !== typeFilter) return false;

        // Tag Filter
        const tagId = task.tag_id || task.tag;
        if (tagFilter !== 'all' && tagId !== tagFilter) return false;

        return true;
    }).sort((a, b) => {
        // Sort: Pending first, then by date
        if (a.completed === b.completed) {
            const dateA = new Date(a.created_at || a.createdAt || 0);
            const dateB = new Date(b.created_at || b.createdAt || 0);
            return dateB - dateA;
        }
        return a.completed ? 1 : -1;
    });

    const activeCount = tasks.filter(t => !t.completed).length;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title dark:text-white">Mis Tareas</h1>
                    <p className="page-subtitle dark:text-slate-400">Organiza tu día a día</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">

                {/* Task Input Card */}
                <div className="card lg:col-span-1 h-fit">
                    <div className="card-header">
                        <h3 className="card-title text-primary dark:text-primary-400">Nueva Tarea</h3>
                    </div>
                    <form onSubmit={handleAddTask} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Título</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej. Llamar a Laura..."
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Fecha Límite (Opcional)</label>
                            <input
                                type="date"
                                className="form-input"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Tipo de Tarea</label>
                            <div className="flex flex-wrap gap-2">
                                {taskTypes.map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setSelectedType(type.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                                            ${selectedType === type.id ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
                                        `}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                                {!isAddingType ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingType(true)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Otro
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 animate-fade-in">
                                        <input
                                            type="text"
                                            value={newTypeName}
                                            onChange={(e) => setNewTypeName(e.target.value)}
                                            className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded focus:border-primary-500 outline-none w-24 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            placeholder="Nombre..."
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddNewType();
                                                }
                                                if (e.key === 'Escape') setIsAddingType(false);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddNewType}
                                            disabled={!newTypeName.trim()}
                                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                        >
                                            <CheckSquare size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingType(false)}
                                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        >
                                            <Trash2 size={16} className="rotate-45" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Etiqueta</label>
                            <div className="flex flex-wrap gap-2">
                                {taskCategories.map(category => (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => setSelectedTag(category.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2
                                            ${selectedTag === category.id ? 'border-primary-500 ring-1 ring-primary-200' : 'border-transparent'}
                                            ${category.color}
                                        `}
                                    >
                                        {category.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full justify-center"
                            disabled={!newTaskTitle.trim()}
                        >
                            <Plus size={18} /> Añadir Tarea
                        </button>
                    </form>
                </div>

                {/* Task List/Calendar */}
                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-700 pb-4 flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="card-title dark:text-white">Agenda</h3>
                            <span className="badge badge-primary">{activeCount} pendientes</span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* View Toggle */}
                            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    title="Vista Lista"
                                >
                                    <List size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    title="Vista Calendario"
                                >
                                    <CalendarIcon size={18} />
                                </button>
                            </div>

                            {/* Additional Filters: Type & Tag (Only in List Mode) */}
                            {viewMode === 'list' && (
                                <div className="flex gap-2">
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="form-select text-xs py-1.5 pl-2 pr-6 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                                    >
                                        <option value="all">Tipos</option>
                                        {taskTypes.map(type => (
                                            <option key={type.id} value={type.id}>{type.label}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={tagFilter}
                                        onChange={(e) => setTagFilter(e.target.value)}
                                        className="form-select text-xs py-1.5 pl-2 pr-6 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                                    >
                                        <option value="all">Etiquetas</option>
                                        {taskCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Filters (Only for List View usually, but can keep) */}
                            {viewMode === 'list' && (
                                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${filter === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                        Todas
                                    </button>
                                    <button
                                        onClick={() => setFilter('pending')}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${filter === 'pending' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                        Pendientes
                                    </button>
                                    <button
                                        onClick={() => setFilter('completed')}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${filter === 'completed' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                        Hechas
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {viewMode === 'calendar' ? (
                        <TaskCalendar tasks={tasks} />
                    ) : (
                        <div className="space-y-2">
                            {filteredTasks.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                    <CheckSquare size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>No hay tareas en esta vista.</p>
                                </div>
                            ) : filteredTasks.map(task => {
                                // Support both DB columns and legacy/local state properties
                                const tagId = task.tag_id || task.tag;
                                const typeId = task.type_id || task.type;
                                const createdAt = task.created_at || task.createdAt;

                                const category = taskCategories.find(c => c.id === tagId);
                                const tagStyle = category?.color || 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
                                const tagLabel = category?.label || 'General';

                                const typeLabel = taskTypes.find(t => t.id === typeId)?.label || 'General';

                                return (
                                    <div
                                        key={task.id}
                                        className={`group flex items-center p-3 rounded-lg border transition-all
                                        ${task.completed ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-200 hover:shadow-sm'}
                                    `}
                                    >
                                        <button
                                            onClick={() => handleToggle(task)}
                                            className={`mr-4 transition-colors ${task.completed ? 'text-green-500' : 'text-slate-300 hover:text-primary-500 dark:text-slate-600 dark:hover:text-primary-400'}`}
                                        >
                                            {task.completed ? <CheckSquare size={22} /> : <Square size={22} />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate transition-all ${task.completed ? 'text-slate-400 dark:text-slate-600 line-through decoration-slate-300 dark:decoration-slate-600' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {task.title}
                                            </p>

                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                                    {typeLabel}
                                                </span>
                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${tagStyle}`}>
                                                    {tagLabel}
                                                </span>
                                                {task.dueDate && (
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                        <CalendarIcon size={10} /> {format(parseISO(task.dueDate), 'dd/MM')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className="ml-2 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            title="Eliminar tarea"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div >
            </div >
        </div >
    );
};

const TaskCalendar = ({ tasks }) => {
    const today = new Date();
    const start = startOfWeek(today, { locale: es, weekStartsOn: 1 });
    const end = endOfWeek(today, { locale: es, weekStartsOn: 1 });
    // Show 2 weeks for better context? Or just 1 week? User asked for calendar view. 
    // Let's do a simple month view or weekly view. Let's do Month View logic actually, or simplify to just "Upcoming Days".
    // For now, let's implement a simple list of "Next 7 Days" grouped by date, which acts like a calendar agenda.
    // Or a grid. Let's try a grid for the current week.

    const weekDays = eachDayOfInterval({ start, end });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                    <div key={day} className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => {
                    const isTodayDate = isToday(day);
                    const tasksForDay = tasks.filter(t => {
                        const d = t.dueDate ? parseISO(t.dueDate) : (t.due_date ? parseISO(t.due_date) : null);
                        return d && isSameDay(d, day);
                    });

                    return (
                        <div key={day.toString()} className={`min-h-[100px] border rounded-lg p-1 ${isTodayDate ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                            <div className={`text-xs font-bold mb-1 ${isTodayDate ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                {format(day, 'd')}
                            </div>
                            <div className="space-y-1">
                                {tasksForDay.map(t => (
                                    <div key={t.id} className="text-[10px] p-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-sm truncate dark:text-slate-200" title={t.title}>
                                        {t.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-xs text-center text-slate-400 dark:text-slate-500 mt-4">
                * Se muestran tareas para esta semana.
            </div>
        </div>
    );
};

export default Tasks;
