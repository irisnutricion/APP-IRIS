import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { UtensilsCrossed, Calendar, Loader2, AlertCircle, ChefHat, Copy, CheckCheck, BookOpen, Plus, Trash2, Search, X, ChevronDown, ChevronUp } from 'lucide-react';

// Dedicated anonymous client - never sends auth headers so anon RLS policies apply
const anonSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

import { generatePlanPdf } from '../../utils/planPdfGenerator';

export default function PatientPortal() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [patient, setPatient] = useState(null);
    const [plans, setPlans] = useState([]);
    const [planItems, setPlanItems] = useState([]);
    const [reviewMessage, setReviewMessage] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    // Food diary state
    const [diaryDate, setDiaryDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [diaryEntries, setDiaryEntries] = useState([]);
    const [diaryLoading, setDiaryLoading] = useState(false);
    const [showDiary, setShowDiary] = useState(false);
    const [availableFoods, setAvailableFoods] = useState([]);
    const [foodSearch, setFoodSearch] = useState('');
    const [showFoodSearch, setShowFoodSearch] = useState(null); // meal name or null
    const [addingEntry, setAddingEntry] = useState(false);
    const [quickForm, setQuickForm] = useState({ meal_name: 'Desayuno', food_name: '', quantity_g: '' });
    const DIARY_MEALS = ['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena'];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch patient by share_token
                const { data: patientData, error: patientErr } = await anonSupabase
                    .from('patients')
                    .select('id, first_name, last_name, share_token, subscription_end, review_day')
                    .eq('share_token', token)
                    .single();

                console.log('[Portal] token:', token);
                console.log('[Portal] patientData:', patientData);
                console.log('[Portal] patientErr:', patientErr);

                if (patientErr || !patientData) {
                    setError('Enlace no válido o expirado.');
                    setLoading(false);
                    return;
                }
                setPatient(patientData);

                // Fetch active meal plans that are PUBLISHED
                const { data: plansData } = await anonSupabase
                    .from('meal_plans')
                    .select('*')
                    .eq('patient_id', patientData.id)
                    .eq('status', 'active')
                    .eq('is_template', false)
                    .not('published_data', 'is', null)
                    .order('created_at', { ascending: false });

                // We don't fetch meal_plan_items directly anymore. 
                // The portal relies entirely on the 'published_data' JSON snapshot!
                setPlans(plansData || []);

                // Fetch global review message from user_profile
                try {
                    const { data: profileData } = await anonSupabase
                        .from('user_profile')
                        .select('review_message')
                        .limit(1)
                        .single();
                    if (profileData && profileData.review_message) {
                        setReviewMessage(profileData.review_message);
                    }
                } catch (e) {
                    console.error('Error fetching review message', e);
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

    const handleDownloadPdf = async (plan) => {
        try {
            // Reconstruct full plan and items from the snapshot
            const snapshotData = plan.published_data;
            if (!snapshotData) return;

            // The generator needs a plan object with name, type, meal_names, indications
            const planForPdf = {
                ...snapshotData.plan,
                created_at: plan.created_at
            };

            const itemsForPdf = snapshotData.items || [];

            // We need a dummy nutritionist obj to provide the primary color if none is set
            // The brand color #28483a is already hardcoded in generator if nutritionist is null.
            const nutritionistDummy = { pdf_color: '#28483a' };

            await generatePlanPdf(planForPdf, itemsForPdf, nutritionistDummy, patient);

        } catch (err) {
            console.error("Error generating PDF:", err);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(reviewMessage);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // ── Food Diary handlers ──────────────────────────────────────
    const fetchDiary = async (date) => {
        if (!patient) return;
        setDiaryLoading(true);
        try {
            const { data } = await anonSupabase
                .from('food_diary')
                .select('*')
                .eq('patient_id', patient.id)
                .eq('diary_date', date)
                .order('created_at', { ascending: true });
            setDiaryEntries(data || []);
        } catch (e) {
            console.error('Error fetching diary', e);
        } finally {
            setDiaryLoading(false);
        }
    };

    const fetchFoods = async () => {
        if (availableFoods.length > 0) return; // cached
        try {
            const { data } = await anonSupabase
                .from('foods')
                .select('id, name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
                .eq('is_active', true)
                .order('name');
            setAvailableFoods(data || []);
        } catch (e) {
            console.error('Error fetching foods', e);
        }
    };

    const handleAddEntry = async (mealName, food, quantityG) => {
        if (!patient || !food) return;
        const qty = parseFloat(quantityG) || 100;
        const factor = qty / 100;
        setAddingEntry(true);
        try {
            const entry = {
                patient_id: patient.id,
                diary_date: diaryDate,
                meal_name: mealName,
                food_name: food.name,
                food_id: food.id || null,
                quantity_g: qty,
                kcal: food.kcal_per_100g ? +(food.kcal_per_100g * factor).toFixed(1) : null,
                protein_g: food.protein_per_100g ? +(food.protein_per_100g * factor).toFixed(1) : null,
                carbs_g: food.carbs_per_100g ? +(food.carbs_per_100g * factor).toFixed(1) : null,
                fat_g: food.fat_per_100g ? +(food.fat_per_100g * factor).toFixed(1) : null,
            };
            const { data, error } = await anonSupabase.from('food_diary').insert(entry).select().single();
            if (!error && data) {
                setDiaryEntries(prev => [...prev, data]);
            }
        } catch (e) {
            console.error('Error adding diary entry', e);
        } finally {
            setAddingEntry(false);
            setShowFoodSearch(null);
            setFoodSearch('');
        }
    };

    const handleDeleteEntry = async (entryId) => {
        try {
            await anonSupabase.from('food_diary').delete().eq('id', entryId);
            setDiaryEntries(prev => prev.filter(e => e.id !== entryId));
        } catch (e) {
            console.error('Error deleting diary entry', e);
        }
    };

    const handleToggleDiary = async () => {
        if (!showDiary) {
            await fetchFoods();
            await fetchDiary(diaryDate);
        }
        setShowDiary(v => !v);
    };

    const handleDateChange = async (newDate) => {
        setDiaryDate(newDate);
        await fetchDiary(newDate);
    };

    // Diary totals per day
    const diaryTotals = diaryEntries.reduce((acc, e) => ({
        kcal: acc.kcal + (e.kcal || 0),
        protein: acc.protein + (e.protein_g || 0),
        carbs: acc.carbs + (e.carbs_g || 0),
        fat: acc.fat + (e.fat_g || 0),
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

    const filteredFoods = availableFoods.filter(f =>
        !foodSearch.trim() || f.name.toLowerCase().includes(foodSearch.toLowerCase())
    ).slice(0, 20);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
                <div className="text-center">
                    <Loader2 size={40} className="animate-spin text-emerald-600 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Cargando tu plan nutricional...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-100">
                    <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Enlace no disponible</h2>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Welcome */}
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
                    <div className="flex items-center gap-4">
                        <div className="shrink-0 flex items-center justify-center bg-pink-50/50 rounded-xl p-2 border border-pink-100">
                            <img src="/covers/logo rosa.png" alt="Iris Nutrición" className="h-12 w-auto object-contain" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">¡Hola, {patient.first_name}!</h2>
                            <p className="text-slate-500 text-sm">Aquí puedes consultar tu plan nutricional</p>
                        </div>
                    </div>
                    {patient.subscription_end && (
                        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100/50">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-emerald-600" />
                                <span>Seguimiento activo hasta: <strong className="text-slate-700">{new Date(patient.subscription_end).toLocaleDateString('es-ES', { dateStyle: 'long' })}</strong></span>
                            </div>
                            <div className="flex items-start gap-2 pt-2 border-t border-emerald-200/50 text-emerald-800 font-medium">
                                <span>💡 Recuerda que todos los {patient.review_day ? ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'][parseInt(patient.review_day) - 1] || 'lunes' : 'lunes'} debes enviarme el mensaje de revisión.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Published Plans */}
                {plans.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                        <UtensilsCrossed size={40} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Aún no hay ningún plan publicado</p>
                        <p className="text-slate-400 text-sm mt-1">Tu nutricionista está preparando tu plan nutritivo.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8 w-full">
                        {plans.map(plan => {
                            const snapshot = plan.published_data;
                            if (!snapshot || !snapshot.plan) return null;
                            const mealNames = snapshot.plan.meal_names || MEALS_DEFAULT;

                            return (
                                <div key={plan.id} className="flex flex-col gap-4">
                                    {/* Main Plan Card */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                        <div className="bg-[#28483a] px-6 py-5 text-white flex-1 relative overflow-hidden">
                                            {/* Decorative pattern for header */}
                                            <div className="absolute opacity-10 -right-6 -top-12">
                                                <UtensilsCrossed size={120} />
                                            </div>
                                            <div className="flex justify-between items-start gap-4 relative z-10">
                                                <div>
                                                    <h3 className="font-bold text-xl mb-1 text-[#e3f6ed]">{snapshot.plan.name}</h3>
                                                    <p className="text-emerald-100/80 text-sm flex items-center gap-1.5 font-medium">
                                                        <UtensilsCrossed size={14} />
                                                        {snapshot.plan.type === 'closed' ? 'Plan semanal cerrado' : 'Plan abierto con opciones'}
                                                    </p>
                                                    <p className="text-emerald-200/60 text-xs mt-2 font-mono">
                                                        Publicado: {new Date(plan.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 flex flex-col justify-center bg-white flex-grow">
                                            <div className="flex justify-center w-full">
                                                <button
                                                    onClick={() => handleDownloadPdf(plan)}
                                                    className="w-full py-4 px-4 bg-[#d09a84] text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(208,154,132,0.3)] hover:shadow-[0_6px_20px_rgba(208,154,132,0.4)] hover:-translate-y-0.5 hover:bg-[#c28c76] transition-all flex items-center justify-center gap-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                                    Descargar Mi Plan Nutricional
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Global Review Message at the bottom */}
                {reviewMessage && (
                    <div className="bg-white rounded-2xl shadow-sm border border-[#d09a84]/30 overflow-hidden flex flex-col">
                        <div className="bg-[#fff9f6] p-5 flex flex-col h-full border-t-4 border-t-[#d09a84]">
                            <div className="flex justify-between items-center border-b border-[#d09a84]/20 pb-2 mb-2">
                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    📝 Mensaje de Revisión
                                </h4>
                                <button
                                    onClick={handleCopy}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                                >
                                    {isCopied ? <><CheckCheck size={14} /> Copiado</> : <><Copy size={14} /> Copiar texto</>}
                                </button>
                            </div>
                            <div className="text-sm text-slate-600 whitespace-pre-wrap flex-grow relative z-10">
                                {reviewMessage}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Food Diary Section ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                    <button
                        onClick={handleToggleDiary}
                        className="w-full flex items-center justify-between p-5 hover:bg-emerald-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-xl">
                                <BookOpen size={20} className="text-emerald-700" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-800">Mi Diario de Comidas</h3>
                                <p className="text-xs text-slate-500">Registra lo que comes cada día</p>
                            </div>
                        </div>
                        {showDiary ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </button>

                    {showDiary && (
                        <div className="border-t border-emerald-100 p-5 space-y-5">
                            {/* Date picker + day totals */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-emerald-600 shrink-0" />
                                    <input
                                        type="date"
                                        value={diaryDate}
                                        onChange={e => handleDateChange(e.target.value)}
                                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400"
                                    />
                                </div>
                                {diaryTotals.kcal > 0 && (
                                    <div className="flex flex-wrap gap-3 text-xs font-bold">
                                        <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">{Math.round(diaryTotals.kcal)} kcal</span>
                                        <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{diaryTotals.protein.toFixed(1)}g P</span>
                                        <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">{diaryTotals.carbs.toFixed(1)}g HC</span>
                                        <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">{diaryTotals.fat.toFixed(1)}g G</span>
                                    </div>
                                )}
                            </div>

                            {diaryLoading && (
                                <div className="flex justify-center py-6">
                                    <Loader2 size={24} className="animate-spin text-emerald-500" />
                                </div>
                            )}

                            {!diaryLoading && DIARY_MEALS.map(meal => {
                                const mealEntries = diaryEntries.filter(e => e.meal_name === meal);
                                const isSearching = showFoodSearch === meal;
                                const [pendingFood, setPendingFood] = [null, () => {}]; // placeholder
                                return (
                                    <div key={meal} className="border border-slate-100 rounded-xl overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                                            <span className="font-bold text-slate-700 text-sm">{meal}</span>
                                            <button
                                                onClick={() => setShowFoodSearch(isSearching ? null : meal)}
                                                className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:text-emerald-800 transition-colors"
                                            >
                                                <Plus size={14} /> Añadir
                                            </button>
                                        </div>

                                        {isSearching && (
                                            <div className="p-3 border-b border-slate-100 space-y-2">
                                                <div className="relative">
                                                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar alimento..."
                                                        value={foodSearch}
                                                        onChange={e => setFoodSearch(e.target.value)}
                                                        className="w-full pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-50">
                                                    {filteredFoods.length === 0 && (
                                                        <p className="text-xs text-slate-400 text-center py-3">Sin resultados</p>
                                                    )}
                                                    {filteredFoods.map(food => (
                                                        <div key={food.id} className="flex items-center justify-between px-3 py-2 hover:bg-emerald-50 group cursor-default">
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-700">{food.name}</p>
                                                                {food.kcal_per_100g && (
                                                                    <p className="text-xs text-slate-400">{food.kcal_per_100g} kcal/100g</p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    placeholder="g"
                                                                    defaultValue="100"
                                                                    id={`qty-${meal}-${food.id}`}
                                                                    className="w-16 text-xs border border-slate-200 rounded px-1.5 py-1 text-center"
                                                                    onWheel={e => e.target.blur()}
                                                                />
                                                                <button
                                                                    disabled={addingEntry}
                                                                    onClick={() => {
                                                                        const qtyEl = document.getElementById(`qty-${meal}-${food.id}`);
                                                                        handleAddEntry(meal, food, qtyEl?.value || '100');
                                                                    }}
                                                                    className="text-xs bg-emerald-600 text-white px-2 py-1 rounded font-semibold hover:bg-emerald-700 disabled:opacity-50"
                                                                >
                                                                    {addingEntry ? '...' : 'Añadir'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button onClick={() => { setShowFoodSearch(null); setFoodSearch(''); }} className="text-xs text-slate-400 hover:text-slate-600 w-full text-center py-1">Cancelar</button>
                                            </div>
                                        )}

                                        <div className="divide-y divide-slate-50">
                                            {mealEntries.length === 0 && !isSearching && (
                                                <p className="text-xs text-slate-400 text-center py-3">Sin registros</p>
                                            )}
                                            {mealEntries.map(entry => (
                                                <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 group">
                                                    <div>
                                                        <p className="text-sm text-slate-700 font-medium">{entry.food_name}</p>
                                                        <p className="text-xs text-slate-400">
                                                            {entry.quantity_g}g
                                                            {entry.kcal ? ` · ${Math.round(entry.kcal)} kcal` : ''}
                                                            {entry.protein_g ? ` · ${entry.protein_g.toFixed(1)}g P` : ''}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                        className="p-1 text-slate-200 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center py-6 text-xs text-slate-400">
                    <p>Iris Nutrición • Portal del paciente</p>
                    <p className="mt-1">Este enlace es privado. No lo compartas con terceros.</p>
                </div>
            </main>
        </div>
    );
}
