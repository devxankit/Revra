import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../../../contexts/ToastContext'
import { 
  FiArrowLeft,
  FiFileText,
  FiCalendar,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiLoader
} from 'react-icons/fi'
import SL_navbar from '../SL-components/SL_navbar'
import { gradients } from '../../../lib/colors'
import salesClientService from '../SL-services/salesClientService'

const SL_ClientTransaction = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [clientName, setClientName] = useState('')

  useEffect(() => {
    if (id) {
      fetchTransactions()
      fetchClientName()
    }
  }, [id])

  const fetchClientName = async () => {
    try {
      const response = await salesClientService.getClientProfile(id)
      if (response.success && response.data) {
        setClientName(response.data.client?.name || 'Client')
      }
    } catch (err) {
      console.error('Error fetching client name:', err)
    }
  }

  const fetchTransactions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await salesClientService.getTransactions(id)
      if (response.success && response.data) {
        setTransactions(response.data || [])
      } else {
        throw new Error(response.message || 'Failed to fetch transactions')
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err.message || 'Failed to load transactions')
      toast.error(err.message || 'Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <FiCheckCircle className="w-4 h-4" />
      case 'rejected':
        return <FiXCircle className="w-4 h-4" />
      case 'pending':
      default:
        return <FiClock className="w-4 h-4" />
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <SL_navbar />
        <main className="max-w-md mx-auto min-h-screen pt-16 pb-20 flex items-center justify-center">
          <div className="text-center">
            <FiLoader className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading transactions...</p>
          </div>
        </main>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <SL_navbar />
        <main className="max-w-md mx-auto min-h-screen pt-16 pb-20 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-red-600 mb-4">{error}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <SL_navbar />
      
      <main className="max-w-md mx-auto min-h-screen pt-16 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
              <p className="text-sm text-gray-600">{clientName}</p>
            </div>
          </div>
        </motion.div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-4 mt-8 bg-white rounded-2xl p-8 shadow-lg border border-teal-100 text-center"
          >
            <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No transactions found</p>
            <p className="text-sm text-gray-500 mt-2">Payment receipts will appear here once created</p>
          </motion.div>
        ) : (
          <div className="mx-4 space-y-4">
            {transactions.map((transaction, index) => (
              <motion.div
                key={transaction._id || transaction.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-5 shadow-lg border border-teal-100"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FiDollarSign className="w-5 h-5 text-teal-600" />
                      <h3 className="text-lg font-bold text-gray-900">
                        ₹{transaction.amount?.toLocaleString() || '0'}
                      </h3>
                    </div>
                    {transaction.project?.name && (
                      <p className="text-sm text-gray-600 mb-1">
                        Project: {transaction.project.name}
                      </p>
                    )}
                    {transaction.account?.name && (
                      <p className="text-sm text-gray-500">
                        Account: {transaction.account.name}
                        {transaction.account.bankName && ` - ${transaction.account.bankName}`}
                      </p>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(transaction.status)}`}>
                    {getStatusIcon(transaction.status)}
                    {transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1) || 'Pending'}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiCalendar className="w-4 h-4" />
                    <span>{formatDate(transaction.createdAt)} {formatTime(transaction.createdAt)}</span>
                  </div>
                  
                  {transaction.method && (
                    <div className="text-sm text-gray-600">
                      Method: <span className="font-medium capitalize">{transaction.method.replace('_', ' ')}</span>
                    </div>
                  )}
                  
                  {transaction.referenceId && (
                    <div className="text-sm text-gray-600">
                      Reference: <span className="font-medium">{transaction.referenceId}</span>
                    </div>
                  )}
                  
                  {transaction.notes && (
                    <div className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Notes:</span> {transaction.notes}
                    </div>
                  )}
                  
                  {transaction.verifiedBy && transaction.verifiedAt && (
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                      Verified by {transaction.verifiedBy?.name || 'Admin'} on {formatDate(transaction.verifiedAt)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Summary Card */}
        {transactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: transactions.length * 0.05 }}
            className="mx-4 mt-6 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-5 shadow-lg border border-teal-200"
          >
            <h3 className="text-lg font-semibold text-teal-900 mb-3">Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-teal-700">Total Transactions:</span>
                <span className="font-semibold text-teal-900">{transactions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-teal-700">Total Amount:</span>
                <span className="font-semibold text-teal-900">
                  ₹{transactions.reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-teal-700">Approved:</span>
                <span className="font-semibold text-green-700">
                  ₹{transactions.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-teal-700">Pending:</span>
                <span className="font-semibold text-yellow-700">
                  ₹{transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}

export default SL_ClientTransaction

