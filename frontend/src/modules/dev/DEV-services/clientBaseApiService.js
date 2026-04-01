import { getApiUrl } from '../../../config/env';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('clientToken');
};

// Helper function to set auth token
const setAuthToken = (token) => {
  localStorage.setItem('clientToken', token);
};

// Helper function to remove auth token
const removeAuthToken = () => {
  localStorage.removeItem('clientToken');
};

// Local storage utilities for client data
export const clientStorage = {
  get: () => {
    try {
      const clientData = localStorage.getItem('clientUser');
      return clientData ? JSON.parse(clientData) : null;
    } catch (error) {
      console.error('Error parsing stored client data:', error);
      return null;
    }
  },
  
  set: (clientData) => {
    try {
      localStorage.setItem('clientUser', JSON.stringify(clientData));
    } catch (error) {
      console.error('Error storing client data:', error);
    }
  },
  
  clear: () => {
    removeAuthToken();
    localStorage.removeItem('clientUser');
  }
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const handleUnauthorized = () => {
  clientStorage.clear();
};

const buildApiError = (response, payload) => {
  const message =
    (payload && (payload.message || payload.error || payload.errorMessage)) ||
    'Something went wrong';

  const error = new Error(message);
  error.status = response.status;
  error.payload = payload;
  error.isUnauthorized = response.status === 401;
  return error;
};

const parseResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  // For non-JSON payloads attempt text, ignore parsing issues
  try {
    const text = await response.text();
    return text ? { message: text } : null;
  } catch (error) {
    return null;
  }
};

// Base API request helper
export const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(getApiUrl(url), {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      },
      credentials: 'include' // Include cookies for CORS
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      // Only clear session when account is deactivated (403), not on every 401 (avoids logout on refresh).
      if (response.status === 403 && data && data.code === 'ACCOUNT_INACTIVE') {
        handleUnauthorized();
      }

      throw buildApiError(response, data);
    }

    return data;
  } catch (error) {
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
    } catch (error) {
      // If token is invalid, remove it
      removeAuthToken();
      return false;
    }
  }
};

export default {
  apiRequest,
  tokenUtils,
  clientStorage
};
