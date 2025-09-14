// API Configuration for CognigenX
// This matches the configuration used by the App Store version

export const API_CONFIG = {
  // Production (Hosted) Backend - Used by App Store version
  // BASE_URL: 'https://dementia-backend-gamma.vercel.app', // Live URL
  // AUTH_URL: 'https://dementia-backend-gamma.vercel.app/api/auth', // Live URL
  // API_URL: 'https://dementia-backend-gamma.vercel.app/api' // Live URL
  
  // Local Development Backend
  BASE_URL: 'http://localhost:6000', // Local development
  AUTH_URL: 'http://localhost:6000/api/auth', // Local development
  API_URL: 'http://localhost:6000/api' // Local development
};

// Export current URLs
export const {
  BASE_URL,
  AUTH_URL,
  API_URL
} = API_CONFIG;

// Environment indicator
export const ENV_INFO = {
  isLocal: true, // Changed to true for local development
  environment: 'LOCAL_DEVELOPMENT', // Changed for local development
  backend: 'localhost:6000' // Changed for local development
};
