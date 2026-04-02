import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAdminAuthenticated } from '../../modules/admin/admin-services/adminAuthService'
import { adminStorage } from '../../modules/admin/admin-services/baseApiService'

const ProtectedRoute = ({ children, requiredRole = 'admin' }) => {
  const location = useLocation()
  
  // Check if user is authenticated
  const isAuthenticated = isAdminAuthenticated()
  
  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/admin-login" state={{ from: location }} replace />
  }
  
  // Check user role
  const adminData = adminStorage.get()
  if (adminData) {
    const role = adminData.role
    const currentPath = location.pathname
    
    // HR users can access HR Management and the main Leaderboard page
    // Any other admin-only routes should redirect them back to HR Management
    if (role === 'hr' && requiredRole === 'admin') {
      const hrAllowedPaths = ['/admin-hr-management', '/admin-leaderboard']
      if (!hrAllowedPaths.includes(currentPath)) {
        return <Navigate to="/admin-hr-management" replace />
      }
    }
    
    // Accountant can only access Finance Management and HR Management
    if (role === 'accountant') {
      const allowedPaths = ['/admin-finance-management', '/admin-hr-management']
      if (!allowedPaths.includes(currentPath)) {
        return <Navigate to="/admin-finance-management" replace />
      }
    }
    
    // PEM can only access Project Expenses Management
    if (role === 'pem') {
      if (currentPath !== '/admin-project-expenses-management') {
        return <Navigate to="/admin-project-expenses-management" replace />
      }
    }
    
    // Admin users can access everything, so no restriction needed
  }
  
  // If authenticated and role matches, render the protected component
  return children
}

export default ProtectedRoute
