import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Users, User, Mail, Phone, UserX, UserPlus, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import AddMemberModal from './AddMemberModal';
import LinkNutritionistModal from './LinkNutritionistModal';

const Team = () => {
    const { nutritionists, patients, refreshData } = useData(); // Assuming refreshData exists or will be added
    const { isAdmin } = useAuth();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    // Group patients by nutritionist
    const activePatients = patients.filter(p => p.subscription_status === 'active' || p.subscription_status === 'paused');

    const getNutriPatients = (nutriId) =>
        activePatients.filter(p => p.nutritionist_id === nutriId);

    const unassigned = activePatients.filter(p => !p.nutritionist_id);

    const activeNutritionists = nutritionists.filter(n => n.is_active !== false);

    return (
        <div className="dashboard-container">
            <div className="dashboard-header flex-col sm:flex-row items-start sm:items-center gap-4">
                <div>
                    <h1 className="page-title">Equipo</h1>
                    <p className="page-subtitle">Nutricionistas y sus clientes asignados</p>
                </div>
                {isAdmin && (
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setIsLinkModalOpen(true)}
                            className="btn-secondary flex items-center justify-center gap-2"
                        >
                            <LinkIcon size={18} />
                            <span>Vincular Existente</span>
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="btn-primary flex items-center justify-center gap-2"
                        >
                            <UserPlus size={18} />
                            <span>Añadir Miembro</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{activeNutritionists.length}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Nutricionistas</p>
                    </div>
                </div>
                <div className="card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <User size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{activePatients.length - unassigned.length}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Clientes asignados</p>
                    </div>
                </div>
                <div className="card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        <UserX size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{unassigned.length}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Sin asignar</p>
                    </div>
                </div>
            </div>

            {/* Nutritionist Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeNutritionists.map(nutri => {
                    const assigned = getNutriPatients(nutri.id);
                    return (
                        <div key={nutri.id} className="card overflow-hidden dark:bg-slate-800/50 dark:border-slate-700">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                                        <User size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{nutri.label}</h3>
                                        <div className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                            {nutri.email && <span className="flex items-center gap-1"><Mail size={13} /> {nutri.email}</span>}
                                            {nutri.phone && <span className="flex items-center gap-1"><Phone size={13} /> {nutri.phone}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-sm font-bold">
                                    {assigned.length} cliente{assigned.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <div className="p-4">
                                {assigned.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic py-2 text-center">Sin clientes asignados</p>
                                ) : (
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {assigned.map(p => (
                                            <Link
                                                key={p.id}
                                                to={`/patients/${p.id}`}
                                                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                                            >
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                    {p.first_name} {p.last_name}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.subscription_status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>
                                                    {p.subscription_status === 'active' ? 'Activo' : 'Pausado'}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Unassigned Card */}
                {unassigned.length > 0 && (
                    <div className="card overflow-hidden border-dashed border-2 border-amber-200 dark:border-amber-800/50 dark:bg-slate-800/30">
                        <div className="p-5 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                    <UserX size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Sin Asignar</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Clientes sin nutricionista</p>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-sm font-bold">
                                {unassigned.length} cliente{unassigned.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                {unassigned.map(p => (
                                    <Link
                                        key={p.id}
                                        to={`/patients/${p.id}`}
                                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-amber-50/50 dark:hover:bg-slate-700/50 transition-colors group"
                                    >
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                            {p.first_name} {p.last_name}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.subscription_status === 'active'
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}>
                                            {p.subscription_status === 'active' ? 'Activo' : 'Pausado'}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onMemberAdded={() => {
                    if (refreshData) refreshData();
                }}
            />

            <LinkNutritionistModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onLinked={() => {
                    if (refreshData) refreshData();
                }}
            />
        </div>
    );
};

export default Team;
