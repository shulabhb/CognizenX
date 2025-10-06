// API Configuration for CognigenX
// This matches the configuration used by the App Store version

export const API_CONFIG = {
  // Production (Hosted) Backend - Used by App Store version
  BASE_URL: 'https://cognizen-x-backend.vercel.app',
  AUTH_URL: 'https://cognizen-x-backend.vercel.app/api/auth',
  API_URL: 'https://cognizen-x-backend.vercel.app/api'
};

// Export current URLs
export const {
  BASE_URL,
  AUTH_URL,
  API_URL
} = API_CONFIG;

// Environment indicator
export const ENV_INFO = {
  isLocal: false, // Production environment
  environment: 'PRODUCTION',
  backend: 'cognizen-x-backend.vercel.app'
};
