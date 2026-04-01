import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  FiArrowLeft, 
  FiSearch, 
  FiVideo,
  FiUser,
  FiPhone,
  FiMail,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiMoreVertical,
  FiFilter,
  FiTag,
  FiMessageCircle,
  FiMapPin,
  FiFileText
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import SL_navbar from '../SL-components/SL_navbar'
import { salesDemoService, salesLeadService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'

const SL_demo_request = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showActionsMenu, setShowActionsMenu] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Lead categories (matching admin system)
  const leadCategories = [
    {
      id: 1,
      name: 'Hot Leads',
      description: 'High priority leads with immediate potential',
      color: '#EF4444',
      icon: '🔥'
    },
    {
      id: 2,
      name: 'Cold Leads',
      description: 'Leads that need nurturing and follow-up',
      color: '#3B82F6',
      icon: '❄️'
    },
    {
      id: 3,
      name: 'Warm Leads',
      description: 'Leads showing interest but not ready to convert',
      color: '#F59E0B',
      icon: '🌡️'
    },
    {
      id: 4,
      name: 'Enterprise',
      description: 'Large enterprise clients and prospects',
      color: '#8B5CF6',
      icon: '🏢'
    },
    {
      id: 5,
      name: 'SME',
      description: 'Small and medium enterprise prospects',
      color: '#10B981',
      icon: '🏪'
    }
  ]

  const [demoRequestsData, setDemoRequestsData] = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, scheduled: 0, completed: 0 })
  const [isLoading, setIsLoading] = useState(false)

  const filters = [
    { id: 'all', label: 'All Requests' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' }
  ]

  React.useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true)
        const [cats, res] = await Promise.all([
          salesLeadService.getLeadCategories(),
          salesDemoService.list({
            search: searchTerm,
            status: selectedFilter,
            category: selectedCategory
          })
        ])
        setCategories(cats)
        setDemoRequestsData(res?.items || [])
        setStats(res?.stats || { total: 0, pending: 0, scheduled: 0, completed: 0 })
      } catch (e) {
        console.error('Fetch demo requests failed', e)
        toast.error('Failed to fetch demo requests')
      } finally {
        setIsLoading(false)
      }
    }
    run()
  }, [searchTerm, selectedFilter, selectedCategory])

  // Close menu when clicking outside
  React.useEffect(() => {
    if (!showActionsMenu) return
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-action-menu]')) {
        setShowActionsMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showActionsMenu])

  const filteredRequests = demoRequestsData

  // Get category info for a request
  const getCategoryInfo = (categoryId) => {
    const cat = leadCategories.find(cat => (cat._id || cat.id)?.toString() === String(categoryId))
    return cat || (leadCategories[0] ?? null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'scheduled': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FiClock className="text-orange-600" />
      case 'scheduled': return <FiCalendar className="text-blue-600" />
      case 'completed': return <FiCheckCircle className="text-green-600" />
      case 'cancelled': return <FiXCircle className="text-red-600" />
      default: return <FiClock className="text-gray-600" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-green-500'
      default: return 'text-gray-500'
    }
  }


  const handleViewDetails = (leadId) => {
    navigate(`/lead-profile/${leadId}`)
  }

  const handleDemoStatusChange = async (requestId, newStatus) => {
    setIsUpdatingStatus(true)
    try {
      await salesDemoService.updateStatus(requestId, newStatus)
      toast.success(`Demo request marked as ${newStatus}`)
      
      // Refresh data
      const res = await salesDemoService.list({ 
        search: searchTerm, 
        status: selectedFilter, 
        category: selectedCategory 
      })
      setDemoRequestsData(res?.items || [])
      setStats(res?.stats || stats)
      setShowActionsMenu(null)
    } catch (e) {
      console.error('Update demo status failed', e)
      toast.error('Failed to update demo status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleCall = (phone) => {
    if (!phone) {
      toast.error('Phone number not available')
      return
    }
    window.open(`tel:${phone}`, '_self')
  }

  const handleWhatsApp = (phone) => {
    if (!phone) {
      toast.error('Phone number not available')
      return
    }
    const message = encodeURIComponent("Hello! I'm following up on the demo request. How can I help you today?")
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />
      
      <main className="max-w-4xl mx-auto px-4 pt-16 pb-20">

        {/* Summary Card */}
        <div className="bg-teal-500 rounded-xl p-5 mb-4 text-white">
          <div className="flex items-center justify-between">
            {/* Left Section - Total */}
            <div>
              <h2 className="text-sm font-medium mb-2">Total Demo Requests</h2>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            
            {/* Right Section - Status Breakdown */}
            <div className="flex items-center space-x-4 md:space-x-6">
              {/* Pending */}
              <div className="text-center">
                <p className="text-lg font-bold mb-1">{stats.pending || 0}</p>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-300 rounded-full"></div>
                  <span className="text-xs md:text-sm">Pending</span>
                </div>
              </div>
              
              {/* Scheduled */}
              <div className="text-center">
                <p className="text-lg font-bold mb-1">{stats.scheduled || 0}</p>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                  <span className="text-xs md:text-sm">Scheduled</span>
                </div>
              </div>

              {/* Completed */}
              <div className="text-center">
                <p className="text-lg font-bold mb-1">{stats.completed || 0}</p>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span className="text-xs md:text-sm">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar with Filter Icon */}
        <div className="relative mb-4">
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
                {leadCategories.map((category) => {
                  const catId = (category._id || category.id)?.toString()
                  return (
                  <button
                    key={catId || category.name}
                    onClick={() => setSelectedCategory(catId || '')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center space-x-1 ${
                      selectedCategory === catId
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === catId ? category.color : undefined
                    }}
                  >
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                  </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Demo Requests List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading demo requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <FiVideo className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">No demo requests found</p>
              <p className="text-gray-400 text-sm">Try adjusting your search terms or filters</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {filteredRequests.map((request, index) => {
                const displayName = request.leadProfile?.name || request.name || request.clientName || request.company || 'Unknown'
                const displayPhone = request.phone
                const displayBusiness = request.leadProfile?.businessName || request.company || 'No business info'
                const category = request.category
                const demoStatus = request.demoRequest?.status || request.status || 'pending'
                const demoRequest = request.demoRequest || request
                const leadId = request._id || request.leadId || request.id
                const avatar = displayName.charAt(0).toUpperCase()
                
                return (
                <motion.div
                  key={request._id || request.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    {/* Left Section - Lead Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white font-semibold text-sm">{avatar}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-base mb-1">{displayName}</h3>
                          <p className="text-sm text-gray-600 mb-1">{displayBusiness}</p>
                          <p className="text-xs text-gray-500">{displayPhone}</p>
                        </div>
                      </div>

                      {/* Category */}
                      {category && (
                        <div className="mb-2">
                          <span className="text-xs text-black">
                            {category.name || 'Category'}
                          </span>
                        </div>
                      )}

                      {/* Demo Request Info */}
                      {demoRequest && (
                        <div className="mt-3 space-y-1">
                          {demoRequest.description && (
                            <div className="flex items-start space-x-2 text-xs text-gray-600">
                              <FiFileText className="text-gray-400 mt-0.5" />
                              <span className="line-clamp-2">{demoRequest.description}</span>
                            </div>
                          )}
                          {demoRequest.reference && (
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                              <FiTag className="text-gray-400" />
                              <span>Ref: {demoRequest.reference}</span>
                            </div>
                          )}
                          {demoRequest.requestedAt && (
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <FiClock className="text-gray-400" />
                              <span>Requested: {new Date(demoRequest.requestedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Section - Status and Actions */}
                    <div className="flex flex-col items-end space-y-3 ml-4">
                      {/* Status Badge */}
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center space-x-1.5 ${getStatusColor(demoStatus)}`}>
                        {getStatusIcon(demoStatus)}
                        <span className="capitalize">{demoStatus}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCall(displayPhone)}
                          className="p-2 bg-white text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors duration-200"
                          title="Call"
                        >
                          <FiPhone className="text-base" />
                        </button>
                        <button
                          onClick={() => handleWhatsApp(displayPhone)}
                          className="p-2 bg-white text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors duration-200"
                          title="WhatsApp"
                        >
                          <FaWhatsapp className="text-base" />
                        </button>
                        <button
                          onClick={() => handleViewDetails(leadId)}
                          className="p-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                          title="View Lead Profile"
                        >
                          <FiEye className="text-base" />
                        </button>
                        
                        {/* Status Update Menu */}
                        <div className="relative" data-action-menu>
                          <button
                            onClick={() => setShowActionsMenu(showActionsMenu === leadId ? null : leadId)}
                            className="p-2 bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                            title="More Actions"
                            disabled={isUpdatingStatus}
                          >
                            <FiMoreVertical className="text-base" />
                          </button>
                          
                          <AnimatePresence>
                            {showActionsMenu === leadId && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 overflow-hidden"
                                data-action-menu
                              >
                                {demoStatus !== 'completed' && (
                                  <button
                                    onClick={() => handleDemoStatusChange(leadId, 'completed')}
                                    className="w-full px-4 py-2.5 text-left text-sm text-green-700 hover:bg-green-50 flex items-center space-x-2 transition-colors duration-200"
                                    disabled={isUpdatingStatus}
                                  >
                                    <FiCheckCircle className="text-base" />
                                    <span>Mark as Completed</span>
                                  </button>
                                )}
                                {demoStatus !== 'cancelled' && (
                                  <button
                                    onClick={() => handleDemoStatusChange(leadId, 'cancelled')}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2 transition-colors duration-200"
                                    disabled={isUpdatingStatus}
                                  >
                                    <FiXCircle className="text-base" />
                                    <span>Mark as Cancelled</span>
                                  </button>
                                )}
                                {demoStatus !== 'pending' && (
                                  <button
                                    onClick={() => handleDemoStatusChange(leadId, 'pending')}
                                    className="w-full px-4 py-2.5 text-left text-sm text-orange-700 hover:bg-orange-50 flex items-center space-x-2 transition-colors duration-200"
                                    disabled={isUpdatingStatus}
                                  >
                                    <FiClock className="text-base" />
                                    <span>Mark as Pending</span>
                                  </button>
                                )}
                                {demoStatus !== 'scheduled' && (
                                  <button
                                    onClick={() => handleDemoStatusChange(leadId, 'scheduled')}
                                    className="w-full px-4 py-2.5 text-left text-sm text-blue-700 hover:bg-blue-50 flex items-center space-x-2 transition-colors duration-200"
                                    disabled={isUpdatingStatus}
                                  >
                                    <FiCalendar className="text-base" />
                                    <span>Mark as Scheduled</span>
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  )
}

export default SL_demo_request
