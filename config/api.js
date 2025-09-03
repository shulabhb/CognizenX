// API Configuration for CognigenX
// This matches the configuration used by the App Store version

export const API_CONFIG = {
  // Production (Hosted) Backend - Used by App Store version
  BASE_URL: 'https://dementia-backend-gamma.vercel.app',
  AUTH_URL: 'https://dementia-backend-gamma.vercel.app/api/auth',
  API_URL: 'https://dementia-backend-gamma.vercel.app/api'
};

// Export current URLs
export const {
  BASE_URL,
  AUTH_URL,
  API_URL
} = API_CONFIG;

// Environment indicator
export const ENV_INFO = {
  isLocal: false,
  environment: 'PRODUCTION',
  backend: 'dementia-backend-gamma.vercel.app'
};
