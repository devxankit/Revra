const DEFAULT_LOCAL_API = 'http://localhost:5000/api';

const normalizeUrl = (url) => {
  if (!url) return url;

  // Remove duplicate /api suffix (e.g. /api/api)
  const cleaned = url.replace(/\/api\/?$/i, '/api');

  // Remove trailing slash to simplify concatenation
  return cleaned.replace(/\/+$/, '');
};

const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return normalizeUrl(envUrl.trim());
  }

  if (typeof window !== 'undefined' && window.location) {
    return normalizeUrl(`${window.location.origin}/api`);
  }

  return normalizeUrl(DEFAULT_LOCAL_API);
};

const ensureLeadingSlash = (endpoint) => {
  if (!endpoint) return '';
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
};

// Environment configuration
export const config = {
  // API Configuration
  API_BASE_URL: resolveApiBaseUrl(),

  // App Configuration
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Appzeto',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  NODE_ENV: import.meta.env.VITE_NODE_ENV || 'development',

  // URLs
  APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:3000',

  // Feature flags (if needed)
  ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true',

  // Other configurations
  APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'Appzeto - Complete Business Management System'
};

// Helper function to get API URL
export const getApiUrl = (endpoint = '') => {
  const safeEndpoint = ensureLeadingSlash(endpoint);
  return `${config.API_BASE_URL}${safeEndpoint}`;
};

// Helper function to check if development mode
export const isDevelopment = () => config.NODE_ENV === 'development';

// Helper function to check if production mode
export const isProduction = () => config.NODE_ENV === 'production';

export default config;
