// Legacy API config mirror. Prefer config/backend.js in app code.
// Kept so older imports keep pointing at the same host; paths use /api/v1.

export const API_CONFIG = {
  BASE_URL: 'https://cognizen-x-backend.vercel.app',
  AUTH_URL: 'https://cognizen-x-backend.vercel.app/api/v1/auth',
  API_URL: 'https://cognizen-x-backend.vercel.app/api/v1'
};

export const {
  BASE_URL,
  AUTH_URL,
  API_URL
} = API_CONFIG;

export const ENV_INFO = {
  isLocal: false,
  environment: 'PRODUCTION',
  backend: 'cognizen-x-backend.vercel.app'
};
