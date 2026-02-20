import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { ArrowLeft, User, Activity, Image as ImageIcon, Wallet, Play, Clock, RefreshCw, Edit2, Trash2, Calendar as CalendarIcon, Copy, UtensilsCrossed } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import MeasurementModal from '../Tracking/MeasurementModal';
import PaymentModal from '../Payments/PaymentModal';
import RenewalModal from './RenewalModal';
import PlanStartModal from './PlanStartModal';
import PatientForm from './PatientForm';
import SubscriptionEditModal from './SubscriptionEditModal';

import { calculateSubscriptionTerms } from '../../utils/subscriptionUtils';
import { safeFormat } from '../../utils/dateUtils';

// Tabs
import InformationTab from './Tabs/InformationTab';
import ReviewsTab from './Tabs/ReviewsTab';
import TrackingTab from './Tabs/TrackingTab';
import PhotosTab from './Tabs/PhotosTab';
import PaymentsTab from './Tabs/PaymentsTab';
import PlansTab from './Tabs/PlansTab';

// Modals
import EditExtensionModal from './Modals/EditExtensionModal';
import ExtendSubscriptionModal from './Modals/ExtendSubscriptionModal';
import ExtensionHistoryModal from './Modals/ExtensionHistoryModal';

const PatientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { patients, deleteMeasurement, extendSubscription, loading: contextLoading, deletePatient, addMeasurement, updateMeasurement, payments = [], paymentMethods = [], paymentCategories = [], updateSubscriptionHistory, deleteSubscription, deletePayment, subscriptionExtensions = [], updateSubscriptionExtension, deleteSubscriptionExtension } = useData() || {};

    // Modals State
    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
    const [isPlanStartModalOpen, setIsPlanStartModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    const [actionLoading, setActionLoading] = useState(false);

    // Measurement Modal State
    const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);
    const [editingMeasurement, setEditingMeasurement] = useState(null);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);

    // Patient Form Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubscriptionEditModalOpen, setIsSubscriptionEditModalOpen] = useState(false);
    const [subscriptionEditData, setSubscriptionEditData] = useState(null);

    // Extend Subscription Modal State
    const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
    const [isExtensionHistoryModalOpen, setIsExtensionHistoryModalOpen] = useState(false);
    const [isEditExtensionModalOpen, setIsEditExtensionModalOpen] = useState(false);
    const [editingExtension, setEditingExtension] = useState(null);

    const patient = (patients || []).find(p => String(p.id) === String(id));

    const handleDeletePayment = async (paymentId) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer.')) {
            await deletePayment(paymentId);
        }
    };

    const subscriptionTerms = useMemo(() => {
        return calculateSubscriptionTerms(patient, payments);
    }, [patient, payments]);

    // Suggested Start Date for Renewals/New Plans
    const suggestedStartDate = useMemo(() => {
        if (!patient || !patient.subscriptionHistory || patient.subscriptionHistory.length === 0) {
            return new Date().toISOString().split('T')[0];
        }
        const sortedHistory = [...patient.subscriptionHistory].sort((a, b) => {
            const dateA = new Date(a.end_date || a.start_date);
            const dateB = new Date(b.end_date || b.start_date);
            return dateB - dateA;
        });

        const latestSub = sortedHistory[0];
        if (!latestSub.end_date) return new Date().toISOString().split('T')[0];
        const lastEnd = parseISO(latestSub.end_date);
        return format(lastEnd, 'yyyy-MM-dd');
    }, [patient]);


    if (contextLoading || actionLoading) {
        return (
            <div className="dashboard-container flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="dashboard-container">
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Cliente no encontrado</h2>
                    <button onClick={() => navigate('/patients')} className="btn btn-primary mt-4">
                        <ArrowLeft size={16} /> Volver a la lista
                    </button>
                </div>
            </div>
        );
    }

    const handleExtendSubscription = async (days) => {
        if (!days) return;
        setActionLoading(true);
        setIsExtendModalOpen(false);
        const success = await extendSubscription(patient.id, days);
        if (success) {
            console.log("Subscription extended successfully");
        } else {
            alert("Error al extender la suscripción");
        }
        setActionLoading(false);
    };

    const handleSaveMeasurement = async (data) => {
        setActionLoading(true);
        try {
            if (editingMeasurement) {
                await updateMeasurement(editingMeasurement.id, patient.id, data);
            } else {
                await addMeasurement(patient.id, data);
            }
            setIsMeasurementModalOpen(false);
            setEditingMeasurement(null);
        } catch (error) {
            console.error('Error saving measurement:', error);
            alert('Error al guardar la medición');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditMeasurement = (measurement) => {
        setEditingMeasurement(measurement);
        setIsMeasurementModalOpen(true);
    };

    const handleEditSubscription = (data = null, isHistory = false) => {
        if (data) {
            setSubscriptionEditData(data);
        } else {
            const today = new Date().toISOString().split('T')[0];
            const activeSub = patient.subscriptionHistory?.find(s =>
                s.status === 'active' ||
                (s.start_date <= today && (!s.end_date || s.end_date >= today))
            );

            if (activeSub) {
                setSubscriptionEditData(activeSub);
            } else {
                setSubscriptionEditData(null);
            }
        }
        setIsSubscriptionEditModalOpen(true);
    };

    const handleDelete = () => {
        if (confirm('¿Seguro que deseas eliminar este cliente?')) {
            deletePatient(id);
            navigate('/patients');
        }
    };

    // Helper for status badge
    // (This logic might be duplicated in InformationTab, but needed here for header?
    // Actually header uses payment category label, not subscription status directly, except for plan type)

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/patients')} className="btn btn-ghost btn-icon">
                            <ArrowLeft size={24} />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="profile-initials text-white flex items-center justify-center rounded-full bg-primary font-bold shadow-lg shadow-primary/30" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
                                {(patient.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-2xl font-bold leading-tight dark:text-white">
                                            {patient.first_name || patient.name?.split(' ')[0] || 'Cliente'}
                                        </h1>
                                        {(() => {
                                            const category = paymentCategories?.find(c => c.id === patient.payment_category_id);
                                            if (category) {
                                                return (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${category.color || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                        {category.label}
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-medium text-slate-600 dark:text-slate-300">
                                            {patient.last_name || patient.name?.split(' ').slice(1).join(' ') || ''}
                                        </h2>
                                    </div>
                                    {patient.subscription?.type && (
                                        <p className="text-sm text-slate-400 mt-0.5 capitalize">Plan {patient.subscription.type}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="header-controls flex gap-2 flex-wrap justify-end">
                        {patient.subscription?.status === 'active' && (
                            <button
                                onClick={() => setIsExtendModalOpen(true)}
                                className="btn btn-outline text-amber-600 border-amber-200 hover:bg-amber-50"
                                title="Extender suscripción"
                            >
                                <Clock size={16} className="md:mr-1" /> <span className="hidden md:inline">Extender</span>
                            </button>
                        )}

                        {(!patient.subscriptionHistory || patient.subscriptionHistory.length === 0) && patient.subscription?.status !== 'active' && (
                            <button
                                onClick={() => setIsPlanStartModalOpen(true)}
                                className="btn btn-primary"
                            >
                                <Play size={16} className="md:mr-1" /> <span className="hidden md:inline">Iniciar Plan</span>
                            </button>
                        )}

                        {(patient.subscription?.status === 'active' || (patient.subscriptionHistory && patient.subscriptionHistory.length > 0)) && (
                            <button
                                onClick={() => setIsRenewalModalOpen(true)}
                                className="btn btn-outline text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                                <RefreshCw size={16} className="md:mr-1" /> <span className="hidden md:inline">Renovar</span>
                            </button>
                        )}

                        <button onClick={() => setIsEditModalOpen(true)} className="btn btn-outline" title="Editar datos">
                            <Edit2 size={16} className="md:mr-1" /> <span className="hidden md:inline">Editar</span>
                        </button>

                        <button onClick={handleDelete} className="btn btn-outline text-danger border-red-200 hover:bg-red-50" title="Eliminar cliente">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-6 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'info' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><User size={18} /> Ficha Cliente</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('tracking')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'tracking' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><Activity size={18} /> Mediciones</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('reviews')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'reviews' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><CalendarIcon size={18} /> Revisiones</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'photos' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><ImageIcon size={18} /> Fotos</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'payments' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><Wallet size={18} /> Pagos y Renovaciones</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`pb-3 px-1 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'plans' ? 'border-primary text-primary dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-muted hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2"><UtensilsCrossed size={18} /> Planes</div>
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="animate-fade-in relative">
                {activeTab === 'info' && <InformationTab patient={patient} onEditSubscription={() => handleEditSubscription()} />}

                {activeTab === 'tracking' && (
                    <TrackingTab
                        patient={patient}
                        onAddMeasurement={() => {
                            setEditingMeasurement(null);
                            setIsMeasurementModalOpen(true);
                        }}
                        onEditMeasurement={handleEditMeasurement}
                        onDeleteMeasurement={(id) => deleteMeasurement(id, patient.id)}
                    />
                )}

                {activeTab === 'reviews' && <ReviewsTab patient={patient} />}

                {activeTab === 'photos' && <PhotosTab patient={patient} />}

                {activeTab === 'plans' && <PlansTab patient={patient} />}

                {activeTab === 'payments' && (
                    <PaymentsTab
                        patientId={patient.id}
                        subscriptionTerms={subscriptionTerms}
                        onAddPayment={(initialData = null) => {
                            setEditingPayment(initialData);
                            setIsPaymentModalOpen(true);
                        }}
                        onEditPayment={(payment) => {
                            setEditingPayment(payment);
                            setIsPaymentModalOpen(true);
                        }}
                        onDeletePayment={handleDeletePayment}
                        onEditSubscription={handleEditSubscription}
                        onEditExtension={(ext) => {
                            setEditingExtension(ext);
                            setIsEditExtensionModalOpen(true);
                        }}
                    />
                )}
            </div>

            {/* Modals */}
            {isEditModalOpen && (
                <PatientForm
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    initialData={patient}
                />
            )}

            {isRenewalModalOpen && (
                <RenewalModal
                    isOpen={isRenewalModalOpen}
                    onClose={() => setIsRenewalModalOpen(false)}
                    patient={patient}
                    suggestedStartDate={suggestedStartDate}
                />
            )}

            {isSubscriptionEditModalOpen && (
                <SubscriptionEditModal
                    isOpen={isSubscriptionEditModalOpen}
                    onClose={() => {
                        setIsSubscriptionEditModalOpen(false);
                        setSubscriptionEditData(null);
                    }}
                    patient={patient}
                    subscriptionData={subscriptionEditData}
                    onSave={subscriptionEditData ? async (updates) => {
                        const result = await updateSubscriptionHistory(subscriptionEditData.id, updates);
                        if (result) {
                            console.log("Updated", subscriptionEditData.id);
                        } else {
                            alert("Error al actualizar la suscripción");
                        }
                    } : null}
                />
            )}

            <MeasurementModal
                isOpen={isMeasurementModalOpen}
                onClose={() => {
                    setIsMeasurementModalOpen(false);
                    setEditingMeasurement(null);
                }}
                onSave={handleSaveMeasurement}
                initialData={editingMeasurement}
            />

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setIsPaymentModalOpen(false);
                    setEditingPayment(null);
                }}
                defaultPatientId={id}
                initialData={editingPayment}
                subscriptionTerms={subscriptionTerms}
            />

            <ExtendSubscriptionModal
                isOpen={isExtendModalOpen}
                onClose={() => setIsExtendModalOpen(false)}
                onConfirm={handleExtendSubscription}
                onViewHistory={() => {
                    setIsExtendModalOpen(false);
                    setIsExtensionHistoryModalOpen(true);
                }}
            />

            <ExtensionHistoryModal
                isOpen={isExtensionHistoryModalOpen}
                onClose={() => setIsExtensionHistoryModalOpen(false)}
                extensions={subscriptionExtensions.filter(ext => ext.patient_id === id)}
            />

            <EditExtensionModal
                isOpen={isEditExtensionModalOpen}
                onClose={() => {
                    setIsEditExtensionModalOpen(false);
                    setEditingExtension(null);
                }}
                extension={editingExtension}
                onConfirm={async (id, days) => {
                    await updateSubscriptionExtension(id, days);
                    setIsEditExtensionModalOpen(false);
                    setEditingExtension(null);
                }}
            />

            <PlanStartModal
                isOpen={isPlanStartModalOpen}
                onClose={() => setIsPlanStartModalOpen(false)}
                patientId={id}
                suggestedStartDate={suggestedStartDate}
            />
        </div>
    );
};

export default PatientDetail;
