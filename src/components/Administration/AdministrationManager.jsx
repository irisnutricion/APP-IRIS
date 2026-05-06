import React, { useState } from 'react';
import { Settings, UsersRound } from 'lucide-react';
import SettingsComponent from '../Settings/Settings';
import Team from '../Team/Team';

export default function AdministrationManager() {
    const [activeTab, setActiveTab] = useState('configuracion');

    return (
        <div className="dashboard-container">
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-6 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={() => setActiveTab('configuracion')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'configuracion' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><Settings size={18} /> Configuración</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('equipo')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'equipo' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><UsersRound size={18} /> Equipo</div>
                    </button>
                </nav>
            </div>

            <div className="animate-fade-in relative">
                <div style={{ display: activeTab === 'configuracion' ? 'block' : 'none' }}>
                    <SettingsComponent />
                </div>
                <div style={{ display: activeTab === 'equipo' ? 'block' : 'none' }}>
                    <Team />
                </div>
            </div>
        </div>
    );
}
