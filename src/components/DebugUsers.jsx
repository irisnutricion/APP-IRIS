import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const DebugUsers = () => {
    const [profiles, setProfiles] = useState([]);
    const [nutritionists, setNutritionists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*');
                if (profilesError) throw profilesError;
                setProfiles(profilesData);

                const { data: nutriData, error: nutriError } = await supabase.from('nutritionists').select('*');
                if (nutriError) throw nutriError;
                setNutritionists(nutriData);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-10">Loading debug data...</div>;
    if (error) return <div className="p-10 text-red-500">Error: {error}</div>;

    return (
        <div className="p-10 space-y-8 bg-white dark:bg-slate-900 min-h-screen">
            <h1 className="text-2xl font-bold">Debug Users & Nutritionists</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="border p-4 rounded bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-xl font-bold mb-4">Profiles (auth.users extension)</h2>
                    <pre className="text-xs overflow-auto h-96">
                        {JSON.stringify(profiles, null, 2)}
                    </pre>
                </div>

                <div className="border p-4 rounded bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-xl font-bold mb-4">Nutritionists Table</h2>
                    <pre className="text-xs overflow-auto h-96">
                        {JSON.stringify(nutritionists, null, 2)}
                    </pre>
                </div>
            </div>

            <div className="border p-4 rounded bg-blue-50 dark:bg-blue-900/20">
                <h2 className="text-xl font-bold mb-4">Analysis</h2>
                <ul className="list-disc pl-5 space-y-2">
                    {profiles.map(p => {
                        const linkedNutri = nutritionists.find(n => n.user_id === p.id);
                        return (
                            <li key={p.id} className={linkedNutri ? 'text-green-600' : 'text-red-500'}>
                                <strong>{p.email}</strong> ({p.role})
                                {linkedNutri ?
                                    <span> LINKED to Nutritionist: {linkedNutri.label} (ID: {linkedNutri.id})</span> :
                                    <span> NOT LINKED to any Nutritionist</span>
                                }
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default DebugUsers;
