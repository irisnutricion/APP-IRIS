import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { X, Loader2, Link as LinkIcon, AlertCircle, Check } from 'lucide-react';

const LinkNutritionistModal = ({ isOpen, onClose, onLinked }) => {
    const { nutritionists } = useData();
    const { refreshProfile } = useAuth();
    const [selectedNutri, setSelectedNutri] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);

    // Fetch users (only possible if admin, but this component is admin-only)
    // Actually, we can't easily list all users with client-side only unless we use a function or have permissions
    // We will ask for Email to match.

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Find the user by email (we might need an Edge Function for this if listing users is restricted)
            // But wait, we can just update the nutritionist row with the user_id if we know it.
            // If we don't know the ID, we can't link it easily without an admin query.

            // Alternative: The Admin enters the Email, we try to call a function to get ID?
            // BETTER CLIENT-SIDE APPROACH:
            // We can't query auth.users directly from client usually.
            // But we CAN update 'public.nutritionists' if we have the ID.

            // WORKAROUND:
            // Since we just created the user in the other modal, maybe we can link immediately there?
            // OR: We ask for the User UUID (hard for user).

            // LET'S USE A TRICK:
            // We'll trust the admin knows the email.
            // We can't get ID from valid email easily without admin rights.
            // BUT we can use the `profiles` table which correlates ID and Email!
            // We backfilled profiles, so every user should have a profile.

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

            if (profileError || !profile) {
                throw new Error('No se encontró un usuario con este email. Asegúrate de haberlo creado primero.');
            }

            // 2. Update nutritionist record
            const { error: updateError } = await supabase
                .from('nutritionists')
                .update({ user_id: profile.id })
                .eq('id', selectedNutri);

            if (updateError) throw updateError;

            // 3. Refresh Auth Context to update "My Clients" view immediately
            if (refreshProfile) await refreshProfile();

            setSuccess(true);
            setTimeout(() => {
                onLinked();
                onClose();
                setEmail('');
                setSelectedNutri('');
                setSuccess(false);
            }, 1500);

        } catch (error) {
            console.error('Error linking:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter nutritionists that don't have a user_id yet (if we had that data locally)
    // For now show all.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <LinkIcon size={20} className="text-primary-600 dark:text-primary-400" />
                        Vincular Usuario
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 p-4 rounded-lg text-sm flex gap-3">
                        <AlertCircle className="shrink-0" size={18} />
                        <p>Aquí puedes conectar un usuario (email/login) con un perfil de nutricionista existente para que pueda ver sus pacientes.</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-8">
                            <div className="inline-flex p-3 rounded-full bg-green-100 text-green-600 mb-3">
                                <Check size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-1">¡Vinculado!</h4>
                            <p className="text-slate-500 dark:text-slate-400">El usuario ahora tiene acceso a los datos de este nutricionista.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Nutricionista (Ficha)
                                </label>
                                <select
                                    value={selectedNutri}
                                    onChange={(e) => {
                                        setSelectedNutri(e.target.value);
                                        // Auto-fill email if match found? (Optional)
                                        const nutri = nutritionists.find(n => n.id === e.target.value);
                                        if (nutri && nutri.email && !email) {
                                            setEmail(nutri.email);
                                        }
                                    }}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    required
                                >
                                    <option value="">Selecciona un nutricionista...</option>
                                    {nutritionists.filter(n => n.is_active !== false).map(n => (
                                        <option key={n.id} value={n.id}>{n.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Email de Usuario (Login)
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="usuario@email.com"
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">El email debe coincidir con un usuario registrado en el sistema.</p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Vincular'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LinkNutritionistModal;
