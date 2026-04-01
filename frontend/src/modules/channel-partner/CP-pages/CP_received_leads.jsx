import { useNavigate } from 'react-router-dom';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiFilter, FiPhone, FiShare2, FiMoreVertical, 
  FiCalendar, FiClock, FiCheck, FiX, FiUser, FiBriefcase, 
  FiDollarSign, FiArrowRight, FiFileText, FiFolder
} from 'react-icons/fi';
import { FaWhatsapp, FaRupeeSign } from 'react-icons/fa';
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

const ReceivedLeadCard = ({ lead, onAction, onNavigate }) => {
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
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${lead.source === 'sales' ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'}`}>
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
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span className="text-xs text-gray-500">
            From: <span className="font-medium text-gray-700">{lead.assignedSales || 'Sales Team'}</span>
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1">
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
          <button 
            onClick={(e) => { e.stopPropagation(); onAction('share', lead); }} 
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <FiShare2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onAction('update', lead); }}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"
        >
          Update Status <FiArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};

// --- Main Page Component ---
const CP_received_leads = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [salesTeamLeads, setSalesTeamLeads] = useState([]);

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

  // Fetch sales team leads for sharing
  useEffect(() => {
    const fetchSalesTeamLeads = async () => {
      try {
        const response = await cpLeadService.getSalesTeamLeads();
        if (response.success) {
          setSalesTeamLeads(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching sales team leads:', error);
      }
    };
    fetchSalesTeamLeads();
  }, []);

  // Fetch received leads from Sales
  useEffect(() => {
    const fetchReceivedLeads = async () => {
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          limit: 20
        };
        if (searchQuery) params.search = searchQuery;

        const response = await cpLeadService.getSharedLeadsFromSales(params);
        if (response.success && response.data) {
          // Transform backend data to frontend format
          const transformedLeads = response.data.map(lead => {
            const sharedFrom = lead.sharedFromSales?.[0];
            return {
              id: lead._id || lead.id,
              name: lead.name || 'Unknown',
              projectType: lead.category?.name || 'General',
              source: 'sales',
              status: lead.status === 'converted' ? 'Converted' : 
                     lead.status === 'lost' ? 'Lost' :
                     lead.priority === 'urgent' ? 'Hot' :
                     lead.status === 'connected' ? 'Connected' :
                     lead.status === 'followup' ? 'Follow-up' :
                     lead.status === 'new' ? 'New' : 'Active',
              lastUpdated: formatTimeAgo(lead.updatedAt || lead.createdAt),
              phone: lead.phone,
              email: lead.email,
              value: `₹${(lead.value || 0).toLocaleString('en-IN')}`,
              assignedSales: sharedFrom?.sharedBy?.name || 'Sales Team Lead',
              sharedOn: sharedFrom?.sharedAt ? new Date(sharedFrom.sharedAt).toLocaleDateString() : '—',
              rawData: lead
            };
          });
          
          setLeads(transformedLeads);
          setTotalPages(response.pages || 1);
        }
      } catch (error) {
        console.error('Error fetching received leads:', error);
        addToast('Failed to load received leads', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchReceivedLeads();
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

  // Modal Interaction States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

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
        (lead.assignedSales && lead.assignedSales.toLowerCase().includes(searchQuery.toLowerCase()));

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

  const handleAction = (type, lead) => {
    setSelectedLead(lead);
    if (type === 'share') setIsShareModalOpen(true);
    if (type === 'update') setIsUpdateModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedLead || !selectedLead.rawData) return;
    
    try {
      // "Hot" is a priority (urgent), not a status
      if (newStatus === 'Hot') {
        const response = await cpLeadService.updateLead(selectedLead.id, { priority: 'urgent' })
        if (response.success) {
          setLeads(prev => prev.map(l =>
            l.id === selectedLead.id
              ? { ...l, status: 'Hot', lastUpdated: 'Just now', rawData: response.data }
              : l
          ))
          addToast('Lead marked as Hot successfully', 'success')
        }
        setIsUpdateModalOpen(false)
        setSelectedLead(null)
        return
      }

      // If lead was hot (urgent) and user changes status, clear urgent priority so UI reflects the chosen status
      if (selectedLead.rawData?.priority === 'urgent') {
        try {
          await cpLeadService.updateLead(selectedLead.id, { priority: 'medium' })
        } catch (err) {
          // non-blocking
        }
      }

      const statusMap = {
        'New': 'new',
        'Connected': 'connected',
        'Follow-up': 'followup',
        'Lost': 'lost',
        'Converted': 'converted'
      };
      
      const backendStatus = statusMap[newStatus] || newStatus.toLowerCase();
      
      if (newStatus === 'Converted') {
        setIsUpdateModalOpen(false);
        setIsConvertModalOpen(true);
      } else {
        const response = await cpLeadService.updateLeadStatus(
          selectedLead.id,
          backendStatus
        );
        
        if (response.success) {
          setLeads(prev => prev.map(l => 
            l.id === selectedLead.id 
              ? { ...l, status: newStatus, lastUpdated: 'Just now', rawData: response.data } 
              : l
          ));
          addToast('Lead status updated successfully', 'success');
        }
        setIsUpdateModalOpen(false);
        setSelectedLead(null);
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      addToast('Failed to update lead status', 'error');
    }
  };

  const handleShareLead = async (salesRepId) => {
    if (!selectedLead) return;
    
    try {
      const response = await cpLeadService.shareLeadWithSales(selectedLead.id, salesRepId);
      
      if (response.success) {
        addToast('Lead shared successfully', 'success');
        setLeads(prev => prev.map(l => 
          l.id === selectedLead.id 
            ? { ...l, sharedWith: 'Sales Team Lead', lastUpdated: 'Just now', rawData: response.data } 
            : l
        ));
        setIsShareModalOpen(false);
        setSelectedLead(null);
      }
    } catch (error) {
      console.error('Error sharing lead:', error);
      addToast('Failed to share lead', 'error');
    }
  };

  const handleConvertToClient = async () => {
    // Validate required fields
    if (!conversionData.projectName.trim()) {
      addToast('Please enter project name', 'error');
      return;
    }
    if (!conversionData.totalCost.trim() || parseFloat(conversionData.totalCost) < 0) {
      addToast('Please enter a valid total cost', 'error');
      return;
    }
    if (!conversionData.categoryId) {
      addToast('Please select a category', 'error');
      return;
    }

    if (!selectedLead) return;

    try {
      const response = await cpLeadService.convertLeadToClient(selectedLead.id, {
        projectName: conversionData.projectName,
        categoryId: conversionData.categoryId,
        totalCost: parseFloat(conversionData.totalCost),
        finishedDays: conversionData.finishedDays ? parseInt(conversionData.finishedDays) : undefined,
        advanceReceived: conversionData.advanceReceived ? parseFloat(conversionData.advanceReceived) : 0,
        includeGST: conversionData.includeGST,
        description: conversionData.description
      });

      if (response.success) {
        addToast('Lead converted to client successfully!', 'success');
        
        setLeads(prev => prev.map(l => 
          l.id === selectedLead.id 
            ? { ...l, status: 'Converted', lastUpdated: 'Just now' } 
            : l
        ));

        setConversionData({
          projectName: '',
          categoryId: '',
          totalCost: '',
          finishedDays: '',
          advanceReceived: '',
          includeGST: false,
          description: '',
          screenshot: null
        });
        setIsConvertModalOpen(false);
        setSelectedLead(null);
        
        navigate('/cp-converted');
      }
    } catch (error) {
      console.error('Error converting lead:', error);
      addToast('Failed to convert lead', 'error');
    }
  };

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

        {/* Leads List */}
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
                  {filteredLeads.map(lead => (
                    <ReceivedLeadCard
                      key={lead.id}
                      lead={lead}
                      onAction={handleAction}
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
                    📥
                  </div>
                  <h3 className="text-gray-900 font-bold mb-1">No received leads found</h3>
                  <p className="text-gray-500 text-sm">Clear filters or wait for sales team to assign leads.</p>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Share Lead Bottom Sheet */}
      <AnimatePresence>
        {isShareModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
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
              <h3 className="font-bold text-xl text-gray-900 mb-4">Share with Sales Team</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {salesTeamLeads.length > 0 ? (
                  salesTeamLeads.map((rep) => (
                    <button 
                      key={rep._id || rep.id} 
                      onClick={() => handleShareLead(rep._id || rep.id)} 
                      className="w-full text-left p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 font-medium transition-colors flex justify-between items-center group"
                    >
                      <div>
                        <p className="font-semibold">{rep.name}</p>
                        {rep.email && <p className="text-xs text-gray-500">{rep.email}</p>}
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 text-sm font-bold bg-indigo-200 text-indigo-700 px-2 py-1 rounded">Select</span>
                    </button>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">No sales team leads available</p>
                )}
              </div>
              <button 
                onClick={() => setIsShareModalOpen(false)} 
                className="w-full mt-4 py-3 font-bold text-gray-500"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Update Status Bottom Sheet */}
      <AnimatePresence>
        {isUpdateModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUpdateModalOpen(false)}
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
              <h3 className="font-bold text-xl text-gray-900 tracking-tight mb-4">Update Status</h3>
              <div className="space-y-2">
                {['Hot', 'Connected', 'Converted', 'Lost'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleUpdateStatus(status)}
                    className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${selectedLead?.status === status
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                      : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{status}</span>
                    </div>
                    {selectedLead?.status === status && <FiCheck className="w-5 h-5 text-indigo-600" />}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="w-full mt-6 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Convert to Client Bottom Sheet */}
      <AnimatePresence>
        {isConvertModalOpen && selectedLead && (
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
                        value={selectedLead.name}
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
                        value={selectedLead.phone}
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
                      onClick={() => document.getElementById('screenshot-upload').click()}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                    >
                      <input
                        id="screenshot-upload"
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
                    onClick={handleConvertToClient}
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

export default CP_received_leads;
