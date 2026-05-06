import React, { useState } from 'react';
import { Apple, ChefHat } from 'lucide-react';
import Foods from '../Foods/Foods';
import Recipes from '../Recipes/Recipes';

export default function DatabaseManager() {
    const [activeTab, setActiveTab] = useState('alimentos');

    return (
        <div className="dashboard-container">
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-6 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={() => setActiveTab('alimentos')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'alimentos' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><Apple size={18} /> Alimentos</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('recetas')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'recetas' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><ChefHat size={18} /> Recetas</div>
                    </button>
                </nav>
            </div>

            <div className="animate-fade-in relative">
                <div style={{ display: activeTab === 'alimentos' ? 'block' : 'none' }}>
                    <Foods />
                </div>
                <div style={{ display: activeTab === 'recetas' ? 'block' : 'none' }}>
                    <Recipes />
                </div>
            </div>
        </div>
    );
}
