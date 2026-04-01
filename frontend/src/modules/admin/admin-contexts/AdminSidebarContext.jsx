import React, { createContext, useContext, useState, useEffect } from 'react'

const AdminSidebarContext = createContext()

export const useAdminSidebar = () => {
  const context = useContext(AdminSidebarContext)
  if (!context) {
    // If context is not available, return a default implementation
    return {
      sidebarOpen: false,
      toggleSidebar: () => {},
      closeSidebar: () => {}
    }
  }
  return context
}

export const AdminSidebarProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  // Close sidebar on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <AdminSidebarContext.Provider value={{ sidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </AdminSidebarContext.Provider>
  )
}
