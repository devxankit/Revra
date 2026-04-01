import React from 'react';
import { Navigate } from 'react-router-dom';
import { isClientAuthenticated } from '../../modules/dev/DEV-services/clientAuthService';

const ClientProtectedRoute = ({ children }) => {
  if (!isClientAuthenticated()) {
    return <Navigate to="/client-login" replace />;
  }
  return children;
};

export default ClientProtectedRoute;
