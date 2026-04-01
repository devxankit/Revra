import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    FiBriefcase, FiCheckCircle, FiClock, FiDollarSign, FiFilter,
    FiMoreVertical, FiPieChart, FiSearch, FiTrendingUp, FiArrowRight
} from 'react-icons/fi';
import CP_navbar from '../CP-components/CP_navbar';
import { cpLeadService } from '../CP-services/cpLeadService';
import { useToast } from '../../../contexts/ToastContext';

const CP_converted = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Fetch converted clients
    useEffect(() => {
        const fetchConvertedClients = async () => {
            try {
                setLoading(true);
                const params = {
                    page: currentPage,
                    limit: 20
                };
                if (searchTerm) params.search = searchTerm;
                
                const response = await cpLeadService.getConvertedClients(params);
                if (response.success && response.data) {
                    setClients(response.data || []);
                    setTotalPages(response.pages || 1);
                }
            } catch (error) {
                console.error('Error fetching converted clients:', error);
                addToast('Failed to load converted clients', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchConvertedClients();
    }, [currentPage, searchTerm, addToast]);

    // Calculate insights from clients data
    const insights = {
        totalConverted: clients.length,
        totalValue: `₹${clients.reduce((sum, c) => sum + (c.project?.totalValue || 0), 0).toLocaleString('en-IN')}`,
        pendingAmount: `₹${clients.reduce((sum, c) => sum + (c.project?.pendingAmount || 0), 0).toLocaleString('en-IN')}`,
        commissionEarned: `₹${clients.reduce((sum, c) => {
            // Calculate commission (assuming 30% for own conversions)
            const totalValue = c.project?.totalValue || 0;
            return sum + (totalValue * 0.3);
        }, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    };

    const formatCurrency = (amount) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const getPaymentStatus = (client) => {
        const paid = client.project?.paidAmount || 0;
        const total = client.project?.totalValue || 0;
        const pending = client.project?.pendingAmount || 0;
        
        if (pending === 0 && paid > 0) return 'Fully Paid';
        if (paid > 0 && pending > 0) return 'Partial Paid';
        return 'Payment Pending';
    };

    const getProjectStatus = (client) => {
        const status = client.project?.status || 'pending-assignment';
        const statusMap = {
            'pending-assignment': 'Planning',
            'untouched': 'Planning',
            'started': 'In Progress',
            'active': 'In Progress',
            'on-hold': 'On Hold',
            'testing': 'Testing',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || 'Planning';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] pb-24 md:pb-0 font-sans text-[#1E1E1E]">
                <CP_navbar />
                <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8">
                    <div className="animate-pulse space-y-8">
                        <div className="h-8 bg-gray-200 rounded w-48"></div>
                        <div className="flex gap-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 w-40 bg-gray-200 rounded-[24px]"></div>)}
                        </div>
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>)}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-24 md:pb-0 font-sans text-[#1E1E1E]">
            <CP_navbar />

            <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8 space-y-8">
                {/* Header */}
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Converted Clients</h1>
                        <p className="text-sm text-gray-500">Track project progress & payments</p>
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2.5 rounded-xl border transition-all ${showFilters ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <FiFilter className="w-5 h-5" />
                    </button>
                </div>

                {/* 1. Summary Insight Bar (Horizontal Scroll) */}
                <div className="flex overflow-x-auto gap-4 hide-scrollbar pb-2 mb-6 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="flex-none w-40 bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-indigo-600">
                            <FiCheckCircle />
                            <span className="text-xs font-bold uppercase">Converted</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{insights.totalConverted}</p>
                    </div>
                    <div className="flex-none w-40 bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-blue-600">
                            <FiBriefcase />
                            <span className="text-xs font-bold uppercase">Project Value</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{insights.totalValue}</p>
                    </div>
                    <div className="flex-none w-40 bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-orange-600">
                            <FiClock />
                            <span className="text-xs font-bold uppercase">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{insights.pendingAmount}</p>
                    </div>
                    <div className="flex-none w-40 bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-green-600">
                            <FiDollarSign />
                            <span className="text-xs font-bold uppercase">Commission</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{insights.commissionEarned}</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* 2. Collapsible Filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-6"
                        >
                            <div className="p-6 bg-white rounded-[24px] shadow-sm border border-gray-100 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Project Status</label>
                                    <select 
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full p-2 bg-gray-50 rounded-lg text-sm border-none focus:ring-0"
                                    >
                                        <option value="all">All Projects</option>
                                        <option value="Planning">Planning</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Payment Status</label>
                                    <select className="w-full p-2 bg-gray-50 rounded-lg text-sm border-none focus:ring-0">
                                        <option>All Payments</option>
                                        <option>Fully Paid</option>
                                        <option>Partial Paid</option>
                                        <option>Pending</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 3. Converted Client Cards */}
                <div className="space-y-4">
                    {clients.length > 0 ? (
                        clients
                            .filter(client => {
                                if (statusFilter === 'all') return true;
                                return getProjectStatus(client) === statusFilter;
                            })
                            .map((client) => {
                                const projectStatus = getProjectStatus(client);
                                const paymentStatus = getPaymentStatus(client);
                                const progress = client.project?.progress || 0;
                                const totalValue = client.project?.totalValue || 0;
                                const paidAmount = client.project?.paidAmount || 0;
                                const pendingAmount = client.project?.pendingAmount || 0;
                                const commissionAmount = totalValue * 0.3; // 30% commission

                                return (
                                    <motion.div
                                        key={client.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
                                        onClick={() => navigate(`/cp-project-progress/${client.id}`)}
                                    >
                                        {/* Top Row: Name & Status */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{client.name || 'Client'}</h3>
                                                <p className="text-xs text-gray-500 font-medium">{client.companyName || client.project?.name || 'Project'}</p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                projectStatus === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                projectStatus === 'Planning' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                projectStatus === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' :
                                                'bg-gray-50 text-gray-600 border-gray-100'
                                            }`}>
                                                {projectStatus}
                                            </span>
                                        </div>

                                        {/* Middle: Value & Payment Split */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="p-3 bg-gray-50 rounded-xl">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total Value</p>
                                                <p className="text-sm font-bold text-gray-900">{formatCurrency(totalValue)}</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-xl">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {paymentStatus === 'Payment Pending' ? 'Pending Amount' : 'Paid Amount'}
                                                </p>
                                                <p className={`text-sm font-bold ${
                                                    paymentStatus === 'Payment Pending' ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                    {paymentStatus === 'Payment Pending' ? formatCurrency(pendingAmount) : formatCurrency(paidAmount)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs mb-1.5 font-medium">
                                                <span className="text-gray-500">Project Completion</span>
                                                <span className="text-indigo-600">{progress}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ duration: 1 }}
                                                    className="h-full bg-indigo-600 rounded-full"
                                                />
                                            </div>
                                        </div>

                                        {/* Footer: Commission & Payment Status */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div
                                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-lg -ml-2 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); navigate('/cp-wallet'); }}
                                            >
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                <span className="text-xs text-gray-500">
                                                    Commission: <span className="font-bold text-gray-700">{formatCurrency(commissionAmount)}</span>
                                                </span>
                                            </div>

                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                                paymentStatus === 'Payment Pending' ? 'bg-red-50 text-red-600 border-red-100' :
                                                paymentStatus === 'Partial Paid' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                'bg-green-50 text-green-600 border-green-100'
                                            }`}>
                                                {paymentStatus}
                                                {paymentStatus === 'Payment Pending' && <FiClock className="w-3 h-3" />}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                    ) : (
                        // Empty State
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-sm">
                                🚀
                            </div>
                            <h3 className="text-gray-900 font-bold mb-1">No conversions yet</h3>
                            <p className="text-gray-500 text-sm mb-6">Your first success is coming!</p>
                            <button onClick={() => navigate('/cp-leads')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-colors">
                                Go to Leads
                            </button>
                        </div>
                    )}
                </div>

                {/* Pagination */}
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
            </main>
        </div>
    );
};

export default CP_converted;
