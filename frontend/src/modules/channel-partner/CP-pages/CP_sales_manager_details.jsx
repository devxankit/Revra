import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Phone, Mail, MessageCircle,
    Clock, Shield, Star,
    CheckCircle, Briefcase
} from 'lucide-react';
import CP_navbar from '../CP-components/CP_navbar';
import { cpLeadService } from '../CP-services/cpLeadService';
import { useToast } from '../../../contexts/ToastContext';

const CP_sales_manager_details = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [salesManager, setSalesManager] = useState(null);

    // Helper function to get initials from name
    const getInitials = (name) => {
        if (!name) return 'SM';
        return name
            .split(' ')
            .filter(Boolean)
            .map((segment) => segment[0]?.toUpperCase())
            .join('')
            .slice(0, 2) || 'SM';
    };

    useEffect(() => {
        const fetchSalesManagerDetails = async () => {
            try {
                setLoading(true);
                const response = await cpLeadService.getSalesManagerDetails();
                
                if (response.success && response.data) {
                    setSalesManager({
                        ...response.data,
                        initials: getInitials(response.data.name)
                    });
                } else {
                    addToast('Sales manager not found', 'error');
                    navigate('/cp-dashboard');
                }
            } catch (error) {
                console.error('Error fetching sales manager details:', error);
                addToast('Failed to load sales manager details', 'error');
                navigate('/cp-dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchSalesManagerDetails();
    }, [id, navigate, addToast]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] pb-20 font-sans text-[#1E1E1E]">
                <CP_navbar />
                <div className="max-w-xl mx-auto px-4 py-6">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-48"></div>
                        <div className="h-64 bg-gray-200 rounded-[24px]"></div>
                        <div className="h-32 bg-gray-200 rounded-[24px]"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!salesManager) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] pb-20 font-sans text-[#1E1E1E]">
                <CP_navbar />
                <div className="max-w-xl mx-auto px-4 py-6">
                    <div className="text-center py-12">
                        <p className="text-gray-500">No sales manager assigned</p>
                        <button
                            onClick={() => navigate('/cp-dashboard')}
                            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Format phone number for WhatsApp
    const formatPhoneForWhatsApp = (phone) => {
        if (!phone) return '';
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
            return cleanPhone;
        } else if (cleanPhone.length === 10) {
            return `91${cleanPhone}`;
        }
        return cleanPhone;
    };

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-20 font-sans text-[#1E1E1E]">
            <CP_navbar />

            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-xl mx-auto px-4 py-3 pt-14 md:pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/cp-dashboard')} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 leading-tight">Sales Manager Details</h1>
                        </div>
                    </div>
                    <div className="relative group">
                        <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                            <Shield className="w-5 h-5" />
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white p-3 rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-xs text-gray-600">
                            These are verified Appzeto employees assigned to support your growth.
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-8">
                {/* Sales Manager Hero Card */}
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Primary Point of Contact
                        </h2>
                        {salesManager.isOnline !== undefined && (
                            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                salesManager.isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${salesManager.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                {salesManager.isOnline ? 'Available Now' : 'Offline'}
                            </span>
                        )}
                    </div>

                    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="relative flex flex-col items-center text-center">
                            <div className="relative mb-4">
                                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-2xl font-bold shadow-inner">
                                    {salesManager.initials}
                                </div>
                                <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full border-2 border-white" title="Verified Staff">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-1">{salesManager.name}</h3>
                            <p className="text-sm text-gray-500 font-medium mb-6">{salesManager.role}</p>

                            {/* Contact Actions */}
                            <div className="grid grid-cols-3 gap-3 w-full">
                                <a 
                                    href={salesManager.phoneNumber ? `tel:${salesManager.phoneNumber}` : '#'}
                                    onClick={(e) => {
                                        if (!salesManager.phoneNumber) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-colors group ${
                                        salesManager.phoneNumber
                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${
                                        salesManager.phoneNumber ? 'bg-white' : 'bg-gray-200'
                                    }`}>
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold">Call</span>
                                </a>
                                <a 
                                    href={salesManager.phoneNumber ? `https://wa.me/${formatPhoneForWhatsApp(salesManager.phoneNumber)}` : '#'}
                                    onClick={(e) => {
                                        if (!salesManager.phoneNumber) {
                                            e.preventDefault();
                                        }
                                    }}
                                    target={salesManager.phoneNumber ? "_blank" : undefined}
                                    rel={salesManager.phoneNumber ? "noopener noreferrer" : undefined}
                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-colors group ${
                                        salesManager.phoneNumber
                                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${
                                        salesManager.phoneNumber ? 'bg-white' : 'bg-gray-200'
                                    }`}>
                                        <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold">WhatsApp</span>
                                </a>
                                <a 
                                    href={salesManager.email ? `mailto:${salesManager.email}` : '#'}
                                    onClick={(e) => {
                                        if (!salesManager.email) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-colors group ${
                                        salesManager.email
                                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${
                                        salesManager.email ? 'bg-white' : 'bg-gray-200'
                                    }`}>
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold">Email</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Details Section */}
                <section className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-500" /> Details
                    </h3>
                    <div className="space-y-4">
                        {salesManager.employeeId && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-xs text-gray-500 font-medium">Employee ID</span>
                                <span className="text-sm font-bold text-gray-900">{salesManager.employeeId}</span>
                            </div>
                        )}
                        {salesManager.department && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-xs text-gray-500 font-medium">Department</span>
                                <span className="text-sm font-bold text-gray-900">{salesManager.department}</span>
                            </div>
                        )}
                        {salesManager.experience && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-xs text-gray-500 font-medium">Experience</span>
                                <span className="text-sm font-bold text-gray-900">{salesManager.experience} years</span>
                            </div>
                        )}
                        {salesManager.currentSales > 0 && (
                            <div className="flex justify-between items-center py-2">
                                <span className="text-xs text-gray-500 font-medium">Current Sales</span>
                                <span className="text-sm font-bold text-gray-900">₹{salesManager.currentSales.toLocaleString('en-IN')}</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Skills Section */}
                {salesManager.skills && salesManager.skills.length > 0 && (
                    <section className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                            <Star className="w-4 h-4 text-gray-500" /> Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {salesManager.skills.map((skill, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Communication Guidelines */}
                <section className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" /> Communication Guidelines
                    </h3>
                    <div className="space-y-3 text-xs text-gray-600">
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 shrink-0"></div>
                            <p>Standard support hours: <span className="font-bold text-gray-800">Mon-Sat, 10 AM - 7 PM</span>.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 shrink-0"></div>
                            <p>For urgent deal closures, use <span className="font-bold text-gray-800">WhatsApp</span> for faster response.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 shrink-0"></div>
                            <p>Please tag "Hot Lead" in CRM before calling for specific client discussions.</p>
                        </div>
                    </div>
                </section>

                {/* Assigned Date */}
                {salesManager.assignedDate && (
                    <section className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>Assigned on {new Date(salesManager.assignedDate).toLocaleDateString('en-IN', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}</span>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default CP_sales_manager_details;
