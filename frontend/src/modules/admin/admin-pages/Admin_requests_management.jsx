import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import Loading from '../../../components/ui/loading'
import adminRequestService from '../admin-services/adminRequestService'
import { adminFinanceService } from '../admin-services'
import { 
  FiFileText,
  FiCheckSquare,
  FiX,
  FiMessageSquare,
  FiClock,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiUsers,
  FiUser,
  FiShield,
  FiDollarSign,
  FiCreditCard,
  FiPause,
  FiTrendingUp,
  FiAlertCircle,
  FiCalendar,
  FiEye,
  FiEdit,
  FiTrash2,
  FiSend,
  FiArrowDown,
  FiArrowUp,
  FiHome,
  FiCode,
  FiShoppingCart,
  FiPlus
} from 'react-icons/fi'

const Admin_requests_management = () => {
  // State management
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [requestDirection, setRequestDirection] = useState('incoming') // 'incoming', 'outgoing', 'all'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  // Data states
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    urgentRequests: 0,
    clientRequests: 0,
    employeeRequests: 0,
    pmRequests: 0,
    salesRequests: 0,
    adminRequests: 0
  })
  const [allRequests, setAllRequests] = useState([])
  const [recipients, setRecipients] = useState({})
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [responseText, setResponseText] = useState('')
  const [responseType, setResponseType] = useState('approve')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Create request form state
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    type: 'approval',
    priority: 'normal',
    recipientType: 'client', // 'client', 'employee', 'pm', 'sales'
    recipientId: '',
    project: '',
    category: '',
    amount: '',
    accountId: '',
    method: 'upi',
    notes: ''
  })
  
  // Accounts state for payment-recovery form
  const [accounts, setAccounts] = useState([])

  // Load data from API
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load statistics
      const statsResponse = await adminRequestService.getStatistics({ direction: 'all' })
      if (statsResponse.success) {
        setStatistics(statsResponse.data)
      }
      
      // Load requests
      await loadRequests()
      
      // Load recipients for create modal
      await loadRecipients()
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load requests with current filters
  const loadRequests = async () => {
    try {
      const params = {
        direction: requestDirection,
        page: currentPage,
        limit: itemsPerPage,
        excludePaymentApproval: true // Payment-approval requests are shown on Finance Management page only
      }
      
      if (activeTab !== 'all') params.module = activeTab
      if (selectedFilter !== 'all') params.status = selectedFilter
      if (searchTerm) params.search = searchTerm
      
      const response = await adminRequestService.getRequests(params)
      if (response.success) {
        // Transform API data to match component expectations
        const transformedRequests = response.data.map(req => ({
          id: req._id || req.id,
          module: req.module,
          type: req.type,
          title: req.title,
          description: req.description,
          status: req.status,
          priority: req.priority,
          submittedDate: req.createdAt,
          submittedBy: req.requestedBy?.name || 'Unknown',
          submittedByType: req.requestedByModel?.toLowerCase() || req.module,
          projectName: req.project?.name || 'N/A',
          category: req.category || '',
          amount: req.amount,
          response: req.response ? {
            type: req.response.type,
            message: req.response.message,
            respondedDate: req.response.respondedDate,
            respondedBy: req.response.respondedBy?.name || 'Admin'
          } : null,
          // Store full request object for API calls
          _full: req
        }))
        setAllRequests(transformedRequests)
        
        // Update pagination info
        if (response.pagination) {
          setPagination(response.pagination)
        }
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    }
  }

  // Load recipients by type
  const loadRecipients = async () => {
    try {
      const types = ['client', 'employee', 'pm', 'sales']
      const recipientsData = {}
      
      for (const type of types) {
        try {
          const response = await adminRequestService.getRecipients(type)
          if (response.success) {
            recipientsData[type] = response.data
          }
        } catch (error) {
          console.error(`Error loading ${type} recipients:`, error)
        }
      }
      
      setRecipients(recipientsData)
    } catch (error) {
      console.error('Error loading recipients:', error)
    }
  }

  // Load accounts for payment-recovery form
  const loadAccounts = async () => {
    try {
      const response = await adminFinanceService.getAccounts()
      if (response.success) {
        setAccounts(response.data || [])
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  useEffect(() => {
    loadData()
    loadAccounts()
  }, [])

  // Reload requests when filters change
  useEffect(() => {
    if (!loading) {
      loadRequests()
    }
  }, [activeTab, requestDirection, selectedFilter, searchTerm, currentPage])

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'responded':
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'normal':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getModuleColor = (module) => {
    switch (module) {
      case 'client':
        return 'bg-purple-100 text-purple-800'
      case 'employee':
        return 'bg-blue-100 text-blue-800'
      case 'pm':
        return 'bg-indigo-100 text-indigo-800'
      case 'sales':
        return 'bg-teal-100 text-teal-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'approval':
        return FiFileText
      case 'feedback':
        return FiMessageSquare
      case 'confirmation':
        return FiCheckSquare
      case 'payment-recovery':
        return FiCreditCard
      case 'hold-work':
        return FiPause
      case 'accelerate-work':
        return FiTrendingUp
      case 'increase-cost':
        return FiDollarSign
      case 'access-request':
        return FiShield
      case 'timeline-extension':
        return FiClock
      case 'budget-approval':
        return FiDollarSign
      case 'resource-allocation':
        return FiTrendingUp
      default:
        return FiAlertCircle
    }
  }

  const getModuleIcon = (module) => {
    switch (module) {
      case 'client':
        return FiUsers
      case 'employee':
        return FiUser
      case 'pm':
        return FiShield
      case 'sales':
        return FiShoppingCart
      default:
        return FiAlertCircle
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Use allRequests directly (filtering is done on backend)
  const filteredData = allRequests
  const paginatedData = allRequests
  const totalPages = pagination.pages || 1

  // Management functions
  const handleView = (request) => {
    setSelectedRequest(request)
    setShowViewModal(true)
  }

  const handleRespond = (request) => {
    setSelectedRequest(request)
    setResponseText('')
    setResponseType('approve')
    setShowResponseModal(true)
  }

  const handleSubmitResponse = async () => {
    if (responseType !== 'approve' && !responseText.trim()) return
    
    setIsSubmitting(true)
    
    try {
      const requestId = selectedRequest._full?._id || selectedRequest.id
      const response = await adminRequestService.respondToRequest(requestId, responseType, responseText)
      
      if (response.success) {
        // Reload requests
        await loadRequests()
        await loadData() // Reload statistics
        setShowResponseModal(false)
        setSelectedRequest(null)
        setResponseText('')
        setResponseType('approve')
      }
    } catch (error) {
      console.error('Error submitting response:', error)
      alert(error.message || 'Failed to submit response')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateRequest = async () => {
    if (!newRequest.title.trim() || !newRequest.description.trim() || !newRequest.recipientId) {
      alert('Please fill in all required fields')
      return
    }

    if (newRequest.type === 'payment-recovery') {
      if (!newRequest.amount) {
        alert('Amount is required for payment recovery requests')
        return
      }
      if (!newRequest.accountId) {
        alert('Account is required for payment recovery requests')
        return
      }
    }

    setIsSubmitting(true)
    
    try {
      const requestData = {
        title: newRequest.title,
        description: newRequest.description,
        type: newRequest.type,
        priority: newRequest.priority,
        recipient: newRequest.recipientId,
        recipientModel: newRequest.recipientType === 'pm' ? 'PM' : newRequest.recipientType.charAt(0).toUpperCase() + newRequest.recipientType.slice(1),
        category: newRequest.category || '',
        amount: newRequest.type === 'payment-recovery' ? parseFloat(newRequest.amount) : undefined,
        accountId: newRequest.type === 'payment-recovery' ? newRequest.accountId : undefined,
        method: newRequest.type === 'payment-recovery' ? newRequest.method : undefined,
        notes: newRequest.type === 'payment-recovery' ? (newRequest.notes || undefined) : undefined
      }

      if (newRequest.project) {
        requestData.project = newRequest.project
      }

      const response = await adminRequestService.createRequest(requestData)
      
      if (response.success) {
        // Reset form
        setNewRequest({
          title: '',
          description: '',
          type: 'approval',
          priority: 'normal',
          recipientType: 'client',
          recipientId: '',
          project: '',
          category: '',
          amount: '',
          accountId: '',
          method: 'upi',
          notes: ''
        })
        setShowCreateModal(false)
        // Reload data
        await loadData()
        setRequestDirection('outgoing') // Switch to outgoing tab to see new request
      }
    } catch (error) {
      console.error('Error creating request:', error)
      alert(error.message || 'Failed to create request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeModals = () => {
    setShowViewModal(false)
    setShowResponseModal(false)
    setShowCreateModal(false)
    setSelectedRequest(null)
    setResponseText('')
    setResponseType('approve')
    // Reset form when closing create modal
    setNewRequest({
      title: '',
      description: '',
      type: 'approval',
      priority: 'normal',
      recipientType: 'client',
      recipientId: '',
      project: '',
      category: '',
      amount: '',
      accountId: '',
      method: 'upi',
      notes: ''
    })
  }

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
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-gray-900 mb-2">
                  Requests Management
                </h1>
                <p className="text-sm lg:text-base text-gray-600">
                  Comprehensive oversight and management of all system requests
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm"
                >
                  <FiPlus className="text-sm" />
                  <span>Create Request</span>
                </button>
                <button
                  onClick={loadData}
                  className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                >
                  <FiRefreshCw className="text-sm" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-6 lg:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">{statistics.totalRequests}</p>
                </div>
                <FiFileText className="text-gray-600 text-xl" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistics.pendingRequests}</p>
                </div>
                <FiClock className="text-yellow-600 text-xl" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.approvedRequests}</p>
                </div>
                <FiCheckSquare className="text-green-600 text-xl" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Urgent</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.urgentRequests}</p>
                </div>
                <FiAlertCircle className="text-red-600 text-xl" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.rejectedRequests}</p>
                </div>
                <FiX className="text-red-600 text-xl" />
              </div>
            </motion.div>
          </div>

          {/* Module Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Client Requests</p>
                  <p className="text-2xl font-bold text-purple-600">{statistics.clientRequests}</p>
                </div>
                <FiUsers className="text-purple-600 text-xl" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Employee Requests</p>
                  <p className="text-2xl font-bold text-blue-600">{statistics.employeeRequests}</p>
                </div>
                <FiUser className="text-blue-600 text-xl" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">PM Requests</p>
                  <p className="text-2xl font-bold text-indigo-600">{statistics.pmRequests}</p>
                </div>
                <FiShield className="text-indigo-600 text-xl" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sales Requests</p>
                  <p className="text-2xl font-bold text-teal-600">{statistics.salesRequests}</p>
                </div>
                <FiShoppingCart className="text-teal-600 text-xl" />
              </div>
            </motion.div>
          </div>

          {/* Direction Tabs */}
          <div className="mb-4">
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="-mb-px flex flex-nowrap space-x-4 lg:space-x-8 min-w-max lg:min-w-0 px-2 lg:px-0">
                {[
                  { id: 'incoming', label: 'Incoming Requests', icon: FiArrowDown },
                  { id: 'outgoing', label: 'Outgoing Requests', icon: FiArrowUp },
                  { id: 'all', label: 'All Requests', icon: FiFileText }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setRequestDirection(tab.id)
                        setCurrentPage(1)
                      }}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                        requestDirection === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="text-sm" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="-mb-px flex flex-nowrap space-x-4 lg:space-x-8 min-w-max lg:min-w-0 px-2 lg:px-0">
                {[
                  { id: 'all', label: 'All Modules', icon: FiFileText },
                  { id: 'client', label: 'Client Requests', icon: FiUsers },
                  { id: 'employee', label: 'Employee Requests', icon: FiUser },
                  { id: 'pm', label: 'PM Requests', icon: FiShield },
                  { id: 'sales', label: 'Sales Requests', icon: FiShoppingCart }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setCurrentPage(1)
                      }}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="text-sm" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <FiFilter className="text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="responded">Responded</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Requests Table */}
          {paginatedData.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <FiFileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No requests found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or create a new request</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Module</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Title</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Submitted By</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Project</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Priority</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((request, index) => {
                      const ModuleIcon = getModuleIcon(request.module)
                      return (
                        <motion.tr
                          key={request.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded ${getModuleColor(request.module)}`}>
                                <ModuleIcon className="text-sm" />
                              </div>
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getModuleColor(request.module)}`}>
                                {request.module}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 capitalize">{request.type ? request.type.replace(/-/g, ' ') : '—'}</td>
                          <td className="py-3 px-4">
                            <div className="max-w-[200px]">
                              <span className="font-medium text-gray-900 text-sm block truncate" title={request.title}>{request.title}</span>
                              {request.description && (
                                <span className="text-xs text-gray-500 truncate block max-w-[200px]" title={request.description}>{request.description}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{request.submittedBy || '—'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 max-w-[120px] truncate" title={request.projectName}>{request.projectName || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityColor(request.priority)}`}>
                              {request.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{request.submittedDate ? formatDate(request.submittedDate) : '—'}</td>
                          <td className="py-3 px-4 text-right">
                            {request.amount != null && request.amount !== '' ? (
                              <span className="text-sm font-semibold text-teal-600">{formatCurrency(request.amount)}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleView(request)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View"
                              >
                                <FiEye className="h-4 w-4" />
                              </button>
                              {request.status === 'pending' && (
                                <button
                                  onClick={() => handleRespond(request)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Respond"
                                >
                                  <FiSend className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      currentPage === index + 1
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Request Modal */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] lg:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col m-4"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-lg ${getModuleColor(selectedRequest.module)}`}>
                  {React.createElement(getModuleIcon(selectedRequest.module), { className: "text-lg" })}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedRequest.title}</h2>
                  <p className="text-sm text-gray-500">From: {selectedRequest.submittedBy}</p>
                </div>
              </div>
              <button
                onClick={closeModals}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              <div className="space-y-4">
                {/* Request Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Request Details</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{selectedRequest.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedRequest.priority)}`}>
                      {selectedRequest.priority} Priority
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getModuleColor(selectedRequest.module)}`}>
                      {selectedRequest.module.toUpperCase()} Module
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>

                {/* Project Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Project Information</h3>
                  <p className="text-sm text-gray-600">Project: {selectedRequest.projectName}</p>
                  <p className="text-sm text-gray-600">Category: {selectedRequest.category}</p>
                  <p className="text-sm text-gray-600">Submitted: {formatDate(selectedRequest.submittedDate)}</p>
                  {selectedRequest.amount && (
                    <p className="text-sm font-semibold text-teal-600">Amount: {formatCurrency(selectedRequest.amount)}</p>
                  )}
                </div>

                {/* Response Section */}
                {selectedRequest.response ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <FiCheckSquare className="text-green-600" />
                      <h3 className="text-sm font-medium text-green-900">Response</h3>
                    </div>
                    <div className="mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedRequest.response.type === 'approve' ? 'bg-green-100 text-green-700' :
                        selectedRequest.response.type === 'reject' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedRequest.response.type === 'approve' ? 'Approved' :
                         selectedRequest.response.type === 'reject' ? 'Rejected' :
                         'Changes Requested'}
                      </span>
                    </div>
                    <p className="text-sm text-green-800 leading-relaxed mb-2">{selectedRequest.response.message}</p>
                    <p className="text-xs text-green-600">
                      Responded by {selectedRequest.response.respondedBy} on {formatDate(selectedRequest.response.respondedDate)}
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <FiClock className="text-amber-600" />
                      <h3 className="text-sm font-medium text-amber-900">Awaiting Response</h3>
                    </div>
                    <p className="text-sm text-amber-800 mt-1">
                      This request is pending your review and response.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {selectedRequest.status === 'pending' && (
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    handleRespond(selectedRequest)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Respond to Request
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] lg:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col m-4"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FiSend className="text-blue-600 text-lg" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Respond to Request</h2>
                  <p className="text-sm text-gray-500">{selectedRequest.title}</p>
                </div>
              </div>
              <button
                onClick={closeModals}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              <div className="space-y-6">
                {/* Response Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Response Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => setResponseType('approve')}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        responseType === 'approve'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-green-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <FiCheckSquare className="w-4 h-4" />
                        <span className="text-sm font-medium">Approve</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setResponseType('reject')}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        responseType === 'reject'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-red-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <FiX className="w-4 h-4" />
                        <span className="text-sm font-medium">Reject</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setResponseType('request_changes')}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        responseType === 'request_changes'
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-200 hover:border-yellow-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <FiMessageSquare className="w-4 h-4" />
                        <span className="text-sm font-medium">Request Changes</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Response Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Your Response {responseType === 'approve' ? '(Optional)' : '(Required)'}
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder={
                      responseType === 'approve' ? 'Add any additional comments...' :
                      responseType === 'reject' ? 'Please explain why you are rejecting this request...' :
                      'Please specify what changes you would like...'
                    }
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    required={responseType !== 'approve'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {responseType === 'approve' ? 'Optional feedback for the requester' : 'This field is required'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={isSubmitting || (responseType !== 'approve' && !responseText.trim())}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                  isSubmitting || (responseType !== 'approve' && !responseText.trim())
                    ? 'bg-gray-400 cursor-not-allowed'
                    : responseType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : responseType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    <span>
                      {responseType === 'approve' ? 'Approve Request' :
                       responseType === 'reject' ? 'Reject Request' :
                       'Request Changes'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] lg:max-w-3xl max-h-[95vh] overflow-hidden flex flex-col m-2 sm:m-4"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FiPlus className="text-green-600 text-lg" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Create New Request</h2>
                  <p className="text-sm text-gray-500">Send a request to a team member</p>
                </div>
              </div>
              <button
                onClick={closeModals}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              <div className="space-y-6">
                {/* Request Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Request Type</label>
                  <select
                    value={newRequest.type}
                    onChange={(e) => {
                      const newType = e.target.value
                      setNewRequest({
                        ...newRequest, 
                        type: newType,
                        amount: newType === 'payment-recovery' ? newRequest.amount : '',
                        accountId: newType === 'payment-recovery' ? newRequest.accountId : '',
                        method: newType === 'payment-recovery' ? newRequest.method : 'upi',
                        notes: newType === 'payment-recovery' ? newRequest.notes : ''
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="approval">Approval</option>
                    <option value="feedback">Feedback</option>
                    <option value="confirmation">Confirmation</option>
                    <option value="payment-recovery">Payment Recovery</option>
                    <option value="hold-work">Hold Work</option>
                    <option value="accelerate-work">Accelerate Work</option>
                    <option value="increase-cost">Increase Cost</option>
                    <option value="access-request">Access Request</option>
                    <option value="timeline-extension">Timeline Extension</option>
                    <option value="budget-approval">Budget Approval</option>
                    <option value="resource-allocation">Resource Allocation</option>
                  </select>
                </div>

                {/* Recipient Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Recipient Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['client', 'employee', 'pm', 'sales'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewRequest({...newRequest, recipientType: type, recipientId: ''})}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          newRequest.recipientType === type
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-blue-300 text-gray-700'
                        }`}
                      >
                        <span className="text-sm font-medium capitalize">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Select Recipient *</label>
                  <select
                    value={newRequest.recipientId}
                    onChange={(e) => setNewRequest({...newRequest, recipientId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a {newRequest.recipientType}...</option>
                    {recipients[newRequest.recipientType]?.map((recipient) => (
                      <option key={recipient.id} value={recipient.id}>
                        {recipient.name} {recipient.email ? `(${recipient.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
                    placeholder="Enter request title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Description *</label>
                  <textarea
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                    placeholder="Enter request description"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    required
                  />
                </div>

                {/* Priority and Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Priority</label>
                    <select
                      value={newRequest.priority}
                      onChange={(e) => setNewRequest({...newRequest, priority: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
                    <input
                      type="text"
                      value={newRequest.category}
                      onChange={(e) => setNewRequest({...newRequest, category: e.target.value})}
                      placeholder="Optional category"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Payment Recovery Form Fields */}
                {newRequest.type === 'payment-recovery' && (
                  <div className="space-y-3 sm:space-y-4 border-t border-gray-200 pt-4 mt-4">
                    {/* Amount Field */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">Amount *</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                          <span className="text-base sm:text-lg">₹</span>
                        </div>
                        <input
                          type="number"
                          value={newRequest.amount}
                          onChange={(e) => setNewRequest({...newRequest, amount: e.target.value})}
                          placeholder="Enter amount"
                          min="0"
                          step="0.01"
                          className="w-full pl-8 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                          required
                        />
                      </div>
                    </div>

                    {/* Account Field */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">Account *</label>
                      <select
                        value={newRequest.accountId}
                        onChange={(e) => setNewRequest({...newRequest, accountId: e.target.value})}
                        className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                        required
                      >
                        <option value="">Select an account</option>
                        {accounts.map(account => (
                          <option key={account._id || account.id} value={account._id || account.id}>
                            {account.accountName || account.name} {account.bankName ? `- ${account.bankName}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Method Field */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">Payment Method *</label>
                      <select
                        value={newRequest.method}
                        onChange={(e) => setNewRequest({...newRequest, method: e.target.value})}
                        className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                        required
                      >
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Notes Field */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">Notes (Optional)</label>
                      <textarea
                        value={newRequest.notes}
                        onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                        placeholder="Add any additional notes..."
                        rows={3}
                        className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={isSubmitting || !newRequest.title.trim() || !newRequest.description.trim() || !newRequest.recipientId || (newRequest.type === 'payment-recovery' && (!newRequest.amount || !newRequest.accountId))}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                  isSubmitting || !newRequest.title.trim() || !newRequest.description.trim() || !newRequest.recipientId || (newRequest.type === 'payment-recovery' && (!newRequest.amount || !newRequest.accountId))
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <FiPlus className="w-4 h-4" />
                    <span>Create Request</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Admin_requests_management
