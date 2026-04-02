import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAdminAuthenticated } from '../../modules/admin/admin-services/adminAuthService'
import { adminStorage } from '../../modules/admin/admin-services/baseApiService'

const HRProtectedRoute = ({ children }) => {
  const location = useLocation()
  
  // Check if user is authenticated
  const isAuthenticated = isAdminAuthenticated()
  
  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/admin-login" state={{ from: location }} replace />
  }
  
  // Check if user is HR or Admin (admin can also access HR management)
  const adminData = adminStorage.get()
  if (!adminData) {
    return <Navigate to="/admin-login" replace />
  }
  
  // Allow Admin, HR, or Accountant to access HR management
  if (adminData.role !== 'hr' && adminData.role !== 'admin' && adminData.role !== 'accountant') {
    return <Navigate to="/admin-login" replace />
  }
  
  // If authenticated and is HR or Admin, render the protected component
  return children
}

export default HRProtectedRoute
