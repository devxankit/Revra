import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  FiSearch, 
  FiPhone,
  FiX,
  FiChevronDown,
  FiUser,
  FiFilter
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import SL_navbar from '../SL-components/SL_navbar'
import { salesPaymentsService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'

const SL_payments_recovery = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [requestAmount, setRequestAmount] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPaymentType, setSelectedPaymentType] = useState('all')
  const [receivables, setReceivables] = useState([])
  const [stats, setStats] = useState({ totalDues: 0, overdueCount: 0, overdueAmount: 0 })
  const [expandedProjects, setExpandedProjects] = useState({})
  const [projectPaymentReceipts, setProjectPaymentReceipts] = useState({})
  const [accounts, setAccounts] = useState([])
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
  const [selectedProjectForPayment, setSelectedProjectForPayment] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    accountId: '',
    method: 'upi',
    referenceId: '',
    notes: ''
  })
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch data: receivables + payment receipts for each project so "available amount" is correct from the start
  React.useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [st, list] = await Promise.all([
          salesPaymentsService.getReceivableStats(),
          salesPaymentsService.getReceivables({
            search: searchTerm,
            overdue: selectedPaymentType === 'overdue',
            band: selectedFilter === 'all' ? undefined : selectedFilter
          })
        ])
        const receivablesList = Array.isArray(list) ? list : []
        setStats({ totalDues: st.totalDue || 0, overdueCount: st.overdueCount || 0, overdueAmount: st.overdueAmount || 0 })
        setReceivables(receivablesList)

        // Preload payment receipts for every project so pending amount (remaining - pending receipts) is correct immediately
        const receiptsByProject = {}
        await Promise.all(
          receivablesList.map(async (p) => {
            const projectId = p.projectId
            if (!projectId) return
            try {
              const receipts = await salesPaymentsService.getPaymentReceipts(projectId)
              receiptsByProject[projectId] = Array.isArray(receipts) ? receipts : []
            } catch (err) {
              console.error('Failed to fetch receipts for project', projectId, err)
              receiptsByProject[projectId] = []
            }
          })
        )
        setProjectPaymentReceipts(receiptsByProject)
      } catch (e) {
        console.error('Payments fetch error', e)
        setError(e.message || 'Failed to load payment recovery data')
        setReceivables([])
        setStats({ totalDues: 0, overdueCount: 0, overdueAmount: 0 })
        setProjectPaymentReceipts({})
      } finally {
        setIsLoading(false)
      }
    }
    run()
  }, [searchTerm, selectedPaymentType, selectedFilter])

  const totalDues = stats.totalDues || 0
  const overduePayments = receivables.filter(p => p.dueDate && new Date(p.dueDate) < new Date())
  const totalOverdue = stats.overdueAmount || 0

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'high', label: 'High Amount' },
    { id: 'medium', label: 'Medium Amount' },
    { id: 'low', label: 'Low Amount' }
  ]

  const filteredPayments = receivables

  const handleCall = (phone) => {
    window.open(`tel:${phone}`, '_self')
  }

  const handleWhatsApp = (client) => {
    // Normalize to expected shape for dialog
    setSelectedClient({
      name: client.clientName,
      phone: client.phone,
      remainingAmount: client.remainingAmount
    })
    setShowWhatsAppDialog(true)
  }

  const handleSendWhatsAppMessage = () => {
    if (!requestAmount || !selectedClient) return

    const cleanPhone = selectedClient.phone.replace(/\s+/g, '').replace('+91', '')
    const remainingAmount = selectedClient.remainingAmount || 0
    const message = `Hello ${selectedClient.name},

Payment Request Details:
• Remaining Amount: ₹${remainingAmount.toLocaleString()}
• Requested Amount: ₹${Math.round(Number(String(requestAmount || '').replace(/,/g, '')) || 0).toLocaleString()}

Please make the payment at your earliest convenience. If you have any questions, feel free to contact us.

Thank you!`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/91${cleanPhone}?text=${encodedMessage}`, '_blank')
    
    // Close dialog and reset
    setShowWhatsAppDialog(false)
    setSelectedClient(null)
    setRequestAmount('')
  }

  const handleCloseWhatsAppDialog = () => {
    setShowWhatsAppDialog(false)
    setSelectedClient(null)
    setRequestAmount('')
  }

  const handleProfile = (clientId) => {
    // Navigate to client profile page
    navigate(`/client-profile/${clientId}`)
  }

  // Fetch accounts on mount
  React.useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const accs = await salesPaymentsService.getAccounts()
        setAccounts(accs || [])
      } catch (e) {
        console.error('Failed to fetch accounts', e)
      }
    }
    fetchAccounts()
  }, [])


  const handleAddRecoveryPayment = (payment) => {
    setSelectedProjectForPayment(payment)
    setPaymentForm({
      amount: '',
      accountId: '',
      method: 'upi',
      referenceId: '',
      notes: ''
    })
    setShowAddPaymentDialog(true)
  }

  const handleSubmitRecoveryPayment = async () => {
    if (!selectedProjectForPayment) return

    const amountValue = Math.round(Number(String(paymentForm.amount || '').replace(/,/g, '')) || 0)
    if (!amountValue || amountValue <= 0) {
      toast.error('Please enter a valid amount greater than 0')
      return
    }

    if (!paymentForm.accountId) {
      toast.error('Please select an account')
      return
    }

    // Calculate available amount (remaining - pending receipts)
    const pendingReceipts = projectPaymentReceipts[selectedProjectForPayment.projectId]?.filter(r => r.status === 'pending') || []
    const totalPending = pendingReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
    const availableAmount = Math.max(0, (selectedProjectForPayment.remainingAmount || 0) - totalPending)

    if (amountValue > availableAmount) {
      toast.error(`Amount exceeds available balance. Available: ₹${availableAmount.toLocaleString()}`)
      return
    }

    setIsSubmittingPayment(true)
    try {
      await salesPaymentsService.createReceipt(selectedProjectForPayment.projectId, {
        amount: amountValue,
        accountId: paymentForm.accountId,
        method: paymentForm.method,
        referenceId: paymentForm.referenceId?.trim() || undefined,
        notes: paymentForm.notes || undefined
      })

      // Optimistically update remaining amount
      const updatedReceivables = receivables.map(p => {
        if (p.projectId === selectedProjectForPayment.projectId) {
          return { ...p, remainingAmount: Math.max(0, (p.remainingAmount || 0) - amountValue) }
        }
        return p
      })
      setReceivables(updatedReceivables)
      
      // Refresh receivables data to get updated stats
      try {
        const [st, list] = await Promise.all([
          salesPaymentsService.getReceivableStats(),
          salesPaymentsService.getReceivables({
            search: searchTerm,
            overdue: selectedPaymentType === 'overdue',
            band: selectedFilter === 'all' ? undefined : selectedFilter
          })
        ])
        setStats({ totalDues: st.totalDue || 0, overdueCount: st.overdueCount || 0, overdueAmount: st.overdueAmount || 0 })
        setReceivables(list)
      } catch (e) {
        console.error('Failed to refresh receivables', e)
      }

      // Refresh payment receipts
      const receipts = await salesPaymentsService.getPaymentReceipts(selectedProjectForPayment.projectId)
      setProjectPaymentReceipts(prev => ({ ...prev, [selectedProjectForPayment.projectId]: receipts }))

      // Close dialog
      setShowAddPaymentDialog(false)
      setSelectedProjectForPayment(null)
      setPaymentForm({
        amount: '',
        accountId: '',
        method: 'upi',
        referenceId: '',
        notes: ''
      })
      toast.success('Payment receipt created successfully. Pending admin approval.')
    } catch (e) {
      console.error('Failed to create payment receipt', e)
      toast.error(e.message || 'Failed to create payment receipt')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const handleCloseAddPaymentDialog = () => {
    setShowAddPaymentDialog(false)
    setSelectedProjectForPayment(null)
    setPaymentForm({
      amount: '',
      accountId: '',
      method: 'upi',
      referenceId: '',
      notes: ''
    })
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />
      
      <main className="max-w-2xl mx-auto px-4 pt-16 pb-20">

        {/* Total Dues Card */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-4 mb-4 text-white">
          <h2 className="text-sm font-medium mb-1">Total dues</h2>
          <p className="text-2xl font-bold">₹ {totalDues.toLocaleString()} /-</p>
        </div>

        {/* Search Bar with Filter Icon */}
        <div className="relative mb-4">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
            <FiSearch className="text-sm" />
          </div>
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

        {/* Payment Type Tiles */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* All Payments Tile */}
          <button
            onClick={() => setSelectedPaymentType('all')}
            className={`py-1.5 px-3 rounded-lg transition-all duration-200 ${
              selectedPaymentType === 'all'
                ? 'bg-teal-50 border-2 border-teal-500 text-teal-700'
                : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="text-center">
              <p className="text-xs font-semibold">All: ₹{totalDues.toLocaleString()} ({receivables.length})</p>
            </div>
          </button>

          {/* Overdue Payments Tile */}
          <button
            onClick={() => setSelectedPaymentType('overdue')}
            className={`py-1.5 px-3 rounded-lg transition-all duration-200 ${
              selectedPaymentType === 'overdue'
                ? 'bg-red-50 border-2 border-red-500 text-red-700'
                : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="text-center">
              <p className="text-xs font-semibold">Overdue: ₹{totalOverdue.toLocaleString()} ({overduePayments.length})</p>
            </div>
          </button>
        </div>

        {/* Filters - Conditional Display */}
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap gap-2 mb-4"
          >
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedFilter === filter.id
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        )}

        {/* Payments List */}
        {!isLoading && (
          <div className="space-y-4">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">No receivables found</p>
                {searchTerm && (
                  <p className="text-gray-400 text-xs mt-2">Try adjusting your search or filters</p>
                )}
              </div>
            ) : (
              filteredPayments.map((payment) => (
            <div
              key={payment.projectId}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              {/* Client Info Section */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">
                    {payment.clientName || 'Unknown Client'}
                  </h3>
                  {payment.projectName && payment.projectName !== 'Unnamed Project' && (
                    <p className="text-xs text-teal-600 font-medium mb-0.5">{payment.projectName}</p>
                  )}
                  {/* Project cost display with clear GST breakdown when applicable */}
                  <p className="text-xs text-gray-700 mb-1">
                    {(() => {
                      const base = Number(payment.baseCost ?? payment.totalCost ?? 0) || 0
                      const gst = Number(payment.gstAmount || 0) || 0
                      if (payment.includeGST && gst > 0) {
                        return `Cost: ₹${base.toLocaleString()} + GST ₹${gst.toLocaleString()}`
                      }
                      return `Cost: ₹${base.toLocaleString()}`
                    })()}
                  </p>
                  {payment.companyName && (
                    <p className="text-xs text-gray-500 mb-1">{payment.companyName}</p>
                  )}
                  <p className="text-sm text-gray-600 flex items-center mb-1">
                    <FiPhone className="mr-1 text-xs" />
                    {payment.phone || 'N/A'}
                  </p>
                  {payment.email && (
                    <p className="text-xs text-gray-500">{payment.email}</p>
                  )}
                  {payment.dueDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {formatDate(payment.dueDate)}
                    </p>
                  )}
                </div>
                
                {/* Amount Badge - Show available amount (remaining - pending) */}
                <div className="bg-red-50 px-3 py-1 rounded-full">
                  <p className="text-red-700 font-bold text-sm">
                    ₹{(() => {
                      const pendingReceipts = projectPaymentReceipts[payment.projectId]?.filter(r => r.status === 'pending') || []
                      const totalPending = pendingReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
                      const available = Math.max(0, payment.remainingAmount - totalPending)
                      return available.toLocaleString()
                    })()}
                  </p>
                </div>
              </div>

              {/* Add Recovery Payment Button */}
              <div className="mb-3">
                <button
                  onClick={() => handleAddRecoveryPayment(payment)}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 text-sm font-medium"
                >
                  Add Recovery Payment
                </button>
              </div>

              {/* Payment History Section */}
              <div className="mb-3">
                <button
                  onClick={() => {
                    const key = `receipts-${payment.projectId}`
                    setExpandedProjects(prev => ({ ...prev, [key]: !prev[key] }))
                    // Fetch receipts if not loaded
                    if (!projectPaymentReceipts[payment.projectId] && !expandedProjects[`receipts-${payment.projectId}`]) {
                      salesPaymentsService.getPaymentReceipts(payment.projectId)
                        .then(receipts => {
                          setProjectPaymentReceipts(prev => ({ ...prev, [payment.projectId]: receipts }))
                        })
                        .catch(e => console.error('Failed to fetch receipts', e))
                    }
                  }}
                  className="flex items-center justify-between w-full text-left p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <span className="text-sm font-medium text-gray-700">
                    Payment History
                  </span>
                  <FiChevronDown className={`text-gray-500 transition-transform duration-200 ${expandedProjects[`receipts-${payment.projectId}`] ? 'rotate-180' : ''}`} />
                </button>

                {expandedProjects[`receipts-${payment.projectId}`] && (
                  <div className="mt-2 space-y-2">
                    {projectPaymentReceipts[payment.projectId]?.length > 0 ? (
                      projectPaymentReceipts[payment.projectId].map((receipt) => (
                        <div
                          key={receipt._id || receipt.id}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900">₹{receipt.amount.toLocaleString()}</span>
                                {receipt.status === 'pending' && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Pending</span>
                                )}
                                {receipt.status === 'approved' && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Approved</span>
                                )}
                                {receipt.status === 'rejected' && (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Rejected</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">
                                Account: {receipt.account?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-600">
                                Method: {receipt.method || 'N/A'}
                              </p>
                              {receipt.referenceId && (
                                <p className="text-xs text-gray-600">
                                  Reference: {receipt.referenceId}
                                </p>
                              )}
                              <p className="text-xs text-gray-600">
                                Date: {formatDate(receipt.createdAt)}
                              </p>
                              {receipt.notes && (
                                <p className="text-xs text-gray-600 mt-1">Notes: {receipt.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">No payment receipts found</p>
                    )}
                  </div>
                )}
              </div>

               {/* Action Buttons */}
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-2">
                   {/* Call Button */}
                   <button
                     onClick={() => handleCall(payment.phone)}
                     className="bg-white text-teal-600 border border-teal-200 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 transition-all duration-200 text-xs font-medium"
                     title="Call"
                   >
                     Call
                   </button>

                   {/* WhatsApp Button */}
                   <button
                     onClick={() => handleWhatsApp(payment)}
                     className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600 transition-all duration-200"
                     title="WhatsApp"
                   >
                     <FaWhatsapp className="w-3.5 h-3.5" />
                   </button>

                   {/* Profile Button */}
                   <button
                     onClick={() => handleProfile(payment.clientId)}
                     className="bg-teal-500 text-white p-1.5 rounded-lg hover:bg-teal-600 transition-all duration-200"
                     title="View Profile"
                   >
                     <FiUser className="w-3.5 h-3.5" />
                   </button>
                 </div>

               </div>
            </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* WhatsApp Dialog */}
      {showWhatsAppDialog && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl"
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Send WhatsApp Message</h2>
              <button
                onClick={handleCloseWhatsAppDialog}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <FiX className="text-lg text-gray-600" />
              </button>
            </div>

            {/* Client Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Client: <span className="font-semibold text-gray-900">{selectedClient.name}</span></p>
              <p className="text-sm text-gray-600">Remaining: <span className="font-semibold text-red-600">₹{(selectedClient.remainingAmount || 0).toLocaleString()}</span></p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Request Amount Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Request Amount</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                    <span className="text-lg">₹</span>
                  </div>
                  <input
                    type="number"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    placeholder="Enter amount to request"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                  />
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={handleCloseWhatsAppDialog}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendWhatsAppMessage}
                disabled={!requestAmount}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  requestAmount 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Send Message
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Recovery Payment Dialog */}
      {showAddPaymentDialog && selectedProjectForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-sm shadow-2xl my-auto max-h-[95vh] overflow-y-auto"
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Add Recovery Payment</h2>
              <button
                onClick={handleCloseAddPaymentDialog}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200 flex-shrink-0"
              >
                <FiX className="text-lg text-gray-600" />
              </button>
            </div>

            {/* Project Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">
                Client: <span className="font-semibold text-gray-900">
                  {selectedProjectForPayment.clientName || 'Unknown Client'}
                </span>
              </p>
              {selectedProjectForPayment.companyName && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedProjectForPayment.companyName}
                </p>
              )}
              <p className="text-xs sm:text-sm text-gray-600 mt-2">
                Available: <span className="font-semibold text-red-600">
                  ₹{(() => {
                    const pendingReceipts = projectPaymentReceipts[selectedProjectForPayment.projectId]?.filter(r => r.status === 'pending') || []
                    const totalPending = pendingReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
                    const available = Math.max(0, (selectedProjectForPayment.remainingAmount || 0) - totalPending)
                    return available.toLocaleString()
                  })()}
                </span>
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 sm:space-y-4">
              {/* Amount Field */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Amount *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                    <span className="text-base sm:text-lg">₹</span>
                  </div>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                    className="w-full pl-8 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Account Field */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Account *</label>
                <select
                  value={paymentForm.accountId}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                >
                  <option value="">Select an account</option>
                  {accounts.map(account => (
                    <option key={account._id || account.id} value={account._id || account.id}>
                      {account.accountName || account.name || 'Account'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method Field */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Payment Method *</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                >
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Reference ID (Optional) */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Reference ID (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.referenceId || ''}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceId: e.target.value }))}
                  placeholder="Transaction / UTR reference"
                  className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                />
              </div>

              {/* Notes Field */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Notes (Optional)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 resize-none"
                />
              </div>

              {/* Info Message */}
              <div className="p-2.5 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> This payment receipt will be pending admin approval. The remaining amount will be updated immediately.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 sm:space-x-3 mt-4 sm:mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleCloseAddPaymentDialog}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:text-gray-900 transition-colors duration-200"
                disabled={isSubmittingPayment}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRecoveryPayment}
                disabled={isSubmittingPayment || !paymentForm.amount || !paymentForm.accountId}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg font-medium transition-all duration-200 ${
                  isSubmittingPayment || !paymentForm.amount || !paymentForm.accountId
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700'
                }`}
              >
                {isSubmittingPayment ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default SL_payments_recovery
