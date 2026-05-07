import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, TrendingUp, Repeat } from 'lucide-react';
import Payments from '../Payments/Payments';
import FinancialDashboard from '../Settings/FinancialDashboard';
import Renewals from '../Renewals/Renewals';
import { useAuth } from '../../context/AuthContext';

export default function AccountingManager() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['financiero', 'pagos', 'renovaciones'];

    // Derive state directly
    const activeTab = (tabFromUrl && validTabs.includes(tabFromUrl)) ? tabFromUrl : 'financiero';
    const { isAdmin } = useAuth();

    const handleTabChange = (tab) => {
        setSearchParams({ tab });
    };

    return (
        <div className="dashboard-container">
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-6 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={() => handleTabChange('financiero')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'financiero' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><TrendingUp size={18} /> Financiero</div>
                    </button>
                    <button
                        onClick={() => handleTabChange('pagos')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'pagos' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><Wallet size={18} /> Pagos</div>
                    </button>
                    <button
                        onClick={() => handleTabChange('renovaciones')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'renovaciones' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><Repeat size={18} /> Renovaciones</div>
                    </button>
                </nav>
            </div>

            <div className="animate-fade-in relative">
                <div style={{ display: activeTab === 'financiero' ? 'block' : 'none' }}>
                    <FinancialDashboard />
                </div>
                <div style={{ display: activeTab === 'pagos' ? 'block' : 'none' }}>
                    <Payments />
                </div>
                <div style={{ display: activeTab === 'renovaciones' ? 'block' : 'none' }}>
                    <Renewals />
                </div>
            </div>
        </div>
    );
}
