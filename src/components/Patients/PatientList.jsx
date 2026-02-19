import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Filter, Trash2, CheckCircle, LayoutGrid, List, ChevronRight, Play } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PlanStartModal from './PlanStartModal';

const PatientList = () => {
    const { patients, updatePatient } = useData();
    const { isAdmin, nutritionistId, role } = useAuth(); // Get admin status and nut id
    const navigate = useNavigate(); // Hook initialized
    const [searchTerm, setSearchTerm] = useState('');
    const [draggedPatientId, setDraggedPatientId] = useState(null);
    const [viewMode, setViewMode] = useState('board'); // 'list' or 'board'
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterScope, setFilterScope] = useState('all'); // 'all' (everyone) or 'mine' (only my cases)


    const [planStartModalOpen, setPlanStartModalOpen] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [sortOption, setSortOption] = useState('name');

    // ... (logic)

    // In the return ...
    // Status mapping logic
    const getPatientStatus = (patient) => {
        if (['pending_payment', 'paused', 'finished'].includes(patient.status)) {
            return patient.status;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = patient.subscription?.endDate ? new Date(patient.subscription.endDate) : null;
        const startDate = patient.subscription?.startDate ? new Date(patient.subscription.startDate) : null;

        const warningDate = new Date(today);
        warningDate.setDate(today.getDate() + 7);

        if (!startDate || !endDate) return 'waiting';

        if (startDate > today) {
            // Check for any currently active subscription in history
            const activeSub = patient.subscriptionHistory?.find(sub =>
                sub.status === 'active' &&
                new Date(sub.start_date) <= today &&
                (!sub.end_date || new Date(sub.end_date) >= today)
            );

            if (activeSub) return 'active';

            return 'waiting';
        }
        if (endDate < today) return 'expired';
        if (endDate <= warningDate) return 'warning';

        return 'active';
    };

    const columns = {
        waiting: { title: 'A la espera', color: 'border-l-4 border-gray-400' },
        active: { title: 'Activo', color: 'border-l-4 border-green-500' },
        warning: { title: 'Última semana', color: 'border-l-4 border-yellow-500' },
        pending_payment: { title: 'Pendiente Pago', color: 'border-l-4 border-orange-500' },
        paused: { title: 'Pausado', color: 'border-l-4 border-blue-500' },
        expired: { title: 'Caducado', color: 'border-l-4 border-red-500' },
        finished: { title: 'Finalizado / Inactivo', color: 'border-l-4 border-slate-400' }
    };

    // Filter Helper Function
    const filterByScope = (p) => {
        if (!isAdmin) {
            // Non-admins always see only their own clients
            return nutritionistId ? p.nutritionist_id === nutritionistId : false;
        }
        // Admins: respect toggle
        if (filterScope === 'all') return true;
        if (filterScope === 'mine') return p.nutritionist_id === nutritionistId;
        return true;
    };

    // Group patients by status
    const groupedPatients = useMemo(() => {
        const groups = { waiting: [], active: [], warning: [], pending_payment: [], paused: [], finished: [], expired: [] };

        patients.forEach(p => {
            // Scope Filter
            if (!filterByScope(p)) return;

            // Search Filter
            if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

            const status = getPatientStatus(p);
            if (groups[status]) {
                groups[status].push(p);
            }
        });
        return groups;
    }, [patients, searchTerm, filterScope, nutritionistId]);

    // List View Filtered Data
    const filteredListPatients = useMemo(() => {
        let result = patients.filter(p => {
            if (!filterByScope(p)) return false;

            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const status = getPatientStatus(p);

            if (filterStatus === 'all') return matchesSearch; // Show ALL, including finished
            return matchesSearch && status === filterStatus;
        });

        // Sorting
        return result.sort((a, b) => {
            if (sortOption === 'name') return a.name.localeCompare(b.name);
            if (sortOption === 'date_desc') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            if (sortOption === 'date_asc') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            return 0;
        });
    }, [patients, searchTerm, filterStatus, sortOption, filterScope, nutritionistId]);

    // Drag Handlers
    const handleDragStart = (e, patientId) => {
        setDraggedPatientId(patientId);
        e.dataTransfer.setData('patientId', patientId);
        e.dataTransfer.effectAllowed = 'move';
        document.body.classList.add('is-dragging');
    };

    const handleDragEnd = () => {
        setDraggedPatientId(null);
        document.body.classList.remove('is-dragging');
    };

    const handleDrop = (e, targetStatus) => {
        e.preventDefault();
        const pid = e.dataTransfer.getData('patientId');
        if (pid) {
            updatePatient(pid, { status: targetStatus });
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div className="dashboard-container relative h-full">
            <div className="flex flex-col gap-6 mb-6">
                <div>
                    <h1 className="page-title">Clientes</h1>
                    <p className="page-subtitle">Tablero de Gestión</p>
                </div>

                {/* Toolbar: Search Left, Buttons Right */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center px-3 py-2 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg w-full md:w-auto focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all" style={{ minWidth: '320px' }}>
                        <Search className="text-slate-400 mr-2" size={18} />
                        <input
                            className="bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200 w-full placeholder-slate-400"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {/* Admin Filter Scope Toggle */}
                        {isAdmin && (
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-1 rounded-lg flex">
                                <button
                                    onClick={() => setFilterScope('all')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterScope === 'all' ? 'bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFilterScope('mine')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterScope === 'mine' ? 'bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                                >
                                    Mis Clientes
                                </button>
                            </div>
                        )}

                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-1 rounded-lg flex">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Vista de Lista"
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('board')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'board' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Vista de Tablero"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>

                        <Link to="/patients/new" className="btn btn-primary shadow-md btn-sm text-sm" style={{ padding: '0.5rem 1rem' }}>
                            <Plus size={16} /> Nuevo
                        </Link>
                    </div>
                </div>
            </div>

            {viewMode === 'board' ? (
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Drop Zone for Finished - Only visible when dragging */}
                    <div
                        className={`transition-all duration-300 overflow-hidden ${draggedPatientId ? 'max-h-20 mb-4 opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                        <div
                            className="bg-primary-50 border-2 border-dashed border-primary-300 rounded-xl p-4 flex items-center justify-center text-primary-700 font-medium h-20"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'finished')}
                        >
                            <CheckCircle className="mr-2" size={24} /> Soltar para Finalizar / Archivar
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                        <div className="flex gap-6 h-full min-w-max">
                            {Object.entries(columns).map(([statusKey, config]) => (
                                <div
                                    key={statusKey}
                                    className={`w-64 flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 h-full ${config.color}`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, statusKey)}
                                >
                                    {/* Column Header */}
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-xl">
                                        <span className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{config.title}</span>
                                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-600">
                                            {groupedPatients[statusKey]?.length || 0}
                                        </span>
                                    </div>

                                    {/* Column Content */}
                                    <div className="p-3 flex-1 overflow-y-auto space-y-3 scrollbar-thin">
                                        {groupedPatients[statusKey]?.map(patient => (
                                            <div
                                                key={patient.id}
                                                className={`bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group relative ${draggedPatientId === patient.id ? 'opacity-50' : ''}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, patient.id)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => navigate(`/patients/${patient.id}`)}
                                            >
                                                {/* Card Header */}
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-1">
                                                        {patient.name}
                                                    </span>

                                                    {/* Quick Action: Finish (Visible on hover) */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updatePatient(patient.id, { status: 'finished' });
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-opacity p-0.5"
                                                        title="Finalizar/Archivar"
                                                    >
                                                        <CheckCircle size={12} />
                                                    </button>
                                                </div>

                                                {/* Start Plan Button for Waiting Patients without a plan */}
                                                {statusKey === 'waiting' && !patient.subscription?.type && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedPatientId(patient.id);
                                                            setPlanStartModalOpen(true);
                                                        }}
                                                        className="w-full mt-1.5 mb-1.5 flex items-center justify-center gap-1.5 py-1 px-2 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-md text-xs font-semibold transition-colors"
                                                    >
                                                        <Play size={12} /> Seleccionar Plan
                                                    </button>
                                                )}

                                                {/* Card Details */}
                                                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-0.5">
                                                    <div className="flex justify-between">
                                                        <span className="capitalize font-medium text-slate-600 dark:text-slate-400">{patient.subscription?.type || '-'}</span>
                                                        {patient.subscription?.endDate && (
                                                            <span className={`${getPatientStatus(patient) === 'warning' ? 'text-amber-600 font-bold' : ''}`}>
                                                                {format(parseISO(patient.subscription.endDate), 'dd/MM/yyyy')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* LIST VIEW */
                <div className="card">
                    {/* Toolbar */}
                    <div className="card-header flex flex-col md:flex-row gap-4 mb-4 justify-between items-center" style={{ alignItems: 'center' }}>
                        <div className="flex gap-4 w-full md:w-auto">
                            <select
                                className="form-select text-sm w-full md:w-48"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">Todos los Estados</option>
                                <option value="active">Activos</option>
                                <option value="waiting">A la espera</option>
                                <option value="warning">Última Semana</option>
                                <option value="pending_payment">Pendiente Pago</option>
                                <option value="paused">Pausados</option>
                                <option value="expired">Caducados</option>
                                <option value="finished">Finalizados</option>
                            </select>

                            <select
                                className="form-select text-sm w-full md:w-48"
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                            >
                                <option value="name">Nombre (A-Z)</option>
                                <option value="date_desc">Más recientes</option>
                                <option value="date_asc">Más antiguos</option>
                            </select>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Estado</th>
                                    <th>Plan</th>
                                    <th>Renovación</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredListPatients.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 text-muted">No se encontraron clientes.</td>
                                    </tr>
                                ) : (
                                    filteredListPatients.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="profile-initials" style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}>
                                                        {p.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold">{p.name}</div>
                                                        <div className="text-xs text-muted">{p.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${getPatientStatus(p) === 'active' ? 'success' : 'warning'}`}>
                                                    {columns[getPatientStatus(p)]?.title || getPatientStatus(p)}
                                                </span>
                                            </td>
                                            <td className="capitalize text-sm">{p.subscription?.type || '-'}</td>
                                            <td className="text-sm font-mono text-muted">
                                                {p.subscription?.endDate ? format(parseISO(p.subscription.endDate), 'dd/MM/yyyy') : '-'}
                                            </td>
                                            <td>
                                                <Link to={`/patients/${p.id}`} className="btn btn-ghost btn-sm btn-icon">
                                                    <ChevronRight size={18} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <PlanStartModal
                isOpen={planStartModalOpen}
                onClose={() => {
                    setPlanStartModalOpen(false);
                    setSelectedPatientId(null);
                }}
                patientId={selectedPatientId}
            />
        </div>
    );
};

export default PatientList;
