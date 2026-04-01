import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Share2, Play, ThumbsUp, MessageCircle
} from 'lucide-react';
import CP_navbar from '../CP-components/CP_navbar';

// Mock DB
const VIDEO_DETAILS = {
    'crm-demo': {
        title: 'Complete CRM Walkthrough',
        description: 'Master the art of lead management with our comprehensive CRM guide. We cover everything from adding your first lead to setting up automated follow-ups and tracking your sales pipeline.',
        thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
        duration: '12:45',
        views: '1.2k',
        likes: '450',
        date: '2 Days ago',
        related: ['admin-setup', 'partner-intro']
    },
    'web-builder': {
        title: 'Website Builder Overview',
        description: 'Explore the powerful drag-and-drop features of our website builder.',
        thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
        duration: '08:20',
        views: '800',
        likes: '230',
        date: '1 Week ago',
        related: ['crm-demo']
    },
    // Fallback...
};

const CP_tutorial_details = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const video = VIDEO_DETAILS[id] || VIDEO_DETAILS['crm-demo'];

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-24 font-sans text-[#1E1E1E]">
            <CP_navbar />

            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 py-3 pt-14 md:pt-4 flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900 line-clamp-1">{video.title}</h1>
                </div>
            </div>

            <main className="max-w-4xl mx-auto">
                {/* Video Player Placeholder */}
                <div className="aspect-video bg-black relative group cursor-pointer sticky top-[4.5rem] z-20 md:static md:rounded-2xl md:overflow-hidden md:mt-6 md:shadow-xl md:mx-4">
                    <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center pl-1 shadow-lg">
                                <Play className="w-5 h-5 text-white fill-current" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Video Details */}
                <div className="px-4 py-6">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 leading-tight">{video.title}</h1>

                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                        <div className="text-xs text-gray-500 font-medium">
                            {video.date}
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <h3 className="font-bold text-gray-900">Description</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {video.description}
                        </p>
                    </div>

                    {/* Related Videos */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-4">Related Videos</h3>
                        <div className="space-y-4">
                            {video.related.map((relId, idx) => {
                                const relVideo = VIDEO_DETAILS[relId] || VIDEO_DETAILS['crm-demo'];
                                return (
                                    <div key={idx} onClick={() => navigate(`/cp-tutorial-details/${relId}`)} className="flex gap-3 cursor-pointer group">
                                        <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0 relative">
                                            <img src={relVideo.thumbnail} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[8px] font-bold text-white">
                                                {relVideo.duration}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm line-clamp-2 md:group-hover:text-indigo-600 transition-colors">{relVideo.title}</h4>
                                            <p className="text-xs text-gray-500 mt-1">{relVideo.views} views • {relVideo.date}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CP_tutorial_details;
