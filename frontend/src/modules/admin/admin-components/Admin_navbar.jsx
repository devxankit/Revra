import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Menu } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import logo from '../../../assets/images/logo.png'
import { logoutAdmin, clearAdminData, getStoredAdminData } from '../admin-services/adminAuthService'
import { useToast } from '../../../contexts/ToastContext'
import { useAdminSidebar } from '../admin-contexts/AdminSidebarContext'

const Admin_navbar = ({ onToggleSidebar }) => {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { toast } = useToast()
  const { toggleSidebar: contextToggleSidebar } = useAdminSidebar()
  
  // Use context if prop is not provided, otherwise use prop (for backward compatibility)
  const toggleSidebar = onToggleSidebar || contextToggleSidebar || (() => {})

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      
      // Call logout API
      await logoutAdmin()
      
      // Clear local data
      clearAdminData()
      
      // Show success toast
      toast.logout('You have been successfully logged out', {
        title: 'Logged Out',
        duration: 2000
      })
      
      // Small delay to show the toast before redirect
      setTimeout(() => {
        navigate('/admin-login')
      }, 800)
      
    } catch (error) {
      console.error('Logout error:', error)
      
      // Even if API call fails, clear local data
      clearAdminData()
      
      // Show error toast
      toast.error('Logout failed, but you have been logged out locally', {
        title: 'Logout Error',
        duration: 2000
      })
      
      // Small delay to show the error toast before redirect
      setTimeout(() => {
        navigate('/admin-login')
      }, 1000)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleProfile = () => {
    navigate('/admin-profile')
  }

  // Get admin data for display
  const adminData = getStoredAdminData()

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4 z-50">
      <div className="flex items-center justify-between">
        {/* Logo Section with Hamburger */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button (Mobile Only) */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          <img 
            src={logo} 
            alt="Appzeto Logo" 
            className="h-8 lg:h-10 w-auto"
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Admin Info */}
          {adminData && (
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <span>Welcome,</span>
              <span className="font-medium text-gray-800">{adminData.name}</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {adminData.role.toUpperCase()}
              </span>
            </div>
          )}

          {/* Profile Icon */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleProfile}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Profile"
          >
            <User className="h-5 w-5 text-gray-600" />
          </Button>

          {/* Logout Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs lg:text-sm"
          >
            {isLoggingOut ? (
              <>
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </nav>
  )
}

export default Admin_navbar
