import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../supabaseClient';
import {
    Plus, Trash2, Edit2, Check, X, Settings as SettingsIcon, CreditCard, User, Database,
    Download, Upload, ArrowDown, ArrowUp, Tag, Wallet, ChevronDown, ChevronRight, Layers, Heart, Users, KeyRound
} from 'lucide-react';

const Settings = () => {
    const {
        subscriptionTypes, addSubscriptionType, updateSubscriptionType, deleteSubscriptionType,
        paymentRates, addPaymentRate, updatePaymentRate, deletePaymentRate,
        exportData, importData,
        taskCategories, addTaskCategory, updateTaskCategory, deleteTaskCategory,
        taskTypes, addTaskType, updateTaskType, deleteTaskType,
        userProfile, updateUserProfile,
        paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod,
        paymentCategories, addPaymentCategory, updatePaymentCategory, deletePaymentCategory,
        referralSources, addReferralSource, updateReferralSource, deleteReferralSource,
        clinicalOptions, addClinicalOption, updateClinicalOption, deleteClinicalOption,
        clinicalCategories, addClinicalCategory, updateClinicalCategory, deleteClinicalCategory,
        nutritionists, addNutritionist, updateNutritionist, deleteNutritionist,
        refreshData
    } = useData();

    // Active section for accordion
    const [activeSection, setActiveSection] = useState(null);

    const [isEditingSubType, setIsEditingSubType] = useState(null);
    const [subTypeForm, setSubTypeForm] = useState({ label: '', months: 1 });

    const [isEditingRate, setIsEditingRate] = useState(null);
    const [rateForm, setRateForm] = useState({ label: '', amount: 0, subscription_type_id: null, is_active: true });

    // Task Category State (Now Tags)
    const [isEditingCategory, setIsEditingCategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ label: '', color: 'bg-slate-100 text-slate-700' });

    // Task Type State
    const [isEditingType, setIsEditingType] = useState(null);
    const [typeForm, setTypeForm] = useState({ label: '' });



    // Profile State - REMOVED

    // Payment Method State
    const [isEditingPaymentMethod, setIsEditingPaymentMethod] = useState(null);
    const [paymentMethodForm, setPaymentMethodForm] = useState({ id: '', label: '' });

    // Payment Category State
    const [isEditingPaymentCategory, setIsEditingPaymentCategory] = useState(null);
    const [paymentCategoryForm, setPaymentCategoryForm] = useState({ id: '', label: '', color: 'bg-slate-100 text-slate-700' });

    // Referral Source State
    const [isEditingReferral, setIsEditingReferral] = useState(null);
    const [referralForm, setReferralForm] = useState({ id: '', label: '' });

    // Clinical Options State
    const [isEditingClinical, setIsEditingClinical] = useState(null);
    const [clinicalForm, setClinicalForm] = useState({ id: '', label: '', category: 'pathology' });

    // Clinical Categories State
    const [isEditingClinicalCategory, setIsEditingClinicalCategory] = useState(null);
    const [clinicalCategoryForm, setClinicalCategoryForm] = useState({ id: '', label: '', color: 'bg-slate-100 text-slate-700' });

    // Nutritionist State
    const [isEditingNutritionist, setIsEditingNutritionist] = useState(null);
    const [nutriForm, setNutriForm] = useState({ id: '', label: '', email: '', phone: '', is_active: true });
    const [nutriPassword, setNutriPassword] = useState('');
    const [nutriSaving, setNutriSaving] = useState(false);
    const [nutriError, setNutriError] = useState(null);

    const colorOptions = [
        { label: 'Gris', value: 'bg-slate-100 text-slate-700' },
        { label: 'Rojo', value: 'bg-red-100 text-red-700' },
        { label: 'Azul', value: 'bg-blue-100 text-blue-700' },
        { label: 'Verde', value: 'bg-green-100 text-green-700' },
        { label: 'Morado', value: 'bg-purple-100 text-purple-700' },
        { label: 'Naranja', value: 'bg-orange-100 text-orange-700' },
    ];

    // Section definitions
    // Section definitions
    const sections = [
        { id: 'tarifas', label: 'Tarifas y Planes', icon: CreditCard, description: 'Planes de suscripción' },
        { id: 'pagos', label: 'Pagos', icon: Wallet, description: 'Métodos y categorías de pago' },
        { id: 'equipo', label: 'Equipo', icon: Users, description: 'Nutricionistas y empleados' },
        { id: 'marketing', label: 'Captación', icon: User, description: 'Fuentes de captación de clientes' },
        { id: 'tareas', label: 'Tareas', icon: Tag, description: 'Etiquetas y tipos de tarea' },
        { id: 'clinical', label: 'Datos Clínicos', icon: Heart, description: 'Opciones de patologías y alimentos' },
        { id: 'datos', label: 'Datos', icon: Database, description: 'Copias de seguridad' },
    ];

    // --- HANDLERS ---
    const handleEditCategory = (category) => {
        setIsEditingCategory(category.id);
        setCategoryForm({ label: category.label, color: category.color });
    };

    const handleSaveCategory = () => {
        if (!categoryForm.label) return;
        if (isEditingCategory === 'new') {
            addTaskCategory(categoryForm);
        } else {
            updateTaskCategory(isEditingCategory, categoryForm);
        }
        setIsEditingCategory(null);
        setCategoryForm({ label: '', color: 'bg-slate-100 text-slate-700' });
    };

    const startNewCategory = () => {
        setIsEditingCategory('new');
        setCategoryForm({ label: '', color: 'bg-slate-100 text-slate-700' });
    };

    const handleDeleteCategory = (id) => {
        if (confirm('¿Seguro que deseas eliminar esta etiqueta?')) {
            deleteTaskCategory(id);
        }
    };

    const handleSaveType = () => {
        if (!typeForm.label) return;
        if (isEditingType === 'new') {
            addTaskType(typeForm);
        } else {
            updateTaskType(isEditingType, typeForm);
        }
        setIsEditingType(null);
        setTypeForm({ label: '' });
    };

    const handleDeleteType = (id) => {
        if (confirm('¿Seguro que deseas eliminar este tipo de tarea?')) {
            deleteTaskType(id);
        }
    };



    const handleSaveSubType = () => {
        if (!subTypeForm.label) return;
        if (isEditingSubType === 'new') {
            addSubscriptionType(subTypeForm);
        } else {
            updateSubscriptionType(isEditingSubType, subTypeForm);
        }
        setIsEditingSubType(null);
        setSubTypeForm({ label: '', months: 1 });
    };

    const handleDeleteSubType = (id) => {
        if (confirm('¿Eliminar este tipo de suscripción?')) {
            deleteSubscriptionType(id);
        }
    };

    const handleSaveRate = () => {
        if (!rateForm.label) return;
        if (isEditingRate === 'new') {
            addPaymentRate(rateForm);
        } else {
            updatePaymentRate(isEditingRate, rateForm);
        }
        setIsEditingRate(null);
        setRateForm({ label: '', amount: 0 });
    };

    const handleDeleteRate = (id) => {
        if (confirm('¿Eliminar esta tarifa?')) {
            deletePaymentRate(id);
        }
    };

    const handleSavePaymentMethod = () => {
        if (!paymentMethodForm.label) return;
        const idToSave = paymentMethodForm.id || paymentMethodForm.label.toLowerCase().replace(/\s+/g, '_');
        if (isEditingPaymentMethod === 'new') {
            addPaymentMethod({ id: idToSave, label: paymentMethodForm.label, is_active: true });
        } else {
            updatePaymentMethod(isEditingPaymentMethod, { label: paymentMethodForm.label });
        }
        setIsEditingPaymentMethod(null);
        setPaymentMethodForm({ id: '', label: '' });
    };

    const handleDeletePaymentMethod = (id) => {
        if (confirm('¿Seguro que deseas eliminar este método de pago?')) {
            deletePaymentMethod(id);
        }
    };

    const handleSavePaymentCategory = () => {
        if (!paymentCategoryForm.label) return;
        const idToSave = paymentCategoryForm.id || paymentCategoryForm.label.toLowerCase().replace(/\s+/g, '_');
        if (isEditingPaymentCategory === 'new') {
            addPaymentCategory({ id: idToSave, label: paymentCategoryForm.label, color: paymentCategoryForm.color, is_active: true });
        } else {
            updatePaymentCategory(isEditingPaymentCategory, { label: paymentCategoryForm.label, color: paymentCategoryForm.color });
        }
        setIsEditingPaymentCategory(null);
        setPaymentCategoryForm({ id: '', label: '', color: 'bg-slate-100 text-slate-700' });
    };

    const handleDeletePaymentCategory = (id) => {
        if (confirm('¿Seguro que deseas eliminar esta categoría de pago?')) {
            deletePaymentCategory(id);
        }
    };

    const handleSaveReferral = () => {
        if (!referralForm.label) return;
        const idToSave = referralForm.id || referralForm.label.toLowerCase().trim().replace(/\s+/g, '_');
        if (isEditingReferral === 'new') {
            addReferralSource({ id: idToSave, label: referralForm.label, is_active: true });
        } else {
            updateReferralSource(isEditingReferral, { label: referralForm.label });
        }
        setIsEditingReferral(null);
        setReferralForm({ id: '', label: '' });
    };

    const handleDeleteReferral = (id) => {
        if (confirm('¿Seguro que deseas eliminar esta opción?')) {
            deleteReferralSource(id);
        }
    };

    const handleSaveClinical = () => {
        if (!clinicalForm.label) return;
        const idToSave = clinicalForm.id || clinicalForm.label.toLowerCase().trim().replace(/\s+/g, '_');

        const payload = {
            id: idToSave,
            label: clinicalForm.label,
            category: clinicalForm.category,
            is_active: true
        };

        if (isEditingClinical === 'new') {
            addClinicalOption(payload);
        } else {
            updateClinicalOption(isEditingClinical, { label: clinicalForm.label, category: clinicalForm.category });
        }
        setIsEditingClinical(null);
        setClinicalForm({ id: '', label: '', category: 'pathology' });
    };

    const handleDeleteClinical = (id) => {
        if (confirm('¿Seguro que deseas eliminar esta opción?')) {
            deleteClinicalOption(id);
        }
    };

    const handleSaveClinicalCategory = () => {
        if (!clinicalCategoryForm.label) return;
        const idToSave = clinicalCategoryForm.id || clinicalCategoryForm.label.toLowerCase().trim().replace(/\s+/g, '_');

        if (isEditingClinicalCategory === 'new') {
            addClinicalCategory({ id: idToSave, label: clinicalCategoryForm.label, color: clinicalCategoryForm.color, is_active: true });
        } else {
            updateClinicalCategory(isEditingClinicalCategory, { label: clinicalCategoryForm.label, color: clinicalCategoryForm.color });
        }
        setIsEditingClinicalCategory(null);
        setClinicalCategoryForm({ id: '', label: '', color: 'bg-slate-100 text-slate-700' });
    };

    const handleDeleteClinicalCategory = (id) => {
        if (confirm('¿Seguro que deseas eliminar esta categoría? Se ocultarán las opciones asociadas.')) {
            deleteClinicalCategory(id);
        }
    };

    const toggleSection = (sectionId) => {
        setActiveSection(activeSection === sectionId ? null : sectionId);
    };

    // Nutritionist Handlers
    const handleSaveNutritionist = async () => {
        if (!nutriForm.label) return;
        setNutriSaving(true);
        setNutriError(null);
        try {
            const idToSave = nutriForm.id || nutriForm.label.toLowerCase().trim().replace(/\s+/g, '_');
            if (isEditingNutritionist === 'new') {
                // First create the nutritionist ficha
                const newNutri = await addNutritionist({ id: idToSave, label: nutriForm.label, email: nutriForm.email || null, phone: nutriForm.phone || null, is_active: nutriForm.is_active });
                const nutriId = newNutri?.id || idToSave;

                // If email + password provided, create auth user and link
                // If email + password provided, create auth user and link
                if (nutriForm.email && nutriPassword) {
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session?.access_token}`,
                            },
                            body: JSON.stringify({
                                email: nutriForm.email,
                                password: nutriPassword,
                                full_name: nutriForm.label,
                                nutritionist_id: nutriId,
                            }),
                        });
                        const result = await res.json();
                        if (!res.ok || result.error) throw new Error(result.error || 'Error al crear el acceso');
                    } catch (error) {
                        console.error('Error creating user, rolling back nutritionist:', error);
                        // Rollback: Delete the nutritionist we just created to prevent orphans/duplicates
                        await deleteNutritionist(nutriId);
                        // Re-throw so the UI shows the error
                        throw error;
                    }
                }
            } else {
                updateNutritionist(isEditingNutritionist, { label: nutriForm.label, email: nutriForm.email || null, phone: nutriForm.phone || null, is_active: nutriForm.is_active });
            }
            setIsEditingNutritionist(null);
            setNutriForm({ id: '', label: '', email: '', phone: '', is_active: true });
            setNutriPassword('');
            if (refreshData) refreshData();
        } catch (err) {
            setNutriError(err.message);
        } finally {
            setNutriSaving(false);
        }
    };

    const handleDeleteNutritionist = (id) => {
        if (confirm('¿Seguro que deseas eliminar este nutricionista?')) {
            deleteNutritionist(id);
        }
    };

    // --- RENDER SECTIONS ---
    const renderTarifasSection = () => (
        <div className="space-y-12">
            {/* Subscription Types */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Layers size={18} /> Tipos de Suscripción
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">Define la periodicidad (Mensual, Trimestral, etc.).</p>
                    </div>
                    <button onClick={() => { setIsEditingSubType('new'); setSubTypeForm({ label: '', months: 1 }); }} className="btn btn-outline shadow-sm" disabled={isEditingSubType !== null}>
                        <Plus size={18} /> Nuevo Tipo
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subscriptionTypes.map(type => (
                        <div key={type.id} className="relative p-6 rounded-2xl border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-lg transition-all">
                            {isEditingSubType === type.id ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre</label>
                                        <input className="form-input mt-1" value={subTypeForm.label} onChange={e => setSubTypeForm({ ...subTypeForm, label: e.target.value })} autoFocus />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Meses</label>
                                        <input type="number" className="form-input mt-1" value={subTypeForm.months} onChange={e => setSubTypeForm({ ...subTypeForm, months: parseInt(e.target.value) || 1 })} />
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button onClick={() => setIsEditingSubType(null)} className="btn btn-sm btn-ghost">Cancelar</button>
                                        <button onClick={handleSaveSubType} className="btn btn-sm btn-primary"><Check size={16} /></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase dark:bg-blue-900/30 dark:text-blue-300">
                                            {type.months} {type.months === 1 ? 'Mes' : 'Meses'}
                                        </span>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setIsEditingSubType(type.id); setSubTypeForm({ label: type.label, months: type.months }); }} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-md transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteSubType(type.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">{type.label}</h4>
                                </>
                            )}
                        </div>
                    ))}
                    {isEditingSubType === 'new' && (
                        <div className="p-6 rounded-2xl border border-primary-500 bg-primary-50/20 ring-2 ring-primary-100 dark:ring-primary-900/30">
                            <h4 className="font-bold text-primary-700 mb-4 text-sm flex items-center gap-2"><Plus size={16} /> Nuevo Tipo</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre</label>
                                    <input className="form-input mt-1" value={subTypeForm.label} onChange={e => setSubTypeForm({ ...subTypeForm, label: e.target.value })} placeholder="Ej. Semestral" autoFocus />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Duración (Meses)</label>
                                    <input type="number" className="form-input mt-1" value={subTypeForm.months} onChange={e => setSubTypeForm({ ...subTypeForm, months: parseInt(e.target.value) || 1 })} />
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => setIsEditingSubType(null)} className="btn btn-sm btn-ghost">Cancelar</button>
                                    <button onClick={handleSaveSubType} className="btn btn-sm btn-primary">Crear</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <hr className="border-gray-100 dark:border-slate-700" />

            {/* Payment Rates */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <CreditCard size={18} /> Tarifas de Pago
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">Define los precios y opciones de pago (€).</p>
                    </div>
                    <button onClick={() => { setIsEditingRate('new'); setRateForm({ label: '', amount: 0, subscription_type_id: null, is_active: true }); }} className="btn btn-outline shadow-sm" disabled={isEditingRate !== null}>
                        <Plus size={18} /> Nueva Tarifa
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paymentRates.map(rate => (
                        <div key={rate.id} className={`relative p-6 rounded-2xl border transition-all ${rate.is_active ? 'border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700' : 'border-gray-100 bg-gray-50 opacity-70'} hover:shadow-lg`}>
                            {isEditingRate === rate.id ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Etiqueta</label>
                                        <input className="form-input mt-1" value={rateForm.label} onChange={e => setRateForm({ ...rateForm, label: e.target.value })} autoFocus />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Precio (€)</label>
                                        <input type="number" className="form-input mt-1" value={rateForm.amount} onChange={e => setRateForm({ ...rateForm, amount: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Vinculado a Plan</label>
                                        <select
                                            className="form-select mt-1"
                                            value={rateForm.subscription_type_id || ''}
                                            onChange={e => setRateForm({ ...rateForm, subscription_type_id: e.target.value || null })}
                                        >
                                            <option value="">-- No vinculado (General) --</option>
                                            {subscriptionTypes.map(t => (
                                                <option key={t.id} value={t.id}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`rateActive-${rate.id}`}
                                            checked={rateForm.is_active !== false}
                                            onChange={e => setRateForm({ ...rateForm, is_active: e.target.checked })}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <label htmlFor={`rateActive-${rate.id}`} className="text-sm text-gray-700 dark:text-gray-300">Tarifa Activa</label>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button onClick={() => setIsEditingRate(null)} className="btn btn-sm btn-ghost">Cancelar</button>
                                        <button onClick={handleSaveRate} className="btn btn-sm btn-primary"><Check size={16} /></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 rounded-lg bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                            <Wallet size={20} />
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => {
                                                setIsEditingRate(rate.id);
                                                setRateForm({
                                                    label: rate.label,
                                                    amount: rate.amount,
                                                    subscription_type_id: rate.subscription_type_id || null,
                                                    is_active: rate.is_active
                                                });
                                            }} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-md transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteRate(rate.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{rate.label}</h4>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{rate.amount}€</p>

                                    {rate.subscription_type_id && (
                                        <div className="mt-2 text-xs text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30 px-2 py-1 rounded inline-block">
                                            {subscriptionTypes.find(t => t.id === rate.subscription_type_id)?.label || 'Plan vinculado'}
                                        </div>
                                    )}

                                    {rate.is_active === false && <span className="block mt-2 text-xs text-red-500 font-bold uppercase border border-red-200 bg-red-50 px-2 py-1 rounded w-fit">Archivado</span>}
                                </>
                            )}
                        </div>
                    ))}
                    {isEditingRate === 'new' && (
                        <div className="p-6 rounded-2xl border border-primary-500 bg-primary-50/20 ring-2 ring-primary-100 dark:ring-primary-900/30">
                            <h4 className="font-bold text-primary-700 mb-4 text-sm flex items-center gap-2"><Plus size={16} /> Nueva Tarifa</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Etiqueta</label>
                                    <input className="form-input mt-1" value={rateForm.label} onChange={e => setRateForm({ ...rateForm, label: e.target.value })} placeholder="Ej. General 2026" autoFocus />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Precio (€)</label>
                                    <input type="number" className="form-input mt-1" value={rateForm.amount} onChange={e => setRateForm({ ...rateForm, amount: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Vinculado a Plan</label>
                                    <select
                                        className="form-select mt-1"
                                        value={rateForm.subscription_type_id || ''}
                                        onChange={e => setRateForm({ ...rateForm, subscription_type_id: e.target.value || null })}
                                    >
                                        <option value="">-- No vinculado (General) --</option>
                                        {subscriptionTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="newRateActive"
                                        checked={rateForm.is_active !== false}
                                        onChange={e => setRateForm({ ...rateForm, is_active: e.target.checked })}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <label htmlFor="newRateActive" className="text-sm text-gray-700 dark:text-gray-300">Tarifa Activa</label>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => setIsEditingRate(null)} className="btn btn-sm btn-ghost">Cancelar</button>
                                    <button onClick={handleSaveRate} className="btn btn-sm btn-primary">Crear</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderPagosSection = () => (
        <div className="space-y-8">
            {/* Payment Methods */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Wallet size={18} /> Métodos de Pago
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">Configura los métodos de pago disponibles.</p>
                    </div>
                    <button onClick={() => { setIsEditingPaymentMethod('new'); setPaymentMethodForm({ id: '', label: '' }); }} className="btn btn-outline shadow-sm" disabled={isEditingPaymentMethod !== null}>
                        <Plus size={18} /> Nuevo Método
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentMethods.map(method => (
                        <div key={method.id} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700">
                            {isEditingPaymentMethod === method.id ? (
                                <div className="flex gap-2 w-full">
                                    <input className="form-input h-9 text-sm" value={paymentMethodForm.label} onChange={e => setPaymentMethodForm({ ...paymentMethodForm, label: e.target.value })} autoFocus />
                                    <button onClick={handleSavePaymentMethod} className="btn btn-sm btn-primary"><Check size={14} /></button>
                                    <button onClick={() => setIsEditingPaymentMethod(null)} className="btn btn-sm btn-ghost"><X size={14} /></button>
                                </div>
                            ) : (
                                <>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{method.label}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setIsEditingPaymentMethod(method.id); setPaymentMethodForm({ id: method.id, label: method.label }); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeletePaymentMethod(method.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {isEditingPaymentMethod === 'new' && (
                        <div className="flex gap-2 w-full p-4 rounded-xl border border-primary-500 bg-primary-50/50">
                            <input className="form-input h-9 text-sm" value={paymentMethodForm.label} onChange={e => setPaymentMethodForm({ ...paymentMethodForm, label: e.target.value })} placeholder="Nombre del método..." autoFocus />
                            <button onClick={handleSavePaymentMethod} className="btn btn-sm btn-primary"><Check size={14} /></button>
                            <button onClick={() => setIsEditingPaymentMethod(null)} className="btn btn-sm btn-ghost"><X size={14} /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Categories */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-8">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Layers size={18} /> Categorías de Pago
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">Clasifica tus pagos por categoría (Online, Hawk, Maroon, etc.).</p>
                    </div>
                    <button onClick={() => { setIsEditingPaymentCategory('new'); setPaymentCategoryForm({ id: '', label: '', color: 'bg-slate-100 text-slate-700' }); }} className="btn btn-outline shadow-sm" disabled={isEditingPaymentCategory !== null}>
                        <Plus size={18} /> Nueva Categoría
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentCategories.map(cat => (
                        <div key={cat.id} className={`relative p-4 rounded-xl border transition-all duration-300 ${isEditingPaymentCategory === cat.id ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-100 dark:bg-primary-900/30' : 'border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}>
                            {isEditingPaymentCategory === cat.id ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre</label>
                                        <input className="form-input mt-1 bg-white h-9" value={paymentCategoryForm.label} onChange={e => setPaymentCategoryForm({ ...paymentCategoryForm, label: e.target.value })} autoFocus />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Color</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {colorOptions.map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => setPaymentCategoryForm({ ...paymentCategoryForm, color: option.value })}
                                                    className={`w-6 h-6 rounded-full border-2 ${paymentCategoryForm.color === option.value ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-110'} transition-transform`}
                                                    style={{ backgroundColor: option.value.includes('slate') ? '#f1f5f9' : option.value.includes('red') ? '#fee2e2' : option.value.includes('blue') ? '#dbeafe' : option.value.includes('green') ? '#dcfce7' : option.value.includes('purple') ? '#f3e8ff' : '#ffedd5' }}
                                                    title={option.label}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button onClick={() => setIsEditingPaymentCategory(null)} className="btn btn-sm btn-ghost text-gray-500 hover:bg-white">Cancelar</button>
                                        <button onClick={handleSavePaymentCategory} className="btn btn-sm btn-primary"><Check size={16} /> Guardar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${cat.color}`}>{cat.label}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setIsEditingPaymentCategory(cat.id); setPaymentCategoryForm({ id: cat.id, label: cat.label, color: cat.color }); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeletePaymentCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {isEditingPaymentCategory === 'new' && (
                        <div className="p-4 rounded-xl border border-primary-500 bg-primary-50/50 ring-2 ring-primary-100 animate-fade-in">
                            <h4 className="font-bold text-primary-700 mb-3 text-sm flex items-center gap-2"><Plus size={16} /> Nueva Categoría</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre</label>
                                    <input className="form-input mt-1 bg-white h-9" value={paymentCategoryForm.label} onChange={e => setPaymentCategoryForm({ ...paymentCategoryForm, label: e.target.value })} placeholder="Ej. Online" autoFocus />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Color</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {colorOptions.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => setPaymentCategoryForm({ ...paymentCategoryForm, color: option.value })}
                                                className={`w-6 h-6 rounded-full border-2 ${paymentCategoryForm.color === option.value ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-110'} transition-transform`}
                                                style={{ backgroundColor: option.value.includes('slate') ? '#f1f5f9' : option.value.includes('red') ? '#fee2e2' : option.value.includes('blue') ? '#dbeafe' : option.value.includes('green') ? '#dcfce7' : option.value.includes('purple') ? '#f3e8ff' : '#ffedd5' }}
                                                title={option.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => setIsEditingPaymentCategory(null)} className="btn btn-sm btn-ghost text-gray-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700">Cancelar</button>
                                    <button onClick={handleSavePaymentCategory} className="btn btn-sm btn-primary">Crear</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderMarketingSection = () => (
        <div className="space-y-8">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <User size={18} /> Fuentes de Captación
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">¿Cómo te conocen tus clientes?</p>
                    </div>
                    <button onClick={() => { setIsEditingReferral('new'); setReferralForm({ id: '', label: '' }); }} className="btn btn-outline shadow-sm" disabled={isEditingReferral !== null}>
                        <Plus size={18} /> Nueva Opción
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {referralSources.map(source => (
                        <div key={source.id} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700">
                            {isEditingReferral === source.id ? (
                                <div className="flex gap-2 w-full">
                                    <input className="form-input h-9 text-sm" value={referralForm.label} onChange={e => setReferralForm({ ...referralForm, label: e.target.value })} autoFocus />
                                    <button onClick={handleSaveReferral} className="btn btn-sm btn-primary"><Check size={14} /></button>
                                    <button onClick={() => setIsEditingReferral(null)} className="btn btn-sm btn-ghost"><X size={14} /></button>
                                </div>
                            ) : (
                                <>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{source.label}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setIsEditingReferral(source.id); setReferralForm({ id: source.id, label: source.label }); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteReferral(source.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {isEditingReferral === 'new' && (
                        <div className="flex gap-2 w-full p-4 rounded-xl border border-primary-500 bg-primary-50/50">
                            <input className="form-input h-9 text-sm" value={referralForm.label} onChange={e => setReferralForm({ ...referralForm, label: e.target.value })} placeholder="Ej. Instagram, Google..." autoFocus />
                            <button onClick={handleSaveReferral} className="btn btn-sm btn-primary"><Check size={14} /></button>
                            <button onClick={() => setIsEditingReferral(null)} className="btn btn-sm btn-ghost"><X size={14} /></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderTareasSection = () => (
        <div className="space-y-8">
            {/* Task Categories (Tags) */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Tag size={18} /> Etiquetas de Tareas
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">Etiquetas de color para priorizar y organizar.</p>
                    </div>
                    <button onClick={startNewCategory} className="btn btn-outline shadow-sm" disabled={isEditingCategory !== null}>
                        <Plus size={18} /> Nueva Etiqueta
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {taskCategories.map(category => (
                        <div key={category.id} className={`relative p-4 rounded-xl border transition-all duration-300 ${isEditingCategory === category.id ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-100 dark:bg-primary-900/30' : 'border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}>
                            {isEditingCategory === category.id ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre</label>
                                        <input className="form-input mt-1 bg-white h-9" value={categoryForm.label} onChange={e => setCategoryForm({ ...categoryForm, label: e.target.value })} autoFocus />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Color</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {colorOptions.map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => setCategoryForm({ ...categoryForm, color: option.value })}
                                                    className={`w-6 h-6 rounded-full border-2 ${categoryForm.color === option.value ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-110'} transition-transform`}
                                                    style={{ backgroundColor: option.value.includes('slate') ? '#f1f5f9' : option.value.includes('red') ? '#fee2e2' : option.value.includes('blue') ? '#dbeafe' : option.value.includes('green') ? '#dcfce7' : option.value.includes('purple') ? '#f3e8ff' : '#ffedd5' }}
                                                    title={option.label}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button onClick={() => setIsEditingCategory(null)} className="btn btn-sm btn-ghost text-gray-500 hover:bg-white">Cancelar</button>
                                        <button onClick={handleSaveCategory} className="btn btn-sm btn-primary"><Check size={16} /> Guardar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${category.color}`}>{category.label}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEditCategory(category)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteCategory(category.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {isEditingCategory === 'new' && (
                        <div className="p-4 rounded-xl border border-primary-500 bg-primary-50/50 ring-2 ring-primary-100 animate-fade-in">
                            <h4 className="font-bold text-primary-700 mb-3 text-sm flex items-center gap-2"><Plus size={16} /> Nueva Etiqueta</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre</label>
                                    <input className="form-input mt-1 bg-white h-9" value={categoryForm.label} onChange={e => setCategoryForm({ ...categoryForm, label: e.target.value })} placeholder="Ej. Personal" autoFocus />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Color</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {colorOptions.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => setCategoryForm({ ...categoryForm, color: option.value })}
                                                className={`w-6 h-6 rounded-full border-2 ${categoryForm.color === option.value ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-110'} transition-transform`}
                                                style={{ backgroundColor: option.value.includes('slate') ? '#f1f5f9' : option.value.includes('red') ? '#fee2e2' : option.value.includes('blue') ? '#dbeafe' : option.value.includes('green') ? '#dcfce7' : option.value.includes('purple') ? '#f3e8ff' : '#ffedd5' }}
                                                title={option.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => setIsEditingCategory(null)} className="btn btn-sm btn-ghost text-gray-500 hover:bg-white">Cancelar</button>
                                    <button onClick={handleSaveCategory} className="btn btn-sm btn-primary">Crear</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Task Types */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-8">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Database size={18} /> Tipos de Tarea
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">Define los grandes grupos de tareas (Marketing, Clientes, etc).</p>
                    </div>
                    <button onClick={() => { setIsEditingType('new'); setTypeForm({ label: '' }); }} className="btn btn-outline shadow-sm" disabled={isEditingType !== null}>
                        <Plus size={18} /> Nuevo Tipo
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {taskTypes.map(type => (
                        <div key={type.id} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700">
                            {isEditingType === type.id ? (
                                <div className="flex gap-2 w-full">
                                    <input className="form-input h-9 text-sm" value={typeForm.label} onChange={e => setTypeForm({ ...typeForm, label: e.target.value })} autoFocus />
                                    <button onClick={handleSaveType} className="btn btn-sm btn-primary"><Check size={14} /></button>
                                    <button onClick={() => setIsEditingType(null)} className="btn btn-sm btn-ghost"><X size={14} /></button>
                                </div>
                            ) : (
                                <>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{type.label}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setIsEditingType(type.id); setTypeForm({ label: type.label }); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteType(type.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {isEditingType === 'new' && (
                        <div className="flex gap-2 w-full p-4 rounded-xl border border-primary-500 bg-primary-50/50">
                            <input className="form-input h-9 text-sm" value={typeForm.label} onChange={e => setTypeForm({ ...typeForm, label: e.target.value })} placeholder="Nombre del tipo..." autoFocus />
                            <button onClick={handleSaveType} className="btn btn-sm btn-primary"><Check size={14} /></button>
                            <button onClick={() => setIsEditingType(null)} className="btn btn-sm btn-ghost"><X size={14} /></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );


    const renderDatosSection = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 flex flex-col items-center text-center">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-full text-blue-500 mb-3 shadow-sm"><Download size={24} /></div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-2">Exportar Copia de Seguridad</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Descarga un archivo .json con todos tus clientes y configuraciones.</p>
                <button onClick={exportData} className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none w-full shadow-md shadow-blue-900/10">Descargar Copia</button>
            </div>

            <div className="p-6 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 flex flex-col items-center text-center">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-full text-orange-500 mb-3 shadow-sm"><Upload size={24} /></div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-2">Importar Datos</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Restaura una copia de seguridad seleccionando un archivo .json.</p>
                <label className="btn btn-outline border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 w-full cursor-pointer transition-colors">
                    Seleccionar Archivo
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => importData(event.target.result);
                                reader.readAsText(file);
                            }
                        }}
                    />
                </label>
            </div>
        </div>
    );

    const renderClinicalSection = () => {
        const categories = clinicalCategories && clinicalCategories.length > 0 ? clinicalCategories : [
            { id: 'pathology', label: 'Patologías', color: 'bg-orange-100 text-orange-800' },
            { id: 'dislike', label: 'Alimentos NO gustan', color: 'bg-slate-100 text-slate-700' },
            { id: 'favorite', label: 'Alimentos Favoritos', color: 'bg-green-100 text-green-800' }
        ];

        return (
            <div className="space-y-8">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Heart size={18} /> Opciones Clínicas
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">Configura las categorías y opciones para autocompletar.</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setIsEditingClinicalCategory('new');
                                    setClinicalCategoryForm({ id: '', label: '', color: 'bg-slate-100 text-slate-700' });
                                }}
                                className="btn btn-outline shadow-sm"
                                disabled={isEditingClinicalCategory !== null}
                            >
                                <Tag size={16} className="mr-2" /> Nueva Categoría
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditingClinical('new');
                                    setClinicalForm({ id: '', label: '', category: categories[0]?.id || 'pathology' });
                                }}
                                className="btn btn-outline shadow-sm"
                                disabled={isEditingClinical !== null}
                            >
                                <Plus size={16} className="mr-2" /> Nueva Opción
                            </button>
                        </div>
                    </div>

                    {isEditingClinicalCategory === 'new' && (
                        <div className="mb-6 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 animate-fade-in">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm">Nueva Categoría</h4>
                            <div className="flex flex-col md:flex-row gap-3 items-center">
                                <input
                                    className="form-input text-sm flex-1 w-full"
                                    placeholder="Nombre de categoría..."
                                    value={clinicalCategoryForm.label}
                                    onChange={e => setClinicalCategoryForm({ ...clinicalCategoryForm, label: e.target.value })}
                                    autoFocus
                                />
                                <div className="flex gap-1">
                                    {colorOptions.map(co => (
                                        <button
                                            key={co.value}
                                            onClick={() => setClinicalCategoryForm({ ...clinicalCategoryForm, color: co.value })}
                                            className={`w-8 h-8 rounded-full border ${co.value} ${clinicalCategoryForm.color === co.value ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleSaveClinicalCategory} className="btn btn-primary btn-sm">Guardar</button>
                                    <button onClick={() => setIsEditingClinicalCategory(null)} className="btn btn-ghost btn-sm">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map(cat => (
                            <div key={cat.id} className="space-y-3">
                                {isEditingClinicalCategory === cat.id ? (
                                    <div className="p-3 border rounded-lg bg-white dark:bg-slate-800 shadow-sm space-y-3">
                                        <input
                                            className="form-input text-xs w-full"
                                            value={clinicalCategoryForm.label}
                                            onChange={e => setClinicalCategoryForm({ ...clinicalCategoryForm, label: e.target.value })}
                                        />
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-1 flex-wrap">
                                                {colorOptions.map(co => (
                                                    <button
                                                        key={co.value}
                                                        onClick={() => setClinicalCategoryForm({ ...clinicalCategoryForm, color: co.value })}
                                                        className={`w-5 h-5 rounded-full border ${co.value} ${clinicalCategoryForm.color === co.value ? 'ring-1 ring-offset-1 ring-slate-400' : ''}`}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={handleSaveClinicalCategory} className="p-1 hover:bg-green-50 text-green-600 rounded bg-slate-50 border"><Check size={14} /></button>
                                                <button onClick={() => setIsEditingClinicalCategory(null)} className="p-1 hover:bg-slate-50 text-slate-500 rounded bg-slate-50 border"><X size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center group/cat">
                                        <h5 className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md inline-block ${cat.color}`}>
                                            {cat.label}
                                        </h5>
                                        <div className="flex gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setIsEditingClinicalCategory(cat.id);
                                                    setClinicalCategoryForm({ id: cat.id, label: cat.label, color: cat.color });
                                                }}
                                                className="p-1 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClinicalCategory(cat.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {clinicalOptions?.filter(opt => opt.category === cat.id).map(opt => (
                                        <div key={opt.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-sm transition-shadow">
                                            {isEditingClinical === opt.id ? (
                                                <div className="flex gap-1 w-full items-center">
                                                    <select
                                                        className="form-select h-8 text-xs py-0 pl-2 pr-6 w-32 bg-slate-50 border-slate-200"
                                                        value={clinicalForm.category}
                                                        onChange={e => setClinicalForm({ ...clinicalForm, category: e.target.value })}
                                                    >
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                    </select>
                                                    <input
                                                        className="form-input h-8 text-xs p-1 flex-1"
                                                        value={clinicalForm.label}
                                                        onChange={e => setClinicalForm({ ...clinicalForm, label: e.target.value })}
                                                        autoFocus
                                                    />
                                                    <button onClick={handleSaveClinical} className="btn btn-xs btn-primary h-8 w-8 p-0 flex items-center justify-center"><Check size={14} /></button>
                                                    <button onClick={() => setIsEditingClinical(null)} className="btn btn-xs btn-ghost h-8 w-8 p-0 flex items-center justify-center"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{opt.label}</span>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setIsEditingClinical(opt.id);
                                                                setClinicalForm({ id: opt.id, label: opt.label, category: opt.category });
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-primary-600 rounded bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClinical(opt.id)}
                                                            className="p-1 text-slate-400 hover:text-red-500 rounded bg-slate-50 dark:bg-slate-700/50 hover:bg-red-50"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {clinicalOptions?.filter(opt => opt.category === cat.id).length === 0 && (
                                        <div className="text-xs text-slate-400 italic p-2">Sin opciones configuradas</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {isEditingClinical === 'new' && (
                        <div className="mt-6 p-4 rounded-xl border border-primary-500 bg-primary-50/50 ring-2 ring-primary-100 animate-fade-in max-w-md mx-auto">
                            <h4 className="font-bold text-primary-700 mb-3 text-sm flex items-center gap-2"><Plus size={16} /> Nueva Opción</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Categoría</label>
                                    <select
                                        className="form-select mt-1 bg-white h-9 text-sm"
                                        value={clinicalForm.category}
                                        onChange={e => setClinicalForm({ ...clinicalForm, category: e.target.value })}
                                    >
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre</label>
                                    <input
                                        className="form-input mt-1 bg-white h-9 text-sm"
                                        value={clinicalForm.label}
                                        onChange={e => setClinicalForm({ ...clinicalForm, label: e.target.value })}
                                        placeholder="Ej. Hipertensión, Brócoli..."
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => setIsEditingClinical(null)} className="btn btn-sm btn-ghost text-gray-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700">Cancelar</button>
                                    <button onClick={handleSaveClinical} className="btn btn-sm btn-primary">Crear</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderEquipoSection = () => (
        <div className="space-y-8">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Users size={18} /> Nutricionistas
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">Gestiona tu equipo de nutricionistas y empleados.</p>
                    </div>
                    <button onClick={() => { setIsEditingNutritionist('new'); setNutriForm({ id: '', label: '', email: '', phone: '', is_active: true }); }} className="btn btn-outline shadow-sm" disabled={isEditingNutritionist !== null}>
                        <Plus size={18} /> Nuevo Nutricionista
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {nutritionists.map(nutri => (
                        <div key={nutri.id} className={`relative p-6 rounded-2xl border transition-all ${nutri.is_active !== false ? 'border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700' : 'border-gray-100 bg-gray-50 opacity-70'} hover:shadow-lg`}>
                            {isEditingNutritionist === nutri.id ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre</label>
                                        <input className="form-input mt-1" value={nutriForm.label} onChange={e => setNutriForm({ ...nutriForm, label: e.target.value })} autoFocus />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Email</label>
                                        <input type="email" className="form-input mt-1" value={nutriForm.email} onChange={e => setNutriForm({ ...nutriForm, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Teléfono</label>
                                        <input className="form-input mt-1" value={nutriForm.phone} onChange={e => setNutriForm({ ...nutriForm, phone: e.target.value })} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`nutriActive-${nutri.id}`}
                                            checked={nutriForm.is_active !== false}
                                            onChange={e => setNutriForm({ ...nutriForm, is_active: e.target.checked })}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <label htmlFor={`nutriActive-${nutri.id}`} className="text-sm text-gray-700 dark:text-gray-300">Nutricionista Activo</label>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button onClick={() => setIsEditingNutritionist(null)} className="btn btn-sm btn-ghost">Cancelar</button>
                                        <button onClick={handleSaveNutritionist} className="btn btn-sm btn-primary"><Check size={16} /></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                                            <User size={20} />
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setIsEditingNutritionist(nutri.id); setNutriForm({ id: nutri.id, label: nutri.label, email: nutri.email || '', phone: nutri.phone || '', is_active: nutri.is_active }); }} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-md transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteNutritionist(nutri.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{nutri.label}</h4>
                                    {nutri.email && <p className="text-sm text-slate-500 dark:text-slate-400">{nutri.email}</p>}
                                    {nutri.phone && <p className="text-sm text-slate-500 dark:text-slate-400">{nutri.phone}</p>}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {nutri.user_id && <span className="text-xs text-green-600 font-bold uppercase border border-green-200 bg-green-50 px-2 py-1 rounded">Con acceso</span>}
                                        {nutri.is_active === false && <span className="text-xs text-red-500 font-bold uppercase border border-red-200 bg-red-50 px-2 py-1 rounded">Inactivo</span>}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {isEditingNutritionist === 'new' && (
                        <div className="p-6 rounded-2xl border border-primary-500 bg-primary-50/20 ring-2 ring-primary-100 dark:ring-primary-900/30">
                            <h4 className="font-bold text-primary-700 mb-4 text-sm flex items-center gap-2"><Plus size={16} /> Nuevo Nutricionista</h4>
                            {nutriError && (
                                <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm">{nutriError}</div>
                            )}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre</label>
                                    <input className="form-input mt-1" value={nutriForm.label} onChange={e => setNutriForm({ ...nutriForm, label: e.target.value })} placeholder="Ej. Ana García" autoFocus />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Email <span className="text-red-400">*</span></label>
                                    <input type="email" className="form-input mt-1" value={nutriForm.email} onChange={e => setNutriForm({ ...nutriForm, email: e.target.value })} placeholder="ana@nutricion.com" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Teléfono</label>
                                    <input className="form-input mt-1" value={nutriForm.phone} onChange={e => setNutriForm({ ...nutriForm, phone: e.target.value })} placeholder="+34 600 000 000" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1"><KeyRound size={12} /> Contraseña Provisional <span className="text-red-400">*</span></label>
                                    <input type="password" className="form-input mt-1" value={nutriPassword} onChange={e => setNutriPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
                                    <p className="text-xs text-slate-400 mt-1">El nutricionista la cambiará con "He olvidado mi contraseña".</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="newNutriActive"
                                        checked={nutriForm.is_active !== false}
                                        onChange={e => setNutriForm({ ...nutriForm, is_active: e.target.checked })}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <label htmlFor="newNutriActive" className="text-sm text-gray-700 dark:text-gray-300">Nutricionista Activo</label>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => { setIsEditingNutritionist(null); setNutriPassword(''); setNutriError(null); }} className="btn btn-sm btn-ghost">Cancelar</button>
                                    <button onClick={handleSaveNutritionist} disabled={nutriSaving} className="btn btn-sm btn-primary">
                                        {nutriSaving ? 'Guardando...' : 'Crear'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <LinkNutritionistModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onLinked={() => {
                    if (refreshData) refreshData();
                }}
            />
        </div>
    );

    const getSectionContent = (sectionId) => {
        switch (sectionId) {
            case 'tarifas': return renderTarifasSection();
            case 'pagos': return renderPagosSection();
            case 'equipo': return renderEquipoSection();
            case 'marketing': return renderMarketingSection();
            case 'tareas': return renderTareasSection();

            case 'clinical': return renderClinicalSection();
            case 'datos': return renderDatosSection();
            default: return null;
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Configuración</h1>
                    <p className="page-subtitle">Gestiona las tarifas, pagos y preferencias</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto space-y-4">
                {sections.map(section => (
                    <div key={section.id} className="card overflow-hidden dark:bg-slate-800/50 dark:border-slate-700">
                        {/* Section Header (Accordion Trigger) */}
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full p-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${activeSection === section.id ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'} transition-colors`}>
                                    <section.icon size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{section.label}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{section.description}</p>
                                </div>
                            </div>
                            <div className={`p-2 rounded-full ${activeSection === section.id ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'} transition-all`}>
                                {activeSection === section.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </div>
                        </button>

                        {/* Section Content (Accordion Panel) */}
                        {activeSection === section.id && (
                            <div className="border-t border-slate-100 dark:border-slate-700 p-6 bg-slate-50/30 dark:bg-slate-800/30 animate-fade-in">
                                {getSectionContent(section.id)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Settings;
