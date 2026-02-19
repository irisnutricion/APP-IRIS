import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { X, Loader2, UserPlus, Shield, User } from 'lucide-react';

const AddMemberModal = ({ isOpen, onClose, onMemberAdded }) => {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('nutritionist');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // 1. Create a temporary client to sign up the new user without logging out the admin
            // We use the same env vars as the main client
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
            const tempClient = createClient(supabaseUrl, supabaseKey);

            // 2. Sign up the user
            // Note: If email confirmation is enabled in Supabase, the user won't be able to login until they confirm.
            const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        // We check role in trigger, but we'll also forcibly update it below to be safe/sure
                        role: 'nutritionist' // Default for safety
                    }
                }
            });

            if (signUpError) throw signUpError;
            if (!signUpData.user) throw new Error('No se pudo crear el usuario');

            // 3. Update the role securely using the ADMIN's session (main 'supabase' client)
            // The RLS policy "Admins can update any profile" allows this.
            if (role !== 'nutritionist') {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ role: role })
                    .eq('id', signUpData.user.id);

                if (updateError) {
                    console.error("Error updating role:", updateError);
                    // We don't block the success but we warn
                }
            }

            setSuccess(true);
            setTimeout(() => {
                onMemberAdded();
                onClose();
                // Reset form
                setEmail('');
                setFullName('');
                setPassword('');
                setRole('nutritionist');
                setSuccess(false);
            }, 1500);

        } catch (error) {
            console.error('Error creating user:', error);
            setError(error.message || 'Error al crear el usuario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <UserPlus size={20} className="text-primary-600 dark:text-primary-400" />
                        Nuevo Miembro
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-8">
                            <div className="inline-flex p-3 rounded-full bg-green-100 text-green-600 mb-3">
                                <UserPlus size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-1">¡Usuario Creado!</h4>
                            <p className="text-slate-500 dark:text-slate-400">
                                El usuario ha sido registrado.<br />
                                <span className="text-xs opacity-75">(Si la confirmación de email está activa, deberá verificar su correo)</span>
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Nombre Completo
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="Juan Pérez"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="email@ejemplo.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Contraseña Inicial
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="••••••••"
                                    minLength={6}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Rol
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRole('nutritionist')}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${role === 'nutritionist'
                                                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}
                                    >
                                        <User size={20} />
                                        <span className="text-sm font-medium">Nutricionista</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('admin')}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${role === 'admin'
                                                ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}
                                    >
                                        <Shield size={20} />
                                        <span className="text-sm font-medium">Admin</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;
