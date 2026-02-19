import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';

const Login = () => {
    const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'forgot-sent'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            navigate('/');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setMode('forgot-sent');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetToLogin = () => {
        setMode('login');
        setError(null);
        setPassword('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700">

                {/* === FORGOT SENT === */}
                {mode === 'forgot-sent' && (
                    <div className="text-center">
                        <div className="inline-flex p-3 rounded-xl bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 mb-4">
                            <CheckCircle size={28} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Email enviado</h1>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue las instrucciones para recuperar tu contraseña.
                        </p>
                        <button onClick={resetToLogin} className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 mx-auto">
                            <ArrowLeft size={14} /> Volver al inicio de sesión
                        </button>
                    </div>
                )}

                {/* === FORGOT PASSWORD === */}
                {mode === 'forgot' && (
                    <>
                        <div className="text-center mb-8">
                            <div className="inline-flex p-3 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 mb-4">
                                <KeyRound size={28} />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Recuperar contraseña</h1>
                            <p className="text-slate-500 dark:text-slate-400">Te enviaremos un enlace para resetearla</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : 'Enviar enlace de recuperación'}
                            </button>

                            <button type="button" onClick={resetToLogin} className="w-full text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center gap-1 py-1">
                                <ArrowLeft size={14} /> Volver al inicio de sesión
                            </button>
                        </form>
                    </>
                )}

                {/* === LOGIN === */}
                {mode === 'login' && (
                    <>
                        <div className="text-center mb-8">
                            <div className="inline-flex p-3 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 mb-4">
                                <Lock size={28} />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Bienvenido</h1>
                            <p className="text-slate-500 dark:text-slate-400">Inicia sesión para continuar</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
                                    <button type="button" onClick={() => { setMode('forgot'); setError(null); }} className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400">
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <><Loader2 size={18} className="animate-spin" /> Iniciando...</> : 'Iniciar Sesión'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;
