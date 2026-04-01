import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isCPAuthenticated } from '../../modules/channel-partner/CP-services/cpAuthService'

const CPProtectedRoute = ({ children }) => {
  const location = useLocation()
  
  // Check if channel partner is authenticated
  const isAuthenticated = isCPAuthenticated()
  
  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/cp-login" state={{ from: location }} replace />
  }
  
  // If authenticated, render the protected component
  return children
}

export default CPProtectedRoute
