import { useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useData } from '../../context/DataContext';
import { X, Loader2, UserPlus, Copy, Check, KeyRound, Eye, EyeOff, RefreshCw } from 'lucide-react';

/** Generate a secure provisional password: 12 chars, upper/lower/digit/symbol */
function generatePassword() {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%&*?';
    const all = upper + lower + digits + symbols;

    // Ensure at least one of each character class
    let pw = '';
    pw += upper[Math.floor(Math.random() * upper.length)];
    pw += lower[Math.floor(Math.random() * lower.length)];
    pw += digits[Math.floor(Math.random() * digits.length)];
    pw += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 12; i++) {
        pw += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle
    return pw.split('').sort(() => Math.random() - 0.5).join('');
}

const AddMemberModal = ({ isOpen, onClose, onMemberAdded }) => {
    const { addNutritionist, deleteNutritionist } = useData();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState(() => generatePassword());
    const [showPassword, setShowPassword] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null); // { success, generatedPassword }
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const regeneratePassword = () => {
        setPassword(generatePassword());
    };

    const copyPassword = () => {
        navigator.clipboard.writeText(result?.generatedPassword || password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!fullName.trim()) throw new Error('El nombre es obligatorio');
            if (!email.trim()) throw new Error('El email es obligatorio');
            if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

            // 1. Create nutritionist record in DB
            const nutriId = fullName.toLowerCase().trim().replace(/\s+/g, '_') + '_' + Date.now().toString(36);
            const newNutri = await addNutritionist({
                id: nutriId,
                label: fullName.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                is_active: true,
            });
            const finalNutriId = newNutri?.id || nutriId;

            // 2. Create auth user via edge function (uses admin JWT)
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        password,
                        full_name: fullName.trim(),
                        nutritionist_id: finalNutriId,
                    }),
                });
                const data = await res.json();
                if (!res.ok || data.error) throw new Error(data.error || 'Error al crear el acceso');
            } catch (authErr) {
                // Rollback: delete the nutritionist to avoid orphans
                await deleteNutritionist(finalNutriId);
                throw authErr;
            }

            // 3. Success — show password to admin
            setResult({ success: true, generatedPassword: password });

        } catch (err) {
            console.error('Error creating nutritionist:', err);
            setError(err.message || 'Error al crear el nutricionista');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (result?.success && onMemberAdded) onMemberAdded();
        onClose();
        // Reset
        setFullName('');
        setEmail('');
        setPhone('');
        setPassword(generatePassword());
        setShowPassword(true);
        setError(null);
        setResult(null);
        setCopied(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <UserPlus size={20} className="text-primary-600 dark:text-primary-400" />
                        Nuevo Nutricionista
                    </h3>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {result?.success ? (
                        /* Success view — show credential summary */
                        <div className="space-y-5">
                            <div className="text-center">
                                <div className="inline-flex p-3 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 mb-3">
                                    <Check size={32} />
                                </div>
                                <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-1">¡Nutricionista Creado!</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Comparte estas credenciales de forma segura.
                                </p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3">
                                <div>
                                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Email</span>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">{email}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Contraseña provisional</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <code className="text-sm font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded">
                                            {result.generatedPassword}
                                        </code>
                                        <button onClick={copyPassword} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg transition-colors" title="Copiar">
                                            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    <strong>Importante:</strong> El nutricionista deberá cambiar esta contraseña provisional usando "He olvidado mi contraseña" en la pantalla de login.
                                </p>
                            </div>

                            <button onClick={handleClose} className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors">
                                Cerrar
                            </button>
                        </div>
                    ) : (
                        /* Creation form */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Nombre Completo <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="Ana García López"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Email <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="ana@nutricion.com"
                                    required
                                />
                                <p className="text-xs text-slate-400 mt-1">Este será su email de acceso a la app</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="+34 600 000 000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                    <KeyRound size={14} /> Contraseña Provisional
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-2 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono text-sm"
                                            minLength={6}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={regeneratePassword}
                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                        title="Generar nueva contraseña"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Auto-generada. El nutricionista la cambiará con "He olvidado mi contraseña"</p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Crear Nutricionista'}
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
