import { getApiUrl } from '../../../config/env';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('cpToken');
};

// Helper function to set auth token
const setAuthToken = (token) => {
  localStorage.setItem('cpToken', token);
};

// Helper function to remove auth token
const removeAuthToken = () => {
  localStorage.removeItem('cpToken');
};

// Local storage utilities for channel partner data
export const cpStorage = {
  get: () => {
    try {
      const cpData = localStorage.getItem('cpUser');
      return cpData ? JSON.parse(cpData) : null;
    } catch (error) {
      console.error('Error parsing stored channel partner data:', error);
      return null;
    }
  },
  
  set: (cpData) => {
    try {
      localStorage.setItem('cpUser', JSON.stringify(cpData));
    } catch (error) {
      console.error('Error storing channel partner data:', error);
    }
  },
  
  clear: () => {
    removeAuthToken();
    localStorage.removeItem('cpUser');
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
  cpStorage.clear();
};

const buildApiError = (response, payload) => {
  const message =
    (payload && (payload.message || payload.error || payload.errorMessage)) ||
    'Something went wrong';

  const error = new Error(message);
  error.status = response ? response.status : 500;
  error.payload = payload;
  error.isUnauthorized = response && response.status === 401;
  error.isForbidden = response && response.status === 403;
  error.code = payload && payload.code;
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
      // Only clear session when account is deactivated (403), not on every 401.
      // This prevents refresh from logging out the user when one request fails (e.g. wrong endpoint).
      if (response.status === 403 && data && data.code === 'ACCOUNT_INACTIVE') {
        handleUnauthorized();
        const inactiveError = buildApiError(response, data);
        inactiveError.isInactive = true;
        throw inactiveError;
      }

      throw buildApiError(response, data);
    }

    return data;
  } catch (error) {
    // Re-throw the error to preserve the original error structure
    if (error.isInactive || error.code === 'ACCOUNT_INACTIVE') {
      throw error;
    }
    // For network errors or other issues, wrap them properly
    if (!error.status && !error.isUnauthorized && !error.isForbidden) {
      const wrappedError = new Error(error.message || 'Network error occurred');
      wrappedError.status = 500;
      wrappedError.originalError = error;
      throw wrappedError;
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

export default {
  apiRequest,
  tokenUtils,
  cpStorage
};
