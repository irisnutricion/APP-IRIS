import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { Save, ArrowLeft, User, Activity, Heart } from 'lucide-react';

const PatientForm = ({ isOpen, onClose, initialData }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { patients, addPatient, updatePatient, plans, referralSources, paymentCategories, clinicalCategories, subscriptionTypes, paymentRates, nutritionists } = useData();

    // Determine if we are in edit mode (either by ID param or initialData prop)
    const isEdit = !!id || !!initialData;
    const patientId = id || initialData?.id;

    // ... (keep state)
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        birthDate: '',
        sex: 'mujer', // Default
        city: '',
        phone: '',
        email: '',
        height: '',
        weight: '', // Initial weight
        goals: '',
        allergies: '',
        pathologies: '',
        dislikedFoods: '',

        referralSource: '',
        nutritionistId: '',
        reviewDay: '',
    });

    // Set default keys when lists load (only for NEW patients)
    // This useEffect is now empty as subscription-related defaults are removed.
    useEffect(() => {
    }, [isEdit, subscriptionTypes, paymentRates, formData.subscriptionTypeId]);

    useEffect(() => {
        if (isEdit) {
            const patient = initialData || patients.find(p => p.id === patientId);
            if (patient) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setFormData({
                    firstName: patient.first_name || patient.name?.split(' ')[0] || '',
                    lastName: patient.last_name || patient.name?.split(' ').slice(1).join(' ') || '',
                    birthDate: patient.birth_date || '',
                    sex: patient.sex || 'mujer',
                    city: patient.city || '',
                    phone: patient.phone || '',
                    email: patient.email || '',
                    height: patient.height || '',
                    weight: patient.weight || '',
                    goals: patient.goals || '',
                    allergies: patient.allergies || '',
                    pathologies: patient.pathologies || '',
                    dislikedFoods: patient.disliked_foods || '',
                    // Dynamic categories fallback
                    ...clinicalCategories.reduce((acc, cat) => {
                        const key = cat.id === 'pathology' ? 'pathologies' :
                            cat.id === 'dislike' ? 'dislikedFoods' :
                                cat.id;

                        // Check various possible keys (snake_case from DB, camelCase from local)
                        let val = patient[key] || patient[cat.id] || patient.clinical_data?.[cat.id];
                        if (!val && key === 'dislikedFoods') val = patient.disliked_foods;

                        acc[key] = val || '';
                        return acc;
                    }, {}),

                    referralSource: (() => {
                        const val = patient.referral_source || patient.referralSource;
                        if (!val) return '';
                        // Try to find direct ID match
                        if (referralSources.some(r => r.id === val)) return val;
                        // Try to find by label (case-insensitive)
                        const found = referralSources.find(r => r.label.toLowerCase() === val.toLowerCase());
                        return found ? found.id : '';
                    })(),
                    paymentCategoryId: (() => {
                        const val = patient.payment_category_id || patient.paymentCategoryId;
                        if (!val) return '';
                        if (paymentCategories.some(c => c.id === val)) return val;
                        const found = paymentCategories.find(c => c.label.toLowerCase() === val.toLowerCase());
                        return found ? found.id : '';
                    })(),
                    nutritionistId: patient.nutritionist_id || '',
                    reviewDay: patient.review_day ? String(patient.review_day) : '',
                });
            }
        }
    }, [isEdit, patientId, patients, plans, initialData, clinicalCategories]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        let patientData = { ...formData };

        // Only handle subscription for NEW patients
        // For existing patients, subscription changes are handled via RenewalModal or special actions
        // For existing patients, subscription changes are handled via RenewalModal or special actions
        // Subscription logic removed as per instructions.

        if (isEdit) {
            // Remove subscription-related fields from update payload to be safe
            // Remove subscription-related fields from update payload to be safe
            // Subscription-related fields are no longer in formData, so no need to delete.

            await updatePatient(patientId, patientData);
            if (onClose) {
                onClose();
            } else {
                navigate(`/patients/${patientId}`);
            }
        } else {
            const newPatientId = await addPatient(patientData);
            if (newPatientId) {
                if (onClose) {
                    onClose();
                } else {
                    navigate(`/patients/${newPatientId}`);
                }
            } else {
                alert('Error al guardar el cliente. Por favor, verifica los datos e inténtalo de nuevo.');
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const formContent = (
        <form onSubmit={handleSubmit} className={`card max-w-4xl mx-auto ${onClose ? 'w-full shadow-none border-0' : ''}`}>
            {/* If Modal, Add Header here inside card if needed, or keep external */}
            {onClose && (
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                        <p className="text-sm text-slate-500">Complete la ficha técnica</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={20} className="rotate-180" /> {/* Using generic close icon behavior or X */}
                    </button>
                </div>
            )}

            {/* Personal Data */}
            <div className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                <User size={18} className="text-primary-600" /> Datos Personales
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="form-group">
                    <label className="form-label">Nombre</label>
                    <input
                        className="form-input"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="Ej. Ana"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Apellidos</label>
                    <input
                        className="form-input"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Ej. López"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha de Nacimiento</label>
                    <input
                        className="form-input"
                        name="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Sexo</label>
                    <select
                        className="form-select"
                        name="sex"
                        value={formData.sex}
                        onChange={handleChange}
                    >
                        <option value="mujer">Mujer</option>
                        <option value="hombre">Hombre</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Ciudad / Localidad</label>
                    <input
                        className="form-input"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Ej. Madrid"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                        className="form-input"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Ej. 600 123 456"
                    />
                </div>
                <div className="form-group md:col-span-2">
                    <label className="form-label">Email</label>
                    <input
                        className="form-input"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="ejemplo@email.com"
                    />
                </div>
                <div className="form-group md:col-span-2">
                    <label className="form-label">Centro / Etiqueta</label>
                    <select
                        className="form-select"
                        name="paymentCategoryId"
                        value={formData.paymentCategoryId || ''}
                        onChange={handleChange}
                    >
                        <option value="">-- Sin asignar --</option>
                        {paymentCategories.filter(c => c.is_active !== false).map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Esta etiqueta se asignará automáticamente a los pagos de este cliente.</p>
                </div>
            </div>

            {/* Physical Data */}
            <div className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-primary-600" /> Datos Físicos Iniciales
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="form-group">
                    <label className="form-label">Altura (cm)</label>
                    <input
                        className="form-input"
                        name="height"
                        type="number"
                        value={formData.height}
                        onChange={handleChange}
                        placeholder="Ej. 165"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Peso Actual (kg)</label>
                    <input
                        className="form-input"
                        name="weight"
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={handleChange}
                        placeholder="Ej. 65.5"
                    />
                </div>
            </div>

            {/* Goals & Medical */}
            <div className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                <Heart size={18} className="text-primary-600" /> Objetivos y Salud
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="form-group md:col-span-2">
                    <label className="form-label">Objetivos Nutricionales</label>
                    <textarea
                        className="form-textarea"
                        name="goals"
                        rows="3"
                        value={formData.goals}
                        onChange={handleChange}
                        placeholder="Ej. Perder grasa, aumentar masa muscular..."
                    />
                </div>
                <div className="form-group md:col-span-2">
                    <label className="form-label">Alergias / Intolerancias</label>
                    <textarea
                        className="form-textarea"
                        name="allergies"
                        rows="2"
                        value={formData.allergies}
                        onChange={handleChange}
                        placeholder="Ej. Intolerancia a la lactosa, alergia a nueces..."
                    />
                </div>
                {clinicalCategories?.map(category => {
                    // Map category ID to formData field name
                    // Mappings: pathology -> pathologies, dislike -> dislikedFoods, else -> category.id
                    let fieldName = category.id;
                    if (category.id === 'pathology') fieldName = 'pathologies';
                    if (category.id === 'dislike') fieldName = 'dislikedFoods';

                    // Ensure full width for pathology, half for others by default or custom logic
                    const isFullWidth = category.id === 'pathology' || category.id === 'platos_que_no_pueden_faltar';

                    return (
                        <div key={category.id} className={`form-group ${isFullWidth ? 'md:col-span-2' : ''}`}>
                            <label className="form-label">{category.label}</label>
                            <textarea
                                className="form-textarea"
                                name={fieldName}
                                rows="2"
                                value={formData[fieldName] || ''}
                                onChange={handleChange}
                                placeholder={`Escribe aquí ${category.label.toLowerCase()}...`}
                            />
                        </div>
                    );
                })}

            </div>

            {/* Marketing */}
            <div className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                <Heart size={18} className="text-primary-600" /> Otros Datos
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="form-group">
                    <label className="form-label">¿Cómo nos conoció?</label>
                    <select
                        className="form-select"
                        name="referralSource"
                        value={formData.referralSource}
                        onChange={handleChange}
                    >
                        <option value="">Seleccionar...</option>
                        {referralSources && referralSources.map(source => (
                            <option key={source.id} value={source.id}>
                                {source.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Nutricionista Asignado</label>
                    <select
                        className="form-select"
                        name="nutritionistId"
                        value={formData.nutritionistId}
                        onChange={handleChange}
                    >
                        <option value="">-- Sin asignar --</option>
                        {nutritionists && nutritionists.filter(n => n.is_active !== false).map(n => (
                            <option key={n.id} value={n.id}>
                                {n.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Día de Revisión Habitual</label>
                    <select
                        className="form-select"
                        name="reviewDay"
                        value={formData.reviewDay}
                        onChange={handleChange}
                    >
                        <option value="">-- Sin definir --</option>
                        <option value="1">Lunes</option>
                        <option value="2">Martes</option>
                        <option value="3">Miércoles</option>
                        <option value="4">Jueves</option>
                        <option value="5">Viernes</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">El sistema calculará las próximas revisiones basándose en este día.</p>
                </div>
            </div>

            {/* Subscription - Only for NEW patients */}


            <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => onClose ? onClose() : navigate(-1)} className="btn btn-ghost text-slate-500 hover:text-slate-700">
                    Cancelar
                </button>
                <button type="submit" className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary/30 min-w-[120px]">
                    <Save size={18} />
                    Guardar Ficha
                </button>
            </div>

        </form>
    );

    if (onClose) {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
                    <div className="p-6">
                        {formContent}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="btn btn-ghost btn-icon">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="page-title">{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h1>
                        <p className="page-subtitle">Complete la ficha técnica</p>
                    </div>
                </div>
            </div>
            {formContent}
        </div>
    );
};

export default PatientForm;
