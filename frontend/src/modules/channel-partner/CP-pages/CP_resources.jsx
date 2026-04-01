
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    FiSearch, FiFilter, FiEye, FiShare2, FiArrowRight,
    FiLayers, FiSmartphone, FiMonitor, FiDatabase, FiCloud
} from 'react-icons/fi';
import CP_navbar from '../CP-components/CP_navbar';

// --- Mock Data ---
const CATEGORIES = ['All', 'CRM', 'Web Apps', 'Mobile Apps', 'Custom Solutions', 'SaaS'];

const PROJECTS = [
    {
        id: 'food',
        title: 'Appzeto Food',
        category: 'Mobile Apps',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800',
        description: 'Complete food delivery marketplace solution for restaurants and delivery networks.',
        tags: ['Food Delivery', 'Restaurant', 'Ordering'],
        techStack: [<FiSmartphone />, <FiDatabase />, <FiMonitor />],
        isNew: true,
        isFeatured: true
    },
    {
        id: 'quick-commerce',
        title: 'Appzeto Quick Commerce',
        category: 'SaaS',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
        description: 'Hyper-local grocery and essentials delivery platform with inventory management.',
        tags: ['Grocery', 'eCommerce', 'Inventory'],
        techStack: [<FiSmartphone />, <FiCloud />, <FiMonitor />],
        isNew: true,
        isFeatured: true
    },
    {
        id: 'taxi',
        title: 'Appzeto Taxi',
        category: 'Mobile Apps',
        image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800',
        description: 'On-demand ride booking solution with real-time tracking and automated dispatch.',
        tags: ['Ride Booking', 'Transport', 'Geolocation'],
        techStack: [<FiSmartphone />, <FiLayers />, <FiDatabase />],
        isNew: false,
        isFeatured: true
    }
];

const CP_resources = () => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProjects = PROJECTS.filter(project => {
        const matchesCategory = activeCategory === 'All' || project.category === activeCategory;
        const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-24 md:pb-0 font-sans text-[#1E1E1E]">
            {/* 1. Header (Sticky) */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
                            <FiArrowRight className="w-5 h-5 rotate-180" />
                        </button>
                        <h1 className="font-bold text-gray-900 text-lg">Project Showcase</h1>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search projects, industries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
            </div>

            <div className="max-w-7xl mx-auto">

                {/* 2. Category Tabs (Horizontal Scroll) */}
                <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-[110px] z-30 overflow-x-auto hide-scrollbar flex gap-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-none snap-start ${activeCategory === cat
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* 3. Project Cards Grid */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredProjects.length > 0 ? (
                            filteredProjects.map((project) => (
                                <motion.div
                                    key={project.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => navigate(`/cp-resources/${project.id}`)}
                                    className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100 group cursor-pointer hover:shadow-md transition-all"
                                >
                                    {/* Thumbnail */}
                                    <div className="h-48 bg-gray-200 relative overflow-hidden">
                                        <img
                                            src={project.image}
                                            alt={project.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-3 left-3 flex gap-2">
                                            {project.isFeatured && (
                                                <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold uppercase rounded-lg shadow-sm">
                                                    Featured
                                                </span>
                                            )}
                                            {project.isNew && (
                                                <span className="px-2 py-1 bg-blue-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">
                                                {project.title}
                                            </h3>
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded">
                                                {project.category}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                            {project.description}
                                        </p>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {project.tags.map(tag => (
                                                <span key={tag} className="px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-medium rounded-md border border-gray-100">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Footer: Tech Stack & Actions */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div className="flex -space-x-2 text-gray-400">
                                                {project.techStack.map((icon, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-sm">
                                                        {icon}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); /* Share Action */ }}
                                                >
                                                    <FiShare2 />
                                                </button>
                                                <button className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 text-2xl">
                                    🔍
                                </div>
                                <h3 className="text-gray-900 font-bold">No projects found</h3>
                                <p className="text-gray-500 text-sm">Try adjusting your search or category.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default CP_resources;
