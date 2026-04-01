import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    FiShare2, FiFilter, FiSearch, FiArrowRight, FiUser, 
    FiClock, FiDollarSign, FiCheck, FiX, FiPhone
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import CP_navbar from '../CP-components/CP_navbar';
import { cpLeadService } from '../CP-services/cpLeadService';
import { useToast } from '../../../contexts/ToastContext';

// --- Components ---
const StatusBadge = ({ status }) => {
    const styles = {
        'Hot': 'bg-red-50 text-red-600 border-red-100',
        'Connected': 'bg-blue-50 text-blue-600 border-blue-100',
        'Converted': 'bg-green-50 text-green-600 border-green-100',
        'Lost': 'bg-gray-50 text-gray-500 border-gray-100',
        'default': 'bg-gray-50 text-gray-600 border-gray-100'
    };

    const currentStyle = styles[status] || styles['default'];

    return (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${currentStyle} flex items-center gap-1`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'Hot' ? 'bg-red-500 animate-pulse' : 'bg-current'}`} />
            {status}
        </span>
    );
};

const SharedLeadCard = ({ lead, onNavigate }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onNavigate(lead.id)}
            className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative group cursor-pointer"
        >
            {/* Header Section */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        {lead.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{lead.name}</h3>
                        <p className="text-xs text-gray-500 font-medium">{lead.projectType}</p>
                    </div>
                </div>
                <StatusBadge status={lead.status} />
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">{lead.value || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <FiClock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">Updated {lead.lastUpdated}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span className="text-xs text-gray-500">
                        Shared with: <span className="font-medium text-gray-700">{lead.sharedWith}</span>
                    </span>
                </div>
            </div>

            {/* Last Update Info */}
            {lead.lastUpdate && (
                <div className="mb-4 pb-4 border-b border-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Last Update</p>
                    <p className="text-sm font-medium text-gray-700">{lead.lastUpdate}</p>
                    <p className="text-xs text-gray-400 mt-1">{lead.updateTime}</p>
                </div>
            )}

            {/* Read-only Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex gap-1">
                    <a 
                        href={`tel:${lead.phone}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                    >
                        <FiPhone className="w-4 h-4" />
                    </a>
                    <a 
                        href={`https://wa.me/${lead.phone}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                    >
                        <FaWhatsapp className="w-4 h-4" />
                    </a>
                </div>
                {lead.status === 'Converted' && lead.rawData?.convertedToClient ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(`/cp-project-progress/${lead.rawData.convertedToClient}`);
                        }}
                        className="text-xs text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1"
                    >
                        View Project <FiArrowRight className="w-3 h-3" />
                    </button>
                ) : (
                    <div className="text-xs text-gray-400 font-medium">
                        Read-Only <FiArrowRight className="w-3 h-3 inline ml-1" />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const CP_shared_leads = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [showFilters, setShowFilters] = useState(false);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [timeFilter, setTimeFilter] = useState('all-time');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Fetch shared leads
    useEffect(() => {
        const fetchSharedLeads = async () => {
            try {
                setLoading(true);
                const params = {
                    page: currentPage,
                    limit: 20
                };
                if (searchQuery) params.search = searchQuery;

                const response = await cpLeadService.getSharedLeadsWithSales(params);
                if (response.success && response.data) {
                    // Transform backend data to frontend format
                    const transformedLeads = response.data.map(lead => {
                        const sharedWith = lead.sharedWithSales?.[0];
                        return {
                            id: lead._id || lead.id,
                            name: lead.name || 'Unknown',
                            projectType: lead.category?.name || 'General',
                            status: lead.status === 'converted' ? 'Converted' : 
                                   lead.status === 'lost' ? 'Lost' :
                                   lead.priority === 'urgent' ? 'Hot' :
                                   lead.status === 'connected' ? 'Connected' :
                                   lead.status === 'followup' ? 'Follow-up' :
                                   lead.status === 'new' ? 'New' : 'Active',
                            sharedWith: sharedWith?.salesId?.name || 'Sales Team Lead',
                            sharedOn: sharedWith?.sharedAt ? new Date(sharedWith.sharedAt).toLocaleDateString() : '—',
                            lastUpdated: formatTimeAgo(lead.updatedAt || lead.createdAt),
                            phone: lead.phone,
                            email: lead.email,
                            value: `₹${(lead.value || 0).toLocaleString('en-IN')}`,
                            lastUpdate: lead.activities?.[lead.activities.length - 1]?.description || 'No updates',
                            updateTime: lead.activities?.[lead.activities.length - 1]?.timestamp 
                                ? formatTimeAgo(lead.activities[lead.activities.length - 1].timestamp) 
                                : '—',
                            convertedToClient: lead.convertedToClient?._id || lead.convertedToClient, // For project progress link
                            rawData: lead
                        };
                    });
                    
                    setLeads(transformedLeads);
                    setTotalPages(response.pages || 1);
                }
            } catch (error) {
                console.error('Error fetching shared leads:', error);
                addToast('Failed to load shared leads', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchSharedLeads();
    }, [currentPage, searchQuery, addToast]);

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return `${Math.floor(diffDays / 30)}mo ago`;
    };

    const TABS = [
        { id: 'all', label: 'All', count: leads.length },
        { id: 'hot', label: 'Hot', count: leads.filter(l => l.status === 'Hot').length },
        { id: 'connected', label: 'Connected', count: leads.filter(l => l.status === 'Connected').length },
        { id: 'converted', label: 'Converted', count: leads.filter(l => l.status === 'Converted').length },
        { id: 'lost', label: 'Lost', count: leads.filter(l => l.status === 'Lost').length },
        { id: 'active', label: 'Active', count: leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length },
    ];

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.projectType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.sharedWith.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            // Time Filter Logic
            let matchesTime = true;
            if (timeFilter !== 'all-time') {
                const timeStr = lead.lastUpdated;
                if (timeFilter === 'yesterday') {
                    matchesTime = timeStr.includes('1d ago');
                } else if (timeFilter === 'this-week') {
                    matchesTime = timeStr.includes('m ago') || timeStr.includes('h ago') || (timeStr.includes('d ago') && parseInt(timeStr) < 7);
                } else if (timeFilter === 'last-30-days') {
                    matchesTime = !timeStr.includes('mo ago') && !timeStr.includes('y ago');
                }
            }
            if (!matchesTime) return false;

            if (activeTab === 'all') return true;
            if (activeTab === 'hot') return lead.status === 'Hot';
            if (activeTab === 'connected') return lead.status === 'Connected';
            if (activeTab === 'converted') return lead.status === 'Converted';
            if (activeTab === 'lost') return lead.status === 'Lost';
            if (activeTab === 'active') return lead.status !== 'Converted' && lead.status !== 'Lost';
            return true;
        });
    }, [leads, activeTab, searchQuery, timeFilter]);

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-24 md:pb-0 font-sans text-[#1E1E1E]">
            <CP_navbar />

            <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8 space-y-8">
                {/* Search Bar with Filter */}
                <div className="mb-4 relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiSearch className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name, project, or sales rep..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-11 pr-12 py-3.5 bg-white border border-gray-100 rounded-[24px] text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`absolute inset-y-0 right-0 pr-4 pl-3 flex items-center transition-colors ${showFilters ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <FiFilter className="w-5 h-5" />
                    </button>
                </div>

                {/* Collapsible Filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-6"
                        >
                            <div className="p-6 bg-white rounded-[24px] shadow-sm border border-gray-100">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">Timeframe</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'all-time', label: 'All Time' },
                                        { id: 'yesterday', label: 'Yesterday' },
                                        { id: 'this-week', label: 'This Week' },
                                        { id: 'last-30-days', label: 'Last 30 Days' },
                                    ].map((tf) => (
                                        <button
                                            key={tf.id}
                                            onClick={() => setTimeFilter(tf.id)}
                                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${timeFilter === tf.id
                                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {tf.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Animated Tabs */}
                <div className="flex overflow-x-auto pb-6 gap-3 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${activeTab === tab.id
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'bg-white text-gray-500 border border-gray-100'
                                }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Shared Lead Cards */}
                <AnimatePresence mode='popLayout'>
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 animate-pulse">
                                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                                    <div className="h-20 bg-gray-200 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredLeads.length > 0 ? (
                                <>
                                    {filteredLeads.map((lead) => (
                                        <SharedLeadCard
                                            key={lead.id}
                                            lead={lead}
                                            onNavigate={(id) => navigate(`/cp-lead-details/${id}`)}
                                        />
                                    ))}
                                    {totalPages > 1 && (
                                        <div className="flex justify-center items-center gap-4 mt-6">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className="px-4 py-2 bg-white rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-gray-600">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-4 py-2 bg-white rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-16"
                                >
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-sm">
                                        🤝
                                    </div>
                                    <h3 className="text-gray-900 font-bold mb-1">No shared leads found</h3>
                                    <p className="text-gray-500 text-sm mb-6">Clear filters or share leads with sales team first!</p>
                                    <button onClick={() => navigate('/cp-leads')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-colors">
                                        Go to Leads
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default CP_shared_leads;
