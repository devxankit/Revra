import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, ChevronRight, Share2, LogOut,
    Phone, Briefcase, Users, Wallet, ExternalLink,
    CheckCircle, ArrowLeft, Settings, Bell, User,
    CreditCard, MapPin, Headphones, QrCode
} from 'lucide-react';
import CP_navbar from '../CP-components/CP_navbar';
import { useToast } from '../../../contexts/ToastContext';
import { logoutCP, getProfile } from '../CP-services/cpAuthService';

const CP_profile = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isFlipped, setIsFlipped] = useState(false);
    const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
    const longPressTimer = useRef(null);
    const isLongPressing = useRef(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    // Get initials from name
    const getInitials = (name) => {
        if (!name) return 'CP';
        return name
            .split(' ')
            .filter(Boolean)
            .map((segment) => segment[0]?.toUpperCase())
            .join('')
            .slice(0, 2) || 'CP';
    };

    // Fetch user profile data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await getProfile();
                const profile = response?.data || {};
                
                setUserData({
                    name: profile.name || 'Channel Partner',
                    id: profile.partnerId || `CP-${profile._id?.slice(-6)?.toUpperCase()}` || 'CP-XXXXXX',
                    role: 'Channel Partner',
                    initials: getInitials(profile.name),
                    company: profile.companyName || '',
                    location: profile.address?.city || profile.address?.state || '',
                    issuedDate: formatDate(profile.joiningDate || profile.createdAt),
                    contact: {
                        phone: profile.phoneNumber ? `+91 ${profile.phoneNumber}` : '',
                        email: profile.email || '',
                        website: profile.companyName?.toLowerCase().replace(/\s+/g, '') + '.com' || 'appzeto.com'
                    }
                });
            } catch (error) {
                // Check if account is inactive
                if (error.isInactive || error.code === 'ACCOUNT_INACTIVE' || (error.payload && error.payload.code === 'ACCOUNT_INACTIVE')) {
                    toast.error(error.message || 'Your account has been deactivated. Please contact support.');
                    // Log out and redirect to login
                    try {
                        await logoutCP();
                    } catch (logoutError) {
                        console.error('Logout error:', logoutError);
                    }
                    setTimeout(() => {
                        navigate('/cp-login');
                    }, 2000);
                    return;
                }
                
                console.error('Failed to fetch profile:', error);
                // Only show error toast if it's not an inactive account
                if (error.status !== 403) {
                    toast.error('Failed to load profile data');
                }
                // Set default data on error
                setUserData({
                    name: 'Channel Partner',
                    id: 'CP-XXXXXX',
                    role: 'Channel Partner',
                    initials: 'CP',
                    company: '',
                    location: '',
                    issuedDate: formatDate(new Date()),
                    contact: {
                        phone: '',
                        email: '',
                        website: 'appzeto.com'
                    }
                });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [toast, navigate]);

    // Use userData or fallback to empty object
    const USER = userData ? {
        ...userData,
        stats: {
            leads: 0,
            converted: 0,
            earnings: '₹ 0'
        }
    } : {
        name: 'Channel Partner',
        id: 'CP-XXXXXX',
        role: 'Channel Partner',
        initials: 'CP',
        company: '',
        location: '',
        issuedDate: formatDate(new Date()),
        contact: {
            phone: '',
            email: '',
            website: 'appzeto.com'
        },
        stats: {
            leads: 0,
            converted: 0,
            earnings: '₹ 0'
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`https://${USER.contact.website}`);
        toast.success("Public profile link copied");
    };

    const handleLogout = async () => {
        try {
            await logoutCP();
            toast.success("Logged out successfully");
            navigate('/cp-login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // Long press handlers for share sheet
    const handleCardPressStart = () => {
        isLongPressing.current = true;
        longPressTimer.current = setTimeout(() => {
            if (isLongPressing.current) {
                setIsShareSheetOpen(true);
                isLongPressing.current = false;
            }
        }, 2000); // 2 seconds
    };

    const handleCardPressEnd = () => {
        isLongPressing.current = false;
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
            }
        };
    }, []);

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] flex flex-col font-sans text-[#1E1E1E] selection:bg-teal-500 selection:text-white">
                <CP_navbar />
                <main className="flex-1 relative overflow-x-hidden pb-28">
                    <div className="relative z-10 pt-24 px-6 md:pt-28 max-w-lg mx-auto">
                        <div className="flex items-center justify-center h-64">
                            <div className="text-gray-500">Loading profile...</div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9] flex flex-col font-sans text-[#1E1E1E] selection:bg-teal-500 selection:text-white">
            <CP_navbar />

            <main className="flex-1 relative overflow-x-hidden pb-28">

                {/* 1. Header - PURE TEAL Gradient Only */}
                <div className="absolute top-0 left-0 right-0 h-[320px] z-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 rounded-b-[50px] shadow-lg"></div>
                    {/* Subtle Texture - No White */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                </div>

                <div className="relative z-10 pt-24 px-6 md:pt-28 max-w-lg mx-auto">


                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-6"
                    >
                        {/* 3. FLIPPABLE IDENTITY CARD */}
                        <motion.div 
                            variants={itemVariants} 
                            className="relative"
                        >
                            <div
                                onClick={() => {
                                    if (!isLongPressing.current) {
                                        setIsFlipped(!isFlipped);
                                    }
                                }}
                                onMouseDown={handleCardPressStart}
                                onMouseUp={handleCardPressEnd}
                                onMouseLeave={handleCardPressEnd}
                                onTouchStart={handleCardPressStart}
                                onTouchEnd={handleCardPressEnd}
                                className="relative w-full h-[420px] cursor-pointer"
                                style={{ perspective: '1000px' }}
                            >
                                <motion.div
                                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                                    className="relative w-full h-full"
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                {/* Front of Card */}
                                <div
                                    className="absolute inset-0 w-full h-full"
                                    style={{ 
                                        backfaceVisibility: 'hidden',
                                        WebkitBackfaceVisibility: 'hidden'
                                    }}
                                >
                                    <div className="relative bg-white rounded-[32px] p-6 shadow-xl border-2 border-gray-200 h-full flex flex-col">
                                        {/* Header - Logo and Verified Badge */}
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-teal-700 flex items-center justify-center shadow-md">
                                                    <User className="w-7 h-7 text-white" />
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-bold text-teal-800">Appzeto</h2>
                                                    <p className="text-xs text-gray-600 font-medium">Official Partner Identification</p>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1.5 rounded-full bg-green-100 border border-green-300 flex items-center gap-1.5">
                                                <CheckCircle className="w-3.5 h-3.5 text-green-700" />
                                                <span className="text-[10px] font-bold text-green-700">Verified</span>
                                            </div>
                                        </div>

                                        {/* Profile Section */}
                                        <div className="flex items-start gap-4 mb-6">
                                            {/* Profile Picture */}
                                            <div className="w-24 h-28 rounded-2xl bg-white border-2 border-green-200 flex items-center justify-center shadow-md flex-shrink-0">
                                                <div className="w-20 h-24 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                                                    <span className="text-3xl font-bold text-white">{USER.initials}</span>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{USER.name}</h3>
                                                    
                                                    <div className="space-y-2">
                                                        <div className="flex items-start gap-2">
                                                            <CreditCard className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-[10px] text-gray-500 font-medium">Partner ID</p>
                                                                <p className="text-sm font-bold text-gray-900">{USER.id}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <Phone className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-[10px] text-gray-500 font-medium">Phone</p>
                                                                <p className="text-sm font-bold text-gray-900">{USER.contact.phone}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-[10px] text-gray-500 font-medium">Location</p>
                                                                <p className="text-sm font-bold text-gray-900">{USER.location}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="mt-auto pt-4 border-t border-green-200/50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-green-700" />
                                                <span className="text-xs text-gray-600 font-medium">Authorized Partner - Appzeto</span>
                                            </div>
                                            <span className="text-[10px] text-gray-500">Issued: {USER.issuedDate}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Back of Card */}
                                <div
                                    className="absolute inset-0 w-full h-full"
                                    style={{ 
                                        backfaceVisibility: 'hidden',
                                        WebkitBackfaceVisibility: 'hidden',
                                        transform: 'rotateY(180deg)'
                                    }}
                                >
                                    <div className="relative bg-white rounded-[32px] p-6 shadow-xl border-2 border-gray-200 h-full flex flex-col items-center justify-between">
                                        {/* Header */}
                                        <div className="text-center w-full">
                                            <h2 className="text-xl font-bold text-teal-800 mb-1">Appzeto</h2>
                                            <p className="text-sm text-gray-600 font-medium">Partner Verification</p>
                                        </div>

                                        {/* QR Code */}
                                        <div className="flex-1 flex items-center justify-center w-full py-6">
                                            <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-lg">
                                                <div className="w-48 h-48 bg-gray-900 rounded-xl flex items-center justify-center">
                                                    <QrCode className="w-32 h-32 text-white" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="w-full space-y-2">
                                            <div className="flex items-center justify-center gap-2 text-gray-700">
                                                <Headphones className="w-4 h-4 text-teal-700" />
                                                <span className="text-xs font-medium">support@appzeto.com</span>
                                            </div>
                                            <p className="text-center text-[10px] text-gray-500">Issued: {USER.issuedDate}</p>
                                        </div>
                                    </div>
                                </div>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* 4. STATS GRID - Minimalist */}
                        <div className="grid grid-cols-2 gap-4">
                            <motion.div
                                variants={itemVariants}
                                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between h-36 relative overflow-hidden active:scale-95 transition-transform"
                            >
                                <div className="w-11 h-11 rounded-full bg-gray-50 text-black flex items-center justify-center mb-2">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-black tracking-tight">{USER.stats.leads}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Total Leads</p>
                                </div>
                            </motion.div>

                            <motion.div
                                variants={itemVariants}
                                onClick={() => navigate('/cp-wallet')}
                                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between h-36 relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
                            >
                                <div className="absolute right-0 top-0 p-4 opacity-5">
                                    <Wallet className="w-16 h-16 text-black" />
                                </div>
                                <div className="w-11 h-11 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mb-2">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div className="relative z-10 flex-1 flex flex-col justify-end">
                                    <h3 className="text-2xl font-black text-black tracking-tight break-words leading-tight">{USER.stats.earnings}</h3>
                                    <div className="flex items-center gap-1 mt-1 text-teal-700">
                                        <p className="text-xs font-bold uppercase tracking-wide">Earnings</p>
                                        <ChevronRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* 5. MENU ACTIONS - Simple Black Text */}
                        <motion.div variants={itemVariants} className="space-y-5 pt-2">

                            <div className="bg-white rounded-[28px] shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                                {/* Contact Row */}
                                <div className="p-5 flex items-center gap-5 cursor-default">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Mobile Number</p>
                                        <p className="text-sm font-bold text-black truncate font-mono">{USER.contact.phone}</p>
                                    </div>
                                </div>

                                {/* My Team Row */}
                                <motion.div
                                    whileTap={{ backgroundColor: "#f9fafb" }}
                                    onClick={() => navigate('/cp-my-team')}
                                    className="p-5 flex items-center justify-between cursor-pointer group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-black">Assigned Sales Team</p>
                                            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Manage your POCs</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center">
                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-black" />
                                    </div>
                                </motion.div>

                                {/* Share Row */}
                                <motion.div
                                    whileTap={{ backgroundColor: "#f9fafb" }}
                                    onClick={handleCopyLink}
                                    className="p-5 flex items-center justify-between cursor-pointer group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                                            <Share2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-black">Share Public Profile</p>
                                            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Increase your reach</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center">
                                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-black" />
                                    </div>
                                </motion.div>
                            </div>

                            <motion.button
                                variants={itemVariants}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleLogout}
                                className="w-full bg-red-50 rounded-2xl p-4 shadow-sm border border-red-100 flex items-center justify-center gap-2 text-red-600 font-bold text-sm hover:text-red-700 hover:bg-red-100 hover:border-red-200 transition-all mt-4"
                            >
                                <LogOut className="w-4 h-4" /> Sign Out
                            </motion.button>
                        </motion.div>
                    </motion.div>

                    {/* 6. MINIMAL FOOTER */}
                    <div className="mt-12 mb-6 text-center">
                        <span className="text-sm font-bold tracking-[0.2em] text-gray-700 uppercase font-mono">
                            Appzeto • v2.5.0
                        </span>
                    </div>

                </div>
            </main>

            {/* Share Profile Bottom Sheet */}
            <AnimatePresence>
                {isShareSheetOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsShareSheetOpen(false)}
                            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 md:max-w-md md:mx-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl shadow-[0_-10px_40px_rgb(0,0,0,0.1)]"
                        >
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />
                            
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-xl text-gray-900 tracking-tight">Share Profile</h3>
                                <button 
                                    onClick={() => setIsShareSheetOpen(false)} 
                                    className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 rotate-90" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {/* Copy Profile Link */}
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        handleCopyLink();
                                        setIsShareSheetOpen(false);
                                    }}
                                    className="w-full p-4 bg-gray-50 rounded-2xl flex items-center gap-4 hover:bg-gray-100 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                                        <Share2 className="w-6 h-6 text-teal-700" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-gray-900">Copy Profile Link</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Share your profile link</p>
                                    </div>
                                    <ExternalLink className="w-5 h-5 text-gray-400" />
                                </motion.button>

                                {/* Share via WhatsApp */}
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        const message = encodeURIComponent(`Check out my profile on Appzeto: ${USER.name} - ${USER.id}`);
                                        window.open(`https://wa.me/?text=${message}`, '_blank');
                                        setIsShareSheetOpen(false);
                                    }}
                                    className="w-full p-4 bg-green-50 rounded-2xl flex items-center gap-4 hover:bg-green-100 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                                        <Share2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-gray-900">Share via WhatsApp</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Share with contacts</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </motion.button>

                                {/* Share via Email */}
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        const subject = encodeURIComponent(`My Appzeto Partner Profile - ${USER.name}`);
                                        const body = encodeURIComponent(`Hi,\n\nCheck out my partner profile on Appzeto:\n\nName: ${USER.name}\nPartner ID: ${USER.id}\nRole: ${USER.role}\n\nProfile Link: https://${USER.contact.website}`);
                                        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                                        setIsShareSheetOpen(false);
                                    }}
                                    className="w-full p-4 bg-blue-50 rounded-2xl flex items-center gap-4 hover:bg-blue-100 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                                        <Share2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-gray-900">Share via Email</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Send profile via email</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </motion.button>

                                {/* Download QR Code */}
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        toast.success("QR code download feature coming soon");
                                        setIsShareSheetOpen(false);
                                    }}
                                    className="w-full p-4 bg-purple-50 rounded-2xl flex items-center gap-4 hover:bg-purple-100 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                                        <QrCode className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-gray-900">Download QR Code</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Save QR code image</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </motion.button>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsShareSheetOpen(false)}
                                className="w-full mt-6 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </motion.button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CP_profile;
