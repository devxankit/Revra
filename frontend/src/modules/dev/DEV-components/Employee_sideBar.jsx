import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiFolder,
  FiCheckSquare,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiLogOut,
  FiX,
  FiCreditCard
} from 'react-icons/fi'
import { colors, gradients } from '../../../lib/colors'
import {
  employeeWalletService,
  getEmployeeProfile,
  getStoredEmployeeData,
  storeEmployeeData,
  clearEmployeeData,
  logoutEmployee
} from '../DEV-services'

const Employee_sideBar = ({ isOpen, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState({
    name: 'Employee',
    email: 'employee@appzeto.com',
    avatar: 'EM'
  })
  const [isTeamLead, setIsTeamLead] = useState(false)
  const [walletSummary, setWalletSummary] = useState({
    monthlySalary: 0,
    monthlyRewards: 0,
    totalEarnings: 0
  })
  const [isLoading, setIsLoading] = useState(false)

  const getInitials = (name, fallback = 'EM') => {
    if (!name) return fallback
    const parts = name.trim().split(/\s+/)
    const initials = parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('')
    return initials || fallback
  }

  const normalizeProfileData = (data) => {
    if (!data || typeof data !== 'object') return null

    const firstName = data.firstName || data.firstname || data.givenName
    const lastName = data.lastName || data.lastname || data.familyName
    const fullName = data.fullName || data.fullname || data.name || [firstName, lastName].filter(Boolean).join(' ').trim()
    const username = data.username || data.userName
    const email = data.email || data.emailAddress || (username && username.includes('@') ? username : '')

    const resolvedName = (fullName && fullName.length > 0)
      ? fullName
      : (username && !username.includes('@'))
        ? username
        : (email ? email.split('@')[0] : '')

    return {
      name: resolvedName || 'Employee',
      email: email || data.contactEmail || 'employee@appzeto.com',
      avatar: getInitials(resolvedName || email || 'EM'),
      raw: data
    }
  }

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    const loadSidebarData = async () => {
      setIsLoading(true)

      try {
        const storedProfile = getStoredEmployeeData?.()
        const normalizedStored = normalizeProfileData(storedProfile)
        if (normalizedStored && isMounted) {
          setUser({
            name: normalizedStored.name,
            email: normalizedStored.email,
            avatar: normalizedStored.avatar
          })
          setIsTeamLead(Boolean(storedProfile?.isTeamLead))
        }

        const [profileResponse, walletResponse] = await Promise.allSettled([
          getEmployeeProfile?.(),
          employeeWalletService.getWalletSummary()
        ])

        if (profileResponse.status === 'fulfilled') {
          const response = profileResponse.value
          const rawProfile = response?.data?.employee
            || response?.data?.profile
            || response?.data?.user
            || response?.data
            || response?.profile
            || null

          const normalizedApiProfile = normalizeProfileData(rawProfile)

          if (response?.success && normalizedApiProfile && isMounted) {
            setUser({
              name: normalizedApiProfile.name,
              email: normalizedApiProfile.email,
              avatar: normalizedApiProfile.avatar
            })
            setIsTeamLead(Boolean(rawProfile?.isTeamLead))
            const dataToStore = normalizedApiProfile.raw || rawProfile || {
              name: normalizedApiProfile.name,
              email: normalizedApiProfile.email
            }
            storeEmployeeData?.(dataToStore)
          }
        }

        if (walletResponse.status === 'fulfilled') {
          const response = walletResponse.value
          const summaryData = response?.data || {}

          if (response?.success && isMounted) {
            setWalletSummary({
              monthlySalary: summaryData.monthlySalary || 0,
              monthlyRewards: summaryData.monthlyRewards || 0,
              totalEarnings: summaryData.totalEarnings ?? ((summaryData.monthlySalary || 0) + (summaryData.monthlyRewards || 0))
            })
          }
        }
      } catch (error) {
        console.error('Error loading sidebar data:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSidebarData()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const baseNavItems = [
    { path: '/employee-dashboard', label: 'Home', icon: FiHome },
    { path: '/employee-projects', label: 'Projects', icon: FiFolder },
    { path: '/employee-tasks', label: 'Tasks', icon: FiCheckSquare },
    ...(isTeamLead ? [{ path: '/employee-team-management', label: 'Team Management', icon: FiUsers }] : []),
    { path: '/employee-leaderboard', label: 'Leaderboard', icon: FiTrendingUp },
    { path: '/employee-profile', label: 'Profile', icon: FiUser }
  ]
  const navItems = baseNavItems

  const handleLogout = async () => {
    try {
      await logoutEmployee()
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      clearEmployeeData?.()
      onClose?.()
      navigate('/employee-login', { replace: true })
    }
  }

  const handleWalletClick = () => {
    if (isLoading) return
    navigate('/employee-wallet')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200, duration: 0.3 }}
            className="fixed top-14 left-0 w-72 bg-white shadow-2xl z-40 lg:hidden"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)', height: 'calc(100vh - 7rem)', bottom: '4rem' }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
              className="relative bg-gradient-to-br from-teal-500 to-teal-600 p-4 pt-12"
              style={{ background: gradients.primary }}
            >
              <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                <FiX className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 300 }} className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-lg font-bold text-gray-800">{user.avatar}</span>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.3, ease: 'easeOut' }} className="flex-1">
                  <h2 className="text-base font-bold text-white">{user.name}</h2>
                  <p className="text-xs text-white/80">{user.email}</p>
                </motion.div>
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                onClick={handleWalletClick}
                disabled={isLoading}
                className={`w-full bg-white rounded-lg p-3 shadow-xl transition-all duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-2xl'}`}
                style={{ boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1)' }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-teal-100 rounded flex items-center justify-center">
                        <FiCreditCard className="w-3 h-3 text-teal-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">Monthly Earnings</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {isLoading ? 'Loading...' : `₹${(walletSummary.monthlySalary + walletSummary.monthlyRewards).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Salary: ₹{walletSummary.monthlySalary.toLocaleString()}</span>
                    <span>Rewards: ₹{walletSummary.monthlyRewards.toLocaleString()}</span>
                  </div>
                </div>
              </motion.button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.3, ease: 'easeOut' }} className="flex-1 p-4 flex flex-col">
              <div className="space-y-1 flex-1">
                {navItems.map((item, index) => {
                  const IconComponent = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <motion.div key={item.path} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + index * 0.05, duration: 0.3, ease: 'easeOut' }}>
                      <Link to={item.path} onClick={onClose} className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 ${isActive ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-700 hover:bg-gray-50 hover:text-teal-600'}`}>
                        <IconComponent className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-gray-500'}`} />
                        <span className="font-medium text-sm">{item.label}</span>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.3, ease: 'easeOut' }} className="my-3 border-t border-gray-200" />

              <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.85, duration: 0.3, ease: 'easeOut' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleLogout} className="flex items-center gap-3 p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 w-full">
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

export default Employee_sideBar


