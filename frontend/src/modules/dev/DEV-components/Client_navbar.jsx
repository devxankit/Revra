import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  FiHome, 
  FiFolder, 
  FiFileText, 
  FiSearch,
  FiUser,
  FiBell,
  FiMenu,
  FiCreditCard,
  FiAlertCircle
} from 'react-icons/fi'
import logo from '../../../assets/images/logo.png'
import Client_sidebar from './Client_sidebar'
import clientWalletService from '../DEV-services/clientWalletService'

function Client_navbar() {
  const location = useLocation()
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [walletSummary, setWalletSummary] = useState({
    totalCost: 0,
    currency: 'INR'
  })
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [overdueData, setOverdueData] = useState({
    count: 0,
    totalAmount: 0,
    hasOverdue: false
  })
  const [loadingOverdue, setLoadingOverdue] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadWalletSummary = async () => {
      try {
        setLoadingWallet(true)
        const response = await clientWalletService.getSummary()
        const summary = response?.summary || {}

        if (!isActive) return

        setWalletSummary({
          totalCost: Number(summary.totalCost) || 0,
          currency: summary.currency || 'INR'
        })
      } catch (error) {
        console.error('Failed to fetch wallet summary for navbar:', error)
        if (isActive) {
          setWalletSummary((prev) => ({
            ...prev,
            totalCost: 0
          }))
        }
      } finally {
        if (isActive) {
          setLoadingWallet(false)
        }
      }
    }

    loadWalletSummary()

    return () => {
      isActive = false
    }
  }, [])

  // Load overdue installments count
  useEffect(() => {
    let isActive = true
    let intervalId = null

    const loadOverdueCount = async () => {
      try {
        setLoadingOverdue(true)
        const response = await clientWalletService.getOverdueInstallmentsCount()
        
        if (!isActive) return

        setOverdueData({
          count: response.count || 0,
          totalAmount: response.totalAmount || 0,
          hasOverdue: response.hasOverdue || false
        })
      } catch (error) {
        console.error('Failed to fetch overdue installments count:', error)
        if (isActive) {
          setOverdueData({
            count: 0,
            totalAmount: 0,
            hasOverdue: false
          })
        }
      } finally {
        if (isActive) {
          setLoadingOverdue(false)
        }
      }
    }

    // Load immediately
    loadOverdueCount()

    // Refresh every 5 minutes to check for new overdue installments
    intervalId = setInterval(loadOverdueCount, 5 * 60 * 1000)

    return () => {
      isActive = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [])

  const currencyFormatter = useMemo(() => {
    const locale = walletSummary.currency === 'INR' ? 'en-IN' : 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: walletSummary.currency || 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }, [walletSummary.currency])

  const walletTotalDisplay = useMemo(() => {
    const amount = Number.isFinite(walletSummary.totalCost) ? walletSummary.totalCost : 0
    return currencyFormatter.format(amount)
  }, [currencyFormatter, walletSummary.totalCost])

  const navItems = [
    { 
      path: '/client-dashboard', 
      label: 'Home', 
      icon: FiHome,
      iconWithPower: false
    },
    { 
      path: '/client-projects', 
      label: 'Projects', 
      icon: FiFolder,
      iconWithPower: false
    },
    { 
      path: '/client-requests', 
      label: 'Requests', 
      icon: FiFileText,
      iconWithPower: false
    },
    { 
      path: '/client-explore', 
      label: 'Explore', 
      icon: FiSearch,
      iconWithPower: false
    },
    { 
      path: '/client-profile', 
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
          <Link to="/client-dashboard" className="flex items-center -ml-2">
            <img 
              src={logo} 
              alt="Appzeto" 
              className="h-9 w-auto"
            />
          </Link>
          
          <div className="flex items-center space-x-2">
            {/* Overdue Installments Alert */}
            {overdueData.hasOverdue && (
              <Link
                to="/client-wallet"
                className="relative group"
                title={`${overdueData.count} overdue installment${overdueData.count > 1 ? 's' : ''} - Click to view`}
              >
                <div className="relative flex items-center justify-center">
                  {/* Pulsing red circle background */}
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  {/* Red alert icon */}
                  <div className="relative bg-gradient-to-br from-red-500 to-red-600 p-2 rounded-full shadow-lg border-2 border-white">
                    <FiAlertCircle className="text-white text-sm font-bold" />
                  </div>
                  {/* Badge with count */}
                  {overdueData.count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-md">
                      {overdueData.count > 9 ? '9+' : overdueData.count}
                    </span>
                  )}
                </div>
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  <div className="flex items-center space-x-2">
                    <FiAlertCircle className="text-sm" />
                    <span>{overdueData.count} Overdue Payment{overdueData.count > 1 ? 's' : ''}</span>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-600"></div>
                </div>
              </Link>
            )}

            {/* Notification Icon */}
            <Link
              to="/client-notifications"
              className="relative p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200"
            >
              <FiBell className="text-lg" />
            </Link>

            {/* Wallet Balance Box */}
            <Link
              to="/client-wallet"
              className="flex items-center space-x-1 bg-gradient-to-r from-teal-500/10 to-teal-600/10 px-3 py-1.5 rounded-lg border border-teal-200/50 hover:from-teal-500/20 hover:to-teal-600/20 transition-all duration-200"
            >
              <FiCreditCard className="text-teal-600 text-sm" />
              <span className="text-sm font-semibold text-teal-700">
                {loadingWallet ? '...' : walletTotalDisplay}
              </span>
            </Link>
            
            {/* Hamburger Menu Icon */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200"
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
                <div className={`${isActive ? 'text-teal-600' : 'text-gray-600'}`}>
                  {item.iconWithPower ? (
                    <div className="relative">
                      <IconComponent className="text-xl" />
                      <FiSearch className="absolute -top-1 -right-1 text-xs text-yellow-500" />
                    </div>
                  ) : (
                    <IconComponent className="text-xl" />
                  )}
                </div>
                
                {/* Label */}
                <span className={`text-xs font-medium mt-1 ${isActive ? 'text-teal-600' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop Top Navigation */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link to="/client-dashboard" className="flex items-center -ml-2">
                  <img 
                    src={logo} 
                    alt="Appzeto" 
                    className="h-10 w-auto"
                  />
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Overdue Installments Alert */}
              {overdueData.hasOverdue && (
                <Link
                  to="/client-wallet"
                  className="relative group"
                  title={`${overdueData.count} overdue installment${overdueData.count > 1 ? 's' : ''} - Click to view`}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing red circle background */}
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                    {/* Red alert icon with animation */}
                    <div className="relative bg-gradient-to-br from-red-500 to-red-600 p-2.5 rounded-full shadow-lg border-2 border-white animate-pulse">
                      <FiAlertCircle className="text-white text-base font-bold" />
                    </div>
                    {/* Badge with count */}
                    {overdueData.count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-md">
                        {overdueData.count > 9 ? '9+' : overdueData.count}
                      </span>
                    )}
                  </div>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    <div className="flex items-center space-x-2">
                      <FiAlertCircle className="text-base" />
                      <div className="flex flex-col">
                        <span>{overdueData.count} Overdue Payment{overdueData.count > 1 ? 's' : ''}</span>
                        <span className="text-xs opacity-90">Click to view details</span>
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-600"></div>
                  </div>
                </Link>
              )}

              {/* Notification Icon */}
              <Link
                to="/client-notifications"
                className="relative p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200"
              >
                <FiBell className="text-xl" />
              </Link>

              {/* Desktop Wallet Balance */}
              <Link
                to="/client-wallet"
                className="flex items-center space-x-2 bg-gradient-to-r from-teal-500/10 to-teal-600/10 px-4 py-2 rounded-lg border border-teal-200/50 hover:from-teal-500/20 hover:to-teal-600/20 transition-all duration-200"
              >
                <FiCreditCard className="text-teal-600 text-lg" />
              <span className="text-sm font-semibold text-teal-700">
                {loadingWallet ? '...' : walletTotalDisplay}
              </span>
              </Link>
              
              <div className="flex items-center space-x-8">
              {navItems.map((item) => {
                const IconComponent = item.icon
                const isActive = location.pathname === item.path
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg' 
                        : 'text-gray-600 hover:text-teal-600 hover:bg-teal-50'
                    }`}
                    aria-label={item.label}
                  >
                    {item.iconWithPower ? (
                      <div className="relative">
                        <IconComponent className="text-lg" />
                        <FiSearch className="absolute -top-1 -right-1 text-xs text-yellow-500" />
                      </div>
                    ) : (
                      <IconComponent className="text-lg" />
                    )}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Component */}
      <Client_sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
    </>
  )
}

export default Client_navbar
