import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  FiPhone, 
  FiMoreVertical,
  FiFilter,
  FiUser,
  FiSearch,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiEdit3,
  FiLoader
} from 'react-icons/fi'
import SL_navbar from '../SL-components/SL_navbar'
import FollowUpDialog from '../SL-components/FollowUpDialog'
import { salesLeadService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'

const SL_followup = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  // State for filters and UI
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all') // all, pending, completed
  const [searchTerm, setSearchTerm] = useState('')
  const [showActionsMenu, setShowActionsMenu] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // State for real data
  const [leadsData, setLeadsData] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  // State for Follow-up dialog
  const [showFollowupDialog, setShowFollowupDialog] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState(null)

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
        timeFrame: selectedFilter, // Always send timeFrame, including 'all'
        page: 1,
        limit: 100 // Increased to get all follow-ups
      }
      
      const response = await salesLeadService.getLeadsByStatus('followup', params)
      
      // Normalize leads array from response shape
      const raw = response?.data
      const leads = Array.isArray(raw) ? raw : (raw?.data ?? [])

      setLeadsData(Array.isArray(leads) ? leads : [])
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to fetch leads')
      setLeadsData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Transform leads into follow-up items
  const followUpItems = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const items = leadsData.flatMap(lead => {
      if (!lead.followUps || lead.followUps.length === 0) return []
      
      return lead.followUps
        .filter(fu => {
          const fuDate = new Date(fu.scheduledDate)
          fuDate.setHours(0, 0, 0, 0)
          // Only include upcoming follow-ups (from today onwards) and pending/completed
          return fuDate >= today && (fu.status === 'pending' || fu.status === 'completed')
        })
        .map(followUp => ({
          _id: followUp._id || `${lead._id}-${followUp.scheduledDate}`,
          followUpId: followUp._id,
          leadId: lead._id,
          scheduledDate: followUp.scheduledDate,
          scheduledTime: followUp.scheduledTime,
          type: followUp.type || 'call',
          notes: followUp.notes || '',
          priority: followUp.priority || 'medium',
          status: followUp.status || 'pending',
          completedAt: followUp.completedAt,
          lead: {
            _id: lead._id,
            name: lead.leadProfile?.name || lead.name || 'Unknown',
            businessName: lead.leadProfile?.businessName || lead.company || 'No company',
            phone: lead.phone,
            category: lead.category,
            status: lead.status
          }
        }))
    })
    
    // Sort by date and time (earliest first)
    const toSortDate = (item) => {
      const d = item.scheduledDate
      const t = item.scheduledTime
      if (typeof d === 'string' && d.includes('T')) {
        return new Date(d)
      }
      const dateStr = typeof d === 'string' ? d : (d ? new Date(d).toISOString().split('T')[0] : '')
      return new Date(`${dateStr}T${t || '00:00'}`)
    }
    return items.sort((a, b) => toSortDate(a) - toSortDate(b))
  }, [leadsData])

  // Filter follow-up items
  const filteredFollowUpItems = useMemo(() => {
    let filtered = followUpItems

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus)
    }

    // Filter by time frame
    if (selectedFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.scheduledDate)
        itemDate.setHours(0, 0, 0, 0)
        
        switch(selectedFilter) {
          case 'today':
            return itemDate.getTime() === today.getTime()
          case 'week':
            const weekEnd = new Date(today)
            weekEnd.setDate(weekEnd.getDate() + 7)
            return itemDate >= today && itemDate <= weekEnd
          case 'month':
            const monthEnd = new Date(today)
            monthEnd.setMonth(monthEnd.getMonth() + 1)
            return itemDate >= today && itemDate <= monthEnd
          default:
            return true
        }
      })
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => {
        const categoryId = typeof item.lead.category === 'object' 
          ? item.lead.category?._id 
          : item.lead.category
        return categoryId === selectedCategory || categoryId?.toString() === selectedCategory
      })
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.lead.name.toLowerCase().includes(searchLower) ||
        item.lead.businessName.toLowerCase().includes(searchLower) ||
        item.lead.phone.includes(searchTerm)
      )
    }

    return filtered
  }, [followUpItems, selectedFilter, selectedCategory, selectedStatus, searchTerm])

  const filters = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Next 7 Days' },
    { id: 'month', label: 'Next Month' },
    { id: 'all', label: 'All Upcoming' }
  ]

  const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' }
  ]

  // Get category info helper
  const getCategoryInfo = (categoryIdOrObject) => {
    if (!categoryIdOrObject) {
      return { name: 'Unknown', color: '#999999', icon: '📋' }
    }
    
    if (typeof categoryIdOrObject === 'object' && categoryIdOrObject.name) {
      return {
        name: categoryIdOrObject.name,
        color: categoryIdOrObject.color || '#999999',
        icon: categoryIdOrObject.icon || '📋'
      }
    }
    
    const categoryId = typeof categoryIdOrObject === 'object' ? categoryIdOrObject._id : categoryIdOrObject
    if (categoryId) {
      const category = categories.find(cat => cat._id === categoryId || cat._id?.toString() === categoryId?.toString())
      if (category) {
        return category
      }
    }
    
    return { name: 'Unknown', color: '#999999', icon: '📋' }
  }

  // Get follow-up type icon
  const getTypeIcon = (type) => {
    const icons = {
      'call': '📞',
      'email': '📧',
      'meeting': '🤝',
      'whatsapp': '💬',
      'visit': '🏢',
      'demo': '🎯'
    }
    return icons[type] || '📞'
  }

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Handle complete follow-up
  const handleCompleteFollowUp = async (leadId, followUpId) => {
    try {
      await salesLeadService.completeFollowUp(leadId, followUpId)
      toast.success('Follow-up marked as completed')
      fetchLeads()
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }
    } catch (error) {
      console.error('Error completing follow-up:', error)
      toast.error('Failed to complete follow-up')
    }
    setShowActionsMenu(null)
  }

  // Handle cancel follow-up
  const handleCancelFollowUp = async (leadId, followUpId) => {
    try {
      await salesLeadService.cancelFollowUp(leadId, followUpId)
      toast.success('Follow-up cancelled')
      fetchLeads()
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }
    } catch (error) {
      console.error('Error cancelling follow-up:', error)
      toast.error('Failed to cancel follow-up')
    }
    setShowActionsMenu(null)
  }

  // Handle reschedule follow-up
  const handleRescheduleFollowUp = (item) => {
    setSelectedFollowUp(item)
    setShowFollowupDialog(true)
    setShowActionsMenu(null)
  }

  // Handle follow-up form submission (reschedule)
  const handleFollowUpSubmit = async (followUpData) => {
    if (!selectedFollowUp) return
    
    try {
      // Convert form data to the format expected by the API
      const rescheduleData = {
        date: followUpData.followupDate,
        time: followUpData.followupTime,
        notes: followUpData.notes,
        priority: followUpData.priority
      }
      
      await salesLeadService.rescheduleFollowUp(
        selectedFollowUp.leadId,
        selectedFollowUp.followUpId,
        rescheduleData
      )
      toast.success('Follow-up rescheduled successfully')
      fetchLeads()
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }
      setShowFollowupDialog(false)
      setSelectedFollowUp(null)
    } catch (error) {
      console.error('Error rescheduling follow-up:', error)
      toast.error('Failed to reschedule follow-up')
    }
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

  // Follow-up Card Component
  const FollowUpCard = ({ item }) => {
    const categoryInfo = getCategoryInfo(item.lead.category)
    const isCompleted = item.status === 'completed'
    const isPending = item.status === 'pending'
    
    const scheduledDate = new Date(item.scheduledDate)
    const dateStr = scheduledDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
    const timeStr = item.scheduledTime || ''

    return (
      <div className={`p-4 space-y-3 rounded-lg border transition-all duration-300 ${
        isCompleted 
          ? 'bg-gray-50 border-gray-200 opacity-75' 
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}>
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                isCompleted 
                  ? 'bg-gray-300' 
                  : 'bg-gradient-to-br from-amber-500 to-amber-600'
              }`}>
                {getTypeIcon(item.type)}
              </div>
            </div>

            {/* Lead Info */}
            <div className="flex-1 min-w-0">
              <h3 className={`text-base font-semibold truncate ${
                isCompleted ? 'text-gray-500' : 'text-gray-900'
              }`}>
                {item.lead.name}
              </h3>
              <p className={`text-sm truncate ${
                isCompleted ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {item.lead.businessName}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs ${
                  isCompleted ? 'text-gray-400' : 'text-black'
                }`}>
                  {categoryInfo.name}
                </span>
                {item.priority && (
                  <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="text-right flex-shrink-0 ml-3">
            <p className={`text-sm font-bold ${
              isCompleted ? 'text-gray-400' : 'text-amber-600'
            }`}>
              {dateStr}
            </p>
            {timeStr && (
              <p className={`text-xs ${
                isCompleted ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {timeStr}
              </p>
            )}
            {isCompleted && (
              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                Completed
              </span>
            )}
            {isPending && (
              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                Pending
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        {item.notes && (
          <div className={`text-xs ${
            isCompleted ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <span className="font-medium">Notes: </span>
            {item.notes}
          </div>
        )}

        {/* Actions Section */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className={`text-xs ${
            isCompleted ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {item.lead.phone}
          </span>
          
          <div className="flex items-center space-x-1">
            {/* Call Button */}
            <button
              onClick={() => handleCall(item.lead.phone)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isCompleted
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-white text-teal-600 border border-teal-200 hover:bg-teal-50'
              }`}
              title="Call"
              disabled={isCompleted}
            >
              <FiPhone className="w-4 h-4" />
            </button>

            {/* WhatsApp Button */}
            <button
              onClick={() => handleWhatsApp(item.lead.phone)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isCompleted
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              title="WhatsApp"
              disabled={isCompleted}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c0 5.449-4.434 9.883-9.881 9.883"/>
              </svg>
            </button>

            {/* Profile Button */}
            <button
              onClick={() => handleProfile(item.lead._id)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isCompleted
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
              title="Profile"
            >
              <FiUser className="w-4 h-4" />
            </button>

            {/* More Options */}
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(showActionsMenu === item._id ? null : item._id)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isCompleted
                    ? 'text-gray-400 hover:bg-gray-100'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FiMoreVertical className="w-4 h-4" />
              </button>

              {/* Actions Dropdown */}
              <AnimatePresence>
                {showActionsMenu === item._id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2}}
                    className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                  >
                    <div className="py-1">
                      {isPending && (
                        <button
                          onClick={() => handleCompleteFollowUp(item.leadId, item.followUpId)}
                          className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors duration-200 flex items-center space-x-2"
                        >
                          <FiCheckCircle className="w-4 h-4" />
                          <span>Mark Completed</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleRescheduleFollowUp(item)}
                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <FiEdit3 className="w-4 h-4" />
                        <span>Reschedule</span>
                      </button>
                      {isPending && (
                        <button
                          onClick={() => handleCancelFollowUp(item.leadId, item.followUpId)}
                          className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-200 flex items-center space-x-2"
                        >
                          <FiXCircle className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />
      
      <main className="max-w-4xl mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 shadow-md border border-amber-200/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
                  <FiCalendar className="text-white text-lg" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-amber-900 leading-tight">
                    Follow-ups
                  </h1>
                  <p className="text-amber-700 text-xs font-medium mt-0.5">
                    Manage your scheduled follow-ups
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg px-4 py-3 shadow-md border border-white/20 ml-3">
                <div className="text-center">
                  <p className="text-xs text-amber-600 font-medium mb-0.5">Total</p>
                  <p className="text-2xl font-bold text-amber-900 leading-none">{filteredFollowUpItems.length}</p>
                  <p className="text-xs text-amber-600 font-medium mt-0.5">Follow-ups</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter Section */}
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
              placeholder="Search by name, business, or phone..."
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
            {/* Status Filters */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Status</h4>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedStatus(filter.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedStatus === filter.id
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

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
            Showing {filteredFollowUpItems.length} follow-up{filteredFollowUpItems.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* Follow-ups List */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="space-y-3"
        >
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
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
              {filteredFollowUpItems.map((item, index) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <FollowUpCard item={item} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Empty State */}
          {filteredFollowUpItems.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCalendar className="text-gray-400 text-2xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No follow-ups found</h3>
                <p className="text-gray-600">
                  {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedFilter !== 'all'
                    ? 'Try adjusting your search criteria or filters.'
                    : 'No follow-ups scheduled. Schedule follow-ups from lead profiles.'}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Follow-up Dialog for Rescheduling */}
      <FollowUpDialog
        isOpen={showFollowupDialog}
        onClose={() => {
          setShowFollowupDialog(false)
          setSelectedFollowUp(null)
        }}
        onSubmit={handleFollowUpSubmit}
        title="Reschedule Follow-up"
        submitText="Reschedule"
        initialData={selectedFollowUp ? {
          followupDate: selectedFollowUp.scheduledDate,
          followupTime: selectedFollowUp.scheduledTime,
          notes: selectedFollowUp.notes,
          type: selectedFollowUp.type,
          priority: selectedFollowUp.priority
        } : null}
      />
    </div>
  )
}

export default SL_followup
