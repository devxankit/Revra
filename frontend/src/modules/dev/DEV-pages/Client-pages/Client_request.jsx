import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Client_navbar from '../../DEV-components/Client_navbar'
import clientRequestService from '../../DEV-services/clientRequestService'
import { 
  FiFileText, 
  FiCheckSquare, 
  FiX,
  FiMessageSquare,
  FiClock,
  FiFilter,
  FiSearch,
  FiCalendar,
  FiUser,
  FiUsers,
  FiSend
} from 'react-icons/fi'

const Client_request = () => {
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [responseType, setResponseType] = useState('approve')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Data states
  const [requestsData, setRequestsData] = useState({
    statistics: {
      total: 0,
      pending: 0,
      responded: 0,
      urgent: 0
    },
    requests: []
  })

  // Load data from API
  useEffect(() => {
    loadData()
  }, [activeFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load statistics
      const statsResponse = await clientRequestService.getStatistics()
      if (statsResponse.success) {
        const stats = statsResponse.data
        setRequestsData(prev => ({
          ...prev,
          statistics: {
            total: stats.totalRequests || 0,
            pending: stats.pendingRequests || 0,
            responded: stats.respondedRequests || 0,
            urgent: stats.urgentRequests || 0
          }
        }))
      }
      
      // Load requests
      await loadRequests()
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRequests = async () => {
    try {
      const params = {
        direction: 'incoming',
        status: activeFilter !== 'all' ? activeFilter : undefined,
        search: searchTerm || undefined
      }
      
      const response = await clientRequestService.getRequests(params)
      if (response.success) {
        const transformedRequests = response.data.map(req => ({
          id: req._id || req.id,
          title: req.title,
          description: req.description,
          status: req.status,
          priority: req.priority,
          submittedDate: req.createdAt,
          submittedBy: req.requestedBy?.name || 'Unknown',
          type: req.type,
          projectName: req.project?.name || 'N/A',
          response: req.response ? {
            type: req.response.type,
            message: req.response.message,
            respondedDate: req.response.respondedDate,
            respondedBy: req.response.respondedBy?.name || 'Unknown'
          } : null,
          _full: req
        }))
        
        setRequestsData(prev => ({
          ...prev,
          requests: transformedRequests
        }))
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    }
  }


  const getStatusColor = (status) => {
    switch (status) {
      case 'responded': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'normal': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatPriority = (priority) => {
    switch (priority) {
      case 'urgent': return 'Urgent'
      case 'high': return 'High'
      case 'normal': return 'Medium'
      case 'low': return 'Low'
      default: return priority
    }
  }

  const formatStatus = (status) => {
    switch (status) {
      case 'pending': return 'Pending'
      case 'responded': return 'Responded'
      default: return status
    }
  }

  const handleRequestClick = (request) => {
    if (request.status === 'pending') {
      setSelectedRequest(request)
      setIsDialogOpen(true)
      setResponseText('')
      setResponseType('approve')
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedRequest(null)
    setResponseText('')
    setResponseType('approve')
    setShowConfirmation(false)
  }

  const handleSubmitResponse = () => {
    if (responseType !== 'approve' && !responseText.trim()) return
    setShowConfirmation(true)
  }

  const handleConfirmResponse = async () => {
    if (responseType !== 'approve' && !responseText.trim()) return
    
    setIsSubmitting(true)
    
    try {
      const requestId = selectedRequest._full?._id || selectedRequest.id
      const response = await clientRequestService.respondToRequest(requestId, responseType, responseText)
      
      if (response.success) {
        await loadData()
        handleCloseDialog()
      }
    } catch (error) {
      console.error('Error submitting response:', error)
      alert(error.message || 'Failed to submit response')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelConfirmation = () => {
    setShowConfirmation(false)
  }

  // Filter requests based on active filter and search term
  const filteredRequests = requestsData.requests.filter(request => {
    const matchesFilter = activeFilter === 'all' || request.status === activeFilter
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const filters = [
    { key: 'all', label: 'All Requests', count: requestsData.statistics.total },
    { key: 'pending', label: 'Pending', count: requestsData.statistics.pending },
    { key: 'responded', label: 'Responded', count: requestsData.statistics.responded }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <Client_navbar />
        <main className="pt-16 lg:pt-16 pb-16 lg:pb-8">
          <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading requests...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
      <Client_navbar />
      
      {/* Main Content */}
      <main className="pt-16 lg:pt-16 pb-16 lg:pb-8">
        <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">

          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            <div className="w-full bg-white rounded-2xl md:rounded-lg p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="p-2 md:p-3 bg-blue-100 rounded-xl md:rounded-lg">
                  <FiFileText className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </div>
                <span className="text-xs md:text-sm text-gray-500">Total</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{requestsData.statistics.total}</p>
              <p className="text-xs md:text-sm text-gray-600">Requests</p>
            </div>

            <div className="w-full bg-white rounded-2xl md:rounded-lg p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="p-2 md:p-3 bg-orange-100 rounded-xl md:rounded-lg">
                  <FiClock className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
                </div>
                <span className="text-xs md:text-sm text-gray-500">Pending</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{requestsData.statistics.pending}</p>
              <p className="text-xs md:text-sm text-gray-600">Awaiting</p>
            </div>

            <div className="w-full bg-white rounded-2xl md:rounded-lg p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="p-2 md:p-3 bg-green-100 rounded-xl md:rounded-lg">
                  <FiCheckSquare className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                </div>
                <span className="text-xs md:text-sm text-gray-500">Responded</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{requestsData.statistics.responded}</p>
              <p className="text-xs md:text-sm text-gray-600">Completed</p>
            </div>

            <div className="w-full bg-white rounded-2xl md:rounded-lg p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="p-2 md:p-3 bg-red-100 rounded-xl md:rounded-lg">
                  <FiMessageSquare className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
                </div>
                <span className="text-xs md:text-sm text-gray-500">Urgent</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{requestsData.statistics.urgent}</p>
              <p className="text-xs md:text-sm text-gray-600">Priority</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-1 bg-gray-200 rounded-lg p-1">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeFilter === filter.key
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white rounded-2xl md:rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                  {activeFilter === 'all' ? 'All Requests' : 
                   activeFilter === 'pending' ? 'Pending Requests' : 
                   'Responded Requests'}
                </h2>
                <span className="text-sm text-gray-500">{filteredRequests.length} requests</span>
              </div>

              <div className="space-y-3">
                {filteredRequests.map((request) => (
                  <div 
                    key={request.id} 
                    onClick={() => handleRequestClick(request)}
                    className={`group relative bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all duration-200 ${
                      request.status === 'pending' ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                          request.type === 'approval' ? 'bg-blue-100' :
                          request.type === 'feedback' ? 'bg-purple-100' :
                          'bg-green-100'
                        }`}>
                          {request.type === 'approval' && <FiFileText className="w-3.5 h-3.5 text-blue-600" />}
                          {request.type === 'feedback' && <FiUsers className="w-3.5 h-3.5 text-purple-600" />}
                          {request.type === 'confirmation' && <FiCheckSquare className="w-3.5 h-3.5 text-green-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors duration-200 truncate">
                            {request.title}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">{request.projectName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                          {formatPriority(request.priority)}
                        </span>
                        {request.status === 'pending' && (
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                      {request.description}
                    </p>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        From: <span className="font-medium text-gray-700">{request.submittedBy}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {formatStatus(request.status)}
                        </span>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const now = new Date()
                            const submittedDate = new Date(request.submittedDate)
                            const diffTime = now.getTime() - submittedDate.getTime()
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                            
                            if (diffDays === 0) return 'Today'
                            if (diffDays === 1) return 'Yesterday'
                            if (diffDays < 7) return `${diffDays}d ago`
                            return new Date(request.submittedDate).toLocaleDateString('en-US', { 
                              day: 'numeric',
                              month: 'short'
                            })
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredRequests.length === 0 && (
                  <div className="text-center py-12">
                    <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                    <p className="text-gray-500">
                      {searchTerm ? 'Try adjusting your search terms' : 'No requests match the current filter'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Response Dialog - Same as dashboard */}
      <AnimatePresence>
        {isDialogOpen && selectedRequest && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
            >
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selectedRequest.type === 'approval' ? 'bg-blue-100' :
                  selectedRequest.type === 'feedback' ? 'bg-purple-100' :
                  'bg-green-100'
                }`}>
                  {selectedRequest.type === 'approval' && <FiFileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
                  {selectedRequest.type === 'feedback' && <FiUsers className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
                  {selectedRequest.type === 'confirmation' && <FiCheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{selectedRequest.title}</h2>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">From: {selectedRequest.submittedBy}</p>
                </div>
              </div>
              <button
                onClick={handleCloseDialog}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex-shrink-0"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {!showConfirmation ? (
                // Response Form
                <div className="space-y-4 sm:space-y-6">
                  {/* Request Description */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Request Details</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedRequest.description}</p>
                  </div>

                  {/* Response Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">Response Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
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
                      className="w-full h-24 sm:h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                      required={responseType !== 'approve'}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {responseType === 'approve' ? 'Optional feedback for the team' : 'This field is required'}
                    </p>
                  </div>
                </div>
              ) : (
                // Confirmation View
                <div className="space-y-4 sm:space-y-6">
                  {/* Confirmation Header */}
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                      responseType === 'approve' ? 'bg-green-100' :
                      responseType === 'reject' ? 'bg-red-100' :
                      'bg-yellow-100'
                    }`}>
                      {responseType === 'approve' && <FiCheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />}
                      {responseType === 'reject' && <FiX className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />}
                      {responseType === 'request_changes' && <FiMessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Confirm Your Response</h3>
                      <p className="text-sm text-gray-500">Please review your response before submitting</p>
                    </div>
                  </div>

                  {/* Request Summary */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Request</h4>
                    <p className="text-sm text-gray-600">{selectedRequest.title}</p>
                  </div>

                  {/* Response Summary */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Your Response</h4>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        responseType === 'approve' ? 'bg-green-100 text-green-700' :
                        responseType === 'reject' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {responseType === 'approve' ? 'Approve' :
                         responseType === 'reject' ? 'Reject' :
                         'Request Changes'}
                      </span>
                    </div>
                    {responseText && (
                      <p className="text-sm text-gray-600 mt-2">{responseText}</p>
                    )}
                  </div>

                  {/* Warning Note */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Once submitted, this response cannot be undone. The team will be notified immediately.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end space-x-2 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={showConfirmation ? handleCancelConfirmation : handleCloseDialog}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                {showConfirmation ? 'Back' : 'Cancel'}
              </button>
              <button
                onClick={showConfirmation ? handleConfirmResponse : handleSubmitResponse}
                disabled={isSubmitting || (!showConfirmation && responseType !== 'approve' && !responseText.trim())}
                className={`px-3 sm:px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                  isSubmitting || (!showConfirmation && responseType !== 'approve' && !responseText.trim())
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
                    <span className="hidden sm:inline">Submitting...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    <span>
                      {showConfirmation ? 'Confirm & Submit' :
                       responseType === 'approve' ? 'Approve Request' :
                       responseType === 'reject' ? 'Reject Request' :
                       'Request Changes'}
                    </span>
                  </>
                )}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Client_request
