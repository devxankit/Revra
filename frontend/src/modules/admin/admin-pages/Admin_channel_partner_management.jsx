import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import CloudinaryUpload from '../../../components/ui/cloudinary-upload'
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  Phone,
  Mail,
  Calendar,
  Building2,
  TrendingUp,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Handshake,
  Award,
  FileText,
  UserCheck,
  Target,
  Clock,
  Download,
  Share2,
  Plus,
  BarChart3,
  PieChart,
  Wallet as WalletIcon,
  ArrowRight,
  ArrowLeft,
  MoreVertical,
  ChevronRight,
  Globe,
  Smartphone,
  ShoppingCart,
  Database,
  Shield,
  ChevronDown,
  Check,
  Percent,
  Settings
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import Loading from '../../../components/ui/loading'
import { adminChannelPartnerService, adminQuotationService } from '../admin-services'
import adminSalesService from '../admin-services/adminSalesService'
import { useToast } from '../../../contexts/ToastContext'

// Custom Searchable Dropdown Component
const SearchableDropdown = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select an option...",
  getOptionLabel = (option) => option?.label || option?.name || String(option),
  getOptionValue = (option) => option?.value || option?.id || option?._id || option,
  className = "",
  disabled = false,
  maxHeight = "max-h-60"
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)

  const filteredOptions = options.filter(option => {
    const label = getOptionLabel(option)
    return label && label.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const selectedOption = options.find(option => {
    const optionValue = getOptionValue(option)
    return optionValue === value || String(optionValue) === String(value)
  })

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (option) => {
    const optionValue = getOptionValue(option)
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 border border-gray-300 rounded-lg 
          bg-white text-left text-sm
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50
          flex items-center justify-between
          transition-all duration-200
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-400'}
        `}
      >
        <span className={`truncate ${!selectedOption ? 'text-gray-500' : 'text-gray-900'}`}>
          {selectedOption ? getOptionLabel(selectedOption) : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full left-0 right-0 z-50 mt-2 ${maxHeight} overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl`}
          >
            {/* Search Input */}
            <div className="border-b border-gray-100 p-3 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Scrollable Options List */}
            <div className="overflow-y-auto max-h-[240px]">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const optionValue = getOptionValue(option)
                  const optionLabel = getOptionLabel(option)
                  const isSelected = optionValue === value || String(optionValue) === String(value)
                  
                  return (
                    <motion.button
                      key={optionValue || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`
                        w-full px-4 py-3 text-left text-sm
                        transition-colors duration-150
                        flex items-center justify-between
                        ${isSelected 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-900'
                        }
                        border-b border-gray-100 last:border-b-0
                      `}
                    >
                      <span className="truncate flex-1">{optionLabel}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                      )}
                    </motion.button>
                  )
                })
              ) : (
                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                  {searchTerm ? 'No results found' : 'No options available'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const Admin_channel_partner_management = () => {
  const [loading, setLoading] = useState(true)
  const [partnersLoading, setPartnersLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('partners') // Changed from 'all' to 'partners'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  // Section-specific states
  const [leadsPage, setLeadsPage] = useState(1)
  const [leadsPerPage, setLeadsPerPage] = useState(20)
  const [walletPage, setWalletPage] = useState(1)
  const [walletPerPage, setWalletPerPage] = useState(20)
  const [rewardsPage, setRewardsPage] = useState(1)
  const [rewardsPerPage, setRewardsPerPage] = useState(20)
  const [convertedPage, setConvertedPage] = useState(1)
  const [convertedPerPage, setConvertedPerPage] = useState(20)
  const [quotationsPage, setQuotationsPage] = useState(1)
  const [quotationsPerPage, setQuotationsPerPage] = useState(20)
  const [teamPage, setTeamPage] = useState(1)
  const [teamPerPage, setTeamPerPage] = useState(20)
  
  // Pagination helper function
  const PaginationComponent = ({ currentPage, totalPages, itemsPerPage, totalItems, onPageChange, onItemsPerPageChange, itemsPerPageOptions = [20, 50, 100], alwaysShow = false }) => {
    if (totalPages <= 1 && !alwaysShow) return null
    
    return (
      <div className="mt-4 lg:mt-6 flex flex-col gap-3 lg:gap-4 pt-4 lg:pt-6 border-t border-gray-200">
        <div className="text-xs lg:text-sm text-gray-600 text-center lg:text-left">
          Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-semibold">{totalItems}</span> items
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-start">
            <span className="text-xs lg:text-sm text-gray-600">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value))
                onPageChange(1)
              }}
              className="px-2 lg:px-3 py-1.5 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ‹
            </button>
            <span className="px-2 lg:px-3 py-1 text-xs lg:text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // Leads section states
  const [selectedCPFilter, setSelectedCPFilter] = useState('all')
  const [leadStatusFilter, setLeadStatusFilter] = useState('all')
  const [showAssignLeadModal, setShowAssignLeadModal] = useState(false)
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false)
  const [showLeadsListModal, setShowLeadsListModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [selectedCPForLeads, setSelectedCPForLeads] = useState(null)
  const [selectedStatusForLeads, setSelectedStatusForLeads] = useState(null)
  const [leadsBreakdownData, setLeadsBreakdownData] = useState([])
  const [leadsBreakdownLoading, setLeadsBreakdownLoading] = useState(false)
  const [leadsBreakdownPage, setLeadsBreakdownPage] = useState(1)
  const [leadsBreakdownPerPage, setLeadsBreakdownPerPage] = useState(10)
  
  // Wallet section states
  const [selectedCPWallet, setSelectedCPWallet] = useState('all')
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all')
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [walletData, setWalletData] = useState([])
  const [walletLoading, setWalletLoading] = useState(false)
  
  // Rewards section states
  const [showAssignRewardModal, setShowAssignRewardModal] = useState(false)
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [showRewardDetailsModal, setShowRewardDetailsModal] = useState(false)
  const [showEditRewardModal, setShowEditRewardModal] = useState(false)
  const [showDeleteRewardModal, setShowDeleteRewardModal] = useState(false)
  const [selectedReward, setSelectedReward] = useState(null)
  const [rewardsData, setRewardsData] = useState([])
  const [rewardsLoading, setRewardsLoading] = useState(false)
  const [rewardStatistics, setRewardStatistics] = useState({
    totalRewards: 0,
    activeRewards: 0,
    totalDistributed: 0,
    totalAmountDistributed: 0
  })
  const [rewardFormData, setRewardFormData] = useState({
    name: '',
    description: '',
    level: '',
    requirement: {
      type: 'conversions',
      value: '',
      description: ''
    },
    rewardAmount: '',
    order: 0,
    isActive: true
  })
  
  // Converted section states
  const [showConvertedClientModal, setShowConvertedClientModal] = useState(false)
  const [selectedConvertedClient, setSelectedConvertedClient] = useState(null)
  
  // Team Lead Assignment section states
  const [showAssignTeamLeadModal, setShowAssignTeamLeadModal] = useState(false)
  const [selectedCPForTeamLead, setSelectedCPForTeamLead] = useState(null)
  const [salesTeamLeads, setSalesTeamLeads] = useState([])
  const [teamLeadAssignments, setTeamLeadAssignments] = useState([])
  const [loadingTeamLeads, setLoadingTeamLeads] = useState(false)
  const [selectedTeamLeadId, setSelectedTeamLeadId] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    partnerId: '',
    status: 'active',
    dateOfBirth: '',
    gender: '',
    joiningDate: '',
    document: null,
    companyName: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      zipCode: ''
    }
  })

  // Statistics data
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalRevenue: 0,
    totalLeads: 0,
    totalConversions: 0,
    avgCommission: 0
  })
  
  // Mock data for development (will be replaced with API calls later)
  const [mockLeads] = useState([
    { id: '1', name: 'Sarah Williams', cpName: 'Rajesh Kumar', cpId: 'cp1', cpPhone: '+91 98765 43210', projectType: 'E-commerce Website', status: 'Hot', value: '₹5,000', createdDate: '2024-01-15', lastUpdated: '2024-01-20', phone: '+1234567890', email: 'sarah@example.com', assignedSalesLead: 'Rahul Sharma', budget: '₹5,000', notes: 'Interested in e-commerce platform with payment gateway integration' },
    { id: '2', name: 'TechSolutions Inc', cpName: 'Priya Sharma', cpId: 'cp2', cpPhone: '+91 98765 11111', projectType: 'Mobile App', status: 'Connected', value: '₹12,000', createdDate: '2024-01-10', lastUpdated: '2024-01-19', phone: '+1987654321', email: 'contact@techsolutions.com', assignedSalesLead: 'Rahul Sharma', budget: '₹12,000', notes: 'Need iOS and Android app development' },
    { id: '4', name: 'Green Energy Co', cpName: 'Amit Patel', cpId: 'cp3', cpPhone: '+91 98765 22222', projectType: 'CRM System', status: 'Converted', value: '₹20,000', createdDate: '2024-01-05', lastUpdated: '2024-01-15', phone: '+1555666777', email: 'info@greenenergy.com', assignedSalesLead: null, budget: '₹20,000', notes: 'Converted to client. Project in progress.' },
    { id: '5', name: 'Local Bistro', cpName: 'Priya Sharma', cpId: 'cp2', cpPhone: '+91 98765 11111', projectType: 'Landing Page', status: 'Lost', value: '₹1,500', createdDate: '2024-01-08', lastUpdated: '2024-01-12', phone: '+1444333222', email: 'bistro@local.com', assignedSalesLead: 'Rahul Sharma', budget: '₹1,500', notes: 'Client chose another vendor' },
    { id: '6', name: 'Digital Marketing Pro', cpName: 'Rajesh Kumar', cpId: 'cp1', cpPhone: '+91 98765 43210', projectType: 'Website Redesign', status: 'Hot', value: '₹8,500', createdDate: '2024-01-22', lastUpdated: '2024-01-22', phone: '+1999888777', email: 'contact@digitalmarketingpro.com', assignedSalesLead: 'Rahul Sharma', budget: '₹8,500', notes: 'Urgent requirement for website redesign' }
  ])
  
  const [mockTransactions] = useState([
    { id: 't1', cpName: 'Rajesh Kumar', cpId: 'cp1', type: 'Commission', amount: 500, status: 'Completed', date: '2024-01-20', description: 'Commission - TechSolutions' },
    { id: 't2', cpName: 'Priya Sharma', cpId: 'cp2', type: 'Reward', amount: 150, status: 'Completed', date: '2024-01-19', description: 'Reward - Silver Badge' },
    { id: 't3', cpName: 'Amit Patel', cpId: 'cp3', type: 'Salary', amount: 10000, status: 'Completed', date: '2024-01-18', description: 'Monthly Salary' },
    { id: 't4', cpName: 'Rajesh Kumar', cpId: 'cp1', type: 'Commission', amount: 350, status: 'Pending', date: '2024-01-20', description: 'Commission - Green Energy' }
  ])
  
  const [mockRewards] = useState([
    { id: 'r1', cpName: 'Rajesh Kumar', cpId: 'cp1', type: 'Milestone', amount: 500, date: '2024-01-15', status: 'Credited', milestone: 'First Sale' },
    { id: 'r2', cpName: 'Priya Sharma', cpId: 'cp2', type: 'Bonus', amount: 1000, date: '2024-01-10', status: 'Credited', milestone: null },
    { id: 'r3', cpName: 'Amit Patel', cpId: 'cp3', type: 'Milestone', amount: 350, date: '2024-01-08', status: 'Pending', milestone: 'Rising Star' }
  ])
  
  const [mockConverted] = useState([
    { id: 'c1', clientName: 'Global Tech Solutions', cpName: 'Rajesh Kumar', cpId: 'cp1', projectType: 'Mobile App Development', status: 'In Progress', progress: 45, totalValue: 12000, paidAmount: 5000, pendingAmount: 7000, paymentStatus: 'Partial Paid', commissionEarned: 1200, commissionStatus: 'Credited' },
    { id: 'c2', clientName: 'Urban Cafe Chain', cpName: 'Priya Sharma', cpId: 'cp2', projectType: 'Website Redesign', status: 'Completed', progress: 100, totalValue: 3500, paidAmount: 3500, pendingAmount: 0, paymentStatus: 'Fully Paid', commissionEarned: 350, commissionStatus: 'Credited' },
    { id: 'c3', clientName: 'Nexus Logistics', cpName: 'Amit Patel', cpId: 'cp3', projectType: 'CRM Implementation', status: 'Planning', progress: 10, totalValue: 25000, paidAmount: 0, pendingAmount: 25000, paymentStatus: 'Payment Pending', commissionEarned: 2500, commissionStatus: 'Pending' }
  ])
  
  // Quotations section states
  const [quotations, setQuotations] = useState([])
  const [quotationsTotal, setQuotationsTotal] = useState(0)
  const [quotationsLoading, setQuotationsLoading] = useState(false)
  const [quotationStatistics, setQuotationStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalShared: 0,
    categoryCounts: {}
  })
  const [quotationSearchTerm, setQuotationSearchTerm] = useState('')
  const [quotationStatusFilter, setQuotationStatusFilter] = useState('all')
  // Removed category filter since categories are now dynamic
  const [showQuotationModal, setShowQuotationModal] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState(null)
  const [quotationFormData, setQuotationFormData] = useState({
    title: '',
    category: '',
    description: '',
    price: '',
    currency: 'INR',
    status: 'active',
    pdfDocument: null
  })
  
  // Commission settings states
  const [commissionSettings, setCommissionSettings] = useState({
    ownConversionCommission: 30,
    sharedConversionCommission: 10
  })
  const [commissionSettingsLoading, setCommissionSettingsLoading] = useState(false)
  const [commissionSettingsSaving, setCommissionSettingsSaving] = useState(false)
  const [commissionSettingsError, setCommissionSettingsError] = useState(null)
  const [commissionLastUpdated, setCommissionLastUpdated] = useState(null)
  const [commissionUpdatedBy, setCommissionUpdatedBy] = useState(null)
  const [isEditingCommission, setIsEditingCommission] = useState(false)
  const [commissionFormData, setCommissionFormData] = useState({
    ownConversionCommission: 30,
    sharedConversionCommission: 10
  })
  
  // Team lead assignments - will be loaded from API or initialized from partners
  // Format: { cpId, cpName, salesTeamLeadId, salesTeamLeadName, assignedDate }
  
  const [mockMilestones] = useState([
    { id: 'm1', title: 'First Sale', requirement: '1 Conversion', reward: 150, status: 'active' },
    { id: 'm2', title: 'Rising Star', requirement: '5 Conversions', reward: 350, status: 'active' },
    { id: 'm3', title: 'Pro Partner', requirement: '10 Conversions', reward: 1000, status: 'active' },
    { id: 'm4', title: 'Elite Club', requirement: '25 Conversions', reward: 3000, status: 'active' }
  ])

  // Partners data
  const [partners, setPartners] = useState([])
  const [totalPartners, setTotalPartners] = useState(0)
  const { addToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  // Reload partners when filters change
  useEffect(() => {
    if (!loading) {
      loadPartnersOnly()
    }
  }, [selectedFilter, searchTerm, currentPage, itemsPerPage])

  // Update selectedFilter when activeTab changes (only for partners tab)
  useEffect(() => {
    if (activeTab === 'partners') {
      if (selectedFilter !== 'all' && selectedFilter !== 'active' && selectedFilter !== 'inactive') {
        setSelectedFilter('all')
      }
    }
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const [partnersResponse, statisticsResponse] = await Promise.all([
        adminChannelPartnerService.getAllChannelPartners({
          status: selectedFilter !== 'all' ? selectedFilter : undefined,
          search: searchTerm || undefined,
          page: currentPage,
          limit: itemsPerPage
        }),
        adminChannelPartnerService.getChannelPartnerStatistics()
      ])

      const formattedPartners = partnersResponse.data.map(partner => 
        adminChannelPartnerService.formatChannelPartnerForDisplay(partner)
      )
      
      setPartners(formattedPartners)
      setTotalPartners(partnersResponse.total || 0)
      setStatistics(statisticsResponse.data)
      setCurrentPage(partnersResponse.page || 1)
    } catch (error) {
      console.error('Error loading data:', error)
      addToast({ type: 'error', message: 'Failed to load channel partner data' })
    } finally {
      setLoading(false)
    }
  }

  const loadPartnersOnly = async () => {
    setPartnersLoading(true)
    try {
      const partnersResponse = await adminChannelPartnerService.getAllChannelPartners({
        status: selectedFilter !== 'all' ? selectedFilter : undefined,
        search: searchTerm || undefined,
        page: currentPage,
        limit: itemsPerPage
      })

      const formattedPartners = partnersResponse.data.map(partner => 
        adminChannelPartnerService.formatChannelPartnerForDisplay(partner)
      )
      
      setPartners(formattedPartners)
      setTotalPartners(partnersResponse.total || 0)
      setCurrentPage(partnersResponse.page || 1)
    } catch (error) {
      console.error('Error loading partners:', error)
      addToast({ type: 'error', message: 'Failed to load channel partner data' })
    } finally {
      setPartnersLoading(false)
    }
  }

  const loadWalletData = async () => {
    setWalletLoading(true)
    try {
      const response = await adminChannelPartnerService.getAllChannelPartnerWallets({
        page: walletPage,
        limit: walletPerPage,
        search: searchTerm || undefined
      })
      setWalletData(response.data || [])
    } catch (error) {
      console.error('Error loading wallet data:', error)
      addToast({ type: 'error', message: 'Failed to load wallet data' })
    } finally {
      setWalletLoading(false)
    }
  }

  const loadRewardsData = async () => {
    setRewardsLoading(true)
    try {
      const [rewardsResponse, statisticsResponse] = await Promise.all([
        adminChannelPartnerService.getAllCPRewards({
          page: rewardsPage,
          limit: rewardsPerPage
        }),
        adminChannelPartnerService.getCPRewardStatistics()
      ])
      setRewardsData(rewardsResponse.data || [])
      setRewardStatistics(statisticsResponse.data || {
        totalRewards: 0,
        activeRewards: 0,
        totalDistributed: 0,
        totalAmountDistributed: 0
      })
    } catch (error) {
      console.error('Error loading rewards data:', error)
      addToast({ type: 'error', message: 'Failed to load rewards data' })
    } finally {
      setRewardsLoading(false)
    }
  }

  const handleSaveReward = async () => {
    try {
      if (!rewardFormData.name || !rewardFormData.level || !rewardFormData.requirement.value || !rewardFormData.rewardAmount) {
        addToast({ type: 'error', message: 'Please fill all required fields' })
        return
      }

      // Prepare data with proper number conversion
      const rewardData = {
        ...rewardFormData,
        requirement: {
          ...rewardFormData.requirement,
          value: Number(rewardFormData.requirement.value)
        },
        rewardAmount: Number(rewardFormData.rewardAmount),
        order: Number(rewardFormData.order) || 0
      }

      if (showEditRewardModal && selectedReward) {
        await adminChannelPartnerService.updateCPReward(selectedReward._id || selectedReward.id, rewardData)
        addToast({ type: 'success', message: 'Reward updated successfully' })
      } else {
        await adminChannelPartnerService.createCPReward(rewardData)
        addToast({ type: 'success', message: 'Reward created successfully' })
      }

      setShowMilestoneModal(false)
      setShowEditRewardModal(false)
      setSelectedReward(null)
      setRewardFormData({
        name: '',
        description: '',
        level: '',
        requirement: {
          type: 'conversions',
          value: '',
          description: ''
        },
        rewardAmount: '',
        order: 0,
        isActive: true
      })
      await loadRewardsData()
    } catch (error) {
      console.error('Error saving reward:', error)
      addToast({ type: 'error', message: error.response?.data?.message || 'Failed to save reward' })
    }
  }

  const handleEditReward = (reward) => {
    setSelectedReward(reward)
    setRewardFormData({
      name: reward.name || '',
      description: reward.description || '',
      level: reward.level || '',
      requirement: {
        type: reward.requirement?.type || 'conversions',
        value: reward.requirement?.value || '',
        description: reward.requirement?.description || ''
      },
      rewardAmount: reward.rewardAmount || '',
      order: reward.order || 0,
      isActive: reward.isActive !== undefined ? reward.isActive : true
    })
    setShowEditRewardModal(true)
  }

  const handleDeleteReward = async () => {
    try {
      await adminChannelPartnerService.deleteCPReward(selectedReward._id || selectedReward.id)
      addToast({ type: 'success', message: 'Reward deleted successfully' })
      setShowDeleteRewardModal(false)
      setSelectedReward(null)
      await loadRewardsData()
    } catch (error) {
      console.error('Error deleting reward:', error)
      addToast({ type: 'error', message: error.response?.data?.message || 'Failed to delete reward' })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateForInput = (date) => {
    if (!date) return ''
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date
    }
    try {
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) return ''
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (e) {
      return ''
    }
  }

  const getCurrentPartners = () => {
    let filteredPartners = partners

    // Filter by tab
    if (activeTab !== 'all') {
      filteredPartners = filteredPartners.filter(partner => partner.status === activeTab)
    }

    return filteredPartners
  }

  // Calculate total pages
  const totalPages = Math.ceil(totalPartners / itemsPerPage)

  const handleCreatePartner = () => {
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      partnerId: '',
      status: 'active',
      dateOfBirth: '',
      gender: '',
      joiningDate: '',
      document: null,
      companyName: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: 'India',
        zipCode: ''
      }
    })
    setShowCreateModal(true)
  }

  const handleEditPartner = (partner) => {
    setFormData({
      name: partner.name,
      email: partner.email || '',
      phoneNumber: partner.phoneNumber,
      partnerId: partner.partnerId || '',
      status: partner.status,
      dateOfBirth: formatDateForInput(partner.dateOfBirth),
      joiningDate: formatDateForInput(partner.joiningDate),
      gender: partner.gender || '',
      document: partner.document || null,
      companyName: partner.companyName || '',
      address: partner.address || {
        street: '',
        city: '',
        state: '',
        country: 'India',
        zipCode: ''
      }
    })
    setSelectedPartner(partner)
    setShowEditModal(true)
  }

  const handleViewPartner = (partner) => {
    setSelectedPartner(partner)
    setShowViewModal(true)
  }

  const handleDeletePartner = (partner) => {
    setSelectedPartner(partner)
    setShowDeleteModal(true)
  }

  const handleSavePartner = async () => {
    try {
      // Validate partner data
      const validationErrors = adminChannelPartnerService.validateChannelPartnerData(formData, showEditModal)
      if (validationErrors.length > 0) {
        addToast({ type: 'error', message: validationErrors[0] })
        return
      }
    
      if (showCreateModal) {
        await adminChannelPartnerService.createChannelPartner(formData)
        addToast({ type: 'success', message: 'Channel partner created successfully' })
      } else {
        await adminChannelPartnerService.updateChannelPartner(selectedPartner.id, formData)
        addToast({ type: 'success', message: 'Channel partner updated successfully' })
      }

      // Close modals and reset form
      setShowCreateModal(false)
      setShowEditModal(false)
      setSelectedPartner(null)
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        partnerId: '',
        status: 'active',
        dateOfBirth: '',
        gender: '',
        joiningDate: '',
        document: null,
        companyName: '',
        address: {
          street: '',
          city: '',
          state: '',
          country: 'India',
          zipCode: ''
        }
      })

      // Reload data
      await loadPartnersOnly()
      await adminChannelPartnerService.getChannelPartnerStatistics().then(res => setStatistics(res.data))
    } catch (error) {
      console.error('Error saving channel partner:', error)
      addToast({ type: 'error', message: error.response?.data?.message || 'Failed to save channel partner' })
    }
  }

  const confirmDelete = async () => {
    try {
      await adminChannelPartnerService.deleteChannelPartner(selectedPartner.id)
      addToast({ type: 'success', message: 'Channel partner deleted successfully' })
      setShowDeleteModal(false)
      setSelectedPartner(null)
      await loadPartnersOnly()
      await adminChannelPartnerService.getChannelPartnerStatistics().then(res => setStatistics(res.data))
    } catch (error) {
      console.error('Error deleting channel partner:', error)
      addToast({ type: 'error', message: error.response?.data?.message || 'Failed to delete channel partner' })
    }
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowViewModal(false)
    setShowDeleteModal(false)
    setSelectedPartner(null)
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      status: 'active',
      dateOfBirth: '',
      joiningDate: '',
      document: null,
      companyName: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: 'India',
        zipCode: ''
      }
    })
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, selectedFilter, searchTerm])

  
  // Reset pagination when filters change for each section
  useEffect(() => {
    setLeadsPage(1)
  }, [leadStatusFilter])
  
  useEffect(() => {
    setWalletPage(1)
  }, [selectedCPWallet, transactionTypeFilter])

  // Load wallet data when wallet tab is active
  useEffect(() => {
    if (activeTab === 'wallet') {
      loadWalletData()
    }
  }, [activeTab, walletPage, walletPerPage, searchTerm])
  
  useEffect(() => {
    setRewardsPage(1)
  }, [])

  // Load rewards data when rewards tab is active
  useEffect(() => {
    if (activeTab === 'rewards') {
      loadRewardsData()
    }
  }, [activeTab, rewardsPage, rewardsPerPage])

  // Load leads breakdown data when leads tab is active
  const loadLeadsBreakdown = async () => {
    setLeadsBreakdownLoading(true)
    try {
      const response = await adminChannelPartnerService.getChannelPartnerLeadsBreakdown({
        page: leadsBreakdownPage,
        limit: leadsBreakdownPerPage
      })
      setLeadsBreakdownData(response.data || [])
    } catch (error) {
      console.error('Error loading leads breakdown:', error)
      addToast({ type: 'error', message: 'Failed to load leads breakdown' })
    } finally {
      setLeadsBreakdownLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'leads') {
      loadLeadsBreakdown()
    }
  }, [activeTab, leadsBreakdownPage, leadsBreakdownPerPage])

  const handleViewLeadsByStatus = (cpData, status) => {
    setSelectedCPForLeads(cpData)
    setSelectedStatusForLeads(status)
    setShowLeadsListModal(true)
  }

  const handleViewSharedLeads = (cpData, type) => {
    setSelectedCPForLeads(cpData)
    setSelectedStatusForLeads(type) // 'sharedWithSales' or 'receivedFromSales'
    setShowLeadsListModal(true)
  }
  
  useEffect(() => {
    setConvertedPage(1)
  }, [])
  
  useEffect(() => {
    setQuotationsPage(1)
  }, [])
  
  useEffect(() => {
    setTeamPage(1)
  }, [])

  // Load sales team leads (only team leads)
  const loadSalesTeamLeads = async () => {
    try {
      setLoadingTeamLeads(true)
      const response = await adminSalesService.getAllSalesTeam()
      if (response.success && response.data) {
        // Filter only team leads
        const leads = response.data.filter(member => member.isTeamLead === true || member.role === 'team_lead' || member.role === 'Team Lead')
        setSalesTeamLeads(leads)
      }
    } catch (error) {
      console.error('Error loading sales team leads:', error)
      addToast('Failed to load sales team leads', 'error')
    } finally {
      setLoadingTeamLeads(false)
    }
  }

  // Load team lead assignments from channel partners
  const loadTeamLeadAssignments = async () => {
    try {
      const response = await adminChannelPartnerService.getAllChannelPartners({})
      console.log('Raw channel partners response:', response)
      if (response.success && response.data) {
        const assignments = response.data.map(cp => {
          const cpId = cp.id || cp._id || (cp.data && (cp.data.id || cp.data._id))
          const cpName = cp.name || (cp.data && cp.data.name)
          const salesTeamLeadId = cp.salesTeamLeadId || cp.assignedSalesTeamLeadId || (cp.data && (cp.data.salesTeamLeadId || cp.data.assignedSalesTeamLeadId)) || null
          const salesTeamLeadName = cp.salesTeamLeadName || cp.assignedSalesTeamLeadName || (cp.data && (cp.data.salesTeamLeadName || cp.data.assignedSalesTeamLeadName)) || null
          const assignedDate = cp.teamLeadAssignedDate || (cp.data && cp.data.teamLeadAssignedDate) || null
          
          return {
            cpId: cpId,
            cpName: cpName,
            salesTeamLeadId: salesTeamLeadId ? String(salesTeamLeadId) : null,
            salesTeamLeadName: salesTeamLeadName,
            assignedDate: assignedDate
          }
        })
        console.log('Team lead assignments loaded:', assignments)
        setTeamLeadAssignments(assignments)
      } else {
        console.error('Failed to load channel partners:', response)
        setTeamLeadAssignments([])
      }
    } catch (error) {
      console.error('Error loading team lead assignments:', error)
      addToast('Failed to load team lead assignments', 'error')
      setTeamLeadAssignments([])
    }
  }

  // Assign team lead to channel partner
  const handleAssignTeamLead = async () => {
    if (!selectedCPForTeamLead || !selectedTeamLeadId) {
      addToast('Please select a channel partner and sales team lead', 'error')
      return
    }

    try {
      const teamLead = salesTeamLeads.find(lead => (lead.id || lead._id) === selectedTeamLeadId)
      if (!teamLead) {
        addToast('Sales team lead not found', 'error')
        return
      }

      // Update channel partner with team lead assignment
      const updateData = {
        salesTeamLeadId: selectedTeamLeadId,
        salesTeamLeadName: teamLead.name,
        teamLeadAssignedDate: new Date().toISOString()
      }

      console.log('Assigning team lead:', { cpId: selectedCPForTeamLead.cpId, updateData })
      const response = await adminChannelPartnerService.updateChannelPartner(selectedCPForTeamLead.cpId, updateData)
      console.log('Update response:', response)
      
      if (response.success) {
        addToast('Team lead assigned successfully', 'success')
        setShowAssignTeamLeadModal(false)
        setSelectedCPForTeamLead(null)
        setSelectedTeamLeadId('')
        // Wait a bit for the backend to save, then reload
        setTimeout(async () => {
          await loadTeamLeadAssignments()
          await loadData() // Refresh main data
        }, 500)
      } else {
        console.error('Failed to assign team lead:', response)
        addToast(response.message || 'Failed to assign team lead', 'error')
      }
    } catch (error) {
      console.error('Error assigning team lead:', error)
      addToast('Failed to assign team lead', 'error')
    }
  }

  // Load commission settings when commission tab is active
  const loadCommissionSettings = async () => {
    setCommissionSettingsLoading(true)
    setCommissionSettingsError(null)
    try {
      const response = await adminChannelPartnerService.getCommissionSettings()
      if (response.success && response.data) {
        setCommissionSettings({
          ownConversionCommission: response.data.ownConversionCommission || 30,
          sharedConversionCommission: response.data.sharedConversionCommission || 10
        })
        setCommissionFormData({
          ownConversionCommission: response.data.ownConversionCommission || 30,
          sharedConversionCommission: response.data.sharedConversionCommission || 10
        })
        setCommissionLastUpdated(response.data.updatedAt)
        setCommissionUpdatedBy(response.data.updatedBy)
      }
    } catch (error) {
      console.error('Error loading commission settings:', error)
      setCommissionSettingsError('Failed to load commission settings')
      addToast('Failed to load commission settings', 'error')
    } finally {
      setCommissionSettingsLoading(false)
    }
  }

  // Save commission settings
  const saveCommissionSettings = async () => {
    // Validation
    if (commissionFormData.ownConversionCommission < 0 || commissionFormData.ownConversionCommission > 100) {
      addToast('Own conversion commission must be between 0 and 100', 'error')
      return
    }
    if (commissionFormData.sharedConversionCommission < 0 || commissionFormData.sharedConversionCommission > 100) {
      addToast('Shared conversion commission must be between 0 and 100', 'error')
      return
    }

    setCommissionSettingsSaving(true)
    setCommissionSettingsError(null)
    try {
      const response = await adminChannelPartnerService.updateCommissionSettings(commissionFormData)
      if (response.success && response.data) {
        setCommissionSettings({
          ownConversionCommission: response.data.ownConversionCommission,
          sharedConversionCommission: response.data.sharedConversionCommission
        })
        setCommissionLastUpdated(response.data.updatedAt)
        setCommissionUpdatedBy(response.data.updatedBy)
        setIsEditingCommission(false)
        addToast('Commission settings updated successfully', 'success')
      } else {
        throw new Error(response.message || 'Failed to update commission settings')
      }
    } catch (error) {
      console.error('Error saving commission settings:', error)
      setCommissionSettingsError(error.message || 'Failed to update commission settings')
      addToast(error.message || 'Failed to update commission settings', 'error')
    } finally {
      setCommissionSettingsSaving(false)
    }
  }

  // Load commission settings when commission tab is active
  useEffect(() => {
    if (activeTab === 'commission') {
      loadCommissionSettings()
    }
  }, [activeTab])

  // Load team leads when team tab is active
  useEffect(() => {
    if (activeTab === 'team') {
      loadSalesTeamLeads()
      loadTeamLeadAssignments()
    }
  }, [activeTab])

  // Load quotations when quotations tab is active
  useEffect(() => {
    if (activeTab === 'quotations') {
      loadQuotations()
      loadQuotationStatistics()
    }
  }, [activeTab, quotationsPage, quotationsPerPage, quotationSearchTerm, quotationStatusFilter])

  // Load quotations
  const loadQuotations = async () => {
    setQuotationsLoading(true)
    try {
      const response = await adminQuotationService.getAllQuotations({
        page: quotationsPage,
        limit: quotationsPerPage,
        search: quotationSearchTerm || undefined,
        status: quotationStatusFilter !== 'all' ? quotationStatusFilter : undefined,
        // Category filter removed - categories are now dynamic
      })
      
      if (response.success) {
        const formattedQuotations = response.data.map(quote => 
          adminQuotationService.formatQuotationForDisplay(quote)
        )
        setQuotations(formattedQuotations)
        setQuotationsTotal(response.total || 0)
      }
    } catch (error) {
      console.error('Error loading quotations:', error)
      addToast('Failed to load quotations', 'error')
    } finally {
      setQuotationsLoading(false)
    }
  }

  // Load quotation statistics
  const loadQuotationStatistics = async () => {
    try {
      const response = await adminQuotationService.getQuotationStatistics()
      if (response.success) {
        setQuotationStatistics(response.data)
      }
    } catch (error) {
      console.error('Error loading quotation statistics:', error)
    }
  }

  // Handle create quotation
  const handleCreateQuotation = async () => {
    try {
      console.log('Creating quotation with data:', quotationFormData)
      const response = await adminQuotationService.createQuotation(quotationFormData)
      console.log('Create quotation response:', response)
      if (response.success) {
        addToast({ type: 'success', message: 'Quotation created successfully' })
        setShowQuotationModal(false)
        resetQuotationForm()
        loadQuotations()
        loadQuotationStatistics()
      } else {
        addToast({ type: 'error', message: response.message || 'Failed to create quotation' })
      }
    } catch (error) {
      console.error('Error creating quotation:', error)
      addToast({ type: 'error', message: error.message || 'Failed to create quotation' })
    }
  }

  // Handle update quotation
  const handleUpdateQuotation = async () => {
    if (!editingQuotation) return
    
    try {
      console.log('Updating quotation with data:', quotationFormData)
      const response = await adminQuotationService.updateQuotation(editingQuotation.id, quotationFormData)
      console.log('Update quotation response:', response)
      if (response.success) {
        addToast({ type: 'success', message: 'Quotation updated successfully' })
        setShowQuotationModal(false)
        setEditingQuotation(null)
        resetQuotationForm()
        loadQuotations()
        loadQuotationStatistics()
      } else {
        addToast({ type: 'error', message: response.message || 'Failed to update quotation' })
      }
    } catch (error) {
      console.error('Error updating quotation:', error)
      addToast({ type: 'error', message: error.message || 'Failed to update quotation' })
    }
  }

  // Handle delete quotation
  const handleDeleteQuotation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quotation?')) return
    
    try {
      const response = await adminQuotationService.deleteQuotation(id)
      if (response.success) {
        addToast({ type: 'success', message: 'Quotation deleted successfully' })
        loadQuotations()
        loadQuotationStatistics()
      } else {
        addToast({ type: 'error', message: response.message || 'Failed to delete quotation' })
      }
    } catch (error) {
      console.error('Error deleting quotation:', error)
      addToast({ type: 'error', message: error.message || 'Failed to delete quotation' })
    }
  }

  // Reset quotation form
  const resetQuotationForm = () => {
    setQuotationFormData({
      title: '',
      category: '',
      description: '',
      price: '',
      currency: 'INR',
      status: 'active',
      pdfDocument: null
    })
  }

  // Open create modal
  const openCreateQuotationModal = () => {
    setEditingQuotation(null)
    resetQuotationForm()
    setShowQuotationModal(true)
  }

  // Open edit modal
  const openEditQuotationModal = (quotation) => {
    setEditingQuotation(quotation)
    setQuotationFormData({
      title: quotation.title,
      category: quotation.category,
      description: quotation.description || '',
      price: quotation.price,
      currency: quotation.currency || 'INR',
      status: quotation.status,
      pdfDocument: quotation.pdfDocument
    })
    setShowQuotationModal(true)
  }

  // Main section tabs
  const mainTabs = [
    { key: 'partners', label: 'Partners', icon: Handshake },
    { key: 'leads', label: 'Leads', icon: Users },
    { key: 'wallet', label: 'Wallet', icon: WalletIcon },
    { key: 'rewards', label: 'Rewards', icon: Award },
    { key: 'converted', label: 'Converted', icon: CheckCircle },
    { key: 'quotations', label: 'Quotations', icon: FileText },
    { key: 'team', label: 'Assign Team Leads', icon: UserCheck },
    { key: 'commission', label: 'Commission Settings', icon: Percent }
  ]
  
  // Partner status tabs (for partners section only)
  const partnerStatusTabs = [
    { key: 'all', label: 'All Partners', count: statistics.total || 0 },
    { key: 'active', label: 'Active', count: statistics.active || 0 },
    { key: 'inactive', label: 'Inactive', count: statistics.inactive || 0 }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Admin_navbar />
        <Admin_sidebar />
      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Loading size="large" className="h-96" />
        </div>
      </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Admin_navbar />
      
      {/* Sidebar */}
      <Admin_sidebar />
      
      {/* Main Content */}
      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
          >
            <div className="space-y-2">
              <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                Channel Partner Management
              </h1>
              <p className="text-gray-600 text-sm lg:text-lg">
                {activeTab === 'partners' && 'Manage channel partners and their access to the platform'}
                {activeTab === 'leads' && 'View and manage all leads created by channel partners'}
                {activeTab === 'wallet' && 'Monitor wallet balances and transaction history'}
                {activeTab === 'rewards' && 'Manage rewards, milestones, and achievements'}
                {activeTab === 'converted' && 'Track converted clients and project progress'}
                {activeTab === 'quotations' && 'View quotations shared by channel partners'}
                {activeTab === 'team' && 'Assign sales team leads to channel partners'}
                {activeTab === 'commission' && 'Configure commission percentages for channel partners'}
              </p>
            </div>
            {activeTab === 'partners' && (
              <div className="flex items-center space-x-3">
                <Button
                  onClick={loadPartnersOnly}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={partnersLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${partnersLoading ? 'animate-spin' : ''}`} />
                  {partnersLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button
                  onClick={handleCreatePartner}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Channel Partner
                </Button>
              </div>
            )}
          </motion.div>
          
          {/* Main Section Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="flex flex-nowrap gap-1 px-2 lg:px-4 min-w-max lg:min-w-0">
                {mainTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.key
                  
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-medium text-xs transition-colors rounded-t-md ${
                        isActive
                          ? 'border-blue-500 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </motion.div>

          {/* Statistics Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 lg:gap-4"
          >
            {/* Total Partners */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Handshake className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1">Total Partners</p>
                  <p className="text-lg font-bold text-blue-800">{statistics.total}</p>
                </div>
              </div>
            </div>

            {/* Active Partners */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-green-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-emerald-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-700 mb-1">Active</p>
                  <p className="text-lg font-bold text-emerald-800">{statistics.active}</p>
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-violet-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-purple-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-purple-400/20 to-violet-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <WalletIcon className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-purple-700 mb-1">Revenue</p>
                  <p className="text-lg font-bold text-purple-800">₹{statistics.totalRevenue?.toLocaleString('en-IN') || 0}</p>
                </div>
              </div>
            </div>

            {/* Total Leads */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-orange-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-orange-400/20 to-amber-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Target className="h-4 w-4 text-orange-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-orange-700 mb-1">Total Leads</p>
                  <p className="text-lg font-bold text-orange-800">{statistics.totalLeads || mockLeads.length}</p>
                </div>
              </div>
            </div>

            {/* Total Conversions */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 to-cyan-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-teal-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-teal-400/20 to-cyan-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-teal-500/10">
                    <TrendingUp className="h-4 w-4 text-teal-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-teal-700 mb-1">Conversions</p>
                  <p className="text-lg font-bold text-teal-800">{statistics.totalConversions || mockConverted.length}</p>
                </div>
              </div>
            </div>

            {/* Avg Commission */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 to-rose-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-pink-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-pink-400/20 to-rose-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-pink-500/10">
                    <BarChart3 className="h-4 w-4 text-pink-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-pink-700 mb-1">Avg Commission</p>
                  <p className="text-lg font-bold text-pink-800">₹{statistics.avgCommission?.toLocaleString('en-IN') || '0'}</p>
                </div>
              </div>
            </div>

            {/* Inactive Partners */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-slate-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-gray-400/20 to-slate-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-gray-500/10">
                    <AlertCircle className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Inactive</p>
                  <p className="text-lg font-bold text-gray-800">{statistics.inactive}</p>
                </div>
              </div>
            </div>

          </motion.div>

          {/* Tab Content - Conditionally render based on activeTab */}
          {activeTab === 'partners' && (
            <Card className="shadow-sm border border-gray-200">
            <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                  Channel Partners
                </CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search partners..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 text-sm"
                    />
                  </div>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-auto"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </CardHeader>

              <CardContent className="p-0">
              {/* Partner Status Tabs */}
              <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="flex flex-nowrap space-x-4 lg:space-x-8 px-3 lg:px-6 min-w-max lg:min-w-0">
                    {partnerStatusTabs.map((tab) => {
                      const isActive = selectedFilter === tab.key || (selectedFilter === 'all' && tab.key === 'all')
                      
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setSelectedFilter(tab.key)}
                          className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                            isActive
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      )
                    })}
                  </nav>
                </div>

              {/* Partners Table */}
              <div className="p-3 lg:p-6">
                {partnersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-gray-600">Loading partners...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {partners.length === 0 ? (
                      <div className="text-center py-12">
                        <Handshake className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No channel partners found</h3>
                        <p className="text-gray-600 mb-4">Get started by adding your first channel partner.</p>
                        <Button onClick={handleCreatePartner} className="gap-2">
                          <UserPlus className="h-4 w-4" />
                          Add Channel Partner
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto -mx-3 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                          <table className="w-full min-w-[640px] border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Name</th>
                                <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Contact</th>
                                <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 hidden md:table-cell">Company</th>
                                <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Status</th>
                                <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 hidden lg:table-cell">Joined</th>
                                <th className="text-right py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {partners.map((partner) => (
                                <tr key={partner.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                                        {partner.avatar}
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900">{partner.name}</p>
                                        {partner.email && (
                                          <p className="text-xs text-gray-500">{partner.email}</p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <div className="flex items-center space-x-1 text-xs lg:text-sm text-gray-600">
                                      <Phone className="h-3 w-3" />
                                      <span className="truncate max-w-[120px] lg:max-w-none">{partner.phoneNumber}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4 hidden md:table-cell">
                                    <div className="flex items-center space-x-1 text-xs lg:text-sm text-gray-600">
                                      <Building2 className="h-3 w-3" />
                                      <span className="truncate max-w-[100px] lg:max-w-none">{partner.companyName || 'N/A'}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(partner.status)}`}>
                                      {partner.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4 hidden lg:table-cell">
                                    <div className="flex items-center space-x-1 text-xs lg:text-sm text-gray-600">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDate(partner.joiningDate)}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <div className="flex items-center justify-end space-x-1 lg:space-x-2">
                                      <button
                                        onClick={() => handleViewPartner(partner)}
                                        className="text-gray-400 hover:text-blue-600 p-2 rounded hover:bg-blue-50 transition-all"
                                        title="View"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleEditPartner(partner)}
                                        className="text-gray-400 hover:text-green-600 p-2 rounded hover:bg-green-50 transition-all"
                                        title="Edit"
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeletePartner(partner)}
                                        className="text-gray-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-all"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        <PaginationComponent
                          currentPage={currentPage}
                          totalPages={totalPages}
                          itemsPerPage={itemsPerPage}
                          totalItems={totalPartners}
                          onPageChange={setCurrentPage}
                          onItemsPerPageChange={(value) => {
                            setItemsPerPage(value)
                            setCurrentPage(1)
                          }}
                          alwaysShow={true}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Leads Section */}
          {activeTab === 'leads' && (
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                    Channel Partner Leads Breakdown
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                      onClick={loadLeadsBreakdown}
                      variant="outline"
                      className="gap-2 w-full sm:w-auto text-sm"
                      size="sm"
                      disabled={leadsBreakdownLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${leadsBreakdownLoading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                {leadsBreakdownLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loading size="medium" />
                  </div>
                ) : leadsBreakdownData.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No channel partner leads data found</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto -mx-3 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="w-full min-w-[1000px] border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[180px]">Channel Partner</th>
                            <th className="text-center py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[70px] whitespace-normal">
                              <div className="leading-tight">Hot</div>
                            </th>
                            <th className="text-center py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[80px] whitespace-normal">
                              <div className="leading-tight">Connected</div>
                            </th>
                            <th className="text-center py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[80px] whitespace-normal">
                              <div className="leading-tight">Converted</div>
                            </th>
                            <th className="text-center py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[70px] whitespace-normal">
                              <div className="leading-tight">Lost</div>
                            </th>
                            <th className="text-center py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px] whitespace-normal">
                              <div className="leading-tight">Shared<br />with Sales</div>
                            </th>
                            <th className="text-center py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[110px] whitespace-normal">
                              <div className="leading-tight">Received<br />from Sales</div>
                            </th>
                            <th className="text-center py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px] whitespace-normal">
                              <div className="leading-tight">Collected</div>
                            </th>
                            <th className="text-center py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px] whitespace-normal">
                              <div className="leading-tight">Outstanding</div>
                            </th>
                            <th className="text-center py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px] whitespace-normal">
                              <div className="leading-tight">Total<br />Revenue</div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {leadsBreakdownData
                            .slice((leadsBreakdownPage - 1) * leadsBreakdownPerPage, leadsBreakdownPage * leadsBreakdownPerPage)
                            .map((cpData) => (
                              <tr key={cpData.channelPartner.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-3 lg:py-4 px-2 lg:px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                                      {cpData.channelPartner.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">{cpData.channelPartner.name}</p>
                                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                        <span className="text-xs text-gray-500">{cpData.channelPartner.phoneNumber}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                                  <button
                                    onClick={() => handleViewLeadsByStatus(cpData, 'hot')}
                                    className="text-red-600 hover:text-red-800 font-bold hover:underline transition-colors"
                                  >
                                    {cpData.leadCounts.hot || 0}
                                  </button>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                                  <button
                                    onClick={() => handleViewLeadsByStatus(cpData, 'connected')}
                                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline transition-colors"
                                  >
                                    {cpData.leadCounts.connected || 0}
                                  </button>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                                  <button
                                    onClick={() => handleViewLeadsByStatus(cpData, 'converted')}
                                    className="text-green-600 hover:text-green-800 font-bold hover:underline transition-colors"
                                  >
                                    {cpData.leadCounts.converted || 0}
                                  </button>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                                  <button
                                    onClick={() => handleViewLeadsByStatus(cpData, 'lost')}
                                    className="text-gray-600 hover:text-gray-800 font-bold hover:underline transition-colors"
                                  >
                                    {cpData.leadCounts.lost || 0}
                                  </button>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                                  <button
                                    onClick={() => handleViewSharedLeads(cpData, 'sharedWithSales')}
                                    className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors cursor-pointer"
                                  >
                                    {cpData.leadSharing.sharedWithSales || 0}
                                  </button>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                                  <button
                                    onClick={() => handleViewSharedLeads(cpData, 'receivedFromSales')}
                                    className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors cursor-pointer"
                                  >
                                    {cpData.leadSharing.receivedFromSales || 0}
                                  </button>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                                  <p className="text-sm font-semibold text-green-600">
                                    ₹{(cpData.revenue.collectedAmount || 0).toLocaleString('en-IN')}
                                  </p>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                                  <p className="text-sm font-semibold text-orange-600">
                                    ₹{(cpData.revenue.pendingAmount || 0).toLocaleString('en-IN')}
                                  </p>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                                  <p className="text-sm font-semibold text-teal-600">
                                    ₹{(cpData.revenue.totalRevenue || 0).toLocaleString('en-IN')}
                                  </p>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationComponent
                      currentPage={leadsBreakdownPage}
                      totalPages={Math.ceil(leadsBreakdownData.length / leadsBreakdownPerPage)}
                      itemsPerPage={leadsBreakdownPerPage}
                      totalItems={leadsBreakdownData.length}
                      onPageChange={setLeadsBreakdownPage}
                      onItemsPerPageChange={setLeadsBreakdownPerPage}
                      alwaysShow={true}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Wallet Section */}
          {activeTab === 'wallet' && (
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                    Channel Partner Wallets
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <select
                      value={selectedCPWallet}
                      onChange={(e) => setSelectedCPWallet(e.target.value)}
                      className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-auto"
                    >
                      <option value="all">All Partners</option>
                      {walletData.map((wallet) => (
                        <option key={wallet.channelPartner.id} value={wallet.channelPartner.id}>
                          {wallet.channelPartner.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      onClick={loadWalletData}
                      className="gap-2 w-full sm:w-auto text-sm"
                      size="sm"
                      disabled={walletLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${walletLoading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                {walletLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loading size="medium" />
                  </div>
                ) : walletData.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No wallet data found</p>
                  </div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
                      <div className="bg-blue-50 p-3 lg:p-4 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-700 mb-1">Total Balance</p>
                        <p className="text-base lg:text-lg font-bold text-blue-800">
                          ₹{walletData.reduce((sum, w) => sum + (w.balance || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 lg:p-4 rounded-lg border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-1">All Time Earnings</p>
                        <p className="text-base lg:text-lg font-bold text-green-800">
                          ₹{walletData.reduce((sum, w) => sum + (w.totalEarned || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-3 lg:p-4 rounded-lg border border-purple-200">
                        <p className="text-xs font-medium text-purple-700 mb-1">Current Month</p>
                        <p className="text-base lg:text-lg font-bold text-purple-800">
                          ₹{walletData.reduce((sum, w) => sum + (w.currentMonthEarnings || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-3 lg:p-4 rounded-lg border border-yellow-200">
                        <p className="text-xs font-medium text-yellow-700 mb-1">Total Rewards</p>
                        <p className="text-base lg:text-lg font-bold text-yellow-800">
                          ₹{walletData.reduce((sum, w) => sum + (w.rewardAmount || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Wallet Data Table */}
                    <div className="overflow-x-auto -mx-3 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="w-full min-w-[800px] border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Channel Partner</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Current Month</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">All Time Earnings</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Reward Amount</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Paid</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Unpaid</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {walletData
                            .filter(w => selectedCPWallet === 'all' || w.channelPartner.id === selectedCPWallet)
                            .slice((walletPage - 1) * walletPerPage, walletPage * walletPerPage)
                            .map((wallet) => (
                              <tr key={wallet.channelPartner.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-3 lg:py-4 px-2 lg:px-4">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{wallet.channelPartner.name}</p>
                                    {wallet.channelPartner.partnerId && (
                                      <p className="text-xs text-gray-500">{wallet.channelPartner.partnerId}</p>
                                    )}
                                    <p className="text-xs text-gray-500">{wallet.channelPartner.phoneNumber}</p>
                                  </div>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4">
                                  <p className="text-sm font-semibold text-gray-900">
                                    ₹{(wallet.currentMonthEarnings || 0).toLocaleString('en-IN')}
                                  </p>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4">
                                  <p className="text-sm font-semibold text-gray-900">
                                    ₹{(wallet.totalEarned || 0).toLocaleString('en-IN')}
                                  </p>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4">
                                  <p className="text-sm font-semibold text-purple-600">
                                    ₹{(wallet.rewardAmount || 0).toLocaleString('en-IN')}
                                  </p>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4">
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    ₹{(wallet.paidAmount || 0).toLocaleString('en-IN')}
                                  </span>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4">
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                    ₹{(wallet.unpaidAmount || 0).toLocaleString('en-IN')}
                                  </span>
                                </td>
                                <td className="py-3 lg:py-4 px-2 lg:px-4">
                                  <p className="text-sm font-bold text-blue-600">
                                    ₹{(wallet.balance || 0).toLocaleString('en-IN')}
                                  </p>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationComponent
                      currentPage={walletPage}
                      totalPages={Math.ceil(walletData.filter(w => selectedCPWallet === 'all' || w.channelPartner.id === selectedCPWallet).length / walletPerPage)}
                      itemsPerPage={walletPerPage}
                      totalItems={walletData.filter(w => selectedCPWallet === 'all' || w.channelPartner.id === selectedCPWallet).length}
                      onPageChange={setWalletPage}
                      onItemsPerPageChange={setWalletPerPage}
                      alwaysShow={true}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rewards Section */}
          {activeTab === 'rewards' && (
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                    Level-wise Rewards Management
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                      onClick={() => {
                        setShowEditRewardModal(false)
                        setSelectedReward(null)
                        setRewardFormData({
                          name: '',
                          description: '',
                          level: '',
                          requirement: {
                            type: 'conversions',
                            value: '',
                            description: ''
                          },
                          rewardAmount: '',
                          order: 0,
                          isActive: true
                        })
                        setShowMilestoneModal(true)
                      }}
                      className="gap-2 w-full sm:w-auto text-sm"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Create Reward</span>
                      <span className="sm:hidden">Create</span>
                    </Button>
                    <Button
                      onClick={loadRewardsData}
                      variant="outline"
                      className="gap-2 w-full sm:w-auto text-sm"
                      size="sm"
                      disabled={rewardsLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${rewardsLoading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                {rewardsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loading size="medium" />
                  </div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
                      <div className="bg-yellow-50 p-3 lg:p-4 rounded-lg border border-yellow-200">
                        <p className="text-xs font-medium text-yellow-700 mb-1">Total Rewards</p>
                        <p className="text-base lg:text-lg font-bold text-yellow-800">{rewardStatistics.totalRewards || 0}</p>
                      </div>
                      <div className="bg-purple-50 p-3 lg:p-4 rounded-lg border border-purple-200">
                        <p className="text-xs font-medium text-purple-700 mb-1">Active Rewards</p>
                        <p className="text-base lg:text-lg font-bold text-purple-800">{rewardStatistics.activeRewards || 0}</p>
                      </div>
                      <div className="bg-green-50 p-3 lg:p-4 rounded-lg border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-1">Rewards Distributed</p>
                        <p className="text-base lg:text-lg font-bold text-green-800">{rewardStatistics.totalDistributed || 0}</p>
                      </div>
                      <div className="bg-blue-50 p-3 lg:p-4 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-700 mb-1">Total Amount</p>
                        <p className="text-base lg:text-lg font-bold text-blue-800">
                          ₹{(rewardStatistics.totalAmountDistributed || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Rewards List */}
                    <div className="overflow-x-auto -mx-3 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="w-full min-w-[800px] border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Level</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Reward Name</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Requirement</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Reward Amount</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">CPs Won</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-right py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rewardsData.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-12 text-center">
                                <p className="text-gray-500">No rewards created yet. Click "Create Reward" to add a new level-wise reward.</p>
                              </td>
                            </tr>
                          ) : (
                            rewardsData
                              .slice((rewardsPage - 1) * rewardsPerPage, rewardsPage * rewardsPerPage)
                              .map((reward) => (
                                <tr key={reward._id || reward.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800">
                                      {reward.level}
                                    </span>
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <p className="text-sm font-semibold text-gray-900">{reward.name}</p>
                                    {reward.description && (
                                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{reward.description}</p>
                                    )}
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <p className="text-xs lg:text-sm text-gray-600">
                                      {reward.requirement?.value} {reward.requirement?.value === 1 ? 'Conversion' : 'Conversions'}
                                    </p>
                                    {reward.requirement?.description && (
                                      <p className="text-xs text-gray-500 mt-0.5">{reward.requirement.description}</p>
                                    )}
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <p className="text-sm font-bold text-purple-600">
                                      ₹{(reward.rewardAmount || 0).toLocaleString('en-IN')}
                                    </p>
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                      {reward.winnersCount || 0} CPs
                                    </span>
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      reward.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {reward.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          handleEditReward(reward)
                                          setShowMilestoneModal(true)
                                        }}
                                        className="text-gray-400 hover:text-blue-600 p-1.5 lg:p-2 rounded hover:bg-blue-50 transition-all"
                                        title="Edit"
                                      >
                                        <Edit3 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedReward(reward)
                                          setShowRewardDetailsModal(true)
                                        }}
                                        className="text-gray-400 hover:text-blue-600 p-1.5 lg:p-2 rounded hover:bg-blue-50 transition-all"
                                        title="View Details"
                                      >
                                        <Eye className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedReward(reward)
                                          setShowDeleteRewardModal(true)
                                        }}
                                        className="text-gray-400 hover:text-red-600 p-1.5 lg:p-2 rounded hover:bg-red-50 transition-all"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <PaginationComponent
                      currentPage={rewardsPage}
                      totalPages={Math.ceil(rewardsData.length / rewardsPerPage)}
                      itemsPerPage={rewardsPerPage}
                      totalItems={rewardsData.length}
                      onPageChange={setRewardsPage}
                      onItemsPerPageChange={setRewardsPerPage}
                      alwaysShow={true}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Converted Clients Section */}
          {activeTab === 'converted' && (
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                    Converted Clients
                  </CardTitle>
                  <div className="flex items-center w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
                  <div className="bg-teal-50 p-3 lg:p-4 rounded-lg border border-teal-200">
                    <p className="text-xs font-medium text-teal-700 mb-1">Total Converted</p>
                    <p className="text-base lg:text-lg font-bold text-teal-800">{mockConverted.length}</p>
                  </div>
                  <div className="bg-blue-50 p-3 lg:p-4 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-700 mb-1">Project Value</p>
                    <p className="text-base lg:text-lg font-bold text-blue-800">₹{mockConverted.reduce((sum, c) => sum + c.totalValue, 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-orange-50 p-3 lg:p-4 rounded-lg border border-orange-200">
                    <p className="text-xs font-medium text-orange-700 mb-1">Pending Payments</p>
                    <p className="text-base lg:text-lg font-bold text-orange-800">₹{mockConverted.reduce((sum, c) => sum + c.pendingAmount, 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-green-50 p-3 lg:p-4 rounded-lg border border-green-200">
                    <p className="text-xs font-medium text-green-700 mb-1">Commission Paid</p>
                    <p className="text-base lg:text-lg font-bold text-green-800">₹{mockConverted.reduce((sum, c) => sum + (c.commissionStatus === 'Credited' ? c.commissionEarned : 0), 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-3 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <table className="w-full min-w-[900px] border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[180px]">Client Name</th>
                        <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[150px]">Project Type</th>
                        <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[120px]">Channel Partner</th>
                        <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px]">Status</th>
                        <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px]">Total Value</th>
                        <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px]">Paid Amount</th>
                        <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px]">Pending</th>
                        <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px]">Commission</th>
                        <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px]">Progress</th>
                        <th className="text-right py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockConverted
                        .slice((convertedPage - 1) * convertedPerPage, convertedPage * convertedPerPage)
                        .map((client) => (
                          <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 lg:py-4 px-2 lg:px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {client.clientName?.charAt(0).toUpperCase() || 'C'}
                                </div>
                                <span className="text-sm font-semibold text-gray-900 truncate">{client.clientName}</span>
                              </div>
                            </td>
                            <td className="py-3 lg:py-4 px-2 lg:px-4">
                              <span className="text-xs lg:text-sm text-gray-600 truncate block">{client.projectType}</span>
                            </td>
                            <td className="py-3 lg:py-4 px-2 lg:px-4">
                              <span className="text-xs lg:text-sm text-gray-600">{client.cpName}</span>
                            </td>
                            <td className="py-3 lg:py-4 px-2 lg:px-4">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                                client.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                client.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {client.status}
                              </span>
                            </td>
                            <td className="py-3 lg:py-4 px-2 lg:px-4">
                              <span className="text-sm font-bold text-gray-900">₹{client.totalValue.toLocaleString('en-IN')}</span>
                            </td>
                            <td className="py-3 lg:py-4 px-2 lg:px-4">
                              <span className="text-sm font-bold text-green-600">₹{client.paidAmount.toLocaleString('en-IN')}</span>
                            </td>
                            <td className="py-3 lg:py-4 px-2 lg:px-4">
                              <span className="text-sm font-bold text-red-600">₹{client.pendingAmount.toLocaleString('en-IN')}</span>
                            </td>
                            <td className="py-3 lg:py-4 px-2 lg:px-4">
                              <span className="text-sm font-bold text-purple-600">₹{client.commissionEarned.toLocaleString('en-IN')}</span>
                            </td>
                            <td className="py-3 lg:py-4 px-2 lg:px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${client.progress}%` }}></div>
                                </div>
                                <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">{client.progress}%</span>
                              </div>
                            </td>
                            <td className="py-3 lg:py-4 px-2 lg:px-4">
                              <div className="flex items-center justify-end">
                                <button
                                  onClick={() => {
                                    setSelectedConvertedClient(client)
                                    setShowConvertedClientModal(true)
                                  }}
                                  className="text-gray-400 hover:text-blue-600 p-1.5 lg:p-2 rounded hover:bg-blue-50 transition-all"
                                  title="View Details"
                                >
                                  <Eye className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const totalConvertedPages = Math.ceil(mockConverted.length / convertedPerPage)
                  return (
                    <PaginationComponent
                      currentPage={convertedPage}
                      totalPages={totalConvertedPages}
                      itemsPerPage={convertedPerPage}
                      totalItems={mockConverted.length}
                      onPageChange={setConvertedPage}
                      onItemsPerPageChange={setConvertedPerPage}
                      alwaysShow={true}
                    />
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {/* Quotations Section */}
          {activeTab === 'quotations' && (
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                    Quotations
                  </CardTitle>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search quotations..."
                        value={quotationSearchTerm}
                        onChange={(e) => {
                          setQuotationSearchTerm(e.target.value)
                          setQuotationsPage(1)
                        }}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
                      />
                    </div>
                    <Button onClick={openCreateQuotationModal} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Create Quotation</span>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <select
                    value={quotationStatusFilter}
                    onChange={(e) => {
                      setQuotationStatusFilter(e.target.value)
                      setQuotationsPage(1)
                    }}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                {quotationsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loading size="large" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
                      <div className="bg-indigo-50 p-3 lg:p-4 rounded-lg border border-indigo-200">
                        <p className="text-xs font-medium text-indigo-700 mb-1">Total Shared</p>
                        <p className="text-base lg:text-lg font-bold text-indigo-800">{quotationStatistics.totalShared || 0}</p>
                      </div>
                      <div className="bg-purple-50 p-3 lg:p-4 rounded-lg border border-purple-200">
                        <p className="text-xs font-medium text-purple-700 mb-1">Quotations</p>
                        <p className="text-base lg:text-lg font-bold text-purple-800">{quotationStatistics.total || 0}</p>
                      </div>
                      <div className="bg-pink-50 p-3 lg:p-4 rounded-lg border border-pink-200">
                        <p className="text-xs font-medium text-pink-700 mb-1">Categories</p>
                        <p className="text-base lg:text-lg font-bold text-pink-800">{Object.keys(quotationStatistics.categoryCounts || {}).length}</p>
                      </div>
                    </div>
                    {quotations.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No quotations found</p>
                        <Button onClick={openCreateQuotationModal} className="mt-4">
                          Create First Quotation
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {quotations.map((quote) => (
                            <div key={quote.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-gray-400 uppercase mb-1 block">{quote.category}</span>
                                  <h3 className="text-lg font-bold text-gray-900">{quote.title}</h3>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <button
                                    onClick={() => openEditQuotationModal(quote)}
                                    className="p-1.5 hover:bg-gray-100 rounded"
                                    title="Edit"
                                  >
                                    <Edit3 className="h-4 w-4 text-gray-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuotation(quote.id)}
                                    className="p-1.5 hover:bg-red-50 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Price</span>
                                  <span className="font-semibold text-gray-900">{quote.formattedPrice || adminQuotationService.formatPrice(quote.price, quote.currency)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Times Shared</span>
                                  <span className="font-semibold text-gray-900">{quote.timesShared || 0}</span>
                                </div>
                                {quote.lastShared && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Last Shared</span>
                                    <span className="text-gray-600">{formatDate(quote.lastShared)}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Status</span>
                                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                                    quote.status === 'active' ? 'bg-green-100 text-green-800' :
                                    quote.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>
                                    {quote.status}
                                  </span>
                                </div>
                              </div>
                              {quote.pdfDocument && quote.pdfDocument.secure_url && (
                                <div className="pt-4 border-t border-gray-100">
                                  <a
                                    href={quote.pdfDocument.secure_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                                  >
                                    <FileText className="h-4 w-4" />
                                    <span>View PDF</span>
                                  </a>
                                </div>
                              )}
                              {quote.sharedBy && quote.sharedBy.length > 0 && (
                                <div className="pt-4 border-t border-gray-100 mt-4">
                                  <p className="text-xs text-gray-500 mb-2">Shared by:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {quote.sharedBy.slice(0, 3).map((share, idx) => (
                                      <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                        {share.channelPartner?.name || 'Unknown'}
                                      </span>
                                    ))}
                                    {quote.sharedBy.length > 3 && (
                                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                        +{quote.sharedBy.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {(() => {
                          const totalQuotationsPages = Math.ceil((quotationsTotal || 0) / quotationsPerPage)
                          return (
                            <PaginationComponent
                              currentPage={quotationsPage}
                              totalPages={totalQuotationsPages}
                              itemsPerPage={quotationsPerPage}
                              totalItems={quotationsTotal || 0}
                              onPageChange={setQuotationsPage}
                              onItemsPerPageChange={setQuotationsPerPage}
                              alwaysShow={true}
                            />
                          )
                        })()}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assign Team Lead Section */}
          {activeTab === 'team' && (
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                    Assign Team Lead
                  </CardTitle>
                  <Button
                    onClick={() => {
                      setSelectedCPForTeamLead(null)
                      setSelectedTeamLeadId('')
                      setShowAssignTeamLeadModal(true)
                    }}
                    className="gap-2 w-full sm:w-auto text-sm"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Assign Team Lead</span>
                    <span className="sm:hidden">Assign</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                {loadingTeamLeads ? (
                  <div className="flex items-center justify-center py-12">
                    <Loading size="medium" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
                      <div className="bg-blue-50 p-3 lg:p-4 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-700 mb-1">Total Sales Team Leads</p>
                        <p className="text-base lg:text-lg font-bold text-blue-800">{salesTeamLeads.length}</p>
                      </div>
                      <div className="bg-green-50 p-3 lg:p-4 rounded-lg border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-1">CPs with Team Lead</p>
                        <p className="text-base lg:text-lg font-bold text-green-800">{teamLeadAssignments.filter(ta => ta.salesTeamLeadId).length}</p>
                      </div>
                      <div className="bg-orange-50 p-3 lg:p-4 rounded-lg border border-orange-200">
                        <p className="text-xs font-medium text-orange-700 mb-1">Unassigned CPs</p>
                        <p className="text-base lg:text-lg font-bold text-orange-800">{teamLeadAssignments.filter(ta => !ta.salesTeamLeadId).length}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto -mx-3 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="w-full min-w-[700px] border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[200px]">Channel Partner</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[180px]">Sales Team Lead</th>
                            <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[120px]">Assigned Date</th>
                            <th className="text-right py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm font-semibold text-gray-700 min-w-[100px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamLeadAssignments.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="py-12 text-center">
                                <p className="text-gray-500">No channel partners found</p>
                              </td>
                            </tr>
                          ) : (
                            teamLeadAssignments
                              .slice((teamPage - 1) * teamPerPage, teamPage * teamPerPage)
                              .map((assignment) => (
                                <tr key={assignment.cpId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                        {assignment.cpName?.charAt(0).toUpperCase() || 'C'}
                                      </div>
                                      <p className="text-sm font-semibold text-gray-900">{assignment.cpName}</p>
                                    </div>
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    {assignment.salesTeamLeadName ? (
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                                          {assignment.salesTeamLeadName?.charAt(0).toUpperCase() || 'L'}
                                        </div>
                                        <p className="text-sm text-gray-600">{assignment.salesTeamLeadName}</p>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">Not assigned</span>
                                    )}
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    {assignment.assignedDate ? (
                                      <p className="text-xs lg:text-sm text-gray-600">{formatDate(assignment.assignedDate)}</p>
                                    ) : (
                                      <span className="text-xs text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                                    <div className="flex items-center justify-end space-x-1 lg:space-x-2">
                                      <button
                                        onClick={() => {
                                          setSelectedCPForTeamLead(assignment)
                                          setSelectedTeamLeadId(assignment.salesTeamLeadId || '')
                                          setShowAssignTeamLeadModal(true)
                                        }}
                                        className="text-gray-400 hover:text-blue-600 p-1.5 lg:p-2 rounded hover:bg-blue-50 transition-all"
                                        title="Assign/Edit Team Lead"
                                      >
                                        <Edit3 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {(() => {
                      const totalTeamPages = Math.ceil(teamLeadAssignments.length / teamPerPage)
                      return (
                        <PaginationComponent
                          currentPage={teamPage}
                          totalPages={totalTeamPages}
                          itemsPerPage={teamPerPage}
                          totalItems={teamLeadAssignments.length}
                          onPageChange={setTeamPage}
                          onItemsPerPageChange={setTeamPerPage}
                          alwaysShow={true}
                        />
                      )
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Commission Settings Section */}
          {activeTab === 'commission' && (
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                    Commission Settings
                  </CardTitle>
                  {!isEditingCommission && (
                    <Button
                      onClick={() => setIsEditingCommission(true)}
                      className="gap-2 w-full sm:w-auto text-sm"
                      size="sm"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Settings
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                {commissionSettingsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loading size="medium" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Commission Scenarios Table */}
                    <div className="bg-gray-50 rounded-lg p-4 lg:p-6">
                      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Commission Scenarios</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-gray-300 bg-white">
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Lead Source</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Converter</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">CP Commission</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm text-gray-700">Channel Partner</td>
                              <td className="py-3 px-4 text-sm text-gray-700">Channel Partner</td>
                              <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                                {isEditingCommission ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={commissionFormData.ownConversionCommission}
                                    onChange={(e) => setCommissionFormData({
                                      ...commissionFormData,
                                      ownConversionCommission: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                ) : (
                                  `${commissionSettings.ownConversionCommission}%`
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm text-gray-700">Channel Partner</td>
                              <td className="py-3 px-4 text-sm text-gray-700">Sales Team Lead</td>
                              <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                                {isEditingCommission ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={commissionFormData.sharedConversionCommission}
                                    onChange={(e) => setCommissionFormData({
                                      ...commissionFormData,
                                      sharedConversionCommission: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                ) : (
                                  `${commissionSettings.sharedConversionCommission}%`
                                )}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm text-gray-700">Sales Team Lead</td>
                              <td className="py-3 px-4 text-sm text-gray-700">Channel Partner</td>
                              <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                                {isEditingCommission ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={commissionFormData.sharedConversionCommission}
                                    onChange={(e) => setCommissionFormData({
                                      ...commissionFormData,
                                      sharedConversionCommission: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                ) : (
                                  `${commissionSettings.sharedConversionCommission}%`
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Current Settings Display */}
                    {!isEditingCommission && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-xs font-medium text-blue-700 mb-1">Own Conversion Commission</p>
                          <p className="text-2xl font-bold text-blue-800">{commissionSettings.ownConversionCommission}%</p>
                          <p className="text-xs text-blue-600 mt-1">When CP converts their own lead</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-xs font-medium text-green-700 mb-1">Shared Conversion Commission</p>
                          <p className="text-2xl font-bold text-green-800">{commissionSettings.sharedConversionCommission}%</p>
                          <p className="text-xs text-green-600 mt-1">When lead is shared and converted by other party</p>
                        </div>
                      </div>
                    )}

                    {/* Last Updated Info */}
                    {commissionLastUpdated && !isEditingCommission && (
                      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                        {commissionUpdatedBy && (
                          <p>Last updated by: {commissionUpdatedBy.name || commissionUpdatedBy.email || 'Admin'}</p>
                        )}
                        <p>Last updated: {new Date(commissionLastUpdated).toLocaleString()}</p>
                      </div>
                    )}

                    {/* Error Message */}
                    {commissionSettingsError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800">{commissionSettingsError}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {isEditingCommission && (
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button
                          onClick={() => {
                            setIsEditingCommission(false)
                            setCommissionFormData({
                              ownConversionCommission: commissionSettings.ownConversionCommission,
                              sharedConversionCommission: commissionSettings.sharedConversionCommission
                            })
                            setCommissionSettingsError(null)
                          }}
                          variant="outline"
                          size="sm"
                          disabled={commissionSettingsSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={saveCommissionSettings}
                          size="sm"
                          disabled={commissionSettingsSaving}
                          className="gap-2"
                        >
                          {commissionSettingsSaving ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              Save Settings
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-[95vw] lg:max-w-3xl w-full max-h-[95vh] overflow-hidden m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 lg:p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl lg:text-2xl font-bold mb-2">
                      {showCreateModal ? 'Create Channel Partner' : 'Edit Channel Partner'}
                    </h3>
                    <p className="text-blue-100 text-sm lg:text-base">
                      {showCreateModal 
                        ? 'Fill in the channel partner details below. Mobile OTP login will be enabled.'
                        : 'Update the channel partner details below.'
                      }
                    </p>
                  </div>
                  <button
                    onClick={closeModals}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0 ml-2"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSavePartner(); }} className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-h-[calc(95vh-200px)] overflow-y-auto">
                {/* Name Field */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    Full Name <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Enter full name"
                  />
                </div>

                {/* Phone Number Field */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    Phone Number <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value.replace(/\D/g, '')})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="9876543210"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500">10-digit Indian mobile number (OTP login will be enabled)</p>
                </div>

                {/* Partner ID Field */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Partner ID</label>
                  <input
                    type="text"
                    value={formData.partnerId}
                    onChange={(e) => setFormData({...formData, partnerId: e.target.value})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="CP-2024-STARK"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500">Unique identifier for the channel partner (optional)</p>
                </div>

                {/* Email Field (Optional) */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Enter email address"
                  />
                </div>

                {/* Date Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                      Date of Birth <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                      className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                      Joining Date <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                      className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Gender Field */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Enter company name"
                  />
                </div>

                {/* Address Section */}
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700">Address Information</h4>
                  
                  {/* Street Address */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Street Address</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData({
                        ...formData, 
                        address: {...formData.address, street: e.target.value}
                      })}
                      className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Enter street address"
                    />
                  </div>

                  {/* City and State Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">City</label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => setFormData({
                          ...formData, 
                          address: {...formData.address, city: e.target.value}
                        })}
                        className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Enter city"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">State</label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => setFormData({
                          ...formData, 
                          address: {...formData.address, state: e.target.value}
                        })}
                        className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Enter state"
                      />
                    </div>
                  </div>

                  {/* Zip Code and Country Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Pin Code</label>
                      <input
                        type="text"
                        value={formData.address.zipCode}
                        onChange={(e) => setFormData({
                          ...formData, 
                          address: {...formData.address, zipCode: e.target.value.replace(/\D/g, '')}
                        })}
                        className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Enter pin code"
                        maxLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Country</label>
                      <input
                        type="text"
                        value={formData.address.country}
                        onChange={(e) => setFormData({
                          ...formData, 
                          address: {...formData.address, country: e.target.value}
                        })}
                        className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Enter country"
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Document Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Document</label>
                  <CloudinaryUpload
                    folder="appzeto/channel-partners/documents"
                    onUploadComplete={(document) => setFormData({...formData, document})}
                    existingFile={formData.document}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModals}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {showCreateModal ? 'Create Partner' : 'Update Partner'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* View Modal */}
        {showViewModal && selectedPartner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Channel Partner Details</h3>
                  <button
                    onClick={closeModals}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Name</p>
                    <p className="text-sm text-gray-900">{selectedPartner.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Phone</p>
                    <p className="text-sm text-gray-900">{selectedPartner.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Email</p>
                    <p className="text-sm text-gray-900">{selectedPartner.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(selectedPartner.status)}`}>
                      {selectedPartner.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Company</p>
                    <p className="text-sm text-gray-900">{selectedPartner.companyName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Date of Birth</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedPartner.dateOfBirth)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Joining Date</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedPartner.joiningDate)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedPartner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Delete Channel Partner</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone.</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-6">
                  Are you sure you want to delete <span className="font-semibold">{selectedPartner.name}</span>? This will permanently remove all associated data.
                </p>
              </div>
              <div className="flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModals}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmDelete}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Assign Lead Modal */}
        {showAssignLeadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAssignLeadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Assign Lead</h3>
                <button onClick={() => setShowAssignLeadModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Select Channel Partner</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option>Rajesh Kumar</option>
                    <option>Priya Sharma</option>
                    <option>Amit Patel</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setShowAssignLeadModal(false)}>Cancel</Button>
                  <Button>Assign</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Lead Details Modal */}
        {showLeadDetailsModal && selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowLeadDetailsModal(false); setSelectedLead(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-[95vw] lg:max-w-3xl w-full max-h-[90vh] overflow-hidden m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 lg:p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl lg:text-2xl font-bold truncate">Lead Details</h3>
                    <p className="text-blue-100 text-xs lg:text-sm mt-1 truncate">{selectedLead.name}</p>
                  </div>
                  <button onClick={() => { setShowLeadDetailsModal(false); setSelectedLead(null); }} className="p-2 hover:bg-white/20 rounded-full flex-shrink-0 ml-2">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                {/* Lead Information Section */}
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-base lg:text-lg font-bold text-gray-900 mb-3 lg:mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                    Lead Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Lead Name</p>
                      <p className="text-sm text-gray-900">{selectedLead.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Phone Number</p>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{selectedLead.phone}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Email Address</p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{selectedLead.email}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Project Type</p>
                      <p className="text-sm text-gray-900">{selectedLead.projectType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Status</p>
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                        selectedLead.status === 'Hot' ? 'bg-red-100 text-red-800' :
                        selectedLead.status === 'Connected' ? 'bg-blue-100 text-blue-800' :
                        selectedLead.status === 'Converted' ? 'bg-green-100 text-green-800' :
                        selectedLead.status === 'Lost' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedLead.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Project Value / Budget</p>
                      <p className="text-sm font-bold text-gray-900">{selectedLead.value || selectedLead.budget || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Created Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{formatDate(selectedLead.createdDate)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Last Updated</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{formatDate(selectedLead.lastUpdated)}</p>
                      </div>
                    </div>
                  </div>
                  {selectedLead.notes && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Notes</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedLead.notes}</p>
                    </div>
                  )}
                </div>

                {/* Channel Partner Information Section */}
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-base lg:text-lg font-bold text-gray-900 mb-3 lg:mb-4 flex items-center gap-2">
                    <Handshake className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" />
                    Channel Partner Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Channel Partner Name</p>
                      <p className="text-sm text-gray-900">{selectedLead.cpName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Phone Number</p>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{selectedLead.cpPhone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sales Team Assignment Section */}
                <div>
                  <h4 className="text-base lg:text-lg font-bold text-gray-900 mb-3 lg:mb-4 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                    Sales Team Assignment
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Assigned Sales Lead</p>
                      {selectedLead.assignedSalesLead ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <p className="text-sm text-gray-900">{selectedLead.assignedSalesLead}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not assigned</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Assignment Status</p>
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                        selectedLead.assignedSalesLead ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedLead.assignedSalesLead ? 'Assigned' : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Transaction Details Modal */}
        {showTransactionModal && selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowTransactionModal(false); setSelectedTransaction(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Transaction Details</h3>
                <button onClick={() => { setShowTransactionModal(false); setSelectedTransaction(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Channel Partner</p>
                  <p className="text-sm text-gray-900">{selectedTransaction.cpName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Type</p>
                  <p className="text-sm text-gray-900">{selectedTransaction.type}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Amount</p>
                  <p className="text-sm font-bold text-gray-900">₹{selectedTransaction.amount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    selectedTransaction.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {selectedTransaction.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-900">{selectedTransaction.description}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Date</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedTransaction.date)}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Assign Reward Modal */}
        {showAssignRewardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAssignRewardModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Assign Reward</h3>
                <button onClick={() => setShowAssignRewardModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Channel Partner</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option>Rajesh Kumar</option>
                    <option>Priya Sharma</option>
                    <option>Amit Patel</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Reward Type</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option>Bonus</option>
                    <option>Milestone</option>
                    <option>Special</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Amount</label>
                  <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter amount" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Description</label>
                  <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows="3" placeholder="Enter description"></textarea>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setShowAssignRewardModal(false)}>Cancel</Button>
                  <Button>Assign Reward</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Create/Edit Reward Modal */}
        {showMilestoneModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowMilestoneModal(false)
              setShowEditRewardModal(false)
              setSelectedReward(null)
              setRewardFormData({
                name: '',
                description: '',
                level: '',
                requirement: {
                  type: 'conversions',
                  value: '',
                  description: ''
                },
                rewardAmount: '',
                order: 0,
                isActive: true
              })
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">{showEditRewardModal ? 'Edit Reward' : 'Create Level-wise Reward'}</h3>
                  <button 
                    onClick={() => {
                      setShowMilestoneModal(false)
                      setShowEditRewardModal(false)
                      setSelectedReward(null)
                      setRewardFormData({
                        name: '',
                        description: '',
                        level: '',
                        requirement: {
                          type: 'conversions',
                          value: '',
                          description: ''
                        },
                        rewardAmount: '',
                        order: 0,
                        isActive: true
                      })
                    }} 
                    className="p-2 hover:bg-white/20 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveReward(); }} className="p-6 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
                {/* Reward Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    Reward Name <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={rewardFormData.name}
                    onChange={(e) => setRewardFormData({...rewardFormData, name: e.target.value})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g., First Sale, Rising Star, Pro Partner"
                    required
                  />
                </div>

                {/* Level */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    Level <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={rewardFormData.level}
                    onChange={(e) => setRewardFormData({...rewardFormData, level: e.target.value})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g., Bronze Partner, Silver Partner, Gold Partner"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Description</label>
                  <textarea
                    value={rewardFormData.description}
                    onChange={(e) => setRewardFormData({...rewardFormData, description: e.target.value})}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    rows="3"
                    placeholder="Optional description for this reward"
                  />
                </div>

                {/* Requirement Value */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    Number of Conversions Required <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    value={rewardFormData.requirement.value}
                    onChange={(e) => setRewardFormData({
                      ...rewardFormData, 
                      requirement: {...rewardFormData.requirement, value: e.target.value, type: 'conversions'}
                    })}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g., 1, 5, 10"
                    min="0"
                    required
                  />
                </div>

                {/* Requirement Description */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Requirement Description</label>
                  <input
                    type="text"
                    value={rewardFormData.requirement.description}
                    onChange={(e) => setRewardFormData({
                      ...rewardFormData, 
                      requirement: {...rewardFormData.requirement, description: e.target.value}
                    })}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g., 1 Conversion, 5 Conversions (optional)"
                  />
                </div>

                {/* Reward Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    Reward Amount (₹) <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    value={rewardFormData.rewardAmount}
                    onChange={(e) => setRewardFormData({...rewardFormData, rewardAmount: e.target.value})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g., 150, 350, 1000"
                    min="0"
                    required
                  />
                </div>

                {/* Order */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Display Order</label>
                  <input
                    type="number"
                    value={rewardFormData.order}
                    onChange={(e) => setRewardFormData({...rewardFormData, order: parseInt(e.target.value) || 0})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Lower numbers appear first"
                    min="0"
                  />
                </div>

                {/* Active Status */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Status</label>
                  <select
                    value={rewardFormData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setRewardFormData({...rewardFormData, isActive: e.target.value === 'active'})}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => {
                      setShowMilestoneModal(false)
                      setShowEditRewardModal(false)
                      setSelectedReward(null)
                      setRewardFormData({
                        name: '',
                        description: '',
                        level: '',
                        requirement: {
                          type: 'conversions',
                          value: '',
                          description: ''
                        },
                        rewardAmount: '',
                        order: 0,
                        isActive: true
                      })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {showEditRewardModal ? 'Update Reward' : 'Create Reward'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Reward Confirmation Modal */}
        {showDeleteRewardModal && selectedReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowDeleteRewardModal(false); setSelectedReward(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Delete Reward</h3>
                <button onClick={() => { setShowDeleteRewardModal(false); setSelectedReward(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to delete the reward <span className="font-semibold text-gray-900">"{selectedReward.name}"</span>?
                </p>
                <p className="text-xs text-red-600">This action cannot be undone.</p>
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => { setShowDeleteRewardModal(false); setSelectedReward(null); }}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteReward}>
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Reward Details Modal */}
        {showRewardDetailsModal && selectedReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowRewardDetailsModal(false); setSelectedReward(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Reward Details</h3>
                <button onClick={() => { setShowRewardDetailsModal(false); setSelectedReward(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Level</p>
                  <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800">
                    {selectedReward.level}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Reward Name</p>
                  <p className="text-sm text-gray-900">{selectedReward.name}</p>
                </div>
                {selectedReward.description && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Description</p>
                    <p className="text-sm text-gray-900">{selectedReward.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Requirement</p>
                  <p className="text-sm text-gray-900">
                    {selectedReward.requirement?.value} {selectedReward.requirement?.value === 1 ? 'Conversion' : 'Conversions'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Reward Amount</p>
                  <p className="text-sm font-bold text-purple-600">₹{(selectedReward.rewardAmount || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Channel Partners Won</p>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    {selectedReward.winnersCount || 0} CPs
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    selectedReward.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedReward.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Leads List Modal */}
        {showLeadsListModal && selectedCPForLeads && selectedStatusForLeads && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowLeadsListModal(false)
              setSelectedCPForLeads(null)
              setSelectedStatusForLeads(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">
                      {selectedStatusForLeads === 'hot' ? 'Hot' : 
                       selectedStatusForLeads === 'connected' ? 'Connected' :
                       selectedStatusForLeads === 'converted' ? 'Converted' :
                       selectedStatusForLeads === 'lost' ? 'Lost' :
                       selectedStatusForLeads === 'sharedWithSales' ? 'Leads Shared with Sales' :
                       selectedStatusForLeads === 'receivedFromSales' ? 'Leads Received from Sales' :
                       'Leads'}
                    </h3>
                    <p className="text-sm text-blue-100 mt-1">
                      {selectedCPForLeads.channelPartner.name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowLeadsListModal(false)
                      setSelectedCPForLeads(null)
                      setSelectedStatusForLeads(null)
                    }}
                    className="p-2 hover:bg-white/20 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 lg:p-6">
                {/* Check if showing shared leads */}
                {selectedStatusForLeads === 'sharedWithSales' ? (
                  selectedCPForLeads.leadSharing?.sharedWithSalesList?.length > 0 ? (
                    <div className="overflow-x-auto -mx-3 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="w-full min-w-[700px] border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[140px]">Name</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[120px]">Contact</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[100px]">Project Type</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[90px]">Value</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[80px]">Status</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[130px]">Shared With</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCPForLeads.leadSharing.sharedWithSalesList.map((lead, index) => (
                            <tr key={lead.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    {lead.name?.charAt(0).toUpperCase() || 'N'}
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900 truncate">{lead.name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-xs text-gray-600">
                                  <div>{lead.phone || 'N/A'}</div>
                                  {lead.email && <div className="text-gray-500 mt-1 truncate">{lead.email}</div>}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {lead.projectType || 'N/A'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-xs font-semibold text-gray-900">
                                  {lead.value > 0 ? `₹${lead.value.toLocaleString('en-IN')}` : 'N/A'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {lead.status && (
                                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                    lead.status === 'converted' ? 'bg-green-100 text-green-800' :
                                    lead.status === 'lost' || lead.status === 'not_converted' ? 'bg-gray-100 text-gray-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {lead.status}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {lead.sharedWith && lead.sharedWith.length > 0 ? (
                                  <div className="space-y-1">
                                    {lead.sharedWith.map((share, idx) => (
                                      <div key={idx} className="text-xs text-purple-700">
                                        <div className="font-medium">{share.salesName || 'N/A'}</div>
                                        {share.sharedAt && (
                                          <div className="text-purple-600 text-[10px]">{formatDate(share.sharedAt)}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No leads shared with sales found for this channel partner</p>
                    </div>
                  )
                ) : selectedStatusForLeads === 'receivedFromSales' ? (
                  selectedCPForLeads.leadSharing?.receivedFromSalesList?.length > 0 ? (
                    <div className="overflow-x-auto -mx-3 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="w-full min-w-[700px] border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[140px]">Name</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[120px]">Contact</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[100px]">Project Type</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[90px]">Value</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[80px]">Status</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[130px]">Received From</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCPForLeads.leadSharing.receivedFromSalesList.map((lead, index) => (
                            <tr key={lead.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    {lead.name?.charAt(0).toUpperCase() || 'N'}
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900 truncate">{lead.name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-xs text-gray-600">
                                  <div>{lead.phone || 'N/A'}</div>
                                  {lead.email && <div className="text-gray-500 mt-1 truncate">{lead.email}</div>}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {lead.projectType || 'N/A'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-xs font-semibold text-gray-900">
                                  {lead.value > 0 ? `₹${lead.value.toLocaleString('en-IN')}` : 'N/A'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {lead.status && (
                                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                    lead.status === 'converted' ? 'bg-green-100 text-green-800' :
                                    lead.status === 'lost' || lead.status === 'not_converted' ? 'bg-gray-100 text-gray-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {lead.status}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {lead.receivedFrom && lead.receivedFrom.length > 0 ? (
                                  <div className="space-y-1">
                                    {lead.receivedFrom.map((received, idx) => (
                                      <div key={idx} className="text-xs text-indigo-700">
                                        <div className="font-medium">{received.sharedByName || 'N/A'}</div>
                                        {received.sharedAt && (
                                          <div className="text-indigo-600 text-[10px]">{formatDate(received.sharedAt)}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No leads received from sales found for this channel partner</p>
                    </div>
                  )
                ) : selectedCPForLeads.leadsByStatus?.[selectedStatusForLeads]?.length > 0 ? (
                  <div className="overflow-x-auto -mx-3 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <table className="w-full min-w-[800px] border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[140px]">Name</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[120px]">Contact</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[100px]">Project Type</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[90px]">Value</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[80px]">Status</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[80px]">Priority</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 min-w-[100px]">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCPForLeads.leadsByStatus[selectedStatusForLeads].map((lead, index) => (
                          <tr key={lead.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {lead.name?.charAt(0).toUpperCase() || 'N'}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{lead.name || 'N/A'}</div>
                                  {lead.client && (
                                    <div className="text-[10px] text-green-600 mt-0.5">Client: {lead.client.name}</div>
                                  )}
                                  {lead.lostReason && (
                                    <div className="text-[10px] text-gray-500 mt-0.5 truncate">{lead.lostReason}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-xs text-gray-600">
                                <div>{lead.phone || 'N/A'}</div>
                                {lead.email && <div className="text-gray-500 mt-1 truncate">{lead.email}</div>}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {lead.projectType || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs font-semibold text-gray-900">
                                {lead.value > 0 ? `₹${lead.value.toLocaleString('en-IN')}` : 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {lead.status && (
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  lead.status === 'converted' ? 'bg-green-100 text-green-800' :
                                  lead.status === 'lost' || lead.status === 'not_converted' ? 'bg-gray-100 text-gray-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {lead.status}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {lead.priority && (
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  lead.priority === 'urgent' || lead.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {lead.priority}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-xs text-gray-600">
                                {lead.createdAt && <div>{formatDate(lead.createdAt)}</div>}
                                {lead.convertedAt && (
                                  <div className="text-green-600 mt-0.5">Converted: {formatDate(lead.convertedAt)}</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No {selectedStatusForLeads} leads found for this channel partner</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Converted Client View Modal */}
        {showConvertedClientModal && selectedConvertedClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowConvertedClientModal(false); setSelectedConvertedClient(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-teal-600 to-green-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedConvertedClient.clientName}</h3>
                    <p className="text-sm text-teal-100 mt-1">{selectedConvertedClient.projectType}</p>
                  </div>
                  <button 
                    onClick={() => { setShowConvertedClientModal(false); setSelectedConvertedClient(null); }} 
                    className="p-2 hover:bg-white/20 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Client Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Client Name</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedConvertedClient.clientName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Project Type</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedConvertedClient.projectType}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Channel Partner</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedConvertedClient.cpName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">CP ID</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedConvertedClient.cpId}</p>
                    </div>
                  </div>
                </div>

                {/* Project Status */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Project Status</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Status</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          selectedConvertedClient.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          selectedConvertedClient.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedConvertedClient.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="text-blue-600 font-semibold">{selectedConvertedClient.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${selectedConvertedClient.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 mb-1">Total Value</p>
                      <p className="text-sm font-bold text-gray-900">₹{selectedConvertedClient.totalValue.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-green-700 mb-1">Paid Amount</p>
                      <p className="text-sm font-bold text-green-800">₹{selectedConvertedClient.paidAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-red-700 mb-1">Pending</p>
                      <p className="text-sm font-bold text-red-800">₹{selectedConvertedClient.pendingAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-purple-700 mb-1">Commission</p>
                      <p className="text-sm font-bold text-purple-800">₹{selectedConvertedClient.commissionEarned.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h4>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      selectedConvertedClient.paymentStatus === 'Fully Paid' ? 'bg-green-100 text-green-800' :
                      selectedConvertedClient.paymentStatus === 'Partial Paid' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedConvertedClient.paymentStatus}
                    </span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      selectedConvertedClient.commissionStatus === 'Credited' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      Commission: {selectedConvertedClient.commissionStatus}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Assign Team Lead Modal */}
        {showAssignTeamLeadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => { 
              setShowAssignTeamLeadModal(false)
              setSelectedCPForTeamLead(null)
              setSelectedTeamLeadId('')
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedCPForTeamLead ? 'Edit Team Lead Assignment' : 'Assign Team Lead'}
                </h3>
                <button 
                  onClick={() => { 
                    setShowAssignTeamLeadModal(false)
                    setSelectedCPForTeamLead(null)
                    setSelectedTeamLeadId('')
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Channel Partner {selectedCPForTeamLead && <span className="text-gray-500">(Selected)</span>}
                  </label>
                  {selectedCPForTeamLead ? (
                    <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {selectedCPForTeamLead.cpName?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{selectedCPForTeamLead.cpName}</p>
                      </div>
                    </div>
                  ) : (
                    <SearchableDropdown
                      options={teamLeadAssignments}
                      value={selectedCPForTeamLead?.cpId || ''}
                      onChange={(cpId) => {
                        const cp = teamLeadAssignments.find(a => a.cpId === cpId)
                        if (cp) {
                          setSelectedCPForTeamLead(cp)
                          setSelectedTeamLeadId(cp.salesTeamLeadId || '')
                        }
                      }}
                      placeholder="Select Channel Partner"
                      getOptionLabel={(cp) => cp?.cpName || ''}
                      getOptionValue={(cp) => cp?.cpId || ''}
                    />
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Sales Team Lead</label>
                  {loadingTeamLeads ? (
                    <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center">
                      <Loading size="small" />
                    </div>
                  ) : (
                    <SearchableDropdown
                      options={salesTeamLeads}
                      value={selectedTeamLeadId}
                      onChange={setSelectedTeamLeadId}
                      placeholder="Select Sales Team Lead"
                      getOptionLabel={(lead) => `${lead.name}${lead.email ? ` (${lead.email})` : ''}`}
                      getOptionValue={(lead) => lead.id || lead._id || ''}
                      disabled={loadingTeamLeads}
                    />
                  )}
                  {salesTeamLeads.length === 0 && !loadingTeamLeads && (
                    <p className="text-xs text-gray-500 mt-1">No sales team leads available</p>
                  )}
                </div>
                {selectedTeamLeadId && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Note:</p>
                    <p className="text-xs text-blue-700">
                      A single sales team lead can be assigned to multiple channel partners. This assignment will be saved immediately.
                    </p>
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => { 
                      setShowAssignTeamLeadModal(false)
                      setSelectedCPForTeamLead(null)
                      setSelectedTeamLeadId('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAssignTeamLead}
                    disabled={!selectedCPForTeamLead || !selectedTeamLeadId || loadingTeamLeads}
                  >
                    {selectedCPForTeamLead?.salesTeamLeadId ? 'Update Assignment' : 'Assign Team Lead'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Assign Team Lead Modal */}
        {showAssignTeamLeadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => { 
              setShowAssignTeamLeadModal(false)
              setSelectedCPForTeamLead(null)
              setSelectedTeamLeadId('')
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedCPForTeamLead ? 'Edit Team Lead Assignment' : 'Assign Team Lead'}
                </h3>
                <button 
                  onClick={() => { 
                    setShowAssignTeamLeadModal(false)
                    setSelectedCPForTeamLead(null)
                    setSelectedTeamLeadId('')
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Channel Partner {selectedCPForTeamLead && <span className="text-gray-500">(Selected)</span>}
                  </label>
                  {selectedCPForTeamLead ? (
                    <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {selectedCPForTeamLead.cpName?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{selectedCPForTeamLead.cpName}</p>
                      </div>
                    </div>
                  ) : (
                    <SearchableDropdown
                      options={teamLeadAssignments}
                      value={selectedCPForTeamLead?.cpId || ''}
                      onChange={(cpId) => {
                        const cp = teamLeadAssignments.find(a => a.cpId === cpId)
                        if (cp) {
                          setSelectedCPForTeamLead(cp)
                          setSelectedTeamLeadId(cp.salesTeamLeadId || '')
                        }
                      }}
                      placeholder="Select Channel Partner"
                      getOptionLabel={(cp) => cp?.cpName || ''}
                      getOptionValue={(cp) => cp?.cpId || ''}
                    />
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Sales Team Lead</label>
                  {loadingTeamLeads ? (
                    <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center">
                      <Loading size="small" />
                    </div>
                  ) : (
                    <SearchableDropdown
                      options={salesTeamLeads}
                      value={selectedTeamLeadId}
                      onChange={setSelectedTeamLeadId}
                      placeholder="Select Sales Team Lead"
                      getOptionLabel={(lead) => `${lead.name}${lead.email ? ` (${lead.email})` : ''}`}
                      getOptionValue={(lead) => lead.id || lead._id || ''}
                      disabled={loadingTeamLeads}
                    />
                  )}
                  {salesTeamLeads.length === 0 && !loadingTeamLeads && (
                    <p className="text-xs text-gray-500 mt-1">No sales team leads available</p>
                  )}
                </div>
                {selectedTeamLeadId && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Note:</p>
                    <p className="text-xs text-blue-700">
                      A single sales team lead can be assigned to multiple channel partners. This assignment will be saved immediately.
                    </p>
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => { 
                      setShowAssignTeamLeadModal(false)
                      setSelectedCPForTeamLead(null)
                      setSelectedTeamLeadId('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAssignTeamLead}
                    disabled={!selectedCPForTeamLead || !selectedTeamLeadId || loadingTeamLeads}
                  >
                    {selectedCPForTeamLead?.salesTeamLeadId ? 'Update Assignment' : 'Assign Team Lead'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Quotation Create/Edit Modal */}
        {showQuotationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowQuotationModal(false)
              setEditingQuotation(null)
              resetQuotationForm()
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingQuotation ? 'Edit Quotation' : 'Create Quotation'}
                </h3>
                <button
                  onClick={() => {
                    setShowQuotationModal(false)
                    setEditingQuotation(null)
                    resetQuotationForm()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={quotationFormData.title}
                    onChange={(e) => setQuotationFormData({ ...quotationFormData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter quotation title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={quotationFormData.category}
                      onChange={(e) => setQuotationFormData({ ...quotationFormData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Website, Mobile App, E-commerce, Taxi, CRM, ERP..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      Status
                    </label>
                    <select
                      value={quotationFormData.status}
                      onChange={(e) => setQuotationFormData({ ...quotationFormData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Price (INR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={quotationFormData.price}
                    onChange={(e) => setQuotationFormData({ ...quotationFormData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Description
                  </label>
                  <textarea
                    value={quotationFormData.description}
                    onChange={(e) => setQuotationFormData({ ...quotationFormData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter quotation description"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    PDF Document
                  </label>
                  
                  {/* Show existing PDF or newly selected file */}
                  {quotationFormData.pdfDocument ? (
                    <div className="mb-3 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-shrink-0">
                            {quotationFormData.pdfDocument instanceof File ? (
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FileText className="h-6 w-6 text-blue-600" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            {quotationFormData.pdfDocument instanceof File ? (
                              <>
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {quotationFormData.pdfDocument.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(quotationFormData.pdfDocument.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                                </p>
                              </>
                            ) : quotationFormData.pdfDocument.secure_url ? (
                              <>
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {quotationFormData.pdfDocument.originalName || 'PDF Document'}
                                </p>
                                <a
                                  href={quotationFormData.pdfDocument.secure_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <FileText className="h-3 w-3" />
                                  View current PDF
                                </a>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuotationFormData({ ...quotationFormData, pdfDocument: null })
                            // Reset file input
                            const fileInput = document.querySelector('input[type="file"][accept=".pdf"]')
                            if (fileInput) fileInput.value = ''
                          }}
                          className="ml-3 p-1.5 hover:bg-red-100 rounded-full transition-colors"
                          title="Remove PDF"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <div className="text-center">
                        <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-1">No PDF uploaded</p>
                        <p className="text-xs text-gray-500">Click below to select a PDF file</p>
                      </div>
                    </div>
                  )}

                  {/* File Input */}
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      id="quotation-pdf-upload"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            addToast({ type: 'error', message: 'File size must be less than 10MB' })
                            e.target.value = '' // Reset input
                            return
                          }
                          if (file.type !== 'application/pdf') {
                            addToast({ type: 'error', message: 'Only PDF files are allowed' })
                            e.target.value = '' // Reset input
                            return
                          }
                          setQuotationFormData({ ...quotationFormData, pdfDocument: file })
                          addToast({ type: 'success', message: 'PDF file selected successfully' })
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Supported format: PDF only (Maximum 10MB)
                  </p>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowQuotationModal(false)
                      setEditingQuotation(null)
                      resetQuotationForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingQuotation ? handleUpdateQuotation : handleCreateQuotation}
                    disabled={!quotationFormData.title || !quotationFormData.price || !quotationFormData.category}
                  >
                    {editingQuotation ? 'Update Quotation' : 'Create Quotation'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Admin_channel_partner_management
