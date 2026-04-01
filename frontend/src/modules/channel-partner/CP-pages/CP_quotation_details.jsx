import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Check, Share2, FileText, Info,
    ShieldCheck, HelpCircle, DollarSign, Calendar, Download
} from 'lucide-react';
import CP_navbar from '../CP-components/CP_navbar';
import { cpQuotationService } from '../CP-services/cpQuotationService';
import { useToast } from '../../../contexts/ToastContext';

const CP_quotation_details = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { addToast } = useToast();
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuotation = async () => {
            try {
                setLoading(true);
                const response = await cpQuotationService.getQuotationById(id);
                
                if (response.success && response.data) {
                    const formatted = cpQuotationService.formatQuotationForDisplay(response.data);
                    setQuotation(formatted);
                } else {
                    addToast('Quotation not found', 'error');
                    navigate('/cp-quotations');
                }
            } catch (error) {
                console.error('Error fetching quotation:', error);
                addToast('Failed to load quotation details', 'error');
                navigate('/cp-quotations');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchQuotation();
        }
    }, [id, navigate, addToast]);

    const handleShare = async () => {
        if (!quotation) return;
        
        try {
            await cpQuotationService.shareQuotation(quotation.id);
        } catch (error) {
            console.error('Error tracking share:', error);
        }
    };

    const handleWhatsAppShare = () => {
        if (!quotation) return;
        
        const message = encodeURIComponent(
            `Check out this quotation: ${quotation.title}\n` +
            `Price: ${quotation.formattedPrice}\n` +
            `Category: ${quotation.category}\n\n` +
            (quotation.description ? `${quotation.description}` : '')
        );
        
        window.open(`https://wa.me/?text=${message}`, '_blank');
        handleShare();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] pb-24 font-sans text-[#1E1E1E]">
                <CP_navbar />
                <div className="max-w-md mx-auto px-4 py-6">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-48"></div>
                        <div className="h-64 bg-gray-200 rounded-[24px]"></div>
                        <div className="h-32 bg-gray-200 rounded-[24px]"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!quotation) {
        return null;
    }

    // Parse description into features if it contains structured data
    const descriptionLines = quotation.description 
        ? quotation.description.split('\n').filter(line => line.trim())
        : [];
    
    const features = descriptionLines.map((line, idx) => {
        const trimmed = line.trim().replace(/^[-•*]\s*/, '');
        const parts = trimmed.split(':');
        return {
            title: parts[0] || trimmed,
            desc: parts[1]?.trim() || ''
        };
    });

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-24 font-sans text-[#1E1E1E]">
            <CP_navbar />

            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-md mx-auto px-4 py-3 pt-14 md:pt-4 flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">Quotation Details</h1>
                </div>
            </div>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">

                {/* Hero Card */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mt-10 -mr-10 blur-2xl"></div>

                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Quotation #{quotation.id.slice(-6).toUpperCase()}</p>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{quotation.title}</h2>
                    {quotation.description && (
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">{quotation.description}</p>
                    )}

                    <div className="flex items-end justify-between p-6 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                        <div>
                            <p className="text-xs text-gray-400 font-medium mb-1">Estimated Cost</p>
                            <h3 className="text-3xl font-bold text-indigo-600 tracking-tight">{quotation.formattedPrice}</h3>
                        </div>
                        {quotation.pdfDocument && (
                            <a
                                href={quotation.pdfDocument.secure_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-bold"
                            >
                                <Download className="w-4 h-4" />
                                Download PDF
                            </a>
                        )}
                    </div>
                </div>

                {/* Features List */}
                {features.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" /> What's Included
                        </h3>
                        <div className="space-y-4">
                            {features.map((feature, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="mt-1 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{feature.title}</h4>
                                        {feature.desc && (
                                            <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{feature.desc}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Payment Terms & Disclaimer */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-500" /> Important Information
                    </h3>
                    
                    <div className="p-6 bg-amber-50 rounded-[24px] border border-amber-100 shadow-sm flex gap-3">
                        <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                            <strong>Note:</strong> Final pricing may vary based on specific client requirements and customizations requested during the discovery phase. Please contact us for a detailed quote tailored to your needs.
                        </p>
                    </div>
                </div>

            </main>

            {/* Bottom Floating Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 md:hidden">
                <div className="flex gap-3">
                    <button 
                        onClick={handleWhatsAppShare}
                        className="flex-1 py-3.5 rounded-xl bg-[#25D366] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-transform"
                    >
                        <Share2 className="w-5 h-5" /> Share Quote
                    </button>
                </div>
            </div>

            {/* Desktop FAB equivalent (if needed, but usually redundant with mobile-first focus) */}

        </div>
    );
};

export default CP_quotation_details;
