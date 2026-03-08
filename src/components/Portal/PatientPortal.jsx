import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { UtensilsCrossed, Calendar, Download, Loader2, AlertCircle, User, ChefHat } from 'lucide-react';

export default function PatientPortal() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [patient, setPatient] = useState(null);
    const [plans, setPlans] = useState([]);
    const [planItems, setPlanItems] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch patient by share_token
                const { data: patientData, error: patientErr } = await supabase
                    .from('patients')
                    .select('id, name, share_token, subscription_end, review_day')
                    .eq('share_token', token)
                    .single();

                if (patientErr || !patientData) {
                    setError('Enlace no válido o expirado.');
                    setLoading(false);
                    return;
                }
                setPatient(patientData);

                // Fetch active meal plans
                const { data: plansData } = await supabase
                    .from('meal_plans')
                    .select('*')
                    .eq('patient_id', patientData.id)
                    .eq('status', 'active')
                    .eq('is_template', false)
                    .order('created_at', { ascending: false });

                setPlans(plansData || []);

                if (plansData && plansData.length > 0) {
                    const planIds = plansData.map(p => p.id);
                    const { data: itemsData } = await supabase
                        .from('meal_plan_items')
                        .select('*')
                        .in('plan_id', planIds)
                        .order('day_index', { ascending: true })
                        .order('meal_index', { ascending: true });
                    setPlanItems(itemsData || []);
                }
            } catch (err) {
                console.error('Portal error:', err);
                setError('Error al cargar los datos.');
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchData();
    }, [token]);

    const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const MEALS_DEFAULT = ['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena'];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
                <div className="text-center">
                    <Loader2 size={40} className="animate-spin text-pink-500 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Cargando tu plan nutricional...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-100">
                    <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Enlace no disponible</h2>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-pink-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-2 rounded-xl text-white">
                            <ChefHat size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 text-lg">Iris Nutrición</h1>
                            <p className="text-xs text-slate-400">Portal del paciente</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Welcome */}
                <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {patient.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">¡Hola, {patient.name?.split(' ')[0]}!</h2>
                            <p className="text-slate-500 text-sm">Aquí puedes consultar tu plan nutricional</p>
                        </div>
                    </div>
                    {patient.subscription_end && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 bg-pink-50 rounded-lg px-4 py-2">
                            <Calendar size={16} className="text-pink-500" />
                            Plan activo hasta: <strong className="text-slate-700">{new Date(patient.subscription_end).toLocaleDateString('es-ES', { dateStyle: 'long' })}</strong>
                        </div>
                    )}
                </div>

                {/* Plans */}
                {plans.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                        <UtensilsCrossed size={40} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No hay planes activos en este momento</p>
                    </div>
                ) : (
                    plans.map(plan => {
                        const items = planItems.filter(i => i.plan_id === plan.id);
                        const mealNames = plan.meal_names || MEALS_DEFAULT;

                        return (
                            <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-4 text-white">
                                    <h3 className="font-bold text-lg">{plan.name}</h3>
                                    <p className="text-pink-100 text-sm">
                                        {plan.type === 'closed' ? 'Plan semanal' : 'Plan abierto'} • {mealNames.length} comidas/día
                                    </p>
                                </div>

                                {plan.type === 'closed' ? (
                                    // Closed plan: weekly grid
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-pink-100">
                                                    <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider bg-pink-50/50"></th>
                                                    {DAYS.map(d => (
                                                        <th key={d} className="text-center px-3 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider bg-pink-50/50 min-w-[120px]">{d}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {mealNames.map((meal, mealIdx) => (
                                                    <tr key={mealIdx} className="border-b border-slate-50 hover:bg-pink-50/30 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-pink-600 text-xs uppercase whitespace-nowrap">{meal}</td>
                                                        {DAYS.map((_, dayIdx) => {
                                                            const item = items.find(i => i.day_index === dayIdx && i.meal_index === mealIdx);
                                                            return (
                                                                <td key={dayIdx} className="px-3 py-3 text-center">
                                                                    {item ? (
                                                                        <div>
                                                                            <p className="font-medium text-slate-700 text-sm">{item.food_name || item.recipe_name || '-'}</p>
                                                                            {item.quantity && (
                                                                                <p className="text-xs text-slate-400 mt-0.5">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</p>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-300">—</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    // Open plan: grouped by meal
                                    <div className="p-6 space-y-6">
                                        {mealNames.map((meal, mealIdx) => {
                                            const mealItems = items.filter(i => i.meal_index === mealIdx);
                                            if (mealItems.length === 0) return null;
                                            return (
                                                <div key={mealIdx}>
                                                    <h4 className="font-bold text-pink-600 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <UtensilsCrossed size={14} /> {meal}
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {mealItems.map((item, idx) => (
                                                            <div key={idx} className="bg-pink-50/50 rounded-xl px-4 py-3 border border-pink-100">
                                                                <p className="font-medium text-slate-700">{item.food_name || item.recipe_name || 'Sin nombre'}</p>
                                                                {item.quantity && (
                                                                    <p className="text-xs text-slate-500 mt-1">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Indications */}
                                {plan.indications && (
                                    <div className="px-6 py-4 bg-amber-50/50 border-t border-amber-100">
                                        <h4 className="font-bold text-amber-700 text-sm mb-2">📝 Indicaciones</h4>
                                        <p className="text-sm text-amber-800 whitespace-pre-wrap">{plan.indications}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                {/* Footer */}
                <div className="text-center py-6 text-xs text-slate-400">
                    <p>Iris Nutrición • Portal del paciente</p>
                    <p className="mt-1">Este enlace es privado. No lo compartas con terceros.</p>
                </div>
            </main>
        </div>
    );
}
