import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  FiHome,
  FiFolder,
  FiCheckSquare,
  FiTrendingUp,
  FiUser,
  FiCreditCard,
  FiBell,
  FiMenu
} from 'react-icons/fi'
import logo from '../../../assets/images/logo.png'
import Employee_sideBar from './Employee_sideBar'
import { employeeWalletService } from '../DEV-services'

function Employee_navbar() {
  const location = useLocation()

  // Employee wallet data - fetched from API
  const [monthlyRewards, setMonthlyRewards] = useState(0)

  // Fetch wallet data on component mount
  useEffect(() => {
    const loadWalletData = async () => {
      try {
        const response = await employeeWalletService.getWalletSummary();
        if (response.success && response.data) {
          setMonthlyRewards(response.data.monthlyRewards || 0);
        }
      } catch (error) {
        console.error('Error loading wallet data in navbar:', error);
        // Keep default values (0) on error
      }
    };

    loadWalletData();
  }, []);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const navItems = [
    {
      path: '/employee-dashboard',
      label: 'Home',
      icon: FiHome,
      iconWithPower: false
    },
    {
      path: '/employee-projects',
      label: 'Projects',
      icon: FiFolder,
      iconWithPower: false
    },
    {
      path: '/employee-tasks',
      label: 'Tasks',
      icon: FiCheckSquare,
      iconWithPower: false
    },
    {
      path: '/employee-leaderboard',
      label: 'Leaderboard',
      icon: FiTrendingUp,
      iconWithPower: false
    },
    {
      path: '/employee-profile',
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
          <Link to="/employee-dashboard" className="flex items-center -ml-2">
            <img
              src={logo}
              alt="Appzeto"
              className="h-9 w-auto"
            />
          </Link>

          <div className="flex items-center space-x-2">
            {/* Notification Icon */}
            <Link
              to="/employee-notifications"
              className="relative p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200"
            >
              <FiBell className="text-lg" />
            </Link>

            {/* Monthly Rewards Box */}
            <Link
              to="/employee-wallet"
              className="flex items-center space-x-1 bg-gradient-to-r from-teal-500/10 to-teal-600/10 px-3 py-1.5 rounded-lg border border-teal-200/50 hover:from-teal-500/20 hover:to-teal-600/20 transition-all duration-200"
            >
              <FiCreditCard className="text-teal-600 text-sm" />
              <span className="text-sm font-semibold text-teal-700">₹{monthlyRewards.toLocaleString()}</span>
            </Link>

            {/* Hamburger Menu Icon (no sidebar wired yet) */}
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
                      <FiTrendingUp className="absolute -top-1 -right-1 text-xs text-yellow-500" />
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
                <Link to="/employee-dashboard" className="flex items-center -ml-2">
                  <img
                    src={logo}
                    alt="Appzeto"
                    className="h-10 w-auto"
                  />
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notification Icon */}
              <Link
                to="/employee-notifications"
                className="relative p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200"
              >
                <FiBell className="text-xl" />
              </Link>

              {/* Desktop Monthly Rewards */}
              <Link
                to="/employee-wallet"
                className="flex items-center space-x-2 bg-gradient-to-r from-teal-500/10 to-teal-600/10 px-4 py-2 rounded-lg border border-teal-200/50 hover:from-teal-500/20 hover:to-teal-600/20 transition-all duration-200"
              >
                <FiCreditCard className="text-teal-600 text-lg" />
                <span className="text-sm font-semibold text-teal-700">₹{monthlyRewards.toLocaleString()}</span>
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
                          <FiTrendingUp className="absolute -top-1 -right-1 text-xs text-yellow-500" />
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
      <Employee_sideBar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
    </>
  )
}

export default Employee_navbar

