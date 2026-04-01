import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  FiHome,
  FiUser,
  FiBell,
  FiMenu,
  FiLogOut,
  FiAward,
  FiUsers,
  FiCheckCircle
} from 'react-icons/fi'
import logo from '../../../assets/images/logo.png'
import CP_sidebar from './CP_sidebar'
import { logoutCP, getStoredCPData } from '../CP-services/cpAuthService'
import { useToast } from '../../../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'

function CP_navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [user, setUser] = useState({
    name: 'Channel Partner',
    avatar: 'CP'
  })
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const stored = getStoredCPData()
    if (stored) {
      const firstName = stored.name?.split(' ')[0] || ''
      const lastName = stored.name?.split(' ')[1] || ''
      const avatar = firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : '')

      setUser({
        name: stored.name || 'Channel Partner',
        avatar: avatar || 'CP'
      })
    }
  }, [])

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

  const navItems = [
    {
      path: '/cp-dashboard',
      label: 'Home',
      icon: FiHome,
      iconWithPower: false
    },
    {
      path: '/cp-rewards',
      label: 'Rewards',
      icon: FiAward,
      iconWithPower: false
    },
    {
      path: '/cp-leads',
      label: 'Leads',
      icon: FiUsers,
      iconWithPower: false
    },
    {
      path: '/cp-converted',
      label: 'Converted',
      icon: FiCheckCircle,
      iconWithPower: false
    },
    {
      path: '/cp-profile',
      label: 'Profile',
      icon: FiUser,
      iconWithPower: false
    }
  ]

  return (
    <>
      {/* Mobile Top Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm lg:hidden z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to="/cp-dashboard" className="flex items-center -ml-2">
            <img
              src={logo}
              alt="Appzeto"
              className="h-9 w-auto"
            />
          </Link>

          <div className="flex items-center space-x-2">
            {/* Notification Icon */}
            <Link
              to="/cp-notifications"
              className="relative p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              aria-label="Notifications"
            >
              <FiBell className="text-lg" />
            </Link>

            {/* Hamburger Menu Icon */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            >
              <FiMenu className="text-lg" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg lg:hidden z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const IconComponent = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center relative py-2 px-3 min-w-0 flex-1"
                aria-label={item.label}
              >
                {/* Icon */}
                <div className={`${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                  {item.iconWithPower ? (
                    <div className="relative">
                      <IconComponent className="text-xl" />
                    </div>
                  ) : (
                    <IconComponent className="text-xl" />
                  )}
                </div>

                {/* Label */}
                <span className={`text-xs font-medium mt-1 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop Top Navigation */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-50 h-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left side - Logo and Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Toggle sidebar"
              >
                <FiMenu className="h-5 w-5" />
              </button>

              <Link to="/cp-dashboard" className="flex items-center space-x-2">
                <img src={logo} alt="Appzeto" className="h-8 w-auto" />
                <span className="text-lg font-semibold text-gray-900">Channel Partner</span>
              </Link>
            </div>

            {/* Right side - User info and actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Link
                to="/cp-notifications"
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors relative"
                aria-label="Notifications"
              >
                <FiBell className="h-5 w-5" />
              </Link>

              {/* User Avatar */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  {user.avatar}
                </div>
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-2 rounded-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                aria-label="Logout"
              >
                <FiLogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <CP_sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  )
}

export default CP_navbar
