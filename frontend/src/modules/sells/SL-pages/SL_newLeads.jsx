import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPhone,
  FiMoreVertical,
  FiFilter,
  FiUser,
  FiSearch,
  FiAlertCircle,
  FiUserCheck,
  FiFileText,
  FiX,
  FiTag,
  FiShare2
} from 'react-icons/fi'
import { salesLeadService } from '../SL-services'
import { getStoredSalesData } from '../SL-services/salesAuthService'
import { useToast } from '../../../contexts/ToastContext'
import SL_navbar from '../SL-components/SL_navbar'

const SL_newLeads = () => {
  const { toast } = useToast()
  const navigate = useNavigate()

  // Team lead flag (only team leads can share leads with CP)
  const [isTeamLead, setIsTeamLead] = useState(false)

  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showActionsMenu, setShowActionsMenu] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState(null)
  const [showConnectedForm, setShowConnectedForm] = useState(false)
  const [selectedLeadForForm, setSelectedLeadForForm] = useState(null)
  const [connectedForm, setConnectedForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    estimatedPrice: '50000',
    quotationSent: false,
    demoSent: false
  })

  // Real lead data state
  const [leadsData, setLeadsData] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoadingLeads, setIsLoadingLeads] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  })

  // Total count for statistics (not affected by pagination)
  const [totalNewLeads, setTotalNewLeads] = useState(0)

  // Share with CP modal state
  const [showShareCpModal, setShowShareCpModal] = useState(false)
  const [leadToShare, setLeadToShare] = useState(null)
  const [assignedCPs, setAssignedCPs] = useState([])
  const [shareSelectedCPId, setShareSelectedCPId] = useState('')
  const [shareSubmitting, setShareSubmitting] = useState(false)

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const cats = await salesLeadService.getLeadCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleProfile = (leadId) => {
    if (!leadId) return
    navigate(`/lead-profile/${leadId}`)
  }

  // Load team lead flag from stored sales data
  useEffect(() => {
    try {
      const stored = getStoredSalesData?.()
      setIsTeamLead(!!stored?.isTeamLead)
    } catch (error) {
      console.error('Failed to read stored sales data', error)
      setIsTeamLead(false)
    }
  }, [])

  // Load assigned channel partners (for team leads)
  const loadAssignedCPs = useCallback(async () => {
    try {
      const cps = await salesLeadService.getAssignedChannelPartners()
      setAssignedCPs(Array.isArray(cps) ? cps : [])
    } catch (error) {
      console.error('Error fetching assigned channel partners:', error)
      toast.error('Failed to load channel partners')
      setAssignedCPs([])
    }
  }, [toast])

  // Fetch leads from API
  const fetchLeads = useCallback(async () => {
    setIsLoadingLeads(true)
    try {
      const params = {
        status: 'new',
        page: pagination.page,
        limit: pagination.limit
      }

      if (selectedCategory !== 'all') {
        params.category = selectedCategory
      }

      if (searchTerm) {
        params.search = searchTerm
      }

      if (selectedFilter !== 'all') {
        params.timeFrame = selectedFilter
      }

      const response = await salesLeadService.getLeadsByStatus('new', params)
      const data = Array.isArray(response?.data) ? response?.data : []
      const page = response?.page || params?.page || 1
      const limit = response?.limit || params?.limit || 12
      const total = typeof response?.total === 'number' ? response.total : data.length
      const pages = response?.pages ?? Math.max(1, Math.ceil(total / limit))

      setLeadsData(data)
      setPagination({
        page,
        limit,
        total,
        pages
      })
      // Store total count for statistics display
      setTotalNewLeads(total)
    } catch (error) {
      console.error('Error fetching leads:', error)
      // Show error message
      toast.error('Unable to load leads. Please check your connection.')
    } finally {
      setIsLoadingLeads(false)
    }
  }, [selectedCategory, searchTerm, selectedFilter, pagination.page, pagination.limit, toast])

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [selectedCategory, searchTerm, selectedFilter])

  // Fetch categories and leads on component mount and when filters change
  useEffect(() => {
    fetchCategories()
    fetchLeads()
  }, [fetchLeads])

  const filters = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'Last 7 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All' }
  ]

  // Since we're fetching filtered data from API, we don't need client-side filtering
  // The API handles search and category filtering
  const filteredLeads = leadsData

  // Get category info helper
  const getCategoryInfo = (categoryIdOrObject) => {
    // Handle null/undefined
    if (!categoryIdOrObject) {
      return { name: 'Unknown', color: '#999999', icon: '📋' }
    }

    // If category is already populated (object with properties like name, color, icon), return it directly
    if (typeof categoryIdOrObject === 'object' && categoryIdOrObject.name) {
      return {
        name: categoryIdOrObject.name,
        color: categoryIdOrObject.color || '#999999',
        icon: categoryIdOrObject.icon || '📋'
      }
    }

    // If category is an ID (string or ObjectId), find it in categories array
    const categoryId = typeof categoryIdOrObject === 'object' ? categoryIdOrObject._id : categoryIdOrObject
    if (categoryId) {
      const category = categories.find(cat => cat._id === categoryId || cat._id?.toString() === categoryId?.toString())
      if (category) {
        return category
      }
    }

    // Return default if not found
    return { name: 'Unknown', color: '#999999', icon: '📋' }
  }

  const handleCall = (phone) => {
    window.open(`tel:${phone}`, '_self')
  }

  const handleWhatsApp = (phone) => {
    const message = encodeURIComponent("Hello! I'm calling about your inquiry regarding our services. How can I help you today?")
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank')
  }

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      if (newStatus === 'contacted') {
        const targetLead = leadsData.find(l => l._id === leadId)
        if (targetLead) {
          setConnectedForm({
            name: targetLead.name || '',
            description: '',
            categoryId: targetLead.category?._id || targetLead.category || '',
            estimatedPrice: '50000',
            quotationSent: false,
            demoSent: false
          })
        }
        setSelectedLeadForForm(leadId)
        setShowConnectedForm(true)
      } else {
        await salesLeadService.updateLeadStatus(leadId, newStatus)
        toast.success(`Lead status updated to ${newStatus}`)
        // Refresh leads data
        fetchLeads()
        // Refresh dashboard stats if available
        if (window.refreshDashboardStats) {
          window.refreshDashboardStats()
        }
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      toast.error('Failed to update lead status')
    }
    setShowActionsMenu(null)
  }

  const handleNotInterested = async (leadId) => {
    try {
      await salesLeadService.updateLeadStatus(leadId, 'not_interested', 'Not interested')
      toast.success('Lead marked as not interested')
      // Refresh leads data
      fetchLeads()
      // Refresh dashboard stats if available
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      toast.error('Failed to update lead status')
    }
    setShowActionsMenu(null)
  }

  const confirmDelete = async () => {
    if (leadToDelete) {
      try {
        await salesLeadService.updateLeadStatus(leadToDelete, 'not_interested', 'Not interested')
        toast({
          title: 'Success',
          description: 'Lead marked as not interested',
          variant: 'default'
        })
        // Refresh leads data
        fetchLeads()
        // Refresh dashboard stats if available
        if (window.refreshDashboardStats) {
          window.refreshDashboardStats()
        }
      } catch (error) {
        console.error('Error updating lead status:', error)
        toast({
          title: 'Error',
          description: 'Failed to update lead status',
          variant: 'destructive'
        })
      }
    }
    setShowDeleteConfirm(false)
    setLeadToDelete(null)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setLeadToDelete(null)
  }

  const handleConnectedFormChange = (field, value) => {
    setConnectedForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleConnectedFormSubmit = async (e) => {
    e.preventDefault()
    try {
      // First update lead status to connected
      await salesLeadService.updateLeadStatus(selectedLeadForForm, 'connected')

      // Then create lead profile
      const profileData = {
        name: connectedForm.name,
        businessName: connectedForm.name, // Using name as business name for now
        email: '', // Will be filled later if available
        categoryId: connectedForm.categoryId, // Use category (preferred)
        estimatedCost: Math.round(Number(String(connectedForm.estimatedPrice || '').replace(/,/g, '')) || 0),
        description: connectedForm.description,
        quotationSent: connectedForm.quotationSent,
        demoSent: connectedForm.demoSent
      }

      await salesLeadService.createLeadProfile(selectedLeadForForm, profileData)

      toast.success('Lead marked as contacted and profile created')

      // Refresh leads data
      fetchLeads()
      // Refresh dashboard stats if available
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }

      // Close form and reset
      setShowConnectedForm(false)
      setSelectedLeadForForm(null)
      setConnectedForm({
        name: '',
        description: '',
        categoryId: '',
        estimatedPrice: '50000',
        quotationSent: false,
        demoSent: false
      })
    } catch (error) {
      console.error('Error creating lead profile:', error)
      toast.error('Failed to create lead profile')
    }
  }

  const closeConnectedForm = () => {
    setShowConnectedForm(false)
    setSelectedLeadForForm(null)
    setConnectedForm({
      name: '',
      description: '',
      projectType: 'web',
      estimatedPrice: '50000',
      quotationSent: false,
      demoSent: false
    })
  }

  // Mobile Lead Card Component - Simplified
  const MobileLeadCard = ({ lead, isTeamLead, onShareWithCP }) => {
    const categoryInfo = getCategoryInfo(lead.category)

    return (
      <div className="flex items-center justify-between">
        {/* Left Section - Avatar & Phone */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
              <FiUser className="text-white text-sm" />
            </div>
          </div>

          {/* Phone Number & Category */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{lead.phone}</h3>
            {/* Category Tag */}
            <div className="flex items-center space-x-1 mt-1">
              <span className="text-xs text-black">
                {categoryInfo.name}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* Call Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCall(lead.phone)
            }}
            className="bg-white text-teal-600 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-all duration-200 text-xs font-medium"
          >
            Call
          </button>

          {/* WhatsApp Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleWhatsApp(lead.phone)
            }}
            className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c0 5.449-4.434 9.883-9.881 9.883" />
            </svg>
          </button>

          {/* More Options */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowActionsMenu(showActionsMenu === lead._id ? null : lead._id)
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <FiMoreVertical className="text-lg" />
            </button>

            {/* Actions Dropdown */}
            <AnimatePresence>
              {showActionsMenu === lead._id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-36 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                >
                  <div className="py-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStatusChange(lead._id, 'contacted')
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors duration-200"
                    >
                      Contacted
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStatusChange(lead._id, 'not_picked')
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors duration-200"
                    >
                      Not Picked
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleNotInterested(lead._id)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
                    >
                      Not Interested
                    </button>
                    {isTeamLead && onShareWithCP && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowActionsMenu(null)
                          onShareWithCP(lead)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-200 flex items-center gap-2"
                      >
                        <FiShare2 className="text-xs" />
                        Share with CP
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />

      <main className="max-w-4xl mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">

        {/* Responsive Layout */}
        <div>
          {/* Enhanced Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200 rounded-xl p-4 shadow-lg border border-teal-300/40">
              <div className="flex items-center justify-between">
                {/* Left Section - Title and Description */}
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                    <FiUser className="text-white text-lg" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-teal-900">New Leads</h1>
                    <p className="text-teal-700 text-xs">Manage and track your potential customers</p>
                  </div>
                </div>

                {/* Right Section - Total Count */}
                <div className="bg-white/70 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/30">
                  <div className="text-center">
                    <p className="text-xs text-teal-600 font-medium mb-0.5">Total</p>
                    <p className="text-xl font-bold text-teal-900">{totalNewLeads}</p>
                    <p className="text-xs text-teal-600 font-medium">Leads</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>


          {/* Simple Modern Filter Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-4"
          >
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-12 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-200 ${showFilters
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50 border border-teal-200'
                  }`}
              >
                <FiFilter className="text-base" />
              </button>
            </div>
          </motion.div>

          {/* Filters - Conditional Display */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 mb-4"
            >
              {/* Time Filters */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Time Period</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedFilter(filter.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${selectedFilter === filter.id
                          ? 'bg-teal-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filters */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Category</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${selectedCategory === 'all'
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    All Categories
                  </button>
                  {categories.length > 0 ? categories.map((category) => (
                    <button
                      key={category._id}
                      onClick={() => setSelectedCategory(category._id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center space-x-1 ${selectedCategory === category._id
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      style={{
                        backgroundColor: selectedCategory === category._id ? category.color : undefined
                      }}
                    >
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </button>
                  )) : (
                    <div className="text-xs text-gray-500">Loading categories...</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Results Count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-4"
          >
            <p className="text-gray-600 text-sm">
              Showing {filteredLeads.length} of {totalNewLeads} leads
            </p>
          </motion.div>

          {/* Mobile Leads List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-3"
          >
            <AnimatePresence>
              {isLoadingLeads ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No new leads found</p>
                </div>
              ) : (
                filteredLeads.map((lead, index) => (
                  <motion.div
                    key={lead._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
                  >
                    <MobileLeadCard
                      lead={lead}
                      isTeamLead={isTeamLead}
                      onShareWithCP={(selectedLead) => {
                        if (!isTeamLead) return
                        setLeadToShare(selectedLead)
                        setShareSelectedCPId('')
                        setShowShareCpModal(true)
                        if (assignedCPs.length === 0) {
                          loadAssignedCPs()
                        }
                      }}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {/* Empty State */}
            {filteredLeads.length === 0 && !isLoadingLeads && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiSearch className="text-gray-400 text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? 'Try adjusting your search criteria or filters.' : 'No leads match your current filters.'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Mobile Pagination */}
            {pagination.pages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="flex items-center justify-center space-x-2 mt-6"
              >
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>

                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Share lead with CP modal (for team leads) */}
      <AnimatePresence>
        {showShareCpModal && leadToShare && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !shareSubmitting && setShowShareCpModal(false)}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-bold text-purple-900">Share lead with CP</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Only sales team leads can share leads with channel partners.</p>
                </div>
                <button
                  onClick={() => !shareSubmitting && setShowShareCpModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors duration-200"
                >
                  <FiX className="text-base" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Lead summary */}
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                  <p className="text-xs text-purple-700 font-medium mb-1">Lead to share</p>
                  <p className="text-sm font-semibold text-purple-900">
                    {leadToShare.phone || 'Unknown phone'}
                  </p>
                  {leadToShare.name && (
                    <p className="text-xs text-purple-800 mt-0.5">
                      {leadToShare.name}
                    </p>
                  )}
                </div>

                {/* Channel partner select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel partner</label>
                  <select
                    value={shareSelectedCPId}
                    onChange={e => setShareSelectedCPId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  >
                    <option value="">Select channel partner</option>
                    {assignedCPs.map(cp => (
                      <option key={cp._id} value={cp._id}>
                        {cp.name || cp.companyName || 'Channel Partner'}{cp.companyName ? ` (${cp.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                  {assignedCPs.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No channel partners assigned to you. Contact admin to assign CPs before sharing leads.
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200">
                <button
                  onClick={() => !shareSubmitting && setShowShareCpModal(false)}
                  className="px-3 py-2 text-xs sm:text-sm text-gray-700 hover:text-gray-900 transition-colors duration-200"
                  disabled={shareSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!leadToShare || !shareSelectedCPId) {
                      toast.error('Please select a channel partner')
                      return
                    }
                    setShareSubmitting(true)
                    try {
                      const res = await salesLeadService.shareLeadWithCP(leadToShare._id, shareSelectedCPId)
                      if (res?.success) {
                        toast.success(res.message || 'Lead shared with channel partner')
                        setShowShareCpModal(false)
                        const sharedId = leadToShare._id || leadToShare.id
                        setLeadToShare(null)
                        setShareSelectedCPId('')
                        // Remove shared lead from New Leads list so it disappears immediately; it will show under Channel Partner Leads > Shared with CP
                        setLeadsData(prev => prev.filter(l => (l._id || l.id) !== sharedId))
                        setTotalNewLeads(prev => Math.max(0, prev - 1))
                        fetchLeads()
                      } else {
                        toast.error(res?.message || 'Failed to share lead')
                      }
                    } catch (error) {
                      toast.error(error?.message || 'Failed to share lead with channel partner')
                    } finally {
                      setShareSubmitting(false)
                    }
                  }}
                  disabled={shareSubmitting || !shareSelectedCPId}
                  className="px-3 py-2 text-xs sm:text-sm rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-1.5"
                >
                  {shareSubmitting ? 'Sharing…' : (
                    <>
                      <FiShare2 className="text-xs" />
                      Share lead
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Connected Form Dialog */}
      <AnimatePresence>
        {showConnectedForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeConnectedForm}
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-md bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 text-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <FiUserCheck className="text-white text-lg" />
                    </div>
                    <h2 className="text-lg font-bold">Add Connected Lead</h2>
                  </div>
                  <button
                    onClick={closeConnectedForm}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors duration-200"
                  >
                    <FiX className="text-white text-lg" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleConnectedFormSubmit} className="p-6 space-y-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Name</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <FiUser className="text-lg" />
                    </div>
                    <input
                      type="text"
                      value={connectedForm.name}
                      onChange={(e) => handleConnectedFormChange('name', e.target.value)}
                      placeholder="Enter client name"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Description</label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-teal-600">
                      <FiFileText className="text-lg" />
                    </div>
                    <textarea
                      value={connectedForm.description}
                      onChange={(e) => handleConnectedFormChange('description', e.target.value)}
                      placeholder="Enter project description"
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 resize-none"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Category <span className="text-red-500">*</span></label>
                  <select
                    value={connectedForm.categoryId}
                    onChange={(e) => handleConnectedFormChange('categoryId', e.target.value)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
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

                {/* Estimated Price */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Estimated Price</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <span className="text-lg font-bold">₹</span>
                    </div>
                    <input
                      type="text"
                      value={connectedForm.estimatedPrice}
                      onChange={(e) => handleConnectedFormChange('estimatedPrice', e.target.value)}
                      placeholder="Enter amount (e.g., 50000)"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="quotationSent"
                      checked={connectedForm.quotationSent}
                      onChange={(e) => handleConnectedFormChange('quotationSent', e.target.checked)}
                      className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                    />
                    <label htmlFor="quotationSent" className="text-sm font-medium text-gray-700">
                      Quotation sent
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="demoSent"
                      checked={connectedForm.demoSent}
                      onChange={(e) => handleConnectedFormChange('demoSent', e.target.checked)}
                      className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                    />
                    <label htmlFor="demoSent" className="text-sm font-medium text-gray-700">
                      Demo sent
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeConnectedForm}
                    className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 font-medium shadow-lg"
                  >
                    Save Lead
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={cancelDelete}
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 text-white rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <FiAlertCircle className="text-white text-lg" />
                  </div>
                  <h2 className="text-lg font-bold">Confirm Deletion</h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 text-sm mb-4">
                  Are you sure you want to mark this lead as "Not Interested"? This action will permanently delete the lead from your list.
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-700 text-xs font-medium">
                    ⚠️ This action cannot be undone
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 text-sm font-medium"
                  >
                    Delete Lead
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SL_newLeads