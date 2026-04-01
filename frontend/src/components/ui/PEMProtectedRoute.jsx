import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAdminAuthenticated } from '../../modules/admin/admin-services/adminAuthService'
import { adminStorage } from '../../modules/admin/admin-services/baseApiService'

const PEMProtectedRoute = ({ children }) => {
  const location = useLocation()
  
  // Check if user is authenticated
  const isAuthenticated = isAdminAuthenticated()
  
  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/admin-login" state={{ from: location }} replace />
  }
  
  // Check if user is PEM or Admin (admin can also access project expenses management)
  const adminData = adminStorage.get()
  if (!adminData) {
    return <Navigate to="/admin-login" replace />
  }
  
  // Allow both PEM and Admin roles to access project expenses management
  if (adminData.role !== 'pem' && adminData.role !== 'admin') {
    return <Navigate to="/admin-login" replace />
  }
  
  // If authenticated and is PEM or Admin, render the protected component
  return children
}

export default PEMProtectedRoute
