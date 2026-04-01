import React from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FiDollarSign,
  FiCalendar,
  FiCheck,
  FiClock,
  FiX
} from 'react-icons/fi'
import SL_navbar from '../SL-components/SL_navbar'

const SL_client_transaction = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  console.log('Client Transaction loaded with ID:', id)
  
  // Mock client and transaction data
  const clientData = {
    1: {
      id: 1,
      name: 'Teris',
      phone: '7846378987',
    },
    2: {
      id: 2,
      name: 'Ankit Ahirwar',
      phone: '9876543210',
    }
  }

  const transactionData = {
    1: [
      {
        id: 1,
        date: '2024-01-15',
        type: 'Advance Payment',
        amount: 15000,
        status: 'completed',
        method: 'Bank Transfer'
      },
      {
        id: 2,
        date: '2024-01-25',
        type: 'Milestone Payment',
        amount: 10000,
        status: 'completed',
        method: 'UPI'
      },
      {
        id: 3,
        date: '2024-02-10',
        type: 'Final Payment',
        amount: 5000,
        status: 'pending',
        method: 'Bank Transfer'
      }
    ],
    2: [
      {
        id: 1,
        date: '2024-01-01',
        type: 'Advance Payment',
        amount: 30000,
        status: 'completed',
        method: 'Bank Transfer'
      },
      {
        id: 2,
        date: '2024-01-20',
        type: 'Milestone Payment',
        amount: 20000,
        status: 'completed',
        method: 'UPI'
      },
      {
        id: 3,
        date: '2024-02-15',
        type: 'Final Payment',
        amount: 25000,
        status: 'completed',
        method: 'Bank Transfer'
      }
    ]
  }
  
  const client = clientData[id] || clientData[1]
  const transactions = transactionData[id] || transactionData[1]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FiCheck className="w-4 h-4 text-green-600" />
      case 'pending': return <FiClock className="w-4 h-4 text-yellow-600" />
      case 'failed': return <FiX className="w-4 h-4 text-red-600" />
      default: return <FiClock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />
      
      <main className="max-w-md mx-auto bg-white min-h-screen pt-16 pb-20">
        {/* Client Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-4 mt-4 p-4 bg-teal-50 rounded-xl border border-teal-100"
        >
          <h2 className="text-xl font-bold text-teal-800">{client.name}</h2>
          <p className="text-teal-600 mt-1">{client.phone}</p>
        </motion.div>

        {/* Transactions List */}
        <div className="p-4 space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment History</h3>
          
          {transactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <span className="text-teal-600 font-bold text-lg">₹</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{transaction.type}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <FiCalendar className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-500">{transaction.date}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{transaction.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-gray-800">₹{transaction.amount.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getStatusIcon(transaction.status)}
                    <span className={`text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Empty State */}
          {transactions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 font-bold text-2xl">₹</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600 text-sm">No payment history for this client yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default SL_client_transaction