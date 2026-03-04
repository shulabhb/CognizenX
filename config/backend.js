// Central backend configuration used across screens.
// Toggle USE_LOCAL_BACKEND for local testing.

// Default to production so existing accounts can log in during development runs.
// Flip to `true` only when you are running the backend locally on port 6000.
export const USE_LOCAL_BACKEND = true;

export const API_BASE_URL = USE_LOCAL_BACKEND
  ? "http://127.0.0.1:6000"
  : "https://cognizen-x-backend.vercel.app";

export const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;
export const API_URL = `${API_BASE_URL}/api`;
