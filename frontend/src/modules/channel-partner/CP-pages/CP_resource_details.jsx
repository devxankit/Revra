import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    FiArrowLeft, FiShare2, FiLink, FiCheck, FiSmartphone,
    FiMonitor, FiDatabase, FiCloud, FiCheckCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import CP_navbar from '../CP-components/CP_navbar';

// --- Mock Data (Should match ID from previous page) ---
const PROJECT_DATABASE = {
    'food': {
        id: 'food',
        title: 'Appzeto Food',
        category: 'Mobile Apps',
        tagline: 'The ultimate food ordering & delivery ecosystem.',
        description: 'Appzeto Food is a comprehensive solution connecting customers, restaurants, and delivery partners. It features a seamless ordering app, a powerful restaurant dashboard for menu and order management, and a dedicated rider app for efficient delivery tracking.',
        images: [
            'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1526304640152-d46466c89c2f?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800'
        ],
        features: [
            'Live Order Tracking',
            'Multiple Payment Gateways',
            'Restaurant Admin Panel',
            'Delivery Boy App',
            'Coupon & Discount System',
            'Push Notifications'
        ],
        platforms: ['Android', 'iOS', 'Web Admin'],
        pricing: '$1,500 - $3,500 / license',
        demoLink: 'https://demo.appzeto.com/food'
    },
    'quick-commerce': {
        id: 'quick-commerce',
        title: 'Appzeto Quick Commerce',
        category: 'SaaS Platform',
        tagline: 'Superfast delivery for groceries and essentials.',
        description: 'Launch your own 10-minute delivery startup with Appzeto Quick Commerce. Designed for dark store models and local inventory management, this platform ensures rapid fulfillment and real-time stock updates.',
        images: [
            'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800'
        ],
        features: [
            'Dark Store Inventory Sync',
            'Real-time Rider Routing',
            'Automated Stock Alerts',
            'Customer Wallet System',
            'Geofencing Delivery Zones',
            'Heatmap Analytics'
        ],
        platforms: ['Android', 'iOS', 'Web Dashboard'],
        pricing: '$2,000 - $5,000 / setup',
        demoLink: 'https://demo.appzeto.com/quick'
    },
    'taxi': {
        id: 'taxi',
        title: 'Appzeto Taxi',
        category: 'Mobile Apps',
        tagline: 'Smart ride-booking solution for modern transport.',
        description: 'Build your own Uber-like taxi empire. Appzeto Taxi offers a robust dispatch system, real-time navigation, driver earnings reports, and an SOS safety feature for a complete ride-hailing experience.',
        images: [
            'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1513267746261-290089859f58?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1621293954908-35096d4f0c68?auto=format&fit=crop&q=80&w=800'
        ],
        features: [
            'Live GPS Tracking',
            'Auto-Dispatch Algorithm',
            'Surge Pricing Logic',
            'Driver Payout Management',
            'SOS & Safety Toolkit',
            'Multi-Vehicle Support'
        ],
        platforms: ['Android', 'iOS', 'Admin Panel'],
        pricing: '$2,500 - $6,000 / full suite',
        demoLink: 'https://demo.appzeto.com/taxi'
    }
};

const CP_resource_details = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [showShareSheet, setShowShareSheet] = useState(false);
    const [copied, setCopied] = useState(false);

    const project = PROJECT_DATABASE[id] || PROJECT_DATABASE['food']; // Fallback to food if id not found

    const handleCopyLink = () => {
        navigator.clipboard.writeText(project.demoLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!project) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-3xl">😕</div>
                <h2 className="text-xl font-bold text-gray-900">Project Not Found</h2>
                <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 font-bold hover:underline">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-24 font-sans text-[#1E1E1E]">
            <CP_navbar />
            
            {/* Header Image */}
            <div className="h-64 relative bg-gray-900">
                <img
                    src={project.images[0]}
                    alt={project.title}
                    className="w-full h-full object-cover opacity-60"
                />
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-all"
                >
                    <FiArrowLeft className="w-5 h-5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <span className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase rounded-md mb-2 inline-block">
                        {project.category}
                    </span>
                    <h1 className="text-3xl font-bold text-white mb-1">{project.title}</h1>
                    <p className="text-gray-300 text-sm">{project.tagline}</p>
                </div>
            </div>

            <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8 space-y-8">
                {/* 1. Description */}
                <div className="mb-8">
                    <h2 className="font-bold text-gray-900 text-lg mb-3">About the Project</h2>
                    <p className="text-gray-600 leading-relaxed text-sm">
                        {project.description}
                    </p>
                </div>

                {/* 2. Key Features */}
                <div className="mb-8">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Key Features</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {project.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-4 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                                <span className="p-1.5 bg-green-100 text-green-600 rounded-full">
                                    <FiCheckCircle className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-sm text-gray-700 font-medium">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Platforms */}
                <div className="mb-8">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Available On</h2>
                    <div className="flex gap-4">
                        {project.platforms.map(platform => (
                            <div key={platform} className="flex flex-col items-center gap-2 p-4 bg-white rounded-[24px] border border-gray-100 shadow-sm min-w-[80px]">
                                {platform.includes('Web') && <FiMonitor className="w-6 h-6 text-indigo-600" />}
                                {platform === 'Android' && <FiSmartphone className="w-6 h-6 text-green-600" />}
                                {platform === 'iOS' && <FiSmartphone className="w-6 h-6 text-gray-800" />}
                                <span className="text-xs font-bold text-gray-600 text-center">{platform}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Pricing (Optional) */}
                <div className="mb-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-indigo-400 uppercase">Estimated Pricing</p>
                        <p className="text-lg font-bold text-indigo-900">{project.pricing}</p>
                    </div>
                    <button className="text-xs font-bold text-indigo-700 underline">View Rate Card</button>
                </div>

                {/* 5. Screenshots Carousel (Simple) */}
                <div className="mb-8">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Gallery</h2>
                    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                        {project.images.map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                alt={`Screenshot ${idx + 1}`}
                                className="w-60 h-40 object-cover rounded-xl shadow-sm flex-none"
                            />
                        ))}
                    </div>
                </div>
            </main>

            {/* Sticky Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex gap-3 z-40 md:static md:shadow-none md:border-none md:p-0 md:mt-8 md:max-w-3xl md:mx-auto">
                <button
                    onClick={handleCopyLink}
                    className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                >
                    {copied ? <FiCheckCircle className="text-green-600" /> : <FiLink />}
                    {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                    onClick={() => setShowShareSheet(true)}
                    className="flex-[2] py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                    <FiShare2 />
                    Share with Client
                </button>
            </div>

            {/* Share Bottom Sheet (Mock) */}
            <AnimatePresence>
                {showShareSheet && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowShareSheet(false)}
                            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 shadow-2xl"
                        >
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Share Project</h3>

                            <div className="grid grid-cols-4 gap-4 mb-8">
                                <div className="flex flex-col items-center gap-2 cursor-pointer">
                                    <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white text-2xl shadow-sm">
                                        <FiSmartphone />
                                    </div>
                                    <span className="text-xs font-medium text-gray-600">WhatsApp</span>
                                </div>
                                <div className="flex flex-col items-center gap-2 cursor-pointer">
                                    <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl shadow-sm">
                                        <FiShare2 />
                                    </div>
                                    <span className="text-xs font-medium text-gray-600">Telegram</span>
                                </div>
                                {/* More mock options */}
                            </div>

                            <button
                                onClick={() => setShowShareSheet(false)}
                                className="w-full py-4 bg-gray-100 rounded-xl font-bold text-gray-700"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CP_resource_details;
