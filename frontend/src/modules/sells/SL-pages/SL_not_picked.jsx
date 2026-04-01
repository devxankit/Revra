import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FiPhone,
  FiMoreVertical,
  FiFilter,
  FiUser,
  FiSearch,
  FiAlertCircle,
  FiUserCheck,
  FiMessageCircle,
  FiMail,
  FiPhoneOff,
  FiTag,
  FiLoader,
  FiX,
  FiFileText
} from 'react-icons/fi'
import SL_navbar from '../SL-components/SL_navbar'
import FollowUpDialog from '../SL-components/FollowUpDialog'
import { salesLeadService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'

const SL_not_picked = () => {
  const navigate = useNavigate()
  const { toast } = useToast()

  // State for filters and UI
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [showActionsMenu, setShowActionsMenu] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // State for real data
  const [leadsData, setLeadsData] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // State for Follow-up dialog
  const [showFollowupDialog, setShowFollowupDialog] = useState(false)
  const [selectedLeadForFollowup, setSelectedLeadForFollowup] = useState(null)

  // State for Contacted form modal
  const [showContactedForm, setShowContactedForm] = useState(false)
  const [selectedLeadForForm, setSelectedLeadForForm] = useState(null)
  const [contactedFormData, setContactedFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    estimatedPrice: '50000',
    quotationSent: false,
    demoSent: false
  })

  // Fetch categories and leads on component mount
  useEffect(() => {
    fetchCategories()
    fetchLeads()
  }, [selectedFilter, selectedCategory, searchTerm])

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const cats = await salesLeadService.getLeadCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Fetch leads from API
  const fetchLeads = async () => {
    setIsLoading(true)
    try {
      const params = {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        timeFrame: selectedFilter !== 'all' ? selectedFilter : undefined,
        page: 1,
        limit: 50
      }
      const response = await salesLeadService.getLeadsByStatus('not_picked', params)
      setLeadsData(response?.data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to fetch leads')
      setLeadsData([])
    } finally {
      setIsLoading(false)
    }
  }

  const filters = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Last 7 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All' }
  ]

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

  // Status change handler
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      if (newStatus === 'connected') {
        const targetLead = leadsData.find(l => l._id === leadId)
        if (targetLead) {
          setContactedFormData({
            name: targetLead.name || '',
            description: '',
            categoryId: targetLead.category?._id || targetLead.category || '',
            estimatedPrice: '50000',
            quotationSent: false,
            demoSent: false
          })
        }
        // Show contacted form
        setSelectedLeadForForm(leadId)
        setShowContactedForm(true)
      } else {
        await salesLeadService.updateLeadStatus(leadId, newStatus)
        toast.success(`Lead status updated to ${salesLeadService.getStatusDisplayName(newStatus)}`)

        // Remove lead from current list
        setLeadsData(prev => prev.filter(lead => lead._id !== leadId))

        // Refresh dashboard stats
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

  // Handle follow-up scheduling
  const handleFollowUp = (leadId) => {
    setSelectedLeadForFollowup(leadId)
    setShowFollowupDialog(true)
    setShowActionsMenu(null)
  }

  // Handle follow-up form submission
  const handleFollowUpSubmit = async (followUpData) => {
    try {
      // Convert FollowUpDialog format (followupDate/followupTime) to API format (date/time)
      const followUpPayload = {
        date: followUpData.followupDate,
        time: followUpData.followupTime,
        notes: followUpData.notes || '',
        priority: followUpData.priority || 'medium'
      }
      // Use addFollowUp instead of updateLeadStatus to avoid changing lead status
      await salesLeadService.addFollowUp(selectedLeadForFollowup, followUpPayload)
      toast.success('Follow-up scheduled successfully')

      // Refresh dashboard stats
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }

      setShowFollowupDialog(false)
      setSelectedLeadForFollowup(null)
    } catch (error) {
      console.error('Error scheduling follow-up:', error)
      toast.error('Failed to schedule follow-up')
    }
  }

  // Handle contacted form submission
  const handleContactedFormSubmit = async (e) => {
    e.preventDefault()
    try {
      // First update lead status to connected
      await salesLeadService.updateLeadStatus(selectedLeadForForm, 'connected')

      // Then create/update lead profile
      const profileData = {
        name: contactedFormData.name,
        businessName: contactedFormData.name, // Using name as business name
        email: '', // Will be filled later if available
        categoryId: contactedFormData.categoryId,
        estimatedCost: Math.round(Number(String(contactedFormData.estimatedPrice || '').replace(/,/g, '')) || 0),
        description: contactedFormData.description,
        quotationSent: contactedFormData.quotationSent,
        demoSent: contactedFormData.demoSent
      }

      await salesLeadService.createLeadProfile(selectedLeadForForm, profileData)

      toast.success('Lead marked as contacted and profile created')

      // Remove lead from current list
      setLeadsData(prev => prev.filter(lead => lead._id !== selectedLeadForForm))

      // Refresh dashboard stats
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }

      // Reset form and close modal
      setContactedFormData({
        name: '',
        description: '',
        categoryId: '',
        estimatedPrice: '50000',
        quotationSent: false,
        demoSent: false
      })
      setShowContactedForm(false)
      setSelectedLeadForForm(null)

    } catch (error) {
      console.error('Error creating lead profile:', error)
      toast.error('Failed to create lead profile')
    }
  }

  const handleContactedFormChange = (field, value) => {
    setContactedFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const closeContactedForm = () => {
    setShowContactedForm(false)
    setSelectedLeadForForm(null)
    setContactedFormData({
      name: '',
      description: '',
      categoryId: '',
      estimatedPrice: '50000',
      quotationSent: false,
      demoSent: false
    })
  }

  const handleCall = (phone) => {
    window.open(`tel:${phone}`, '_self')
  }

  const handleWhatsApp = (phone) => {
    const message = encodeURIComponent("Hello! I'm following up on our previous conversation. How can I help you today?")
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank')
  }

  const handleProfile = (leadId) => {
    navigate(`/lead-profile/${leadId}`)
  }

  const handleCardClick = (lead) => {
    if (lead.leadProfile) {
      handleProfile(lead._id)
    } else {
      setSelectedLeadForForm(lead._id)
      setShowContactedForm(true)
    }
  }

  // Mobile Lead Card Component - same style as New Leads: phone-first, Connect form like New Leads
  const MobileLeadCard = ({ lead }) => {
    const categoryInfo = getCategoryInfo(lead.category)
    return (
      <div
        className="flex items-center justify-between cursor-pointer p-4 hover:bg-gray-50 transition-colors duration-200"
        onClick={() => handleCardClick(lead)}
      >
        {/* Left: Avatar & Phone (like New Leads - no profile so show number) */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center">
              <FiPhoneOff className="text-white text-sm" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{lead.phone}</h3>
            <div className="flex items-center space-x-1 mt-1 flex-wrap gap-x-2">
              <span className="text-xs text-gray-600">{categoryInfo.name}</span>
              {lead.attempts != null && <span className="text-xs text-rose-600">{lead.attempts} attempts</span>}
              {lead.lastAttempt && <span className="text-xs text-gray-500">{lead.lastAttempt}</span>}
            </div>
          </div>
        </div>
        {/* Actions: Call, WhatsApp, Connect, More */}
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          {/* Call Button */}
          <button onClick={() => handleCall(lead.phone)} className="bg-white text-teal-600 border border-teal-200 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 text-xs font-medium">Call</button>
          <button onClick={() => handleWhatsApp(lead.phone)} className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c0 5.449-4.434 9.883-9.881 9.883" /></svg>
          </button>
          <button onClick={() => { setSelectedLeadForForm(lead._id); setShowContactedForm(true) }} className="bg-teal-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-teal-600 text-xs font-medium">Connect</button>
          <div className="relative">
            <button onClick={() => setShowActionsMenu(showActionsMenu === lead._id ? null : lead._id)} className="text-gray-400 hover:text-gray-600 p-1"><FiMoreVertical className="w-4 h-4" /></button>
            <AnimatePresence>
              {showActionsMenu === lead._id && (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} transition={{ duration: 0.2 }} className="absolute right-0 top-full mt-2 w-36 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="py-1.5">
                    <button onClick={() => handleStatusChange(lead._id, 'connected')} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700">Mark Contacted</button>
                    <button onClick={() => handleFollowUp(lead._id)} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700">Follow Up</button>
                    <button onClick={() => handleStatusChange(lead._id, 'not_interested')} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700">Not Interested</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  // Desktop Lead Card Component - same style: phone-first, Connect button
  const DesktopLeadCard = ({ lead }) => {
    const categoryInfo = getCategoryInfo(lead.category)
    return (
      <div className="p-4 flex items-center justify-between border-b border-gray-100 last:border-b-0">
        <div className="flex items-center space-x-3 flex-1 min-w-0" onClick={() => handleCardClick(lead)}>
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center">
              <FiPhoneOff className="text-white text-lg" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{lead.phone}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-600">{categoryInfo.name}</span>
              {lead.attempts != null && <span className="text-xs text-rose-600">{lead.attempts} attempts</span>}
              {lead.lastAttempt && <span className="text-xs text-gray-500">{lead.lastAttempt}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleCall(lead.phone)} className="px-3 py-1.5 bg-white text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 text-sm font-medium flex items-center space-x-1"><FiPhone className="w-4 h-4" /><span>Call</span></button>
          <button onClick={() => handleWhatsApp(lead.phone)} className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c0 5.449-4.434 9.883-9.881 9.883" /></svg>
            <span>WhatsApp</span>
          </button>
          <button onClick={() => { setSelectedLeadForForm(lead._id); setShowContactedForm(true) }} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm font-medium">Connect</button>
          <div className="relative">
            <button onClick={() => setShowActionsMenu(showActionsMenu === lead._id ? null : lead._id)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><FiMoreVertical className="w-4 h-4" /></button>
            <AnimatePresence>
              {showActionsMenu === lead._id && (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} transition={{ duration: 0.2 }} className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="py-1.5">
                    <button onClick={() => handleStatusChange(lead._id, 'connected')} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700">Mark Contacted</button>
                    <button onClick={() => handleFollowUp(lead._id)} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700">Follow Up</button>
                    <button onClick={() => handleStatusChange(lead._id, 'not_interested')} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700">Not Interested</button>
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
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 shadow-md border border-rose-200/30">
              <div className="flex items-center justify-between">
                {/* Left Section - Icon and Text */}
                <div className="flex items-center space-x-3 flex-1">
                  {/* Icon */}
                  <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center shadow-md">
                    <FiPhoneOff className="text-white text-lg" />
                  </div>

                  {/* Text Content */}
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-rose-900 leading-tight">
                      Not Picked<br />Leads
                    </h1>
                    <p className="text-rose-700 text-xs font-medium mt-0.5">
                      Leads that didn't answer calls
                    </p>
                  </div>
                </div>

                {/* Right Section - Total Count Card */}
                <div className="bg-white rounded-lg px-4 py-3 shadow-md border border-white/20 ml-3">
                  <div className="text-center">
                    <p className="text-xs text-rose-600 font-medium mb-0.5">Total</p>
                    <p className="text-2xl font-bold text-rose-900 leading-none">{leadsData.length}</p>
                    <p className="text-xs text-rose-600 font-medium mt-0.5">Not Picked</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Simple Filter Section */}
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
                  {categories.map((category) => (
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
                  ))}
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
              Showing {leadsData.length} not picked leads
            </p>
          </motion.div>

          {/* Mobile Leads List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-3"
          >
            {isLoading ? (
              // Loading skeleton
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="w-12 h-6 bg-gray-200 rounded"></div>
                        <div className="w-6 h-6 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence>
                {leadsData.map((lead, index) => (
                  <motion.div
                    key={lead._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
                  >
                    <MobileLeadCard lead={lead} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {/* Empty State */}
            {leadsData.length === 0 && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiPhoneOff className="text-gray-400 text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No not picked leads found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? 'Try adjusting your search criteria or filters.' : 'No not picked leads match your current filters.'}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
      {/* Contacted Form Modal */}
      <AnimatePresence>
        {showContactedForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeContactedForm}
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
                    <h2 className="text-lg font-bold">Mark as Contacted</h2>
                  </div>
                  <button
                    onClick={closeContactedForm}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors duration-200"
                  >
                    <FiX className="text-white text-lg" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleContactedFormSubmit} className="p-6 space-y-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Name</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <FiUser className="text-lg" />
                    </div>
                    <input
                      type="text"
                      value={contactedFormData.name}
                      onChange={(e) => handleContactedFormChange('name', e.target.value)}
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
                      value={contactedFormData.description}
                      onChange={(e) => handleContactedFormChange('description', e.target.value)}
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
                    value={contactedFormData.categoryId}
                    onChange={(e) => handleContactedFormChange('categoryId', e.target.value)}
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
                      value={contactedFormData.estimatedPrice}
                      onChange={(e) => handleContactedFormChange('estimatedPrice', e.target.value)}
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
                      checked={contactedFormData.quotationSent}
                      onChange={(e) => handleContactedFormChange('quotationSent', e.target.checked)}
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
                      checked={contactedFormData.demoSent}
                      onChange={(e) => handleContactedFormChange('demoSent', e.target.checked)}
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
                    onClick={closeContactedForm}
                    className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 font-medium shadow-lg"
                  >
                    Mark as Contacted
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Follow-up Dialog */}
      <FollowUpDialog
        isOpen={showFollowupDialog}
        onClose={() => setShowFollowupDialog(false)}
        onSubmit={handleFollowUpSubmit}
        title="Schedule Follow-up"
        submitText="Schedule Follow-up"
      />
    </div>
  )
}

export default SL_not_picked
