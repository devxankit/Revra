import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { 
  LayoutDashboard, 
  Code, 
  IndianRupee, 
  Trophy, 
  Gift, 
  TrendingUp,
  MessageSquare,
  Users,
  UserCheck,
  FileText,
  Handshake,
  Activity,
  Home,
  Receipt,
  Settings
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { adminStorage } from '../admin-services/baseApiService'
import { useAdminSidebar } from '../admin-contexts/AdminSidebarContext'

const Admin_sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [prevPath, setPrevPath] = useState(location.pathname)
  const { sidebarOpen: contextSidebarOpen, closeSidebar: contextCloseSidebar } = useAdminSidebar()
  
  // Get admin data to check role
  const adminData = adminStorage.get()
  
  // Only show sidebar for admin role, not HR
  if (adminData?.role === 'hr') {
    return null
  }

  // Use context if props are not provided, otherwise use props (for backward compatibility)
  const useContext = !onClose && !isOpen
  const sidebarIsOpen = useContext ? contextSidebarOpen : (onClose ? (isOpen ?? false) : true)
  const handleClose = useContext ? contextCloseSidebar : onClose

  const handleNavigation = (path) => {
    navigate(path)
    // Close sidebar on mobile after navigation
    if (handleClose && window.innerWidth < 1024) {
      setTimeout(() => {
        handleClose()
      }, 150)
    }
  }

  // Close sidebar when route changes (for mobile) - only if path actually changed
  useEffect(() => {
    if (location.pathname !== prevPath) {
      setPrevPath(location.pathname)
      if (handleClose && window.innerWidth < 1024 && sidebarIsOpen) {
        handleClose()
      }
    }
  }, [location.pathname, handleClose, sidebarIsOpen, prevPath])

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/admin-dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'project-management',
      label: 'Project Management',
      path: '/admin-project-management',
      icon: Code
    },
    {
      id: 'user-management',
      label: 'User Management',
      path: '/admin-user-management',
      icon: Users
    },
    {
      id: 'hr-management',
      label: 'HR Management',
      path: '/admin-hr-management',
      icon: UserCheck
    },
    {
      id: 'sales-management',
      label: 'Sales Management',
      path: '/admin-sales-management',
      icon: TrendingUp
    },
    {
      id: 'finance-management',
      label: 'Finance Management',
      path: '/admin-finance-management',
      icon: IndianRupee
    },
    {
      id: 'project-expenses-management',
      label: 'Project Expenses',
      path: '/admin-project-expenses-management',
      icon: Receipt
    },
    {
      id: 'reward-management',
      label: 'Reward Management',
      path: '/admin-reward-management',
      icon: Gift
    },
    {
      id: 'requests-management',
      label: 'Requests Management',
      path: '/admin-requests-management',
      icon: MessageSquare
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      path: '/admin-leaderboard',
      icon: Trophy
    },
    {
      id: 'notice-board',
      label: 'Notice Board',
      path: '/admin-notice-board',
      icon: FileText
    },
    {
      id: 'recent-activities',
      label: 'Recent Activities',
      path: '/admin-recent-activities',
      icon: Activity
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/admin-settings',
      icon: Settings
    }
  ]

  // Filter menu items based on role
  const getFilteredMenuItems = () => {
    const role = adminData?.role
    
    // Accountant can see Finance Management and HR Management
    if (role === 'accountant') {
      return menuItems.filter(item => item.id === 'finance-management' || item.id === 'hr-management')
    }
    
    // PEM can only see Project Expenses Management
    if (role === 'pem') {
      return menuItems.filter(item => item.id === 'project-expenses-management')
    }
    
    // HR does not see sidebar (returns null above)
    // Admin sees all items including Settings
    // Settings is admin-only - exclude from accountant/pem (already filtered above)
    return menuItems
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <>
      {/* Overlay for mobile */}
      {handleClose && sidebarIsOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] transition-opacity duration-300 lg:hidden"
          onClick={handleClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        data-sidebar="true"
        className={`fixed left-0 top-16 w-64 bg-white shadow-sm border-r border-gray-200 h-[calc(100vh-4rem)] z-50 transition-transform duration-300 ease-in-out ${
          sidebarIsOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        onClick={(e) => {
          // Prevent clicks inside sidebar from closing it
          e.stopPropagation()
        }}
      >
        <div className="p-6 h-full flex flex-col">
          {/* Close button for mobile */}
          {handleClose && (
            <div className="flex justify-end mb-4 lg:hidden">
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          )}

          {/* Scrollable menu area with only vertical slider */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar">
            <nav className="space-y-2">
              {getFilteredMenuItems().map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                
                return (
                  <Button
                    key={item.id}
                    variant={active ? "default" : "ghost"}
                    className={`w-full justify-start space-x-3 transition-all duration-300 ease-in-out ${
                      active 
                        ? 'bg-teal-50/80 text-teal-600 border-teal-100 shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-50/60 hover:text-gray-600'
                    }`}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <Icon className={`h-5 w-5 transition-colors duration-300 ease-in-out ${active ? 'text-teal-500' : 'text-gray-400 hover:text-gray-500'}`} />
                    <span className={`font-medium transition-colors duration-300 ease-in-out ${active ? 'text-teal-600' : 'text-gray-500'}`}>{item.label}</span>
                  </Button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
    </>
  )
}

export default Admin_sidebar
