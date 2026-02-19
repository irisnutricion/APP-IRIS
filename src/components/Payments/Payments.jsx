import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
    Wallet, Plus, Filter, Search, Trash2, Edit2, CheckCircle,
    Clock, XCircle
} from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

import PaymentModal from './PaymentModal';

const Payments = () => {
    const { payments, deletePayment, patients, paymentMethods, paymentCategories } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        method: 'all',
        category: 'all',
        startDate: '',
        endDate: '',
    });

    // Filtros
    const filteredPayments = useMemo(() => {
        return payments.filter(payment => {
            const patientName = patients.find(p => p.id === payment.patient_id)?.name?.toLowerCase() || '';
            const matchesSearch = patientName.includes(filters.search.toLowerCase()) ||
                payment.concept?.toLowerCase().includes(filters.search.toLowerCase());

            const matchesStatus = filters.status === 'all' || payment.status === filters.status;
            const matchesMethod = filters.method === 'all' || payment.payment_method === filters.method;
            const matchesCategory = filters.category === 'all' || payment.category === filters.category;

            const paymentDate = parseISO(payment.date);
            const start = filters.startDate ? parseISO(filters.startDate) : null;
            const end = filters.endDate ? parseISO(filters.endDate) : null;

            let matchesDate = true;
            if (start && end) {
                matchesDate = isWithinInterval(paymentDate, { start, end });
            } else if (start) {
                matchesDate = paymentDate >= start;
            } else if (end) {
                matchesDate = paymentDate <= end;
            }

            return matchesSearch && matchesStatus && matchesMethod && matchesCategory && matchesDate;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [payments, patients, filters]);

    // Totales
    const totalAmount = filteredPayments
        .filter(p => p.status === 'pagado')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const pendingAmount = filteredPayments
        .filter(p => p.status === 'pendiente')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const handleEdit = (payment) => {
        setEditingPayment(payment);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (confirm('¿Estás seguro de eliminar este pago?')) {
            deletePayment(id);
        }
    };

    const handleCreate = () => {
        setEditingPayment(null);
        setIsModalOpen(true);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pagado': return <span className="badge badge-success flex items-center gap-1"><CheckCircle size={12} /> Pagado</span>;
            case 'pendiente': return <span className="badge badge-warning flex items-center gap-1"><Clock size={12} /> Pendiente</span>;
            case 'cancelado': return <span className="badge bg-red-100 text-red-800 flex items-center gap-1"><XCircle size={12} /> Cancelado</span>;
            default: return <span className="badge bg-slate-100 text-slate-600">{status}</span>;
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Gestión de Pagos</h1>
                    <p className="page-subtitle">Registra y consulta tus ingresos</p>
                </div>
                <button onClick={handleCreate} className="btn btn-primary">
                    <Plus size={20} /> Nuevo Pago
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Recaudado (Periodo)</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">€{totalAmount.toFixed(2)}</h3>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full text-green-600">
                        <Wallet size={24} />
                    </div>
                </div>
                <div className="card flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Pendiente de Cobro</p>
                        <h3 className="text-2xl font-bold text-amber-600">€{pendingAmount.toFixed(2)}</h3>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                        <Clock size={24} />
                    </div>
                </div>
                <div className="card flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Transacciones</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{filteredPayments.length}</h3>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <Filter size={24} />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="card p-4 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4 flex-wrap">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar cliente o concepto..."
                        className="form-input pl-10"
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <select
                    className="form-select w-full md:w-40"
                    value={filters.status}
                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                >
                    <option value="all">Todos Estados</option>
                    <option value="pagado">Pagado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="cancelado">Cancelado</option>
                </select>
                <select
                    className="form-select w-full md:w-40"
                    value={filters.method}
                    onChange={e => setFilters({ ...filters, method: e.target.value })}
                >
                    <option value="all">Todo Método</option>
                    {paymentMethods.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                </select>
                <select
                    className="form-select w-full md:w-40"
                    value={filters.category}
                    onChange={e => setFilters({ ...filters, category: e.target.value })}
                >
                    <option value="all">Todas Categorías</option>
                    {paymentCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                </select>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        className="form-input"
                        value={filters.startDate}
                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                    />
                    <span className="text-slate-400">-</span>
                    <input
                        type="date"
                        className="form-input"
                        value={filters.endDate}
                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Concepto</th>
                                <th>Método</th>
                                <th>Categoría</th>
                                <th>Periodo</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-8 text-slate-500">
                                        No se encontraron pagos con los filtros actuales.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map(p => {
                                    const patient = patients.find(pt => pt.id === p.patient_id);
                                    return (
                                        <tr key={p.id}>
                                            <td className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                                {format(parseISO(p.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="font-medium text-slate-900 dark:text-white">
                                                {patient?.name || (p.payer_email ? <span className="text-slate-500 italic" title="Cliente no encontrado">{p.payer_email}</span> : 'Cliente desconocido')}
                                            </td>
                                            <td className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                                {p.concept || '-'}
                                            </td>
                                            <td className="capitalize text-slate-600 dark:text-slate-400">
                                                {paymentMethods.find(m => m.id === p.payment_method)?.label || p.payment_method}
                                            </td>
                                            <td>
                                                {(() => {
                                                    const cat = paymentCategories.find(c => c.id === p.category);
                                                    return cat ? (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.color}`}>
                                                            {cat.label}
                                                        </span>
                                                    ) : <span className="text-slate-400">-</span>;
                                                })()}
                                            </td>
                                            <td className="text-sm text-slate-500">
                                                {p.billing_period ? (
                                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-xs">
                                                        P{p.billing_period}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="font-semibold text-slate-900 dark:text-white">
                                                €{parseFloat(p.amount).toFixed(2)}
                                            </td>
                                            <td>
                                                {getStatusBadge(p.status)}
                                            </td>
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(p)}
                                                        className="p-1 text-slate-400 hover:text-primary-600 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <PaymentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    initialData={editingPayment}
                />
            )}
        </div>
    );
};

export default Payments;
