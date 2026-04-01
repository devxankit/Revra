import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isEmployeeAuthenticated } from '../../modules/dev/DEV-services/employeeAuthService'

const EmployeeProtectedRoute = ({ children }) => {
  const location = useLocation()
  
  // Check if user is authenticated
  const isAuthenticated = isEmployeeAuthenticated()
  
  if (!isAuthenticated) {
    // Redirect to Employee login page with return url
    return <Navigate to="/employee-login" state={{ from: location }} replace />
  }
  
  // If authenticated, render the protected component
  return children
}

export default EmployeeProtectedRoute
