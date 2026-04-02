import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../../../contexts/ToastContext'
import { 
  FiPhone, 
  FiPlus,
  FiUser,
  FiArrowLeft,
  FiDollarSign,
  FiTrendingUp,
  FiPause,
  FiCheck,
  FiArrowRight,
  FiCreditCard,
  FiClock,
  FiCalendar,
  FiFileText,
  FiSettings,
  FiMessageCircle,
  FiEdit3,
  FiDownload,
  FiShare2,
  FiLoader,
  FiX
} from 'react-icons/fi'
import SL_navbar from '../SL-components/SL_navbar'
import { colors, gradients } from '../../../lib/colors'
import salesClientService from '../SL-services/salesClientService'
import { salesPaymentsService } from '../SL-services'

const SL_ClientProfile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  // Client profile data state
  const [clientData, setClientData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showTransferConfirmation, setShowTransferConfirmation] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [amount, setAmount] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [referenceId, setReferenceId] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentReceipts, setPaymentReceipts] = useState([])
  const [showAccelerateModal, setShowAccelerateModal] = useState(false)
  const [showHoldModal, setShowHoldModal] = useState(false)
  const [showIncreaseCostModal, setShowIncreaseCostModal] = useState(false)
  const [accelerateReason, setAccelerateReason] = useState('')
  const [holdReason, setHoldReason] = useState('')
  const [increaseAmount, setIncreaseAmount] = useState('')
  const [increaseReason, setIncreaseReason] = useState('')
  const [accounts, setAccounts] = useState([])
  const [salesTeam, setSalesTeam] = useState([])

  const formatWhole = (value) => {
    const n = Math.round(Number(value || 0))
    return n.toLocaleString()
  }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTransferred, setIsTransferred] = useState(false)
  const dropdownRef = useRef(null)
  
  // Fetch client profile data
  useEffect(() => {
    if (id && !isTransferred) {
      fetchClientProfile()
      fetchAccounts()
      fetchSalesTeam()
    }
  }, [id, isTransferred])

  // Refresh client profile when component becomes visible (handles back navigation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && id && !isTransferred) {
        fetchClientProfile()
      }
    }
    
    const handleFocus = () => {
      if (id && !isTransferred) {
        fetchClientProfile()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [id, isTransferred])

  const fetchClientProfile = async () => {
    // Don't fetch if client has been transferred
    if (isTransferred) {
      return
    }
    
    setIsLoading(true)
    setError(null)
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const projectId = urlParams.get('projectId')
      const response = await salesClientService.getClientProfile(id, projectId || undefined)
      if (response.success && response.data) {
        setClientData(response.data)
      } else {
        throw new Error(response.message || 'Failed to fetch client profile')
      }
    } catch (err) {
      // Don't show error if client was transferred (403 is expected)
      if (isTransferred || err.message?.includes('Not authorized') || err.message?.includes('403')) {
        // Silently handle - client was transferred, navigate away
        if (!isTransferred) {
          setIsTransferred(true)
          navigate('/clients')
        }
        return
      }
      console.error('Error fetching client profile:', err)
      setError(err.message || 'Failed to load client profile')
      toast.error(err.message || 'Failed to load client profile')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const accounts = await salesClientService.getAccounts()
      setAccounts(Array.isArray(accounts) ? accounts : [])
    } catch (err) {
      console.error('Error fetching accounts:', err)
    }
  }

  const fetchSalesTeam = async () => {
    try {
      const response = await salesClientService.getSalesTeam()
      // Backend returns { success: true, data: [...] }
      if (response?.success && Array.isArray(response.data)) {
        setSalesTeam(response.data)
      } else if (Array.isArray(response)) {
        setSalesTeam(response)
      }
    } catch (err) {
      console.error('Error fetching sales team:', err)
    }
  }

  const handleAddMoney = async () => {
    const amountValue = Math.round(Number(amount) || 0)
    if (!amountValue || amountValue <= 0) {
      toast.error('Please enter a valid amount greater than 0')
      return
    }

    if (!selectedAccountId) {
      toast.error('Please select an account')
      return
    }

    // Calculate available amount (remaining - pending receipts)
    const pendingReceipts = paymentReceipts.filter(r => r.status === 'pending') || []
    const totalPending = pendingReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
    const availableAmount = Math.max(0, (clientData?.financial?.pending || 0) - totalPending)

    if (amountValue > availableAmount) {
      toast.error(`Amount exceeds available balance. Available: ₹${availableAmount.toLocaleString()}`)
      return
    }

    setIsSubmitting(true)
    try {
      await salesClientService.createPayment(id, {
        amount: amountValue,
        accountId: selectedAccountId,
        method: paymentMethod,
        referenceId: referenceId?.trim() || undefined,
        notes: paymentNotes || undefined
      })
      toast.success('Payment receipt created successfully. Pending admin approval.')
      setShowAddMoneyModal(false)
      setAmount('')
      setSelectedAccount('')
      setSelectedAccountId('')
      setPaymentMethod('upi')
      setReferenceId('')
      setPaymentNotes('')
      // Refresh client data to update financial info
      await fetchClientProfile()
      // Refresh payment receipts
      const projectId = clientData?.project?.projectDetails?._id || clientData?.allProjects?.[0]?._id
      if (projectId) {
        try {
          const receipts = await salesPaymentsService.getPaymentReceipts(projectId)
          setPaymentReceipts(receipts || [])
        } catch (e) {
          console.error('Failed to refresh payment receipts', e)
        }
      }
    } catch (err) {
      console.error('Error creating payment:', err)
      toast.error(err.message || 'Failed to create payment receipt')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fetch payment receipts when modal opens
  const handleOpenAddMoneyModal = async () => {
    setShowAddMoneyModal(true)
    // Fetch payment receipts to calculate available amount
    const projectId = clientData?.project?.projectDetails?._id || clientData?.allProjects?.[0]?._id
    if (projectId) {
      try {
        const receipts = await salesPaymentsService.getPaymentReceipts(projectId)
        setPaymentReceipts(receipts || [])
      } catch (e) {
        console.error('Failed to fetch payment receipts', e)
        setPaymentReceipts([])
      }
    } else {
      setPaymentReceipts([])
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAccountDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  const handleTransferClient = () => {
    if (selectedUser) {
      setShowTransferModal(false)
      setShowTransferConfirmation(true)
    }
  }

  const handleConfirmTransfer = async () => {
    if (!selectedUserId) {
      toast.error('Please select a team member')
      return
    }

    setIsSubmitting(true)
    try {
      await salesClientService.transferClient(id, selectedUserId)
      // Mark as transferred to prevent further fetches
      setIsTransferred(true)
      toast.success('Client transferred successfully')
      setShowTransferConfirmation(false)
      setSelectedUser('')
      setSelectedUserId('')
      setShowUserDropdown(false)
      // Navigate to converted clients page immediately since we no longer have access to this client
      navigate('/converted')
    } catch (err) {
      console.error('Error transferring client:', err)
      toast.error(err.message || 'Failed to transfer client')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleCompleteProject = async () => {
    setIsSubmitting(true)
    try {
      await salesClientService.markCompleted(id)
      toast.success('Project marked as completed successfully')
      // Refresh client data
      fetchClientProfile()
    } catch (err) {
      console.error('Error marking project as completed:', err)
      toast.error(err.message || 'Failed to mark project as completed')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleAccelerateWork = async () => {
    if (!accelerateReason.trim()) {
      toast.error('Please enter a reason')
      return
    }

    setIsSubmitting(true)
    try {
      await salesClientService.createProjectRequest(id, {
        requestType: 'accelerate_work',
        reason: accelerateReason.trim()
      })
      toast.success('Request sent successfully. Admin will review it.')
      setShowAccelerateModal(false)
      setAccelerateReason('')
    } catch (err) {
      console.error('Error creating accelerate request:', err)
      toast.error(err.message || 'Failed to create request')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleHoldWork = async () => {
    if (!holdReason.trim()) {
      toast.error('Please enter a reason')
      return
    }

    setIsSubmitting(true)
    try {
      await salesClientService.createProjectRequest(id, {
        requestType: 'hold_work',
        reason: holdReason.trim()
      })
      toast.success('Request sent successfully. Admin will review it.')
      setShowHoldModal(false)
      setHoldReason('')
    } catch (err) {
      console.error('Error creating hold request:', err)
      toast.error(err.message || 'Failed to create request')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleIncreaseCost = async () => {
    if (!increaseAmount || !increaseReason.trim()) {
      toast.error('Please enter amount and reason')
      return
    }

    const parseAmount = (val) => Math.round(Number(String(val || '').replace(/,/g, '')) || 0)
    const amountValue = parseAmount(increaseAmount)
    if (amountValue <= 0) {
      toast.error('Please enter a valid positive amount')
      return
    }

    setIsSubmitting(true)
    try {
      await salesClientService.increaseCost(id, {
        amount: amountValue,
        reason: increaseReason.trim()
      })
      toast.success('Request for cost increase submitted successfully. Pending admin approval.')
      setShowIncreaseCostModal(false)
      setIncreaseAmount('')
      setIncreaseReason('')
      // Refresh client data (cost won't change until admin approves)
      fetchClientProfile()
    } catch (err) {
      console.error('Error creating cost increase request:', err)
      toast.error(err.message || 'Failed to create cost increase request')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleViewTransactions = () => {
    navigate(`/client-transaction/${id}`)
  }

  // Helper to format project status for display
  const formatProjectStatus = (status) => {
    if (!status) return 'N/A'
    const statusMap = {
      'pending-assignment': 'Pending Assignment',
      'untouched': 'Untouched',
      'started': 'Started',
      'active': 'Active',
      'on-hold': 'On Hold',
      'testing': 'Testing',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    }
    return statusMap[status] || status
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <SL_navbar />
        <main className="max-w-md mx-auto min-h-screen pt-16 pb-20 flex items-center justify-center">
          <div className="text-center">
            <FiLoader className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading client profile...</p>
          </div>
        </main>
      </div>
    )
  }

  // Error state
  if (error || !clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <SL_navbar />
        <main className="max-w-md mx-auto min-h-screen pt-16 pb-20 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-red-600 mb-4">{error || 'Client not found'}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Go Back
            </button>
          </div>
        </main>
      </div>
    )
  }

  const client = clientData.client
  const financial = clientData.financial
  const project = clientData.project
  const saleApproval = clientData.saleApproval
  const workProgress = Math.min(100, Math.max(0, Number(project?.workProgress ?? project?.projectDetails?.progress ?? 0) || 0))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <SL_navbar />
      
      <main className="max-w-md mx-auto min-h-screen pt-16 pb-20">

        {/* Client Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-4 mt-4 rounded-2xl overflow-hidden shadow-xl border border-teal-300/40"
          style={{ 
            background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1, #99f6e4)',
            boxShadow: '0 8px 25px -5px rgba(20, 184, 166, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-teal-500 flex items-center justify-center shadow-lg">
                      <span className="text-2xl font-bold text-white">{client.avatar}</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-teal-800">{client.name}</h2>
                      <p className="text-teal-600 text-sm">{client.phone}</p>
                    </div>
                  </div>
                  {saleApproval && saleApproval.status !== 'not_required' && (
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        saleApproval.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {saleApproval.status === 'approved'
                        ? 'Sale Approved'
                        : 'Pending Sale Approval'}
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {/* Total Cost */}
                  <div className="flex justify-between items-center pb-2 border-b border-teal-200">
                    <span className="text-teal-700 text-sm font-medium">Total Cost</span>
                    <span className="text-teal-800 font-bold text-base">₹{formatWhole(financial?.totalCost || 0)}</span>
                  </div>
                  
                  {/* Payment Breakdown */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs text-teal-600 font-semibold mb-1.5">Payment Breakdown:</div>
                    
                    {/* From Receipts (approved advance/recovery receipts) */}
                    {(financial?.breakdown?.fromReceipts || 0) > 0 && (
                      <div className="flex justify-between items-center pl-3">
                        <span className="text-teal-600 text-xs">From Receipts</span>
                        <span className="text-teal-700 font-semibold text-xs">₹{formatWhole(financial?.breakdown?.fromReceipts || 0)}</span>
                      </div>
                    )}
                    
                    {/* From Installments */}
                    {(financial?.breakdown?.fromInstallments || 0) > 0 && (
                      <div className="flex justify-between items-center pl-3">
                        <span className="text-teal-600 text-xs">From Installments</span>
                        <span className="text-teal-700 font-semibold text-xs">₹{formatWhole(financial?.breakdown?.fromInstallments || 0)}</span>
                      </div>
                    )}
                    
                    {/* From Admin Recoveries */}
                    {(financial?.breakdown?.fromAdminRecoveries || 0) > 0 && (
                      <div className="flex justify-between items-center pl-3">
                        <span className="text-teal-600 text-xs">From Admin Recoveries</span>
                        <span className="text-teal-700 font-semibold text-xs">₹{formatWhole(financial?.breakdown?.fromAdminRecoveries || 0)}</span>
                      </div>
                    )}
                    
                    {/* Total Paid */}
                    <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-teal-200">
                      <span className="text-teal-700 text-sm font-semibold">Total Paid</span>
                      <span className="text-teal-800 font-bold text-sm">₹{formatWhole(financial?.breakdown?.totalPaid || financial?.advanceReceived || 0)}</span>
                    </div>
                  </div>
                  
                  {/* Pending Amount */}
                  <div className="flex justify-between items-center pt-2 border-t border-teal-300">
                    <span className="text-teal-700 text-sm font-semibold">Pending</span>
                    <span className={`font-bold text-base ${(financial?.pending || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{formatWhole(financial?.pending || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Work Progress Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-4 mt-6 bg-white rounded-2xl p-6 shadow-xl border border-teal-100"
          style={{
            boxShadow: '0 4px 12px -3px rgba(20, 184, 166, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Work Progress</h3>
            <span className="text-lg font-semibold text-gray-600">{workProgress}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${workProgress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-3 rounded-full"
              style={{ background: gradients.primary }}
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>Status: <span className="font-medium text-teal-700">{formatProjectStatus(project?.status)}</span></p>
            <p>Project: <span className="text-teal-600">
              {project?.projectDetails?.name || project?.name || 'N/A'}
            </span></p>
          </div>
        </motion.div>

        {/* Action Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-4 mt-6 space-y-4"
        >
          {/* Transactions Card */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleViewTransactions}
            className="bg-white rounded-xl p-4 shadow-lg border border-teal-100 cursor-pointer hover:shadow-xl transition-all"
            style={{
              boxShadow: '0 4px 12px -3px rgba(20, 184, 166, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                  <FiFileText className="w-5 h-5 text-teal-600" />
                </div>
                <span className="font-semibold text-gray-800">Transactions</span>
              </div>
              <FiArrowRight className="w-5 h-5 text-teal-500" />
            </div>
          </motion.div>

          {/* Add Money Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenAddMoneyModal}
            className="w-full rounded-xl p-4 shadow-xl border-0 text-white font-semibold flex items-center justify-center gap-2"
            style={{ 
              background: gradients.primary,
              boxShadow: '0 8px 25px -5px rgba(20, 184, 166, 0.3), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <FiPlus className="w-5 h-5" />
            Add Money
          </motion.button>

          {/* Accelerate Work Card */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAccelerateModal(true)}
            className="bg-white rounded-xl p-4 shadow-lg border border-teal-100 cursor-pointer hover:shadow-xl transition-all"
            style={{
              boxShadow: '0 4px 12px -3px rgba(20, 184, 166, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                  <FiTrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                <span className="font-semibold text-gray-800">Accelerate work</span>
              </div>
              <FiArrowRight className="w-5 h-5 text-teal-500" />
            </div>
          </motion.div>

          {/* Hold Work Card */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowHoldModal(true)}
            className="bg-white rounded-xl p-4 shadow-lg border border-teal-100 cursor-pointer hover:shadow-xl transition-all"
            style={{
              boxShadow: '0 4px 12px -3px rgba(20, 184, 166, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                  <FiPause className="w-5 h-5 text-teal-600" />
                </div>
                <span className="font-semibold text-gray-800">Hold work</span>
              </div>
              <FiArrowRight className="w-5 h-5 text-teal-500" />
            </div>
          </motion.div>

          {/* Increase Cost Card */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowIncreaseCostModal(true)}
            className="bg-white rounded-xl p-4 shadow-lg border border-teal-100 cursor-pointer hover:shadow-xl transition-all"
            style={{
              boxShadow: '0 4px 12px -3px rgba(20, 184, 166, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                  <FiDollarSign className="w-5 h-5 text-teal-600" />
                </div>
                <span className="font-semibold text-gray-800">Increase cost</span>
              </div>
              <FiArrowRight className="w-5 h-5 text-teal-500" />
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-4 mt-8 mb-8 space-y-3"
        >
          {/* Transfer Client Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTransferModal(true)}
            className="w-full rounded-xl p-4 shadow-xl border-0 text-white font-semibold flex items-center justify-center gap-2"
            style={{ 
              background: gradients.primary,
              boxShadow: '0 8px 25px -5px rgba(20, 184, 166, 0.3), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <FiArrowRight className="w-5 h-5" />
            Transfer Client
          </motion.button>

          {/* No Dues Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCompleteProject}
            className="w-full rounded-xl p-4 shadow-xl border-0 text-white font-semibold flex items-center justify-center gap-2"
            style={{ 
              background: gradients.primary,
              boxShadow: '0 8px 25px -5px rgba(20, 184, 166, 0.3), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <FiCheck className="w-5 h-5" />
            No Dues
          </motion.button>
        </motion.div>

        {/* Add Money Modal */}
        {showAddMoneyModal && (
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
                <h2 className="text-base sm:text-lg font-bold text-gray-900">{clientData?.client?.name || 'Client'}</h2>
                <button
                  onClick={() => {
                    setShowAddMoneyModal(false)
                    setAmount('')
                    setSelectedAccount('')
                    setSelectedAccountId('')
                    setPaymentMethod('upi')
                    setReferenceId('')
                    setPaymentNotes('')
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200 flex-shrink-0"
                >
                  <FiX className="text-lg text-gray-600" />
                </button>
              </div>

              {/* Available Amount Info */}
              {clientData?.financial && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Available: <span className="font-semibold text-red-600">
                      ₹{(() => {
                        const pendingReceipts = paymentReceipts.filter(r => r.status === 'pending') || []
                        const totalPending = pendingReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
                        const available = Math.max(0, (clientData.financial.pending || 0) - totalPending)
                        return available.toLocaleString()
                      })()}
                    </span>
                  </p>
                </div>
              )}

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
                      min="0"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Account Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Account *</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => {
                    const accountId = e.target.value
                    const account = accounts.find(acc => (acc._id || acc.id) === accountId)
                    setSelectedAccountId(accountId)
                    setSelectedAccount(account ? (account.accountName || account.name || '') : '')
                    }}
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
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
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
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
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
                  onClick={() => {
                    setShowAddMoneyModal(false)
                    setAmount('')
                    setSelectedAccount('')
                    setSelectedAccountId('')
                    setPaymentMethod('upi')
                    setReferenceId('')
                    setPaymentNotes('')
                  }}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:text-gray-900 transition-colors duration-200"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMoney}
                  disabled={isSubmitting || !amount || !selectedAccountId}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg font-medium transition-all duration-200 ${
                    isSubmitting || !amount || !selectedAccountId
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Payment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Transfer Client Modal */}
        {showTransferModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowTransferModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Transfer Client</h3>
              
              <div className="space-y-4">
                {/* User Selection Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Team Member
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 bg-white text-left flex items-center justify-between"
                    >
                      <span className="text-gray-800">
                        {selectedUser || 'Choose team member'}
                      </span>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Options */}
                    {showUserDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                      >
                        {salesTeam.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No team members available
                          </div>
                        ) : (
                          salesTeam.map((member) => (
                            <button
                              key={member._id || member.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser(member.name)
                                setSelectedUserId(member._id || member.id)
                                setShowUserDropdown(false)
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                selectedUserId === (member._id || member.id) ? 'bg-teal-50 text-teal-700' : 'text-gray-800'
                              }`}
                            >
                              {member.name}
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransferClient}
                    disabled={!selectedUser}
                    className={`flex-1 px-4 py-3 rounded-lg text-white font-medium ${
                      selectedUser 
                        ? 'opacity-100' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    style={{ background: gradients.primary }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Transfer Confirmation Modal */}
        {showTransferConfirmation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowTransferConfirmation(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Confirm Transfer</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to transfer <span className="font-semibold">{client.name}</span> to <span className="font-semibold">{selectedUser}</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTransferConfirmation(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTransfer}
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-3 rounded-lg text-white font-medium ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ background: gradients.primary }}
                >
                  {isSubmitting ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Accelerate Work Modal */}
        {showAccelerateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAccelerateModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Accelerate work</h3>
              
              <div className="space-y-4">
                {/* Reason Input */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-teal-600 text-lg">⚡</span>
                  </div>
                  <input
                    type="text"
                    value={accelerateReason}
                    onChange={(e) => setAccelerateReason(e.target.value)}
                    placeholder="Enter reason here"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowAccelerateModal(false)}
                    className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAccelerateWork}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-lg text-white font-medium ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ background: gradients.primary }}
                  >
                    {isSubmitting ? 'Sending...' : 'Ok'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Hold Work Modal */}
        {showHoldModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowHoldModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Hold work</h3>
              
              <div className="space-y-4">
                {/* Reason Input */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-1 h-3 bg-teal-600 rounded-sm mr-0.5"></div>
                      <div className="w-1 h-3 bg-teal-600 rounded-sm"></div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    placeholder="Enter reason here"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowHoldModal(false)}
                    className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleHoldWork}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-lg text-white font-medium ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ background: gradients.primary }}
                  >
                    {isSubmitting ? 'Sending...' : 'Ok'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Increase Cost Modal */}
        {showIncreaseCostModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowIncreaseCostModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Increase cost</h3>
              
              <div className="space-y-4">
                {/* Amount Input */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-teal-600 font-bold text-lg">₹</span>
                  </div>
                  <input
                    type="number"
                    value={increaseAmount}
                    onChange={(e) => setIncreaseAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                  />
                  {clientData?.project?.projectDetails?.financialDetails?.includeGST && (
                    <p className="mt-1 text-xs text-teal-600">
                      Enter base amount; 18% GST will be added.
                    </p>
                  )}
                </div>

                {/* Reason Input */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <FiTrendingUp className="w-5 h-5 text-teal-600" />
                  </div>
                  <input
                    type="text"
                    value={increaseReason}
                    onChange={(e) => setIncreaseReason(e.target.value)}
                    placeholder="Enter reason here"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowIncreaseCostModal(false)}
                    className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleIncreaseCost}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-lg text-white font-medium ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ background: gradients.primary }}
                  >
                    {isSubmitting ? 'Updating...' : 'Ok'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  )
}

export default SL_ClientProfile
