import { getApiUrl } from '../../../config/env';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('pmToken');
};

// Helper function to set auth token
const setAuthToken = (token) => {
  localStorage.setItem('pmToken', token);
};

// Helper function to remove auth token
const removeAuthToken = () => {
  localStorage.removeItem('pmToken');
};

// Helper function to get auth headers
const getAuthHeaders = (isFormData = false) => {
  const token = getAuthToken();
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` })
  };
  
  // Only set Content-Type for JSON, not for FormData
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

// Base API request helper
export const apiRequest = async (url, options = {}) => {
  try {
    // Check if body is FormData
    const isFormData = options.body instanceof FormData;
    
    const response = await fetch(getApiUrl(url), {
      ...options,
      headers: {
        ...getAuthHeaders(isFormData),
        ...options.headers
      },
      credentials: 'include' // Include cookies for CORS
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    // Don't log here - let the calling component handle error logging
    // Only re-throw the error for the caller to handle
    
    // Provide better error messages for connection issues
    if (error instanceof TypeError && (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError'))) {
      throw new Error('Cannot connect to server. Please ensure the backend server is running.');
    }
    
    throw error;
  }
};

// Token management utilities
export const tokenUtils = {
  get: getAuthToken,
  set: setAuthToken,
  remove: removeAuthToken,
  isAuthenticated: () => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      return payload.exp > currentTime;
    } catch (error) {
      // If token is invalid, remove it
      removeAuthToken();
      return false;
    }
  }
};

// Local storage utilities for PM data
export const pmStorage = {
  get: () => {
    try {
      const pmData = localStorage.getItem('pmUser');
      return pmData ? JSON.parse(pmData) : null;
    } catch (error) {
      console.error('Error parsing stored PM data:', error);
      return null;
    }
  },
  
  set: (pmData) => {
    try {
      localStorage.setItem('pmUser', JSON.stringify(pmData));
    } catch (error) {
      console.error('Error storing PM data:', error);
    }
  },
  
  clear: () => {
    removeAuthToken();
    localStorage.removeItem('pmUser');
  }
};

// Local storage utilities for Employee data
export const employeeStorage = {
  get: () => {
    try {
      const employeeData = localStorage.getItem('employeeUser');
      return employeeData ? JSON.parse(employeeData) : null;
    } catch (error) {
      console.error('Error parsing stored Employee data:', error);
      return null;
    }
  },
  
  set: (employeeData) => {
    try {
      localStorage.setItem('employeeUser', JSON.stringify(employeeData));
    } catch (error) {
      console.error('Error storing Employee data:', error);
    }
  },
  
  clear: () => {
    removeAuthToken();
    localStorage.removeItem('employeeUser');
  }
};

export default {
  apiRequest,
  tokenUtils,
  pmStorage,
  employeeStorage
};
