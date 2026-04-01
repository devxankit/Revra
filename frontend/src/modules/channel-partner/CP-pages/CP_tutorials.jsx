import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Search, Filter, Play, Clock,
    Share2, Heart, MoreVertical
} from 'lucide-react';
import CP_navbar from '../CP-components/CP_navbar';

// --- Mock Data ---
const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'crm', label: 'CRM Tools' },
    { id: 'website', label: 'Websites' },
    { id: 'mobile', label: 'Mobile Apps' },
    { id: 'admin', label: 'Admin Panel' },
    { id: 'partner', label: 'Partner Flow' },
];

const VIDEOS = [
    {
        id: 'crm-demo',
        title: 'Complete CRM Walkthrough',
        description: 'Learn how to manage leads, track sales, and automate follow-ups.',
        thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
        duration: '12:45',
        category: 'crm',
        tags: ['Sales', 'Automation'],
        isNew: true
    },
    {
        id: 'web-builder',
        title: 'Website Builder Overview',
        description: 'Showcasing our drag-and-drop builder features.',
        thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
        duration: '08:20',
        category: 'website',
        tags: ['Design', 'No-code'],
        isFeatured: true
    },
    {
        id: 'app-features',
        title: 'Mobile App Core Features',
        description: 'Deep dive into user authentication, push notifications, and more.',
        thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800',
        duration: '15:30',
        category: 'mobile',
        tags: ['Android', 'iOS']
    },
    {
        id: 'admin-setup',
        title: 'Setting Up Your Admin Panel',
        description: 'A step-by-step guide to configuring your dashboard.',
        thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800',
        duration: '10:15',
        category: 'admin',
        tags: ['Configuration', 'Setup']
    },
    {
        id: 'partner-intro',
        title: 'Welcome to Appzeto Partner Program',
        description: 'Everything you need to know to get started and earn.',
        thumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800',
        duration: '05:00',
        category: 'partner',
        tags: ['Onboarding']
    },
];

const VideoCard = ({ video, onNavigate, onShare }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100 group cursor-pointer hover:shadow-md transition-all"
            onClick={() => onNavigate(video.id)}
        >
            {/* Thumbnail Section */}
            <div className="relative aspect-video bg-gray-900">
                <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center pl-1 shadow-lg">
                            <Play className="w-3.5 h-3.5 text-indigo-600 fill-current" />
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded text-[10px] font-bold text-white flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {video.duration}
                </div>

                {video.isNew && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded">
                        New
                    </div>
                )}
                {video.isFeatured && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider rounded">
                        Featured
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 mb-1">{video.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-1">{video.description}</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onShare(video); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-2">
                    {video.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const CP_tutorials = () => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);

    const filteredVideos = useMemo(() => {
        return VIDEOS.filter(video => {
            const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                video.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = activeCategory === 'all' || video.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeCategory]);

    const handleShare = (video) => {
        setSelectedVideo(video);
        setIsShareSheetOpen(true);
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
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">Demo Videos</h1>
                        <p className="text-xs text-gray-500">Learn, Pitch & Convert</p>
                    </div>
                    <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                        <Search className="w-5 h-5" />
                    </button>
                </div>

                {/* Categories Scroller */}
                <div className="max-w-4xl mx-auto px-4 pb-0 overflow-hidden">
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar py-3">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex-none px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${activeCategory === cat.id
                                        ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                <AnimatePresence mode='popLayout'>
                    {filteredVideos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredVideos.map(video => (
                                <VideoCard
                                    key={video.id}
                                    video={video}
                                    onNavigate={(id) => navigate(`/cp-tutorial-details/${id}`)}
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
                                🎥
                            </div>
                            <h3 className="text-gray-900 font-bold mb-1">No videos found</h3>
                            <p className="text-gray-500 text-sm">Try distinct keywords or categories</p>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                            <div className="flex gap-4 mb-6">
                                <div className="w-20 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                    <img src={selectedVideo?.thumbnail} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 line-clamp-1">{selectedVideo?.title}</h3>
                                    <p className="text-xs text-gray-500">{selectedVideo?.duration} • {CATEGORIES.find(c => c.id === selectedVideo?.category)?.label}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button className="w-full py-3.5 rounded-xl bg-[#25D366] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                                    <Share2 className="w-5 h-5" /> Share via WhatsApp
                                </button>
                                <button className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-900 font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                                    <Share2 className="w-5 h-5" /> Copy Link
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CP_tutorials;
