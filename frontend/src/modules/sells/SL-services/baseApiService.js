import { getApiUrl } from '../../../config/env';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('salesToken');
};

// Helper function to set auth token
const setAuthToken = (token) => {
  localStorage.setItem('salesToken', token);
};

// Helper function to remove auth token
const removeAuthToken = () => {
  localStorage.removeItem('salesToken');
};

// Helper function to get auth headers (omit Content-Type for FormData - browser sets multipart boundary)
const getAuthHeaders = (options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` })
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

// Base API request helper
export const apiRequest = async (url, options = {}) => {
  // Check if this is a public endpoint that doesn't require authentication
  const publicEndpoints = ['/sales/login', '/sales/create-demo', '/sales/forgot-password', '/sales/reset-password'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => url.includes(endpoint));
  
  // Only require token for authenticated endpoints
  if (!isPublicEndpoint) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }
  }

  try {
    const primaryUrl = getApiUrl(url);
    const response = await fetch(primaryUrl, {
      ...options,
      headers: {
        ...getAuthHeaders(options),
        ...options.headers
      },
      credentials: 'include' // Include cookies for CORS
    });

    // Handle response parsing safely
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        // If response is not JSON, create error message based on status
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }

    if (!response.ok) {
      // Only clear session when account is deactivated (403), not on every 401 (avoids logout on refresh).
      if (response.status === 403 && data && data.code === 'ACCOUNT_INACTIVE') {
        removeAuthToken();
        localStorage.removeItem('salesUser');
      }
      throw new Error(data.message || data.error || 'Something went wrong');
    }

    return data;
  } catch (error) {
    // If it's already a handled error, re-throw it
    if (error.message && (error.message.includes('Authentication') || error.message.includes('Server error'))) {
      throw error;
    }

    // Fallback: if direct host failed (e.g., backend not running on 5000), try same-origin /api path
    if (error && (error.name === 'TypeError' || String(error).includes('Failed to fetch'))) {
      const sameOriginUrl = `/api${url.startsWith('/') ? url : `/${url}`}`;
      const response = await fetch(sameOriginUrl, {
        ...options,
        headers: {
          ...getAuthHeaders(options),
          ...options.headers
        },
        credentials: 'include'
      });
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      
      if (!response.ok) {
        if (response.status === 403 && data && data.code === 'ACCOUNT_INACTIVE') {
          removeAuthToken();
          localStorage.removeItem('salesUser');
        }
        throw new Error(data.message || data.error || 'Something went wrong');
      }
      return data;
    }
    // Don't log here - let the calling component handle error logging
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
    } catch {
      // If token is invalid, remove it
      removeAuthToken();
      return false;
    }
  }
};

// Local storage utilities for Sales data
export const salesStorage = {
  get: () => {
    try {
      const salesData = localStorage.getItem('salesUser');
      return salesData ? JSON.parse(salesData) : null;
    } catch (error) {
      console.error('Error parsing stored Sales data:', error);
      return null;
    }
  },
  
  set: (salesData) => {
    try {
      localStorage.setItem('salesUser', JSON.stringify(salesData));
    } catch (error) {
      console.error('Error storing Sales data:', error);
    }
  },
  
  clear: () => {
    removeAuthToken();
    localStorage.removeItem('salesUser');
  }
};

export default {
  apiRequest,
  tokenUtils,
  salesStorage
};