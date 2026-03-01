// Central backend configuration used across screens.
// Toggle USE_LOCAL_BACKEND for local testing.

export const USE_LOCAL_BACKEND = false;

export const API_BASE_URL = USE_LOCAL_BACKEND
  ? "http://127.0.0.1:6000"
  : "https://cognizen-x-backend.vercel.app";

export const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;
export const API_URL = `${API_BASE_URL}/api`;
