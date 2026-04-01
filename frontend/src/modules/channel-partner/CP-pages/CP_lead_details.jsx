import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiMoreVertical, FiPhone, FiMessageCircle, FiMail,
    FiBriefcase, FiUser, FiClock, FiCheck, FiShare2, FiCalendar,
    FiActivity, FiFileText, FiX, FiFolder
} from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import { cpLeadService } from '../CP-services/cpLeadService';
import { useToast } from '../../../contexts/ToastContext';

// --- Components ---

const TimelineItem = ({ item, index, total }) => {
    return (
        <div className="flex gap-4 relative">
            {/* Connector Line */}
            {index !== total - 1 && (
                <div className="absolute left-[19px] top-10 bottom-[-20px] w-0.5 bg-gray-200" />
            )}

            {/* Icon/Dot */}
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center relative z-10 
                ${item.type === 'status' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}
            >
                {item.type === 'status' ? <FiActivity /> : <FiUser />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-gray-900 text-sm">{item.status}</p>
                        <p className="text-xs text-gray-500">Updated by {item.user}</p>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{item.date}</span>
                </div>
                {item.note && (
                    <div className="mt-2 bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm text-gray-600">
                        {item.note}
                    </div>
                )}
            </div>
        </div>
    );
};

const CP_lead_details = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [salesTeamLeads, setSalesTeamLeads] = useState([]);

    const [activeTab, setActiveTab] = useState('timeline');
    const [notes, setNotes] = useState('');
    const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
    const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [isShared, setIsShared] = useState(false);
    const [assignedSalesManager, setAssignedSalesManager] = useState(null);

    // Convert to Client Form State
    const [conversionData, setConversionData] = useState({
        projectName: '',
        categoryId: '',
        totalCost: '',
        finishedDays: '',
        advanceReceived: '',
        includeGST: false,
        description: '',
        screenshot: null
    });
    const [categories, setCategories] = useState([]);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await cpLeadService.getLeadCategories();
                if (response.success) {
                    setCategories(response.data || []);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch lead data
    useEffect(() => {
        const fetchLead = async () => {
            try {
                setLoading(true);
                const response = await cpLeadService.getLeadById(id);
                
                if (response.success && response.data) {
                    const leadData = response.data;
                    
                    // Check if lead is shared (read-only mode)
                    const isLeadShared = leadData.sharedWithSales && leadData.sharedWithSales.length > 0;
                    setIsShared(isLeadShared);
                    
                    // Map backend status to frontend display format
                    const displayStatus = leadData.status === 'converted' ? 'Converted' : 
                        leadData.status === 'lost' ? 'Lost' :
                        leadData.status === 'not_converted' ? 'Lost' :
                        leadData.priority === 'urgent' ? 'Hot' :
                        leadData.status === 'connected' ? 'Connected' :
                        leadData.status === 'followup' ? 'Follow-up' :
                        leadData.status === 'new' ? 'New' : 'Active';

                    // Format phone for display
                    const formatPhone = (phone) => {
                        if (!phone) return '';
                        const clean = phone.replace(/\D/g, '');
                        if (clean.length === 10) {
                            return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
                        }
                        return phone;
                    };

                    // Build timeline from activities
                    const timeline = [];
                    
                    // Add creation activity
                    if (leadData.createdAt) {
                        timeline.push({
                            id: 'created',
                            type: 'created',
                            status: 'New Lead',
                            date: formatTimeAgo(leadData.createdAt),
                            user: 'You',
                            note: 'Lead added manually.'
                        });
                    }

                    // Add activities
                    if (leadData.activities && leadData.activities.length > 0) {
                        leadData.activities.forEach((activity, idx) => {
                            let statusText = '';
                            if (activity.type === 'status_change') {
                                statusText = activity.description || 'Status updated';
                            } else if (activity.type === 'call') {
                                statusText = 'Call made';
                            } else if (activity.type === 'email') {
                                statusText = 'Email sent';
                            } else if (activity.type === 'whatsapp') {
                                statusText = 'WhatsApp message sent';
                            } else if (activity.type === 'note') {
                                statusText = 'Note added';
                            } else if (activity.type === 'shared') {
                                statusText = 'Lead shared';
                            } else {
                                statusText = activity.description || 'Activity';
                            }

                            timeline.push({
                                id: `activity-${idx}`,
                                type: 'status',
                                status: statusText,
                                date: formatTimeAgo(activity.timestamp),
                                user: activity.performedBy?.name || 'You',
                                note: activity.description || ''
                            });
                        });
                    }

                    // Sort timeline by date (newest first)
                    timeline.sort((a, b) => {
                        const getDate = (item) => {
                            if (item.id === 'created') return new Date(leadData.createdAt);
                            const activity = leadData.activities?.find((_, idx) => `activity-${idx}` === item.id);
                            return activity ? new Date(activity.timestamp) : new Date(0);
                        };
                        return getDate(b) - getDate(a);
                    });
                    
                    setLead({
                        id: leadData._id || leadData.id,
                        name: leadData.name || 'Unknown',
                        projectType: leadData.category?.name || 'General',
                        source: leadData.sharedFromSales && leadData.sharedFromSales.length > 0 ? 'sales' : 'self',
                        status: displayStatus.toLowerCase(),
                        phone: formatPhone(leadData.phone),
                        rawPhone: leadData.phone,
                        email: leadData.email || '',
                        createdOn: leadData.createdAt ? new Date(leadData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
                        value: `₹${(leadData.value || 0).toLocaleString('en-IN')}`,
                        timeline: timeline,
                        notes: leadData.notes || '',
                        rawData: leadData
                    });

                    setNotes(leadData.notes || '');
                } else {
                    addToast('Lead not found', 'error');
                    navigate('/cp-leads');
                }
            } catch (error) {
                console.error('Error fetching lead:', error);
                addToast('Failed to load lead details', 'error');
                navigate('/cp-leads');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchLead();
        }
    }, [id, navigate, addToast]);

    // Fetch sales team leads for sharing
    useEffect(() => {
        const fetchSalesLeads = async () => {
            try {
                const response = await cpLeadService.getSalesTeamLeads();
                if (response.success) {
                    setSalesTeamLeads(response.data || []);
                }
            } catch (error) {
                console.error('Error fetching sales team leads:', error);
            }
        };
        fetchSalesLeads();
    }, []);

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

    const formatPhoneForWhatsApp = (phone) => {
        if (!phone) return '';
        const clean = phone.replace(/\D/g, '');
        if (clean.startsWith('91') && clean.length === 12) {
            return clean;
        } else if (clean.length === 10) {
            return `91${clean}`;
        }
        return clean;
    };

    const handleUpdateStatus = async (status) => {
        if (!lead) return;

        try {
            // "Hot" is a priority (urgent), not a status
            if (status === 'Hot') {
                const hotRes = await cpLeadService.updateLead(lead.id, { priority: 'urgent' });
                if (hotRes.success) {
                    addToast('Lead marked as Hot successfully', 'success');
                    setIsUpdateSheetOpen(false);
                    const leadResponse = await cpLeadService.getLeadById(id);
                    if (leadResponse.success && leadResponse.data) {
                        const leadData = leadResponse.data;
                        const displayStatus = leadData.status === 'converted' ? 'Converted' :
                            leadData.status === 'lost' ? 'Lost' :
                            leadData.priority === 'urgent' ? 'Hot' :
                            leadData.status === 'connected' ? 'Connected' : 'Active';
                        setLead(prev => ({
                            ...prev,
                            status: displayStatus.toLowerCase(),
                            rawData: leadData
                        }));
                    }
                } else {
                    addToast('Failed to update status', 'error');
                }
                return;
            }

            // If lead was hot (urgent) and user changes status, clear urgent priority so UI reflects the chosen status
            if (lead.rawData?.priority === 'urgent') {
                try {
                    await cpLeadService.updateLead(lead.id, { priority: 'medium' });
                } catch (err) {
                    // non-blocking
                }
            }

            // Map frontend status to backend status
            const backendStatus = status === 'Connected' ? 'connected' :
                status === 'Converted' ? 'converted' :
                status === 'Lost' ? 'lost' : 'new';

            const response = await cpLeadService.updateLeadStatus(lead.id, backendStatus);
            
            if (response.success) {
                addToast('Status updated successfully', 'success');
                setIsUpdateSheetOpen(false);
                // Reload lead data
                const leadResponse = await cpLeadService.getLeadById(id);
                if (leadResponse.success && leadResponse.data) {
                    // Rebuild lead object (same logic as in useEffect)
                    const leadData = leadResponse.data;
                    const displayStatus = leadData.status === 'converted' ? 'Converted' : 
                        leadData.status === 'lost' ? 'Lost' :
                        leadData.priority === 'urgent' ? 'Hot' :
                        leadData.status === 'connected' ? 'Connected' : 'Active';
                    
                    setLead(prev => ({
                        ...prev,
                        status: displayStatus.toLowerCase()
                    }));
                }
            } else {
                addToast('Failed to update status', 'error');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            addToast('Failed to update status', 'error');
        }
    };

    const [isConfirmShareOpen, setIsConfirmShareOpen] = useState(false);
    const [pendingShareSalesId, setPendingShareSalesId] = useState(null);

    const handleShareClick = (salesId) => {
        // Show confirmation modal first
        setPendingShareSalesId(salesId);
        setIsConfirmShareOpen(true);
    };

    const handleConfirmShare = async () => {
        if (!lead || !pendingShareSalesId) return;

        try {
            const response = await cpLeadService.shareLeadWithSales(lead.id, pendingShareSalesId);
            
            if (response.success) {
                addToast('Lead shared successfully. You now have read-only access.', 'success');
                setIsShareSheetOpen(false);
                setIsConfirmShareOpen(false);
                setPendingShareSalesId(null);
                setIsShared(true);
                // Reload lead data to get updated sharing info
                const leadResponse = await cpLeadService.getLeadById(id);
                if (leadResponse.success && leadResponse.data) {
                    // Update lead with new data
                    const leadData = leadResponse.data;
                    setLead(prev => ({
                        ...prev,
                        rawData: leadData
                    }));
                }
            } else {
                addToast('Failed to share lead', 'error');
            }
        } catch (error) {
            console.error('Error sharing lead:', error);
            addToast('Failed to share lead', 'error');
        } finally {
            setIsConfirmShareOpen(false);
            setPendingShareSalesId(null);
        }
    };

    const handleCancelShare = () => {
        setIsConfirmShareOpen(false);
        setPendingShareSalesId(null);
    };

    const handleSaveNote = async () => {
        if (!lead || isShared) {
            addToast('Cannot save note: Lead is shared and read-only', 'error');
            return;
        }

        try {
            const response = await cpLeadService.updateLead(lead.id, { notes });
            
            if (response.success) {
                addToast('Note saved successfully', 'success');
                setLead(prev => ({ ...prev, notes }));
            } else {
                addToast('Failed to save note', 'error');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            addToast('Failed to save note', 'error');
        }
    };

    const handleConvert = async () => {
        if (!lead || isShared) {
            addToast('Cannot convert: Lead is shared and read-only', 'error');
            return;
        }

        // Validate required fields
        if (!conversionData.projectName.trim()) {
            addToast('Please enter project name', 'error');
            return;
        }
        if (!conversionData.totalCost.trim() || parseFloat(conversionData.totalCost) < 0) {
            addToast('Please enter a valid total cost', 'error');
            return;
        }
        if (!conversionData.projectType.web && !conversionData.projectType.app && !conversionData.projectType.taxi) {
            addToast('Please select at least one project type', 'error');
            return;
        }

        try {
            // Map project type to category
            const projectTypes = [];
            if (conversionData.projectType.web) projectTypes.push('web');
            if (conversionData.projectType.app) projectTypes.push('app');
            if (conversionData.projectType.taxi) projectTypes.push('taxi');

            const conversionPayload = {
                projectName: conversionData.projectName,
                projectType: projectTypes,
                totalCost: parseFloat(conversionData.totalCost),
                finishedDays: conversionData.finishedDays ? parseInt(conversionData.finishedDays) : undefined,
                advanceReceived: conversionData.advanceReceived ? parseFloat(conversionData.advanceReceived) : 0,
                includeGST: conversionData.includeGST,
                description: conversionData.description || ''
            };

            const response = await cpLeadService.convertLeadToClient(lead.id, conversionPayload);
            
            if (response.success) {
                addToast('Lead converted to client successfully', 'success');
                setIsConvertModalOpen(false);
                navigate('/cp-converted');
            } else {
                addToast(response.message || 'Failed to convert lead', 'error');
            }
        } catch (error) {
            console.error('Error converting lead:', error);
            addToast('Failed to convert lead', 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] pb-24 font-sans text-[#1E1E1E]">
                <div className="max-w-md mx-auto px-4 py-6">
                    <div className="animate-pulse space-y-6">
                        <div className="h-16 bg-gray-200 rounded"></div>
                        <div className="h-32 bg-gray-200 rounded-[24px]"></div>
                        <div className="h-24 bg-gray-200 rounded-[24px]"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!lead) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-24 font-sans text-[#1E1E1E]">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-bold text-gray-900 text-lg leading-tight">{lead.name}</h1>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${
                            lead.status === 'hot' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            lead.status === 'connected' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            lead.status === 'converted' ? 'bg-green-50 text-green-600 border-green-100' :
                            lead.status === 'lost' ? 'bg-gray-50 text-gray-500 border-gray-100' :
                            'bg-gray-50 text-gray-600 border-gray-100'
                        }`}>
                            {lead.status !== 'lost' && lead.status !== 'converted' && (
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                    lead.status === 'hot' ? 'bg-orange-500 animate-pulse' :
                                    lead.status === 'connected' ? 'bg-blue-500' :
                                    'bg-gray-500'
                                }`} />
                            )}
                            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </span>
                    </div>
                </div>
                <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                    <FiMoreVertical className="w-5 h-5" />
                </button>
            </div>

            <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8 space-y-8">

                {/* Contact Card */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                    <div className="flex gap-4 mb-6">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                            {lead.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Contact Details</p>
                            <div className="flex flex-col gap-1">
                                <a href={`tel:${lead.rawPhone || lead.phone}`} className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                                    <FiPhone className="w-4 h-4 text-gray-400" /> {lead.phone}
                                </a>
                                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                                    <FiMail className="w-4 h-4 text-gray-400" /> {lead.email}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <a href={`tel:${lead.rawPhone || lead.phone}`} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 text-gray-900 font-semibold text-sm hover:bg-green-50 hover:text-green-700 transition-colors border border-gray-100">
                            <FiPhone className="w-4 h-4" /> Call
                        </a>
                        <a href={`https://wa.me/${formatPhoneForWhatsApp(lead.rawPhone || lead.phone)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-700 font-semibold text-sm hover:bg-green-100 transition-colors border border-green-100">
                            <FiMessageCircle className="w-4 h-4" /> WhatsApp
                        </a>
                    </div>
                </div>

                {/* Project Info */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase">Project Type</p>
                        <div className="flex items-center gap-2 font-semibold text-gray-900">
                            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><FiBriefcase className="w-4 h-4" /></div>
                            {lead.projectType}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase">Budget</p>
                        <div className="flex items-center gap-2 font-semibold text-gray-900">
                            <div className="p-1.5 rounded-lg bg-green-50 text-green-600"><FaRupeeSign className="w-4 h-4" /></div>
                            {lead.value}
                        </div>
                    </div>
                </div>

                {/* Timeline & Notes Tabs */}
                <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}
                        >
                            Activity Timeline
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}
                        >
                            Notes
                        </button>
                    </div>

                    <div className="p-5">
                        {activeTab === 'timeline' ? (
                            <div className="mt-2">
                                {lead.timeline.map((item, index) => (
                                    <TimelineItem key={item.id} item={item} index={index} total={lead.timeline.length} />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add a private note about this lead..."
                                    className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32 text-sm"
                                />
                                <button 
                                    onClick={handleSaveNote}
                                    className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm shadow-lg hover:bg-gray-800 transition-transform active:scale-95"
                                >
                                    Save Note
                                </button>

                                {lead.notes && (
                                    <div className="mt-6">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Saved Notes</p>
                                        <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100 text-sm text-yellow-800">
                                            <p className="mb-2"><strong>You:</strong> {lead.notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>


            {/* Sticky Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 px-4 z-40">
                <div className="max-w-3xl mx-auto">
                    {!isShared ? (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsShareSheetOpen(true)}
                                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-100 text-gray-900 font-bold text-sm hover:bg-gray-200 transition-colors"
                            >
                                <FiShare2 className="w-4 h-4" /> Share Lead
                            </button>
                            <button
                                onClick={() => setIsUpdateSheetOpen(true)}
                                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                            >
                                <FiCheck className="w-4 h-4" /> Update Status
                            </button>
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                            <p className="text-xs font-bold text-amber-800">🔒 Read-Only Mode - Lead is shared with sales manager. You can view progress but cannot modify.</p>
                            {lead.status === 'converted' && lead.rawData?.convertedToClient && (
                                <button
                                    onClick={() => navigate(`/cp-project-progress/${lead.rawData.convertedToClient}`)}
                                    className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                                >
                                    View Project Progress →
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Sheet Overlay */}
            <AnimatePresence>
                {(isShareSheetOpen || isUpdateSheetOpen) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { setIsShareSheetOpen(false); setIsUpdateSheetOpen(false); }}
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
                    />
                )}
            </AnimatePresence>

            {/* Share Sheet */}
            <AnimatePresence>
                {isShareSheetOpen && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 md:max-w-md md:mx-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl shadow-[0_-10px_40px_rgb(0,0,0,0.1)]"
                    >
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />
                        <h3 className="font-bold text-xl text-gray-900 mb-4">Share with Sales Team</h3>
                        <div className="space-y-3">
                            {assignedSalesManager ? (
                                (() => {
                                    const isAlreadyShared = lead.rawData?.sharedWithSales?.some(
                                        s => s.salesId?._id?.toString() === assignedSalesManager._id?.toString() || 
                                             s.salesId?._id?.toString() === assignedSalesManager.id?.toString()
                                    );
                                    
                                    return (
                                        <button 
                                            onClick={() => !isAlreadyShared && handleShareClick(assignedSalesManager._id || assignedSalesManager.id)}
                                            disabled={isAlreadyShared}
                                            className={`w-full text-left p-4 rounded-xl font-medium transition-colors flex justify-between items-center group ${
                                                isAlreadyShared 
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                    : 'bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700'
                                            }`}
                                        >
                                            <div>
                                                <p className="font-semibold">{assignedSalesManager.name}</p>
                                                {assignedSalesManager.email && <p className="text-xs text-gray-500">{assignedSalesManager.email}</p>}
                                            </div>
                                            {isAlreadyShared ? (
                                                <span className="text-sm font-bold text-gray-500">Already Shared</span>
                                            ) : (
                                                <span className="opacity-0 group-hover:opacity-100 text-sm font-bold bg-indigo-200 text-indigo-700 px-2 py-1 rounded">Select</span>
                                            )}
                                        </button>
                                    );
                                })()
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4">No assigned sales manager available</p>
                            )}
                        </div>
                        <button onClick={() => setIsShareSheetOpen(false)} className="w-full mt-4 py-3 font-bold text-gray-500">Cancel</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal for Sharing */}
            <AnimatePresence>
                {isConfirmShareOpen && lead && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCancelShare}
                            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl p-6 z-50 max-w-md w-full mx-4 shadow-xl"
                        >
                            <h3 className="font-bold text-xl text-gray-900 mb-2">Confirm Share Lead</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Are you sure you want to share <span className="font-bold">{lead.name}</span> with your assigned sales manager? 
                                Once shared, you will have read-only access and cannot modify the lead status or notes.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancelShare}
                                    className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmShare}
                                    className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                                >
                                    Confirm Share
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Update Status Sheet */}
            <AnimatePresence>
                {isUpdateSheetOpen && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 md:max-w-md md:mx-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl shadow-[0_-10px_40px_rgb(0,0,0,0.1)]"
                    >
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />
                        <h3 className="font-bold text-xl text-gray-900 mb-4 tracking-tight">Update Lead Status</h3>
                        {isShared && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                                <p className="text-xs font-bold text-amber-800">⚠️ This lead is shared. You cannot update the status.</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            {['Hot', 'Connected', 'Converted', 'Lost'].map((status) => (
                                <button
                                    key={status}
                                    disabled={isShared}
                                    onClick={() => {
                                        if (isShared) return;
                                        if (status === 'Converted') {
                                            setIsUpdateSheetOpen(false);
                                            setIsConvertModalOpen(true);
                                        } else {
                                            handleUpdateStatus(status);
                                        }
                                    }}
                                    className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${isShared ? 'opacity-50 cursor-not-allowed' : ''} ${lead.status.toLowerCase() === status.toLowerCase()
                                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                        : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold">{status}</span>
                                    </div>
                                    {lead.status.toLowerCase() === status.toLowerCase() && <FiCheck className="w-5 h-5 text-indigo-600" />}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setIsUpdateSheetOpen(false)} className="w-full mt-6 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Convert to Client Bottom Sheet */}
            <AnimatePresence>
                {isConvertModalOpen && !isShared && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsConvertModalOpen(false)}
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
                                <h3 className="font-bold text-2xl text-gray-900 tracking-tight">Convert to Client</h3>
                                <button onClick={() => setIsConvertModalOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-4">
                                    {/* Client Name - Pre-filled, Read-only */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Client Name</label>
                                        <div className="relative">
                                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={lead.name}
                                                readOnly
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none text-gray-900 cursor-not-allowed font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Phone Number - Pre-filled, Read-only */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone Number</label>
                                        <div className="relative">
                                            <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={lead.phone}
                                                readOnly
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none text-gray-900 cursor-not-allowed font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Project Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Project Name <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <FiFolder className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={conversionData.projectName}
                                                onChange={(e) => setConversionData({ ...conversionData, projectName: e.target.value })}
                                                placeholder="Project name"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Finished Days */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Finished Days</label>
                                        <div className="relative">
                                            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                value={conversionData.finishedDays}
                                                onChange={(e) => setConversionData({ ...conversionData, finishedDays: e.target.value })}
                                                placeholder="Finished days"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Project Type */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Category <span className="text-red-500">*</span></label>
                                        <select
                                            value={conversionData.categoryId}
                                            onChange={(e) => setConversionData({ ...conversionData, categoryId: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                            required
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map((cat) => (
                                                <option key={cat._id} value={cat._id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Description</label>
                                        <div className="relative">
                                            <FiFileText className="absolute left-4 top-3 text-gray-400" />
                                            <textarea
                                                value={conversionData.description}
                                                onChange={(e) => setConversionData({ ...conversionData, description: e.target.value })}
                                                placeholder="Description"
                                                rows={3}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400 resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Total Cost */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Total Cost <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <FaRupeeSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={conversionData.totalCost}
                                                onChange={(e) => setConversionData({ ...conversionData, totalCost: e.target.value })}
                                                placeholder="Total cost"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Advance Received */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Advance Received</label>
                                        <div className="relative">
                                            <FiCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={conversionData.advanceReceived}
                                                onChange={(e) => setConversionData({ ...conversionData, advanceReceived: e.target.value })}
                                                placeholder="Advance received"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Include GST */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={conversionData.includeGST}
                                                onChange={(e) => setConversionData({ ...conversionData, includeGST: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700 font-medium">Include GST</span>
                                        </label>
                                    </div>

                                    {/* Upload Screenshot */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Upload Screenshot</label>
                                        <div
                                            onClick={() => document.getElementById('screenshot-upload-details').click()}
                                            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                                        >
                                            <input
                                                id="screenshot-upload-details"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setConversionData({ ...conversionData, screenshot: file });
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            {conversionData.screenshot ? (
                                                <div className="text-sm text-gray-700 font-medium">
                                                    {conversionData.screenshot.name}
                                                </div>
                                            ) : (
                                                <div>
                                                    <FiFileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500 font-medium">Click to upload screenshot</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 mt-2 bg-white">
                                    <button
                                        onClick={handleConvert}
                                        className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold text-lg shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95"
                                    >
                                        Convert to Client
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CP_lead_details;
