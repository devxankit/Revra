import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiFilter, FiPlus, FiPhone, FiMessageCircle,
  FiShare2, FiMoreVertical, FiCalendar, FiClock, FiCheck,
  FiX, FiUser, FiBriefcase, FiDollarSign, FiArrowRight,
  FiArrowUp, FiArrowDown, FiFileText, FiFolder
} from 'react-icons/fi';
import { FaWhatsapp, FaRupeeSign } from 'react-icons/fa';
import CP_navbar from '../CP-components/CP_navbar';
import { cpLeadService } from '../CP-services/cpLeadService';
import { cpAuthService } from '../CP-services/cpAuthService';
import { useToast } from '../../../contexts/ToastContext';

// --- Mock Data ---
const MOCK_LEADS = [
  {
    id: '1',
    name: 'Sarah Williams',
    projectType: 'E-commerce Website',
    source: 'self',
    status: 'Hot',
    lastUpdated: '2h ago',
    phone: '+1234567890',
    email: 'sarah@example.com',
    value: '₹5,000'
  },
  {
    id: '2',
    name: 'TechSolutions Inc',
    projectType: 'Mobile App',
    source: 'sales',
    status: 'Connected',
    lastUpdated: '1d ago',
    phone: '+1987654321',
    email: 'contact@techsolutions.com',
    value: '₹12,000',
    assignedSales: 'Alex Johnson'
  },
  {
    id: '3',
    name: 'David Brown',
    projectType: 'Portfolio',
    source: 'self',
    status: 'Follow-up',
    lastUpdated: '30m ago',
    phone: '+1122334455',
    email: 'david@example.com',
    value: '₹2,500'
  },
  {
    id: '4',
    name: 'Green Energy Co',
    projectType: 'CRM System',
    source: 'shared',
    status: 'Shared',
    lastUpdated: '3d ago',
    phone: '+1555666777',
    email: 'info@greenenergy.com',
    value: '₹20,000',
    assignedSales: 'Maria Garcia',
    sharedWith: 'Maria Garcia'
  },
  {
    id: '5',
    name: 'Local Bistro',
    projectType: 'Landing Page',
    source: 'self',
    status: 'Converted',
    lastUpdated: '1w ago',
    phone: '+1444333222',
    email: 'bistro@local.com',
    value: '₹1,500'
  },
  {
    id: '6',
    name: 'Startup Hub',
    projectType: 'SaaS Platform',
    source: 'sales',
    status: 'Lost',
    lastUpdated: '2w ago',
    phone: '+1999888777',
    email: 'hello@startuphub.com',
    value: '₹15,000',
    assignedSales: 'Alex Johnson'
  }
];


// --- Components ---

const StatusBadge = ({ status }) => {
  const styles = {
    'Hot': 'bg-red-50 text-red-600 border-red-100',
    'Connected': 'bg-blue-50 text-blue-600 border-blue-100',
    'Converted': 'bg-green-50 text-green-600 border-green-100',
    'Shared': 'bg-purple-50 text-purple-600 border-purple-100',
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

const LeadCard = ({ lead, onAction, onNavigate }) => {
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
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${lead.source === 'self' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-gradient-to-br from-orange-400 to-red-500 text-white'}`}>
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
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          <span className="text-xs text-gray-500">
            Source: <span className="font-medium text-gray-700">{lead.source === 'self' ? 'My Lead' : 'Sales Team'}</span>
          </span>
        </div>
      </div>

      {/* Action Footer - Minimalist */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-1">
          <a href={`tel:${lead.phone}`} className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
            <FiPhone className="w-4 h-4" />
          </a>
          <a href={`https://wa.me/${lead.phone}`} className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
            <FaWhatsapp className="w-4 h-4" />
          </a>
          <button onClick={(e) => { e.stopPropagation(); onAction('share', lead); }} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
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

const CP_leads = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [salesTeamLeads, setSalesTeamLeads] = useState([]);

  // Initialize state from location if available, otherwise default
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'all');
  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);

  const [timeFilter, setTimeFilter] = useState('all-time'); // all-time, yesterday, this-week, last-30-days
  const [showFilters, setShowFilters] = useState(false);

  // Modal Interaction States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false); // Bottom Sheet State
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

  // New Lead Form State
  const [newLead, setNewLead] = useState({
    name: '',
    businessName: '',
    phone: '',
    email: '',
    category: '',
    budget: '',
    priority: 'Medium',
    notes: ''
  });

  // Fetch leads from API
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          limit: 20
        };
        
        // Map activeTab to status filter
        if (activeTab !== 'all') {
          if (activeTab === 'converted') params.status = 'converted';
          else if (activeTab === 'lost') params.status = 'lost';
          else if (activeTab === 'hot') params.priority = 'urgent';
          else if (activeTab === 'active') {
            // Active means not converted and not lost
            params.excludeStatus = 'converted,lost';
          }
        }
        
        if (searchQuery) params.search = searchQuery;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (priorityFilter !== 'all') params.priority = priorityFilter;
        if (categoryFilter !== 'all') params.category = categoryFilter;

        const response = await cpLeadService.getLeads(params);
        if (response.success && response.data) {
          // Transform backend data to frontend format
          const transformedLeads = response.data.map(lead => ({
            id: lead._id || lead.id,
            name: lead.name || 'Unknown',
            projectType: lead.category?.name || 'General',
            source: lead.sharedFromSales && lead.sharedFromSales.length > 0 ? 'sales' : 'self',
            status: lead.status === 'converted' ? 'Converted' : 
                   lead.status === 'lost' ? 'Lost' :
                   lead.status === 'not_converted' ? 'Lost' :
                   lead.priority === 'urgent' ? 'Hot' :
                   lead.status === 'connected' ? 'Connected' :
                   lead.status === 'followup' ? 'Follow-up' :
                   lead.status === 'new' ? 'New' : 'Active',
            lastUpdated: formatTimeAgo(lead.updatedAt || lead.createdAt),
            phone: lead.phone,
            email: lead.email,
            value: `₹${(lead.value || 0).toLocaleString('en-IN')}`,
            assignedSales: lead.sharedFromSales?.[0]?.sharedBy?.name,
            sharedWith: lead.sharedWithSales?.map(s => s.salesId?.name).join(', '),
            category: lead.category,
            priority: lead.priority,
            rawData: lead // Keep raw data for API calls
          }));
          
          setLeads(transformedLeads);
          setTotalPages(response.pages || 1);
          setTotalLeads(response.total || 0);
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
        addToast('Failed to load leads', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [currentPage, activeTab, searchQuery, statusFilter, priorityFilter, categoryFilter, addToast]);

  const [assignedSalesManager, setAssignedSalesManager] = useState(null);
  const [isConfirmShareOpen, setIsConfirmShareOpen] = useState(false);
  const [pendingShareSalesId, setPendingShareSalesId] = useState(null);
  const [sharedLeadsCount, setSharedLeadsCount] = useState(0);
  const [receivedLeadsCount, setReceivedLeadsCount] = useState(0);

  // Fetch categories, assigned sales manager, and counts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [categoriesRes, salesManagerRes, sharedLeadsRes, receivedLeadsRes] = await Promise.all([
          cpLeadService.getLeadCategories(),
          cpLeadService.getSalesManagerDetails(),
          cpLeadService.getSharedLeadsWithSales({ page: 1, limit: 1 }), // Just get count
          cpLeadService.getSharedLeadsFromSales({ page: 1, limit: 1 }) // Just get count
        ]);
        
        if (categoriesRes.success) setCategories(categoriesRes.data || []);
        if (salesManagerRes.success && salesManagerRes.data) {
          // Only show assigned sales manager in share modal
          setAssignedSalesManager(salesManagerRes.data);
          setSalesTeamLeads(salesManagerRes.data ? [salesManagerRes.data] : []);
        }
        if (sharedLeadsRes.success) {
          setSharedLeadsCount(sharedLeadsRes.total || 0);
        }
        if (receivedLeadsRes.success) {
          setReceivedLeadsCount(receivedLeadsRes.total || 0);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
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

  // Counts are now fetched from backend API (see useEffect above)

  // Filter leads (already filtered by backend, but can add client-side filtering if needed)
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Only show own leads (not shared with sales, not received from sales)
      // Backend should handle this, but add client-side check
      if (activeTab === 'my-leads') {
        return lead.source === 'self' && !lead.sharedWith;
      }
      return true;
    });
  }, [leads, activeTab]);

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
          // non-blocking: status update can still proceed
        }
      }

      // Map frontend status to backend status
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
          // Update local state
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
    if (!conversionData.projectType.web && !conversionData.projectType.app && !conversionData.projectType.taxi) {
      addToast('Please select at least one project type', 'error');
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
        
        // Update local state
        setLeads(prev => prev.map(l => 
          l.id === selectedLead.id 
            ? { ...l, status: 'Converted', lastUpdated: 'Just now' } 
            : l
        ));

        // Reset form and close modal
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
        
        // Navigate to converted clients page
        navigate('/cp-converted');
      }
    } catch (error) {
      console.error('Error converting lead:', error);
      addToast('Failed to convert lead', 'error');
    }
  };

  const handleShareLeadClick = (salesRepId) => {
    // Show confirmation modal first
    setPendingShareSalesId(salesRepId);
    setIsConfirmShareOpen(true);
  };

  const handleConfirmShare = async () => {
    if (!selectedLead || !pendingShareSalesId) return;
    
    try {
      const response = await cpLeadService.shareLeadWithSales(selectedLead.id, pendingShareSalesId);
      
      if (response.success) {
        addToast('Lead shared successfully', 'success');
        
        // Remove lead from current list (it will now appear in shared leads page)
        setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
        
        // Update shared leads count
        setSharedLeadsCount(prev => prev + 1);
        
        setIsShareModalOpen(false);
        setIsConfirmShareOpen(false);
        setSelectedLead(null);
        setPendingShareSalesId(null);
      }
    } catch (error) {
      console.error('Error sharing lead:', error);
      addToast('Failed to share lead', 'error');
      setIsConfirmShareOpen(false);
      setPendingShareSalesId(null);
    }
  };

  const handleCancelShare = () => {
    setIsConfirmShareOpen(false);
    setPendingShareSalesId(null);
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone) {
      addToast('Name and phone number are required', 'error');
      return;
    }

    // Get selected category
    const selectedCategory = categories.find(cat => 
      (cat._id || cat.id) === newLead.category
    );

    if (!selectedCategory) {
      addToast('Please select a category', 'error');
      return;
    }

    try {
      // Map priority
      const priorityMap = {
        'Low': 'low',
        'Medium': 'medium',
        'High': 'high',
        'Urgent': 'urgent'
      };

      const leadData = {
        name: newLead.name,
        phone: newLead.phone.replace(/\D/g, ''), // Remove non-digits
        email: newLead.email || undefined,
        company: newLead.businessName || undefined,
        category: selectedCategory._id || selectedCategory.id,
        priority: priorityMap[newLead.priority] || 'medium',
        value: newLead.budget ? parseFloat(newLead.budget) : 0,
        notes: newLead.notes || undefined
      };

      const response = await cpLeadService.createLead(leadData);
      
      if (response.success && response.data) {
        addToast('Lead created successfully', 'success');
        
        // Add new lead to list
        const newLeadFormatted = {
          id: response.data._id || response.data.id,
          name: response.data.name || newLead.name,
          projectType: response.data.category?.name || selectedCategory.name,
          source: 'self',
          status: response.data.priority === 'urgent' ? 'Hot' : 'New',
          lastUpdated: 'Just now',
          phone: response.data.phone,
          email: response.data.email,
          value: newLead.budget ? `₹${parseFloat(newLead.budget).toLocaleString('en-IN')}` : '₹0',
          rawData: response.data
        };
        
        setLeads([newLeadFormatted, ...leads]);
        setIsAddSheetOpen(false);
        setNewLead({
          name: '',
          businessName: '',
          phone: '',
          email: '',
          category: '',
          budget: '',
          priority: 'Medium',
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      addToast(error.message || 'Failed to create lead', 'error');
    }
  };

  // Calculate own leads (for tabs count)
  const ownLeads = useMemo(() => {
    return leads.filter(lead => {
      return lead.source === 'self' && 
             lead.status !== 'Shared' && 
             !lead.sharedWith && 
             lead.source !== 'sales' && 
             !lead.assignedSales;
    });
  }, [leads]);

  const TABS = [
    { id: 'all', label: 'All', count: ownLeads.length },
    { id: 'my-leads', label: 'My Leads', count: ownLeads.filter(l => l.source === 'self').length },
    { id: 'hot', label: 'Hot', count: ownLeads.filter(l => l.status === 'Hot').length },
    { id: 'active', label: 'Active', count: ownLeads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length },
    { id: 'converted', label: 'Converted', count: ownLeads.filter(l => l.status === 'Converted').length },
    { id: 'lost', label: 'Lost', count: ownLeads.filter(l => l.status === 'Lost').length },
  ];

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
            placeholder="Search by name or project..."
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

        {/* Shared & Received Leads Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate('/cp-shared-leads')}
            className="bg-purple-50 rounded-[24px] p-4 shadow-sm border border-purple-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <FiArrowUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{sharedLeadsCount}</p>
              </div>
            </div>
            <p className="text-xs text-gray-900 font-semibold">Shared Leads</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/cp-received-leads')}
            className="bg-blue-50 rounded-[24px] p-4 shadow-sm border border-blue-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <FiArrowDown className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{receivedLeadsCount}</p>
              </div>
            </div>
            <p className="text-xs text-gray-900 font-semibold">Received Leads</p>
          </motion.div>
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
                    <LeadCard
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
                    📪
                  </div>
                  <h3 className="text-gray-900 font-bold mb-1">No leads found</h3>
                  <p className="text-gray-500 text-sm">Clear filters or create a new lead.</p>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Sheet Overlay */}
      <AnimatePresence>
        {isAddSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAddSheetOpen(false)}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet Content */}
      <AnimatePresence>
        {isAddSheetOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 md:max-w-2xl md:mx-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl shadow-[0_-10px_40px_rgb(0,0,0,0.1)] max-h-[90vh] flex flex-col"
          >
            {/* Drag Handle for mobile vibe */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />

            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-2xl text-gray-900 tracking-tight">New Lead</h3>
              <button onClick={() => setIsAddSheetOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500"><FiX /></button>
            </div>

            <form onSubmit={handleAddLead} className="flex flex-col h-full overflow-hidden">
              <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-4">

                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Contact Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text" required
                        value={newLead.name}
                        onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Business Name</label>
                    <div className="relative">
                      <FiBriefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={newLead.businessName}
                        onChange={e => setNewLead({ ...newLead, businessName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400"
                        placeholder="e.g. Acme Corp"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel" required
                        value={newLead.phone}
                        onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
                    <div className="relative">
                      <FiMessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={newLead.email}
                        onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Category <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={newLead.category || ''}
                      onChange={e => setNewLead({ ...newLead, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium appearance-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat._id || cat.id} value={cat._id || cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Budget Range</label>
                    <div className="relative">
                      <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={newLead.budget}
                        onChange={e => setNewLead({ ...newLead, budget: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400"
                        placeholder="e.g. 5,000 - 10,000"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Priority</label>
                  <div className="flex gap-2">
                    {['High', 'Medium', 'Low'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewLead({ ...newLead, priority: p })}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${newLead.priority === p
                          ? (p === 'High' ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : p === 'Medium' ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm' : 'bg-green-50 border-green-200 text-green-600 shadow-sm')
                          : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Notes / Requirements</label>
                  <textarea
                    rows="3"
                    value={newLead.notes}
                    onChange={e => setNewLead({ ...newLead, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium placeholder-gray-400 resize-none"
                    placeholder="Enter any specific requirements or details..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 mt-2 bg-white">
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold text-lg shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95"
                >
                  Create New Lead
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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
                {assignedSalesManager ? (
                  <button 
                    onClick={() => handleShareLeadClick(assignedSalesManager._id || assignedSalesManager.id)} 
                    className="w-full text-left p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 font-medium transition-colors flex justify-between items-center group"
                  >
                    <div>
                      <p className="font-semibold">{assignedSalesManager.name}</p>
                      {assignedSalesManager.email && <p className="text-xs text-gray-500">{assignedSalesManager.email}</p>}
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 text-sm font-bold bg-indigo-200 text-indigo-700 px-2 py-1 rounded">Select</span>
                  </button>
                ) : (
                  <p className="text-center text-gray-500 py-4">No assigned sales manager available</p>
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

      {/* Confirmation Modal for Sharing */}
      <AnimatePresence>
        {isConfirmShareOpen && selectedLead && (
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
                Are you sure you want to share <span className="font-bold">{selectedLead.name}</span> with your assigned sales manager? 
                Once shared, you will have read-only access and cannot modify the lead status.
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

                  {/* Category */}
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

      {/* Premium FAB - Positioned higher to clear nav */}
      <motion.button
        onClick={() => setIsAddSheetOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-5 md:bottom-10 md:right-10 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center z-40 transition-all font-semibold"
      >
        <FiPlus className="w-6 h-6" />
      </motion.button>

      {/* ... Other Modals (Update/Share) can reuse the bottom sheet style or stay as modals ... */}
    </div>
  );
};

export default CP_leads;
