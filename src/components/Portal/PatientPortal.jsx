import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { UtensilsCrossed, Calendar, Loader2, AlertCircle, ChefHat } from 'lucide-react';

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
            alert("No se pudo generar el plan PDF en este momento. Inténtalo de nuevo más tarde.");
        }
    };

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
                                <span>💡 Recuerda que todos los {patient.review_day ? patient.review_day.toLowerCase() : 'lunes'} debes enviarme el mensaje de revisión.</span>
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
                    <div className="grid gap-6 sm:grid-cols-2">
                        {plans.map(plan => {
                            const snapshot = plan.published_data;
                            if (!snapshot || !snapshot.plan) return null;
                            const mealNames = snapshot.plan.meal_names || MEALS_DEFAULT;

                            return (
                                <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
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

                                    <div className="p-6 flex justify-center bg-white">
                                        <button
                                            onClick={() => handleDownloadPdf(plan)}
                                            className="w-full py-4 px-4 bg-[#d09a84] text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(208,154,132,0.3)] hover:shadow-[0_6px_20px_rgba(208,154,132,0.4)] hover:-translate-y-0.5 hover:bg-[#c28c76] transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                            Descargar Mi Plan Nutricional
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
