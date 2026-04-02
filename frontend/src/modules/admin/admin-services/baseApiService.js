import { getApiUrl } from '../../../config/env';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('adminToken');
};

// Helper function to set auth token
const setAuthToken = (token) => {
  localStorage.setItem('adminToken', token);
};

// Helper function to remove auth token
const removeAuthToken = () => {
  localStorage.removeItem('adminToken');
};

// Helper function to get auth headers
const getAuthHeaders = (isFormData = false) => {
  const token = getAuthToken();
  const headers = {};
  
  // Only set Content-Type if NOT FormData (browser will set it with boundary for FormData)
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Helper to safely parse JSON response
const safeJsonParse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  // Check if response has content
  const text = await response.text();
  
  // If empty response
  if (!text || !text.trim()) {
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText} (Empty response)`);
    }
    return {};
  }
  
  // If not JSON (e.g., HTML error page)
  if (!contentType || !contentType.includes('application/json')) {
    if (!response.ok) {
      // Try to extract error message from HTML or use status
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    return { message: text };
  }
  
  // Parse JSON
  try {
    return JSON.parse(text);
  } catch (parseError) {
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    throw new Error('Invalid JSON response from server');
  }
};

// Base API request helper
export const apiRequest = async (url, options = {}) => {
  try {
    const primaryUrl = getApiUrl(url);
    
    // Check if body is FormData
    const isFormData = options.body instanceof FormData;
    
    const response = await fetch(primaryUrl, {
      ...options,
      headers: {
        ...getAuthHeaders(isFormData),
        // Don't override headers if FormData - let browser set Content-Type with boundary
        ...(isFormData ? {} : options.headers)
      },
      credentials: 'include' // Include cookies for CORS
    });

    const data = await safeJsonParse(response);

    if (!response.ok) {
      const err = new Error(data.message || data.error || `Server error: ${response.status}`);
      if (data.code) err.code = data.code;
      throw err;
    }

    return data;
  } catch (error) {
    // Check if it's a connection error (backend not running)
    const isConnectionError = error && (
      error.name === 'TypeError' || 
      String(error).includes('Failed to fetch') || 
      String(error).includes('ERR_CONNECTION_REFUSED') ||
      String(error).includes('NetworkError') ||
      (error.message && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('NetworkError')
      ))
    );

    // If connection error, throw a more helpful error message
    if (isConnectionError) {
      const connectionError = new Error('Backend server is not running. Please start the backend server on port 5000.');
      connectionError.name = 'ConnectionError';
      connectionError.originalError = error;
      throw connectionError;
    }

    // Fallback: if direct host failed (e.g., backend not running on 5000), try same-origin /api path
    try {
      if (error && (error.name === 'TypeError' || String(error).includes('Failed to fetch') || String(error).includes('ERR_CONNECTION_REFUSED'))) {
        const sameOriginUrl = `/api${url.startsWith('/') ? url : `/${url}`}`;
        const isFormData = options.body instanceof FormData;
        const fallbackResponse = await fetch(sameOriginUrl, {
          ...options,
          headers: {
            ...getAuthHeaders(isFormData),
            // Don't override headers if FormData
            ...(isFormData ? {} : options.headers)
          },
          credentials: 'include'
        });
        
        const fallbackData = await safeJsonParse(fallbackResponse);
        
        if (!fallbackResponse.ok) {
          const err = new Error(fallbackData.message || fallbackData.error || `Server error: ${fallbackResponse.status}`);
          if (fallbackData.code) err.code = fallbackData.code;
          throw err;
        }
        return fallbackData;
      }
    } catch (fallbackError) {
      // Don't log connection errors for generation endpoint (404 is expected if already generated)
      if (!String(fallbackError).includes('404') || !url.includes('/salary/generate')) {
        console.error('API Request Error (fallback failed):', fallbackError);
      }
      throw fallbackError;
    }
    
    // Don't log connection errors for generation endpoint
    if (!String(error).includes('404') || !url.includes('/salary/generate')) {
      console.error('API Request Error:', error);
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

// Local storage utilities for admin data
export const adminStorage = {
  get: () => {
    try {
      const adminData = localStorage.getItem('adminUser');
      return adminData ? JSON.parse(adminData) : null;
    } catch (error) {
      console.error('Error parsing stored admin data:', error);
      return null;
    }
  },
  
  set: (adminData) => {
    try {
      localStorage.setItem('adminUser', JSON.stringify(adminData));
    } catch (error) {
      console.error('Error storing admin data:', error);
    }
  },
  
  clear: () => {
    removeAuthToken();
    localStorage.removeItem('adminUser');
  }
};

export default {
  apiRequest,
  tokenUtils,
  adminStorage
};
