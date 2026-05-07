import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, UtensilsCrossed } from 'lucide-react';
import Templates from '../Plans/Templates';
import Recommendations from '../Recommendations/Recommendations';

export default function TemplatesManager() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['planes', 'recomendaciones'];

    // Derive state directly
    const activeTab = (tabFromUrl && validTabs.includes(tabFromUrl)) ? tabFromUrl : 'planes';

    const handleTabChange = (tab) => {
        setSearchParams({ tab });
    };

    return (
        <div className="dashboard-container">
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-6 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={() => handleTabChange('planes')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'planes' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><UtensilsCrossed size={18} /> Planes</div>
                    </button>
                    <button
                        onClick={() => handleTabChange('recomendaciones')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'recomendaciones' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><FileText size={18} /> Textos de Recomendaciones</div>
                    </button>
                </nav>
            </div>

            <div className="animate-fade-in relative">
                <div style={{ display: activeTab === 'planes' ? 'block' : 'none' }}>
                    <Templates />
                </div>
                <div style={{ display: activeTab === 'recomendaciones' ? 'block' : 'none' }}>
                    <Recommendations />
                </div>
            </div>
        </div>
    );
}
