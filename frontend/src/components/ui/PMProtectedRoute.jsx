import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isPMAuthenticated } from '../../modules/dev/DEV-services/pmAuthService'

const PMProtectedRoute = ({ children }) => {
  const location = useLocation()
  
  // Check if user is authenticated
  const isAuthenticated = isPMAuthenticated()
  
  if (!isAuthenticated) {
    // Redirect to PM login page with return url
    return <Navigate to="/pm-login" state={{ from: location }} replace />
  }
  
  // If authenticated, render the protected component
  return children
}

export default PMProtectedRoute
