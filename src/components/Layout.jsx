import { Outlet, useLocation, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    CalendarDays,

    Settings,
    LogOut,
    Menu,
    X,
    UserCircle,
    Activity,
    Repeat,
    PieChart,
    ClipboardList,
    Wallet
} from 'lucide-react';
import { UsersRound } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { ThemeToggle } from './ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext';

// Sidebar Item Component
// eslint-disable-next-line no-unused-vars
const SidebarItem = ({ icon: Icon, label, path, active }) => (
    <Link
        to={path}
        className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors mb-1",
            active
                ? "bg-primary-50 text-primary-700 font-medium dark:bg-primary-900/20 dark:text-primary-400"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        )}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </Link>
);



const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { isAdmin, user, role } = useAuth();

    // Navigation Items — roles control visibility
    const allNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/', adminOnly: false },
        { icon: Users, label: 'Clientes', path: '/patients', adminOnly: false },
        { icon: Activity, label: 'Seguimiento', path: '/tracking', adminOnly: false },
        { icon: ClipboardList, label: 'Tareas', path: '/tasks', adminOnly: false },
        { icon: Repeat, label: 'Renovaciones', path: '/renewals', adminOnly: true },
        { icon: Wallet, label: 'Pagos', path: '/payments', adminOnly: true },
        { icon: UsersRound, label: 'Equipo', path: '/team', adminOnly: true },
        { icon: PieChart, label: 'Estadísticas', path: '/statistics', adminOnly: true },
        { icon: Settings, label: 'Configuración', path: '/settings', adminOnly: true },
    ];

    const navItems = allNavItems.filter(item => isAdmin || !item.adminOnly);

    // Handle Closing on Mobile Navigation
    const handleNavClick = () => {
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "w-64 h-full bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 transition-transform duration-300 z-30 dark:bg-slate-900 dark:border-slate-800",
                isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-center flex-1">
                        <div className="flex flex-col items-center justify-center py-2">
                            <img src="/logo-rosa.png" alt="NutriCRM Logo" className="h-16 w-auto object-contain mb-2" />
                            <span className="text-sm font-bold text-primary-700 tracking-widest uppercase">Iris Nutrición</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden p-1 text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                    {navItems.map((item) => (
                        <div key={item.path} onClick={handleNavClick}>
                            <SidebarItem
                                icon={item.icon}
                                label={item.label}
                                path={item.path}
                                active={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))}
                            />
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-3 px-3 py-2">
                        <div className="bg-primary-100 p-2 rounded-full dark:bg-primary-900/30">
                            <UserCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate dark:text-slate-200">{user?.email?.split('@')[0] || 'Usuario'}</p>
                            <p className="text-xs text-slate-500 truncate capitalize dark:text-slate-400">{role === 'admin' ? 'Admin' : 'Nutricionista'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { signOut } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="md:pl-64 flex flex-col min-h-screen transition-all duration-300">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between md:justify-end px-4 md:px-8 sticky top-0 z-10 transition-colors duration-300 gap-4 dark:bg-slate-900 dark:border-slate-800">
                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
                        <button
                            onClick={signOut}
                            className="flex items-center space-x-2 text-sm text-slate-600 hover:text-red-600 transition-colors dark:text-slate-400 dark:hover:text-red-400"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Cerrar Sesión</span>
                        </button>
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
