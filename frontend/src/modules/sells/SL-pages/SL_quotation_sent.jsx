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
  FiFileText,
  FiTag,
  FiLoader,
  FiX,
  FiCheckCircle
} from 'react-icons/fi'
import SL_navbar from '../SL-components/SL_navbar'
import { salesLeadService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'

const SL_quotation_sent = () => {
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
  
  // State for Conversion form modal
  const [showConversionForm, setShowConversionForm] = useState(false)
  const [selectedLeadForConversion, setSelectedLeadForConversion] = useState(null)
  const [conversionFormData, setConversionFormData] = useState({
    projectName: '',
    categoryId: '',
    totalCost: '',
    finishedDays: '',
    advanceReceived: '',
    includeGST: false,
    clientDateOfBirth: '',
    description: ''
  })
  const [showGSTConfirmModal, setShowGSTConfirmModal] = useState(false)

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
      const response = await salesLeadService.getLeadsByStatus('quotation_sent', params)
      
      // Normalize leads array from response shape
      // Backend returns: { success: true, data: [...leads], count, total, page, pages, status }
      const leads = Array.isArray(response?.data) ? response?.data : []
      setLeadsData(leads)
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to fetch leads')
      setLeadsData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Client-side filtered list for quick search display (based on fetched leads)
  const filteredLeads = leadsData.filter((lead) => {
    const name = (lead.name || lead.leadProfile?.name || '').toLowerCase()
    const company = (lead.company || lead.leadProfile?.businessName || '').toLowerCase()
    const phone = lead.phone || ''
    const q = (searchTerm || '').toLowerCase()
    return name.includes(q) || company.includes(q) || phone.includes(searchTerm || '')
  })

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
      await salesLeadService.updateLeadStatus(leadId, newStatus)
      toast.success(`Lead status updated to ${salesLeadService.getStatusDisplayName(newStatus)}`)
      
      // Remove lead from current list
      setLeadsData(prev => prev.filter(lead => lead._id !== leadId))
      
      // Refresh dashboard stats
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      toast.error('Failed to update lead status')
    }
    setShowActionsMenu(null)
  }

  // Handle conversion
  const handleConvertLead = (leadId) => {
    setSelectedLeadForConversion(leadId)
    setShowConversionForm(true)
    setShowActionsMenu(null)
  }

  // Handle conversion form submission
  const parseAmount = (val) => Math.round(Number(String(val || '').replace(/,/g, '')) || 0)
  const handleConversionFormSubmit = async (e) => {
    e.preventDefault()
    const baseCost = parseAmount(conversionFormData.totalCost)
    if (!conversionFormData.totalCost || baseCost <= 0) {
      toast.error('Please enter a valid project cost (greater than zero)')
      return
    }
    const totalCostNum = conversionFormData.includeGST ? Math.round(baseCost * 1.18) : baseCost
    try {
      const payload = {
        projectName: conversionFormData.projectName.trim(),
        categoryId: conversionFormData.categoryId,
        totalCost: totalCostNum,
        finishedDays: conversionFormData.finishedDays ? parseInt(conversionFormData.finishedDays, 10) : undefined,
        advanceReceived: parseAmount(conversionFormData.advanceReceived),
        includeGST: conversionFormData.includeGST || false,
        clientDateOfBirth: conversionFormData.clientDateOfBirth || undefined,
        description: (conversionFormData.description || '').trim()
      }
      await salesLeadService.convertLeadToClient(selectedLeadForConversion, payload)
      
      toast.success('Lead converted to client successfully')
      
      // Remove lead from current list
      setLeadsData(prev => prev.filter(lead => lead._id !== selectedLeadForConversion))
      
      // Refresh dashboard stats
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }
      
      // Reset form and close modal
      setConversionFormData({
        projectName: '',
        categoryId: '',
        totalCost: '',
        finishedDays: '',
        advanceReceived: '',
        includeGST: false,
        clientDateOfBirth: '',
        description: ''
      })
      setShowConversionForm(false)
      setSelectedLeadForConversion(null)
      
    } catch (error) {
      console.error('Error converting lead:', error)
      toast.error('Failed to convert lead')
    }
  }

  const handleCall = (phone) => {
    window.open(`tel:${phone}`, '_self')
  }

  const handleWhatsApp = (phone) => {
    const message = encodeURIComponent("Hello! I'm following up on the quotation I sent. Do you have any questions?")
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank')
  }

  const handleProfile = (leadId) => {
    navigate(`/lead-profile/${leadId}`)
  }

  // Helper function for priority color
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-green-500'
      default: return 'text-gray-400'
    }
  }

  // Mobile Lead Card Component (Responsive for all screen sizes)
  const MobileLeadCard = ({ lead }) => {
    const categoryInfo = getCategoryInfo(lead.category)
    const activities = salesLeadService.getLeadActivities(lead)
    
    return (
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => {
          if (lead.leadProfile) {
            handleProfile(lead._id)
          } else {
            toast.error('This lead doesn\'t have a profile. Please connect to the lead first to create a profile.')
          }
        }}
      >
        {/* Left Section - Avatar & Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <FiFileText className="text-white text-xs" />
            </div>
            <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full flex items-center justify-center ${getPriorityColor(lead.priority)}`}>
              <div className={`w-1 h-1 rounded-full ${getPriorityColor(lead.priority).replace('text', 'bg')}`}></div>
          </div>
        </div>

          {/* Name, Phone & Category */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {lead.leadProfile?.name || lead.name || 'Unknown'}
          </h3>
            <p className="text-sm text-gray-600 truncate">{lead.phone}</p>
            {/* Category Tag & Activity Indicators */}
            <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
              <span className="text-xs text-black">
                {categoryInfo.name}
              </span>
              {/* Activity Indicators */}
              {activities.map((activity, idx) => (
                <span key={idx} className={`text-xs px-2 py-0.5 rounded-full font-medium ${activity.color}`}>
                  {activity.label}
            </span>
              ))}
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
            className="bg-white text-teal-600 border border-teal-200 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 transition-all duration-200 text-xs font-medium"
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
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c0 5.449-4.434 9.883-9.881 9.883"/>
            </svg>
          </button>

          {/* Profile Button - Only show if lead has profile */}
          {lead.leadProfile && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleProfile(lead._id)
              }}
              className="bg-teal-500 text-white p-1.5 rounded-lg hover:bg-teal-600 transition-all duration-200"
            >
              <FiUser className="w-3.5 h-3.5" />
            </button>
          )}

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
                  transition={{ duration: 0.2}}
                className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                >
                  <div className="py-1">
                    <button
                      onClick={() => handleStatusChange(lead._id, 'connected')}
                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors duration-200"
                    >
                      Contacted
                    </button>
                    <button
                      onClick={() => handleStatusChange(lead._id, 'hot')}
                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
                    >
                      Hot Lead
                    </button>
                    <button
                    onClick={() => handleStatusChange(lead._id, 'demo_sent')}
                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-200"
                    >
                    Demo Sent
                    </button>
                    <button
                      onClick={() => handleConvertLead(lead._id)}
                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors duration-200"
                    >
                      Converted
                    </button>
                    <button
                    onClick={() => handleStatusChange(lead._id, 'not_interested')}
                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-700 transition-colors duration-200"
                    >
                      Not Interested
                    </button>
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
             <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-md border border-blue-200/30">
               <div className="flex items-center justify-between">
                 {/* Left Section - Icon and Text */}
                 <div className="flex items-center space-x-3 flex-1">
                   {/* Icon */}
                   <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                     <FiFileText className="text-white text-lg" />
                   </div>
                   
                   {/* Text Content */}
                   <div className="flex-1">
                     <h1 className="text-xl font-bold text-blue-900 leading-tight">
                       Quotation<br />Sent
                     </h1>
                     <p className="text-blue-700 text-xs font-medium mt-0.5">
                       Leads with quotations sent
                     </p>
                   </div>
                 </div>
                 
                 {/* Right Section - Total Count Card */}
                 <div className="bg-white rounded-lg px-4 py-3 shadow-md border border-white/20 ml-3">
                   <div className="text-center">
                     <p className="text-xs text-blue-600 font-medium mb-0.5">Total</p>
                     <p className="text-2xl font-bold text-blue-900 leading-none">{leadsData.length}</p>
                     <p className="text-xs text-blue-600 font-medium mt-0.5">Quotations</p>
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
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-200 ${
                  showFilters 
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        selectedFilter === filter.id
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedCategory === 'all'
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center space-x-1 ${
                        selectedCategory === category._id
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
              Showing {filteredLeads.length} of {leadsData.length} quotation leads
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

            {/* Empty State */}
            {filteredLeads.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiFileText className="text-gray-400 text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No quotation leads found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? 'Try adjusting your search criteria or filters.' : 'No quotation leads match your current filters.'}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
      {/* Conversion Form Modal */}
      <AnimatePresence>
        {showConversionForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Convert Lead to Client</h3>
                <button
                  type="button"
                  onClick={() => { setShowConversionForm(false); setShowGSTConfirmModal(false) }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConversionFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={conversionFormData.projectName}
                    onChange={(e) => setConversionFormData(prev => ({ ...prev, projectName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={conversionFormData.categoryId}
                    onChange={(e) => setConversionFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Cost (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={conversionFormData.totalCost}
                    onChange={(e) => setConversionFormData(prev => ({ ...prev, totalCost: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="Enter project total cost"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Advance Received (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={conversionFormData.advanceReceived}
                    onChange={(e) => setConversionFormData(prev => ({ ...prev, advanceReceived: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Finished Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={conversionFormData.finishedDays}
                    onChange={(e) => setConversionFormData(prev => ({ ...prev, finishedDays: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client DOB (optional)
                  </label>
                  <input
                    type="date"
                    value={conversionFormData.clientDateOfBirth}
                    onChange={(e) => setConversionFormData(prev => ({ ...prev, clientDateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeGST-quotation"
                    checked={conversionFormData.includeGST}
                    onChange={(e) => {
                      if (e.target.checked) setShowGSTConfirmModal(true)
                      else setConversionFormData(prev => ({ ...prev, includeGST: false }))
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="includeGST-quotation" className="text-sm font-medium text-gray-700">
                    Include GST (18%)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={conversionFormData.description}
                    onChange={(e) => setConversionFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add project description..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowConversionForm(false); setShowGSTConfirmModal(false) }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Convert to Client
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* GST Confirmation Modal */}
        {showGSTConfirmModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Enable GST (18%)</h3>
              <p className="text-sm text-gray-600 mb-4">Enabling GST will add 18% to the project cost.</p>
              {(() => {
                const base = parseAmount(conversionFormData.totalCost)
                const gstAmount = Math.round(base * 0.18)
                const withGST = Math.round(base * 1.18)
                return (
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cost without GST:</span>
                      <span className="font-semibold">₹{base.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST (18%):</span>
                      <span className="font-semibold text-teal-600">+ ₹{gstAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="font-medium text-gray-800">Total with GST:</span>
                      <span className="font-bold text-green-700">₹{withGST.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )
              })()}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowGSTConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConversionFormData(prev => ({ ...prev, includeGST: true }))
                    setShowGSTConfirmModal(false)
                  }}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SL_quotation_sent
