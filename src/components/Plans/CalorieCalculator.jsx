import { useState, useMemo, useEffect } from 'react';
import { Calculator, User, Activity, Utensils } from 'lucide-react';

const ACTIVITY_PRESETS = [
    { factor: 1.2,   label: 'Muy ligera',   desc: 'Sentado, tumbado. Poco o nada de ejercicio.' },
    { factor: 1.375, label: 'Ligera',        desc: 'De pie, conducir, planchar, caminar. Deporte 1–3× / semana.' },
    { factor: 1.55,  label: 'Moderada',      desc: 'Limpiar, caminar rápido, cargar peso. Deporte 3–5× / semana.' },
    { factor: 1.725, label: 'Activa',        desc: 'Construcción, subir escaleras. Deporte 6–7× / semana.' },
    { factor: 1.9,   label: 'Muy activa',    desc: 'Trabajos de fuerza, correr. Deporte 2 h / día.' },
];

const DEFAULT_DISTRIBUTION = [
    { meal: 'Desayuno',  pct: 20 },
    { meal: 'Almuerzo',  pct: 10 },
    { meal: 'Comida',    pct: 35 },
    { meal: 'Merienda',  pct: 10 },
    { meal: 'Cena',      pct: 25 },
];

export default function CalorieCalculator({ patient, mealNames, initialData, onChange }) {
    // Derive gender from patient.sex field (check common Spanish/English values)
    const patientGender = (() => {
        const s = (patient?.sex || '').toLowerCase();
        if (s === 'mujer' || s === 'female' || s === 'f') return 'female';
        if (s === 'hombre' || s === 'male' || s === 'm') return 'male';
        return 'male'; // default
    })();

    // Derive age from birth_date
    const patientAge = (() => {
        if (!patient?.birth_date) return '';
        const birth = new Date(patient.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age > 0 ? age : '';
    })();

    const [gender, setGender] = useState(patientGender);
    const [age, setAge]       = useState(patientAge);
    const [height, setHeight] = useState(() => patient?.height || '');
    const [weight, setWeight] = useState(() => patient?.weight || '');
    const [activity, setActivity] = useState(1.55);
    const [customActivity, setCustomActivity] = useState('');

    // Build distribution rows from plan mealNames if provided, else use defaults
    const initialDist = useMemo(() => {
        if (initialData?.distribution?.length > 0) return initialData.distribution;
        if (!mealNames || mealNames.length === 0) return DEFAULT_DISTRIBUTION;
        const totalDefault = DEFAULT_DISTRIBUTION.length;
        return mealNames.map((meal, i) => {
            const found = DEFAULT_DISTRIBUTION.find(d => d.meal.toLowerCase() === meal.toLowerCase());
            if (found) return { meal, pct: found.pct };
            // Distribute remaining equally
            return { meal, pct: Math.round(100 / mealNames.length) };
        });
    }, [mealNames, initialData]);

    const [distribution, setDistribution] = useState(initialDist);
    const [targetKcal, setTargetKcal] = useState(() => initialData?.targetKcal || '');

    const effectiveActivity = parseFloat(customActivity) >= 1 && parseFloat(customActivity) <= 2
        ? parseFloat(customActivity)
        : activity;

    const bmr = useMemo(() => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseFloat(age);
        if (!w || !h || !a) return null;
        if (gender === 'male') {
            return 66.473 + (13.751 * w) + (5.0033 * h) - (6.755 * a);
        } else {
            return 655.1 + (9.563 * w) + (1.850 * h) - (4.676 * a);
        }
    }, [gender, weight, height, age]);

    const tdee = bmr !== null ? Math.round(bmr * effectiveActivity) : null;
    const effectiveTdee = targetKcal ? parseInt(targetKcal, 10) : tdee;

    useEffect(() => {
        if (onChange) {
            onChange({
                targetKcal: effectiveTdee,
                distribution: distribution.map(d => ({ ...d, pct: parseFloat(d.pct) || 0 }))
            });
        }
    }, [effectiveTdee, distribution]);

    const totalPct = distribution.reduce((s, d) => s + (parseFloat(d.pct) || 0), 0);

    const updatePct = (idx, val) => {
        setDistribution(prev => prev.map((d, i) => i === idx ? { ...d, pct: val } : d));
    };

    return (
        <div className="space-y-6 py-2">
            {/* ── Header ── */}
            <div className="flex items-center gap-2">
                <Calculator className="text-primary-500" size={20} />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Calculadora de Calorías</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── LEFT: Datos y Actividad ── */}
                <div className="space-y-5">
                    {/* Datos personales */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <User size={15} className="text-primary-400" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Datos personales</span>
                        </div>

                        {/* Género */}
                        <div className="flex gap-3">
                            {[{ v: 'male', l: '♂ Hombre' }, { v: 'female', l: '♀ Mujer' }].map(({ v, l }) => (
                                <button
                                    key={v}
                                    onClick={() => setGender(v)}
                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${gender === v ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        {/* Age / Height / Weight */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Edad', unit: 'años', val: age, set: setAge, min: 1, max: 120 },
                                { label: 'Altura', unit: 'cm', val: height, set: setHeight, min: 50, max: 250 },
                                { label: 'Peso', unit: 'kg', val: weight, set: setWeight, min: 10, max: 300 },
                            ].map(({ label, unit, val, set, min, max }) => (
                                <div key={label}>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={val}
                                            onChange={e => set(e.target.value)}
                                            min={min} max={max}
                                            placeholder="—"
                                            className="w-full px-3 py-2 pr-8 text-sm border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">{unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Nivel de Actividad */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <Activity size={15} className="text-primary-400" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Nivel de actividad física</span>
                        </div>

                        <div className="space-y-2">
                            {ACTIVITY_PRESETS.map(p => (
                                <button
                                    key={p.factor}
                                    onClick={() => { setActivity(p.factor); setCustomActivity(''); }}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-start gap-3 ${effectiveActivity === p.factor && !customActivity ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                                >
                                    <span className={`text-xs font-bold w-12 shrink-0 pt-0.5 ${effectiveActivity === p.factor && !customActivity ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`}>{p.factor}</span>
                                    <div>
                                        <div className={`text-xs font-bold ${effectiveActivity === p.factor && !customActivity ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>{p.label}</div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{p.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Custom factor */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                O introduce un factor personalizado (1.0 – 2.0)
                            </label>
                            <input
                                type="number"
                                value={customActivity}
                                min={1} max={2} step={0.01}
                                onChange={e => setCustomActivity(e.target.value)}
                                placeholder="Ej: 1.45"
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Resultado + Distribución ── */}
                <div className="space-y-5">
                    {/* Resultado */}
                    <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-5 shadow-lg text-white">
                        <div className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-1">Calorías totales diarias (TDEE)</div>
                        {tdee !== null ? (
                            <>
                                <div className="text-5xl font-black tracking-tight">{tdee.toLocaleString()}</div>
                                <div className="text-sm opacity-80 mt-1">kcal / día</div>
                                <div className="mt-4 pt-4 border-t border-white/20 text-xs opacity-75 space-y-0.5">
                                    <div>TMB (metabolismo basal): <span className="font-bold">{Math.round(bmr)} kcal</span></div>
                                    <div>Factor de actividad: <span className="font-bold">× {effectiveActivity}</span></div>
                                </div>
                            </>
                        ) : (
                            <div className="text-xl font-bold opacity-50 mt-2">Completa los datos</div>
                        )}
                        
                        <div className="mt-5 pt-5 border-t border-white/20">
                            <label className="block text-xs font-semibold uppercase tracking-wide opacity-90 mb-2">Kcal objetivo (manual)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={targetKcal}
                                    onChange={e => setTargetKcal(e.target.value)}
                                    placeholder={tdee !== null ? tdee.toString() : "Ej: 2000"}
                                    className="w-full px-3 py-2.5 pr-12 text-lg font-bold bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium opacity-70 pointer-events-none">kcal</span>
                            </div>
                            <p className="text-[10px] opacity-70 mt-1.5 leading-tight">
                                Si introduces un valor aquí, se usará este como total para calcular el reparto de macronutrientes por comida en lugar del TDEE.
                            </p>
                        </div>
                    </div>

                    {/* Distribución por comida */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div className="flex items-center gap-2">
                                <Utensils size={15} className="text-primary-400" />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Distribución por comida</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${Math.abs(totalPct - 100) < 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {totalPct}% / 100%
                            </span>
                        </div>

                        <div className="space-y-2">
                            {distribution.map((d, idx) => {
                                const kcal = effectiveTdee !== null && effectiveTdee > 0 ? Math.round(effectiveTdee * (parseFloat(d.pct) || 0) / 100) : null;
                                return (
                                    <div key={d.meal} className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-24 shrink-0">{d.meal}</span>
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                value={d.pct}
                                                onChange={e => updatePct(idx, parseFloat(e.target.value) || 0)}
                                                min={0} max={100} step={1}
                                                className="w-full px-3 py-1.5 pr-7 text-sm border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">%</span>
                                        </div>
                                        <span className={`text-sm font-bold w-24 text-right ${kcal !== null ? 'text-orange-600 dark:text-orange-400' : 'text-slate-300'}`}>
                                            {kcal !== null ? `${kcal.toLocaleString()} kcal` : '—'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Visual bar */}
                        {effectiveTdee !== null && effectiveTdee > 0 && (
                            <div className="mt-4 flex rounded-full overflow-hidden h-3 gap-0.5">
                                {distribution.map((d, idx) => {
                                    const COLORS = ['bg-orange-400', 'bg-amber-400', 'bg-yellow-400', 'bg-lime-400', 'bg-emerald-400', 'bg-teal-400', 'bg-cyan-400'];
                                    return (
                                        <div
                                            key={d.meal}
                                            className={`${COLORS[idx % COLORS.length]} transition-all`}
                                            style={{ width: `${Math.max(0, parseFloat(d.pct) || 0)}%` }}
                                            title={`${d.meal}: ${d.pct}%`}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                            {distribution.map((d, idx) => {
                                const COLORS = ['bg-orange-400', 'bg-amber-400', 'bg-yellow-400', 'bg-lime-400', 'bg-emerald-400', 'bg-teal-400', 'bg-cyan-400'];
                                return (
                                    <div key={d.meal} className="flex items-center gap-1.5">
                                        <div className={`w-2.5 h-2.5 rounded-full ${COLORS[idx % COLORS.length]}`} />
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{d.meal}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
