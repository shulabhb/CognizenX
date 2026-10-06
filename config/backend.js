// Central backend configuration used across screens.
// Toggle USE_LOCAL_BACKEND for local testing.

// Default to production so existing accounts can log in during development runs.
// Flip to `true` only when you are running the backend locally on port 6000.
export const USE_LOCAL_BACKEND = false;

export const API_BASE_URL = USE_LOCAL_BACKEND
  ? "http://127.0.0.1:6000"
  : "https://cognizen-x-backend.vercel.app";

// P0.6A — new clients talk to /api/v1. The store build still uses unversioned /api
// on the same host until we turn on MIN_SUPPORTED_APP_VERSION and ship a cutover build.
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;
export const AUTH_BASE_URL = `${API_BASE_URL}${API_PREFIX}/auth`;
export const API_URL = `${API_BASE_URL}${API_PREFIX}`;

// Sent as X-App-Version. Bump with the P0 store release; keep in sync with
// android versionName / iOS MARKETING_VERSION when you ship.
export const APP_VERSION = "3.0.0";

// Store tokens per-backend so switching environments doesn't reuse an invalid token.
// Example keys:
// - sessionToken:https://cognizen-x-backend.vercel.app
// - sessionToken:http://127.0.0.1:6000
export const SESSION_TOKEN_KEY = `sessionToken:${API_BASE_URL}`;
