import React, { useState, useEffect } from 'react'
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
  FiTag
} from 'react-icons/fi'
import { salesLeadService } from '../../SL-services'
import { useToast } from '../../../contexts/ToastContext'
import SL_navbar from '../SL-components/SL_navbar'

const SL_connectedLeads = () => {
  const { toast } = useToast()
  
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [showActionsMenu, setShowActionsMenu] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // Real lead data state
  const [leadsData, setLeadsData] = useState([])
  const [isLoadingLeads, setIsLoadingLeads] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  })

  // Lead categories (matching admin system)
  const leadCategories = [
    {
      id: 1,
      name: 'Hot Leads',
      description: 'High priority leads',
      color: '#EF4444',
      icon: '🔥'
    },
    {
      id: 2,
      name: 'Cold Leads',
      description: 'Leads that need nurturing',
      color: '#3B82F6',
      icon: '❄️'
    },
    {
      id: 3,
      name: 'Warm Leads',
      description: 'Leads showing interest',
      color: '#F59E0B',
      icon: '🌡️'
    },
    {
      id: 4,
      name: 'Enterprise',
      description: 'Large business leads',
      color: '#8B5CF6',
      icon: '🏢'
    },
    {
      id: 5,
      name: 'SME',
      description: 'Small to medium enterprise',
      color: '#10B981',
      icon: '🏪'
    }
  ]

  // Fetch leads from API
  const fetchLeads = async () => {
    setIsLoadingLeads(true)
    try {
      const params = {
        status: 'connected',
        page: pagination.page,
        limit: pagination.limit
      }
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await salesLeadService.getLeadsByStatus('connected', params)
      setLeadsData(response?.data || [])
      setPagination({
        page: response?.page ?? 1,
        limit: response?.limit ?? 10,
        total: response?.total ?? 0,
        pages: response?.pages ?? 1
      })
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch leads',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingLeads(false)
    }
  }

  // Fetch leads on component mount and when filters change
  useEffect(() => {
    fetchLeads()
  }, [selectedCategory, searchTerm, pagination.page])

  // Since we're fetching filtered data from API, we don't need client-side filtering
  const filteredLeads = leadsData

  // Get category info for a lead
  const getCategoryInfo = (category) => {
    if (typeof category === 'object' && category._id) {
      return category
    }
    const cat = leadCategories.find(cat => (cat._id || cat.id)?.toString() === String(category))
    return cat || (leadCategories[0] ?? null)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-gray-500'
      case 'low': return 'text-green-500'
      default: return 'text-gray-500'
    }
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
      await salesLeadService.updateLeadStatus(leadId, newStatus)
      toast({
        title: 'Success',
        description: `Lead status updated to ${newStatus}`,
        variant: 'default'
      })
      // Refresh leads data
      fetchLeads()
    } catch (error) {
      console.error('Error updating lead status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update lead status',
        variant: 'destructive'
      })
    }
    setShowActionsMenu(null)
  }

  // Mobile Lead Card Component
  const MobileLeadCard = ({ lead }) => {
    const categoryInfo = getCategoryInfo(lead.category)
    
    return (
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => {
          if (lead.leadProfile) {
            navigate(`/lead-profile/${lead._id}`)
          } else {
            toast({
              title: 'Error',
              description: 'This lead doesn\'t have a profile. Please connect to the lead first to create a profile.',
              variant: 'destructive'
            })
          }
        }}
      >
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{lead.phone}</h3>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(lead.priority)} bg-gray-100`}>
              {lead.priority}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-black">
              {categoryInfo?.name ?? 'Unknown'}
            </span>
            {lead.leadProfile && (
              <span className="text-xs text-green-600 font-medium">✓ Profile</span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCall(lead.phone)
            }}
            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
          >
            <FiPhone size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleWhatsApp(lead.phone)
            }}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <FiUserCheck size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowActionsMenu(showActionsMenu === lead._id ? null : lead._id)
            }}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FiMoreVertical size={16} />
          </button>
          <AnimatePresence>
            {showActionsMenu === lead._id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-12 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-[160px]"
              >
                <button
                  onClick={() => handleStatusChange(lead._id, 'hot')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <FiUserCheck size={14} />
                  <span>Mark as Hot</span>
                </button>
                <button
                  onClick={() => handleStatusChange(lead._id, 'quotation_sent')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <FiFileText size={14} />
                  <span>Send Quotation</span>
                </button>
                <button
                  onClick={() => handleStatusChange(lead._id, 'lost')}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <FiX size={14} />
                  <span>Mark as Lost</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <SL_navbar />
      
      <main className="max-w-4xl mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-20 lg:pb-4">
        {/* Mobile-first layout */}
        <div className="space-y-6 lg:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Connected Leads</h1>
              <p className="text-sm text-gray-600">Leads that have been contacted</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <FiFilter size={20} />
            </button>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search by phone, name, company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedCategory === 'all'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All
                      </button>
                      {leadCategories.map((category) => {
                        const catId = (category._id || category.id)?.toString()
                        return (
                        <button
                          key={catId || category.name}
                          onClick={() => setSelectedCategory(catId || '')}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedCategory === catId
                              ? 'text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          style={{
                            backgroundColor: selectedCategory === catId ? category.color : undefined
                          }}
                        >
                          {category.icon} {category.name}
                        </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 px-2">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Connected</p>
                  <p className="text-xl font-bold text-teal-900">{pagination.total}</p>
                </div>
                <div className="p-2 bg-teal-100 rounded-lg">
                  <FiUserCheck className="text-teal-600" size={20} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">With Profile</p>
                  <p className="text-xl font-bold text-green-900">{leadsData.filter(lead => lead.leadProfile).length}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiFileText className="text-green-600" size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Leads List */}
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
                  <p className="text-gray-500">No connected leads found</p>
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
                  <MobileLeadCard lead={lead} />
                </motion.div>
              ))
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

export default SL_connectedLeads
