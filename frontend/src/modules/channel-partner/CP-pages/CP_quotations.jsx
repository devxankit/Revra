import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Search, Filter, Globe, Smartphone,
    Database, ShoppingCart, ChevronRight, Share2,
    Check, Star, Zap, Shield, FileText
} from 'lucide-react';
import CP_navbar from '../CP-components/CP_navbar';
import { cpQuotationService } from '../CP-services/cpQuotationService';
import { useToast } from '../../../contexts/ToastContext';

// Category icon mapping
const getCategoryIcon = (category) => {
    const categoryLower = category?.toLowerCase() || '';
    if (categoryLower.includes('website') || categoryLower.includes('web')) return Globe;
    if (categoryLower.includes('mobile') || categoryLower.includes('app')) return Smartphone;
    if (categoryLower.includes('ecommerce') || categoryLower.includes('e-com')) return ShoppingCart;
    if (categoryLower.includes('crm') || categoryLower.includes('saas')) return Database;
    if (categoryLower.includes('custom') || categoryLower.includes('erp')) return Shield;
    return Zap;
};

const QuotationCard = ({ quote, onNavigate, onShare }) => {
    const formattedQuote = cpQuotationService.formatQuotationForDisplay(quote);
    const categoryIcon = getCategoryIcon(formattedQuote.category);
    const Icon = categoryIcon;

    // Extract features from description (if description contains bullet points or features)
    const descriptionLines = formattedQuote.description 
        ? formattedQuote.description.split('\n').filter(line => line.trim())
        : [];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all"
        >
            {/* Header */}
            <div className="mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{formattedQuote.category}</p>
                <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2">{formattedQuote.title}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-xs text-gray-500">Starts from</span>
                    <span className="text-xl font-bold text-indigo-600">{formattedQuote.formattedPrice}</span>
                </div>
            </div>

            {/* Description/Features */}
            {descriptionLines.length > 0 && (
                <div className="space-y-2 mb-6">
                    {descriptionLines.slice(0, 3).map((line, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs text-gray-600 leading-snug">{line.trim().replace(/^[-•*]\s*/, '')}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer Actions */}
            <div className="flex gap-2 mt-auto">
                <button
                    onClick={() => onNavigate(formattedQuote.id)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-50 text-gray-900 font-bold text-xs hover:bg-gray-100 transition-colors flex items-center justify-center gap-1 group/btn"
                >
                    View Details
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onShare(formattedQuote); }}
                    className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                    <Share2 className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
};

const CP_quotations = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [quotations, setQuotations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch quotations and categories
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [quotationsResponse, categoriesResponse] = await Promise.all([
                    cpQuotationService.getQuotations({
                        category: activeCategory !== 'all' ? activeCategory : undefined,
                        search: searchQuery || undefined
                    }),
                    cpQuotationService.getQuotationCategories()
                ]);

                if (quotationsResponse.success) {
                    setQuotations(quotationsResponse.data || []);
                }

                if (categoriesResponse.success) {
                    setCategories(categoriesResponse.data || []);
                }
            } catch (error) {
                console.error('Error fetching quotations:', error);
                addToast('Failed to load quotations', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeCategory, searchQuery, addToast]);

    // Build categories list with "All" option
    const categoryList = useMemo(() => {
        const allCategory = { id: 'all', label: 'All', icon: Zap };
        const categoryItems = categories.map(cat => ({
            id: cat,
            label: cat,
            icon: getCategoryIcon(cat)
        }));
        return [allCategory, ...categoryItems];
    }, [categories]);

    const handleShare = async (quote) => {
        setSelectedQuote(quote);
        setIsShareSheetOpen(true);
        
        // Track sharing
        try {
            await cpQuotationService.shareQuotation(quote.id);
        } catch (error) {
            console.error('Error tracking share:', error);
        }
    };

    const handleWhatsAppShare = () => {
        if (!selectedQuote) return;
        
        const message = encodeURIComponent(
            `Check out this quotation: ${selectedQuote.title}\n` +
            `Price: ${selectedQuote.formattedPrice}\n` +
            `Category: ${selectedQuote.category}\n\n` +
            (selectedQuote.description ? `${selectedQuote.description.substring(0, 200)}...` : '')
        );
        
        window.open(`https://wa.me/?text=${message}`, '_blank');
        setIsShareSheetOpen(false);
    };

    const handleCopyLink = () => {
        if (!selectedQuote) return;
        
        const link = `${window.location.origin}/cp-quotation-details/${selectedQuote.id}`;
        navigator.clipboard.writeText(link).then(() => {
            addToast('Link copied to clipboard', 'success');
            setIsShareSheetOpen(false);
        }).catch(() => {
            addToast('Failed to copy link', 'error');
        });
    };

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-20 font-sans text-[#1E1E1E]">
            <CP_navbar />

            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 pt-14 md:pt-4 flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">Product Quotations</h1>
                        <p className="text-xs text-gray-500">Share-ready pricing packages</p>
                    </div>
                    <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                        <Search className="w-5 h-5" />
                    </button>
                </div>

                {/* Categories Scroller */}
                <div className="max-w-4xl mx-auto px-4 pb-0 overflow-hidden">
                    <div className="flex gap-4 overflow-x-auto hide-scrollbar py-3">
                        {categoryList.map(cat => {
                            const Icon = cat.icon;
                            const isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all border ${isActive
                                            ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-gray-400'}`} />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                                <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
                                <div className="space-y-2 mb-6">
                                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                                    <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 h-10 bg-gray-200 rounded-xl"></div>
                                    <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <AnimatePresence mode='popLayout'>
                        {quotations.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {quotations.map(quote => (
                                    <QuotationCard
                                        key={quote._id || quote.id}
                                        quote={quote}
                                        onNavigate={(id) => navigate(`/cp-quotation-details/${id}`)}
                                        onShare={handleShare}
                                    />
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-20"
                            >
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-sm border border-gray-100">
                                    🔍
                                </div>
                                <h3 className="text-gray-900 font-bold mb-1">No quotations found</h3>
                                <p className="text-gray-500 text-sm">Try adjusting your filters</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Share Bottom Sheet */}
            <AnimatePresence>
                {isShareSheetOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsShareSheetOpen(false)}
                            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 md:max-w-md md:mx-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl shadow-2xl"
                        >
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                            <h3 className="font-bold text-xl text-gray-900 mb-2">Share Quotation</h3>
                            <p className="text-sm text-gray-500 mb-6">Send <span className="font-bold text-indigo-600">{selectedQuote?.title}</span> details to your lead.</p>

                            <div className="space-y-3">
                                <button 
                                    onClick={handleWhatsAppShare}
                                    className="w-full py-3.5 rounded-xl bg-[#25D366] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                >
                                    <Share2 className="w-5 h-5" /> Share via WhatsApp
                                </button>
                                <button 
                                    onClick={handleCopyLink}
                                    className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-900 font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                                >
                                    <FileText className="w-5 h-5" /> Copy Link
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CP_quotations;
