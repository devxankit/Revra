import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiUser,
  FiLogOut,
  FiX,
  FiAward,
  FiUsers,
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiBell
} from 'react-icons/fi'
import { getProfile, logoutCP, getStoredCPData } from '../CP-services/cpAuthService'
import { useToast } from '../../../contexts/ToastContext'

const CP_sidebar = ({ isOpen, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loggingOut, setLoggingOut] = useState(false)
  const [user, setUser] = useState({
    name: 'Channel Partner',
    email: '',
    avatar: 'CP'
  })

  const deriveAvatar = (name) => {
    if (!name) return 'CP'
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase())
      .join('')
    return initials.slice(0, 2) || 'CP'
  }

  useEffect(() => {
    const populateFromStored = () => {
      const stored = getStoredCPData?.()
      if (!stored) return
      setUser({
        name: stored.name || 'Channel Partner',
        email: stored.email || '',
        avatar: deriveAvatar(stored.name)
      })
    }

    populateFromStored()

    const loadProfile = async () => {
      try {
        const response = await getProfile()
        const cp = response?.data || {}
        setUser({
          name: cp.name || 'Channel Partner',
          email: cp.email || '',
          avatar: deriveAvatar(cp.name)
        })
      } catch (error) {
        console.error('Failed to load channel partner sidebar profile:', error)
      }
    }

    loadProfile()
  }, [])

  const navItems = [
    {
      path: '/cp-dashboard',
      label: 'Home',
      icon: FiHome
    },
    {
      path: '/cp-rewards',
      label: 'Rewards',
      icon: FiAward
    },
    {
      path: '/cp-converted',
      label: 'Converted',
      icon: FiCheckCircle
    },
    {
      path: '/cp-leads',
      label: 'Leads',
      icon: FiUsers
    },
    {
      path: '/cp-profile',
      label: 'Profile',
      icon: FiUser
    },
    {
      path: '/cp-notice-board',
      label: 'Notice Board',
      icon: FiBell
    }
  ]

  const handleLogout = async () => {
    if (loggingOut) return
    try {
      setLoggingOut(true)
      await logoutCP()
      toast.logout?.('You have been logged out successfully.', {
        title: 'Logged Out',
        duration: 3000
      })
      navigate('/cp-login')
    } catch (error) {
      console.error('Channel Partner logout failed:', error)
      toast.error?.('Unable to logout. Please try again.', {
        title: 'Logout Failed',
        duration: 4000
      })
    } finally {
      setLoggingOut(false)
    }
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
              height: 'calc(100vh - 3.5rem - 4rem)',
              bottom: '4rem'
            }}
          >
            {/* Header Section */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                  {user.email && (
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-teal-600' : 'text-gray-500'}`} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiLogOut className="h-5 w-5" />
                <span className="font-medium">{loggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default CP_sidebar
