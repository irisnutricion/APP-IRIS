import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, LayoutDashboard, Settings, Activity, Repeat, Wallet, ClipboardList, PieChart, ChefHat, Apple, FileText, UsersRound } from 'lucide-react';
import { useData } from '../context/DataContext';

const PAGES = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, type: 'page' },
    { label: 'Clientes', path: '/patients', icon: Users, type: 'page' },
    { label: 'Nuevo Cliente', path: '/patients/new', icon: Users, type: 'page' },
    { label: 'Seguimiento', path: '/tracking', icon: Activity, type: 'page' },
    { label: 'Tareas', path: '/tasks', icon: ClipboardList, type: 'page' },
    { label: 'Plantillas', path: '/recommendations', icon: FileText, type: 'page' },
    { label: 'Renovaciones', path: '/renewals', icon: Repeat, type: 'page' },
    { label: 'Pagos', path: '/payments', icon: Wallet, type: 'page' },
    { label: 'Equipo', path: '/team', icon: UsersRound, type: 'page' },
    { label: 'Estadísticas', path: '/statistics', icon: PieChart, type: 'page' },
    { label: 'Configuración', path: '/settings', icon: Settings, type: 'page' },
    { label: 'Alimentos', path: '/foods', icon: Apple, type: 'page' },
    { label: 'Recetas', path: '/recipes', icon: ChefHat, type: 'page' },
];

export default function CommandPalette({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { patients = [] } = useData();
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const results = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return PAGES.slice(0, 8);

        const matchedPages = PAGES.filter(p => p.label.toLowerCase().includes(q));
        const matchedPatients = patients
            .filter(p => p.name?.toLowerCase().includes(q))
            .slice(0, 6)
            .map(p => ({
                label: p.name,
                path: `/patients/${p.id}`,
                icon: Users,
                type: 'patient',
                subtitle: p.subscription_status === 'active' ? 'Activo' : 'Inactivo',
            }));

        return [...matchedPages, ...matchedPatients].slice(0, 10);
    }, [query, patients]);

    // Reset selected index when results change
    useEffect(() => { setSelectedIndex(0); }, [results]);

    const handleSelect = (item) => {
        navigate(item.path);
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Palette */}
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-in-right">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <Search size={18} className="text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar pacientes, páginas..."
                        className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                    <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        ESC
                    </kbd>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X size={16} />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-72 overflow-y-auto py-2">
                    {results.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">
                            No se encontraron resultados para "{query}"
                        </div>
                    ) : (
                        results.map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={`${item.path}-${idx}`}
                                    onClick={() => handleSelect(item)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === selectedIndex
                                            ? 'bg-primary-50 dark:bg-primary-900/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-lg ${item.type === 'patient'
                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate block">{item.label}</span>
                                        {item.subtitle && (
                                            <span className="text-xs text-slate-400 dark:text-slate-500">{item.subtitle}</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 uppercase font-medium">
                                        {item.type === 'patient' ? 'Paciente' : 'Página'}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] border border-slate-200 dark:border-slate-700">↑↓</kbd> Navegar
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] border border-slate-200 dark:border-slate-700">Enter</kbd> Seleccionar
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] border border-slate-200 dark:border-slate-700">Esc</kbd> Cerrar
                    </span>
                </div>
            </div>
        </div>
    );
}
