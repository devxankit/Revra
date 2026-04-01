import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isSalesAuthenticated } from '../../modules/sells/SL-services/salesAuthService'

const SalesProtectedRoute = ({ children }) => {
  const location = useLocation()
  
  // Check if user is authenticated
  const isAuthenticated = isSalesAuthenticated()
  
  if (!isAuthenticated) {
    // Redirect to Sales login page with return url
    return <Navigate to="/sales-login" state={{ from: location }} replace />
  }
  
  // If authenticated, render the protected component
  return children
}

export default SalesProtectedRoute
