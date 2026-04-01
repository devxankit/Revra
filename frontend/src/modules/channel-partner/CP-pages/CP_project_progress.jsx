import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
    FiArrowLeft, FiClock, FiCheckCircle, FiAlertCircle,
    FiFileText, FiDownload, FiDollarSign, FiInfo, FiActivity,
    FiPlus, FiX, FiCalendar, FiFile
} from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import { cpLeadService } from '../CP-services/cpLeadService';
import { useToast } from '../../../contexts/ToastContext';

const CP_project_progress = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [projectData, setProjectData] = useState(null);

    const [isRecoverySheetOpen, setIsRecoverySheetOpen] = useState(false);
    const [isPaymentDetailsSheetOpen, setIsPaymentDetailsSheetOpen] = useState(false);
    const [payments, setPayments] = useState([]);
    const [recoveryData, setRecoveryData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        invoice: '',
        method: 'Bank Transfer',
        notes: ''
    });

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Format time ago
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
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateString);
    };

    // Format currency
    const formatCurrency = (amount) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    // Get status display
    const getStatusDisplay = (status) => {
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
        return statusMap[status] || status;
    };

    // Get milestone status
    const getMilestoneStatus = (milestone) => {
        if (milestone.completedDate) return 'Completed';
        if (milestone.dueDate && new Date(milestone.dueDate) < new Date()) return 'Overdue';
        return 'Pending';
    };

    // Fetch project data
    useEffect(() => {
        const fetchProjectData = async () => {
            try {
                setLoading(true);
                const response = await cpLeadService.getClientDetails(id);
                
                if (response.success && response.data) {
                    const data = response.data;
                    const project = data.project || {};
                    const client = data.client || {};
                    
                    // Format project data
                    const formattedData = {
                        id: project.id || id,
                        projectName: project.name || 'Project',
                        clientName: client.name || 'Client',
                        companyName: client.companyName || '',
                        type: project.type || 'N/A',
                        startDate: formatDate(project.startDate),
                        expectedDelivery: formatDate(project.dueDate),
                        pmName: project.projectManager?.name || 'Not Assigned',
                        status: getStatusDisplay(project.status || 'pending-assignment'),
                        progress: project.progress || 0,
                        milestones: (project.milestones || []).map(m => ({
                            id: m.id,
                            name: m.name,
                            status: getMilestoneStatus(m),
                            date: m.completedDate ? formatDate(m.completedDate) : (m.dueDate ? `Due: ${formatDate(m.dueDate)}` : '—')
                        })),
                        activities: (project.activities || []).map(a => ({
                            id: a.id,
                            text: a.text,
                            user: a.user,
                            time: formatTimeAgo(a.time)
                        })),
                        files: (project.attachments || []).map((f, idx) => ({
                            id: f.public_id || idx,
                            name: f.originalName || f.original_filename || 'File',
                            size: f.size ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : '—',
                            type: f.format || 'file',
                            url: f.secure_url
                        })),
                        payment: {
                            total: formatCurrency(project.totalCost || 0),
                            paid: formatCurrency(project.advanceReceived || 0),
                            pending: formatCurrency((project.totalCost || 0) - (project.advanceReceived || 0)),
                            lastPayment: payments.length > 0 ? formatDate(payments[0].date) : '—',
                            payments: payments
                        },
                        adminNotes: [] // Can be added later if needed
                    };
                    
                    setProjectData(formattedData);
                    setPayments((data.payments || []).map(p => ({
                        id: p.id,
                        amount: formatCurrency(p.amount),
                        date: formatDate(p.date),
                        invoice: p.invoice,
                        status: p.status,
                        method: p.method
                    })));
                }
            } catch (error) {
                console.error('Error fetching project data:', error);
                addToast('Failed to load project data', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProjectData();
        }
    }, [id, addToast]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] pb-20 md:pb-0 font-sans text-[#1E1E1E]">
                <div className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
                    <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                            <div className="h-3 bg-gray-200 rounded w-full"></div>
                        </div>
                    ))}
                </main>
            </div>
        );
    }

    if (!projectData) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] pb-20 md:pb-0 font-sans text-[#1E1E1E]">
                <div className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                </div>
                <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                    <div className="text-center py-20">
                        <p className="text-gray-500">Project not found</p>
                    </div>
                </main>
            </div>
        );
    }

    const project = projectData;

    const handleAddRecovery = () => {
        if (!recoveryData.amount || !recoveryData.date) {
            addToast('Please fill in required fields', 'error');
            return;
        }

        const newPayment = {
            id: Date.now(),
            amount: formatCurrency(parseFloat(recoveryData.amount)),
            date: formatDate(recoveryData.date),
            invoice: recoveryData.invoice || `INV-${Date.now()}`,
            status: 'Received',
            method: recoveryData.method
        };

        setPayments([newPayment, ...payments]);
        
        // Update project payment totals
        const totalPaid = payments.reduce((sum, p) => {
            const amt = parseFloat(p.amount.replace('₹', '').replace(/,/g, ''));
            return sum + (isNaN(amt) ? 0 : amt);
        }, 0) + parseFloat(recoveryData.amount);
        
        const totalAmount = parseFloat(project.payment.total.replace('₹', '').replace(/,/g, ''));
        const pending = totalAmount - totalPaid;

        // Update project data
        setProjectData({
            ...project,
            payment: {
                ...project.payment,
                paid: formatCurrency(totalPaid),
                pending: formatCurrency(pending),
                lastPayment: formatDate(recoveryData.date)
            }
        });

        // Reset form
        setRecoveryData({
            amount: '',
            date: new Date().toISOString().split('T')[0],
            invoice: '',
            method: 'Bank Transfer',
            notes: ''
        });
        setIsRecoverySheetOpen(false);
        addToast('Payment added successfully', 'success');
    };

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-20 md:pb-0 font-sans text-[#1E1E1E]">
            {/* 1. Header (Sticky) */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-bold text-gray-900 text-sm md:text-base leading-tight">{project.projectName}</h1>
                        <p className="text-xs text-gray-500 hidden md:block">Track real-time progress</p>
                    </div>
                </div>
                <button className="p-2 text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100">
                    <FiInfo className="w-5 h-5" />
                </button>
            </div>

            <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">

                {/* 2. Project Overview Card (Hero) */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="font-bold text-lg text-gray-900">{project.clientName}</h2>
                            <p className="text-sm text-gray-500 font-medium">{project.type}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${project.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            project.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {project.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase">Start Date</p>
                            <p className="font-semibold text-gray-700">{project.startDate}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase">Est. Delivery</p>
                            <p className="font-semibold text-gray-700">{project.expectedDelivery}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-50 mt-2">
                            <p className="text-gray-400 text-xs font-bold uppercase">Project Manager</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                    {project.pmName.charAt(0)}
                                </div>
                                <span className="font-medium text-gray-700">{project.pmName}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Project Progress Bar */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-end mb-2">
                        <h3 className="font-bold text-gray-900">Progress</h3>
                        <span className="text-2xl font-bold text-indigo-600">{project.progress}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4 relative">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${project.progress}%` }}
                            transition={{ duration: 1 }}
                            className="h-full bg-indigo-600 rounded-full"
                        />
                    </div>

                </div>

                {/* 4. Milestones Section */}
                <div>
                    <h3 className="font-bold text-gray-900 mb-3 px-1">Milestones</h3>
                    <div className="grid gap-3">
                        {project.milestones.map(ms => (
                            <div key={ms.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{ms.name}</h4>
                                    <p className="text-xs text-gray-500">{ms.date}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${ms.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' :
                                    ms.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                        'bg-gray-50 text-gray-500 border-gray-200'
                                    }`}>
                                    {ms.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 8. Admin Notes (Pinned) */}
                {project.adminNotes.length > 0 && (
                    <div className="bg-amber-50 rounded-[24px] p-6 border border-amber-100">
                        <div className="flex items-center gap-2 mb-2 text-amber-700">
                            <FiAlertCircle />
                            <h3 className="font-bold text-sm">PM Notes</h3>
                        </div>
                        <div className="space-y-2">
                            {project.adminNotes.map(note => (
                                <p key={note.id} className="text-sm text-amber-900 bg-white/50 p-2 rounded-lg border border-amber-100/50">
                                    {note.text}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. Recent Activity Timeline */}
                <div>
                    <h3 className="font-bold text-gray-900 mb-3 px-1">Recent Activity</h3>
                    <div className="bg-white rounded-2xl p-5 border border-gray-100">
                        <div className="space-y-6 relative left-2">
                            {/* Vertical Line */}
                            <div className="absolute top-2 bottom-2 left-[5px] w-0.5 bg-gray-100" />

                            {project.activities.map(act => (
                                <div key={act.id} className="flex gap-4 relative">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-white ring-2 ring-indigo-50 flex-shrink-0 relative z-10" />
                                    <div>
                                        <p className="text-sm text-gray-900 font-medium">{act.text}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{act.user} • {act.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 6. Deliverables */}
                <div>
                    <h3 className="font-bold text-gray-900 mb-3 px-1">Files & Deliverables</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                        {project.files && project.files.length > 0 ? (
                            project.files.map(file => (
                                <div key={file.id} className="flex-none w-40 bg-white p-3 rounded-xl border border-gray-100 flex flex-col items-center text-center">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-2">
                                        <FiFileText />
                                    </div>
                                    <p className="text-xs font-bold text-gray-800 truncate w-full">{file.name}</p>
                                    <p className="text-[10px] text-gray-400 mb-2">{file.size}</p>
                                    {file.url && (
                                        <a 
                                            href={file.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-bold text-indigo-600 border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-50 flex items-center gap-1"
                                        >
                                            <FiDownload /> Download
                                        </a>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                No files available
                            </div>
                        )}
                    </div>
                </div>

                {/* 7. Payment Snapshot */}
                <div>
                    <h3 className="font-bold text-gray-900 mb-3 px-1">Payment Status</h3>
                    <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                                    <FaRupeeSign />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Payment Status</p>
                                    <p className="text-sm font-bold text-gray-900">
                                        {project.payment.paid} <span className="text-gray-400 font-normal">/ {project.payment.total}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPaymentDetailsSheetOpen(true)}
                                className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                            >
                                View Details
                            </button>
                        </div>
                        <div className="pt-4 border-t border-gray-50">
                            <p className="text-xs text-gray-500 mb-2">Pending Amount</p>
                            <p className="text-lg font-bold text-gray-900">{project.payment.pending}</p>
                        </div>
                    </div>
                </div>

            </main>

            {/* Add Recovery FAB */}
            <motion.button
                onClick={() => setIsRecoverySheetOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-16 right-5 md:bottom-6 md:right-10 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center z-40 transition-all font-semibold"
            >
                <FiPlus className="w-6 h-6" />
            </motion.button>

            {/* Add Recovery Bottom Sheet */}
            <AnimatePresence>
                {isRecoverySheetOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsRecoverySheetOpen(false)}
                            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 md:max-w-2xl md:mx-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl shadow-[0_-10px_40px_rgb(0,0,0,0.1)] max-h-[90vh] flex flex-col"
                        >
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />
                            
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-2xl text-gray-900 tracking-tight">Add Recovery Amount</h3>
                                <button onClick={() => setIsRecoverySheetOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-4">
                                    {/* Amount */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Amount <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <FaRupeeSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={recoveryData.amount}
                                                onChange={(e) => setRecoveryData({ ...recoveryData, amount: e.target.value })}
                                                placeholder="Enter amount"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Date */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Payment Date <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="date"
                                                value={recoveryData.date}
                                                onChange={(e) => setRecoveryData({ ...recoveryData, date: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Payment Method</label>
                                        <select
                                            value={recoveryData.method}
                                            onChange={(e) => setRecoveryData({ ...recoveryData, method: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium appearance-none"
                                        >
                                            <option>Bank Transfer</option>
                                            <option>UPI</option>
                                            <option>Cash</option>
                                            <option>Cheque</option>
                                            <option>Credit Card</option>
                                        </select>
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Notes</label>
                                        <textarea
                                            value={recoveryData.notes}
                                            onChange={(e) => setRecoveryData({ ...recoveryData, notes: e.target.value })}
                                            placeholder="Additional notes (optional)"
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 mt-2 bg-white">
                                    <button
                                        onClick={handleAddRecovery}
                                        className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold text-lg shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95"
                                    >
                                        Add Recovery
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Payment Details Bottom Sheet */}
            <AnimatePresence>
                {isPaymentDetailsSheetOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPaymentDetailsSheetOpen(false)}
                            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 md:max-w-2xl md:mx-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl shadow-[0_-10px_40px_rgb(0,0,0,0.1)] max-h-[90vh] flex flex-col"
                        >
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />
                            
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-2xl text-gray-900 tracking-tight">Payment Details</h3>
                                <button onClick={() => setIsPaymentDetailsSheetOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-4">
                                    {/* Payment Summary */}
                                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium mb-1">Total Amount</p>
                                                <p className="text-lg font-bold text-gray-900">{project.payment.total}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium mb-1">Paid Amount</p>
                                                <p className="text-lg font-bold text-green-600">{project.payment.paid}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium mb-1">Pending Amount</p>
                                                <p className="text-lg font-bold text-red-600">{project.payment.pending}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium mb-1">Total Payments</p>
                                                <p className="text-lg font-bold text-gray-900">{payments.length}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment List */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-gray-900">Payment History</h4>
                                        {payments.length > 0 ? (
                                            payments.map((payment) => (
                                                <div key={payment.id} className="bg-white border border-gray-100 rounded-xl p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                                                                <FiDollarSign className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900">{payment.amount}</p>
                                                                <p className="text-xs text-gray-500">{payment.method}</p>
                                                            </div>
                                                        </div>
                                                        <span className="px-2 py-1 rounded-lg bg-green-50 text-green-600 text-[10px] font-bold border border-green-100">
                                                            {payment.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                        <div className="flex items-center gap-2">
                                                            <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                                                            <span className="text-xs text-gray-500">{payment.date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <FiFile className="w-3.5 h-3.5 text-gray-400" />
                                                            <span className="text-xs text-gray-500 font-medium">{payment.invoice}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <FaRupeeSign className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <p className="text-sm text-gray-500">No payments recorded yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CP_project_progress;
