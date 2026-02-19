import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if we have a session (established via the link token)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError('Enlace inválido o expirado. Por favor, solicita uno nuevo.');
            }
        });
    }, []);

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setMessage('Contraseña actualizada correctamente. Redirigiendo...');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 mb-4">
                        <Lock size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Nueva Contraseña</h1>
                    <p className="text-slate-500 dark:text-slate-400">Introduce tu nueva contraseña</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-sm flex items-center gap-2">
                        <CheckCircle size={16} />
                        {message}
                    </div>
                )}

                {!message && !error?.includes('Enlace inválido') && (
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                required
                                minLength={6}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                required
                                minLength={6}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                        </button>
                    </form>
                )}

                {error?.includes('Enlace inválido') && (
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Volver al Login
                    </button>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
