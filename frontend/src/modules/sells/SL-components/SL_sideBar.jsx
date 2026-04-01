import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  FiHome, 
  FiZap, 
  FiPhone, 
  FiFileText, 
  FiLogOut,
  FiX,
  FiCreditCard,
  FiInbox,
  FiUsers
} from 'react-icons/fi'
import { colors, gradients } from '../../../lib/colors'
import { getStoredSalesData, logoutSales, clearSalesData } from '../SL-services/salesAuthService'
import { salesWalletService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'

const SL_sideBar = ({ isOpen, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [user, setUser] = useState({
    name: '',
    email: '',
    avatar: '',
    balance: 0,
    isTeamLead: false
  })
  
  // Load user data and wallet balance
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get user data from stored auth data
        const salesData = getStoredSalesData()
        if (salesData) {
          const firstName = salesData.name?.split(' ')[0] || ''
          const lastName = salesData.name?.split(' ')[1] || ''
          const avatar = firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : '')
          
          setUser(prev => ({
            ...prev,
            name: salesData.name || '',
            email: salesData.email || '',
            avatar: avatar || 'U',
            isTeamLead: salesData.isTeamLead || false
          }))
        }
        
        // Get wallet balance
        try {
          const walletData = await salesWalletService.getWalletSummary()
          const balance = Number(walletData?.incentive?.current || 0)
          setUser(prev => ({ ...prev, balance }))
        } catch (error) {
          console.error('Failed to load wallet balance:', error)
          // Keep balance as 0 if fetch fails
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      }
    }
    
    if (isOpen) {
      loadUserData()
    }
  }, [isOpen])

  // Calculate navItems based on user.isTeamLead - use useMemo to recalculate when isTeamLead changes
  const navItems = useMemo(() => [
    { 
      path: '/dashboard', 
      label: 'Home', 
      icon: FiHome
    },
    { 
      path: '/followup', 
      label: 'Today follow-ups', 
      icon: FiPhone
    },
    { 
      path: '/hot-leads', 
      label: 'Hot leads', 
      icon: FiZap
    },
    { 
      path: '/requests', 
      label: 'Requests', 
      icon: FiInbox
    },
    { 
      path: '/notice-board', 
      label: 'Notice Board', 
      icon: FiFileText
    },
    // Only show "My Team" for team leads
    ...(user.isTeamLead ? [{
      path: '/my-team',
      label: 'My Team',
      icon: FiUsers
    }] : [])
  ], [user.isTeamLead])

  const handleLogout = async () => {
    try {
      await logoutSales()
      clearSalesData()
      toast.logout('You have been successfully logged out', {
        title: 'Logged Out',
        duration: 2000
      })
      setTimeout(() => {
        navigate('/sales-login')
      }, 800)
    } catch (error) {
      console.error('Logout error:', error)
      clearSalesData()
      toast.error('Logout failed, but you have been logged out locally', {
        title: 'Logout Error',
        duration: 2000
      })
      setTimeout(() => {
        navigate('/sales-login')
      }, 1000)
    }
  }

  const handleWalletClick = () => {
    navigate('/wallet')
    onClose()
  }

  const handleAddRecoveryClick = () => {
    navigate('/payments-recovery')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 200,
              duration: 0.3 
            }}
            className="fixed top-14 left-0 w-72 bg-white shadow-2xl z-40 lg:hidden"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              height: 'calc(100vh - 7rem)',
              bottom: '4rem'
            }}
          >
            {/* Header Section with Teal Background */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
              className="relative bg-gradient-to-br from-teal-500 to-teal-600 p-4 pt-12"
              style={{ background: gradients.primary }}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <FiX className="w-5 h-5" />
              </button>

              {/* User Profile Section */}
              <div className="flex items-center gap-3 mb-4">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 300 }}
                  className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
                >
                  <span className="text-lg font-bold text-gray-800">{user.avatar || 'U'}</span>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, duration: 0.3, ease: "easeOut" }}
                  className="flex-1"
                >
                  <h2 className="text-base font-bold text-white">{user.name || 'Sales User'}</h2>
                  <p className="text-xs text-white/80">{user.email || 'sales@example.com'}</p>
                </motion.div>
              </div>

              {/* Balance Card */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                onClick={handleWalletClick}
                className="w-full bg-white rounded-lg p-3 shadow-xl hover:shadow-2xl transition-all duration-200"
                style={{
                  boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-teal-100 rounded flex items-center justify-center">
                      <FiCreditCard className="w-3 h-3 text-teal-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">My balance</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">₹{user.balance.toLocaleString()}</span>
                </div>
              </motion.button>
            </motion.div>

            {/* Navigation Section */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3, ease: "easeOut" }}
              className="flex-1 p-4 flex flex-col"
            >
              {/* Add Recovery Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                onClick={handleAddRecoveryClick}
                className="w-full mb-4 py-2.5 px-3 rounded-lg text-white font-semibold shadow-lg text-sm"
                style={{ 
                  background: gradients.primary,
                  boxShadow: '0 4px 12px -3px rgba(20, 184, 166, 0.3), 0 2px 6px -2px rgba(0, 0, 0, 0.1)'
                }}
              >
                Add recovery
              </motion.button>

              {/* Navigation Links */}
              <div className="space-y-1 flex-1">
                {navItems.map((item, index) => {
                  const IconComponent = item.icon
                  const isActive = location.pathname === item.path
                  
                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + (index * 0.05), duration: 0.3, ease: "easeOut" }}
                    >
                      <Link
                        to={item.path}
                        onClick={onClose}
                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-teal-600'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-gray-500'}`} />
                        <span className="font-medium text-sm">{item.label}</span>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>

              {/* Separator */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.3, ease: "easeOut" }}
                className="my-3 border-t border-gray-200"
              />

              {/* Logout Button */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.85, duration: 0.3, ease: "easeOut" }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="flex items-center gap-3 p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 w-full"
              >
                <FiLogOut className="w-4 h-4 text-red-600" />
                <span className="font-medium text-sm">Logout</span>
              </motion.button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SL_sideBar
