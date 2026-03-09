import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../supabaseClient';
import {
    Plus, Trash2, Edit2, Check, X, Settings as SettingsIcon, CreditCard, User, Database,
    Download, Upload, ArrowDown, ArrowUp, Tag, Wallet, ChevronDown, ChevronRight, Layers, Heart, Users, KeyRound, FileText, CalendarDays, Save, MessageCircle
} from 'lucide-react';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MEALS = ['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena'];

const Settings = () => {
    const {
        subscriptionTypes, addSubscriptionType, updateSubscriptionType, deleteSubscriptionType,
        paymentRates, addPaymentRate, updatePaymentRate, deletePaymentRate,
        appointmentTypes, addAppointmentType, updateAppointmentType, deleteAppointmentType,
        voucherTypes, addVoucherType, updateVoucherType, deleteVoucherType,
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
        recipePhrases, addRecipePhrase, updateRecipePhrase, deleteRecipePhrase,
        refreshData
    } = useData();
    const { showToast } = useToast();

    // Active section for accordion
    const [activeSection, setActiveSection] = useState(null);

    const [isEditingSubType, setIsEditingSubType] = useState(null);
    const [subTypeForm, setSubTypeForm] = useState({ label: '', months: 1 });

    const [isEditingRate, setIsEditingRate] = useState(null);
    const [rateForm, setRateForm] = useState({ label: '', amount: 0, subscription_type_id: null, is_active: true });

    const [isEditingAppointmentType, setIsEditingAppointmentType] = useState(null);
    const [appointmentTypeForm, setAppointmentTypeForm] = useState({ name: '', duration_minutes: 30, price: 0, category_id: '', is_active: true });

    const [isEditingVoucherType, setIsEditingVoucherType] = useState(null);
    const [voucherTypeForm, setVoucherTypeForm] = useState({ name: '', total_sessions: 4, duration_days: 90, price: 0, category_id: '', is_active: true });

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

    // Recipe Phrases
    const [isEditingPhrase, setIsEditingPhrase] = useState(null);
    const [phraseForm, setPhraseForm] = useState({ name: '', content: '' });

    // Schema Template
    const [schemaNutritionistId, setSchemaNutritionistId] = useState(null);
    const [schemaMatrix, setSchemaMatrix] = useState({});
    const [isSavingSchema, setIsSavingSchema] = useState(false);

    // Portal Settings
    const [portalMessage, setPortalMessage] = useState(userProfile?.review_message || '');
    const [isSavingPortal, setIsSavingPortal] = useState(false);

    // Sync portalMessage if userProfile loads late
    useEffect(() => {
        if (userProfile?.review_message !== undefined) {
            setPortalMessage(userProfile.review_message || '');
        }
    }, [userProfile?.review_message]);

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
        { id: 'citas', label: 'Citas Presenciales', icon: CalendarDays, description: 'Tipos de cita y tarifas' },
        { id: 'pagos', label: 'Pagos', icon: Wallet, description: 'Métodos y categorías de pago' },
        { id: 'equipo', label: 'Equipo', icon: Users, description: 'Nutricionistas y empleados' },
        { id: 'marketing', label: 'Captación', icon: User, description: 'Fuentes de captación de clientes' },
        { id: 'tareas', label: 'Tareas', icon: Tag, description: 'Etiquetas y tipos de tarea' },
        { id: 'clinical', label: 'Datos Clínicos', icon: Heart, description: 'Opciones de patologías y alimentos' },
        { id: 'recetas', label: 'Textos de Recetas', icon: FileText, description: 'Frases prediseñadas para descripciones de recetas' },
        { id: 'esquema', label: 'Esquema Semanal', icon: CalendarDays, description: 'Plantilla base de menú para PDF' },
        { id: 'portal', label: 'Portal del Paciente', icon: MessageCircle, description: 'Configura la vista pública de los clientes' },
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

    const handleSaveAppointmentType = () => {
        if (!appointmentTypeForm.name) return;
        if (isEditingAppointmentType === 'new') {
            addAppointmentType(appointmentTypeForm);
            showToast('Tipo de cita creado', 'success');
        } else {
            updateAppointmentType(isEditingAppointmentType, appointmentTypeForm);
            showToast('Tipo de cita actualizado', 'success');
        }
        setIsEditingAppointmentType(null);
        setAppointmentTypeForm({ name: '', duration_minutes: 30, price: 0, category_id: '', is_active: true });
    };

    const handleDeleteAppointmentType = (id) => {
        if (confirm('¿Seguro que deseas eliminar este tipo de cita?')) {
            deleteAppointmentType(id);
            showToast('Tipo de cita eliminado', 'success');
        }
    };

    const handleSaveVoucherType = async () => {
        if (!voucherTypeForm.name) {
            showToast('El nombre del bono es obligatorio', 'error');
            return;
        }

        const payload = { ...voucherTypeForm };
        if (!payload.category_id) payload.category_id = null;

        try {
            if (isEditingVoucherType === 'new') {
                await addVoucherType(payload);
                showToast('Tipo de bono creado correctamente', 'success');
            } else {
                await updateVoucherType(isEditingVoucherType, payload);
                showToast('Tipo de bono actualizado', 'success');
            }
            setIsEditingVoucherType(null);
        } catch (error) {
            showToast('Error al guardar el tipo de bono', 'error');
        }
    };

    const handleDeleteVoucherType = (id) => {
        if (confirm('¿Seguro que deseas eliminar este tipo de bono? Los pacientes que ya lo hayan adquirido podrán seguir usándolo.')) {
            deleteVoucherType(id);
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

    const handleSavePhrase = () => {
        if (!phraseForm.name || !phraseForm.content) return;
        if (isEditingPhrase === 'new') {
            addRecipePhrase(phraseForm);
        } else {
            updateRecipePhrase(isEditingPhrase, phraseForm);
        }
        setIsEditingPhrase(null);
        setPhraseForm({ name: '', content: '' });
    };

    const handleDeletePhrase = (id) => {
        if (confirm('¿Seguro que deseas eliminar esta frase prediseñada?')) {
            deleteRecipePhrase(id);
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

    const handleDeleteNutritionist = async (id, userId) => {
        if (!confirm('¿Seguro que deseas eliminar este nutricionista? Esto revocará su acceso al sistema si tiene uno.')) return;

        setNutriSaving(true);
        setNutriError(null);
        try {
            if (userId) {
                // Determine base URL depending on environment
                const siteUrl = import.meta.env.VITE_SUPABASE_URL; // use project url to hit functions

                // If nutritionist has an auth user, call Edge Function to delete the user completely
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('No hay sesión activa');

                const res = await fetch(`${siteUrl}/functions/v1/delete-user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ targetUserId: userId })
                });

                const result = await res.json();
                if (!res.ok || result.error) throw new Error(result.error || 'Error al eliminar el usuario');

                // Edge function deletion handles cascading deletion of profile and nutritionist,
                // but we also locally update context just in case, or UI will update via subscription.
            } else {
                // If no auth user is linked, just delete the nutritionist record directly
                await deleteNutritionist(id);
            }

        } catch (err) {
            console.error('Error deleting nutritionist:', err);
            setNutriError(err.message || 'Error al eliminar');
        } finally {
            setNutriSaving(false);
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

    const renderCitasSection = () => (
        <div className="space-y-8">
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <CalendarDays size={18} /> Tipos de Citas Presenciales
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">Configura los servicios que ofreces, su duración y precio.</p>
                    </div>
                    <button onClick={() => { setIsEditingAppointmentType('new'); setAppointmentTypeForm({ name: '', duration_minutes: 30, price: 0, category_id: '', is_active: true, color_hex: '#28483a' }); }} className="btn btn-outline shadow-sm" disabled={isEditingAppointmentType !== null}>
                        <Plus size={18} /> Nuevo Tipo
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {appointmentTypes?.map(type => (
                        <div key={type.id} className="relative p-6 rounded-2xl border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-lg transition-all">
                            {isEditingAppointmentType === type.id ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre del Servicio</label>
                                        <input className="form-input mt-1" value={appointmentTypeForm.name} onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, name: e.target.value })} autoFocus />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Duración (min)</label>
                                            <input type="number" className="form-input mt-1" value={appointmentTypeForm.duration_minutes} onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, duration_minutes: parseInt(e.target.value) || 30 })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Precio (€)</label>
                                            <input type="number" step="0.01" className="form-input mt-1" value={appointmentTypeForm.price} onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, price: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Centro / Etiqueta</label>
                                            <select
                                                className="form-select mt-1"
                                                value={appointmentTypeForm.category_id || ''}
                                                onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, category_id: e.target.value || null })}
                                            >
                                                <option value="">-- Sin asignar --</option>
                                                {paymentCategories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Color Calendario</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <input
                                                    type="color"
                                                    value={appointmentTypeForm.color_hex || '#28483a'}
                                                    onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, color_hex: e.target.value })}
                                                    className="w-10 h-10 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={appointmentTypeForm.color_hex || '#28483a'}
                                                    onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, color_hex: e.target.value })}
                                                    className="form-input"
                                                    placeholder="#28483a"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            id={`active-${type.id}`}
                                            checked={appointmentTypeForm.is_active}
                                            onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, is_active: e.target.checked })}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <label htmlFor={`active-${type.id}`} className="text-sm text-gray-700 dark:text-gray-300">Activo</label>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button onClick={() => setIsEditingAppointmentType(null)} className="btn btn-sm btn-ghost">Cancelar</button>
                                        <button onClick={handleSaveAppointmentType} className="btn btn-sm btn-primary">Guardar</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                            <CalendarDays size={20} />
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => {
                                                setIsEditingAppointmentType(type.id);
                                                setAppointmentTypeForm({
                                                    name: type.name,
                                                    duration_minutes: type.duration_minutes,
                                                    price: type.price,
                                                    category_id: type.category_id || '',
                                                    is_active: type.is_active,
                                                    color_hex: type.color_hex || '#28483a'
                                                });
                                            }} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-md transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteAppointmentType(type.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{type.name}</h4>
                                    <div className="flex items-center gap-3 mt-3 text-sm font-medium">
                                        <span className="text-slate-600 dark:text-slate-400">{type.duration_minutes} min</span>
                                        <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded">{Number(type.price)}€</span>
                                        {type.color_hex && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color_hex }}></div>
                                                {type.color_hex}
                                            </div>
                                        )}
                                    </div>
                                    {type.category_id && (
                                        <div className="mt-3 text-xs inline-block px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                                            📍 {paymentCategories.find(c => c.id === type.category_id)?.label || 'Centro desconocido'}
                                        </div>
                                    )}
                                    {!type.is_active && <span className="block mt-2 text-xs text-red-500 font-bold uppercase border border-red-200 bg-red-50 px-2 py-1 rounded w-fit">Inactivo</span>}
                                </>
                            )}
                        </div>
                    ))}

                    {isEditingAppointmentType === 'new' && (
                        <div className="p-6 rounded-2xl border border-primary-500 bg-primary-50/20 ring-2 ring-primary-100 dark:ring-primary-900/30">
                            <h4 className="font-bold text-primary-700 mb-4 text-sm flex items-center gap-2"><Plus size={16} /> Nuevo Tipo de Cita</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre del Servicio</label>
                                    <input className="form-input mt-1" value={appointmentTypeForm.name} onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, name: e.target.value })} autoFocus placeholder="Ej. Revisión Online" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Mins.</label>
                                        <input type="number" className="form-input mt-1" value={appointmentTypeForm.duration_minutes} onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, duration_minutes: parseInt(e.target.value) || 30 })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">€</label>
                                        <input type="number" step="0.01" className="form-input mt-1" value={appointmentTypeForm.price} onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, price: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Centro / Etiqueta</label>
                                        <select
                                            className="form-select mt-1"
                                            value={appointmentTypeForm.category_id || ''}
                                            onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, category_id: e.target.value || null })}
                                        >
                                            <option value="">-- Sin asignar --</option>
                                            {paymentCategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Color Calendario</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="color"
                                                value={appointmentTypeForm.color_hex || '#28483a'}
                                                onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, color_hex: e.target.value })}
                                                className="w-10 h-10 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={appointmentTypeForm.color_hex || '#28483a'}
                                                onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, color_hex: e.target.value })}
                                                className="form-input"
                                                placeholder="#28483a"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="newAppointmentTypeActive"
                                        checked={appointmentTypeForm.is_active}
                                        onChange={e => setAppointmentTypeForm({ ...appointmentTypeForm, is_active: e.target.checked })}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <label htmlFor="newAppointmentTypeActive" className="text-sm text-gray-700 dark:text-gray-300">Servicio Activo</label>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => setIsEditingAppointmentType(null)} className="btn btn-sm btn-ghost">Cancelar</button>
                                    <button onClick={handleSaveAppointmentType} className="btn btn-sm btn-primary">Crear</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-700 my-8" />

            {/* Vouchers Section */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Layers size={18} /> Tipos de Bonos
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">Paquetes de varias sesiones para clientes presenciales con límite de caducidad.</p>
                    </div>
                    <button onClick={() => { setIsEditingVoucherType('new'); setVoucherTypeForm({ name: '', total_sessions: 4, duration_days: 90, price: 0, category_id: '', is_active: true }); }} className="btn btn-outline shadow-sm" disabled={isEditingVoucherType !== null}>
                        <Plus size={18} /> Nuevo Bono
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {voucherTypes?.map(type => (
                        <div key={type.id} className="relative p-6 rounded-2xl border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-lg transition-all">
                            {isEditingVoucherType === type.id ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre del Bono</label>
                                        <input className="form-input mt-1" value={voucherTypeForm.name} onChange={e => setVoucherTypeForm({ ...voucherTypeForm, name: e.target.value })} autoFocus />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Total Sesiones</label>
                                            <input type="number" className="form-input mt-1" value={voucherTypeForm.total_sessions} onChange={e => setVoucherTypeForm({ ...voucherTypeForm, total_sessions: parseInt(e.target.value) || 1 })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Validez (Días)</label>
                                            <input type="number" className="form-input mt-1" value={voucherTypeForm.duration_days} onChange={e => setVoucherTypeForm({ ...voucherTypeForm, duration_days: parseInt(e.target.value) || 30 })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Centro Limitado (Opcional)</label>
                                            <select
                                                className="form-select mt-1"
                                                value={voucherTypeForm.category_id || ''}
                                                onChange={e => setVoucherTypeForm({ ...voucherTypeForm, category_id: e.target.value || null })}
                                            >
                                                <option value="">-- Cualquier Centro --</option>
                                                {paymentCategories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Precio Total (€)</label>
                                            <input type="number" step="0.01" className="form-input mt-1" value={voucherTypeForm.price} onChange={e => setVoucherTypeForm({ ...voucherTypeForm, price: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            id={`vt-active-${type.id}`}
                                            checked={voucherTypeForm.is_active}
                                            onChange={e => setVoucherTypeForm({ ...voucherTypeForm, is_active: e.target.checked })}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <label htmlFor={`vt-active-${type.id}`} className="text-sm text-gray-700 dark:text-gray-300">Bono a la venta</label>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button onClick={() => setIsEditingVoucherType(null)} className="btn btn-sm btn-ghost">Cancelar</button>
                                        <button onClick={handleSaveVoucherType} className="btn btn-sm btn-primary">Guardar</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                            <Layers size={20} />
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => {
                                                setIsEditingVoucherType(type.id);
                                                setVoucherTypeForm({
                                                    name: type.name,
                                                    total_sessions: type.total_sessions,
                                                    duration_days: type.duration_days,
                                                    price: type.price,
                                                    category_id: type.category_id || '',
                                                    is_active: type.is_active
                                                });
                                            }} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-md transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteVoucherType(type.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{type.name}</h4>
                                    <div className="flex flex-wrap gap-2 mt-3 text-sm font-medium">
                                        <span className="text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">{type.total_sessions} Sesiones</span>
                                        <span className="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">{type.duration_days} Días Validez</span>
                                        <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">{Number(type.price)}€</span>
                                    </div>
                                    {type.category_id && (
                                        <div className="mt-3 text-xs inline-block px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                                            📍 {paymentCategories.find(c => c.id === type.category_id)?.label || 'Centro desconocido'}
                                        </div>
                                    )}
                                    {!type.is_active && <span className="block mt-2 text-xs text-red-500 font-bold uppercase border border-red-200 bg-red-50 px-2 py-1 rounded w-fit">Retirado</span>}
                                </>
                            )}
                        </div>
                    ))}

                    {isEditingVoucherType === 'new' && (
                        <div className="p-6 rounded-2xl border border-primary-500 bg-primary-50/20 ring-2 ring-primary-100 dark:ring-primary-900/30">
                            <h4 className="font-bold text-primary-700 mb-4 text-sm flex items-center gap-2"><Plus size={16} /> Nuevo Bono</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre del Bono</label>
                                    <input className="form-input mt-1" value={voucherTypeForm.name} onChange={e => setVoucherTypeForm({ ...voucherTypeForm, name: e.target.value })} autoFocus placeholder="Ej. Pack Inicial: Consulta + 3 Revisiones" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nº Sesiones</label>
                                        <input type="number" className="form-input mt-1" value={voucherTypeForm.total_sessions} onChange={e => setVoucherTypeForm({ ...voucherTypeForm, total_sessions: parseInt(e.target.value) || 1 })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Caduca a los (Días)</label>
                                        <input type="number" className="form-input mt-1" value={voucherTypeForm.duration_days} onChange={e => setVoucherTypeForm({ ...voucherTypeForm, duration_days: parseInt(e.target.value) || 30 })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Limitar a Centro</label>
                                        <select
                                            className="form-select mt-1"
                                            value={voucherTypeForm.category_id || ''}
                                            onChange={e => setVoucherTypeForm({ ...voucherTypeForm, category_id: e.target.value || null })}
                                        >
                                            <option value="">-- Multicentro --</option>
                                            {paymentCategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Precio Total €</label>
                                        <input type="number" step="0.01" className="form-input mt-1" value={voucherTypeForm.price} onChange={e => setVoucherTypeForm({ ...voucherTypeForm, price: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="newVoucherTypeActive"
                                        checked={voucherTypeForm.is_active}
                                        onChange={e => setVoucherTypeForm({ ...voucherTypeForm, is_active: e.target.checked })}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <label htmlFor="newVoucherTypeActive" className="text-sm text-gray-700 dark:text-gray-300">Bono a la venta</label>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => setIsEditingVoucherType(null)} className="btn btn-sm btn-ghost">Cancelar</button>
                                    <button onClick={handleSaveVoucherType} className="btn btn-sm btn-primary">Crear</button>
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

    const renderRecetasSection = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText size={18} /> Frases y Textos Prediseñados
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                        Crea fragmentos de texto reutilizables para insertarlos rápidamente en las descripciones de tus recetas.
                    </p>
                </div>
                <button
                    onClick={() => { setIsEditingPhrase('new'); setPhraseForm({ name: '', content: '' }); }}
                    className="btn btn-outline"
                    disabled={isEditingPhrase !== null}
                >
                    <Plus size={18} /> Crear Frase
                </button>
            </div>

            <div className="space-y-4">
                {recipePhrases?.map(phrase => (
                    <div key={phrase.id} className="p-4 rounded-xl border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-md transition-shadow">
                        {isEditingPhrase === phrase.id ? (
                            <div className="space-y-3">
                                <input
                                    className="form-input text-sm font-bold w-full"
                                    value={phraseForm.name}
                                    onChange={e => setPhraseForm({ ...phraseForm, name: e.target.value })}
                                    placeholder="Nombre corto (Ej. Pan integral)"
                                    autoFocus
                                />
                                <textarea
                                    className="form-input text-sm w-full min-h-[80px]"
                                    value={phraseForm.content}
                                    onChange={e => setPhraseForm({ ...phraseForm, content: e.target.value })}
                                    placeholder="Contenido de la advertencia o consejo..."
                                />
                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <button onClick={() => setIsEditingPhrase(null)} className="btn btn-sm btn-ghost text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                        <X size={16} /> Cancelar
                                    </button>
                                    <button onClick={handleSavePhrase} className="btn btn-sm btn-primary">
                                        <Check size={16} /> Guardar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-bold text-slate-700 dark:text-slate-200">{phrase.name}</h5>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => { setIsEditingPhrase(phrase.id); setPhraseForm({ name: phrase.name, content: phrase.content }); }}
                                            className="p-1.5 text-slate-400 hover:text-primary-600 rounded bg-slate-50 dark:bg-slate-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/40 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePhrase(phrase.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 rounded bg-slate-50 dark:bg-slate-700/50 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                                            title="Borrar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 whitespace-pre-wrap">
                                    {phrase.content}
                                </p>
                            </div>
                        )}
                    </div>
                ))}

                {recipePhrases?.length === 0 && isEditingPhrase !== 'new' && (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p>No tienes frases guardadas todavía.</p>
                        <p className="text-xs mt-1 text-slate-400">Las descripciones frecuentes que utilices en tus recetas aparecerán aquí.</p>
                    </div>
                )}
            </div>

            {isEditingPhrase === 'new' && (
                <div className="p-4 rounded-xl border border-primary-500 bg-primary-50/50 ring-2 ring-primary-100 animate-fade-in mt-6">
                    <h4 className="font-bold text-primary-700 mb-3 text-sm flex items-center gap-2"><Plus size={16} /> Nueva Frase Prediseñada</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Nombre (Identificador Corto)</label>
                            <input
                                className="form-input mt-1 w-full"
                                value={phraseForm.name}
                                onChange={e => setPhraseForm({ ...phraseForm, name: e.target.value })}
                                placeholder="Ej. Recomendación de Yogurt"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Texto de la Frase</label>
                            <textarea
                                className="form-input mt-1 w-full min-h-[100px]"
                                value={phraseForm.content}
                                onChange={e => setPhraseForm({ ...phraseForm, content: e.target.value })}
                                placeholder="El texto entero que se pegará en la preparación de la receta..."
                            />
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                            <button onClick={() => setIsEditingPhrase(null)} className="btn btn-sm btn-ghost text-slate-500">Cancelar</button>
                            <button onClick={handleSavePhrase} disabled={!phraseForm.name || !phraseForm.content} className="btn btn-sm btn-primary">Crear Frase</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

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
                                            <button onClick={() => handleDeleteNutritionist(nutri.id, nutri.user_id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"><Trash2 size={16} /></button>
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


        </div>
    );

    const handleSaveSchema = async () => {
        if (!schemaNutritionistId) return;
        setIsSavingSchema(true);
        try {
            await updateNutritionist(schemaNutritionistId, { weekly_schema: schemaMatrix });
        } catch (error) {
            console.error("Error saving schema:", error);
            showToast('Error al guardar el esquema.', 'error');
        } finally {
            setIsSavingSchema(false);
        }
    };

    const renderEsquemaSection = () => {
        const nutris = nutritionists.filter(n => n.is_active !== false);
        const selectedNutri = nutris.find(n => n.id === schemaNutritionistId) || nutris[0];

        // Default layout selection to first active nutri if not set
        if (!schemaNutritionistId && selectedNutri) {
            setTimeout(() => {
                setSchemaNutritionistId(selectedNutri.id);
                setSchemaMatrix(selectedNutri.weekly_schema || {});
            }, 0);
        }

        if (!selectedNutri) return <p className="text-muted">No hay nutricionistas activos.</p>;

        const handleCellChange = (day, meal, value) => {
            setSchemaMatrix(prev => ({
                ...prev,
                [`${day}_${meal}`]: value
            }));
        };

        const PALETTE = [
            { label: 'Oscuro', value: '#3c3c3c' },
            { label: 'Verde Oscuro (Marca)', value: '#28483a' },
            { label: 'Verde Claro', value: '#9db98f' },
            { label: 'Rojo/Alerta', value: '#ef4444' },
            { label: 'Naranja', value: '#f97316' },
            { label: 'Azul', value: '#3b82f6' },
            { label: 'Marrón', value: '#8b4513' }
        ];

        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <CalendarDays size={18} /> Plantilla de Esquema Semanal
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">Configura los textos base (macronutrientes). Selecciona un texto y elige un color.</p>

                        <div className="mt-3 flex flex-wrap gap-2 items-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700 w-max">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-2">Color:</span>
                            {PALETTE.map(color => (
                                <button
                                    key={color.value}
                                    title={color.label}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Evitar perder el foco del contenteditable
                                        document.execCommand('foreColor', false, color.value);
                                    }}
                                    className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 shadow-sm hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color.value }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {nutris.length > 1 && (
                    <div className="flex items-center gap-2 mb-4">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nutricionista:</label>
                        <select
                            className="form-select text-sm w-64"
                            value={schemaNutritionistId || selectedNutri.id}
                            onChange={(e) => {
                                const nId = e.target.value;
                                setSchemaNutritionistId(nId);
                                const nutri = nutritionists.find(n => n.id === nId);
                                setSchemaMatrix(nutri?.weekly_schema || {});
                            }}
                        >
                            {nutris.map(n => (
                                <option key={n.id} value={n.id}>{n.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto overflow-y-hidden pb-2">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-b border-primary-100 dark:border-primary-800">
                                <tr>
                                    <th className="px-4 py-3 font-bold w-24 border-r border-primary-100 dark:border-primary-800">Día</th>
                                    {MEALS.map(meal => (
                                        <th key={meal} className="px-4 py-3 font-bold text-center border-r border-primary-100 dark:border-primary-800 last:border-r-0 min-w-[150px]">{meal}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {DAYS.map(day => (
                                    <tr key={day} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                                            {day}
                                        </td>
                                        {MEALS.map(meal => (
                                            <td key={`${day}-${meal}`} className="p-0 border-r border-slate-200 dark:border-slate-700 last:border-r-0 relative">
                                                <div
                                                    className="w-full h-full min-h-[100px] flex items-center justify-center"
                                                >
                                                    <div
                                                        className="w-full text-xs p-3 border-none bg-transparent hover:bg-slate-50/80 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-inset focus:ring-1 focus:ring-primary-400 transition-colors cursor-text whitespace-pre-wrap outline-none text-center"
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        onBlur={(e) => handleCellChange(day, meal, e.target.innerHTML)}
                                                        dangerouslySetInnerHTML={{ __html: schemaMatrix[`${day}_${meal}`] || '' }}
                                                    />
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-end">
                        <button
                            onClick={handleSaveSchema}
                            disabled={isSavingSchema}
                            className="btn btn-primary shadow-sm flex items-center gap-2"
                        >
                            {isSavingSchema ? 'Guardando...' : <><Save size={16} /> Guardar Plantilla</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const handleSavePortal = async () => {
        setIsSavingPortal(true);
        try {
            await updateUserProfile({ review_message: portalMessage });
            showToast('Mensaje de revisión guardado', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al guardar el mensaje', 'error');
        } finally {
            setIsSavingPortal(false);
        }
    };

    const renderPortalSection = () => (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-6">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                        <MessageCircle size={18} /> Mensaje de Revisión
                    </h4>
                    <p className="text-sm text-slate-500 mb-4">
                        Este mensaje aparecerá permanentemente en el portal del paciente. Es ideal para dar instrucciones globales o recordarles qué deben mandarte en su revisión (ej: "Mándame peso, medidas y fotos al WhatsApp").
                    </p>
                    <textarea
                        className="form-textarea w-full h-32"
                        value={portalMessage}
                        onChange={(e) => setPortalMessage(e.target.value)}
                        placeholder="Ej: Recuerda enviarme tu peso en ayunas y 2 fotos (frente y perfil) el día de tu revisión vía WhatsApp."
                    />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                        onClick={handleSavePortal}
                        disabled={isSavingPortal}
                        className="btn btn-primary shadow-sm flex items-center gap-2"
                    >
                        {isSavingPortal ? 'Guardando...' : <><Save size={16} /> Guardar Mensaje</>}
                    </button>
                </div>
            </div>
        </div>
    );

    const getSectionContent = (sectionId) => {
        switch (sectionId) {
            case 'tarifas': return renderTarifasSection();
            case 'citas': return renderCitasSection();
            case 'pagos': return renderPagosSection();
            case 'equipo': return renderEquipoSection();
            case 'marketing': return renderMarketingSection();
            case 'tareas': return renderTareasSection();

            case 'clinical': return renderClinicalSection();
            case 'recetas': return renderRecetasSection();
            case 'esquema': return renderEsquemaSection();
            case 'portal': return renderPortalSection();
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
