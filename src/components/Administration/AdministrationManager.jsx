import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings, UsersRound } from 'lucide-react';
import SettingsComponent from '../Settings/Settings';
import Team from '../Team/Team';

export default function AdministrationManager() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['configuracion', 'equipo'];

    const [activeTab, setActiveTab] = useState(
        (tabFromUrl && validTabs.includes(tabFromUrl)) ? tabFromUrl : 'configuracion'
    );

    useEffect(() => {
        if (tabFromUrl && validTabs.includes(tabFromUrl)) {
            setActiveTab(tabFromUrl);
        }
    }, [tabFromUrl]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    return (
        <div className="dashboard-container">
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-6 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={() => handleTabChange('configuracion')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'configuracion' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><Settings size={18} /> Configuración</div>
                    </button>
                    <button
                        onClick={() => handleTabChange('equipo')}
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
